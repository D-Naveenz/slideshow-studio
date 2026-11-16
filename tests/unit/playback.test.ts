import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PlaybackOrder, naturalImages } from '../../src/slideshow/order.ts'
import { HoldClock } from '../../src/slideshow/clock.ts'
import type { Scheduler } from '../../src/slideshow/clock.ts'
import { imageRequestUrl, preparedSize, resourceKey, ResourceCache, RESOURCE_BUDGET, SLIDE_BUDGET } from '../../src/slideshow/resources.ts'
import type { ImagePreparer, PreparedSlide, PrepareLimits } from '../../src/slideshow/resources.ts'
import { PlaybackController } from '../../src/slideshow/controller.ts'
import type { SlideRenderer } from '../../src/slideshow/renderer.ts'
import type { ImageEntry } from '../../src/wallpaper/catalogue.ts'
import type { WallpaperSnapshot } from '../../src/wallpaper/runtime.ts'
import { defaults } from '../../src/wallpaper/settings.ts'
import type { Settings } from '../../src/wallpaper/settings.ts'
import { imageRect, viewportSize } from '../../src/slideshow/renderer.ts'

const image = (id: string, revision = 0): ImageEntry => ({ id, name: id, url: `file:///C:/${id}`, revision })
const limits: PrepareLimits = { width: 1920, height: 1080, maxDimension: 8192 }
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }

class FakeScheduler implements Scheduler {
  time = 0
  private sequence = 0
  tasks = new Map<number, { due: number; callback: () => void }>()
  now = () => this.time
  set(callback: () => void, delay: number) { const id = ++this.sequence; this.tasks.set(id, { due: this.time + delay, callback }); return id }
  clear(handle: unknown) { this.tasks.delete(handle as number) }
  advance(ms: number) {
    const end = this.time + ms
    for (let guard = 0; guard < 10000; guard++) {
      const next = [...this.tasks.entries()].filter(([, task]) => task.due <= end).sort((a, b) => a[1].due - b[1].due)[0]
      if (!next) { this.time = end; return }
      this.time = next[1].due; this.tasks.delete(next[0]); next[1].callback()
    }
    throw new Error('Timer loop did not settle')
  }
}

class Source {
  snapshot: WallpaperSnapshot
  listeners = new Set<() => void>()
  constructor(images: ImageEntry[]) { this.snapshot = { settings: { ...defaults, holdseconds: 1 }, overrides: [], images, fps: 30, paused: false, preview: true } }
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  emit(patch: Partial<WallpaperSnapshot>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach(listener => listener()) }
}

function harness(images = [image('1.jpg'), image('2.jpg'), image('3.jpg'), image('4.jpg')], settings: Partial<Settings> = {}) {
  const source = new Source(images); const scheduler = new FakeScheduler()
  source.snapshot = { ...source.snapshot, settings: { ...source.snapshot.settings, transition: 'instant', ...settings } }
  const draws: (string | undefined)[] = []; const released: string[] = []
  const frames: { at: number; progress?: number; current?: string; incoming?: string }[] = []
  const gpuReleased: string[] = []
  let size = limits; let active = 0; let maxActive = 0; let alive = 0; let maxAlive = 0
  const jobs: { entry: ImageEntry; signal: AbortSignal; resolve(): void; reject(): void }[] = []
  const renderer: SlideRenderer = { resize: () => size, draw: (slide, _settings, transition) => {
    draws.push(slide?.entry.id); frames.push({ at: scheduler.now(), progress: transition?.progress, current: slide?.entry.id, incoming: transition?.incoming.entry.id })
  }, release: key => { gpuReleased.push(key) }, dispose() {} }
  const prepare: ImagePreparer = (entry, bounds, signal) => {
    active++; maxActive = Math.max(maxActive, active)
    return new Promise<PreparedSlide>((resolve, reject) => {
      jobs.push({ entry, signal,
        resolve() {
          active--; alive++; maxAlive = Math.max(maxAlive, alive)
          let disposed = false
          resolve({ key: resourceKey(entry, bounds), entry, width: 100, height: 100, bytes: 80_000, canvas: {} as HTMLCanvasElement,
            dispose() { if (!disposed) { disposed = true; alive--; released.push(`${entry.id}:${entry.revision}`) } },
          })
        },
        reject() { active--; reject(new Error('Bad image')) },
      })
    })
  }
  const playback = new PlaybackController(source, renderer, { prepare, scheduler, frames: { request: callback => scheduler.set(callback, 16), cancel: handle => scheduler.clear(handle) }, random: () => 0.5 })
  return { source, scheduler, jobs, playback, draws, frames, released, gpuReleased, resize: () => { size = { ...limits, width: 800, height: 600 }; playback.resize() }, stats: () => ({ maxActive, maxAlive, alive }) }
}

