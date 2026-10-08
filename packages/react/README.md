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

React components for previewing robot-learning episodes: a full shard viewer, a single-episode viewer, a player you can take apart, and the hooks underneath. Drop in one component, or rebuild the whole thing in your own design system.

[![npm](https://img.shields.io/npm/v/@videodb/robopeek-react?style=flat-square)](https://www.npmjs.com/package/@videodb/robopeek-react)

Part of [RoboPeek](https://github.com/video-db/RoboPeek), which previews robotics datasets on the web. It reads RLDS today through [`@videodb/robopeek-rlds`](https://www.npmjs.com/package/@videodb/robopeek-rlds), which this package installs and re-exports.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [How the pieces fit](#how-the-pieces-fit)
- [Viewers](#viewers)
- [The player](#the-player)
- [Reading player state: `usePlayer`](#reading-player-state-useplayer)
- [Part hooks: our behaviour, your markup](#part-hooks-our-behaviour-your-markup)
- [Data hooks](#data-hooks)
- [Building blocks](#building-blocks)
- [Recipes](#recipes)
- [Styling](#styling)
- [Keyboard](#keyboard)
- [API index](#api-index)

## Install

```sh
npm install @videodb/robopeek-react
```

Requires React 19. Ships ESM with a `'use client'` banner, so it works in Next.js App Router client components.

Import the stylesheet once, anywhere in your app:

```ts
import '@videodb/robopeek-react/styles.css'
```

Using Tailwind or other `@layer` CSS? See [CSS layers and Tailwind](#css-layers-and-tailwind).

## Quick start

```tsx
import { ShardViewer } from '@videodb/robopeek-react'
import '@videodb/robopeek-react/styles.css'

export function App() {
  return <ShardViewer source="https://huggingface.co/datasets/<org>/<dataset>/resolve/main/<split>.tfrecord-00000-of-00128" />
}
```

That renders an episode list that fills in while the shard downloads, plus a player with camera frames, transport controls, a chart for every action and state track, and the episode's metadata.

To let users open their own files, pass a `File`:

```tsx
const [file, setFile] = useState<File | null>(null)

<input type="file" onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)} />
<ShardViewer source={file} empty={<p>Pick a .tfrecord file</p>} />
```

## How the pieces fit

Each layer is built on the one below and works without the ones above. Start at the top and step down only when you need more control.

| Layer | What you get | Use it when |
|---|---|---|
| [Viewers](#viewers) | `ShardViewer`, `EpisodeViewer` | You want a working viewer in one line |
| [Player parts](#the-player) | `Player.Root` + `Player.Frames`, `Player.Transport`, … | You want your own layout, or to add your own panels |
| [Part hooks](#part-hooks-our-behaviour-your-markup) | `usePlayButton`, `useScrubber`, … | You want our behaviour inside your own buttons and inputs |
| [Data hooks](#data-hooks) | `useEpisodeStream`, `useEpisode`, `usePlayback` | You want loading and playback state, and to render everything yourself |
| [`@videodb/robopeek-rlds`](https://www.npmjs.com/package/@videodb/robopeek-rlds) | `streamEpisodes`, `ShardIndex`, `Episode` | You want the raw data, with no React at all |

## Viewers

Both viewers take a `source` (a URL string, `URL`, or `File`/`Blob`) and render nothing but `empty` while it's `null`. Choosing the file or URL is up to your app.

### `ShardViewer`

Streams a whole shard. The episode list fills in as bytes arrive; the selected episode plays on the right.

```tsx
<ShardViewer source={url} defaultFps={10} autoFocus />
```

| Prop | Type | Default | |
|---|---|---|---|
| `source` | `Source \| null` | | Shard to read. `null` shows `empty`. |
| `selected` / `defaultSelected` / `onSelectedChange` | `number` | `0` | Selected episode, controlled or uncontrolled |
| `specs` | `FeatureSpecs \| 'auto' \| false` | `'auto'` | `'auto'` loads the `features.json` next to a URL shard (restores depth images and tensor shapes) |
| `defaultFps` | `number` | `10` | Playback speed. RLDS stores no frame rate, so this is a display choice. |
| `colorScheme` | `'light' \| 'dark'` | light | See [Dark mode](#dark-mode) |
| `autoFocus` | `boolean` | | Focus on mount so keyboard shortcuts work right away |
| `renderTitle` | `(episode) => string \| undefined` | `episodeTitle` | Title shown in the episode list |
| `empty` | `ReactNode` | | Shown while `source` is `null` |
| `playerProps` | `Partial<PlayerRootProps>` | | Passed to the inner `Player.Root`, e.g. `{ defaultAutoNext: true }` |
| `children` | `ReactNode` | default player | Your own [player layout](#the-player) |

Also accepts every `<div>` prop (`className`, `style`, `ref`, `id`, …).

### `EpisodeViewer`

Opens one episode by number without downloading the rest of the shard. URLs need HTTP Range support (Hugging Face, S3, GCS and most CDNs have it); local files always work.

```tsx
const [n, setN] = useState(0)
<EpisodeViewer source={url} episode={n} onEpisodeChange={setN} />
```

| Prop | Type | Default | |
|---|---|---|---|
| `source` | `Source \| null` | | Shard to read from |
| `episode` / `defaultEpisode` / `onEpisodeChange` | `number` | `0` | Episode number, controlled or uncontrolled. The player's previous/next buttons call `onEpisodeChange`. |
| `specs`, `defaultFps`, `colorScheme`, `autoFocus`, `empty`, `playerProps`, `children` | | | Same as `ShardViewer` |

Use it for deep links like `/datasets/bridge/episode/40`: keep `n` in your router and pass it in.

## The player

A viewer is a data loader plus a `Player`. You can use the player directly with any `Episode`, from `useEpisode`, `useEpisodeStream` or `@videodb/robopeek-rlds`.

```tsx
import { Player } from '@videodb/robopeek-react'

<Player episode={episode} />
```

### Default layout

```
Player.Root
├─ Player.Stage          dark panel
│  ├─ Player.Instruction   language instruction for the current step
│  ├─ Player.Frames        one canvas per camera
│  ├─ Player.Transport     PrevEpisode · StepBack · Play · StepForward · NextEpisode · Scrubber · Counter
│  └─ Player.Options       FpsSelect · AutoNext · Flags
└─ Player.Tracks         one chart per vector track
   └─ Player.Metadata      episode metadata table
```

### Rearranging it

`Player.Root` holds the playback state. Put any parts inside it, in any order, and leave out what you don't want. Parts with children render only your children; without children they render their defaults.

```tsx
<Player.Root episode={episode} defaultFps={15}>
  <Player.Frames />
  <Player.Transport>
    <Player.Play />
    <Player.Scrubber />
    <Player.Counter />
  </Player.Transport>
  <Player.Tracks include={['action', 'observation/state']} />
</Player.Root>
```

Inside a viewer, pass the parts as children and the viewer's data flows into them:

```tsx
<ShardViewer source={url}>
  <Player.Stage />
  <MyMetadataCard />
</ShardViewer>
```

### `Player.Root` props

| Prop | Type | Default | |
|---|---|---|---|
| `episode` | `Episode` | | The episode to play. Changing it resets the step. |
| `step` / `defaultStep` / `onStepChange` | `number` | `0` | Current step |
| `playing` / `defaultPlaying` / `onPlayingChange` | `boolean` | `false` | Play state |
| `fps` / `defaultFps` / `onFpsChange` | `number` | `10` | Playback speed |
| `autoNext` / `defaultAutoNext` / `onAutoNextChange` | `boolean` | `false` | Continue into the next episode at the end |
| `onPrevEpisode` / `onNextEpisode` | `() => void` | | Episode navigation. Leave one out and its button is disabled. |
| `hotkeys` | `boolean \| RefObject` | `true` | Keyboard shortcuts while focus is inside the player, or inside the element you pass |
| `colorScheme` | `'light' \| 'dark'` | | Pin a scheme for this player |
| `children` | `ReactNode` | default layout | Your layout |

Every value can be **controlled** (`step` + `onStepChange`) or **uncontrolled** (`defaultStep`). Also accepts every `<div>` prop.

### Parts

| Part | Props beyond `className`, `ref` and native attributes | Renders |
|---|---|---|
| `Player.Stage` | `children` | Instruction, Frames, Transport, Options |
| `Player.Instruction` | `include` | The current step's text (empty strings are skipped) |
| `Player.Frames` | `include`, `renderItem(key, track, fallback)`, `renderEmpty()` | One canvas per camera |
| `Player.Transport` | `children` | The seven controls below |
| `Player.PrevEpisode`, `.StepBack`, `.Play`, `.StepForward`, `.NextEpisode` | button props, `children` (replaces the icon) | Transport buttons |
| `Player.Scrubber` | input props | A range slider over the steps |
| `Player.Counter` | span props | `step / length` |
| `Player.Options` | `children` | FpsSelect, AutoNext, Flags |
| `Player.FpsSelect` | `options` (default `[2, 5, 10, 15, 30, 60]`) | Speed picker |
| `Player.AutoNext` | `label` | "Continue to next episode" checkbox |
| `Player.Flags` | `keys` (default `is_first`, `is_last`, `is_terminal`) | Chips that light up on steps where the flag is set |
| `Player.Tracks` | `include`, `renderItem(key, track, fallback)`, `maxSeries` (32), `children` | One chart per vector track; children go in the same grid |
| `Player.Metadata` | `include`, `renderItem(key, feature, fallback)`, `title` | Episode-level values; hidden when there are none |

**`include`** filters by key: an array (`['action']`) or a function (`(key) => !key.includes('embedding')`).

**`renderItem`** receives the built-in element as `fallback`, so you can replace one item and keep the rest:

```tsx
<Player.Tracks renderItem={(key, track, fallback) => (key === 'action' ? <MyActionPlot track={track} /> : fallback)} />
```

## Reading player state: `usePlayer`

Any component inside `Player.Root` (or a viewer) can read and change playback state:

```tsx
import { usePlayer, vectorAt } from '@videodb/robopeek-react'

function RewardBadge() {
  const track = usePlayer((s) => s.episode.vectors.reward)
  const step = usePlayer((s) => s.step)
  if (!track) return null
  return <span>reward {vectorAt(track, step)[0].toFixed(2)}</span>
}
```

A component re-renders only when the value it selects changes. A component that reads `episode` but not `step` stays still during playback, so select single values, not new objects.

| Field | Type | |
|---|---|---|
| `episode` | `Episode` | The current episode |
| `length` | `number` | Steps in it |
| `step`, `setStep(n)` | | Current step (clamped to the episode) |
| `playing`, `toggle()`, `setPlaying(b)` | | Play state. `toggle()` at the last step restarts from 0. |
| `fps`, `setFps(n)` | | Playback speed |
| `autoNext`, `setAutoNext(b)` | | Continue into the next episode |
| `hasPrev`, `hasNext`, `prevEpisode()`, `nextEpisode()` | | Episode navigation |

## Part hooks: our behaviour, your markup

Every built-in control is a hook plus a little markup. Use the hook and render your own element, such as your design system's `<Button>`:

```tsx
import { usePlayButton } from '@videodb/robopeek-react'

function MyPlay() {
  const { playing, buttonProps } = usePlayButton()
  return <Button {...buttonProps}>{playing ? 'Pause' : 'Play'}</Button>
}

<Player.Transport>
  <Player.StepBack />
  <MyPlay />
  <Player.StepForward />
</Player.Transport>
```

| Hook | Returns |
|---|---|
| `usePlayButton()` | `{ playing, buttonProps }` |
| `useStepButton(delta)` | `{ buttonProps }`, moves `delta` steps (negative for back) |
| `useEpisodeButton('prev' \| 'next')` | `{ available, buttonProps }` (disabled when there's no handler) |
| `useScrubber()` | `{ step, max, inputProps }` for an `<input type="range">` |
| `useFpsSelect(options?)` | `{ fps, options, selectProps }` |
| `useAutoNext()` | `{ checked, inputProps }` for a checkbox |

The props include handlers, `aria-label` and `title` (with the keyboard shortcut), so accessibility comes with them.

## Data hooks

For when you want state without our components.

### `useEpisodeStream(opts?)`

Streams a shard into React state. Updates are batched to one render per animation frame.

```tsx
const { episodes, status, load, cancel, reset } = useEpisodeStream({ specs: 'auto' })

useEffect(() => { load(url) }, [url, load])
// status: { phase: 'idle' | 'loading' | 'done' | 'cancelled' | 'error', source?, loaded, total?, error? }
```

### `useEpisode(source, n, opts?)`

Fetches one episode by number. Keeps the shard's index between calls, so moving to nearby episodes is cheap.

```tsx
const { episode, status, known } = useEpisode(url, n)
// status: { phase: 'idle' } | { phase: 'loading', n, progress? } | { phase: 'ready', progress? } | { phase: 'error', error }
// known: { count, complete }: episodes found so far, and whether that's all of them
```

### `usePlayback(opts)`

The frame clock behind `Player.Root`. Use it to drive a player that's entirely your own.

```tsx
const { step, setStep, playing, setPlaying, toggle, fps, setFps } = usePlayback({
  length: episode.length,
  defaultFps: 10,
  resetKey: episode, // a new episode resets step and playing
  onEnd: () => console.log('finished'),
})
```

`step`, `playing` and `fps` each accept the controlled/uncontrolled trio (`step` / `defaultStep` / `onStepChange`, and so on).

### `usePlayerHotkeys(ref, controls, enabled?)`

Binds the [keyboard shortcuts](#keyboard) to one element, only while focus is inside it.

```tsx
const ref = useRef<HTMLDivElement>(null)
usePlayerHotkeys(ref, { toggle, setStep, step, length: episode.length })
return <div ref={ref} tabIndex={-1}>…</div>
```

## Building blocks

The components the viewers are made of, usable on their own:

| Component | Key props | |
|---|---|---|
| `EpisodeList` | `episodes`, `selected`, `onSelect`, `loading`, `renderTitle`, `renderItem(episode, fallback)`, `filterPlaceholder` | Searchable episode list |
| `LoadStatus` | `phase`, `source`, `loaded`, `total`, `error`, `children` | Progress strip |
| `FrameCanvas` | `name`, `track`, `step` | One camera. Decodes frames on demand and prefetches the next 8. Handles encoded and raw (depth) images. |
| `VectorChart` | `name`, `track`, `length`, `step`, `onSeek`, `maxSeries` | One track as a line chart. Click or drag to seek; click the legend to hide a series. |

## Recipes

### Show only some cameras and charts

```tsx
<ShardViewer source={url}>
  <Player.Stage>
    <Player.Frames include={['observation/image']} />
    <Player.Transport />
  </Player.Stage>
  <Player.Tracks include={(key) => !key.includes('embedding')} />
</ShardViewer>
```

### Your own episode card next to the player

```tsx
import { episodeTitle, formatFeature, usePlayer } from '@videodb/robopeek-react'

function EpisodeCard() {
  const episode = usePlayer((s) => s.episode)
  return (
    <aside>
      <h3>{episodeTitle(episode) ?? 'Untitled'}</h3>
      <p>{episode.length} steps · {Object.keys(episode.images).length} cameras</p>
      <dl>
        {Object.entries(episode.metadata).map(([key, value]) => (
          <div key={key}><dt>{key}</dt><dd>{formatFeature(value)}</dd></div>
        ))}
      </dl>
    </aside>
  )
}

<Player.Root episode={episode}>
  <Player.Stage />
  <EpisodeCard />
</Player.Root>
```

### Restyle the metadata table

```tsx
<Player.Metadata
  title="Episode info"
  include={(key) => key.startsWith('episode_metadata/')}
  renderItem={(key, feature) => <Row label={key.replace('episode_metadata/', '')} value={formatFeature(feature)} />}
/>
```

### Speed buttons instead of a dropdown

```tsx
function SpeedChips() {
  const fps = usePlayer((s) => s.fps)
  const setFps = usePlayer((s) => s.setFps)
  return [5, 10, 30].map((f) => (
    <button key={f} aria-pressed={fps === f} onClick={() => setFps(f)}>{f} fps</button>
  ))
}
```

### Play through the whole shard

```tsx
<ShardViewer source={url} playerProps={{ defaultAutoNext: true, defaultPlaying: true }} />
```

### Sync the episode with the URL

```tsx
const [params, setParams] = useSearchParams()
const n = Number(params.get('episode') ?? 0)

<EpisodeViewer source={url} episode={n} onEpisodeChange={(i) => setParams({ episode: String(i) })} />
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

Set them on `:root` for the whole app, on a class for one viewer (`<ShardViewer className="brand" />`), or inline (`style={{ '--rp-accent': 'teal' }}`).

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
.my-viewer .rp-options { display: none; }                          /* hide speed, auto-next and flags */
.my-viewer .rp-frame canvas { border-radius: 12px; }
.my-viewer .rp-player[data-playing] .rp-tracks { opacity: 0.5; }   /* dim charts while playing */
.my-viewer .rp-episodes { display: none; }                         /* hide ShardViewer's episode list */
```

Main classes: `rp-viewer`, `rp-shard-viewer`, `rp-episode-viewer`, `rp-status`, `rp-episodes`, `rp-player`, `rp-stage`, `rp-instruction`, `rp-frames`, `rp-frame`, `rp-transport`, `rp-transport-button`, `rp-play`, `rp-scrubber`, `rp-counter`, `rp-options`, `rp-fps`, `rp-autonext`, `rp-flags`, `rp-tracks`, `rp-chart`, `rp-metadata`.

State attributes: `data-playing` (player), `data-phase` (status), `data-on` (flag chips), `data-collapsed` (charts), `data-rp-scheme`.

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

Active while focus is inside the player (click it, or use `autoFocus`). Ignored while typing in an input.

| Key | Action |
|---|---|
| Space | Play / pause |
| ← / → | Previous / next step (Shift: 10 steps) |
| Home / End | First / last step |
| ↑ / ↓ | Previous / next episode |

## API index

| Export | |
|---|---|
| `ShardViewer`, `EpisodeViewer` | [Viewers](#viewers) |
| `Player` and `Player.*` parts | [The player](#the-player) |
| `usePlayer` | [Player state](#reading-player-state-useplayer) |
| `usePlayButton`, `useStepButton`, `useEpisodeButton`, `useScrubber`, `useFpsSelect`, `useAutoNext`, `FPS_OPTIONS`, `FLAG_KEYS` | [Part hooks](#part-hooks-our-behaviour-your-markup) |
| `useEpisodeStream`, `useEpisode`, `usePlayback`, `usePlayerHotkeys` | [Data hooks](#data-hooks) |
| `EpisodeList`, `LoadStatus`, `FrameCanvas`, `VectorChart` | [Building blocks](#building-blocks) |
| Props types for every component (`ShardViewerProps`, `PlayerRootProps`, `FramesProps`, …), `PlayerState`, `StreamStatus`, `EpisodeStatus`, `SpecsOption`, `ColorScheme`, `Include` | Types |
| Everything from `@videodb/robopeek-rlds` (`streamEpisodes`, `ShardIndex`, `vectorAt`, `episodeTitle`, `Episode`, …) | [Re-exported](https://www.npmjs.com/package/@videodb/robopeek-rlds) |

## Related

- [`@videodb/robopeek-rlds`](https://www.npmjs.com/package/@videodb/robopeek-rlds): the reader. Its README documents the `Episode` object, `streamEpisodes`, `ShardIndex` and feature specs in full.
- [RoboPeek on GitHub](https://github.com/video-db/RoboPeek): source, issues, and the roadmap (MCAP is next).
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
