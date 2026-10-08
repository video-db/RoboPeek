import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import { formatFeature, vectorAt, type Episode, type Feature, type ImageTrack, type VectorTrack } from '@rlds-viewer/core'
import { usePlayback, type PlaybackOptions } from '../hooks/usePlayback.ts'
import { useControllable } from '../hooks/useControllable.ts'
import { usePlayerHotkeys } from '../hooks/usePlayerHotkeys.ts'
import { FrameCanvas } from '../components/FrameCanvas.tsx'
import { VectorChart } from '../components/VectorChart.tsx'
import { cx } from '../components/cx.ts'
import { createPlayerStore, PlayerContext, usePlayer, type PlayerState } from './store.ts'
import { FLAG_KEYS, useAutoNext, useEpisodeButton, useFpsSelect, usePlayButton, useScrubber, useStepButton } from './hooks.ts'

export type ColorScheme = 'light' | 'dark' | 'system'
export type Include = string[] | ((key: string) => boolean)

const included = (key: string, include?: Include) => !include || (Array.isArray(include) ? include.includes(key) : include(key))

export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (el: T | null) => {
    for (const r of refs) {
      if (typeof r === 'function') r(el)
      else if (r) r.current = el
    }
  }
}

// ── Root ────────────────────────────────────────────────────────────────────

export type PlayerRootProps = Omit<ComponentPropsWithRef<'div'>, 'children'> &
  Omit<PlaybackOptions, 'length' | 'onEnd' | 'resetKey' | 'playOnReset'> & {
    episode: Episode
    autoNext?: boolean
    defaultAutoNext?: boolean
    onAutoNextChange?: (on: boolean) => void
    /** Omitted → the previous-episode control renders disabled. */
    onPrevEpisode?: () => void
    /** Omitted → next-episode control disabled and AutoNext has nothing to continue to. */
    onNextEpisode?: () => void
    /** true: keys work while focus is inside the player. A ref: bind them to that element instead. */
    hotkeys?: boolean | RefObject<HTMLElement | null>
    colorScheme?: ColorScheme
    /** Your layout of parts. Omitted → the default `<Player>` arrangement. */
    children?: ReactNode
  }

export function Root({
  episode,
  step,
  defaultStep,
  onStepChange,
  playing,
  defaultPlaying,
  onPlayingChange,
  fps,
  defaultFps,
  onFpsChange,
  autoNext,
  defaultAutoNext = false,
  onAutoNextChange,
  onPrevEpisode,
  onNextEpisode,
  hotkeys = true,
  colorScheme = 'system',
  className,
  children,
  ref,
  ...rest
}: PlayerRootProps) {
  const [auto, setAuto] = useControllable(autoNext, defaultAutoNext, onAutoNextChange)
  const nav = useRef({ onPrevEpisode, onNextEpisode, auto })
  nav.current = { onPrevEpisode, onNextEpisode, auto }
  // Set when the player itself moves on while playing (next button, auto-next), so the next episode keeps playing.
  const carry = useRef(false)
  useEffect(() => { carry.current = false }, [episode])

  const pb = usePlayback({
    length: episode.length,
    step, defaultStep, onStepChange,
    playing, defaultPlaying, onPlayingChange,
    fps, defaultFps, onFpsChange,
    resetKey: episode,
    playOnReset: () => carry.current || (defaultPlaying ?? false),
    onEnd: () => {
      const { auto, onNextEpisode } = nav.current
      if (auto && onNextEpisode) { carry.current = true; onNextEpisode() }
    },
  })

  const playingRef = useRef(pb.playing)
  playingRef.current = pb.playing
  const prevEpisode = useCallback(() => nav.current.onPrevEpisode?.(), [])
  const nextEpisode = useCallback(() => {
    if (!nav.current.onNextEpisode) return
    carry.current = playingRef.current
    nav.current.onNextEpisode()
  }, [])

  const snapshot: PlayerState = useMemo(
    () => ({
      episode,
      length: episode.length,
      step: pb.step,
      setStep: pb.setStep,
      playing: pb.playing,
      toggle: pb.toggle,
      setPlaying: pb.setPlaying,
      fps: pb.fps,
      setFps: pb.setFps,
      autoNext: auto,
      setAutoNext: setAuto,
      hasPrev: !!onPrevEpisode,
      hasNext: !!onNextEpisode,
      prevEpisode,
      nextEpisode,
    }),
    [episode, pb.step, pb.setStep, pb.playing, pb.toggle, pb.setPlaying, pb.fps, pb.setFps, auto, setAuto, onPrevEpisode, onNextEpisode, prevEpisode, nextEpisode],
  )
  const [store] = useState(() => createPlayerStore(snapshot))
  useLayoutEffect(() => store.set(snapshot), [store, snapshot])

  const own = useRef<HTMLDivElement>(null)
  const target = hotkeys === true ? own : hotkeys === false ? own : hotkeys
  usePlayerHotkeys(
    target,
    { toggle: pb.toggle, setStep: pb.setStep, step: pb.step, length: episode.length, prevEpisode: onPrevEpisode, nextEpisode: onNextEpisode },
    hotkeys !== false,
  )

  return (
    <div
      ref={mergeRefs(own, ref)}
      className={cx('rlds-player', className)}
      data-playing={pb.playing || undefined}
      data-rlds-scheme={colorScheme === 'system' ? undefined : colorScheme}
      tabIndex={hotkeys === true ? -1 : undefined}
      {...rest}
    >
      <PlayerContext value={store}>{children ?? <DefaultLayout />}</PlayerContext>
    </div>
  )
}

