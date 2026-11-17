import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Settings2,
} from "lucide-react";
import type {
  WallpaperRuntime,
  WallpaperSnapshot,
} from "../wallpaper/runtime.ts";
import type {
  PlaybackController,
  PlaybackSnapshot,
} from "../slideshow/controller.ts";
import { SettingsPanel } from "./SettingsPanel.tsx";
import { naturalImages } from "../slideshow/order.ts";
import { paginationPages } from "./pagination.ts";
import "./controls.css";

export function WallpaperControls({
  runtime,
  snapshot,
  playback,
  playing,
}: {
  runtime: WallpaperRuntime;
  snapshot: WallpaperSnapshot;
  playback: PlaybackController;
  playing: PlaybackSnapshot;
}) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const toolbar = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const armHide = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (
        !open &&
        !hovered.current &&
        !toolbar.current?.contains(document.activeElement)
      )
        setVisible(false);
    }, 3000);
  }, [open]);
  const reveal = useCallback(() => {
    setVisible(true);
    armHide();
  }, [armHide]);
  const hasCurrent = !!playing.current;
  useEffect(() => {
    function move() {
      reveal();
    }
    function key(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.isComposing
      )
        return;
      // Native fields/buttons retain their own editing and keyboard activation behavior.
      if (
        open ||
        (event.target instanceof Element &&
          event.target.closest(
            'input, select, textarea, button, a, [contenteditable]:not([contenteditable="false"]), [role="slider"]',
          ))
      )
        return;
      if (event.key === "ArrowLeft") playback.previous();
      else if (event.key === "ArrowRight") playback.next();
      else if (event.code === "Space" || event.key === " ") {
        if (!hasCurrent) return;
        playback.togglePause();
      } else if (event.key.toLowerCase() === "s") setOpen(true);
      else return;
      event.preventDefault();
      reveal();
    }
    armHide();
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("keydown", key);
    };
  }, [open, playback, hasCurrent, reveal, armHide]);
  const canNavigate = !playing.navigating;
  const externalPause = playing.paused && !playing.userPaused;
  const images = useMemo(
    () => naturalImages(snapshot.images),
    [snapshot.images],
  );
  const positions = useMemo(
    () => new Map(images.map((image, index) => [image.id, index + 1])),
    [images],
  );
  const position = playing.current ? positions.get(playing.current.id) || 0 : 0;
  const total = images.length;
  // Bound the rendered controls regardless of catalogue size, keeping the active page in view.
  const pages = paginationPages(total, position);
  const vertical =
    snapshot.settings.toolbarposition === "left" ||
    snapshot.settings.toolbarposition === "right";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div
        className="toolbar-placement"
        data-position={snapshot.settings.toolbarposition}
        style={
          {
            "--toolbar-margin": `${snapshot.settings.toolbarmargin}px`,
          } as CSSProperties
        }
      >
        {/* Keep the pagination-card example's p-2 / p-0 spacing; actions are buttons, not page links. */}
        <Card
          ref={toolbar}
          className="wallpaper-toolbar p-2 transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-100"
          role="group"
          aria-label="Slideshow controls"
          data-visible={visible || open}
          onPointerEnter={() => {
            hovered.current = true;
            reveal();
          }}
          onPointerLeave={() => {
            hovered.current = false;
            reveal();
          }}
          onFocus={reveal}
          onBlur={reveal}
        >
          <CardContent className="p-0">
            <Pagination aria-label="Slideshow navigation">
              <PaginationContent className="toolbar-items">
                <PaginationItem>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="Previous image"
                    title="Previous image (←)"
                    disabled={!playing.canPrevious || !canNavigate}
                    onClick={playback.previous}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                </PaginationItem>
                {pages.map((page) => (
                  <PaginationItem key={page}>
                    {typeof page === "number" ? (
                      <Button
                        type="button"
                        variant={page === position ? "outline" : "ghost"}
                        size={page >= 10000 ? "default" : "icon"}
                        className="tabular-nums"
                        aria-label={`Go to image ${page}`}
                        aria-current={page === position ? "page" : undefined}
                        disabled={!hasCurrent || !canNavigate}
                        onClick={() => playback.select(images[page - 1].id)}
                      >
                        {page}
                      </Button>
                    ) : (
                      <PaginationEllipsis />
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="Next image"
                    title="Next image (→)"
                    disabled={!playing.canNext || !canNavigate}
                    onClick={playback.next}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </PaginationItem>
                <PaginationItem className="toolbar-divider">
                  <Separator
                    orientation={vertical ? "horizontal" : "vertical"}
                  />
                </PaginationItem>
                <PaginationItem>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={
                      playing.userPaused ? "Resume playback" : "Pause playback"
                    }
                    title={
                      externalPause
                        ? "The system has paused playback"
                        : "Play/pause (Space)"
                    }
                    disabled={!playing.current}
                    onClick={playback.togglePause}
                  >
                    {playing.userPaused ? (
                      <Play aria-hidden="true" fill="currentColor" />
                    ) : (
                      <Pause aria-hidden="true" fill="currentColor" />
                    )}
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Open settings"
                      title="Settings (S)"
                    >
                      <Settings2 aria-hidden="true" />
                    </Button>
                  </DialogTrigger>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <span role="status" aria-label="Image position" className="sr-only">
              {position}/{total}
            </span>
          </CardContent>
        </Card>
      </div>
      <SettingsPanel runtime={runtime} snapshot={snapshot} />
    </Dialog>
  );
}
