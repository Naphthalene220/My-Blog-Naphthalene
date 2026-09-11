import { csrfHeaders } from './util.js'

const $ = (id) => document.getElementById(id)

const form = {
  slug: $('f-slug'),
  title: $('f-title'),
  date: $('f-date'),
  tags: $('f-tags'),
  summary: $('f-summary'),
  cover: $('f-cover'),
  draft: $('f-draft'),
  content: $('f-content'),
}

const listEl = $('admin-list')
const statusEl = $('admin-status')
const deleteBtn = $('btn-delete')
const previewPanel = $('admin-preview')
const previewBody = $('admin-preview-body')
const fileInput = $('file-input')

let currentSlug = ''
let uploadMode = 'inline' // 'inline' | 'cover'

function setStatus(msg, kind = 'ok') {
  statusEl.textContent = msg
  statusEl.className = 'admin-status' + (kind ? ` is-${kind}` : '')
  clearTimeout(setStatus._t)
  setStatus._t = setTimeout(() => (statusEl.textContent = ''), 2600)
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function clearForm() {
  currentSlug = ''
  form.slug.value = ''
  form.title.value = ''
  form.date.value = today()
  form.tags.value = ''
  form.summary.value = ''
  form.cover.value = ''
  form.draft.checked = false
  form.content.value = ''
  deleteBtn.hidden = true
  setActiveItem(null)
  form.title.focus()
}

function setActiveItem(slug) {
  listEl.querySelectorAll('.admin-list-item').forEach((li) => {
    li.classList.toggle('is-active', li.dataset.slug === slug)
  })
}

async function loadPost(slug) {
  const r = await fetch(`/admin/posts/${encodeURIComponent(slug)}`)
  if (!r.ok) return setStatus('加载失败', 'err')
  const { post } = await r.json()
  currentSlug = post.slug
  form.slug.value = post.slug
  form.title.value = post.title
  form.date.value = post.date
  form.tags.value = (post.tags || []).join(', ')
  form.summary.value = post.summary || ''
  form.cover.value = post.cover || ''
  form.draft.checked = !!post.draft
  form.content.value = post.content || ''
  deleteBtn.hidden = false
  setActiveItem(post.slug)
}

function collect() {
  return {
    slug: currentSlug || '',
    title: form.title.value.trim(),
    date: form.date.value,
    tags: form.tags.value
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean),
    summary: form.summary.value.trim(),
    cover: form.cover.value.trim(),
    draft: form.draft.checked,
    content: form.content.value,
  }
}

function upsertListItem(post) {
  const slug = post.slug || currentSlug
  let li = listEl.querySelector(`[data-slug="${slug}"]`)
  if (!li) {
    li = document.createElement('li')
    li.className = 'admin-list-item'
    li.dataset.slug = slug
    listEl.prepend(li)
  }
  li.className = `admin-list-item ${post.draft ? 'is-draft' : ''} is-active`
  li.innerHTML = `<span class="admin-list-title"></span><span class="admin-list-meta"></span>`
  li.querySelector('.admin-list-title').textContent = post.title
  li.querySelector('.admin-list-meta').textContent = `${post.date}${post.draft ? ' · 草稿' : ''}`
}

async function save() {
  const data = collect()
  if (!data.title) return setStatus('请填写标题', 'err')
  try {
    const r = await fetch('/admin/posts', {
      method: 'POST',
      headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    })
    const res = await r.json()
    if (!r.ok) return setStatus(res.error || '保存失败', 'err')
    currentSlug = res.slug
    form.slug.value = res.slug
    deleteBtn.hidden = false
    upsertListItem({
      slug: res.slug,
      title: data.title,
      date: data.date,
      draft: data.draft,
    })
    setStatus('已保存')
  } catch (e) {
    setStatus('保存失败：' + e.message, 'err')
  }
}

async function remove() {
  if (!currentSlug) return
  if (!window.confirm(`确认删除「${form.title.value || currentSlug}」？此操作不可恢复。`)) return
  const r = await fetch(`/admin/posts/${encodeURIComponent(currentSlug)}`, {
    method: 'DELETE',
    headers: csrfHeaders(),
  })
  if (!r.ok) return setStatus('删除失败', 'err')
  listEl.querySelector(`[data-slug="${currentSlug}"]`)?.remove()
  clearForm()
  setStatus('已删除')
}

async function preview() {
  const r = await fetch('/admin/preview', {
    method: 'POST',
    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ content: form.content.value }),
  })
  const data = await r.json()
  previewBody.innerHTML = data.html || ''
  previewPanel.hidden = false
  previewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function insertAtCursor(text) {
  const ta = form.content
  const start = ta.selectionStart
  const end = ta.selectionEnd
  ta.value = ta.value.slice(0, start) + text + ta.value.slice(end)
  ta.selectionStart = ta.selectionEnd = start + text.length
  ta.focus()
}

async function handleFile(file) {
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  setStatus('上传中…')
  const r = await fetch('/admin/upload', { method: 'POST', headers: csrfHeaders(), body: fd })
  const data = await r.json()
  if (!r.ok) return setStatus(data.error || '上传失败', 'err')
  if (uploadMode === 'cover') {
    form.cover.value = data.url
  } else {
    insertAtCursor(`\n![](${data.url})\n`)
    preview()
  }
  setStatus('上传成功')
}

// 事件绑定
$('btn-new').addEventListener('click', clearForm)
$('btn-save').addEventListener('click', (e) => {
  e.preventDefault()
  save()
})
deleteBtn.addEventListener('click', remove)
$('btn-preview').addEventListener('click', preview)
$('btn-preview-close').addEventListener('click', () => (previewPanel.hidden = true))
$('btn-upload-inline').addEventListener('click', () => {
  uploadMode = 'inline'
  fileInput.click()
})
$('btn-upload-cover').addEventListener('click', () => {
  uploadMode = 'cover'
  fileInput.click()
})
fileInput.addEventListener('change', () => {
  handleFile(fileInput.files[0])
  fileInput.value = ''
})

listEl.addEventListener('click', (e) => {
  const li = e.target.closest('.admin-list-item')
  if (li) loadPost(li.dataset.slug)
})

// 拖拽上传图片到正文
form.content.addEventListener('dragover', (e) => e.preventDefault())
form.content.addEventListener('drop', (e) => {
  e.preventDefault()
  const file = e.dataTransfer.files && e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    uploadMode = 'inline'
    handleFile(file)
  }
})

clearForm()
