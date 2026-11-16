import { imageName, isImageName, localFileId, localFileUrl } from './paths.ts'
import type { Settings } from './settings.ts'

export interface ImageEntry { readonly id: string; readonly name: string; readonly url: string; readonly revision: number }
export type ImportKind = 'image' | 'directory'
export interface ObjectUrls { createObjectURL(file: File): string; revokeObjectURL(url: string): void }

const samples: readonly ImageEntry[] = Object.freeze(['1.jpg', '2.jpg', '2b.JPG', '3.jpg'].map(name => Object.freeze({
  id: `sample:${name}`, name, url: `./wallpapers/${encodeURIComponent(name)}`, revision: 0,
})))

function hostEntry(path: string, revision: number): ImageEntry | undefined {
  try {
    const url = localFileUrl(path); const name = imageName(url)
    if (!isImageName(name)) return undefined
    return Object.freeze({ id: localFileId(url), name, url, revision })
  } catch { return undefined }
}

export class ImageCatalogue {
  private directory = new Map<string, ImageEntry>()
  private single?: ImageEntry
  private directoryLocation?: string
  private preview: Partial<Record<ImportKind, readonly ImageEntry[]>> = {}
  private revision = 0
  private urls: ObjectUrls
  constructor(urls: ObjectUrls) { this.urls = urls }

  setSingle(path: string) {
    const next = path ? hostEntry(path, ++this.revision) : undefined
    this.single = next
    this.clearPreview('image')
  }
  setDirectory(path: string) {
    const location = path ? localFileId(localFileUrl(path)) : ''
    // File callbacks can precede directory properties, including when replacing a folder.
    // Preserve already-received entries belonging to the new root, and remove the old root.
    for (const id of this.directory.keys()) if (!location || !id.startsWith(location.replace(/\/$/, '') + '/')) this.directory.delete(id)
    this.directoryLocation = location
    this.clearPreview('directory')
  }
  changeFiles(files: readonly string[]) {
    this.clearPreview('directory')
    for (const path of files) {
      if (typeof path !== 'string') continue
      const image = hostEntry(path, ++this.revision)
      if (image) this.directory.set(image.id, image)
    }
  }
  removeFiles(files: readonly string[]) {
    this.clearPreview('directory')
    for (const path of files) {
      if (typeof path !== 'string') continue
      try { this.directory.delete(localFileId(localFileUrl(path))) } catch { /* Ignore malformed paths. */ }
    }
  }
  images(source: Settings['source']): readonly ImageEntry[] {
    if (source === 'samples') return samples
    if (this.preview[source]) return this.preview[source]
    if (source === 'image') return this.single ? [this.single] : []
    const prefix = this.directoryLocation?.replace(/\/$/, '')
    return [...this.directory.values()].filter(image => !prefix || image.id.startsWith(prefix + '/'))
  }
  importFiles(kind: ImportKind, files: readonly File[]) {
    const accepted = files.filter(file => isImageName(file.name))
    const selected = kind === 'image' ? accepted.slice(0, 1) : accepted
    const next: ImageEntry[] = []
    try {
      for (const file of selected) {
        const url = this.urls.createObjectURL(file)
        next.push(Object.freeze({ id: `preview:${url}`, name: file.webkitRelativePath || file.name, url, revision: ++this.revision }))
      }
    } catch (error) {
      next.forEach(image => this.urls.revokeObjectURL(image.url))
      throw error
    }
    this.clearPreview(kind)
    this.preview[kind] = Object.freeze(next)
  }
  clearPreview(kind: ImportKind) {
    this.preview[kind]?.forEach(image => this.urls.revokeObjectURL(image.url))
    delete this.preview[kind]
  }
  dispose() { this.clearPreview('image'); this.clearPreview('directory'); this.directory.clear(); this.single = undefined }
}