test('natural order sorts numeric filenames; previous/next traverses actual history', () => {
  const entries = ['10.jpg', '2b.jpg', '1.jpg', '2.jpg'].map(id => image(id))
  assert.deepEqual(naturalImages(entries).map(entry => entry.name), ['1.jpg', '2.jpg', '2b.jpg', '10.jpg'])
  const order = new PlaybackOrder(); order.configure(entries, false)
  for (const id of ['1.jpg', '2.jpg', '2b.jpg']) { assert.equal(order.next(), id); order.commit(id, 1) }
  assert.equal(order.previous, '2.jpg'); order.commit('2.jpg', -1)
  assert.equal(order.next(), '2b.jpg'); order.commit('2b.jpg', 1)
  order.reject('10.jpg'); assert.equal(order.next(), '1.jpg')
})

test('shuffle completes every cycle without duplicates or immediate boundary repeats', () => {
  let seed = 17
  const order = new PlaybackOrder(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646)
  order.configure(['1', '2', '3', '4', '5'].map(id => image(id)), true)
  const visits: string[] = []
  for (let i = 0; i < 30; i++) { const id = order.next()!; visits.push(id); order.commit(id, 1) }
  for (let i = 0; i < visits.length; i += 5) assert.equal(new Set(visits.slice(i, i + 5)).size, 5)
  for (let i = 1; i < visits.length; i++) assert.notEqual(visits[i], visits[i - 1])
  const last = order.current; order.commit(order.previous!, -1); assert.equal(order.next(), last)
})

test('hold clock preserves remaining time through suspension and manual restart while paused', () => {
  const clock = new HoldClock(); clock.start(0, 1000); clock.pause(250)
  assert.equal(clock.remaining(20_000), 750)
  clock.resume(20_000); assert.equal(clock.remaining(20_500), 250)
  clock.pause(20_500); clock.start(21_000, 1000)
  clock.resume(30_000); assert.equal(clock.remaining(30_000), 1000)
})

test('large/portrait sources are bounded by screen utility, side limits, and the resource budget', () => {
  for (const [width, height] of [[7680,4320], [32000,18000], [2000,20000]]) {
    const prepared = preparedSize(width, height, { width: 7680, height: 4320, maxDimension: 4096 })
    assert.ok(prepared.width <= 4096 && prepared.height <= 4096)
    assert.ok(prepared.width * prepared.height * 8 <= SLIDE_BUDGET)
    assert.ok(prepared.width <= width && prepared.height <= height)
  }
  assert.deepEqual(preparedSize(64, 64, limits), { width: 64, height: 64 })
})

test('cache reservation drops previous first and never admits a fourth prepared resource', () => {
  const cache = new ResourceCache(); const released: string[] = []
  const slide = (key: string): PreparedSlide => ({ key, entry: image(key), width: 1, height: 1, bytes: SLIDE_BUDGET, canvas: {} as HTMLCanvasElement, dispose: () => { released.push(key) } })
  cache.add(slide('current')); cache.add(slide('previous')); cache.add(slide('next'))
  assert.ok(cache.bytes <= RESOURCE_BUDGET)
  assert.throws(() => cache.add(slide('fourth')), /budget/)
  cache.reserve(['current', 'incoming', 'next', 'previous'])
  assert.deepEqual(released, ['previous'])
  cache.add(slide('incoming')); assert.equal(cache.size, 3)
  cache.dispose(); assert.equal(cache.size, 0)
})

test('modified native files use fresh request URLs without changing blob or bundled URLs', () => {
  const first = imageRequestUrl(image('a%20%231.jpg', 1)); const next = imageRequestUrl(image('a%20%231.jpg', 2))
  assert.notEqual(first, next)
  assert.ok(next.includes('a%20%231.jpg?slideshow_revision=2'))
  assert.equal(imageRequestUrl({ ...image('one'), url: 'blob:null/one', revision: 7 }), 'blob:null/one')
  assert.equal(imageRequestUrl({ ...image('one'), url: './wallpapers/1.jpg', revision: 0 }), './wallpapers/1.jpg')
})

test('playback serializes preparation and retains current while the next image is slow', async () => {
  const h = harness()
  h.jobs[0].resolve(); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, '1.jpg')
  assert.equal(h.jobs.length, 2)
  h.scheduler.advance(1000); h.playback.next(); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, '1.jpg')
  assert.equal(h.jobs.length, 2)
  h.jobs[1].resolve(); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, '2.jpg')
  h.jobs[2].resolve(); await flush()
  h.playback.next(); await flush(); h.jobs[3].resolve(); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, '3.jpg')
  h.playback.previous(); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, '2.jpg')
  assert.equal(h.stats().maxActive, 1); assert.ok(h.stats().maxAlive <= 3)
  h.playback.dispose()
})

