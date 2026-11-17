import { cpSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { test, expect } from '@playwright/test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const sample = readFileSync(resolve(root, 'public/wallpapers/1.jpg'))
const previewUrl = pathToFileURL(resolve(root, 'dist/index.html')).href + '?preview=1'

async function openPreview(page) {
  const errors = []; const requests = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(request.url()) })
  page.on('request', request => requests.push(request.url()))
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL); const revoke = URL.revokeObjectURL.bind(URL)
    window.__testUrls = { created: [], revoked: [] }
    URL.createObjectURL = file => { const url = create(file); window.__testUrls.created.push(url); return url }
    URL.revokeObjectURL = url => { window.__testUrls.revoked.push(url); revoke(url) }
  })
  await page.goto(previewUrl)
  await expect(page.getByRole('complementary', { name: 'Browser preview tools' })).toBeVisible()
  return {
    requests,
    async check() {
      expect(errors).toEqual([])
      expect(requests.filter(url => /^(?:https?|wss?):/.test(url))).toEqual([])
      const cache = page.getByTestId('playback-cache')
      expect(Number(await cache.getAttribute('data-cached'))).toBeLessThanOrEqual(3)
      expect(Number(await cache.getAttribute('data-bytes'))).toBeLessThanOrEqual(256 * 1024 * 1024)
    },
  }
}

test('host directory deltas keep a large catalogue while preparing only neighboring images', async ({ page }, testInfo) => {
  const diagnostics = await openPreview(page)
  const folder = testInfo.outputPath('Native Album')
  mkdirSync(folder, { recursive: true })
  const files = Array.from({ length: 150 }, (_, i) => resolve(folder, `${i}.svg`))
  for (const file of files) writeFileSync(file, '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><rect width="64" height="32" fill="#346552"/></svg>')
  await page.evaluate(({ folder, files }) => {
    const host = window.wallpaperPropertyListener
    host.userDirectoryFilesAddedOrChanged('otherproperty', ['C:/ignored.jpg'])
    host.userDirectoryFilesAddedOrChanged('imagedirectory', files)
    host.applyUserProperties({ source: { value: 'directory' }, imagedirectory: { value: folder }, holdseconds: { value: 45 }, backgroundcolor: { value: '1 0.5 0' } })
    host.applyUserProperties({ shuffle: { value: false }, transition: { value: 'invalid' } })
  }, { folder, files })
  await expect(page.getByTestId('source-count')).toHaveText('150')
  await expect(page.locator('main')).toHaveAttribute('data-current', '0.svg')
  await page.getByRole('button', { name: 'Simulate Wallpaper Engine events' }).click()
  const settings = await page.getByLabel('Received settings').textContent()
  expect(JSON.parse(settings)).toMatchObject({ shuffle: false, holdseconds: 45, transition: 'fade', backgroundcolor: '#ff8000' })
  await page.evaluate(file => window.wallpaperPropertyListener.userDirectoryFilesRemoved('imagedirectory', [file]), files[0])
  await expect(page.getByTestId('source-count')).toHaveText('149')
  await page.evaluate(file => window.wallpaperPropertyListener.userDirectoryFilesAddedOrChanged('imagedirectory', [file]), files[1])
  await expect(page.getByTestId('source-count')).toHaveText('149')
  await page.getByRole('textbox', { name: 'Host FPS limit', exact: true }).fill('0')
  await page.getByRole('button', { name: 'Pause host' }).click()
  await expect(page.locator('.preview-status')).toHaveText('Host paused · Uncapped')
  await page.getByRole('button', { name: 'Resume host' }).click()
  await expect(page.locator('.preview-status')).toHaveText('Host running · Uncapped')
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'ready')
  const prefix = pathToFileURL(folder).href + '/'
  const loaded = new Set(diagnostics.requests.filter(url => url.startsWith(prefix)))
  expect(loaded.size).toBeGreaterThan(0)
  expect(loaded.size).toBeLessThanOrEqual(4)
  await diagnostics.check()
})

