import { useEffect, useState } from 'react'
import { EpisodeViewer, type Source } from '@robopeek/react'
import { Brand, SAMPLE_URL } from './shared.tsx'
import { SourceBar } from './SourceBar.tsx'

/** One episode by number without loading the rest of the shard. Shareable as ?url=…&episode=N. */
export default function EpisodeApp() {
  const [params] = useState(() => new URLSearchParams(location.search))
  const [source, setSource] = useState<Source | null>(params.has('episode') ? params.get('url') : null)
  const [n, setN] = useState(() => Math.max(0, Math.floor(Number(params.get('episode')) || 0)))

  useEffect(() => {
    if (typeof source === 'string') history.replaceState(null, '', `?url=${encodeURIComponent(source)}&episode=${n}`)
  }, [source, n])

  const url = typeof source === 'string' ? source : undefined

  return (
    <div className="app">
      <header className="top">
        <Brand sub="Single episode" />
        <SourceBar
          key={url}
          defaultUrl={url}
          episode={n}
          currentFile={source instanceof File ? source : undefined}
          onOpen={(next, ep) => { setSource(next); setN(ep ?? 0) }}
        />
        <a className="nav" href={`./${url ? `?url=${encodeURIComponent(url)}` : ''}`}>Full viewer</a>
      </header>
      <EpisodeViewer
        source={source}
        episode={n}
        onEpisodeChange={setN}
        autoFocus
        empty={
          <main className="welcome">
            <h1>Open one episode without loading the whole shard</h1>
            <p>
              Give a TFRecord URL and an episode number. The viewer reads through the file only as far as that
              episode, skips the ones before it without decoding them, and stops downloading once it has the episode.
              Episodes it has already passed load later with a single small request. The link in the address bar opens the same episode.
            </p>
            <button className="primary" onClick={() => { setSource(SAMPLE_URL); setN(40) }}>
              Show CognitiveDrone episode 40
            </button>
          </main>
        }
      />
    </div>
  )
}
