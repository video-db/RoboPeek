import { useRef, useState } from 'react'
import type { StreamStatus } from '../hooks/useEpisodeStream'

export const SAMPLE_URL =
  'https://huggingface.co/datasets/ArtemLykov/CognitiveDrone_dataset/resolve/main/data/rlds/train/cognitive_drone-train.tfrecord-00005-of-00128'

type Props = { status: StreamStatus; onOpen: (src: File | string) => void; onCancel: () => void }

export function SourceBar({ status, onOpen, onCancel }: Props) {
  const [url, setUrl] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const loading = status.phase === 'loading'

  return (
    <form
      className="source"
      onSubmit={(e) => {
        e.preventDefault()
        if (url.trim()) onOpen(url.trim())
      }}
    >
      <input
        id="source-url"
        type="url"
        placeholder="Paste a .tfrecord URL, or drop a file anywhere"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button type="submit" className="primary" disabled={!url.trim()}>Stream</button>
      <button type="button" onClick={() => file.current?.click()}>Open file…</button>
      {loading && <button type="button" onClick={onCancel}>Stop</button>}
      <input
        ref={file}
        id="source-file"
        type="file"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onOpen(f)
          e.target.value = ''
        }}
      />
    </form>
  )
}
