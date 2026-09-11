import bcrypt from 'bcryptjs'
import session from 'express-session'
import crypto from 'node:crypto'
import { env } from './config.js'

let hashPromise = null
function getHash() {
  if (!hashPromise) hashPromise = bcrypt.hash(env.adminPassword || '', 10)
  return hashPromise
}

export async function verifyPassword(password) {
  // 未配置密码时必须关闭登录，而不是把空字符串当作有效密码。
  if (!env.adminPassword) return false
  const hash = await getHash()
  return bcrypt.compare(String(password ?? ''), hash)
}

export const sessionMiddleware = session({
  name: 'taiga.sid',
  secret: env.sessionSecret || Math.random().toString(36).slice(2) + Date.now().toString(36),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
})

export function attachCsrfToken(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex')
  res.locals.csrfToken = req.session.csrfToken
  next()
}

export function requireCsrf(req, res, next) {
  const supplied = String(req.get('x-csrf-token') || req.body?._csrf || '')
  const expected = String(req.session?.csrfToken || '')
  const valid =
    supplied.length === expected.length &&
    supplied.length > 0 &&
    crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  if (valid) return next()
  if (req.is('application/json') || req.get('x-csrf-token')) {
    return res.status(403).json({ error: 'invalid_csrf_token' })
  }
  return res.status(403).send('请求已过期，请返回后刷新页面重试。')
}

export function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next()
  if (req.path.startsWith('/api')) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  return res.redirect('/admin/login')
}
