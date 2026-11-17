import * as Dialog from '@radix-ui/react-dialog'
import { RotateCcw, X } from 'lucide-react'
import { useId } from 'react'
import type { WallpaperRuntime, WallpaperSnapshot } from '../wallpaper/runtime.ts'
import { definitions } from '../wallpaper/settings.ts'
import type { OverlayKey } from '../wallpaper/preferences.ts'
import { appVersion } from '../version.ts'

export function SettingsPanel({ runtime, snapshot }: { runtime: WallpaperRuntime; snapshot: WallpaperSnapshot }) {
  const { settings, overrides } = snapshot
  const id = useId()
  function select(key: 'transition' | 'fit' | 'background' | 'toolbarposition', label: string) {
    return <div className="settings-field"><label htmlFor={`${id}-${key}`}>{label}</label>
      <select id={`${id}-${key}`} value={settings[key]} onChange={event => runtime.setOverrides({ [key]: event.currentTarget.value })}>
        {definitions[key].options!.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  }
  function number(key: 'holdseconds' | 'transitionseconds' | 'toolbarmargin', label: string, disabled = false) {
    return <label className="settings-field">{label}
      <input type="number" min={definitions[key].min} max={definitions[key].max} step={definitions[key].fraction ? 0.1 : 1}
        value={settings[key]} disabled={disabled} onChange={event => runtime.setOverrides({ [key]: event.currentTarget.valueAsNumber })} />
    </label>
  }
  const source = definitions.source.options!.find(option => option.value === settings.source)?.label
  const customized = (key: OverlayKey) => overrides.includes(key)
  return <Dialog.Portal>
    <Dialog.Overlay className="settings-scrim" />
    <Dialog.Content className="settings-panel">
      <header className="settings-heading">
        <div><p className="eyebrow">Slideshow Studio</p><Dialog.Title>Slideshow settings</Dialog.Title></div>
        <Dialog.Close className="icon-button" aria-label="Close settings" title="Close settings (Esc)"><X aria-hidden="true" size={20} /></Dialog.Close>
      </header>
      <Dialog.Description className="settings-description">Make this wallpaper your own. Adjust playback and appearance below.</Dialog.Description>
      <section className="settings-source" aria-label="Wallpaper source"><span className="settings-label">Image source</span><strong>{source}</strong><p>Choose images and folders in Wallpaper Engine’s properties panel.</p></section>
      <fieldset><legend>Playback</legend>
        {number('holdseconds', 'Hold time (seconds)')}
        <label className="settings-check"><span>Shuffle images</span><input type="checkbox" checked={settings.shuffle} onChange={event => runtime.setOverrides({ shuffle: event.currentTarget.checked })} /></label>
        <div className="settings-grid">{select('transition', 'Transition')}{number('transitionseconds', 'Duration (seconds)', settings.transition === 'instant')}</div>
      </fieldset>
      <fieldset><legend>Appearance</legend>
        {select('fit', 'Image sizing')}
        {settings.fit === 'fit' ? <>
          {select('background', 'Fit background')}
          {settings.background === 'blur' ? <div className="settings-field"><label htmlFor={`${id}-blur`}>Blur strength</label><span className="range-value">{settings.blur} px</span>
            <input id={`${id}-blur`} type="range" min={definitions.blur.min} max={definitions.blur.max} step="1" value={settings.blur} onChange={event => runtime.setOverrides({ blur: event.currentTarget.valueAsNumber })} />
          </div> : <label className="settings-color">Background color<input type="color" value={settings.backgroundcolor} onChange={event => runtime.setOverrides({ backgroundcolor: event.currentTarget.value })} /></label>}
        </> : <p className="settings-hint">Fill crops the image to cover the screen. Fit keeps the entire image visible.</p>}
      </fieldset>
      <fieldset><legend>Controls</legend>
        {select('toolbarposition', 'Toolbar position')}
        {number('toolbarmargin', 'Edge clearance (pixels)')}
        <p className="settings-hint">Choose an edge away from desktop icons. For bottom placement, increase clearance to keep controls above the taskbar. Placement can also be changed in Wallpaper Engine’s properties panel.</p>
      </fieldset>
      <footer className="settings-footer">
        <p role="status">{overrides.length ? `${overrides.length} local ${overrides.length === 1 ? 'override' : 'overrides'}` : 'Using Wallpaper Engine settings'}</p>
        <button type="button" className="reset-button" onClick={runtime.resetOverrides} disabled={!overrides.length}><RotateCcw aria-hidden="true" size={15} />Reset to Wallpaper Engine settings</button>
        {customized('fit') || customized('background') ? <p className="settings-hint">Changes in Wallpaper Engine replace matching local overrides.</p> : null}
        <p className="settings-shortcuts"><kbd>←</kbd> <kbd>→</kbd> Navigate <span>·</span> <kbd>Space</kbd> Pause <span>·</span> <kbd>S</kbd> Settings</p>
        <p className="settings-hint">Slideshow Studio v{appVersion}</p>
      </footer>
    </Dialog.Content>
  </Dialog.Portal>
}
