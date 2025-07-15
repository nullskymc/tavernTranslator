
import os
import uuid
import logging
import base64
import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Body, Form
from fastapi.responses import FileResponse
from typing import Dict, Any, Optional

from .extract_text import extract_embedded_text, embed_text_in_png
from .translate import CharacterCardTranslator
from .errors import TranslationError

# --- Configuration ---
UPLOAD_FOLDER = os.path.abspath(os.environ.get('UPLOAD_FOLDER', '.uploads'))
OUTPUT_FOLDER = os.path.abspath(os.environ.get('OUTPUT_FOLDER', '.output'))

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# --- FastAPI Router ---
router = APIRouter(prefix="/api/v1")

def get_translator(settings: Optional[Dict[str, str]] = None):
    settings = settings or {}
    api_key = settings.get('api_key') or os.environ.get('OPENAI_API_KEY')
    base_url = settings.get('base_url') or os.environ.get('OPENAI_API_BASE', "https://api.openai.com/v1")
    model_name = settings.get('model_name') or os.environ.get('MODEL_NAME', "gpt-4-1106-preview")
    if not all([api_key, base_url, model_name]):
        raise ValueError("翻译器配置不完整，请在设置中提供 API Key, Base URL 和模型名称。")
    return CharacterCardTranslator(model_name=model_name, base_url=base_url, api_key=api_key)

@router.post("/character/upload")
async def upload_character_card(file: UploadFile = File(...)):
    """
    接收上传的角色卡图片, 提取JSON数据并返回JSON和图片的Base64编码。
    """
    if not file.filename.endswith('.png'):
        raise HTTPException(status_code=400, detail="Invalid file type, please upload a .png file.")

    temp_path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4().hex}_{file.filename}")
    
    try:
        content = await file.read()
        
        with open(temp_path, "wb") as buffer:
            buffer.write(content)

        character_data = extract_embedded_text(temp_path)
        if not character_data:
            character_data = {"data": {"name": "New Character", "description": ""}} # Provide a default structure

        image_b64 = base64.b64encode(content).decode('utf-8')
        image_b64_data_uri = f"data:image/png;base64,{image_b64}"

        return {"character_data": character_data, "image_b64": image_b64_data_uri}

    except Exception as e:
        logging.error(f"Error processing uploaded card: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred.")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/character/translate")
async def translate_text_field(data: Dict[str, Any] = Body(...)):
    text_to_translate = data.get('text')
    field_name = data.get('field_name')
    settings = data.get('settings')
    if not text_to_translate or not field_name:
        raise HTTPException(status_code=400, detail="Missing 'text' or 'field_name' in request body")
    if not text_to_translate.strip():
        return {"translated_text": ""}
    try:
        translator = get_translator(settings)
        translated_text = translator.translate_field(field_name, text_to_translate)
        return {"translated_text": translated_text}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TranslationError as e:
        logging.error(f"Translation failed: {e.message}")
        raise HTTPException(status_code=500, detail=e.message)
    except Exception as e:
        logging.error(f"An unexpected error occurred during translation: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred during translation.")

@router.post("/character/export")
async def export_character_card(
    json_data: str = Form(...),
    image_file: UploadFile = File(...)
):
    """
    接收角色卡的JSON数据和一张基础图片, ��成并返回嵌入了该数据的新PNG图片。
    """
    try:
        character_data = json.loads(json_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON data provided.")

    temp_image_path = os.path.join(UPLOAD_FOLDER, f"export_base_{uuid.uuid4().hex}.png")
    output_path = os.path.join(OUTPUT_FOLDER, f"character_export_{uuid.uuid4().hex}.png")

    try:
        with open(temp_image_path, "wb") as buffer:
            buffer.write(await image_file.read())

        result_path = embed_text_in_png(temp_image_path, character_data, output_path)

        if result_path:
            char_name = character_data.get("data", {}).get("name", "character")
            download_name = f"{char_name}.png"
            # Use a background task to clean up the file after sending
            return FileResponse(path=result_path, media_type='image/png', filename=download_name)
        else:
            raise HTTPException(status_code=500, detail="Failed to embed data into image.")
    except Exception as e:
        logging.error(f"Error exporting character card: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred during export.")
    finally:
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)
        # The exported file (output_path) should also be cleaned up. 
        # FileResponse with background task is a good way to handle this.
        # For simplicity here, we'll rely on a separate cleanup process if needed.
