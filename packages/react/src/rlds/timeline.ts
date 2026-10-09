import { useEffect, useMemo } from 'react'
import type { Episode, ImageTrack as RldsImage } from '@videodb/robopeek-rlds'
import { formatFeature, frameCount, rawRange, rgbaAt } from './reader.ts'
import { frameCache, steps, useFormatSource, usePlayer, type ImageTrack, type Timeline } from '../core/index.ts'

/** RLDS per-step flags: shown as chips by `<Flags>`, not charted. */
export const FLAG_KEYS = ['is_first', 'is_last', 'is_terminal']

export type EpisodeTimeline = Timeline & { source: Episode; dispose(): void }

function imageTrack(t: RldsImage, times: Float64Array) {
  const range = t.kind === 'raw' ? rawRange(t) : undefined
  const cache = frameCache(
    (i) => t.kind === 'encoded'
      ? createImageBitmap(new Blob([t.frames[i] as Uint8Array<ArrayBuffer>], { type: t.mime }))
      : createImageBitmap(new ImageData(rgbaAt(t, i, range), t.shape[1], t.shape[0])),
    { count: () => frameCount(t) },
  )
  const track: ImageTrack = { times, label: t.kind === 'encoded' ? t.mime.split('/')[1] : 'raw', load: cache.load }
  return { track, close: cache.close }
}

/**
 * An RLDS episode as a step timeline. Call `dispose()` when done (it frees decoded frames); `useEpisodeTimeline`
 * does that for you.
 */
export function fromEpisode(ep: Episode): EpisodeTimeline {
  const times = steps(ep.length)
  const images: Record<string, ImageTrack> = {}
  const closers: (() => void)[] = []
  for (const [k, t] of Object.entries(ep.images)) {
    const { track, close } = imageTrack(t, times)
    images[k] = track
    closers.push(close)
  }
  return {
    format: 'rlds',
    unit: 'step',
    end: Math.max(0, ep.length - 1),
    images,
    vectors: Object.fromEntries(
      Object.entries(ep.vectors)
        .filter(([k]) => !FLAG_KEYS.includes(k))
        .map(([k, v]) => [k, { times, dim: v.dim, data: v.data, shape: v.shape }]),
    ),
    text: Object.fromEntries(Object.entries(ep.text).map(([k, values]) => [k, { times, values }])),
    metadata: Object.fromEntries(Object.entries(ep.metadata).map(([k, f]) => [k, formatFeature(f)])),
    source: ep,
    dispose: () => closers.forEach((c) => c()),
  }
}

/** `fromEpisode`, kept for the episode's lifetime and disposed after. */
export function useEpisodeTimeline(ep: Episode): EpisodeTimeline
export function useEpisodeTimeline(ep: Episode | undefined): EpisodeTimeline | undefined
export function useEpisodeTimeline(ep: Episode | undefined) {
  const timeline = useMemo(() => (ep ? fromEpisode(ep) : undefined), [ep])
  useEffect(() => () => timeline?.dispose(), [timeline])
  return timeline
}

/** The RLDS episode in the surrounding player. Throws a guiding error inside a player showing another format. */
export function useCurrentEpisode(): Episode {
  usePlayer((s) => s.timeline)
  return useFormatSource<Episode>('rlds', 'useCurrentEpisode')
}
