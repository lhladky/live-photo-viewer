import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { ThumbPriority, ViewerApi } from '../shared/types'
import { toMediaUrl } from '../shared/mediaUrl'

const api: ViewerApi = {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  scanFolder: (folder: string) => ipcRenderer.invoke('scan:folder', folder),
  getThumbnail: (stillPath: string, priority: ThumbPriority = 'visible') =>
    ipcRenderer.invoke('thumb:get', stillPath, priority),
  cancelThumbnail: (stillPath: string) => ipcRenderer.send('thumb:cancel', stillPath),
  warmThumbnails: (stillPaths: string[]) => ipcRenderer.send('thumb:warm', stillPaths),
  getVideo: (videoPath: string) => ipcRenderer.invoke('video:get', videoPath),
  mediaUrl: (absPath: string) => toMediaUrl(absPath),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  getInitialFolder: () => ipcRenderer.invoke('app:getInitialFolder'),
  getDiagnostics: () => ipcRenderer.invoke('app:getDiagnostics')
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('viewer', api)
} else {
  // Fallback for the unlikely case contextIsolation is disabled.
  // @ts-expect-error augmenting window at runtime
  window.viewer = api
}
