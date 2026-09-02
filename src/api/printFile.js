import request from '@/utils/request'
import {
  mapResponseData,
  normalizePageParams,
  normalizePageResponse,
  normalizePrintFile
} from '@/utils/dataAdapters'

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
export function getFileList(params = {}) {
  return request({
    url: '/api/v1/print-files/page',
    method: 'post',
    data: normalizePageParams(params)
  }).then(response => mapResponseData(
    response,
    data => normalizePageResponse(data, normalizePrintFile)
  ))
}

/**
 * 创建文件夹
 * @param {Object} data - 文件夹参数
 * @param {number} [data.parentId] - 父文件夹ID
 * @param {string} data.folderName - 文件夹名称
 * @returns {Promise<{code: number, message: string, data: any}>} 创建结果
 */
export function createFolder(data) {
  return request({
    url: '/api/v1/print-files/folder/create',
    method: 'post',
    data
  }).then(response => mapResponseData(response, normalizePrintFile))
}

/**
 * 上传切片文件
 * @param {FormData} formData - 包含文件的 FormData 对象
 * @returns {Promise<{code: number, message: string, data: PrintFile}>} 上传结果
 */
export function uploadFile(formData, onUploadProgress, options = {}) {
  return request({
    url: '/api/v1/print-files/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress,
    ...options
  }).then(response => mapResponseData(response, normalizePrintFile))
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

export class DownloadFileError extends Error {
  constructor(message, code, status) {
    super(message)
    this.name = 'DownloadFileError'
    this.code = code
    this.status = status
  }
}

const getDownloadUrl = data => {
  if (typeof data === 'string' && data.trim()) return data.trim()
  if (data && typeof data === 'object') {
    const url = data.url || data.downloadUrl
    if (typeof url === 'string' && url.trim()) return url.trim()
  }
  return ''
}

/**
 * 下载文件：先获取预签名 URL，再通过 Blob 下载；跨域不支持时回退到该预签名 URL。
 * @param {number|string} id - 文件ID
 * @param {string} [fileName] - 下载后的文件名
 */
export async function downloadFile(id, fileName) {
  const response = await request({
    url: `/api/v1/print-files/${id}/download`,
    method: 'get'
  })
  const downloadUrl = getDownloadUrl(response.data)

  if (!downloadUrl) {
    throw new DownloadFileError('下载链接为空，请稍后重试', 'DOWNLOAD_URL_EMPTY')
  }

  try {
    const fileResponse = await fetch(downloadUrl, {
      method: 'GET',
      mode: 'cors'
    })

    if (!fileResponse.ok) {
      const isExpiredOrForbidden = [401, 403, 410].includes(fileResponse.status)
      throw new DownloadFileError(
        isExpiredOrForbidden
          ? '下载链接已过期或无权访问，请重新下载'
          : `下载文件失败（${fileResponse.status}）`,
        isExpiredOrForbidden ? 'DOWNLOAD_URL_EXPIRED' : 'DOWNLOAD_FAILED',
        fileResponse.status
      )
    }

    const blob = await fileResponse.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = fileName || `print-file-${id}.gcode`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 0)
  } catch (error) {
    if (error instanceof DownloadFileError) throw error

    // 预签名 URL 仍然有效时，浏览器可直接跳转完成下载，避免受 Blob CORS 限制。
    const opened = window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    if (!opened) {
      throw new DownloadFileError('无法打开下载链接，请检查浏览器拦截设置', 'DOWNLOAD_OPEN_FAILED')
    }
  }
}
