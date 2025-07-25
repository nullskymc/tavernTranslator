# ---- Builder Stage ----
# 1. 构建前端
FROM node:20-slim as builder

WORKDIR /app/vue-frontend

# 仅复制 package.json 和 package-lock.json 以利用缓存
COPY vue-frontend/package*.json ./
RUN npm install

# 复制前端源代码并构建
COPY vue-frontend/ ./
RUN npm run build

# ---- Python Base Stage ----
# 2. 准备 Python 环境
FROM python:3.11-slim as python-base

WORKDIR /app

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- Final Stage ----
# 3. 构建最终镜像
FROM python:3.11-slim

WORKDIR /app

# 从 python-base 阶段复制已安装的依赖
COPY --from=python-base /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=python-base /app/ /app/

# 从 builder 阶段复制前端构建产物
COPY --from=builder /app/vue-frontend/dist ./vue-frontend/dist

# 复制后端源代码
COPY src/ ./src/

# 创建必要的目录
RUN mkdir -p .uploads .output

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["python", "-m", "src.app"]
