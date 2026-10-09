import { createContext, useContext, useSyncExternalStore } from 'react'
import type { Recording } from '@videodb/robopeek-mcap'

export type PlayerState = {
  /** Mutable while loading; select `version` alongside anything read from it. */
  recording: Recording
  version: number
  /** Seconds the timeline spans. */
  duration: number
  loading: boolean
  time: number
  setTime: (time: number) => void
  /** Moves `delta` frames along the reference track (the first camera, else the first chart). */
  step: (delta: number) => void
  playing: boolean
  toggle: () => void
  setPlaying: (playing: boolean) => void
  speed: number
  setSpeed: (speed: number) => void
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
 * primitives (or stable references like `recording`), not freshly built objects.
 */
export function usePlayer(): PlayerState
export function usePlayer<T>(selector: (s: PlayerState) => T): T
export function usePlayer<T>(selector: (s: PlayerState) => T = whole as (s: PlayerState) => T): T {
  const store = useContext(PlayerContext)
  if (!store) throw new Error('usePlayer must be used inside <Player.Root>.')
  return useSyncExternalStore(store.subscribe, () => selector(store.get()))
}
