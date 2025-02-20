from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
import logging
import concurrent.futures

logging.basicConfig(level=logging.INFO)

# 翻译提示模板
translation_template = ChatPromptTemplate.from_messages([
    SystemMessage(content="""你是一个专业的翻译专家。请按照以下要求进行翻译：
1. 保持特殊格式（数字、符号、表情等）
2. 确保译文通顺自然
3. 保留原文的情感色彩和语气
4. 采用小说化翻译风格
5. 确保理解原文含义
6. 仅翻译对话和描述内容
7. 仅输出翻译结果
8. 保留角色名等标识信息
"""),
    HumanMessagePromptTemplate.from_template("请将以下{content_type}翻译成中文：\\n\\n{content}")
])

def create_llm(model_name: str, base_url: str, api_key: str):
    """创建LLM实例"""
    return ChatOpenAI(
        model_name=model_name,
        base_url=base_url,
        api_key=api_key,
        max_tokens=4096,
    )

def translate_single_text_sync(text: str, content_type: str, llm_instance) -> str:
    """同步翻译单个文本"""
    if not text or text.strip() == "":
        return text
    
    messages = translation_template.format_messages(
        content=text,
        content_type=content_type
    )
    response = llm_instance.invoke(messages)
    return response.content

def translate_greetings_sync(greetings_list, llm_instance):
    """并发翻译问候语列表"""
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = [
            executor.submit(translate_single_text_sync, greeting, "对话开场白", llm_instance) 
            for greeting in greetings_list
        ]
        return [future.result() for future in concurrent.futures.as_completed(futures)]

def translate_description_sync(desc: str, llm_instance):
    """翻译角色描述"""
    return translate_single_text_sync(desc, "角色描述", llm_instance)