const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('farmDesktop', Object.freeze({
  isDesktop: true,
  setFullscreen: fullscreen => ipcRenderer.invoke('farm-window:set-fullscreen', Boolean(fullscreen)),
  getRuntimeInfo: () => ipcRenderer.invoke('farm-runtime:get-info'),
  onFullscreenChange: callback => {
    const listener = (_event, fullscreen) => callback(Boolean(fullscreen))
    ipcRenderer.on('farm-window:fullscreen-changed', listener)
    return () => ipcRenderer.removeListener('farm-window:fullscreen-changed', listener)
  }
}))
