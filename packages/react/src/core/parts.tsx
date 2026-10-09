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
import { indexAt, type ImageTrack, type Timeline, type VectorTrack } from './timeline.ts'
import { assertTimeline } from './errors.ts'
import { usePlayback, type PlaybackOptions } from './usePlayback.ts'
import { useControllable } from './useControllable.ts'
import { usePlayerHotkeys } from './usePlayerHotkeys.ts'
import { FrameView } from './FrameView.tsx'
import { VectorChart } from './VectorChart.tsx'
import { cx } from './cx.ts'
import { createPlayerStore, PlayerContext, usePlayer, type PlayerState } from './store.ts'
import { formatPosition, useAutoNext, useEpisodeButton, usePlayButton, useRateSelect, useScrubber, useStepButton } from './hooks.ts'

export type ColorScheme = 'light' | 'dark'
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

/** The timeline's version, updated at most once per animation frame however fast it changes. */
export function useTimelineVersion(timeline: Timeline) {
  const [version, setVersion] = useState(timeline.version ?? 0)
  useEffect(() => {
    let raf = 0
    setVersion(timeline.version ?? 0)
    const off = timeline.subscribe?.(() => { raf ||= requestAnimationFrame(() => { raf = 0; setVersion(timeline.version ?? 0) }) })
    return () => { off?.(); cancelAnimationFrame(raf) }
  }, [timeline])
  return version
}

// Steps go along the first camera, else the first chart.
function referenceTimes(t: Timeline): ArrayLike<number> | undefined {
  return Object.values(t.images)[0]?.times ?? Object.values(t.vectors)[0]?.times
}

// ── Root ────────────────────────────────────────────────────────────────────

export type PlayerRootProps = Omit<ComponentPropsWithRef<'div'>, 'children'> &
  Omit<PlaybackOptions, 'unit' | 'end' | 'loading' | 'onEnd' | 'resetKey' | 'playOnReset'> & {
    /** What to play. Build it with `useEpisodeTimeline` ('/rlds'), `useMcapTimeline` ('/mcap'), or by hand. */
    timeline: Timeline
    /** Still loading: playback waits at the loaded end instead of stopping. */
    loading?: boolean
    autoNext?: boolean
    defaultAutoNext?: boolean
    onAutoNextChange?: (on: boolean) => void
    /** Omitted → the previous-episode control renders disabled. */
    onPrevEpisode?: () => void
    /** Omitted → next-episode control disabled and AutoNext has nothing to continue to. */
    onNextEpisode?: () => void
    /** true: keys work while focus is inside the player. A ref: bind them to that element instead. */
    hotkeys?: boolean | RefObject<HTMLElement | null>
    /** Unset: light (the DS default), or whatever an ancestor pinned. */
    colorScheme?: ColorScheme
    /** Your layout of parts. Omitted → `<DefaultLayout />`. */
    children?: ReactNode
  }

