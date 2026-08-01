# Tavern Translator

A tool for translating SillyTavern character cards between Chinese, English, and Japanese, supporting text extraction from PNG files and exporting translated character cards.

[中文说明](https://github.com/nullskymc/tavernTranslator/blob/main/README.md)

## Live Demo

<https://translator.nullskymc.site/>

## Features

- **Smart Extraction**: Extracts embedded character card data from PNG files and keeps local upload/export files in `.uploads/` and `.outputs/` when running the Node server locally.
- **Multilingual Translation**: Translates character descriptions, dialogue, and personality settings between Chinese, English, and Japanese.
- **Internationalized UI**: Supports Chinese, English, and Japanese interfaces and remembers the selected language.
- **Custom Configuration**: Supports any OpenAI-compatible LLM API (base URL, model name, per-request API key).
- **AI Assistant**: Streaming assistant that returns schema-validated character card fields that can be applied to the card directly.
- **File Export**: Exports translated JSON and PNG image files.

## Tech Stack

- **Frontend**: Vue 3 + Vite + Pinia + vue-i18n (lightweight native UI components, no Element Plus)
- **Backend**: TypeScript API (Vercel AI SDK + Zod + OpenAI-compatible provider)
- **Deployment**: Vercel Functions / local Node.js (no Docker or Python required)

## Installation

### Local Development

```bash
npm run install:all
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001/api/v2/health

### Commands

```bash
npm run dev         # start API + frontend dev servers
npm run build       # production build (outputs to vue-frontend/dist)
npm run typecheck   # TypeScript checks for API + frontend
npm test            # API unit tests (mock provider + PNG codec regression)
```

### Vercel Deployment

1. Push the repository to GitHub and import it in Vercel.
2. The `vercel.json` at the repo root handles the build command, output directory, and `/api/v2/*` rewrites automatically.
3. No environment variables are required — API keys are provided per request from the browser.

## How to Use

1. Upload a PNG character card (or import a JSON card).
2. Configure your translation API in the settings (provider base URL, model name, API key).
3. Translate individual fields, the character book, or a batch.
4. Use the AI assistant to generate or improve card fields, then apply selected fields to the card.
5. Export the result as JSON or as a PNG image with embedded data.

## API Configuration

- **Model Name**: The language model to use.
- **API Base URL**: The API server address (any OpenAI-compatible service).
- **API Key**: Your API access key, sent per request.

The settings panel lets you choose between `Chat Completions` and `Responses API`. Responses API requires the configured model service to expose the `/responses` endpoint.

## Privacy (BYOK)

API keys are sent with each request directly to the model service you configure. The server never writes keys to logs, databases, or persistent files, and does not host them. Uploaded and exported PNG files are stored locally in `.uploads/` and `.outputs/` when using the local Node server. Keys are kept in your browser's local storage for convenience; avoid using this on untrusted devices.

## License

MIT License
