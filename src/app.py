from gradio import Interface, components
from extract_text import extract_embedded_text
from translate import translate_greetings_async, translate_description_async
import asyncio

async def process_image_and_translate(image_file):
    text_data = extract_embedded_text(image_file)
    if text_data:
        alternate_greetings = text_data['data']['alternate_greetings']
        description = text_data['data']['description']
        
        translated_greetings, translated_description = await asyncio.gather(
            translate_greetings_async(alternate_greetings),
            translate_description_async(description)
        )
        return translated_greetings, translated_description
    return None, None

iface = Interface(
    fn=process_image_and_translate,
    inputs=components.Image(type="filepath", label="Upload PNG Image"),
    outputs=[components.Textbox(label="Translated Greetings"), components.Textbox(label="Translated Description")],
    title="PNG Text Extractor and Translator",
    description="Upload a PNG image to extract embedded text and translate it."
)

if __name__ == "__main__":
    iface.launch(server_port=8080)