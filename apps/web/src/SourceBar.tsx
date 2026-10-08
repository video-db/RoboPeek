import { useRef, useState } from 'react'

type Props = {
  /** `episode` is passed when the episode field is shown. */
  onOpen: (src: File | string, episode?: number) => void
  /** Prefills the URL field; remount (key) to reset it. */
  defaultUrl?: string
  /** Shows an episode-number field, seeded with this value. */
  episode?: number
  /** Lets submit reuse an already-opened local file when the URL field is empty. */
  currentFile?: File
}

/** URL field + file picker (+ optional episode number). The app's way in; the viewers only take a source. */
export function SourceBar({ onOpen, defaultUrl = '', episode, currentFile }: Props) {
  const [url, setUrl] = useState(defaultUrl)
  const [num, setNum] = useState(String(episode ?? 0))
  const [seen, setSeen] = useState(episode)
  if (seen !== episode) {
    setSeen(episode)
    setNum(String(episode ?? 0))
  }
  const file = useRef<HTMLInputElement>(null)
  const withEpisode = episode !== undefined
  const n = Math.max(0, Math.floor(Number(num) || 0))
  const target = url.trim() || currentFile

  return (
    <form
      className="source"
      onSubmit={(e) => {
        e.preventDefault()
        if (target) onOpen(target, withEpisode ? n : undefined)
      }}
    >
      <input
        className="source-url"
        type="url"
        aria-label="TFRecord URL"
        placeholder={withEpisode ? 'Paste a .tfrecord URL' : 'Paste a .tfrecord URL, or drop a file anywhere'}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      {withEpisode && (
        <label className="source-episode">
          <span>Episode</span>
          <input type="number" min={0} step={1} value={num} onChange={(e) => setNum(e.target.value)} />
        </label>
      )}
      <button type="submit" className="primary" disabled={!target}>{withEpisode ? 'Show' : 'Stream'}</button>
      <button type="button" onClick={() => file.current?.click()}>Open file…</button>
      <input
        ref={file}
        type="file"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) { setUrl(''); onOpen(f, withEpisode ? n : undefined) }
          e.target.value = ''
        }}
      />
    </form>
  )
}
