import './App.css'
import { useSyncExternalStore } from 'react'
import { PreviewTools } from './PreviewTools.tsx'
import type { WallpaperRuntime } from './wallpaper/runtime.ts'

function App({ runtime }: { runtime: WallpaperRuntime }) {
  const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot)
  const sourceLabel = { samples: 'Bundled samples', image: 'Single image', directory: 'Image folder' }[snapshot.settings.source]
  return (
    <main className={`wallpaper-shell${snapshot.preview ? ' has-preview' : ''}`} data-source={snapshot.settings.source} data-fps={snapshot.fps} data-paused={snapshot.paused}>
      <img className="wallpaper-sample" src="./wallpapers/1.jpg" alt="" />
      <section className="package-note" aria-labelledby="app-title">
        <p className="eyebrow">A space for your images</p>
        <h1 id="app-title">Slideshow Studio</h1>
        <p>{sourceLabel} · {snapshot.images.length} image {snapshot.images.length === 1 ? 'reference' : 'references'}</p>
        <p className="package-status">Static sample · Image sources connected. Playback arrives in the next batch.</p>
      </section>
      {snapshot.preview ? <PreviewTools runtime={runtime} snapshot={snapshot} /> : null}
    </main>
  )
}

export default App
