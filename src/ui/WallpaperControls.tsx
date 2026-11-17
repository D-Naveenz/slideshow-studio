import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Frame, FramePanel } from '@/components/reui/frame'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft, ChevronRight, Pause, Play, Settings2 } from 'lucide-react'
import type { WallpaperRuntime, WallpaperSnapshot } from '../wallpaper/runtime.ts'
import type { PlaybackController, PlaybackSnapshot } from '../slideshow/controller.ts'
import { SettingsPanel } from './SettingsPanel.tsx'
import './controls.css'

export function WallpaperControls({ runtime, snapshot, playback, playing }: {
  runtime: WallpaperRuntime; snapshot: WallpaperSnapshot; playback: PlaybackController; playing: PlaybackSnapshot
}) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const toolbar = useRef<HTMLDivElement>(null)
  const hovered = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const armHide = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (!open && !hovered.current && !toolbar.current?.contains(document.activeElement)) setVisible(false)
    }, 3000)
  }, [open])
  const reveal = useCallback(() => { setVisible(true); armHide() }, [armHide])
  const hasCurrent = !!playing.current
  useEffect(() => {
    function move() { reveal() }
    function key(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return
      // Native fields/buttons retain their own editing and keyboard activation behavior.
      if (open || event.target instanceof Element && event.target.closest('input, select, textarea, button, a, [contenteditable]:not([contenteditable="false"]), [role="slider"]')) return
      if (event.key === 'ArrowLeft') playback.previous()
      else if (event.key === 'ArrowRight') playback.next()
      else if (event.code === 'Space' || event.key === ' ') { if (!hasCurrent) return; playback.togglePause() }
      else if (event.key.toLowerCase() === 's') setOpen(true)
      else return
      event.preventDefault(); reveal()
    }
    armHide()
    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('keydown', key)
    return () => { clearTimeout(timer.current); document.removeEventListener('pointermove', move); document.removeEventListener('keydown', key) }
  }, [open, playback, hasCurrent, reveal, armHide])
  const canNavigate = !playing.navigating
  const externalPause = playing.paused && !playing.userPaused
  return <Dialog open={open} onOpenChange={setOpen}>
    <div className="toolbar-placement" data-position={snapshot.settings.toolbarposition}
      style={{ '--toolbar-margin': `${snapshot.settings.toolbarmargin}px` } as CSSProperties}>
    <Frame ref={toolbar} spacing="xs" className="wallpaper-toolbar bg-card/95 text-sm text-card-foreground transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-100" role="group" aria-label="Slideshow controls" data-visible={visible || open}
      onPointerEnter={() => { hovered.current = true; reveal() }} onPointerLeave={() => { hovered.current = false; reveal() }}
      onFocus={reveal} onBlur={reveal}>
      <FramePanel fit className="toolbar-items">
      <div className="toolbar-caption" aria-hidden="true"><span className="text-xs text-muted-foreground">{externalPause ? 'Paused by system' : playing.userPaused ? 'Paused' : 'Now showing'}</span><span className="toolbar-filename" title={playing.current?.name}>{playing.current?.name || 'No image selected'}</span></div>
      <span className="visually-hidden">{externalPause ? 'Paused by system' : playing.userPaused ? 'Paused' : 'Now showing'}: {playing.current?.name || 'No image selected'}</span>
      <Separator orientation="vertical" className="toolbar-divider toolbar-caption-divider" />
      <Button type="button" variant="ghost" size="icon" aria-label="Previous image" title="Previous image (←)" disabled={!playing.canPrevious || !canNavigate} onClick={playback.previous}><ChevronLeft aria-hidden="true" /></Button>
      <Button type="button" size="icon" aria-label={playing.userPaused ? 'Resume playback' : 'Pause playback'} title={externalPause ? 'The system has paused playback' : 'Play/pause (Space)'} disabled={!playing.current} onClick={playback.togglePause}>
        {playing.userPaused ? <Play aria-hidden="true" size={18} fill="currentColor" /> : <Pause aria-hidden="true" size={18} fill="currentColor" />}
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Next image" title="Next image (→)" disabled={!playing.canNext || !canNavigate} onClick={playback.next}><ChevronRight aria-hidden="true" /></Button>
      <Separator orientation="vertical" className="toolbar-divider" />
      <DialogTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label="Open settings" title="Settings (S)"><Settings2 aria-hidden="true" /></Button></DialogTrigger>
      </FramePanel>
    </Frame>
    </div>
    <SettingsPanel runtime={runtime} snapshot={snapshot} />
  </Dialog>
}
