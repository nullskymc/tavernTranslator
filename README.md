# Tavern Translator

一个用于翻译 SillyTavern 角色卡的工具，支持从 PNG 文件中提取文本并输出翻译后的角色卡json。

## 纯前端版

在js分支上已更新纯前端版的翻译器实现，只需任意运行HTTP 服务器的进行时，所有数据在本地浏览器交互 [js](https://github.com/nullskymc/tavernTranslator/tree/js)

## 在线体验

<https://translator.nullskymc.site/>

## 功能特点

- 纯浏览器端处理，角色卡数据不会上传到服务器
- 支持从 PNG 文件中解析嵌入的角色卡 JSON
- 调用兼容 OpenAI API 的服务完成翻译
- 生成带有译文的 PNG 文件，可直接下载

## 安装

1. 克隆仓库并进入项目目录：

```bash
git clone https://github.com/nullskymc/tavernTranslator.git
cd tavernTranslator
```

2. 安装前端依赖并启动开发服务器：

```bash
cd frontend
npm install
npm run dev
```

浏览器访问 `http://localhost:3000` 即可使用。

## 环境变量

前端通过环境变量配置翻译接口：

- `NEXT_PUBLIC_MODEL_NAME` 模型名称
- `NEXT_PUBLIC_API_BASE` API 基础地址
- `NEXT_PUBLIC_API_KEY`  API 密钥

在开发环境下可在 `frontend/.env.local` 中设置这些变量。

## 构建与部署

运行下列命令构建静态文件：

```bash
npm run build
npm run start
```

默认端口为 `3000`。也可以将构建产物部署到任意静态资源服务器。仓库中仍保留 `src/api.py` 作为简单的静态文件服务器示例。

## License

MIT License
