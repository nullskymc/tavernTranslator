"""
健康检查路由
"""
from fastapi import APIRouter

from ..models.schemas import HealthResponse
from ..config.settings import get_settings

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查端点"""
    settings = get_settings()
    return HealthResponse(status="ok", version=settings.app_version)
