import { escapeHtml } from './util.js'

export function initSearch() {
  const input = document.getElementById('header-search-input')
  const drop = document.getElementById('header-search-drop')
  if (!input || !drop) return

  let timer = null

  function render(list, q) {
    if (!list.length) {
      drop.innerHTML = `<p class="drop-hint">没有找到相关内容。</p>`
      return
    }
    const items = list
      .map((r) => {
        const meta = r.post.type === 'note'
          ? ['学习笔记', r.post.course, r.post.dateFormatted]
          : [r.post.dateFormatted]
        return `<a class="drop-item" href="${r.post.url}">
          <strong>${escapeHtml(r.post.title)}</strong>
          <span class="drop-meta">${meta.map(escapeHtml).join(' · ')}</span>
          <span class="drop-snippet">${r.snippet}</span>
        </a>`
      })
      .join('')
    drop.innerHTML =
      items +
      `<a class="drop-more" href="/search?q=${encodeURIComponent(q)}">在搜索页查看全部结果 →</a>`
  }

  function openDrop() {
    drop.hidden = false
  }

  function closeDrop() {
    drop.hidden = true
  }

  input.addEventListener('input', () => {
    clearTimeout(timer)
    const q = input.value.trim()
    if (!q) {
      closeDrop()
      return
    }
    timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await r.json()
        render(data.results || [], q)
        openDrop()
      } catch (e) {
        /* 忽略网络错误 */
      }
    }, 180)
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrop()
  })

  // 点击输入框以外区域时收起下拉
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header-search')) closeDrop()
  })
}
