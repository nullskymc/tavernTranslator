# Tavern Translator

一个用于在中文和英文之间互译 SillyTavern 角色卡的工具，支持从 PNG 文件中提取文本并输出翻译后的角色卡。

[English Readme](docs/README.en.md)

## 在线体验

<https://translator.nullskymc.site/>

如遇到问题，欢迎加入 qq 群1043662159反馈。
## 功能特点

- **智能提取**: 支持从 PNG 文件中提取嵌入的角色卡数据。
- **双向翻译**: 自动在中英文之间翻译角色描述、对话内容和性格设定。
- **自定义配置**: 支持自定义 LLM API 配置。
- **文件导出**: 支持导出翻译后的 JSON 文件和图片文件。

## 安装与部署

### Docker 部署 (推荐)

使用 Docker 是最简单的部署方式：

```bash
git clone https://github.com/nullskymc/tavernTranslator.git
cd tavernTranslator
docker-compose up -d

# 访问 http://localhost:8080 使用应用
```

### 脚本部署

使用我们提供的一键部署脚本，可以自动完成环境安装、前端构建和后端启动：

```bash
git clone https://github.com/nullskymc/tavernTranslator.git
cd tavernTranslator

# 完整部署并启动服务
./deploy.sh

# 访问 http://localhost:8080 使用应用
```

### 手动安装

1.  **创建虚拟环境:**
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # Linux/Mac
    # .venv\Scripts\activate  # Windows
    ```

2.  **安装后端依赖:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **安装并构建前端:**
    ```bash
    cd vue-frontend
    npm install
    npm run build
    cd ..
    ```

4.  **启动服务:**
    ```bash
    python src/app.py
    ```

## 使用方法

1.  **启动应用**: 使用上述任一方法启动应用。
2.  **访问应用**: 在浏览器中打开 `http://localhost:8080`。
3.  **操作界面**:
    *   上传 PNG 格式的角色卡文件。
    *   在设置中配置你的翻译 API。
    *   点击“翻译”按钮。
    *   等待翻译完成，然后下载生成的 JSON 或图片文件。

## API 配置

你需要配置以下信息：

-   **Model Name**: 使用的语言模型名称。
-   **API Base URL**: API 服务器地址。
-   **API Key**: API 访问密钥。

支持任何兼容 OpenAI API 的服务。

## License

MIT License
