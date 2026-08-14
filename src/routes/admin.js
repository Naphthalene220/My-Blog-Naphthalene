import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { store, dateFormatted } from '../store/posts.js'
import { searchIndex } from '../store/search.js'
import { readPage, writePage } from '../store/pages.js'
import { renderMarkdown } from '../render/markdown.js'
import { verifyPassword, requireAuth } from '../auth.js'
import { UPLOADS_DIR } from '../paths.js'
import { site } from '../config.js'

const router = Router()

// ---------- 登录 ----------
router.get('/login', (req, res) => {
  if (req.session && req.session.admin) return res.redirect('/admin/posts')
  res.render('admin/login', { pageTitle: '登录 · 后台', error: null, layout: false })
})

router.post('/login', async (req, res) => {
  const ok = await verifyPassword(req.body.password)
  if (!ok) {
    return res.status(401).render('admin/login', {
      pageTitle: '登录 · 后台',
      error: '密码不正确',
      layout: false,
    })
  }
  req.session.admin = true
  res.redirect('/admin/posts')
})

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'))
})

// ---------- 图片上传 ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
    cb(null, UPLOADS_DIR)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const base =
      path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]+/g, '-')
        .slice(0, 60) || 'img'
    cb(null, `${Date.now()}-${base}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif|svg\+xml)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('仅支持图片文件'))
  },
})

router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有收到文件' })
  res.json({ url: `/content/images/uploads/${req.file.filename}` })
})

// ---------- 预览 ----------
router.post('/preview', requireAuth, (req, res) => {
  res.json({ html: renderMarkdown(req.body.content || '') })
})

// ---------- 文章 CRUD ----------
router.get('/', requireAuth, (req, res) => res.redirect('/admin/posts'))

router.get('/posts', requireAuth, (req, res) => {
  const posts = store.all(true).map((p) => ({
    slug: p.slug,
    title: p.title,
    date: dateFormatted(p.date),
    tags: p.tags,
    draft: p.draft,
  }))
  res.render('admin/dashboard', {
    pageTitle: '文章管理 · 后台',
    posts,
    site,
    layout: false,
  })
})

router.get('/posts/:slug', requireAuth, (req, res) => {
  const post = store.getRaw(req.params.slug)
  if (!post) return res.status(404).json({ error: 'not_found' })
  res.json({
    post: {
      slug: post.slug,
      title: post.title,
      date: dateFormatted(post.date),
      updated: post.updated ? dateFormatted(post.updated) : '',
      tags: post.tags,
      summary: post.summary,
      cover: post.cover,
      draft: post.draft,
      content: post.source,
    },
  })
})

router.post('/posts', requireAuth, (req, res) => {
  const b = req.body || {}
  const post = store.savePost(
    {
      slug: b.slug,
      title: b.title,
      date: b.date,
      updated: b.updated || undefined,
      tags: b.tags,
      summary: b.summary,
      cover: b.cover,
      draft: b.draft,
    },
    b.content,
  )
  searchIndex.rebuild()
  res.json({ ok: true, slug: post.slug })
})

router.delete('/posts/:slug', requireAuth, (req, res) => {
  const ok = store.deletePost(req.params.slug)
  searchIndex.rebuild()
  res.json({ ok })
})

// ---------- 关于页 ----------
router.get('/about', requireAuth, (req, res) => {
  const page = readPage('about')
  res.render('admin/about', {
    pageTitle: '关于我 · 后台',
    source: page.source,
    layout: false,
  })
})

router.post('/about', requireAuth, (req, res) => {
  writePage('about', req.body.content || '')
  res.json({ ok: true })
})

export default router
