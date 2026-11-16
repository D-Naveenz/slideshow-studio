import { test, expect } from '@playwright/test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const url = pathToFileURL(resolve(root, 'dist/index.html')).href
const toolbar = page => page.getByRole('group', { name: 'Slideshow controls', includeHidden: true })
const dialog = page => page.getByRole('dialog', { name: 'Slideshow settings' })

async function boot(page, { clock = false, preview = false, storageFailure } = {}) {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  if (clock) {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'))
  }
  await page.addInitScript(failure => {
    if (failure === 'access') Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Blocked', 'SecurityError') } })
    if (failure === 'write') {
      Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') }
      Storage.prototype.removeItem = () => { throw new DOMException('Blocked', 'SecurityError') }
    }
    let listener
    Object.defineProperty(window, 'wallpaperPropertyListener', { configurable: true, get: () => listener, set(value) {
      listener = value
      value.applyUserProperties({ holdseconds: { value: 3600 }, transition: { value: 'instant' }, fit: { value: 'fill' } })
    } })
  }, storageFailure)
  await page.goto(url + (preview ? '?preview=1' : ''))
  await expect(page.locator('main')).toHaveAttribute('data-current', '1.jpg')
  return errors
}

async function open(page) {
  await page.mouse.move(10, 10)
  await toolbar(page).getByRole('button', { name: 'Open settings' }).click()
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page).getByText(`Slideshow Studio v${version}`, { exact: true })).toBeAttached()
  await expect(page.locator('main')).toHaveAttribute('data-version', version)
}

test('toolbar navigation and shortcuts work without stealing field/button input', async ({ page }) => {
  const errors = await boot(page)
  const controls = toolbar(page)
  await expect(controls.getByRole('button', { name: 'Previous image' })).toBeDisabled()
  await controls.getByRole('button', { name: 'Next image' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-current', '2.jpg')
  await controls.getByRole('button', { name: 'Pause playback' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-paused', 'true')
  // Native Space activation must toggle exactly once, rather than also taking the global shortcut.
  await controls.getByRole('button', { name: 'Resume playback' }).press('Space')
  await expect(page.locator('main')).toHaveAttribute('data-paused', 'false')
  await page.evaluate(() => document.activeElement.blur())
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('main')).toHaveAttribute('data-current', '1.jpg')
  await page.keyboard.press('Space')
  await expect(page.locator('main')).toHaveAttribute('data-paused', 'true')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('main')).toHaveAttribute('data-current', '2.jpg')
  await page.keyboard.press('s')
  await expect(dialog(page)).toBeVisible()
  const hold = dialog(page).getByRole('spinbutton', { name: 'Hold time (seconds)' })
  await hold.focus(); await hold.press('ArrowLeft'); await hold.press('s')
  await expect(page.locator('main')).toHaveAttribute('data-current', '2.jpg')
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toHaveCount(0)
  await expect(controls.getByRole('button', { name: 'Open settings' })).toBeFocused()
  await page.evaluate(() => document.activeElement.blur())
  await page.keyboard.press('Control+ArrowRight')
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', repeat: true, bubbles: true })))
  await expect(page.locator('main')).toHaveAttribute('data-current', '2.jpg')
  expect(errors).toEqual([])
})

test('controls hide after three seconds, stay for hover/focus/dialog, and return focus on dismissal', async ({ page }) => {
  const errors = await boot(page, { clock: true })
  const controls = toolbar(page)
  await page.clock.runFor(3100)
  await expect(controls).toHaveAttribute('data-visible', 'false')
  // Hidden controls remain in the tab order and reveal immediately on keyboard focus.
  await page.keyboard.press('Tab')
  await expect(controls.getByRole('button', { name: 'Pause playback' })).toBeFocused()
  await expect(controls).toHaveAttribute('data-visible', 'true')
  await page.evaluate(() => document.activeElement.blur()); await page.clock.runFor(3100)
  await expect(controls).toHaveAttribute('data-visible', 'false')
  await page.mouse.move(20, 20)
  await expect(controls).toHaveAttribute('data-visible', 'true')
  await controls.hover(); await page.clock.runFor(4000)
  await expect(controls).toHaveAttribute('data-visible', 'true')
  await page.mouse.move(20, 20); await page.clock.runFor(3100)
  await expect(controls).toHaveAttribute('data-visible', 'false')
  await page.keyboard.press('s')
  await expect(dialog(page)).toBeVisible()
  await page.clock.runFor(4000)
  await expect(controls).toHaveAttribute('data-visible', 'true')
  // Radix traps both forward and backward focus inside the dialog.
  const close = dialog(page).getByRole('button', { name: 'Close settings' })
  await close.focus(); await page.keyboard.press('Shift+Tab')
  expect(await dialog(page).evaluate(element => element.contains(document.activeElement))).toBe(true)
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog(page).evaluate(element => element.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await page.clock.runFor(20) // Radix defers focus restoration until after unmount.
  await expect(controls.getByRole('button', { name: 'Open settings' })).toBeFocused()
  await page.clock.runFor(4000)
  await expect(controls).toHaveAttribute('data-visible', 'true')
  await page.evaluate(() => document.activeElement.blur()); await page.clock.runFor(3100)
  await expect(controls).toHaveAttribute('data-visible', 'false')
  expect(errors).toEqual([])
})

test('settings persist across reload, merge with host values, clear matching changes, and reset', async ({ page }, testInfo) => {
  const errors = await boot(page)
  await open(page)
  await expect(dialog(page).getByRole('spinbutton', { name: 'Duration (seconds)' })).toBeDisabled()
  await dialog(page).getByRole('spinbutton', { name: 'Hold time (seconds)' }).fill('90')
  await dialog(page).getByLabel('Transition', { exact: true }).selectOption('slide')
  await expect(dialog(page).getByRole('spinbutton', { name: 'Duration (seconds)' })).toBeEnabled()
  await dialog(page).getByLabel('Image sizing', { exact: true }).selectOption('fit')
  await dialog(page).getByLabel('Fit background', { exact: true }).selectOption('color')
  await dialog(page).getByLabel('Background color', { exact: true }).fill('#315a78')
  expect(await dialog(page).locator('input[type="file"]').count()).toBe(0)
  await page.screenshot({ path: testInfo.outputPath('settings-desktop.png') })
  await page.reload()
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'ready')
  await open(page)
  await expect(dialog(page).getByRole('spinbutton', { name: 'Hold time (seconds)' })).toHaveValue('90')
  await expect(dialog(page).getByLabel('Image sizing', { exact: true })).toHaveValue('fit')
  await expect(dialog(page).getByLabel('Background color', { exact: true })).toHaveValue('#315a78')
  await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ holdseconds: { value: 120 } }))
  await expect(dialog(page).getByRole('spinbutton', { name: 'Hold time (seconds)' })).toHaveValue('120')
  await expect(dialog(page).getByLabel('Image sizing', { exact: true })).toHaveValue('fit')
  await dialog(page).getByRole('button', { name: 'Reset to Wallpaper Engine settings' }).click()
  await expect(dialog(page).getByRole('spinbutton', { name: 'Hold time (seconds)' })).toHaveValue('120')
  await expect(dialog(page).getByLabel('Image sizing', { exact: true })).toHaveValue('fill')
  await expect(dialog(page).getByLabel('Transition', { exact: true })).toHaveValue('instant')
  await expect(dialog(page).getByRole('button', { name: 'Reset to Wallpaper Engine settings' })).toBeDisabled()
  expect(await page.evaluate(() => localStorage.getItem('slideshow-studio.preferences.v1'))).toBeNull()
  expect(errors).toEqual([])
})

