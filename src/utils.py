from typing import Any, Dict, Optional
import json
import os
import re
import hashlib
import logging

import functools
import time
import asyncio

from .translate import CharacterCardTranslator
from .graphs.langgraph_translator import LangGraphCharacterCardTranslator

logger = logging.getLogger(__name__)


# 通用同步指数退避重试装饰器
def retry_with_exponential_backoff(
    retries=5, initial_delay=1, max_delay=16, exceptions=(Exception,)
):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            for attempt in range(retries):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == retries - 1:
                        raise
                    time.sleep(delay)
                    delay = min(delay * 2, max_delay)
        return wrapper
    return decorator

# 通用异步指数退避重试装饰器
def async_retry_with_exponential_backoff(
    retries=5, initial_delay=1, max_delay=16, exceptions=(Exception,)
):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            delay = initial_delay
            for attempt in range(retries):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == retries - 1:
                        raise
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, max_delay)
        return wrapper
    return decorator

def load_json(file_path: str) -> Dict[str, Any]:
    """从指定路径加载JSON文件。"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data: Dict[str, Any], file_path: str) -> None:
    """将数据以JSON格式保存到指定路径。"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def pretty_print_json(data: Dict[str, Any]) -> None:
    """以美化格式打印JSON数据。"""
    print(json.dumps(data, indent=4, ensure_ascii=False))

def get_translator(settings: Dict[str, str], prompts: Dict[str, str], use_langgraph: bool = True) -> CharacterCardTranslator:
    """根据提供的设置和提示词初始化并返回翻译器实例。"""
    api_key = settings.get('api_key')
    base_url = settings.get('base_url', "https://api.openai.com/v1")
    model_name = settings.get('model_name', "gpt-4-1106-preview")

    if not all([api_key, base_url, model_name, prompts]):
        raise ValueError("翻译器配置不完整，请提供 API Key, Base URL, 模型名称和提示词。")

    if use_langgraph:
        logger.info("使用基于LangGraph的翻译器")
        return LangGraphCharacterCardTranslator(model_name=model_name, base_url=base_url, api_key=api_key, prompts=prompts)
    else:
        logger.info("使用传统翻译器")
        return CharacterCardTranslator(model_name=model_name, base_url=base_url, api_key=api_key, prompts=prompts)

def handle_uploaded_file(content: bytes, upload_folder: str, character_data: Dict) -> str:
    """
    根据角色数据，使用净化后的名称将文件保存到上传文件夹，
    处理重复和名称冲突。
    返回保存文件的最终路径。
    """
    char_name = character_data.get("data", {}).get("name", "未命名")
    # 用下划线替换空格
    safe_name = re.sub(r'\s+', '_', char_name)
    # 移除无效的文件名字符并清理
    sanitized_name = re.sub(r'[\\/*?:"<>|]', '', safe_name).strip('._ ') or "未命名"

    incoming_hash = hashlib.sha256(content).hexdigest()
    final_filename = f"{sanitized_name}.png"
    final_path = os.path.join(upload_folder, final_filename)

    # 处理已存在的文件和名称冲突
    if os.path.exists(final_path):
        with open(final_path, 'rb') as f_existing:
            existing_hash = hashlib.sha256(f_existing.read()).hexdigest()

        if existing_hash == incoming_hash:
            # 发现完全相同的文件，无需保存新文件
            return final_path
        else:
            # 名称冲突，创建唯一的文件名
            unique_filename = f"{sanitized_name}_{incoming_hash[:7]}.png"
            final_path = os.path.join(upload_folder, unique_filename)
    
    with open(final_path, "wb") as buffer:
        buffer.write(content)

    return final_path