import { useState } from 'react'
import type { ChangeEvent } from 'react'
import type { WallpaperRuntime, WallpaperSnapshot } from './wallpaper/runtime.ts'
import type { ImportKind } from './wallpaper/catalogue.ts'
import type { Settings } from './wallpaper/settings.ts'

export function PreviewTools({ runtime, snapshot }: { runtime: WallpaperRuntime; snapshot: WallpaperSnapshot }) {
  const [error, setError] = useState('')
  const { settings, images } = snapshot
  function importFiles(kind: ImportKind, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files || [])
    event.currentTarget.value = '' // Allow reselecting the same file/folder.
    if (!files.length) return
    try { runtime.importFiles(kind, files); setError('') }
    catch { setError('The selection could not be opened. Please try again.') }
  }
  return (
    <aside className="preview-tools" aria-label="Browser preview tools">
      <header>
        <p className="eyebrow">Development preview</p>
        <h2>Image sources</h2>
        <p>Inspect your selection here. Playback arrives in the next batch; the background stays on the sample.</p>
      </header>
      <div className="preview-field">
        <label htmlFor="preview-source">Image source</label>
        <select id="preview-source" value={settings.source} onChange={event => window.wallpaperPropertyListener.applyUserProperties({ source: { value: event.target.value as Settings['source'] } })}>
          <option value="samples">Bundled samples</option>
          <option value="image">Single image</option>
          <option value="directory">Image folder</option>
        </select>
      </div>
      <div className="preview-imports">
        <label className="preview-field">Choose image
          <input type="file" accept=".jpg,.jpeg,.png,.pnga,.webp,.bmp,.gif,.svg,.avif" onChange={event => importFiles('image', event)} />
        </label>
        <label className="preview-field">Choose folder
          <input type="file" multiple ref={element => { element?.setAttribute('webkitdirectory', '') }} onChange={event => importFiles('directory', event)} />
        </label>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <section aria-label="Selected images" className="preview-catalogue">
        <p><strong data-testid="source-count">{images.length}</strong> image {images.length === 1 ? 'reference' : 'references'} · not decoded</p>
        {images.length ? <ul>{images.slice(0, 4).map(image => <li key={image.id}>{image.name}</li>)}</ul> : <p>No images selected. Choose an image or folder to begin.</p>}
        {images.length > 4 ? <p>And {images.length - 4} more.</p> : null}
      </section>
      <details>
        <summary>Simulate Wallpaper Engine events</summary>
        <label className="preview-field">Host FPS limit
          <input type="number" min="0" value={snapshot.fps} onChange={event => window.wallpaperPropertyListener.applyGeneralProperties({ fps: event.currentTarget.valueAsNumber })} />
        </label>
        <button type="button" onClick={() => window.wallpaperPropertyListener.setPaused(!snapshot.paused)}>{snapshot.paused ? 'Resume host' : 'Pause host'}</button>
        <p className="preview-status" role="status">{snapshot.paused ? 'Host paused' : 'Host running'} · {snapshot.fps === 0 ? 'Uncapped' : `${snapshot.fps} FPS`}</p>
        <pre aria-label="Received settings">{JSON.stringify(settings, null, 2)}</pre>
      </details>
    </aside>
  )
}
