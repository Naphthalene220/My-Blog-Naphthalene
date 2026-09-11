import { csrfHeaders } from './util.js'

const $ = (id) => document.getElementById(id)
const statusEl = $('status')

function setStatus(msg, kind = 'ok') {
  statusEl.textContent = msg
  statusEl.className = 'admin-status' + (kind ? ` is-${kind}` : '')
  clearTimeout(setStatus._t)
  setStatus._t = setTimeout(() => (statusEl.textContent = ''), 3000)
}

$('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault()

  const links = {}
  for (const line of $('s-links').value.split('\n')) {
    const s = line.trim()
    if (!s) continue
    const idx = s.indexOf('|')
    const name = (idx === -1 ? s : s.slice(0, idx)).trim()
    const href = (idx === -1 ? '' : s.slice(idx + 1)).trim()
    if (name && href) links[name] = href
  }

  const payload = {
    title: $('s-title').value.trim(),
    titleEn: $('s-titleEn').value.trim(),
    tagline: $('s-tagline').value.trim(),
    description: $('s-description').value.trim(),
    paginate: Number($('s-paginate').value) || 8,
    footer: $('s-footer').value.trim(),
    author: {
      name: $('s-name').value.trim(),
      email: $('s-email').value.trim(),
      bio: $('s-bio').value.trim(),
      links,
    },
  }

  try {
    const r = await fetch('/admin/settings', {
      method: 'POST',
      headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    const data = await r.json()
    if (!r.ok) return setStatus(data.error || '保存失败', 'err')
    setStatus('已保存，立即生效')
  } catch (err) {
    setStatus('保存失败：' + err.message, 'err')
  }
})
