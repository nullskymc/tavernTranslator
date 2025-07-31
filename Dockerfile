# === 阶段 1: 构建 Vue.js 前端 ===
# 使用官方的 Node.js 20 slim 镜像作为构建环境，并将其命名为 "builder"
# slim 版本体积更小，包含了构建所需的最小依赖
FROM node:20-slim AS builder

# 设置工作目录为 /app/vue-frontend
WORKDIR /app/vue-frontend

# 复制 package.json 和 package-lock.json (如果存在)
# 这样可以利用 Docker 的缓存机制，只有当这些文件变化时才重新安装依赖
COPY vue-frontend/package.json vue-frontend/package-lock.json* ./

# 安装所有在 package.json 中定义的前端依赖
RUN npm install

# 复制所有前端源代码到工作目录
COPY vue-frontend/ ./

# 执行构建命令，编译 Vue.js 项目
# 这会生成一个包含优化后静态文件（HTML, JS, CSS）的 `dist` 目录
RUN npm run build

# === 阶段 2: 构建最终的 Python 应用镜像 ===
# 使用官方的 Python 3.11 slim 镜像作为最终的应用环境
# slim 版本同样是为了减小最终镜像的体积
FROM python:3.11-slim

# 设置工作目录为 /app
WORKDIR /app

# 设置环境变量，优化 Python 运行
ENV PYTHONDONTWRITEBYTECODE 1  # 防止 Python 生成 .pyc 文件
ENV PYTHONUNBUFFERED 1         # 确保 Python 输出直接发送到终端，便于日志查看

# 复制依赖定义文件
COPY requirements.txt .

# 安装所有在 requirements.txt 中定义的 Python 依赖
# --no-cache-dir 选项可以减小镜像体积
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端 Python 源代码
COPY src/ ./src/

# 从 "builder" 阶段复制编译好的前端静态文件
# 将 `builder` 阶段的 /app/vue-frontend/dist 目录内容，复制到最终镜像的 ./vue-frontend/dist/ 目录
# 这是实现前后端分离构建并集成的关键步骤
COPY --from=builder /app/vue-frontend/dist ./vue-frontend/dist/

# 声明应用运行时监听的端口
EXPOSE 8080

# 定义容器启动时执行的命令
# 使用 uvicorn 启动 FastAPI 应用
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8080"]
