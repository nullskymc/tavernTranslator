from api import app
import uvicorn

if __name__ == "__main__":
    # 添加服务器级别的限制，减少资源消耗
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8080,
        workers=1,  # 单进程模式，避免多进程竞争
        limit_concurrency=20,  # 提高并发连接数限制
        limit_max_requests=200,  # 提高最大请求数限制
        timeout_keep_alive=30,  # Keep-alive超时时间
    )
