import { Router } from 'express'
import { store } from '../store/posts.js'
import { searchIndex } from '../store/search.js'
import { readPage } from '../store/pages.js'
import { site } from '../config.js'

const router = Router()

function paginate(list, page, perPage) {
  const total = list.length
  const pages = Math.max(1, Math.ceil(total / perPage))
  const p = Math.min(Math.max(1, page), pages)
  return {
    items: list.slice((p - 1) * perPage, p * perPage),
    page: p,
    pages,
    total,
    hasPrev: p > 1,
    hasNext: p < pages,
  }
}

function renderHome(req, res) {
  const perPage = site.paginate || 8
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pg = paginate(store.published, page, perPage)
  const posts = pg.items.map((p) => store.toListModel(p))
  res.render('pages/home', {
    pageTitle: site.title,
    description: site.description,
    posts,
    featured: posts[0] || null,
    pagination: pg,
  })
}

router.get('/', renderHome)
router.get('/page/:num', (req, res) => {
  req.query.page = req.params.num
  renderHome(req, res)
})

router.get('/posts/:slug', (req, res, next) => {
  const post = store.get(req.params.slug)
  if (!post) return next()
  const { prev: prevPost, next: nextPost } = store.neighbors(post.slug)
  res.render('pages/post', {
    pageTitle: post.title,
    description: post.summary || '',
    post: store.toDetailModel(post),
    prev: prevPost ? store.toListModel(prevPost) : null,
    next: nextPost ? store.toListModel(nextPost) : null,
  })
})

router.get('/archive', (req, res) => {
  const tag = String(req.query.tag || '')
  const archive = store
    .archive()
    .map(({ year, posts }) => ({
      year,
      posts: posts
        .filter((p) => !tag || p.tags.includes(tag))
        .map((p) => store.toListModel(p)),
    }))
    .filter((g) => g.posts.length)
  res.render('pages/archive', {
    pageTitle: tag ? `# ${tag} · 归档` : '归档',
    archive,
    tags: store.tags(),
    activeTag: tag,
  })
})

router.get('/tags', (req, res) => res.redirect('/archive'))

router.get('/tags/:tag', (req, res) => {
  res.redirect(`/archive?tag=${encodeURIComponent(req.params.tag)}`)
})

router.get('/about', (req, res) => {
  const page = readPage('about')
  res.render('pages/about', {
    pageTitle: '关于我',
    content: page.exists ? page.html : '<p class="muted">还没有写关于页，前往 <a href="/admin">后台</a> 添加。</p>',
  })
})

router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim()
  const results = q ? searchIndex.search(q, 30) : []
  res.render('pages/search', { pageTitle: '搜索', q, results })
})

export default router
