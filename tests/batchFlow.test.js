import test from 'node:test'
import assert from 'node:assert/strict'
import { mockRequest } from '../src/mock/index.js'
import { mockState, resetMockState } from '../src/mock/data.js'

const request = (method, url, data, headers) => mockRequest({ method, url, data, headers })
const headers = { Authorization: 'Bearer batch-flow-session' }

function setupSession() {
  resetMockState()
  mockState.sessions['batch-flow-session'] = { userId: 1, username: 'admin', role: 'ADMIN' }
}

test('previews without creating jobs or occupying printers, then confirms all items once', async () => {
  setupSession()
  const initialJobCount = mockState.jobs.length
  const initialPrinterJobIds = [mockState.printers.find(printer => printer.id === 404).currentJobId, mockState.printers.find(printer => printer.id === 408).currentJobId]
  const preview = await request('POST', '/api/v1/print-jobs/batch/preview', {
    fileIds: [20, 22],
    printerIds: [404, 408],
    strategy: 'ONE_TO_ONE',
    action: 'START_AFTER_CONFIRM'
  }, headers)

  assert.equal(mockState.jobs.length, initialJobCount)
  assert.deepEqual([mockState.printers.find(printer => printer.id === 404).currentJobId, mockState.printers.find(printer => printer.id === 408).currentJobId], initialPrinterJobIds)
  assert.equal(preview.data.items.every(item => item.canExecute), true)

  const confirmRequest = {
    planId: preview.data.planId,
    version: preview.data.version,
    itemIds: preview.data.items.filter(item => item.canExecute).map(item => item.itemId),
    confirmationToken: preview.data.confirmationToken
  }
  const confirmed = await request('POST', '/api/v1/print-jobs/batch/confirm', confirmRequest, headers)
  assert.equal(confirmed.data.planStatus, 'CONFIRMED')
  assert.equal(confirmed.data.items.every(item => item.success), true)
  assert.deepEqual(confirmed.data.items.map(item => item.status), ['ASSIGNED', 'ASSIGNED'])
  assert.equal(mockState.jobs.length, initialJobCount + 2)

  const repeated = await request('POST', '/api/v1/print-jobs/batch/confirm', confirmRequest, headers)
  assert.equal(repeated.data.idempotent, true)
  assert.equal(repeated.data.repeated, true)
  assert.deepEqual(repeated.data.items.map(item => item.jobId), confirmed.data.items.map(item => item.jobId))
  assert.equal(mockState.jobs.length, initialJobCount + 2)
})

test('returns per-item partial failure when confirmation finds a printer occupied', async () => {
  setupSession()
  const preview = await request('POST', '/api/v1/print-jobs/batch/preview', {
    fileIds: [20, 22],
    printerIds: [404],
    strategy: 'ROUND_ROBIN',
    action: 'START_AFTER_CONFIRM'
  }, headers)
  const confirmed = await request('POST', '/api/v1/print-jobs/batch/confirm', {
    planId: preview.data.planId,
    version: preview.data.version,
    itemIds: preview.data.items.map(item => item.itemId),
    confirmationToken: preview.data.confirmationToken
  }, headers)

  assert.equal(confirmed.data.planStatus, 'PARTIAL_SUCCESS')
  assert.deepEqual(confirmed.data.items.map(item => item.success), [true, false])
  assert.equal(confirmed.data.items[1].errorCode, 'PRINTER_BUSY')
  assert.equal(confirmed.data.items[1].retryable, true)
})

test('rejects a token mismatch and an expired plan without creating a job', async () => {
  setupSession()
  const preview = await request('POST', '/api/v1/print-jobs/batch/preview', {
    fileIds: [22],
    printerIds: [404],
    strategy: 'ONE_TO_ONE',
    action: 'QUEUE'
  }, headers)
  const confirmRequest = {
    planId: preview.data.planId,
    version: preview.data.version,
    itemIds: preview.data.items.map(item => item.itemId),
    confirmationToken: 'wrong-token'
  }
  await assert.rejects(
    request('POST', '/api/v1/print-jobs/batch/confirm', confirmRequest, headers),
    error => error.response.status === 409
  )

  const plan = mockState.batchPlans.find(item => item.planId === preview.data.planId)
  plan.expiresAt = new Date(Date.now() - 1).toISOString()
  confirmRequest.confirmationToken = preview.data.confirmationToken
  await assert.rejects(
    request('POST', '/api/v1/print-jobs/batch/confirm', confirmRequest, headers),
    error => error.response.status === 409 && error.response.data.message.includes('过期')
  )
  assert.equal(mockState.jobs.length, 6)
})
