import { protocol } from 'electron'
import { realpath, readFile } from 'node:fs/promises'
import { sep, extname } from 'node:path'

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

// macOS and Windows use case-insensitive filesystems, and realpath may return
// different casing than we stored (e.g. Electron's own "Cache" dir vs our
// "cache"). Compare accordingly; Linux stays case-sensitive.
const CASE_INSENSITIVE = process.platform === 'darwin' || process.platform === 'win32'
function forCompare(p: string): string {
  return CASE_INSENSITIVE ? p.toLowerCase() : p
}

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webp': 'image/webp'
}

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
    if (u.hostname !== 'local') {
      return null
    }
    const b64 = u.pathname.replace(/^\//, '')
    return Buffer.from(b64, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

async function isAllowed(absPath: string): Promise<string | null> {
  try {
    const real = await realpath(absPath)
    const realCmp = forCompare(real)
    for (const root of allowedRoots) {
      const rootCmp = forCompare(root)
      if (realCmp === rootCmp.slice(0, -1) || realCmp.startsWith(rootCmp)) {
        return real
      }
    }
    return null
  } catch {
    return null
  }
}

/** Serve a file, honouring HTTP Range requests so <video> can seek/stream. */
async function serveFile(real: string, rangeHeader: string | null): Promise<Response> {
  const buf = await readFile(real)
  const type = MIME[extname(real).toLowerCase()] ?? 'application/octet-stream'

  const match = rangeHeader ? /bytes=(\d+)-(\d*)/.exec(rangeHeader) : null
  if (match) {
    const start = parseInt(match[1], 10)
    const end = match[2] ? parseInt(match[2], 10) : buf.length - 1
    const slice = buf.subarray(start, end + 1)
    return new Response(new Uint8Array(slice), {
      status: 206,
      headers: {
        'content-type': type,
        'content-length': String(slice.length),
        'content-range': `bytes ${start}-${end}/${buf.length}`,
        'accept-ranges': 'bytes'
      }
    })
  }

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      'content-type': type,
      'content-length': String(buf.length),
      'accept-ranges': 'bytes'
    }
  })
}

/** Install the protocol handler. Run after app `ready`. */
export function registerMediaProtocol(): void {
  protocol.handle(SCHEME, async (request) => {
    const abs = decodeMediaUrl(request.url)
    if (!abs) {
      return new Response('bad request', { status: 400 })
    }
    const real = await isAllowed(abs)
    if (!real) {
      console.warn(`[media] forbidden (outside allowed roots): ${abs}`)
      return new Response('forbidden', { status: 403 })
    }
    try {
      return await serveFile(real, request.headers.get('range'))
    } catch (err) {
      console.error(`[media] serve failed for ${real}:`, err)
      return new Response('not found', { status: 404 })
    }
  })
}
