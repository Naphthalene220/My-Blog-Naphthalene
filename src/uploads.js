import path from 'node:path'

const TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}

export function allowedImageType(filename, mimetype) {
  const ext = path.extname(String(filename)).toLowerCase()
  return TYPES[ext] === mimetype ? ext : null
}

export function hasValidImageSignature(buffer, ext) {
  if (!Buffer.isBuffer(buffer)) return false
  if (ext === '.jpg' || ext === '.jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (ext === '.png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
  }
  if (ext === '.gif') {
    const signature = buffer.subarray(0, 6).toString('ascii')
    return signature === 'GIF87a' || signature === 'GIF89a'
  }
  if (ext === '.webp') {
    return buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  }
  if (ext === '.avif') {
    if (buffer.length < 16 || buffer.subarray(4, 8).toString('ascii') !== 'ftyp') return false
    const brands = buffer.subarray(8, Math.min(buffer.length, 32)).toString('ascii')
    return brands.includes('avif') || brands.includes('avis')
  }
  return false
}
