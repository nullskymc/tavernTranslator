import asyncio
import logging
from typing import Dict, Any, List
from concurrent.futures import ThreadPoolExecutor
from .translate import CharacterCardTranslator
from .errors import TranslationError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BatchTranslator:
    """批量翻译器，支持并发和进度回报"""
    
    def __init__(self, translator: CharacterCardTranslator, max_concurrent: int = 3):
        self.translator = translator
        self.max_concurrent = max_concurrent
        self.executor = ThreadPoolExecutor(max_workers=max_concurrent)
        
    async def translate_fields(self, fields: List[Dict[str, Any]], progress_callback=None) -> List[Dict[str, Any]]:
        """并发翻译多个字段，支持进度回调"""
        semaphore = asyncio.Semaphore(self.max_concurrent)
        total_fields = len(fields)
        completed_count = 0
        
        async def translate_single_field(field_data: Dict[str, Any]) -> Dict[str, Any]:
            nonlocal completed_count
            async with semaphore:
                try:
                    field_name = field_data["field_name"]
                    text = field_data["text"]
                    
                    if field_name == "character_book.content":
                        translated_text = self.translator.translate_character_book_content(text)
                    else:
                        translated_text = self.translator.translate_field(field_name, text)
                    
                    # 更新完成计数并调用进度回调
                    completed_count += 1
                    if progress_callback:
                        await progress_callback(completed_count, total_fields)
                        
                    return {
                        "field_name": field_name,
                        "original_text": text,
                        "translated_text": translated_text,
                        "success": True
                    }
                except Exception as e:
                    logger.error(f"翻译字段 {field_data['field_name']} 时出错: {str(e)}")
                    # 更新完成计数并调用进度回调（即使失败也算完成）
                    completed_count += 1
                    if progress_callback:
                        await progress_callback(completed_count, total_fields)
                        
                    return {
                        "field_name": field_data["field_name"],
                        "original_text": field_data["text"],
                        "translated_text": "",
                        "success": False,
                        "error": str(e)
                    }
        
        # 创建所有翻译任务
        tasks = [translate_single_field(field_data) for field_data in fields]
        
        # 等待所有任务完成
        results = []
        for f in asyncio.as_completed(tasks):
            result = await f
            results.append(result)
            
        return results
        
    def __del__(self):
        self.executor.shutdown(wait=True)