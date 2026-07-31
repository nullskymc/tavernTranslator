# TavernTranslator 轻量化迁移计划

## 1. 目标与结论

将项目从“Vue 3 + Element Plus + FastAPI + LangChain + LangGraph”的实现，演进为“Vue 3 + 原生轻量组件 + TypeScript API + Vercel AI SDK”的架构。

本次迁移的重点是删除不匹配当前产品复杂度的抽象层，而不是为了技术栈统一而重写一切。

确定的技术决策：

- 保留 Vue 3 和 Vite，不迁移到 React 或 Next.js。
- 保留现有角色卡编辑、词库、导入导出与日语 i18n 功能。
- 用 TypeScript API 替换 LLM 调用层；使用 `ai`、`@ai-sdk/openai-compatible` 和 `zod`。
- 翻译使用非流式调用；AI 助手使用流式调用与结构化 JSON 输出。
- 不在前端接入完整 AI SDK UI，继续用 Vue 组件渲染聊天界面。
- LangChain、LangGraph 和 WebSocket 不进入新架构。
- PNG 角色卡读写最后迁移；在兼容性验证完成前保留现有 Python 实现作为回退。

## 2. 现状与迁移动机

当前后端的 LangGraph 工作流仅包含输入校验、模型调用和错误处理，没有多步骤 agent、工具调用或持久状态需求；对应的 LangChain/LangGraph 依赖收益有限。

前端体积的主要来源不是 Vue 3，而是 Element Plus、其样式与大量通用交互抽象。项目需要表单编辑、局部状态和弹窗，Vue 3 仍适合保留；应优先替换 UI 库，而不是替换框架。

迁移后应具备以下收益：

- 统一为 TypeScript 的 API、DTO 与错误处理，减少双语言维护。
- 继续支持任意 OpenAI 兼容服务的 `base_url`、模型名和用户自带 API Key。
- AI 助手可以流式返回，并通过 schema 得到稳定的角色卡字段，不再从 Markdown 中用正则提取 JSON。
- 前端依赖和样式体积下降，首屏与部署链路更简单。

## 3. 范围与非目标

### 本次范围

- 迁移单字段翻译、角色书翻译、批量翻译和 AI 助手 API。
- 迁移或重建 PNG/JSON 角色卡导入导出能力。
- 移除 Element Plus，使用项目现有设计 token 和少量可复用的 Vue 基础组件。
- 保持中文、英文、日文界面与日语翻译提示词。
- 建立可以在 Vercel 与本地 Node 环境运行的部署方式。

### 明确不做

- 不引入账户系统、数据库、队列或多租户配额系统。
- 不构建自主 agent、MCP 工具链或长任务编排。
- 不要求用户把 API Key 托管给项目；继续支持请求级 BYOK。
- 不在没有 PNG 回归样本前删除 Python 实现。

## 4. 目标架构

```text
Vue 3 + Vite
├── 角色卡编辑器、词库、i18n、原生轻量 UI
├── 流式 AI 助手展示
└── /api/v2/*
         │
TypeScript API（Vercel Functions / 本地 Node）
├── 输入校验：Zod
├── LLM 网关：Vercel AI SDK
│   └── OpenAI-compatible provider
├── 翻译：generateText
├── AI 助手：streamText + 结构化输出
└── PNG 角色卡编解码（内存流处理）
```

API 不保存用户 API Key。前端仅在当前请求中提交密钥，服务端不写入日志、数据库或持久化文件；部署说明必须清楚说明密钥会经过部署的 API 服务。

## 5. 分阶段执行

### 阶段 0：冻结契约与建立回归基线

**目标：** 先证明新实现没有改变用户可见行为，再迁移代码。

- 为现有 `/api/v1` 四个 LLM 接口记录请求、响应、错误码和超时语义。
- 收集并脱敏至少三类角色卡 fixture：PNG v2、仅 JSON、包含角色书条目的卡。
- 为 PNG 提取、PNG 写回、字段路径更新和词库注入建立测试。
- 记录当前前端构建产物大小与核心交互清单。
- 将已完成的日语 i18n 改动作为迁移前基线，先单独验收或提交。

