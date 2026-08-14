const KEY = 'taiga-theme'

export function initTheme() {
  const btn = document.getElementById('theme-toggle')
  if (!btn) return
  const root = document.documentElement
  const current = () => (root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
  btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark'
    root.setAttribute('data-theme', next === 'dark' ? 'dark' : 'light')
    try {
      localStorage.setItem(KEY, next)
    } catch (e) {}
  })
}