test('single file imports stay session-local, preserve names, and revoke replaced URLs', async ({ page }, testInfo) => {
  const diagnostics = await openPreview(page)
  const file = { name: '夜 # 100%.JPG', mimeType: 'image/jpeg', buffer: sample }
  const input = page.getByLabel('Choose image', { exact: true })
  await input.setInputFiles(file)
  await expect(page.getByTestId('source-count')).toHaveText('1')
  await expect(page.getByRole('region', { name: 'Selected images' }).getByRole('listitem')).toHaveText(file.name)
  await expect(page.locator('main')).toHaveAttribute('data-current', file.name)
  await input.setInputFiles(file)
  expect(await page.evaluate(() => ({ created: window.__testUrls.created.length, revoked: window.__testUrls.revoked.length }))).toEqual({ created: 2, revoked: 1 })
  await page.getByLabel('Image source', { exact: true }).selectOption('samples')
  await expect(page.getByTestId('source-count')).toHaveText('4')
  await page.getByLabel('Image source', { exact: true }).selectOption('image')
  await expect(page.getByTestId('source-count')).toHaveText('1')
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'ready')
  await page.screenshot({ path: testInfo.outputPath('single-preview.png') })
  await diagnostics.check()
  await page.reload()
  await expect(page.getByTestId('source-count')).toHaveText('4')
  await expect(page.getByLabel('Image source', { exact: true })).toHaveValue('samples')
})

test('folder input filters non-images, accepts reselection, and fits a portrait viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const diagnostics = await openPreview(page)
  const folder = testInfo.outputPath('Album Ω #')
  mkdirSync(folder, { recursive: true })
  cpSync(resolve(root, 'public/wallpapers/1.jpg'), resolve(folder, 'first.JPG'))
  cpSync(resolve(root, 'public/wallpapers/2.jpg'), resolve(folder, 'second.jpg'))
  writeFileSync(resolve(folder, 'notes.txt'), 'Must not be treated as an image')
  const input = page.getByLabel('Choose folder', { exact: true })
  await input.setInputFiles(folder)
  await expect(page.getByTestId('source-count')).toHaveText('2')
  await expect(page.locator('main')).toHaveAttribute('data-current', 'Album Ω #/first.JPG')
  await expect(page.getByRole('region', { name: 'Selected images' }).getByRole('listitem')).toHaveCount(2)
  await expect(page.getByRole('region', { name: 'Selected images' }).getByRole('listitem').first()).toContainText('Album Ω #/')
  await input.setInputFiles(folder)
  expect(await page.evaluate(() => ({ created: window.__testUrls.created.length, revoked: window.__testUrls.revoked.length }))).toEqual({ created: 4, revoked: 2 })
  expect(await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }))).toEqual({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('folder-preview.png') })
  await diagnostics.check()
})

test('ReUI developer controls remain available without the overlay and edit host numeric values', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 600 })
  const diagnostics = await openPreview(page)
  await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ controls: { value: false } }))
  const preview = page.getByRole('complementary', { name: 'Browser preview tools' })
  await expect(preview).toBeVisible()
  await expect(page.getByRole('group', { name: 'Slideshow controls' })).toHaveCount(0)
  await preview.getByRole('button', { name: 'Simulate Wallpaper Engine events' }).click()
  const fps = preview.getByRole('textbox', { name: 'Host FPS limit', exact: true })
  await fps.fill('0')
  await expect(preview.getByRole('button', { name: 'Decrease Host FPS limit', exact: true })).toBeDisabled()
  await expect(fps).toHaveValue('0')
  await preview.getByRole('button', { name: 'Increase Host FPS limit', exact: true }).click()
  await expect(fps).toHaveValue('1')
  const duration = preview.getByRole('textbox', { name: 'Transition duration (seconds)', exact: true })
  await duration.fill('1.4')
  await duration.press('ArrowUp')
  await expect(duration).toHaveValue('1.5')
  expect(JSON.parse(await preview.getByLabel('Received settings').textContent()).transitionseconds).toBe(1.5)
  const box = await preview.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  expect(box.y + box.height).toBeLessThanOrEqual(600)
  await page.screenshot({ path: testInfo.outputPath('developer-dark.png'), animations: 'disabled' })
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
  await page.screenshot({ path: testInfo.outputPath('developer-light.png'), animations: 'disabled' })
  await diagnostics.check()
})
