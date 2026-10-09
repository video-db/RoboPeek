// Per-part hooks: the logic behind each built-in part, for rendering your own element with the same behaviour.
import { usePlayer } from './store.ts'

export const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4]

/** m:ss.cc */
export function formatTime(t: number) {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${m}:${s.toFixed(2).padStart(5, '0')}`
}

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

/** Moves `delta` frames (negative for back). */
export function useStepButton(delta: number) {
  const step = usePlayer((s) => s.step)
  const label = delta < 0 ? 'Previous frame' : 'Next frame'
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
  const time = usePlayer((s) => s.time)
  const duration = usePlayer((s) => s.duration)
  const setTime = usePlayer((s) => s.setTime)
  return {
    time,
    duration,
    inputProps: {
      type: 'range' as const,
      min: 0,
      max: duration,
      step: 'any',
      value: time,
      onChange: (e: { currentTarget: HTMLInputElement }) => setTime(Number(e.currentTarget.value)),
      'aria-label': 'Time',
      'aria-valuetext': `${formatTime(time)} of ${formatTime(duration)}`,
    },
  }
}

export function useSpeedSelect(options: number[] = SPEED_OPTIONS) {
  const speed = usePlayer((s) => s.speed)
  const setSpeed = usePlayer((s) => s.setSpeed)
  const all = options.includes(speed) ? options : [...options, speed].sort((a, b) => a - b)
  return {
    speed,
    options: all,
    selectProps: {
      value: speed,
      onChange: (e: { currentTarget: HTMLSelectElement }) => setSpeed(Number(e.currentTarget.value)),
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
