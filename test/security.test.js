import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { isSafeSlug } from '../src/store/posts.js'
import { renderMarkdown } from '../src/render/markdown.js'
import { allowedImageType, hasValidImageSignature } from '../src/uploads.js'

test('slug 只能使用安全的文件名字符', () => {
  assert.equal(isSafeSlug('hello-world_2026'), true)
  assert.equal(isSafeSlug('中文标题'), true)
  assert.equal(isSafeSlug('../../outside'), false)
  assert.equal(isSafeSlug('has/slash'), false)
  assert.equal(isSafeSlug('.'), false)
  assert.equal(isSafeSlug('x'.repeat(121)), false)
})

test('Markdown 不执行原始 HTML', () => {
  const html = renderMarkdown('<script>alert(1)</script>')
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;/)
})

test('上传扩展名、MIME 和文件签名必须一致', () => {
  assert.equal(allowedImageType('photo.png', 'image/png'), '.png')
  assert.equal(allowedImageType('payload.svg', 'image/svg+xml'), null)
  assert.equal(allowedImageType('fake.png', 'text/html'), null)
  assert.equal(
    hasValidImageSignature(Buffer.from('89504e470d0a1a0a0000', 'hex'), '.png'),
    true,
  )
  assert.equal(hasValidImageSignature(Buffer.from('<script>bad</script>'), '.png'), false)
})

test('未配置 ADMIN_PASSWORD 时空密码也不能登录', () => {
  const authUrl = new URL('../src/auth.js', import.meta.url).href
  const script = `import { verifyPassword } from ${JSON.stringify(authUrl)}; process.exit((await verifyPassword('')) ? 1 : 0)`
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: process.cwd(),
    env: { ...process.env, ADMIN_PASSWORD: '' },
  })
  assert.equal(result.status, 0, result.stderr?.toString())
})
