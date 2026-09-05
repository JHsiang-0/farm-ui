import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'

const queueSource = fs.readFileSync(new URL('../src/views/JobQueue.vue', import.meta.url), 'utf8')
const historySource = fs.readFileSync(new URL('../src/views/JobHistory.vue', import.meta.url), 'utf8')
const detailSource = fs.readFileSync(new URL('../src/components/TaskDetailDrawer.vue', import.meta.url), 'utf8')

test('任务中心按队列和活动任务分区，不把队列结果当作全部活动任务', () => {
  assert.match(queueSource, /getJobQueue|fetchQueue/)
  assert.match(queueSource, /fetchActive/)
  assert.match(queueSource, /ACTIVE_JOB_STATUSES|activePageData/)
  assert.match(queueSource, /任务创建完成|部分任务未创建成功/)
})

test('任务创建只提交正式字段并提供幂等多份结果', () => {
  assert.match(queueSource, /getFileTree\(\)/)
  assert.match(queueSource, /createPrintJob\(\{/)
  assert.match(queueSource, /fileId: createTaskForm\.value\.fileId/)
  assert.match(queueSource, /idempotencyKey: `\$\{createTaskBatchKey\.value\}-\$\{index\}`/)
  assert.doesNotMatch(queueSource, /materialType: createTaskForm|nozzleSize: createTaskForm/)
  assert.match(queueSource, /retryFailedTaskCreations/)
})

test('任务中心动作受正式状态限制且历史查询不发送未定义 keyword', () => {
  assert.match(queueSource, /handlePause/)
  assert.match(queueSource, /handleResume/)
  assert.match(queueSource, /pausePrinter\(job\.printerId\)/)
  assert.match(queueSource, /resumePrinter\(job\.printerId\)/)
  assert.match(queueSource, /\['QUEUED', 'ASSIGNED', 'UPLOADING', 'READY', 'PRINTING', 'PAUSED', 'RECONCILING'\]/)
  assert.doesNotMatch(historySource, /params\.keyword|queryForm\.keyword/)
  assert.match(historySource, /hasValue\(scope\.row\.progress\)/)
})

test('任务详情只展示后端任务字段并对缺失值使用占位', () => {
  assert.match(detailSource, /发起用户 ID/)
  assert.match(detailSource, /现场操作员 ID/)
  assert.match(detailSource, /已知时间线/)
  assert.match(detailSource, /formatDateTime\(task\.startedAt\)/)
  assert.match(detailSource, /v-if="hasValue\(task\.progress\)"/)
  assert.doesNotMatch(detailSource, /task\.progress \|\| 0/)
})
