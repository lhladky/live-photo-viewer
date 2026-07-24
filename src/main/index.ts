import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'node:path'
import process from 'node:process'
import type { Diagnostics } from '../shared/types'
import { ffmpegPath, ffprobePath, checkFfmpegCapabilities } from './ffmpeg'

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

  // scanFolder is registered in M2 (src/main/scan.ts wiring).
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
