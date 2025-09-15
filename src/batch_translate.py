import asyncio
import logging
from typing import Dict, Any, List
from concurrent.futures import ThreadPoolExecutor
from .translate import CharacterCardTranslator
from .graphs.langgraph_translator import LangGraphCharacterCardTranslator
from .errors import TranslationError
from .utils import retry_with_exponential_backoff  # 仍可保留工具函数（若后续需要），但当前不直接使用异步装饰器

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BatchTranslator:
    """批量翻译器，支持并发和进度回报"""
    
    def __init__(self, translator: CharacterCardTranslator, max_concurrent: int = 3):
        self.translator = translator
        self.max_concurrent = max_concurrent
        self.executor = ThreadPoolExecutor(max_workers=max_concurrent)
        self.use_langgraph = isinstance(translator, LangGraphCharacterCardTranslator)
        
    async def translate_fields(self, fields: List[Dict[str, Any]], progress_callback=None) -> List[Dict[str, Any]]:
        """并发翻译多个字段，支持进度回调"""
        semaphore = asyncio.Semaphore(self.max_concurrent)
        total_fields = len(fields)
        completed_count = 0
        
        async def translate_single_field(field_data: Dict[str, Any]) -> Dict[str, Any]:
            nonlocal completed_count
            field_name = field_data["field_name"]
            text = field_data["text"]
            max_retries = 5
            initial_delay = 1
            max_delay = 16
            delay = initial_delay
            attempt = 0
            last_error = None

            while attempt < max_retries:
                attempt += 1
                try:
                    # 仅在实际调用时占用一个并发槽位
                    async with semaphore:
                        if self.use_langgraph:
                            if field_name == "character_book.content":
                                async_method = getattr(self.translator, "async_translate_character_book_content", None)
                                if async_method is None:
                                    raise AttributeError("translator 缺少 async_translate_character_book_content 方法")
                                translated_text = await async_method(text)
                            else:
                                async_method = getattr(self.translator, "async_translate_field", None)
                                if async_method is None:
                                    raise AttributeError("translator 缺少 async_translate_field 方法")
                                translated_text = await async_method(field_name, text)
                        else:
                            loop = asyncio.get_running_loop()
                            if field_name == "character_book.content":
                                translated_text = await loop.run_in_executor(self.executor, self.translator.translate_character_book_content, text)
                            else:
                                translated_text = await loop.run_in_executor(self.executor, self.translator.translate_field, field_name, text)

                    # 成功则进度+1并返回
                    completed_count += 1
                    if progress_callback:
                        await progress_callback(completed_count, total_fields)
                    return {
                        "field_name": field_name,
                        "original_text": text,
                        "translated_text": translated_text,
                        "success": True,
                        "attempts": attempt
                    }
                except Exception as e:
                    last_error = e
                    logger.warning(f"字段 {field_name} 第 {attempt} 次尝试失败: {e}")
                    if attempt >= max_retries:
                        break
                    # 指数退避（带上限）
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, max_delay)

            # 全部失败，计数+1
            completed_count += 1
            if progress_callback:
                await progress_callback(completed_count, total_fields)
            return {
                "field_name": field_name,
                "original_text": text,
                "translated_text": "",
                "success": False,
                "error": str(last_error) if last_error else "未知错误",
                "attempts": attempt
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