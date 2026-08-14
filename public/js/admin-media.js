const statusEl = document.getElementById('status')
const grid = document.getElementById('media-grid')

function setStatus(msg, kind = 'ok') {
  statusEl.textContent = msg
  statusEl.className = 'admin-status' + (kind ? ` is-${kind}` : '')
  clearTimeout(setStatus._t)
  setStatus._t = setTimeout(() => (statusEl.textContent = ''), 3000)
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch (e) {
    /* fall through */
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  ta.remove()
}

if (grid) {
  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]')
    if (!btn) return
    const card = btn.closest('.media-card')
    if (!card) return
    const url = card.dataset.url
    const rel = card.dataset.rel

    if (btn.dataset.act === 'copy') {
      await copyText(`![](${url})`)
      setStatus('已复制：' + url)
    } else if (btn.dataset.act === 'delete') {
      const name = card.querySelector('.media-name').textContent
      if (!window.confirm(`确认删除「${name}」？此操作不可恢复。`)) return
      const r = await fetch(`/admin/media?rel=${encodeURIComponent(rel)}`, { method: 'DELETE' })
      const data = await r.json()
      if (!r.ok) return setStatus(data.error || '删除失败', 'err')
      card.remove()
      setStatus('已删除')
    }
  })
}
