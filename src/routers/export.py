"""
角色卡导出路由
"""
import os
import uuid
import json
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse

from ..extract_text import embed_text_in_png
from ..config.settings import get_settings

router = APIRouter(prefix="/api/v1", tags=["export"])
logger = logging.getLogger(__name__)


@router.post("/character/export")
async def export_character_card(
    json_data: str = Form(...),
    image_file: UploadFile = File(...)
):
    """
    接收角色卡的 JSON 数据和一张基础图片，生成并返回嵌入了该数据的新 PNG 图片。
    """
    try:
        character_data = json.loads(json_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="提供了无效的 JSON 数据。")

    settings = get_settings()
    temp_image_path = os.path.join(
        settings.upload_folder_abs, f"export_base_{uuid.uuid4().hex}.png"
    )
    output_path = os.path.join(
        settings.output_folder_abs, f"character_export_{uuid.uuid4().hex}.png"
    )

    try:
        with open(temp_image_path, "wb") as buffer:
            buffer.write(await image_file.read())

        result_path = embed_text_in_png(temp_image_path, character_data, output_path)

        if result_path:
            if "data" in character_data and isinstance(character_data["data"], dict):
                char_name = character_data["data"].get("name", "character")
            else:
                char_name = character_data.get("name", "character")
            download_name = f"{char_name}.png"
            return FileResponse(
                path=result_path, media_type='image/png', filename=download_name
            )
        else:
            raise HTTPException(status_code=500, detail="无法将数据嵌入图片。")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"导出角色卡时出错：{e}")
        raise HTTPException(status_code=500, detail="导出过程中发生内部错误。")
    finally:
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)
