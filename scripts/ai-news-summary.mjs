/**
 * AI 资讯摘要生成
 * 使用 OpenAI-compatible Chat Completions API
 */

const SYSTEM_PROMPT = `你是一名面向中国法律实务场景的法律资讯编辑助手。你的任务是根据资讯标题、来源、发布时间和可用摘要，为法律实务网站生成简洁、准确、保守的资讯摘要、分类、标签和律师视角点评。

要求：
1. 不得编造原文没有的信息；
2. 如果信息不足，应使用保守表述；
3. 摘要应简明，不超过 80 字；
4. 分类只能从指定分类中选择；
6. 标签控制在 2—5 个；
7. 输出必须是合法 JSON；
8. 不要输出 Markdown；
9. 不要输出解释文字。`;

const CATEGORIES = [
  '政策法规',
  '司法动态',
  '知识产权',
  'AI 与数据合规',
  '法律科技',
  '企业合规',
  '资本市场',
  '律师行业',
];

function buildUserPrompt(item) {
  return `请根据以下资讯信息生成结构化结果。

可选分类：
${CATEGORIES.map(c => `- ${c}`).join('\n')}

资讯信息：
标题：${item.title}
来源：${item.source}
发布时间：${item.date}
原始摘要：${item.rawDescription || '无'}
链接：${item.url}

请输出 JSON，格式如下：
{
  "summary": "不超过80字的摘要",
  "category": "从可选分类中选择一个",
  "tags": ["标签1", "标签2"],
  "importance": "high 或 medium 或 low"
}`;
}

/**
 * 使用 AI 丰富资讯信息
 * @param {object} item - 基础资讯对象
 * @returns {object} 包含 summary, lawyerComment, category, tags, importance 的对象
 */
export async function enrichNewsWithAI(item) {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    console.warn('[AI] 未配置 AI_API_KEY，使用 fallback 摘要');
    return fallback(item);
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(item) },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`[AI] API 响应 ${response.status}，使用 fallback`);
      return fallback(item);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    // 尝试解析 JSON（可能被 markdown 代码块或 think 标签包裹）
    let jsonStr = text;
    // 移除 <think>...</think> 标签
    jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/gi, '');
    // 移除 markdown 代码块
    jsonStr = jsonStr.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    // 提取第一个 JSON 对象
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('未找到 JSON 对象');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 200) : fallback(item).summary,
      category: CATEGORIES.includes(parsed.category) ? parsed.category : item.category || '政策法规',
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter(t => typeof t === 'string').slice(0, 5) : [],
      importance: ['high', 'medium', 'low'].includes(parsed.importance) ? parsed.importance : 'medium',
    };
  } catch (err) {
    console.warn(`[AI] 处理失败: ${err.message}，使用 fallback`);
    return fallback(item);
  }
}

/**
 * 兜底结果
 */
function fallback(item) {
  return {
    summary: item.rawDescription || `${item.source}发布相关资讯，建议点击原文查看具体内容。`,
    category: item.category || '政策法规',
    tags: [item.source].filter(Boolean),
    importance: 'medium',
  };
}
