/**
 * 每日资讯抓取主脚本
 *
 * 功能：
 * 1. 读取 news-sources.json 中启用的 RSS 源
 * 2. 抓取并解析 RSS
 * 3. 调用 AI 生成摘要、分类、标签、律师点评
 * 4. 与已有数据合并去重
 * 5. 输出 daily-news.json（最多 100 条，最多保留 7 天）
 *
 * 环境变量：
 *   AI_API_KEY   - AI 服务 API Key（可选，无则降级为普通摘要）
 *   AI_BASE_URL   - AI 服务地址（默认 https://api.openai.com/v1）
 *   AI_MODEL      - 模型名称（默认 gpt-4o-mini）
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchRssItems } from './utils/rss.mjs';
import { enrichNewsWithAI } from './ai-news-summary.mjs';
import { createNewsId } from './utils/hash.mjs';
import { parseDate, daysAgo } from './utils/date.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SOURCES_PATH = path.join(ROOT, 'src/data/news-sources.json');
const NEWS_PATH = path.join(ROOT, 'src/data/daily-news.json');

const MAX_NEW_ITEMS_PER_RUN = 20;
const MAX_TOTAL_ITEMS = 100;
const MAX_AGE_DAYS = 7;

/**
 * 安全读取 JSON 文件
 */
async function readJsonSafe(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * 合并去重（以 URL 为唯一键，优先保留旧数据中已有的 AI 结果）
 */
function mergeAndDeduplicate(oldNews, newItems) {
  const urlMap = new Map();

  // 旧数据优先（已有人工/AI 生成的内容）
  for (const item of oldNews) {
    if (item.url) urlMap.set(item.url, item);
  }

  // 新数据补充（只添加 URL 不在旧数据中的）
  for (const item of newItems) {
    if (item.url && !urlMap.has(item.url)) {
      urlMap.set(item.url, item);
    }
  }

  return Array.from(urlMap.values());
}

/**
 * 按日期过滤 + 限制总数
 */
function limitNews(items, maxTotal, maxDays) {
  const cutoff = daysAgo(maxDays);
  const filtered = items.filter(item => item.date >= cutoff);
  // 按日期倒序
  filtered.sort((a, b) => b.date.localeCompare(a.date));
  return filtered.slice(0, maxTotal);
}

async function main() {
  console.log('=== 每日资讯抓取开始 ===');

  const sources = await readJsonSafe(SOURCES_PATH, []);
  const oldNews = await readJsonSafe(NEWS_PATH, []);

  const enabledSources = sources.filter(s => s.enabled && s.rss);
  console.log(`启用的 RSS 源: ${enabledSources.length} 个`);

  const newItems = [];
  let processed = 0;

  for (const source of enabledSources) {
    if (processed >= MAX_NEW_ITEMS_PER_RUN) {
      console.log(`已达到单次最大处理数 ${MAX_NEW_ITEMS_PER_RUN}，停止`);
      break;
    }

    console.log(`[${source.name}] 正在抓取 ${source.rss}`);
    const rssItems = await fetchRssItems(source.rss);
    console.log(`[${source.name}] 获取 ${rssItems.length} 条`);

    for (const item of rssItems) {
      if (processed >= MAX_NEW_ITEMS_PER_RUN) break;

      const date = parseDate(item.pubDate);
      const url = item.link;

      // 跳过无链接的条目
      if (!url) continue;

      // 跳过旧数据中已存在的条目
      if (oldNews.some(n => n.url === url)) continue;

      const baseItem = {
        id: createNewsId(url, date),
        title: item.title,
        url,
        source: source.name,
        sourceType: source.type,
        category: source.category,
        date,
        rawDescription: item.description || '',
        createdAt: new Date().toISOString(),
      };

      console.log(`  [AI] 处理: ${item.title.slice(0, 40)}...`);
      const enriched = await enrichNewsWithAI(baseItem);
      newItems.push({ ...baseItem, ...enriched });
      processed++;
    }
  }

  console.log(`本次新增: ${newItems.length} 条`);

  const merged = mergeAndDeduplicate(oldNews, newItems);
  const limited = limitNews(merged, MAX_TOTAL_ITEMS, MAX_AGE_DAYS);

  console.log(`最终保留: ${limited.length} 条`);

  // 清理 rawDescription 字段（不写入最终 JSON）
  const cleanNews = limited.map(({ rawDescription, ...rest }) => rest);

  await fs.writeFile(NEWS_PATH, JSON.stringify(cleanNews, null, 2), 'utf-8');
  console.log(`已写入 ${NEWS_PATH}`);
  console.log('=== 每日资讯抓取完成 ===');
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
