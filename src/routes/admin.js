import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { store, dateFormatted } from '../store/posts.js'
import { searchIndex } from '../store/search.js'
import { readPage, writePage } from '../store/pages.js'
import { renderMarkdown } from '../render/markdown.js'
import { verifyPassword, requireAuth } from '../auth.js'
import { IMAGES_DIR, UPLOADS_DIR } from '../paths.js'
import { site, writeSiteConfig } from '../config.js'

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

// ---------- 站点设置 ----------
router.get('/settings', requireAuth, (req, res) => {
  res.render('admin/settings', {
    pageTitle: '站点设置 · 后台',
    site,
    layout: false,
  })
})

router.post('/settings', requireAuth, (req, res) => {
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
    paginate: Number(b.paginate) || site.paginate || 8,
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

router.delete('/media', requireAuth, (req, res) => {
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
