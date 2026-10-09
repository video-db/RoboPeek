import { useMemo, type ReactNode } from 'react'
import type { Episode } from '@videodb/robopeek-rlds'
import { episodeTitle } from './reader.ts'
import { ItemList, type ItemListProps } from '../core/index.ts'

export type EpisodeListProps = Omit<ItemListProps, 'items' | 'selected' | 'onSelect' | 'pending' | 'renderItem'> & {
  episodes: Episode[]
  selected: number
  onSelect: (index: number) => void
  /** Shows a "Receiving episode N…" row while more episodes stream in. */
  loading?: boolean
  /** Row title; also what the filter matches. Defaults to the episode's language instruction. */
  renderTitle?: (episode: Episode) => string | undefined
  /** Replaces the whole row body; `fallback` is the built-in one. */
  renderItem?: (episode: Episode, fallback: ReactNode) => ReactNode
}

/** The episodes drawer: `ItemList` over a shard's episodes. */
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
  const items = useMemo(
    () => episodes.map((ep) => ({ key: ep.index, head: `#${ep.index}`, aside: `${ep.length} steps`, title: renderTitle(ep) })),
    [episodes, renderTitle],
  )
  return (
    <ItemList
      className={['rp-episodes', className].filter(Boolean).join(' ')}
      items={items}
      selected={selected}
      onSelect={(k) => onSelect(Number(k))}
      pending={loading ? `Receiving episode ${episodes.length}…` : undefined}
      renderItem={renderItem ? (item, fallback) => renderItem(episodes.find((e) => e.index === item.key)!, fallback) : undefined}
      emptyTitle="Untitled episode"
      filterPlaceholder={filterPlaceholder}
      {...rest}
    />
  )
}
