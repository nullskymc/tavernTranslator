import logging
import json
import os
from pathlib import Path
import uuid
import asyncio
import time
import threading
from typing import Dict, Optional, List
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
from io import StringIO

from extract_text import extract_embedded_text, embed_text_in_png
from translate import create_llm, translate_greetings_sync, translate_single_text_sync

# 导入新的错误处理和任务管理模块
from errors import (
    TranslationError, ErrorCode, ErrorSeverity, 
    format_error_for_log, format_error_for_frontend, TaskCancelledException
)
from task_manager import get_task_manager, TaskStatus

# 全局请求限制器
class RequestLimiter:
    """全局请求限制器，防止同时处理过多翻译任务"""
    
    def __init__(self, max_concurrent_tasks=2):
        self.max_concurrent_tasks = max_concurrent_tasks
        self.current_tasks = 0
        self.lock = threading.Lock()
        self.last_request_time = 0
        self.min_request_interval = 3.0  # 最小请求间隔（秒）
        
    def can_accept_request(self):
        """检查是否可以接受新的请求"""
        with self.lock:
            current_time = time.time()
            
            # 检查请求间隔
            if current_time - self.last_request_time < self.min_request_interval:
                return False, "请求过于频繁，请稍后再试"
                
            # 检查并发任务数
            if self.current_tasks >= self.max_concurrent_tasks:
                return False, "服务器繁忙，请稍后再试"
                
            return True, "可以处理"
    
    def start_task(self):
        """开始一个任务"""
        with self.lock:
            self.current_tasks += 1
            self.last_request_time = time.time()
            logging.info(f"开始新任务，当前并发任务数: {self.current_tasks}")
    
    def finish_task(self):
        """结束一个任务"""
        with self.lock:
            self.current_tasks = max(0, self.current_tasks - 1)
            logging.info(f"任务完成，当前并发任务数: {self.current_tasks}")

# 全局请求限制器实例
request_limiter = RequestLimiter(max_concurrent_tasks=2)

# 自定义日志处理器，用于捕获错误日志（不再通过WebSocket发送普通日志）
class WebSocketLogHandler(logging.Handler):
    def __init__(self, task_id):
        super().__init__()
        self.task_id = task_id
        self.setLevel(logging.ERROR)  # 只处理ERROR级别及以上的日志
    
    def emit(self, record):
        # 只处理严重错误，不再发送普通日志消息
        if record.levelno >= logging.ERROR:
            try:
                log_message = self.format(record)
                # 创建异步任务发送错误消息
                loop = None
                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    pass
                
                if loop and not loop.is_closed():
                    asyncio.create_task(self.send_error(log_message))
            except Exception as e:
                print(f"发送错误消息失败: {e}")
    
    async def send_error(self, log_message):
        """只发送错误消息，不发送普通日志"""
        if self.task_id in active_connections:
            try:
                ws = active_connections[self.task_id]
                if ws.client_state.name == 'CONNECTED':
                    await ws.send_json({
                        'type': 'error',
                        'message': log_message,
                        'timestamp': time.time()
                    })
            except Exception:
                pass  # 静默失败

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 获取全局任务管理器
task_manager = get_task_manager()

app = FastAPI(title="Tavern Translator API")

# 启用CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def send_progress_update(task_id: str, current_field: str, field_status: str, completed_count: int, total_count: int):
    """发送进度更新到WebSocket"""
    if task_id in active_connections:
        try:
            ws = active_connections[task_id]
            # 检查连接状态
            if ws.client_state.name == 'CONNECTED':
                progress_percentage = round((completed_count / total_count) * 100) if total_count > 0 else 0
                
                message = {
                    'type': 'progress',
                    'current_field': current_field,
                    'field_status': field_status,  # 'starting', 'completed', 'skipped'
                    'completed_count': completed_count,
                    'total_count': total_count,
                    'progress_percentage': progress_percentage,
                    'timestamp': time.time()
                }
                
                await ws.send_json(message)
                logging.debug(f"进度更新已发送: {task_id} - {current_field} ({progress_percentage}%)")
            else:
                logging.warning(f"WebSocket连接状态异常: {task_id} - {ws.client_state.name}")
                # 如果连接异常，从活动连接中移除
                del active_connections[task_id]
        except Exception as e:
            logging.error(f"发送进度更新失败: {task_id} - {e}")
            # 发送失败时从活动连接中移除
            if task_id in active_connections:
                del active_connections[task_id]

