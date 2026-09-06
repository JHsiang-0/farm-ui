const path = require('node:path')
const fs = require('node:fs')
const { pathToFileURL } = require('node:url')
const { app, BrowserWindow, ipcMain, screen, shell } = require('electron')

const APP_ID = 'com.example.farmui'
const DEV_SERVER_URL = 'http://127.0.0.1:5176'
const DIST_INDEX_PATH = path.join(__dirname, '..', 'dist', 'index.html')
const WINDOW_SIZE = {
  minWidth: 800,
  minHeight: 560,
  maxWidth: 1200,
  maxHeight: 760,
  viewportRatio: 0.7
}

app.setAppUserModelId(APP_ID)

// Playwright Electron smoke runs use an isolated profile so a developer's
// running FabMatrix window cannot steal the single-instance lock.
if (process.env.FARM_ELECTRON_E2E_USER_DATA) {
  app.setPath('userData', process.env.FARM_ELECTRON_E2E_USER_DATA)
}

let mainWindow = null

const shouldUseDistRenderer = () => app.isPackaged || process.env.FARM_ELECTRON_E2E_DIST === '1'

const getRendererSource = () => shouldUseDistRenderer()
  ? pathToFileURL(DIST_INDEX_PATH).href
  : DEV_SERVER_URL

const getRendererMode = () => shouldUseDistRenderer() ? 'dist-file' : 'dev-server'

const getRuntimeInfo = () => {
  const contentSize = mainWindow && !mainWindow.isDestroyed()
    ? mainWindow.getContentSize()
    : null

  return {
    appId: APP_ID,
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged,
    rendererMode: getRendererMode(),
    rendererSource: getRendererSource(),
    userDataPath: app.getPath('userData'),
    window: {
      contentSize,
      isFullscreen: Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFullScreen()),
      minSize: [WINDOW_SIZE.minWidth, WINDOW_SIZE.minHeight],
      maxSize: [WINDOW_SIZE.maxWidth, WINDOW_SIZE.maxHeight]
    }
  }
}

const loadRenderer = async () => {
  if (shouldUseDistRenderer()) {
    if (!fs.existsSync(DIST_INDEX_PATH)) {
      throw new Error(`找不到桌面构建入口：${DIST_INDEX_PATH}`)
    }

    await mainWindow.loadFile(DIST_INDEX_PATH)
    return
  }

  try {
    await mainWindow.loadURL(DEV_SERVER_URL)
  } catch (error) {
    if (!fs.existsSync(DIST_INDEX_PATH)) throw error

    console.warn('Vite 开发服务器不可用，将回退到本地构建产物:', error.message)
    await mainWindow.loadFile(DIST_INDEX_PATH)
  }
}

const getAppIconPath = () => {
  const candidates = app.isPackaged
    ? [path.join(__dirname, '..', 'dist', 'icon.png')]
    : [
        path.join(__dirname, '..', 'public', 'icon.png'),
        path.join(__dirname, '..', 'dist', 'icon.png')
      ]

  return candidates.find(candidate => fs.existsSync(candidate))
}

ipcMain.handle('farm-window:set-fullscreen', (_event, fullscreen) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false

  mainWindow.setFullScreen(Boolean(fullscreen))
  return mainWindow.isFullScreen()
})

ipcMain.handle('farm-runtime:get-info', () => getRuntimeInfo())

const getWindowSize = () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

  return {
    width: clamp(Math.floor(width * WINDOW_SIZE.viewportRatio), WINDOW_SIZE.minWidth, WINDOW_SIZE.maxWidth),
    height: clamp(Math.floor(height * WINDOW_SIZE.viewportRatio), WINDOW_SIZE.minHeight, WINDOW_SIZE.maxHeight)
  }
}

const hasSingleInstanceLock = process.env.FARM_ELECTRON_E2E === '1'
  ? true
  : app.requestSingleInstanceLock()

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
      icon: getAppIconPath(),
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

    await loadRenderer()

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
