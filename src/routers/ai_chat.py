"""
AI 辅助角色卡生成对话路由
"""
import json
import logging

from fastapi import APIRouter, HTTPException

from ..models.schemas import AIChatRequest, AIChatResponse

router = APIRouter(prefix="/api/v1", tags=["ai-chat"])
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# 系统提示词（从路由函数中分离为常量）
# ------------------------------------------------------------------

AI_CHAT_SYSTEM_PROMPT = """你是一个专业的 SillyTavern 角色卡创建助手。你的任务是帮助用户创建和完善 AI 角色卡。

角色卡包含以下字段：
- name: 角色名称
- description: 角色描述（外貌、背景、性格特征等详细设定）
- personality: 性格特征（简要概括）
- scenario: 场景设定（故事发生的背景）
- first_mes: 第一条消息（角色的开场白）
- alternate_greetings: 备用问候语（角色的备选开场白列表，是一个字符串数组）
- mes_example: 示例对话（展示角色的说话风格和互动方式）
- creator_notes: 创作者笔记
- system_prompt: 系统提示词（给 AI 的角色扮演指令）
- post_history_instructions: 历史指令（附加在对话历史后的指令）
- tags: 标签

你应该：
1. 根据用户的描述，帮助生成角色卡的各个字段内容
2. 提供创意建议和改进意见
3. 确保角色设定的一致性和丰富度
4. 当用户提供模糊的想法时，帮助他们细化和具象化
5. 可以一次性生成完整的角色卡，也可以逐字段讨论完善

当用户要求生成角色卡内容时，请使用以下 JSON 格式输出（可以只输出需要的字段）：
```json
{
  "name": "角色名",
  "description": "详细描述",
  "personality": "性格特征",
  "scenario": "场景设定",
  "first_mes": "第一条消息",
  "alternate_greetings": ["备用问候语1", "备用问候语2"],
  "mes_example": "示例对话",
  "creator_notes": "创作者笔记",
  "system_prompt": "系统提示词",
  "post_history_instructions": "历史指令",
  "tags": ["标签1", "标签2"]
}
```

在对话中要友好、专业，并根据用户的语言（中文或英文）来回复。"""


@router.post("/character/ai-chat", response_model=AIChatResponse)
async def ai_chat(data: AIChatRequest):
    """
    AI 辅助角色卡生成对话接口。
    接收对话历史和当前角色卡上下文，返回 AI 回复以帮助生成/完善角色卡。
    """
    if not data.settings.api_key:
        raise HTTPException(status_code=400, detail="请先在设置中提供您的 API Key。")

    try:
        from langchain_openai import ChatOpenAI
        from pydantic import SecretStr
        from langchain_core.messages import (
            SystemMessage as LCSystemMessage,
            HumanMessage,
            AIMessage,
        )

        llm = ChatOpenAI(
            model=data.settings.model_name,
            base_url=data.settings.base_url,
            api_key=SecretStr(data.settings.api_key),
            max_completion_tokens=8192,
        )

        # 构建系统提示词
        system_prompt = AI_CHAT_SYSTEM_PROMPT

        if data.character_card and isinstance(data.character_card, dict):
            card_data = data.character_card.get('data', data.character_card)
            card_info = json.dumps(card_data, ensure_ascii=False, indent=2)
            system_prompt += (
                f"\n\n当前角色卡数据：\n```json\n{card_info}\n```\n"
                "请基于上述现有数据为用户提供建议和帮助。"
            )

        # 构建 LangChain 消息列表
        lc_messages = [LCSystemMessage(content=system_prompt)]

        for msg in data.messages:
            if msg.role == 'user':
                lc_messages.append(HumanMessage(content=msg.content))
            elif msg.role == 'assistant':
                lc_messages.append(AIMessage(content=msg.content))

        response = llm.invoke(lc_messages)

        ai_content = response.content if isinstance(response.content, str) else str(response.content)

        return AIChatResponse(reply=ai_content)

    except Exception as e:
        logger.error(f"AI 对话过程中发生错误：{e}")
        error_message = str(e)
        if "auth" in error_message.lower() or "api key" in error_message.lower():
            raise HTTPException(status_code=401, detail="API Key 无效或已过期。")
        elif "rate" in error_message.lower():
            raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试。")
        raise HTTPException(
            status_code=500, detail=f"AI 对话过程中发生错误：{error_message}"
        )
