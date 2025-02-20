from PIL import Image
import zlib
import base64
import json
import logging

def extract_embedded_text(png_file_path):
    """从PNG文件中提取嵌入的文本数据"""
    try:
        with open(png_file_path, 'rb') as f:
            data = f.read()

        # PNG文件头验证
        png_signature = b'\x89PNG\r\n\x1a\n'
        if not data.startswith(png_signature):
            raise ValueError("非法的PNG文件格式")

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
                text_data = text_data[6:]
                text_data = base64.b64decode(text_data).decode('utf-8')
                return json.loads(text_data)
            
            offset += 8 + chunk_length + 4

        raise ValueError("未找到嵌入的文本数据")

    except Exception as e:
        logging.error(f"提取文本数据时出错：{e}")
        return None

def embed_text_in_png(png_file_path, text_data):
    """将文本数据嵌入PNG文件"""
    try:
        # 读取原始PNG文件
        with open(png_file_path, 'rb') as f:
            data = f.read()

        if not data.startswith(b'\x89PNG\r\n\x1a\n'):
            raise ValueError("非法的PNG文件格式")

        # 收集PNG块
        chunks = []
        offset = 8
        while offset < len(data):
            chunk_length = int.from_bytes(data[offset:offset+4], byteorder='big')
            chunk_type = data[offset+4:offset+8]
            chunk_data = data[offset+8:offset+8+chunk_length]
            chunk_crc = data[offset+8+chunk_length:offset+8+chunk_length+4]
            
            if chunk_type not in (b'tEXt', b'zTXt'):
                chunks.append((chunk_length, chunk_type, chunk_data, chunk_crc))
            
            offset += 8 + chunk_length + 4

        # 生成新的文本块
        text_json = json.dumps(text_data, ensure_ascii=False).encode('utf-8')
        compressed_data = zlib.compress(text_json)
        text_chunk = b'zTXt' + base64.b64encode(compressed_data)
        
        # 重构PNG文件
        new_data = bytearray(b'\x89PNG\r\n\x1a\n')
        
        # 写入所有块
        for cl, ct, cd, crc in chunks:
            if ct == b'IEND':
                # 在IEND前插入文本块
                chunk_len = len(text_chunk)
                new_data.extend(chunk_len.to_bytes(4, byteorder='big'))
                new_data.extend(text_chunk)
                new_data.extend(zlib.crc32(text_chunk).to_bytes(4, byteorder='big'))
            
            new_data.extend(cl.to_bytes(4, byteorder='big'))
            new_data.extend(ct)
            new_data.extend(cd)
            new_data.extend(crc)

        with open(png_file_path, 'wb') as f:
            f.write(new_data)
            
        return png_file_path

    except Exception as e:
        logging.error(f"嵌入文本数据时出错：{e}")
        return None