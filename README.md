# rlds-viewer

> **Status:** built and verified locally, **not published**. Open before the first publish: npm scope, repo visibility, license, `changeset init` (see [Build plan](#build-plan)).
>
> **Stability:** 0.x. Until 1.0, minor versions may break the API, including markup.

Read and play RLDS episodes (TFRecord shards) in the browser. No Python, no TensorFlow, no backend.

| Package | What it is | Published |
|---|---|---|
| `@rlds-viewer/core` | TFRecord → `tf.train.Example` → `Episode` decoder; streaming, single-episode random access, `features.json` specs | yes (pending) |
| `@rlds-viewer/react` | Hooks, components and drop-in viewers built on `core`; re-exports all of `core` | yes (pending) |
| `apps/web` | Demo site: full shard viewer (`index.html`) + single-episode page (`episode.html`) | no |

## Quickstart

### Core only (any framework, or none)

```sh
pnpm add @rlds-viewer/core
```

```ts
import { streamEpisodes, ShardIndex, loadFeatureSpecs, episodeTitle, vectorAt } from '@rlds-viewer/core'

const url = 'https://huggingface.co/datasets/…/train.tfrecord-00005-of-00128'
const specs = await loadFeatureSpecs(url) // sibling features.json, or undefined

// Every episode, yielded while the shard downloads
for await (const ep of streamEpisodes(url, { specs, onProgress: (p) => console.log(p.loaded, p.total) })) {
  console.log(ep.index, ep.length, episodeTitle(ep), Object.keys(ep.images))
}

// One episode, without downloading the rest (needs HTTP Range support)
const index = await ShardIndex.open(url, { specs })
const ep40 = await index.episode(40) // undefined if out of range
const action = vectorAt(ep40!.vectors['action'], 0) // Float32Array | Float64Array of length dim
```

`Episode` shape:

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
  | { kind: 'raw'; shape: [h: number, w: number, c: number]; data: Float32Array | Float64Array } // numeric tensors, e.g. float depth; needs specs

type VectorTrack = {
  shape: number[]                                 // per-step shape; [dim] without specs, [] for scalars with
  dim: number                                     // product of shape
  data: Float32Array | Float64Array               // row-major [length × dim]; int64 converted (exact to 2^53)
}

type Feature =
  | { kind: 'bytes'; values: Uint8Array[] }
  | { kind: 'float'; values: Float32Array }
  | { kind: 'int64'; values: BigInt64Array }      // lossless
```

`images` / `text` / `metadata` share arrays with `features` (no copies); int64 `vectors` are a float64 copy. If the classification gets a key wrong for your dataset, read it from `features`.

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
import '@rlds-viewer/react/styles.css' // or from CSS, see "CSS layer order"

// Episode drawer + player, streams the whole shard
<ShardViewer defaultSource={url} defaultFps={10} autoFocus />

// Single episode by number, controlled
<EpisodeViewer source={url} onSourceChange={setUrl} episode={n} onEpisodeChange={setN} />
```

Both viewers: `source` / `defaultSource` / `onSourceChange`, `specs` (`'auto'` default: reads the `features.json` next to a URL shard), `defaultFps`, `colorScheme`, `autoFocus`, `empty` (shown before a source is opened), `renderHeader(bar, state)` (wrap or replace the source bar), `playerProps` (passed to `Player.Root`), `children` (your player layout). `ShardViewer` adds `selected` / `defaultSelected` / `onSelectedChange` and `renderTitle`; `EpisodeViewer` adds `episode` / `defaultEpisode` / `onEpisodeChange`.

### React: compose your own player

```tsx
import { Player, useEpisode } from '@rlds-viewer/react'

function MyPlayer({ url, n, go }: { url: string; n: number; go: (n: number) => void }) {
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
      <Player.Tracks include={['action', 'observation/state']} />
    </Player.Root>
  )
}
```

`<Player episode={…} />` (or `Player.Root` with no children) renders the default arrangement:

```
Root
├─ Stage ─ Instruction, Frames, Transport, Options
└─ Tracks ─ (charts), Metadata
Transport ─ PrevEpisode, StepBack, Play, StepForward, NextEpisode, Scrubber, Counter
Options   ─ FpsSelect, AutoNext, Flags
```

Every composite part (`Stage`, `Transport`, `Options`) renders its defaults with no children and only your children otherwise. `Tracks` renders its charts, then its children in the same grid.

### React: your own parts inside the player (e.g. metadata)

Any component inside `Player.Root` reads live state with `usePlayer(selector)`. It re-renders only when the selected value changes, so a component that doesn't read `step` stays still during playback:

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

Select primitives or stable references (`episode`, actions), not freshly built objects.

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

```tsx
import { Player, usePlayButton } from '@rlds-viewer/react'

function MyPlay() {
  const { playing, buttonProps } = usePlayButton() // type, onClick, aria-label ("Play" / "Pause"), title
  return <MyFancyButton {...buttonProps}>{playing ? 'Pause' : 'Play'}</MyFancyButton>
}

<Player.Transport>
  <Player.PrevEpisode />
  <MyPlay />
  <Player.NextEpisode />
</Player.Transport>
```

Each built-in part is its hook plus thin markup (`usePlayButton`, `useStepButton`, `useEpisodeButton`, `useScrubber`, `useFpsSelect`, `useAutoNext`). Keep the logic and render any element you like.

### React: drop-in viewer, your player layout

```tsx
<ShardViewer defaultSource={url}>
  <Player.Stage />
  <MyMetadataCard /> {/* uses usePlayer() */}
</ShardViewer>
```

Children go inside the viewer's `Player.Root`. Viewer source (`packages/react/src/viewers/`) is short enough to copy as a recipe.

### React: hooks only (bring your own UI)

```tsx
import { useEpisodeStream, usePlayback, usePlayerHotkeys } from '@rlds-viewer/react'

const { episodes, status, load, cancel, reset } = useEpisodeStream({ specs: 'auto' })
const { step, setStep, playing, toggle, fps, setFps } = usePlayback({ length: ep.length, defaultFps: 10, resetKey: ep })
const ref = useRef<HTMLDivElement>(null)
usePlayerHotkeys(ref, { toggle, setStep, step, length: ep.length }) // active only while focus is inside ref
```

## API surface (`@rlds-viewer/react`)

| Layer | Export | Notes |
|---|---|---|
| Hooks | `useEpisodeStream(opts?)` | `{ episodes, status, load(src), cancel(), reset() }`; batches updates to one render per frame |
| | `useEpisode(src, n, opts?)` | `{ episode, status, known }`; wraps `ShardIndex`, keeps the index per source |
| | `usePlayback(opts)` | Frame clock; `step` / `playing` / `fps` each controlled or uncontrolled; `resetKey` resets on episode change |
| | `usePlayerHotkeys(ref, ctl, enabled?)` | Space, ←/→ (Shift = 10), Home/End, ↑/↓ episodes; scoped to `ref`, never `window` |
| Primitives | `EpisodeList` | Episode drawer with filter; `selected`, `onSelect`, `renderTitle`, `renderItem(ep, fallback)` |
| | `SourceBar` | URL + file input; `episode` shows a number field |
| | `LoadStatus` | Progress strip; children add counts |
| | `DropZone` | Drop target with overlay; `onFile` |
| | `FrameCanvas` | One image track (encoded or raw); on-demand `ImageBitmap` decode + 8-frame lookahead |
| | `VectorChart` | One vector track; click/drag to seek, legend toggles dims; `maxSeries` (32) collapses wider tracks |
| Player | `Player.Root` | Owns a small store (`useSyncExternalStore`, no dependency): episode, step, playing, fps, autoNext, plus `onPrevEpisode` / `onNextEpisode`; `hotkeys` (true / false / a ref), `colorScheme` |
| | `usePlayer(selector?)` | Subscribe to a slice of `{ episode, length, step, setStep, playing, toggle, setPlaying, fps, setFps, autoNext, setAutoNext, hasPrev, hasNext, prevEpisode, nextEpisode }` |
| | `Player.Stage` `.Instruction` `.Frames` `.Transport` `.Options` `.Flags` `.Tracks` `.Metadata` | Each reads `Player.Root` context; place, omit or reorder freely. `Frames` / `Tracks` / `Metadata` take `include` + `renderItem(…, fallback)` |
| | `Player.PrevEpisode` `.StepBack` `.Play` `.StepForward` `.NextEpisode` `.Scrubber` `.Counter` | Sub-parts of `Transport` |
| | `Player.FpsSelect` `.AutoNext` `.Flags` | Sub-parts of `Options` |
| | `usePlayButton` `useStepButton(delta)` `useEpisodeButton(dir)` `useScrubber` `useFpsSelect(options?)` `useAutoNext` | Per-part hooks: state + spreadable props (handlers, aria) |
| | `Player` | Default composition of the parts |
| Viewers | `ShardViewer` | Source bar + status + drawer + player |
| | `EpisodeViewer` | Source bar with episode field + status + player |
| Types | `PlayerRootProps`, `FramesProps`, `EpisodeListProps`, `ShardViewerProps`, … | Props type exported for every component |
| Core | everything from `@rlds-viewer/core` | Re-exported |

## Design rules

| Rule | Applied as |
|---|---|
| Layered, each layer usable alone | core → hooks → primitives → `Player` parts → viewers |
| Composition over configuration | Compound `Player.*` parts over a growing prop list |
| Splittable, not just swappable | Composite parts take children; every built-in part = hook + thin markup |
| Controlled or uncontrolled | `value` + `onChange` or `defaultValue` for source, episode, selected, step, playing, fps, autoNext |
| No global side effects | No `window` listeners, no `history` writes; deep links belong to the app |
| Cheap re-renders | Player state in a store read through selectors; only frame/step-bound parts re-render per frame |
| One install | `react` depends on `core` and re-exports its whole public API |
| Wrappable | Every part: `className`, `ref`, rest props; exported props types |
| Slots where content varies | `renderTitle`, `renderEmpty`, `renderHeader`, `include`; `renderItem` receives the default as `fallback` |
| Overridable styling | CSS in `@layer rlds`; `rlds-*` classes; `data-*` state; `--rlds-*` tokens on `:root`; no `!important` |
| Accessible controls | Play is one button whose label switches Play ↔ Pause (no `aria-pressed`); scrubber is a native range input |
| No guessed data | fps is a display choice (`defaultFps`, 10); RLDS records no rate |

## Customising the design

Use the first level that's enough.

| Level | You do | Example |
|---|---|---|
| 1. Tokens | Override `--rlds-*` variables | Brand colour, fonts, chart palette |
| 2. CSS | Target `rlds-*` classes and `data-*` state | Hide the fps picker, restyle the transport |
| 3. Unstyled | Import only `structure.css` (or nothing); style the markup yourself (`className` on every part) | Full visual control, same behaviour |
| 4. Recompose | `Player.*` parts and sub-parts + `usePlayer()`; `renderItem` with `fallback` | Custom layout, metadata card, one custom chart |
| 5. Part hooks | Keep a part's logic via its hook, render your own element | Your design-system button driving our playback |
| 6. Headless | Hooks only + `FrameCanvas` / `VectorChart` if wanted | Your own design system end to end |

Markup (class names, `data-*` attributes, part structure) is public API, versioned with changesets. Working examples of each scenario: `apps/web/src/examples/`.

### Stylesheets

| File | Contains | Use when |
|---|---|---|
| `styles.css` | `structure.css` + `theme.css`, concatenated | Default |
| `structure.css` | Layout only: grids, sizing, spacing | Your own look on our layout (level 3) |
| `theme.css` | Colours, borders, radii, type, all via `--rlds-*` | Paired with structure |

All sit in `@layer rlds`. Token defaults are on `:root` (inside the layer), never on component classes, so a host value on `:root` or any ancestor reaches every part.

### CSS layer order (Tailwind and other layered CSS)

Unlayered host CSS always beats `@layer rlds`. Layered CSS doesn't: the layer declared last wins. Tailwind v4 puts utilities in `@layer utilities`, so if our CSS loads after Tailwind, `rlds` overrides your utility classes. In layered setups, import our CSS from CSS and declare the order first:

```css
/* app.css */
@layer theme, base, rlds, components, utilities;
@import 'tailwindcss';
@import '@rlds-viewer/react/styles.css' layer(rlds);
```

Verified with Tailwind v4.3 in dev and production builds: `className="bg-blue-900"` on `Player.Stage` overrides the stage background. Without layered CSS of your own, `import '@rlds-viewer/react/styles.css'` from JS is fine.

### Theming

```css
:root {
  --rlds-accent: #4f46e5;
  --rlds-stage: #000;
  --rlds-font-sans: 'Geist', system-ui, sans-serif;
  --rlds-series-0: #e11d48; /* …--rlds-series-7 for chart lines */
}
.rlds-player[data-playing] .rlds-options { opacity: 0.6; }
```

Defaults follow the **VideoDB Design System v2**: each token maps to a DS usage token, named in a comment in `theme.css`.

| Token | DS usage token | Value |
|---|---|---|
| `--rlds-panel` | Background/Neutral/Primary (cards, inputs, secondary buttons) | `#FFFFFF` |
| `--rlds-sidebar` | Background/Neutral/Secondary (episodes drawer) | `#EFEFEF` |
| `--rlds-sunken` | Greyscale/50 (chart wells, status strip) | `#F7F7F7` |
| `--rlds-ink` / `-ink-secondary` / `-muted` / `-disabled` | Text/Neutral/Primary · Secondary · Tertiary · Disabled | `#1D1A22` `#404040` `#525252` `#A3A3A3` |
| `--rlds-icon` | Icon/Neutral/Primary | `#262626` |
| `--rlds-line` / `-line-hover` | Border/Neutral/Primary · Greyscale/300 | `#EFEFEF` `#D4D4D4` |
| `--rlds-accent` / `-accent-hover` / `-accent-ink` | Background/Brand/Primary · Orange/700 · Text/Brand/Inverse | `#EC5B16` `#C14103` `#FFF5EC` |
| `--rlds-accent-soft` / `-progress` | Background/Brand/Tertiary (selected row) · Orange/100 | `#FFF5EC` `#FFE9D3` |
| `--rlds-danger` | Text/Semantic/Error/Primary | `#B31D1D` |
| `--rlds-series-0…7` | Blue, Orange, Green, Red, Yellow 500/600; Blue 300, Green 300, Greyscale 500 | |
| `--rlds-stage*` | "Dark video overlay" recipe: Neutral Inverse surfaces/text/border; Play and scrubber use Brand | `#262626` … |
| `--rlds-frame-bg` | Background/Neutral Inverse/Primary | `#000000` |
| `--rlds-radius` / `-radius-card` | Chip/label/control · card | `8px` `16px` |
| `--rlds-font-sans` / `-font-mono` | Inter for all product UI (mono = sans; numbers use tabular figures) | |

Recipes applied: Primary CTA (Stream / Show / Play), Secondary button, Selected row (drawer), Disabled (empty-source submit), Dark video overlay (stage), card border `1px #EFEFEF`.

Light is the default, as the DS defines. `colorScheme="dark"` on `Player.Root` or a viewer opts into a dark variant built from the Neutral Inverse tokens (sets `data-rlds-scheme`; `"light"` pins light inside a dark ancestor). Pinned schemes redefine tokens on that element, so theme a pinned subtree via `[data-rlds-scheme='dark'] { --rlds-… }`. Tokens are plain values, not `light-dark()`: Tailwind v4's Lightning CSS polyfills `light-dark()` into values that are invalid on `:root` (verified: transparent backgrounds).

The library ships no fonts; load Inter yourself (the demo uses Google Fonts).

## Dataset compatibility

RLDS fixes the episode structure; each dataset picks its own keys. TFDS writes each episode as one `tf.train.Example` with flattened keys (`steps/observation/<cam>`, `steps/action`, `episode_metadata/<field>`). `core` walks whatever keys exist; nothing is keyed to one dataset.

| Assumption | Where | Generic? |
|---|---|---|
| Per-step keys start with `steps/` | `toEpisode` | RLDS/TFDS standard |
| Step count from `is_first`/`is_last`/`is_terminal`/`reward`/`discount` | `stepCount` | RLDS standard fields; falls back to any per-step bytes key |
| Images = PNG/JPEG/WebP by magic bytes | `sniffImage` | Any key name |
| Numeric images = spec'd rank-2/3 tensors ≥ 32×32 | `toEpisode` | Needs `features.json`; smaller matrices stay vectors |
| Title = first non-empty `natural_language_instruction`, then `language_instruction`, then any `*instruction*`, then any text | `episodeTitle` | Heuristic; override with `renderTitle` |

### Tested datasets

Episode 0 of one shard each, via `node packages/core/scripts/inspect.ts <url>` (uses the sibling `features.json`):

| Dataset | Loads | Notes |
|---|---|---|
| CognitiveDrone (HF) | ✓ | Reference dataset |
| fractal20220817_data (RT-1) | ✓ | 2×3 / 3×3 pose matrices stay vectors with specs |
| bridge | ✓ | |
| taco_play | ✓ | Float depth `[150,200]` / `[84,84]` render as images with specs (flattened 30 000-d vectors without) |
| berkeley_autolab_ur5 | ✓ | |
| language_table | ✓ | Instruction is `int32[512]` character codes, not text; shows as a vector, no title |
| austin_buds | ✓ | |
| nyu_door_opening | ✓ | |
| stanford_hydra | ✓ | |
| droid | ✓ | Instruction strings are empty in this shard; title falls back to "Untitled" |

512-d language embeddings appear in most datasets; charts wider than 32 dims start collapsed.

Not carried by the shard (lives in TFDS `features.json` / `dataset_info.json`): tensor shapes and exact dtypes (restored when specs load), control rate / fps (never recorded; `defaultFps`).

Other known limits: GZIP-compressed TFRecords aren't decompressed; record CRCs aren't verified; 16-bit depth PNGs render at 8 bits in canvas; raw *bytes* image tensors (uint8 serialized as bytes) aren't decoded (none seen in the tested set). The public OXE bucket (`storage.googleapis.com/gresearch`) sends no CORS headers, so browsers can't fetch it directly; Node can.

## Package config

Generated by tsdown (`exports` option): the repo-only `rlds-source` condition points at `src/`, and `publishConfig.exports` drops it on publish.

```jsonc
// packages/react/package.json (as packed)
{
  "name": "@rlds-viewer/react",
  "type": "module",
  "sideEffects": ["*.css"],
  "exports": {
    ".": "./dist/index.js",
    "./package.json": "./package.json",
    "./styles.css": "./dist/styles.css",
    "./structure.css": "./dist/structure.css",
    "./theme.css": "./dist/theme.css"
  },
  "files": ["dist"],
  "peerDependencies": { "react": "^19", "react-dom": "^19" },
  "dependencies": { "@rlds-viewer/core": "^0.1.0" }
}
```

- ESM only, built with `tsdown`; `'use client'` banner on the react build; core stays external.
- Not `development` as the source condition: consumers' dev servers resolve that too and would look for unpublished `src/`.
- Vite's CSS `@import` ignores `resolve.conditions`, so `apps/web` aliases `@rlds-viewer/react/styles.css` to source in `vite.config.ts`.
- Both packages are `"private": true` until the publish decisions are made.

## Repo layout

```
packages/
  core/      src/{tfrecord,example,episode,spec,random,index}.ts, test/, scripts/inspect.ts
  react/     src/hooks/, src/components/, src/player/, src/viewers/, src/styles/, test/
apps/
  web/       index.html → <ShardViewer>, episode.html → <EpisodeViewer>; branding, welcome, URL sync; src/examples/
```

## Development

```sh
pnpm i
pnpm dev          # apps/web on source, HMR (no package build needed)
pnpm build        # tsdown for packages, vite for web
pnpm typecheck
pnpm test         # node --test in core; vitest browser mode (Playwright Chromium) in react
pnpm check:pkg    # publint + attw on built packages
```

Core's shard tests need a file or URL: `RLDS_SHARD=/path/x.tfrecord RLDS_URL=https://… pnpm --filter @rlds-viewer/core test`. React tests need `npx playwright install chromium` once.

## Build plan

| # | Step | Status |
|---|---|---|
| 0 | Baseline commit | ✓ |
| 1 | Root tooling: one TypeScript (6.0), tsdown, publint, attw, vitest browser mode | ✓ |
| 2 | Compatibility pass (10 datasets above) | ✓ |
| 3 | `core`: `Episode` type (shape, `ImageTrack` union, lossless int64, raw metadata, `features`), `features.json` specs, title fix; builds to `dist/` | ✓ 8 tests |
| 4 | `packages/react`: hooks + components moved, `useEpisode` extracted | ✓ |
| 5 | Player store + selectors, parts + sub-parts + per-part hooks, nav props, slots, scoped hotkeys, viewers with children; browser tests | ✓ 9 tests |
| 6 | `structure.css` + `theme.css` in `@layer rlds` | ✓ |
| 7 | `apps/web` on the packages only | ✓ computed-style diff vs baseline (light + dark, both pages, after hotkeys) |
| 8 | changesets + `LICENSE` | **Open:** run `pnpm exec changeset init` (interactive); pick a license |
| 9 | Packed tarballs installed in a scratch Vite + Tailwind app | ✓ dev + build; first real publish waits on scope / visibility / license |
| 10 | `features.json` support | ✓ (pulled forward; done with step 3) |

Behaviour differences from the baseline app, all intentional:

- The source bar keeps the opened URL instead of clearing.
- Chart and metadata cards pin content to the top. Before, a short card in a row with a tall one spread its plot and legend apart.
- The fps select is labelled by `aria-label` instead of a wrapping `<label>`.
- Empty instruction strings aren't rendered.
- Wide tracks (> 32 dims) start collapsed.
- Restyled to the VideoDB Design System v2 (orange brand, Inter, 8/16px radii, light only); the earlier green theme and automatic OS dark mode are gone.
- Depth tensors render as images when `features.json` is available.

**Open:** npm scope (`@rlds-viewer` org vs an existing one); public repo or not; license (MIT suggested).

**Deferred:** `asChild` / `render` prop (per-part hooks cover "your element, our behaviour"), Vue/Web Component wrappers, Web Worker decoding, Storybook, i18n labels, fps from per-step timestamps, GZIP shards, decoding text stored as int32 code arrays (language_table).
