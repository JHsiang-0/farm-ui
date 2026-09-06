import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('项目验证门禁覆盖测试、lint、浏览器和桌面构建', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const scripts = packageJson.scripts
  const mainSource = await readFile(new URL('../electron/main.cjs', import.meta.url), 'utf8')
  const preloadSource = await readFile(new URL('../electron/preload.cjs', import.meta.url), 'utf8')

  assert.match(scripts.verify, /npm run test/)
  assert.match(scripts.verify, /npm run lint/)
  assert.match(scripts.verify, /npm run build/)
  assert.match(scripts.verify, /npm run build:mock/)
  assert.match(scripts.verify, /npm run build:desktop/)
  assert.match(scripts.verify, /npm run build:desktop:mock/)
  assert.equal(packageJson.main, 'electron/main.cjs')
  assert.match(scripts['desktop:run'], /electron \. --farm-dist/)
  assert.match(scripts['desktop:run:mock'], /electron \. --farm-dist/)
  assert.match(mainSource, /frame: false/)
  assert.match(mainSource, /farm-window:toggle-maximize/)
  assert.match(preloadSource, /contextBridge\.exposeInMainWorld\('farmDesktop'/)
  assert.match(preloadSource, /farm-window:close/)
  assert.match(scripts['desktop:build:dir'], /electron-builder --win dir/)
})
