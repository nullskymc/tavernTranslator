from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
import logging
import concurrent.futures
from typing import List, Dict, Any, Optional

logging.basicConfig(level=logging.INFO)

class CharacterCardTranslator:
    """角色卡翻译器"""
    
    def __init__(self, model_name: str, base_url: str, api_key: str):
        self.llm = ChatOpenAI(
            model_name=model_name,
            base_url=base_url,
            api_key=api_key,
            max_tokens=4096,
        )
        
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
        """根据字段类型选择合适的模板翻译"""
        if not text or text.strip() == "":
            return text
            
        template = self.base_template
        if field_name == "description":
            template = self.description_template
        elif field_name in ["first_mes", "mes_example"]:
            template = self.dialogue_template
            
        messages = template.format_messages(text=text)
        response = self.llm.invoke(messages)
        return response.content
    
    def translate_greeting_list(self, greetings: List[str]) -> List[str]:
        """并发翻译问候语列表"""
        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [
                executor.submit(self.translate_field, "alternate_greetings", greeting)
                for greeting in greetings if greeting.strip()
            ]
            return [future.result() for future in concurrent.futures.as_completed(futures)]
    
    def translate_character_card(self, card_data: Dict[str, Any]) -> Dict[str, Any]:
        """翻译完整的角色卡数据"""
        try:
            data = card_data.get("data", {})
            
            # 需要翻译的字段
            fields_to_translate = [
                "description",
                "personality",
                "scenario", 
                "first_mes",
                "mes_example",
                "system_prompt"
            ]
            
            # 翻译主要字段
            for field in fields_to_translate:
                if data.get(field):
                    logging.info(f"正在翻译 {field}...")
                    data[field] = self.translate_field(field, data[field])
            
            # 翻译问候语列表
            if data.get("alternate_greetings"):
                logging.info("正在翻译问候语...")
                data["alternate_greetings"] = self.translate_greeting_list(
                    data["alternate_greetings"]
                )
                
            card_data["data"] = data
            return card_data
            
        except Exception as e:
            logging.error(f"翻译角色卡时出错：{str(e)}")
            raise

# 修改兼容层函数
def create_llm(model_name: str, base_url: str, api_key: str):
    """创建LLM实例，返回CharacterCardTranslator实例"""
    return CharacterCardTranslator(model_name, base_url, api_key)

def translate_single_text_sync(text: str, content_type: str, translator) -> str:
    """同步翻译单个文本"""
    if not text or text.strip() == "":
        return text
        
    try:
        # 字段类型映射
        field_map = {
            "对话内容": "first_mes",
            "对话开场白": "first_mes",
            "角色描述": "description",
            "性格设定": "personality",
            "对话示例": "mes_example",
            "系统提示词": "system_prompt",
            "场景描述": "scenario"
        }
        field_type = field_map.get(content_type, "base")
        return translator.translate_field(field_type, text)
    except Exception as e:
        logging.error(f"翻译文本时出错: {str(e)}")
        return text

def translate_greetings_sync(greetings_list, translator):
    """并发翻译问候语列表"""
    if not greetings_list:
        return greetings_list
        
    try:
        return translator.translate_greeting_list(greetings_list)
    except Exception as e:
        logging.error(f"翻译问候语列表时出错: {str(e)}")
        return greetings_list

def translate_description_sync(desc: str, translator):
    """翻译角色描述"""
    if not desc or desc.strip() == "":
        return desc
        
    try:
        return translator.translate_field("description", desc)
    except Exception as e:
        logging.error(f"翻译描述时出错: {str(e)}")
        return desc