# Tavern Translator

SillyTavern 角色卡翻译工具，支持中文、英文和日文之间的翻译，以及 PNG 角色卡导入导出、批量翻译和 AI 助手。

[English](../README.md) · [日本語](README.ja.md)

## 主要功能

- 从 PNG 中提取嵌入的角色卡数据
- 翻译描述、对话、性格和角色书内容
- 支持单字段、角色书和批量翻译
- 提供可流式输出的 AI 助手，并可将校验后的字段应用到角色卡
- 支持中文、英文和日文界面
- 导出 JSON 或 PNG 角色卡
- 本地 Node 运行时将上传和导出文件保存到 `.uploads/` 与 `.outputs/`

## 技术栈

- **前端**：Vue 3、Vite、Pinia、vue-i18n
- **后端**：TypeScript API、Vercel AI SDK、Zod
- **模型接口**：OpenAI 兼容的 Chat Completions 和 Responses API
- **部署**：Vercel、Node.js 或 Docker Compose

## 本地开发

```bash
npm run install:all
npm run dev
```

- 前端：<http://localhost:3000>
- API 健康检查：<http://localhost:3001/api/v2/health>

## Docker Compose

GitHub Actions 会为 `linux/amd64` 和 `linux/arm64` 构建前端、API 镜像并推送到 GHCR。

```bash
docker compose pull
docker compose up -d
```

访问 <http://localhost:8080>。前端保留原来的生产端口，上传的角色卡和导出的 PNG 分别保存到宿主机的 `uploads/` 和 `output/` 目录。

停止服务：

```bash
docker compose down
```

## API 配置

设置面板中填写 API Key、服务根地址和模型名称。程序会根据选择的协议自动处理路径：

- **Chat Completions**：使用 `/v1/chat/completions`
- **Responses API**：使用 `/responses`

只需填写服务根地址，不需要手动添加 `/v1`。

## API 端点

所有端点位于 `/api/v2/*` 下，同时保留 `/api/v2/character/*` 兼容路径。

| 端点 | 方法 | 说明 |
|---|---:|---|
| `/api/v2/translate` | POST | 翻译单个字段 |
| `/api/v2/translate-character-book` | POST | 翻译角色书 |
| `/api/v2/batch-translate` | POST | 批量翻译 |
| `/api/v2/chat` | POST | AI 助手流式 SSE |
| `/api/v2/chat/sync` | POST | AI 助手非流式备用接口 |
| `/api/v2/upload` | POST | 解析 PNG 角色卡 |
| `/api/v2/export` | POST | 导出 PNG 角色卡 |
| `/api/v2/health` | GET | 健康检查 |

## 隐私（BYOK）

API Key 会随请求直接发送到用户配置的模型服务，服务端不会写入日志、数据库或持久化文件。Key 会保存在浏览器本地存储中以便下次使用，请不要在不信任的设备上使用。

## 许可证

MIT License
