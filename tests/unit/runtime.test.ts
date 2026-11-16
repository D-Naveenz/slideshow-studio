import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createContext, Script } from 'node:vm'
import { test } from 'node:test'
import { WallpaperRuntime } from '../../src/wallpaper/runtime.ts'

function bridge() {
  const window = {} as Pick<Window, 'wallpaperBridge' | 'wallpaperPropertyListener'>
  new Script(readFileSync(new URL('../../public/wallpaper-bridge.js', import.meta.url), 'utf8')).runInContext(createContext({ window }))
  return window
}

test('early properties, directory callbacks, FPS, and pause events reach the store before UI subscription', () => {
  const host = bridge(); const listener = host.wallpaperPropertyListener
  listener.applyUserProperties({ source: { value: 'directory' }, shuffle: { value: true } })
  listener.userDirectoryFilesAddedOrChanged('imagedirectory', ['C:/Images/early.jpg'])
  listener.applyUserProperties({ imagedirectory: { value: 'C:/Images' }, holdseconds: { value: 45 } })
  listener.applyGeneralProperties({ fps: 24 }); listener.setPaused(true)
  const runtime = new WallpaperRuntime(false)
  runtime.connect(host.wallpaperBridge)
  const snapshot = runtime.getSnapshot()
  assert.equal(snapshot.images.length, 1); assert.equal(snapshot.images[0].name, 'early.jpg')
  assert.equal(snapshot.settings.shuffle, true); assert.equal(snapshot.settings.holdseconds, 45)
  assert.equal(snapshot.fps, 24); assert.equal(snapshot.paused, true)
  assert.equal(runtime.getSnapshot(), snapshot)
  runtime.dispose()
})

test('partial properties keep prior values, reject malformed updates, and allow clearing a selected image', () => {
  const runtime = new WallpaperRuntime(false)
  runtime.receive({ type: 'user-properties', properties: { imagefile: { value: 'C:/Images/a #1.jpg' }, source: { value: 'image' }, shuffle: { value: true } } })
  assert.equal(runtime.getSnapshot().images[0].url, 'file:///C:/Images/a%20%231.jpg')
  runtime.receive({ type: 'user-properties', properties: { shuffle: { value: false }, fit: { value: 'unknown' }, unknown: { value: true } } })
  assert.equal(runtime.getSnapshot().settings.shuffle, false)
  assert.equal(runtime.getSnapshot().settings.fit, 'fill')
  assert.equal(runtime.getSnapshot().images.length, 1)
  runtime.receive({ type: 'user-properties', properties: { imagefile: { value: '' } } })
  assert.equal(runtime.getSnapshot().images.length, 0)
  runtime.dispose()
})

test('directory events are scoped by property, retained while inactive, and removals update the active catalogue', () => {
  const runtime = new WallpaperRuntime(false)
  runtime.receive({ type: 'directory-changed', property: 'other', files: ['C:/wrong.jpg'] })
  runtime.receive({ type: 'directory-changed', property: 'imagedirectory', files: ['C:/a.jpg', 'C:/b.png'] })
  assert.equal(runtime.getSnapshot().images.length, 4)
  runtime.receive({ type: 'user-properties', properties: { source: { value: 'directory' } } })
  assert.equal(runtime.getSnapshot().images.length, 2)
  runtime.receive({ type: 'directory-removed', property: 'imagedirectory', files: ['C:/A.JPG'] })
  assert.deepEqual(runtime.getSnapshot().images.map(image => image.name), ['b.png'])
  runtime.dispose()
})

test('FPS accepts zero as uncapped, pause accepts false, and unrelated/invalid updates preserve state', () => {
  const runtime = new WallpaperRuntime(false)
  runtime.receive({ type: 'general-properties', properties: { fps: 0 } })
  for (const fps of [NaN, Infinity, -10]) runtime.receive({ type: 'general-properties', properties: { fps } })
  runtime.receive({ type: 'general-properties', properties: { other: 12 } })
  assert.equal(runtime.getSnapshot().fps, 0)
  runtime.receive({ type: 'paused', paused: true }); runtime.receive({ type: 'paused', paused: false })
  assert.equal(runtime.getSnapshot().paused, false)
  runtime.dispose()
})

test('subscriptions are immutable snapshots; cleanup disconnects the bridge for a replacement runtime', () => {
  const host = bridge(); const runtime = new WallpaperRuntime(false)
  runtime.connect(host.wallpaperBridge)
  const before = runtime.getSnapshot(); let changes = 0
  const unsubscribe = runtime.subscribe(() => changes++)
  host.wallpaperPropertyListener.setPaused(true)
  assert.equal(changes, 1); assert.equal(before.paused, false)
  assert.ok(Object.isFrozen(runtime.getSnapshot())); assert.ok(Object.isFrozen(runtime.getSnapshot().images))
  unsubscribe(); host.wallpaperPropertyListener.setPaused(false)
  assert.equal(changes, 1)
  runtime.dispose()
  host.wallpaperPropertyListener.applyGeneralProperties({ fps: 12 })
  const replacement = new WallpaperRuntime(false); replacement.connect(host.wallpaperBridge)
  assert.equal(replacement.getSnapshot().fps, 12)
  replacement.dispose()
})

test('browser imports are session-only metadata and are disabled outside preview mode', () => {
  const files = [new File(['x'], 'one.jpg')]
  let created = 0; const revoked: string[] = []
  const urls = { createObjectURL: () => `blob:test/${++created}`, revokeObjectURL: (url: string) => { revoked.push(url) } }
  const host = new WallpaperRuntime(false, urls)
  host.importFiles('image', files)
  assert.equal(created, 0); assert.equal(host.getSnapshot().settings.source, 'samples')
  const preview = new WallpaperRuntime(true, urls)
  preview.importFiles('image', files)
  assert.equal(preview.getSnapshot().settings.source, 'image')
  assert.equal(preview.getSnapshot().images.length, 1)
  preview.receive({ type: 'user-properties', properties: { imagefile: { value: '' } } })
  assert.equal(preview.getSnapshot().images.length, 0)
  assert.deepEqual(revoked, ['blob:test/1'])
  preview.dispose(); host.dispose()
})
