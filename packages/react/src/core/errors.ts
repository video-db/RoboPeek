// Messages for when a caller crosses a package boundary: they say what was wrong and what to import instead.
import { useContext } from 'react'
import { PlayerContext } from './store.ts'
import type { Timeline } from './timeline.ts'

const PKG = '@videodb/robopeek-react'

/** Throws a guiding error unless `t` is a Timeline (the usual mistake: passing an Episode or Recording directly). */
export function assertTimeline(t: unknown, where: string): asserts t is Timeline {
  const o = t as Record<string, unknown> | null | undefined
  if (o && typeof o === 'object' && typeof o.format === 'string' && (o.unit === 'step' || o.unit === 'second')) return
  if (o && o.features instanceof Map && 'length' in o) {
    throw new Error(`${where} got an RLDS Episode. Convert it first:\n  import { useEpisodeTimeline } from '${PKG}/rlds'\n  <Player.Root timeline={useEpisodeTimeline(episode)} />`)
  }
  if (o && o.topics instanceof Map && typeof o.ensure === 'function') {
    throw new Error(`${where} got an MCAP Recording. Convert it first:\n  import { useMcapTimeline } from '${PKG}/mcap'\n  <Player.Root timeline={useMcapTimeline(recording)} />`)
  }
  throw new Error(`${where} needs a Timeline. Build one with useEpisodeTimeline ('${PKG}/rlds'), useMcapTimeline ('${PKG}/mcap'), or by hand (see the Timeline type).`)
}

/**
 * For parts that only make sense for one format (RLDS step flags, MCAP topic list): the adapter's source object,
 * or a guiding error when the part sits in a player showing another format.
 */
export function useFormatSource<T>(format: string, part: string): T {
  const store = useContext(PlayerContext)
  if (!store) throw new Error(`<${part}> must be used inside <Player.Root>.`)
  const t = store.get().timeline
  if (t.format !== format) {
    throw new Error(`<${part}> comes from '${PKG}/${format}' and reads ${format} data, but this player shows a '${t.format}' timeline. Remove it, or use the parts for '${t.format}'.`)
  }
  return t.source as T
}
