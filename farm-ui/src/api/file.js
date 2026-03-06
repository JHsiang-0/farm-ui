import request from '@/utils/request'

/**
 * 文件管理 API 模块
 * @module api/file
 */

/**
 * 获取文件列表（分页）
 * @param {Object} data - 查询参数
 * @param {number} [data.pageNum=1] - 页码
 * @param {number} [data.pageSize=10] - 每页条数
 * @param {string} [data.keyword] - 搜索关键词
 * @returns {Promise<{code: number, message: string, data: {records: Array<PrintFile>, total: number}}>} 文件列表
 */
export function getFileList(data) {
  return request({
    url: '/api/v1/print-files/page',
    method: 'post',
    data
  })
}

/**
 * 上传切片文件
 * @param {FormData} formData - 包含文件的 FormData 对象
 * @param {File} formData.file - 切片文件（.gcode/.bgcode 等）
 * @param {string} [formData.name] - 文件名称
 * @returns {Promise<{code: number, message: string, data: PrintFile}>} 上传结果
 */
export function uploadPrintFile(formData) {
  return request({
    url: '/api/v1/print-files/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 创建打印任务
 * @param {Object} data - 任务参数
 * @param {number} data.fileId - 文件ID
 * @param {number} data.printerId - 打印机ID
 * @param {string} [data.priority] - 优先级（HIGH/NORMAL/LOW）
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
 * 删除打印文件
 * @param {number} id - 文件ID
 * @returns {Promise<{code: number, message: string}>} 删除结果
 */
export function deletePrintFile(id) {
  return request({
    url: `/api/v1/print-files/${id}`,
    method: 'delete'
  })
}

// ============================================
// Type Definitions (JSDoc)
// ============================================

/**
 * @typedef {Object} PrintFile
 * @property {number} id - 文件ID
 * @property {string} name - 文件名称
 * @property {string} originalName - 原始文件名
 * @property {string} path - 文件存储路径
 * @property {number} size - 文件大小（字节）
 * @property {string} type - 文件类型（GCODE/BGCODE）
 * @property {string} status - 文件状态
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 */

/**
 * @typedef {Object} PrintJob
 * @property {number} id - 任务ID
 * @property {number} fileId - 关联文件ID
 * @property {number} printerId - 关联打印机ID
 * @property {string} status - 任务状态（PENDING/PRINTING/COMPLETED/FAILED）
 * @property {string} priority - 优先级
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 */
