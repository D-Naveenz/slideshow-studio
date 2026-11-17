import { RotateCcw, X } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type {
  WallpaperRuntime,
  WallpaperSnapshot,
} from "../wallpaper/runtime.ts";
import { definitions } from "../wallpaper/settings.ts";
import { appVersion } from "../version.ts";
import { NumberControl } from "./NumberControl.tsx";

export function SettingsPanel({
  runtime,
  snapshot,
}: {
  runtime: WallpaperRuntime;
  snapshot: WallpaperSnapshot;
}) {
  const { settings, overrides } = snapshot;
  const id = useId();
  function select(
    key: "transition" | "fit" | "background" | "toolbarposition",
    label: string,
  ) {
    return (
      <div className="grid min-w-0 gap-2">
        <Label htmlFor={`${id}-${key}`}>{label}</Label>
        <NativeSelect
          id={`${id}-${key}`}
          size="sm"
          className="w-full"
          value={settings[key]}
          onChange={(event) =>
            runtime.setOverrides({ [key]: event.currentTarget.value })
          }
        >
          {definitions[key].options!.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
    );
  }
  function number(
    key: "holdseconds" | "transitionseconds" | "toolbarmargin",
    label: string,
    disabled = false,
  ) {
    return (
      <NumberControl
        label={label}
        value={settings[key]}
        min={definitions[key].min!}
        max={definitions[key].max}
        step={definitions[key].fraction ? 0.1 : 1}
        disabled={disabled}
        onChange={(value) => runtime.setOverrides({ [key]: value })}
      />
    );
  }
  const source = definitions.source.options!.find(
    (option) => option.value === settings.source,
  )?.label;
  return (
    <DialogContent
      className="settings-panel flex h-[min(48rem,calc(100dvh-2rem))] min-h-0 flex-col sm:max-w-lg"
      showCloseButton={false}
    >
      <DialogHeader className="shrink-0 gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Slideshow Studio
            </p>
            <DialogTitle className="tracking-tight">
              Slideshow settings
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close settings"
              title="Close settings (Esc)"
            >
              <X aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        <DialogDescription>
          Adjust playback, appearance, and desktop controls.
        </DialogDescription>
      </DialogHeader>
      <Separator />
      <div className="settings-scroll grid min-h-0 gap-6 overflow-auto p-1 text-sm">
        <section className="grid gap-1" aria-label="Wallpaper source">
          <p className="text-xs text-muted-foreground">Image source</p>
          <strong className="font-medium">{source}</strong>
          <p className="text-xs text-muted-foreground">
            Choose images and folders in Wallpaper Engine’s properties panel.
          </p>
        </section>
        <Separator />
        <fieldset className="grid min-w-0 gap-4">
          <legend className="mb-4 font-semibold tracking-tight">
            Playback
          </legend>
          {number("holdseconds", "Hold time (seconds)")}
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`${id}-shuffle`}>Shuffle images</Label>
            <Switch
              id={`${id}-shuffle`}
              checked={settings.shuffle}
              onCheckedChange={(shuffle) => runtime.setOverrides({ shuffle })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
            {select("transition", "Transition")}
            {number(
              "transitionseconds",
              "Duration (seconds)",
              settings.transition === "instant",
            )}
          </div>
        </fieldset>
        <Separator />
        <fieldset className="grid min-w-0 gap-4">
          <legend className="mb-4 font-semibold tracking-tight">
            Appearance
          </legend>
          {select("fit", "Image sizing")}
          {settings.fit === "fit" ? (
            <>
              {select("background", "Fit background")}
              {settings.background === "blur" ? (
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label id={`${id}-blur-label`}>Blur strength</Label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {settings.blur} px
                    </span>
                  </div>
                  <Slider
                    aria-labelledby={`${id}-blur-label`}
                    min={definitions.blur.min}
                    max={definitions.blur.max}
                    step={1}
                    value={[settings.blur]}
                    onValueChange={([blur]) => runtime.setOverrides({ blur })}
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor={`${id}-color`}>Background color</Label>
                  <Input
                    id={`${id}-color`}
                    type="color"
                    value={settings.backgroundcolor}
                    onChange={(event) =>
                      runtime.setOverrides({
                        backgroundcolor: event.currentTarget.value,
                      })
                    }
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Fill crops the image to cover the screen. Fit keeps the entire
              image visible.
            </p>
          )}
        </fieldset>
        <Separator />
        <fieldset className="grid min-w-0 gap-4">
          <legend className="mb-4 font-semibold tracking-tight">
            Controls
          </legend>
          {select("toolbarposition", "Toolbar position")}
          {number("toolbarmargin", "Edge clearance (pixels)")}
          <p className="text-xs text-muted-foreground">
            Choose an edge away from desktop icons. For bottom placement,
            increase clearance to keep controls above the taskbar. Placement can
            also be changed in Wallpaper Engine’s properties panel.
          </p>
        </fieldset>
        <Separator />
        <footer className="grid gap-3">
          <p role="status" className="text-xs text-muted-foreground">
            {overrides.length
              ? `${overrides.length} local ${overrides.length === 1 ? "override" : "overrides"}`
              : "Using Wallpaper Engine settings"}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={runtime.resetOverrides}
            disabled={!overrides.length}
          >
            <RotateCcw aria-hidden="true" />
            Reset to Wallpaper Engine settings
          </Button>
          {overrides.length ? (
            <p className="text-xs text-muted-foreground">
              Changes in Wallpaper Engine replace matching local overrides.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            <kbd>←</kbd> <kbd>→</kbd> Navigate · <kbd>Space</kbd> Pause ·{" "}
            <kbd>S</kbd> Settings
          </p>
          <p className="text-xs text-muted-foreground">
            Slideshow Studio v{appVersion}
          </p>
        </footer>
      </div>
    </DialogContent>
  );
}
