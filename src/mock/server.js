import { cloneMockData } from './data.js'

const removeFields = (value, fields) => {
  const data = cloneMockData(value)
  fields.forEach(field => delete data[field])
  return data
}

/**
 * 将内部文件对象转换为正式 PrintFileVO，下载地址等内部字段不得出现在响应中。
 */
export const toPublicFile = file => removeFields(file, [
  'safeName',
  'fileUrl',
  'rustfsKey',
  'apiKey',
  'isFolder',
  'estimatedSeconds'
])

/**
 * 将内部打印机对象转换为正式 PrinterVO，避免输出人为拼接的任务摘要。
 */
export const toPublicPrinter = printer => removeFields(printer, [
  'apiKey',
  'currentJobStatus',
  'currentJobFileName'
])

/**
 * 将内部任务对象转换为正式 PrintJobVO，不输出文件/打印机嵌套摘要或旧结束时间。
 */
export const toPublicJob = job => removeFields(job, [
  'fileName',
  'printerName',
  'materialType',
  'nozzleSize',
  'endedAt'
])
