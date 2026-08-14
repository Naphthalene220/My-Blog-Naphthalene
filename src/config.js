import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { CONFIG_DIR, ROOT } from './paths.js'

dotenv.config({ path: path.join(ROOT, '.env') })

function readSiteConfig() {
  const raw = fs.readFileSync(path.join(CONFIG_DIR, 'site.json'), 'utf8')
  return JSON.parse(raw)
}

export const site = readSiteConfig()

// 静态资源版本号：修改 public/ 下的 CSS/JS 后 +1，用于破坏浏览器缓存。
export const assetVersion = '4'

export const env = {
  port: Number(process.env.PORT) || 3000,
  adminPassword: process.env.ADMIN_PASSWORD || '',
  sessionSecret: process.env.SESSION_SECRET || '',
  baseUrl: (process.env.BASE_URL || site.baseUrl || `http://localhost:3000`).replace(/\/+$/, ''),
}


