import { defaults, settingsPatch } from './settings.ts'
import type { Settings } from './settings.ts'

// Native source selection and the master controls switch always belong to the host.
export const overlayKeys = ['holdseconds', 'transition', 'transitionseconds', 'shuffle', 'fit', 'background', 'backgroundcolor', 'blur', 'toolbarposition', 'toolbarmargin'] as const
export type OverlayKey = typeof overlayKeys[number]
export type OverlaySettings = Pick<Settings, OverlayKey>
export type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export const preferenceKey = 'slideshow-studio.preferences.v1'

export function browserStorage(): PreferenceStorage | undefined {
  try { return globalThis.localStorage } catch { return undefined }
}

function validatedOverrides(values: unknown): Partial<OverlaySettings> {
  if (!values || typeof values !== 'object') return {}
  const properties = Object.fromEntries(overlayKeys.filter(key => Object.hasOwn(values, key)).map(key => [key, { value: (values as Record<string, unknown>)[key] }]))
  return settingsPatch(properties)
}

/** Owns only settings precedence/persistence, independent of UI and image resources. */
export class SettingsPreferences {
  private host: Settings = { ...defaults }
  private overrides: Partial<OverlaySettings> = {}
  private storage?: PreferenceStorage
  constructor(storage?: PreferenceStorage) {
    this.storage = storage
    try {
      const saved = JSON.parse(storage?.getItem(preferenceKey) || 'null')
      if (saved?.version === 1) this.overrides = validatedOverrides(saved.values)
    } catch { /* Missing, corrupt, or blocked storage leaves defaults usable. */ }
  }
  get settings(): Readonly<Settings> { return Object.freeze({ ...this.host, ...this.overrides }) }
  get keys(): readonly OverlayKey[] { return Object.freeze(overlayKeys.filter(key => Object.hasOwn(this.overrides, key))) }
  applyHost(patch: Partial<Settings>, initial: boolean) {
    let cleared = false
    if (!initial) for (const key of overlayKeys) {
      if (Object.hasOwn(patch, key) && patch[key] !== this.host[key] && Object.hasOwn(this.overrides, key)) {
        delete this.overrides[key]; cleared = true
      }
    }
    Object.assign(this.host, patch)
    if (cleared) this.save()
  }
  update(values: Partial<OverlaySettings>) {
    Object.assign(this.overrides, validatedOverrides(values)); this.save()
  }
  reset() { this.overrides = {}; this.save() }
  private save() {
    try {
      if (Object.keys(this.overrides).length) this.storage?.setItem(preferenceKey, JSON.stringify({ version: 1, values: this.overrides }))
      else this.storage?.removeItem(preferenceKey)
    } catch { /* Session changes still work when persistence is unavailable. */ }
  }
}
