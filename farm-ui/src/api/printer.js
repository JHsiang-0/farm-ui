import request from '@/utils/request'

export function getPrinterList(params) {
  return request({
    url: '/api/v1/printers/page',
    method: 'get',
    params // 接收分页参数 pageNum 和 pageSize
  })
}

export function addPrinter(data) {
  return request({
    url: '/api/v1/printers/add',
    method: 'post',
    data
  })
}

export function updatePrinter(data) {
  return request({
    url: '/api/v1/printers/update',
    method: 'put',
    data
  })
}

export function deletePrinter(id) {
  return request({
    url: `/api/v1/printers/delete/${id}`,
    method: 'delete'
  })
}

// 🚀 扫描局域网设备（新契约）
// 返回: [{ ipAddress, macAddress, isNewDevice, status, suggestedName }]
export function scanPrinters(subnet) {
  return request({
    url: '/api/v1/printers/scan',
    method: 'get',
    params: { subnet }
  })
}

// 🚀 批量添加/同步设备（新契约）
// 请求体: [{ ipAddress, macAddress, name }]
export function batchAddPrinters(devices) {
  return request({
    url: '/api/v1/printers/batch-add',
    method: 'post',
    data: devices // 传入设备对象数组
  })
}

// ============================================
// 数字孪生看板 - 设备位置管理 API
// ============================================

/**
 * 获取未分配位置的设备列表
 * @returns {Promise} 返回未分配设备的数组
 */
export function getUnallocatedPrinters() {
  return request({
    url: '/api/v1/printers/unallocated',
    method: 'get'
  })
}

/**
 * 批量更新设备位置（绑定/解绑/移动）
 * @param {Array} positions - 位置更新数组，格式: [{ id, gridRow, gridCol }]
 * @returns {Promise}
 */
export function batchUpdatePositions(positions) {
  return request({
    url: '/api/v1/printers/positions',
    method: 'put',
    data: positions
  })
}
