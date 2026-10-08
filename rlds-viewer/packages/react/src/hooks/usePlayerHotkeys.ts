import { useEffect, useRef, type RefObject } from 'react'

export type HotkeyControls = {
  toggle: () => void
  setStep: (step: number) => void
  step: number
  length: number
  prevEpisode?: () => void
  nextEpisode?: () => void
}

const isTyping = (e: KeyboardEvent) => (e.target as HTMLElement).closest('input, select, textarea')

/** Space, ←/→ (Shift = 10), Home/End, ↑/↓ for episodes. Only while focus is inside `ref`; never on window. */
export function usePlayerHotkeys(ref: RefObject<HTMLElement | null>, controls: HotkeyControls, enabled = true) {
  const ctl = useRef(controls)
  ctl.current = controls
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      const { toggle, setStep, step, length, prevEpisode, nextEpisode } = ctl.current
      const jump = e.shiftKey ? 10 : 1
      if (e.key === ' ') { e.preventDefault(); toggle() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setStep(step + jump) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setStep(step - jump) }
      else if (e.key === 'Home') setStep(0)
      else if (e.key === 'End') setStep(length - 1)
      else if (e.key === 'ArrowDown' && nextEpisode) { e.preventDefault(); nextEpisode() }
      else if (e.key === 'ArrowUp' && prevEpisode) { e.preventDefault(); prevEpisode() }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [ref, enabled])
}
