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