for (const failure of ['access', 'write']) test(`settings remain usable when storage ${failure} fails`, async ({ page }) => {
  const errors = await boot(page, { storageFailure: failure })
  await open(page)
  await dialog(page).getByRole('spinbutton', { name: 'Hold time (seconds)' }).fill('44')
  await expect(dialog(page).getByRole('spinbutton', { name: 'Hold time (seconds)' })).toHaveValue('44')
  await dialog(page).getByRole('button', { name: 'Reset to Wallpaper Engine settings' }).click()
  await expect(dialog(page).getByRole('spinbutton', { name: 'Hold time (seconds)' })).toHaveValue('3600')
  expect(errors).toEqual([])
})

test('host controls switch dismisses settings and disables shortcuts; empty/single-image sources disable navigation', async ({ page }) => {
  const errors = await boot(page, { preview: true })
  await open(page)
  await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ controls: { value: false } }))
  await expect(dialog(page)).toHaveCount(0); await expect(toolbar(page)).toHaveCount(0)
  await page.keyboard.press('s'); await page.keyboard.press('Space'); await page.keyboard.press('ArrowRight')
  await expect(dialog(page)).toHaveCount(0)
  await expect(page.locator('main')).toHaveAttribute('data-current', '1.jpg')
  await expect(page.locator('main')).toHaveAttribute('data-paused', 'false')
  await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ controls: { value: true }, source: { value: 'image' }, imagefile: { value: '' } }))
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'empty')
  for (const name of ['Next image', 'Previous image', 'Pause playback']) await expect(toolbar(page).getByRole('button', { name })).toBeDisabled()
  await page.getByLabel('Choose image', { exact: true }).setInputFiles({ name: 'single.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="green"/></svg>') })
  await expect(page.locator('main')).toHaveAttribute('data-current', 'single.svg')
  for (const name of ['Next image', 'Previous image']) await expect(toolbar(page).getByRole('button', { name })).toBeDisabled()
  await expect(toolbar(page).getByRole('button', { name: 'Pause playback' })).toBeEnabled()
  expect(errors).toEqual([])
})

test('portrait settings fit the viewport and allow scrolling to reset and close', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 600 })
  const errors = await boot(page)
  await open(page)
  await dialog(page).getByLabel('Image sizing', { exact: true }).selectOption('fit')
  await dialog(page).getByLabel('Blur strength').press('End')
  await expect(dialog(page).getByLabel('Blur strength')).toHaveValue('80')
  const box = await dialog(page).boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390); expect(box.y + box.height).toBeLessThanOrEqual(600)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.screenshot({ path: testInfo.outputPath('settings-portrait.png') })
  await dialog(page).getByRole('button', { name: 'Reset to Wallpaper Engine settings' }).click()
  await dialog(page).getByRole('button', { name: 'Close settings' }).click()
  await expect(dialog(page)).toHaveCount(0)
  expect(errors).toEqual([])
})
