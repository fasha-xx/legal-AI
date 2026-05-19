/**
 * 哈希工具函数
 */

import { createHash } from 'node:crypto';

/**
 * 根据 URL 或标题生成唯一新闻 ID
 * 格式: news_YYYYMMDD_前8位hash
 */
export function createNewsId(input, date) {
  const hash = createHash('md5').update(input || '').digest('hex').slice(0, 8);
  const dateStr = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  return `news_${dateStr}_${hash}`;
}

/**
 * 简单字符串哈希（用于去重判断）
 */
export function simpleHash(str) {
  return createHash('md5').update(str).digest('hex');
}
