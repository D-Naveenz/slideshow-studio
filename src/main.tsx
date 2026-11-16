import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WallpaperRuntime } from './wallpaper/runtime.ts'
import { CanvasRenderer } from './slideshow/renderer.ts'
import { PlaybackController } from './slideshow/controller.ts'

const runtime = new WallpaperRuntime(import.meta.env.DEV || new URLSearchParams(window.location.search).get('preview') === '1')
runtime.connect(window.wallpaperBridge)
const playback = new PlaybackController(runtime, new CanvasRenderer(document.getElementById('stage')!))
const visibility = () => playback.suspend(document.hidden)
const resize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => playback.resize(), 150) }
let resizeTimer: ReturnType<typeof setTimeout>
document.addEventListener('visibilitychange', visibility)
window.addEventListener('resize', resize)
visibility()
import.meta.hot?.dispose(() => {
  document.removeEventListener('visibilitychange', visibility); window.removeEventListener('resize', resize)
  clearTimeout(resizeTimer); playback.dispose(); runtime.dispose()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App runtime={runtime} playback={playback} />
  </StrictMode>,
)
