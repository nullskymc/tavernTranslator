import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const localeDir = path.resolve(currentDir, '../src/i18n/locales');
const locales = ['en', 'zh', 'ja'];

// 递归收集叶子节点，保证新增语言不会漏掉任何界面文案。
const collectKeys = (value, prefix = '') => {
  const keys = [];
  for (const [key, child] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      keys.push(...collectKeys(child, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
};

const messages = Object.fromEntries(
  locales.map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(path.join(localeDir, `${locale}.json`), 'utf8')),
  ]),
);
const baseKeys = collectKeys(messages.en);

for (const locale of locales.slice(1)) {
  const localeKeys = collectKeys(messages[locale]);
  const missing = baseKeys.filter((key) => !localeKeys.includes(key));
  const extra = localeKeys.filter((key) => !baseKeys.includes(key));
  if (missing.length || extra.length) {
    throw new Error(
      `${locale} locale keys do not match: missing=[${missing.join(', ')}], extra=[${extra.join(', ')}]`,
    );
  }
}

console.log(`i18n key parity passed for ${locales.length} locales (${baseKeys.length} keys).`);
