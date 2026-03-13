import os
import uuid
import logging
import base64
import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Body, Form
from fastapi.responses import FileResponse
from typing import Dict, Any, List

from .extract_text import extract_embedded_text, embed_text_in_png
from .errors import TranslationError
from .utils import get_translator, handle_uploaded_file
from .batch_translate import BatchTranslator

# --- 配置 ---
UPLOAD_FOLDER = os.path.abspath(os.environ.get('UPLOAD_FOLDER', '.uploads'))
OUTPUT_FOLDER = os.path.abspath(os.environ.get('OUTPUT_FOLDER', '.output'))

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# --- FastAPI 路由 ---
router = APIRouter(prefix="/api/v1")

@router.post("/character/upload")
async def upload_character_card(file: UploadFile = File(...)):
    """
    接收上传的角色卡图片，提取JSON数据，并返回JSON和图片的Base64编码。
    文件将根据角色名称保存，并通过哈希校验避免重复。
    """
    if not file.filename.endswith('.png'):
        raise HTTPException(status_code=400, detail="文件类型无效，请上传 .png 文件。")

    content = await file.read()

    try:
        # 从图片内容中提取角色数据
        character_data = extract_embedded_text(content)
        if not character_data:
            character_data = {"data": {"name": "新角色", "description": ""}}
        else:
            # 检查数据结构，如果没有 "data" 字段，则包装一下
            # 某些角色卡（如 TavernAI/SillyTavern）直接存储字段，不带 "data" 包装
            if "data" not in character_data:
                character_data = {"data": character_data}

        # 使用辅助函数保存文件
        handle_uploaded_file(content, UPLOAD_FOLDER, character_data)

        # 准备响应
        image_b64 = base64.b64encode(content).decode('utf-8')
        image_b64_data_uri = f"data:image/png;base64,{image_b64}"

        return {"character_data": character_data, "image_b64": image_b64_data_uri}

    except Exception as e:
        logging.error(f"处理上传的卡片时出错：{e}")
        raise HTTPException(status_code=500, detail="处理上传的卡片时发生内部错误。")

@router.post("/character/translate")
async def translate_text_field(data: Dict[str, Any] = Body(...)):
    text_to_translate = data.get('text')
    field_name = data.get('field_name')
    settings = data.get('settings')
    prompts = data.get('prompts')  # 新增 prompts 参数
    glossary = data.get('glossary', '')  # 词库文本
    use_langgraph = data.get('use_langgraph', True)  # 默认使用LangGraph

    if not all([text_to_translate, field_name, settings, prompts]):
        raise HTTPException(status_code=400, detail="请求正文中缺少必要的参数。")

    if not text_to_translate.strip():
        return {"translated_text": ""}

    try:
        translator = get_translator(settings, prompts, use_langgraph, glossary)  # 将 prompts、use_langgraph 和 glossary 传递给 get_translator
        translated_text = translator.translate_field(field_name, text_to_translate)
        return {"translated_text": translated_text}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TranslationError as e:
        logging.error(f"翻译失败：{e.message}")
        raise HTTPException(status_code=500, detail=e.message)
    except Exception as e:
        logging.error(f"翻译过程中发生意外错误：{e}")
        raise HTTPException(status_code=500, detail="翻译过程中发生内部错误。")

@router.post("/character/translate-character-book")
async def translate_character_book_content(data: Dict[str, Any] = Body(...)):
    """翻译 character_book 中的 content 字段"""
    content_to_translate = data.get('content')
    settings = data.get('settings')
    prompts = data.get('prompts')
    glossary = data.get('glossary', '')  # 词库文本
    use_langgraph = data.get('use_langgraph', True)  # 默认使用LangGraph

    if not all([content_to_translate, settings, prompts]):
        raise HTTPException(status_code=400, detail="请求正文中缺少必要的参数。")

    if not content_to_translate.strip():
        return {"translated_content": ""}

    try:
        translator = get_translator(settings, prompts, use_langgraph, glossary)
        translated_content = translator.translate_character_book_content(content_to_translate)
        return {"translated_content": translated_content}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TranslationError as e:
        logging.error(f"翻译失败：{e.message}")
        raise HTTPException(status_code=500, detail=e.message)
    except Exception as e:
        logging.error(f"翻译过程中发生意外错误：{e}")
        raise HTTPException(status_code=500, detail="翻译过程中发生内部错误。")

