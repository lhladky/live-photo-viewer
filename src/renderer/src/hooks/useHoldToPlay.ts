import { useCallback, useEffect, useRef } from 'react'

interface Options {
  enabled: boolean
  /** Delay before a press counts as a "hold" (mirrors iOS long-press). */
  debounceMs?: number
  onStart: () => void
  onStop: () => void
}

interface HoldHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerLeave: () => void
  onPointerCancel: () => void
}

/**
 * Press-and-hold gesture: left-button down → debounce → onStart; release or
 * leave → onStop. onStop only fires if a hold had actually started.
 */
export function useHoldToPlay({
  enabled,
  debounceMs = 150,
  onStart,
  onStop
}: Options): HoldHandlers {
  const timer = useRef<number | null>(null)
  const started = useRef(false)

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const stop = useCallback(() => {
    clearTimer()
    if (started.current) {
      started.current = false
      onStop()
    }
  }, [clearTimer, onStop])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0) {
        return
      }
      clearTimer()
      timer.current = window.setTimeout(() => {
        started.current = true
        onStart()
      }, debounceMs)
    },
    [enabled, clearTimer, onStart, debounceMs]
  )

  useEffect(() => clearTimer, [clearTimer])

  return { onPointerDown, onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop }
}
