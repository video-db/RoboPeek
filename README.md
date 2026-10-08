# rlds-viewer

> **[TODO: THIS IS A PLAN]** Everything below describes the target state. Today the repo is `packages/core` (unbuilt, unpublished) plus `apps/web` holding all UI. Nothing here is published to npm yet.

> **Stability:** 0.x until the dataset compatibility pass and `features.json` support (build steps 2 and 10) are done. Until 1.0, minor versions may break the API, including markup.

Read and play RLDS episodes (TFRecord shards) in the browser. No Python, no TensorFlow, no backend.

| Package | What it is | Published |
|---|---|---|
| `@rlds-viewer/core` | TFRecord → `tf.train.Example` → `Episode` decoder; streaming + single-episode random access | yes |
| `@rlds-viewer/react` | Hooks, components and drop-in viewers built on `core` | yes |
| `apps/web` | The demo site: full shard viewer + single-episode page | no |

## Quickstart

### Core only (any framework, or none)

```sh
pnpm add @rlds-viewer/core
```

```ts
import { streamEpisodes, ShardIndex, episodeTitle, vectorAt } from '@rlds-viewer/core'

const url = 'https://huggingface.co/datasets/…/train.tfrecord-00005-of-00128'

// Every episode, yielded while the shard downloads
for await (const ep of streamEpisodes(url, { onProgress: (p) => console.log(p.loaded, p.total) })) {
  console.log(ep.index, ep.length, episodeTitle(ep), Object.keys(ep.images))
}

// One episode, without downloading the rest (needs HTTP Range support)
const index = await ShardIndex.open(url)
const ep40 = await index.episode(40) // undefined if out of range
const action = vectorAt(ep40!.vectors['action'], 0) // Float32Array | Float64Array of length dim
```

`Episode` shape. Fixed before the React work starts, with slots for what `features.json` will add later, so that support doesn't break it:

```ts
type Episode = {
  index: number
  length: number                                  // steps
  byteSize: number
  images: Record<string, ImageTrack>
  vectors: Record<string, VectorTrack>
  text: Record<string, string[]>                  // per step, e.g. language_instruction
  metadata: Record<string, Feature>               // episode_metadata/* and leftovers, raw values
  features: Map<string, Feature>                  // every decoded key, lossless; the escape hatch
}

type ImageTrack =
  | { kind: 'encoded'; mime: 'image/png' | 'image/jpeg' | 'image/webp'; frames: Uint8Array[] }
  | { kind: 'raw'; shape: [h: number, w: number, c: number]; dtype: 'uint8' | 'uint16'; frames: Uint8Array[] } // needs features.json

type VectorTrack = {
  shape: number[]                                 // per-step shape; [dim] until features.json says otherwise
  dim: number                                     // product of shape
  data: Float32Array | Float64Array               // row-major [length × dim]; int64 converted (exact to 2^53)
}

type Feature =
  | { kind: 'bytes'; values: Uint8Array[] }
  | { kind: 'float'; values: Float32Array }
  | { kind: 'int64'; values: BigInt64Array }      // lossless
```

`images` / `text` / `metadata` share arrays with `features` (no copies); int64 `vectors` are a float64 copy. If the classification gets a key wrong for your dataset, read it from `features` yourself.

Reading metadata:

```ts
import { readText, readNumbers, formatFeature } from '@rlds-viewer/core'

readText(ep.metadata['episode_metadata/file_path'])     // string[] | undefined (undefined if not UTF-8)
readNumbers(ep.metadata['episode_metadata/episode_id']) // Float32Array | Float64Array | undefined (exact int64: feature.values)
formatFeature(ep.metadata['episode_metadata/file_path']) // display string, what Player.Metadata shows
```

### React: drop-in viewers

```sh
pnpm add @rlds-viewer/react   # brings core with it; core's API is re-exported
```

```tsx
import { ShardViewer, EpisodeViewer } from '@rlds-viewer/react'
import '@rlds-viewer/react/styles.css'

// Episode drawer + player, streams the whole shard
<ShardViewer source={url} defaultFps={10} />

// Single episode by number
<EpisodeViewer source={url} episode={40} onEpisodeChange={(n) => setParams({ episode: n })} />
```

### React: compose your own player

