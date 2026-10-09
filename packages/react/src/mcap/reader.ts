// The only place '/mcap' loads its reader, so a missing reader fails in one place. Node, webpack and esbuild stop on the
// import itself; Vite swaps in a stand-in module that throws "Is it installed?"; any stand-in that stays silent hits this.
import * as mcap from '@videodb/robopeek-mcap'

if (typeof mcap.openMcap !== 'function') {
  throw new Error("'@videodb/robopeek-react/mcap' needs the MCAP reader, which isn't installed.\n  npm install @videodb/robopeek-mcap")
}

export const { openMcap, sourceName, decodePng16, isPng16Gray, MissingFramesError, rawToRGBA, VideoTrackDecoder } = mcap
