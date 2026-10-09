import { useCallback, useEffect, useRef, useState } from 'react'
import { useControllable } from './useControllable.ts'
import type { Unit } from './timeline.ts'

export type PlaybackOptions = {
  unit: Unit
  /** Last position. May grow while a timeline loads. */
  end: number
  /** Still loading: reaching the end waits for more instead of stopping. */
  loading?: boolean
  position?: number
  defaultPosition?: number
  onPositionChange?: (position: number) => void
  playing?: boolean
  defaultPlaying?: boolean
  onPlayingChange?: (playing: boolean) => void
  /**
   * Steps per second for 'step' timelines (RLDS records no frame rate, so this is a display choice; default 10),
   * or a multiple of real time for 'second' timelines (default 1).
   */
  rate?: number
  defaultRate?: number
  onRateChange?: (rate: number) => void
  onEnd?: () => void
  /** Changing this (e.g. the timeline) resets uncontrolled position and playing. */
  resetKey?: unknown
  /** Uncontrolled playing value applied on reset; defaults to `defaultPlaying`. */
  playOnReset?: () => boolean
}

/** The playback clock. Step timelines move in whole steps; second timelines move continuously. */
export function usePlayback(o: PlaybackOptions) {
  const end = Math.max(0, o.end)
  const whole = o.unit === 'step'
  const [rawPosition, setPositionValue, setInnerPosition] = useControllable(o.position, o.defaultPosition ?? 0, o.onPositionChange)
  const [playing, setPlaying, setInnerPlaying] = useControllable(o.playing, o.defaultPlaying ?? false, o.onPlayingChange)
  const [rate, setRate] = useControllable(o.rate, o.defaultRate ?? (whole ? 10 : 1), o.onRateChange)
  const position = Math.min(end, Math.max(0, rawPosition))

  // Reset during render (React's "adjust state on prop change" pattern) so no frame shows the old position.
  const [key, setKey] = useState(o.resetKey)
  if (key !== o.resetKey) {
    setKey(o.resetKey)
    setInnerPosition(o.defaultPosition ?? 0)
    setInnerPlaying(o.playOnReset?.() ?? o.defaultPlaying ?? false)
  }

  const live = useRef({ position, exact: position, end, loading: o.loading, onEnd: o.onEnd })
  useEffect(() => {
    const l = live.current
    // Keep the fractional clock unless something else moved the position.
    if (position !== (whole ? Math.floor(l.exact) : l.exact)) l.exact = position
    Object.assign(l, { position, end, loading: o.loading, onEnd: o.onEnd })
  })

  const setPosition = useCallback(
    (p: number) => setPositionValue(Math.min(live.current.end, Math.max(0, whole ? Math.round(p) : p))),
    [setPositionValue, whole],
  )

  // `key` restarts the clock on a new timeline: auto-next stops the old loop and sets playing back to true in
  // one render, so `playing` alone never changes and an equal-length timeline would sit still.
  useEffect(() => {
    if (!playing) return
    let id = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const l = live.current
      l.exact = Math.min(l.end, l.exact + ((now - prev) / 1000) * rate)
      prev = now
      const next = whole ? Math.floor(l.exact) : l.exact
      if (next !== l.position) {
        l.position = next
        setPositionValue(next)
      }
      if (l.exact >= l.end && !l.loading) {
        setPlaying(false)
        l.onEnd?.()
        return
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing, rate, key, whole, setPositionValue, setPlaying])

  const toggle = useCallback(() => {
    if (!playing && position >= end && !o.loading) {
      live.current.exact = 0
      setPositionValue(0)
    }
    setPlaying(!playing)
  }, [playing, position, end, o.loading, setPositionValue, setPlaying])

  return { position, setPosition, playing, setPlaying, toggle, rate, setRate, end }
}