# 存储正在处理的任务
tasks: Dict[str, Dict] = {}
active_connections: Dict[str, WebSocket] = {}
task_log_handlers: Dict[str, WebSocketLogHandler] = {}

class TranslationInput(BaseModel):
    task_id: str
    model_name: str
    base_url: str
    api_key: str

# WebSocket连接管理
async def process_translation(task_id: str, image_path: str, model_name: str, base_url: str, api_key: str):
    """处理图片提取和翻译，发送进度更新到WebSocket"""
    try:
        # 创建任务记录
        task_info = task_manager.create_task(task_id, total_steps=7)  # 7个主要字段
        task_manager.start_task(task_id)
        
        # 为此任务创建专用的logger
        task_logger = logging.getLogger(f"translation_{task_id}")
        task_logger.setLevel(logging.INFO)
        
        # 清除之前的处理器（如果有）
        task_logger.handlers.clear()
        
        # 为此任务添加自定义日志处理器
        task_handler = WebSocketLogHandler(task_id)
        task_formatter = logging.Formatter('%(message)s')
        task_handler.setFormatter(task_formatter)
        task_logger.addHandler(task_handler)
        task_log_handlers[task_id] = task_handler
        
        # 同时添加到相关模块的logger
        translate_logger = logging.getLogger('translate')
        translate_logger.addHandler(task_handler)
        translate_logger.setLevel(logging.INFO)
        
        # 添加到根翻译模块
        root_translate_logger = logging.getLogger('src.translate')
        root_translate_logger.addHandler(task_handler)
        root_translate_logger.setLevel(logging.INFO)
        
        # 确保httpx日志也被捕获（用于显示API请求状态）
        httpx_logger = logging.getLogger('httpx')
        httpx_logger.addHandler(task_handler)
        httpx_logger.setLevel(logging.INFO)
        
        task_logger.info('开始处理翻译任务...')
        
        # 创建输出路径和LLM实例
        input_path = Path(image_path)
        output_dir = Path(os.path.dirname(os.path.abspath(__file__))).parent / ".output"
        output_dir.mkdir(exist_ok=True)
        
        # 获取原始文件名（从任务信息中）
        original_filename = tasks[task_id].get('original_filename', input_path.name)
        original_stem = Path(original_filename).stem
        
        # 使用原始文件名作为基础，添加_translated后缀
        json_output = output_dir / f"{original_stem}.json"
        image_output = output_dir / f"{original_stem}_translated{input_path.suffix}"
        
        # 更新任务状态
        tasks[task_id].update({
            'status': 'processing',
            'json_output': str(json_output),
            'image_output': str(image_output)
        })
        
        # 创建LLM实例
        if api_key == "test-key-for-testing":
            # 测试模式：模拟翻译，不实际调用API
            print("使用测试模式，模拟翻译过程")
            llm_instance = None
        else:
            try:
                llm_instance = create_llm(model_name, base_url, api_key, task_id, task_logger)
            except Exception as e:
                error = TranslationError(
                    error_code=ErrorCode.API_ERROR,
                    message=f"创建LLM实例失败: {str(e)}",
                    severity=ErrorSeverity.CRITICAL
                )
                task_logger.error(format_error_for_log(error))
                raise error
        
        # 提取文本数据
        task_logger.info("开始提取角色卡数据...")
        try:
            text_data = extract_embedded_text(image_path)
            if not text_data or 'data' not in text_data:
                error = TranslationError(
                    error_code=ErrorCode.FILE_PROCESSING_ERROR,
                    message="无法提取文本数据，请确保上传了有效的角色卡",
                    severity=ErrorSeverity.HIGH
                )
                task_logger.error(format_error_for_log(error))
                raise error
            task_logger.info("角色卡数据提取完成")
        except TranslationError:
            raise
        except Exception as e:
            error = TranslationError(
                error_code=ErrorCode.FILE_PROCESSING_ERROR,
                message=f"解析角色卡数据失败: {str(e)}",
                severity=ErrorSeverity.HIGH
            )
            task_logger.error(format_error_for_log(error))
            raise error
            
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
        
        # 计算总字段数和完成计数
        total_fields = len(fields_to_translate)
        completed_fields = 0
        
        for field, content_type in fields_to_translate:
            # 检查任务是否被取消
            task_manager.check_task_cancellation(task_id)
            
            if data.get(field):
                log_message = f"开始翻译{content_type}..."
                task_logger.info(log_message)
                
                # 更新任务进度
                task_manager.update_task_progress(task_id, content_type, completed_fields, total_fields)
                
                # 发送开始翻译的进度更新
                await send_progress_update(task_id, content_type, 'starting', completed_fields, total_fields)
                
                try:
                    if llm_instance is None:
                        # 测试模式：模拟翻译延迟
                        await asyncio.sleep(2)  # 模拟翻译时间
                        if field == 'alternate_greetings':
                            data[field] = [f"【已翻译】{greeting}" for greeting in data[field]]
                        else:
                            data[field] = f"【已翻译】{data[field]}"
                    else:
                        # 正常翻译模式
                        if field == 'alternate_greetings':
                            data[field] = translate_greetings_sync(data[field], llm_instance)
                        else:
                            data[field] = translate_single_text_sync(data[field], content_type, llm_instance)
                    
                    # 明确报告完成状态
                    task_logger.info(f"字段 {field} 翻译完成")
                    completed_fields += 1
                    
                    # 更新任务进度
                    task_manager.update_task_progress(task_id, content_type, completed_fields, total_fields)
                    
                    # 发送完成的进度更新
                    await send_progress_update(task_id, content_type, 'completed', completed_fields, total_fields)
                    
                except TaskCancelledException as e:
                    task_logger.info("翻译任务被用户取消")
                    raise e
                except TranslationError as e:
                    task_logger.error(f"翻译{content_type}时出错: {format_error_for_log(e)}")
                    if e.should_stop_immediately():
                        raise e
                    # 对于非致命错误，记录但继续（可以根据需要调整策略）
                    task_logger.warning(f"跳过翻译{content_type}，继续处理其他字段")
                    completed_fields += 1
                    await send_progress_update(task_id, content_type, 'skipped', completed_fields, total_fields)
                except Exception as e:
                    error = TranslationError(
                        error_code=ErrorCode.TRANSLATION_ERROR,
                        message=f"翻译{content_type}时发生未知错误: {str(e)}",
                        severity=ErrorSeverity.HIGH
                    )
                    task_logger.error(format_error_for_log(error))
                    raise error
            else:
                # 报告跳过的字段
                task_logger.info(f"字段 {field} 不存在或为空，跳过翻译")
                completed_fields += 1
                
                # 更新任务进度
                task_manager.update_task_progress(task_id, content_type, completed_fields, total_fields)
                
                # 发送跳过的进度更新
                await send_progress_update(task_id, content_type, 'skipped', completed_fields, total_fields)
        
        # 更新text_data中的数据
        text_data['data'] = data
        
        # 保存JSON文件
        task_logger.info("保存翻译结果...")
        try:
            with open(json_output, "w", encoding="utf-8") as f:
                json.dump(text_data, f, ensure_ascii=False, indent=4)
            task_logger.info(f"已保存JSON文件: {json_output}")
        except Exception as e:
            error = TranslationError(
                error_code=ErrorCode.FILE_PROCESSING_ERROR,
                message=f"保存JSON文件失败: {str(e)}",
                severity=ErrorSeverity.HIGH
            )
            task_logger.error(format_error_for_log(error))
            raise error
        
        # 生成新图片
        task_logger.info("生成翻译后的角色卡图片...")
        try:
            result = embed_text_in_png(image_path, text_data, str(image_output))
            if not result:
                error = TranslationError(
                    error_code=ErrorCode.FILE_PROCESSING_ERROR,
                    message="嵌入文本到PNG失败",
                    severity=ErrorSeverity.HIGH
                )
                task_logger.error(format_error_for_log(error))
                raise error
            task_logger.info(f"已生成翻译后的角色卡图片: {image_output}")
        except TranslationError:
            raise
        except Exception as e:
            error = TranslationError(
                error_code=ErrorCode.FILE_PROCESSING_ERROR,
                message=f"生成图片文件失败: {str(e)}",
                severity=ErrorSeverity.HIGH
            )
            task_logger.error(format_error_for_log(error))
            raise error
        
        # 标记任务完成
        task_manager.complete_task(task_id)
        
        # 更新任务状态为完成
        tasks[task_id].update({
            'status': 'completed'
        })
        
        # 发送最终进度更新（100%完成）
        await send_progress_update(task_id, "全部字段", 'completed', total_fields, total_fields)
        
        # 发送完成消息
        if task_id in active_connections:
            try:
                await active_connections[task_id].send_json({
                    'type': 'completed',
                    'json_output': str(json_output),
                    'image_output': str(image_output),
                    'message': '翻译任务完成!',
                    'timestamp': time.time()
                })
                logging.info(f"任务完成消息已发送: {task_id}")
            except Exception as e:
                logging.error(f"发送完成消息失败: {task_id} - {e}")
                # 即使发送失败，任务状态仍然是完成的
        else:
            logging.warning(f"任务完成但WebSocket连接不存在: {task_id}")
            
        task_logger.info("翻译任务完成！")
        
    except TaskCancelledException as e:
        # 任务取消处理
        task_manager.cancel_task(task_id)
        tasks[task_id].update({
            'status': 'cancelled',
            'error': '任务被用户取消'
        })
        
        if task_id in active_connections:
            try:
                await active_connections[task_id].send_json({
                    'type': 'cancelled',
                    'message': '翻译任务已取消',
                    'timestamp': time.time()
                })
                logging.info(f"任务取消消息已发送: {task_id}")
            except Exception as e:
                logging.error(f"发送取消消息失败: {task_id} - {e}")
                
    except TranslationError as e:
        # 翻译错误处理
        error_message = format_error_for_log(e)
        task_logger.error(error_message)
        
        # 标记任务失败
        task_manager.fail_task(task_id, e)
        
        # 更新任务状态为失败
        tasks[task_id].update({
            'status': 'failed',
            'error': e.message
        })
        
        # 发送错误消息到WebSocket
        if task_id in active_connections:
            try:
                await active_connections[task_id].send_json({
                    'type': 'error',
                    'message': e.message,
                    'error_details': format_error_for_frontend(e)
                })
            except:
                pass
        
    except Exception as e:
        # 未知错误处理
        error = TranslationError(
            error_code=ErrorCode.INTERNAL_ERROR,
            message=f"处理过程中出现未知错误: {str(e)}",
            severity=ErrorSeverity.CRITICAL
        )
        
        error_message = format_error_for_log(error)
        task_logger.error(error_message)
        
        # 标记任务失败
        task_manager.fail_task(task_id, error)
        
        # 更新任务状态为失败
        tasks[task_id].update({
            'status': 'failed',
            'error': error.message
        })
        
        # 发送错误消息到WebSocket
        if task_id in active_connections:
            try:
                await active_connections[task_id].send_json({
                    'type': 'error',
                    'message': error.message,
                    'error_details': format_error_for_frontend(error),
                    'timestamp': time.time()
                })
                logging.info(f"错误消息已发送: {task_id}")
            except Exception as e:
                logging.error(f"发送错误消息失败: {task_id} - {e}")
        
    finally:
        # 清理任务专用的日志处理器
        if task_id in task_log_handlers:
            task_handler = task_log_handlers[task_id]
            # 从所有相关logger中移除处理器
            task_logger.removeHandler(task_handler)
            
            translate_logger = logging.getLogger('translate')
            translate_logger.removeHandler(task_handler)
            
            root_translate_logger = logging.getLogger('src.translate')
            root_translate_logger.removeHandler(task_handler)
            
            httpx_logger = logging.getLogger('httpx')
            httpx_logger.removeHandler(task_handler)
            
            del task_log_handlers[task_id]
            
        # 标记任务完成，释放并发限制
        request_limiter.finish_task()

