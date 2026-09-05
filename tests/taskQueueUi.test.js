import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'

const queueSource = fs.readFileSync(new URL('../src/views/JobQueue.vue', import.meta.url), 'utf8')
const historySource = fs.readFileSync(new URL('../src/views/JobHistory.vue', import.meta.url), 'utf8')
const storeSource = fs.readFileSync(new URL('../src/stores/jobStore.js', import.meta.url), 'utf8')

test('任务列表只有数据量足够时才启用局部滚动，少量数据保持自然高度', () => {
  assert.match(queueSource, /:height="queueTableHeight"/)
  assert.match(queueSource, /queueData\.value\.length > 8/)
  assert.match(queueSource, /activePageData\.value\.length > 8/)
  assert.match(historySource, /:height="historyTableHeight"/)
  assert.match(historySource, /tableData\.value\.length > 8/)
})

test('任务刷新失败保留已有服务端数据并提供页面内重试', () => {
  assert.doesNotMatch(storeSource, /queueError\.value = error\s+queueJobs\.value = \[\]/)
  assert.doesNotMatch(storeSource, /activeError\.value = error\s+activeJobs\.value = \[\]/)
  assert.match(queueSource, /queueError && queueData\.length/)
  assert.match(queueSource, /activeError && activePageData\.length/)
  assert.match(historySource, /loadError && tableData\.length/)
})

test('任务操作失败后重新读取服务端状态，避免 409 或 422 留下过期列表', () => {
  assert.match(queueSource, /message\.error\(error\?\.message \|\| `\$\{successText\}失败`\)[\s\S]*?await fetchQueue\(\)/)
  assert.match(queueSource, /重新读取服务端状态/)
  assert.match(historySource, /取消任务失败[\s\S]*?await fetchData\(\)/)
  assert.match(historySource, /重试任务失败[\s\S]*?await fetchData\(\)/)
  assert.match(historySource, /重新排队失败[\s\S]*?await fetchData\(\)/)
})
