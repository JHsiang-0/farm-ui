import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAuditLog, normalizePageParams, normalizePageResponse } from '../src/utils/dataAdapters.js'
import { mockRequest } from '../src/mock/index.js'
import { mockState, resetMockState } from '../src/mock/data.js'

test('normalizes audit log IDs and strips fields outside the formal safe contract', () => {
  const record = normalizeAuditLog({
    id: '9007199254740993',
    actorId: 7,
    actorUsername: 'admin',
    actorRole: 'ADMIN',
    action: 'JOB_CREATE',
    targetType: 'JOB',
    targetId: 42,
    targetLabel: '打印任务 #42',
    result: 'SUCCESS',
    errorCode: null,
    occurredAt: '2026-09-05T10:00:00',
    traceId: 'trace-1',
    password: 'must-not-render',
    requestBody: { token: 'must-not-render' }
  })

  assert.deepEqual(record, {
    id: '9007199254740993',
    actorId: '7',
    actorUsername: 'admin',
    actorRole: 'ADMIN',
    action: 'JOB_CREATE',
    targetType: 'JOB',
    targetId: '42',
    targetLabel: '打印任务 #42',
    result: 'SUCCESS',
    errorCode: null,
    occurredAt: '2026-09-05T10:00:00',
    traceId: 'trace-1'
  })
})

test('uses the audit page contract page size and preserves stable pagination fields', () => {
  const params = normalizePageParams({ pageSize: 20 })
  assert.equal(params.pageNum, 1)
  assert.equal(params.pageSize, 20)

  const page = normalizePageResponse({
    records: [{ id: 1, actorId: 1, result: 'SUCCESS' }],
    total: 21,
    pageNum: 2,
    pageSize: 20,
    pages: 2
  }, normalizeAuditLog)
  assert.equal(page.pageNum, 2)
  assert.equal(page.pageSize, 20)
  assert.equal(page.total, 21)
  assert.equal(page.pages, 2)
  assert.equal(page.records[0].id, '1')
})

test('mock audit log endpoint enforces ADMIN access and formal filters', async () => {
  resetMockState()
  mockState.sessions.auditAdmin = { userId: 1, username: 'admin', role: 'ADMIN' }
  mockState.sessions.auditOperator = { userId: 2, username: 'operator', role: 'OPERATOR' }

  const response = await mockRequest({
    method: 'GET',
    url: '/api/v1/auth/admin/audit-logs',
    params: { pageNum: 1, pageSize: 20, action: 'JOB_CANCEL', result: 'SUCCESS' },
    headers: { Authorization: 'Bearer auditAdmin' }
  })

  assert.equal(response.data.records.length, 1)
  assert.equal(response.data.records[0].action, 'JOB_CANCEL')
  assert.equal(response.data.records[0].password, undefined)
  await assert.rejects(
    mockRequest({
      method: 'GET',
      url: '/api/v1/auth/admin/audit-logs',
      headers: { Authorization: 'Bearer auditOperator' }
    }),
    error => error.response.status === 403
  )
  resetMockState()
})
