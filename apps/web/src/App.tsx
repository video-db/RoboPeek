import { useState } from 'react'
import { ShardViewer, type Source } from '@rlds-viewer/react'
import { Brand, SAMPLE_URL } from './shared.tsx'

export default function App() {
  const [source, setSource] = useState<Source | null>(() => new URLSearchParams(location.search).get('url'))
  const open = (src: Source) => {
    setSource(src)
    if (typeof src === 'string') history.replaceState(null, '', `?url=${encodeURIComponent(src)}`)
  }

  return (
    <ShardViewer
      source={source}
      onSourceChange={open}
      autoFocus
      empty={<Welcome onSample={() => open(SAMPLE_URL)} />}
      renderHeader={(bar, { source, episode }) => (
        <header className="top">
          <Brand sub="TFRecord episodes" />
          {bar}
          <a className="nav" href={`episode.html${typeof source === 'string' ? `?url=${encodeURIComponent(source)}&episode=${episode?.index ?? 0}` : ''}`}>
            Single episode
          </a>
        </header>
      )}
    />
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
