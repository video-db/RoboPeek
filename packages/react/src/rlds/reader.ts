// The only place '/rlds' loads its reader, so a missing reader fails in one place. Node, webpack and esbuild stop on the
// import itself; Vite swaps in a stand-in module that throws "Is it installed?"; any stand-in that stays silent hits this.
import * as rlds from '@videodb/robopeek-rlds'

if (typeof rlds.streamEpisodes !== 'function') {
  throw new Error("'@videodb/robopeek-react/rlds' needs the RLDS reader, which isn't installed.\n  npm install @videodb/robopeek-rlds")
}
// Kept in step with the peer range in package.json: the oldest reader that has everything used here.
if (typeof rlds.rgbaAt !== 'function') {
  throw new Error("'@videodb/robopeek-react/rlds' needs @videodb/robopeek-rlds 0.2.0 or newer; an older version is installed.\n  npm install @videodb/robopeek-rlds@latest")
}

export const { streamEpisodes, episodeTitle, formatFeature, frameCount, rawRange, rgbaAt, ShardIndex, vectorAt, loadFeatureSpecs } = rlds
