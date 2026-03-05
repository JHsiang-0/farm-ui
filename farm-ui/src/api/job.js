import request from '@/utils/request'

// 获取排队中的任务 (后端现在会返回 QUEUED 和 MANUAL 状态)
export function getJobQueue() {
  return request({
    url: '/api/v1/print-jobs/queue',
    method: 'get'
  })
}

// 🚀 修改点：创建打印任务，支持 autoAssign 参数
export function createPrintJob(data) {
  return request({
    url: '/api/v1/print-jobs/create',
    method: 'post',
    data // 包含 fileId, materialType, nozzleSize, priority, autoAssign
  })
}

// 指派任务给打印机
export function assignJobToPrinter(jobId, printerId) {
  return request({
    url: `/api/v1/print-jobs/${jobId}/assign`,
    method: 'post',
    params: { printerId }
  })
}

// 取消任务
export function cancelJob(id) {
  return request({
    url: `/api/v1/print-jobs/${id}`,
    method: 'delete'
  })
}