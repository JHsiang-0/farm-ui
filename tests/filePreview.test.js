import test from 'node:test'
import assert from 'node:assert/strict'
import { mockRequest } from '../src/mock/index.js'
import { mockState, resetMockState } from '../src/mock/data.js'

const request = (method, url, data, headers, params) => mockRequest({ method, url, data, headers, params })
const adminHeaders = { Authorization: 'Bearer file-preview-admin' }
const operatorHeaders = { Authorization: 'Bearer file-preview-operator' }

function setupSession() {
  resetMockState()
  mockState.sessions['file-preview-admin'] = { userId: 1, username: 'admin', role: 'ADMIN' }
  mockState.sessions['file-preview-operator'] = { userId: 2, username: 'operator', role: 'OPERATOR' }
}

test('returns safe preview metadata and keeps filament length in meters', async () => {
  setupSession()
  const response = await request('GET', '/api/v1/print-files/20/preview', undefined, adminHeaders)

  assert.equal(response.data.id, 20)
  assert.equal(response.data.filamentLength, 3)
  assert.equal(response.data.estTime, 3600)
  assert.equal(response.data.previewSupported, true)
  assert.equal('fileUrl' in response.data, false)
  assert.equal('safeName' in response.data, false)
  assert.equal('rustfsKey' in response.data, false)
})

test('rejects folder preview and returns null for a missing thumbnail', async () => {
  setupSession()
  await assert.rejects(
    request('GET', '/api/v1/print-files/1/preview', undefined, adminHeaders),
    error => error.response.status === 422
  )

  const thumbnail = await request(
    'GET',
    '/api/v1/print-files/20/thumbnail',
    undefined,
    adminHeaders,
    { expires: 60 }
  )
  assert.equal(thumbnail.data, null)
})

test('returns real associated jobs with pagination and public fields only', async () => {
  setupSession()
  const response = await request(
    'GET',
    '/api/v1/print-files/20/jobs',
    undefined,
    adminHeaders,
    { pageNum: 1, pageSize: 10 }
  )

  assert.equal(response.data.total, 2)
  assert.deepEqual(response.data.records.map(job => job.id), [1001, 1005])
  assert.equal(response.data.records.every(job => job.fileId === 20), true)
  assert.equal('fileName' in response.data.records[0], false)
  assert.equal('printerName' in response.data.records[0], false)
})

test('returns an access-filtered nested file tree without internal fields', async () => {
  setupSession()
  const response = await request('GET', '/api/v1/print-files/tree', undefined, operatorHeaders)
  const rootNames = response.data.map(node => node.name)
  const testFolder = response.data.find(node => node.id === 2)

  assert.deepEqual(rootNames, ['测试文件'])
  assert.deepEqual(testFolder.children.map(node => node.id), [23])
  assert.equal(testFolder.children[0].name, 'calibration.bgcode')
  assert.equal('safeName' in testFolder, false)
  assert.equal('fileUrl' in testFolder.children[0], false)
})
