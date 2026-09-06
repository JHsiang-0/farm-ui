import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { _electron as electron } from 'playwright'
import { expect, test } from '@playwright/test'

test('Electron desktop 构建产物加载 dist-file 并保留运行诊断', async () => {
  const distIndexPath = path.resolve('dist/index.html')
  expect(fs.existsSync(distIndexPath)).toBe(true)

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fabmatrix-electron-dist-e2e-'))
  const electronApp = await electron.launch({
    args: [path.resolve('.')],
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: '1',
      FARM_ELECTRON_E2E: '1',
      FARM_ELECTRON_E2E_DIST: '1',
      FARM_ELECTRON_E2E_USER_DATA: userDataDir
    }
  })

  try {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveTitle(/FabMatrix Desktop/)
    await expect(page).toHaveURL(/^file:/)

    const mainRuntime = await page.evaluate(() => window.farmDesktop.getRuntimeInfo())
    expect(mainRuntime.isPackaged).toBe(false)
    expect(mainRuntime.rendererMode).toBe('dist-file')
    expect(mainRuntime.rendererSource).toMatch(/^file:\/\//)
    expect(mainRuntime.userDataPath).toContain('fabmatrix-electron-dist-e2e-')
    expect(mainRuntime.window.minSize).toEqual([800, 560])
    expect(mainRuntime.window.maxSize).toEqual([1200, 760])

    const rendererRuntime = await page.evaluate(() => window.__FARM_RUNTIME_DIAGNOSTICS__?.())
    expect(rendererRuntime).toEqual({
      mode: 'desktop',
      baseUrl: './',
      useMock: false,
      apiBaseUrl: 'http://localhost:8080',
      wsUrl: 'ws://localhost:8080/ws/farm-status'
    })

    const windowMetrics = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth
    }))
    expect(windowMetrics.width).toBeGreaterThanOrEqual(800)
    expect(windowMetrics.height).toBeGreaterThanOrEqual(560)
    expect(windowMetrics.documentWidth).toBeLessThanOrEqual(windowMetrics.width + 1)
  } finally {
    await electronApp.close()
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
})