@router.post("/character/batch-translate")
async def batch_translate_fields(data: Dict[str, Any] = Body(...)):
    """批量翻译多个字段"""
    fields = data.get('fields', [])
    settings = data.get('settings')
    prompts = data.get('prompts')
    glossary = data.get('glossary', '')  # 词库文本
    use_langgraph = data.get('use_langgraph', True)  # 默认使用LangGraph
    
    if not all([fields, settings, prompts]):
        raise HTTPException(status_code=400, detail="请求正文中缺少必要的参数。")
    
    if not isinstance(fields, list) or len(fields) == 0:
        return {"results": [], "progress": {"completed": 0, "total": 0}}
    
    try:
        translator = get_translator(settings, prompts, use_langgraph, glossary)
        batch_translator = BatchTranslator(translator, max_concurrent=3)  # 降低并发数避免限流
        
        # 转换字段格式以适应批量翻译器
        formatted_fields = []
        for field in fields:
            if isinstance(field, dict) and "field_name" in field and "text" in field:
                formatted_fields.append(field)
        
        # 进度跟踪
        progress_info = {"completed": 0, "total": len(formatted_fields)}
        
        async def progress_callback(completed, total):
            progress_info["completed"] = completed
            # 注意：在实际应用中，我们可能需要使用WebSocket或其他机制实时推送进度
            # 这里简化处理，仅在最终结果中返回进度信息
        
        results = await batch_translator.translate_fields(formatted_fields, progress_callback)
        return {
            "results": results, 
            "progress": progress_info
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TranslationError as e:
        logging.error(f"批量翻译失败：{e.message}")
        raise HTTPException(status_code=500, detail=e.message)
    except Exception as e:
        logging.error(f"批量翻译过程中发生意外错误：{e}")
        raise HTTPException(status_code=500, detail="批量翻译过程中发生内部错误。")

@router.post("/character/ai-chat")
async def ai_chat(data: Dict[str, Any] = Body(...)):
    """
    AI 辅助角色卡生成对话接口。
    接收对话历史和当前角色卡上下文，返回 AI 回复以帮助生成/完善角色卡。
    """
    messages = data.get('messages', [])
    settings = data.get('settings')
    character_card = data.get('character_card')

    if not settings or not settings.get('api_key'):
        raise HTTPException(status_code=400, detail="请先在设置中提供您的 API Key。")

    if not messages or len(messages) == 0:
        raise HTTPException(status_code=400, detail="消息列表不能为空。")

    try:
        from langchain_openai import ChatOpenAI
        from pydantic import SecretStr

        api_key = settings.get('api_key')
        base_url = settings.get('base_url', 'https://api.openai.com/v1')
        model_name = settings.get('model_name', 'gpt-4-1106-preview')

        llm = ChatOpenAI(
            model=model_name,
            base_url=base_url,
            api_key=SecretStr(api_key),
            max_completion_tokens=8192,
        )

        # 构建系统提示词
        system_prompt = """你是一个专业的 SillyTavern 角色卡创建助手。你的任务是帮助用户创建和完善 AI 角色卡。

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

        # 如果有当前角色卡数据，添加到系统提示中
        if character_card and isinstance(character_card, dict):
            card_data = character_card.get('data', character_card)
            card_info = json.dumps(card_data, ensure_ascii=False, indent=2)
            system_prompt += f"\n\n当前角色卡数据：\n```json\n{card_info}\n```\n请基于上述现有数据为用户提供建议和帮助。"

        # 构建 LangChain 消息列表
        from langchain_core.messages import SystemMessage as LCSystemMessage, HumanMessage, AIMessage
        
        lc_messages = [LCSystemMessage(content=system_prompt)]
        
        for msg in messages:
            role = msg.get('role', '')
            content = msg.get('content', '')
            if role == 'user':
                lc_messages.append(HumanMessage(content=content))
            elif role == 'assistant':
                lc_messages.append(AIMessage(content=content))

        response = llm.invoke(lc_messages)
        
        ai_content = response.content if isinstance(response.content, str) else str(response.content)

        return {"reply": ai_content}

    except Exception as e:
        logging.error(f"AI 对话过程中发生错误：{e}")
        error_message = str(e)
        if "auth" in error_message.lower() or "api key" in error_message.lower():
            raise HTTPException(status_code=401, detail="API Key 无效或已过期。")
        elif "rate" in error_message.lower():
            raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试。")
        raise HTTPException(status_code=500, detail=f"AI 对话过程中发生错误：{error_message}")

@router.post("/character/export")
async def export_character_card(
    json_data: str = Form(...),
    image_file: UploadFile = File(...)
):
    """
    接收角色卡的JSON数据和一张基础图片, 生成并返回嵌入了该数据的新PNG图片。
    """
    try:
        character_data = json.loads(json_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="提供了无效的JSON数据。")

    temp_image_path = os.path.join(UPLOAD_FOLDER, f"export_base_{uuid.uuid4().hex}.png")
    output_path = os.path.join(OUTPUT_FOLDER, f"character_export_{uuid.uuid4().hex}.png")

    try:
        with open(temp_image_path, "wb") as buffer:
            buffer.write(await image_file.read())

        result_path = embed_text_in_png(temp_image_path, character_data, output_path)

        if result_path:
            # 兼容两种数据结构：带 "data" 包装和不带包装
            if "data" in character_data and isinstance(character_data["data"], dict):
                char_name = character_data["data"].get("name", "character")
            else:
                char_name = character_data.get("name", "character")
            download_name = f"{char_name}.png"
            return FileResponse(path=result_path, media_type='image/png', filename=download_name)
        else:
            raise HTTPException(status_code=500, detail="无法将数据嵌入图片。")
    except Exception as e:
        logging.error(f"导出角色卡时出错：{e}")
        raise HTTPException(status_code=500, detail="导出过程中发生内部错误。")
    finally:
        # 确保临时文件在操作完成后被删除
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)