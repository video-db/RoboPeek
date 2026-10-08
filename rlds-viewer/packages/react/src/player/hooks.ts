// Per-part hooks: the logic behind each built-in part, for rendering your own element with the same behaviour.
import { usePlayer } from './store.ts'

export const FPS_OPTIONS = [2, 5, 10, 15, 30, 60]
export const FLAG_KEYS = ['is_first', 'is_last', 'is_terminal']

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

/** Moves `delta` steps (negative for back). */
export function useStepButton(delta: number) {
  const setStep = usePlayer((s) => s.setStep)
  const step = usePlayer((s) => s.step)
  const label = delta < 0 ? 'Previous step' : 'Next step'
  return {
    buttonProps: { type: 'button' as const, onClick: () => setStep(step + delta), 'aria-label': label, title: `${label} (${delta < 0 ? '←' : '→'})` },
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
  const step = usePlayer((s) => s.step)
  const length = usePlayer((s) => s.length)
  const setStep = usePlayer((s) => s.setStep)
  const max = Math.max(0, length - 1)
  return {
    step,
    max,
    inputProps: {
      type: 'range' as const,
      min: 0,
      max,
      value: step,
      onChange: (e: { currentTarget: HTMLInputElement }) => setStep(Number(e.currentTarget.value)),
      'aria-label': 'Step',
    },
  }
}

export function useFpsSelect(options: number[] = FPS_OPTIONS) {
  const fps = usePlayer((s) => s.fps)
  const setFps = usePlayer((s) => s.setFps)
  const all = options.includes(fps) ? options : [...options, fps].sort((a, b) => a - b)
  return {
    fps,
    options: all,
    selectProps: {
      value: fps,
      onChange: (e: { currentTarget: HTMLSelectElement }) => setFps(Number(e.currentTarget.value)),
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
