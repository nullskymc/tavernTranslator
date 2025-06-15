# Tavern Translator

一个用于翻译 SillyTavern 角色卡的工具，支持从 PNG 文件中提取文本并输出翻译后的角色卡json。

## 纯前端版

在js分支上已更新纯前端版的翻译器实现，只需任意运行HTTP 服务器的进行时，所有数据在本地浏览器交互 [js](https://github.com/nullskymc/tavernTranslator/tree/js)

## 在线体验

<https://translator.nullskymc.site/>

## 功能特点

- 支持从 PNG 文件中提取嵌入的角色卡数据
- 自动翻译角色描述、对话内容和性格设定
- 支持自定义 LLM API 配置
- 实时显示翻译进度
- 导出翻译后的 JSON 文件

## 交流群

> 1043662159

## 安装说明

### 一键部署（推荐）

使用统一部署脚本，自动完成环境安装、前端构建和后端启动：

```bash
git clone https://github.com/nullskymc/tavernTranslator.git
cd tavernTranslator

# 完整部署并启动服务
./deploy.sh

# 访问 http://localhost:8080 使用应用
```

### 其他部署选项

```bash
# 仅安装依赖
./deploy.sh install

# 仅构建前端
./deploy.sh build

# 构建并部署前端
./deploy.sh deploy

# 开发模式（前端热重载）
./deploy.sh dev

# 仅启动后端服务
./deploy.sh start

# 清理临时文件
./deploy.sh cleanup

# 显示帮助信息
./deploy.sh help
```

### 开发模式

启动开发环境，支持前端热重载：

```bash
./deploy.sh dev
```

访问地址：
- 前端开发服务器: http://localhost:3000
- 后端API服务: http://localhost:8080

### 手动安装（不推荐）

如果需要手动安装：

1. 创建虚拟环境：
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate  # Windows
```

2. 安装后端依赖：
```bash
pip install -r requirements.txt
```

3. 安装前端依赖：
```bash
cd vue-frontend
npm install
npm run build
cd ..
```

4. 启动服务：
```bash
python src/app.py
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
