export interface CharacterBook {
  name: string;
  description: string;
  scan_depth: number;
  token_budget: number;
  recursive_scanning: boolean;
  extensions: Record<string, any>;
  lore: any[];
}

export interface CharacterCardData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  tags: string[];
  character_book: CharacterBook;
  extensions: Record<string, any>;
  spec: string;
  spec_version: string;
}

export interface CharacterCard {
  data: CharacterCardData;
  last_update: number;
  last_update_human: string;
}

export interface TranslationSettings {
  api_key: string;
  base_url: string;
  model_name: string;
  prompt_language: string;
  prompts: {
    base_template: string;
    description_template: string;
    dialogue_template: string;
  };
}

export interface ErrorInfo {
  type?: string;
  message?: string;
  level?: string;
  context?: string;
  originalError?: Error | null;
  showNotification?: boolean;
  autoRecover?: boolean;
}

export interface ErrorRecord {
  timestamp: string;
  type: string;
  message: string;
  level: string;
  context: string;
  originalError: string | null;
}
