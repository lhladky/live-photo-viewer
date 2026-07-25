import { Grid, type CellComponentProps } from 'react-window'
import type { GalleryItem } from '@shared/types'
import { Thumbnail } from './Thumbnail'

interface Props {
  items: GalleryItem[]
  selectedIndex: number
  onSelect: (index: number) => void
}

const THUMB_W = 128
const STRIP_H = 116

interface CellProps {
  items: GalleryItem[]
  selectedIndex: number
  onSelect: (index: number) => void
}

function Cell({
  columnIndex,
  style,
  items,
  selectedIndex,
  onSelect
}: CellComponentProps<CellProps>): React.JSX.Element {
  return (
    <div style={style} className="thumb-cell">
      <Thumbnail
        item={items[columnIndex]}
        selected={columnIndex === selectedIndex}
        onSelect={() => onSelect(columnIndex)}
      />
    </div>
  )
}

/**
 * Virtualized horizontal thumbnail strip — a single-row Grid, so only visible
 * cells mount and decode is lazy. react-window v2 auto-measures the parent, so
 * no explicit width/height wiring is needed.
 */
export function ThumbStrip({ items, selectedIndex, onSelect }: Props): React.JSX.Element {
  return (
    <div className="strip">
      <Grid
        cellComponent={Cell}
        cellProps={{ items, selectedIndex, onSelect }}
        columnCount={items.length}
        columnWidth={THUMB_W}
        rowCount={1}
        rowHeight={STRIP_H}
      />
    </div>
  )
}
