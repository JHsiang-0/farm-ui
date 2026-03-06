/**
 * 全局常量定义
 * @module utils/constants
 */

// ============================================
// HTTP 状态码
// ============================================

/**
 * HTTP 状态码常量
 * @constant {Object}
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
}

// ============================================
// 业务状态码
// ============================================

/**
 * 业务状态码常量
 * @constant {Object}
 */
export const BUSINESS_CODE = {
  SUCCESS: 200,
  UNAUTHORIZED: 401,
  ERROR: 500
}

// ============================================
// 设备状态
// ============================================

/**
 * 打印机设备状态常量
 * @constant {Object}
 */
export const PRINTER_STATUS = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  PRINTING: 'PRINTING',
  ERROR: 'ERROR',
  IDLE: 'IDLE'
}

/**
 * 打印机状态显示配置
 * @constant {Object}
 */
export const PRINTER_STATUS_MAP = {
  [PRINTER_STATUS.ONLINE]: { label: '在线', type: 'success' },
  [PRINTER_STATUS.OFFLINE]: { label: '离线', type: 'info' },
  [PRINTER_STATUS.PRINTING]: { label: '打印中', type: 'primary' },
  [PRINTER_STATUS.ERROR]: { label: '故障', type: 'danger' },
  [PRINTER_STATUS.IDLE]: { label: '空闲', type: 'success' }
}

// ============================================
// 任务状态
// ============================================

/**
 * 打印任务状态常量
 * @constant {Object}
 */
export const JOB_STATUS = {
  QUEUED: 'QUEUED',
  MANUAL: 'MANUAL',
  PRINTING: 'PRINTING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
}

/**
 * 任务优先级常量
 * @constant {Object}
 */
export const JOB_PRIORITY = {
  HIGH: 'HIGH',
  NORMAL: 'NORMAL',
  LOW: 'LOW'
}

// ============================================
// 网格布局配置
// ============================================

/**
 * 工厂网格布局配置
 * @constant {Object}
 */
export const GRID_CONFIG = {
  ROWS: 4,
  COLS: 12, // 实际设备列数
  TOTAL_COLS: 13, // 包含过道的总列数
  AISLE_COL: 8, // 过道在第8列（视觉位置，1-based）
  AISLE_COL_INDEX: 7, // 过道列的数组索引（0-based）
  CELL_HEIGHT: 140, // 单元格高度（px）
  CELL_MIN_WIDTH: 100 // 单元格最小宽度（px）
}

// ============================================
// ASCII 码
// ============================================

/**
 * ASCII 码常量
 * @constant {Object}
 */
export const ASCII = {
  UPPER_A: 65, // 'A' 的 ASCII 码
  UPPER_Z: 90  // 'Z' 的 ASCII 码
}

// ============================================
// 分页配置
// ============================================

/**
 * 默认分页配置
 * @constant {Object}
 */
export const PAGINATION = {
  DEFAULT_PAGE_NUM: 1,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 1000,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
}

// ============================================
// 请求配置
// ============================================

/**
 * 请求超时配置（毫秒）
 * @constant {Object}
 */
export const REQUEST_TIMEOUT = {
  DEFAULT: 10000,
  UPLOAD: 60000, // 上传文件超时时间
  DOWNLOAD: 30000 // 下载文件超时时间
}

// ============================================
// 耗材类型
// ============================================

/**
 * 支持的耗材类型
 * @constant {Array<string>}
 */
export const MATERIAL_TYPES = ['PLA', 'ABS', 'PETG', 'TPU', 'ASA', 'PC', 'Nylon']

/**
 * 喷头尺寸选项
 * @constant {Array<string>}
 */
export const NOZZLE_SIZES = ['0.4', '0.6', '0.8']

// ============================================
// 固件类型
// ============================================

/**
 * 支持的固件类型
 * @constant {Array<string>}
 */
export const FIRMWARE_TYPES = ['Klipper', 'Marlin']
