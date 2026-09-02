import { PAGINATION } from './constants.js'

const identity = value => value

const toPositiveInteger = (value, fallback) => {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : fallback
}

/**
 * 规范化分页请求参数。
 * 前端始终发送 pageNum/pageSize，兼容逻辑只存在于响应适配层。
 */
export function normalizePageParams(params = {}) {
  const pageNum = toPositiveInteger(params.pageNum, PAGINATION.DEFAULT_PAGE_NUM)
  const requestedPageSize = toPositiveInteger(params.pageSize, PAGINATION.DEFAULT_PAGE_SIZE)
  const pageSize = Math.min(requestedPageSize, PAGINATION.MAX_PAGE_SIZE)

  return {
    ...params,
    pageNum,
    pageSize
  }
}

/**
 * 统一分页响应，兼容后端迁移前的 current/size 字段。
 */
export function normalizePageResponse(data, normalizeRecord = identity) {
  const source = data && typeof data === 'object' ? data : {}
  const pageNum = toPositiveInteger(
    source.pageNum ?? source.current,
    PAGINATION.DEFAULT_PAGE_NUM
  )
  const requestedPageSize = toPositiveInteger(
    source.pageSize ?? source.size,
    PAGINATION.DEFAULT_PAGE_SIZE
  )
  const pageSize = Math.min(requestedPageSize, PAGINATION.MAX_PAGE_SIZE)
  const total = Math.max(Number(source.total) || 0, 0)
  const records = Array.isArray(source.records) ? source.records : []

  return {
    records: records.map(normalizeRecord),
    total,
    pageNum,
    pageSize,
    pages: Math.ceil(total / pageSize)
  }
}

/**
 * 只转换统一响应中的 data，保留 code/message/timestamp。
 */
export function mapResponseData(response, mapper) {
  if (!response || typeof response !== 'object') return response

  return {
    ...response,
    data: mapper(response.data)
  }
}

/**
 * Long 类型 ID 在 JavaScript 中统一按字符串处理，避免大整数精度丢失。
 */
export function normalizeId(value) {
  if (value === undefined || value === null || value === '') return value ?? null
  return String(value)
}

const normalizeIdFields = (record, fields) => {
  if (!record || typeof record !== 'object') return record

  const normalized = { ...record }
  fields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(normalized, field)) {
      normalized[field] = normalizeId(normalized[field])
    }
  })
  return normalized
}

export function normalizePrinter(record) {
  return normalizeIdFields(record, ['id', 'currentJobId'])
}

export function normalizePrintFile(record) {
  const normalized = normalizeIdFields(record, ['id', 'parentId', 'userId'])

  if (normalized && Object.prototype.hasOwnProperty.call(normalized, 'successRate')) {
    const successRate = Number(normalized.successRate)
    normalized.successRate = Number.isFinite(successRate)
      ? Math.min(Math.max(successRate, 0), 100)
      : 0
  }

  return normalized
}

export function normalizePrintJob(record) {
  if (record !== null && typeof record !== 'object') return normalizeId(record)

  const normalized = normalizeIdFields(record, [
    'id',
    'fileId',
    'printerId',
    'userId',
    'operatorId'
  ])

  if (normalized && Object.prototype.hasOwnProperty.call(normalized, 'progress')) {
    const progress = Number(normalized.progress)
    normalized.progress = Number.isFinite(progress)
      ? Math.min(Math.max(progress, 0), 100)
      : 0
  }

  return normalized
}

export function normalizeUser(record) {
  if (record !== null && typeof record !== 'object') return normalizeId(record)
  return normalizeIdFields(record, ['id', 'userId'])
}
