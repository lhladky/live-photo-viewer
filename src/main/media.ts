import { app } from 'electron'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { stat, mkdir, access, readFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { cpus } from 'node:os'
import { ffmpegPath } from './ffmpeg'

const execFileAsync = promisify(execFile)

/** Longest edge (px) for generated thumbnails. 2x for crisp display on HiDPI. */
const THUMB_MAX = 320

let cacheDirPromise: Promise<string> | null = null
async function cacheDir(): Promise<string> {
  if (!cacheDirPromise) {
    const dir = join(app.getPath('userData'), 'cache', 'thumbs')
    cacheDirPromise = mkdir(dir, { recursive: true }).then(() => dir)
  }
  return cacheDirPromise
}

/** Absolute path of the on-disk thumbnail cache root (created on first use). */
export async function getCacheRoot(): Promise<string> {
  return join(app.getPath('userData'), 'cache')
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/** Cache key derived from identity (path + mtime + size) so re-copies invalidate. */
async function cacheKey(stillPath: string): Promise<string> {
  const s = await stat(stillPath)
  return createHash('sha1').update(`${stillPath}:${s.mtimeMs}:${s.size}`).digest('hex')
}

// ---- Concurrency pool -------------------------------------------------------
// Thumbnailing spawns ffmpeg subprocesses; cap how many run at once so a big
// folder does not fork hundreds of processes. Sized to leave the UI responsive.
const MAX_CONCURRENT = Math.max(1, cpus().length - 1)
let active = 0
const queue: Array<() => void> = []

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => queue.push(resolve))
  }
  active++
  try {
    return await fn()
  } finally {
    active--
    const next = queue.shift()
    if (next) next()
  }
}

// ---- Thumbnail generation ---------------------------------------------------

const HEIC_EXTS = new Set(['heic', 'heif'])

/**
 * Produce (and cache) a downscaled JPEG thumbnail for a still image.
 * Returns the absolute path of the cached thumbnail, or null if decoding
 * failed (e.g. an unreadable HEIC while support is still experimental).
 */
export async function getThumbnailPath(stillPath: string): Promise<string | null> {
  if (!ffmpegPath) return null
  const key = await cacheKey(stillPath)
  const dir = await cacheDir()
  const out = join(dir, `${key}.jpg`)
  if (await fileExists(out)) return out

  const ext = extname(stillPath).slice(1).toLowerCase()
  return withSlot(async () => {
    try {
      if (HEIC_EXTS.has(ext)) {
        await thumbnailFromHeic(stillPath, out)
      } else {
        await thumbnailFromStandard(stillPath, out)
      }
      return (await fileExists(out)) ? out : null
    } catch (err) {
      console.error(`[thumb] failed for ${stillPath}:`, err)
      return null
    }
  })
}

/** JPG/PNG path: ffmpeg reads the file directly, applies EXIF autorotation, scales. */
async function thumbnailFromStandard(input: string, output: string): Promise<void> {
  await execFileAsync(
    ffmpegPath!,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-autorotate',
      '1',
      '-i',
      input,
      '-vf',
      `scale='min(${THUMB_MAX},iw)':-1:flags=lanczos`,
      '-frames:v',
      '1',
      '-q:v',
      '4',
      '-y',
      output
    ],
    { timeout: 30_000 }
  )
}

/**
 * EXPERIMENTAL HEIC path. ffmpeg-static (v6) cannot demux HEIF, so decode with
 * libheif-js (wasm) to raw RGBA, then pipe that into ffmpeg to scale + encode.
 * Guarded by the caller's try/catch; unverified against real HEIC yet.
 */
async function thumbnailFromHeic(input: string, output: string): Promise<void> {
  const { data, width, height } = await decodeHeicToRgba(input)
  await new Promise<void>((resolve, reject) => {
    const ff = spawn(ffmpegPath!, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      '-s',
      `${width}x${height}`,
      '-i',
      'pipe:0',
      '-vf',
      `scale='min(${THUMB_MAX},iw)':-1:flags=lanczos`,
      '-frames:v',
      '1',
      '-q:v',
      '4',
      '-y',
      output
    ])
    ff.on('error', reject)
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))))
    ff.stdin.write(Buffer.from(data.buffer, data.byteOffset, data.byteLength))
    ff.stdin.end()
  })
}

async function decodeHeicToRgba(
  input: string
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  // Loaded lazily so a broken/absent wasm build never affects the JPG path.
  const libheif = await import('libheif-js')
  const decoder = new libheif.HeifDecoder()
  const buf = await readFile(input)
  const images = decoder.decode(buf)
  if (!images.length) throw new Error('no images in HEIC')
  const image = images[0]
  const width = image.get_width()
  const height = image.get_height()
  const rgba = new Uint8ClampedArray(width * height * 4)
  await new Promise<void>((resolve, reject) => {
    image.display({ data: rgba, width, height }, (result) =>
      result ? resolve() : reject(new Error('libheif display failed'))
    )
  })
  return { data: rgba, width, height }
}
