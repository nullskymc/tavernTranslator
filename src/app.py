
import uvicorn
import logging
import sys
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

# 导入API路由
from .api import router as api_router

# --- 日志配置 ---
# 移除并重新配置日志处理器，确保格式统一
log_format = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
date_format = "%Y-%m-%d %H:%M"

# 获取根日志记录器
root_logger = logging.getLogger()
# 移除所有现有的处理器
if root_logger.hasHandlers():
    root_logger.handlers.clear()

# 添加一个新的流处理器
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter(log_format, datefmt=date_format))
root_logger.addHandler(handler)
root_logger.setLevel(logging.INFO)

# --- FastAPI 应用初始化 ---
app = FastAPI(
    title="酒馆翻译器",
    description="一个用于编辑和翻译角色卡的工具。",
    version="2.0.0"
)

# --- API 路由 ---
# 包含来自 api.py 的所有路由, 前缀为 /api/v1
app.include_router(api_router)

# --- 静态文件与单页应用回退 ---
# 获取静态文件目录的绝对路径
# 我们假设 app.py 在 src/ 目录下, 而 vue-frontend/dist 是静态文件目录
static_files_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../vue-frontend", "dist"))

# 挂载静态文件目录到 /
# 这将处理所有对 CSS, JS, 图片等文件的请求
app.mount("/", StaticFiles(directory=static_files_path, html=True), name="static")

# 创建一个捕获所有未匹配路由的处理器，用于支持单页应用（SPA）
# 这样，当用户刷新页面时（例如访问 /some/path），也能返回 index.html
@app.get("/{full_path:path}", include_in_schema=False)
async def catch_all(full_path: str):
    index_path = os.path.join(static_files_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        raise HTTPException(status_code=404, detail="SPA 主页 index.html 未找到！")

# --- Uvicorn 启动器 ---
if __name__ == "__main__":
    # 生产环境配置
    uvicorn.run(
        "src.app:app", 
        host="0.0.0.0", 
        port=8080,
        reload=False,  # 生产环境禁用自动重载
        workers=4,      # 生产环境使用多个 worker
        log_config=None # 禁用默认的日志配置，使用我们自定义的
    )
