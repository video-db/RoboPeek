import { useEffect, useMemo, useRef, useState } from 'react'
import { episodeTitle, type Episode } from '@rlds-viewer/core'

type Props = { episodes: Episode[]; selected: number; loading: boolean; onSelect: (i: number) => void }

export function EpisodeList({ episodes, selected, loading, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const list = useRef<HTMLOListElement>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = episodes.map((ep) => ({ ep, title: episodeTitle(ep) }))
    return q ? all.filter((r) => r.title?.toLowerCase().includes(q) || String(r.ep.index) === q) : all
  }, [episodes, query])

  useEffect(() => {
    list.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <aside className="episodes">
      <input
        id="episode-filter"
        type="search"
        placeholder="Filter by instruction"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ol ref={list}>
        {rows.map(({ ep, title }) => (
          <li key={ep.index}>
            <button aria-current={ep.index === selected} onClick={() => onSelect(ep.index)}>
              <span className="row-head mono">
                <span>#{ep.index}</span>
                <span className="dim">{ep.length} steps</span>
              </span>
              <span className="row-title">{title ?? 'Untitled episode'}</span>
            </button>
          </li>
        ))}
        {loading && <li className="pending">Receiving episode {episodes.length}…</li>}
        {!loading && rows.length === 0 && episodes.length > 0 && <li className="pending">No episode matches “{query}”.</li>}
      </ol>
    </aside>
  )
}
