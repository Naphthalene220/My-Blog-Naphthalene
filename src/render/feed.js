import { store } from '../store/posts.js'
import { site, env } from '../config.js'
import { dateFormatted } from '../store/posts.js'
import { escapeHtml } from '../utils.js'

export function rssXml() {
  return buildRss({
    title: site.title,
    description: site.description,
    path: '/feed.xml',
    items: store.publishedPosts.slice(0, 30),
  })
}

export function studyRssXml() {
  return buildRss({
    title: `${site.title} · 大学学习笔记`,
    description: '按课程与章节整理的大学学习笔记。',
    path: '/study/feed.xml',
    items: store.publishedNotes.slice(0, 30),
  })
}

function buildRss({ title, description, path, items: posts }) {
  const base = env.baseUrl
  const items = posts
    .map((p) => {
      const url = `${base}${p.type === 'note' ? '/notes' : '/posts'}/${encodeURIComponent(p.slug)}`
      const pubDate = new Date(p.date).toUTCString()
      const desc = p.summary || store.plain(p).slice(0, 240)
      return (
        `    <item>\n` +
        `      <title>${escapeHtml(p.title)}</title>\n` +
        `      <link>${url}</link>\n` +
        `      <guid isPermaLink="true">${url}</guid>\n` +
        `      <pubDate>${pubDate}</pubDate>\n` +
        `      <description>${escapeHtml(desc)}</description>\n` +
        `    </item>`
      )
    })
    .join('\n')

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
    `<channel>\n` +
    `  <title>${escapeHtml(title)}</title>\n` +
    `  <link>${base}${path === '/feed.xml' ? '/' : '/study'}</link>\n` +
    `  <description>${escapeHtml(description)}</description>\n` +
    `  <language>${site.language || 'zh-CN'}</language>\n` +
    `  <atom:link href="${base}${path}" rel="self" type="application/rss+xml"/>\n` +
    `${items}\n` +
    `</channel>\n` +
    `</rss>\n`
  )
}

export function sitemapXml() {
  const base = env.baseUrl
  const urls = [
    `${base}/`,
    `${base}/archive/`,
    `${base}/study/`,
    `${base}/about/`,
    `${base}/search/`,
  ]
  for (const p of store.publishedPosts) urls.push(`${base}/posts/${encodeURIComponent(p.slug)}/`)
  for (const p of store.publishedNotes) urls.push(`${base}/notes/${encodeURIComponent(p.slug)}/`)
  for (const t of store.tags()) urls.push(`${base}/archive/?tag=${encodeURIComponent(t.name)}`)
  const body = urls.map((u) => `  <url><loc>${escapeHtml(u)}</loc></url>`).join('\n')
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</urlset>\n`
  )
}

export function rssDate(d) {
  return dateFormatted(d)
}
