import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateExpiresAt,
  createAuthSession,
  isSessionExpired,
  normalizeAuthIdentity,
  refreshAuthSession
} from '../src/utils/authSession.js'

test('normalizes login identity and keeps Long IDs as strings', () => {
  const identity = normalizeAuthIdentity({
    userId: 9007199254740993n,
    username: 'operator',
    role: 'operator'
  })

  assert.deepEqual(identity, {
    userId: '9007199254740993',
    id: '9007199254740993',
    username: 'operator',
    role: 'OPERATOR'
  })
})

test('creates an expiring session from LoginResult expiresIn seconds', () => {
  const session = createAuthSession({
    token: 'token-value',
    expiresIn: 604800,
    userId: 7,
    username: 'admin',
    role: 'ADMIN'
  }, 1_000)

  assert.equal(session.token, 'token-value')
  assert.equal(session.expiresIn, 604800)
  assert.equal(session.expiresAt, 604801000)
  assert.equal(isSessionExpired(session.expiresAt, 604800999), false)
  assert.equal(isSessionExpired(session.expiresAt, 604801000), true)
  assert.equal(calculateExpiresAt('invalid', 1_000), null)
})

test('rejects unknown roles or incomplete login responses', () => {
  assert.equal(normalizeAuthIdentity({ id: 1, username: 'x', role: 'CUSTOMER' }), null)
  assert.equal(createAuthSession({ token: 'token', expiresIn: 60, userId: 1, username: 'x' }), null)
  assert.equal(createAuthSession({ token: 'token', expiresIn: 0, userId: 1, username: 'x', role: 'ADMIN' }), null)
})

test('refreshes the stored session from the trusted /auth/me profile', () => {
  const session = {
    token: 'token-value',
    expiresIn: 60,
    expiresAt: 61_000,
    userInfo: { userId: '1', id: '1', username: 'stale', role: 'OPERATOR' }
  }
  const refreshed = refreshAuthSession(session, {
    id: 1,
    username: 'admin',
    role: 'ADMIN',
    email: 'admin@farm.local'
  })

  assert.equal(refreshed.userInfo.username, 'admin')
  assert.equal(refreshed.userInfo.role, 'ADMIN')
  assert.equal(refreshed.userInfo.email, 'admin@farm.local')
  assert.equal(refreshed.token, 'token-value')
  assert.equal(refreshAuthSession(session, { id: 1, username: 'x', role: 'CUSTOMER' }), null)
})
