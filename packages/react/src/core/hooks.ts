// Per-part hooks: the logic behind each built-in part, for rendering your own element with the same behaviour.
import { usePlayer } from './store.ts'
import type { Unit } from './timeline.ts'

export const RATE_OPTIONS: Record<Unit, number[]> = { step: [2, 5, 10, 15, 30, 60], second: [0.25, 0.5, 1, 2, 4] }

/** m:ss.cc */
export function formatTime(t: number) {
  const m = Math.floor(t / 60)
  return `${m}:${(t - m * 60).toFixed(2).padStart(5, '0')}`
}

/** A position as the counter shows it: the step index, or m:ss.cc. */
export const formatPosition = (p: number, unit: Unit) => (unit === 'step' ? String(Math.floor(p)) : formatTime(p))

/** Label switches Play ↔ Pause; no aria-pressed, which would contradict the changing label. */
export function usePlayButton() {
  const playing = usePlayer((s) => s.playing)
  const toggle = usePlayer((s) => s.toggle)
  const label = playing ? 'Pause' : 'Play'
  return {
    playing,
    buttonProps: { type: 'button' as const, onClick: toggle, 'aria-label': label, title: `${label} (space)` },
  }
}

/** Moves `delta` samples (negative for back). */
export function useStepButton(delta: number) {
  const step = usePlayer((s) => s.step)
  const unit = usePlayer((s) => s.unit)
  const label = `${delta < 0 ? 'Previous' : 'Next'} ${unit === 'step' ? 'step' : 'frame'}`
  return {
    buttonProps: { type: 'button' as const, onClick: () => step(delta), 'aria-label': label, title: `${label} (${delta < 0 ? '←' : '→'})` },
  }
}

/** Previous/next episode; disabled when `Player.Root` has no handler for that direction. */
export function useEpisodeButton(direction: 'prev' | 'next') {
  const available = usePlayer((s) => (direction === 'prev' ? s.hasPrev : s.hasNext))
  const go = usePlayer((s) => (direction === 'prev' ? s.prevEpisode : s.nextEpisode))
  const label = direction === 'prev' ? 'Previous episode' : 'Next episode'
  return {
    available,
    buttonProps: {
      type: 'button' as const,
      onClick: go,
      disabled: !available,
      'aria-label': label,
      title: `${label} (${direction === 'prev' ? '↑' : '↓'})`,
    },
  }
}

export function useScrubber() {
  const position = usePlayer((s) => s.position)
  const end = usePlayer((s) => s.end)
  const unit = usePlayer((s) => s.unit)
  const setPosition = usePlayer((s) => s.setPosition)
  return {
    position,
    end,
    inputProps: {
      type: 'range' as const,
      min: 0,
      max: end,
      step: unit === 'step' ? 1 : 'any',
      value: position,
      onChange: (e: { currentTarget: HTMLInputElement }) => setPosition(Number(e.currentTarget.value)),
      'aria-label': unit === 'step' ? 'Step' : 'Time',
      'aria-valuetext': `${formatPosition(position, unit)} of ${formatPosition(end, unit)}`,
    },
  }
}

export function useRateSelect(options?: number[]) {
  const rate = usePlayer((s) => s.rate)
  const unit = usePlayer((s) => s.unit)
  const setRate = usePlayer((s) => s.setRate)
  const base = options ?? RATE_OPTIONS[unit]
  const all = base.includes(rate) ? base : [...base, rate].sort((a, b) => a - b)
  return {
    rate,
    unit,
    options: all,
    /** "10 fps" for steps, "2×" for real time. */
    format: (r: number) => (unit === 'step' ? `${r} fps` : `${r}×`),
    selectProps: {
      value: rate,
      onChange: (e: { currentTarget: HTMLSelectElement }) => setRate(Number(e.currentTarget.value)),
      'aria-label': 'Playback speed',
    },
  }
}

export function useAutoNext() {
  const checked = usePlayer((s) => s.autoNext)
  const setAutoNext = usePlayer((s) => s.setAutoNext)
  return {
    checked,
    inputProps: {
      type: 'checkbox' as const,
      checked,
      onChange: (e: { currentTarget: HTMLInputElement }) => setAutoNext(e.currentTarget.checked),
    },
  }
}