```tsx
import { Player, useEpisode } from '@rlds-viewer/react'

function MyPlayer({ url, n }: { url: string; n: number }) {
  const { episode, status } = useEpisode(url, n)
  if (!episode) return <p>{status.phase}</p>

  return (
    <Player.Root
      episode={episode}
      defaultFps={15}
      className="my-player"
      onPrevEpisode={n > 0 ? () => go(n - 1) : undefined}  // omitted → PrevEpisode renders disabled
      onNextEpisode={() => go(n + 1)}                       // also drives AutoNext at episode end
    >
      <Player.Frames renderEmpty={() => <p>No cameras</p>} />
      <Player.Transport />
      <Player.Scrubber />
      <Player.Tracks include={['action', 'observation/state']} />
    </Player.Root>
  )
}
```

`<Player episode={…} />` is just the default arrangement: `Instruction`, `Frames`, `Transport`, `Scrubber`, `Options`, `Flags`, `Tracks`, `Metadata`. The viewers wire the episode-navigation props for you.

### React: your own parts inside the player (e.g. metadata)

Any component inside `Player.Root` can read the live player state with `usePlayer(selector)`. It re-renders only when the selected value changes, so a component that doesn't read `step` stays still during playback:

```tsx
import { Player, usePlayer, readText, vectorAt } from '@rlds-viewer/react'

function EpisodeCard() {
  const episode = usePlayer((s) => s.episode) // no re-render per frame
  const step = usePlayer((s) => s.step)       // re-renders each step
  const path = readText(episode.metadata['episode_metadata/file_path'])?.[0]
  const reward = vectorAt(episode.vectors['reward'], step)[0]
  return <aside className="card">{path} · reward {reward}</aside>
}

<Player.Root episode={episode}>
  <EpisodeCard />
  <Player.Frames />
  <Player.Transport />
</Player.Root>
```

Or keep the built-in metadata panel and change how entries render:

```tsx
<Player.Metadata
  include={(key) => key.startsWith('episode_metadata/')}
  renderItem={(key, feature) => <MyRow label={key.split('/').pop()} value={formatFeature(feature)} />}
/>
```

Every `renderItem` gets the built-in element as its last argument, so overriding one key is one line:

```tsx
<Player.Tracks renderItem={(key, track, fallback) => (key === 'action' ? <MyActionPlot track={track} /> : fallback)} />
```

### React: swap one sub-part

`Player.Transport` with no children renders the default buttons. With children, it renders only what you pass:

```tsx
import { Player, usePlayButton } from '@rlds-viewer/react'

function MyPlay() {
  const { playing, buttonProps } = usePlayButton() // onClick, aria-label ("Play" / "Pause"), title
  return <MyFancyButton {...buttonProps}>{playing ? 'Pause' : 'Play'}</MyFancyButton>
}

<Player.Transport>
  <Player.PrevEpisode />
  <MyPlay />
  <Player.NextEpisode />
</Player.Transport>
```

Each built-in part is its hook plus thin markup (`useScrubber`, `usePlayButton`, `useStepButton`, `useFpsSelect`, …). Keep the logic and render any element you like.

### React: drop-in viewer, your player layout

Viewers render the default `<Player>` unless you pass children. Children go inside the viewer's `Player.Root`:

```tsx
<ShardViewer source={url}>
  <Player.Frames />
  <Player.Transport />
  <MyMetadataCard /> {/* uses usePlayer() */}
</ShardViewer>
```

Viewer source stays short enough to copy as a recipe; `apps/web/src/examples/` holds it.

### React: hooks only (bring your own UI)

```tsx
import { useEpisodeStream, usePlayback, usePlayerHotkeys } from '@rlds-viewer/react'

const { episodes, status, load, cancel } = useEpisodeStream()
const { step, setStep, playing, toggle } = usePlayback({ length: ep.length, defaultFps: 10 })
const ref = useRef<HTMLDivElement>(null)
usePlayerHotkeys(ref, { toggle, setStep, step, length: ep.length }) // active only while ref has focus
```

## API surface (`@rlds-viewer/react`)

