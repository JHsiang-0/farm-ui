import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSevenDayJobTrend, buildStatusSummary } from '../src/utils/dashboardMetrics.js'

test('状态看板区分离线未知并计算状态占比', () => {
  const summary = buildStatusSummary({ PRINTING: 2, UNKNOWN: 1 })
  assert.equal(summary.total, 3)
  assert.equal(summary.items.find(item => item.key === 'PRINTING').percent, 67)
  assert.equal(summary.items.find(item => item.key === 'UNKNOWN').label, '离线/未知')
})

test('历史趋势只统计最近七天且使用真实任务时间字段', () => {
  const trend = buildSevenDayJobTrend([
    { id: 1, completedAt: '2026-09-05T10:00:00Z' },
    { id: 2, createdAt: '2026-09-01T10:00:00Z' },
    { id: 3, createdAt: '2026-08-20T10:00:00Z' }
  ], '2026-09-05T12:00:00Z')
  assert.equal(trend.length, 7)
  assert.equal(trend.at(-1).count, 1)
  assert.equal(trend.reduce((sum, item) => sum + item.count, 0), 2)
})
