export * from '@robopeek/rlds'

export { useEpisodeStream, type StreamStatus } from './hooks/useEpisodeStream.ts'
export { useEpisode, type EpisodeStatus } from './hooks/useEpisode.ts'
export { usePlayback, type PlaybackOptions } from './hooks/usePlayback.ts'
export { usePlayerHotkeys, type HotkeyControls } from './hooks/usePlayerHotkeys.ts'
export type { SpecsOption } from './hooks/specs.ts'

export { EpisodeList, type EpisodeListProps } from './components/EpisodeList.tsx'
export { LoadStatus, type LoadStatusProps } from './components/LoadStatus.tsx'
export { FrameCanvas, type FrameCanvasProps } from './components/FrameCanvas.tsx'
export { VectorChart, type VectorChartProps } from './components/VectorChart.tsx'

export { Player } from './player/Player.tsx'
export { usePlayer, type PlayerState } from './player/store.ts'
export {
  usePlayButton,
  useStepButton,
  useEpisodeButton,
  useScrubber,
  useFpsSelect,
  useAutoNext,
  FPS_OPTIONS,
  FLAG_KEYS,
} from './player/hooks.ts'
export type {
  PlayerRootProps,
  StageProps,
  InstructionProps,
  FramesProps,
  TransportProps,
  TransportButtonProps,
  ScrubberProps,
  CounterProps,
  OptionsProps,
  FpsSelectProps,
  AutoNextProps,
  FlagsProps,
  TracksProps,
  MetadataProps,
  ColorScheme,
  Include,
} from './player/parts.tsx'

export { ShardViewer, type ShardViewerProps } from './viewers/ShardViewer.tsx'
export { EpisodeViewer, type EpisodeViewerProps } from './viewers/EpisodeViewer.tsx'
