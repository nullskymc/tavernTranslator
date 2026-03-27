"""
Tavern Translator — FastAPI 应用入口
使用工厂模式创建 FastAPI 应用实例
"""
import uvicorn
import logging
import sys
import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .config.settings import get_settings

# --- 日志配置 ---
log_format = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
date_format = "%Y-%m-%d %H:%M"

root_logger = logging.getLogger()
if root_logger.hasHandlers():
    root_logger.handlers.clear()

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter(log_format, datefmt=date_format))
root_logger.addHandler(handler)
root_logger.setLevel(logging.INFO)


def create_app() -> FastAPI:
    """应用工厂：创建并配置 FastAPI 实例"""
    settings = get_settings()
    settings.ensure_directories()

    application = FastAPI(
        title=settings.app_title,
        description=settings.app_description,
        version=settings.app_version,
    )

    # --- CORS 中间件 ---
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=settings.cors_allow_methods,
        allow_headers=settings.cors_allow_headers,
    )

    # --- 注册路由 ---
    from .routers import upload, translate, export, ai_chat, health

    application.include_router(upload.router)
    application.include_router(translate.router)
    application.include_router(export.router)
    application.include_router(ai_chat.router)
    application.include_router(health.router)

    # --- 静态文件与单页应用回退 ---
    static_files_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../vue-frontend", "dist")
    )

    if os.path.isdir(static_files_path):
        application.mount(
            "/", StaticFiles(directory=static_files_path, html=True), name="static"
        )

        @application.get("/{full_path:path}", include_in_schema=False)
        async def catch_all(full_path: str):
            index_path = os.path.join(static_files_path, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
            else:
                raise HTTPException(
                    status_code=404, detail="SPA 主页 index.html 未找到！"
                )
    else:
        logging.warning(
            f"前端静态文件目录不存在: {static_files_path}，跳过静态文件挂载。"
        )

    return application


# 创建应用实例（供 uvicorn 引用）
app = create_app()


# --- Uvicorn 启动器 ---
if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "src.app:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        workers=settings.workers,
        log_config=None,
    )
