from typing import Any, Dict, Optional
import json
import os
import re
import hashlib

from .translate import CharacterCardTranslator

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

def get_translator(settings: Optional[Dict[str, str]] = None) -> CharacterCardTranslator:
    """根据提供的设置或环境变量初始化并返回CharacterCardTranslator实例。"""
    settings = settings or {}
    api_key = settings.get('api_key') or os.environ.get('OPENAI_API_KEY')
    base_url = settings.get('base_url') or os.environ.get('OPENAI_API_BASE', "https://api.openai.com/v1")
    model_name = settings.get('model_name') or os.environ.get('MODEL_NAME', "gpt-4-1106-preview")
    if not all([api_key, base_url, model_name]):
        raise ValueError("翻译器配置不完整，请在设置中提供 API Key, Base URL 和模型名称。")
    return CharacterCardTranslator(model_name=model_name, base_url=base_url, api_key=api_key)

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