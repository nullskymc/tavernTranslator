import logging
import json
import os
from pathlib import Path
import gradio as gr
from extract_text import extract_embedded_text, embed_text_in_png
from translate import create_llm, translate_greetings_sync, translate_description_sync, translate_single_text_sync

class GradioHandler(logging.Handler):
    """用于 Gradio 界面的日志处理器"""
    def __init__(self):
        super().__init__()
        self.logs = []
    
    def emit(self, record):
        self.logs.append(self.format(record))
    
    def get_logs(self):
        return "\n".join(self.logs)
    
    def clear(self):
        self.logs = []

# 初始化日志处理
gradio_handler = GradioHandler()
gradio_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logging.getLogger().addHandler(gradio_handler)
logging.basicConfig(level=logging.INFO)

def process_image_and_translate(image_file, model_name, base_url, api_key):
    """处理图片提取和翻译的主函数"""
    gradio_handler.clear()
    try:
        input_path = Path(image_file)
        output_dir = Path(os.path.dirname(os.path.abspath(__file__))).parent / ".output"
        output_dir.mkdir(exist_ok=True)
        
        json_output = output_dir / f"{input_path.stem}.json"
        image_output = output_dir / f"{input_path.stem}_translated{input_path.suffix}"
        
        llm_instance = create_llm(model_name, base_url, api_key)
        text_data = extract_embedded_text(image_file)
        
        if text_data:
            data = text_data['data']
            def update_progress(): return gradio_handler.get_logs()
            
            # 翻译流程
            for field, content_type in [
                ('first_mes', "对话内容"),
                ('alternate_greetings', "可选问候语"),
                ('description', "角色描述"),
                ('personality', "性格设定")
            ]:
                if data.get(field):
                    logging.info(f"开始翻译{content_type}...")
                    if field == 'alternate_greetings':
                        data[field] = translate_greetings_sync(data[field], llm_instance)
                    else:
                        data[field] = translate_single_text_sync(data[field], content_type, llm_instance)
                    yield update_progress(), None, None
            
            # 保存JSON文件
            with open(json_output, "w", encoding="utf-8") as f:
                json.dump(text_data, f, ensure_ascii=False, indent=4)
            
            # 生成带有翻译数据的新图片
            embed_text_in_png(image_file, text_data, str(image_output))
            
            logging.info(f"翻译完成，已保存结果文件")
            yield update_progress(), str(json_output), str(image_output)
            return
            
    except Exception as e:
        logging.error(f"处理过程中出错：{str(e)}")
        yield f"处理失败：{str(e)}", None, None
    
    yield "处理失败", None, None

# Gradio 界面配置
with gr.Blocks() as iface:
    with gr.Row():
        with gr.Column():
            image_input = gr.Image(type="filepath", label="角色卡图片")
            model_name = gr.Textbox(label="模型名称", placeholder="输入模型名称，例如: gpt-3.5-turbo")
            base_url = gr.Textbox(label="API地址", placeholder="输入API基础URL")
            api_key = gr.Textbox(label="API密钥", placeholder="输入API密钥")
            submit_btn = gr.Button("开始翻译")
        
        with gr.Column():
            progress_output = gr.Textbox(label="翻译进度", lines=10, interactive=False)
            json_output = gr.File(label="JSON结果文件")
            image_output = gr.File(label="翻译后的图片文件")
    
    submit_btn.click(
        fn=process_image_and_translate,
        inputs=[image_input, model_name, base_url, api_key],
        outputs=[progress_output, json_output, image_output]
    )

if __name__ == "__main__":
    iface.launch(server_port=8080)