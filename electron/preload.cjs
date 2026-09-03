const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('farmDesktop', Object.freeze({
  isDesktop: true
}))
