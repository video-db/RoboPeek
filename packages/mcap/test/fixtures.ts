// Builds small MCAP files in memory so tests don't depend on downloads.
import { McapWriter } from '@mcap/core'
import { parse } from '@foxglove/rosmsg'
import { MessageWriter } from '@foxglove/rosmsg2-serialization'

const enc = new TextEncoder()

export const SEC = 1_000_000_000n
export const T0 = 1_700_000_000n * SEC

// 1×1 JPEG/PNG headers are enough: the engine sniffs, it doesn't decode.
export const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])

const JOINT_STATE = `std_msgs/Header header
string[] name
float64[] position
float64[] velocity
float64[] effort
================================================================================
MSG: std_msgs/Header
builtin_interfaces/Time stamp
string frame_id
================================================================================
MSG: builtin_interfaces/Time
int32 sec
uint32 nanosec`

const COMPRESSED_IMAGE = `std_msgs/Header header
string format
uint8[] data
================================================================================
MSG: std_msgs/Header
builtin_interfaces/Time stamp
string frame_id
================================================================================
MSG: builtin_interfaces/Time
int32 sec
uint32 nanosec`

const STRING = 'string data'

type Msg = { topic: string; t: bigint; value: unknown }
export type FixtureOptions = {
  indexed?: boolean
  chunkSize?: number
  /** false: no latched or mis-stamped messages, so the first chunk (which holds the Channel records) spans only t ≈ 0. */
  latched?: boolean
}

class Buffer {
  parts: Uint8Array[] = []
  size = 0n
  position = () => this.size
  write = async (b: Uint8Array) => {
    this.parts.push(b.slice())
    this.size += BigInt(b.length)
  }
}

const header = (t: bigint) => ({ stamp: { sec: Number(t / SEC), nanosec: Number(t % SEC) }, frame_id: '' })

/** A ROS 2 file: /joint_states at 10 Hz, /camera at 5 Hz, a latched /instruction and a mis-stamped /robot_description. */
export async function ros2File(opts: FixtureOptions & { seconds?: number; frameBytes?: number; frame?: Uint8Array } = {}): Promise<Blob> {
  const seconds = opts.seconds ?? 2
  let frame = opts.frame
  if (!frame) {
    frame = new Uint8Array(opts.frameBytes ?? JPEG.length)
    frame.set(JPEG)
  }
  const msgs: Msg[] = opts.latched === false ? [] : [
    { topic: '/robot_description', t: 72_316n * SEC, value: { data: '<robot>' + 'x'.repeat(600) + '</robot>' } },
    { topic: '/instruction', t: 5n * SEC, value: { data: 'pick up the cup' } },
  ]
  for (let i = 0; i < seconds * 10; i++) {
    const t = T0 + (BigInt(i) * SEC) / 10n
    msgs.push({ topic: '/joint_states', t, value: { header: header(t), name: ['a', 'b'], position: [i, -i], velocity: [], effort: [] } })
    if (i % 2 === 0) msgs.push({ topic: '/camera', t, value: { header: header(t), format: 'jpeg', data: frame } })
  }
  return write(
    [
      { topic: '/joint_states', schema: 'sensor_msgs/msg/JointState', text: JOINT_STATE },
      { topic: '/camera', schema: 'sensor_msgs/msg/CompressedImage', text: COMPRESSED_IMAGE },
      { topic: '/instruction', schema: 'std_msgs/msg/String', text: STRING },
      { topic: '/robot_description', schema: 'std_msgs/msg/String', text: STRING },
    ],
    msgs,
    opts,
  )
}

async function write(channels: { topic: string; schema: string; text: string }[], msgs: Msg[], opts: FixtureOptions) {
  const out = new Buffer()
  const indexed = opts.indexed ?? true
  const writer = new McapWriter({
    writable: out,
    chunkSize: opts.chunkSize ?? 1024,
    useStatistics: indexed,
    useSummaryOffsets: indexed,
    useChunkIndex: indexed,
    useMessageIndex: indexed,
    useMetadataIndex: indexed,
  })
  await writer.start({ profile: 'ros2', library: 'robopeek-test' })
  const ids = new Map<string, { id: number; w: MessageWriter }>()
  for (const c of channels) {
    const schemaId = await writer.registerSchema({ name: c.schema, encoding: 'ros2msg', data: enc.encode(c.text) })
    const id = await writer.registerChannel({ topic: c.topic, schemaId, messageEncoding: 'cdr', metadata: new Map() })
    ids.set(c.topic, { id, w: new MessageWriter(parse(c.text, { ros2: true })) })
  }
  let seq = 0
  for (const m of msgs) {
    const { id, w } = ids.get(m.topic)!
    await writer.addMessage({ channelId: id, sequence: seq++, logTime: m.t, publishTime: m.t, data: w.writeMessage(m.value) })
  }
  await writer.addMetadata({ name: 'episode', metadata: new Map([['task', 'cups']]) })
  await writer.end()
  return new Blob(out.parts as Uint8Array<ArrayBuffer>[])
}

/** A JSON-only file whose message width changes halfway. */
export async function jsonFile(): Promise<Blob> {
  const out = new Buffer()
  const writer = new McapWriter({ writable: out })
  await writer.start({ profile: '', library: 'robopeek-test' })
  const schemaId = await writer.registerSchema({ name: 'Plot', encoding: 'jsonschema', data: enc.encode('{}') })
  const channelId = await writer.registerChannel({ topic: '/plot', schemaId, messageEncoding: 'json', metadata: new Map() })
  for (let i = 0; i < 4; i++) {
    const value = i < 2 ? { a: i, b: 2 * i } : { a: i }
    const t = T0 + BigInt(i) * SEC
    await writer.addMessage({ channelId, sequence: i, logTime: t, publishTime: t, data: enc.encode(JSON.stringify(value)) })
  }
  await writer.end()
  return new Blob(out.parts as Uint8Array<ArrayBuffer>[])
}
