# Tavern Translator

一个用于翻译 SillyTavern 角色卡的工具，**纯前端实现**，支持从 PNG 文件中提取文本并输出翻译后的角色卡。

## 在线体验

<https://translator.nullskymc.site/>

## 功能特点

- **纯浏览器端处理**，保护隐私，角色卡不会上传到任何服务器
- 支持从 PNG 文件中提取嵌入的角色卡数据
- 自动翻译角色描述、对话内容和性格设定
- 支持自定义 LLM API 配置
- 实时显示翻译进度
- 导出翻译后的 JSON 文件和 PNG 文件

## 交流群

> 1043662159

## 安装说明

1. 克隆仓库：
```bash
git clone https://github.com/nullskymc/tavernTranslator.git
cd tavernTranslator
```

2. 创建虚拟环境：
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

## 使用方法

1. 启动应用（仅作为静态文件服务器）：
```bash
python src/app.py
```
你可以使用任何静态文件服务器来运行本项目，例如 Nginx、Apache 或 Python 的内置 HTTP 服务器,本项目示例使用 FastAPI 作为静态文件服务器。

```bash

2. 在浏览器中访问：`http://localhost:8080`

3. 使用界面：
   - 上传 PNG 格式的角色卡文件
   - 配置翻译 API（必填）
   - 点击"开始翻译"按钮
   - 等待翻译完成，下载生成的 JSON 文件或 PNG 文件

## 技术实现

本项目使用纯前端技术实现角色卡翻译功能：

- **PNG处理**：使用JavaScript在浏览器中实现PNG文件的读取和写入
- **文本提取**：在浏览器中解析PNG文件并提取嵌入的JSON数据
- **翻译处理**：在浏览器中调用LLM API进行文本翻译
- **文件生成**：在浏览器中生成结果文件，无需服务器处理

所有处理均在用户的浏览器中完成，数据不会上传到任何服务器，保护用户隐私。

## 目录结构

```
tavernTranslator/
├── src/
│   ├── app.py         # 静态文件服务器入口
│   └── api.py         # FastAPI静态文件服务
├── static/            # 前端静态文件
│   ├── index.html     # 主页面
│   ├── css/           # 样式文件
│   ├── img/           # 图像资源
│   └── js/            # JavaScript文件
│       ├── app.js     # 应用入口
│       └── modules/   # 功能模块
│           ├── pngProcessor.js      # PNG文件处理
│           ├── translatorClient.js  # 翻译客户端
│           └── ...
├── requirements.txt    # 项目依赖
└── README.md          # 项目文档
```

## API 配置说明

使用前需要配置：
- Model Name: 要使用的语言模型名称
- API Base URL: API服务器地址
- API Key: API访问密钥

支持任何兼容 OpenAI API 的服务，如：
- OpenAI API
- Claude API (通过 OpenAI 兼容接口)
- 本地部署的兼容服务

## 注意事项

- 只支持包含角色卡数据的 PNG 文件
- 处理完全在浏览器中进行，请勿在处理过程中关闭页面

## License

MIT License