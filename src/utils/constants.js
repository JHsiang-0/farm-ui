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
// 打印机状态 - 9个高层聚合标准状态（纯大写）
// ============================================

/**
 * 打印机设备状态常量 - 后端 WebSocket 推送的标准状态
 * @constant {Object}
 */
export const PRINTER_STATE = {
  // 🔴 致命级 (Danger)
  FAULT: 'FAULT',           // 设备故障 - 底层硬件/热失控急停
  SYS_ERROR: 'SYS_ERROR',   // 系统错误 - 配置或通讯崩溃

  // 🟡 警告/关注级 (Warning)
  PRINT_ERROR: 'PRINT_ERROR', // 打印中断 - 当前模型任务出错，机器本身健康
  STARTING: 'STARTING',       // 启动中
  PAUSED: 'PAUSED',           // 已暂停

  // 🔵 正常业务级 (Primary/Success/Info)
  PRINTING: 'PRINTING',     // 打印中
  COMPLETED: 'COMPLETED',   // 已完成
  STANDBY: 'STANDBY',       // 待机
  CANCELLED: 'CANCELLED'    // 已取消
}

/**
 * 打印机状态映射配置 - UX 故障分级优化
 * 严格按照工业级 UX 标准映射 Element Plus 的 type 颜色和中文文本
 * @constant {Object}
 */
export const PRINTER_STATE_MAP = {
  // 🔴 致命级 (Danger)
  [PRINTER_STATE.FAULT]: { label: '设备故障', type: 'danger', level: 'fatal' },
  [PRINTER_STATE.SYS_ERROR]: { label: '系统错误', type: 'danger', level: 'fatal' },

  // 🟡 警告/关注级 (Warning)
  [PRINTER_STATE.PRINT_ERROR]: { label: '打印中断', type: 'warning', level: 'warning' },
  [PRINTER_STATE.STARTING]: { label: '启动中', type: 'warning', level: 'warning' },
  [PRINTER_STATE.PAUSED]: { label: '已暂停', type: 'warning', level: 'warning' },

  // 🔵 正常业务级
  [PRINTER_STATE.PRINTING]: { label: '打印中', type: 'primary', level: 'normal' },
  [PRINTER_STATE.COMPLETED]: { label: '已完成', type: 'success', level: 'normal' },
  [PRINTER_STATE.STANDBY]: { label: '待机', type: 'info', level: 'normal' },
  [PRINTER_STATE.CANCELLED]: { label: '已取消', type: 'info', level: 'normal' }
}

/**
 * 需要显示错误警报的状态列表
 * @constant {Array<string>}
 */
export const ERROR_ALERT_STATES = [
  PRINTER_STATE.FAULT,
  PRINTER_STATE.SYS_ERROR,
  PRINTER_STATE.PRINT_ERROR
]

/**
 * el-progress 状态映射
 * @constant {Object}
 */
export const PROGRESS_STATUS_MAP = {
  // exception - 红色（致命错误）
  [PRINTER_STATE.FAULT]: 'exception',
  [PRINTER_STATE.SYS_ERROR]: 'exception',

  // success - 绿色（完成）
  [PRINTER_STATE.COMPLETED]: 'success',

  // warning - 黄色（警告状态）
  [PRINTER_STATE.PRINT_ERROR]: 'warning',
  [PRINTER_STATE.PAUSED]: 'warning',
  [PRINTER_STATE.STARTING]: 'warning'
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
