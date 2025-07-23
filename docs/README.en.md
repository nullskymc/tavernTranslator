# Tavern Translator

A tool for translating SillyTavern character cards between Chinese and English, supporting text extraction from PNG files and outputting the translated character card.

[中文说明](https://github.com/nullskymc/tavernTranslator/blob/main/README.md)

## Live Demo

<https://translator.nullskymc.site/>

## Features

- **Smart Extraction**: Supports extracting embedded character card data from PNG files.
- **Bidirectional Translation**: Automatically translates character descriptions, dialogue, and personality settings between Chinese and English.
- **Custom Configuration**: Supports custom LLM API configurations.
- **File Export**: Supports exporting translated JSON and image files.

## Installation and Deployment

### Docker Deployment (Recommended)

Using Docker is the simplest way to deploy:

```bash
git clone https://github.com/nullskymc/tavernTranslator.git
cd tavernTranslator
docker-compose up -d

# Access the application at http://localhost:8080
```

### Script Deployment

Use our one-click deployment script to automatically handle environment setup, frontend building, and backend startup:

```bash
git clone https://github.com/nullskymc/tavernTranslator.git
cd tavernTranslator

# Full deployment and service start
./deploy.sh

# Access the application at http://localhost:8080
```

### Manual Installation

1.  **Create a virtual environment:**
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # Linux/Mac
    # .venv\Scripts\activate  # Windows
    ```

2.  **Install backend dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Install and build the frontend:**
    ```bash
    cd vue-frontend
    npm install
    npm run build
    cd ..
    ```

4.  **Start the service:**
    ```bash
    python src/app.py
    ```

## How to Use

1.  **Start the application**: Use any of the methods above to start the application.
2.  **Access the application**: Open `http://localhost:8080` in your browser.
3.  **Use the interface**:
    *   Upload a character card file in PNG format.
    *   Configure your translation API in the settings.
    *   Click the "Translate" button.
    *   Wait for the translation to complete, then download the generated JSON or image file.

## API Configuration

You will need to configure the following:

-   **Model Name**: The name of the language model to use.
-   **API Base URL**: The API server address.
-   **API Key**: Your API access key.

Supports any service compatible with the OpenAI API.

## License

MIT License