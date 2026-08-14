export function initProgress() {
  const readBar = document.getElementById('read-progress-bar')
  const scrollBar = document.getElementById('scroll-progress-bar')
  const scrollEl = document.getElementById('scroll-progress')

  // 文章页使用「阅读进度条」，隐藏全局「下滑进度条」。
  if (readBar && scrollEl) scrollEl.style.display = 'none'

  function update() {
    if (readBar) {
      const body = document.querySelector('.post-body')
      if (body) {
        const r = body.getBoundingClientRect()
        const total = r.height - window.innerHeight
        const p = total > 0 ? Math.min(100, Math.max(0, (-r.top / total) * 100)) : 100
        readBar.style.width = `${p}%`
      }
    } else if (scrollBar) {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const p = max > 0 ? (window.scrollY / max) * 100 : 0
      scrollBar.style.width = `${p}%`
    }
  }

  window.addEventListener('scroll', update, { passive: true })
  update()
}
