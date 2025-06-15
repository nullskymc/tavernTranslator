from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import SecretStr
import logging
import concurrent.futures
import time
import threading
from typing import List, Dict, Any, Optional

logging.basicConfig(level=logging.INFO)

class ConcurrencyController:
    """并发控制器，动态调整并发数和请求间隔"""
    
    def __init__(self, initial_max_workers=2, min_workers=1, max_workers=3, custom_logger=None):
        self.max_workers = initial_max_workers
        self.min_workers = min_workers
        self.max_workers_limit = max_workers
        self.request_interval = 3  # 初始请求间隔（秒）
        self.error_count = 0
        self.success_count = 0
        self.consecutive_rate_limit_errors = 0  # 连续429错误计数
        self.lock = threading.Lock()
        self.logger = custom_logger if custom_logger else logging.getLogger(__name__)
        
    def on_success(self):
        """成功时的回调，逐步提高并发"""
        with self.lock:
            self.success_count += 1
            self.error_count = max(0, self.error_count - 1)  # 减少错误计数
            self.consecutive_rate_limit_errors = 0  # 重置429错误计数
            
            # 连续成功10次且无错误时，可以尝试提高并发
            if self.success_count >= 10 and self.error_count == 0:
                if self.max_workers < self.max_workers_limit:
                    self.max_workers += 1
                    self.logger.info(f"提升并发数到 {self.max_workers}")
                if self.request_interval > 0.5:
                    self.request_interval = max(0.5, self.request_interval - 0.2)
                    self.logger.info(f"减少请求间隔到 {self.request_interval}s")
                self.success_count = 0
                
    def on_error(self, is_rate_limit=False):
        """错误时的回调，降低并发"""
        with self.lock:
            self.error_count += 1
            self.success_count = 0
            
            if is_rate_limit:
                self.consecutive_rate_limit_errors += 1
                # 429错误时更激进地降低并发
                self.max_workers = 1  # 直接降到最低并发
                self.request_interval = min(10.0, self.request_interval + 2.0)
                self.logger.warning(f"API饱和，强制降低并发数到 {self.max_workers}，增加请求间隔到 {self.request_interval}s")
            else:
                # 其他错误时逐步降低并发
                if self.error_count >= 1:
                    if self.max_workers > self.min_workers:
                        self.max_workers = max(self.min_workers, self.max_workers - 1)
                        self.logger.warning(f"降低并发数到 {self.max_workers}")
                    self.request_interval = min(5.0, self.request_interval + 0.5)
                    self.logger.warning(f"增加请求间隔到 {self.request_interval}s")
                
    def get_current_config(self):
        """获取当前配置"""
        with self.lock:
            return self.max_workers, self.request_interval

