# Tavern Translator

SillyTavern のキャラクターカードを中国語・英語・日本語の間で翻訳するツールです。PNG カードのインポートとエクスポート、フィールド翻訳、バッチ翻訳、AI アシスタントに対応しています。

[English](../README.md)

## 主な機能

- PNG に埋め込まれたキャラクターカード情報を抽出
- 説明、会話、性格、キャラクターブックの翻訳
- 単一フィールド、キャラクターブック、バッチ翻訳
- ストリーミング対応の AI アシスタント
- 中国語、英語、日本語の UI
- JSON または PNG 形式でエクスポート
- ローカル Node 実行時のアップロードと出力を `.uploads/` と `.outputs/` に保存

## 技術スタック

- **フロントエンド**: Vue 3、Vite、Pinia、vue-i18n
- **バックエンド**: TypeScript API、Vercel AI SDK、Zod
- **プロバイダー**: OpenAI 互換 Chat Completions / Responses API
- **デプロイ**: Vercel、Node.js、Docker Compose

## ローカル開発

```bash
npm run install:all
npm run dev
```

- フロントエンド: <http://localhost:3000>
- API ヘルスチェック: <http://localhost:3001/api/v2/health>

## Docker Compose

GitHub Actions が `linux/amd64` と `linux/arm64` 向けのフロントエンド/API イメージをビルドし、GHCR に公開します。

```bash
docker compose pull
docker compose up -d
```

<http://localhost:8080> を開いてください。従来の本番ポート `8080` を維持しています。アップロードしたカードと出力 PNG はホスト側の `uploads/` と `output/` に保存されます。

停止する場合:

```bash
docker compose down
```

## API 設定

設定画面で API キー、サービスのルート URL、モデル名を指定します。API プロトコルに応じてパスは自動的に設定されます。

- **Chat Completions**: `/v1/chat/completions`
- **Responses API**: `/responses`

URL に `/v1` を手動で追加する必要はありません。

## プライバシー（BYOK）

API キーはユーザーが設定したモデルサービスへリクエストごとに送信されます。サーバーはキーをログ、データベース、永続ファイルに保存しません。利便性のためキーはブラウザのローカルストレージに保存されるため、信頼できない端末では使用しないでください。

## ライセンス

MIT License
