import { useEffect } from 'react'
import { vectorAt, type Episode } from '@rlds-viewer/core'
import { usePlayback } from '../hooks/usePlayback'
import { FrameCanvas } from './FrameCanvas'
import { VectorChart } from './VectorChart'

const FLAGS = ['is_first', 'is_last', 'is_terminal']
const FPS = [2, 5, 10, 15, 30, 60]

type Props = {
  episode: Episode
  fps: number
  onFps: (fps: number) => void
  autoNext: boolean
  onAutoNext: (v: boolean) => void
  autoplay: boolean
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: (autoplay: boolean) => void
}

const isTyping = (e: KeyboardEvent) => (e.target as HTMLElement).closest('input, select, textarea')

export function Player({ episode, fps, onFps, autoNext, onAutoNext, autoplay, hasPrev, hasNext, onPrev, onNext }: Props) {
  const { step, setStep, playing, toggle } = usePlayback(episode.length, fps, {
    autoplay,
    onEnd: () => { if (autoNext && hasNext) onNext(true) },
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      const jump = e.shiftKey ? 10 : 1
      if (e.key === ' ') { e.preventDefault(); toggle() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setStep(step + jump) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setStep(step - jump) }
      else if (e.key === 'Home') setStep(0)
      else if (e.key === 'End') setStep(episode.length - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, setStep, step, episode.length])

  const images = Object.entries(episode.images)
  const charts = Object.entries(episode.vectors).filter(([k]) => !FLAGS.includes(k))
  const flags = FLAGS.filter((k) => episode.vectors[k] && vectorAt(episode.vectors[k], step)[0])
  const texts = Object.entries(episode.text)
  const metadata = Object.entries(episode.metadata)

  return (
    <div className="player">
      <div className="stage">
        {texts.map(([k, vals]) => (
          <p key={k} className="instruction" title={k}>{vals[step]}</p>
        ))}
        <div className={`frames n${Math.min(images.length, 3)}`}>
          {images.map(([k, track]) => <FrameCanvas key={k} name={k} track={track} step={step} />)}
          {images.length === 0 && <p className="empty-frames">No image features in this episode.</p>}
        </div>

        <div className="transport">
          <button className="icon" onClick={onPrev} disabled={!hasPrev} title="Previous episode (↑)"><SkipIcon back /></button>
          <button className="icon" onClick={() => setStep(step - 1)} title="Previous step (←)"><StepIcon back /></button>
          <button className="icon play" onClick={toggle} title="Play/pause (space)">{playing ? <PauseIcon /> : <PlayIcon />}</button>
          <button className="icon" onClick={() => setStep(step + 1)} title="Next step (→)"><StepIcon /></button>
          <button className="icon" onClick={() => onNext(playing)} disabled={!hasNext} title="Next episode (↓)"><SkipIcon /></button>
          <input
            id="scrubber"
            type="range"
            min={0}
            max={episode.length - 1}
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            aria-label="Step"
          />
          <span className="mono counter">{step}<span className="dim"> / {episode.length - 1}</span></span>
        </div>

        <div className="status-row">
          <label>
            <select id="fps" value={fps} onChange={(e) => onFps(Number(e.target.value))}>
              {FPS.map((f) => <option key={f} value={f}>{f} fps</option>)}
            </select>
          </label>
          <label className="check">
            <input id="auto-next" type="checkbox" checked={autoNext} onChange={(e) => onAutoNext(e.target.checked)} />
            Continue to next episode
          </label>
          <span className="flags">
            {FLAGS.filter((k) => episode.vectors[k]).map((k) => (
              <span key={k} className={`chip ${flags.includes(k) ? 'on' : ''}`}>{k.replace('is_', '')}</span>
            ))}
          </span>
        </div>
      </div>

      <div className="tracks">
        {charts.map(([k, track]) => (
          <VectorChart key={k} name={k} track={track} length={episode.length} step={step} onSeek={setStep} />
        ))}
        {metadata.length > 0 && (
          <section className="metadata">
            <h3>Other features</h3>
            <dl>
              {metadata.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd className="mono">{v}</dd></div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </div>
  )
}

const PlayIcon = () => <svg viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" /></svg>
const PauseIcon = () => <svg viewBox="0 0 16 16"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" /></svg>
const StepIcon = ({ back }: { back?: boolean }) => (
  <svg viewBox="0 0 16 16" style={back ? { transform: 'scaleX(-1)' } : undefined}><path d="M4 3v10l6-5zM11 3h2v10h-2z" /></svg>
)
const SkipIcon = ({ back }: { back?: boolean }) => (
  <svg viewBox="0 0 16 16" style={back ? { transform: 'scaleX(-1)' } : undefined}><path d="M2 3v10l5.5-5zM8 3v10l5.5-5zM13 3h1.5v10H13z" /></svg>
)
