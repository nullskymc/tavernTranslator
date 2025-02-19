# Gradio Project

This project is a Gradio application that extracts embedded text from PNG files and translates it into Chinese. It utilizes the `langchain` library for translation and provides a user-friendly interface for interaction.

## Project Structure

```
gradio-project
├── src
│   ├── app.py            # Main entry point of the Gradio application
│   ├── extract_text.py   # Contains the function to extract embedded text from PNG files
│   ├── translate.py      # Handles the translation logic
│   └── utils.py          # Utility functions for the application
├── requirements.txt      # Lists the dependencies required for the project
└── README.md             # Documentation for the project
```

## Installation

To set up the project, follow these steps:

1. Clone the repository:
   ```
   git clone <repository-url>
   cd gradio-project
   ```

2. Create a virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

## Usage

To run the Gradio application, execute the following command:

```
python src/app.py
```

This will start a local server, and you can access the application in your web browser at `http://localhost:7860`.

## Features

- Extracts embedded text from PNG files.
- Translates the extracted text into Chinese.
- User-friendly interface for file upload and interaction.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.