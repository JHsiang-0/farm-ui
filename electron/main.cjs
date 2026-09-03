const path = require('node:path')
const { app, BrowserWindow, ipcMain, screen, shell } = require('electron')

const APP_ID = 'com.example.farmui'
const DEV_SERVER_URL = 'http://127.0.0.1:5173'
const WINDOW_SIZE = {
  minWidth: 800,
  minHeight: 560,
  maxWidth: 1200,
  maxHeight: 760,
  viewportRatio: 0.7
}

app.setAppUserModelId(APP_ID)

let mainWindow = null

ipcMain.handle('farm-window:set-fullscreen', (_event, fullscreen) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false

  mainWindow.setFullScreen(Boolean(fullscreen))
  return mainWindow.isFullScreen()
})

const getWindowSize = () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

  return {
    width: clamp(Math.floor(width * WINDOW_SIZE.viewportRatio), WINDOW_SIZE.minWidth, WINDOW_SIZE.maxWidth),
    height: clamp(Math.floor(height * WINDOW_SIZE.viewportRatio), WINDOW_SIZE.minHeight, WINDOW_SIZE.maxHeight)
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return

    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  const createWindow = async () => {
    const { width, height } = getWindowSize()

    mainWindow = new BrowserWindow({
      width,
      height,
      useContentSize: true,
      minWidth: WINDOW_SIZE.minWidth,
      minHeight: WINDOW_SIZE.minHeight,
      center: true,
      resizable: true,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })

    mainWindow.once('ready-to-show', () => {
      mainWindow.show()
    })

    const notifyFullscreenChange = () => {
      if (!mainWindow || mainWindow.isDestroyed()) return
      mainWindow.webContents.send('farm-window:fullscreen-changed', mainWindow.isFullScreen())
    }

    mainWindow.on('enter-full-screen', notifyFullscreenChange)
    mainWindow.on('leave-full-screen', notifyFullscreenChange)

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) {
        shell.openExternal(url)
      }

      return { action: 'deny' }
    })

    if (app.isPackaged) {
      await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
    } else {
      await mainWindow.loadURL(DEV_SERVER_URL)
    }

    mainWindow.on('closed', () => {
      mainWindow = null
    })
  }

  app.whenReady().then(createWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
