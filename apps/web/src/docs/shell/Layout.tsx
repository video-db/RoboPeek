import { createContext, useContext } from 'react'
import type { Input } from '../../samples.ts'
export type InputContextValue = { input: Input; setInput: (input: Input) => void }
export const InputContext = createContext<InputContextValue | null>(null)
export function useInput() {
  const value = useContext(InputContext)
  if (!value) throw new Error('Example pages must be inside the RLDS guide.')
  return value
}
