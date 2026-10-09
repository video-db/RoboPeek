import { createContext, useContext } from 'react'
import type { Input, SampleLike } from '../../samples.ts'
export type DocsFormat = 'rlds' | 'mcap'
export type InputContextValue = { format: DocsFormat; samples: SampleLike[]; input: Input; setInput: (input: Input) => void }
export const InputContext = createContext<InputContextValue | null>(null)
export function useInput() {
  const value = useContext(InputContext)
  if (!value) throw new Error('Example pages must be inside a RoboPeek developer guide.')
  return value
}
