import path from 'node:path'
import { _electron as electron } from 'playwright'
import { expect, test } from '@playwright/test'

test('Electron desktop-mock 启动、登录、路由和全屏看板冒烟', async () => {
  const electronApp = await electron.launch({
    args: [path.resolve('.')],
    env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }
  })

  try {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveTitle(/FabMatrix Web/)
    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
    await page.getByLabel('用户名', { exact: true }).fill('admin')
    await page.getByLabel('密码', { exact: true }).fill('Admin123')
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect(page).toHaveURL(/127\.0\.0\.1:5176\/#\/dashboard/)
    await expect(page.getByRole('heading', { name: '概览仪表盘' })).toBeVisible()

    const windowMetrics = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth
    }))
    expect(windowMetrics.width).toBeGreaterThanOrEqual(800)
    expect(windowMetrics.height).toBeGreaterThanOrEqual(560)
    expect(windowMetrics.documentWidth).toBeLessThanOrEqual(windowMetrics.width + 1)

    await page.getByRole('button', { name: '实时设备看板', exact: true }).click()
    await expect(page).toHaveURL(/127\.0\.0\.1:5176\/#\/dashboard\/fullscreen/)
    await expect(page.getByRole('heading', { name: 'FabMatrix 3D 打印控制系统' })).toBeVisible()
    await page.getByRole('button', { name: '退出全屏', exact: true }).click()
    await expect(page).toHaveURL(/127\.0\.0\.1:5176\/#\/printers/)
    await expect(page.getByRole('heading', { name: '打印机管理' })).toBeVisible()
    await expect(page.getByRole('button', { name: '删除打印机' }).first()).toBeVisible()

    await page.goto('http://127.0.0.1:5176/#/server-connection')
    await expect(page.getByRole('heading', { name: '连接生产服务器' })).toBeVisible()
    await expect(page.getByRole('button', { name: '测试', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '保存并连接', exact: true })).toBeVisible()

    await page.goto('http://127.0.0.1:5176/#/files')
    await expect(page.getByRole('heading', { name: '文件库' })).toBeVisible()
    await expect(page.locator('.file-library-layout')).toBeVisible()
  } finally {
    await electronApp.close()
  }
})
