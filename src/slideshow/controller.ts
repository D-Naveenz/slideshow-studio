import type { ImageEntry } from '../wallpaper/catalogue.ts'
import type { WallpaperRuntime, WallpaperSnapshot } from '../wallpaper/runtime.ts'
import { HoldClock, browserScheduler, browserFrames } from './clock.ts'
import type { FrameScheduler, Scheduler } from './clock.ts'
import { PlaybackOrder } from './order.ts'
import { prepareImage, ResourceCache, resourceKey } from './resources.ts'
import type { ImagePreparer, PreparedSlide, PrepareLimits } from './resources.ts'
import type { SlideRenderer, TransitionFrame } from './renderer.ts'

export interface PlaybackSnapshot {
  readonly phase: 'loading' | 'ready' | 'empty' | 'error'
  readonly current?: ImageEntry
  readonly paused: boolean
  readonly userPaused: boolean
  readonly preparing: boolean
  readonly navigating: boolean
  readonly canNext: boolean
  readonly canPrevious: boolean
  readonly cached: number
  readonly estimatedBytes: number
  readonly failed: number
  readonly renderer: string
  readonly transitioning: boolean
  readonly incoming?: ImageEntry
}
type Inputs = Pick<WallpaperRuntime, 'getSnapshot' | 'subscribe'>
type Intent = { direction: -1 | 0 | 1; target?: string; restart: boolean; automatic?: boolean }
const identity = (entry: ImageEntry) => JSON.stringify([entry.id, entry.revision])

/** A single async worker owns image preparation; source changes cancel without overlapping work. */
export class PlaybackController {
  private input: WallpaperSnapshot
  private snapshot!: PlaybackSnapshot
  private entries = new Map<string, ImageEntry>()
  private failed = new Set<string>()
  private order: PlaybackOrder
  private cache = new ResourceCache(key => this.renderer.release?.(key))
  private clock = new HoldClock()
  private transitionClock = new HoldClock()
  private transition?: TransitionFrame & { duration: number; navigation: Intent }
  private frames: FrameScheduler
  private frame?: unknown
  private lastFrameAt = 0
  private renderer: SlideRenderer
  private limits: PrepareLimits
  private prepare: ImagePreparer
  private scheduler: Scheduler
  private listeners = new Set<() => void>()
  private unsubscribe: () => void
  private unsubscribeRenderer?: () => void
  private current?: PreparedSlide
  private intent?: Intent
  private worker = false
  private loading = false
  private loadingKey?: string
  private abort?: AbortController
  private generation = 0
  private signature = ''
  private timer?: unknown
  private userPaused = false
  private suspended = false
  private paused = false
  private disposed = false

