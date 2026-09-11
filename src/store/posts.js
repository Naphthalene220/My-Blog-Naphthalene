import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { POSTS_DIR } from '../paths.js'
import { renderMarkdown } from '../render/markdown.js'
import { stripMarkdown, makeExcerpt, readingTime, slugify } from '../utils.js'

export const NOTE_KINDS = {
  lecture: '课堂',
  textbook: '教材',
  lab: '实验',
  assignment: '作业',
  review: '复习',
  other: '其他',
}

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

export function isValidAcademicYear(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{4})$/)
  return Boolean(match && Number(match[2]) === Number(match[1]) + 1)
}

function normalizeType(value) {
  return value === 'note' ? 'note' : 'post'
}

function normalizeChapterOrder(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
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
  const type = normalizeType(data.type)
  const post = {
    slug,
    type,
    title: data.title || slug,
    date,
    updated: data.updated ? toDate(data.updated, null) : null,
    tags: normalizeTags(data.tags),
    summary: String(data.summary || ''),
    cover: String(data.cover || ''),
    draft: Boolean(data.draft),
    lang: String(data.lang || 'zh'),
    academicYear: String(data.academicYear || '').trim(),
    term: Number(data.term) || null,
    course: String(data.course || '').trim(),
    courseCode: String(data.courseCode || '').trim(),
    chapter: String(data.chapter || '').trim(),
    chapterOrder: normalizeChapterOrder(data.chapterOrder),
    noteKind: NOTE_KINDS[data.noteKind] ? data.noteKind : '',
    source: content || '',
    file,
    _plain: null,
    _html: null,
  }
  if (type === 'note') validateNoteMetadata(post)
  return post
}

