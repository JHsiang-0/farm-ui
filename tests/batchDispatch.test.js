import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getNavigationItem } from '../src/config/navigation.js'
import {
  createBatchPreviewRequest,
  normalizeBatchConfirmResult,
  toBatchPreviewPayload
} from '../src/utils/batchDispatch.js'

test('exposes the batch dispatch page through the application navigation', () => {
  assert.deepEqual(getNavigationItem('/batch-dispatch')?.key, 'tasks-batch')
})

test('v2 批量派发只展示 v3 预留标识，不包含自动派单动作', async () => {
  const source = await readFile(new URL('../src/views/BatchDispatch.vue', import.meta.url), 'utf8')
  assert.match(source, /v3 自动派单：规划中/)
  assert.doesNotMatch(source, /autoAssign/)
})

test('builds a plan-level preview context and keeps action on each client item', () => {
  const request = createBatchPreviewRequest({
    fileIds: [101, '102'],
    printerIds: [201, 202],
    strategy: 'ROUND_ROBIN',
    action: 'START_AFTER_CONFIRM',
    requestId: 'preview-test'
  })

  assert.equal(request.requestId, 'preview-test')
  assert.deepEqual(request.items, [
    { fileId: '101', printerId: '201' },
    { fileId: '102', printerId: '202' }
  ])
  assert.deepEqual(toBatchPreviewPayload(request), {
    fileIds: ['101', '102'],
    printerIds: ['201', '202'],
    strategy: 'ROUND_ROBIN',
    action: 'START_AFTER_CONFIRM'
  })
})

test('auto match keeps printer assignment empty until preview suggestions arrive', () => {
  const request = createBatchPreviewRequest({
    fileIds: ['file-a', 'file-b'],
    printerIds: ['printer-a'],
    strategy: 'AUTO_MATCH'
  })

  assert.ok(request.requestId.startsWith('batch-preview-'))
  assert.deepEqual(request.items.map(item => item.printerId), [null, null])
})

test('does not treat recovery-required results as successful jobs', () => {
  const [item] = normalizeBatchConfirmResult({
    planId: 'plan-1',
    items: [{
      itemId: 'item-1',
      jobId: 'job-1',
      status: 'RECOVERY_REQUIRED',
      recoveryAction: 'OPEN_EXISTING_JOB',
      retryable: false
    }]
  }).items

  assert.equal(item.success, false)
  assert.equal(item.jobId, 'job-1')
  assert.equal(item.recoveryAction, 'OPEN_EXISTING_JOB')
})
