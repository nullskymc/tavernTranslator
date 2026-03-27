"""
角色卡上传路由
"""
import base64
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException

from ..extract_text import extract_embedded_text
from ..utils import handle_uploaded_file
from ..config.settings import get_settings

router = APIRouter(prefix="/api/v1", tags=["upload"])
logger = logging.getLogger(__name__)


@router.post("/character/upload")
async def upload_character_card(file: UploadFile = File(...)):
    """
    接收上传的角色卡图片，提取 JSON 数据，并返回 JSON 和图片的 Base64 编码。
    文件将根据角色名称保存，并通过哈希校验避免重复。
    """
    if not file.filename or not file.filename.endswith('.png'):
        raise HTTPException(status_code=400, detail="文件类型无效，请上传 .png 文件。")

    content = await file.read()
    settings = get_settings()

    try:
        # 从图片内容中提取角色数据
        character_data = extract_embedded_text(content)
        if not character_data:
            character_data = {"data": {"name": "新角色", "description": ""}}
        else:
            if "data" not in character_data:
                character_data = {"data": character_data}

        # 使用辅助函数保存文件
        handle_uploaded_file(content, settings.upload_folder_abs, character_data)

        # 准备响应
        image_b64 = base64.b64encode(content).decode('utf-8')
        image_b64_data_uri = f"data:image/png;base64,{image_b64}"

        return {"character_data": character_data, "image_b64": image_b64_data_uri}

    except Exception as e:
        logger.error(f"处理上传的卡片时出错：{e}")
        raise HTTPException(status_code=500, detail="处理上传的卡片时发生内部错误。")
