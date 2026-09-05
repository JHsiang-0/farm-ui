import assert from 'node:assert/strict'
import test from 'node:test'
import { capMapSize, countBy } from '../src/utils/realtimePerformance.js'

test('状态统计通过单次遍历生成稳定计数', () => {
  const counts = countBy([
    { status: 'PRINTING' },
    { status: 'IDLE' },
    { status: 'PRINTING' },
    { status: 'OFFLINE' }
  ], item => item.status)

  assert.equal(counts.PRINTING, 2)
  assert.equal(counts.IDLE, 1)
  assert.equal(counts.OFFLINE, 1)
})

test('缓存限制保留最新插入的条目', () => {
  const capped = capMapSize(new Map([['a', 1], ['b', 2], ['c', 3]]), 2)
  assert.deepEqual([...capped.keys()], ['b', 'c'])
})
