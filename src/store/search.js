import { store, NOTE_KINDS } from './posts.js'
import { escapeHtml } from '../utils.js'

// 分词：拉丁/数字按词，中文按单字 + 二元组，兼顾短查询与长词。
function tokenize(text) {
  const tokens = new Map()
  const add = (t) => {
    if (t) tokens.set(t, (tokens.get(t) || 0) + 1)
  }
  for (const m of String(text).toLowerCase().matchAll(/[a-z0-9]+/g)) add(m[0])
  for (const m of String(text).matchAll(/[\u4e00-\u9fff]+/g)) {
    const run = m[0]
    if (run.length <= 2) add(run)
    else for (let i = 0; i < run.length - 1; i++) add(run.slice(i, i + 2))
  }
  return tokens
}

const FIELD_WEIGHT = { title: 6, course: 5, chapter: 4, tags: 4, noteKind: 3, summary: 2, body: 1 }

class SearchIndex {
  constructor() {
    this.index = new Map()
    this.docs = new Map()
  }

  rebuild() {
    this.index = new Map()
    this.docs = new Map()
    for (const post of store.published) {
      const doc = {
        slug: post.slug,
        title: post.title,
        plain: store.plain(post),
        fields: {
          title: tokenize(post.title),
          course: tokenize(post.course),
          chapter: tokenize(post.chapter),
          tags: tokenize(post.tags.join(' ')),
          noteKind: tokenize(post.type === 'note' ? NOTE_KINDS[post.noteKind] || '' : ''),
          summary: tokenize(post.summary),
          body: tokenize(store.plain(post)),
        },
      }
      this.docs.set(post.slug, doc)
      const seen = new Set()
      for (const [field, toks] of Object.entries(doc.fields)) {
        for (const token of toks.keys()) {
          if (seen.has(token)) continue
          seen.add(token)
          if (!this.index.has(token)) this.index.set(token, [])
          this.index.get(token).push({ slug: post.slug, field })
        }
      }
    }
  }

  search(query, limit = 20, filters = {}) {
    if (!query || !String(query).trim()) return []
    const qTokens = [...tokenize(query).keys()]
    if (!qTokens.length) return []
    const N = Math.max(1, this.docs.size)
    const scores = new Map()
    for (const token of qTokens) {
      const postings = this.index.get(token)
      if (!postings) continue
      const idf = Math.log(1 + N / postings.length)
      for (const { slug, field } of postings) {
        const doc = this.docs.get(slug)
        if (!doc) continue
        const post = store.get(slug)
        if (!post || (filters.type && post.type !== filters.type)) continue
        const tf = doc.fields[field].get(token) || 1
        const w = FIELD_WEIGHT[field] || 1
        scores.set(slug, (scores.get(slug) || 0) + idf * w * (1 + Math.log(tf)))
      }
    }
    const ranked = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([slug, score]) => {
        const post = store.get(slug)
        return {
          post: store.toListModel(post),
          score,
          snippet: this.snippet(slug, qTokens),
        }
      })
    return ranked
  }

  snippet(slug, qTokens) {
    const doc = this.docs.get(slug)
    if (!doc) return ''
    const text = doc.plain
    let idx = -1
    let term = ''
    for (const t of qTokens) {
      const i = text.toLowerCase().indexOf(t)
      if (i !== -1) {
        idx = i
        term = t
        break
      }
    }
    if (idx === -1) return doc.title
    const start = Math.max(0, idx - 40)
    const end = Math.min(text.length, idx + term.length + 60)
    const head = start > 0 ? '…' : ''
    const tail = end < text.length ? '…' : ''
    return escapeHtml(head + text.slice(start, end) + tail)
  }
}

export const searchIndex = new SearchIndex()
searchIndex.rebuild()
