import fs from 'node:fs'
import { createApp } from './src/app.js'
import { env } from './src/config.js'
import { store } from './src/store/posts.js'
import { searchIndex } from './src/store/search.js'
import { POSTS_DIR } from './src/paths.js'

const app = createApp()

app.listen(env.port, () => {
  console.log(`\n  🌲 泰加 TAIGA 已启动  →  http://localhost:${env.port}`)
  console.log(`  后台 /admin  |  RSS /feed.xml`)
  if (!env.adminPassword) {
    console.warn('  ⚠ 未设置 ADMIN_PASSWORD（.env），后台登录不可用。')
  }
  if (!env.sessionSecret) {
    console.warn('  ⚠ 未设置 SESSION_SECRET，重启后需重新登录后台。')
  }
})

// 直接向 content/posts 放入 .md（如从其他平台迁移）时自动重载索引
let timer = null
try {
  fs.watch(POSTS_DIR, { recursive: false }, () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      store.reload()
      searchIndex.rebuild()
      console.log('[store] 检测到内容变更，已重载。')
    }, 300)
  })
} catch (err) {
  console.warn('[store] 文件监视不可用：', err.message)
}
