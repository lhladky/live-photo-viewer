import { protocol, net } from 'electron'
import { pathToFileURL } from 'node:url'
import { realpath } from 'node:fs/promises'
import { sep } from 'node:path'

export { toMediaUrl } from '../shared/mediaUrl'

/**
 * Custom `media://` scheme used to feed local files (stills, generated
 * thumbnails, transcoded videos) into the sandboxed renderer without exposing
 * arbitrary filesystem access. Only files inside an allow-listed root are
 * served, and paths are resolved with realpath to defeat symlink/`..` escapes.
 *
 * URL shape: media://local/<base64url(absolutePath)>
 */

const SCHEME = 'media'
const allowedRoots = new Set<string>()

/** Register the scheme's privileges. MUST run before app `ready`. */
export function registerMediaSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true // enables HTTP range requests for <video>
      }
    }
  ])
}

/** Add a directory whose files may be served (e.g. an opened photo folder or the cache). */
export function allowRoot(dir: string): void {
  allowedRoots.add(normalizeRoot(dir))
}

function normalizeRoot(dir: string): string {
  return dir.endsWith(sep) ? dir : dir + sep
}

function decodeMediaUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname !== 'local') return null
    const b64 = u.pathname.replace(/^\//, '')
    return Buffer.from(b64, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

async function isAllowed(absPath: string): Promise<string | null> {
  try {
    const real = await realpath(absPath)
    for (const root of allowedRoots) {
      if (real === root.slice(0, -1) || real.startsWith(root)) return real
    }
    return null
  } catch {
    return null
  }
}

/** Install the protocol handler. Run after app `ready`. */
export function registerMediaProtocol(): void {
  protocol.handle(SCHEME, async (request) => {
    const abs = decodeMediaUrl(request.url)
    if (!abs) return new Response('bad request', { status: 400 })
    const real = await isAllowed(abs)
    if (!real) return new Response('forbidden', { status: 403 })
    return net.fetch(pathToFileURL(real).toString())
  })
}
