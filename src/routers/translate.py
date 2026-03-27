"""
翻译相关路由：单字段翻译、角色书翻译、批量翻译
"""
import logging

from fastapi import APIRouter, HTTPException

from ..models.schemas import (
    TranslateRequest, TranslateResponse,
    TranslateCharacterBookRequest, TranslateCharacterBookResponse,
    BatchTranslateRequest, BatchTranslateResponse,
)
from ..errors import TranslationError
from ..utils import get_translator
from ..batch_translate import BatchTranslator
from ..config.settings import get_settings

router = APIRouter(prefix="/api/v1", tags=["translate"])
logger = logging.getLogger(__name__)


@router.post("/character/translate", response_model=TranslateResponse)
async def translate_text_field(data: TranslateRequest):
    """翻译角色卡的单个文本字段"""
    if not data.text.strip():
        return TranslateResponse(translated_text="")

    try:
        translator = get_translator(
            data.settings.model_dump(),
            data.prompts.model_dump(),
            data.use_langgraph,
            data.glossary,
        )
        translated_text = translator.translate_field(data.field_name, data.text)
        return TranslateResponse(translated_text=translated_text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TranslationError as e:
        logger.error(f"翻译失败：{e.message}")
        raise HTTPException(status_code=500, detail=e.message)
    except Exception as e:
        logger.error(f"翻译过程中发生意外错误：{e}")
        raise HTTPException(status_code=500, detail="翻译过程中发生内部错误。")


@router.post("/character/translate-character-book",
             response_model=TranslateCharacterBookResponse)
async def translate_character_book_content(data: TranslateCharacterBookRequest):
    """翻译 character_book 中的 content 字段"""
    if not data.content.strip():
        return TranslateCharacterBookResponse(translated_content="")

    try:
        translator = get_translator(
            data.settings.model_dump(),
            data.prompts.model_dump(),
            data.use_langgraph,
            data.glossary,
        )
        translated_content = translator.translate_character_book_content(data.content)
        return TranslateCharacterBookResponse(translated_content=translated_content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TranslationError as e:
        logger.error(f"翻译失败：{e.message}")
        raise HTTPException(status_code=500, detail=e.message)
    except Exception as e:
        logger.error(f"翻译过程中发生意外错误：{e}")
        raise HTTPException(status_code=500, detail="翻译过程中发生内部错误。")


@router.post("/character/batch-translate", response_model=BatchTranslateResponse)
async def batch_translate_fields(data: BatchTranslateRequest):
    """批量翻译多个字段"""
    settings = get_settings()

    if not data.fields:
        return BatchTranslateResponse(
            results=[], progress={"completed": 0, "total": 0}
        )

    try:
        translator = get_translator(
            data.settings.model_dump(),
            data.prompts.model_dump(),
            data.use_langgraph,
            data.glossary,
        )
        batch_translator = BatchTranslator(
            translator, max_concurrent=settings.batch_max_concurrent
        )

        # 转换字段格式
        formatted_fields = [
            {"field_name": f.field_name, "text": f.text} for f in data.fields
        ]

        # 进度跟踪
        progress_info = {"completed": 0, "total": len(formatted_fields)}

        async def progress_callback(completed: int, total: int):
            progress_info["completed"] = completed

        results = await batch_translator.translate_fields(
            formatted_fields, progress_callback
        )
        return BatchTranslateResponse(results=results, progress=progress_info)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TranslationError as e:
        logger.error(f"批量翻译失败：{e.message}")
        raise HTTPException(status_code=500, detail=e.message)
    except Exception as e:
        logger.error(f"批量翻译过程中发生意外错误：{e}")
        raise HTTPException(status_code=500, detail="批量翻译过程中发生内部错误。")
