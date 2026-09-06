import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { _electron as electron } from 'playwright'
import { expect, test } from '@playwright/test'

test('Electron desktop-mock 启动、登录、路由和全屏看板冒烟', async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fabmatrix-electron-e2e-'))
  const electronApp = await electron.launch({
    args: [path.resolve('.')],
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: '1',
      FARM_ELECTRON_E2E: '1',
      FARM_ELECTRON_E2E_USER_DATA: userDataDir
    }
  })

  try {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveTitle(/FabMatrix Desktop/)

    const mainRuntime = await page.evaluate(() => window.farmDesktop.getRuntimeInfo())
    expect(mainRuntime.appId).toBe('com.example.farmui')
    expect(mainRuntime.isPackaged).toBe(false)
    expect(mainRuntime.rendererMode).toBe('dev-server')
    expect(mainRuntime.rendererSource).toBe('http://127.0.0.1:5176')
    expect(mainRuntime.userDataPath).toContain('fabmatrix-electron-e2e-')
    expect(mainRuntime.window.minSize).toEqual([800, 560])
    expect(mainRuntime.window.maxSize).toEqual([1200, 760])

    const rendererRuntime = await page.evaluate(() => window.__FARM_RUNTIME_DIAGNOSTICS__?.())
    expect(rendererRuntime).toEqual({
      mode: 'desktop-mock',
      baseUrl: '/',
      useMock: true,
      apiBaseUrl: 'http://localhost:8080',
      wsUrl: 'ws://localhost:8080/ws/farm-status'
    })

    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
    await page.getByLabel('用户名', { exact: true }).fill('admin')
    await page.getByLabel('密码', { exact: true }).fill('Admin123')
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect(page).toHaveURL(/127\.0\.0\.1:5176\/#\/dashboard/)
    await expect(page.getByRole('heading', { name: '概览仪表盘' })).toBeVisible()

    for (const size of [[800, 560], [1024, 640], [1200, 760]]) {
      await electronApp.evaluate(({ BrowserWindow }, nextSize) => {
        BrowserWindow.getAllWindows()[0]?.setContentSize(nextSize[0], nextSize[1])
      }, size)
      await expect.poll(() => page.evaluate(() => [window.innerWidth, window.innerHeight])).toEqual(size)

      const windowMetrics = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth
      }))
      expect(windowMetrics.documentWidth).toBeLessThanOrEqual(windowMetrics.width + 1)
    }

    await page.getByRole('button', { name: '实时设备看板', exact: true }).click()
    await expect(page).toHaveURL(/127\.0\.0\.1:5176\/#\/dashboard\/fullscreen/)
    await expect(page.getByRole('heading', { name: 'FabMatrix 3D 打印控制系统' })).toBeVisible()
    await page.getByRole('button', { name: '退出全屏', exact: true }).click()
    await expect(page).toHaveURL(/127\.0\.0\.1:5176\/#\/printers/)
    await expect(page.getByRole('heading', { name: '打印机管理' })).toBeVisible()
    await expect(page.getByRole('button', { name: '删除打印机' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '详情', exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: '详情', exact: true }).first().click()
    await expect(page.getByText('设备信息', { exact: true })).toBeVisible()
    await expect(page.getByText('Printer_C0DA - 详细信息', { exact: true })).toBeVisible()
    await expect(page.locator('.printer-detail-drawer')).not.toContainText('undefined')
    const drawerMetrics = await page.locator('.printer-detail-drawer .t-drawer__body').evaluate(element => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowY: getComputedStyle(element).overflowY
    }))
    expect(drawerMetrics.scrollHeight).toBeGreaterThan(drawerMetrics.clientHeight)
    expect(['auto', 'scroll']).toContain(drawerMetrics.overflowY)
    await page.getByRole('button', { name: '关闭打印机详情', exact: true }).click()
    await expect(page.getByText('设备信息', { exact: true })).toHaveCount(0)

    await page.goto('http://127.0.0.1:5176/#/server-connection')
    await expect(page.getByRole('heading', { name: '连接生产服务器' })).toBeVisible()
    await expect(page.getByRole('button', { name: '测试', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '保存并连接', exact: true })).toBeVisible()

    await page.goto('http://127.0.0.1:5176/#/files')
    await expect(page.getByRole('heading', { name: '文件库' })).toBeVisible()
    await expect(page.locator('.file-library-layout')).toBeVisible()
  } finally {
    await electronApp.close()
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
})

test('Electron App Shell 在三个桌面窗口尺寸下保持单一滚动模型', async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fabmatrix-electron-shell-e2e-'))
  const electronApp = await electron.launch({
    args: [path.resolve('.')],
    env: {
      ...process.env,
      FARM_ELECTRON_E2E: '1',
      FARM_ELECTRON_E2E_USER_DATA: userDataDir
    }
  })

  try {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.getByLabel('用户名', { exact: true }).fill('admin')
    await page.getByLabel('密码', { exact: true }).fill('Admin123')
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect(page).toHaveURL(/127\.0\.0\.1:5176\/#\/dashboard/)

    for (const size of [[800, 560], [1024, 640], [1200, 760]]) {
      await electronApp.evaluate(({ BrowserWindow }, nextSize) => {
        BrowserWindow.getAllWindows()[0]?.setContentSize(nextSize[0], nextSize[1])
      }, size)
      await expect.poll(() => page.evaluate(() => [window.innerWidth, window.innerHeight])).toEqual(size)

      const layoutMetrics = await page.evaluate(() => {
        const getMetrics = selector => {
          const element = document.querySelector(selector)
          if (!element) return null
          const style = getComputedStyle(element)
          return {
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            overflowY: style.overflowY,
            overflowX: style.overflowX
          }
        }

        return {
          body: getMetrics('body'),
          shell: getMetrics('.app-shell'),
          mainLayout: getMetrics('.app-main-layout'),
          content: getMetrics('.app-content'),
          contentView: getMetrics('.app-content__view'),
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth
        }
      })

      expect(layoutMetrics.documentWidth).toBeLessThanOrEqual(layoutMetrics.viewportWidth + 1)
      expect(layoutMetrics.body.overflowY).toBe('hidden')
      expect(layoutMetrics.shell.scrollHeight).toBeLessThanOrEqual(layoutMetrics.shell.clientHeight + 1)
      expect(layoutMetrics.mainLayout.scrollHeight).toBeLessThanOrEqual(layoutMetrics.mainLayout.clientHeight + 1)
      expect(layoutMetrics.contentView.overflowY).toBe('auto')
      expect(layoutMetrics.contentView.clientHeight).toBeGreaterThan(0)
    }

    await page.goto('http://127.0.0.1:5176/#/printers')
    await expect(page.getByRole('heading', { name: '打印机管理' })).toBeVisible()
    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setContentSize(800, 560)
    })
    await expect.poll(() => page.evaluate(() => [window.innerWidth, window.innerHeight])).toEqual([800, 560])

    const contentView = page.locator('.app-content__view')
    await contentView.hover()
    await page.mouse.wheel(0, 500)
    await expect.poll(() => contentView.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  } finally {
    await electronApp.close()
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
})
