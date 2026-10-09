export * from '@videodb/robopeek-mcap'

export { useRecording, type RecordingStatus, type RecordingOptions } from './hooks/useRecording.ts'
export { usePlayback, type PlaybackOptions } from './hooks/usePlayback.ts'
export { usePlayerHotkeys, type HotkeyControls } from './hooks/usePlayerHotkeys.ts'

export { LoadStatus, type LoadStatusProps } from './components/LoadStatus.tsx'
export { FrameView, type FrameViewProps } from './components/FrameView.tsx'
export { VectorChart, type VectorChartProps } from './components/VectorChart.tsx'

export { Player } from './player/Player.tsx'
export { usePlayer, type PlayerState } from './player/store.ts'
export { useRecordingVersion } from './player/parts.tsx'
export {
  usePlayButton,
  useStepButton,
  useEpisodeButton,
  useScrubber,
  useSpeedSelect,
  useAutoNext,
  formatTime,
  SPEED_OPTIONS,
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
  SpeedSelectProps,
  AutoNextProps,
  TracksProps,
  MetadataProps,
  TopicsProps,
  ColorScheme,
  Include,
} from './player/parts.tsx'

export { McapViewer, type McapViewerProps } from './viewers/McapViewer.tsx'
