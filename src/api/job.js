import request from '@/utils/request'

/**
 * 打印任务 API 模块
 * @module api/job
 */

/**
 * 获取排队中的任务列表
 * 返回 QUEUED 和 MANUAL 状态的任务
 * @returns {Promise<{code: number, message: string, data: Array<PrintJob>}>} 任务队列
 */
export function getJobQueue() {
  return request({
    url: '/api/v1/print-jobs/queue',
    method: 'get'
  })
}

/**
 * 创建打印任务
 * @param {Object} data - 任务参数
 * @param {number} data.fileId - 文件ID
 * @param {string} [data.materialType] - 耗材类型
 * @param {string} [data.nozzleSize] - 喷头尺寸
 * @param {string} [data.priority='NORMAL'] - 优先级（HIGH/NORMAL/LOW）
 * @param {boolean} [data.autoAssign=false] - 是否自动分配打印机
 * @returns {Promise<{code: number, message: string, data: PrintJob}>} 创建结果
 */
export function createPrintJob(data) {
  return request({
    url: '/api/v1/print-jobs/create',
    method: 'post',
    data
  })
}

/**
 * 指派任务给指定打印机（仅分配，不触发打印）- 安全模式第一步
 * @param {number} jobId - 任务ID
 * @param {number} printerId - 打印机ID
 * @returns {Promise<{code: number, message: string, data: PrintJob}>} 指派结果
 */
export function assignJobToPrinter(jobId, printerId) {
  return request({
    url: '/api/v1/print-jobs/safe/assign',
    method: 'post',
    data: { jobId, printerId }
  })
}

/**
 * 启动任务打印（现场启动打印）- 安全模式第二步之二
 * @param {number} jobId - 任务ID
 * @param {string} [action='START_PRINT'] - 操作类型：'START_PRINT' 或 'UPLOAD_ONLY'
 * @returns {Promise<{code: number, message: string, data: PrintJob}>} 启动结果
 */
export function startJob(jobId, action = 'START_PRINT') {
  return request({
    url: '/api/v1/print-jobs/safe/start',
    method: 'post',
    data: { jobId, action }
  })
}

/**
 * 取消/删除打印任务
 * @param {number} id - 任务ID
 * @returns {Promise<{code: number, message: string}>} 取消结果
 */
export function cancelJob(id) {
  return request({
    url: `/api/v1/print-jobs/${id}`,
    method: 'delete'
  })
}

/**
 * 获取打印任务分页列表（支持高级检索）
 * @param {Object} params - 查询参数
 * @param {number} params.pageNum - 页码
 * @param {number} params.pageSize - 每页大小
 * @param {string} [params.status] - 任务状态
 * @param {number} [params.printerId] - 打印机ID
 * @param {string} [params.startTime] - 开始时间（ISO格式）
 * @param {string} [params.endTime] - 结束时间（ISO格式）
 * @returns {Promise<{code: number, message: string, data: {records: Array<PrintJob>, total: number}}>} 分页结果
 */
export function getJobPage(params) {
  return request({
    url: '/api/v1/print-jobs/page',
    method: 'post',
    data: params
  })
}

// ============================================
// Type Definitions (JSDoc)
// ============================================

/**
 * @typedef {Object} PrintJob
 * @property {number} id - 任务ID
 * @property {number} fileId - 关联文件ID
 * @property {string} fileName - 文件名称
 * @property {number} [printerId] - 分配的打印机ID
 * @property {string} [printerName] - 打印机名称
 * @property {string} status - 任务状态（QUEUED/MANUAL/PRINTING/COMPLETED/FAILED/CANCELLED）
 * @property {string} priority - 优先级（HIGH/NORMAL/LOW）
 * @property {string} [materialType] - 耗材类型
 * @property {string} [nozzleSize] - 喷头尺寸
 * @property {number} progress - 打印进度（0-100）
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 */
