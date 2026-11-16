import type { PrepareLimits, PreparedSlide } from './resources.ts'
import type { Settings } from '../wallpaper/settings.ts'

export interface SlideRenderer {
  resize(): PrepareLimits
  draw(slide: PreparedSlide | undefined, settings: Readonly<Settings>): void
  dispose(): void
}

export class CanvasRenderer implements SlideRenderer {
  private canvas = document.createElement('canvas')
  private context: CanvasRenderingContext2D
  constructor(stage: HTMLElement) {
    const context = this.canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Canvas is unavailable')
    this.context = context; this.canvas.className = 'wallpaper-canvas'; this.canvas.setAttribute('aria-hidden', 'true')
    stage.replaceChildren(this.canvas)
  }
  resize() {
    const width = Math.max(1, window.innerWidth); const height = Math.max(1, window.innerHeight)
    const scale = Math.min(window.devicePixelRatio || 1, 8192 / Math.max(width, height), Math.sqrt(8_388_608 / (width * height)))
    // Drop the old backing store first: width-new × height-old can greatly exceed the budget.
    this.canvas.width = 0; this.canvas.height = 0
    this.canvas.width = Math.max(1, Math.floor(width * scale)); this.canvas.height = Math.max(1, Math.floor(height * scale))
    return { width: this.canvas.width, height: this.canvas.height, maxDimension: 8192 }
  }
  draw(slide: PreparedSlide | undefined, settings: Readonly<Settings>) {
    const { width, height } = this.canvas
    this.context.fillStyle = settings.backgroundcolor; this.context.fillRect(0, 0, width, height)
    if (!slide) return
    const scale = Math.max(width / slide.width, height / slide.height)
    this.context.drawImage(slide.canvas, (width - slide.width * scale) / 2, (height - slide.height * scale) / 2, slide.width * scale, slide.height * scale)
  }
  dispose() { this.canvas.remove(); this.canvas.width = 0; this.canvas.height = 0 }
}
