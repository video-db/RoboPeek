<p align="center">
  <img src="https://raw.githubusercontent.com/video-db/RoboPeek/main/assets/mascot.png" alt="RoboPeek" width="120" />
</p>

<p align="center">
  Maintained by
  <a href="https://videodb.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/video-db/RoboPeek/main/assets/videodb-logo-dark.png" />
      <img src="https://raw.githubusercontent.com/video-db/RoboPeek/main/assets/videodb-logo.png" alt="VideoDB" height="18" align="center" />
    </picture>
  </a>
</p>

# @videodb/robopeek-react

React components for previewing robot-learning data: ready-made viewers, a player you can take apart, and the hooks underneath. One package serves every format. The player and its parts know no format, and each format's glue sits behind its own entry point. Drop in one component, or rebuild the whole thing in your own design system.

[![npm](https://img.shields.io/npm/v/@videodb/robopeek-react?style=flat-square)](https://www.npmjs.com/package/@videodb/robopeek-react)

Part of [RoboPeek](https://github.com/video-db/RoboPeek), which previews robotics datasets on the web. Formats today: **RLDS / TFRecord** (via [`@videodb/robopeek-rlds`](https://www.npmjs.com/package/@videodb/robopeek-rlds)) and **MCAP** (via [`@videodb/robopeek-mcap`](https://www.npmjs.com/package/@videodb/robopeek-mcap)).

## Contents

- [Install](#install)
- [How the package is organised](#how-the-package-is-organised)
- [Separation of concerns and dependencies](#separation-of-concerns-and-dependencies)
- [Quick start](#quick-start)
- [Viewers](#viewers)
- [The player](#the-player)
- [Reading player state: `usePlayer`](#reading-player-state-useplayer)
- [Part hooks: our behaviour, your markup](#part-hooks-our-behaviour-your-markup)
- [Format parts and hooks](#format-parts-and-hooks)
- [Data hooks](#data-hooks)
- [The `Timeline`](#the-timeline)
- [Adding your own format](#adding-your-own-format)
- [Building blocks](#building-blocks)
- [Recipes](#recipes)
- [Styling](#styling)
- [Keyboard](#keyboard)
- [Migrating from 0.1](#migrating-from-01)
- [API index](#api-index)

## Install

Install this package, plus the reader for each format you show. The readers are **optional peer dependencies**: npm, pnpm and Yarn never install them for you, so you only get the format you ask for.

| You show | Install | Import UI from |
|---|---|---|
| RLDS / TFRecord shards | `npm i @videodb/robopeek-react @videodb/robopeek-rlds` | `@videodb/robopeek-react/rlds` |
| MCAP recordings | `npm i @videodb/robopeek-react @videodb/robopeek-mcap` | `@videodb/robopeek-react/mcap` |
| Both | `npm i @videodb/robopeek-react @videodb/robopeek-rlds @videodb/robopeek-mcap` | both |
| Your own data | `npm i @videodb/robopeek-react` | `@videodb/robopeek-react` (build a [`Timeline`](#the-timeline)) |

- **Peers:** `react` and `react-dom` 19.
- **Module format:** ESM only.
- **Next.js:** files carry `'use client'`, so they work in the App Router.
- **Versions:** all RoboPeek packages share one version number. Keep `@videodb/robopeek-react`, `-rlds` and `-mcap` on the same version, and npm/pnpm warn if they drift.

What lands in `node_modules`:

| Install | Brings | Doesn't bring |
|---|---|---|
| react + rlds | This package (~140 KB unpacked, including the unused `/mcap` entry and type declarations), the RLDS reader (no dependencies) | MCAP reader, zstd/lz4, protobuf, ROS decoders |
| react + mcap | This package, the MCAP reader and its decoders | RLDS reader |

Your **bundle** only contains what you import: the root plus `/rlds` for an RLDS app.

## How the package is organised

```
@videodb/robopeek-react            ← format-free: Player + parts, FrameView, VectorChart, ItemList, LoadStatus,
                                     playback/part hooks, the Timeline type. Imports no reader.
@videodb/robopeek-react/rlds       ← RLDS: viewers, EpisodePlayer, EpisodeList, Flags, data hooks, fromEpisode.
                                     Imports @videodb/robopeek-rlds only.
@videodb/robopeek-react/mcap       ← MCAP: McapViewer, McapPlayer, Topics, useRecording, fromRecording.
                                     Imports @videodb/robopeek-mcap only.
@videodb/robopeek-react/styles.css ← one stylesheet for everything (also structure.css, theme.css)
```

```
          @videodb/robopeek-rlds          @videodb/robopeek-mcap
                   ▲                               ▲
                   │ (optional peer)               │ (optional peer)
   @videodb/robopeek-react/rlds    @videodb/robopeek-react/mcap
                   │                               │
                   └──────────────┬────────────────┘
                                  ▼
                     @videodb/robopeek-react  (root)
                                  │
                                  ▼
                               react
```

How it fits together:

1. A **reader** turns a file into its own data: an RLDS `Episode`, or an MCAP `Recording`.
2. An **adapter** (`fromEpisode`, `fromRecording`) turns that into a **`Timeline`**: the one shape the player reads.
3. **The player and every part** read only the `Timeline`. That's why one player, one set of parts and one theme cover every format.

In this repository the folders mirror the entry points: `src/core` → root, `src/rlds` → `/rlds`, `src/mcap` → `/mcap`.

## Separation of concerns and dependencies

### The rules

| From | May import | May not import |
|---|---|---|
| root (`src/core`) | `react` | any reader, `/rlds`, `/mcap` |
| `/rlds` (`src/rlds`) | root, `react`, `@videodb/robopeek-rlds` | `@videodb/robopeek-mcap`, `/mcap` |
| `/mcap` (`src/mcap`) | root, `react`, `@videodb/robopeek-mcap` | `@videodb/robopeek-rlds`, `/rlds` |

- **Checked on the build output, not just stated.** `pnpm check:boundaries` walks every built entry and the shared chunks it loads, in both `.js` and `.d.ts`. It fails if any of them reaches a package outside its column, including type-only imports. CI runs it on every pull request.
- **Shared code exists once.** Shared code is built into one chunk that every entry loads. A part from the root inside a `/rlds` viewer therefore sees the same player context.
- **Each format entry loads its reader in one place** (`src/rlds/reader.ts`, `src/mcap/reader.ts`), so a missing reader fails in one predictable place.

### When a boundary is crossed

Every mistake fails with a message that says what to do.

| Mistake | Where it shows | Message |
|---|---|---|
| Import `/mcap` without `@videodb/robopeek-mcap` installed | Node / SSR | `Cannot find package '@videodb/robopeek-mcap' imported from …/@videodb/robopeek-react/dist/mcap.js` |
| | webpack, esbuild (build) | `Can't resolve '@videodb/robopeek-mcap'` / `Could not resolve "@videodb/robopeek-mcap"` |
| | Vite (dev and production, when the page loads) | `Could not resolve "@videodb/robopeek-mcap" imported by "@videodb/robopeek-react". Is it installed?` |
| | any other bundler that swaps in an empty module | `'@videodb/robopeek-react/mcap' needs the MCAP reader, which isn't installed.`<br>`npm install @videodb/robopeek-mcap` |
| Import `/rlds` without `@videodb/robopeek-rlds` | same as above | same, naming `@videodb/robopeek-rlds` |
| Pass an RLDS `Episode` to `Player.Root` | render | `<Player.Root timeline> got an RLDS Episode. Convert it first:`<br>`import { useEpisodeTimeline } from '@videodb/robopeek-react/rlds'`<br>`<Player.Root timeline={useEpisodeTimeline(episode)} />` |
| Pass an MCAP `Recording` to `Player.Root` | render | `… got an MCAP Recording. Convert it first: import { useMcapTimeline } from '@videodb/robopeek-react/mcap' …` |
| Pass anything else that isn't a `Timeline` | render | `<Player.Root timeline> needs a Timeline. Build one with useEpisodeTimeline ('…/rlds'), useMcapTimeline ('…/mcap'), or by hand (see the Timeline type).` |
| Put an RLDS part (`<Flags>`, `useCurrentEpisode`) in an MCAP player | render | `<Flags> comes from '@videodb/robopeek-react/rlds' and reads rlds data, but this player shows a 'mcap' timeline. Remove it, or use the parts for 'mcap'.` |
| Put an MCAP part (`<Topics>`, `useCurrentRecording`) in an RLDS player | render | same, the other way round |
| Use a part or `usePlayer` outside a player | render | `usePlayer must be used inside <Player.Root>.` |

With Vite, a missing reader shows up when the page loads rather than failing the build. Vite replaces a missing optional peer with a placeholder module that throws its own error, and no package can change that.

## Quick start

RLDS:

```tsx
import { ShardViewer } from '@videodb/robopeek-react/rlds'
import '@videodb/robopeek-react/styles.css'

export function App() {
  return (
    <div style={{ height: 640 }}>
      <ShardViewer source="https://huggingface.co/datasets/<org>/<dataset>/resolve/main/<split>.tfrecord-00000-of-00128" />
    </div>
  )
}
```

MCAP:

```tsx
import { McapViewer } from '@videodb/robopeek-react/mcap'
import '@videodb/robopeek-react/styles.css'

export function App() {
  return (
    <div style={{ height: 640 }}>
      <McapViewer source="https://huggingface.co/datasets/<org>/<dataset>/resolve/main/episode.mcap" />
    </div>
  )
}
```

Viewers fill their container (`height: 100%`), so give the parent a height. The library ships no fonts: load [Inter](https://fonts.google.com/specimen/Inter), or set `--rp-font-sans`.

## Viewers

A viewer is a load-status strip plus a player (and, for shards, an episode drawer). It has no URL field, file picker or drop target. Choosing the file is your app's job; pass the result as `source` (a URL string, `URL` or `File`).

### `ShardViewer` (`/rlds`)

Every episode in an RLDS shard, streamed as it downloads, with a filterable episode drawer.

| Prop | Type | |
|---|---|---|
| `source` | `Source \| null` | URL or `File`. `null` shows `empty`. A new source starts at its first episode. |
| `selected` / `defaultSelected` / `onSelectedChange` | `number` | The selected episode (controlled or uncontrolled) |
| `specs` | `FeatureSpecs \| 'auto' \| false` | `'auto'` (default) reads the `features.json` next to a URL shard, which restores tensor shapes and depth images |
| `defaultFps` | `number` | Initial playback rate in steps per second (default 10; RLDS records no frame rate) |
| `renderTitle` | `(episode) => string \| undefined` | Drawer row title, which the filter also matches (default: the language instruction) |
| `colorScheme` | `'light' \| 'dark'` | |
| `autoFocus` | `boolean` | Focus on mount so hotkeys work before the first click |
| `empty` | `ReactNode` | Shown while `source` is `null` |
| `playerProps` | `Partial<PlayerRootProps>` | Passed to the inner `Player.Root`, e.g. `{ defaultAutoNext: true }` |
| `children` | `ReactNode` | Your player layout, rendered inside the viewer's `Player.Root`. Omitted → the default layout with step flags. |

Plus every `div` prop (`className`, `style`, `ref`, …).

### `EpisodeViewer` (`/rlds`)

One episode by number, fetched without downloading the rest of the shard (URLs need HTTP Range support).

| Prop | Type | |
|---|---|---|
| `source` | `Source \| null` | |
| `episode` / `defaultEpisode` / `onEpisodeChange` | `number` | Which episode. Previous/next buttons and ↑/↓ change it. |
| `specs`, `defaultFps`, `colorScheme`, `autoFocus`, `empty`, `playerProps`, `children` | | As for `ShardViewer` |

The status strip shows how far the reader had to read, and how many episodes it has located so far.

### `McapViewer` (`/mcap`)

One MCAP file, playable while it downloads.

| Prop | Type | |
|---|---|---|
| `source` | `Source \| null` | URL or `File` |
| `maxFrameBytes` | `number` | Frame memory budget (default 512 MiB). Indexed files over HTTP Range fetch released frames back; see the [reader docs](https://www.npmjs.com/package/@videodb/robopeek-mcap#memory-budget-and-range-refetch). |
| `defaultSpeed` | `number` | Initial rate as a multiple of real time (default 1) |
| `colorScheme`, `autoFocus`, `empty` | | As above |
| `playerProps` | `Partial<PlayerRootProps>` | e.g. `onPrevEpisode` / `onNextEpisode` to step through a list of files |
| `children` | `ReactNode` | Your player layout. Omitted → the default layout with the topic list. |

The status strip shows topic count, length, bytes loaded, and a note when frames over the budget couldn't be kept (no Range support).

## The player

### Default arrangement

```
Player.Root
├─ Stage ─ Instruction, Frames, Transport, Options
└─ Tracks ─ (one chart per signal), Metadata, (format panels)
Transport ─ PrevEpisode, StepBack, Play, StepForward, NextEpisode, Scrubber, Counter
Options   ─ RateSelect, AutoNext, (format options)
```

The format players add their own parts through `DefaultLayout`'s slots: RLDS adds `<Flags>` to the options, and MCAP adds the `<Topics>` panel.

### Three ways to get a player

| | Use it when |
|---|---|
| `<EpisodePlayer episode={episode} />` (`/rlds`) | You have an RLDS `Episode` (from `useEpisode`, `useEpisodeStream` or the reader) |
| `<McapPlayer recording={recording} />` (`/mcap`) | You have an MCAP `Recording` (from `useRecording` or the reader) |
| `<Player.Root timeline={timeline} />` / `<Player timeline={timeline} />` (root) | You built a `Timeline` yourself, or want full control |

`EpisodePlayer` and `McapPlayer` are `Player.Root` with the format's timeline. They take every `Player.Root` prop except `timeline`.

### Rearranging it

List the parts you want, in the order you want. Leave out the rest. A composite part (`Stage`, `Transport`, `Options`) renders its defaults when it has no children, and only your children otherwise. `Tracks` renders its charts, then its children in the same grid.

```tsx
import { Player } from '@videodb/robopeek-react'
import { EpisodePlayer, Flags, useEpisode } from '@videodb/robopeek-react/rlds'

function MyPlayer({ url, n, go }: { url: string; n: number; go: (n: number) => void }) {
  const { episode, status } = useEpisode(url, n)
  if (!episode) return <p>{status.phase === 'error' ? status.error : 'Loading…'}</p>
  return (
    <EpisodePlayer
      episode={episode}
      defaultRate={15}
      onPrevEpisode={n > 0 ? () => go(n - 1) : undefined}   // omitted → PrevEpisode renders disabled
      onNextEpisode={() => go(n + 1)}                        // also drives AutoNext at the end
    >
      <Player.Stage>
        <Player.Frames include={['observation/image']} renderEmpty={() => <p>No cameras</p>} />
        <Player.Transport />
        <Player.Options><Player.RateSelect /><Flags /></Player.Options>
      </Player.Stage>
      <Player.Tracks include={(key) => !key.includes('embedding')} />
    </EpisodePlayer>
  )
}
```

### `Player.Root` props

| Prop | Type | Default | |
|---|---|---|---|
| `timeline` | `Timeline` | required | What to play. Validated; see [boundary errors](#when-a-boundary-is-crossed). |
| `position` / `defaultPosition` / `onPositionChange` | `number` | `0` | The playhead, in the timeline's unit: a step index for RLDS, seconds for MCAP |
| `playing` / `defaultPlaying` / `onPlayingChange` | `boolean` | `false` | |
| `rate` / `defaultRate` / `onRateChange` | `number` | `10` (steps) / `1` (seconds) | Steps per second for step timelines; a multiple of real time for second timelines |
| `autoNext` / `defaultAutoNext` / `onAutoNextChange` | `boolean` | `false` | At the end, continue to the next episode (calls `onNextEpisode`) |
| `onPrevEpisode` / `onNextEpisode` | `() => void` | | Omitted → that button is disabled and ↑/↓ do nothing |
| `loading` | `boolean` | `false` | The timeline is still filling in; playback waits at the loaded end instead of stopping |
| `hotkeys` | `boolean \| RefObject<HTMLElement>` | `true` | `true`: keys work while focus is inside the player. A ref binds them to that element instead. `false` turns them off. |
| `colorScheme` | `'light' \| 'dark'` | | |
| `children` | `ReactNode` | `<DefaultLayout />` | |

Plus every `div` prop. Each controlled value works like an input's `value`: pass it and the player only reports changes; omit it and the player keeps its own state, seeded by `default…`. A new `timeline` resets uncontrolled position and playing. When the player moves to the next episode itself (next button or auto-next), the new episode keeps playing.

### Parts

All exported as `Player.*` and as named components of the same name from the root.

| Part | Props | |
|---|---|---|
| `DefaultLayout` | `options?`, `panels?` | The default arrangement, with slots for format parts |
| `Stage` | children | The dark panel: instruction, frames, transport, options |
| `Instruction` | `include?` | Text tracks: the value at the playhead. Empty values are skipped. |
| `Frames` | `include?`, `renderItem?(key, track, fallback)`, `renderEmpty?` | One `FrameView` per image track. Asks the timeline to `prepare` frames around the playhead (MCAP refetch). Up to 3 cameras get equal columns; 4 or more wrap. |
| `Transport` | children | Defaults: `PrevEpisode`, `StepBack`, `Play`, `StepForward`, `NextEpisode`, `Scrubber`, `Counter` |
| `Play`, `StepBack`, `StepForward`, `PrevEpisode`, `NextEpisode` | button props; children replace the icon | Steps move between samples of the first camera (or the first chart) |
| `Scrubber` | input props | A native range input. Whole steps for RLDS, continuous for MCAP. |
| `Counter` | span props | `12 / 437` (steps) or `0:12.30 / 0:22.00` (seconds) |
| `Options` | children | Defaults: `RateSelect`, `AutoNext` |
| `RateSelect` | `options?: number[]` | `2–60 fps` for steps, `0.25×–4×` for seconds |
| `AutoNext` | `label?` | "Continue to next episode" checkbox |
| `Tracks` | `include?`, `renderItem?(key, track, fallback)`, `maxSeries?`, children | One `VectorChart` per vector track; click or drag a chart to seek |
| `Metadata` | `include?`, `renderItem?(key, value, fallback)`, `title?` | Key/value panel; hidden when empty |

`include` is a list of keys or a predicate: `include={['action']}` or `include={(k) => k.startsWith('/joint')}`. Every `renderItem` receives the built-in element as `fallback`, so overriding one item is one line:

```tsx
<Player.Tracks renderItem={(key, track, fallback) => (key === 'action' ? <MyActionPlot track={track} /> : fallback)} />
```

Every part takes `className`, `ref` and the usual DOM props, and its props type is exported (`FramesProps`, `TracksProps`, …).

## Reading player state: `usePlayer`

Any component inside a player can read live state. It re-renders only when the slice it selects changes:

```tsx
import { rowAt, usePlayer } from '@videodb/robopeek-react'

function RewardBadge() {
  const track = usePlayer((s) => s.timeline.vectors.reward)  // stable: no re-render per frame
  const step = usePlayer((s) => s.position)                   // re-renders as the playhead moves
  return track ? <span>reward {rowAt(track, step)[0].toFixed(2)}</span> : null
}
```

| Field | Type | |
|---|---|---|
| `timeline` | `Timeline` | May fill in while loading; select `version` too if you read its tracks |
| `version` | `number` | Changes when the timeline does (at most once per animation frame) |
| `unit` | `'step' \| 'second'` | |
| `end` | `number` | Last position |
| `loading` | `boolean` | |
| `position` / `setPosition(p)` | `number` | |
| `step(delta)` | `(n: number) => void` | Move `delta` samples along the reference track |
| `playing` / `toggle()` / `setPlaying(b)` | | |
| `rate` / `setRate(r)` | `number` | |
| `autoNext` / `setAutoNext(b)` | `boolean` | |
| `hasPrev` / `hasNext` / `prevEpisode()` / `nextEpisode()` | | |

Select primitives or stable references (`timeline`, the setters), not objects you build in the selector.

## Part hooks: our behaviour, your markup

Each built-in part is a hook plus thin markup. Keep the logic and render any element you like.

| Hook | Returns |
|---|---|
| `usePlayButton()` | `{ playing, buttonProps }`: `type`, `onClick`, `aria-label` ("Play" / "Pause"), `title` |
| `useStepButton(delta)` | `{ buttonProps }`, labelled "Next step" / "Previous frame" for the unit |
| `useEpisodeButton('prev' \| 'next')` | `{ available, buttonProps }` (disabled when unavailable) |
| `useScrubber()` | `{ position, end, inputProps }` for `<input type="range">` |
| `useRateSelect(options?)` | `{ rate, unit, options, format(r), selectProps }` |
| `useAutoNext()` | `{ checked, inputProps }` for a checkbox |

```tsx
function MyPlay() {
  const { playing, buttonProps } = usePlayButton()
  return <MyFancyButton {...buttonProps}>{playing ? 'Pause' : 'Play'}</MyFancyButton>
}
```

`RATE_OPTIONS`, `formatTime(seconds)` (`m:ss.cc`) and `formatPosition(p, unit)` are exported too.

## Format parts and hooks

These read their format's own object, and only work inside a player of that format. Elsewhere they throw the [boundary error](#when-a-boundary-is-crossed).

| Export | Entry | |
|---|---|---|
| `Flags` | `/rlds` | RLDS step flags (`is_first`, `is_last`, `is_terminal`) as chips, lit on their steps. `keys?` to choose. |
| `useCurrentEpisode()` | `/rlds` | The RLDS `Episode` in the surrounding player: metadata `Feature`s, raw vectors, `index`, `byteSize` |
| `EpisodeList` | `/rlds` | The episode drawer: `episodes`, `selected`, `onSelect`, `loading`, `renderTitle`, `renderItem(episode, fallback)`, `filterPlaceholder` |
| `Topics` | `/mcap` | Every topic with schema, message count and how it's shown (or why not). `include`, `renderItem(info, fallback)`, `title`. |
| `useCurrentRecording()` | `/mcap` | The MCAP `Recording` in the surrounding player: `topics`, `frameBytes`, `framesLost`, … |

```tsx
import { readText } from '@videodb/robopeek-rlds'
import { useCurrentEpisode } from '@videodb/robopeek-react/rlds'

function SourceFile() {
  const episode = useCurrentEpisode()
  return <aside>{readText(episode.metadata['episode_metadata/file_path'])?.[0] ?? `Episode ${episode.index}`}</aside>
}
```

## Data hooks

| Hook | Entry | Returns |
|---|---|---|
| `useEpisodeStream({ specs? })` | `/rlds` | `{ episodes, status, load(src), cancel(), reset() }`. Streams a whole shard; batches updates to one render per frame. `status: { phase: 'idle' \| 'loading' \| 'done' \| 'cancelled' \| 'error', source, loaded, total, error }` |
| `useEpisode(src, n, { specs? })` | `/rlds` | `{ episode, status, known: { count, complete } }`. One episode via HTTP Range. The shard index is kept per source, so moving between episodes reuses what was read. `status.phase: 'idle' \| 'loading' \| 'ready' \| 'error'` |
| `useEpisodeTimeline(episode)` | `/rlds` | The episode as a `Timeline` (memoised, disposed on change/unmount) |
| `useRecording(src, { maxFrameBytes? })` | `/mcap` | `{ file, recording, status, version }`. Opens and streams an MCAP file. `status: { phase: 'idle' \| 'loading' \| 'done' \| 'error', source, loaded, total, indexed, error }` |
| `useMcapTimeline(recording)` | `/mcap` | The recording as a `Timeline` that follows it while it loads |
| `usePlayback(opts)` | root | The clock on its own: `{ position, setPosition, playing, setPlaying, toggle, rate, setRate, end }`. Options: `unit`, `end`, `loading`, and the controlled/uncontrolled trios, `onEnd`, `resetKey`. |
| `usePlayerHotkeys(ref, controls, enabled?)` | root | Space, ←/→ (Shift = 10), Home/End, ↑/↓. Scoped to `ref`, never `window`. |
| `useTimelineVersion(timeline)` | root | Re-render when a timeline changes, batched to animation frames |

A headless player, with your own UI and no stylesheet:

```tsx
import { usePlayback, usePlayerHotkeys } from '@videodb/robopeek-react'
import { useEpisodeStream } from '@videodb/robopeek-react/rlds'

const { episodes, load } = useEpisodeStream({ specs: 'auto' })
const ep = episodes[0]
const end = (ep?.length ?? 1) - 1
const { position, setPosition, playing, toggle } = usePlayback({ unit: 'step', end, defaultRate: 10, resetKey: ep })
const ref = useRef<HTMLDivElement>(null)
usePlayerHotkeys(ref, { toggle, setPosition, step: (d) => setPosition(position + d), end })
```

## The `Timeline`

The one shape the player reads, defined in the root entry:

```ts
type Timeline = {
  format: string                          // 'rlds', 'mcap', or yours; format parts check it
  unit: 'step' | 'second'
  end: number                             // last position
  images: Record<string, ImageTrack>
  vectors: Record<string, VectorTrack>
  text: Record<string, TextTrack>
  metadata: Record<string, string>
  source?: unknown                        // the adapter's own object (Episode, Recording)
  version?: number                        // for timelines that fill in while loading…
  subscribe?(fn: () => void): () => void  // …and the change notification
  prepare?(start: number, end: number, signal: AbortSignal): void // the window around the playhead
}

type ImageTrack = {
  times: ArrayLike<number>
  label?: string                          // caption, e.g. 'jpeg', 'h264', 'png 16-bit'
  load(i: number): Promise<CanvasImageSource | undefined> // undefined: not available yet (shown as pending)
}
type VectorTrack = { times: ArrayLike<number>; dim: number; data: ArrayLike<number>; names?: string[]; shape?: number[] }
type TextTrack = { times: ArrayLike<number>; values: string[] }
```

Every part shows the sample at or before the playhead (`indexAt(times, position)`). Steps are evenly spaced samples, which is why one player serves both units.

| Adapter | Builds | Notes |
|---|---|---|
| `fromEpisode(episode)` / `useEpisodeTimeline` | `unit: 'step'`, `times` 0…n−1 | Step flags are left out of `vectors` (shown by `<Flags>`). Metadata features are formatted to strings. Raw tensors use the reader's `rgbaAt`. Call `dispose()` when done; the hook does it for you. |
| `fromRecording(recording)` / `useMcapTimeline` | `unit: 'second'` | Follows the recording while it loads (`version`, `subscribe`). Decodes JPEG/PNG, 16-bit depth, raw and H.264. `prepare` asks the recording to fetch released frames. |

## Adding your own format

A format is a reader (no React) plus a small adapter. Nothing in the root entry changes.

```tsx
import { frameCache, steps, Player, type Timeline } from '@videodb/robopeek-react'

function toTimeline(run: MyRun): Timeline & { dispose(): void } {
  const times = steps(run.frames.length)
  const cam = frameCache((i) => createImageBitmap(run.frames[i]), { count: () => run.frames.length })
  return {
    format: 'my-format',
    unit: 'step',
    end: run.frames.length - 1,
    images: { camera: { times, label: 'jpeg', load: cam.load } },
    vectors: { torque: { times, dim: 7, data: run.torque, names: run.jointNames } },
    text: { goal: { times, values: run.goals } },
    metadata: { robot: run.robot },
    source: run,
    dispose: cam.close,
  }
}

<Player timeline={useMemo(() => toTimeline(run), [run])} />
```

| Helper | |
|---|---|
| `steps(n)` | `Float64Array` 0…n−1 for step timelines |
| `frameCache(decode, { count, ahead = 8, size = 32 })` | An `ImageTrack.load` with lookahead decoding and a bounded bitmap cache. `decode(i)` returns a bitmap promise, or `undefined` when bytes aren't available yet (not cached, so retried later). Returns `{ load, close }`. |
| `indexAt(times, t)`, `rowAt(track, i)` | Lookups |
| `assertTimeline(value, where)` | Throws the guiding "needs a Timeline" error. Use it in your own components that take a timeline. |
| `useFormatSource(format, partName)` | For your own format-only parts: returns `timeline.source`, or throws the "comes from … but this player shows …" error |

For data that grows while loading, give the timeline `version` and `subscribe`. For data fetched on demand, implement `prepare(start, end, signal)`: the `Frames` part calls it as the playhead moves.

## Building blocks

The primitives the parts are made of, for layouts the parts don't cover.

| Component | Props | |
|---|---|---|
| `FrameView` | `name`, `track: ImageTrack`, `position`, `version?` | One camera canvas. Keeps the last frame while the next loads (`data-pending`). Caption: name, size, `label`. |
| `VectorChart` | `name`, `track: VectorTrack`, `end`, `position`, `onSeek(p)`, `version?`, `maxSeries = 32` | One line per dimension. Long tracks are drawn as per-pixel min/max, so 500 Hz signals stay fast. The legend toggles dimensions and shows values at the playhead (with `names`). Wider tracks start collapsed behind "Chart all". |
| `ItemList` | `items: { key, head, aside?, title? }[]`, `selected`, `onSelect(key)`, `pending?`, `renderItem?`, `emptyTitle?`, `filterPlaceholder?` | A filterable list that keeps the current row in view (`EpisodeList` is built on it) |
| `LoadStatus` | `phase`, `source?`, `loaded?`, `total?`, `error?`, children | Thin progress strip; children add counts or notes |

## Recipes

### Show only some cameras and charts

```tsx
<ShardViewer source={url}>
  <Player.Stage>
    <Player.Frames include={['observation/image']} />
    <Player.Transport />
  </Player.Stage>
  <Player.Tracks include={(key) => key === 'action' || key.startsWith('observation/state')} />
</ShardViewer>
```

### Step through a list of MCAP files

```tsx
const [i, setI] = useState(0)
<McapViewer
  source={files[i]}
  playerProps={{
    onPrevEpisode: i > 0 ? () => setI(i - 1) : undefined,
    onNextEpisode: i < files.length - 1 ? () => setI(i + 1) : undefined,
    defaultAutoNext: true,
  }}
/>
```

### An MCAP player around a recording you already loaded

```tsx
import { useRecording, McapPlayer } from '@videodb/robopeek-react/mcap'

const { recording, status } = useRecording(url, { maxFrameBytes: 256 * 2 ** 20 })
return recording ? <McapPlayer recording={recording} loading={status.phase === 'loading'} /> : null
```

### Sync the episode with the URL

```tsx
const [n, setN] = useState(() => Number(new URLSearchParams(location.search).get('episode') ?? 0))
<EpisodeViewer source={url} episode={n} onEpisodeChange={(e) => { setN(e); history.replaceState(null, '', `?episode=${e}`) }} />
```

### Speed buttons instead of a dropdown

```tsx
function SpeedChips() {
  const rate = usePlayer((s) => s.rate)
  const setRate = usePlayer((s) => s.setRate)
  return [5, 10, 30].map((r) => <button key={r} aria-pressed={rate === r} onClick={() => setRate(r)}>{r} fps</button>)
}
```

### Restyle the metadata panel

```tsx
<Player.Metadata title="Episode info" renderItem={(key, value) => <MyRow label={key.split('/').pop()} value={value} />} />
```

### Play through a whole shard

```tsx
<ShardViewer source={url} playerProps={{ defaultAutoNext: true, defaultPlaying: true }} />
```

## Styling

Use the first level that's enough.

| Level | What you do | Example |
|---|---|---|
| 1. Tokens | Set `--rp-*` CSS variables | Brand colour, font, chart colours |
| 2. Classes | Target `rp-*` classes and `data-*` attributes | Hide the speed picker, round the frames |
| 3. Layout only | Import `structure.css` instead of `styles.css`, then style it yourself | Your own look, our layout |
| 4. Recompose | Player parts, `usePlayer`, `renderItem` | Your own panels and layout |
| 5. Part hooks | Our behaviour in your components | Your design system's buttons |
| 6. Headless | Data hooks only, no stylesheet | Everything is yours |

All library CSS sits in `@layer robopeek`, so any normal CSS rule of yours wins without `!important`.

### Tokens

```css
:root {
  --rp-accent: #4f46e5;
  --rp-accent-hover: #4338ca;
  --rp-font-sans: 'Geist', system-ui, sans-serif;
  --rp-radius: 6px;
  --rp-series-0: #e11d48;
}
```

Set them on `:root` for the whole app, on a class for one viewer (`<ShardViewer className="brand" />`, `<McapViewer className="brand" />`), or inline (`style={{ '--rp-accent': 'teal' }}`). One theme covers every format.

| Group | Tokens |
|---|---|
| Surfaces | `--rp-panel`, `--rp-sidebar`, `--rp-sunken` |
| Text | `--rp-ink`, `--rp-ink-secondary`, `--rp-muted`, `--rp-disabled`, `--rp-icon` |
| Lines | `--rp-line`, `--rp-line-hover` |
| Brand | `--rp-accent`, `--rp-accent-hover`, `--rp-accent-ink`, `--rp-accent-soft`, `--rp-progress`, `--rp-danger` |
| Stage (dark video panel) | `--rp-stage`, `--rp-stage-ink`, `--rp-stage-muted`, `--rp-stage-line`, `--rp-stage-line-hover`, `--rp-stage-soft`, `--rp-stage-off`, `--rp-stage-accent`, `--rp-stage-accent-ink`, `--rp-frame-bg` |
| Charts | `--rp-series-0` … `--rp-series-7` |
| Shape and type | `--rp-radius`, `--rp-radius-card`, `--rp-font-sans`, `--rp-font-mono` |

Defaults follow the VideoDB design system (orange accent, Inter). The library ships no fonts; load Inter, or set `--rp-font-sans`.

### Classes and attributes

Class names and `data-*` attributes are public API and change only in a minor (pre-1.0) or major release.

```css
.my-viewer .rp-options { display: none; }                          /* hide speed, auto-next (and RLDS flags) */
.my-viewer .rp-frame canvas { border-radius: 12px; }
.my-viewer .rp-player[data-playing] .rp-tracks { opacity: 0.5; }   /* dim charts while playing */
.my-viewer .rp-list { display: none; }                             /* hide ShardViewer's episode list */
```

Main classes: `rp-viewer`, `rp-shard-viewer`, `rp-episode-viewer`, `rp-mcap-viewer`, `rp-status`, `rp-list` (with `rp-episodes` on the RLDS drawer), `rp-player`, `rp-stage`, `rp-instruction`, `rp-frames`, `rp-frame`, `rp-transport`, `rp-transport-button`, `rp-play`, `rp-scrubber`, `rp-counter`, `rp-options`, `rp-rate`, `rp-autonext`, `rp-flags`, `rp-tracks`, `rp-chart`, `rp-metadata`, `rp-topics`.

State attributes: `data-playing` (player), `data-phase` (status), `data-on` (flag chips), `data-collapsed` (charts), `data-pending` (a frame not available yet; the previous one stays up), `data-rp-scheme`.

### Stylesheets

| Import | Contains |
|---|---|
| `@videodb/robopeek-react/styles.css` | Everything (structure and theme) |
| `@videodb/robopeek-react/structure.css` | Layout only: grids, sizes, spacing |
| `@videodb/robopeek-react/theme.css` | Colours, borders, radii and type, all through `--rp-*` tokens |

### Dark mode

Light is the default. `colorScheme="dark"` on a viewer or `Player.Root` switches that subtree to dark; `colorScheme="light"` keeps a subtree light inside a dark page. To theme a dark subtree, scope your tokens: `[data-rp-scheme='dark'] { --rp-accent: … }`.

### CSS layers and Tailwind

Normal CSS always beats `@layer robopeek`. Layered CSS, such as Tailwind v4's utilities, follows layer order instead: the layer declared last wins. If you use Tailwind, import the stylesheet from your CSS and declare the order so your utility classes win:

```css
/* app.css */
@layer theme, base, robopeek, components, utilities;
@import 'tailwindcss';
@import '@videodb/robopeek-react/styles.css' layer(robopeek);
```

Then `className="bg-zinc-900"` on any part overrides the library's background.

## Keyboard

Active while focus is inside the player (click it, or use `autoFocus` on a viewer). Ignored while typing in an input. Never bound to `window`.

| Key | Action |
|---|---|
| Space | Play / pause |
| ← / → | Previous / next step (RLDS) or frame (MCAP); Shift: 10 |
| Home / End | Start / end |
| ↑ / ↓ | Previous / next episode (when the player has a handler) |

## Migrating from 0.1

0.1 was RLDS-only and installed the reader for you. Changes in 0.2:

| 0.1 | 0.2 |
|---|---|
| `npm i @videodb/robopeek-react` | `npm i @videodb/robopeek-react @videodb/robopeek-rlds` |
| `import { ShardViewer, EpisodeViewer } from '@videodb/robopeek-react'` | `import { … } from '@videodb/robopeek-react/rlds'` |
| `useEpisodeStream`, `useEpisode`, `EpisodeList` from the root | from `/rlds` |
| Reader API re-exported (`Episode`, `Source`, `vectorAt`, `readText`, …) | Import from `@videodb/robopeek-rlds` |
| `<Player.Root episode={ep}>` / `<Player episode={ep} />` | `<EpisodePlayer episode={ep}>` (`/rlds`), or `<Player.Root timeline={useEpisodeTimeline(ep)}>` |
| `step` / `defaultStep` / `onStepChange` | `position` / `defaultPosition` / `onPositionChange` |
| `fps` / `defaultFps` / `onFpsChange` on `Player.Root` | `rate` / `defaultRate` / `onRateChange` (viewers keep `defaultFps`) |
| `Player.FpsSelect`, `useFpsSelect`, `FPS_OPTIONS` | `Player.RateSelect`, `useRateSelect`, `RATE_OPTIONS` |
| `Player.Flags`, `FLAG_KEYS` | `Flags`, `FLAG_KEYS` from `/rlds` |
| `usePlayer((s) => s.episode)` | `useCurrentEpisode()` (`/rlds`), or `usePlayer((s) => s.timeline)` |
| `usePlayer((s) => s.step)`, `s.length`, `s.fps` | `s.position`, `s.end` (last index = length − 1), `s.rate` |
| `Metadata` `renderItem(key, feature, fallback)` | `renderItem(key, value: string, fallback)`; use `useCurrentEpisode().metadata` for raw `Feature`s |
| `Tracks` `renderItem` track: reader `VectorTrack` | the `Timeline`'s `VectorTrack` (`times`, `dim`, `data`, `shape`); `rowAt(track, i)` replaces `vectorAt` |
| `FrameCanvas` | `FrameView` (takes an `ImageTrack` with `load`) |
| `.rp-episodes*` classes, `.rp-fps` | `.rp-list*` (the drawer keeps `.rp-episodes` too), `.rp-rate` |

## API index

### `@videodb/robopeek-react`

| Export | |
|---|---|
| `Player` (+ `Player.Root`, `.DefaultLayout`, `.Stage`, `.Instruction`, `.Frames`, `.Transport`, `.PrevEpisode`, `.StepBack`, `.Play`, `.StepForward`, `.NextEpisode`, `.Scrubber`, `.Counter`, `.Options`, `.RateSelect`, `.AutoNext`, `.Tracks`, `.Metadata`) | [The player](#the-player) |
| `usePlayer`, `PlayerState` | [Player state](#reading-player-state-useplayer) |
| `usePlayButton`, `useStepButton`, `useEpisodeButton`, `useScrubber`, `useRateSelect`, `useAutoNext`, `RATE_OPTIONS`, `formatTime`, `formatPosition` | [Part hooks](#part-hooks-our-behaviour-your-markup) |
| `usePlayback`, `usePlayerHotkeys`, `useTimelineVersion`, `useControllable` | [Data hooks](#data-hooks) |
| `Timeline`, `Unit`, `ImageTrack`, `VectorTrack`, `TextTrack`, `indexAt`, `rowAt`, `steps`, `frameCache` | [Timeline](#the-timeline), [your own format](#adding-your-own-format) |
| `assertTimeline`, `useFormatSource` | Boundary checks for your own adapters |
| `FrameView`, `VectorChart`, `ItemList`, `LoadStatus`, `cx`, `mergeRefs` | [Building blocks](#building-blocks) |
| `PlayerRootProps`, `DefaultLayoutProps`, `FramesProps`, `TracksProps`, `MetadataProps`, … `ColorScheme`, `Include`, `ListItem`, `PlaybackOptions`, `HotkeyControls`, `FrameCacheOptions` | Types |

### `@videodb/robopeek-react/rlds` (needs `@videodb/robopeek-rlds`)

| Export | |
|---|---|
| `ShardViewer`, `EpisodeViewer` | [Viewers](#viewers) |
| `EpisodePlayer`, `EpisodeList`, `Flags`, `useCurrentEpisode`, `FLAG_KEYS` | [Format parts](#format-parts-and-hooks) |
| `useEpisodeStream`, `useEpisode`, `fromEpisode`, `useEpisodeTimeline` | [Data hooks](#data-hooks) |
| `ShardViewerProps`, `EpisodeViewerProps`, `EpisodePlayerProps`, `EpisodeListProps`, `FlagsProps`, `StreamStatus`, `EpisodeStatus`, `SpecsOption`, `EpisodeTimeline` | Types |

### `@videodb/robopeek-react/mcap` (needs `@videodb/robopeek-mcap`)

| Export | |
|---|---|
| `McapViewer` | [Viewers](#viewers) |
| `McapPlayer`, `Topics`, `useCurrentRecording` | [Format parts](#format-parts-and-hooks) |
| `useRecording`, `fromRecording`, `useMcapTimeline` | [Data hooks](#data-hooks) |
| `McapViewerProps`, `McapPlayerProps`, `TopicsProps`, `RecordingStatus`, `RecordingOptions`, `McapTimeline` | Types |

### Stylesheets

`@videodb/robopeek-react/styles.css`, `/structure.css`, `/theme.css`. See [Styling](#styling).

## Related

- [`@videodb/robopeek-rlds`](https://www.npmjs.com/package/@videodb/robopeek-rlds): the RLDS reader. Its README documents the `Episode` object, `streamEpisodes`, `ShardIndex` and feature specs.
- [`@videodb/robopeek-mcap`](https://www.npmjs.com/package/@videodb/robopeek-mcap): the MCAP reader. Its README documents the `Recording`, topic classification, time and the memory budget.
- [RoboPeek on GitHub](https://github.com/video-db/RoboPeek): source, issues, roadmap and a live demo app.
- [Changelog](https://github.com/video-db/RoboPeek/blob/main/packages/react/CHANGELOG.md)

---

<p align="center">
  Maintained by
  <a href="https://videodb.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/video-db/RoboPeek/main/assets/videodb-logo-dark.png" />
      <img src="https://raw.githubusercontent.com/video-db/RoboPeek/main/assets/videodb-logo.png" alt="VideoDB" height="18" align="center" />
    </picture>
  </a>
</p>
