from PIL import Image
import zlib
import base64
import json

def extract_embedded_text(png_file_path):
    try:
        with open(png_file_path, 'rb') as f:
            data = f.read()

        png_signature = b'\x89PNG\r\n\x1a\n'
        if not data.startswith(png_signature):
            raise ValueError("文件不是合法的 PNG 图片。")

        offset = len(png_signature)
        while offset < len(data):
            chunk_length = int.from_bytes(data[offset:offset+4], byteorder='big')
            offset += 4

            chunk_type = data[offset:offset+4]
            offset += 4

            if chunk_type == b'tEXt' or chunk_type == b'zTXt':
                chunk_data = data[offset:offset+chunk_length]
                offset += chunk_length

                if chunk_type == b'zTXt':
                    decompressed_data = zlib.decompress(chunk_data)
                    text_data = decompressed_data.decode('utf-8')
                else:
                    text_data = chunk_data.decode('utf-8')

                text_data = text_data[6:]

                text_data = base64.b64decode(text_data)

                text_data = text_data.decode('utf-8')

                # 确保返回的数据是一个包含 'data' 字段的字典
                return json.loads(text_data)
            
            else:
                offset += chunk_length

            offset += 4

        raise ValueError("未找到嵌入的文本数据。")

    except Exception as e:
        print(f"提取文本数据时出错：{e}")
        return None