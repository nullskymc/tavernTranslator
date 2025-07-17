import os
import re
import hashlib
import logging
from extract_text import extract_embedded_text

# --- 配置 ---
# UPLOAD_FOLDER 是相对于此脚本位置（src/）确定的
UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '../.uploads'))

# --- 日志设置 ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

def sanitize_filename(name: str) -> str:
    """清理字符串以使其成为有效的文件名。"""
    # 用下划线替换空格
    safe_name = re.sub(r'\s+', '_', name)
    # 删除无效的文件名字符
    sanitized = re.sub(r'[\\/*?:"<>|]', '', safe_name)
    # 去除开头和结尾的垃圾字符
    return sanitized.strip('._ ') or "未命名"

def migrate_filenames():
    """将 UPLOAD_FOLDER 中的文件名从旧格式迁移到新格式。"""
    logging.info(f"开始迁移目录：{UPLOAD_FOLDER}")

    if not os.path.isdir(UPLOAD_FOLDER):
        logging.error(f"上传目录 {UPLOAD_FOLDER} 不存在，操作中止。")
        return

    files_to_process = [f for f in os.path.listdir(UPLOAD_FOLDER) if f.endswith('.png')]
    total_files = len(files_to_process)
    logging.info(f"发现 {total_files} 个 .png 文件需要处理。")

    renamed_count = 0
    skipped_count = 0

    for filename in files_to_process:
        old_path = os.path.join(UPLOAD_FOLDER, filename)
        
        try:
            with open(old_path, 'rb') as f:
                content = f.read()
            
            character_data = extract_embedded_text(content)

            if not character_data or "data" not in character_data or "name" not in character_data["data"]:
                logging.warning(f"跳过 '{filename}'：未找到有效的角色名称。")
                skipped_count += 1
                continue

            char_name = character_data["data"]["name"]
            sanitized_name = sanitize_filename(char_name)
            new_filename = f"{sanitized_name}.png"
            new_path = os.path.join(UPLOAD_FOLDER, new_filename)

            if old_path == new_path:
                logging.info(f"跳过 '{filename}'：文件名已正确。")
                skipped_count += 1
                continue

            # 处理潜在的名称冲突
            if os.path.exists(new_path):
                # 为安全起见，计算哈希值以确定是否为同一文件
                existing_hash = hashlib.sha256(open(new_path, 'rb').read()).hexdigest()
                current_hash = hashlib.sha256(content).hexdigest()

                if existing_hash == current_hash:
                    logging.warning(f"发现 '{new_filename}' 的重复文件。正在删除冗余文件：'{filename}'")
                    os.remove(old_path)
                    skipped_count += 1
                    continue
                else:
                    # 如果哈希值不同，则创建一个唯一的名称
                    unique_suffix = current_hash[:7]
                    new_filename = f"{sanitized_name}_{unique_suffix}.png"
                    new_path = os.path.join(UPLOAD_FOLDER, new_filename)
                    logging.warning(f"'{sanitized_name}.png' 存在名称冲突。重命名为唯一名称：'{new_filename}'")

            os.rename(old_path, new_path)
            logging.info(f"重命名 '{filename}' -> '{new_filename}'")
            renamed_count += 1

        except Exception as e:
            logging.error(f"处理 '{filename}' 时失败：{e}")
            skipped_count += 1

    logging.info("--- 迁移摘要 ---")
    logging.info(f"总共处理文件数：{total_files}")
    logging.info(f"成功重命名：{renamed_count}")
    logging.info(f"跳过或失败：{skipped_count}")
    logging.info("迁移过程结束。")

if __name__ == "__main__":
    migrate_filenames()