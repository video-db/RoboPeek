import { useCallback, useRef, useState } from 'react'

/** `value` set → controlled (onChange reports, caller decides); otherwise internal state seeded by `defaultValue`. */
export function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [inner, setInner] = useState(defaultValue)
  const controlled = value !== undefined
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const set = useCallback(
    (next: T) => {
      if (!controlled) setInner(next)
      onChangeRef.current?.(next)
    },
    [controlled],
  )
  return [controlled ? value : inner, set, setInner] as const
}