export function Root({
  timeline,
  loading = false,
  position,
  defaultPosition,
  onPositionChange,
  playing,
  defaultPlaying,
  onPlayingChange,
  rate,
  defaultRate,
  onRateChange,
  autoNext,
  defaultAutoNext = false,
  onAutoNextChange,
  onPrevEpisode,
  onNextEpisode,
  hotkeys = true,
  colorScheme,
  className,
  children,
  ref,
  ...rest
}: PlayerRootProps) {
  assertTimeline(timeline, '<Player.Root timeline>')
  const version = useTimelineVersion(timeline)
  const end = timeline.end
  const [auto, setAuto] = useControllable(autoNext, defaultAutoNext, onAutoNextChange)
  const nav = useRef({ onPrevEpisode, onNextEpisode, auto })
  nav.current = { onPrevEpisode, onNextEpisode, auto }
  // Set when the player itself moves on while playing (next button, auto-next), so the next episode keeps playing.
  const carry = useRef(false)
  useEffect(() => { carry.current = false }, [timeline])

  const pb = usePlayback({
    unit: timeline.unit,
    end,
    loading,
    position, defaultPosition, onPositionChange,
    playing, defaultPlaying, onPlayingChange,
    rate, defaultRate, onRateChange,
    resetKey: timeline,
    playOnReset: () => carry.current || (defaultPlaying ?? false),
    onEnd: () => {
      const { auto, onNextEpisode } = nav.current
      if (auto && onNextEpisode) { carry.current = true; onNextEpisode() }
    },
  })

  const positionRef = useRef(pb.position)
  positionRef.current = pb.position
  const setPosition = pb.setPosition
  const step = useCallback((delta: number) => {
    const times = referenceTimes(timeline)
    const p = positionRef.current
    if (!times?.length) return setPosition(p + delta)
    let i = indexAt(times, p)
    // Between samples, one step back lands on the sample being shown.
    if (delta < 0 && i >= 0 && times[i] < p) i++
    setPosition(times[Math.min(times.length - 1, Math.max(0, i + delta))])
  }, [timeline, setPosition])

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
      timeline,
      version,
      unit: timeline.unit,
      end,
      loading,
      position: pb.position,
      setPosition: pb.setPosition,
      step,
      playing: pb.playing,
      toggle: pb.toggle,
      setPlaying: pb.setPlaying,
      rate: pb.rate,
      setRate: pb.setRate,
      autoNext: auto,
      setAutoNext: setAuto,
      hasPrev: !!onPrevEpisode,
      hasNext: !!onNextEpisode,
      prevEpisode,
      nextEpisode,
    }),
    [timeline, version, end, loading, pb.position, pb.setPosition, step, pb.playing, pb.toggle, pb.setPlaying, pb.rate, pb.setRate, auto, setAuto, onPrevEpisode, onNextEpisode, prevEpisode, nextEpisode],
  )
  const [store] = useState(() => createPlayerStore(snapshot))
  useLayoutEffect(() => store.set(snapshot), [store, snapshot])

  const own = useRef<HTMLDivElement>(null)
  const target = hotkeys === true ? own : hotkeys === false ? own : hotkeys
  usePlayerHotkeys(
    target,
    { toggle: pb.toggle, step, setPosition: pb.setPosition, end, prevEpisode: onPrevEpisode, nextEpisode: onNextEpisode },
    hotkeys !== false,
  )

  return (
    <div
      ref={mergeRefs(own, ref)}
      className={cx('rp-player', className)}
      data-playing={pb.playing || undefined}
      data-rp-scheme={colorScheme}
      tabIndex={hotkeys === true ? -1 : undefined}
      {...rest}
    >
      <PlayerContext value={store}>{children ?? <DefaultLayout />}</PlayerContext>
    </div>
  )
}

export type DefaultLayoutProps = {
  /** Added after the speed and auto-next controls (e.g. RLDS step flags). */
  options?: ReactNode
  /** Added after the metadata panel (e.g. the MCAP topic list). */
  panels?: ReactNode
}

/** Stage (instruction, cameras, transport, options), then charts and panels. */
export function DefaultLayout({ options, panels }: DefaultLayoutProps) {
  return (
    <>
      <Stage>
        <Instruction />
        <Frames />
        <Transport />
        <Options>
          <RateSelect />
          <AutoNext />
          {options}
        </Options>
      </Stage>
      <Tracks>
        <Metadata />
        {panels}
      </Tracks>
    </>
  )
}

// ── Stage: instruction, frames, transport, options ─────────────────────────

export type StageProps = ComponentPropsWithRef<'div'>

