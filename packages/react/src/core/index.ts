// '@videodb/robopeek-react': the player and components for any format. Imports no format reader; the
// format glue lives in '@videodb/robopeek-react/rlds' and '/mcap'.
export { indexAt, rowAt, steps, type Timeline, type Unit, type ImageTrack, type VectorTrack, type TextTrack } from './timeline.ts'
export { frameCache, type FrameCacheOptions } from './frameCache.ts'
export { assertTimeline, useFormatSource } from './errors.ts'

export { usePlayback, type PlaybackOptions } from './usePlayback.ts'
export { usePlayerHotkeys, type HotkeyControls } from './usePlayerHotkeys.ts'
export { useControllable } from './useControllable.ts'

export { LoadStatus, type LoadStatusProps } from './LoadStatus.tsx'
export { cx } from './cx.ts'
export { FrameView, type FrameViewProps } from './FrameView.tsx'
export { VectorChart, type VectorChartProps } from './VectorChart.tsx'
export { ItemList, type ItemListProps, type ListItem } from './ItemList.tsx'

export { Player } from './Player.tsx'
export { usePlayer, type PlayerState } from './store.ts'
export { useTimelineVersion, mergeRefs } from './parts.tsx'
export {
  usePlayButton,
  useStepButton,
  useEpisodeButton,
  useScrubber,
  useRateSelect,
  useAutoNext,
  formatTime,
  formatPosition,
  RATE_OPTIONS,
} from './hooks.ts'
export type {
  PlayerRootProps,
  DefaultLayoutProps,
  StageProps,
  InstructionProps,
  FramesProps,
  TransportProps,
  TransportButtonProps,
  ScrubberProps,
  CounterProps,
  OptionsProps,
  RateSelectProps,
  AutoNextProps,
  TracksProps,
  MetadataProps,
  ColorScheme,
  Include,
} from './parts.tsx'
