"""
基于LangGraph的翻译器，与现有CharacterCardTranslator接口集成
"""
from typing import Dict
import logging
from .translation_graph import translation_graph, async_translation_graph

# 使用相对导入
from ..errors import parse_openai_error

logger = logging.getLogger(__name__)

class LangGraphCharacterCardTranslator:
    """基于LangGraph的角色卡翻译器"""
    
    def __init__(self, model_name: str, base_url: str, api_key: str, prompts: Dict[str, str], custom_logger=None):
        self.model_name = model_name
        self.base_url = base_url
        self.api_key = api_key
        self.prompts = prompts
        self.logger = custom_logger if custom_logger else logging.getLogger(__name__)
    
    def _get_system_prompt(self, field_name: str) -> str:
        """根据字段类型获取相应的系统提示词"""
        if field_name == "description":
            return self.prompts.get("description_template", "")
        elif field_name in ["first_mes", "mes_example", "alternate_greetings"]:
            return self.prompts.get("dialogue_template", "")
        else:
            return self.prompts.get("base_template", "")
    
    def translate_field(self, field_name: str, text: str) -> str:
        """使用LangGraph翻译单个字段"""
        if not text or not text.strip():
            self.logger.debug(f"字段 {field_name} 为空，跳过翻译。")
            return text
        
        system_prompt = self._get_system_prompt(field_name)
        
        # 初始化翻译图的状态
        initial_state = {
            "field_name": field_name,
            "original_text": text,
            "translated_text": "",
            "model_name": self.model_name,
            "base_url": self.base_url,
            "api_key": self.api_key,
            "system_prompt": system_prompt,
            "status": "pending",
            "error_message": None
        }
        
        try:
            # 执行翻译图
            final_state = translation_graph.invoke(initial_state)
            
            if final_state["status"] == "completed":
                self.logger.debug(f"字段 {field_name} 使用LangGraph翻译成功。")
                return final_state["translated_text"]
            else:
                self.logger.error(f"翻译字段 {field_name} 失败: {final_state['error_message']}")
                # 使用相同的错误解析逻辑
                error = parse_openai_error(Exception(final_state["error_message"]))
                raise error
                
        except Exception as e:
            self.logger.error(f"LangGraph翻译字段 {field_name} 失败: {str(e)}")
            # 使用相同的错误解析逻辑
            error = parse_openai_error(e)
            raise error
    
    def translate_character_book_content(self, content: str) -> str:
        """使用LangGraph翻译character_book内容"""
        if not content or not content.strip():
            self.logger.debug("character_book.content 为空，跳过翻译。")
            return content
        
        system_prompt = self.prompts.get("base_template", "")
        
        # 初始化翻译图的状态
        initial_state = {
            "field_name": "character_book.content",
            "original_text": content,
            "translated_text": "",
            "model_name": self.model_name,
            "base_url": self.base_url,
            "api_key": self.api_key,
            "system_prompt": system_prompt,
            "status": "pending",
            "error_message": None
        }
        
        try:
            # 执行翻译图
            final_state = translation_graph.invoke(initial_state)
            
            if final_state["status"] == "completed":
                self.logger.debug("character_book.content 使用LangGraph翻译成功。")
                return final_state["translated_text"]
            else:
                self.logger.error(f"翻译character_book.content失败: {final_state['error_message']}")
                # 使用相同的错误解析逻辑
                error = parse_openai_error(Exception(final_state["error_message"]))
                raise error
                
        except Exception as e:
            self.logger.error(f"LangGraph翻译character_book.content失败: {str(e)}")
            # 使用相同的错误解析逻辑
            error = parse_openai_error(e)
            raise error

    async def async_translate_field(self, field_name: str, text: str) -> str:
        """异步版本的translate_field，用于批量处理"""
        if not text or not text.strip():
            self.logger.debug(f"字段 {field_name} 为空，跳过翻译。")
            return text
        
        system_prompt = self._get_system_prompt(field_name)
        
        # 初始化翻译图的状态
        initial_state = {
            "field_name": field_name,
            "original_text": text,
            "translated_text": "",
            "model_name": self.model_name,
            "base_url": self.base_url,
            "api_key": self.api_key,
            "system_prompt": system_prompt,
            "status": "pending",
            "error_message": None
        }
        
        try:
            # 执行异步翻译图
            final_state = await async_translation_graph.ainvoke(initial_state)
            
            if final_state["status"] == "completed":
                self.logger.info(f"字段 {field_name} 使用异步LangGraph翻译成功。")
                return final_state["translated_text"]
            else:
                self.logger.error(f"异步翻译字段 {field_name} 失败: {final_state['error_message']}")
                # 使用相同的错误解析逻辑
                error = parse_openai_error(Exception(final_state["error_message"]))
                raise error
                
        except Exception as e:
            self.logger.error(f"异步LangGraph翻译字段 {field_name} 失败: {str(e)}")
            # 使用相同的错误解析逻辑
            error = parse_openai_error(e)
            raise error

    async def async_translate_character_book_content(self, content: str) -> str:
        """异步版本的translate_character_book_content"""
        if not content or not content.strip():
            self.logger.debug("character_book.content 为空，跳过翻译。")
            return content
        
        system_prompt = self.prompts.get("base_template", "")
        
        # 初始化翻译图的状态
        initial_state = {
            "field_name": "character_book.content",
            "original_text": content,
            "translated_text": "",
            "model_name": self.model_name,
            "base_url": self.base_url,
            "api_key": self.api_key,
            "system_prompt": system_prompt,
            "status": "pending",
            "error_message": None
        }
        
        try:
            # 执行异步翻译图
            final_state = await async_translation_graph.ainvoke(initial_state)
            
            if final_state["status"] == "completed":
                self.logger.info("character_book.content 使用异步LangGraph翻译成功。")
                return final_state["translated_text"]
            else:
                self.logger.error(f"异步翻译character_book.content失败: {final_state['error_message']}")
                # 使用相同的错误解析逻辑
                error = parse_openai_error(Exception(final_state["error_message"]))
                raise error
                
        except Exception as e:
            self.logger.error(f"异步LangGraph翻译character_book.content失败: {str(e)}")
            # 使用相同的错误解析逻辑
            error = parse_openai_error(e)
            raise error