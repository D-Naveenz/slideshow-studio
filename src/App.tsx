import './App.css'
import { useSyncExternalStore } from 'react'
import { PreviewTools } from './PreviewTools.tsx'
import type { WallpaperRuntime } from './wallpaper/runtime.ts'
import type { PlaybackController } from './slideshow/controller.ts'
import { WallpaperControls } from './ui/WallpaperControls.tsx'
import { appVersion } from './version.ts'

function App({ runtime, playback }: { runtime: WallpaperRuntime; playback: PlaybackController }) {
  const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot)
  const playing = useSyncExternalStore(playback.subscribe, playback.getSnapshot)
  return (
    <main className="wallpaper-shell" data-version={appVersion} data-source={snapshot.settings.source} data-fps={snapshot.fps} data-paused={playing.paused} data-phase={playing.phase} data-current={playing.current?.name || ''} data-transitioning={playing.transitioning}>
      <h1 className="visually-hidden">Slideshow Studio</h1>
      {playing.phase !== 'ready' ? <section className="playback-message" role="status">
        {playing.phase === 'loading' ? 'Loading image…' : playing.phase === 'empty' ? 'No images selected. Choose an image or folder in Wallpaper Engine.' : 'Unable to load the selected images. Choose another image or refresh the folder.'}
      </section> : null}
      {snapshot.preview ? <PreviewTools runtime={runtime} snapshot={snapshot} playback={playback} playing={playing} /> : null}
      {snapshot.settings.controls ? <WallpaperControls runtime={runtime} snapshot={snapshot} playback={playback} playing={playing} /> : null}
    </main>
  )
}

export default App
