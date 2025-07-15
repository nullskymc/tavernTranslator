# 使用官方的Python 3.11基础镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 安装Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# 复制项目文件
COPY . .

# 设置deploy.sh为可执行
RUN chmod +x deploy.sh

# 使用deploy.sh脚本构建项目
RUN ./deploy.sh --docker-build

# 创建必要的目录
RUN mkdir -p .uploads .output

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["python", "-m", "src.app"]
