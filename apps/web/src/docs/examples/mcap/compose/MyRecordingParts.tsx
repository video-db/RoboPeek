import { useMemo } from 'react'
import { formatTime, indexAt, rowAt, usePlayButton, usePlayer, type VectorTrack } from '@videodb/robopeek-react'
import { useCurrentRecording } from '@videodb/robopeek-react/mcap'

// Your own components. Each one reads live player state with usePlayer(selector)
// and re-renders only when the slice it selects changes. Positions are seconds.

export function RecordingHeader() {
  const recording = useCurrentRecording()
  const position = usePlayer((s) => s.position)
  const end = usePlayer((s) => s.end)
  const cameras = Object.keys(recording.images).length
  const signals = Object.keys(recording.vectors).length
  return (
    <header className="mm-header">
      <div>
        <p className="mm-kicker">Recording · {recording.metadata.profile || 'MCAP'}</p>
        <h3>{formatTime(position)} of {formatTime(end)}</h3>
        <p className="mm-facts">{recording.topics.size} topics · {cameras} camera{cameras === 1 ? '' : 's'} · {signals} signal{signals === 1 ? '' : 's'}</p>
      </div>
      <div className="mm-progress" aria-hidden><span style={{ width: `${(position / Math.max(1e-9, end)) * 100}%` }} /></div>
    </header>
  )
}

/** Same behaviour as Player.Play (via its hook), your own markup. */
export function BigPlay() {
  const { playing, buttonProps } = usePlayButton()
  return <button {...buttonProps} className="mm-play">{playing ? 'Pause' : 'Play'}</button>
}

/** In a time-based player, rate is a speed multiplier. */
export function SpeedChips() {
  const rate = usePlayer((s) => s.rate)
  const setRate = usePlayer((s) => s.setRate)
  return (
    <div className="mm-chips" role="group" aria-label="Playback speed">
      {[0.5, 1, 2].map((r) => (
        <button key={r} aria-pressed={rate === r} onClick={() => setRate(r)}>{r}×</button>
      ))}
    </div>
  )
}

/** Live bars for the first named signal (joint states, usually), scaled to its own range. */
export function CurrentSignal() {
  const vectors = useCurrentRecording().vectors
  const position = usePlayer((s) => s.position)
  usePlayer((s) => s.version) // tracks grow while the file loads
  const key = Object.keys(vectors).find((k) => vectors[k].names && vectors[k].dim > 1) ?? Object.keys(vectors).find((k) => vectors[k].dim > 1)
  const track = key ? vectors[key] : undefined
  const n = track?.data.length ?? 0 // the array grows in place while the file loads
  const scale = useMemo(() => {
    let max = 1e-9
    for (let k = 0; k < n; k++) if (Number.isFinite(track!.data[k])) max = Math.max(max, Math.abs(track!.data[k]))
    return max
  }, [track, n])
  if (!key || !track) return null

  const i = indexAt(track.times, position)
  if (i < 0) return null
  const values = rowAt(track, i).slice(0, 12)
  return (
    <section className="mm-card">
      <h4>{key} <span>at {formatTime(track.times[i])}</span></h4>
      <ul className="mm-bars">
        {values.map((v, d) => (
          <li key={d}>
            <span className="mm-dim" title={track.names?.[d]}>{d}</span>
            <span className="mm-track">
              <span className="mm-fill" data-neg={v < 0 || undefined} style={{ width: `${(Math.abs(v) / scale) * 50}%` }} />
            </span>
            <span className="mm-val">{v.toFixed(3)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Replaces the built-in chart for one-value tracks (a gripper, a velocity, …). */
export function ScalarTile({ name, track }: { name: string; track: VectorTrack }) {
  const position = usePlayer((s) => s.position)
  const i = indexAt(track.times, position)
  return (
    <section className="mm-card mm-scalar">
      <h4>{name}</h4>
      <strong>{i < 0 ? '–' : rowAt(track, i)[0].toFixed(3)}</strong>
    </section>
  )
}