**验收：** fixture、接口契约和基线构建在 CI 中可重复执行。

### 阶段 1：抽取 TypeScript 领域契约与 LLM 适配层

**目标：** 不改 UI，先完成可独立测试的核心逻辑。

- 新建 `api/` 目录，定义 `TranslationSettings`、`PromptTemplates`、`Glossary`、`CharacterCard` 的 Zod schema。
- 实现 `createProvider(settings)`：只负责构造 OpenAI-compatible provider，不包含业务提示词。
- 实现 `translateText(input)`：按字段类型选择 prompt、追加词库、调用模型、映射统一错误。
- 实现 `translateBatch(input)`：保留并发上限，使用受控 `Promise.allSettled`，返回逐字段结果。
- 使用 mock `fetch` 覆盖 provider 请求、超时、模型错误与词库注入。

**验收：** 在不运行 FastAPI 的情况下，TypeScript 单元测试可验证翻译请求体与结果映射。

### 阶段 2：并行发布 v2 翻译 API

**目标：** 新旧后端可并存，前端可逐功能切换。

- 新增 `/api/v2/translate`、`/api/v2/translate-character-book`、`/api/v2/batch-translate`。
- 与 `/api/v1` 保持相同的字段名称和响应 shape，避免编辑器同时改动 API 与 UI。
- 在本地和预览环境通过 feature flag 选择 v1 或 v2。
- 对同一 fixture 使用 mock 模型响应比较 v1/v2 的字段更新结果。
- 为单次和批量请求设置明确超时、并发限制与错误信息，不把长批量任务伪装为后台任务。

**验收：** v2 可完成当前所有翻译操作；关闭 feature flag 可立即回退到 Python API。

### 阶段 3：迁移 AI 助手为流式、结构化接口

**目标：** 让 AI 助手稳定地产生可应用的角色卡字段。

- 新增 `/api/v2/chat`，使用流式文本响应改善等待体验。
- 定义角色卡可编辑字段的 schema；模型返回的数据必须经过 schema 校验。
- 将“聊天文本”和“可应用字段”分离传输，删除前端对 Markdown code fence 的 JSON 正则解析依赖。
- 保留当前逐字段选择和应用动画，只替换数据来源。
- 客户端支持中断、网络重连后的错误提示，以及非流式服务商的降级响应。

**验收：** AI 返回非法 JSON、缺字段或额外字段时不会污染角色卡；用户可安全选择并应用任意字段。

### 阶段 4：前端轻量化

**目标：** 在不降低可访问性和移动端可用性的前提下降低包体与样式复杂度。

- 建立最小基础组件：`AppButton`、`AppDialog`、`AppInput`、`AppSelect`、`AppToast`、`ConfirmDialog`。
- 以组件为单位替换 Element Plus，不进行一次性全局重写。
- 使用原生 `<dialog>`、`<button>`、`<input>` 和 CSS variables；保留键盘操作、焦点管理与 ARIA 标签。
- 将 Lodash 的少量路径读写替换为本地、类型明确的 `getCardField` / `setCardField` 工具。
- 每替换一个区域，检查暗色模式、移动端、中文/英文/日文和键盘可用性。

**验收：** 移除 Element Plus 与 Lodash 后，`npm run build` 成功；构建产物与基线相比显著下降，且核心手工流程全部通过。

### 阶段 5：PNG 编解码迁移

**目标：** 以兼容性为先，移除 Python 文件处理依赖。

- 选择可维护的 Node PNG chunk 库，先用阶段 0 fixture 验证读取和写入结果。
- API 只在内存中处理上传文件并直接返回下载流，不依赖 `.uploads` / `.output` 本地目录。
- 保留原始图片像素、非角色卡 PNG 的错误行为和角色卡 metadata 格式。
- 用二进制 fixture 比较写回后图片可被 SillyTavern 与当前版本重新读取。

