import { useMemo } from 'react'
import { episodeTitle, formatFeature, vectorAt } from '@videodb/robopeek-rlds'
import { rowAt, usePlayButton, usePlayer, type VectorTrack } from '@videodb/robopeek-react'
import { useCurrentEpisode } from '@videodb/robopeek-react/rlds'

// Your own components. Each one reads live player state with usePlayer(selector)
// and re-renders only when the slice it selects changes.

export function EpisodeHeader() {
  const episode = useCurrentEpisode()
  const step = usePlayer((s) => s.position)
  const cameras = Object.keys(episode.images).length
  return (
    <header className="mm-header">
      <div>
        <p className="mm-kicker">Episode {episode.index}</p>
        <h3>{episodeTitle(episode) || 'Untitled episode'}</h3>
        <p className="mm-facts">{episode.length} steps · {cameras} camera{cameras === 1 ? '' : 's'} · {(episode.byteSize / 1e6).toFixed(1)} MB</p>
      </div>
      <div className="mm-progress" aria-hidden><span style={{ width: `${(step / Math.max(1, episode.length - 1)) * 100}%` }} /></div>
    </header>
  )
}

/** Same behaviour as Player.Play (via its hook), your own markup. */
export function BigPlay() {
  const { playing, buttonProps } = usePlayButton()
  return <button {...buttonProps} className="mm-play">{playing ? 'Pause' : 'Play'}</button>
}

export function SpeedChips() {
  const fps = usePlayer((s) => s.rate)
  const setFps = usePlayer((s) => s.setRate)
  return (
    <div className="mm-chips" role="group" aria-label="Playback speed">
      {[5, 10, 30].map((f) => (
        <button key={f} aria-pressed={fps === f} onClick={() => setFps(f)}>{f} fps</button>
      ))}
    </div>
  )
}

/** Live bars for the action vector at the current step, scaled to the episode's own range. */
export function CurrentAction() {
  const vectors = useCurrentEpisode().vectors
  const step = usePlayer((s) => s.position)
  const key = 'action' in vectors ? 'action' : Object.keys(vectors).find((k) => k.startsWith('action'))
  const track = key ? vectors[key] : undefined
  const scale = useMemo(() => {
    let max = 1e-9
    for (const v of track?.data ?? []) max = Math.max(max, Math.abs(v))
    return max
  }, [track])
  if (!key || !track) return null

  const values = Array.from(vectorAt(track, step)).slice(0, 12)
  return (
    <section className="mm-card">
      <h4>{key} <span>at step {step}</span></h4>
      <ul className="mm-bars">
        {values.map((v, i) => (
          <li key={i}>
            <span className="mm-dim">{i}</span>
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

export function EpisodeCard() {
  const metadata = useCurrentEpisode().metadata
  const entries = Object.entries(metadata)
  return (
    <section className="mm-card">
      <h4>Episode metadata</h4>
      {entries.length === 0 ? (
        <p className="mm-empty">This dataset stores no episode metadata.</p>
      ) : (
        <dl className="mm-meta">
          {entries.map(([k, f]) => (
            <div key={k}><dt>{k.replace('episode_metadata/', '')}</dt><dd title={formatFeature(f)}>{formatFeature(f)}</dd></div>
          ))}
        </dl>
      )}
    </section>
  )
}

/** Replaces the built-in chart for single-value tracks (reward, discount, …). */
export function ScalarTile({ name, track }: { name: string; track: VectorTrack }) {
  const step = usePlayer((s) => s.position)
  return (
    <section className="mm-card mm-scalar">
      <h4>{name}</h4>
      <strong>{rowAt(track, step)[0].toFixed(3)}</strong>
    </section>
  )
}
