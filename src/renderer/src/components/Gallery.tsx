import { useEffect, useState } from 'react'
import type { GalleryItem } from '@shared/types'
import { Preview } from './Preview'
import { ThumbStrip } from './ThumbStrip'

interface Props {
  items: GalleryItem[]
}

export function Gallery({ items }: Props): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Reset selection when a new folder loads.
  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  // Pre-warm the whole folder's thumbnails at background priority so scrolling
  // back to already-seen items is instant. Visible requests always preempt this.
  useEffect(() => {
    if (items.length > 0) {
      window.viewer.warmThumbnails(items.map((it) => it.stillPath))
    }
  }, [items])

  // Arrow-key navigation through the strip.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'ArrowRight') {
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1))
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((i) => Math.max(i - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items.length])

  const current = items[selectedIndex] ?? null

  return (
    <div className="gallery">
      <Preview item={current} />
      <ThumbStrip items={items} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
    </div>
  )
}
