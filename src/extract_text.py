from PIL import Image
import zlib
import base64
import json
import logging
from typing import Union

def extract_embedded_text(source: Union[str, bytes]):
    """从PNG文件路径或字节流中提取嵌入的文本数据。"""
    try:
        if isinstance(source, str):
            with open(source, 'rb') as f:
                data = f.read()
        elif isinstance(source, bytes):
            data = source
        else:
            raise TypeError("源必须是文件路径（str）或字节（bytes）。")

        # 验证PNG文件头
        png_signature = b'\x89PNG\r\n\x1a\n'
        if not data.startswith(png_signature):
            logging.warning("无效的PNG文件格式")
            return None

        # 遍历PNG块
        offset = len(png_signature)
        while offset < len(data):
            chunk_length = int.from_bytes(data[offset:offset+4], byteorder='big')
            chunk_type = data[offset+4:offset+8]

            if chunk_type in (b'tEXt', b'zTXt'):
                chunk_data = data[offset+8:offset+8+chunk_length]
                
                # 解压缩数据
                text_data = (
                    zlib.decompress(chunk_data).decode('utf-8') 
                    if chunk_type == b'zTXt' 
                    else chunk_data.decode('utf-8')
                )
                
                # 处理数据
                if text_data.startswith("chara"):
                    b64_data = text_data[6:] # 跳过 "chara\0"
                    decoded_data = base64.b64decode(b64_data).decode('utf-8')
                    return json.loads(decoded_data)
            
            offset += 8 + chunk_length + 4

        # 未找到嵌入的文本
        return None

    except Exception as e:
        logging.error(f"提取文本数据时出错：{e}")
        return None

def embed_text_in_png(png_file_path, text_data, output_path=None):
    """
    将文本数据嵌入PNG文件:
    1. 读取原始PNG二进制数据
    2. 遍历所有块，忽略原有的文本块
    3. 构造新的tEXt块并在IEND前插入
    """
    try:
        if output_path is None:
            output_path = png_file_path

        with open(png_file_path, 'rb') as f:
            data = f.read()

        if not data.startswith(b'\x89PNG\r\n\x1a\n'):
            raise ValueError("非法的PNG文件格式")

        # 收集除文本块和IEND块外的所有PNG块
        chunks = []
        offset = 8
        while offset < len(data):
            chunk_length = int.from_bytes(data[offset:offset+4], byteorder='big')
            chunk_type = data[offset+4:offset+8]
            chunk_data = data[offset+8:offset+8+chunk_length]
            chunk_crc = data[offset+8+chunk_length:offset+8+chunk_length+4]
            if chunk_type not in (b'tEXt', b'zTXt', b'IEND'):
                chunks.append((chunk_length, chunk_type, chunk_data, chunk_crc))
            offset += 8 + chunk_length + 4

        # 构造新的文本块（使用tEXt块，不做压缩）
        json_str = json.dumps(text_data, ensure_ascii=False)
        text_payload = "chara\0" + base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
        text_bytes = text_payload.encode('utf-8')
        new_chunk_length = len(text_bytes)
        new_length_bytes = new_chunk_length.to_bytes(4, byteorder='big')
        new_chunk_type = b'tEXt'
        new_chunk_crc = zlib.crc32(new_chunk_type + text_bytes).to_bytes(4, byteorder='big')
        new_text_chunk = new_length_bytes + new_chunk_type + text_bytes + new_chunk_crc

        # 重构PNG文件：在IEND前插入新的文本块
        new_data = bytearray(b'\x89PNG\r\n\x1a\n')
        for cl, ct, cd, crc in chunks:
            new_data.extend(cl.to_bytes(4, byteorder='big'))
            new_data.extend(ct)
            new_data.extend(cd)
            new_data.extend(crc)
        
        # 在IEND前添加新的文本块
        new_data.extend(new_text_chunk)

        # 在末尾添加IEND块
        iend_chunk = b'\x00\x00\x00\x00IEND\xaeB`\x82'
        new_data.extend(iend_chunk)

        with open(output_path, 'wb') as f:
            f.write(new_data)
        return output_path

    except Exception as e:
        logging.error(f"嵌入文本数据时出错：{e}")
        return None