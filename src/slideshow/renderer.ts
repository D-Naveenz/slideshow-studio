import type { PrepareLimits, PreparedSlide } from './resources.ts'
import type { Settings } from '../wallpaper/settings.ts'

export interface SlideRenderer {
  readonly name?: string
  resize(): PrepareLimits
  draw(slide: PreparedSlide | undefined, settings: Readonly<Settings>, transition?: TransitionFrame): void
  release?(key: string): void
  warm?(slide: PreparedSlide): void
  subscribe?(listener: () => void): () => void
  dispose(): void
}

export interface TransitionFrame {
  incoming: PreparedSlide
  progress: number
  effect: 'fade' | 'slide'
  direction: -1 | 1
}

export function viewportSize(width: number, height: number, dpr: number, maxDimension = 8192): PrepareLimits {
  width = Math.max(1, width); height = Math.max(1, height)
  const scale = Math.min(dpr || 1, maxDimension / Math.max(width, height), Math.sqrt(8_388_608 / (width * height)))
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)), maxDimension }
}

export function imageRect(imageWidth: number, imageHeight: number, width: number, height: number, mode: 'fit' | 'fill') {
  const scale = (mode === 'fit' ? Math.min : Math.max)(width / imageWidth, height / imageHeight)
  return { x: (width - imageWidth * scale) / 2, y: (height - imageHeight * scale) / 2, width: imageWidth * scale, height: imageHeight * scale }
}

export function compositionSignature(settings: Readonly<Settings>, width: number, height: number) {
  return JSON.stringify([settings.fit, settings.background, settings.backgroundcolor, settings.blur, width, height])
}

export interface RenderBackend {
  readonly name: string
  readonly canvas: HTMLCanvasElement
  readonly maxDimension: number
  resize(limits: PrepareLimits): void
  draw(slide: PreparedSlide | undefined, settings: Readonly<Settings>, transition?: TransitionFrame): void
  release(key: string): void
  warm?(slide: PreparedSlide): void
  dispose(): void
}

export class CanvasRenderer implements RenderBackend {
  readonly name = 'Canvas2D fallback'
  readonly canvas = document.createElement('canvas')
  readonly maxDimension = 8192
  private context: CanvasRenderingContext2D
  private compositions = new Map<string, { signature: string; canvas: HTMLCanvasElement }>()
  constructor() {
    const context = this.canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Canvas is unavailable')
    this.context = context; this.canvas.className = 'wallpaper-canvas'; this.canvas.setAttribute('aria-hidden', 'true')
  }
  resize(limits: PrepareLimits) {
    if (this.canvas.width === limits.width && this.canvas.height === limits.height) return
    for (const key of this.compositions.keys()) this.release(key)
    // Drop the old backing store first: width-new × height-old can greatly exceed the budget.
    this.canvas.width = 0; this.canvas.height = 0
    this.canvas.width = limits.width; this.canvas.height = limits.height
  }
  private compose(slide: PreparedSlide, settings: Readonly<Settings>) {
    const { width, height } = this.canvas
    const signature = compositionSignature(settings, width, height)
    const cached = this.compositions.get(slide.key)
    if (cached?.signature === signature) return cached.canvas
    this.release(slide.key)
    const canvas = document.createElement('canvas'); canvas.height = 0; canvas.width = width; canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Canvas is unavailable')
    ctx.fillStyle = settings.backgroundcolor; ctx.fillRect(0, 0, width, height)
    if (settings.fit === 'fit' && settings.background === 'blur') {
      const scale = Math.min(1, 512 / Math.max(width, height))
      const low = document.createElement('canvas'); low.height = 0; low.width = Math.max(1, Math.ceil(width * scale)); low.height = Math.max(1, Math.ceil(height * scale))
      try {
        const blur = low.getContext('2d')
        if (blur) {
          const radius = settings.blur * width / Math.max(1, window.innerWidth) * scale
          const rect = imageRect(slide.width, slide.height, low.width + radius * 6, low.height + radius * 6, 'fill')
          blur.filter = `blur(${radius}px)`
          blur.drawImage(slide.canvas, rect.x - radius * 3, rect.y - radius * 3, rect.width, rect.height)
          ctx.drawImage(low, 0, 0, width, height)
        }
      } finally { low.width = 0; low.height = 0 }
    }
    const rect = imageRect(slide.width, slide.height, width, height, settings.fit)
    ctx.drawImage(slide.canvas, rect.x, rect.y, rect.width, rect.height)
    this.compositions.set(slide.key, { signature, canvas })
    return canvas
  }
  draw(slide: PreparedSlide | undefined, settings: Readonly<Settings>, transition?: TransitionFrame) {
    const { width, height } = this.canvas
    const keys = new Set([slide?.key, transition?.incoming.key])
    for (const key of this.compositions.keys()) if (!keys.has(key)) this.release(key)
    this.context.globalAlpha = 1
    this.context.fillStyle = settings.backgroundcolor; this.context.fillRect(0, 0, width, height)
    if (!slide) return
    const current = this.compose(slide, settings)
    const progress = Math.max(0, Math.min(1, transition?.progress || 0))
    this.context.drawImage(current, transition?.effect === 'slide' ? -transition.direction * progress * width : 0, 0)
    if (transition) {
      const incoming = this.compose(transition.incoming, settings)
      this.context.globalAlpha = transition.effect === 'fade' ? progress : 1
      this.context.drawImage(incoming, transition.effect === 'slide' ? transition.direction * (1 - progress) * width : 0, 0)
      this.context.globalAlpha = 1
    }
  }
  release(key: string) { const item = this.compositions.get(key); if (item) { item.canvas.width = 0; item.canvas.height = 0; this.compositions.delete(key) } }
  dispose() { for (const key of this.compositions.keys()) this.release(key); this.canvas.remove(); this.canvas.width = 0; this.canvas.height = 0 }
}
