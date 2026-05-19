/**
 * 每日资讯抓取主脚本（非 RSS 版）
 *
 * 支持三种来源类型：
 *   html-list  — 从公开列表页提取链接
 *   rss        — RSS feed 解析（兼容保留）
 *   manual-link — 仅作为入口，不自动抓取
 *
 * 环境变量：
 *   AI_API_KEY / AI_BASE_URL / AI_MODEL — AI 摘要（可选）
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { enrichNewsWithAI } from './ai-news-summary.mjs';
import { createNewsId } from './utils/hash.mjs';
import { today, daysAgo, parseDate } from './utils/date.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SOURCES_PATH = path.join(ROOT, 'src/data/news-sources.json');
const MANUAL_PATH = path.join(ROOT, 'src/data/manual-news.json');
const NEWS_PATH = path.join(ROOT, 'src/data/daily-news.json');
const CACHE_PATH = path.join(ROOT, 'src/data/news-ai-cache.json');

const MAX_NEW_ITEMS_PER_RUN = 30;
const MAX_TOTAL_ITEMS = 100;
const MAX_AGE_DAYS = 7;
const MIN_TITLE_LENGTH = 6;
const MAX_TITLE_LENGTH = 120;

/** 安全读取 JSON */
async function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

/** 从 HTML 列表页提取新闻链接 */
async function fetchHtmlList(source) {
  const { url, urlPattern, excludeKeywords = [], limit = 5 } = source;
  console.log(`  [HTML] 抓取 ${url}`);

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalNewsBot/1.0)' },
    });
    if (!resp.ok) {
      console.warn(`  [HTML] HTTP ${resp.status}`);
      return [];
    }

    const html = await resp.text();
    const $ = cheerio.load(html);
    const items = [];
    const seen = new Set();

    $('a').each((_, el) => {
      const $a = $(el);
      const title = $a.text().trim().replace(/\s+/g, ' ');
      let href = $a.attr('href') || '';

      // 过滤
      if (title.length < MIN_TITLE_LENGTH || title.length > MAX_TITLE_LENGTH) return;
      if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;
      if (excludeKeywords.some(kw => title.includes(kw))) return;

      // URL 模式匹配
      if (urlPattern && !href.includes(urlPattern)) return;

      // 相对链接转绝对
      if (href.startsWith('/')) {
        const u = new URL(url);
        href = `${u.protocol}//${u.host}${href}`;
      } else if (!href.startsWith('http')) {
        return;
      }

      // 去重
      if (seen.has(href)) return;
      seen.add(href);

      items.push({ title, url: href });
    });

    console.log(`  [HTML] 提取 ${items.length} 条，取前 ${limit} 条`);
    return items.slice(0, limit);
  } catch (err) {
    console.warn(`  [HTML] 抓取失败: ${err.message}`);
    return [];
  }
}

/** 合并去重（URL 为唯一键） */
function mergeAndDeduplicate(oldNews, newItems) {
  const urlMap = new Map();
  for (const item of oldNews) {
    if (item.url) urlMap.set(item.url, item);
  }
  for (const item of newItems) {
    if (item.url && !urlMap.has(item.url)) {
      urlMap.set(item.url, item);
    }
  }
  return Array.from(urlMap.values());
}

/** 按日期过滤 + 限制总数 */
function limitNews(items, maxTotal, maxDays) {
  const cutoff = daysAgo(maxDays);
  const filtered = items.filter(item => (item.date || '9999') >= cutoff);
  filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return filtered.slice(0, maxTotal);
}

async function main() {
  console.log('=== 每日资讯抓取开始 ===');

  const sources = await readJsonSafe(SOURCES_PATH, []);
  const manualNews = await readJsonSafe(MANUAL_PATH, []);
  const oldNews = await readJsonSafe(NEWS_PATH, []);
  const cache = await readJsonSafe(CACHE_PATH, {});

  const enabledSources = sources.filter(s => s.enabled && s.type !== 'manual-link');
  console.log(`启用的来源: ${enabledSources.length} 个`);

  const newItems = [];
  let processed = 0;

  for (const source of enabledSources) {
    if (processed >= MAX_NEW_ITEMS_PER_RUN) {
      console.log(`已达到单次最大处理数 ${MAX_NEW_ITEMS_PER_RUN}，停止`);
      break;
    }

    console.log(`[${source.name}] (${source.type})`);
    let rawItems = [];

    if (source.type === 'html-list') {
      rawItems = await fetchHtmlList(source);
    } else if (source.type === 'rss') {
      // RSS 兼容（保留能力）
      try {
        const { fetchRssItems } = await import('./utils/rss.mjs');
        rawItems = await fetchRssItems(source.rss || source.url);
      } catch {
        console.warn(`  [RSS] rss.mjs 加载失败`);
      }
    }

    for (const item of rawItems) {
      if (processed >= MAX_NEW_ITEMS_PER_RUN) break;

      // 跳过旧数据中已存在的
      if (oldNews.some(n => n.url === item.url)) continue;

      const date = item.date || today();
      const id = createNewsId(item.url, date);

      // 检查 AI 缓存
      let aiResult = cache[id];
      if (!aiResult) {
        const baseItem = {
          id,
          title: item.title,
          url: item.url,
          source: source.name,
          sourceType: source.type,
          category: source.category,
          date,
          createdAt: new Date().toISOString(),
        };
        console.log(`  [AI] 处理: ${item.title.slice(0, 40)}...`);
        aiResult = await enrichNewsWithAI(baseItem);
        cache[id] = aiResult;
        processed++;
      }

      newItems.push({
        id,
        title: item.title,
        url: item.url,
        source: source.name,
        sourceType: source.type,
        category: aiResult.category || source.category,
        date,
        fetchedAt: new Date().toISOString(),
        summary: aiResult.summary || '',
        legalPoint: aiResult.legalPoint || '',
        tags: aiResult.tags || [],
      });
    }
  }

  // 合并手动资讯
  for (const item of manualNews) {
    if (!oldNews.some(n => n.url === item.url) && !newItems.some(n => n.url === item.url)) {
      const id = createNewsId(item.url, item.date || today());
      newItems.push({
        id,
        title: item.title,
        url: item.url,
        source: item.source || '手动补充',
        sourceType: 'manual',
        category: item.category || '其他',
        date: item.date || today(),
        fetchedAt: new Date().toISOString(),
        summary: item.summary || '',
        legalPoint: item.legalPoint || '',
        tags: item.tags || [],
      });
    }
  }

  console.log(`本次新增: ${newItems.length} 条`);

  const merged = mergeAndDeduplicate(oldNews, newItems);
  const limited = limitNews(merged, MAX_TOTAL_ITEMS, MAX_AGE_DAYS);

  console.log(`最终保留: ${limited.length} 条`);

  await fs.writeFile(NEWS_PATH, JSON.stringify(limited, null, 2), 'utf-8');
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  console.log(`已写入 ${NEWS_PATH}`);
  console.log('=== 每日资讯抓取完成 ===');
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
