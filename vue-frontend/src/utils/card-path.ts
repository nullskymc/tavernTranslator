/**
 * 类型明确的角色卡字段路径读写工具
 * 替代 lodash-es 的 get/set，避免引入整个 lodash 包
 *
 * 支持点分路径与数组下标混用：
 *   'data.name'                          → data.name
 *   'alternate_greetings[0]'             → alternate_greetings[0]
 *   'character_book.lore[0].content'     → character_book.lore[0].content
 */

/** 解析路径字符串为键数组（数字段转 number 供数组下标使用） */
function parsePath(path: string): Array<string | number> {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map((seg) => (/^\d+$/.test(seg) ? Number(seg) : seg));
}

/** 判断下一个键是否为数组下标，用于创建正确的中间容器 */
function isIndexKey(key: string | number | undefined): boolean {
  return typeof key === 'number' || /^\d+$/.test(String(key));
}

/**
 * 按路径读取嵌套对象值
 * 例: getCardField(card, 'data.name') → card.data.name
 * 例: getCardField(card, 'alternate_greetings[0]') → card.data.alternate_greetings[0]
 */
export function getCardField(obj: unknown, path: string): any {
  if (!obj || !path) return undefined;
  const keys = parsePath(path);
  let current: any = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

/**
 * 按路径设置嵌套对象值（不可变语义：浅拷贝路径上的对象）
 * 例: setCardField(card, 'data.name', '新名字')
 * 例: setCardField(card, 'alternate_greetings[0]', '新问候')
 */
export function setCardField(obj: any, path: string, value: any): void {
  if (!obj || !path) return;
  const keys = parsePath(path);
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] == null || typeof current[key] !== 'object') {
      // 若下一段是数字下标则创建数组，否则创建对象
      current[key] = isIndexKey(keys[i + 1]) ? [] : {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}
