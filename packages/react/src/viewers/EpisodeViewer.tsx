import { useEffect, useRef, type ComponentPropsWithRef, type ReactNode } from 'react'
import type { Episode, Source } from '@robopeek/core'
import { useEpisode } from '../hooks/useEpisode.ts'
import { useControllable } from '../hooks/useControllable.ts'
import { sourceName, type SpecsOption } from '../hooks/specs.ts'
import { LoadStatus } from '../components/LoadStatus.tsx'
import { SourceBar } from '../components/SourceBar.tsx'
import { cx } from '../components/cx.ts'
import { Root, mergeRefs, type ColorScheme, type PlayerRootProps } from '../player/parts.tsx'

const mb = (n: number) => (n / 1e6).toFixed(1)

export type EpisodeViewerState = { source: Source | null; episode: number; loaded?: Episode }

export type EpisodeViewerProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  source?: Source | null
  defaultSource?: Source | null
  onSourceChange?: (src: Source) => void
  episode?: number
  defaultEpisode?: number
  onEpisodeChange?: (n: number) => void
  specs?: SpecsOption
  defaultFps?: number
  colorScheme?: ColorScheme
  autoFocus?: boolean
  renderHeader?: (bar: ReactNode, state: EpisodeViewerState) => ReactNode
  empty?: ReactNode
  playerProps?: Partial<PlayerRootProps>
  children?: ReactNode
}

/** One episode by number, fetched without loading the rest of the shard. */
export function EpisodeViewer({
  source,
  defaultSource = null,
  onSourceChange,
  episode: episodeProp,
  defaultEpisode = 0,
  onEpisodeChange,
  specs,
  defaultFps,
  colorScheme,
  autoFocus,
  renderHeader,
  empty,
  playerProps,
  children,
  className,
  ref,
  ...rest
}: EpisodeViewerProps) {
  const [src, setSrc] = useControllable<Source | null>(source, defaultSource, onSourceChange as (s: Source | null) => void)
  const [n, setN] = useControllable(episodeProp, defaultEpisode, onEpisodeChange)
  const { episode, status, known } = useEpisode(src, n, { specs })
  const own = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoFocus) own.current?.focus()
  }, [autoFocus])

  const ready = status.phase === 'ready' && episode
  const hasNext = !!ready && !(known.complete && episode.index >= known.count - 1)
  const progress = status.phase === 'loading' || status.phase === 'ready' ? status.progress : undefined
  const bar = (
    <SourceBar
      key={typeof src === 'string' ? src : undefined}
      defaultUrl={typeof src === 'string' ? src : ''}
      episode={n}
      currentFile={src instanceof File ? src : undefined}
      onOpen={(next, ep) => { setSrc(next); setN(ep ?? 0) }}
    />
  )

  return (
    <div
      ref={mergeRefs(own, ref)}
      className={cx('rp-viewer', 'rp-episode-viewer', className)}
      data-rp-scheme={colorScheme}
      tabIndex={-1}
      {...rest}
    >
      {renderHeader ? renderHeader(bar, { source: src, episode: n, loaded: episode }) : bar}
      {src && (
        <LoadStatus phase={status.phase === 'loading' ? 'loading' : 'done'} source={sourceName(src)} loaded={progress?.loaded} total={progress?.total}>
          {ready && (
            <span className="rp-mono">Episode {episode.index} · {episode.length} steps · {mb(episode.byteSize)} MB</span>
          )}
          {progress && (
            <span className="rp-mono rp-dim">read to {mb(progress.loaded)}{progress.total ? ` of ${mb(progress.total)}` : ''} MB</span>
          )}
          {ready && !progress && <span className="rp-mono rp-dim">fetched by range request</span>}
          {known.count > 0 && (
            <span className="rp-mono rp-dim">{known.complete ? `${known.count} episodes in shard` : `${known.count} episodes located so far`}</span>
          )}
        </LoadStatus>
      )}
      {status.phase === 'idle' && empty}
      {status.phase === 'loading' && <div className="rp-waiting">Finding episode {status.n}…</div>}
      {status.phase === 'error' && <div className="rp-waiting" data-tone="error">{status.error}</div>}
      {ready && (
        <div className="rp-episode-viewer-body">
          <Root
            episode={episode}
            defaultFps={defaultFps}
            hotkeys={own}
            onPrevEpisode={episode.index > 0 ? () => setN(episode.index - 1) : undefined}
            onNextEpisode={hasNext ? () => setN(episode.index + 1) : undefined}
            {...playerProps}
          >
            {children}
          </Root>
        </div>
      )}
    </div>
  )
}
