import { useEffect, useMemo, useRef, useState, type ComponentPropsWithRef, type ReactNode } from 'react'
import { cx } from './cx.ts'

export type ListItem = {
  /** Unique and stable; also what `selected` refers to. */
  key: number | string
  /** Short first line, e.g. "#3". */
  head: ReactNode
  /** Right side of the first line, e.g. "120 steps". */
  aside?: ReactNode
  /** Second line; also what the filter matches. */
  title?: string
}

export type ItemListProps = Omit<ComponentPropsWithRef<'aside'>, 'onSelect' | 'children'> & {
  items: ListItem[]
  selected: ListItem['key']
  onSelect: (key: ListItem['key']) => void
  /** Shown as a last row while more items arrive. */
  pending?: ReactNode
  /** Replaces a row's body; `fallback` is the built-in one. */
  renderItem?: (item: ListItem, fallback: ReactNode) => ReactNode
  emptyTitle?: string
  filterPlaceholder?: string
}

/** A filterable list with the current row kept in view: episodes in a shard, files in a dataset. */
export function ItemList({
  items,
  selected,
  onSelect,
  pending,
  renderItem,
  emptyTitle = 'Untitled',
  filterPlaceholder = 'Filter',
  className,
  ...rest
}: ItemListProps) {
  const [query, setQuery] = useState('')
  const list = useRef<HTMLOListElement>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter((r) => r.title?.toLowerCase().includes(q) || String(r.key) === q) : items
  }, [items, query])

  useEffect(() => {
    list.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <aside className={cx('rp-list', className)} {...rest}>
      <input
        className="rp-input"
        type="search"
        placeholder={filterPlaceholder}
        aria-label={filterPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ol ref={list}>
        {rows.map((item) => {
          const body = (
            <>
              <span className="rp-list-head rp-mono">
                <span>{item.head}</span>
                {item.aside != null && <span className="rp-dim">{item.aside}</span>}
              </span>
              <span className="rp-list-title">{item.title ?? emptyTitle}</span>
            </>
          )
          return (
            <li key={item.key}>
              <button type="button" aria-current={item.key === selected} onClick={() => onSelect(item.key)}>
                {renderItem ? renderItem(item, body) : body}
              </button>
            </li>
          )
        })}
        {pending && <li className="rp-list-pending">{pending}</li>}
        {!pending && rows.length === 0 && items.length > 0 && <li className="rp-list-pending">Nothing matches “{query}”.</li>}
      </ol>
    </aside>
  )
}
