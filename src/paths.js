import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const ROOT = path.resolve(__dirname, '..')
export const CONFIG_DIR = path.join(ROOT, 'config')
export const CONTENT_DIR = path.join(ROOT, 'content')
export const POSTS_DIR = path.join(CONTENT_DIR, 'posts')
export const PAGES_DIR = path.join(CONTENT_DIR, 'pages')
export const IMAGES_DIR = path.join(CONTENT_DIR, 'images')
export const UPLOADS_DIR = path.join(IMAGES_DIR, 'uploads')
export const PUBLIC_DIR = path.join(ROOT, 'public')
export const VIEWS_DIR = path.join(ROOT, 'views')