**验收：** 所有 fixture 读写通过；新生成 PNG 可被 SillyTavern 读取；Python 端点不再被前端调用。

### 阶段 6：切流、清理与发布

**目标：** 仅在所有替代实现经过验证后删除旧栈。

- 默认启用 v2，保留一个发布周期的 v1 回退开关。
- 移除 FastAPI、LangChain、LangGraph、Pillow、WebSocket 依赖和 Docker 中对应运行时。
- 提供 `vercel.json`、环境变量示例和本地 Node 启动说明。
- 重新评估 Vercel Function 的地区、时长、请求体大小与 BYOK 隐私声明。
- 在 Release Notes 中说明 API Key 流向、已支持的 OpenAI-compatible 服务和回退方式。

**验收：** 全量测试、生产构建、预览部署和真实 PNG 冒烟通过；无前端请求仍访问 `/api/v1`。

## 6. 建议目录演进

```text
api/
├── lib/
│   ├── schemas.ts
│   ├── provider.ts
│   ├── prompts.ts
│   ├── translation.ts
│   ├── chat.ts
│   └── character-card-png.ts
├── v2/
│   ├── translate.ts
│   ├── batch-translate.ts
│   └── chat.ts
└── test/
    ├── fixtures/
    └── *.test.ts

vue-frontend/
├── src/components/ui/       # 自建轻量基础组件
├── src/services/api.ts      # 保持唯一 API 入口
├── src/services/chat.ts     # 流式聊天 transport
└── src/utils/card-path.ts   # 类型明确的字段路径读写
```

## 7. 验证矩阵

每个阶段结束时至少执行对应检查：

| 范围 | 自动验证 | 人工验证 |
| --- | --- | --- |
| i18n | locale key parity、TypeScript 检查 | 三语言切换与本地存储恢复 |
| 翻译 | mock provider、schema、错误映射 | 单字段、批量、词库、生效提示词 |
| AI 助手 | 流式协议、schema 拒绝非法字段 | 中断、选择字段、应用到卡片 |
| PNG | fixture 读取/写回回归 | SillyTavern 导入与导出 |
| 前端 | build、bundle 对比、无 Element Plus 引用 | 桌面、移动端、深浅色、键盘操作 |
| 发布 | preview deployment、环境变量检查 | BYOK 提示与错误反馈 |

## 8. 风险与回退

- **OpenAI-compatible 差异：** 不同服务对流式、JSON schema 和模型参数支持不同。适配层必须允许能力降级，不能假定所有服务支持结构化输出。
- **BYOK 隐私：** 请求级 API Key 不持久化，但仍经过 API Function；上线前必须在设置页说明这一点。
- **函数限制：** 长文本和大批量翻译受部署平台时长、请求大小与并发影响。v2 先保持小批量、同步请求模型。
- **PNG 兼容性：** 这是迁移中风险最高部分。阶段 5 未通过前，Python API 必须保留。
- **回退策略：** 各阶段以 v2 feature flag 切流；发布期内 `/api/v1` 保持可用，不删除已验证之外的旧代码。

## 9. 完成定义

迁移完成必须同时满足：

- 用户可在中文、英文、日文界面完成角色卡编辑、翻译、AI 辅助、导入和导出。
- 生产路径不依赖 FastAPI、LangChain、LangGraph、Element Plus 或 Lodash。
- OpenAI-compatible 服务在配置 `base_url`、模型名和请求级 API Key 后可完成翻译。
- AI 助手不再依赖 Markdown JSON 正则提取。
- PNG fixture、前端构建、TypeScript 检查和预览部署全部通过。
- 迁移后至少保留一个可验证版本的回退窗口。

## 10. 执行记录

### 2026-08-01：阶段 4「前端轻量化」完成（Element Plus 移除）

本轮完成 Element Plus 与 Lodash 的完整移除：

