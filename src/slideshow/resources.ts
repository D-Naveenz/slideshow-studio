import type { ImageEntry } from '../wallpaper/catalogue.ts'

export const RESOURCE_BUDGET = 256 * 1024 * 1024
export const RENDER_RESERVE = 48 * 1024 * 1024
export const SLIDE_BUDGET = Math.floor((RESOURCE_BUDGET - RENDER_RESERVE) / 3)
export interface PrepareLimits { width: number; height: number; maxDimension: number }
export interface PreparedSlide {
  readonly key: string
  readonly entry: ImageEntry
  readonly width: number
  readonly height: number
  readonly bytes: number
  readonly canvas: HTMLCanvasElement
  dispose(): void
}
export type ImagePreparer = (entry: ImageEntry, limits: PrepareLimits, signal: AbortSignal) => Promise<PreparedSlide>
export const resourceKey = (entry: ImageEntry, limits: PrepareLimits) => JSON.stringify([entry.id, entry.revision, limits.width, limits.height, limits.maxDimension])

export function imageRequestUrl(entry: ImageEntry) {
  if (!entry.url.startsWith('file:') || entry.revision === 0) return entry.url
  const url = new URL(entry.url)
  url.searchParams.set('slideshow_revision', String(entry.revision))
  return url.href
}

export function preparedSize(width: number, height: number, limits: PrepareLimits) {
  // Account for retained pixels and a future GPU texture (8 bytes/pixel, conservatively).
  const scale = Math.min(1, Math.max(limits.width / width, limits.height / height), limits.maxDimension / Math.max(width, height), Math.sqrt(SLIDE_BUDGET / (width * height * 8)))
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) }
}

export const prepareImage: ImagePreparer = async (entry, limits, signal) => {
  const image = new Image(); image.decoding = 'async'
  let cancelLoad: (error: Error) => void = () => {}
  let timedOut = false
  const abort = () => { image.src = ''; cancelLoad(new DOMException('Image preparation cancelled', 'AbortError')) }
  const timeout = setTimeout(() => { timedOut = true; image.src = ''; cancelLoad(new Error('Image preparation timed out')) }, 30_000)
  signal.addEventListener('abort', abort, { once: true })
  try {
    await new Promise<void>((resolve, reject) => {
      cancelLoad = reject
      image.onload = () => resolve(); image.onerror = () => reject(new Error('Image could not be loaded'))
      if (signal.aborted) abort(); else image.src = imageRequestUrl(entry)
    })
    if (typeof image.decode === 'function') await image.decode()
    if (signal.aborted) throw new DOMException('Image preparation cancelled', 'AbortError')
    if (timedOut || !image.naturalWidth || !image.naturalHeight) throw new Error('Image has no usable pixels')
    const size = preparedSize(image.naturalWidth, image.naturalHeight, limits)
    const canvas = document.createElement('canvas'); canvas.height = 0; canvas.width = size.width; canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) { canvas.width = 0; canvas.height = 0; throw new Error('Canvas is unavailable') }
    try { context.drawImage(image, 0, 0, size.width, size.height) }
    catch (error) { canvas.width = 0; canvas.height = 0; throw error }
    return { key: resourceKey(entry, limits), entry, ...size, bytes: size.width * size.height * 8, canvas,
      dispose() { canvas.width = 0; canvas.height = 0 },
    }
  } finally {
    clearTimeout(timeout); signal.removeEventListener('abort', abort)
    image.onload = null; image.onerror = null; image.src = ''
  }
}

/** Reservations include the in-flight slot, preventing a transient fourth prepared slide. */
export class ResourceCache {
  private items = new Map<string, PreparedSlide>()
  get size() { return this.items.size }
  get bytes() { return RENDER_RESERVE + [...this.items.values()].reduce((sum, slide) => sum + slide.bytes, 0) }
  get(key: string) { return this.items.get(key) }
  reserve(priority: readonly string[]) {
    const keep = new Set([...new Set(priority)].slice(0, 3))
    for (const [key, slide] of this.items) if (!keep.has(key)) { this.items.delete(key); slide.dispose() }
  }
  add(slide: PreparedSlide) {
    if (this.items.has(slide.key)) throw new Error('Resource already cached')
    if (this.items.size >= 3 || this.bytes + slide.bytes > RESOURCE_BUDGET) throw new Error('Prepared resource budget exceeded')
    this.items.set(slide.key, slide)
  }
  dispose() { this.reserve([]) }
}
