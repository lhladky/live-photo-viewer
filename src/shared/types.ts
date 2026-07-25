// Types shared between the main process and the renderer.

/** A single gallery entry: a still image, optionally paired with a Live Photo video. */
export interface GalleryItem {
  /** Stable id for React keys and cache lookups (derived from the still path). */
  id: string
  /** Absolute path to the still image (HEIC/HEIF/JPG/JPEG/PNG). */
  stillPath: string
  /** Absolute path to the paired video (MOV/MP4), if this is a Live Photo. */
  videoPath: string | null
  /** Base filename shown in the UI (e.g. "IMG_1234"). */
  name: string
  /** True when a paired video exists. */
  isLive: boolean
  /** Still file extension without the dot, lowercased (e.g. "heic"). */
  ext: string
}

/** Result of scanning a folder. */
export interface ScanResult {
  folder: string
  items: GalleryItem[]
  /** Count of stills that had no video pair. */
  photoCount: number
  /** Count of items that are Live Photos. */
  liveCount: number
}

/** The typed API exposed to the renderer via contextBridge (window.viewer). */
export interface ViewerApi {
  /** Open a native folder-picker; returns the chosen path or null if cancelled. */
  openFolder: () => Promise<string | null>
  /** Scan a folder and return its paired gallery items. */
  scanFolder: (folder: string) => Promise<ScanResult>
  /**
   * Generate (or fetch from cache) a downscaled thumbnail for a still and
   * return a media:// URL, or null if it could not be decoded.
   */
  getThumbnail: (stillPath: string) => Promise<string | null>
  /**
   * Prepare (remux/transcode) a Live Photo video into a browser-playable MP4
   * and return a media:// URL, or null on failure.
   */
  getVideo: (videoPath: string) => Promise<string | null>
  /** Build a media:// URL for an original file (still preview / video). Synchronous. */
  mediaUrl: (absPath: string) => string
  /** Resolve the absolute filesystem path of a dropped File (Electron webUtils). */
  getPathForFile: (file: File) => string
  /** Folder to auto-open on launch (from a CLI arg or the LPV_OPEN env var), or null. */
  getInitialFolder: () => Promise<string | null>
  /** App + runtime info for the M1 spike / diagnostics panel. */
  getDiagnostics: () => Promise<Diagnostics>
}

export interface Diagnostics {
  electron: string
  chrome: string
  node: string
  platform: NodeJS.Platform
  ffmpegPath: string | null
  ffprobePath: string | null
  /** Whether the bundled ffmpeg build reports a HEVC decoder + HEIF demuxer. */
  ffmpegHevcDecode: boolean
  ffmpegHeifDemux: boolean
}
