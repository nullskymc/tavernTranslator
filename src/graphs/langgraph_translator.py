"""
基于 LangGraph 的翻译器，继承 BaseTranslator 并集成 LangGraph 工作流
"""
from typing import Dict
import logging

from .translation_graph import translation_graph, async_translation_graph
from ..services.translation_service import BaseTranslator
from ..errors import parse_openai_error

logger = logging.getLogger(__name__)


class LangGraphCharacterCardTranslator(BaseTranslator):
    """基于 LangGraph 的角色卡翻译器"""

    def __init__(self, model_name: str, base_url: str, api_key: str,
                 prompts: Dict[str, str], glossary: str = '',
                 custom_logger=None):
        super().__init__(model_name, base_url, api_key, prompts, glossary, custom_logger)

    # ------------------------------------------------------------------
    # 内部工具方法
    # ------------------------------------------------------------------

    def _build_initial_state(self, field_name: str, text: str, system_prompt: str) -> dict:
        """构建 LangGraph 翻译状态"""
        return {
            "field_name": field_name,
            "original_text": text,
            "translated_text": "",
            "model_name": self.model_name,
            "base_url": self.base_url,
            "api_key": self.api_key,
            "system_prompt": system_prompt,
            "status": "pending",
            "error_message": None,
        }

    def _handle_graph_result(self, final_state: dict, label: str) -> str:
        """处理翻译图的执行结果"""
        if final_state["status"] == "completed":
            self.logger.debug(f"{label} 使用 LangGraph 翻译成功。")
            return final_state["translated_text"]
        else:
            self.logger.error(f"翻译 {label} 失败: {final_state['error_message']}")
            error = parse_openai_error(Exception(final_state["error_message"]))
            raise error

    # ------------------------------------------------------------------
    # 同步接口
    # ------------------------------------------------------------------

    def translate_field(self, field_name: str, text: str) -> str:
        """使用 LangGraph 翻译单个字段"""
        if not text or not text.strip():
            self.logger.debug(f"字段 {field_name} 为空，跳过翻译。")
            return text

        system_prompt = self._get_system_prompt(field_name)
        initial_state = self._build_initial_state(field_name, text, system_prompt)

        try:
            final_state = translation_graph.invoke(initial_state)
            return self._handle_graph_result(final_state, f"字段 {field_name}")
        except Exception as e:
            self.logger.error(f"LangGraph 翻译字段 {field_name} 失败: {str(e)}")
            error = parse_openai_error(e)
            raise error

    def translate_character_book_content(self, content: str) -> str:
        """使用 LangGraph 翻译 character_book 内容"""
        if not content or not content.strip():
            self.logger.debug("character_book.content 为空，跳过翻译。")
            return content

        system_prompt = self.prompts.get("base_template", "") + self._build_glossary_instruction()
        initial_state = self._build_initial_state("character_book.content", content, system_prompt)

        try:
            final_state = translation_graph.invoke(initial_state)
            return self._handle_graph_result(final_state, "character_book.content")
        except Exception as e:
            self.logger.error(f"LangGraph 翻译 character_book.content 失败: {str(e)}")
            error = parse_openai_error(e)
            raise error

    # ------------------------------------------------------------------
    # 异步接口（用于批量处理）
    # ------------------------------------------------------------------

    async def async_translate_field(self, field_name: str, text: str) -> str:
        """异步版本的 translate_field，用于批量处理"""
        if not text or not text.strip():
            self.logger.debug(f"字段 {field_name} 为空，跳过翻译。")
            return text

        system_prompt = self._get_system_prompt(field_name)
        initial_state = self._build_initial_state(field_name, text, system_prompt)

        try:
            final_state = await async_translation_graph.ainvoke(initial_state)
            return self._handle_graph_result(final_state, f"字段 {field_name}")
        except Exception as e:
            self.logger.error(f"异步 LangGraph 翻译字段 {field_name} 失败: {str(e)}")
            error = parse_openai_error(e)
            raise error

    async def async_translate_character_book_content(self, content: str) -> str:
        """异步版本的 translate_character_book_content"""
        if not content or not content.strip():
            self.logger.debug("character_book.content 为空，跳过翻译。")
            return content

        system_prompt = self.prompts.get("base_template", "") + self._build_glossary_instruction()
        initial_state = self._build_initial_state("character_book.content", content, system_prompt)

        try:
            final_state = await async_translation_graph.ainvoke(initial_state)
            return self._handle_graph_result(final_state, "character_book.content")
        except Exception as e:
            self.logger.error(f"异步 LangGraph 翻译 character_book.content 失败: {str(e)}")
            error = parse_openai_error(e)
            raise error