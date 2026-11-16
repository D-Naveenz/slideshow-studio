/** Encode raw host paths as local URLs without interpreting #, ?, %, or Unicode as URL syntax. */
export function localFileUrl(path: string): string {
  if (!path || [...path].some(character => character.charCodeAt(0) < 32)) throw new Error('Invalid local path')
  if (/^file:/i.test(path)) {
    if (!/^file:\/\//i.test(path)) throw new Error('Expected an absolute local file URL')
    const url = new URL(path)
    if (url.search || url.hash || url.username || url.password) throw new Error('Expected an encoded local file URL')
    decodeURIComponent(url.pathname) // Reject malformed escaping in explicitly encoded URLs.
    return url.href
  }
  const normalized = path.replaceAll('\\', '/')
  const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
  if (/^[a-z]:\//i.test(normalized)) {
    return new URL(`file:///${normalized.slice(0, 2)}/${normalized.slice(3).split('/').map(encode).join('/')}`).href
  }
  if (normalized.startsWith('//')) {
    const [host, share, ...rest] = normalized.slice(2).split('/')
    if (!host || !share || /[:@?#%]/.test(host)) throw new Error('Invalid UNC path')
    return new URL(`file://${host}/${[share, ...rest].map(encode).join('/')}`).href
  }
  if (normalized.startsWith('/')) return new URL(`file://${normalized.split('/').map(encode).join('/')}`).href
  throw new Error('Expected an absolute local path')
}

export function localFileId(url: string): string {
  // Windows drive paths and UNC names are case-insensitive; POSIX names remain case-sensitive.
  return /^file:\/\/(?:\/[a-z]:\/|[^/])/i.test(url) ? url.toLowerCase() : url
}

export function imageName(url: string) {
  return decodeURIComponent(new URL(url).pathname.split('/').pop() || '')
}

export const isImageName = (name: string) => /\.(jpe?g|png|pnga|webp|bmp|gif|svg|avif)$/i.test(name)
