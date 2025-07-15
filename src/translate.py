from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import SecretStr
import logging
import concurrent.futures
import time
import threading
from typing import List, Dict, Any, Optional

# 使用相对导入
from .errors import (
    TranslationError, ErrorCode, ErrorSeverity,
    parse_openai_error, format_error_for_log, TaskCancelledException
)

logging.basicConfig(level=logging.INFO)

class CharacterCardTranslator:
    """角色卡翻译器 - 简化版，���于同步API调用"""
    def __init__(self, model_name: str, base_url: str, api_key: str, custom_logger=None):
        self.llm = ChatOpenAI(
            model=model_name,
            base_url=base_url,
            api_key=SecretStr(api_key),
            max_completion_tokens=8192,
        )
        self.logger = custom_logger if custom_logger else logging.getLogger(__name__)
        
        # 基础翻译提示
        self.base_template = ChatPromptTemplate.from_messages([
            SystemMessage(content="""你是一个专业的翻译专家。请按照以下要求进行翻译：
1. 保持特殊格式（数字、符号、表情等）
2. 确保译文通顺自然
3. 保留原文的情感色彩和语气
4. 采用小说化翻译风格
5. 确保理解原文含义
6. 仅翻译内容文本
7. 仅输出翻译结果
8. 保留角色名等标识信息
"""),
            HumanMessagePromptTemplate.from_template("{text}")
        ])
        
        # 角色描述翻译提示
        self.description_template = ChatPromptTemplate.from_messages([
            SystemMessage(content="""你是一个专业的角色设定翻译专家。请按照以下要求翻译角色描述：
1. 保持方括号[]内的格式标记
2. 保留所有加号+连接的属性列表
3. 确保人物特征的准确传达
4. 保持描述的细节完整性
5. 仅翻译描述文本
6. 保留角色名和占位符{{char}}
7. 确保译文通顺自然
"""),
            HumanMessagePromptTemplate.from_template("{text}")
        ])
        
        # 对话模板翻译提示
        self.dialogue_template = ChatPromptTemplate.from_messages([
            SystemMessage(content="""你是一个专业的对话翻译专家。请按照以下要求翻译对话内容：
1. 保持对话的自然流畅
2. 传达原文的情感和语气
3. 保留对话标记和格式
4. 采用贴近日常的表达
5. 保持人物性格特征
6. 保留角色名和占位符
7. 准确翻译心理活动
8. 确保对话的连贯性
"""),
            HumanMessagePromptTemplate.from_template("{text}")
        ])
    
    def translate_field(self, field_name: str, text: str) -> str:
        """根据字段类型选择合适的模板进行翻译"""
        if not text or not text.strip():
            self.logger.info(f"字段 {field_name} 为空，跳过翻译")
            return text
        
        # 选择合适的模板
        template = self.base_template
        if field_name == "description":
            template = self.description_template
        elif field_name in ["first_mes", "mes_example", "alternate_greetings"]:
            template = self.dialogue_template
        
        try:
            messages = template.format_messages(text=text)
            response = self.llm.invoke(messages)
            
            self.logger.info(f"字段 {field_name} 翻译完成")
            
            # 确保返回的是字符串
            if isinstance(response.content, str):
                return response.content
            return str(response.content)
        
        except Exception as e:
            # 转换为标准错误格式并重新抛出
            error = parse_openai_error(e)
            self.logger.error(f"翻译字段 {field_name} 时出错: {error.message}")
            raise error
