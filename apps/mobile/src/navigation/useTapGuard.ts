// apps/mobile/src/navigation/useTapGuard.ts
import { useRef, useCallback } from 'react'

/**
 * Prevents rapid double-taps on navigation buttons.
 * Returns a wrapped function that only executes if enough time has passed.
 * 
 * @param fn - The navigation function to guard
 * @param delay - Minimum time between taps in ms (default: 500ms)
 */
export function useTapGuard<T extends (...args: any[]) => void>(
  fn: T,
  delay: number = 500
): T {
  const lastTap = useRef<number>(0)
  
  const guardedFn = useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastTap.current < delay) {
      // Ignore rapid tap
      return
    }
    lastTap.current = now
    fn(...args)
  }, [fn, delay]) as T
  
  return guardedFn
}
