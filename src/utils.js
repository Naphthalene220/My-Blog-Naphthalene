export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;')
}

export function slugify(text) {
  const base = String(text)
    .toLowerCase()
    .trim()
    .replace(/['"‘’“”]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (base) return base
  // fallback for titles with no latin/digits
  let hash = 0
  for (const ch of String(text)) hash = (hash * 31 + ch.codePointAt(0)) >>> 0
  return `post-${hash.toString(36)}`
}

const dateFmt = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return dateFmt.format(d).replace(/\//g, '-')
}

export function formatDateLong(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

export function readingTime(plainText) {
  const cjk = (plainText.match(/[\u4e00-\u9fff]/g) || []).length
  const words = (plainText.match(/[a-zA-Z0-9]+/g) || []).length
  const minutes = Math.max(1, Math.round(cjk / 400 + words / 200))
  return minutes
}

export function stripMarkdown(md) {
  return String(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function makeExcerpt(plainText, len = 160) {
  if (!plainText) return ''
  const t = plainText.replace(/\s+/g, ' ').trim()
  return t.length > len ? t.slice(0, len) + '…' : t
}
