import { readdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import type { GalleryItem, ScanResult } from '../shared/types'

/** Still extensions we recognise, lowercased, without the leading dot. */
export const STILL_EXTS = new Set(['heic', 'heif', 'jpg', 'jpeg', 'png'])
/** Video extensions that can form the "live" half of a pair. */
export const VIDEO_EXTS = new Set(['mov', 'mp4'])

/**
 * Preference order when a single basename has more than one still (rare, e.g.
 * an export that produced both HEIC and JPG). Lower index wins.
 */
const STILL_PREFERENCE = ['heic', 'heif', 'jpg', 'jpeg', 'png']

function ext(fileName: string): string {
  return extname(fileName).slice(1).toLowerCase()
}

/** Basename without extension, lowercased — the key photos and videos pair on. */
function pairKey(fileName: string): string {
  const e = extname(fileName)
  return fileName.slice(0, fileName.length - e.length).toLowerCase()
}

/**
 * Pure pairing logic: given a folder path and its file names, produce the
 * gallery items. A still + a video sharing a basename become one Live Photo;
 * a lone still becomes a plain photo; a lone video is ignored (nothing to show).
 *
 * No filesystem access here so it is trivially unit-testable.
 */
export function pairFiles(folder: string, fileNames: string[]): GalleryItem[] {
  const stillsByKey = new Map<string, string>() // key -> chosen still filename
  const videosByKey = new Map<string, string>() // key -> video filename

  for (const name of fileNames) {
    const e = ext(name)
    const key = pairKey(name)
    if (STILL_EXTS.has(e)) {
      const existing = stillsByKey.get(key)
      if (!existing || preferStill(name, existing)) stillsByKey.set(key, name)
    } else if (VIDEO_EXTS.has(e)) {
      // Prefer .mov (the native iPhone Live Photo video) over .mp4 if both exist.
      const existing = videosByKey.get(key)
      if (!existing || (ext(name) === 'mov' && ext(existing) !== 'mov')) {
        videosByKey.set(key, name)
      }
    }
  }

  const items: GalleryItem[] = []
  for (const [key, stillName] of stillsByKey) {
    const videoName = videosByKey.get(key) ?? null
    const stillPath = join(folder, stillName)
    items.push({
      id: stillPath,
      stillPath,
      videoPath: videoName ? join(folder, videoName) : null,
      name: stillName.slice(0, stillName.length - extname(stillName).length),
      isLive: videoName !== null,
      ext: ext(stillName)
    })
  }

  // Natural, case-insensitive sort so IMG_2 comes before IMG_10.
  items.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  )
  return items
}

function preferStill(candidate: string, current: string): boolean {
  const rank = (n: string): number => {
    const i = STILL_PREFERENCE.indexOf(ext(n))
    return i === -1 ? STILL_PREFERENCE.length : i
  }
  return rank(candidate) < rank(current)
}

/** Scan a folder (non-recursive) and return its paired gallery items. */
export async function scanFolder(folder: string): Promise<ScanResult> {
  const entries = await readdir(folder, { withFileTypes: true })
  const fileNames = entries.filter((e) => e.isFile()).map((e) => e.name)
  const items = pairFiles(folder, fileNames)
  const liveCount = items.filter((i) => i.isLive).length
  return {
    folder,
    items,
    photoCount: items.length,
    liveCount
  }
}
