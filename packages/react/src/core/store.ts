import { createContext, useContext, useSyncExternalStore } from 'react'
import type { Timeline, Unit } from './timeline.ts'

export type PlayerState = {
  /** May fill in while loading; select `version` alongside anything read from it. */
  timeline: Timeline
  version: number
  unit: Unit
  /** Last position (step index or seconds). */
  end: number
  loading: boolean
  position: number
  setPosition: (position: number) => void
  /** Moves `delta` samples along the reference track (the first camera, else the first chart). */
  step: (delta: number) => void
  playing: boolean
  toggle: () => void
  setPlaying: (playing: boolean) => void
  /** Steps per second ('step'), or a multiple of real time ('second'). */
  rate: number
  setRate: (rate: number) => void
  autoNext: boolean
  setAutoNext: (on: boolean) => void
  hasPrev: boolean
  hasNext: boolean
  prevEpisode: () => void
  nextEpisode: () => void
}

export type PlayerStore = {
  get: () => PlayerState
  set: (s: PlayerState) => void
  subscribe: (fn: () => void) => () => void
}

export function createPlayerStore(initial: PlayerState): PlayerStore {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set: (s) => {
      state = s
      for (const fn of listeners) fn()
    },
    subscribe: (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

export const PlayerContext = createContext<PlayerStore | null>(null)

const whole = (s: PlayerState) => s

/**
 * Reads player state inside `Player.Root`. Re-renders only when the selected value changes, so select
 * primitives (or stable references like `timeline`), not freshly built objects.
 */
export function usePlayer(): PlayerState
export function usePlayer<T>(selector: (s: PlayerState) => T): T
export function usePlayer<T>(selector: (s: PlayerState) => T = whole as (s: PlayerState) => T): T {
  const store = useContext(PlayerContext)
  if (!store) throw new Error('usePlayer must be used inside <Player.Root>.')
  return useSyncExternalStore(store.subscribe, () => selector(store.get()))
}
