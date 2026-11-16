import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createContext, Script } from 'node:vm'

const source = new Script(readFileSync(new URL('../../public/wallpaper-bridge.js', import.meta.url), 'utf8'))
function boot() {
  const window = {}
  const context = createContext({ window }) // Deliberately no document, module loader, or readiness events.
  source.runInContext(context)
  return { window, context, host: window.wallpaperPropertyListener, bridge: window.wallpaperBridge }
}
const copy = value => JSON.parse(JSON.stringify(value))

test('installs all host callbacks synchronously without DOM APIs', () => {
  const { host, bridge } = boot()
  for (const method of ['applyUserProperties', 'applyGeneralProperties', 'setPaused', 'userDirectoryFilesAddedOrChanged', 'userDirectoryFilesRemoved']) {
    assert.equal(typeof host[method], 'function')
  }
  assert.equal(typeof bridge.connect, 'function')
})

test('buffers every callback in arrival order and preserves separate partial property events', () => {
  const { host, bridge } = boot()
  host.applyUserProperties({ shuffle: { value: false } })
  host.applyUserProperties({ duration: { value: 30 } })
  host.applyGeneralProperties({ fps: 24 })
  host.setPaused(true)
  const files = ['C:/Images/a #1.jpg']
  host.userDirectoryFilesAddedOrChanged('images', files)
  files.push('must-not-leak.png')
  host.userDirectoryFilesRemoved('images', ['C:/Images/old.jpg'])
  const events = []
  bridge.connect(event => events.push(copy(event)))
  assert.deepEqual(events, [
    { type: 'user-properties', properties: { shuffle: { value: false } } },
    { type: 'user-properties', properties: { duration: { value: 30 } } },
    { type: 'general-properties', properties: { fps: 24 } },
    { type: 'paused', paused: true },
    { type: 'directory-changed', property: 'images', files: ['C:/Images/a #1.jpg'] },
    { type: 'directory-removed', property: 'images', files: ['C:/Images/old.jpg'] },
  ])
  host.setPaused(false)
  assert.deepEqual(events.at(-1), { type: 'paused', paused: false })
})

test('reentrant callbacks cannot overtake events already buffered', () => {
  const { host, bridge } = boot()
  host.applyGeneralProperties({ fps: 24 })
  host.setPaused(true)
  const types = []
  bridge.connect(event => {
    types.push(event.type)
    if (event.type === 'general-properties') host.applyUserProperties({ fit: { value: 'fit' } })
  })
  assert.deepEqual(types, ['general-properties', 'paused', 'user-properties'])
})

test('disconnect buffers future events; stale cleanup cannot disconnect a new consumer', () => {
  const { host, bridge } = boot()
  const first = []; const second = []
  const disconnect = bridge.connect(event => first.push(copy(event)))
  host.setPaused(true)
  disconnect()
  host.setPaused(false)
  bridge.connect(event => second.push(copy(event)))
  disconnect()
  host.applyGeneralProperties({ fps: 30 })
  assert.equal(first.length, 1)
  assert.deepEqual(second, [{ type: 'paused', paused: false }, { type: 'general-properties', properties: { fps: 30 } }])
})

test('rejects competing consumers without disrupting the existing consumer', () => {
  const { host, bridge } = boot()
  const events = []
  bridge.connect(event => events.push(event))
  assert.throws(() => bridge.connect(() => {}), /already has a consumer/)
  host.setPaused(true)
  assert.equal(events.length, 1)
})

test('a failed initial consumer does not prevent reconnection and draining remaining events', () => {
  const { host, bridge } = boot()
  host.setPaused(true); host.setPaused(false)
  assert.throws(() => bridge.connect(() => { throw new Error('consumer failed') }), /consumer failed/)
  const events = []
  bridge.connect(event => events.push(copy(event)))
  assert.deepEqual(events, [{ type: 'paused', paused: false }])
})

test('executing the bootstrap twice preserves the listener and pending events', () => {
  const { context, window, host, bridge } = boot()
  host.setPaused(true)
  source.runInContext(context)
  assert.equal(window.wallpaperPropertyListener, host)
  assert.equal(window.wallpaperBridge, bridge)
  const events = []
  bridge.connect(event => events.push(copy(event)))
  assert.deepEqual(events, [{ type: 'paused', paused: true }])
})
