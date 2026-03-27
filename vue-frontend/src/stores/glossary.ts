/**
 * Glossary Store
 * 管理翻译词库的 CRUD、导入导出和 prompt 构建
 */
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { GlossaryEntry } from '@/types';

const GLOSSARY_STORAGE_KEY = 'glossaryEntries';

export const useGlossaryStore = defineStore('glossary', () => {
  // --- State ---
  const entries = ref<GlossaryEntry[]>([]);

  // --- Actions ---
  const loadFromStorage = () => {
    const saved = localStorage.getItem(GLOSSARY_STORAGE_KEY);
    if (saved) {
      try {
        entries.value = JSON.parse(saved);
      } catch {
        localStorage.removeItem(GLOSSARY_STORAGE_KEY);
      }
    }
  };

  const _generateId = (): string =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);

  const addEntry = (entry: Omit<GlossaryEntry, 'id'>) => {
    entries.value.push({ ...entry, id: _generateId() });
  };

  const removeEntry = (id: string) => {
    entries.value = entries.value.filter((e) => e.id !== id);
  };

  const updateEntry = (id: string, updates: Partial<GlossaryEntry>) => {
    const idx = entries.value.findIndex((e) => e.id === id);
    if (idx !== -1) {
      entries.value[idx] = { ...entries.value[idx], ...updates };
    }
  };

  const clear = () => {
    entries.value = [];
  };

  const importEntries = (newEntries: GlossaryEntry[]): number => {
    const existing = new Set(
      entries.value.map((e) => `${e.source}||${e.target}`)
    );
    let added = 0;
    for (const entry of newEntries) {
      const key = `${entry.source}||${entry.target}`;
      if (!existing.has(key)) {
        entries.value.push({ ...entry, id: _generateId() });
        existing.add(key);
        added++;
      }
    }
    return added;
  };

  const exportEntries = (): GlossaryEntry[] => {
    return JSON.parse(JSON.stringify(entries.value));
  };

  /** 构建词库提示文本，注入到翻译 prompt 中 */
  const buildPromptText = (): string => {
    if (entries.value.length === 0) return '';
    return entries.value.map((e) => `- "${e.source}" → "${e.target}"`).join('\n');
  };

  // --- Watchers ---
  watch(
    entries,
    (val) => {
      localStorage.setItem(GLOSSARY_STORAGE_KEY, JSON.stringify(val));
    },
    { deep: true }
  );

  // --- Initial Load ---
  loadFromStorage();

  return {
    entries,
    addEntry,
    removeEntry,
    updateEntry,
    clear,
    importEntries,
    exportEntries,
    buildPromptText,
  };
});