| Layer | Export | Notes |
|---|---|---|
| Hooks | `useEpisodeStream()` | `{ episodes, status, load(src), cancel() }`; batches updates to one render per frame |
| | `useEpisode(src, n)` | `{ episode, status, known }`; wraps `ShardIndex`, caches the index per source |
| | `usePlayback(opts)` | Frame clock; `step` / `playing` / `fps` each controlled or uncontrolled |
| | `usePlayerHotkeys(ref, ctl)` | Space, ←/→ (Shift = 10), Home/End; scoped to `ref`, never `window` |
| Primitives | `EpisodeList` | Episode drawer with filter; `renderTitle`, `selected`, `onSelect` |
| | `SourceBar` | URL + file input; optional `episode` number field |
| | `LoadStatus` | Progress bar + counts + error |
| | `DropZone` | Drag-and-drop file target with overlay |
| | `FrameCanvas` | One image track; on-demand `ImageBitmap` decode + 8-frame lookahead |
| | `VectorChart` | One vector track; click/drag to seek, legend toggles dims |
| Player | `Player.Root` | Owns a small store (`useSyncExternalStore`, no dependency): episode, step, playing, fps, plus `onPrevEpisode` / `onNextEpisode` for the navigation parts |
| | `usePlayer(selector)` | Subscribe to one slice of `{ episode, step, setStep, playing, toggle, fps, setFps, hasPrev, hasNext, prevEpisode, nextEpisode }`; re-renders only when that slice changes |
| | `Player.Instruction` `.Frames` `.Transport` `.Scrubber` `.Options` `.Flags` `.Tracks` `.Metadata` | Each reads `Player.Root` context; place, omit or reorder freely. List-shaped parts take `include` + `renderItem(…, fallback)` |
| | `Player.PrevEpisode` `.StepBack` `.Play` `.StepForward` `.NextEpisode` | Sub-parts of `Transport`; `Player.FpsSelect` `.AutoNext` are sub-parts of `Options` |
| | `usePlayButton` `useStepButton` `useEpisodeButton` `useScrubber` `useFpsSelect` | Per-part hooks: state + spreadable props (handlers, aria) for your own element; built on `usePlayer(selector)` |
| | `Player` | Default composition of the parts |
| Viewers | `ShardViewer` | Source bar + status + drawer + player; children replace the default player layout |
| | `EpisodeViewer` | Source bar w/ episode field + status + player; same children rule |
| Types | `PlayerFramesProps`, `EpisodeListProps`, … | Props type exported for every component |

## Design rules

| Rule | Applied as |
|---|---|
| Layered, each layer usable alone | core → hooks → primitives → `Player` parts → viewers |
| Composition over configuration | Compound `Player.*` parts over a growing prop list |
| Controlled or uncontrolled | `value` + `onChange` or `defaultValue` for step, playing, fps, selected episode |
| No global side effects | No `window` listeners, no `history` writes; deep links belong to the app |
| Overridable styling | Optional CSS in `@layer rlds`; `rlds-*` classes; `data-*` state attributes; `--rlds-*` tokens; no `!important` anywhere |
| Cheap re-renders | Player state in a store read through selectors; only frame/step-bound parts re-render per frame |
| Accessible controls | Play is one button whose label switches Play ↔ Pause (no `aria-pressed`); scrubber is a native range input; every control keyboard-reachable |
| One install | `react` depends on `core` and re-exports its whole public API (`export * from '@rlds-viewer/core'`); one import source, one version |
| Wrappable | Every part, not just roots: `className`, `ref`, rest props; exported props types |
| Splittable, not just swappable | Composite parts take children; every built-in part = hook + thin markup |
| Slots where content varies | `renderTitle`, `renderEmpty`, `include` filters; `renderItem` receives the default as `fallback` |
| No guessed data | fps is a prop (`defaultFps`, default 10); RLDS has no standard rate field |

## Customising the design

Six levels, each going further than the last. Use the first one that's enough.

| Level | You do | Example |
|---|---|---|
| 1. Tokens | Override `--rlds-*` variables | Brand colour, fonts, chart palette |
| 2. CSS | Target `rlds-*` classes and `data-*` state | Hide the fps picker, restyle the transport |
| 3. Unstyled | Import only `structure.css` (or nothing); style the stable markup with your own CSS or Tailwind (`className` on every part) | Full visual control, same behaviour |
| 4. Recompose | Build from `Player.*` parts and sub-parts + `usePlayer()`; drop, reorder, add your own; `renderItem` with `fallback` | Custom layout, metadata card, one custom chart |
| 5. Part hooks | Keep a part's logic via its hook (`useScrubber`, `usePlayButton`, …), render your own element | Your design-system button driving our playback |
| 6. Headless | Hooks only (`useEpisodeStream`, `useEpisode`, `usePlayback`) + `FrameCanvas` / `VectorChart` if wanted | Your own design system end to end |

Levels 1–3 never require forking a component. Markup (class names, `data-*` attributes, part structure) is treated as public API and versioned with changesets.

### Stylesheets

