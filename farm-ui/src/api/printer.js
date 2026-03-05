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

// 🚀 新增：扫描局域网设备
export function scanPrinters(subnet) {
  return request({
    url: '/api/v1/printers/scan',
    method: 'get',
    params: { subnet }
  })
}

// 🚀 新增：批量添加设备
export function batchAddPrinters(ips) {
  return request({
    url: '/api/v1/printers/batch-add',
    method: 'post',
    data: ips // 直接传入 IP 数组
  })
}