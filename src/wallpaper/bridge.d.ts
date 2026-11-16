export type UserProperties = Record<string, { value: unknown }>
export type GeneralProperties = { fps?: number; [key: string]: unknown }

export type WallpaperEvent =
  | { type: 'user-properties'; properties: UserProperties }
  | { type: 'general-properties'; properties: GeneralProperties }
  | { type: 'paused'; paused: boolean }
  | { type: 'directory-changed'; property: string; files: string[] }
  | { type: 'directory-removed'; property: string; files: string[] }

export interface WallpaperBridge {
  /** One consumer at a time; buffered events drain synchronously in arrival order. */
  connect(consumer: (event: WallpaperEvent) => void): () => void
}

export interface WallpaperPropertyListener {
  applyUserProperties(properties: UserProperties): void
  applyGeneralProperties(properties: GeneralProperties): void
  setPaused(paused: boolean): void
  userDirectoryFilesAddedOrChanged(property: string, files: string[]): void
  userDirectoryFilesRemoved(property: string, files: string[]): void
}

declare global {
  interface Window {
    wallpaperBridge: WallpaperBridge
    wallpaperPropertyListener: WallpaperPropertyListener
  }
}