export function DefaultLayout() {
  return (
    <>
      <Stage />
      <Tracks>
        <Metadata />
      </Tracks>
    </>
  )
}

// ── Stage: instruction, frames, transport, options ─────────────────────────

export type StageProps = ComponentPropsWithRef<'div'>

export function Stage({ className, children, ...rest }: StageProps) {
  return (
    <div className={cx('rlds-stage', className)} {...rest}>
      {children ?? (
        <>
          <Instruction />
          <Frames />
          <Transport />
          <Options />
        </>
      )}
    </div>
  )
}

export type InstructionProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & { include?: Include }

/** Per-step text tracks (e.g. language_instruction); empty values are skipped. */
export function Instruction({ include, className, ...rest }: InstructionProps) {
  const text = usePlayer((s) => s.episode.text)
  const step = usePlayer((s) => s.step)
  const lines = Object.entries(text).filter(([k, v]) => included(k, include) && v[step])
  if (!lines.length) return null
  return (
    <div className={cx('rlds-instructions', className)} {...rest}>
      {lines.map(([k, v]) => <p key={k} className="rlds-instruction" title={k}>{v[step]}</p>)}
    </div>
  )
}

export type FramesProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  include?: Include
  renderItem?: (key: string, track: ImageTrack, fallback: ReactNode) => ReactNode
  renderEmpty?: () => ReactNode
}

export function Frames({ include, renderItem, renderEmpty, className, ...rest }: FramesProps) {
  const images = usePlayer((s) => s.episode.images)
  const step = usePlayer((s) => s.step)
  const list = Object.entries(images).filter(([k]) => included(k, include))
  return (
    <div className={cx('rlds-frames', className)} data-count={Math.min(list.length, 3)} {...rest}>
      {list.map(([k, track]) => {
        const fallback = <FrameCanvas key={k} name={k} track={track} step={step} />
        return renderItem ? <Keyed key={k}>{renderItem(k, track, fallback)}</Keyed> : fallback
      })}
      {list.length === 0 && (renderEmpty ? renderEmpty() : <p className="rlds-frames-empty">No image features in this episode.</p>)}
    </div>
  )
}

const Keyed = ({ children }: { children: ReactNode }) => <>{children}</>

// ── Transport ──────────────────────────────────────────────────────────────

