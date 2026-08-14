import { Router } from 'express'
import { store } from '../store/posts.js'
import { searchIndex } from '../store/search.js'
import { site } from '../config.js'

const router = Router()

router.get('/posts', (req, res) => {
  const { tag, q, page } = req.query
  let list = store.published
  if (tag) list = store.byTag(String(tag))
  if (q) {
    const hits = searchIndex.search(String(q), 50)
    list = hits.map((h) => store.get(h.post.slug)).filter(Boolean)
  }
  const perPage = site.paginate || 8
  const p = Math.max(1, parseInt(page, 10) || 1)
  const pages = Math.max(1, Math.ceil(list.length / perPage))
  const items = list
    .slice((p - 1) * perPage, p * perPage)
    .map((post) => store.toListModel(post))
  res.json({
    posts: items,
    page: p,
    pages,
    total: list.length,
  })
})

router.get('/posts/:slug', (req, res) => {
  const post = store.get(req.params.slug)
  if (!post) return res.status(404).json({ error: 'not_found' })
  res.json({ post: store.toDetailModel(post) })
})

router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim()
  res.json({ q, results: q ? searchIndex.search(q, 30) : [] })
})

router.get('/tags', (req, res) => res.json({ tags: store.tags() }))
router.get('/archive', (req, res) => res.json({ archive: store.archive() }))

export default router
