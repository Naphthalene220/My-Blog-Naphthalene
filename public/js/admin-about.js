import { csrfHeaders } from './util.js'

const source = document.getElementById('about-source')
const statusEl = document.getElementById('about-status')
const previewBody = document.getElementById('about-preview-body')
const saveBtn = document.getElementById('about-save')
const previewBtn = document.getElementById('about-preview')

function setStatus(msg, kind = 'ok') {
  statusEl.textContent = msg
  statusEl.className = 'admin-status' + (kind ? ` is-${kind}` : '')
  clearTimeout(setStatus._t)
  setStatus._t = setTimeout(() => (statusEl.textContent = ''), 2600)
}

saveBtn.addEventListener('click', async () => {
  const r = await fetch('/admin/about', {
    method: 'POST',
    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ content: source.value }),
  })
  if (!r.ok) return setStatus('保存失败', 'err')
  setStatus('已保存')
})

previewBtn.addEventListener('click', async () => {
  const r = await fetch('/admin/preview', {
    method: 'POST',
    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ content: source.value }),
  })
  const data = await r.json()
  previewBody.innerHTML = data.html || ''
  previewBody.hidden = false
  previewBody.scrollIntoView({ behavior: 'smooth', block: 'start' })
})
