import { useEffect, useRef, type ComponentPropsWithRef, type ReactNode } from 'react'
import type { Episode, Source } from '@rlds-viewer/core'
import { useEpisodeStream } from '../hooks/useEpisodeStream.ts'
import { useControllable } from '../hooks/useControllable.ts'
import type { SpecsOption } from '../hooks/specs.ts'
import { DropZone } from '../components/DropZone.tsx'
import { EpisodeList } from '../components/EpisodeList.tsx'
import { LoadStatus } from '../components/LoadStatus.tsx'
import { SourceBar } from '../components/SourceBar.tsx'
import { cx } from '../components/cx.ts'
import { Root, mergeRefs, type ColorScheme, type PlayerRootProps } from '../player/parts.tsx'

const mb = (n: number) => (n / 1e6).toFixed(1)

export type ShardViewerState = { source: Source | null; selected: number; episode?: Episode }

export type ShardViewerProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  source?: Source | null
  defaultSource?: Source | null
  onSourceChange?: (src: Source) => void
  selected?: number
  defaultSelected?: number
  onSelectedChange?: (index: number) => void
  /** 'auto' (default) reads the features.json next to a URL shard to restore shapes and depth images. */
  specs?: SpecsOption
  defaultFps?: number
  colorScheme?: ColorScheme
  /** Focus the viewer on mount so hotkeys work before the first click. */
  autoFocus?: boolean
  /** Wrap or replace the source bar; `bar` is the built-in one. */
  renderHeader?: (bar: ReactNode, state: ShardViewerState) => ReactNode
  renderTitle?: (episode: Episode) => string | undefined
  /** Shown before any source is opened. */
  empty?: ReactNode
  /** Passed through to `Player.Root` (e.g. `defaultAutoNext`). */
  playerProps?: Partial<PlayerRootProps>
  /** Your player layout (parts inside the viewer's `Player.Root`). Omitted → default `<Player>`. */
  children?: ReactNode
}

/** Episode drawer + player for a whole shard, streamed as it downloads. */
export function ShardViewer({
  source,
  defaultSource = null,
  onSourceChange,
  selected: selectedProp,
  defaultSelected = 0,
  onSelectedChange,
  specs,
  defaultFps,
  colorScheme,
  autoFocus,
  renderHeader,
  renderTitle,
  empty,
  playerProps,
  children,
  className,
  ref,
  ...rest
}: ShardViewerProps) {
  const [src, setSrc] = useControllable<Source | null>(source, defaultSource, onSourceChange as (s: Source | null) => void)
  const [selected, setSelected] = useControllable(selectedProp, defaultSelected, onSelectedChange)
  const { episodes, status, load, cancel, reset } = useEpisodeStream({ specs })
  const own = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (src) load(src)
    else reset()
  }, [src, load, reset])

  useEffect(() => {
    if (autoFocus) own.current?.focus()
  }, [autoFocus])

  const open = (next: Source) => {
    setSelected(0)
    setSrc(next)
  }

  const episode = episodes[selected]
  const loading = status.phase === 'loading'
  const bar = (
    <SourceBar key={typeof src === 'string' ? src : undefined} defaultUrl={typeof src === 'string' ? src : ''} loading={loading} onOpen={open} onCancel={cancel} />
  )

  return (
    <DropZone
      ref={mergeRefs(own, ref)}
      className={cx('rlds-viewer', 'rlds-shard-viewer', className)}
      data-rlds-scheme={colorScheme}
      tabIndex={-1}
      onFile={open}
      {...rest}
    >
      {renderHeader ? renderHeader(bar, { source: src, selected, episode }) : bar}
      {status.phase !== 'idle' && (
        <LoadStatus phase={status.phase} source={status.source} loaded={status.loaded} total={status.total} error={status.error}>
          <span className="rlds-mono">
            {episodes.length} episodes · {episodes.reduce((s, e) => s + e.length, 0).toLocaleString()} steps · {mb(status.loaded)}
            {status.total ? ` of ${mb(status.total)}` : ''} MB
          </span>
        </LoadStatus>
      )}
      {status.phase === 'idle' ? (
        empty
      ) : (
        <div className="rlds-shard-viewer-body">
          <EpisodeList episodes={episodes} selected={selected} loading={loading} onSelect={setSelected} renderTitle={renderTitle} />
          {episode ? (
            <Root
              episode={episode}
              defaultFps={defaultFps}
              hotkeys={own}
              onPrevEpisode={selected > 0 ? () => setSelected(selected - 1) : undefined}
              onNextEpisode={selected < episodes.length - 1 ? () => setSelected(selected + 1) : undefined}
              {...playerProps}
            >
              {children}
            </Root>
          ) : (
            <div className="rlds-waiting">{loading ? 'Waiting for the first episode…' : 'This file has no episodes.'}</div>
          )}
        </div>
      )}
    </DropZone>
  )
}