test('host/user pause overlap preserves the remaining hold and manual navigation restarts it', async () => {
  const h = harness()
  h.jobs[0].resolve(); await flush(); h.jobs[1].resolve(); await flush()
  h.scheduler.advance(250); h.source.emit({ paused: true }); h.playback.togglePause()
  h.scheduler.advance(50_000); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, '1.jpg')
  h.source.emit({ paused: false }); assert.equal(h.playback.getSnapshot().paused, true)
  h.playback.togglePause(); h.scheduler.advance(749); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, '1.jpg')
  h.scheduler.advance(1); await flush(); assert.equal(h.playback.getSnapshot().current?.id, '2.jpg')
  h.jobs[2].resolve(); await flush()
  h.playback.previous(); await flush()
  h.scheduler.advance(999); await flush(); assert.equal(h.playback.getSnapshot().current?.id, '1.jpg')
  h.scheduler.advance(1); await flush(); assert.equal(h.playback.getSnapshot().current?.id, '2.jpg')
  h.playback.dispose()
})

test('source replacement discards late results and waits for an uncooperative old loader to settle', async () => {
  const h = harness([image('old.jpg')])
  h.source.emit({ images: [image('new.jpg')] })
  assert.equal(h.jobs[0].signal.aborted, true); assert.equal(h.jobs.length, 1)
  h.jobs[0].resolve(); await flush()
  assert.ok(h.released.includes('old.jpg:0')); assert.equal(h.jobs.length, 2)
  assert.ok(!h.draws.includes('old.jpg'))
  h.jobs[1].resolve(); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, 'new.jpg')
  assert.equal(h.stats().maxActive, 1)
  h.playback.dispose()
})

test('pausing during a slow automatic advance retains the current image until resume', async () => {
  const h = harness()
  h.jobs[0].resolve(); await flush()
  h.scheduler.advance(1000)
  h.source.emit({ paused: true })
  h.jobs[1].resolve(); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, '1.jpg')
  h.scheduler.advance(10_000); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, '1.jpg')
  h.source.emit({ paused: false }); h.scheduler.advance(0); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, '2.jpg')
  h.playback.dispose()
})

test('decode failures are skipped finitely and revised files become eligible again', async () => {
  const h = harness([image('1-bad.jpg'), image('2-good.jpg')])
  h.jobs[0].reject(); await flush(); h.jobs[1].resolve(); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, '2-good.jpg')
  assert.equal(h.playback.getSnapshot().failed, 1); assert.equal(h.scheduler.tasks.size, 0)
  h.scheduler.advance(60_000); await flush(); assert.equal(h.jobs.length, 2)
  h.source.emit({ images: [image('1-bad.jpg', 1), image('2-good.jpg')] }); await flush()
  assert.equal(h.jobs[2].entry.revision, 1)
  h.jobs[2].resolve(); await flush(); assert.equal(h.playback.getSnapshot().failed, 0)
  h.playback.dispose()
})

test('all failures, empty sources, and one-image sources stop without retry/timer loops', async () => {
  const h = harness([image('bad.jpg')])
  h.jobs[0].reject(); await flush(); assert.equal(h.playback.getSnapshot().phase, 'error')
  h.scheduler.advance(60_000); await flush(); assert.equal(h.jobs.length, 1)
  h.source.emit({ images: [] }); assert.equal(h.playback.getSnapshot().phase, 'empty')
  h.source.emit({ images: [image('good.jpg')] }); await flush(); h.jobs[1].resolve(); await flush()
  assert.equal(h.playback.getSnapshot().phase, 'ready'); assert.equal(h.scheduler.tasks.size, 0)
  h.playback.dispose()
})

test('resize retains the displayed image until replacement is ready and disposal releases late work', async () => {
  const h = harness([image('one.jpg')])
  h.jobs[0].resolve(); await flush(); h.resize(); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, 'one.jpg')
  assert.equal(h.jobs.length, 2)
  h.playback.dispose(); h.jobs[1].resolve(); await flush()
  assert.equal(h.stats().alive, 0); assert.equal(h.scheduler.tasks.size, 0); assert.equal(h.source.listeners.size, 0)
})

test('Fit contains the foreground, Fill covers, and display dimensions stay bounded', () => {
  assert.deepEqual(imageRect(200, 400, 800, 400, 'fit'), { x: 300, y: 0, width: 200, height: 400 })
  assert.deepEqual(imageRect(200, 400, 800, 400, 'fill'), { x: 0, y: -600, width: 800, height: 1600 })
  const viewport = viewportSize(16000, 9000, 2, 4096)
  assert.ok(viewport.width <= 4096 && viewport.height <= 4096)
  assert.ok(viewport.width * viewport.height <= 8_388_608)
})