export function Stage({ className, children, ...rest }: StageProps) {
  return (
    <div className={cx('rp-stage', className)} {...rest}>
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

/** Text tracks (e.g. a language instruction): the value at the current position; empty values are skipped. */
export function Instruction({ include, className, ...rest }: InstructionProps) {
  const text = usePlayer((s) => s.timeline.text)
  const position = usePlayer((s) => s.position)
  usePlayer((s) => s.version)
  const lines = Object.entries(text)
    .filter(([k]) => included(k, include))
    .map(([k, tr]) => [k, tr.values[indexAt(tr.times, position)] ?? tr.values[0]] as const)
    .filter(([, v]) => v)
  if (!lines.length) return null
  return (
    <div className={cx('rp-instructions', className)} {...rest}>
      {lines.map(([k, v]) => <p key={k} className="rp-instruction" title={k}>{v}</p>)}
    </div>
  )
}

export type FramesProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  include?: Include
  renderItem?: (key: string, track: ImageTrack, fallback: ReactNode) => ReactNode
  renderEmpty?: () => ReactNode
}

/** One view per image track. Asks the timeline to prepare frames around the playhead. */
export function Frames({ include, renderItem, renderEmpty, className, ...rest }: FramesProps) {
  const timeline = usePlayer((s) => s.timeline)
  const version = usePlayer((s) => s.version)
  const position = usePlayer((s) => s.position)
  const playing = usePlayer((s) => s.playing)
  const rate = usePlayer((s) => s.rate)
  const list = Object.entries(timeline.images).filter(([k]) => included(k, include))

  // Re-checked every quarter unit of movement, looking ~4 s of playback ahead.
  const bucket = Math.floor(position * 4)
  const signal = useRef<AbortSignal>(undefined)
  useEffect(() => {
    const ac = new AbortController()
    signal.current = ac.signal
    return () => ac.abort()
  }, [timeline])
  useEffect(() => {
    if (!timeline.prepare || !signal.current) return
    const ahead = playing ? 4 * rate : timeline.unit === 'step' ? 1 : 0.5
    timeline.prepare(bucket / 4, bucket / 4 + ahead, signal.current)
  }, [timeline, bucket, playing, rate, version])

  return (
    <div className={cx('rp-frames', className)} data-count={Math.min(list.length, 4)} {...rest}>
      {list.map(([k, track]) => {
        const fallback = <FrameView key={k} name={k} track={track} position={position} version={version} />
        return renderItem ? <Keyed key={k}>{renderItem(k, track, fallback)}</Keyed> : fallback
      })}
      {list.length === 0 && (renderEmpty ? renderEmpty() : <p className="rp-frames-empty">No camera views in this {timeline.unit === 'step' ? 'episode' : 'recording'}.</p>)}
    </div>
  )
}

const Keyed = ({ children }: { children: ReactNode }) => <>{children}</>

// ── Transport ──────────────────────────────────────────────────────────────

export type TransportProps = ComponentPropsWithRef<'div'>

/** No children → prev/step/play/step/next, scrubber and counter. */
export function Transport({ className, children, ...rest }: TransportProps) {
  return (
    <div className={cx('rp-transport', className)} {...rest}>
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
    <button {...buttonProps} className={cx('rp-transport-button', 'rp-play', className)} {...rest}>
      {children ?? (playing ? <PauseIcon /> : <PlayIcon />)}
    </button>
  )
}

export function StepBack({ className, children, ...rest }: TransportButtonProps) {
  const { buttonProps } = useStepButton(-1)
  return <button {...buttonProps} className={cx('rp-transport-button', className)} {...rest}>{children ?? <StepIcon back />}</button>
}

export function StepForward({ className, children, ...rest }: TransportButtonProps) {
  const { buttonProps } = useStepButton(1)
  return <button {...buttonProps} className={cx('rp-transport-button', className)} {...rest}>{children ?? <StepIcon />}</button>
}

export function PrevEpisode({ className, children, ...rest }: TransportButtonProps) {
  const { buttonProps } = useEpisodeButton('prev')
  return <button {...buttonProps} className={cx('rp-transport-button', className)} {...rest}>{children ?? <SkipIcon back />}</button>
}

export function NextEpisode({ className, children, ...rest }: TransportButtonProps) {
  const { buttonProps } = useEpisodeButton('next')
  return <button {...buttonProps} className={cx('rp-transport-button', className)} {...rest}>{children ?? <SkipIcon />}</button>
}

export type ScrubberProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'value' | 'onChange'>

export function Scrubber({ className, ...rest }: ScrubberProps) {
  const { inputProps } = useScrubber()
  return <input {...inputProps} className={cx('rp-scrubber', className)} {...rest} />
}

export type CounterProps = Omit<ComponentPropsWithRef<'span'>, 'children'>

/** "12 / 40" for steps, "0:12.30 / 0:22.00" for time. */
export function Counter({ className, ...rest }: CounterProps) {
  const position = usePlayer((s) => s.position)
  const end = usePlayer((s) => s.end)
  const unit = usePlayer((s) => s.unit)
  return (
    <span className={cx('rp-counter', 'rp-mono', className)} {...rest}>
      {formatPosition(position, unit)}<span className="rp-dim"> / {formatPosition(end, unit)}</span>
    </span>
  )
}

// ── Options: rate, auto-next ───────────────────────────────────────────────

export type OptionsProps = ComponentPropsWithRef<'div'>

/** No children → speed select and auto-next toggle. */
export function Options({ className, children, ...rest }: OptionsProps) {
  return (
    <div className={cx('rp-options', className)} {...rest}>
      {children ?? (
        <>
          <RateSelect />
          <AutoNext />
        </>
      )}
    </div>
  )
}

export type RateSelectProps = Omit<ComponentPropsWithRef<'select'>, 'value' | 'onChange' | 'children'> & { options?: number[] }

/** fps for step timelines, ×real time for second timelines. */
export function RateSelect({ options, className, ...rest }: RateSelectProps) {
  const { selectProps, options: all, format } = useRateSelect(options)
  return (
    <select {...selectProps} className={cx('rp-rate', className)} {...rest}>
      {all.map((r) => <option key={r} value={r}>{format(r)}</option>)}
    </select>
  )
}

export type AutoNextProps = Omit<ComponentPropsWithRef<'label'>, 'children'> & { label?: ReactNode }

export function AutoNext({ label = 'Continue to next episode', className, ...rest }: AutoNextProps) {
  const { inputProps } = useAutoNext()
  return (
    <label className={cx('rp-autonext', className)} {...rest}>
      <input {...inputProps} />
      {label}
    </label>
  )
}

// ── Tracks and metadata ────────────────────────────────────────────────────

export type TracksProps = ComponentPropsWithRef<'div'> & {
  include?: Include
  renderItem?: (key: string, track: VectorTrack, fallback: ReactNode) => ReactNode
  /** Wider tracks start collapsed (see VectorChart). */
  maxSeries?: number
}

/** One chart per vector track. Children render after the charts, in the same grid. */
export function Tracks({ include, renderItem, maxSeries, className, children, ...rest }: TracksProps) {
  const vectors = usePlayer((s) => s.timeline.vectors)
  const version = usePlayer((s) => s.version)
  const end = usePlayer((s) => s.end)
  const position = usePlayer((s) => s.position)
  const setPosition = usePlayer((s) => s.setPosition)
  const list = Object.entries(vectors).filter(([k]) => included(k, include))
  return (
    <div className={cx('rp-tracks', className)} {...rest}>
      {list.map(([k, track]) => {
        const fallback = <VectorChart key={k} name={k} track={track} end={end} position={position} onSeek={setPosition} version={version} maxSeries={maxSeries} />
        return renderItem ? <Keyed key={k}>{renderItem(k, track, fallback)}</Keyed> : fallback
      })}
      {children}
    </div>
  )
}

export type MetadataProps = Omit<ComponentPropsWithRef<'section'>, 'children' | 'title'> & {
  include?: Include
  renderItem?: (key: string, value: string, fallback: ReactNode) => ReactNode
  title?: ReactNode
}

/** The timeline's metadata (episode-level features, MCAP metadata records); hidden when there is none. */
export function Metadata({ include, renderItem, title = 'Metadata', className, ...rest }: MetadataProps) {
  const metadata = usePlayer((s) => s.timeline.metadata)
  usePlayer((s) => s.version)
  const list = Object.entries(metadata).filter(([k]) => included(k, include))
  if (!list.length) return null
  return (
    <section className={cx('rp-metadata', className)} {...rest}>
      <h3>{title}</h3>
      <dl>
        {list.map(([k, v]) => {
          const fallback = <div key={k}><dt>{k}</dt><dd className="rp-mono">{v.length > 300 ? `${v.slice(0, 300)}… (${v.length} chars)` : v}</dd></div>
          return renderItem ? <Keyed key={k}>{renderItem(k, v, fallback)}</Keyed> : fallback
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