class CharacterCardTranslator:
    """角色卡翻译器"""
    def __init__(self, model_name: str, base_url: str, api_key: str, custom_logger=None):
        self.llm = ChatOpenAI(
            model=model_name,
            base_url=base_url,
            api_key=SecretStr(api_key),
            max_completion_tokens=8192,
        )
        
        # 使用自定义logger或默认logger
        self.logger = custom_logger if custom_logger else logging.getLogger(__name__)
        
        # 初始化并发控制器
        self.concurrency_controller = ConcurrencyController(custom_logger=self.logger)
        
        # 基础翻译提示
        self.base_template = ChatPromptTemplate.from_messages([
            SystemMessage(content="""你是一个专业的翻译专家。请按照以下要求进行翻译：
1. 保持特殊格式（数字、符号、表情等）
2. 确保译文通顺自然
3. 保留原文的情感色彩和语气
4. 采用小说化翻译风格
5. 确保理解原文含义
6. 仅翻译内容文本
7. 仅输出翻译结果
8. 保留角色名等标识信息
"""),
            HumanMessagePromptTemplate.from_template("{text}")
        ])
        
        # 角色描述翻译提示
        self.description_template = ChatPromptTemplate.from_messages([
            SystemMessage(content="""你是一个专业的角色设定翻译专家。请按照以下要求翻译角色描述：
1. 保持方括号[]内的格式标记
2. 保留所有加号+连接的属性列表
3. 确保人物特征的准确传达
4. 保持描述的细节完整性
5. 仅翻译描述文本
6. 保留角色名和占位符{{char}}
7. 确保译文通顺自然
"""),
            HumanMessagePromptTemplate.from_template("{text}")
        ])
        
        # 对话模板翻译提示
        self.dialogue_template = ChatPromptTemplate.from_messages([
            SystemMessage(content="""你是一个专业的对话翻译专家。请按照以下要求翻译对话内容：
1. 保持对话的自然流畅
2. 传达原文的情感和语气
3. 保留对话标记和格式
4. 采用贴近日常的表达
5. 保持人物性格特征
6. 保留角色名和占位符
7. 准确翻译心理活动
8. 确保对话的连贯性
"""),
            HumanMessagePromptTemplate.from_template("{text}")
        ])
    
    def translate_field(self, field_name: str, text: str, max_retries=10) -> str:
        """根据字段类型选择合适的模板翻译，带重试机制"""
        if not text or text.strip() == "":
            self.logger.info(f"字段 {field_name} 为空，跳过翻译")
            return text
            
        template = self.base_template
        if field_name == "description":
            template = self.description_template
        elif field_name in ["first_mes", "mes_example"]:
            template = self.dialogue_template
            
        # 获取当前配置
        _, request_interval = self.concurrency_controller.get_current_config()
        
        for attempt in range(max_retries):
            try:
                # 添加请求间隔
                if attempt > 0:  # 重试时增加额外延迟
                    time.sleep(request_interval * (attempt + 1))
                else:
                    time.sleep(request_interval)
                    
                messages = template.format_messages(text=text)
                response = self.llm.invoke(messages)
                
                # 成功时通知控制器
                self.concurrency_controller.on_success()
                self.logger.info(f"字段 {field_name} 翻译完成")
                
                # 确保返回值是字符串类型
                if isinstance(response.content, str):
                    return response.content
                elif isinstance(response.content, list):
                    # 如果是列表，取第一个元素或连接所有字符串元素
                    content_parts = []
                    for item in response.content:
                        if isinstance(item, str):
                            content_parts.append(item)
                        elif isinstance(item, dict) and 'text' in item:
                            content_parts.append(str(item['text']))
                    return ''.join(content_parts) if content_parts else str(response.content)
                else:
                    return str(response.content)
                    
            except Exception as e:
                # 检查是否是429错误（API饱和）
                error_str = str(e).lower()
                is_rate_limit = '429' in error_str or 'rate' in error_str or '饱和' in error_str or 'too many requests' in error_str
                
                # 错误时通知控制器
                self.concurrency_controller.on_error(is_rate_limit=is_rate_limit)
                self.logger.warning(f"翻译字段 {field_name} 时出错 (尝试 {attempt + 1}/{max_retries}): {str(e)}")
                
                if is_rate_limit:
                    # 对于429错误，使用更长的等待时间
                    wait_time = min(60, 10 * (2 ** attempt))  # 指数退避，最大60秒
                    self.logger.warning(f"检测到API饱和，等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
                elif attempt < max_retries - 1:
                    # 对于其他错误，使用较短的等待时间
                    wait_time = min(10, 2 ** attempt)
                    time.sleep(wait_time)
                
                if attempt == max_retries - 1:
                    # 最后一次重试失败
                    if is_rate_limit:
                        self.logger.error(f"翻译字段 {field_name} 因API持续饱和而最终失败，已重试 {max_retries} 次")
                    else:
                        self.logger.error(f"翻译字段 {field_name} 最终失败")
                    raise
                
        # 理论上不会到达这里，但为了类型安全
        return text
    
    def translate_greeting_list(self, greetings: List[str]) -> List[str]:
        """动态并发翻译问候语列表"""
        if not greetings or len(greetings) == 0:
            self.logger.info("问候语列表为空，跳过翻译")
            return greetings
            
        # 获取当前并发配置
        max_workers, _ = self.concurrency_controller.get_current_config()
        actual_workers = min(max_workers, len(greetings))
        
        self.logger.info(f"使用 {actual_workers} 个并发线程翻译 {len(greetings)} 个问候语")
        
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=actual_workers) as executor:
                # 提交所有任务
                future_to_index = {
                    executor.submit(self.translate_field, "alternate_greetings", greeting): i
                    for i, greeting in enumerate(greetings) if greeting.strip()
                }
                
                # 收集结果，保持原始顺序
                results: List[str] = [""] * len(greetings)
                completed_count = 0
                
                for future in concurrent.futures.as_completed(future_to_index):
                    index = future_to_index[future]
                    try:
                        result = future.result()
                        results[index] = result
                        completed_count += 1
                        self.logger.info(f"问候语翻译进度: {completed_count}/{len(greetings)}")
                    except Exception as e:
                        error_str = str(e).lower()
                        is_rate_limit = '429' in error_str or 'rate' in error_str or '饱和' in error_str or 'too many requests' in error_str
                        
                        if is_rate_limit:
                            self.logger.warning(f"问候语 {index} 翻译遇到API饱和: {str(e)}")
                        else:
                            self.logger.error(f"翻译问候语 {index} 失败: {str(e)}")
                        # 使用原文作为fallback
                        results[index] = greetings[index]
                        
                # 过滤掉空值
                final_results = [result for result in results if result.strip()]
                self.logger.info("问候语列表翻译完成")
                return final_results
                
        except Exception as e:
            error_str = str(e).lower()
            is_rate_limit = '429' in error_str or 'rate' in error_str or '饱和' in error_str or 'too many requests' in error_str
            
            if is_rate_limit:
                self.logger.warning(f"问候语并发翻译遇到API饱和: {str(e)}")
            else:
                self.logger.error(f"问候语并发翻译失败: {str(e)}")
                
            # 降级到序列翻译
            self.logger.info("降级到序列翻译模式")
            results = []
            for greeting in greetings:
                if greeting.strip():
                    try:
                        result = self.translate_field("alternate_greetings", greeting)
                        results.append(result)
                    except Exception as seq_e:
                        seq_error_str = str(seq_e).lower()
                        is_seq_rate_limit = '429' in seq_error_str or 'rate' in seq_error_str or '饱和' in seq_error_str
                        
                        if is_seq_rate_limit:
                            self.logger.warning(f"序列翻译也遇到API饱和，使用原文: {str(seq_e)}")
                        else:
                            self.logger.error(f"序列翻译也失败，使用原文: {str(seq_e)}")
                        results.append(greeting)  # 使用原文
            return results
    
    def translate_character_card(self, card_data: Dict[str, Any]) -> Dict[str, Any]:
        """翻译完整的角色卡数据"""
        try:
            data = card_data.get("data", {})
            
            # 需要翻译的字段
            fields_to_translate = [
                "description",
                "personality",
                "scenario", 
                "first_mes",
                "mes_example",
                "system_prompt"
            ]
            
            # 记录所有需要翻译的字段，无论是否为空
            for field in fields_to_translate:
                self.logger.info(f"开始翻译{get_field_display_name(field)}...")
                if data.get(field):
                    data[field] = self.translate_field(field, data[field])
                else:
                    self.logger.info(f"字段 {field} 不存在或为空，跳过翻译")
            
            # 特殊处理问候语列表
            self.logger.info("开始翻译可选问候语...")
            if data.get("alternate_greetings"):
                data["alternate_greetings"] = self.translate_greeting_list(
                    data["alternate_greetings"]
                )
            else:
                self.logger.info("可选问候语不存在或为空，跳过翻译")
                
            card_data["data"] = data
            return card_data
            
        except Exception as e:
            self.logger.error(f"翻译角色卡时出错：{str(e)}")
            raise

