import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync, linkSync, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

// Optional, real-raster stress run. Artifacts never become wallpaper runtime assets.
const root = fileURLToPath(new URL('../../', import.meta.url))
const output = resolve(root, 'test-results/stress')
const fixtures = resolve(output, 'fixtures'); const album = resolve(output, '150-photo-album')
mkdirSync(fixtures, { recursive: true }); mkdirSync(album, { recursive: true })
const moves = Number(process.env.STRESS_MOVES || 310)
const source = process.env.STRESS_SOURCE || 'import'
assert.ok(['import', 'file'].includes(source), 'STRESS_SOURCE must be import or file')
assert.ok(Number.isInteger(moves) && moves >= 300, 'Use at least 300 moves to cover two 150-image cycles')
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
const report = { date: new Date().toISOString(), browser: browser.version(), source, viewport: { width: 1920, height: 1080 }, moves, fixtures: [], samples: [] }
try {
  const generation = await browser.newPage({ acceptDownloads: true, offline: true })
  const names = ['1.jpg', '2.jpg', '2b.JPG', '3.jpg']
  for (let i = 0; i < 7; i++) {
    const width = i % 2 || i === 6 ? 7680 : 3840; const height = width * 9 / 16
    const noisy = i === 6; const name = noisy ? '8k-noisy-photo.png' : `${i}-${width}.jpg`
    const target = resolve(fixtures, name)
    if (!existsSync(target)) {
      const data = readFileSync(resolve(root, 'public/wallpapers', names[i % names.length])).toString('base64')
      const downloaded = generation.waitForEvent('download', { timeout: 120_000 })
      await generation.evaluate(async ({ data, width, height, noisy, name }) => {
        const image = new Image(); image.src = 'data:image/jpeg;base64,' + data; await image.decode()
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, width, height)
        if (noisy) {
          const pixels = ctx.getImageData(0, 0, width, height); let seed = 123456789
          for (let p = 0; p < pixels.data.length; p += 4) for (let c = 0; c < 3; c++) {
            seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
            pixels.data[p + c] = (pixels.data[p + c] & 224) | (seed & 31)
          }
          ctx.putImageData(pixels, 0, 0)
        }
        const blob = await new Promise(resolve => canvas.toBlob(resolve, noisy ? 'image/png' : 'image/jpeg', 0.97))
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = name; link.click()
        canvas.width = 0; canvas.height = 0
      }, { data, width, height, noisy, name })
      await (await downloaded).saveAs(target)
    }
    report.fixtures.push({ name, width, height, bytes: statSync(target).size })
  }
  await generation.close()
  const paths = Array.from({ length: 150 }, (_, i) => {
    const target = resolve(album, `${String(i).padStart(3, '0')}-photo.jpg`)
    if (!existsSync(target)) linkSync(resolve(fixtures, report.fixtures[i % 6].name), target)
    return target
  })
  console.log('Generated 150 paths from six upscaled photographic JPEG fixtures and a separate noisy 8K PNG.')
  const context = await browser.newContext({ offline: true, viewport: report.viewport })
  const page = await context.newPage(); const errors = []; const remote = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (/^https?:/.test(request.url())) remote.push(request.url()) })
  await page.addInitScript(() => {
    window.__prepared = new Set(); window.__textures = new Set(); window.__longTasks = []
    const draw = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      if (args[0] instanceof HTMLImageElement) window.__prepared.add(this.canvas)
      return Reflect.apply(draw, this, args)
    }
    for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const create = proto.createTexture; const remove = proto.deleteTexture
      proto.createTexture = function () { const texture = Reflect.apply(create, this, []); window.__textures.add(texture); return texture }
      proto.deleteTexture = function (texture) { window.__textures.delete(texture); return Reflect.apply(remove, this, [texture]) }
    }
    new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__longTasks.push(entry.duration) }).observe({ type: 'longtask', buffered: true })
    let listener
    Object.defineProperty(window, 'wallpaperPropertyListener', { configurable: true, get: () => listener, set(value) {
      listener = value; value.applyUserProperties({ source: { value: 'directory' }, transition: { value: 'instant' }, holdseconds: { value: 3600 }, controls: { value: false } })
    } })
  })
  await page.goto(pathToFileURL(resolve(root, 'dist/index.html')).href + '?preview=1')
  if (source === 'file') await page.evaluate(paths => window.wallpaperPropertyListener.userDirectoryFilesAddedOrChanged('imagedirectory', paths), paths)
  else await page.getByLabel('Choose folder', { exact: true }).setInputFiles(album)
  const prefix = source === 'import' ? '150-photo-album/' : ''
  const waitCurrent = name => page.waitForFunction(name => document.querySelector('main')?.dataset.current === name, name, { timeout: 60_000 })
  await waitCurrent(prefix + '000-photo.jpg')
  await page.waitForFunction(() => document.querySelector('[data-testid="playback-cache"]')?.dataset.cached === '2')
  const cdp = await context.newCDPSession(page); await cdp.send('Performance.enable')
  const capture = async move => {
    const sample = await page.evaluate(() => {
      const prepared = [...window.__prepared].filter(canvas => canvas.width && canvas.height)
      const cache = document.querySelector('[data-testid="playback-cache"]')
      return { cached: Number(cache.dataset.cached), estimatedBytes: Number(cache.dataset.bytes), livePrepared: prepared.length,
        preparedPixels: prepared.reduce((n, canvas) => n + canvas.width * canvas.height, 0), liveTextures: window.__textures.size,
        backend: document.querySelector('#stage').dataset.renderer }
    })
    const metrics = await cdp.send('Performance.getMetrics')
    sample.jsHeapUsedBytes = metrics.metrics.find(metric => metric.name === 'JSHeapUsedSize')?.value
    assert.ok(sample.cached <= 3 && sample.livePrepared <= 3)
    assert.ok(sample.estimatedBytes <= 256 * 1024 * 1024)
    report.samples.push({ move, ...sample })
  }
  await capture(0)
  if (source === 'import') assert.equal(report.samples[0].backend, 'PixiJS WebGL', 'Imported files should exercise the GPU backend')
  report.environment = await page.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl2'); const info = gl?.getExtension('WEBGL_debug_renderer_info')
    return { userAgent: navigator.userAgent, logicalProcessors: navigator.hardwareConcurrency, deviceMemoryGiB: navigator.deviceMemory,
      renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unavailable', maxTextureSize: gl?.getParameter(gl.MAX_TEXTURE_SIZE) }
  })
  const latencies = []
  for (let i = 1; i <= moves; i++) {
    const start = performance.now()
    await page.locator('.preview-tools').getByRole('button', { name: 'Next image' }).click()
    await waitCurrent(prefix + `${String(i % 150).padStart(3, '0')}-photo.jpg`)
    latencies.push(performance.now() - start)
    if (i % 25 === 0 || i === moves) { await capture(i); console.log(`Completed ${i}/${moves} moves`) }
  }
  // One genuinely large raster file, distinct from the six cached-photo fixtures.
  const hugeStart = performance.now()
  if (source === 'file') await page.evaluate(path => window.wallpaperPropertyListener.applyUserProperties({ source: { value: 'image' }, imagefile: { value: path } }), resolve(fixtures, '8k-noisy-photo.png'))
  else await page.getByLabel('Choose image', { exact: true }).setInputFiles(resolve(fixtures, '8k-noisy-photo.png'))
  await waitCurrent('8k-noisy-photo.png')
  report.largePngReadyMs = performance.now() - hugeStart
  await capture('large-png')
  await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ imagefile: { value: '' } }))
  await page.waitForFunction(() => document.querySelector('main')?.dataset.phase === 'empty')
  await capture('cleared')
  const stable = report.samples.filter(sample => typeof sample.move === 'number' && sample.move >= 50)
  assert.ok(Math.max(...stable.map(sample => sample.liveTextures)) - Math.min(...stable.map(sample => sample.liveTextures)) <= 2, 'GPU texture count should plateau')
  latencies.sort((a, b) => a - b)
  report.navigationMs = { median: latencies[Math.floor(latencies.length / 2)], p95: latencies[Math.floor(latencies.length * 0.95)], max: latencies.at(-1) }
  report.longTasks = await page.evaluate(() => ({ count: window.__longTasks.length, maxMs: Math.max(0, ...window.__longTasks) }))
  report.errors = errors; report.remoteRequests = remote
  assert.deepEqual(errors, []); assert.deepEqual(remote, [])
  report.passed = true
  console.log(JSON.stringify({ navigationMs: report.navigationMs, largePngReadyMs: report.largePngReadyMs, longTasks: report.longTasks, samples: report.samples }, null, 2))
} catch (error) { report.passed = false; report.failure = String(error); throw error }
finally { writeFileSync(resolve(output, `report-${source}.json`), JSON.stringify(report, null, 2)); await browser.close() }
