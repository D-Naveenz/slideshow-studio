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
  page.on('requestfailed', request => errors.push(request.url()))
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
    async check() {
      expect(errors).toEqual([])
      expect(requests.filter(url => /^(?:https?|wss?|blob):/.test(url))).toEqual([])
      // Only the packaging sample may load; selecting a folder never fetches its images.
      expect(requests.filter(url => url.startsWith('file:') && !url.startsWith(new URL('.', previewUrl).href))).toEqual([])
    },
  }
}

test('host properties and directory deltas update the preview without eager loading', async ({ page }) => {
  const diagnostics = await openPreview(page)
  await page.evaluate(() => {
    const host = window.wallpaperPropertyListener
    host.userDirectoryFilesAddedOrChanged('otherproperty', ['C:/ignored.jpg'])
    host.userDirectoryFilesAddedOrChanged('imagedirectory', Array.from({ length: 150 }, (_, i) => `C:/Album/${i}.JPG`))
    host.applyUserProperties({ source: { value: 'directory' }, imagedirectory: { value: 'C:/Album' }, shuffle: { value: true }, holdseconds: { value: 45 }, backgroundcolor: { value: '1 0.5 0' } })
    host.applyUserProperties({ shuffle: { value: false }, transition: { value: 'invalid' } })
  })
  await expect(page.getByTestId('source-count')).toHaveText('150')
  const settings = await page.getByLabel('Received settings').textContent()
  expect(JSON.parse(settings)).toMatchObject({ shuffle: false, holdseconds: 45, transition: 'fade', backgroundcolor: '#ff8000' })
  await page.evaluate(() => window.wallpaperPropertyListener.userDirectoryFilesRemoved('imagedirectory', ['c:\\album\\0.jpg']))
  await expect(page.getByTestId('source-count')).toHaveText('149')
  await page.evaluate(() => window.wallpaperPropertyListener.userDirectoryFilesAddedOrChanged('imagedirectory', ['C:/Album/1.JPG']))
  await expect(page.getByTestId('source-count')).toHaveText('149')
  await page.getByText('Simulate Wallpaper Engine events').click()
  await page.getByLabel('Host FPS limit').fill('0')
  await page.getByRole('button', { name: 'Pause host' }).click()
  await expect(page.getByRole('status')).toHaveText('Host paused · Uncapped')
  await page.getByRole('button', { name: 'Resume host' }).click()
  await expect(page.getByRole('status')).toHaveText('Host running · Uncapped')
  await diagnostics.check()
})

test('single file imports stay session-local, preserve names, and revoke replaced URLs', async ({ page }, testInfo) => {
  const diagnostics = await openPreview(page)
  const file = { name: '夜 # 100%.JPG', mimeType: 'image/jpeg', buffer: sample }
  const input = page.getByLabel('Choose image', { exact: true })
  await input.setInputFiles(file)
  await expect(page.getByTestId('source-count')).toHaveText('1')
  await expect(page.getByRole('listitem')).toHaveText(file.name)
  await input.setInputFiles(file)
  expect(await page.evaluate(() => ({ created: window.__testUrls.created.length, revoked: window.__testUrls.revoked.length }))).toEqual({ created: 2, revoked: 1 })
  await page.getByLabel('Image source', { exact: true }).selectOption('samples')
  await expect(page.getByTestId('source-count')).toHaveText('4')
  await page.getByLabel('Image source', { exact: true }).selectOption('image')
  await expect(page.getByTestId('source-count')).toHaveText('1')
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
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await expect(page.getByRole('listitem').first()).toContainText('Album Ω #/')
  await input.setInputFiles(folder)
  expect(await page.evaluate(() => ({ created: window.__testUrls.created.length, revoked: window.__testUrls.revoked.length }))).toEqual({ created: 4, revoked: 2 })
  expect(await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }))).toEqual({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('folder-preview.png') })
  await diagnostics.check()
})
