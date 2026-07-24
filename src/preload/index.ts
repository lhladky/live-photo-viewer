import { contextBridge, ipcRenderer } from 'electron'
import type { ViewerApi } from '../shared/types'

const api: ViewerApi = {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  scanFolder: (folder: string) => ipcRenderer.invoke('scan:folder', folder),
  getDiagnostics: () => ipcRenderer.invoke('app:getDiagnostics')
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('viewer', api)
} else {
  // Fallback for the unlikely case contextIsolation is disabled.
  // @ts-expect-error augmenting window at runtime
  window.viewer = api
}