export type TransportProps = ComponentPropsWithRef<'div'>

/** No children → prev/step/play/step/next, scrubber and counter. */
export function Transport({ className, children, ...rest }: TransportProps) {
  return (
    <div className={cx('rlds-transport', className)} {...rest}>
      {children ?? (
        <>
          <PrevEpisode />
          <StepBack />
          <Play />
          <StepForward />
          <NextEpisode />
          <Scrubber />
          <Counter />
        </>
      )}
    </div>
  )
}

export type TransportButtonProps = Omit<ComponentPropsWithRef<'button'>, 'onClick'>

export function Play({ className, children, ...rest }: TransportButtonProps) {
  const { playing, buttonProps } = usePlayButton()
  return (
    <button {...buttonProps} className={cx('rlds-transport-button', 'rlds-play', className)} {...rest}>
      {children ?? (playing ? <PauseIcon /> : <PlayIcon />)}
    </button>
  )
}

export function StepBack({ className, children, ...rest }: TransportButtonProps) {
  const { buttonProps } = useStepButton(-1)
  return <button {...buttonProps} className={cx('rlds-transport-button', className)} {...rest}>{children ?? <StepIcon back />}</button>
}

export function StepForward({ className, children, ...rest }: TransportButtonProps) {
  const { buttonProps } = useStepButton(1)
  return <button {...buttonProps} className={cx('rlds-transport-button', className)} {...rest}>{children ?? <StepIcon />}</button>
}

export function PrevEpisode({ className, children, ...rest }: TransportButtonProps) {
  const { buttonProps } = useEpisodeButton('prev')
  return <button {...buttonProps} className={cx('rlds-transport-button', className)} {...rest}>{children ?? <SkipIcon back />}</button>
}

export function NextEpisode({ className, children, ...rest }: TransportButtonProps) {
  const { buttonProps } = useEpisodeButton('next')
  return <button {...buttonProps} className={cx('rlds-transport-button', className)} {...rest}>{children ?? <SkipIcon />}</button>
}

export type ScrubberProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'value' | 'onChange'>

export function Scrubber({ className, ...rest }: ScrubberProps) {
  const { inputProps } = useScrubber()
  return <input {...inputProps} className={cx('rlds-scrubber', className)} {...rest} />
}

export type CounterProps = Omit<ComponentPropsWithRef<'span'>, 'children'>

export function Counter({ className, ...rest }: CounterProps) {
  const step = usePlayer((s) => s.step)
  const length = usePlayer((s) => s.length)
  return (
    <span className={cx('rlds-counter', 'rlds-mono', className)} {...rest}>
      {step}<span className="rlds-dim"> / {length - 1}</span>
    </span>
  )
}

// ── Options: fps, auto-next, flags ─────────────────────────────────────────

export type OptionsProps = ComponentPropsWithRef<'div'>

/** No children → fps select, auto-next toggle, step flags. */
export function Options({ className, children, ...rest }: OptionsProps) {
  return (
    <div className={cx('rlds-options', className)} {...rest}>
      {children ?? (
        <>
          <FpsSelect />
          <AutoNext />
          <Flags />
        </>
      )}
    </div>
  )
}

export type FpsSelectProps = Omit<ComponentPropsWithRef<'select'>, 'value' | 'onChange' | 'children'> & { options?: number[] }

export function FpsSelect({ options, className, ...rest }: FpsSelectProps) {
  const { selectProps, options: all } = useFpsSelect(options)
  return (
    <select {...selectProps} className={cx('rlds-fps', className)} {...rest}>
      {all.map((f) => <option key={f} value={f}>{f} fps</option>)}
    </select>
  )
}

export type AutoNextProps = Omit<ComponentPropsWithRef<'label'>, 'children'> & { label?: ReactNode }

export function AutoNext({ label = 'Continue to next episode', className, ...rest }: AutoNextProps) {
  const { inputProps } = useAutoNext()
  return (
    <label className={cx('rlds-autonext', className)} {...rest}>
      <input {...inputProps} />
      {label}
    </label>
  )
}

