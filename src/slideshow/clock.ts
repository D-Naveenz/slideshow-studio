export interface Scheduler {
  now(): number
  set(callback: () => void, delay: number): unknown
  clear(handle: unknown): void
}
export const browserScheduler: Scheduler = {
  now: () => performance.now(),
  set: (callback, delay) => setTimeout(callback, delay),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export class HoldClock {
  private deadline = 0
  private pausedAt?: number
  start(now: number, duration: number) { this.deadline = now + duration; if (this.pausedAt !== undefined) this.pausedAt = now }
  remaining(now: number) { return Math.max(0, this.deadline - (this.pausedAt ?? now)) }
  pause(now: number) { this.pausedAt ??= now }
  resume(now: number) { if (this.pausedAt !== undefined) { this.deadline += now - this.pausedAt; this.pausedAt = undefined } }
}
