# Tavern Translator

A SillyTavern character-card translation tool for Chinese, English, and Japanese. It supports PNG character-card import/export, field translation, batch translation, and an AI assistant.

[中文](docs/README.zh-CN.md) · [日本語](docs/README.ja.md)

## Features

- Extracts embedded character-card data from PNG files.
- Translates descriptions, dialogue, personality, and character-book content.
- Supports single-field, character-book, and batch translation.
- Provides a streaming AI assistant that can apply validated fields to a card.
- Supports Chinese, English, and Japanese interfaces.
- Exports translated cards as JSON or PNG.
- Stores local uploads and exports in `.uploads/` and `.outputs/` when running the Node server directly.

## Tech Stack

- **Frontend**: Vue 3, Vite, Pinia, and vue-i18n
- **Backend**: TypeScript API, Vercel AI SDK, and Zod
- **Provider**: OpenAI-compatible Chat Completions and Responses API
- **Deployment**: Vercel, local Node.js, or Docker Compose

## Local Development

```bash
npm run install:all
npm run dev
```

- Frontend: <http://localhost:3000>
- API health check: <http://localhost:3001/api/v2/health>

## Docker Compose

GitHub Actions builds multi-architecture frontend and API images for `linux/amd64` and `linux/arm64` and publishes them to GHCR.

```bash
docker compose pull
docker compose up -d
```

Open <http://localhost:8080>. The frontend keeps the original production port. Uploaded cards and exported PNG files are persisted in the host `uploads/` and `output/` directories.

To stop the services:

```bash
docker compose down
```

## Commands

```bash
npm run dev         # Start the API and frontend development servers
npm run build       # Build the production frontend
npm run typecheck   # Type-check the API and frontend
npm test            # Run API unit tests
```

## API Endpoints

All endpoints are available under `/api/v2/*`; the `/api/v2/character/*` aliases are retained for compatibility.

| Endpoint | Method | Description |
|---|---:|---|
| `/api/v2/translate` | POST | Translate one field |
| `/api/v2/translate-character-book` | POST | Translate character-book content |
| `/api/v2/batch-translate` | POST | Translate multiple fields |
| `/api/v2/chat` | POST | Streaming AI assistant via SSE |
| `/api/v2/chat/sync` | POST | Non-streaming AI assistant fallback |
| `/api/v2/upload` | POST | Parse a PNG character card |
| `/api/v2/export` | POST | Export a PNG character card |
| `/api/v2/health` | GET | Health check |

The streaming chat endpoint emits `text-delta`, `fields`, `finish`, and `error` events.

## API Configuration

The settings panel accepts an API key, service root URL, and model name. The selected protocol determines the endpoint path automatically:

- **Chat Completions**: uses `/v1/chat/completions`
- **Responses API**: uses `/responses`

Enter the service root URL without manually adding `/v1`.

## Privacy (BYOK)

API keys are sent with each request directly to the model service configured by the user. The server does not store keys in logs, databases, or persistent files. Keys are kept in browser local storage for convenience; avoid using the application on untrusted devices.

## License

MIT License
