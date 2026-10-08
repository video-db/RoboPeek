import { useRef, useState, type ComponentPropsWithRef } from 'react'
import { cx } from './cx.ts'

export type SourceBarProps = Omit<ComponentPropsWithRef<'form'>, 'onSubmit'> & {
  /** `episode` is passed when the episode field is shown. */
  onOpen: (src: File | string, episode?: number) => void
  onCancel?: () => void
  loading?: boolean
  /** Prefills the URL field; remount (key) to reset it. */
  defaultUrl?: string
  /** Shows an episode-number field, seeded with this value. */
  episode?: number
  /** Lets submit reuse an already-opened local file when the URL field is empty. */
  currentFile?: File
  placeholder?: string
  submitLabel?: string
}

/** URL field + file picker (+ optional episode number). */
export function SourceBar({
  onOpen,
  onCancel,
  loading,
  defaultUrl = '',
  episode,
  currentFile,
  placeholder = episode === undefined ? 'Paste a .tfrecord URL, or drop a file anywhere' : 'Paste a .tfrecord URL',
  submitLabel = episode === undefined ? 'Stream' : 'Show',
  className,
  ...rest
}: SourceBarProps) {
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
      className={cx('rlds-source', className)}
      onSubmit={(e) => {
        e.preventDefault()
        if (target) onOpen(target, withEpisode ? n : undefined)
      }}
      {...rest}
    >
      <input className="rlds-input rlds-source-url" type="url" aria-label="TFRecord URL" placeholder={placeholder} value={url} onChange={(e) => setUrl(e.target.value)} />
      {withEpisode && (
        <label className="rlds-source-episode">
          <span className="rlds-dim">Episode</span>
          <input className="rlds-input" type="number" min={0} step={1} value={num} onChange={(e) => setNum(e.target.value)} />
        </label>
      )}
      <button type="submit" className="rlds-btn rlds-btn-primary" disabled={!target}>{submitLabel}</button>
      <button type="button" className="rlds-btn" onClick={() => file.current?.click()}>Open file…</button>
      {loading && onCancel && <button type="button" className="rlds-btn" onClick={onCancel}>Stop</button>}
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
