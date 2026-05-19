/**
 * 日期工具函数
 */

/**
 * 获取当前日期字符串 YYYY-MM-DD
 */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 解析 RSS 日期为 YYYY-MM-DD 格式
 * 支持 RFC 2822、ISO 8601 等常见格式
 */
export function parseDate(dateStr) {
  if (!dateStr) return today();
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return today();
    return d.toISOString().slice(0, 10);
  } catch {
    return today();
  }
}

/**
 * 获取 N 天前的日期字符串
 */
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
