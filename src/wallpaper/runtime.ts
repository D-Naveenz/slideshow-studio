import type { WallpaperBridge, WallpaperEvent } from './bridge.d.ts'
import { ImageCatalogue } from './catalogue.ts'
import type { ImageEntry, ImportKind, ObjectUrls } from './catalogue.ts'
import { defaults, settingsPatch } from './settings.ts'
import type { Settings } from './settings.ts'

export interface WallpaperSnapshot {
  readonly settings: Readonly<Settings>
  readonly images: readonly ImageEntry[]
  readonly fps: number
  readonly paused: boolean
  readonly preview: boolean
}

/** Host and preview inputs share a store; decoding and playback are deliberately separate. */
export class WallpaperRuntime {
  private catalogue: ImageCatalogue
  private snapshot: WallpaperSnapshot
  private listeners = new Set<() => void>()
  private disconnect?: () => void
  private disposed = false
  constructor(preview: boolean, urls: ObjectUrls = URL) {
    this.catalogue = new ImageCatalogue(urls)
    this.snapshot = Object.freeze({ settings: defaults, images: this.catalogue.images('samples'), fps: 30, paused: false, preview })
  }
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  connect(bridge: WallpaperBridge) {
    if (this.disposed || this.disconnect) throw new Error('Runtime is already connected or disposed')
    this.disconnect = bridge.connect(this.receive)
  }
  private publish(next: Partial<WallpaperSnapshot> = {}) {
    this.snapshot = Object.freeze({ ...this.snapshot, ...next, images: Object.freeze([...this.catalogue.images((next.settings || this.snapshot.settings).source)]) })
    this.listeners.forEach(listener => listener())
  }
  receive = (event: WallpaperEvent) => {
    if (this.disposed) return
    if (event.type === 'user-properties') {
      const patch = settingsPatch(event.properties)
      if (!Object.keys(patch).length) return
      if (patch.imagefile !== undefined) this.catalogue.setSingle(patch.imagefile)
      if (patch.imagedirectory !== undefined) this.catalogue.setDirectory(patch.imagedirectory)
      this.publish({ settings: Object.freeze({ ...this.snapshot.settings, ...patch }) })
    } else if (event.type === 'general-properties') {
      const fps: unknown = event.properties?.fps
      // Zero means uncapped; missing/invalid FPS updates preserve the last valid value.
      if (typeof fps === 'number' && Number.isFinite(fps) && fps >= 0) this.publish({ fps })
    } else if (event.type === 'paused') {
      if (typeof event.paused === 'boolean') this.publish({ paused: event.paused })
    } else if (event.property === 'imagedirectory' && Array.isArray(event.files)) {
      if (event.type === 'directory-changed') this.catalogue.changeFiles(event.files)
      else this.catalogue.removeFiles(event.files)
      this.publish()
    }
  }
  importFiles(kind: ImportKind, files: readonly File[]) {
    if (!this.snapshot.preview || this.disposed) return
    this.catalogue.importFiles(kind, files)
    this.publish({ settings: Object.freeze({ ...this.snapshot.settings, source: kind }) })
  }
  dispose() {
    this.disposed = true; this.disconnect?.(); this.listeners.clear(); this.catalogue.dispose()
  }
}
