import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { CONFIG_DIR, ROOT } from './paths.js'

dotenv.config({ path: path.join(ROOT, '.env') })

function readSiteConfig() {
  const raw = fs.readFileSync(path.join(CONFIG_DIR, 'site.json'), 'utf8')
  return JSON.parse(raw)
}

const SITE_FILE = path.join(CONFIG_DIR, 'site.json')

// site 对象在模块生命周期内保持同一引用，后台修改配置后就地更新其字段，
// 使所有 import { site } 的使用方（模板、RSS 等）立即看到新值。
export const site = readSiteConfig()

export function reloadSite() {
  const next = readSiteConfig()
  for (const key of Object.keys(site)) delete site[key]
  Object.assign(site, next)
  return site
}

export function writeSiteConfig(nextSite) {
  fs.writeFileSync(SITE_FILE, JSON.stringify(nextSite, null, 2) + '\n', 'utf8')
  return reloadSite()
}

// 静态资源版本号：修改 public/ 下的 CSS/JS 后 +1，用于破坏浏览器缓存。
export const assetVersion = '7'

export const env = {
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 3000,
  adminPassword: process.env.ADMIN_PASSWORD || '',
  sessionSecret: process.env.SESSION_SECRET || '',
  baseUrl: (process.env.BASE_URL || site.baseUrl || `http://localhost:3000`).replace(/\/+$/, ''),
}
