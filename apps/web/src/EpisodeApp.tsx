import { useEffect, useRef, useState } from 'react'
import { EpisodeViewer, type Source } from '@videodb/robopeek-react'
import { AppShell, Welcome, SAMPLE_URL } from './shared.tsx'
import { SourceBar } from './SourceBar.tsx'
import { DropTarget } from './DropTarget.tsx'

/** One episode by number without loading the rest of the shard. Shareable as ?url=…&episode=N. */
export default function EpisodeApp() {
  const [params] = useState(() => new URLSearchParams(location.search))
  const [source, setSource] = useState<Source | null>(params.has('episode') ? params.get('url') : null)
  const [n, setN] = useState(() => Math.max(0, Math.floor(Number(params.get('episode')) || 0)))
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof source === 'string') history.replaceState(null, '', `?url=${encodeURIComponent(source)}&episode=${n}`)
    else if (source) history.replaceState(null, '', location.pathname)
  }, [source, n])

  const url = typeof source === 'string' ? source : undefined
  const open = (next: Source, ep = 0) => { setSource(next); setN(ep) }

  return (
    <DropTarget className="app" onFile={(file) => open(file, n)}>
      <AppShell mode="episode" url={url} episode={n} sourceBar={
        <SourceBar key={url} defaultUrl={url} episode={n} currentFile={source instanceof File ? source : undefined} onOpen={open} fileRef={fileRef} />
      }>
        <EpisodeViewer source={source} episode={n} onEpisodeChange={setN} autoFocus
          empty={<Welcome single onSample={() => open(SAMPLE_URL, 40)} onBrowse={() => fileRef.current?.click()} />}
        />
      </AppShell>
    </DropTarget>
  )
}
