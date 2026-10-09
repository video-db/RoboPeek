export type Source = Blob | string | URL
export type Progress = { loaded: number; total?: number }

export type RangeReader = {
  size: number
  read(offset: number, length: number, signal?: AbortSignal): Promise<Uint8Array>
}

export const sourceName = (src: Source) => (src instanceof File ? src.name : src instanceof Blob ? 'blob' : String(src))

export function blobReader(blob: Blob): RangeReader {
  return { size: blob.size, read: async (o, l) => new Uint8Array(await blob.slice(o, o + l).arrayBuffer()) }
}

/** Probes Range support once and pins the post-redirect URL. Resolves undefined when the server ignores Range. */
export async function urlReader(url: string | URL, signal?: AbortSignal): Promise<RangeReader | undefined> {
  const probe = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal })
  if (!probe.ok) {
    probe.body?.cancel()
    throw new Error(`Could not fetch the file (HTTP ${probe.status}).`)
  }
  const total = Number(probe.headers.get('content-range')?.split('/')[1])
  if (probe.status !== 206 || !(total > 0)) {
    probe.body?.cancel()
    return undefined
  }
  await probe.arrayBuffer()
  const pinned = probe.url || String(url)
  return {
    size: total,
    read: async (o, l, signal) => {
      const res = await fetch(pinned, { headers: { Range: `bytes=${o}-${o + l - 1}` }, signal })
      if (res.status !== 206) throw new Error(`Range request failed (HTTP ${res.status}).`)
      return new Uint8Array(await res.arrayBuffer())
    },
  }
}

export async function openStream(src: Source, signal?: AbortSignal) {
  if (src instanceof Blob) return { stream: src.stream(), total: src.size }
  const res = await fetch(src, { signal })
  if (!res.ok || !res.body) throw new Error(`Could not fetch the file (HTTP ${res.status}).`)
  const len = Number(res.headers.get('content-length'))
  return { stream: res.body, total: len > 0 ? len : undefined }
}
