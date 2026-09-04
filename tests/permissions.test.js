import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveRouteAccess, ROUTE_ACCESS } from '../src/utils/permissions.js'

const base = {
  requiresAuth: true,
  roleRequirements: [['ADMIN', 'OPERATOR']],
  token: 'token',
  restoreState: 'authenticated',
  role: 'OPERATOR'
}

test('requires login before protected routes', () => {
  assert.equal(resolveRouteAccess({ ...base, token: '' }), ROUTE_ACCESS.LOGIN_REQUIRED)
})

test('requires server identity restoration for stored tokens', () => {
  assert.equal(resolveRouteAccess({ ...base, restoreState: 'restoring' }), ROUTE_ACCESS.RESTORE_REQUIRED)
  assert.equal(resolveRouteAccess({ ...base, path: '/login', restoreState: 'restoring' }), ROUTE_ACCESS.RESTORE_REQUIRED)
})

test('allows both supported roles and redirects an authenticated user away from login', () => {
  assert.equal(resolveRouteAccess(base), ROUTE_ACCESS.ALLOW)
  assert.equal(resolveRouteAccess({ ...base, role: 'ADMIN' }), ROUTE_ACCESS.ALLOW)
  assert.equal(resolveRouteAccess({ ...base, path: '/login' }), ROUTE_ACCESS.AUTHENTICATED_LOGIN)
})

test('blocks unknown roles and ADMIN-only routes', () => {
  assert.equal(resolveRouteAccess({ ...base, role: 'CUSTOMER' }), ROUTE_ACCESS.UNKNOWN_ROLE)
  assert.equal(resolveRouteAccess({
    ...base,
    roleRequirements: [['ADMIN']],
    role: 'OPERATOR'
  }), ROUTE_ACCESS.FORBIDDEN)
})

test('allows the public login route without a session', () => {
  assert.equal(resolveRouteAccess({
    path: '/login',
    requiresAuth: false,
    roleRequirements: [],
    token: '',
    restoreState: 'anonymous',
    role: ''
  }), ROUTE_ACCESS.ALLOW)
})
