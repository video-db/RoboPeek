import * as P from './parts.tsx'

function PlayerDefault(props: P.PlayerRootProps) {
  return <P.Root {...props} />
}

/**
 * `<Player episode={…} />` renders the default arrangement. `Player.Root` + parts build your own;
 * any component inside Root can read state with `usePlayer(selector)`.
 */
export const Player = Object.assign(PlayerDefault, {
  Root: P.Root,
  Stage: P.Stage,
  Instruction: P.Instruction,
  Frames: P.Frames,
  Transport: P.Transport,
  PrevEpisode: P.PrevEpisode,
  StepBack: P.StepBack,
  Play: P.Play,
  StepForward: P.StepForward,
  NextEpisode: P.NextEpisode,
  Scrubber: P.Scrubber,
  Counter: P.Counter,
  Options: P.Options,
  FpsSelect: P.FpsSelect,
  AutoNext: P.AutoNext,
  Flags: P.Flags,
  Tracks: P.Tracks,
  Metadata: P.Metadata,
})
