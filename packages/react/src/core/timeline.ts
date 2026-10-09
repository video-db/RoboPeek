// The one shape the player reads. Format adapters (`/rlds`, `/mcap`, or your own) build it; nothing in core knows
// which format it came from.

/** 'step': positions are step indices (RLDS). 'second': positions are seconds (MCAP and other timestamped logs). */
export type Unit = 'step' | 'second'

export type ImageTrack = {
  /** Sample positions, ascending, in the timeline's unit. */
  times: ArrayLike<number>
  /** Short format note for the caption, e.g. 'jpeg', 'h264', 'raw'. */
  label?: string
  /**
   * The frame for sample `i`. Resolves undefined while it isn't available yet (the view keeps the previous frame,
   * marked pending). Draw the result right away: video frames belong to the track's decoder.
   */
  load(i: number): Promise<CanvasImageSource | undefined>
}

/** Row-major [times.length × dim]. */
export type VectorTrack = {
  times: ArrayLike<number>
  dim: number
  data: ArrayLike<number>
  /** Per-dimension labels (e.g. joint names). */
  names?: string[]
  /** Per-sample shape, when it isn't flat [dim]. */
  shape?: number[]
}

export type TextTrack = { times: ArrayLike<number>; values: string[] }

export type Timeline = {
  /** Which adapter built it ('rlds', 'mcap', …). Format-specific parts check it. */
  format: string
  unit: Unit
  /** Last position: the last step index, or the duration in seconds. */
  end: number
  images: Record<string, ImageTrack>
  vectors: Record<string, VectorTrack>
  text: Record<string, TextTrack>
  metadata: Record<string, string>
  /** The adapter's own object (an RLDS Episode, an MCAP Recording), for format-specific parts. */
  source?: unknown
  /** For timelines that fill in while loading: changes whenever tracks do; `subscribe` fires after. */
  version?: number
  subscribe?(fn: () => void): () => void
  /** Called with the window around the playhead, so the adapter can bring missing frames into memory. */
  prepare?(start: number, end: number, signal: AbortSignal): void
}

/** Last index with times[i] <= t; -1 before the first. */
export function indexAt(times: ArrayLike<number>, t: number): number {
  let lo = 0
  let hi = times.length - 1
  let best = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (times[mid] <= t) { best = mid; lo = mid + 1 } else hi = mid - 1
  }
  return best
}

/** Values of sample `i` of a vector track. */
export function rowAt(v: VectorTrack, i: number): number[] {
  return Array.from({ length: v.dim }, (_, d) => v.data[i * v.dim + d])
}

/** 0, 1, … n-1: the times of a step-indexed track. */
export function steps(n: number): Float64Array {
  return Float64Array.from({ length: n }, (_, i) => i)
}
