import { useCallback, useEffect, useRef, useState } from 'react'
import { ShardIndex, type Episode, type Progress } from '@rlds-viewer/core'
import { Player } from './components/Player'
import { SAMPLE_URL } from './components/SourceBar'

type Src = File | string
type State =
  | { phase: 'idle' }
  | { phase: 'loading'; n: number; progress?: Progress }
  | { phase: 'ready'; episode: Episode; progress?: Progress }
  | { phase: 'error'; error: string }

const mb = (n: number) => (n / 1e6).toFixed(1)
const srcName = (s: Src) => (typeof s === 'string' ? s.split('/').pop() : s.name)

/** Fetches one episode by number without loading the rest of the shard. Shareable as ?url=…&episode=N. */
export default function EpisodeApp() {
  const params = new URLSearchParams(location.search)
  const [url, setUrl] = useState(params.get('url') ?? '')
  const [num, setNum] = useState(params.get('episode') ?? '0')
  const [src, setSrc] = useState<Src | null>(null)
  const [state, setState] = useState<State>({ phase: 'idle' })
  const [fps, setFps] = useState(10)
  const [autoNext, setAutoNext] = useState(false)
  const [autoplay, setAutoplay] = useState(false)
  const [known, setKnown] = useState({ count: 0, complete: false })
  const shard = useRef<{ src: Src; index: Promise<ShardIndex> } | null>(null)
  const active = useRef<AbortController | null>(null)
  const file = useRef<HTMLInputElement>(null)

  const load = useCallback(async (s: Src, n: number, play = false) => {
    active.current?.abort()
    const ac = new AbortController()
    active.current = ac
    setSrc(s)
    setNum(String(n))
    setAutoplay(play)
    setState({ phase: 'loading', n })
    if (shard.current?.src !== s) setKnown({ count: 0, complete: false })
    if (typeof s === 'string') history.replaceState(null, '', `?url=${encodeURIComponent(s)}&episode=${n}`)

    try {
      if (shard.current?.src !== s) shard.current = { src: s, index: ShardIndex.open(s) }
      const index = await shard.current.index
      let progress: Progress | undefined
      const episode = await index.episode(n, {
        signal: ac.signal,
        onProgress: (p) => { progress = p; setState({ phase: 'loading', n, progress: p }) },
      })
      if (ac.signal.aborted) return
      setKnown({ count: index.entries.length, complete: index.complete })
      if (!episode) {
        const count = index.entries.length
        setState({ phase: 'error', error: `Episode ${n} does not exist. This shard has ${count} episodes (0–${count - 1}).` })
      } else setState({ phase: 'ready', episode, progress })
    } catch (e) {
      if (ac.signal.aborted) return
      if (shard.current?.src === s && !(await shard.current.index.catch(() => null))) shard.current = null
      const msg = e instanceof TypeError ? 'Network error. Check the URL, and that the server allows cross-origin requests.' : (e as Error).message
      setState({ phase: 'error', error: msg })
    }
  }, [])

  useEffect(() => {
    if (url && params.has('episode')) load(url, Math.max(0, Number(num) || 0))
    return () => active.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link runs once on mount
  }, [])

  const n = Math.max(0, Math.floor(Number(num) || 0))

  const episode = state.phase === 'ready' ? state.episode : undefined
  const hasNext = !!episode && !(known.complete && episode.index >= known.count - 1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!episode || !src || (e.target as HTMLElement).closest('input, select, textarea')) return
      if (e.key === 'ArrowDown' && hasNext) { e.preventDefault(); load(src, episode.index + 1) }
      if (e.key === 'ArrowUp' && episode.index > 0) { e.preventDefault(); load(src, episode.index - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [episode, src, hasNext, load])

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <strong>RLDS Viewer</strong>
          <span className="dim">Single episode</span>
        </div>
        <form
          className="source"
          onSubmit={(e) => {
            e.preventDefault()
            const target = url.trim() || (src instanceof File ? src : null)
            if (target) load(target, n)
          }}
        >
          <input id="source-url" type="url" placeholder="Paste a .tfrecord URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <label className="episode-no">
            <span className="dim">Episode</span>
            <input id="episode-number" type="number" min={0} step={1} value={num} onChange={(e) => setNum(e.target.value)} />
          </label>
          <button type="submit" className="primary" disabled={!url.trim() && !(src instanceof File)}>Show</button>
          <button type="button" onClick={() => file.current?.click()}>Open file…</button>
          <input
            ref={file}
            id="source-file"
            type="file"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) { setUrl(''); load(f, n) }
              e.target.value = ''
            }}
          />
        </form>
        <a className="nav" href={`./${url ? `?url=${encodeURIComponent(url)}` : ''}`}>Full viewer</a>
      </header>

      {src && <Strip src={src} state={state} known={known} />}

      {state.phase === 'idle' && (
        <main className="welcome">
          <h1>Open one episode without loading the whole shard</h1>
          <p>
            Give a TFRecord URL and an episode number. The viewer reads through the file only as far as that
            episode, skips the ones before it without decoding them, and stops downloading once it has the episode.
            Episodes it has already passed load later with a single small request. The link in the address bar opens the same episode.
          </p>
          <button className="primary" onClick={() => { setUrl(SAMPLE_URL); load(SAMPLE_URL, 40) }}>
            Show CognitiveDrone episode 40
          </button>
        </main>
      )}
      {state.phase === 'loading' && <div className="waiting">Finding episode {state.n}…</div>}
      {state.phase === 'error' && <div className="waiting error-text">{state.error}</div>}
      {episode && src && (
        <main className="single">
          <Player
            key={`${srcName(src)}#${episode.index}`}
            episode={episode}
            fps={fps}
            onFps={setFps}
            autoNext={autoNext}
            onAutoNext={setAutoNext}
            autoplay={autoplay}
            hasPrev={episode.index > 0}
            hasNext={hasNext}
            onPrev={() => load(src, episode.index - 1)}
            onNext={(play) => load(src, episode.index + 1, play)}
          />
        </main>
      )}
    </div>
  )
}

function Strip({ src, state, known }: { src: Src; state: State; known: { count: number; complete: boolean } }) {
  const progress = state.phase === 'loading' || state.phase === 'ready' ? state.progress : undefined
  const pct = state.phase === 'loading' && progress?.total ? (progress.loaded / progress.total) * 100 : 0
  return (
    <div className={`strip ${state.phase === 'loading' ? 'loading' : 'done'}`}>
      <div className="bar" style={{ width: `${pct}%` }} />
      <div className="strip-text">
        <span className="source-name" title={typeof src === 'string' ? src : src.name}>{srcName(src)}</span>
        {state.phase === 'ready' && (
          <span className="mono">
            Episode {state.episode.index} · {state.episode.length} steps · {mb(state.episode.byteSize)} MB
          </span>
        )}
        {progress && (
          <span className="mono dim">
            read to {mb(progress.loaded)}{progress.total ? ` of ${mb(progress.total)}` : ''} MB
          </span>
        )}
        {state.phase === 'ready' && !progress && <span className="mono dim">fetched by range request</span>}
        {known.count > 0 && (
          <span className="mono dim">{known.complete ? `${known.count} episodes in shard` : `${known.count} episodes located so far`}</span>
        )}
      </div>
    </div>
  )
}
