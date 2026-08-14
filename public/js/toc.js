import { escapeHtml } from './util.js'

export function initToc() {
  const nav = document.getElementById('toc-nav')
  const aside = document.getElementById('post-toc')
  const progressEl = document.getElementById('toc-progress')
  if (!nav) return

  const headings = [...document.querySelectorAll('.post-body h2, .post-body h3')]
  if (!headings.length) {
    if (aside) aside.hidden = true
    return
  }

  const links = headings.map((h, i) => {
    const id = h.id || `heading-${i + 1}`
    if (!h.id) h.id = id
    return { id, el: h }
  })

  nav.innerHTML = headings
    .map((h, i) => {
      const cls = h.tagName === 'H3' ? 'toc-item toc-h3' : 'toc-item'
      return `<a class="${cls}" href="#${links[i].id}">${escapeHtml(h.textContent)}</a>`
    })
    .join('')

  const items = [...nav.querySelectorAll('.toc-item')]
  const setActive = (id) => {
    items.forEach((a) => {
      a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`)
    })
  }

  function onScroll() {
    let current = null
    for (const { id, el } of links) {
      if (el.getBoundingClientRect().top <= 130) current = id
    }
    if (current) setActive(current)

    if (progressEl) {
      const body = document.querySelector('.post-body')
      if (body) {
        const r = body.getBoundingClientRect()
        const total = r.height - window.innerHeight
        const p = total > 0 ? Math.min(100, Math.max(0, (-r.top / total) * 100)) : 100
        progressEl.textContent = `${Math.round(p)}%`
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
}
