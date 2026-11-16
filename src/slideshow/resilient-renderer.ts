import { CanvasRenderer, viewportSize } from './renderer.ts'
import type { RenderBackend, SlideRenderer, TransitionFrame } from './renderer.ts'
import { PixiRenderer } from './pixi-renderer.ts'
import type { PreparedSlide, PrepareLimits } from './resources.ts'
import type { Settings } from '../wallpaper/settings.ts'

class ResilientRenderer implements SlideRenderer {
  private stage: HTMLElement
  private backend: RenderBackend
  private lost?: PixiRenderer
  private gpu?: PixiRenderer
  private listeners = new Set<() => void>()
  private limits!: PrepareLimits
  private last?: { slide?: PreparedSlide; settings: Readonly<Settings>; transition?: TransitionFrame }
  private disposed = false
  constructor(stage: HTMLElement, backend: RenderBackend) {
    this.stage = stage; this.backend = backend
    if (backend instanceof PixiRenderer) {
      this.gpu = backend
      backend.canvas.addEventListener('webglcontextlost', this.contextLost)
      backend.canvas.addEventListener('webglcontextrestored', this.contextRestored)
    }
    this.mount(); this.resize()
  }
  get name() { return this.backend.name }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private mount() {
    this.stage.replaceChildren(this.backend.canvas)
    this.stage.dataset.renderer = this.backend.name
    this.listeners.forEach(listener => listener())
  }
  private fallback(restore: boolean) {
    if (this.backend instanceof CanvasRenderer) return
    if (restore) this.lost = this.backend as PixiRenderer
    else { this.removeContextListeners(); this.backend.dispose(); this.gpu = undefined }
    this.backend = new CanvasRenderer(); this.backend.resize(this.limits); this.mount()
    if (this.last) this.backend.draw(this.last.slide, this.last.settings, this.last.transition)
  }
  private contextLost = (event: Event) => { event.preventDefault(); if (!this.disposed) this.fallback(true) }
  private contextRestored = () => {
    if (this.disposed || !this.lost) return
    const gpu = this.lost; this.lost = undefined
    this.backend.dispose(); this.backend = gpu; gpu.invalidateCompositions(); gpu.resize(this.limits); this.mount()
    if (this.last) this.draw(this.last.slide, this.last.settings, this.last.transition)
  }
  private removeContextListeners() {
    this.gpu?.canvas.removeEventListener('webglcontextlost', this.contextLost)
    this.gpu?.canvas.removeEventListener('webglcontextrestored', this.contextRestored)
  }
  resize() {
    this.limits = viewportSize(window.innerWidth, window.innerHeight, window.devicePixelRatio, this.gpu?.maxDimension || 8192)
    this.backend.resize(this.limits)
    return this.limits
  }
  draw(slide: PreparedSlide | undefined, settings: Readonly<Settings>, transition?: TransitionFrame) {
    if (this.disposed) return
    this.last = { slide, settings, transition }
    try { this.backend.draw(slide, settings, transition) }
    catch (error) { if (this.backend instanceof CanvasRenderer) throw error; this.fallback(false) }
  }
  release(key: string) { this.backend.release(key); this.lost?.release(key) }
  warm(slide: PreparedSlide) {
    if (!this.backend.warm) return
    try {
      this.backend.warm(slide)
      // Present the retained composition after offscreen GPU work; no continuous ticker is needed.
      if (this.last) this.backend.draw(this.last.slide, this.last.settings, this.last.transition)
    } catch { this.fallback(false) }
  }
  dispose() {
    this.disposed = true; this.last = undefined; this.removeContextListeners(); this.listeners.clear()
    this.backend.dispose(); this.lost?.dispose(); this.stage.replaceChildren()
  }
}

export async function createWallpaperRenderer(stage: HTMLElement, forceCanvas = false): Promise<SlideRenderer> {
  if (!forceCanvas) {
    const gpu = new PixiRenderer()
    try { await gpu.init(); return new ResilientRenderer(stage, gpu) }
    catch { gpu.dispose() }
  }
  return new ResilientRenderer(stage, new CanvasRenderer())
}
