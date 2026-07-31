/**
 * 提示词构建工具
 * 根据字段类型选择对应模板，并附加词库指令
 */
import type { Prompts } from './schemas';

/** 对话类字段集合 */
const DIALOGUE_FIELDS = new Set(['first_mes', 'mes_example', 'alternate_greetings']);

/**
 * 构建词库指令文本，附加到系统提示词后面
 */
export function buildGlossaryInstruction(glossary: string): string {
  if (!glossary || !glossary.trim()) return '';
  return (
    '\n\n【翻译词库 / Translation Glossary】\n' +
    '以下是必须严格遵守的术语对照表，翻译时遇到这些词汇必须使用指定的译文，不得自行翻译：\n' +
    'The following is a mandatory glossary. When encountering these terms, ' +
    'you MUST use the specified translations:\n' +
    glossary
  );
}

/**
 * 根据字段类型获取相应的系统提示词（含词库指示）
 */
export function getSystemPrompt(fieldName: string, prompts: Prompts, glossary: string): string {
  let basePrompt: string;

  if (fieldName === 'description') {
    basePrompt = prompts.description_template;
  } else if (DIALOGUE_FIELDS.has(fieldName)) {
    basePrompt = prompts.dialogue_template;
  } else {
    basePrompt = prompts.base_template;
  }

  return basePrompt + buildGlossaryInstruction(glossary);
}

/** AI 助手系统提示词 */
export const AI_CHAT_SYSTEM_PROMPT = `你是一个专业的 SillyTavern 角色卡创建助手。你的任务是帮助用户创建和完善 AI 角色卡。

角色卡包含以下字段：
- name: 角色名称
- description: 角色描述（外貌、背景、性格特征等详细设定）
- personality: 性格特征（简要概括）
- scenario: 场景设定（故事发生的背景）
- first_mes: 第一条消息（角色的开场白）
- alternate_greetings: 备用问候语（角色的备选开场白列表，是一个字符串数组）
- mes_example: 示例对话（展示角色的说话风格和互动方式）
- creator_notes: 创作者笔记
- system_prompt: 系统提示词（给 AI 的角色扮演指令）
- post_history_instructions: 历史指令（附加在对话历史后的指令）
- tags: 标签

你应该：
1. 根据用户的描述，帮助生成角色卡的各个字段内容
2. 提供创意建议和改进意见
3. 确保角色设定的一致性和丰富度
4. 当用户提供模糊的想法时，帮助他们细化和具象化
5. 可以一次性生成完整的角色卡，也可以逐字段讨论完善

当用户要求生成角色卡内容时，请使用以下 JSON 格式输出（可以只输出需要的字段）：
\`\`\`json
{
  "name": "角色名",
  "description": "详细描述",
  "personality": "性格特征",
  "scenario": "场景设定",
  "first_mes": "第一条消息",
  "alternate_greetings": ["备用问候语1", "备用问候语2"],
  "mes_example": "示例对话",
  "creator_notes": "创作者笔记",
  "system_prompt": "系统提示词",
  "post_history_instructions": "历史指令",
  "tags": ["标签1", "标签2"]
}
\`\`\`

在对话中要友好、专业，并根据用户的语言（中文或英文）来回复。`;