@app.websocket("/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    try:
        await websocket.accept()
        active_connections[task_id] = websocket
        
        logging.info(f"WebSocket连接已建立: {task_id}")
        
        # 发送连接确认消息
        await websocket.send_json({
            'type': 'connected',
            'task_id': task_id,
            'message': '连接已建立'
        })
        
        # 如果该任务已经有错误，立即发送错误消息
        if task_id in tasks and tasks[task_id].get('status') == 'failed':
            await websocket.send_json({
                'type': 'error',
                'message': tasks[task_id].get('error', '未知错误')
            })
        
        # 如果任务已经完成，发送完成消息
        elif task_id in tasks and tasks[task_id].get('status') == 'completed':
            await websocket.send_json({
                'type': 'completed',
                'json_output': tasks[task_id].get('json_output', ''),
                'image_output': tasks[task_id].get('image_output', ''),
                'message': '翻译任务已完成!'
            })
        
        # 保持连接活跃并处理心跳
        while True:
            try:
                # 设置接收超时为30秒
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if data == "ping":
                    await websocket.send_text("pong")
                    logging.debug(f"WebSocket心跳响应: {task_id}")
                elif data == "close":
                    logging.info(f"收到客户端关闭请求: {task_id}")
                    break
            except asyncio.TimeoutError:
                # 发送心跳检查连接
                try:
                    await websocket.send_json({
                        'type': 'heartbeat',
                        'timestamp': time.time()
                    })
                except:
                    logging.warning(f"WebSocket心跳发送失败，连接可能已断开: {task_id}")
                    break
            except Exception as e:
                logging.error(f"WebSocket接收数据时出错: {task_id}, {e}")
                break
                
    except WebSocketDisconnect:
        logging.info(f"WebSocket连接断开: {task_id}")
    except Exception as e:
        logging.error(f"WebSocket处理异常: {task_id}, {e}")
    finally:
        # 清理连接
        if task_id in active_connections:
            del active_connections[task_id]
            logging.info(f"WebSocket连接已清理: {task_id}")

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
        
        # 验证文件是PNG格式
        if not file.filename or not file.filename.lower().endswith('.png'):
            return JSONResponse(
                status_code=400,
                content={"error": "只接受PNG格式的文件"}
            )
        
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
        # 检查请求限制
        can_accept, message = request_limiter.can_accept_request()
        if not can_accept:
            return JSONResponse(
                status_code=429,  # Too Many Requests
                content={"error": message}
            )
        
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
        
        # 验证参数
        if not data.model_name.strip():
            return JSONResponse(
                status_code=400,
                content={"error": "模型名称不能为空"}
            )
            
        if not data.base_url.strip():
            return JSONResponse(
                status_code=400,
                content={"error": "API地址不能为空"}
            )
        
        # 开始任务
        request_limiter.start_task()
        
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
    
    # 同时获取任务管理器中的状态
    task_info = task_manager.get_task(task_id)
    task_status = tasks[task_id].copy()
    
    if task_info:
        task_status.update({
            "progress_percentage": task_info.progress_percentage,
            "current_step": task_info.current_step,
            "error_count": task_info.error_count,
            "retry_count": task_info.retry_count,
            "duration": task_info.get_duration()
        })
    
    return JSONResponse(content=task_status)

@app.post("/cancel/{task_id}")
async def cancel_task(task_id: str):
    """取消翻译任务"""
    if task_id not in tasks:
        return JSONResponse(
            status_code=404,
            content={"error": "找不到该任务"}
        )
    
    task = tasks[task_id]
    if task.get('status') not in ['processing', 'uploaded']:
        return JSONResponse(
            status_code=400,
            content={"error": f"任务状态为 {task.get('status')}，无法取消"}
        )
    
    # 通过任务管理器取消任务
    success = task_manager.cancel_task(task_id)
    
    if success:
        return JSONResponse(content={
            "message": "任务取消请求已发送",
            "task_id": task_id
        })
    else:
        return JSONResponse(
            status_code=500,
            content={"error": "取消任务失败"}
        )

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

@app.get("/health")
async def health_check():
    """健康检查端点"""
    current_tasks = request_limiter.current_tasks
    max_tasks = request_limiter.max_concurrent_tasks
    
    # 获取任务管理器状态
    active_tasks = task_manager.get_active_tasks()
    finished_tasks = task_manager.get_finished_tasks()
    
    return JSONResponse(content={
        "status": "healthy",
        "current_tasks": current_tasks,
        "max_concurrent_tasks": max_tasks,
        "available_slots": max_tasks - current_tasks,
        "last_request_time": request_limiter.last_request_time,
        "task_manager": {
            "active_tasks_count": len(active_tasks),
            "finished_tasks_count": len(finished_tasks),
            "total_tasks_count": len(task_manager.get_all_tasks())
        }
    })

@app.get("/")
async def root():
    """根路径重定向到静态文件"""
    return FileResponse(Path(__file__).parent.parent / "static" / "index.html")

# 挂载前端静态文件
# 支持Vue 3构建的单页应用
static_dir = Path(os.path.dirname(os.path.abspath(__file__))).parent / "static"
app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)