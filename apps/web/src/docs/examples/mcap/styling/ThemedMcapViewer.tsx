import type { CSSProperties } from 'react'
import type { Source } from '@videodb/robopeek-mcap'
import { McapViewer } from '@videodb/robopeek-react/mcap'
import type { Preset, Tokens } from '../../styling/ThemedViewer.tsx'
import '../../styling/themes.css'

// The same presets and tokens as the RLDS guide: the theme belongs to @videodb/robopeek-react, not to a format.
export function ThemedMcapViewer({ source, preset, tokens }: { source: Source; preset: Preset; tokens: Tokens }) {
  return (
    <McapViewer
      source={source}
      className={preset.className}
      colorScheme={preset.colorScheme}
      style={tokens as CSSProperties}
    />
  )
}
