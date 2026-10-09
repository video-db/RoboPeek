import { useRef, useState } from 'react'
import type { Source } from '@videodb/robopeek-rlds'
import { ShardViewer } from '@videodb/robopeek-react/rlds'
import { AppShell, Welcome, SAMPLE_URL } from './shared.tsx'
import { SourceBar } from './SourceBar.tsx'
import { DropTarget } from './DropTarget.tsx'

export default function ViewerApp() {
  const [source, setSource] = useState<Source | null>(() => new URLSearchParams(location.search).get('url'))
  const [selected, setSelected] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const open = (src: Source) => {
    setSource(src)
    setSelected(0)
    history.replaceState(null, '', typeof src === 'string' ? `?url=${encodeURIComponent(src)}` : location.pathname)
  }
  const url = typeof source === 'string' ? source : undefined

  return (
    <DropTarget className="app" onFile={open}>
      <AppShell mode="shard" url={url} episode={selected} sourceBar={<SourceBar key={url} defaultUrl={url} currentFile={source instanceof File ? source : undefined} onOpen={open} fileRef={fileRef} />}>
        <ShardViewer source={source} selected={selected} onSelectedChange={setSelected} autoFocus
          empty={<Welcome onSample={() => open(SAMPLE_URL)} onBrowse={() => fileRef.current?.click()} />}
        />
      </AppShell>
    </DropTarget>
  )
}
