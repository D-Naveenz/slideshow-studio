import { localFileUrl } from './paths.ts'

export interface Settings {
  source: 'samples' | 'image' | 'directory'
  imagefile: string
  imagedirectory: string
  holdseconds: number
  transition: 'fade' | 'slide' | 'instant'
  transitionseconds: number
  shuffle: boolean
  fit: 'fill' | 'fit'
  background: 'blur' | 'color'
  backgroundcolor: string
  blur: number
  controls: boolean
  toolbarposition: 'top' | 'bottom' | 'left' | 'right'
  toolbarmargin: number
}

export const defaults: Readonly<Settings> = Object.freeze({
  source: 'samples', imagefile: '', imagedirectory: '', holdseconds: 30,
  transition: 'fade', transitionseconds: 1, shuffle: false, fit: 'fill',
  background: 'blur', backgroundcolor: '#000000', blur: 24, controls: true,
  toolbarposition: 'top', toolbarmargin: 24,
})

interface PropertyDefinition {
  type: 'combo' | 'slider' | 'bool' | 'file' | 'directory' | 'color'
  text: string
  options?: { label: string; value: string }[]
  min?: number
  max?: number
  fraction?: boolean
  precision?: number
  fileType?: string
  mode?: string
  condition?: string
}

export const definitions: Record<keyof Settings, PropertyDefinition> = {
  source: { type: 'combo', text: 'Image source', options: [
    { label: 'Bundled samples', value: 'samples' }, { label: 'Single image', value: 'image' }, { label: 'Image folder', value: 'directory' },
  ] },
  imagefile: { type: 'file', text: 'Image', fileType: 'image', condition: 'source.value == "image"' },
  imagedirectory: { type: 'directory', text: 'Image folder', fileType: 'image', mode: 'fetchall', condition: 'source.value == "directory"' },
  holdseconds: { type: 'slider', text: 'Image hold time (seconds)', min: 1, max: 3600, fraction: false },
  transition: { type: 'combo', text: 'Transition', options: [
    { label: 'Fade', value: 'fade' }, { label: 'Slide', value: 'slide' }, { label: 'Instant', value: 'instant' },
  ] },
  transitionseconds: { type: 'slider', text: 'Transition duration (seconds)', min: 0.1, max: 10, fraction: true, precision: 2, condition: 'transition.value != "instant"' },
  shuffle: { type: 'bool', text: 'Shuffle images' },
  fit: { type: 'combo', text: 'Image sizing', options: [{ label: 'Fill', value: 'fill' }, { label: 'Fit', value: 'fit' }] },
  background: { type: 'combo', text: 'Fit background', options: [{ label: 'Blurred image', value: 'blur' }, { label: 'Solid color', value: 'color' }], condition: 'fit.value == "fit"' },
  backgroundcolor: { type: 'color', text: 'Background color' },
  blur: { type: 'slider', text: 'Blur strength (pixels)', min: 0, max: 80, fraction: false, condition: 'fit.value == "fit" && background.value == "blur"' },
  controls: { type: 'bool', text: 'Enable navigation and settings overlay' },
  toolbarposition: { type: 'combo', text: 'Toolbar position', options: [
    { label: 'Top center', value: 'top' }, { label: 'Bottom center', value: 'bottom' },
    { label: 'Left center', value: 'left' }, { label: 'Right center', value: 'right' },
  ] },
  toolbarmargin: { type: 'slider', text: 'Toolbar edge clearance (pixels; increase to clear taskbar)', min: 8, max: 256, fraction: false },
}

function normalize(key: keyof Settings, value: unknown): Settings[keyof Settings] | undefined {
  const definition = definitions[key]
  if (definition.type === 'combo') return definition.options?.some(option => option.value === value) ? String(value) : undefined
  if (definition.type === 'bool') return typeof value === 'boolean' ? value : undefined
  if (definition.type === 'slider') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
    const clamped = Math.max(definition.min!, Math.min(definition.max!, value))
    return definition.fraction ? Math.round(clamped * 100) / 100 : Math.round(clamped)
  }
  if (typeof value !== 'string') return undefined
  if (definition.type === 'file' || definition.type === 'directory') {
    if (value === '') return ''
    try { localFileUrl(value); return value } catch { return undefined }
  }
  if (/^#[a-f\d]{6}$/i.test(value)) return value.toLowerCase()
  const channels = value.trim().split(/\s+/)
  if (channels.length !== 3 || channels.some(channel => channel === '' || !Number.isFinite(Number(channel)))) return undefined
  return '#' + channels.map(channel => Math.round(Math.max(0, Math.min(1, Number(channel))) * 255).toString(16).padStart(2, '0')).join('')
}

export function settingsPatch(properties: unknown): Partial<Settings> {
  const result: Partial<Settings> = {}
  if (!properties || typeof properties !== 'object') return result
  for (const key of Object.keys(defaults) as (keyof Settings)[]) {
    if (!Object.hasOwn(properties, key)) continue
    const property: unknown = (properties as Record<string, unknown>)[key]
    if (!property || typeof property !== 'object' || !Object.hasOwn(property, 'value')) continue
    const value = normalize(key, (property as { value: unknown }).value)
    if (value !== undefined) Object.assign(result, { [key]: value })
  }
  return result
}

/** Generated project.json and runtime validation share the same keys, bounds, and defaults. */
export function projectProperties() {
  return Object.fromEntries((Object.keys(defaults) as (keyof Settings)[]).map((key, index) => [key, {
    ...definitions[key], order: index + 1,
    value: key === 'backgroundcolor'
      ? [1, 3, 5].map(offset => parseInt(defaults.backgroundcolor.slice(offset, offset + 2), 16) / 255).join(' ')
      : defaults[key],
  }]))
}
