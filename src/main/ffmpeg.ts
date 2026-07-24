import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'

const execFileAsync = promisify(execFile)

/**
 * ffmpeg-static exports the binary path as its default export. When the app is
 * packaged into an asar archive the path lands inside `app.asar`, where the
 * binary is not executable; electron-builder is configured (M5) to unpack it to
 * `app.asar.unpacked`, so we rewrite the path here to match.
 */
function resolveBinary(p: string | null): string | null {
  if (!p) return null
  return p.replace('app.asar', 'app.asar.unpacked')
}

export const ffmpegPath = resolveBinary(ffmpegStatic as unknown as string | null)
export const ffprobePath = resolveBinary(ffprobeStatic?.path ?? null)

async function ffmpegList(kind: 'codecs' | 'demuxers'): Promise<string> {
  if (!ffmpegPath) return ''
  try {
    const { stdout } = await execFileAsync(ffmpegPath, ['-hide_banner', `-${kind}`], {
      maxBuffer: 8 * 1024 * 1024
    })
    return stdout
  } catch {
    return ''
  }
}

/**
 * M1 spike: probe the bundled ffmpeg build for the capabilities a Live Photo
 * pipeline needs — an HEVC decoder (iPhone MOV video) and an HEIF demuxer
 * (HEIC still). If HEIF demux is missing we fall back to libheif-js for stills.
 */
export async function checkFfmpegCapabilities(): Promise<{
  hevcDecode: boolean
  heifDemux: boolean
}> {
  const [codecs, demuxers] = await Promise.all([ffmpegList('codecs'), ffmpegList('demuxers')])
  // A decoder line for hevc looks like: " DEV.L. hevc  H.265 / HEVC ... "
  // (leading flags: D=decode, E=encode, V=video). We only require the D flag.
  const hevcDecode = /^\s*D[E.]V.*\bhevc\b/im.test(codecs)
  // HEIC stills are HEVC-coded images in an ISOBMFF/HEIF container. Newer ffmpeg
  // builds expose a dedicated "heif"/"avif" demuxer; fall back to that signal.
  // Definitive proof still requires decoding a real sample (done when one exists).
  const heifDemux = /\bhei[cf]\b/i.test(demuxers)
  return { hevcDecode, heifDemux }
}
