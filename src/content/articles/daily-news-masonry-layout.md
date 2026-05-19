---
title: '法律文章与每日资讯瀑布流布局改造方案'
slug: 'daily-news-masonry-layout'
description: '介绍如何使用 CSS Columns + Tailwind CSS 实现法律文章和每日资讯的瀑布流卡片布局，提升内容平台感和阅读体验。'
category: '法律科技'
tags: ['Astro', 'Tailwind CSS', '瀑布流', '前端布局', 'GitHub Pages']
published: '2026-05-19'
updated: '2026-05-19'
---

## 改造目标

将法律文章页和每日资讯页从普通列表改为瀑布流卡片布局，提升内容平台感和阅读体验。

**核心原则**：轻量、稳定、低成本，不引入复杂瀑布流库。

### 具体目标

1. 法律文章页改为瀑布流卡片布局
2. 每日资讯页改为瀑布流卡片布局
3. 保留搜索和分类筛选功能
4. 桌面端 3 列，平板端 2 列，移动端 1 列
5. 不引入 Masonry.js、Packery 等复杂库
6. 使用 CSS Columns / Tailwind columns 实现
7. 整体风格保持法律科技网站的专业、克制、清爽

---

## 瀑布流实现方式

### 为什么选择 CSS Columns

1. 本项目主要是文字卡片，不是图片社区
2. CSS Columns 已经足够
3. GitHub Pages 静态站更适合轻量实现
4. 减少依赖，降低维护成本
5. 移动端适配更简单

### 通用瀑布流容器组件

创建 `src/components/MasonryGrid.astro`：

```astro
---
const { class: className = "" } = Astro.props;
---

<div class={`columns-1 md:columns-2 xl:columns-3 gap-5 space-y-5 ${className}`}>
  <slot />
</div>
```

**参数说明**：
- `columns-1`：移动端 1 列
- `md:columns-2`：平板端 2 列
- `xl:columns-3`：桌面端 3 列
- `gap-5`：列间距
- `space-y-5`：卡片纵向间距

### 卡片基础样式

每张卡片必须添加 `break-inside-avoid` 防止被截断：

```html
<article class="mb-5 break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
  ...
</article>
```

---

## 法律文章卡片设计

### 卡片字段

- 分类
- 标题
- 摘要
- 标签
- 发布日期
- 阅读按钮

### Astro 组件示例

创建 `src/components/ArticleCard.astro`：

```astro
---
const { article } = Astro.props;

const title = article.data?.title || article.title;
const description = article.data?.description || article.data?.summary || article.summary || "";
const category = article.data?.category || article.category || "法律实务";
const tags = article.data?.tags || article.tags || [];
const date = article.data?.date || article.date || "";
const url = article.slug ? `/articles/${article.slug}/` : article.url;
---

<article class="mb-5 break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
  <div class="mb-3 text-xs font-medium text-blue-600">
    {category}
  </div>

  <h2 class="mb-3 text-lg font-semibold leading-snug text-slate-900">
    <a href={url} class="hover:text-blue-600">
      {title}
    </a>
  </h2>

  {description && (
    <p class="mb-4 text-sm leading-6 text-slate-600">
      {description}
    </p>
  )}

  {tags.length > 0 && (
    <div class="mb-4 flex flex-wrap gap-2">
      {tags.slice(0, 4).map((tag) => (
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
          #{tag}
        </span>
      ))}
    </div>
  )}

  <div class="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
    <span>{date}</span>
    <a href={url} class="font-medium text-blue-600 hover:text-blue-700">
      阅读
    </a>
  </div>
</article>
```

---

## 每日资讯卡片设计

### 卡片字段

- 分类
- 标题
- 来源
- 日期
- AI 摘要
- 律师关注点
- 查看原文按钮

### Astro 组件示例

创建 `src/components/DailyNewsCard.astro`：

```astro
---
const { item } = Astro.props;

const title = item.title || "";
const source = item.source || "未知来源";
const category = item.category || "其他";
const date = item.date || "";
const summary = item.summary || "";
const legalPoint = item.legalPoint || "";
const url = item.url || "#";
---

<article class="mb-5 break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
  <div class="mb-3 flex items-center justify-between gap-3">
    <span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
      {category}
    </span>
    {date && <span class="text-xs text-slate-400">{date}</span>}
  </div>

  <h2 class="mb-3 text-lg font-semibold leading-snug text-slate-900">
    <a href={url} target="_blank" rel="noopener noreferrer" class="hover:text-blue-600">
      {title}
    </a>
  </h2>

  <div class="mb-3 text-xs text-slate-500">
    来源：{source}
  </div>

  {summary && (
    <p class="mb-3 text-sm leading-6 text-slate-600">
      <span class="font-medium text-slate-700">摘要：</span>{summary}
    </p>
  )}

  {legalPoint && (
    <p class="mb-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
      <span class="font-medium text-slate-700">律师关注：</span>{legalPoint}
    </p>
  )}

  <div class="border-t border-slate-100 pt-4 text-right">
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      class="text-sm font-medium text-blue-600 hover:text-blue-700"
    >
      查看原文
    </a>
  </div>
</article>
```

---