function validateNoteMetadata(input) {
  if (!isValidAcademicYear(input.academicYear)) {
    const err = new Error('学年格式应为连续年份，例如 2026-2027')
    err.code = 'INVALID_POST'
    throw err
  }
  if (![1, 2].includes(Number(input.term))) {
    const err = new Error('学期只能选择第一或第二学期')
    err.code = 'INVALID_POST'
    throw err
  }
  if (!String(input.course || '').trim()) {
    const err = new Error('学习笔记必须填写课程名称')
    err.code = 'INVALID_POST'
    throw err
  }
  if (!NOTE_KINDS[input.noteKind]) {
    const err = new Error('请选择有效的笔记类型')
    err.code = 'INVALID_POST'
    throw err
  }
  if (input.chapterOrder !== '' && input.chapterOrder != null && normalizeChapterOrder(input.chapterOrder) == null) {
    const err = new Error('章节序号必须是非负数字')
    err.code = 'INVALID_POST'
    throw err
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

  get publishedPosts() {
    return this.published.filter((p) => p.type === 'post')
  }

  get publishedNotes() {
    return this.published.filter((p) => p.type === 'note')
  }

  all(includeDrafts = false) {
    return includeDrafts ? [...this.sorted] : this.published
  }

  get(slug) {
    const p = this.posts.get(slug)
    return p && !p.draft ? p : null
  }

  getPost(slug) {
    const post = this.get(slug)
    return post?.type === 'post' ? post : null
  }

  getNote(slug) {
    const post = this.get(slug)
    return post?.type === 'note' ? post : null
  }

  getRaw(slug) {
    return this.posts.get(slug) || null
  }

  byTag(tag, type = 'post') {
    return this.published.filter((p) => p.type === type && p.tags.includes(tag))
  }

  tags(type = 'post') {
    const map = new Map()
    for (const p of this.published.filter((item) => item.type === type)) {
      for (const t of p.tags) map.set(t, (map.get(t) || 0) + 1)
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'))
  }

  archive() {
    const years = new Map()
    for (const p of this.publishedPosts) {
      const y = p.date.getFullYear()
      if (!years.has(y)) years.set(y, [])
      years.get(y).push(p)
    }
    return [...years.entries()]
      .map(([year, posts]) => ({ year, posts }))
      .sort((a, b) => b.year - a.year)
  }

  notes(filters = {}) {
    const year = String(filters.year || '')
    const course = String(filters.course || '')
    const kind = String(filters.kind || '')
    const tag = String(filters.tag || '')
    const term = filters.term ? Number(filters.term) : null
    return this.publishedNotes.filter((note) =>
      (!year || note.academicYear === year) &&
      (!term || note.term === term) &&
      (!course || note.course === course) &&
      (!kind || note.noteKind === kind) &&
      (!tag || note.tags.includes(tag)),
    )
  }

  courses(includeDrafts = false) {
    const list = includeDrafts ? this.sorted : this.published
    return [...new Set(
      list
        .filter((post) => post.type === 'note' && post.course)
        .map((post) => post.course.trim()),
    )].sort((a, b) => a.localeCompare(b, 'zh'))
  }

  studyArchive(filters = {}) {
    const semesters = new Map()
    for (const note of this.notes(filters)) {
      const semesterKey = `${note.academicYear}:${note.term}`
      if (!semesters.has(semesterKey)) {
        semesters.set(semesterKey, {
          academicYear: note.academicYear,
          term: note.term,
          courses: new Map(),
        })
      }
      const semester = semesters.get(semesterKey)
      if (!semester.courses.has(note.course)) {
        semester.courses.set(note.course, {
          name: note.course,
          code: note.courseCode,
          chapters: new Map(),
          count: 0,
          updated: note.updated || note.date,
        })
      }
      const course = semester.courses.get(note.course)
      const chapterName = note.chapter || '综合'
      if (!course.chapters.has(chapterName)) {
        course.chapters.set(chapterName, {
          name: chapterName,
          order: note.chapterOrder,
          notes: [],
        })
      }
      const chapter = course.chapters.get(chapterName)
      chapter.notes.push(note)
      if (chapter.order == null && note.chapterOrder != null) chapter.order = note.chapterOrder
      course.count += 1
      const changed = note.updated || note.date
      if (changed > course.updated) course.updated = changed
      if (!course.code && note.courseCode) course.code = note.courseCode
    }

    return [...semesters.values()]
      .sort((a, b) => b.academicYear.localeCompare(a.academicYear) || b.term - a.term)
      .map((semester) => ({
        ...semester,
        courses: [...semester.courses.values()]
          .sort((a, b) => a.name.localeCompare(b.name, 'zh'))
          .map((course) => ({
            ...course,
            chapters: [...course.chapters.values()]
              .sort((a, b) =>
                (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
                a.name.localeCompare(b.name, 'zh'),
              )
              .map((chapter) => ({
                ...chapter,
                notes: chapter.notes.sort(compareNotes).map((note) => this.toListModel(note)),
              })),
          })),
      }))
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
    const list = this.publishedPosts
    const idx = list.findIndex((p) => p.slug === slug)
    if (idx === -1) return { prev: null, next: null }
    return {
      prev: idx > 0 ? list[idx - 1] : null,
      next: idx < list.length - 1 ? list[idx + 1] : null,
    }
  }

  noteNeighbors(slug) {
    const note = this.getNote(slug)
    if (!note) return { prev: null, next: null }
    const list = this.publishedNotes
      .filter((item) =>
        item.academicYear === note.academicYear &&
        item.term === note.term &&
        item.course === note.course,
      )
      .sort(compareNotes)
    const idx = list.findIndex((item) => item.slug === slug)
    return {
      prev: idx > 0 ? list[idx - 1] : null,
      next: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null,
    }
  }

  toListModel(post) {
    return {
      slug: post.slug,
      type: post.type,
      url: post.type === 'note' ? `/notes/${encodeURIComponent(post.slug)}` : `/posts/${encodeURIComponent(post.slug)}`,
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
      academicYear: post.academicYear,
      term: post.term,
      course: post.course,
      courseCode: post.courseCode,
      chapter: post.chapter,
      chapterOrder: post.chapterOrder,
      noteKind: post.noteKind,
      noteKindLabel: post.type === 'note' ? NOTE_KINDS[post.noteKind] || NOTE_KINDS.other : '',
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

    const requestedType = input.type ?? existing?.type ?? 'post'
    if (!['post', 'note'].includes(requestedType)) {
      const err = new Error('内容类型只能是普通文章或学习笔记')
      err.code = 'INVALID_POST'
      throw err
    }
    const type = normalizeType(requestedType)
    if (type === 'note') validateNoteMetadata(input)

    const data = {
      title: input.title || slug,
      slug,
      type,
      date: ymd,
      tags: normalizeTags(input.tags),
      summary: input.summary || '',
      cover: input.cover || '',
      draft: Boolean(input.draft),
    }
    if (type === 'note') {
      data.academicYear = String(input.academicYear).trim()
      data.term = Number(input.term)
      data.course = String(input.course).trim()
      data.courseCode = String(input.courseCode || '').trim()
      data.chapter = String(input.chapter || '').trim()
      const order = normalizeChapterOrder(input.chapterOrder)
      if (order != null) data.chapterOrder = order
      data.noteKind = input.noteKind
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

function compareNotes(a, b) {
  return (a.chapterOrder ?? Number.MAX_SAFE_INTEGER) - (b.chapterOrder ?? Number.MAX_SAFE_INTEGER) ||
    a.date - b.date ||
    a.title.localeCompare(b.title, 'zh')
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