  constructor(source: Inputs, renderer: SlideRenderer, options: { prepare?: ImagePreparer; scheduler?: Scheduler; frames?: FrameScheduler; random?: () => number } = {}) {
    this.renderer = renderer; this.limits = renderer.resize()
    this.prepare = options.prepare || prepareImage; this.scheduler = options.scheduler || browserScheduler
    this.frames = options.frames || browserFrames
    this.order = new PlaybackOrder(options.random); this.input = source.getSnapshot()
    this.unsubscribeRenderer = renderer.subscribe?.(() => this.publish())
    this.unsubscribe = source.subscribe(() => this.update(source.getSnapshot()))
    this.update(this.input)
  }
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish() {
    if (this.disposed) return
    this.snapshot = Object.freeze({
      phase: this.current ? 'ready' : !this.input.images.length ? 'empty' : !this.order.count ? 'error' : 'loading',
      current: this.current?.entry, paused: this.paused, userPaused: this.userPaused,
      preparing: this.loading, navigating: !!this.intent,
      canNext: !!this.current && this.order.count > 1, canPrevious: !!this.current && !!this.order.previous,
      cached: this.cache.size, estimatedBytes: this.cache.bytes, failed: this.failed.size,
      renderer: this.renderer.name || 'Custom renderer',
      transitioning: !!this.transition, incoming: this.transition?.incoming.entry,
    })
    this.listeners.forEach(listener => listener())
  }
  private invalidate() { this.generation++; this.abort?.abort() }
  private usable(id?: string) {
    const entry = id ? this.entries.get(id) : undefined
    return entry && !this.failed.has(identity(entry)) ? entry : undefined
  }
  private priorities(target?: string) {
    const keys = [this.current?.key, this.transition?.incoming.key, target]
    for (const id of [this.order.next(), this.order.previous]) {
      const entry = this.usable(id); if (entry) keys.push(resourceKey(entry, this.limits))
    }
    return keys.filter((key): key is string => !!key)
  }
  private clearTimer() { if (this.timer !== undefined) this.scheduler.clear(this.timer); this.timer = undefined }
  private arm() {
    this.clearTimer()
    if (!this.disposed && this.current && !this.paused && !this.intent && !this.transition && this.order.count > 1) {
      this.timer = this.scheduler.set(() => { this.timer = undefined; this.navigate(1, true) }, this.clock.remaining(this.scheduler.now()))
    }
  }
  private pauseChanged() {
    const paused = this.input.paused || this.userPaused || this.suspended
    if (paused === this.paused) return
    this.paused = paused
    if (paused) {
      this.clock.pause(this.scheduler.now()); this.clearTimer()
      this.transitionClock.pause(this.scheduler.now()); this.cancelFrame()
      if (this.intent?.automatic && !this.transition) this.intent = undefined
    }
    else {
      this.clock.resume(this.scheduler.now()); this.transitionClock.resume(this.scheduler.now())
      this.lastFrameAt = this.scheduler.now(); this.requestFrame(); this.arm()
    }
  }
  private update(next: WallpaperSnapshot) {
    if (this.disposed) return
    const prior = this.input; this.input = next
    const signature = JSON.stringify([next.settings.source, next.images.map(entry => [entry.id, entry.revision])])
    const changed = signature !== this.signature
    if (changed || prior.settings.shuffle !== next.settings.shuffle) {
      this.invalidate(); this.clearTimer(); this.cancelTransition()
      if (prior.settings.source !== next.settings.source) this.failed.clear()
      this.entries = new Map(next.images.map(entry => [entry.id, entry]))
      const identities = new Set(next.images.map(identity))
      this.failed = new Set([...this.failed].filter(key => identities.has(key)))
      const priorId = this.current?.entry.id
      const keep = this.current && this.entries.get(priorId!) && identity(this.entries.get(priorId!)!) === identity(this.current.entry)
      if (!keep) { this.current = undefined; this.renderer.draw(undefined, next.settings) }
      this.order.configure(next.images.filter(entry => !this.failed.has(identity(entry))), next.settings.shuffle, this.current?.entry.id)
      this.intent = this.current ? undefined : { direction: 1, target: this.usable(priorId)?.id, restart: true }
      this.cache.reserve(this.current ? [this.current.key] : [])
      this.signature = signature
    }
    this.pauseChanged()
    if (this.current) {
      if (prior.settings.holdseconds !== next.settings.holdseconds) this.clock.start(this.scheduler.now(), next.settings.holdseconds * 1000)
      this.renderer.draw(this.current, next.settings, this.transition)
    }
    this.arm(); this.publish(); void this.pump()
  }
  private async pump() {
    if (this.worker || this.disposed || this.transition) return
    this.worker = true
    try {
      while (!this.disposed) {
        if (!this.current && !this.intent && this.order.count) this.intent = { direction: 1, restart: true }
        let entry: ImageEntry | undefined
        const navigation = this.intent
        if (navigation) {
          entry = this.usable(navigation.target || (navigation.direction < 0 ? this.order.previous : this.order.next()))
          if (!entry) {
            this.intent = undefined
            if (!this.current && this.order.count) continue
            break
          }
        } else {
          entry = [this.order.next(), this.order.previous].map(id => this.usable(id)).find(image => image && !this.cache.get(resourceKey(image, this.limits)))
          if (!entry) break
        }
        const key = resourceKey(entry, this.limits)
        this.cache.reserve(this.priorities(key))
        let slide = this.cache.get(key)
        if (!slide) {
          const token = this.generation
          this.abort = new AbortController(); this.loading = true; this.loadingKey = key; this.publish()
          try {
            slide = await this.prepare(entry, this.limits, this.abort.signal)
            if (this.disposed || token !== this.generation) { slide.dispose(); continue }
            this.cache.add(slide)
          } catch {
            slide?.dispose()
            if (this.disposed || token !== this.generation) continue
            this.failed.add(identity(entry)); this.order.reject(entry.id)
            if (this.intent?.target === entry.id) this.intent = { direction: 1, restart: true }
            continue
          } finally { this.loading = false; this.loadingKey = undefined }
        }
        this.renderer.warm?.(slide)
        // An intent may have arrived while prefetch was in progress. Re-evaluate at the loop head.
        if (navigation && navigation === this.intent) {
          if (this.current && this.current.key !== slide.key && navigation.direction !== 0 && !this.paused && this.input.settings.transition !== 'instant') {
            this.transition = { incoming: slide, progress: 0, direction: navigation.direction, effect: this.input.settings.transition, duration: this.input.settings.transitionseconds * 1000, navigation }
            this.renderer.draw(this.current, this.input.settings, this.transition)
            this.transitionClock.start(this.scheduler.now(), this.transition.duration)
            this.lastFrameAt = this.scheduler.now()
            this.publish(); this.requestFrame()
            break
          }
          this.commit(slide, navigation)
        }
        this.cache.reserve(this.priorities()); this.publish()
      }
    } finally {
      this.worker = false
      if (!this.disposed) { this.arm(); this.publish() }
    }
  }
  private commit(slide: PreparedSlide, navigation: Intent) {
    this.order.commit(slide.entry.id, navigation.direction)
    this.current = slide; this.intent = undefined
    this.renderer.draw(slide, this.input.settings)
    if (navigation.restart) this.clock.start(this.scheduler.now(), this.input.settings.holdseconds * 1000)
    this.arm()
  }
  private cancelFrame() { if (this.frame !== undefined) this.frames.cancel(this.frame); this.frame = undefined }
  private cancelTransition() { this.cancelFrame(); this.transition = undefined }
  private requestFrame() {
    if (this.transition && !this.paused && !this.disposed && this.frame === undefined) this.frame = this.frames.request(this.animate)
  }
  private animate = () => {
    this.frame = undefined
    const transition = this.transition
    if (!transition || this.paused || this.disposed) return
    const now = this.scheduler.now()
    const interval = this.input.fps > 0 ? 1000 / this.input.fps : 0
    if (now - this.lastFrameAt + 0.01 >= interval) {
      // Preserve the fractional interval for limits such as 24 FPS on a 60 Hz display.
      this.lastFrameAt = interval > 0 ? this.lastFrameAt + Math.max(1, Math.floor((now - this.lastFrameAt + 0.01) / interval)) * interval : now
      const progress = Math.max(0, Math.min(1, 1 - this.transitionClock.remaining(now) / transition.duration))
      transition.progress = progress * progress * (3 - 2 * progress)
      if (progress >= 1) { this.finishTransition(); return }
      this.renderer.draw(this.current, this.input.settings, transition)
    }
    this.requestFrame()
  }
  private finishTransition(work = true) {
    const transition = this.transition
    if (!transition) return
    this.cancelTransition(); this.commit(transition.incoming, transition.navigation)
    this.cache.reserve(this.priorities()); this.publish()
    if (work) void this.pump()
  }
  private navigate(direction: -1 | 1, automatic = false) {
    if (this.disposed || !this.current || this.intent || (direction < 0 ? !this.order.previous : this.order.count < 2)) return
    this.intent = { direction, restart: true, automatic }; this.clearTimer()
    const target = this.usable(direction < 0 ? this.order.previous : this.order.next())
    if (this.loadingKey && target && this.loadingKey !== resourceKey(target, this.limits)) this.invalidate()
    this.publish(); void this.pump()
  }
  next = () => this.navigate(1)
  previous = () => this.navigate(-1)
  togglePause = () => { this.userPaused = !this.userPaused; this.pauseChanged(); this.publish() }
  suspend(paused: boolean) { this.suspended = paused; this.pauseChanged(); this.publish() }
  resize() {
    if (this.disposed) return
    this.finishTransition(false)
    const limits = this.renderer.resize()
    this.renderer.draw(this.current, this.input.settings)
    if (JSON.stringify(limits) === JSON.stringify(this.limits)) return
    this.limits = limits; this.invalidate(); this.clearTimer()
    this.cache.reserve(this.current ? [this.current.key] : [])
    if (this.current) this.intent = { direction: 0, target: this.current.entry.id, restart: false }
    this.publish(); void this.pump()
  }
  dispose() {
    this.disposed = true; this.unsubscribe(); this.unsubscribeRenderer?.(); this.clearTimer(); this.invalidate(); this.cancelTransition()
    this.listeners.clear(); this.cache.dispose(); this.renderer.dispose()
  }
}
