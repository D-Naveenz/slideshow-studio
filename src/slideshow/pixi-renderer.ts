import { BlurFilter, CanvasSource, Container, EventsTicker, Rectangle, RenderTexture, Sprite, Texture, TexturePool, WebGLRenderer } from 'pixi.js'
import { compositionSignature, imageRect } from './renderer.ts'
import type { RenderBackend, TransitionFrame } from './renderer.ts'
import type { PrepareLimits, PreparedSlide } from './resources.ts'
import type { Settings } from '../wallpaper/settings.ts'

/** Pixi owns GPU operations; the slideshow cache owns the lifetime of source pixels. */
export class PixiRenderer implements RenderBackend {
  readonly name = 'PixiJS WebGL'
  readonly canvas = document.createElement('canvas')
  readonly renderer = new WebGLRenderer<HTMLCanvasElement>()
  maxDimension = 8192
  private scene = new Container()
  private sources = new Map<string, Texture>()
  private compositions = new Map<string, { signature: string; texture: RenderTexture; sprite: Sprite }>()
  private width = 1
  private height = 1

  async init() {
    this.canvas.className = 'wallpaper-canvas'; this.canvas.setAttribute('aria-hidden', 'true')
    await this.renderer.init({ canvas: this.canvas, width: 1, height: 1, resolution: 1, antialias: false, backgroundAlpha: 1, powerPreference: 'low-power', hello: false, gcActive: false })
    // We explicitly destroy cached resources; Pixi's maintenance ticker must not run while idle.
    this.renderer.scheduler.destroy()
    // React owns pointer/keyboard UI; Pixi's synthetic interaction ticker is unnecessary.
    EventsTicker.removeTickerListener()
    this.maxDimension = Math.min(8192, this.renderer.gl.getParameter(this.renderer.gl.MAX_TEXTURE_SIZE))
  }
  resize(limits: PrepareLimits) {
    if (this.width === limits.width && this.height === limits.height) return
    this.invalidateCompositions()
    this.width = limits.width; this.height = limits.height
    // Avoid allocating width-new × height-old when changing aspect ratios.
    this.canvas.width = 0; this.canvas.height = 0
    this.renderer.resize(this.width, this.height, 1)
  }
  invalidateCompositions() {
    this.scene.removeChildren()
    for (const key of this.compositions.keys()) this.releaseComposition(key)
    TexturePool.clear(true)
  }
  private source(slide: PreparedSlide) {
    let texture = this.sources.get(slide.key)
    if (!texture) {
      texture = new Texture({ source: new CanvasSource({ resource: slide.canvas, resolution: 1, autoGenerateMipmaps: false, scaleMode: 'linear' }) })
      this.sources.set(slide.key, texture)
    }
    return texture
  }
  warm(slide: PreparedSlide) { this.renderer.texture.initSource(this.source(slide).source) }
  private compose(slide: PreparedSlide, settings: Readonly<Settings>) {
    const signature = compositionSignature(settings, this.width, this.height)
    const cached = this.compositions.get(slide.key)
    if (cached?.signature === signature) return cached.sprite
    this.releaseComposition(slide.key)
    const texture = this.source(slide)
    const container = new Container()
    let blur: BlurFilter | undefined
    const target = RenderTexture.create({ width: this.width, height: this.height, resolution: 1, antialias: false, autoGenerateMipmaps: false })
    try {
      if (settings.fit === 'fit' && settings.background === 'blur') {
        const background = new Sprite(texture)
        const radius = settings.blur * this.width / Math.max(1, window.innerWidth)
        const rect = imageRect(slide.width, slide.height, this.width + radius * 6, this.height + radius * 6, 'fill')
        background.position.set(rect.x - radius * 3, rect.y - radius * 3); background.width = rect.width; background.height = rect.height
        const group = new Container(); group.addChild(background)
        group.filterArea = new Rectangle(0, 0, this.width, this.height)
        blur = new BlurFilter({ strength: radius, quality: 4, resolution: Math.min(1, 512 / Math.max(this.width, this.height)) })
        blur.repeatEdgePixels = true; blur.padding = 0; group.filters = [blur]
        container.addChild(group)
      }
      const foreground = new Sprite(texture)
      const rect = imageRect(slide.width, slide.height, this.width, this.height, settings.fit)
      foreground.position.set(rect.x, rect.y); foreground.width = rect.width; foreground.height = rect.height
      container.addChild(foreground)
      this.renderer.render({ container, target, clear: true, clearColor: settings.backgroundcolor })
      const sprite = new Sprite(target)
      this.compositions.set(slide.key, { signature, texture: target, sprite })
      return sprite
    } catch (error) { target.destroy(true); throw error }
    finally { container.destroy({ children: true }); blur?.destroy() }
  }
  draw(slide: PreparedSlide | undefined, settings: Readonly<Settings>, transition?: TransitionFrame) {
    const keys = new Set([slide?.key, transition?.incoming.key])
    this.scene.removeChildren()
    for (const key of this.compositions.keys()) if (!keys.has(key)) this.releaseComposition(key)
    if (slide) {
      const current = this.compose(slide, settings)
      const progress = Math.max(0, Math.min(1, transition?.progress || 0))
      current.alpha = 1; current.x = transition?.effect === 'slide' ? -transition.direction * progress * this.width : 0
      this.scene.addChild(current)
      if (transition) {
        const incoming = this.compose(transition.incoming, settings)
        incoming.alpha = transition.effect === 'fade' ? progress : 1
        incoming.x = transition.effect === 'slide' ? transition.direction * (1 - progress) * this.width : 0
        this.scene.addChild(incoming)
      }
    }
    this.renderer.render({ container: this.scene, clear: true, clearColor: settings.backgroundcolor })
  }
  private releaseComposition(key: string) {
    const item = this.compositions.get(key)
    if (item) { item.sprite.removeFromParent(); item.sprite.destroy(); item.texture.destroy(true); this.compositions.delete(key) }
  }
  release(key: string) { this.releaseComposition(key); this.sources.get(key)?.destroy(true); this.sources.delete(key) }
  dispose() {
    this.renderer.scheduler?.destroy(); EventsTicker.removeTickerListener()
    for (const key of this.sources.keys()) this.release(key)
    this.scene.destroy({ children: true })
    TexturePool.clear(true)
    try { this.renderer.destroy({ removeView: true }) } catch { /* Partial initialization may not have all systems. */ }
    this.canvas.remove(); this.canvas.width = 0; this.canvas.height = 0
  }
}
