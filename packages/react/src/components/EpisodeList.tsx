import { useEffect, useMemo, useRef, useState, type ComponentPropsWithRef, type ReactNode } from 'react'
import { episodeTitle, type Episode } from '@rlds-viewer/core'
import { cx } from './cx.ts'

export type EpisodeListProps = Omit<ComponentPropsWithRef<'aside'>, 'onSelect' | 'children'> & {
  episodes: Episode[]
  selected: number
  onSelect: (index: number) => void
  /** Shows a "Receiving episode N…" row while more episodes stream in. */
  loading?: boolean
  /** Row title; also what the filter matches. Defaults to the episode's language instruction. */
  renderTitle?: (episode: Episode) => string | undefined
  /** Replaces the whole row body; `fallback` is the built-in one. */
  renderItem?: (episode: Episode, fallback: ReactNode) => ReactNode
  filterPlaceholder?: string
}

/** The episodes drawer: filterable list, current row kept in view. */
export function EpisodeList({
  episodes,
  selected,
  onSelect,
  loading,
  renderTitle = episodeTitle,
  renderItem,
  filterPlaceholder = 'Filter by instruction',
  className,
  ...rest
}: EpisodeListProps) {
  const [query, setQuery] = useState('')
  const list = useRef<HTMLOListElement>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = episodes.map((ep) => ({ ep, title: renderTitle(ep) }))
    return q ? all.filter((r) => r.title?.toLowerCase().includes(q) || String(r.ep.index) === q) : all
  }, [episodes, query, renderTitle])

  useEffect(() => {
    list.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <aside className={cx('rlds-episodes', className)} {...rest}>
      <input
        className="rlds-input"
        type="search"
        placeholder={filterPlaceholder}
        aria-label={filterPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ol ref={list}>
        {rows.map(({ ep, title }) => {
          const body = (
            <>
              <span className="rlds-episodes-head rlds-mono">
                <span>#{ep.index}</span>
                <span className="rlds-dim">{ep.length} steps</span>
              </span>
              <span className="rlds-episodes-title">{title ?? 'Untitled episode'}</span>
            </>
          )
          return (
            <li key={ep.index}>
              <button type="button" aria-current={ep.index === selected} onClick={() => onSelect(ep.index)}>
                {renderItem ? renderItem(ep, body) : body}
              </button>
            </li>
          )
        })}
        {loading && <li className="rlds-episodes-pending">Receiving episode {episodes.length}…</li>}
        {!loading && rows.length === 0 && episodes.length > 0 && <li className="rlds-episodes-pending">No episode matches “{query}”.</li>}
      </ol>
    </aside>
  )
}