| File | Contains | Use when |
|---|---|---|
| `styles.css` | `structure.css` + `theme.css` | Default |
| `structure.css` | Layout only: grids, sizing, canvas aspect, scrubber track | Your own look on our layout (level 3) |
| `theme.css` | Colours, borders, radii, type, all via `--rlds-*` | Rarely alone; paired with structure |

All three sit in `@layer rlds`. Token defaults are declared on `:root` (inside the layer), never on component classes, so a host value on `:root` or any ancestor reaches every part.

### CSS layer order (Tailwind and other layered CSS)

Unlayered host CSS always beats `@layer rlds`. Layered CSS doesn't: the layer declared last wins. Tailwind v4 puts utilities in `@layer utilities`, so if our CSS loads after Tailwind, `rlds` overrides your utility classes. In layered setups, import our CSS from CSS, not JS, so bundler order can't move it, and declare the order first:

```css
/* app.css */
@layer theme, base, rlds, components, utilities;
@import 'tailwindcss';
@import '@rlds-viewer/react/styles.css' layer(rlds);
```

Without layered CSS of your own, `import '@rlds-viewer/react/styles.css'` from JS is fine.

### Theming

```css
/* Unlayered host CSS; see layer order above if yours is layered */
:root {
  --rlds-accent: #4f46e5;
  --rlds-stage: #000;
  --rlds-font-sans: 'Inter', system-ui, sans-serif;
  --rlds-series-0: #e11d48; /* …--rlds-series-7 for chart lines */
}
.rlds-player[data-playing] .rlds-transport { opacity: 0.6; }
```

Light/dark: follows `prefers-color-scheme` by default. Pin it with `colorScheme="light" | "dark" | "system"` on `Player.Root` and the viewers (sets `data-rlds-scheme`), or override the tokens under your own dark selector. A pinned scheme redefines tokens on that element, so theme a pinned subtree via `[data-rlds-scheme='dark'] { --rlds-… }`.

The library ships no fonts. Set `--rlds-font-sans` / `--rlds-font-mono` to fonts your app already loads.

## Dataset compatibility

RLDS fixes the episode structure; each dataset picks its own keys. TFDS writes each episode as one `tf.train.Example` with flattened keys (`steps/observation/<cam>`, `steps/action`, `episode_metadata/<field>`). `core` reads that structure generically and walks whatever keys exist. Nothing is keyed to one dataset.

| Assumption | Where | Generic? |
|---|---|---|
| Per-step keys start with `steps/` | `toEpisode` | RLDS/TFDS standard |
| Step count from `is_first`/`is_last`/`is_terminal`/`reward`/`discount` | `stepCount` | RLDS standard fields; falls back to any per-step bytes key |
| Images = PNG/JPEG/WebP by magic bytes | `sniffImage` | Any key name |
| Title = first text key containing `instruction` | `episodeTitle` | Heuristic only; override with `EpisodeList renderTitle` |

What a TFRecord does not carry. It lives in TFDS's `features.json` / `dataset_info.json` next to the shards:

| Missing in the shard | Effect today | Plan |
|---|---|---|
| Tensor shapes | Multi-dim per-step tensors flatten to `dim = total / length` | Optional `features.json` input restores shapes |
| Exact dtypes | Only float / int64 / bytes on the wire; bool → int64. `features` keeps int64 lossless; `vectors` convert to float64 (exact to 2^53) | Shapes + dtypes from `features.json` |
| Raw (unencoded) image tensors | Bytes that aren't PNG/JPEG/WebP land in `metadata` as binary | `features.json` marks them; render from shape |
| Control rate / fps | Not recorded; player uses `defaultFps` | Per-step timestamps if present, else caller sets it |

Other known limits: GZIP-compressed TFRecords aren't decompressed; record CRCs aren't verified; 16-bit depth PNGs render at 8 bits in canvas.

Verified so far: CognitiveDrone only. Build step 2 runs a compatibility pass across several public RLDS datasets, before the `Episode` type is fixed.

## Package config

```jsonc
// packages/react/package.json (shape)
{
  "name": "@rlds-viewer/react",
  "type": "module",
  "sideEffects": ["*.css"],
  "exports": {
    ".": { "rlds-source": "./src/index.ts", "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./styles.css": "./dist/styles.css",
    "./structure.css": "./dist/structure.css",
    "./theme.css": "./dist/theme.css"
  },
  "files": ["dist"],
  "license": "TBD",
  "peerDependencies": { "react": "^19", "react-dom": "^19" },
  "dependencies": { "@rlds-viewer/core": "workspace:^" }
}
```

