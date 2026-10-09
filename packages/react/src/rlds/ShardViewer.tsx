import { useEffect, useRef, type ComponentPropsWithRef, type ReactNode } from 'react'
import type { Episode, Source } from '@videodb/robopeek-rlds'
import { useEpisodeStream } from './useEpisodeStream.ts'
import type { SpecsOption } from './specs.ts'
import { EpisodeList } from './EpisodeList.tsx'
import { LoadStatus, cx, mergeRefs, useControllable, type ColorScheme, type PlayerRootProps } from '../core/index.ts'
import { EpisodePlayer } from './EpisodePlayer.tsx'

const mb = (n: number) => (n / 1e6).toFixed(1)

export type ShardViewerProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  /** The shard to stream: a URL or a File. null shows `empty`. Choosing the file is the host's job. */
  source: Source | null
  selected?: number
  defaultSelected?: number
  onSelectedChange?: (index: number) => void
  /** 'auto' (default) reads the features.json next to a URL shard to restore shapes and depth images. */
  specs?: SpecsOption
  defaultFps?: number
  colorScheme?: ColorScheme
  /** Focus the viewer on mount so hotkeys work before the first click. */
  autoFocus?: boolean
  renderTitle?: (episode: Episode) => string | undefined
  /** Shown while `source` is null. */
  empty?: ReactNode
  /** Passed through to `Player.Root` (e.g. `defaultAutoNext`). */
  playerProps?: Partial<PlayerRootProps>
  /** Your player layout (parts inside the viewer's `Player.Root`). Omitted → default `<Player>`. */
  children?: ReactNode
}

/** Episode drawer + player for a whole shard, streamed as it downloads. */
export function ShardViewer({
  source,
  selected: selectedProp,
  defaultSelected = 0,
  onSelectedChange,
  specs,
  defaultFps,
  colorScheme,
  autoFocus,
  renderTitle,
  empty,
  playerProps,
  children,
  className,
  ref,
  ...rest
}: ShardViewerProps) {
  const [selected, setSelected] = useControllable(selectedProp, defaultSelected, onSelectedChange)
  const { episodes, status, load, reset } = useEpisodeStream({ specs })
  const own = useRef<HTMLDivElement>(null)

  // A new shard starts at its first episode; the first run keeps defaultSelected.
  const seen = useRef(source)
  useEffect(() => {
    if (source) load(source)
    else reset()
    if (seen.current !== source) setSelected(0)
    seen.current = source
  }, [source, load, reset, setSelected])

  useEffect(() => {
    if (autoFocus) own.current?.focus()
  }, [autoFocus])

  const episode = episodes[selected]
  const loading = status.phase === 'loading'

  return (
    <div
      ref={mergeRefs(own, ref)}
      className={cx('rp-viewer', 'rp-shard-viewer', className)}
      data-rp-scheme={colorScheme}
      tabIndex={-1}
      {...rest}
    >
      {status.phase !== 'idle' && (
        <LoadStatus phase={status.phase} source={status.source} loaded={status.loaded} total={status.total} error={status.error}>
          <span className="rp-mono">
            {episodes.length} episodes · {episodes.reduce((s, e) => s + e.length, 0).toLocaleString()} steps · {mb(status.loaded)}
            {status.total ? ` of ${mb(status.total)}` : ''} MB
          </span>
        </LoadStatus>
      )}
      {status.phase === 'idle' ? (
        empty
      ) : (
        <div className="rp-shard-viewer-body">
          <EpisodeList episodes={episodes} selected={selected} loading={loading} onSelect={setSelected} renderTitle={renderTitle} />
          {episode ? (
            <EpisodePlayer
              episode={episode}
              defaultRate={defaultFps}
              hotkeys={own}
              onPrevEpisode={selected > 0 ? () => setSelected(selected - 1) : undefined}
              onNextEpisode={selected < episodes.length - 1 ? () => setSelected(selected + 1) : undefined}
              {...playerProps}
            >
              {children}
            </EpisodePlayer>
          ) : (
            <div className="rp-waiting">{loading ? 'Waiting for the first episode…' : 'This file has no episodes.'}</div>
          )}
        </div>
      )}
    </div>
  )
}
