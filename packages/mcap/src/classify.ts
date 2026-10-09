export type TopicKind = 'image' | 'video' | 'vector' | 'text' | 'other'

/** ROS 2 `pkg/msg/Name`, ROS 1 `pkg/Name` and `foxglove_msgs/…` all compare as `pkg/Name` / `foxglove.Name`. */
export const schemaKey = (name: string) => name.replace('/msg/', '/').replace(/^foxglove_msgs\//, 'foxglove.')

export const ENCODED_IMAGE = new Set(['sensor_msgs/CompressedImage', 'foxglove.CompressedImage'])
export const RAW_IMAGE = new Set(['sensor_msgs/Image', 'foxglove.RawImage'])
export const VIDEO = new Set(['foxglove.CompressedVideo'])

// Calibration, transforms and 3D data: numeric, but charting them is noise. Listed in topics, not decoded.
const OTHER = new Set([
  'sensor_msgs/CameraInfo',
  'foxglove.CameraCalibration',
  'tf2_msgs/TFMessage',
  'tf/tfMessage',
  'foxglove.FrameTransform',
  'foxglove.FrameTransforms',
  'sensor_msgs/PointCloud2',
  'foxglove.PointCloud',
  'sensor_msgs/LaserScan',
  'foxglove.LaserScan',
  'visualization_msgs/Marker',
  'visualization_msgs/MarkerArray',
  'foxglove.SceneUpdate',
  'foxglove.ImageAnnotations',
])

/** Kind from the schema name alone; undefined means "decide from the first message". */
export function kindOfSchema(name: string): TopicKind | undefined {
  const k = schemaKey(name)
  if (ENCODED_IMAGE.has(k) || RAW_IMAGE.has(k)) return 'image'
  if (VIDEO.has(k)) return 'video'
  if (OTHER.has(k)) return 'other'
}

/** Numbers sharing a parent object (or one numeric array), charted together. */
export type Group = { path: string; values: ArrayLike<number>; names?: string[] }
export type Extracted = { groups: Group[]; strings: string[] }

const SKIP_KEYS = new Set(['header', 'stamp', 'timestamp'])
// Longer arrays are payloads (covariances, scans, blobs), not signals worth a chart.
const MAX_DIM = 64

// ROS / protobuf durations and stamps ({sec, nanosec}, {seconds, nanos}) are bookkeeping, not signals.
const TIME_SHAPES = ['nanosec,sec', 'nsec,sec', 'nanos,seconds']
const isTime = (v: object) => TIME_SHAPES.includes(Object.keys(v).sort().join(','))

const isBinary = (v: unknown) => v instanceof Uint8Array || v instanceof Uint8ClampedArray
const isNumeric = (v: unknown[]) => v.length > 0 && v.every((x) => typeof x === 'number')
const isStrings = (v: unknown[]) => v.length > 0 && v.every((x) => typeof x === 'string')

/** Walks a decoded message for chartable numbers and text. Lists of objects are skipped unless they hold one. */
export function extract(msg: unknown): Extracted {
  const out: Extracted = { groups: [], strings: [] }
  if (msg && typeof msg === 'object') walk(msg as Record<string, unknown>, '', out, [])
  return out
}

function walk(obj: Record<string, unknown>, path: string, out: Extracted, inherited: string[][]) {
  const scalars: [string, number][] = []
  const arrays: [string, ArrayLike<number>][] = []
  const labels: string[][] = []
  const nested: [string, Record<string, unknown>][] = []
  for (const [k, v] of Object.entries(obj)) {
    if (SKIP_KEYS.has(k) || v == null) continue
    const p = path ? `${path}.${k}` : k
    if (typeof v === 'number') scalars.push([k, v])
    else if (typeof v === 'bigint') scalars.push([k, Number(v)])
    else if (typeof v === 'boolean') scalars.push([k, +v])
    else if (typeof v === 'string') out.strings.push(v)
    else if (isBinary(v)) continue
    else if (ArrayBuffer.isView(v) && !(v instanceof DataView)) arrays.push([p, v as unknown as ArrayLike<number>])
    else if (Array.isArray(v)) {
      if (isNumeric(v)) arrays.push([p, v as number[]])
      else if (isStrings(v)) labels.push(v as string[])
      // JointTrajectory-style single-point lists read as that point; longer object lists are skipped.
      else if (v.length === 1 && v[0] && typeof v[0] === 'object') nested.push([p, v[0] as Record<string, unknown>])
    } else if (typeof v === 'object' && !isTime(v)) nested.push([p, v as Record<string, unknown>])
  }
  for (const [p, v] of nested) walk(v, p, out, [...labels, ...inherited])
  if (scalars.length) out.groups.push({ path, values: scalars.map((s) => s[1]), names: scalars.map((s) => s[0]) })
  for (const [p, values] of arrays) {
    if (values.length === 0 || values.length > MAX_DIM) continue
    // JointState-style: a sibling string array of the same length names the dimensions.
    const names = [...labels, ...inherited].find((l) => l.length === values.length)
    out.groups.push({ path: p, values, names })
  }
}
