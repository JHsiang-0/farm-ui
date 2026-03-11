import request from '@/utils/request'

/**
 * 打印文件管理 API 模块
 * @module api/printFile
 */

/**
 * 获取文件列表（分页）
 * @param {Object} params - 查询参数
 * @param {number} [params.pageNum=1] - 页码
 * @param {number} [params.pageSize=10] - 每页条数
 * @param {string} [params.keyword] - 搜索关键词
 * @returns {Promise<{code: number, message: string, data: {records: Array<PrintFile>, total: number}}>} 文件列表
 *
 * @typedef {Object} PrintFile
 * @property {number} id - 文件ID
 * @property {string} originalName - 原始文件名
 * @property {string} thumbnailUrl - 缩略图URL
 * @property {string} materialType - 耗材类型
 * @property {number} filamentWeight - 耗材重量(g)
 * @property {number} filamentLength - 耗材长度(mm)
 * @property {number} printCount - 打印次数
 * @property {number} successRate - 成功率(%)
 * @property {number} estTime - 预计耗时(秒)
 * @property {number} nozzleSize - 喷嘴尺寸(mm)
 * @property {string} createdAt - 创建时间
 */
export function getFileList(params) {
  return request({
    url: '/api/v1/print-files/page',
    method: 'post',
    data: params
  })
}

/**
 * 上传切片文件
 * @param {FormData} formData - 包含文件的 FormData 对象
 * @returns {Promise<{code: number, message: string, data: PrintFile}>} 上传结果
 */
export function uploadFile(formData) {
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
 * 删除单个文件
 * @param {number} id - 文件ID
 * @returns {Promise<{code: number, message: string}>} 删除结果
 */
export function deleteFile(id) {
  return request({
    url: `/api/v1/print-files/${id}`,
    method: 'delete'
  })
}

/**
 * 批量删除文件
 * @param {number[]} ids - 文件ID数组
 * @returns {Promise<{code: number, message: string}>} 删除结果
 */
export function deleteBatchFiles(ids) {
  return request({
    url: '/api/v1/print-files/batch',
    method: 'delete',
    data: { ids }
  })
}

/**
 * 下载文件
 * @param {number} id - 文件ID
 * @param {string} [fileName] - 下载后的文件名
 */
export async function downloadFile(id, fileName) {
  try {
    // 第一步：获取下载链接
    const response = await request({
      url: `/api/v1/print-files/${id}/download`,
      method: 'get'
    })

    const downloadUrl = response.data

    if (!downloadUrl) {
      throw new Error('未获取到下载链接')
    }

    // 第二步：通过 fetch 获取文件流（跨域需要 CORS 支持）
    const fileResponse = await fetch(downloadUrl, {
      method: 'GET',
      mode: 'cors'
    })

    if (!fileResponse.ok) {
      throw new Error(`下载文件失败: ${fileResponse.status}`)
    }

    // 第三步：创建 Blob 并触发下载
    const blob = await fileResponse.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = fileName || `print-file-${id}.gcode`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error('下载文件失败:', error)
    // 降级方案：直接在新窗口打开
    try {
      const response = await request({
        url: `/api/v1/print-files/${id}/download`,
        method: 'get'
      })
      if (response.data) {
        window.open(response.data, '_blank')
      }
    } catch {
      window.open(`/api/v1/print-files/${id}/download`, '_blank')
    }
  }
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
