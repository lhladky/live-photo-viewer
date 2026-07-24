import { useEffect, useState } from 'react'
import type { GalleryItem } from '@shared/types'
import { resolveThumbnail } from '../lib/thumbnailCache'

interface Props {
  item: GalleryItem
  selected: boolean
  onSelect: () => void
}

export function Thumbnail({ item, selected, onSelect }: Props): React.JSX.Element {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setUrl(null)
    setFailed(false)
    resolveThumbnail(item.stillPath).then((u) => {
      if (!alive) return
      if (u) setUrl(u)
      else setFailed(true)
    })
    return () => {
      alive = false
    }
  }, [item.stillPath])

  return (
    <button
      className={`thumb${selected ? ' thumb--selected' : ''}`}
      onClick={onSelect}
      title={item.name}
    >
      {url ? (
        <img className="thumb__img" src={url} alt={item.name} draggable={false} />
      ) : (
        <div className={`thumb__ph${failed ? ' thumb__ph--failed' : ''}`}>{failed ? '⚠' : ''}</div>
      )}
      {item.isLive && <span className="thumb__live">LIVE</span>}
    </button>
  )
}
