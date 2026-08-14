---
title: "从零实现一个极简 Markdown 渲染器"
date: "2024-03-18"
tags: [技术, Markdown, 笔记]
summary: "不依赖任何框架，用一百来行代码理解 Markdown 渲染的骨架：块级解析、行内解析、以及如何优雅地扩展语法。"
cover: /content/images/code.svg
draft: false
---

把 Markdown 文本变成 HTML，本质上是两件事：**块级结构识别**，以及**行内元素处理**。前者决定「这一行是标题还是段落」，后者决定「段落里的 `*斜体*` 和 `[链接](https://example.com)` 怎么变成标签」。

## 一个最小骨架

先定义两个阶段：

```js
function render(markdown) {
  const blocks = parseBlocks(markdown)   // 按空行切块，识别类型
  return blocks.map(renderBlock).join('\n')
}

function renderBlock(block) {
  if (block.type === 'heading') {
    return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`
  }
  if (block.type === 'paragraph') {
    return `<p>${renderInline(block.text)}</p>`
  }
  return ''
}
```

这里的关键是：**块解析和行内解析完全解耦**。无论段落还是标题，最终都要交给同一个 `renderInline` 处理行内语法，避免重复实现。

## 行内解析用正则一步步替换

```js
function renderInline(text) {
  return text
    .replace(/&/g, '&amp;')          // 先转义，防止注入
    .replace(/</g, '&lt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}
```

注意替换顺序：`**粗体**` 必须在 `*斜体*` 之前，否则会被斜体规则抢先吃掉。

## 时间复杂度与延伸

如果一篇文章有 $n$ 个字符、$m$ 个块，朴素实现的时间复杂度是 $O(n + m)$。真实的解析器（如 CommonMark 参考实现）还会处理嵌套、引用、列表缩进等边界情况，复杂度也随之上升：

$$
T(n) = O(n \cdot k) + \sum_{i=1}^{m} c_i
$$

其中 $k$ 是行内规则数量，$c_i$ 是第 $i$ 个块的渲染代价。对个人博客而言，这一档性能绰绰有余。

## 小结

自己写一遍渲染器，最大的收获不是代码，而是理解了「排版即程序」这件事——Markdown 的设计哲学，是把**写作的结构**交给作者，把**渲染的细节**交给机器。

> 简单的语法背后，是清晰的抽象分层。