def get_field_display_name(field_name: str) -> str:
    """获取字段的显示名称，用于日志显示"""
    field_map = {
        "first_mes": "对话内容",
        "alternate_greetings": "可选问候语",
        "description": "角色描述",
        "personality": "角色性格",
        "mes_example": "对话示例",
        "system_prompt": "系统提示",
        "scenario": "场景描述"
    }
    return field_map.get(field_name, field_name)

# 修改兼容层函数
def create_llm(model_name: str, base_url: str, api_key: str, custom_logger=None):
    """创建LLM实例，返回CharacterCardTranslator实例"""
    return CharacterCardTranslator(model_name, base_url, api_key, custom_logger)

def translate_single_text_sync(text: str, content_type: str, translator) -> str:
    """同步翻译单个文本"""
    if not text or text.strip() == "":
        logging.info(f"{content_type}为空，跳过翻译")
        return text
        
    try:
        # 字段类型映射
        field_map = {
            "对话内容": "first_mes",
            "对话开场白": "first_mes",
            "角色描述": "description",
            "性格设定": "personality",
            "对话示例": "mes_example",
            "系统提示词": "system_prompt",
            "场景描述": "scenario"
        }
        field_type = field_map.get(content_type, "base")
        return translator.translate_field(field_type, text)
    except Exception as e:
        # 记录错误信息并抛出异常，而不是返回原文
        # 这样会中断处理流程并触发错误处理
        logging.error(f"翻译文本时出错: {str(e)}")
        raise

def translate_greetings_sync(greetings_list, translator):
    """并发翻译问候语列表"""
    if not greetings_list:
        logging.info("可选问候语为空，跳过翻译")
        return greetings_list
        
    try:
        return translator.translate_greeting_list(greetings_list)
    except Exception as e:
        # 记录错误信息并抛出异常，而不是返回原文
        logging.error(f"翻译问候语列表时出错: {str(e)}")
        raise

def translate_description_sync(desc: str, translator):
    """翻译角色描述"""
    if not desc or desc.strip() == "":
        logging.info("角色描述为空，跳过翻译")
        return desc
        
    try:
        return translator.translate_field("description", desc)
    except Exception as e:
        # 记录错误信息并抛出异常，而不是返回原文
        logging.error(f"翻译描述时出错: {str(e)}")
        raise