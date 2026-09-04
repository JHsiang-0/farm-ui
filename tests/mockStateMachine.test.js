import test from 'node:test'
import assert from 'node:assert/strict'
import { canTransitionMockJob, transitionMockJob } from '../src/mock/stateMachine.js'

test('accepts the canonical Mock job lifecycle and recovery transitions', () => {
  const flow = ['QUEUED', 'ASSIGNED', 'UPLOADING', 'READY', 'PRINTING', 'PAUSED', 'PRINTING', 'RECONCILING', 'COMPLETED']

  flow.slice(1).forEach((status, index) => {
    assert.equal(canTransitionMockJob(flow[index], status), true)
    assert.equal(transitionMockJob(flow[index], status), status)
  })

  assert.equal(canTransitionMockJob('COMPLETED', 'PRINTING'), false)
  assert.throws(() => transitionMockJob('COMPLETED', 'PRINTING'), /非法任务状态转移/)
})

test('allows only explicit terminal and queue recovery transitions', () => {
  assert.equal(canTransitionMockJob('FAILED', 'FAILED'), true)
  assert.equal(canTransitionMockJob('FAILED', 'QUEUED'), true)
  assert.equal(canTransitionMockJob('ASSIGNED', 'QUEUED'), true)
  assert.equal(canTransitionMockJob('READY', 'QUEUED'), true)
  assert.equal(canTransitionMockJob('PRINTING', 'CANCELLED'), true)
  assert.equal(canTransitionMockJob('RECONCILING', 'FAILED'), true)
})
