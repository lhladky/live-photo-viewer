// Renderer-side memo of resolved thumbnail URLs so scrolling back to an item
// (which remounts its virtualized cell) does not re-hit IPC. The heavy work is
// already cached on disk in main; this just avoids the round-trip.

type Entry = { url: string | null }
const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<string | null>>()

export async function resolveThumbnail(stillPath: string): Promise<string | null> {
  const cached = cache.get(stillPath)
  if (cached) return cached.url

  const existing = inflight.get(stillPath)
  if (existing) return existing

  const p = window.viewer
    .getThumbnail(stillPath)
    .then((url) => {
      cache.set(stillPath, { url })
      inflight.delete(stillPath)
      return url
    })
    .catch(() => {
      inflight.delete(stillPath)
      return null
    })

  inflight.set(stillPath, p)
  return p
}
