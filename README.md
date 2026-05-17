# 法律实务与 AI 技能库

面向法律从业者的律师导航、法律文章与 AI 工作流技能库。

## 技术栈

- [Astro](https://astro.build/) v6
- [Tailwind CSS](https://tailwindcss.com/) v4
- Markdown / MDX
- GitHub Pages + GitHub Actions

## 本地运行

```bash
npm install
npm run dev       # 启动开发服务器
npm run build     # 构建生产版本
npm run preview   # 预览构建结果
```

## 内容维护

### 新增导航链接

编辑 `src/data/nav-links.json`，按既有 JSON 结构新增对象：

```json
{
  "name": "网站名称",
  "url": "https://example.com",
  "category": "分类",
  "description": "一句话用途描述。",
  "tags": ["标签1", "标签2"],
  "official": true,
  "free": true,
  "useCases": ["场景1", "场景2"],
  "priority": 1
}
```

支持的分类：法律法规、案例检索、裁判文书、法院诉讼、企业查询、知识产权、诉讼执行、政府监管、AI 工具、效率工具。

### 新增 AI 技能

在 `src/content/skills/` 下新增 `.md` 文件：

```yaml
---
title: "技能名称"
slug: "skill-slug"
description: "一句话描述。"
category: "分类"
tags: ["标签1", "标签2"]
version: "1.0.0"
updated: "2026-05-13"
downloadUrl: ""
---

## 适用场景
...
```

### 新增法律文章

在 `src/content/articles/` 下新增 `.md` 文件：

```yaml
---
title: "文章标题"
slug: "article-slug"
description: "一句话摘要。"
category: "分类"
tags: ["标签1", "标签2"]
published: "2026-05-13"
updated: "2026-05-13"
---

## 问题背景
...
```

## 部署到 GitHub Pages

1. 在 GitHub 创建仓库并推送代码
2. 进入仓库 Settings → Pages → Source 选择 **GitHub Actions**
3. 推送到 `main` 分支后自动构建部署

### 修改 base 路径

编辑 `astro.config.mjs`：

- **用户主页仓库**（`username.github.io`）：设置 `base: '/'`
- **项目仓库**（如 `legal-ai-site`）：设置 `base: '/legal-ai-site'`

同时修改 `site` 为你的实际域名。

## 项目结构

```text
src/
├── components/      # 可复用组件
├── content/
│   ├── articles/    # 法律文章 Markdown
│   └── skills/      # AI 技能 Markdown
├── data/
│   └── nav-links.json  # 导航数据
├── layouts/         # 页面布局
├── pages/           # 路由页面
└── styles/          # 全局样式
```

## 免责声明

本站内容仅供学习、研究和实务参考，不构成正式法律意见。任何具体案件或项目均应结合完整事实、证据材料及现行法律规定，由专业人员进行判断。
