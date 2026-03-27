"""
翻译服务基类
抽取 CharacterCardTranslator 和 LangGraphCharacterCardTranslator 的共享逻辑
"""
import logging
from abc import ABC, abstractmethod
from typing import Dict


logger = logging.getLogger(__name__)


class BaseTranslator(ABC):
    """翻译器基类，封装共享的 glossary 和 prompt 选择逻辑"""

    def __init__(self, model_name: str, base_url: str, api_key: str,
                 prompts: Dict[str, str], glossary: str = '',
                 custom_logger=None):
        self.model_name = model_name
        self.base_url = base_url
        self.api_key = api_key
        self.prompts = prompts
        self.glossary = glossary
        self.logger = custom_logger if custom_logger else logging.getLogger(
            self.__class__.__name__
        )

    # ------------------------------------------------------------------
    # 共享辅助方法
    # ------------------------------------------------------------------

    def _build_glossary_instruction(self) -> str:
        """构建词库提示文本，附加到系统提示词后面。"""
        if not self.glossary or not self.glossary.strip():
            return ''
        return (
            "\n\n【翻译词库 / Translation Glossary】\n"
            "以下是必须严格遵守的术语对照表，翻译时遇到这些词汇必须使用指定的译文，不得自行翻译：\n"
            "The following is a mandatory glossary. When encountering these terms, "
            "you MUST use the specified translations:\n"
            f"{self.glossary}"
        )

    def _get_system_prompt(self, field_name: str) -> str:
        """根据字段类型获取相应的系统提示词（含词库指示）"""
        if field_name == "description":
            base_prompt = self.prompts.get("description_template", "")
        elif field_name in ("first_mes", "mes_example", "alternate_greetings"):
            base_prompt = self.prompts.get("dialogue_template", "")
        else:
            base_prompt = self.prompts.get("base_template", "")
        return base_prompt + self._build_glossary_instruction()

    # ------------------------------------------------------------------
    # 子类必须实现的翻译方法
    # ------------------------------------------------------------------

    @abstractmethod
    def translate_field(self, field_name: str, text: str) -> str:
        """翻译单个字段"""
        ...

    @abstractmethod
    def translate_character_book_content(self, content: str) -> str:
        """翻译 character_book 中的 content 字段"""
        ...
