"""
集中配置管理模块
使用 Pydantic BaseSettings 支持环境变量和 .env 文件覆盖
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class AppSettings(BaseSettings):
    """应用全局配置"""

    # --- 应用信息 ---
    app_title: str = "酒馆翻译器"
    app_description: str = "一个用于编辑和翻译角色卡的工具。"
    app_version: str = "3.0.0"

    # --- 服务器 ---
    host: str = "0.0.0.0"
    port: int = 8080
    workers: int = 4
    reload: bool = False
    log_level: str = "info"

    # --- 文件夹 ---
    upload_folder: str = Field(default=".uploads", description="上传文件保存目录")
    output_folder: str = Field(default=".output", description="输出文件保存目录")

    # --- CORS ---
    cors_origins: list[str] = ["*"]
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]

    # --- LLM 默认值 ---
    default_model_name: str = "gpt-4-1106-preview"
    default_base_url: str = "https://api.openai.com/v1"
    max_completion_tokens: int = 8192

    # --- 批量翻译 ---
    batch_max_concurrent: int = 3
    batch_max_retries: int = 5

    model_config = {
        "env_prefix": "TT_",
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def upload_folder_abs(self) -> str:
        """获取上传文件夹的绝对路径"""
        return os.path.abspath(self.upload_folder)

    @property
    def output_folder_abs(self) -> str:
        """获取输出文件夹的绝对路径"""
        return os.path.abspath(self.output_folder)

    def ensure_directories(self) -> None:
        """确保必要的目录存在"""
        os.makedirs(self.upload_folder_abs, exist_ok=True)
        os.makedirs(self.output_folder_abs, exist_ok=True)


@lru_cache()
def get_settings() -> AppSettings:
    """获取全局设置的单例"""
    return AppSettings()
