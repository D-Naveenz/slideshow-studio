import { useState } from 'react'
import type { ChangeEvent } from 'react'
import type { WallpaperRuntime, WallpaperSnapshot } from './wallpaper/runtime.ts'
import type { ImportKind } from './wallpaper/catalogue.ts'
import type { Settings } from './wallpaper/settings.ts'
import type { PlaybackController, PlaybackSnapshot } from './slideshow/controller.ts'

export function PreviewTools({ runtime, snapshot, playback, playing }: {
  runtime: WallpaperRuntime; snapshot: WallpaperSnapshot; playback: PlaybackController; playing: PlaybackSnapshot
}) {
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
        <p>Preview slideshow transitions, sizing, and backgrounds. The desktop toolbar arrives in the next batch.</p>
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
        <p><strong data-testid="source-count">{images.length}</strong> image {images.length === 1 ? 'reference' : 'references'}</p>
        {images.length ? <ul>{images.slice(0, 4).map(image => <li key={image.id}>{image.name}</li>)}</ul> : <p>No images selected. Choose an image or folder to begin.</p>}
        {images.length > 4 ? <p>And {images.length - 4} more.</p> : null}
      </section>
      <section aria-label="Playback preview" className="preview-playback">
        <p data-testid="renderer-name">{playing.renderer}</p>
        <p>Showing: <output data-testid="current-image">{playing.current?.name || 'None'}</output></p>
        {playing.incoming ? <p>Transitioning to: {playing.incoming.name}</p> : null}
        <p data-testid="playback-cache" data-cached={playing.cached} data-bytes={playing.estimatedBytes}>
          {playing.cached} prepared slides · {(playing.estimatedBytes / 1024 / 1024).toFixed(1)} MiB estimated, including render reserve
        </p>
        <p>{playing.preparing ? 'Preparing an image…' : playing.paused ? 'Playback paused' : 'Playback ready'}{playing.failed ? ` · ${playing.failed} skipped` : ''}</p>
        <div className="preview-navigation">
          <button type="button" onClick={playback.previous} disabled={!playing.canPrevious || playing.navigating}>Previous image</button>
          <button type="button" onClick={playback.togglePause}>{playing.userPaused ? 'Resume playback' : 'Pause playback'}</button>
          <button type="button" onClick={playback.next} disabled={!playing.canNext || playing.navigating}>Next image</button>
        </div>
      </section>
      <details>
        <summary>Simulate Wallpaper Engine events</summary>
        <div className="preview-field"><label htmlFor="preview-effect">Transition</label>
          <select id="preview-effect" value={settings.transition} onChange={event => window.wallpaperPropertyListener.applyUserProperties({ transition: { value: event.target.value } })}>
            <option value="fade">Fade</option><option value="slide">Slide</option><option value="instant">Instant</option>
          </select>
        </div>
        <label className="preview-field">Transition duration (seconds)
          <input type="number" min="0.1" max="10" step="0.1" value={settings.transitionseconds} onChange={event => window.wallpaperPropertyListener.applyUserProperties({ transitionseconds: { value: event.currentTarget.valueAsNumber } })} />
        </label>
        <div className="preview-field"><label htmlFor="preview-fit">Image sizing</label>
          <select id="preview-fit" value={settings.fit} onChange={event => window.wallpaperPropertyListener.applyUserProperties({ fit: { value: event.target.value } })}>
            <option value="fill">Fill</option><option value="fit">Fit</option>
          </select>
        </div>
        <div className="preview-field"><label htmlFor="preview-background">Fit background</label>
          <select id="preview-background" value={settings.background} onChange={event => window.wallpaperPropertyListener.applyUserProperties({ background: { value: event.target.value } })}>
            <option value="blur">Blurred image</option><option value="color">Solid color</option>
          </select>
        </div>
        <label className="preview-field">Background color<input type="color" value={settings.backgroundcolor} onChange={event => window.wallpaperPropertyListener.applyUserProperties({ backgroundcolor: { value: event.target.value } })} /></label>
        <label className="preview-field">Blur strength<input type="range" min="0" max="80" value={settings.blur} onChange={event => window.wallpaperPropertyListener.applyUserProperties({ blur: { value: event.currentTarget.valueAsNumber } })} /></label>
        <label className="preview-field">Image hold time (seconds)
          <input type="number" min="1" max="3600" value={settings.holdseconds} onChange={event => window.wallpaperPropertyListener.applyUserProperties({ holdseconds: { value: event.currentTarget.valueAsNumber } })} />
        </label>
        <label className="preview-checkbox"><input type="checkbox" checked={settings.shuffle} onChange={event => window.wallpaperPropertyListener.applyUserProperties({ shuffle: { value: event.currentTarget.checked } })} /> Shuffle images</label>
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
