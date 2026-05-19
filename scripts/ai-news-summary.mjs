/**
 * AI 资讯摘要生成（非 RSS 版）
 * 输出: summary + legalPoint + tags + category
 */

const SYSTEM_PROMPT = `你是一个面向中国律师的法律资讯整理助手。

请根据以下资讯的标题、来源、分类和原始摘要，生成结构化结果：

要求：
1. summary：不超过 60 字，客观概括资讯内容；
2. legalPoint：不超过 40 字，从律师实务角度说明关注价值；
3. tags：生成 3 个标签；
4. category：只能从以下分类中选择一个：
   - 政策法规
   - 司法动态
   - 知识产权
   - AI 与数据合规
   - 企业合规
   - 法律科技
   - 监管动态
   - 其他

限制：
1. 不得编造原文没有的信息；
2. 不得输出法律结论；
3. 不得使用夸张宣传语；
4. 不得复制大段原文；
5. 输出 JSON，不要输出 Markdown；
6. 不要输出解释文字。`;

const CATEGORIES = [
  '政策法规', '司法动态', '知识产权', 'AI 与数据合规',
  '企业合规', '法律科技', '监管动态', '其他',
];

function buildUserPrompt(item) {
  return `资讯信息：
标题：${item.title}
来源：${item.source}
分类：${item.category}
原始摘要：${item.rawDescription || '无'}
链接：${item.url}

请输出 JSON：
{
  "summary": "不超过60字的摘要",
  "legalPoint": "不超过40字的律师关注点",
  "tags": ["标签1", "标签2", "标签3"],
  "category": "从可选分类中选择一个"
}`;
}

export async function enrichNewsWithAI(item) {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    console.warn('[AI] 未配置 AI_API_KEY，使用 fallback');
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

    // 兼容 think 标签 + markdown 代码块
    let jsonStr = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    jsonStr = jsonStr.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('未找到 JSON 对象');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 200) : fallback(item).summary,
      legalPoint: typeof parsed.legalPoint === 'string' ? parsed.legalPoint.slice(0, 100) : '',
      category: CATEGORIES.includes(parsed.category) ? parsed.category : item.category || '其他',
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter(t => typeof t === 'string').slice(0, 3) : [],
    };
  } catch (err) {
    console.warn(`[AI] 处理失败: ${err.message}，使用 fallback`);
    return fallback(item);
  }
}

function fallback(item) {
  return {
    summary: item.rawDescription || `${item.source}发布相关资讯，建议访问原文了解具体内容。`,
    legalPoint: '',
    category: item.category || '其他',
    tags: [item.source].filter(Boolean),
  };
}
