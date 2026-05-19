/**
 * RSS 抓取与解析工具
 */

import { XMLParser } from 'fast-xml-parser';

/**
 * 抓取并解析 RSS feed
 * @param {string} rssUrl - RSS 地址
 * @param {number} timeout - 超时毫秒数
 * @returns {Array<{title: string, link: string, pubDate: string, description: string}>}
 */
export async function fetchRssItems(rssUrl, timeout = 10000) {
  if (!rssUrl) return [];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(rssUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LegalAINewsBot/1.0)',
      },
    });
    clearTimeout(timer);

    if (!response.ok) return [];

    const xml = await response.text();
    return parseRssXml(xml);
  } catch (err) {
    console.warn(`[RSS] 抓取失败 ${rssUrl}: ${err.message}`);
    return [];
  }
}

/**
 * 解析 RSS/XML 为条目数组
 */
function parseRssXml(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const parsed = parser.parse(xml);

  // RSS 2.0 格式
  if (parsed?.rss?.channel?.item) {
    const items = Array.isArray(parsed.rss.channel.item)
      ? parsed.rss.channel.item
      : [parsed.rss.channel.item];
    return items.map(normalizeItem);
  }

  // Atom 格式
  if (parsed?.feed?.entry) {
    const entries = Array.isArray(parsed.feed.entry)
      ? parsed.feed.entry
      : [parsed.feed.entry];
    return entries.map(normalizeAtomEntry);
  }

  return [];
}

function normalizeItem(item) {
  return {
    title: stripHtml(item.title || ''),
    link: item.link || item.guid?.['#text'] || item.guid || '',
    pubDate: item.pubDate || item['dc:date'] || '',
    description: stripHtml(item.description || item['content:encoded'] || '').slice(0, 500),
  };
}

function normalizeAtomEntry(entry) {
  const link = Array.isArray(entry.link)
    ? entry.find(l => l['@_rel'] === 'alternate')?.['@_href'] || entry[0]?.['@_href'] || ''
    : entry.link?.['@_href'] || '';

  return {
    title: stripHtml(entry.title?.['#text'] || entry.title || ''),
    link,
    pubDate: entry.published || entry.updated || '',
    description: stripHtml(entry.summary?.['#text'] || entry.summary || entry.content?.['#text'] || '').slice(0, 500),
  };
}

/**
 * 去除 HTML 标签
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}
