export function initGallery() {
  const items = [...document.querySelectorAll('.gallery-item')]
  if (!items.length) return

  const box = document.createElement('div')
  box.className = 'lightbox'
  box.setAttribute('role', 'dialog')
  box.setAttribute('aria-modal', 'true')
  box.innerHTML = `
    <button class="lightbox-close" aria-label="关闭">×</button>
    <button class="lightbox-prev" aria-label="上一张">‹</button>
    <img alt="" />
    <button class="lightbox-next" aria-label="下一张">›</button>
    <span class="lightbox-caption"></span>`
  document.body.appendChild(box)

  const img = box.querySelector('img')
  const caption = box.querySelector('.lightbox-caption')
  let idx = 0

  const open = (i) => {
    idx = (i + items.length) % items.length
    const a = items[idx]
    img.src = a.getAttribute('href')
    caption.textContent = a.getAttribute('data-caption') || ''
    box.classList.add('is-open')
    document.body.style.overflow = 'hidden'
  }
  const close = () => {
    box.classList.remove('is-open')
    document.body.style.overflow = ''
  }

  items.forEach((a, i) =>
    a.addEventListener('click', (e) => {
      e.preventDefault()
      open(i)
    }),
  )
  box.querySelector('.lightbox-close').addEventListener('click', close)
  box.querySelector('.lightbox-prev').addEventListener('click', (e) => {
    e.stopPropagation()
    open(idx - 1)
  })
  box.querySelector('.lightbox-next').addEventListener('click', (e) => {
    e.stopPropagation()
    open(idx + 1)
  })
  box.addEventListener('click', (e) => {
    if (e.target === box) close()
  })
  document.addEventListener('keydown', (e) => {
    if (!box.classList.contains('is-open')) return
    if (e.key === 'Escape') close()
    if (e.key === 'ArrowLeft') open(idx - 1)
    if (e.key === 'ArrowRight') open(idx + 1)
  })
}
