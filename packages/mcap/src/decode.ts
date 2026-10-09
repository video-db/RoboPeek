import { parse } from '@foxglove/rosmsg'
import { MessageReader as Ros2Reader } from '@foxglove/rosmsg2-serialization'
import { MessageReader as Ros1Reader } from '@foxglove/rosmsg-serialization'
import protobuf from 'protobufjs'
import descriptor from 'protobufjs/ext/descriptor/index.js'
import { decompress as zstd } from 'fzstd'
import lz4 from 'lz4js'

export type Decode = (data: Uint8Array) => unknown
export type SchemaRecord = { name: string; encoding: string; data: Uint8Array }

export const decompressHandlers = {
  zstd: (b: Uint8Array, size: bigint) => zstd(b, new Uint8Array(Number(size))),
  lz4: (b: Uint8Array, size: bigint) => Uint8Array.from(lz4.decompress(b, Number(size))),
}

const utf8 = new TextDecoder()

type ProtoRoot = { lookupType(name: string): protobuf.Type }
const fromDescriptor = (protobuf.Root as unknown as { fromDescriptor(d: unknown): ProtoRoot }).fromDescriptor
const FileDescriptorSet = (descriptor as unknown as { FileDescriptorSet: { decode(b: Uint8Array): unknown } }).FileDescriptorSet

/** One decoder per channel. Throws for encodings we can't read; the caller marks that topic unsupported. */
export function createDecoder(messageEncoding: string, schema: SchemaRecord | undefined): Decode {
  const enc = schema?.encoding ?? ''
  if (messageEncoding === 'json') return (b) => JSON.parse(utf8.decode(b))
  if (messageEncoding === 'cdr' && enc === 'ros2msg') {
    const reader = new Ros2Reader(parse(utf8.decode(schema!.data), { ros2: true }))
    return (b) => reader.readMessage(b)
  }
  if (messageEncoding === 'ros1' && enc === 'ros1msg') {
    const reader = new Ros1Reader(parse(utf8.decode(schema!.data)))
    return (b) => reader.readMessage(b)
  }
  if (messageEncoding === 'protobuf' && enc === 'protobuf') {
    const type = fromDescriptor(FileDescriptorSet.decode(schema!.data)).lookupType(schema!.name)
    return (b) => type.toObject(type.decode(b), { longs: Number })
  }
  throw new Error(`Unsupported encoding ${messageEncoding}${enc ? ` / ${enc}` : ''}`)
}
