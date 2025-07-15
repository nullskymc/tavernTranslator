#!/bin/bash

# =============================================================================
# Tavern Translator 统一部署脚本
# 功能：自动化环境检查、依赖安装、前端构建、后端启动
# =============================================================================

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="$PROJECT_ROOT/.venv"
FRONTEND_PATH="$PROJECT_ROOT/vue-frontend"
STATIC_PATH="$PROJECT_ROOT/static"
BACKEND_PATH="$PROJECT_ROOT/src"

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo -e "${PURPLE}🔧 $1${NC}"
}

print_banner() {
    echo -e "${CYAN}"
    echo "=============================================="
    echo "🏺 Tavern Translator 统一部署脚本"
    echo "=============================================="
    echo -e "${NC}"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

# 检查 Python 虚拟环境
check_python_env() {
    print_step "检查 Python 环境..."
    
    check_command "python3"
    
    if [ ! -d "$VENV_PATH" ]; then
        print_info "创建 Python 虚拟环境..."
        python3 -m venv "$VENV_PATH"
        print_success "虚拟环境创建完成"
    else
        print_success "虚拟环境已存在"
    fi
}

# 安装 Python 依赖
install_python_deps() {
    print_step "安装 Python 依赖..."
    
    source "$VENV_PATH/bin/activate"
    
    if [ -f "$PROJECT_ROOT/requirements.txt" ]; then
        pip install -r "$PROJECT_ROOT/requirements.txt" --quiet
        print_success "Python 依赖安装完成"
    else
        print_error "requirements.txt 文件不存在"
        exit 1
    fi
}

# 检查 Node.js 环境
check_node_env() {
    print_step "检查 Node.js 环境..."
    
    check_command "node"
    check_command "npm"
    
    if [ ! -d "$FRONTEND_PATH/node_modules" ]; then
        print_info "安装前端依赖..."
        cd "$FRONTEND_PATH"
        npm install --silent
        print_success "前端依赖安装完成"
    else
        print_success "前端依赖已安装"
    fi
}

# 构建前端
build_frontend() {
    print_step "构建前端项目..."
    
    cd "$FRONTEND_PATH"
    
    # 总是执行构建，确保部署的是最新版本
    # 移除不可靠的构建检查逻辑
    
    npm run build --silent
    print_success "前端构建完成"
}

# 部署前端
deploy_frontend() {
    print_step "部署前端到静态目录..."
    
    cd "$PROJECT_ROOT"
    
    # 备份现有静态文件（如果存在）
    if [ -d "$STATIC_PATH" ]; then
        print_info "备份现有静态文件..."
        rm -rf "${STATIC_PATH}.backup"
        cp -r "$STATIC_PATH" "${STATIC_PATH}.backup"
    fi
    
    # 部署新的构建产物
    rm -rf "$STATIC_PATH"
    cp -r "$FRONTEND_PATH/dist" "$STATIC_PATH"
    
    print_success "前端部署完成"
}

# 启动后端服务
start_backend() {
    print_step "启动后端服务..."
    
    cd "$PROJECT_ROOT"
    source "$VENV_PATH/bin/activate"
    
    print_info "后端配置："
    print_info "  • 静态文件目录: $STATIC_PATH"
    print_info "  • 服务端口: 8080"
    print_info "  • 访问地址: http://localhost:8080"
    
    echo ""
    print_success "🚀 服务启动中..."
    echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
    echo ""
    
    cd "$PROJECT_ROOT"
    exec python -m src.app
}

# 清理临时文件
cleanup() {
    print_step "清理临时文件..."
    
    cd "$PROJECT_ROOT"
    
    # 清理 Python 缓存
    find . -name "__pycache__" -not -path "./.venv/*" -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -not -path "./.venv/*" -delete 2>/dev/null || true
    
    # 清理前端临时文件
    rm -rf "$FRONTEND_PATH/dist" 2>/dev/null || true
    rm -rf "$FRONTEND_PATH/auto-imports.d.ts" 2>/dev/null || true
    rm -rf "$FRONTEND_PATH/components.d.ts" 2>/dev/null || true
    
    # 清理备份文件
    rm -rf "${STATIC_PATH}.backup" 2>/dev/null || true
    
    print_success "清理完成"
}

# Docker构建模式（在容器内使用）
docker_build() {
    print_step "Docker容器内构建模式..."
    
    # 安装Python依赖
    print_info "安装Python依赖..."
    pip install --no-cache-dir -r requirements.txt
    
    # 安装Node.js依赖
    print_info "安装Node.js依赖..."
    cd "$FRONTEND_PATH"
    npm install --silent
    
    # 构建前端
    print_info "构建前端..."
    npm run build --silent
    
    # 部署前端
    cd "$PROJECT_ROOT"
    rm -rf "$STATIC_PATH"
    cp -r "$FRONTEND_PATH/dist" "$STATIC_PATH"
    
    print_success "Docker构建完成"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  install     仅安装依赖（Python + Node.js）"
    echo "  build       仅构建前端"
    echo "  deploy      仅部署前端"
    echo "  start       仅启动后端服务"
    echo "  dev         开发模式（前端热重载）"
    echo "  cleanup     清理临时文件"
    echo "  full        完整部署（默认）"
    echo "  --docker-build  Docker容器内构建模式"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0           # 完整部署并启动"
    echo "  $0 install   # 仅安装依赖"
    echo "  $0 dev       # 开发模式"
}

# 开发模式
dev_mode() {
    print_step "启动开发模式..."
    
    # 检查环境
    check_python_env
    install_python_deps
    check_node_env
    
    # 启动后端（后台）
    print_info "启动后端服务（后台运行）..."
    cd "$PROJECT_ROOT"
    source "$VENV_PATH/bin/activate"
    cd "$BACKEND_PATH"
    nohup python app.py > ../backend.log 2>&1 &
    BACKEND_PID=$!
    
    sleep 2
    
    # 启动前端开发服务器
    print_info "启动前端开发服务器..."
    cd "$FRONTEND_PATH"
    
    print_success "🚀 开发环境已启动："
    print_info "  • 前端开发服务器: http://localhost:3000"
    print_info "  • 后端API服务: http://localhost:8080"
    print_info "  • 后端日志: $PROJECT_ROOT/backend.log"
    echo ""
    print_warning "按 Ctrl+C 停止开发服务器（后端需要手动停止）"
    echo ""
    
    # 设置清理函数
    cleanup_dev() {
        print_info "停止开发服务器..."
        kill $BACKEND_PID 2>/dev/null || true
        rm -f "$PROJECT_ROOT/backend.log"
        exit 0
    }
    
    trap cleanup_dev SIGINT SIGTERM
    
    npm run dev
}

# 主函数
main() {
    print_banner
    
    case "${1:-full}" in
        "install")
            check_python_env
            install_python_deps
            check_node_env
            print_success "🎉 依赖安装完成！"
            ;;
        "build")
            check_node_env
            build_frontend
            print_success "🎉 前端构建完成！"
            ;;
        "deploy")
            build_frontend
            deploy_frontend
            print_success "🎉 前端部署完成！"
            ;;
        "start")
            if [ ! -d "$VENV_PATH" ]; then
                print_error "虚拟环境不存在，请先运行: $0 install"
                exit 1
            fi
            start_backend
            ;;
        "dev")
            dev_mode
            ;;
        "--docker-build")
            docker_build
            ;;
        "cleanup")
            cleanup
            ;;
        "full")
            # 完整部署流程
            print_info "开始完整部署流程..."
            check_python_env
            install_python_deps
            check_node_env
            build_frontend
            deploy_frontend
            print_success "🎉 部署完成！"
            echo ""
            start_backend
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 检查是否在项目根目录
if [ ! -f "$PROJECT_ROOT/requirements.txt" ] || [ ! -d "$FRONTEND_PATH" ]; then
    print_error "请在项目根目录下运行此脚本"
    exit 1
fi

# 执行主函数
main "$@"
