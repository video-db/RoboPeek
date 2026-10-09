import { useId, useState, type RefObject } from 'react'
import { Button, Icon, Input } from './ui.tsx'

type Props = {
  onOpen: (src: File | string, episode?: number) => void
  defaultUrl?: string
  episode?: number
  currentFile?: File
  submitLabel?: string
  descriptionId?: string
  fileRef: RefObject<HTMLInputElement | null>
  format?: 'rlds' | 'mcap'
}

const FORMATS = {
  rlds: { source: 'Dataset source', file: 'TFRecord', example: 'a TFRecord URL', accept: undefined },
  mcap: { source: 'Recording source', file: 'MCAP', example: 'an .mcap URL', accept: '.mcap' },
}

/** URL field + file picker (+ optional episode number). */
export function SourceBar({ onOpen, defaultUrl = '', episode, currentFile, fileRef, submitLabel, descriptionId, format = 'rlds' }: Props) {
  const f = FORMATS[format]
  const [url, setUrl] = useState(defaultUrl)
  const [num, setNum] = useState(String(episode ?? 0))
  const [seen, setSeen] = useState(episode)
  if (seen !== episode) {
    setSeen(episode)
    setNum(String(episode ?? 0))
  }
  const urlId = useId()
  const withEpisode = episode !== undefined
  const n = Math.max(0, Math.floor(Number(num) || 0))
  const target = url.trim() || currentFile

  return (
    <form className="source" onSubmit={(e) => {
      e.preventDefault()
      if (target) onOpen(target, withEpisode ? n : undefined)
    }}>
      <div className="source-heading"><label htmlFor={urlId}>{f.source}</label><span><Icon name="shield" />Runs locally in your browser</span></div>
      <div className="source-controls">
        <div className="source-url-wrap">
          <Icon name={currentFile ? 'file' : 'link'} />
          <Input id={urlId} className="source-url" type="url" aria-label={`${f.file} URL`} aria-describedby={descriptionId}
            placeholder={currentFile ? currentFile.name : `Paste ${f.example}, e.g. https://huggingface.co/datasets/…`}
            title={currentFile?.name} spellCheck={false} autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        {withEpisode && <label className="source-episode"><span>Episode</span><Input aria-label="Episode number" type="number" min={0} step={1} value={num} onChange={(e) => setNum(e.target.value)} /></label>}
        <Button type="submit" variant="primary" disabled={!target}>{submitLabel ?? (withEpisode ? 'Open episode' : 'Load dataset')}<Icon name="arrow" /></Button>
        <span className="source-separator" />
        <Button onClick={() => fileRef.current?.click()}><Icon name="upload" />Open file</Button>
      </div>
      <input ref={fileRef} type="file" aria-label={`Open ${f.file} file`} accept={f.accept} hidden onChange={(e) => {
        const f = e.target.files?.[0]
        if (f) { setUrl(''); onOpen(f, withEpisode ? n : undefined) }
        e.target.value = ''
      }} />
    </form>
  )
}