test('fade waits for readiness, honors duration, and starts the full hold after completion', async () => {
  const h = harness(undefined, { transition: 'fade', transitionseconds: 1 })
  h.jobs[0].resolve(); await flush()
  h.playback.next(); assert.equal(h.playback.getSnapshot().transitioning, false)
  h.jobs[1].resolve(); await flush()
  assert.equal(h.playback.getSnapshot().transitioning, true)
  assert.equal(h.playback.getSnapshot().current?.id, '1.jpg')
  h.scheduler.advance(500)
  const middle = h.frames.at(-1)!
  assert.ok(middle.progress! > 0.4 && middle.progress! < 0.6)
  assert.equal(middle.incoming, '2.jpg')
  h.scheduler.advance(600); await flush()
  assert.equal(h.playback.getSnapshot().transitioning, false)
  assert.equal(h.playback.getSnapshot().current?.id, '2.jpg')
  const holdStart = h.frames.findLast(frame => frame.current === '2.jpg' && frame.progress === undefined)!.at
  h.jobs[2].resolve(); await flush()
  h.scheduler.advance(holdStart + 999 - h.scheduler.now())
  assert.equal(h.playback.getSnapshot().transitioning, false)
  h.scheduler.advance(1); await flush()
  assert.equal(h.playback.getSnapshot().transitioning, true)
  assert.ok(h.stats().maxAlive <= 3)
  h.playback.dispose()
})

test('pausing an active slide transition freezes frames and resumes its remaining duration', async () => {
  const h = harness(undefined, { transition: 'slide', transitionseconds: 1 })
  h.jobs[0].resolve(); await flush(); h.jobs[1].resolve(); await flush()
  h.playback.next(); h.scheduler.advance(400)
  h.source.emit({ paused: true })
  const count = h.frames.length; const progress = h.frames.at(-1)!.progress
  h.scheduler.advance(5000)
  assert.equal(h.frames.length, count); assert.equal(h.playback.getSnapshot().current?.id, '1.jpg')
  h.source.emit({ paused: false }); h.scheduler.advance(300)
  assert.ok(h.frames.at(-1)!.progress! > progress!)
  assert.equal(h.playback.getSnapshot().transitioning, true)
  h.scheduler.advance(400); await flush()
  assert.equal(h.playback.getSnapshot().current?.id, '2.jpg')
  assert.equal(h.playback.getSnapshot().transitioning, false)
  h.playback.dispose()
})

test('animation frames respect host FPS and stop while idle', async () => {
  const h = harness(undefined, { transition: 'fade', transitionseconds: 1 })
  h.source.emit({ fps: 10 })
  h.jobs[0].resolve(); await flush(); h.jobs[1].resolve(); await flush()
  h.playback.next(); const count = h.frames.length
  h.scheduler.advance(1050); await flush()
  assert.equal(h.playback.getSnapshot().transitioning, false)
  assert.ok(h.frames.length - count <= 11)
  const ended = h.frames.length
  h.scheduler.advance(500)
  assert.equal(h.frames.length, ended)
  assert.ok(h.gpuReleased.length <= h.released.length)
  h.playback.dispose()
})

test('source changes cancel active transitions and release their GPU resources before pixels', async () => {
  const h = harness(undefined, { transition: 'fade' })
  h.jobs[0].resolve(); await flush(); h.jobs[1].resolve(); await flush()
  h.playback.next(); h.scheduler.advance(100)
  h.source.emit({ images: [] })
  const count = h.frames.length
  assert.equal(h.playback.getSnapshot().transitioning, false)
  assert.equal(h.playback.getSnapshot().phase, 'empty')
  h.scheduler.advance(5000); await flush()
  assert.equal(h.frames.length, count)
  assert.equal(h.gpuReleased.length, h.released.length)
  assert.equal(h.stats().alive, 0)
  h.playback.dispose()
})

test('non-divisor FPS limits carry fractional frame intervals without catch-up bursts', async () => {
  const h = harness(undefined, { transition: 'fade', transitionseconds: 1 })
  h.source.emit({ fps: 24 })
  h.jobs[0].resolve(); await flush(); h.jobs[1].resolve(); await flush()
  h.playback.next(); const start = h.frames.length
  h.scheduler.advance(1050); await flush()
  const rendered = h.frames.length - start
  assert.ok(rendered >= 23 && rendered <= 25)
  assert.equal(h.playback.getSnapshot().transitioning, false)
  h.playback.dispose()
})
