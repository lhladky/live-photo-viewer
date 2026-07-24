import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, resolve } from 'node:path'
import { statSync } from 'node:fs'
import process from 'node:process'
import type { Diagnostics, ScanResult } from '../shared/types'
import { ffmpegPath, ffprobePath, checkFfmpegCapabilities } from './ffmpeg'
import { scanFolder } from './scan'
import { getThumbnailPath, getCacheRoot } from './media'
import {
  registerMediaSchemePrivileges,
  registerMediaProtocol,
  allowRoot,
  toMediaUrl
} from './protocol'

// Must run before app `ready`.
registerMediaSchemePrivileges()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#111114',
    autoHideMenuBar: true,
    title: 'Live Photo Viewer',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  // In dev, surface renderer console output (and errors) in the terminal.
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.webContents.on('console-message', (_e, level, message, line, source) => {
      console.log(`[renderer:${level}] ${message} (${source}:${line})`)
    })
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Folder to open on launch: the LPV_OPEN env var (dev convenience) or the first
 * CLI argument that is an existing directory ("open with" / drag-onto-app).
 */
function resolveInitialFolder(): string | null {
  const candidates = [process.env['LPV_OPEN'], ...process.argv.slice(1)].filter(
    (a): a is string => typeof a === 'string' && a.length > 0 && !a.startsWith('-')
  )
  for (const c of candidates) {
    try {
      const abs = resolve(c)
      if (statSync(abs).isDirectory()) return abs
    } catch {
      // not a path we can use; keep looking
    }
  }
  return null
}

function registerIpc(): void {
  ipcMain.handle('dialog:openFolder', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Choose a photo folder',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('app:getDiagnostics', async (): Promise<Diagnostics> => {
    const caps = await checkFfmpegCapabilities()
    return {
      electron: process.versions.electron ?? 'unknown',
      chrome: process.versions.chrome ?? 'unknown',
      node: process.versions.node ?? 'unknown',
      platform: process.platform,
      ffmpegPath,
      ffprobePath,
      ffmpegHevcDecode: caps.hevcDecode,
      ffmpegHeifDemux: caps.heifDemux
    }
  })

  ipcMain.handle('app:getInitialFolder', async (): Promise<string | null> => {
    return resolveInitialFolder()
  })

  ipcMain.handle('scan:folder', async (_e, folder: string): Promise<ScanResult> => {
    // Files under the chosen folder become servable via the media:// scheme.
    allowRoot(folder)
    return scanFolder(folder)
  })

  ipcMain.handle('thumb:get', async (_e, stillPath: string): Promise<string | null> => {
    const thumbPath = await getThumbnailPath(stillPath)
    return thumbPath ? toMediaUrl(thumbPath) : null
  })
}

app.whenReady().then(async () => {
  registerMediaProtocol()
  // Generated thumbnails live under the cache root, so allow-list it too.
  allowRoot(await getCacheRoot())
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
