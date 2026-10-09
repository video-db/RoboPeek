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

React components for previewing robot-learning data: ready-made viewers, a player you can take apart, and the hooks underneath. One package for every format; each format's glue sits behind its own entry point.

[![npm](https://img.shields.io/npm/v/@videodb/robopeek-react?style=flat-square)](https://www.npmjs.com/package/@videodb/robopeek-react)

Part of [RoboPeek](https://github.com/video-db/RoboPeek), which previews robotics datasets on the web.

## Install

The readers are optional peer dependencies: install the one for your format next to this package. Nothing from the other format is installed.

| You show | Install | Import |
|---|---|---|
| RLDS / TFRecord | `npm i @videodb/robopeek-react @videodb/robopeek-rlds` | `@videodb/robopeek-react/rlds` |
| MCAP | `npm i @videodb/robopeek-react @videodb/robopeek-mcap` | `@videodb/robopeek-react/mcap` |
| Your own data | `npm i @videodb/robopeek-react` | `@videodb/robopeek-react` (build a `Timeline`) |

## Quick start

```tsx
import { ShardViewer } from '@videodb/robopeek-react/rlds'
import { McapViewer } from '@videodb/robopeek-react/mcap'
import '@videodb/robopeek-react/styles.css'

<ShardViewer source="https://huggingface.co/datasets/…/train.tfrecord-00000-of-00128" />
<McapViewer source="https://huggingface.co/datasets/…/episode.mcap" />
```

## Entry points

| Import | Contains | Imports a reader? |
|---|---|---|
| `@videodb/robopeek-react` | `Player` and its parts, `FrameView`, `VectorChart`, `ItemList`, `LoadStatus`, playback and part hooks, the `Timeline` type | No |
| `@videodb/robopeek-react/rlds` | `ShardViewer`, `EpisodeViewer`, `EpisodePlayer`, `EpisodeList`, `Flags`, `useEpisodeStream`, `useEpisode`, `useEpisodeTimeline`, `useCurrentEpisode` | `@videodb/robopeek-rlds` only |
| `@videodb/robopeek-react/mcap` | `McapViewer`, `McapPlayer`, `Topics`, `useRecording`, `useMcapTimeline`, `useCurrentRecording` | `@videodb/robopeek-mcap` only |

The root entry never imports a reader, and the two format entries never import each other; CI checks the built files for it. Each entry imports the reader directly: `import type { Episode } from '@videodb/robopeek-rlds'`, `import { openMcap } from '@videodb/robopeek-mcap'`.

### When a boundary is crossed

| Mistake | What you see |
|---|---|
| Import `/mcap` without `@videodb/robopeek-mcap` installed | Node, webpack, esbuild: *Cannot find / resolve '@videodb/robopeek-mcap'*. Vite: *Could not resolve "@videodb/robopeek-mcap" imported by "@videodb/robopeek-react". Is it installed?* when the page loads. Any other silent stand-in: *'@videodb/robopeek-react/mcap' needs the MCAP reader, which isn't installed. npm install @videodb/robopeek-mcap*. Same for `/rlds`. |
| Pass an `Episode` or `Recording` to `Player.Root` | *got an RLDS Episode. Convert it first: import { useEpisodeTimeline } from '@videodb/robopeek-react/rlds'* (MCAP: `useMcapTimeline`) |
| Put an RLDS part (`Flags`, `useCurrentEpisode`) in an MCAP player, or `Topics` in an RLDS one | *&lt;Flags&gt; comes from '@videodb/robopeek-react/rlds' and reads rlds data, but this player shows a 'mcap' timeline.* |

## The player

`Player.Root` plays a `Timeline`. RLDS timelines count in steps (`12 / 40`, speed in fps); MCAP timelines count in seconds (`0:12.30 / 0:22.00`, speed as × real time). Every part shows the sample at or before the playhead, so one player serves both.

```tsx
import { Player } from '@videodb/robopeek-react'
import { EpisodePlayer, Flags, useEpisode } from '@videodb/robopeek-react/rlds'

const { episode } = useEpisode(url, 3)
<EpisodePlayer episode={episode} defaultRate={10}>
  <Player.Stage>
    <Player.Frames include={['image']} />
    <Player.Transport />
    <Player.Options><Player.RateSelect /><Flags /></Player.Options>
  </Player.Stage>
  <Player.Tracks include={(k) => k.startsWith('action')} />
</EpisodePlayer>
```

`EpisodePlayer` / `McapPlayer` are `Player.Root` with the format's timeline and default layout. With your own timeline, use `Player.Root timeline={…}` (or `<Player timeline={…} />` for the default layout).

| Part | |
|---|---|
| `Root` | Owns playback. `position` / `playing` / `rate` / `autoNext` each controlled (`value` + `onChange`) or uncontrolled (`default…`); `onPrevEpisode`, `onNextEpisode`, `loading`, `hotkeys`, `colorScheme`. |
| `DefaultLayout` | The default arrangement; `options` and `panels` slots for format parts. |
| `Stage` | `Instruction`, `Frames`, `Transport`, `Options` |
| `Frames` | One `FrameView` per image track. `include`, `renderItem`, `renderEmpty`. |
| `Transport` | `PrevEpisode`, `StepBack`, `Play`, `StepForward`, `NextEpisode`, `Scrubber`, `Counter` |
| `Options` | `RateSelect`, `AutoNext` (+ `Flags` from `/rlds`) |
| `Tracks` | One `VectorChart` per vector track; click or drag to seek. `include`, `renderItem`, `maxSeries`. Children render in the same grid. |
| `Metadata` | Key/value metadata. `include`, `renderItem`, `title`. |

Every part takes `className`, `ref` and the usual DOM props.

### Reading state

`usePlayer(selector)` inside any `Root`: `timeline`, `version`, `unit`, `end`, `position`, `setPosition`, `step(delta)`, `playing`, `toggle`, `rate`, `setRate`, `autoNext`, `prevEpisode`, `nextEpisode`, … Select primitives; a component re-renders only when its slice changes. For the format object: `useCurrentEpisode()` (`/rlds`), `useCurrentRecording()` (`/mcap`).

Part hooks give each built-in part's behaviour for your own markup: `usePlayButton`, `useStepButton`, `useEpisodeButton`, `useScrubber`, `useRateSelect`, `useAutoNext`.

## Your own format: `Timeline`

```ts
type Timeline = {
  format: string                       // 'rlds', 'mcap', or yours
  unit: 'step' | 'second'
  end: number                          // last position
  images: Record<string, { times; label?; load(i): Promise<CanvasImageSource | undefined> }>
  vectors: Record<string, { times; dim; data; names?; shape? }>
  text: Record<string, { times; values }>
  metadata: Record<string, string>
  version?; subscribe?(fn)             // for timelines that fill in while loading
  prepare?(start, end, signal)         // called with the window around the playhead
}
```

`frameCache(decode, { count })` gives an `ImageTrack.load` with lookahead and bitmap caching; `steps(n)` gives step times. A new format is a reader package plus an adapter like `/rlds` or `/mcap`; core doesn't change.

## Hooks by entry

| Hook | Entry | |
|---|---|---|
| `useEpisodeStream({ specs })` | `/rlds` | Streams a shard: `{ episodes, status, load, cancel, reset }` |
| `useEpisode(source, n, { specs })` | `/rlds` | One episode by number via HTTP Range |
| `useEpisodeTimeline(episode)` | `/rlds` | The episode as a `Timeline` (disposed for you) |
| `useRecording(source, { maxFrameBytes })` | `/mcap` | Opens and streams an MCAP file: `{ file, recording, status, version }` |
| `useMcapTimeline(recording)` | `/mcap` | The recording as a `Timeline` |
| `usePlayback(opts)`, `usePlayerHotkeys(ref, controls)`, `useTimelineVersion(timeline)` | root | The clock, keys and change tracking on their own |

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

Active while focus is inside the player (click it, or use `autoFocus`). Ignored while typing in an input.

| Key | Action |
|---|---|
| Space | Play / pause |
| ← / → | Previous / next step or frame (Shift: 10) |
| Home / End | Start / end |
| ↑ / ↓ | Previous / next episode |

## Related

- [`@videodb/robopeek-rlds`](https://www.npmjs.com/package/@videodb/robopeek-rlds) and [`@videodb/robopeek-mcap`](https://www.npmjs.com/package/@videodb/robopeek-mcap): the readers.
- [RoboPeek on GitHub](https://github.com/video-db/RoboPeek)
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
