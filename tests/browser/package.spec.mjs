import { cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { test, expect } from '@playwright/test'

const dist = fileURLToPath(new URL('../../dist/', import.meta.url))

for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 2560, height: 1080 }]) {
  test(`relocated local package starts offline at ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const folder = testInfo.outputPath('Wallpaper package Ω # test')
    cpSync(dist, folder, { recursive: true })
    const errors = []; const failures = []; const remote = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('requestfailed', request => failures.push(`${request.url()}: ${request.failure()?.errorText}`))
    page.on('request', request => { if (/^(?:https?|wss?):/.test(request.url())) remote.push(request.url()) })

    // Simulate host events arriving synchronously as the early bridge installs its listener.
    await page.addInitScript(() => {
      let listener
      Object.defineProperty(window, 'wallpaperPropertyListener', {
        configurable: true,
        get() { return listener },
        set(value) {
          listener = value
          value.applyGeneralProperties({ fps: 24 })
          value.setPaused(true)
        },
      })
    })
    await page.goto(pathToFileURL(resolve(folder, 'index.html')).href)
    await expect(page.getByRole('heading', { name: 'Slideshow Studio' })).toBeVisible()
    const image = page.locator('.wallpaper-sample')
    await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
    expect(await image.boundingBox()).toEqual({ x: 0, y: 0, ...viewport })
    await expect(image).toHaveCSS('object-fit', 'cover')
    expect(await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }))).toEqual(viewport)

    const events = await page.evaluate(() => {
      const received = []
      const disconnect = window.wallpaperBridge.connect(event => received.push(event))
      window.wallpaperPropertyListener.applyUserProperties({ example: { value: false } })
      disconnect()
      return received
    })
    expect(events).toEqual([
      { type: 'general-properties', properties: { fps: 24 } },
      { type: 'paused', paused: true },
      { type: 'user-properties', properties: { example: { value: false } } },
    ])
    expect(await page.locator('script[type="module"], link[rel="modulepreload"]').count()).toBe(0)
    expect(remote).toEqual([]); expect(failures).toEqual([]); expect(errors).toEqual([])
    await page.screenshot({ path: testInfo.outputPath('package.png') })
  })
}
