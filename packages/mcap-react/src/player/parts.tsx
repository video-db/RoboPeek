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
import { indexAt, type ImageTrack, type Recording, type TopicInfo, type VectorTrack } from '@videodb/robopeek-mcap'
import { usePlayback, type PlaybackOptions } from '../hooks/usePlayback.ts'
import { useControllable } from '../hooks/useControllable.ts'
import { usePlayerHotkeys } from '../hooks/usePlayerHotkeys.ts'
import { FrameView } from '../components/FrameView.tsx'
import { VectorChart } from '../components/VectorChart.tsx'
import { cx } from '../components/cx.ts'
import { createPlayerStore, PlayerContext, usePlayer, type PlayerState } from './store.ts'
import { formatTime, useAutoNext, useEpisodeButton, usePlayButton, useScrubber, useSpeedSelect, useStepButton } from './hooks.ts'

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

/** The recording's version, updated at most once per animation frame however fast messages arrive. */
export function useRecordingVersion(recording: Recording) {
  const [version, setVersion] = useState(recording.version)
  useEffect(() => {
    let raf = 0
    setVersion(recording.version)
    const off = recording.subscribe(() => { raf ||= requestAnimationFrame(() => { raf = 0; setVersion(recording.version) }) })
    return () => { off(); cancelAnimationFrame(raf) }
  }, [recording])
  return version
}

// Frames step along the first camera, else the first chart.
function referenceTimes(rec: Recording): number[] | undefined {
  return Object.values(rec.images)[0]?.times ?? Object.values(rec.vectors)[0]?.times
}

// ── Root ────────────────────────────────────────────────────────────────────

export type PlayerRootProps = Omit<ComponentPropsWithRef<'div'>, 'children'> &
  Omit<PlaybackOptions, 'duration' | 'loading' | 'onEnd' | 'resetKey' | 'playOnReset'> & {
    recording: Recording
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
    /** Your layout of parts. Omitted → the default `<Player>` arrangement. */
    children?: ReactNode
  }

