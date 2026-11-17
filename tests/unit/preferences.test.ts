import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SettingsPreferences, preferenceKey } from '../../src/wallpaper/preferences.ts'
import { WallpaperRuntime } from '../../src/wallpaper/runtime.ts'
import type { WallpaperEvent } from '../../src/wallpaper/bridge.d.ts'

function memory(values: unknown = {}, version = 1) {
  const entries = new Map([[preferenceKey, JSON.stringify({ version, values })]])
  return { entries, getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value) }, removeItem: (key: string) => { entries.delete(key) } }
}

test('placement extends v1 preferences and follows host precedence, persistence and reset', () => {
  const legacy = new SettingsPreferences(memory({ fit: 'fit' }))
  assert.equal(legacy.settings.toolbarposition, 'top')
  assert.equal(legacy.settings.toolbarmargin, 24)
  assert.equal(legacy.settings.fit, 'fit')
  const storage = memory({ toolbarposition: 'left', toolbarmargin: 80 })
  const preferences = new SettingsPreferences(storage)
  preferences.applyHost({ toolbarposition: 'bottom', toolbarmargin: 60 }, true)
  assert.equal(preferences.settings.toolbarposition, 'left')
  preferences.applyHost({ toolbarposition: 'bottom', toolbarmargin: 90 }, false)
  assert.equal(preferences.settings.toolbarposition, 'left')
  assert.equal(preferences.settings.toolbarmargin, 90)
  preferences.update({ toolbarposition: 'right', toolbarmargin: 999 })
  const reload = new SettingsPreferences(storage)
  assert.equal(reload.settings.toolbarposition, 'right')
  assert.equal(reload.settings.toolbarmargin, 256)
  preferences.reset()
  assert.equal(preferences.settings.toolbarposition, 'bottom')
  assert.equal(preferences.settings.toolbarmargin, 90)
  assert.equal(storage.getItem(preferenceKey), null)
})

test('startup merges defaults, initial host values, then validated saved appearance/playback overrides', () => {
  const storage = memory({ fit: 'fit', holdseconds: 50, shuffle: true, source: 'directory', imagefile: 'C:/secret.jpg', controls: false, unexpected: 1 })
  const preferences = new SettingsPreferences(storage)
  preferences.applyHost({ holdseconds: 10, transition: 'slide', fit: 'fill' }, true)
  assert.equal(preferences.settings.holdseconds, 50)
  assert.equal(preferences.settings.fit, 'fit')
  assert.equal(preferences.settings.transition, 'slide')
  assert.equal(preferences.settings.shuffle, true)
  assert.equal(preferences.settings.source, 'samples')
  assert.equal(preferences.settings.imagefile, '')
  assert.equal(preferences.settings.controls, true)
  assert.deepEqual(preferences.keys, ['holdseconds', 'shuffle', 'fit'])
  assert.ok(Object.isFrozen(preferences.settings)); assert.ok(Object.isFrozen(preferences.keys))
})

test('later changed host properties clear matching overrides; repeated and unrelated values preserve them', () => {
  const storage = memory({ fit: 'fit', holdseconds: 50, shuffle: true })
  const preferences = new SettingsPreferences(storage)
  preferences.applyHost({ fit: 'fill', holdseconds: 10 }, true)
  preferences.applyHost({ fit: 'fill', holdseconds: 20, background: 'color' }, false)
  assert.equal(preferences.settings.fit, 'fit')
  assert.equal(preferences.settings.holdseconds, 20)
  assert.equal(preferences.settings.shuffle, true)
  assert.deepEqual(preferences.keys, ['shuffle', 'fit'])
  const reloaded = new SettingsPreferences(storage)
  assert.deepEqual(reloaded.keys, ['shuffle', 'fit'])
})

