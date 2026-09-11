import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { store, dateFormatted } from '../store/posts.js'
import { searchIndex } from '../store/search.js'
import { readPage, writePage } from '../store/pages.js'
import { renderMarkdown } from '../render/markdown.js'
import { verifyPassword, requireAuth, requireCsrf } from '../auth.js'
import { IMAGES_DIR, UPLOADS_DIR } from '../paths.js'
import { site, writeSiteConfig } from '../config.js'
import { allowedImageType, hasValidImageSignature } from '../uploads.js'

const router = Router()

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_FAILURES = 5
const loginAttempts = new Map()

function loginState(key) {
  const now = Date.now()
  const state = loginAttempts.get(key)
  if (!state || now - state.startedAt >= LOGIN_WINDOW_MS) {
    const fresh = { startedAt: now, failures: 0 }
    loginAttempts.set(key, fresh)
    return fresh
  }
  return state
}

// ---------- 登录 ----------
router.get('/login', (req, res) => {
  if (req.session && req.session.admin) return res.redirect('/admin/posts')
  res.render('admin/login', { pageTitle: '登录 · 后台', error: null, layout: false })
})

router.post('/login', requireCsrf, async (req, res) => {
  const key = req.ip || req.socket.remoteAddress || 'unknown'
  const state = loginState(key)
  if (state.failures >= LOGIN_MAX_FAILURES) {
    return res.status(429).render('admin/login', {
      pageTitle: '登录 · 后台',
      error: '尝试次数过多，请 15 分钟后再试',
      layout: false,
    })
  }
  const ok = await verifyPassword(req.body.password)
  if (!ok) {
    state.failures += 1
    return res.status(401).render('admin/login', {
      pageTitle: '登录 · 后台',
      error: '密码不正确',
      layout: false,
    })
  }
  loginAttempts.delete(key)
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('无法创建登录会话')
    req.session.admin = true
    res.redirect('/admin/posts')
  })
})

router.post('/logout', requireCsrf, (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'))
})

// ---------- 图片上传 ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedImageType(file.originalname, file.mimetype)) cb(null, true)
    else cb(new Error('仅支持 JPG、PNG、WebP、GIF 或 AVIF 图片'))
  },
})

function uploadOne(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    next()
  })
}

router.post('/upload', requireAuth, requireCsrf, uploadOne, (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有收到文件' })
  const ext = allowedImageType(req.file.originalname, req.file.mimetype)
  if (!ext || !hasValidImageSignature(req.file.buffer, ext)) {
    return res.status(400).json({ error: '文件内容与图片格式不符' })
  }
  const base =
    path
      .basename(req.file.originalname, ext)
      .replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]+/g, '-')
      .slice(0, 60) || 'img'
  const filename = `${Date.now()}-${base}${ext}`
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.file.buffer)
  res.json({ url: `/content/images/uploads/${filename}` })
})

// ---------- 预览 ----------
router.post('/preview', requireAuth, requireCsrf, (req, res) => {
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

router.post('/posts', requireAuth, requireCsrf, (req, res) => {
  const b = req.body || {}
  let post
  try {
    post = store.savePost(
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
  } catch (err) {
    if (err.code === 'INVALID_SLUG') return res.status(400).json({ error: err.message })
    throw err
  }
  searchIndex.rebuild()
  res.json({ ok: true, slug: post.slug })
})

router.delete('/posts/:slug', requireAuth, requireCsrf, (req, res) => {
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

router.post('/about', requireAuth, requireCsrf, (req, res) => {
  writePage('about', req.body.content || '')
  res.json({ ok: true })
})

// ---------- 站点设置 ----------
router.get('/settings', requireAuth, (req, res) => {
  res.render('admin/settings', {
    pageTitle: '站点设置 · 后台',
    site,
    layout: false,
  })
})

router.post('/settings', requireAuth, requireCsrf, (req, res) => {
  const b = req.body || {}
  const author = b.author || {}
  const links = {}
  if (author.links && typeof author.links === 'object') {
    for (const [name, href] of Object.entries(author.links)) {
      const n = String(name).trim()
      const h = String(href || '').trim()
      if (n && h) links[n] = h
    }
  }
  const next = {
    ...site,
    title: String(b.title ?? site.title),
    titleEn: String(b.titleEn ?? site.titleEn),
    tagline: String(b.tagline ?? site.tagline),
    description: String(b.description ?? site.description),
    paginate: Math.min(50, Math.max(1, Number(b.paginate) || site.paginate || 8)),
    footer: String(b.footer ?? site.footer),
    author: {
      ...site.author,
      name: String(author.name ?? site.author.name),
      bio: String(author.bio ?? site.author.bio),
      email: String(author.email ?? site.author.email),
      links,
    },
  }
  writeSiteConfig(next)
  res.json({ ok: true, site: next })
})

// ---------- 图片管理 ----------
const IMG_EXTS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'])

function listImages() {
  const items = []
  const addDir = (dir, prefix) => {
    if (!fs.existsSync(dir)) return
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name)
      let stat
      try {
        stat = fs.statSync(full)
      } catch {
        continue
      }
      if (!stat.isFile()) continue
      if (!IMG_EXTS.has(path.extname(name).toLowerCase())) continue
      const rel = prefix ? `${prefix}/${name}` : name
      items.push({
        rel,
        name,
        url: `/content/images/${rel}`,
        size: stat.size,
        mtime: stat.mtimeMs,
      })
    }
  }
  addDir(IMAGES_DIR, '')
  addDir(UPLOADS_DIR, 'uploads')
  return items.sort((a, b) => b.mtime - a.mtime)
}

router.get('/media', requireAuth, (req, res) => {
  res.render('admin/media', {
    pageTitle: '图片管理 · 后台',
    images: listImages(),
    layout: false,
  })
})

router.delete('/media', requireAuth, requireCsrf, (req, res) => {
  const rel = String(req.query.rel || '')
  if (!rel || rel.includes('..') || rel.startsWith('/') || rel.includes('\\')) {
    return res.status(400).json({ error: 'invalid' })
  }
  const target = path.resolve(IMAGES_DIR, rel)
  if (target !== IMAGES_DIR && !target.startsWith(IMAGES_DIR + path.sep)) {
    return res.status(400).json({ error: 'invalid' })
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return res.status(404).json({ error: 'not_found' })
  }
  fs.unlinkSync(target)
  res.json({ ok: true })
})

export default router
