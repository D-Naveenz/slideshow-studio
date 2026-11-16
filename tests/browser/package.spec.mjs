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
    const shell = page.locator('.wallpaper-shell')
    await expect(shell).toHaveAttribute('data-phase', 'ready')
    await expect(shell).toHaveAttribute('data-current', '1.jpg')
    const canvas = page.locator('.wallpaper-canvas')
    expect(await canvas.boundingBox()).toEqual({ x: 0, y: 0, ...viewport })
    expect(await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }))).toEqual(viewport)

    await expect(shell).toHaveAttribute('data-fps', '24')
    await expect(shell).toHaveAttribute('data-paused', 'true')
    await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ source: { value: 'image' } }))
    await expect(shell).toHaveAttribute('data-source', 'image')
    await expect(shell).toHaveAttribute('data-phase', 'empty')
    await page.evaluate(() => window.wallpaperPropertyListener.applyUserProperties({ source: { value: 'samples' } }))
    await expect(shell).toHaveAttribute('data-source', 'samples')
    await expect(shell).toHaveAttribute('data-phase', 'ready')
    expect(await page.locator('script[type="module"], link[rel="modulepreload"]').count()).toBe(0)
    expect(remote).toEqual([]); expect(failures).toEqual([]); expect(errors).toEqual([])
    await page.screenshot({ path: testInfo.outputPath('package.png') })
  })
}
