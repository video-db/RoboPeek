import { useEffect, useMemo } from 'react'
import type { Frame, Recording, ImageTrack as McapImage } from '@videodb/robopeek-mcap'
import { decodePng16, isPng16Gray, MissingFramesError, rawToRGBA, VideoTrackDecoder } from './reader.ts'
import { frameCache, useFormatSource, usePlayer, type ImageTrack, type Timeline } from '../core/index.ts'

export type McapTimeline = Timeline & { source: Recording; dispose(): void }

async function bitmapOf(f: Frame): Promise<ImageBitmap> {
  // 16-bit depth PNGs would decode to their top 8 bits (near black); scale the full range instead.
  if (f.kind === 'encoded' && isPng16Gray(f.data) && typeof DecompressionStream !== 'undefined') f = await decodePng16(f.data)
  if (f.kind === 'encoded') return createImageBitmap(new Blob([f.data as Uint8Array<ArrayBuffer>], { type: f.mime }))
  if (f.kind === 'raw') return createImageBitmap(new ImageData(rawToRGBA(f), f.width, f.height))
  throw new Error('Video frames are decoded by VideoTrackDecoder.')
}

const labelOf = (f: Frame) => (f.kind === 'encoded' ? (isPng16Gray(f.data) ? 'png 16-bit' : f.mime.split('/')[1]) : f.kind === 'raw' ? f.encoding : '')

function imageTrack(rec: Recording, topic: string, t: McapImage) {
  if (t.kind === 'video') {
    const decoder = VideoTrackDecoder.supported()
      ? new VideoTrackDecoder({
          format: t.format ?? '',
          get length() { return t.times.length },
          keyframe: (j) => t.keys[j],
          data: (j) => rec.frame(topic, j)?.data,
        })
      : undefined
    const track: ImageTrack = {
      times: t.times,
      label: t.format,
      load: (i) => {
        if (!decoder) return Promise.reject(new Error('This browser has no WebCodecs video decoder.'))
        return decoder.frameAt(i).catch((e) => (e instanceof MissingFramesError ? undefined : Promise.reject(e)))
      },
    }
    return { track, close: () => decoder?.close() }
  }
  const cache = frameCache((i) => { const f = rec.frame(topic, i); return f && bitmapOf(f) }, { count: () => t.times.length })
  const track: ImageTrack = {
    times: t.times,
    get label() {
      const f = t.frames.find(Boolean)
      return f ? labelOf(f) : undefined
    },
    load: cache.load,
  }
  return { track, close: cache.close }
}

/**
 * An MCAP recording as a time timeline. It follows the recording while it loads, and asks it to fetch frames
 * released under the memory budget. Call `dispose()` when done; `useMcapTimeline` does that for you.
 */
export function fromRecording(rec: Recording): McapTimeline {
  const built = new Map<string, { track: ImageTrack; close: () => void }>()
  let images: Record<string, ImageTrack> = {}
  return {
    format: 'mcap',
    unit: 'second',
    get end() { return rec.length },
    get images() {
      const topics = Object.keys(rec.images)
      if (topics.length !== built.size) {
        for (const topic of topics) if (!built.has(topic)) built.set(topic, imageTrack(rec, topic, rec.images[topic]))
        images = Object.fromEntries(topics.map((topic) => [topic, built.get(topic)!.track]))
      }
      return images
    },
    get vectors() { return rec.vectors },
    get text() { return rec.text },
    get metadata() { return rec.metadata },
    get version() { return rec.version },
    subscribe: (fn) => rec.subscribe(fn),
    prepare: (start, end, signal) => {
      if (rec.refetchable) rec.ensure(Object.keys(rec.images), start, end, signal).catch(() => {})
    },
    source: rec,
    dispose: () => built.forEach((b) => b.close()),
  }
}

/** `fromRecording`, kept for the recording's lifetime and disposed after. */
export function useMcapTimeline(rec: Recording): McapTimeline
export function useMcapTimeline(rec: Recording | undefined): McapTimeline | undefined
export function useMcapTimeline(rec: Recording | undefined) {
  const timeline = useMemo(() => (rec ? fromRecording(rec) : undefined), [rec])
  useEffect(() => () => timeline?.dispose(), [timeline])
  return timeline
}

/** The MCAP recording in the surrounding player (select `version` too if you read tracks that are still loading). */
export function useCurrentRecording(): Recording {
  usePlayer((s) => s.version)
  return useFormatSource<Recording>('mcap', 'useCurrentRecording')
}
