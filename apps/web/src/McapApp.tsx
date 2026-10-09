import { useRef, useState } from 'react'
import type { Source } from '@videodb/robopeek-mcap'
import { McapViewer } from '@videodb/robopeek-react/mcap'
import { AppShell, Welcome } from './shared.tsx'
import { SourceBar } from './SourceBar.tsx'
import { DropTarget } from './DropTarget.tsx'
import { MCAP_SAMPLES } from './samples.ts'

export default function McapApp() {
  const [source, setSource] = useState<Source | null>(() => new URLSearchParams(location.search).get('url'))
  const fileRef = useRef<HTMLInputElement>(null)
  // ?budget=<MB> caps frame memory, to exercise release-and-refetch on smaller files.
  const budget = Number(new URLSearchParams(location.search).get('budget')) * 1e6 || undefined
  const open = (src: Source) => {
    setSource(src)
    history.replaceState(null, '', typeof src === 'string' ? `?url=${encodeURIComponent(src)}${budget ? `&budget=${budget / 1e6}` : ''}` : location.pathname)
  }
  const url = typeof source === 'string' ? source : undefined

  return (
    <DropTarget className="app" label="MCAP" onFile={open}>
      <AppShell mode="mcap" url={url} sourceBar={<SourceBar key={url} format="mcap" submitLabel="Load recording" defaultUrl={url} currentFile={source instanceof File ? source : undefined} onOpen={open} fileRef={fileRef} />}>
        <McapViewer source={source} maxFrameBytes={budget} autoFocus
          empty={<Welcome mode="mcap" onSample={() => open(MCAP_SAMPLES[0].url)} onBrowse={() => fileRef.current?.click()} />}
        />
      </AppShell>
    </DropTarget>
  )
}
