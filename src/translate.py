"""
角色卡翻译器 - 基于 LangChain 的同步实现
"""
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import SecretStr
import logging
from typing import Dict

from .services.translation_service import BaseTranslator
from .errors import parse_openai_error

logging.basicConfig(level=logging.INFO)


class CharacterCardTranslator(BaseTranslator):
    """角色卡翻译器 - 简化版，用于同步 API 调用。"""

    def __init__(self, model_name: str, base_url: str, api_key: str,
                 prompts: Dict[str, str], glossary: str = '',
                 custom_logger=None):
        super().__init__(model_name, base_url, api_key, prompts, glossary, custom_logger)

        self.llm = ChatOpenAI(
            model=model_name,
            base_url=base_url,
            api_key=SecretStr(api_key),
            max_completion_tokens=8192,
        )

        # 从传入的 prompts 字典动态创建模板
        self.base_template = self._create_prompt_template(prompts.get("base_template", ""))
        self.description_template = self._create_prompt_template(prompts.get("description_template", ""))
        self.dialogue_template = self._create_prompt_template(prompts.get("dialogue_template", ""))

    def _create_prompt_template(self, system_content: str) -> ChatPromptTemplate:
        """根据系统内容创建聊天提示模板。"""
        full_system_content = system_content + self._build_glossary_instruction()
        return ChatPromptTemplate.from_messages([
            SystemMessage(content=full_system_content),
            HumanMessagePromptTemplate.from_template("{text}")
        ])

    def _select_template(self, field_name: str) -> ChatPromptTemplate:
        """根据字段名选择对应的提示模板"""
        if field_name == "description":
            return self.description_template
        elif field_name in ("first_mes", "mes_example", "alternate_greetings"):
            return self.dialogue_template
        else:
            return self.base_template

    def translate_field(self, field_name: str, text: str) -> str:
        """根据字段类型选择合适的模板进行翻译。"""
        if not text or not text.strip():
            self.logger.debug(f"字段 {field_name} 为空，跳过翻译。")
            return text

        template = self._select_template(field_name)

        try:
            messages = template.format_messages(text=text)
            response = self.llm.invoke(messages)

            self.logger.debug(f"字段 {field_name} 翻译完成。")

            if isinstance(response.content, str):
                return response.content
            return str(response.content)

        except Exception as e:
            error = parse_openai_error(e)
            self.logger.error(f"翻译字段 {field_name} 时出错: {error.message}")
            raise error

    def translate_character_book_content(self, content: str) -> str:
        """翻译 character_book 中的 content 字段"""
        if not content or not content.strip():
            self.logger.debug("character_book.content 为空，跳过翻译。")
            return content

        try:
            messages = self.base_template.format_messages(text=content)
            response = self.llm.invoke(messages)

            self.logger.debug("character_book.content 翻译完成。")

            if isinstance(response.content, str):
                return response.content
            return str(response.content)

        except Exception as e:
            error = parse_openai_error(e)
            self.logger.error(f"翻译 character_book.content 时出错: {error.message}")
            raise error
