import { Router } from 'express'
import { store } from '../store/posts.js'
import { searchIndex } from '../store/search.js'
import { site } from '../config.js'

const router = Router()

function paginated(list, page) {
  const perPage = site.paginate || 8
  const pages = Math.max(1, Math.ceil(list.length / perPage))
  const p = Math.min(Math.max(1, parseInt(page, 10) || 1), pages)
  return { items: list.slice((p - 1) * perPage, p * perPage), page: p, pages }
}

router.get('/posts', (req, res) => {
  const { tag, q, page } = req.query
  let list = store.publishedPosts
  if (tag) list = store.byTag(String(tag))
  if (q) {
    const hits = searchIndex.search(String(q), 50, { type: 'post' })
    list = hits.map((h) => store.getPost(h.post.slug)).filter(Boolean)
  }
  const pg = paginated(list, page)
  const items = pg.items.map((post) => store.toListModel(post))
  res.json({
    posts: items,
    page: pg.page,
    pages: pg.pages,
    total: list.length,
  })
})

router.get('/posts/:slug', (req, res) => {
  const post = store.getPost(req.params.slug)
  if (!post) return res.status(404).json({ error: 'not_found' })
  res.json({ post: store.toDetailModel(post) })
})

router.get('/notes', (req, res) => {
  const filters = {
    year: req.query.year,
    term: req.query.term,
    course: req.query.course,
    kind: req.query.kind,
    tag: req.query.tag,
  }
  let list = store.notes(filters)
  if (req.query.q) {
    const allowed = new Set(list.map((note) => note.slug))
    list = searchIndex
      .search(String(req.query.q), 100, { type: 'note' })
      .map((hit) => store.getNote(hit.post.slug))
      .filter((note) => note && allowed.has(note.slug))
  }
  const pg = paginated(list, req.query.page)
  res.json({
    notes: pg.items.map((note) => store.toListModel(note)),
    page: pg.page,
    pages: pg.pages,
    total: list.length,
  })
})

router.get('/notes/:slug', (req, res) => {
  const note = store.getNote(req.params.slug)
  if (!note) return res.status(404).json({ error: 'not_found' })
  res.json({ note: store.toDetailModel(note) })
})

router.get('/study', (req, res) => {
  res.json({
    archive: store.studyArchive({
      year: req.query.year,
      term: req.query.term,
      course: req.query.course,
      kind: req.query.kind,
      tag: req.query.tag,
    }),
  })
})

router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim()
  res.json({ q, results: q ? searchIndex.search(q, 30) : [] })
})

router.get('/tags', (req, res) => res.json({ tags: store.tags() }))
router.get('/archive', (req, res) => res.json({ archive: store.archive() }))

export default router
