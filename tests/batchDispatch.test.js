import test from 'node:test'
import assert from 'node:assert/strict'
import { getNavigationItem } from '../src/config/navigation.js'
import { createBatchPreviewRequest, toBatchPreviewPayload } from '../src/utils/batchDispatch.js'

test('exposes the batch dispatch page through the application navigation', () => {
  assert.deepEqual(getNavigationItem('/batch-dispatch')?.key, 'tasks-batch')
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
