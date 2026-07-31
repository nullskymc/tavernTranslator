# Tavern Translator

SillyTavern 角色卡翻译工具 — 支持单字段翻译、批量翻译、AI 助手和 PNG 角色卡导入导出。

## 技术栈

- **前端**: Vue 3 + Vite + Pinia + vue-i18n（原生轻量 UI 组件，无 Element Plus）
- **后端**: TypeScript API（Vercel AI SDK + Zod + OpenAI-compatible provider）
- **部署**: Vercel Functions / 本地 Node.js（无 Docker / Python 依赖）

## 快速开始

```bash
# 安装依赖
npm run install:all

# 启动开发环境（API + 前端）
npm run dev
```

- 前端: http://localhost:3000
- API: http://localhost:3001/api/v2/health

## 常用命令

```bash
npm run dev         # 同时启动 API 与前端开发服务器
npm run build       # 前端生产构建（输出到 vue-frontend/dist）
npm run typecheck   # API + 前端 TypeScript 检查
npm test            # API 单元测试（mock provider / PNG 编解码回归）
```

## 项目结构

```
api/                    # TypeScript API 服务
├── lib/                # 核心逻辑（schemas, provider, translation, chat, PNG codec）
├── v2/                 # HTTP 端点处理（routes.ts 集中路由表）
├── test/               # Vitest 单元测试与 PNG fixture 构造
└── server.ts           # 本地开发服务器（纯 Node HTTP，无框架）

vue-frontend/           # Vue 3 前端
├── src/components/ui/  # 自建轻量基础组件
├── src/services/       # API 调用层（api.ts + chat.ts SSE 流式）
├── src/stores/         # Pinia 状态管理
└── src/i18n/           # 中/英/日 国际化
```

## API 端点

每条端点同时支持两种路径：`/api/v2/*`（短路径）与 `/api/v2/character/*`（与旧 v1 路径语义一致，前端默认使用）。

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v2/translate`（`/character/translate`） | POST | 单字段翻译 |
| `/api/v2/translate-character-book`（`/character/translate-character-book`） | POST | 角色书内容翻译 |
| `/api/v2/batch-translate`（`/character/batch-translate`） | POST | 批量翻译 |
| `/api/v2/chat`（`/character/ai-chat`） | POST | AI 助手（流式 SSE） |
| `/api/v2/chat/sync`（`/character/ai-chat/sync`） | POST | AI 助手（非流式降级） |
| `/api/v2/upload`（`/character/upload`） | POST | PNG 角色卡上传提取 |
| `/api/v2/export`（`/character/export`） | POST | PNG 角色卡嵌入导出 |
| `/api/v2/health` | GET | 健康检查 |

AI 助手流式端点事件类型：`text-delta`（增量文本）、`fields`（服务端校验后的可应用字段）、`finish`（结束）、`error`（错误）。可应用字段由服务端从回复中提取并经过 schema 校验，前端不再解析 Markdown 代码围栏中的 JSON。

## BYOK 隐私说明

API Key 仅在当前请求中传递到您配置的模型服务；服务端不写入日志、数据库或持久化文件，也不托管密钥。密钥会保存在浏览器本地存储中以便下次使用，建议不要在不信任的设备上使用。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `API_PORT` | API 服务端口 | `3001` |
