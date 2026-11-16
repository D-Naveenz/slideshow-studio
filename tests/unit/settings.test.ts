import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaults, definitions, projectProperties, settingsPatch } from '../../src/wallpaper/settings.ts'

test('partial settings preserve defaults and distinguish false/zero from missing values', () => {
  const merged = { ...defaults, ...settingsPatch({ shuffle: { value: true }, holdseconds: { value: 50 } }), ...settingsPatch({ shuffle: { value: false }, blur: { value: 0 } }) }
  assert.equal(merged.shuffle, false); assert.equal(merged.blur, 0); assert.equal(merged.holdseconds, 50)
  assert.equal(merged.transition, 'fade'); assert.equal(defaults.holdseconds, 30)
})

test('sliders clamp, round, and reject non-finite values and numeric strings', () => {
  assert.deepEqual(settingsPatch({ holdseconds: { value: 0 }, transitionseconds: { value: 100 }, blur: { value: 4.6 } }), { holdseconds: 1, transitionseconds: 10, blur: 5 })
  assert.deepEqual(settingsPatch({ transitionseconds: { value: 1.237 } }), { transitionseconds: 1.24 })
  for (const value of [NaN, Infinity, -Infinity, '30', null, undefined]) assert.deepEqual(settingsPatch({ holdseconds: { value } }), {})
})

test('invalid options, malformed properties, inherited settings, and unknown keys are ignored', () => {
  for (const value of [null, 12, 'bad', { shuffle: true }, { source: { value: 'remote' } }, { shuffle: { value: 'false' } }, { unknown: { value: true } }]) assert.deepEqual(settingsPatch(value), {})
  assert.deepEqual(settingsPatch(Object.create({ shuffle: { value: true } })), {})
})

test('host color channels convert to hex and invalid color strings are ignored', () => {
  assert.deepEqual(settingsPatch({ backgroundcolor: { value: '1 0.5 0' } }), { backgroundcolor: '#ff8000' })
  assert.deepEqual(settingsPatch({ backgroundcolor: { value: '-1 2 0.25' } }), { backgroundcolor: '#00ff40' })
  assert.deepEqual(settingsPatch({ backgroundcolor: { value: '#AABBCC' } }), { backgroundcolor: '#aabbcc' })
  for (const value of ['', 'bad', '1 0', '1 0 NaN', '#abc']) assert.deepEqual(settingsPatch({ backgroundcolor: { value } }), {})
})

test('file settings accept explicit clearing and absolute local selections, never remote or script URLs', () => {
  assert.deepEqual(settingsPatch({ imagefile: { value: '' }, imagedirectory: { value: 'C:\\Images' } }), { imagefile: '', imagedirectory: 'C:\\Images' })
  for (const value of ['https://example.com/a.jpg', 'javascript:alert(1)', 'relative.jpg', 'C:relative.jpg', 'C:/nul\u0000.jpg']) assert.deepEqual(settingsPatch({ imagefile: { value } }), {})
})

test('project properties cover the validated settings with host-compatible defaults and conditions', () => {
  const properties = projectProperties()
  assert.deepEqual(Object.keys(properties), Object.keys(defaults))
  assert.equal(properties.imagedirectory.mode, 'fetchall')
  assert.equal(properties.imagefile.fileType, 'image')
  assert.equal(properties.backgroundcolor.value, '0 0 0')
  const values = Object.fromEntries(Object.entries(properties).map(([key, property]) => [key, { value: property.value }]))
  assert.deepEqual(settingsPatch(values), defaults)
  for (const definition of Object.values(definitions)) {
    if (!definition.condition) continue
    const keys = Object.keys(properties)
    const result = new Function(...keys, `return (${definition.condition})`)(...Object.values(properties))
    assert.equal(typeof result, 'boolean')
  }
})
