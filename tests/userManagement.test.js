import test from 'node:test'
import assert from 'node:assert/strict'
import { mockRequest } from '../src/mock/index.js'
import { mockState, resetMockState } from '../src/mock/data.js'

const request = (method, url, data, headers) => mockRequest({ method, url, data, headers })
const adminHeaders = { Authorization: 'Bearer user-management-admin' }
const operatorHeaders = { Authorization: 'Bearer user-management-operator' }

test('returns enabled from me and blocks disabled sessions until re-enabled', async () => {
  resetMockState()
  mockState.sessions['user-management-admin'] = { userId: 1, username: 'admin', role: 'ADMIN' }
  mockState.sessions['user-management-operator'] = { userId: 2, username: 'operator', role: 'OPERATOR' }

  const profile = await request('GET', '/api/v1/auth/me', undefined, adminHeaders)
  assert.equal(profile.data.enabled, true)

  const disabled = await request('POST', '/api/v1/auth/admin/users/2/disable', undefined, adminHeaders)
  assert.equal(disabled.data.enabled, false)
  await assert.rejects(
    request('GET', '/api/v1/auth/me', undefined, operatorHeaders),
    error => error.response.status === 403
  )

  const enabled = await request('POST', '/api/v1/auth/admin/users/2/enable', undefined, adminHeaders)
  assert.equal(enabled.data.enabled, true)
  const restored = await request('GET', '/api/v1/auth/me', undefined, operatorHeaders)
  assert.equal(restored.data.enabled, true)
})

test('protects the current administrator and only creates operators', async () => {
  resetMockState()
  mockState.sessions['user-management-admin'] = { userId: 1, username: 'admin', role: 'ADMIN' }

  await assert.rejects(
    request('POST', '/api/v1/auth/admin/users/1/disable', undefined, adminHeaders),
    error => error.response.status === 409
  )
  await assert.rejects(
    request('POST', '/api/v1/auth/admin/users/999/enable', undefined, adminHeaders),
    error => error.response.status === 404
  )
  await assert.rejects(
    request('POST', '/api/v1/auth/admin/users', {
      username: 'new-operator',
      password: 'Password1',
      confirmPassword: 'Different1',
      role: 'ADMIN'
    }, adminHeaders),
    error => error.response.status === 400
  )

  const created = await request('POST', '/api/v1/auth/admin/users', {
    username: 'new-operator',
    password: 'Password1',
    confirmPassword: 'Password1',
    role: 'ADMIN'
  }, adminHeaders)
  const user = mockState.users.find(item => item.id === created.data)
  assert.equal(user.role, 'OPERATOR')
  assert.equal(user.enabled, true)
})
