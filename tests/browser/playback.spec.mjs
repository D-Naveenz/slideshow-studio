import { test, expect } from '@playwright/test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import { SLIDE_BUDGET } from '../../src/slideshow/resources.ts'

const root = fileURLToPath(new URL('../../', import.meta.url))
const url = pathToFileURL(resolve(root, 'dist/index.html')).href + '?preview=1'
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect width="200" height="100" fill="#265b80"/></svg>'

test('automatic playback, host pause, and backward navigation preserve hold timing', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'))
  await page.goto(url)
  const shell = page.locator('main')
  await expect(shell).toHaveAttribute('data-current', '1.jpg')
  await expect(page.getByTestId('playback-cache')).toHaveAttribute('data-cached', '2')
  await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ holdseconds: { value: 1 }, transition: { value: 'instant' } }))
  await page.clock.fastForward(750)
  await page.evaluate(() => window.wallpaperPropertyListener.setPaused(true))
  await page.clock.fastForward(60_000)
  await expect(shell).toHaveAttribute('data-current', '1.jpg')
  await page.evaluate(() => window.wallpaperPropertyListener.setPaused(false))
  await page.clock.fastForward(249)
  await expect(shell).toHaveAttribute('data-current', '1.jpg')
  await page.clock.fastForward(1)
  await expect(shell).toHaveAttribute('data-current', '2.jpg')
  await page.locator('.preview-tools').getByRole('button', { name: 'Previous image' }).click()
  await expect(shell).toHaveAttribute('data-current', '1.jpg')
  await page.clock.fastForward(999)
  await expect(shell).toHaveAttribute('data-current', '1.jpg')
  await page.clock.fastForward(1)
  await expect(shell).toHaveAttribute('data-current', '2.jpg')
})

test('corrupt images are skipped, all-failed and empty states recover after selection changes', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto(url)
  const folder = testInfo.outputPath('Failure album')
  mkdirSync(folder, { recursive: true })
  writeFileSync(resolve(folder, '1-broken.jpg'), 'This is not a JPEG')
  writeFileSync(resolve(folder, '2-good.svg'), svg)
  await page.getByLabel('Choose folder', { exact: true }).setInputFiles(folder)
  await expect(page.locator('main')).toHaveAttribute('data-current', 'Failure album/2-good.svg')
  await expect(page.getByText('Playback ready · 1 skipped', { exact: true })).toBeVisible()
  await page.getByLabel('Choose image', { exact: true }).setInputFiles({ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not an image') })
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'error')
  await expect(page.getByText('Unable to load the selected images.', { exact: false })).toBeVisible()
  await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ imagefile: { value: '' } }))
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'empty')
  await page.getByLabel('Choose image', { exact: true }).setInputFiles({ name: 'recovered.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) })
  await expect(page.locator('main')).toHaveAttribute('data-current', 'recovered.svg')
  expect(errors).toEqual([])
})

test('oversized sources prepare screen-sized pixels, and resize keeps the viewport covered', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.__preparedSizes = []
    const draw = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      if (args[0] instanceof HTMLImageElement) window.__preparedSizes.push([this.canvas.width, this.canvas.height])
      return Reflect.apply(draw, this, args)
    }
  })
  await page.goto(url)
  const huge = svg.replace('width="200" height="100"', 'width="8192" height="4096"')
  await page.getByLabel('Choose image', { exact: true }).setInputFiles({ name: '8k.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(huge) })
  await expect(page.locator('main')).toHaveAttribute('data-current', '8k.svg')
  const sizes = await page.evaluate(() => window.__preparedSizes)
  expect(sizes.at(-1)[0]).toBeLessThan(8192)
  expect(sizes.at(-1)[0] * sizes.at(-1)[1] * 8).toBeLessThanOrEqual(SLIDE_BUDGET)
  await page.setViewportSize({ width: 500, height: 900 })
  await expect.poll(() => page.locator('.wallpaper-canvas').evaluate(canvas => canvas.width)).toBe(500)
  expect(await page.locator('.wallpaper-canvas').boundingBox()).toEqual({ x: 0, y: 0, width: 500, height: 900 })
  await expect(page.locator('main')).toHaveAttribute('data-current', '8k.svg')
  await page.screenshot({ path: testInfo.outputPath('playback.png') })
})

test('same-path native file modifications issue a fresh request and replace the displayed revision', async ({ page }, testInfo) => {
  const path = testInfo.outputPath('changing.svg')
  writeFileSync(path, svg)
  const requests = []
  page.on('request', request => { if (request.url().startsWith(pathToFileURL(path).href)) requests.push(request.url()) })
  await page.goto(url)
  await page.evaluate(path => window.wallpaperPropertyListener.applyUserProperties({ source: { value: 'image' }, imagefile: { value: path } }), path)
  await expect(page.locator('main')).toHaveAttribute('data-current', 'changing.svg')
  writeFileSync(path, svg.replace('#265b80', '#b44c32'))
  await page.evaluate(path => window.wallpaperPropertyListener.applyUserProperties({ imagefile: { value: path } }), path)
  await expect.poll(() => requests.length).toBe(2)
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'ready')
  expect(requests[1]).not.toBe(requests[0])
  expect(new URL(requests[1]).searchParams.get('slideshow_revision')).toBeTruthy()
  await page.screenshot({ path: testInfo.outputPath('modified.png') })
})
