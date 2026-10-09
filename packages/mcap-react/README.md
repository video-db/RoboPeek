# @videodb/robopeek-mcap-react

React viewer, player and hooks for MCAP recordings. Built on [`@videodb/robopeek-mcap`](../mcap#readme), which it installs and re-exports.

```sh
npm install @videodb/robopeek-mcap-react
```

## Quick start

```tsx
import { McapViewer } from '@videodb/robopeek-mcap-react'
import '@videodb/robopeek-mcap-react/styles.css'

export function App() {
  return <McapViewer source="https://huggingface.co/datasets/…/episode.mcap" />
}
```

You get a load strip, every camera topic, playback controls, one chart per signal, the metadata, and a list of every topic in the file. Playback can start before the download finishes.

## `McapViewer`

| Prop | |
|---|---|
| `source` | URL or `File`. `null` shows `empty`. Choosing the file is the host's job. |
| `maxFrameBytes` | Frame memory budget (default 512 MiB). See [Memory](../mcap#memory-and-range-reads). |
| `defaultSpeed` | 1 = real time. |
| `colorScheme` | `'light'` (default) or `'dark'`. |
| `autoFocus` | Focus on mount so hotkeys work right away. |
| `playerProps` | Passed to `Player.Root`, e.g. `onNextEpisode` to step through a list of files. |
| `children` | Your layout of player parts. |

## The player

The player counts in **time**, not steps. MCAP topics tick at different rates, and each part shows the latest sample at or before the playhead.

```tsx
<Player.Root recording={recording} loading={status.phase === 'loading'}>
  <Player.Stage>
    <Player.Frames include={['/camera_left/compressed']} />
    <Player.Transport />
  </Player.Stage>
  <Player.Tracks include={(k) => k.startsWith('/joint_states')} />
</Player.Root>
```

| Part | |
|---|---|
| `Root` | Owns playback. `time` / `playing` / `speed` / `autoNext` each controlled or uncontrolled; `onPrevEpisode`, `onNextEpisode`, `hotkeys`, `colorScheme`. |
| `Stage` | `Instruction`, `Frames`, `Transport`, `Options` |
| `Frames` | One `FrameView` per camera. Fetches released frames around the playhead. `include`, `renderItem`, `renderEmpty`. |
| `Transport` | `PrevEpisode`, `StepBack`, `Play`, `StepForward`, `NextEpisode`, `Scrubber`, `Counter` |
| `Options` | `SpeedSelect`, `AutoNext` |
| `Tracks` | One `VectorChart` per signal; click or drag to seek. `include`, `renderItem`, `maxSeries`. |
| `Metadata` | MCAP metadata records, header fields, long text topics. |
| `Topics` | Every topic: schema, message count, how it is shown (or why not). |

Steps (← →, the step buttons) move between messages of the first camera, or the first chart if there is no camera.

## Hooks

| Hook | |
|---|---|
| `useRecording(source, { maxFrameBytes })` | → `{ file, recording, status, version }`. Opens and streams; `version` changes at most once per frame. |
| `usePlayer(selector)` | Player state inside `Root`. Select `version` alongside anything read from `recording` (it fills in place). |
| `usePlayback(opts)` | The real-time clock on its own. |
| `usePlayButton`, `useStepButton`, `useEpisodeButton`, `useScrubber`, `useSpeedSelect`, `useAutoNext` | Each part's behaviour, for your own markup. |
| `useRecordingVersion(recording)` | Re-render when a recording changes, batched to frames. |

## Keyboard

<kbd>Space</kbd> play/pause · <kbd>←</kbd> <kbd>→</kbd> step (<kbd>Shift</kbd> = 10) · <kbd>Home</kbd> <kbd>End</kbd> · <kbd>↑</kbd> <kbd>↓</kbd> episode. Active only while focus is inside the player.

## Styling

Same classes (`rp-*`), tokens (`--rp-*`), `@layer robopeek` and `data-rp-scheme` as [`@videodb/robopeek-react`](../react#styling), so one theme covers both. Stylesheets: `styles.css` (both), `structure.css` (layout only), `theme.css` (look only). MCAP-specific additions: `.rp-speed`, `.rp-topics`, `.rp-frame[data-pending]` (frame not in memory yet; the previous one stays up, dimmed).
