import { useId, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { NumberControl } from './ui/NumberControl.tsx'
import type { WallpaperRuntime, WallpaperSnapshot } from './wallpaper/runtime.ts'
import type { ImportKind } from './wallpaper/catalogue.ts'
import { definitions } from './wallpaper/settings.ts'
import type { PlaybackController, PlaybackSnapshot } from './slideshow/controller.ts'

export function PreviewTools({ runtime, snapshot, playback, playing }: {
  runtime: WallpaperRuntime; snapshot: WallpaperSnapshot; playback: PlaybackController; playing: PlaybackSnapshot
}) {
  const [error, setError] = useState('')
  const id = useId()
  const { settings, images } = snapshot
  function importFiles(kind: ImportKind, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files || [])
    event.currentTarget.value = '' // Allow reselecting the same file/folder.
    if (!files.length) return
    try { runtime.importFiles(kind, files); setError('') }
    catch { setError('The selection could not be opened. Please try again.') }
  }
  function select(key: 'source' | 'transition' | 'fit' | 'background', label: string) {
    return <div className="grid min-w-0 gap-2">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <NativeSelect id={`${id}-${key}`} size="sm" className="w-full" value={settings[key]}
        onChange={event => window.wallpaperPropertyListener.applyUserProperties({ [key]: { value: event.currentTarget.value } })}>
        {definitions[key].options!.map(option => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
      </NativeSelect>
    </div>
  }
  function number(key: 'holdseconds' | 'transitionseconds', label: string) {
    return <NumberControl label={label} value={settings[key]} min={definitions[key].min!} max={definitions[key].max}
      step={definitions[key].fraction ? 0.1 : 1}
      onChange={value => window.wallpaperPropertyListener.applyUserProperties({ [key]: { value } })} />
  }
  return <Card size="sm" role="complementary" aria-label="Browser preview tools" className="preview-tools absolute inset-y-4 right-4 min-h-0 w-[min(24rem,calc(100vw-2rem))]">
    <CardHeader className="shrink-0">
      <p className="text-xs text-muted-foreground">Development preview</p>
      <CardTitle><h2 className="tracking-tight">Image sources</h2></CardTitle>
      <CardDescription>Preview local sources and host events.</CardDescription>
    </CardHeader>
    <CardContent className="preview-scroll grid min-h-0 gap-4 overflow-auto">
      {select('source', 'Image source')}
      <div className="grid gap-4">
        <div className="grid gap-2"><Label htmlFor={`${id}-image`}>Choose image</Label>
          <Input id={`${id}-image`} type="file" accept=".jpg,.jpeg,.png,.pnga,.webp,.bmp,.gif,.svg,.avif" onChange={event => importFiles('image', event)} />
        </div>
        <div className="grid gap-2"><Label htmlFor={`${id}-folder`}>Choose folder</Label>
          <Input id={`${id}-folder`} type="file" multiple ref={element => { element?.setAttribute('webkitdirectory', '') }} onChange={event => importFiles('directory', event)} />
        </div>
      </div>
      {error ? <p role="alert" className="text-sm">{error}</p> : null}
      <Separator />
      <section aria-label="Selected images" className="grid gap-2 text-xs">
        <p><strong data-testid="source-count">{images.length}</strong> image {images.length === 1 ? 'reference' : 'references'}</p>
        {images.length ? <ul className="grid gap-1">{images.slice(0, 4).map(image => <li className="break-words" key={image.id}>{image.name}</li>)}</ul> : <p>No images selected. Choose an image or folder to begin.</p>}
        {images.length > 4 ? <p>And {images.length - 4} more.</p> : null}
      </section>
      <Separator />
      <section aria-label="Playback preview" className="grid gap-2 text-xs">
        <p data-testid="renderer-name">{playing.renderer}</p>
        <p className="break-words">Showing: <output data-testid="current-image">{playing.current?.name || 'None'}</output></p>
        {playing.incoming ? <p className="break-words">Transitioning to: {playing.incoming.name}</p> : null}
        <p data-testid="playback-cache" data-cached={playing.cached} data-bytes={playing.estimatedBytes}>
          {playing.cached} prepared slides · {(playing.estimatedBytes / 1024 / 1024).toFixed(1)} MiB estimated, including render reserve
        </p>
        <p role="status">{playing.preparing ? 'Preparing an image…' : playing.paused ? 'Playback paused' : 'Playback ready'}{playing.failed ? ` · ${playing.failed} skipped` : ''}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={playback.previous} disabled={!playing.canPrevious || playing.navigating}>Previous image</Button>
          <Button type="button" size="sm" variant="outline" onClick={playback.togglePause} disabled={!playing.current}>{playing.userPaused ? 'Resume playback' : 'Pause playback'}</Button>
          <Button type="button" size="sm" variant="outline" onClick={playback.next} disabled={!playing.canNext || playing.navigating}>Next image</Button>
        </div>
      </section>
      <Separator />
      <Collapsible>
        <CollapsibleTrigger asChild><Button type="button" size="sm" variant="outline" className="w-full justify-between">Simulate Wallpaper Engine events<ChevronDown aria-hidden="true" /></Button></CollapsibleTrigger>
        <CollapsibleContent className="grid gap-4 pt-4">
          {select('transition', 'Transition')}
          {number('transitionseconds', 'Transition duration (seconds)')}
          {select('fit', 'Image sizing')}
          {select('background', 'Fit background')}
          <div className="grid gap-2"><Label htmlFor={`${id}-color`}>Background color</Label><Input id={`${id}-color`} type="color" value={settings.backgroundcolor} onChange={event => window.wallpaperPropertyListener.applyUserProperties({ backgroundcolor: { value: event.currentTarget.value } })} /></div>
          <div className="grid gap-3"><Label id={`${id}-blur`}>Blur strength</Label><Slider aria-labelledby={`${id}-blur`} min={definitions.blur.min} max={definitions.blur.max} value={[settings.blur]} onValueChange={([value]) => window.wallpaperPropertyListener.applyUserProperties({ blur: { value } })} /></div>
          {number('holdseconds', 'Image hold time (seconds)')}
          <div className="flex items-center justify-between gap-3"><Label htmlFor={`${id}-shuffle`}>Shuffle images</Label><Switch id={`${id}-shuffle`} checked={settings.shuffle} onCheckedChange={value => window.wallpaperPropertyListener.applyUserProperties({ shuffle: { value } })} /></div>
          <NumberControl label="Host FPS limit" min={0} value={snapshot.fps} onChange={fps => window.wallpaperPropertyListener.applyGeneralProperties({ fps })} />
          <Button type="button" size="sm" variant="outline" onClick={() => window.wallpaperPropertyListener.setPaused(!snapshot.paused)}>{snapshot.paused ? 'Resume host' : 'Pause host'}</Button>
          <p className="preview-status text-xs text-muted-foreground" role="status">{snapshot.paused ? 'Host paused' : 'Host running'} · {snapshot.fps === 0 ? 'Uncapped' : `${snapshot.fps} FPS`}</p>
          <pre className="overflow-auto text-xs" aria-label="Received settings">{JSON.stringify(settings, null, 2)}</pre>
        </CollapsibleContent>
      </Collapsible>
    </CardContent>
  </Card>
}