- ESM only, built with `tsdown`; `"use client"` banner on the react build.
- Custom `rlds-source` condition lets `apps/web` run on source with no build step: set in its `vite.config.ts` (`resolve.conditions`) and `tsconfig` (`customConditions`). Not `development`: consumers' dev servers resolve that condition too and would look for unpublished `src/`.
- `core` gets the same `exports` shape (no CSS).

## Repo layout

```
packages/
  core/      src/{tfrecord,example,episode,random,index}.ts, test/
  react/     src/hooks/, src/components/, src/player/, src/viewers/, src/styles.css
apps/
  web/       index.html → <ShardViewer>, episode.html → <EpisodeViewer>; branding, welcome, URL sync
```

## Development

```sh
pnpm i
pnpm dev          # apps/web on source, HMR
pnpm build        # tsdown for packages, vite for web
pnpm typecheck
pnpm test         # node --test in core, vitest browser mode in react
pnpm check:pkg    # publint + attw on built packages
pnpm changeset    # record a version bump
```

## Build plan

| # | Step | Done when |
|---|---|---|
| 0 | Baseline commit of current state | Restructure reviewable as a diff |
| 1 | Root tooling: one TypeScript, `tsdown`, `publint`, `@arethetypeswrong/cli`, `vitest` + `@vitest/browser` via `pnpm add` | `pnpm typecheck` green |
| 2 | Compatibility pass on today's app: one shard each from several public RLDS datasets (different robots, cameras, metadata) | Each loads or its gap is listed in this README; findings fed into step 3 |
| 3 | `core`: fix the `Episode` type above (`shape`, `ImageTrack` union, lossless int64 `features`, raw `metadata`, `readText` / `readNumbers` / `formatFeature`); emit `dist/` (`.ts` → `.js` imports, `rlds-source` condition) | `core` builds; tests pass; publint/attw clean |
| 4 | Create `packages/react`; move hooks + components; extract `useEpisode` from `EpisodeApp` | Builds, no behaviour change |
| 5 | Player store + `usePlayer(selector)`; parts + sub-parts, each = per-part hook + markup; nav props on `Player.Root`; `include` / `renderItem(…, fallback)`; `className` / `ref` / rest + exported props types on every part; controlled/uncontrolled props; scoped hotkeys; `ShardViewer` / `EpisodeViewer` with children. Vitest browser-mode tests: controlled vs uncontrolled, hotkey scoping, per-part hooks, `renderItem` fallback, selector re-render counts | Default `<Player>` matches today; acceptance examples compile and run; tests green |
| 6 | Component CSS → `structure.css` + `theme.css` (`@layer rlds`, tokens on `:root`, `rlds-*`, `data-rlds-scheme`, no `!important`); app shell CSS stays in web | No visual diff |
| 7 | `apps/web` consumes only the packages | Both pages look and behave as before in Chrome (side-by-side check, hotkeys included) |
| 8 | `changesets` configured; `LICENSE` added | No publish until npm scope, visibility and license are decided |
| 9 | First 0.x publish | Install in a scratch Vite app works in dev and build (catches export-condition mistakes) |
| 10 | Optional `features.json` input in `core` (shapes, dtypes, raw image tensors) | Datasets from step 2 that flattened or hid tracks render correctly; then consider 1.0 |

### Customisation acceptance examples

One file each in `apps/web/src/examples/`, typechecked in CI so they can't rot. Done when each is ≤ ~15 lines with no workaround.

| Scenario | Example |
|---|---|
| Use mine | `<ShardViewer source={url} />` |
| Tweak mine | Tokens + one CSS override, Tailwind layer order set |
| Swap one part | Custom play button via `usePlayButton` inside `Player.Transport` |
| Mine inside yours | `Player.Frames` + `Player.Scrubber` placed in the host's own layout |
| Yours inside mine | `MyMetadataCard` via `usePlayer()` as `ShardViewer` children; one custom chart via `renderItem` fallback |

**Open:** npm scope (`@rlds-viewer` org vs an existing one); public repo or not; license (MIT suggested: permissive and matches the React ecosystem).

**Deferred:** `asChild` / `render` prop (per-part hooks cover "your element, our behaviour"; add if users ask), Vue/Web Component wrappers, Web Worker decoding, Storybook, i18n labels, fps derived from per-step timestamps.
