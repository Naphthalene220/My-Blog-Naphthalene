export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function csrfHeaders(headers = {}) {
  const token = document.querySelector('meta[name="csrf-token"]')?.content || ''
  return { ...headers, 'X-CSRF-Token': token }
}