export function Root({
  recording,
  loading = false,
  time,
  defaultTime,
  onTimeChange,
  playing,
  defaultPlaying,
  onPlayingChange,
  speed,
  defaultSpeed,
  onSpeedChange,
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
  const version = useRecordingVersion(recording)
  const duration = recording.length
  const [auto, setAuto] = useControllable(autoNext, defaultAutoNext, onAutoNextChange)
  const nav = useRef({ onPrevEpisode, onNextEpisode, auto })
  nav.current = { onPrevEpisode, onNextEpisode, auto }
  // Set when the player itself moves on while playing (next button, auto-next), so the next episode keeps playing.
  const carry = useRef(false)
  useEffect(() => { carry.current = false }, [recording])

  const pb = usePlayback({
    duration,
    loading,
    time, defaultTime, onTimeChange,
    playing, defaultPlaying, onPlayingChange,
    speed, defaultSpeed, onSpeedChange,
    resetKey: recording,
    playOnReset: () => carry.current || (defaultPlaying ?? false),
    onEnd: () => {
      const { auto, onNextEpisode } = nav.current
      if (auto && onNextEpisode) { carry.current = true; onNextEpisode() }
    },
  })

  const timeRef = useRef(pb.time)
  timeRef.current = pb.time
  const setTime = pb.setTime
  const step = useCallback((delta: number) => {
    const times = referenceTimes(recording)
    if (!times?.length) return
    const t = timeRef.current
    let i = indexAt(times, t)
    // Between frames, one step back lands on the frame being shown.
    if (delta < 0 && i >= 0 && times[i] < t) i++
    setTime(times[Math.min(times.length - 1, Math.max(0, i + delta))])
  }, [recording, setTime])

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
      recording,
      version,
      duration,
      loading,
      time: pb.time,
      setTime: pb.setTime,
      step,
      playing: pb.playing,
      toggle: pb.toggle,
      setPlaying: pb.setPlaying,
      speed: pb.speed,
      setSpeed: pb.setSpeed,
      autoNext: auto,
      setAutoNext: setAuto,
      hasPrev: !!onPrevEpisode,
      hasNext: !!onNextEpisode,
      prevEpisode,
      nextEpisode,
    }),
    [recording, version, duration, loading, pb.time, pb.setTime, step, pb.playing, pb.toggle, pb.setPlaying, pb.speed, pb.setSpeed, auto, setAuto, onPrevEpisode, onNextEpisode, prevEpisode, nextEpisode],
  )
  const [store] = useState(() => createPlayerStore(snapshot))
  useLayoutEffect(() => store.set(snapshot), [store, snapshot])

  const own = useRef<HTMLDivElement>(null)
  const target = hotkeys === true ? own : hotkeys === false ? own : hotkeys
  usePlayerHotkeys(
    target,
    { toggle: pb.toggle, step, setTime: pb.setTime, duration, prevEpisode: onPrevEpisode, nextEpisode: onNextEpisode },
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

export function DefaultLayout() {
  return (
    <>
      <Stage />
      <Tracks>
        <Metadata />
        <Topics />
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

/** Short text topics (task instructions, std_msgs/String): the latest value at the current time. */
export function Instruction({ include, className, ...rest }: InstructionProps) {
  const text = usePlayer((s) => s.recording.text)
  const time = usePlayer((s) => s.time)
  usePlayer((s) => s.version)
  const lines = Object.entries(text)
    .filter(([k]) => included(k, include))
    .map(([k, tr]) => [k, tr.values[indexAt(tr.times, time)] ?? tr.values[0]] as const)
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
  renderItem?: (topic: string, track: ImageTrack, fallback: ReactNode) => ReactNode
  renderEmpty?: () => ReactNode
}

/** One view per camera topic. Frames released under the memory budget are fetched back around the playhead. */
export function Frames({ include, renderItem, renderEmpty, className, ...rest }: FramesProps) {
  const recording = usePlayer((s) => s.recording)
  const version = usePlayer((s) => s.version)
  const time = usePlayer((s) => s.time)
  const playing = usePlayer((s) => s.playing)
  const speed = usePlayer((s) => s.speed)
  const list = Object.entries(recording.images).filter(([k]) => included(k, include))
  const topics = list.map(([k]) => k).join('\n')

  // Re-checked every quarter second of playhead movement: enough lookahead that playback never waits on a read.
  const bucket = Math.floor(time * 4)
  const signal = useRef<AbortSignal>(undefined)
  useEffect(() => {
    const ac = new AbortController()
    signal.current = ac.signal
    return () => ac.abort()
  }, [recording])
  useEffect(() => {
    if (!recording.refetchable || !topics) return
    const ahead = playing ? 2 + 2 * speed : 0.5
    recording.ensure(topics.split('\n'), bucket / 4, bucket / 4 + ahead, signal.current).catch(() => {})
  }, [recording, topics, bucket, playing, speed, version])

  return (
    <div className={cx('rp-frames', className)} data-count={Math.min(list.length, 4)} {...rest}>
      {list.map(([k, track]) => {
        const fallback = <FrameView key={k} recording={recording} track={track} time={time} version={version} />
        return renderItem ? <Keyed key={k}>{renderItem(k, track, fallback)}</Keyed> : fallback
      })}
      {list.length === 0 && (renderEmpty ? renderEmpty() : <p className="rp-frames-empty">No camera topics in this recording.</p>)}
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

export function Counter({ className, ...rest }: CounterProps) {
  const time = usePlayer((s) => s.time)
  const duration = usePlayer((s) => s.duration)
  return (
    <span className={cx('rp-counter', 'rp-mono', className)} {...rest}>
      {formatTime(time)}<span className="rp-dim"> / {formatTime(duration)}</span>
    </span>
  )
}

// ── Options: speed, auto-next ──────────────────────────────────────────────

export type OptionsProps = ComponentPropsWithRef<'div'>

/** No children → speed select and auto-next toggle. */
export function Options({ className, children, ...rest }: OptionsProps) {
  return (
    <div className={cx('rp-options', className)} {...rest}>
      {children ?? (
        <>
          <SpeedSelect />
          <AutoNext />
        </>
      )}
    </div>
  )
}

export type SpeedSelectProps = Omit<ComponentPropsWithRef<'select'>, 'value' | 'onChange' | 'children'> & { options?: number[] }

export function SpeedSelect({ options, className, ...rest }: SpeedSelectProps) {
  const { selectProps, options: all } = useSpeedSelect(options)
  return (
    <select {...selectProps} className={cx('rp-speed', className)} {...rest}>
      {all.map((s) => <option key={s} value={s}>{s}×</option>)}
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

// ── Tracks, metadata and topics ────────────────────────────────────────────

export type TracksProps = ComponentPropsWithRef<'div'> & {
  include?: Include
  renderItem?: (key: string, track: VectorTrack, fallback: ReactNode) => ReactNode
  /** Wider tracks start collapsed (see VectorChart). */
  maxSeries?: number
}

/** One chart per numeric field group (e.g. /joint_states/position). Children render after the charts, in the same grid. */
export function Tracks({ include, renderItem, maxSeries, className, children, ...rest }: TracksProps) {
  const vectors = usePlayer((s) => s.recording.vectors)
  const version = usePlayer((s) => s.version)
  const duration = usePlayer((s) => s.duration)
  const time = usePlayer((s) => s.time)
  const setTime = usePlayer((s) => s.setTime)
  const list = Object.entries(vectors).filter(([k]) => included(k, include))
  return (
    <div className={cx('rp-tracks', className)} {...rest}>
      {list.map(([k, track]) => {
        const fallback = <VectorChart key={k} name={k} track={track} duration={duration} time={time} onSeek={setTime} version={version} maxSeries={maxSeries} />
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

/** MCAP metadata records, header fields and long text topics (URDFs, configs); hidden when there are none. */
export function Metadata({ include, renderItem, title = 'Metadata', className, ...rest }: MetadataProps) {
  const metadata = usePlayer((s) => s.recording.metadata)
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

export type TopicsProps = Omit<ComponentPropsWithRef<'section'>, 'children' | 'title'> & {
  include?: Include
  renderItem?: (info: TopicInfo, fallback: ReactNode) => ReactNode
  title?: ReactNode
}

/** Every topic in the file with its schema, message count and how it is shown (or why it isn't). */
export function Topics({ include, renderItem, title = 'Topics', className, ...rest }: TopicsProps) {
  const topics = usePlayer((s) => s.recording.topics)
  usePlayer((s) => s.version)
  const list = [...topics.values()].filter((t) => included(t.topic, include))
  if (!list.length) return null
  return (
    <section className={cx('rp-metadata', 'rp-topics', className)} {...rest}>
      <h3>{title}</h3>
      <dl>
        {list.map((t) => {
          const fallback = (
            <div key={t.topic} data-kind={t.kind}>
              <dt>{t.topic}</dt>
              <dd className="rp-mono">
                {t.schema || t.encoding} · {t.count.toLocaleString()} msgs · {t.kind === 'other' ? 'not shown' : t.kind ?? '…'}
                {t.error && <span data-tone="error"> · {t.error}</span>}
              </dd>
            </div>
          )
          return renderItem ? <Keyed key={t.topic}>{renderItem(t, fallback)}</Keyed> : fallback
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