export type FlagsProps = Omit<ComponentPropsWithRef<'span'>, 'children'> & { keys?: string[] }

/** RLDS step flags as chips, lit on the steps where they're set. */
export function Flags({ keys = FLAG_KEYS, className, ...rest }: FlagsProps) {
  const vectors = usePlayer((s) => s.episode.vectors)
  const step = usePlayer((s) => s.step)
  const present = keys.filter((k) => vectors[k])
  return (
    <span className={cx('rlds-flags', className)} {...rest}>
      {present.map((k) => (
        <span key={k} className="rlds-flag" data-on={!!vectorAt(vectors[k], step)[0] || undefined}>{k.replace('is_', '')}</span>
      ))}
    </span>
  )
}

// ── Tracks and metadata ────────────────────────────────────────────────────

export type TracksProps = ComponentPropsWithRef<'div'> & {
  include?: Include
  renderItem?: (key: string, track: VectorTrack, fallback: ReactNode) => ReactNode
  /** Wider tracks start collapsed (see VectorChart). */
  maxSeries?: number
}

/** One chart per vector track (step flags excluded). Children render after the charts, in the same grid. */
export function Tracks({ include, renderItem, maxSeries, className, children, ...rest }: TracksProps) {
  const vectors = usePlayer((s) => s.episode.vectors)
  const length = usePlayer((s) => s.length)
  const step = usePlayer((s) => s.step)
  const setStep = usePlayer((s) => s.setStep)
  const list = Object.entries(vectors).filter(([k]) => !FLAG_KEYS.includes(k) && included(k, include))
  return (
    <div className={cx('rlds-tracks', className)} {...rest}>
      {list.map(([k, track]) => {
        const fallback = <VectorChart key={k} name={k} track={track} length={length} step={step} onSeek={setStep} maxSeries={maxSeries} />
        return renderItem ? <Keyed key={k}>{renderItem(k, track, fallback)}</Keyed> : fallback
      })}
      {children}
    </div>
  )
}

export type MetadataProps = Omit<ComponentPropsWithRef<'section'>, 'children' | 'title'> & {
  include?: Include
  renderItem?: (key: string, feature: Feature, fallback: ReactNode) => ReactNode
  title?: ReactNode
}

/** Episode-level features (episode_metadata/* etc.); hidden when there are none. */
export function Metadata({ include, renderItem, title = 'Other features', className, ...rest }: MetadataProps) {
  const metadata = usePlayer((s) => s.episode.metadata)
  const list = Object.entries(metadata).filter(([k]) => included(k, include))
  if (!list.length) return null
  return (
    <section className={cx('rlds-metadata', className)} {...rest}>
      <h3>{title}</h3>
      <dl>
        {list.map(([k, f]) => {
          const fallback = <div key={k}><dt>{k}</dt><dd className="rlds-mono">{formatFeature(f)}</dd></div>
          return renderItem ? <Keyed key={k}>{renderItem(k, f, fallback)}</Keyed> : fallback
        })}
      </dl>
    </section>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────

const PlayIcon = () => <svg viewBox="0 0 16 16" aria-hidden><path d="M4 2.5v11l9-5.5z" /></svg>
const PauseIcon = () => <svg viewBox="0 0 16 16" aria-hidden><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" /></svg>
const StepIcon = ({ back }: { back?: boolean }) => (
  <svg viewBox="0 0 16 16" aria-hidden style={back ? { transform: 'scaleX(-1)' } : undefined}><path d="M4 3v10l6-5zM11 3h2v10h-2z" /></svg>
)
const SkipIcon = ({ back }: { back?: boolean }) => (
  <svg viewBox="0 0 16 16" aria-hidden style={back ? { transform: 'scaleX(-1)' } : undefined}><path d="M2 3v10l5.5-5zM8 3v10l5.5-5zM13 3h1.5v10H13z" /></svg>
)
