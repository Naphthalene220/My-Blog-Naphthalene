# 一个尝试Deepseek V4pro 0813+Dsh 的产物

# 萘· Naphthalene

**随笔 · 游记 · 技术 · 摄影**。

- **风格**：森林绿 · 冷色调 · 构成主义（苏式美学）· 宏大沉默物体
- **渲染**：服务端渲染（EJS），无前端框架，客户端仅用原生 ES Modules 增强交互
- **能力**：代码高亮、数学公式（KaTeX）、图片画廊、日/夜间模式、微交互、顶栏搜索框（即输即搜）、RSS、归档（含侧栏标签筛选）
- **后台**：自建（登录鉴权 + Markdown 编辑器 + 实时预览 + 图片上传 + 关于页编辑）

## 快速开始

```bash
npm install
cp .env.example .env        # 修改 ADMIN_PASSWORD 等
npm start                   # 或 npm run dev（监听模式）
```

打开 <http://localhost:3000>。后台位于 <http://localhost:3000/admin>。

| 地址 | 说明 |
| --- | --- |
| `/` | 首页（文章列表，分页） |
| `/posts/:slug` | 文章详情 |
| `/archive`（`?tag=` 筛选）`/about` `/search` | 归档（含标签侧栏）/ 关于 / 搜索 |
| `/feed.xml`（或 `/rss.xml`） | RSS 订阅 |
| `/sitemap.xml` | 站点地图 |
| `/admin` | 后台 |

## 目录结构

```
config/site.json       站点配置（标题、作者、导航、分页数等）
content/posts/*.md     文章（Markdown + YAML frontmatter）
content/pages/about.md 关于页
content/images/        图片（封面 / 正文 / 上传目录 uploads/）
views/                 服务端模板（EJS）
src/                   后端（store / render / routes / auth）
public/                前端静态资源（CSS / JS）
server.js              入口
```

## 写一篇文章

在 `content/posts/` 新建 `slug.md`：

```markdown
---
title: "文章标题"
date: "2024-01-01"
tags: [技术, 笔记]
summary: "列表页摘要"
cover: /content/images/xxx.svg
draft: false               # true 表示草稿，不对外展示
---

正文……（Markdown）
```

或直接在后台 `/admin` 里写。直接放入 `.md` 文件后，站点会自动热重载，无需重启。

### 支持的 Markdown 扩展

- **代码高亮**：``` ```js ```` 围栏代码块，自动高亮并标注语言；
- **数学公式**：`$...$` 行内，`$$...$$` 块级（KaTeX）；
- **图片画廊**：连续书写多张 `![说明](/path/img)`（每张单独成段）即自动合并为画廊，单击放大浏览。

## 从其他平台迁移

大多数静态博客（Jekyll / Hugo / Hexo 等）都是「Markdown + frontmatter」，迁移即拷贝：

1. 把原平台的文章 `.md` 放入 `content/posts/`；
2. 对照上表补齐 / 调整 frontmatter 字段（`title` `date` `tags` 等）；
3. 图片放入 `content/images/`，正文引用改为 `/content/images/...`；
4. 刷新页面即可看到内容（文件监听会自动重载）。

> 需要多作者？本博客为**单作者**设计（一个后台账号），如需多人可在此基础上扩展权限表。

## 部署

任意支持 Node.js 的平台即可（无特定平台依赖）：

```bash
npm ci --omit=dev
npm start
```

生产环境请务必设置 `ADMIN_PASSWORD` 与 `SESSION_SECRET`，并把 `BASE_URL` 改为真实域名（影响 RSS / sitemap 的绝对链接）。
