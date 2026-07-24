import { FixedSizeList, type ListChildComponentProps } from 'react-window'
import type { GalleryItem } from '@shared/types'
import { useElementSize } from '../hooks/useElementSize'
import { Thumbnail } from './Thumbnail'

interface Props {
  items: GalleryItem[]
  selectedIndex: number
  onSelect: (index: number) => void
}

const THUMB_W = 128
const STRIP_H = 116

interface CellData {
  items: GalleryItem[]
  selectedIndex: number
  onSelect: (index: number) => void
}

function Cell({ index, style, data }: ListChildComponentProps<CellData>): React.JSX.Element {
  const { items, selectedIndex, onSelect } = data
  return (
    <div style={style} className="thumb-cell">
      <Thumbnail
        item={items[index]}
        selected={index === selectedIndex}
        onSelect={() => onSelect(index)}
      />
    </div>
  )
}

/** Virtualized horizontal thumbnail strip — only visible cells mount, so decode is lazy. */
export function ThumbStrip({ items, selectedIndex, onSelect }: Props): React.JSX.Element {
  const [ref, size] = useElementSize<HTMLDivElement>()
  const data: CellData = { items, selectedIndex, onSelect }

  return (
    <div className="strip" ref={ref}>
      {size.width > 0 && (
        <FixedSizeList
          layout="horizontal"
          height={STRIP_H}
          width={size.width}
          itemCount={items.length}
          itemSize={THUMB_W}
          itemData={data}
        >
          {Cell}
        </FixedSizeList>
      )}
    </div>
  )
}