## 页面改造示例

### 法律文章页

修改 `src/pages/articles/index.astro`：

```astro
---
import MasonryGrid from "../../components/MasonryGrid.astro";
import ArticleCard from "../../components/ArticleCard.astro";
import { getCollection } from "astro:content";

const articles = await getCollection("articles");
---

<section class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
  <header class="mb-8">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900">
      法律文章
    </h1>
    <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
      沉淀知识产权、企业合规、合同风控、人工智能与数据合规等法律实务文章。
    </p>
  </header>

  <!-- 搜索与分类筛选区域 -->
  <div class="mb-8">
    <!-- Search / Category Filters -->
  </div>

  <MasonryGrid>
    {articles.map((article) => (
      <ArticleCard article={article} />
    ))}
  </MasonryGrid>
</section>
```

### 每日资讯页

修改 `src/pages/news.astro`：

```astro
---
import MasonryGrid from "../components/MasonryGrid.astro";
import DailyNewsCard from "../components/DailyNewsCard.astro";
import dailyNews from "../data/daily-news.json";

const news = dailyNews || [];
const latestUpdate = news[0]?.fetchedAt || news[0]?.date || "";
---

<section class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
  <header class="mb-8">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900">
      每日资讯
    </h1>
    <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
      自动整理法律、监管、知识产权、AI 与数据合规等领域的公开资讯，并生成简要摘要。
    </p>
    {latestUpdate && (
      <p class="mt-2 text-xs text-slate-400">
        最近更新：{latestUpdate}
      </p>
    )}
  </header>

  <!-- 搜索与分类筛选区域 -->
  <div class="mb-8">
    <!-- Search / Category Filters -->
  </div>

  <MasonryGrid>
    {news.map((item) => (
      <DailyNewsCard item={item} />
    ))}
  </MasonryGrid>
</section>
```

---

## 搜索与分类筛选保留要求

两个页面都要保留：
- 搜索框
- 分类筛选

不需要增加：
- 复杂标签云
- 多条件高级筛选
- 无限滚动
- 登录收藏
- 评论功能

第一版筛选逻辑可以只覆盖：标题、摘要、分类、来源、标签

---

## 响应式要求

瀑布流列数：
- 移动端：1 列
- 平板端：2 列
- 桌面端：3 列

Tailwind 推荐：
```html
<div class="columns-1 md:columns-2 xl:columns-3 gap-5 space-y-5">
  ...
</div>
```

卡片必须包含 `break-inside-avoid` 和 `mb-5` 防止卡片被分割。

---

## 空状态处理

### 法律文章为空

显示：暂无文章，后续将持续更新。

### 每日资讯为空

显示：暂无资讯更新，请稍后查看。

示例：
```astro
{items.length === 0 ? (
  <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
    暂无内容，后续将持续更新。
  </div>
) : (
  <MasonryGrid>
    ...
  </MasonryGrid>
)}
```

---

## 风格规范

整体风格应符合：法律科技、专业、克制、清爽、内容平台感

避免：
- 过度花哨
- 强烈霓虹
- 卡片颜色过多
- 大量阴影
- 复杂动效
- 密集标签

推荐视觉：
- 白色卡片
- 浅灰背景
- 深蓝标题
- 蓝色强调
- 圆角 2xl
- 轻阴影
- 适度留白

---

## 性能要求

1. 不引入大型瀑布流 JS 库
2. 不做无限滚动
3. 不做复杂动画
4. 卡片数量较多时仍能正常渲染
5. 图片如非必要不展示
6. 每日资讯卡片以文字为主

如果后续文章卡片需要封面图，再单独设计图片懒加载。

---

## 验收标准

完成后检查：

1. /articles 页面为瀑布流卡片布局
2. /news 页面为瀑布流卡片布局
3. 桌面端显示 3 列
4. 平板端显示 2 列
5. 移动端显示 1 列
6. 卡片不会被截断
7. 法律文章卡片展示标题、摘要、分类、标签、日期、阅读按钮
8. 每日资讯卡片展示标题、来源、日期、分类、摘要、律师关注点、查看原文按钮
9. 搜索功能仍然可用
10. 分类筛选仍然可用
11. 页面风格简洁、专业、适合法律工作者网站
12. 不引入 Masonry.js、Packery 等复杂库
13. GitHub Pages 构建通过
14. 移动端显示不拥挤

---

## 执行顺序

建议按以下顺序执行：

1. 检查现有 articles 和 daily-news 页面结构
2. 新增或确认 MasonryGrid.astro
3. 调整 ArticleCard.astro
4. 调整 DailyNewsCard.astro
5. 将 articles 页面列表区域替换为 MasonryGrid
6. 将 daily-news 页面列表区域替换为 MasonryGrid
7. 检查搜索与分类筛选是否正常
8. 检查响应式布局
9. 运行 `npm run build`
10. 修复构建报错并提交

---

## 最终说明

本次改造只调整展示层，不改变内容数据结构。

重点是：
- 法律文章和每日资讯统一为瀑布流内容卡片
- 用轻量 CSS Columns 实现
- 保留搜索和分类
- 不增加复杂依赖
- 保持法律科技网站的专业感
