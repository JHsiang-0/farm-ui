import request from '@/utils/request'

/**
 * 打印机设备 API 模块
 * @module api/printer
 */

/**
 * 分页查询打印机列表
 * @param {Object} params - 查询参数
 * @param {number} [params.pageNum=1] - 页码
 * @param {number} [params.pageSize=10] - 每页条数
 * @returns {Promise<{code: number, message: string, data: {records: Array<Printer>, total: number, pageNum: number, pageSize: number}}>} 分页结果
 */
export function getPrinterList(params) {
  return request({
    url: '/api/v1/printers/page',
    method: 'get',
    params
  })
}

/**
 * 新增打印机设备
 * @param {Object} data - 打印机数据
 * @param {string} data.name - 设备名称
 * @param {string} data.ipAddress - IP地址
 * @param {string} data.macAddress - MAC地址
 * @param {string} [data.firmwareType] - 固件类型
 * @param {string} [data.nozzleSize] - 喷头尺寸
 * @returns {Promise<{code: number, message: string, data: Printer}>} 创建结果
 */
export function addPrinter(data) {
  return request({
    url: '/api/v1/printers/add',
    method: 'post',
    data
  })
}

/**
 * 更新打印机信息
 * @param {Object} data - 打印机数据
 * @param {number} data.id - 设备ID
 * @param {string} [data.name] - 设备名称
 * @param {string} [data.machineNumber] - 机器编号
 * @param {string} [data.ipAddress] - IP地址
 * @param {string} [data.status] - 设备状态
 * @returns {Promise<{code: number, message: string, data: Printer}>} 更新结果
 */
export function updatePrinter(data) {
  return request({
    url: '/api/v1/printers/update',
    method: 'put',
    data
  })
}

/**
 * 删除打印机设备
 * @param {number} id - 设备ID
 * @returns {Promise<{code: number, message: string}>} 删除结果
 */
export function deletePrinter(id) {
  return request({
    url: `/api/v1/printers/delete/${id}`,
    method: 'delete'
  })
}

/**
 * 扫描局域网内的打印机设备
 * @param {string} subnet - 子网地址（如：192.168.1）
 * @returns {Promise<{code: number, message: string, data: Array<ScannedDevice>}>} 扫描结果
 */
export function scanPrinters(subnet) {
  return request({
    url: '/api/v1/printers/scan',
    method: 'get',
    params: { subnet }
  })
}

/**
 * 批量添加/同步打印机设备
 * @param {Array<Object>} devices - 设备数组
 * @param {string} devices[].ipAddress - IP地址
 * @param {string} devices[].macAddress - MAC地址
 * @param {string} devices[].name - 设备名称
 * @returns {Promise<{code: number, message: string, data: Array<Printer>}>} 批量添加结果
 */
export function batchAddPrinters(devices) {
  return request({
    url: '/api/v1/printers/batch-add',
    method: 'post',
    data: devices
  })
}

// ============================================
// 数字孪生看板 - 设备位置管理 API
// ============================================

/**
 * 获取未分配位置的设备列表
 * @returns {Promise<{code: number, message: string, data: Array<Printer>}>} 未分配设备列表
 */
export function getUnallocatedPrinters() {
  return request({
    url: '/api/v1/printers/unallocated',
    method: 'get'
  })
}

/**
 * 批量更新设备位置（绑定/解绑/移动）
 * @param {Array<Object>} positions - 位置更新数组
 * @param {number} positions[].id - 设备ID
 * @param {number|null} positions[].gridRow - 网格行号（null表示解绑）
 * @param {number|null} positions[].gridCol - 网格列号（null表示解绑）
 * @returns {Promise<{code: number, message: string}>} 更新结果
 */
export function batchUpdatePositions(positions) {
  return request({
    url: '/api/v1/printers/positions',
    method: 'put',
    data: positions
  })
}

/**
 * 确认打印机热床已清理完毕 - 安全模式第二步之一
 * @param {number} printerId - 打印机ID
 * @returns {Promise<{code: number, message: string, data: Printer}>} 更新结果
 */
export function confirmSafe(printerId) {
  return request({
    url: '/api/v1/print-jobs/safe/confirm',
    method: 'post',
    data: { printerId }
  })
}

// ============================================
// Type Definitions (JSDoc)
// ============================================

/**
 * @typedef {Object} Printer
 * @property {number} id - 设备唯一标识
 * @property {string} name - 设备名称
 * @property {string} machineNumber - 机器编号（如 A-01）
 * @property {string} ipAddress - IP地址
 * @property {string} macAddress - MAC地址
 * @property {string} firmwareType - 固件类型（Klipper/Marlin）
 * @property {string} status - 设备状态（ONLINE/OFFLINE/PRINTING/ERROR/IDLE）
 * @property {number} [currentJobId] - 当前任务ID
 * @property {string} [currentMaterial] - 当前耗材类型
 * @property {string} [nozzleSize] - 喷头尺寸
 * @property {number} [gridRow] - 网格行号
 * @property {number} [gridCol] - 网格列号
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 */

/**
 * @typedef {Object} ScannedDevice
 * @property {string} ipAddress - IP地址
 * @property {string} macAddress - MAC地址
 * @property {boolean} isNewDevice - 是否为新设备
 * @property {string} status - 设备状态
 * @property {string} suggestedName - 建议的设备名称
 */
