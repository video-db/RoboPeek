import { useCallback, useEffect, useRef, useState } from 'react'
import { useControllable } from './useControllable.ts'

export type PlaybackOptions = {
  /** Seconds. May grow while the file loads. */
  duration: number
  /** Still loading: reaching the end waits for more data instead of stopping. */
  loading?: boolean
  time?: number
  defaultTime?: number
  onTimeChange?: (time: number) => void
  playing?: boolean
  defaultPlaying?: boolean
  onPlayingChange?: (playing: boolean) => void
  /** Playback rate; 1 is real time (MCAP records real timestamps). */
  speed?: number
  defaultSpeed?: number
  onSpeedChange?: (speed: number) => void
  onEnd?: () => void
  /** Changing this (e.g. the recording) resets uncontrolled time and playing. */
  resetKey?: unknown
  /** Uncontrolled playing value applied on reset; defaults to `defaultPlaying`. */
  playOnReset?: () => boolean
}

/** Real-time clock for one recording. Each of time / playing / speed is controlled or uncontrolled. */
export function usePlayback(o: PlaybackOptions) {
  const end = Math.max(0, o.duration)
  const [rawTime, setTimeValue, setInnerTime] = useControllable(o.time, o.defaultTime ?? 0, o.onTimeChange)
  const [playing, setPlaying, setInnerPlaying] = useControllable(o.playing, o.defaultPlaying ?? false, o.onPlayingChange)
  const [speed, setSpeed] = useControllable(o.speed, o.defaultSpeed ?? 1, o.onSpeedChange)
  const time = Math.min(end, Math.max(0, rawTime))

  // Reset during render (React's "adjust state on prop change" pattern) so no frame shows the old time.
  const [key, setKey] = useState(o.resetKey)
  if (key !== o.resetKey) {
    setKey(o.resetKey)
    setInnerTime(o.defaultTime ?? 0)
    setInnerPlaying(o.playOnReset?.() ?? o.defaultPlaying ?? false)
  }

  const live = useRef({ time, end, loading: o.loading, onEnd: o.onEnd })
  useEffect(() => {
    live.current = { time, end, loading: o.loading, onEnd: o.onEnd }
  })

  const setTime = useCallback((t: number) => setTimeValue(Math.min(live.current.end, Math.max(0, t))), [setTimeValue])

  useEffect(() => {
    if (!playing) return
    let id = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const l = live.current
      const next = Math.min(l.end, l.time + ((now - prev) / 1000) * speed)
      prev = now
      if (next !== l.time) {
        l.time = next
        setTimeValue(next)
      }
      if (next >= l.end && !l.loading) {
        setPlaying(false)
        l.onEnd?.()
        return
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing, speed, key, setTimeValue, setPlaying])

  const toggle = useCallback(() => {
    if (!playing && time >= end && !o.loading) setTimeValue(0)
    setPlaying(!playing)
  }, [playing, time, end, o.loading, setTimeValue, setPlaying])

  return { time, setTime, playing, setPlaying, toggle, speed, setSpeed, duration: end }
}
