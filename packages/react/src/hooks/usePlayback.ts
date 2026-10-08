import { useCallback, useEffect, useRef, useState } from 'react'
import { useControllable } from './useControllable.ts'

export type PlaybackOptions = {
  length: number
  step?: number
  defaultStep?: number
  onStepChange?: (step: number) => void
  playing?: boolean
  defaultPlaying?: boolean
  onPlayingChange?: (playing: boolean) => void
  fps?: number
  /** RLDS records no frame rate, so this is a display choice, not the capture rate. */
  defaultFps?: number
  onFpsChange?: (fps: number) => void
  onEnd?: () => void
  /** Changing this (e.g. the episode) resets uncontrolled step and playing. */
  resetKey?: unknown
  /** Uncontrolled playing value applied on reset; defaults to `defaultPlaying`. */
  playOnReset?: () => boolean
}

/** Frame clock for one episode. Each of step / playing / fps is controlled or uncontrolled. */
export function usePlayback(o: PlaybackOptions) {
  const last = Math.max(0, o.length - 1)
  const [rawStep, setStepValue, setInnerStep] = useControllable(o.step, o.defaultStep ?? 0, o.onStepChange)
  const [playing, setPlaying, setInnerPlaying] = useControllable(o.playing, o.defaultPlaying ?? false, o.onPlayingChange)
  const [fps, setFps] = useControllable(o.fps, o.defaultFps ?? 10, o.onFpsChange)
  const step = Math.min(last, Math.max(0, rawStep))

  // Reset during render (React's "adjust state on prop change" pattern) so no frame shows the old step.
  const [key, setKey] = useState(o.resetKey)
  if (key !== o.resetKey) {
    setKey(o.resetKey)
    setInnerStep(o.defaultStep ?? 0)
    setInnerPlaying(o.playOnReset?.() ?? o.defaultPlaying ?? false)
  }

  const stepRef = useRef(step)
  const onEnd = useRef(o.onEnd)
  useEffect(() => {
    stepRef.current = step
    onEnd.current = o.onEnd
  })

  const setStep = useCallback((s: number) => setStepValue(Math.min(last, Math.max(0, Math.round(s)))), [last, setStepValue])

  // `key` restarts the clock on a new episode: auto-next stops the old loop and sets playing back to true in
  // one render, so `playing` alone never changes and an equal-length episode would sit still.
  useEffect(() => {
    if (!playing) return
    let id = 0
    let prev = performance.now()
    let acc = 0
    const tick = (now: number) => {
      acc += now - prev
      prev = now
      const adv = Math.floor((acc * fps) / 1000)
      if (adv > 0) {
        acc -= (adv * 1000) / fps
        const next = Math.min(last, stepRef.current + adv)
        stepRef.current = next
        setStepValue(next)
        if (next >= last) {
          setPlaying(false)
          onEnd.current?.()
          return
        }
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing, fps, last, key, setStepValue, setPlaying])

  const toggle = useCallback(() => {
    if (!playing && step >= last) setStepValue(0)
    setPlaying(!playing)
  }, [playing, step, last, setStepValue, setPlaying])

  return { step, setStep, playing, setPlaying, toggle, fps, setFps, length: o.length }
}
