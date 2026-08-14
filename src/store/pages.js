import fs from 'node:fs'
import path from 'node:path'
import { PAGES_DIR } from '../paths.js'
import { renderMarkdown } from '../render/markdown.js'

export function readPage(name) {
  const file = path.join(PAGES_DIR, `${name}.md`)
  if (!fs.existsSync(file)) {
    return { exists: false, html: '', source: '' }
  }
  const source = fs.readFileSync(file, 'utf8')
  return { exists: true, html: renderMarkdown(source), source }
}

export function writePage(name, source) {
  fs.mkdirSync(PAGES_DIR, { recursive: true })
  fs.writeFileSync(path.join(PAGES_DIR, `${name}.md`), String(source ?? ''), 'utf8')
}
