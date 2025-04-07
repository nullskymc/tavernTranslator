import logging
import json
import os
from pathlib import Path
import uuid
import asyncio
from typing import Dict, Optional, List
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from extract_text import extract_embedded_text, embed_text_in_png
from translate import create_llm, translate_greetings_sync, translate_single_text_sync

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Tavern Translator API")

# 启用CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 存储正在处理的任务
tasks: Dict[str, Dict] = {}
active_connections: Dict[str, WebSocket] = {}

class TranslationInput(BaseModel):
    task_id: str
    model_name: str
    base_url: str
    api_key: str

# WebSocket连接管理
async def process_translation(task_id: str, image_path: str, model_name: str, base_url: str, api_key: str):
    """处理图片提取和翻译，发送进度更新到WebSocket"""
    try:
        # 创建输出路径和LLM实例
        input_path = Path(image_path)
        output_dir = Path(os.path.dirname(os.path.abspath(__file__))).parent / ".output"
        output_dir.mkdir(exist_ok=True)
        
        json_output = output_dir / f"{input_path.stem}.json"
        image_output = output_dir / f"{input_path.stem}_translated{input_path.suffix}"
        
        # 更新任务状态
        tasks[task_id].update({
            'status': 'processing',
            'json_output': str(json_output),
            'image_output': str(image_output)
        })
        
        # 发送开始处理消息
        if task_id in active_connections:
            await active_connections[task_id].send_json({
                'type': 'log',
                'message': '开始处理翻译任务...'
            })
        
        # 创建LLM实例
        llm_instance = create_llm(model_name, base_url, api_key)
        
        # 提取文本数据
        text_data = extract_embedded_text(image_path)
        if not text_data or 'data' not in text_data:
            raise ValueError("无法提取文本数据")
            
        data = text_data['data']
        
        # 翻译所有需要的字段
        fields_to_translate = [
            ('first_mes', "对话内容"),
            ('alternate_greetings', "可选问候语"),
            ('description', "角色描述"),
            ('personality', "性格设定"),
            ('mes_example', "对话示例"),
            ('system_prompt', "系统提示词"),
            ('scenario', "场景描述")
        ]
        
        for field, content_type in fields_to_translate:
            if data.get(field):
                log_message = f"开始翻译{content_type}..."
                logger.info(log_message)
                
                # 发送进度消息到WebSocket
                if task_id in active_connections:
                    await active_connections[task_id].send_json({
                        'type': 'log',
                        'message': log_message
                    })
                
                if field == 'alternate_greetings':
                    data[field] = translate_greetings_sync(data[field], llm_instance)
                else:
                    data[field] = translate_single_text_sync(data[field], content_type, llm_instance)
        
        # 更新text_data中的数据
        text_data['data'] = data
        
        # 保存JSON文件
        with open(json_output, "w", encoding="utf-8") as f:
            json.dump(text_data, f, ensure_ascii=False, indent=4)
        
        # 生成新图片
        embed_text_in_png(image_path, text_data, str(image_output))
        
        # 更新任务状态为完成
        tasks[task_id].update({
            'status': 'completed'
        })
        
        # 发送完成消息
        if task_id in active_connections:
            await active_connections[task_id].send_json({
                'type': 'completed',
                'json_output': str(json_output),
                'image_output': str(image_output),
                'message': '翻译任务完成!'
            })
        
    except Exception as e:
        error_message = f"处理过程中出错: {str(e)}"
        logger.error(error_message)
        
        # 更新任务状态为失败
        tasks[task_id].update({
            'status': 'failed',
            'error': error_message
        })
        
        # 发送错误消息
        if task_id in active_connections:
            await active_connections[task_id].send_json({
                'type': 'error',
                'message': error_message
            })

@app.websocket("/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await websocket.accept()
    active_connections[task_id] = websocket
    try:
        while True:
            # 保持连接活跃
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        if task_id in active_connections:
            del active_connections[task_id]

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """接收图片上传"""
    try:
        # 创建唯一任务ID
        task_id = str(uuid.uuid4())
        
        # 保存上传的文件
        content = await file.read()
        upload_dir = Path(os.path.dirname(os.path.abspath(__file__))).parent / ".uploads"
        upload_dir.mkdir(exist_ok=True)
        
        file_path = upload_dir / f"{task_id}_{file.filename}"
        with open(file_path, "wb") as f:
            f.write(content)
        
        # 保存任务信息
        tasks[task_id] = {
            'file_path': str(file_path),
            'original_filename': file.filename,
            'status': 'uploaded'
        }
        
        return JSONResponse(content={
            "task_id": task_id,
            "message": "文件上传成功，等待配置翻译参数"
        })
    except Exception as e:
        logger.error(f"文件上传失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"文件上传失败: {str(e)}"}
        )

@app.post("/translate")
async def translate_image(data: TranslationInput):
    """开始翻译任务"""
    try:
        task_id = data.task_id
        
        if task_id not in tasks:
            return JSONResponse(
                status_code=404,
                content={"error": "找不到该任务，请重新上传文件"}
            )
        
        task = tasks[task_id]
        if task['status'] != 'uploaded':
            return JSONResponse(
                status_code=400,
                content={"error": f"任务状态不正确: {task['status']}"}
            )
        
        # 启动异步翻译任务
        asyncio.create_task(process_translation(
            task_id,
            task['file_path'],
            data.model_name,
            data.base_url,
            data.api_key
        ))
        
        return JSONResponse(content={
            "task_id": task_id,
            "message": "翻译任务已启动"
        })
    except Exception as e:
        logger.error(f"启动翻译任务失败: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"启动翻译任务失败: {str(e)}"}
        )

@app.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """获取任务状态"""
    if task_id not in tasks:
        return JSONResponse(
            status_code=404,
            content={"error": "找不到该任务"}
        )
    
    return JSONResponse(content=tasks[task_id])

@app.get("/download/json/{task_id}")
async def download_json(task_id: str):
    """下载JSON结果文件"""
    if task_id not in tasks or tasks[task_id].get('status') != 'completed':
        return JSONResponse(
            status_code=404,
            content={"error": "找不到该任务或任务未完成"}
        )
    
    json_path = tasks[task_id].get('json_output')
    if not json_path or not os.path.exists(json_path):
        return JSONResponse(
            status_code=404,
            content={"error": "找不到JSON文件"}
        )
    
    return FileResponse(
        path=json_path,
        filename=Path(json_path).name,
        media_type="application/json"
    )

@app.get("/download/image/{task_id}")
async def download_image(task_id: str):
    """下载翻译后的图片文件"""
    if task_id not in tasks or tasks[task_id].get('status') != 'completed':
        return JSONResponse(
            status_code=404,
            content={"error": "找不到该任务或任务未完成"}
        )
    
    image_path = tasks[task_id].get('image_output')
    if not image_path or not os.path.exists(image_path):
        return JSONResponse(
            status_code=404,
            content={"error": "找不到图片文件"}
        )
    
    return FileResponse(
        path=image_path,
        filename=Path(image_path).name,
        media_type="image/png"
    )

# 挂载前端静态文件
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)