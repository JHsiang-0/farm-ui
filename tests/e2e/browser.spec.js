import { expect, test } from '@playwright/test'

const viewports = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 855 }
]

const pages = [
  { label: '概览仪表盘', path: '/dashboard', text: '概览仪表盘' },
  { label: '打印机管理', path: '/printers', text: '打印机管理' },
  { label: '文件库', path: '/files', text: '文件库' },
  { label: '任务队列', path: '/tasks/queue', text: '生产调度队列' },
  { label: '打印历史', path: '/tasks/history', text: '打印历史记录' },
  { label: '批量派发', path: '/batch-dispatch', text: '批量手动派发' },
  { label: '用户管理', path: '/users', text: '用户管理' },
  { label: '操作日志', path: '/audit-logs', text: '操作日志' },
  { label: '个人中心', path: '/profile', text: '个人资料' }
]

const login = async page => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
  await page.getByLabel('用户名', { exact: true }).fill('admin')
  await page.getByLabel('密码', { exact: true }).fill('Admin123')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: '概览仪表盘' })).toBeVisible()
}

const openSidebarItem = async (page, width, label) => {
  const sidebar = page.locator('.app-sidebar')
  if (width <= 768) {
    const menuButton = page.getByRole('button', { name: /展开菜单|收起菜单/ }).first()
    const isOpen = await sidebar.evaluate(element => element.classList.contains('app-sidebar--mobile-open'))
    if (!isOpen) {
      await menuButton.click()
      await expect(sidebar).toHaveClass(/app-sidebar--mobile-open/)
    }
  }
  const menuItem = sidebar.locator('.t-menu__item').filter({ hasText: label }).last()
  await menuItem.dispatchEvent('click')
  return sidebar
}

const assertNoViewportOverflow = async page => {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }))
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1)
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1)
}

for (const viewport of viewports) {
  test(`四视口逐页检查业务界面 ${viewport.width}px`, async ({ browser }, testInfo) => {
    test.setTimeout(120000)
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()

    try {
      await login(page)
      await assertNoViewportOverflow(page)
      await page.screenshot({ path: testInfo.outputPath(`login-${viewport.width}.png`) })

      for (const item of pages) {
        await openSidebarItem(page, viewport.width, item.label)
        await expect(page).toHaveURL(new RegExp(`${item.path.replaceAll('/', '\\/')}$`))
        await expect(page.getByRole('main')).toContainText(item.text)
        await expect(page.getByRole('button', { name: '消息通知', exact: true })).toBeVisible()
        await assertNoViewportOverflow(page)
        await page.screenshot({ path: testInfo.outputPath(`${item.path.slice(1).replaceAll('/', '-')}-${viewport.width}.png`) })
      }

      await openSidebarItem(page, viewport.width, '概览仪表盘')
      await page.getByRole('button', { name: '实时设备看板', exact: true }).click()
      await expect(page).toHaveURL(/\/dashboard\/fullscreen$/)
      await expect(page.getByRole('heading', { name: 'FabMatrix 3D 打印控制系统' })).toBeVisible()
      await expect(page.getByRole('button', { name: '退出全屏', exact: true })).toBeVisible()
      await assertNoViewportOverflow(page)
      await page.screenshot({ path: testInfo.outputPath(`dashboard-fullscreen-${viewport.width}.png`) })
    } finally {
      await context.close()
    }
  })
}

test('批量派发页面完成真实预览确认流程', async ({ browser }) => {
  test.setTimeout(120000)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  try {
    await login(page)
    await openSidebarItem(page, 1440, '批量派发')
    await page.getByRole('checkbox', { name: /gearbox\.gcode/ }).check({ force: true })
    await page.getByRole('checkbox', { name: /bracket\.gcode/ }).check({ force: true })
    await page.getByRole('checkbox', { name: /Printer_A12F/ }).check({ force: true })
    await page.getByRole('button', { name: '生成派发预览', exact: true }).click()
    await expect(page.getByText('预览结果', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: /确认执行（\d+项）/ }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText(/执行完成：计划状态 CONFIRMED/)).toBeVisible()
    await expect(page.getByText(/成功 1 项，失败 0 项/)).toBeVisible()
    await expect(page.getByRole('button', { name: '再次获取执行结果', exact: true })).toBeVisible()
  } finally {
    await context.close()
  }
})

test('服务器连接页在桌面和移动视口保持可用且拆分地址操作', async ({ browser }) => {
  test.setTimeout(60000)
  for (const viewport of [
    { width: 1920, height: 855 },
    { width: 375, height: 812 }
  ]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    try {
      await page.goto('/server-connection')
      await expect(page.getByRole('heading', { name: '连接生产服务器' })).toBeVisible()
      await expect(page.locator('.connection-endpoint-grid__host input')).toBeVisible()
      await expect(page.locator('.connection-endpoint-grid input[placeholder="8080"]')).toBeVisible()
      await expect(page.getByRole('button', { name: '测试', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: '保存并连接', exact: true })).toBeVisible()
      await expect(page.getByText('测试并保存', { exact: true })).toHaveCount(0)
      await assertNoViewportOverflow(page)
    } finally {
      await context.close()
    }
  }
})

test('打印机和文件结果区拥有真实可用的局部滚动容器', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 855 } })
  const page = await context.newPage()
  try {
    await login(page)
    await openSidebarItem(page, 1920, '打印机管理')
    await expect(page).toHaveURL(/\/printers$/)
    await expect(page.getByRole('heading', { name: '打印机管理' })).toBeVisible()
    const printerScrollMetrics = await page.locator('.printer-table .t-table__content').first().evaluate(element => {
      const style = getComputedStyle(element)
      return { overflowY: style.overflowY, clientHeight: element.clientHeight }
    })
    expect(['auto', 'scroll']).toContain(printerScrollMetrics.overflowY)
    expect(printerScrollMetrics.clientHeight).toBeGreaterThan(0)

    await openSidebarItem(page, 1920, '文件库')
    await expect(page).toHaveURL(/\/files$/)
    await expect(page.getByRole('heading', { name: '文件库' })).toBeVisible()
    const fileScrollMetrics = await page.locator('.file-grid-view').evaluate(element => {
      const style = getComputedStyle(element)
      return { overflowY: style.overflowY, clientHeight: element.clientHeight }
    })
    expect(['auto', 'scroll']).toContain(fileScrollMetrics.overflowY)
    expect(fileScrollMetrics.clientHeight).toBeGreaterThan(0)
    await assertNoViewportOverflow(page)
  } finally {
    await context.close()
  }
})
