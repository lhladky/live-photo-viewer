// Renderer-side memo of resolved thumbnail URLs so scrolling back to an item
// (which remounts its virtualized cell) does not re-hit IPC. The heavy work is
// already cached on disk in main; this just avoids the round-trip.

import type { ThumbPriority } from '@shared/types'

type Entry = { url: string | null }
const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<string | null>>()
// Paths whose in-flight request was cancelled: its pending promise must not be
// cached (a cancelled null would otherwise read as a permanent failure), so a
// later remount re-requests from scratch.
const cancelled = new Set<string>()

export async function resolveThumbnail(
  stillPath: string,
  priority: ThumbPriority = 'visible'
): Promise<string | null> {
  const cached = cache.get(stillPath)
  if (cached) {
    return cached.url
  }

  const existing = inflight.get(stillPath)
  if (existing) {
    return existing
  }

  const p = window.viewer
    .getThumbnail(stillPath, priority)
    .then((url) => {
      if (cancelled.has(stillPath)) {
        cancelled.delete(stillPath) // superseded — don't cache, leave any newer request alone
        return null
      }
      cache.set(stillPath, { url })
      inflight.delete(stillPath)
      return url
    })
    .catch(() => {
      cancelled.delete(stillPath)
      inflight.delete(stillPath)
      return null
    })

  inflight.set(stillPath, p)
  return p
}

/**
 * Cancel an unresolved thumbnail request (its cell scrolled off-screen) so the
 * main-process queue can drop it. No-op once resolved/cached. The inflight
 * entry is dropped immediately so a later remount re-requests at that time.
 */
export function cancelThumbnail(stillPath: string): void {
  if (inflight.has(stillPath) && !cache.has(stillPath)) {
    cancelled.add(stillPath)
    inflight.delete(stillPath)
    window.viewer.cancelThumbnail(stillPath)
  }
}
