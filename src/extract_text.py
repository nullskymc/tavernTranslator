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
                
                # 处理不同类型的文本块
                if chunk_type == b'tEXt':
                    # tEXt格式: keyword\0text
                    null_pos = chunk_data.find(b'\x00')
                    if null_pos != -1:
                        keyword = chunk_data[:null_pos].decode('latin-1')
                        text_data = chunk_data[null_pos+1:].decode('latin-1')
                    else:
                        # 没有null分隔符，尝试直接解码
                        text_data = chunk_data.decode('utf-8')
                        keyword = None
                elif chunk_type == b'zTXt':
                    # zTXt格式: keyword\0compression_method\0compressed_text
                    null_pos = chunk_data.find(b'\x00')
                    if null_pos != -1:
                        keyword = chunk_data[:null_pos].decode('latin-1')
                        compressed = chunk_data[null_pos+2:]  # 跳过keyword和compression_method
                        text_data = zlib.decompress(compressed).decode('utf-8')
                    else:
                        text_data = zlib.decompress(chunk_data).decode('utf-8')
                        keyword = None
                
                # 处理角色卡数据
                # 情况1: keyword是"chara"，text_data是base64编码的JSON
                if keyword == "chara":
                    try:
                        decoded_data = base64.b64decode(text_data).decode('utf-8')
                        return json.loads(decoded_data)
                    except:
                        pass
                
                # 情况2: text_data以"chara\0"开头（旧格式）
                if text_data.startswith("chara"):
                    try:
                        b64_data = text_data[6:]  # 跳过 "chara\0"
                        decoded_data = base64.b64decode(b64_data).decode('utf-8')
                        return json.loads(decoded_data)
                    except:
                        pass
            
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
        # 提取实际的角色数据（去掉 "data" 包装层如果存在）
        if isinstance(text_data, dict) and "data" in text_data and len(text_data) == 1:
            # 只有 "data" 一个键，这是包装格式，提取内部数据
            actual_data = text_data["data"]
        else:
            actual_data = text_data
        
        # 将数据编码为JSON字符串，然后base64编码
        json_str = json.dumps(actual_data, ensure_ascii=False)
        b64_data = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
        
        # tEXt块格式: keyword\0text
        # keyword = "chara", text = base64编码的JSON
        keyword = b'chara'
        text_bytes = b64_data.encode('utf-8')
        chunk_content = keyword + b'\x00' + text_bytes
        
        new_chunk_length = len(chunk_content)
        new_length_bytes = new_chunk_length.to_bytes(4, byteorder='big')
        new_chunk_type = b'tEXt'
        new_chunk_crc = zlib.crc32(new_chunk_type + chunk_content).to_bytes(4, byteorder='big')
        new_text_chunk = new_length_bytes + new_chunk_type + chunk_content + new_chunk_crc

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

if __name__ == "__main__":
    # 提取文本数据
    import os
    files = os.listdir('.uploads')
    if files:
        file_path = os.path.join('.uploads', files[0])
        print(f"正在分析文件: {file_path}")
        extracted_text = extract_embedded_text(file_path)
        print("提取的文本数据:", extracted_text)