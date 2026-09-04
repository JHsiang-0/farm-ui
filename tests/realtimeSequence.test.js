import test from 'node:test'
import assert from 'node:assert/strict'
import { acceptRealtimeSequence } from '../src/utils/realtimeSequence.js'
import {
  isSupportedRealtimeVersion,
  REALTIME_PROTOCOL_VERSION,
  rememberRealtimeEvent
} from '../src/utils/realtimeProtocol.js'

test('accepts the first and contiguous WebSocket sequence', () => {
  assert.deepEqual(acceptRealtimeSequence(null, 10), { accepted: true, gap: false, nextSequence: 10 })
  assert.deepEqual(acceptRealtimeSequence(10, 11), { accepted: true, gap: false, nextSequence: 11 })
})

test('detects a gap and rejects duplicate or out-of-order events', () => {
  assert.deepEqual(acceptRealtimeSequence(10, 13), { accepted: true, gap: true, nextSequence: 13 })
  assert.deepEqual(acceptRealtimeSequence(13, 13), { accepted: false, gap: false, nextSequence: 13 })
  assert.deepEqual(acceptRealtimeSequence(13, 12), { accepted: false, gap: false, nextSequence: 13 })
})

test('keeps compatibility with messages without sequence', () => {
  assert.deepEqual(acceptRealtimeSequence(13, undefined), { accepted: true, gap: false, nextSequence: 13 })
})

test('validates the supported realtime protocol version and deduplicates event IDs', () => {
  assert.equal(REALTIME_PROTOCOL_VERSION, '1')
  assert.equal(isSupportedRealtimeVersion('1'), true)
  assert.equal(isSupportedRealtimeVersion(1), true)
  assert.equal(isSupportedRealtimeVersion('2'), false)

  const seenEventIds = new Set()
  assert.equal(rememberRealtimeEvent(seenEventIds, 'evt-1'), false)
  assert.equal(rememberRealtimeEvent(seenEventIds, 'evt-1'), true)
  assert.equal(rememberRealtimeEvent(seenEventIds, undefined), false)
  assert.equal(rememberRealtimeEvent(seenEventIds, 'evt-2', 1), false)
  assert.equal(seenEventIds.has('evt-1'), false)
  assert.equal(seenEventIds.has('evt-2'), true)
})
