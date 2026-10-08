import { useEffect, useState } from 'react'
import { useEpisodeStream, type StreamStatus } from './hooks/useEpisodeStream'
import { SourceBar, SAMPLE_URL } from './components/SourceBar'
import { EpisodeList } from './components/EpisodeList'
import { Player } from './components/Player'

const mb = (n: number) => (n / 1e6).toFixed(1)

export default function App() {
  const { episodes, status, load, cancel } = useEpisodeStream()
  const [selected, setSelected] = useState(0)
  const [autoplay, setAutoplay] = useState(false)
  const [fps, setFps] = useState(10)
  const [autoNext, setAutoNext] = useState(false)
  const [dragging, setDragging] = useState(false)

  const open = (src: File | string) => {
    setSelected(0)
    setAutoplay(false)
    if (typeof src === 'string') history.replaceState(null, '', `?url=${encodeURIComponent(src)}`)
    load(src)
  }
  const select = (i: number, play = false) => {
    setSelected(i)
    setAutoplay(play)
  }

  useEffect(() => {
    const url = new URLSearchParams(location.search).get('url')
    if (url) load(url)
  }, [load])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return
      if (e.key === 'ArrowDown' && selected < episodes.length - 1) { e.preventDefault(); select(selected + 1) }
      if (e.key === 'ArrowUp' && selected > 0) { e.preventDefault(); select(selected - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, episodes.length])

  const episode = episodes[selected]
  const loading = status.phase === 'loading'

  return (
    <div
      className="app"
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false) }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) open(f)
      }}
    >
      <header className="top">
        <div className="brand">
          <strong>RLDS Viewer</strong>
          <span className="dim">TFRecord episodes</span>
        </div>
        <SourceBar status={status} onOpen={open} onCancel={cancel} />
        <a className="nav" href={`episode.html${status.source?.startsWith('http') ? `?url=${encodeURIComponent(status.source)}&episode=${episode?.index ?? 0}` : ''}`}>
          Single episode
        </a>
      </header>
      <StatusStrip status={status} episodes={episodes.length} steps={episodes.reduce((s, e) => s + e.length, 0)} />

      {status.phase === 'idle' ? (
        <Welcome onSample={() => open(SAMPLE_URL)} />
      ) : (
        <main className="body">
          <EpisodeList episodes={episodes} selected={selected} loading={loading} onSelect={(i) => select(i)} />
          {episode ? (
            <Player
              key={`${status.source}#${episode.index}`}
              episode={episode}
              fps={fps}
              onFps={setFps}
              autoNext={autoNext}
              onAutoNext={setAutoNext}
              autoplay={autoplay}
              hasPrev={selected > 0}
              hasNext={selected < episodes.length - 1}
              onPrev={() => select(selected - 1)}
              onNext={(play) => select(selected + 1, play)}
            />
          ) : (
            <div className="waiting">{loading ? 'Waiting for the first episode…' : 'This file has no episodes.'}</div>
          )}
        </main>
      )}

      {dragging && <div className="drop">Drop a TFRecord file to stream it</div>}
    </div>
  )
}

function StatusStrip({ status, episodes, steps }: { status: StreamStatus; episodes: number; steps: number }) {
  if (status.phase === 'idle') return null
  const pct = status.total ? Math.min(100, (status.loaded / status.total) * 100) : status.phase === 'loading' ? 0 : 100
  return (
    <div className={`strip ${status.phase}`}>
      <div className="bar" style={{ width: `${pct}%` }} />
      <div className="strip-text">
        <span className="source-name" title={status.source}>{status.source?.split('/').pop()}</span>
        <span className="mono">
          {episodes} episodes · {steps.toLocaleString()} steps · {mb(status.loaded)}
          {status.total ? ` of ${mb(status.total)}` : ''} MB
        </span>
        {status.phase === 'cancelled' && <span className="note">Stopped</span>}
        {status.phase === 'error' && <span className="note error">{status.error}</span>}
      </div>
    </div>
  )
}

function Welcome({ onSample }: { onSample: () => void }) {
  return (
    <main className="welcome">
      <h1>Stream an RLDS shard and watch its episodes</h1>
      <p>
        Paste the URL of a TFRecord file, open one from disk, or drop it on this window. Each record is one
        episode. Episodes appear in the list as their bytes arrive, so you can start playing before the file finishes loading.
      </p>
      <button className="primary" onClick={onSample}>Stream a CognitiveDrone sample (82 MB)</button>
      <dl className="keys">
        <div><dt>Space</dt><dd>Play or pause</dd></div>
        <div><dt>← →</dt><dd>Step (Shift jumps 10)</dd></div>
        <div><dt>↑ ↓</dt><dd>Previous or next episode</dd></div>
      </dl>
    </main>
  )
}
