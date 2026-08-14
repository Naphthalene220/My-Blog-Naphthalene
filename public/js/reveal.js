export function initReveal() {
  const els = document.querySelectorAll('.reveal')
  if (!els.length) return
  if (!('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('is-visible'))
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible')
          io.unobserve(en.target)
        }
      }
    },
    { threshold: 0.06, rootMargin: '0px 0px -36px 0px' },
  )
  els.forEach((e) => io.observe(e))
}
