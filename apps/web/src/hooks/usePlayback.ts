import { useCallback, useEffect, useRef, useState } from 'react'

/** Frame clock for one episode. Remount (key by episode) to reset. */
export function usePlayback(length: number, fps: number, opts: { autoplay?: boolean; onEnd?: () => void } = {}) {
  const [step, setStepRaw] = useState(0)
  const [playing, setPlaying] = useState(!!opts.autoplay)
  const last = Math.max(0, length - 1)
  const stepRef = useRef(0)
  const onEnd = useRef(opts.onEnd)
  useEffect(() => {
    stepRef.current = step
    onEnd.current = opts.onEnd
  })

  const setStep = useCallback((s: number) => setStepRaw(Math.min(last, Math.max(0, s))), [last])

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
        setStepRaw(next)
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
  }, [playing, fps, last])

  const toggle = useCallback(() => {
    if (!playing && step >= last) setStepRaw(0)
    setPlaying(!playing)
  }, [playing, step, last])

  return { step, setStep, playing, toggle }
}
