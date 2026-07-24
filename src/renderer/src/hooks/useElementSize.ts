import { useEffect, useRef, useState } from 'react'

/** Track an element's content-box size via ResizeObserver (react-window needs explicit px). */
export function useElementSize<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  { width: number; height: number }
] {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box) {
        setSize({ width: box.width, height: box.height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, size]
}
