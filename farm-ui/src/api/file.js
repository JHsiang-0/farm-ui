import request from '@/utils/request'

// 获取文件列表 (假设后端有这个分页接口)
export function getFileList(data) {
  return request({
    url: '/api/v1/print-files/page',
    method: 'post',
    data
  })
}

// 上传切片文件
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

// 创建打印任务
export function createPrintJob(data) {
  return request({
    url: '/api/v1/print-jobs/create',
    method: 'post',
    data
  })
}

// 删除文件
export function deletePrintFile(id) {
  return request({
    url: `/api/v1/print-files/${id}`,
    method: 'delete'
  })
}