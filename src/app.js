import express from 'express'
import path from 'node:path'
import { PUBLIC_DIR, VIEWS_DIR, IMAGES_DIR, ROOT } from './paths.js'
import { site, env, assetVersion } from './config.js'
import { sessionMiddleware, attachCsrfToken } from './auth.js'
import { dateLong } from './store/posts.js'
import siteRouter from './routes/site.js'
import apiRouter from './routes/api.js'
import adminRouter from './routes/admin.js'
import { rssXml, sitemapXml } from './render/feed.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  if (env.isProduction) app.set('trust proxy', 1)
  app.set('view engine', 'ejs')
  app.set('views', VIEWS_DIR)

  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.use(sessionMiddleware)

  // 开发期资源不设长缓存：用 ETag 每次协商（304），改动立即生效。
  app.use('/public', express.static(PUBLIC_DIR, { maxAge: 0, etag: true }))
  app.use('/content/images', express.static(IMAGES_DIR, { maxAge: 0, etag: true }))
  app.use(
    '/vendor/katex',
    express.static(path.join(ROOT, 'node_modules/katex/dist'), {
      maxAge: '30d',
      immutable: true,
    }),
  )

  app.use((req, res, next) => {
    res.locals.site = site
    res.locals.env = env
    res.locals.assetVersion = assetVersion
    res.locals.path = req.path
    res.locals.helpers = {
      dateLong,
      activeClass: (href) =>
        href === '/'
          ? req.path === '/' || req.path.startsWith('/page/')
            ? 'is-active'
            : ''
          : req.path === href || req.path.startsWith(href + '/')
            ? 'is-active'
            : '',
    }
    res.locals.pageTitle = site.title
    res.locals.description = site.description
    next()
  })

  app.get('/feed.xml', (req, res) => res.type('application/rss+xml').send(rssXml()))
  app.get('/rss.xml', (req, res) => res.type('application/rss+xml').send(rssXml()))
  app.get('/sitemap.xml', (req, res) => res.type('application/xml').send(sitemapXml()))

  app.use('/api', apiRouter)
  // 仅后台需要创建 CSRF 会话，避免给普通访客创建无用 Session。
  app.use('/admin', attachCsrfToken, adminRouter)
  app.use('/', siteRouter)

  // 404
  app.use((req, res) => {
    res.status(404).render('pages/404', { pageTitle: '404 · 页面不存在' })
  })

  // 500
  app.use((err, req, res, next) => {
    console.error(err)
    if (res.headersSent) return next(err)
    res.status(500).render('pages/404', {
      pageTitle: '500 · 出错了',
      error: err.message,
    })
  })

  return app
}
