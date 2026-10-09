import type { CSSProperties } from 'react'
import type { Source } from '@videodb/robopeek-rlds'
import type { ColorScheme } from '@videodb/robopeek-react'
import { ShardViewer } from '@videodb/robopeek-react/rlds'
import './themes.css'

export type Preset = { id: string; label: string; how: string; className?: string; colorScheme?: ColorScheme }

export const PRESETS: Preset[] = [
  { id: 'default', label: 'Default', how: 'The neutral RoboPeek application theme.' },
  { id: 'dark', label: 'Dark', how: 'colorScheme="dark" prop.', colorScheme: 'dark' },
  { id: 'indigo', label: 'Indigo', how: 'Override a few --rp-* tokens (.theme-indigo).', className: 'theme-indigo' },
  { id: 'terminal', label: 'Terminal', how: 'Dark scheme + tokens for colour, font and radius (.theme-terminal).', className: 'theme-terminal', colorScheme: 'dark' },
  { id: 'minimal', label: 'Minimal', how: 'Target rp-* classes and data-* state (.theme-minimal).', className: 'theme-minimal' },
]

/** Tokens are CSS variables, so a style object works too (the token editor below the presets uses this). */
export type Tokens = Partial<Record<`--rp-${string}`, string>>

export function ThemedViewer({ source, preset, tokens }: { source: Source; preset: Preset; tokens: Tokens }) {
  return (
    <ShardViewer
      source={source}
      defaultFps={10}
      className={preset.className}
      colorScheme={preset.colorScheme}
      style={tokens as CSSProperties}
    />
  )
}
