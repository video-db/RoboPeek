import { useState } from 'react'
import { ShardViewer, type Source } from '@videodb/robopeek-react'
import { Brand, SAMPLE_URL } from './shared.tsx'
import { SourceBar } from './SourceBar.tsx'
import { DropTarget } from './DropTarget.tsx'

export default function App() {
  const [source, setSource] = useState<Source | null>(() => new URLSearchParams(location.search).get('url'))
  const [selected, setSelected] = useState(0)
  const open = (src: Source) => {
    setSource(src)
    setSelected(0)
    if (typeof src === 'string') history.replaceState(null, '', `?url=${encodeURIComponent(src)}`)
  }
  const url = typeof source === 'string' ? source : undefined

  return (
    <DropTarget className="app" onFile={open}>
      <header className="top">
        <Brand sub="TFRecord episodes" />
        <SourceBar key={url} defaultUrl={url} onOpen={open} />
        <a className="nav" href={`episode.html${url ? `?url=${encodeURIComponent(url)}&episode=${selected}` : ''}`}>Single episode</a>
      </header>
      <ShardViewer
        source={source}
        selected={selected}
        onSelectedChange={setSelected}
        autoFocus
        empty={<Welcome onSample={() => open(SAMPLE_URL)} />}
      />
    </DropTarget>
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
