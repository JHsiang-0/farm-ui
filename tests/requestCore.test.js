import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getErrorContext,
  getErrorMessage,
  isBinaryResponse,
  isSuccessfulEnvelope,
  normalizeResponseEnvelope,
  RequestError
} from '../src/utils/requestCore.js'

test('normalizes unified success envelopes without changing API compatibility', () => {
  const response = normalizeResponseEnvelope({
    code: 200,
    message: '操作成功',
    data: '9007199254740993',
    timestamp: 1756790000000
  })

  assert.deepEqual(response, {
    code: 200,
    message: '操作成功',
    data: '9007199254740993',
    timestamp: 1756790000000
  })
  assert.equal(isSuccessfulEnvelope(response), true)
})

test('supports null, 204, and legacy bare success payloads', () => {
  const normalizedNull = normalizeResponseEnvelope(null)
  assert.equal(normalizedNull.code, 200)
  assert.equal(normalizedNull.message, '')
  assert.equal(normalizedNull.data, null)
  assert.equal(typeof normalizedNull.timestamp, 'number')

  const empty = normalizeResponseEnvelope(null, 204)
  assert.equal(empty.code, 204)
  assert.equal(empty.data, null)
  assert.equal(isSuccessfulEnvelope(empty, 204), true)

  const legacy = normalizeResponseEnvelope({ id: 7 })
  assert.deepEqual(legacy.data, { id: 7 })
  assert.equal(legacy.code, 200)
})

test('maps HTTP and business errors to contextual RequestError fields', () => {
  const response = {
    status: 503,
    data: {
      code: 5003,
      message: '',
      data: { retryable: true },
      timestamp: 1756790000000
    }
  }
  const error = new RequestError({
    message: getErrorMessage({ code: 5003, status: 503, responseMessage: response.data.message }),
    code: 5003,
    status: response.status,
    data: response.data.data,
    timestamp: response.data.timestamp,
    context: getErrorContext(5003, 503),
    response
  })

  assert.equal(error.name, 'RequestError')
  assert.equal(error.code, 5003)
  assert.equal(error.businessCode, 5003)
  assert.equal(error.status, 503)
  assert.equal(error.httpStatus, 503)
  assert.deepEqual(error.data, { retryable: true })
  assert.equal(error.timestamp, 1756790000000)
  assert.equal(error.context, 'service-unavailable')
  assert.equal(error.response.data.code, 5003)
  assert.equal(error.isRequestError, true)
})

test('prefers backend message and maps important error contexts', () => {
  assert.equal(getErrorMessage({ code: 409, status: 409, responseMessage: '名称已存在' }), '名称已存在')
  assert.equal(getErrorMessage({ code: 10002, status: 409 }), '打印机当前忙碌，请稍后重试')
  assert.equal(getErrorContext(10003, 422), 'validation')
  assert.equal(getErrorContext(401, 200), 'unauthorized')
  assert.equal(getErrorMessage({ originalCode: 'ECONNABORTED' }), '请求超时，请检查后端服务是否正常运行')
})

test('treats binary payloads and configured binary responses as exceptions', () => {
  const blob = new Blob(['gcode'], { type: 'text/plain' })
  assert.equal(isBinaryResponse(blob), true)
  assert.equal(isBinaryResponse({ ok: true }, { responseType: 'blob' }), true)
  assert.equal(isBinaryResponse({ ok: true }), false)
})
