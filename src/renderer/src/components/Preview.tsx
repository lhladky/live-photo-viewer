import type { GalleryItem } from '@shared/types'

interface Props {
  item: GalleryItem | null
}

/**
 * Main preview pane. Shows the still image (JPG renders natively; HEIC preview
 * is experimental and may not display until a decoded-preview path is added).
 * Press-and-hold video playback is layered on in M4.
 */
export function Preview({ item }: Props): React.JSX.Element {
  if (!item) {
    return <div className="preview preview--empty">Select a photo below</div>
  }
  const src = window.viewer.mediaUrl(item.stillPath)
  return (
    <div className="preview">
      <img className="preview__img" src={src} alt={item.name} draggable={false} />
      {item.isLive && <span className="preview__live">● LIVE</span>}
    </div>
  )
}
