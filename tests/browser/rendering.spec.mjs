import { test, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { inflateSync } from 'node:zlib'

const root = fileURLToPath(new URL('../../', import.meta.url))
const base = pathToFileURL(resolve(root, 'dist/index.html')).href
const solid = color => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="${color}"/></svg>`

async function boot(page, backend, clock = false) {
  await page.setViewportSize({ width: 800, height: 400 })
  if (clock) {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'))
  }
  await page.addInitScript(() => {
    let listener
    Object.defineProperty(window, 'wallpaperPropertyListener', { configurable: true, get: () => listener, set(value) {
      listener = value; value.applyUserProperties({ source: { value: 'image' }, imagefile: { value: '' } })
    } })
    window.__rafRequests = 0
    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = callback => { window.__rafRequests++; return raf(callback) }
  })
  await page.goto(base + '?preview=1' + (backend === 'canvas' ? '&renderer=canvas' : ''))
  await expect(page.locator('#stage')).toHaveAttribute('data-renderer', backend === 'pixi' ? 'PixiJS WebGL' : 'Canvas2D fallback')
}

async function pixel(page, x, y) {
  const tools = page.locator('.preview-tools')
  await tools.evaluate(element => { element.style.visibility = 'hidden' })
  let png
  try { png = await page.screenshot({ clip: { x, y, width: 1, height: 1 } }) }
  finally { await tools.evaluate(element => { element.style.visibility = '' }) }
  // A 1×1 PNG's first pixel has zero predictors for every PNG filter, so no image dependency is needed.
  const chunks = []
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset); const type = png.toString('ascii', offset + 4, offset + 8)
    if (type === 'IHDR') { expect(png[offset + 16]).toBe(8); expect([2, 6]).toContain(png[offset + 17]) }
    if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length))
    offset += length + 12
  }
  return [...inflateSync(Buffer.concat(chunks)).subarray(1, 4)]
}

for (const backend of ['pixi', 'canvas']) {
  test(`${backend}: Fit keeps a sharp foreground over color or blurred cover`, async ({ page }, testInfo) => {
    await boot(page, backend)
    const portrait = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="400"><rect width="200" height="200" fill="red"/><rect y="200" width="200" height="200" fill="blue"/></svg>'
    await page.getByLabel('Choose image', { exact: true }).setInputFiles({ name: 'portrait.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(portrait) })
    await expect(page.locator('main')).toHaveAttribute('data-current', 'portrait.svg')
    await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ fit: { value: 'fit' }, background: { value: 'color' }, backgroundcolor: { value: '#123456' } }))
    expect(await pixel(page, 10, 190)).toEqual([18, 52, 86])
    expect(await pixel(page, 400, 190)).toEqual([255, 0, 0])
    expect(await pixel(page, 400, 210)).toEqual([0, 0, 255])
    await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ background: { value: 'blur' }, blur: { value: 24 } }))
    const blurred = await pixel(page, 10, 199)
    expect(blurred[0]).toBeGreaterThan(30); expect(blurred[2]).toBeGreaterThan(30)
    expect(await pixel(page, 400, 190)).toEqual([255, 0, 0])
    expect(await pixel(page, 400, 210)).toEqual([0, 0, 255])
    await expect(page.locator('#stage')).toHaveAttribute('data-renderer', backend === 'canvas' ? 'Canvas2D fallback' : 'PixiJS WebGL')
    await page.screenshot({ path: testInfo.outputPath('fit-blur.png') })
  })

  test(`${backend}: fade and slide animate whole compositions then stop requesting frames`, async ({ page }, testInfo) => {
    await boot(page, backend, true)
    const folder = testInfo.outputPath('colors'); mkdirSync(folder, { recursive: true })
    writeFileSync(resolve(folder, '1-red.svg'), solid('red')); writeFileSync(resolve(folder, '2-blue.svg'), solid('blue'))
    await page.getByLabel('Choose folder', { exact: true }).setInputFiles(folder)
    await expect(page.locator('main')).toHaveAttribute('data-current', 'colors/1-red.svg')
    await expect(page.getByTestId('playback-cache')).toHaveAttribute('data-cached', '2')
    const idle = await page.evaluate(() => window.__rafRequests)
    await page.clock.runFor(300)
    expect(await page.evaluate(() => window.__rafRequests)).toBe(idle)
    await page.getByRole('button', { name: 'Next image' }).click()
    await expect(page.locator('main')).toHaveAttribute('data-transitioning', 'true')
    await page.clock.runFor(500)
    const middle = await pixel(page, 100, 200)
    expect(middle[0]).toBeGreaterThan(70); expect(middle[0]).toBeLessThan(190)
    expect(middle[2]).toBeGreaterThan(70); expect(middle[2]).toBeLessThan(190)
    await page.clock.runFor(600)
    await expect(page.locator('main')).toHaveAttribute('data-current', 'colors/2-blue.svg')
    expect(await pixel(page, 100, 200)).toEqual([0, 0, 255])
    await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ transition: { value: 'slide' } }))
    await page.getByRole('button', { name: 'Previous image' }).click()
    await page.clock.runFor(500)
    expect(await pixel(page, 100, 200)).toEqual([255, 0, 0])
    expect(await pixel(page, 700, 200)).toEqual([0, 0, 255])
    await page.clock.runFor(600)
    await expect(page.locator('main')).toHaveAttribute('data-current', 'colors/1-red.svg')
    const stopped = await page.evaluate(() => window.__rafRequests)
    await page.clock.runFor(500)
    expect(await page.evaluate(() => window.__rafRequests)).toBe(stopped)
    await expect(page.locator('#stage')).toHaveAttribute('data-renderer', backend === 'canvas' ? 'Canvas2D fallback' : 'PixiJS WebGL')
  })
}

test('WebGL loss switches to fallback; restoration rebuilds the displayed composition', async ({ page }) => {
  await boot(page, 'pixi')
  await page.getByLabel('Choose image', { exact: true }).setInputFiles({ name: 'red.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(solid('red')) })
  await expect(page.locator('main')).toHaveAttribute('data-current', 'red.svg')
  await page.evaluate(() => {
    const canvas = document.querySelector('.wallpaper-canvas')
    window.__lostGL = canvas.getContext('webgl2') || canvas.getContext('webgl')
    window.__lostExtension = window.__lostGL.getExtension('WEBGL_lose_context')
    window.__lostExtension.loseContext()
  })
  await expect(page.locator('#stage')).toHaveAttribute('data-renderer', 'Canvas2D fallback')
  expect(await pixel(page, 100, 200)).toEqual([255, 0, 0])
  await page.evaluate(() => window.__lostExtension.restoreContext())
  await expect(page.locator('#stage')).toHaveAttribute('data-renderer', 'PixiJS WebGL', { timeout: 10_000 })
  expect(await pixel(page, 100, 200)).toEqual([255, 0, 0])
})

test('unavailable WebGL starts the fallback without idle animation activity', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith('webgl') || type === 'experimental-webgl' ? null : Reflect.apply(getContext, this, [type, ...args])
    }
  })
  await boot(page, 'unavailable', true)
  await page.getByLabel('Choose image', { exact: true }).setInputFiles({ name: 'red.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(solid('red')) })
  await expect(page.locator('main')).toHaveAttribute('data-current', 'red.svg')
  expect(await pixel(page, 100, 200)).toEqual([255, 0, 0])
  const idle = await page.evaluate(() => window.__rafRequests)
  await page.clock.runFor(300)
  expect(await page.evaluate(() => window.__rafRequests)).toBe(idle)
})

test('cycling evicts GPU textures instead of accumulating every visited image', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.__liveTextures = new Set()
    const originals = [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype].map(proto => ({ proto, create: proto.createTexture, remove: proto.deleteTexture }))
    for (const { proto, create, remove } of originals) {
      proto.createTexture = function () { const texture = Reflect.apply(create, this, []); if (texture) window.__liveTextures.add(texture); return texture }
      proto.deleteTexture = function (texture) { window.__liveTextures.delete(texture); return Reflect.apply(remove, this, [texture]) }
    }
  })
  await boot(page, 'pixi')
  const folder = testInfo.outputPath('texture-cycle'); mkdirSync(folder, { recursive: true })
  for (let i = 0; i < 10; i++) writeFileSync(resolve(folder, `${i}.svg`), solid(i % 2 ? 'red' : 'blue'))
  await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ transition: { value: 'instant' } }))
  await page.getByLabel('Choose folder', { exact: true }).setInputFiles(folder)
  await expect(page.locator('main')).toHaveAttribute('data-current', 'texture-cycle/0.svg')
  let baseline = 0
  for (let i = 1; i <= 25; i++) {
    await page.getByRole('button', { name: 'Next image' }).click()
    await expect(page.locator('main')).toHaveAttribute('data-current', `texture-cycle/${i % 10}.svg`)
    const live = await page.evaluate(() => window.__liveTextures.size)
    if (i === 5) baseline = live
    if (i > 5) expect(live).toBeLessThanOrEqual(baseline + 1)
  }
  await expect(page.locator('#stage')).toHaveAttribute('data-renderer', 'PixiJS WebGL')
})