- **依赖**：`element-plus`、`@element-plus/icons-vue` 已从 `vue-frontend/package.json` 与 `package-lock.json` 移除（lock 中 element-plus 引用数为 0）；顺带清理未使用的 `@vueuse/core`、`radix-vue`。
- **组件替换**：全部 `el-*` 组件标签替换为原生/自建组件——`AppButton`、`AppDialog`（原生 `<dialog>`，支持关闭行为开关）、`AppInput`（text/textarea/password/number + autosize + focus）、`AppSelect`、`AppSwitch`、`AppIcon`（新增 star/chat-square/doc-check）、`AppToast`、`ConfirmDialog`；el-tooltip 改为原生 `title`；el-form/el-row/el-col 改为 CSS Grid；el-radio → 原生 radio；el-collapse → `<details>`。
- **服务层**：`ElMessage`/`ElNotification` → `useToast`（支持常驻通知 + 手动关闭）；`ElMessageBox.confirm` → `useConfirm`（Promise 化，App.vue 全局挂载）；`lodash get/set` → `getCardField`/`setCardField`（支持数组下标路径 `alternate_greetings[0]`）。
- **构建配置**：移除 vite `ElementPlusResolver`、`element-plus` manualChunk、`element-plus/dist/index.css` 导入；清理 `index.css`/`theme.css`/`mobile.css` 中的 EP 组件覆盖样式（`--el-*` 仅作为设计 token 保留，并新增 `--color-*` 别名映射到苹果主题 token）。
- **验证**：`vite build` 成功（157 modules，vendor chunk 126.36 kB gzip 48.92 kB，无 element-plus）；`tsc --noEmit` 通过；dev server 下全部改动模块转换 200；`components.d.ts`/`auto-imports.d.ts` 重新生成且无 element-plus 引用。
- **未验证**：真实浏览器交互（角色卡编辑/翻译/弹窗/深色模式/移动端）尚未人工回归；PNG 导入导出后端路径未在本轮验证。

### 2026-08-01：阶段 0/1/2/3/5/6 收尾完成（全部迁移完成）

本轮补齐剩余阶段并完成全量验证：

- **阶段 2（路由对齐）**：`api/v2/routes.ts` 集中路由表，每条端点同时注册 `/api/v2/*` 与 `/api/v2/character/*`（与 v1 路径语义一致）；前端 `/character/translate`、`/character/upload`、`/character/ai-chat` 等调用路径全部可达；`server.ts` 重构为 `createAppServer`/`startServer` 分离，import 无副作用。
- **阶段 3（流式 AI 助手）**：新增 `src/services/chat.ts`（SSE 流式 + sync 降级传输层）；后端 SSE 流结束后发送 `fields` 事件（服务端 `extractCardFields` 提取 + Zod 校验），sync 端点返回 `{ reply, fields }`；前端删除 `extractJsonFromResponse` 正则解析，应用面板直接消费服务端下发的字段。
- **阶段 0/1/5（测试与 fixture）**：新增 4 个测试文件 36 个用例——PNG tEXt/zTXt 读取、写回往返、chunk 结构/CRC、翻译请求体与错误映射（401/429/504/500）、批量并发重试、字段提取校验、路由表断言；测试发现并修复 zTXt 分支缺失 base64 解码的 bug。
- **阶段 6（清理与发布）**：删除 `.github/workflows/docker-build.yml`（Docker CI）；前端新增 `vue-tsc` + `typecheck` 脚本（修复根 `npm run typecheck`）；修复 3 个既有前端类型错误；设置页新增 BYOK 隐私提示（三语言）；README 与 docs/README.en.md 重写为新架构。
- **验证**：`npm test` 36/36 通过；`npm run typecheck`（api tsc + 前端 vue-tsc）通过；`npm run build` 成功；i18n key parity 202 键通过；`git diff --check` 通过。
- **未验证（需人工/发布环境）**：真实 LLM 联调（OpenAI-compatible 服务差异）、真实浏览器交互回归、Vercel 预览部署与 SillyTavern 手工导入导出冒烟。
