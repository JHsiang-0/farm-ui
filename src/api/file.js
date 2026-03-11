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
 * @returns {Promise<{code: number, message: string, data: {records: Array<FarmPrintFile>, total: number}}>} 文件列表
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
 * @returns {Promise<{code: number, message: string, data: FarmPrintFile}>} 上传结果
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
 * @param {string} [data.materialType] - 耗材类型
 * @param {number} [data.nozzleSize] - 喷嘴尺寸
 * @param {number} [data.priority] - 优先级
 * @param {boolean} [data.autoAssign] - 是否自动分配
 * @returns {Promise<{code: number, message: string, data: any}>} 创建结果
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

/**
 * 批量删除打印文件
 * @param {number[]} ids - 文件ID数组
 * @returns {Promise<{code: number, message: string}>} 删除结果
 */
export function deleteBatch(ids) {
  return request({
    url: '/api/v1/print-files/batch',
    method: 'delete',
    data: { ids }
  })
}

/**
 * 下载打印文件
 * @param {number} id - 文件ID
 * @param {string} [fileName] - 下载后的文件名
 */
export function downloadPrintFile(id, fileName) {
  const url = `/api/v1/print-files/${id}/download`

  // 使用 fetch 获取二进制流并触发下载
  fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('下载失败')
      }
      return response.blob()
    })
    .then(blob => {
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName || `print-file-${id}.gcode`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    })
    .catch(error => {
      console.error('下载文件失败:', error)
      // 如果 fetch 失败，尝试直接跳转
      window.open(url, '_blank')
    })
}

// ============================================
// Type Definitions (JSDoc)
// ============================================

/**
 * @typedef {Object} FarmPrintFile
 * @property {number} id - 文件ID
 * @property {string} name - 文件名称
 * @property {string} originalName - 原始文件名
 * @property {string} path - 文件存储路径
 * @property {number} fileSize - 文件大小（字节）
 * @property {string} type - 文件类型（GCODE/BGCODE）
 * @property {string} status - 文件状态
 * @property {string} thumbnailUrl - 缩略图URL
 * @property {number} filamentWeight - 耗材重量(g)
 * @property {number} filamentLength - 耗材长度(mm)
 * @property {number} printCount - 打印次数
 * @property {number} successRate - 成功率(%)
 * @property {number} estTime - 预计耗时(秒)
 * @property {string} materialType - 指定耗材类型
 * @property {number} nozzleSize - 喷嘴尺寸(mm)
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
