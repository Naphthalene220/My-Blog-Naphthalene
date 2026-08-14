import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import markdownItKatex from 'markdown-it-katex'
import { escapeAttr } from '../utils.js'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const out = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        return `<pre class="hljs" data-lang="${escapeAttr(lang)}"><code>${out}</code></pre>`
      } catch {
        /* fall through */
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  },
})

md.use(markdownItKatex, { throwOnError: false, errorColor: '#cc0000' })

// 自定义图片画廊：将「只含图片的段落」渲染为画廊 / 单图。
// 语法：连续书写多张 ![](src) 即自动组成 gallery；单张则渲染为 photo。
function imageTokensInPara(tokens, i) {
  const open = tokens[i]
  const inline = tokens[i + 1]
  const close = tokens[i + 2]
  if (
    !(open && open.type === 'paragraph_open') ||
    !(inline && inline.type === 'inline') ||
    !(close && close.type === 'paragraph_close')
  ) {
    return null
  }
  const children = inline.children || []
  if (!children.length) return null
  const images = []
  for (const c of children) {
    if (c.type === 'image') images.push(c)
    else if (c.type === 'softbreak') continue
    else if (c.type === 'text' && /^\s*$/.test(c.content)) continue
    else return null
  }
  return images.length ? images : null
}

md.core.ruler.after('inline', 'gallery', (state) => {
  const tokens = state.tokens
  const out = []
  let i = 0
  while (i < tokens.length) {
    const images = imageTokensInPara(tokens, i)
    if (images) {
      const t = new state.Token('html_block', '', 0)
      t.content = renderGallery(images)
      t.block = true
      out.push(t)
      i += 3
    } else {
      out.push(tokens[i])
      i += 1
    }
  }
  state.tokens = out
  return true
})

function renderGallery(imageTokens) {
  const items = imageTokens
    .map((tok) => {
      const src = tok.attrGet('src') || ''
      const title = tok.attrGet('title') || ''
      const alt = tok.content || ''
      const caption = alt || title
      return (
        `<a class="gallery-item" href="${escapeAttr(src)}" data-caption="${escapeAttr(caption)}">` +
        `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" decoding="async"></a>`
      )
    })
    .join('\n')
  if (imageTokens.length === 1) {
    return `<figure class="photo">${items}</figure>\n`
  }
  return `<figure class="gallery" data-count="${imageTokens.length}">${items}</figure>\n`
}

export function renderMarkdown(source) {
  return md.render(String(source ?? ''))
}

export { md }
