import os
import uuid
import logging
import base64
import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Body, Form
from fastapi.responses import FileResponse
from typing import Dict, Any

from .extract_text import extract_embedded_text, embed_text_in_png
from .errors import TranslationError
from .utils import get_translator, handle_uploaded_file

# --- 配置 ---
UPLOAD_FOLDER = os.path.abspath(os.environ.get('UPLOAD_FOLDER', '.uploads'))
OUTPUT_FOLDER = os.path.abspath(os.environ.get('OUTPUT_FOLDER', '.output'))

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# --- FastAPI 路由 ---
router = APIRouter(prefix="/api/v1")

@router.post("/character/upload")
async def upload_character_card(file: UploadFile = File(...)):
    """
    接收上传的角色卡图片，提取JSON数据，并返回JSON和图片的Base64编码。
    文件将根据角色名称保存，并通过哈希校验避免重复。
    """
    if not file.filename.endswith('.png'):
        raise HTTPException(status_code=400, detail="文件类型无效，请上传 .png 文件。")

    content = await file.read()

    try:
        # 从图片内容中提取角色数据
        character_data = extract_embedded_text(content)
        if not character_data:
            character_data = {"data": {"name": "新角色", "description": ""}}

        # 使用辅助函数保存文件
        handle_uploaded_file(content, UPLOAD_FOLDER, character_data)

        # 准备响应
        image_b64 = base64.b64encode(content).decode('utf-8')
        image_b64_data_uri = f"data:image/png;base64,{image_b64}"

        return {"character_data": character_data, "image_b64": image_b64_data_uri}

    except Exception as e:
        logging.error(f"处理上传的卡片时出错：{e}")
        raise HTTPException(status_code=500, detail="处理上传的卡片时发生内部错误。")

@router.post("/character/translate")
async def translate_text_field(data: Dict[str, Any] = Body(...)):
    text_to_translate = data.get('text')
    field_name = data.get('field_name')
    settings = data.get('settings')
    prompts = data.get('prompts')  # 新增 prompts 参数

    if not all([text_to_translate, field_name, settings, prompts]):
        raise HTTPException(status_code=400, detail="请求正文中缺少必要的参数。")

    if not text_to_translate.strip():
        return {"translated_text": ""}

    try:
        translator = get_translator(settings, prompts)  # 将 prompts 传递给 get_translator
        translated_text = translator.translate_field(field_name, text_to_translate)
        return {"translated_text": translated_text}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TranslationError as e:
        logging.error(f"翻译失败：{e.message}")
        raise HTTPException(status_code=500, detail=e.message)
    except Exception as e:
        logging.error(f"翻译过程中发生意外错误：{e}")
        raise HTTPException(status_code=500, detail="翻译过程中发生内部错误。")

@router.post("/character/export")
async def export_character_card(
    json_data: str = Form(...),
    image_file: UploadFile = File(...)
):
    """
    接收角色卡的JSON数据和一张基础图片, 生成并返回嵌入了该数据的新PNG图片。
    """
    try:
        character_data = json.loads(json_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="提供了无效的JSON数据。")

    temp_image_path = os.path.join(UPLOAD_FOLDER, f"export_base_{uuid.uuid4().hex}.png")
    output_path = os.path.join(OUTPUT_FOLDER, f"character_export_{uuid.uuid4().hex}.png")

    try:
        with open(temp_image_path, "wb") as buffer:
            buffer.write(await image_file.read())

        result_path = embed_text_in_png(temp_image_path, character_data, output_path)

        if result_path:
            char_name = character_data.get("data", {}).get("name", "character")
            download_name = f"{char_name}.png"
            return FileResponse(path=result_path, media_type='image/png', filename=download_name)
        else:
            raise HTTPException(status_code=500, detail="无法将数据嵌入图片。")
    except Exception as e:
        logging.error(f"导出角色卡时出错：{e}")
        raise HTTPException(status_code=500, detail="导出过程中发生内部错误。")
    finally:
        # 确保临时文件在操作完成后被删除
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)