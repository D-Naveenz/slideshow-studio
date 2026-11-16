import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WallpaperRuntime } from './wallpaper/runtime.ts'

const runtime = new WallpaperRuntime(import.meta.env.DEV || new URLSearchParams(window.location.search).get('preview') === '1')
runtime.connect(window.wallpaperBridge)
import.meta.hot?.dispose(() => runtime.dispose())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App runtime={runtime} />
  </StrictMode>,
)
