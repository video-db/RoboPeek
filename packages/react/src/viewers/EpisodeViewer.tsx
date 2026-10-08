import { useEffect, useRef, type ComponentPropsWithRef, type ReactNode } from 'react'
import type { Source } from '@videodb/robopeek-rlds'
import { useEpisode } from '../hooks/useEpisode.ts'
import { useControllable } from '../hooks/useControllable.ts'
import { sourceName, type SpecsOption } from '../hooks/specs.ts'
import { LoadStatus } from '../components/LoadStatus.tsx'
import { cx } from '../components/cx.ts'
import { Root, mergeRefs, type ColorScheme, type PlayerRootProps } from '../player/parts.tsx'

const mb = (n: number) => (n / 1e6).toFixed(1)

export type EpisodeViewerProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  /** The shard to read from: a URL (needs HTTP Range support) or a File. null shows `empty`. */
  source: Source | null
  episode?: number
  defaultEpisode?: number
  onEpisodeChange?: (n: number) => void
  specs?: SpecsOption
  defaultFps?: number
  colorScheme?: ColorScheme
  autoFocus?: boolean
  empty?: ReactNode
  playerProps?: Partial<PlayerRootProps>
  children?: ReactNode
}

/** One episode by number, fetched without loading the rest of the shard. */
export function EpisodeViewer({
  source,
  episode: episodeProp,
  defaultEpisode = 0,
  onEpisodeChange,
  specs,
  defaultFps,
  colorScheme,
  autoFocus,
  empty,
  playerProps,
  children,
  className,
  ref,
  ...rest
}: EpisodeViewerProps) {
  const [n, setN] = useControllable(episodeProp, defaultEpisode, onEpisodeChange)
  const { episode, status, known } = useEpisode(source, n, { specs })
  const own = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoFocus) own.current?.focus()
  }, [autoFocus])

  const ready = status.phase === 'ready' && episode
  const hasNext = !!ready && !(known.complete && episode.index >= known.count - 1)
  const progress = status.phase === 'loading' || status.phase === 'ready' ? status.progress : undefined

  return (
    <div
      ref={mergeRefs(own, ref)}
      className={cx('rp-viewer', 'rp-episode-viewer', className)}
      data-rp-scheme={colorScheme}
      tabIndex={-1}
      {...rest}
    >
      {source && (
        <LoadStatus phase={status.phase === 'loading' ? 'loading' : 'done'} source={sourceName(source)} loaded={progress?.loaded} total={progress?.total}>
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
