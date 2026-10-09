import type { FeatureSpecs, Source } from '@videodb/robopeek-rlds'
import { loadFeatureSpecs } from './reader.ts'

/** 'auto' fetches the features.json next to a URL source; files get none unless passed in. */
export type SpecsOption = FeatureSpecs | 'auto' | false

export async function resolveSpecs(src: Source, opt: SpecsOption, signal?: AbortSignal): Promise<FeatureSpecs | undefined> {
  if (opt === false) return undefined
  if (opt !== 'auto') return opt
  return src instanceof Blob ? undefined : loadFeatureSpecs(src, signal)
}

export const sourceName = (src: Source) => (src instanceof File ? src.name : src instanceof Blob ? 'blob' : String(src))

export const errorMessage = (e: unknown) =>
  e instanceof TypeError ? 'Network error. Check the URL, and that the server allows cross-origin requests.' : (e as Error).message
