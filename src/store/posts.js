import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { POSTS_DIR } from '../paths.js'
import { renderMarkdown } from '../render/markdown.js'
import { stripMarkdown, makeExcerpt, readingTime, slugify } from '../utils.js'

function normalizeTags(tags) {
  if (!tags) return []
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean)
  return String(tags)
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function isSafeSlug(value) {
  const slug = String(value || '')
  return slug.length > 0 && slug.length <= 120 && /^[\p{L}\p{N}_-]+$/u.test(slug)
}

function toDate(value, fallback) {
  if (value instanceof Date) return value
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? fallback : d
}

function parsePost(file) {
  const raw = fs.readFileSync(file, 'utf8')
  const { data, content } = matter(raw)
  const slug = String(data.slug || path.basename(file, path.extname(file)))
  const date = toDate(data.date, new Date(0))
  return {
    slug,
    title: data.title || slug,
    date,
    updated: data.updated ? toDate(data.updated, null) : null,
    tags: normalizeTags(data.tags),
    summary: String(data.summary || ''),
    cover: String(data.cover || ''),
    draft: Boolean(data.draft),
    lang: String(data.lang || 'zh'),
    source: content || '',
    file,
    _plain: null,
    _html: null,
  }
}

class PostStore {
  constructor() {
    this.posts = new Map()
    this.sorted = []
    this.reload()
  }

  reload() {
    this.posts = new Map()
    if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true })
    const files = fs
      .readdirSync(POSTS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join(POSTS_DIR, f))
    for (const file of files) {
      try {
        const post = parsePost(file)
        this.posts.set(post.slug, post)
      } catch (err) {
        console.error(`[store] 无法解析 ${file}:`, err.message)
      }
    }
    this.sorted = [...this.posts.values()].sort((a, b) => b.date - a.date)
    return this
  }

  get published() {
    return this.sorted.filter((p) => !p.draft)
  }

  all(includeDrafts = false) {
    return includeDrafts ? [...this.sorted] : this.published
  }

  get(slug) {
    const p = this.posts.get(slug)
    return p && !p.draft ? p : null
  }

  getRaw(slug) {
    return this.posts.get(slug) || null
  }

  byTag(tag) {
    return this.published.filter((p) => p.tags.includes(tag))
  }

  tags() {
    const map = new Map()
    for (const p of this.published) {
      for (const t of p.tags) map.set(t, (map.get(t) || 0) + 1)
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'))
  }

  archive() {
    const years = new Map()
    for (const p of this.published) {
      const y = p.date.getFullYear()
      if (!years.has(y)) years.set(y, [])
      years.get(y).push(p)
    }
    return [...years.entries()]
      .map(([year, posts]) => ({ year, posts }))
      .sort((a, b) => b.year - a.year)
  }

  plain(post) {
    if (post._plain == null) post._plain = stripMarkdown(post.source)
    return post._plain
  }

  html(post) {
    if (post._html == null) post._html = renderMarkdown(post.source)
    return post._html
  }

  neighbors(slug) {
    const list = this.published
    const idx = list.findIndex((p) => p.slug === slug)
    if (idx === -1) return { prev: null, next: null }
    return {
      prev: idx > 0 ? list[idx - 1] : null,
      next: idx < list.length - 1 ? list[idx + 1] : null,
    }
  }

  toListModel(post) {
    return {
      slug: post.slug,
      title: post.title,
      date: post.date,
      dateISO: post.date.toISOString(),
      dateFormatted: dateFormatted(post.date),
      updated: post.updated,
      tags: post.tags,
      summary: post.summary || makeExcerpt(this.plain(post)),
      cover: post.cover,
      readingTime: readingTime(this.plain(post)),
      draft: post.draft,
    }
  }

  toDetailModel(post) {
    return {
      ...this.toListModel(post),
      html: this.html(post),
      source: post.source,
    }
  }

  savePost(input, body) {
    const existing = input.slug ? this.posts.get(input.slug) : null
    const slug = String(input.slug || slugify(input.title)).trim()
    if (!isSafeSlug(slug)) {
      const err = new Error('slug 只能包含文字、数字、连字符和下划线，且不超过 120 个字符')
      err.code = 'INVALID_SLUG'
      throw err
    }
    const filename = `${slug}.md`
    const file = path.resolve(POSTS_DIR, filename)
    if (!file.startsWith(POSTS_DIR + path.sep)) {
      const err = new Error('slug 超出文章目录')
      err.code = 'INVALID_SLUG'
      throw err
    }

    const date = input.date
      ? new Date(input.date)
      : existing
        ? existing.date
        : new Date()
    const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

    const data = {
      title: input.title || slug,
      slug,
      date: ymd,
      tags: normalizeTags(input.tags),
      summary: input.summary || '',
      cover: input.cover || '',
      draft: Boolean(input.draft),
    }
    if (input.updated) data.updated = input.updated

    fs.mkdirSync(POSTS_DIR, { recursive: true })
    fs.writeFileSync(file, matter.stringify(String(body ?? ''), data), 'utf8')

    // 如果 slug 变更，删除旧文件
    if (existing && existing.file !== file && fs.existsSync(existing.file)) {
      fs.unlinkSync(existing.file)
    }

    this.reload()
    return this.getRaw(slug)
  }

  deletePost(slug) {
    const post = this.posts.get(slug)
    if (!post) return false
    if (fs.existsSync(post.file)) fs.unlinkSync(post.file)
    this.reload()
    return true
  }
}

export function dateFormatted(d) {
  const date = d instanceof Date ? d : new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function dateLong(d) {
  const date = d instanceof Date ? d : new Date(d)
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

export const store = new PostStore()
