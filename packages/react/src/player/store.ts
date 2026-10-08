import { createContext, useContext, useSyncExternalStore } from 'react'
import type { Episode } from '@videodb/robopeek-rlds'

export type PlayerState = {
  episode: Episode
  length: number
  step: number
  setStep: (step: number) => void
  playing: boolean
  toggle: () => void
  setPlaying: (playing: boolean) => void
  fps: number
  setFps: (fps: number) => void
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
 * primitives (or stable references like `episode`), not freshly built objects.
 */
export function usePlayer(): PlayerState
export function usePlayer<T>(selector: (s: PlayerState) => T): T
export function usePlayer<T>(selector: (s: PlayerState) => T = whole as (s: PlayerState) => T): T {
  const store = useContext(PlayerContext)
  if (!store) throw new Error('usePlayer must be used inside <Player.Root>.')
  return useSyncExternalStore(store.subscribe, () => selector(store.get()))
}
