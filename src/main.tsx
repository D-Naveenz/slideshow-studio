import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WallpaperRuntime } from './wallpaper/runtime.ts'
import { createWallpaperRenderer } from './slideshow/resilient-renderer.ts'
import { PlaybackController } from './slideshow/controller.ts'

const query = new URLSearchParams(window.location.search)
document.documentElement.classList.add('dark')
const runtime = new WallpaperRuntime(import.meta.env.DEV || query.get('preview') === '1')
runtime.connect(window.wallpaperBridge)
const root = createRoot(document.getElementById('root')!)
let playback: PlaybackController | undefined
let alive = true
let resizeTimer: ReturnType<typeof setTimeout>
const visibility = () => playback?.suspend(document.hidden)
const resize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => playback?.resize(), 150) }

async function start() {
  const renderer = await createWallpaperRenderer(document.getElementById('stage')!, query.get('renderer') === 'canvas')
  if (!alive) { renderer.dispose(); return }
  const player = new PlaybackController(runtime, renderer)
  playback = player
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('resize', resize)
  visibility()
  root.render(<StrictMode><App runtime={runtime} playback={player} /></StrictMode>)
}
void start().catch(() => {
  runtime.dispose()
  if (alive) root.render(<p role="alert">This device could not start the wallpaper renderer.</p>)
})
import.meta.hot?.dispose(() => {
  alive = false
  document.removeEventListener('visibilitychange', visibility); window.removeEventListener('resize', resize)
  clearTimeout(resizeTimer); playback?.dispose(); runtime.dispose(); root.unmount()
})
