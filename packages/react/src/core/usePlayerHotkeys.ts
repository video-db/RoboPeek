import { useEffect, useRef, type RefObject } from 'react'

export type HotkeyControls = {
  toggle: () => void
  /** Moves `delta` samples along the reference track. */
  step: (delta: number) => void
  setPosition: (position: number) => void
  end: number
  prevEpisode?: () => void
  nextEpisode?: () => void
}

const isTyping = (e: KeyboardEvent) => (e.target as HTMLElement).closest('input, select, textarea')

/** Vim aliases; Ctrl/Cmd/Alt combos stay with the browser (Cmd+L, Ctrl+J…). */
const VIM: Record<string, string> = { h: 'ArrowLeft', j: 'ArrowDown', k: 'ArrowUp', l: 'ArrowRight' }
const keyOf = (e: KeyboardEvent) => (e.ctrlKey || e.metaKey || e.altKey ? e.key : VIM[e.key.toLowerCase()] ?? e.key)

/** Space, ←/→ or h/l (Shift = 10), Home/End, ↑/↓ or k/j for episodes. Only while focus is inside `ref`; never on window. */
export function usePlayerHotkeys(ref: RefObject<HTMLElement | null>, controls: HotkeyControls, enabled = true) {
  const ctl = useRef(controls)
  ctl.current = controls
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      const { toggle, step, setPosition, end, prevEpisode, nextEpisode } = ctl.current
      const jump = e.shiftKey ? 10 : 1
      const key = keyOf(e)
      if (key === ' ') { e.preventDefault(); toggle() }
      else if (key === 'ArrowRight') { e.preventDefault(); step(jump) }
      else if (key === 'ArrowLeft') { e.preventDefault(); step(-jump) }
      else if (key === 'Home') setPosition(0)
      else if (key === 'End') setPosition(end)
      else if (key === 'ArrowDown' && nextEpisode) { e.preventDefault(); nextEpisode() }
      else if (key === 'ArrowUp' && prevEpisode) { e.preventDefault(); prevEpisode() }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [ref, enabled])
}
