from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI

import logging
import asyncio

# 创建翻译模板
translation_template = ChatPromptTemplate.from_messages([
    SystemMessage(content="""你是一个专业的翻译专家。请按照以下要求进行翻译：
1. 保持原有特殊格式，如数字、符号、表情等
2. 确保译文通顺自然
3. 保留原文的情感色彩和语气
4. 以小说的形式翻译，不要逐字逐句翻译
5. 请在翻译前确认理解原文的含义
6. 你翻译的是对话开场白或角色描述，不要添加额外内容
7. !!!只需要翻译，不要添加其他内容例如“好的，以下是翻译结果”等
8. 角色描述只需要翻译内容部分，保留角色名和其他信息
"""),
    HumanMessagePromptTemplate.from_template("请将以下{content_type}翻译成中文：\\n\\n{content}")
])

llm = ChatOpenAI(
    model_name="grok-2-1212",
    base_url='https://newapi.nullskymc.site/v1',
    api_key='sk-pAZWJMZpWAyi4wdVbxJHAUZu8Mm2NALEdbMWsVqQhR8jMEJV',
    max_tokens=4096,
)

# 异步翻译单个文本
async def translate_single_text(text: str, content_type: str) -> str:
    messages = translation_template.format_messages(
        content=text,
        content_type=content_type
    )
    # 修改调用方法以正确提交异步任务
    response = await llm.acall(messages)
    return response.content

# 异步处理 alternate_greetings
async def translate_greetings_async(greetings_list):
    tasks = [
        translate_single_text(greeting, "对话开场白")
        for greeting in greetings_list
    ]
    logging.info("翻译对话开场白中...")
    return await asyncio.gather(*tasks)

# 处理 description（异步）
async def translate_description_async(desc):
    logging.info("翻译角色描述中...")
    return await translate_single_text(desc, "角色描述")