test('updates clamp shared bounds, reject bad values, persist only allowed keys, and reset to latest host', () => {
  const storage = memory()
  const preferences = new SettingsPreferences(storage)
  preferences.applyHost({ fit: 'fit', holdseconds: 77 }, true)
  preferences.update({ blur: 1000, transitionseconds: 0, backgroundcolor: '#ABCDEF', holdseconds: NaN })
  assert.equal(preferences.settings.blur, 80)
  assert.equal(preferences.settings.transitionseconds, 0.1)
  assert.equal(preferences.settings.backgroundcolor, '#abcdef')
  assert.equal(preferences.settings.holdseconds, 77)
  const reload = new SettingsPreferences(storage)
  assert.equal(reload.settings.blur, 80)
  preferences.reset()
  assert.equal(preferences.settings.blur, 24)
  assert.equal(preferences.settings.fit, 'fit')
  assert.equal(preferences.settings.holdseconds, 77)
  assert.deepEqual(preferences.keys, [])
  assert.equal(storage.getItem(preferenceKey), null)
})

test('corrupt, wrong-version, inherited, and unavailable persistence cannot prevent session operation', () => {
  const badJson = memory(); badJson.entries.set(preferenceKey, '{broken')
  for (const storage of [undefined, badJson, memory({ fit: 'fit' }, 2), memory(null), {
    getItem() { throw new Error('denied') }, setItem() { throw new Error('quota') }, removeItem() { throw new Error('denied') },
  }]) {
    const preferences = new SettingsPreferences(storage)
    assert.equal(preferences.settings.fit, 'fill')
    preferences.update(Object.create({ fit: 'fit' }))
    assert.equal(preferences.settings.fit, 'fill')
    preferences.update({ fit: 'fit' })
    assert.equal(preferences.settings.fit, 'fit')
    preferences.reset(); assert.equal(preferences.settings.fit, 'fill')
  }
})

test('runtime preserves saved overrides across all buffered initial properties and scopes later updates', () => {
  const storage = memory({ holdseconds: 90, fit: 'fit' })
  const runtime = new WallpaperRuntime(false, URL, storage)
  const events: WallpaperEvent[] = [
    { type: 'user-properties', properties: { holdseconds: { value: 10 } } },
    { type: 'paused', paused: true },
    { type: 'user-properties', properties: { fit: { value: 'fill' }, holdseconds: { value: 20 } } },
  ]
  runtime.connect({ connect(consumer) { events.forEach(consumer); return () => {} } })
  assert.equal(runtime.getSnapshot().settings.holdseconds, 90)
  assert.equal(runtime.getSnapshot().settings.fit, 'fit')
  assert.equal(runtime.getSnapshot().paused, true)
  runtime.receive({ type: 'user-properties', properties: { holdseconds: { value: 30 }, fit: { value: 'bad' } } })
  assert.equal(runtime.getSnapshot().settings.holdseconds, 30)
  assert.deepEqual(runtime.getSnapshot().overrides, ['fit'])
  runtime.resetOverrides(); assert.equal(runtime.getSnapshot().settings.fit, 'fill')
  runtime.dispose(); runtime.setOverrides({ fit: 'fit' })
  assert.equal(runtime.getSnapshot().settings.fit, 'fill')
})

test('runtime handles late initial host settings and retains local changes when storage fails', () => {
  const runtime = new WallpaperRuntime(false, URL, { getItem() { return null }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') } })
  runtime.connect({ connect() { return () => {} } })
  runtime.setOverrides({ holdseconds: 80 })
  runtime.receive({ type: 'user-properties', properties: { holdseconds: { value: 10 } } })
  assert.equal(runtime.getSnapshot().settings.holdseconds, 80)
  runtime.receive({ type: 'user-properties', properties: { holdseconds: { value: 12 } } })
  assert.equal(runtime.getSnapshot().settings.holdseconds, 12)
  runtime.setOverrides({ fit: 'fit' }); runtime.resetOverrides()
  assert.equal(runtime.getSnapshot().settings.holdseconds, 12)
  assert.equal(runtime.getSnapshot().settings.fit, 'fill')
  runtime.dispose()
})
