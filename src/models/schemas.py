"""
API 请求与响应的 Pydantic 模型
为所有端点提供类型安全的数据校验
"""
from typing import Any, Optional
from pydantic import BaseModel, Field


# ============================================
# 通用模型
# ============================================

class TranslationSettingsModel(BaseModel):
    """翻译 API 设置"""
    api_key: str = Field(..., min_length=1, description="API 访问密钥")
    base_url: str = Field(default="https://api.openai.com/v1", description="API 服务器地址")
    model_name: str = Field(default="gpt-4-1106-preview", description="语言模型名称")


class PromptsModel(BaseModel):
    """翻译提示词模板"""
    base_template: str = ""
    description_template: str = ""
    dialogue_template: str = ""


# ============================================
# 翻译 API
# ============================================

class TranslateRequest(BaseModel):
    """单字段翻译请求"""
    text: str = Field(..., min_length=1, description="待翻译文本")
    field_name: str = Field(..., min_length=1, description="字段名称")
    settings: TranslationSettingsModel
    prompts: PromptsModel
    glossary: str = Field(default="", description="词库文本")
    use_langgraph: bool = Field(default=True, description="是否使用 LangGraph 翻译器")


class TranslateResponse(BaseModel):
    """单字段翻译响应"""
    translated_text: str


class TranslateCharacterBookRequest(BaseModel):
    """角色书内容翻译请求"""
    content: str = Field(..., min_length=1, description="待翻译的角色书内容")
    settings: TranslationSettingsModel
    prompts: PromptsModel
    glossary: str = Field(default="", description="词库文本")
    use_langgraph: bool = Field(default=True)


class TranslateCharacterBookResponse(BaseModel):
    """角色书内容翻译响应"""
    translated_content: str


class BatchFieldItem(BaseModel):
    """批量翻译中的单个字段"""
    field_name: str
    text: str


class BatchTranslateRequest(BaseModel):
    """批量翻译请求"""
    fields: list[BatchFieldItem] = Field(..., min_length=1)
    settings: TranslationSettingsModel
    prompts: PromptsModel
    glossary: str = Field(default="", description="词库文本")
    use_langgraph: bool = Field(default=True)


class BatchTranslateResultItem(BaseModel):
    """批量翻译单个结果"""
    field_name: str
    original_text: str
    translated_text: str
    success: bool
    error: Optional[str] = None
    attempts: int = 1


class BatchTranslateResponse(BaseModel):
    """批量翻译响应"""
    results: list[BatchTranslateResultItem]
    progress: dict[str, int]


# ============================================
# AI Chat API
# ============================================

class ChatMessageModel(BaseModel):
    """单条对话消息"""
    role: str = Field(..., description="消息角色: user / assistant")
    content: str = Field(..., description="消息内容")


class AIChatRequest(BaseModel):
    """AI 对话请求"""
    messages: list[ChatMessageModel] = Field(..., min_length=1)
    settings: TranslationSettingsModel
    character_card: Optional[dict[str, Any]] = None


class AIChatResponse(BaseModel):
    """AI 对话响应"""
    reply: str


# ============================================
# 上传 API
# ============================================

class UploadResponse(BaseModel):
    """上传角色卡响应"""
    character_data: dict[str, Any]
    image_b64: str


# ============================================
# 健康检查
# ============================================

class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str = "ok"
    version: str
