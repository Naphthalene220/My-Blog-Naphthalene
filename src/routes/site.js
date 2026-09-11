import { Router } from 'express'
import { store, NOTE_KINDS } from '../store/posts.js'
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
  const pg = paginate(store.publishedPosts, page, perPage)
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
  const post = store.getPost(req.params.slug)
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

router.get('/notes/:slug', (req, res, next) => {
  const note = store.getNote(req.params.slug)
  if (!note) return next()
  const { prev, next: nextNote } = store.noteNeighbors(note.slug)
  res.render('pages/note', {
    pageTitle: note.title,
    description: note.summary || '',
    note: store.toDetailModel(note),
    prev: prev ? store.toListModel(prev) : null,
    next: nextNote ? store.toListModel(nextNote) : null,
  })
})

router.get('/study', (req, res) => {
  const filters = {
    year: String(req.query.year || ''),
    term: [1, 2].includes(Number(req.query.term)) ? Number(req.query.term) : '',
    course: String(req.query.course || ''),
    kind: NOTE_KINDS[req.query.kind] ? String(req.query.kind) : '',
    tag: String(req.query.tag || ''),
  }
  const allNotes = store.publishedNotes
  const years = [...new Set(allNotes.map((note) => note.academicYear))].sort().reverse()
  const courses = [...new Set(allNotes.map((note) => note.course))].sort((a, b) => a.localeCompare(b, 'zh'))
  const filteredNotes = store.notes(filters)
  const archive = store.studyArchive(filters)
  res.render('pages/study', {
    pageTitle: '大学学习笔记',
    description: '按学年、学期、课程与章节整理的大学学习笔记。',
    archive,
    filters,
    years,
    courses,
    kinds: NOTE_KINDS,
    tags: store.tags('note'),
    stats: {
      notes: filteredNotes.length,
      courses: new Set(filteredNotes.map((note) => note.course)).size,
      semesters: archive.length,
    },
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
