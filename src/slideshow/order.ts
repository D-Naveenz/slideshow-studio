import type { ImageEntry } from '../wallpaper/catalogue.ts'

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })
export function naturalImages(images: readonly ImageEntry[]) {
  return [...images].sort((a, b) => collator.compare(a.name, b.name) || a.id.localeCompare(b.id))
}

/** Forward shuffle uses a bag; backward/forward navigation follows actual visits. */
export class PlaybackOrder {
  private ids: string[] = []
  private bag: string[] = []
  private history: string[] = []
  private cursor = -1
  private shuffle = false
  private random: () => number
  constructor(random = Math.random) { this.random = random }
  get count() { return this.ids.length }
  get current() { return this.history[this.cursor] }
  get previous() { return this.history[this.cursor - 1] }
  configure(images: readonly ImageEntry[], shuffle: boolean, current?: string) {
    this.ids = naturalImages(images).map(image => image.id)
    this.shuffle = shuffle
    const valid = new Set(this.ids)
    const before = this.history.slice(0, this.cursor + 1).filter(id => valid.has(id))
    const after = this.history.slice(this.cursor + 1).filter(id => valid.has(id))
    this.history = [...before, ...after]; this.cursor = before.length - 1
    if (!current || !valid.has(current)) { this.history = []; this.cursor = -1 }
    else if (this.current !== current) { this.history = [current]; this.cursor = 0 }
    this.bag = []
    if (shuffle && current) this.refill(current)
  }
  private refill(exclude?: string) {
    this.bag = this.ids.filter(id => id !== exclude)
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1)); [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
    }
    if (this.bag.length > 1 && this.bag[0] === this.current) [this.bag[0], this.bag[1]] = [this.bag[1], this.bag[0]]
  }
  next(): string | undefined {
    if (this.cursor + 1 < this.history.length) return this.history[this.cursor + 1]
    if (!this.ids.length) return undefined
    if (!this.shuffle) return this.ids[(this.ids.indexOf(this.current) + 1) % this.ids.length]
    if (!this.bag.length) this.refill()
    return this.bag[0]
  }
  commit(id: string, direction: -1 | 0 | 1) {
    if (direction === 0 && this.current === id) return
    if (direction === -1 && this.previous === id) { this.cursor--; return }
    if (direction === 1 && this.history[this.cursor + 1] === id) { this.cursor++; return }
    this.history = this.history.slice(0, this.cursor + 1)
    this.history.push(id); this.cursor++
    if (this.bag[0] === id) this.bag.shift()
    if (this.history.length > 512) { this.history.shift(); this.cursor-- }
  }
  reject(id: string) {
    this.ids = this.ids.filter(value => value !== id); this.bag = this.bag.filter(value => value !== id)
    const before = this.history.slice(0, this.cursor + 1).filter(value => value !== id)
    this.history = [...before, ...this.history.slice(this.cursor + 1).filter(value => value !== id)]
    this.cursor = before.length - 1
  }
}
