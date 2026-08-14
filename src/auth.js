import bcrypt from 'bcryptjs'
import session from 'express-session'
import { env } from './config.js'

let hashPromise = null
function getHash() {
  if (!hashPromise) hashPromise = bcrypt.hash(env.adminPassword || '', 10)
  return hashPromise
}

export async function verifyPassword(password) {
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
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
})

export function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next()
  if (req.path.startsWith('/api')) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  return res.redirect('/admin/login')
}
