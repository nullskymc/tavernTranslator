
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

# 导入API路由
from .api import router as api_router

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Tavern Translator",
    description="A tool to edit and translate character cards.",
    version="2.0.0"
)

# --- API Router ---
# 包含来自 api.py 的所有路由, 前缀为 /api/v1
app.include_router(api_router)

# --- Static Files and SPA Fallback ---
# 获取静态文件目录的绝对路径
# 我们假设 app.py 在 src/ 目录下, 而 static 在项目根目录
static_files_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../vue-frontend", "dist"))

# 挂载静态文件目录到 /
# 这将处理所有对 CSS, JS, images 等文件的请求
app.mount("/", StaticFiles(directory=static_files_path, html=True), name="static")

# 创建一个捕获所有未匹配路由的处理器，用于支持SPA（单页应用）
# 这样，当用户刷新页面时，如访问 /some/path，也能返回 index.html
@app.get("/{full_path:path}", include_in_schema=False)
async def catch_all(full_path: str):
    index_path = os.path.join(static_files_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        raise HTTPException(status_code=404, detail="SPA index.html not found!")

# --- Uvicorn Runner ---
if __name__ == "__main__":
    # 生产环境配置
    uvicorn.run(
        "src.app:app", 
        host="0.0.0.0", 
        port=8080,
        reload=False,  # 生产环境禁用自动重载
        workers=4      # 生产环境使用多个 worker
    )
