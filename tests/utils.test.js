import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeId,
  normalizePageParams,
  normalizePageResponse,
  normalizePrintJob,
  normalizePrintFile
} from '../src/utils/dataAdapters.js'
import { formatFileSize, normalizeProgress } from '../src/utils/formatters.js'
import {
  getRealtimeAlertClearId,
  toRealtimeAlert,
  toRealtimeSnapshotEntries
} from '../src/utils/realtimeAlerts.js'

test('normalizes pagination params and legacy pagination responses', () => {
  assert.deepEqual(normalizePageParams({ pageNum: 3, pageSize: 200 }), {
    pageNum: 3,
    pageSize: 100
  })

  const page = normalizePageResponse({ current: 2, size: 20, total: 41, records: [{ id: 1 }] })
  assert.equal(page.pageNum, 2)
  assert.equal(page.pageSize, 20)
  assert.equal(page.pages, 3)
})

test('keeps long identifiers as strings and clamps job progress', () => {
  assert.equal(normalizeId(9007199254740993n), '9007199254740993')
  assert.deepEqual(normalizePrintJob({ id: 123, fileId: 456, progress: 120 }), {
    id: '123',
    fileId: '456',
    progress: 100
  })
})

test('normalizes progress and formats file sizes safely', () => {
  assert.equal(normalizeProgress(-10), 0)
  assert.equal(normalizeProgress(120), 100)
  assert.equal(formatFileSize(1024), '1.00 KB')
  assert.equal(formatFileSize(-1), '-')
})

test('normalizes the unified folder flag and removes the legacy field', () => {
  assert.deepEqual(normalizePrintFile({ id: 9, isFolder: 1 }), {
    id: '9',
    folder: true
  })
  assert.equal(normalizePrintFile({ id: 10, folder: false }).folder, false)
})

test('creates deduplicable alerts for offline printers and failed jobs', () => {
  assert.deepEqual(toRealtimeAlert({
    type: 'PRINTER_OFFLINE',
    printerId: 62,
    data: { reason: '设备无响应' }
  }), {
    id: 'printer-offline:62',
    theme: 'warning',
    title: '打印机 #62 已离线',
    message: '设备无响应'
  })

  assert.deepEqual(toRealtimeAlert({
    type: 'JOB_STATUS',
    printerId: 62,
    data: { jobId: 9, status: 'FAILED', errorReason: '喷嘴温度异常' }
  }), {
    id: 'job-failed:9',
    theme: 'danger',
    title: '打印任务 #9 执行失败',
    message: '喷嘴温度异常'
  })
})

test('clears alerts when the printer recovers or a job leaves FAILED', () => {
  assert.equal(getRealtimeAlertClearId({
    type: 'PRINTER_STATUS',
    printerId: 62,
    data: { unifiedState: 'IDLE' }
  }), 'printer-offline:62')
  assert.equal(getRealtimeAlertClearId({
    type: 'JOB_STATUS',
    data: { jobId: 9, status: 'PRINTING' }
  }), 'job-failed:9')
  assert.equal(getRealtimeAlertClearId({
    type: 'PRINTER_STATUS',
    printerId: 62,
    data: { unifiedState: 'UNKNOWN' }
  }), null)
})

test('maps the backend SNAPSHOT data.printers payload into printer entries', () => {
  assert.deepEqual(toRealtimeSnapshotEntries({
    printers: [{ id: 62, name: 'RRF-01', status: 'IDLE' }]
  }), [{
    printerId: 62,
    data: { id: 62, name: 'RRF-01', status: 'IDLE' }
  }])
})
