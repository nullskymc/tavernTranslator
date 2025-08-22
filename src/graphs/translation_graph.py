"""
基于LangGraph的角色卡翻译工作流
"""
from typing import TypedDict, Annotated, Literal
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import SecretStr
import logging

logger = logging.getLogger(__name__)

class TranslationState(TypedDict):
    """翻译工作流的状态"""
    field_name: str
    original_text: str
    translated_text: str
    model_name: str
    base_url: str
    api_key: str
    system_prompt: str
    status: Literal["pending", "translating", "completed", "error"]
    error_message: str | None

def create_translation_llm(model_name: str, base_url: str, api_key: str):
    """创建配置好的LLM用于翻译"""
    return ChatOpenAI(
        model=model_name,
        base_url=base_url,
        api_key=SecretStr(api_key),
        max_completion_tokens=8192,
    )

def validate_input(state: TranslationState) -> TranslationState:
    """验证输入参数"""
    if not state["original_text"] or not state["original_text"].strip():
        return {
            **state,
            "status": "completed",
            "translated_text": "",
            "error_message": None
        }
    
    if not all([state["model_name"], state["api_key"], state["system_prompt"]]):
        return {
            **state,
            "status": "error",
            "error_message": "缺少必要的配置: model_name, api_key, 或 system_prompt"
        }
    
    return {**state, "status": "translating"}

def translate_text(state: TranslationState) -> TranslationState:
    """使用配置的LLM翻译文本"""
    try:
        llm = create_translation_llm(
            state["model_name"],
            state["base_url"],
            state["api_key"]
        )
        
        messages = [
            SystemMessage(content=state["system_prompt"]),
            HumanMessage(content=state["original_text"])
        ]
        
        response = llm.invoke(messages)
        
        translated_text = response.content if isinstance(response.content, str) else str(response.content)
        
        logger.debug(f"字段 {state['field_name']} 翻译成功。")
        
        return {
            **state,
            "translated_text": translated_text,
            "status": "completed",
            "error_message": None
        }
        
    except Exception as e:
        logger.error(f"翻译字段 {state['field_name']} 时出错: {str(e)}")
        return {
            **state,
            "status": "error",
            "error_message": str(e)
        }

def handle_error(state: TranslationState) -> TranslationState:
    """处理翻译错误"""
    logger.error(f"翻译字段 {state['field_name']} 时出错: {state['error_message']}")
    return {
        **state,
        "translated_text": "",
        "status": "error"
    }

# Create the translation workflow graph
builder = StateGraph(TranslationState)

# Add nodes
builder.add_node("validate_input", validate_input)
builder.add_node("translate_text", translate_text)
builder.add_node("handle_error", handle_error)

# Set entry point
builder.set_entry_point("validate_input")

# Add conditional edges
builder.add_conditional_edges(
    "validate_input",
    lambda state: "translate_text" if state["status"] == "translating" else END
)

builder.add_conditional_edges(
    "translate_text",
    lambda state: END if state["status"] == "completed" else "handle_error"
)

builder.add_edge("handle_error", END)

# Compile the graph
translation_graph = builder.compile()

# Async version for batch processing
async def async_translate_text(state: TranslationState) -> TranslationState:
    """Async version of translate_text for batch processing."""
    try:
        llm = create_translation_llm(
            state["model_name"],
            state["base_url"],
            state["api_key"]
        )
        
        messages = [
            SystemMessage(content=state["system_prompt"]),
            HumanMessage(content=state["original_text"])
        ]
        
        response = await llm.ainvoke(messages)
        
        translated_text = response.content if isinstance(response.content, str) else str(response.content)
        
        logger.debug(f"Field {state['field_name']} translated successfully.")
        
        return {
            **state,
            "translated_text": translated_text,
            "status": "completed",
            "error_message": None
        }
        
    except Exception as e:
        logger.error(f"Translation failed for field {state['field_name']}: {str(e)}")
        return {
            **state,
            "status": "error",
            "error_message": str(e)
        }

# Create async graph builder
async_builder = StateGraph(TranslationState)
async_builder.add_node("validate_input", validate_input)
async_builder.add_node("translate_text", async_translate_text)
async_builder.add_node("handle_error", handle_error)
async_builder.set_entry_point("validate_input")
async_builder.add_conditional_edges(
    "validate_input",
    lambda state: "translate_text" if state["status"] == "translating" else END
)
async_builder.add_conditional_edges(
    "translate_text",
    lambda state: END if state["status"] == "completed" else "handle_error"
)
async_builder.add_edge("handle_error", END)

async_translation_graph = async_builder.compile()