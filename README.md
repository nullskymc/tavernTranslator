# Tavern Translator

一个用于翻译 SillyTavern 角色卡的工具，支持从 PNG 文件中提取文本并输出翻译后的角色卡json。

## 功能特点

- 支持从 PNG 文件中提取嵌入的角色卡数据
- 自动翻译角色描述、对话内容和性格设定
- 支持自定义 LLM API 配置
- 实时显示翻译进度
- 导出翻译后的 JSON 文件

## 安装说明

1. 克隆仓库：
```bash
git clone <repository-url>
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

1. 启动应用：
```bash
python src/app.py
```

2. 在浏览器中访问：`http://localhost:8080`

3. 使用界面：
   - 上传 PNG 格式的角色卡文件
   - 配置翻译 API（可选）
   - 点击"开始翻译"按钮
   - 等待翻译完成，下载生成的 JSON 文件

## 目录结构

```
tavernTranslator/
├── .output/            # 翻译结果输出目录
├── src/
│   ├── app.py         # 主程序入口
│   ├── extract_text.py # PNG文本提取模块
│   ├── translate.py   # 翻译处理模块
│   └── utils.py       # 工具函数
├── requirements.txt    # 项目依赖
└── README.md          # 项目文档
```

## API 配置说明

使用前需要配置：
- Model Name: 要使用的语言模型名称
- API Base URL: API服务器地址
- API Key: API访问密钥

支持任何兼容 OpenAI API 的服务

## 注意事项

- 只支持包含角色卡数据的 PNG 文件
- 翻译结果保存在 .output 目录下
- 输出文件名与输入文件名相同（扩展名改为.json）

## License

MIT License