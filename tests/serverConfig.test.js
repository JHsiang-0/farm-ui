import assert from 'node:assert/strict'
import test from 'node:test'

const storage = new Map()
globalThis.window = {
  localStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  },
  location: { protocol: 'http:', host: '127.0.0.1:5173' }
}

const {
  clearServerConfig,
  getApiBaseUrl,
  getServerConfig,
  getWebSocketBaseUrl,
  normalizeServerUrl,
  saveServerConfig
} = await import('../src/utils/serverConfig.js')

test('normalizes and validates server URLs without accepting credentials or unsupported protocols', () => {
  assert.equal(normalizeServerUrl(' http://192.168.0.10:8080/ '), 'http://192.168.0.10:8080')
  assert.equal(normalizeServerUrl('ftp://192.168.0.10:8080'), '')
  assert.equal(normalizeServerUrl('http://user:password@192.168.0.10:8080'), '')
})

test('uses the saved server endpoint for HTTP and derives its WebSocket endpoint', () => {
  saveServerConfig({ apiBaseUrl: 'http://192.168.0.10:8080' })
  assert.equal(getApiBaseUrl(), 'http://192.168.0.10:8080')
  assert.equal(getWebSocketBaseUrl(), 'ws://192.168.0.10:8080/ws/farm-status')
  assert.deepEqual(getServerConfig(), {
    apiBaseUrl: 'http://192.168.0.10:8080',
    wsUrl: ''
  })
})

test('prefers an explicitly saved WebSocket endpoint and clears only connection settings', () => {
  saveServerConfig({
    apiBaseUrl: 'https://farm.example.com',
    wsUrl: 'wss://socket.example.com/ws/farm-status'
  })
  assert.equal(getWebSocketBaseUrl(), 'wss://socket.example.com/ws/farm-status')
  clearServerConfig()
  assert.equal(getServerConfig().apiBaseUrl, '')
})
