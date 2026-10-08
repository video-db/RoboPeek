// TFDS features.json → per-key shape/dtype. The shard itself only carries float/int64/bytes lists.

export type FeatureSpec = {
  /** TFDS feature class, e.g. Tensor, Image, Text, Scalar. */
  type: string
  /** Per-step shape; [] for scalars, -1 for variable dims. */
  shape: number[]
  dtype: string
  description?: string
}

/** Keyed like the shard: `steps/observation/image`, `episode_metadata/file_path`. */
export type FeatureSpecs = Map<string, FeatureSpec>

type Node = {
  pythonClassName?: string
  featuresDict?: { features: Record<string, Node> }
  sequence?: { feature: Node }
  tensor?: Leaf
  image?: Leaf
  text?: Leaf
  description?: string
}
type Leaf = { shape?: { dimensions?: string[] }; dtype?: string }

export function parseFeatureSpecs(json: unknown): FeatureSpecs {
  const out: FeatureSpecs = new Map()
  const walk = (n: Node, path: string[]) => {
    if (n.featuresDict) for (const [k, v] of Object.entries(n.featuresDict.features)) walk(v, [...path, k])
    else if (n.sequence) walk(n.sequence.feature, path)
    else {
      const leaf = n.tensor ?? n.image ?? n.text ?? {}
      out.set(path.join('/'), {
        type: n.pythonClassName?.split('.').pop() ?? 'unknown',
        shape: (leaf.shape?.dimensions ?? []).map(Number),
        dtype: leaf.dtype ?? (n.text ? 'string' : 'unknown'),
        description: n.description,
      })
    }
  }
  walk(json as Node, [])
  return out
}

/** Fetches the features.json that TFDS writes next to a shard. Undefined if there isn't one. */
export async function loadFeatureSpecs(shardUrl: string | URL, signal?: AbortSignal): Promise<FeatureSpecs | undefined> {
  const res = await fetch(new URL('features.json', shardUrl), { signal }).catch(() => undefined)
  if (!res?.ok) return undefined
  const json = await res.json().catch(() => undefined)
  return json?.featuresDict ? parseFeatureSpecs(json) : undefined
}
