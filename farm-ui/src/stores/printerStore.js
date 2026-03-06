import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { WebSocketClient } from '@/utils/websocket'
import { getPrinterList, batchUpdatePositions, updatePrinter } from '@/api/printer'

/**
 * 打印机状态管理 Store
 * @description 管理打印机列表、网格布局和 WebSocket 实时状态
 */
export const usePrinterStore = defineStore('printer', () => {
  // ============================================
  // State
  // ============================================

  /** 原始设备数据列表 */
  const rawDeviceList = ref([])

  /** 加载状态 */
  const loading = ref(false)

  /** WebSocket 实时状态数据 - 按 printerId 存储 */
  const realTimeStatus = ref({})

  /** WebSocket 客户端实例 */
  let wsClient = null

  // ============================================
  // Constants
  // ============================================

  /** 网格配置常量 */
  const GRID_CONFIG = {
    ROWS: 4,
    COLS: 12, // 实际设备列数
    TOTAL_COLS: 13, // 包含过道的总列数
    AISLE_COL: 8, // 过道在第8列（视觉位置，1-based）
    AISLE_COL_INDEX: 7 // 过道列的数组索引（0-based）
  }

  /** ASCII 码常量 */
  const ASCII = {
    UPPER_A: 65 // 'A' 的 ASCII 码
  }

  /** WebSocket 配置 */
  const WS_CONFIG = {
    url: 'ws://localhost:8080/ws/farm-status',
    reconnectDelay: 3000,
    maxReconnectAttempts: null // 无限重连
  }

  // ============================================
  // Getters (Computed)
  // ============================================

  /**
   * 将扁平设备数组转换为4行13列的二维矩阵（包含过道列）
   * @returns {Array<Array<Object|null|string>>} 4x13的设备矩阵
   */
  const deviceMatrix = computed(() => {
    const matrix = []

    for (let row = 1; row <= GRID_CONFIG.ROWS; row++) {
      const rowData = []
      for (let col = 1; col <= GRID_CONFIG.TOTAL_COLS; col++) {
        // 过道位置
        if (col === GRID_CONFIG.AISLE_COL) {
          rowData.push('aisle')
          continue
        }

        // 计算物理列号（排除过道）
        const physicalCol = getPhysicalCol(col)

        // 在原始数据中查找对应坐标的设备
        const device = rawDeviceList.value.find(
          d => d.gridRow === row && d.gridCol === physicalCol
        )
        rowData.push(device || null)
      }
      matrix.push(rowData)
    }

    return matrix
  })

  /**
   * 各状态设备数量统计
   * @returns {Object} 状态计数对象
   */
  const statusCounts = computed(() => {
    const counts = {
      ONLINE: 0,
      OFFLINE: 0,
      PRINTING: 0,
      ERROR: 0,
      IDLE: 0
    }

    rawDeviceList.value.forEach(device => {
      const status = device.status
      if (Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status]++
      }
      // ONLINE状态视为空闲
      if (status === 'ONLINE') {
        counts.IDLE++
      }
    })

    return counts
  })

  /**
   * WebSocket 连接状态
   * @returns {string}
   */
  const wsConnectionState = computed(() => {
    return wsClient ? wsClient.getState() : 'CLOSED'
  })

  /**
   * 是否已连接到 WebSocket
   * @returns {boolean}
   */
  const isWsConnected = computed(() => {
    return wsClient ? wsClient.isConnected() : false
  })

  // ============================================
  // Actions
  // ============================================

  /**
   * 获取设备数据
   */
  async function fetchDeviceData() {
    loading.value = true
    try {
      const response = await getPrinterList({ pageSize: 1000 })
      // 只保留有坐标的设备（在看板上显示的）
      const records = response.data?.records || []
      rawDeviceList.value = records.filter(d => {
        const hasValidRow = typeof d.gridRow === 'number' && d.gridRow > 0
        const hasValidCol = typeof d.gridCol === 'number' && d.gridCol > 0
        return hasValidRow && hasValidCol
      })
    } catch (error) {
      console.error('获取设备数据失败:', error)
      // 降级使用模拟数据
      rawDeviceList.value = generateMockData()
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 连接 WebSocket
   */
  function connectWs() {
    // 如果已存在连接，先关闭
    if (wsClient) {
      disconnectWs()
    }

    // 创建新的 WebSocket 客户端
    wsClient = new WebSocketClient(WS_CONFIG.url, {
      reconnectDelay: WS_CONFIG.reconnectDelay,
      maxReconnectAttempts: WS_CONFIG.maxReconnectAttempts,
      autoConnect: true
    })

    // 订阅消息事件
    wsClient.on('message', handleWebSocketMessage)

    // 订阅连接事件（可选，用于调试）
    wsClient.on('open', () => {
      console.log('[PrinterStore] WebSocket 连接已建立')
    })

    wsClient.on('close', () => {
      console.log('[PrinterStore] WebSocket 连接已关闭')
    })

    wsClient.on('error', (error) => {
      console.error('[PrinterStore] WebSocket 错误:', error)
    })
  }

  /**
   * 断开 WebSocket 连接
   */
  function disconnectWs() {
    if (wsClient) {
      wsClient.destroy()
      wsClient = null
    }
    // 清空实时状态数据
    realTimeStatus.value = {}
  }

  /**
   * 处理 WebSocket 消息
   * @param {Object} message - WebSocket 消息对象
   */
  function handleWebSocketMessage(message) {
    const { printerId, data, timestamp } = message

    if (printerId === undefined || printerId === null || !data) {
      console.warn('[PrinterStore] 收到无效的 WebSocket 消息:', message)
      return
    }

    // 将 printerId 统一转换为字符串作为 key
    // 因为后端可能返回数字，而前端设备 id 可能是字符串
    const idKey = String(printerId)

    // 更新实时状态数据
    realTimeStatus.value[idKey] = {
      ...data,
      lastUpdate: timestamp
    }

    console.log('[PrinterStore] 更新实时状态:', idKey, data)
  }

  /**
   * 批量更新设备位置
   * @param {Array} payload - 位置更新数据
   */
  async function updateDevicePositions(payload) {
    await batchUpdatePositions(payload)
    await fetchDeviceData()
  }

  /**
   * 更新单个打印机信息
   * @param {Object} data - 打印机数据
   */
  async function updateDevice(data) {
    await updatePrinter(data)
    await fetchDeviceData()
  }

  /**
   * 从看板移除设备（设置 gridRow/gridCol 为 null）
   * @param {string|number} deviceId - 设备ID
   */
  async function removeDeviceFromBoard(deviceId) {
    const payload = [{
      id: deviceId,
      gridRow: null,
      gridCol: null
    }]
    await updateDevicePositions(payload)
  }

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * 格式化行标签（数字转字母）
   * @param {number} row - 行号（1-based）
   * @returns {string} 行标签（如 A, B, C...）
   */
  function formatRowLabel(row) {
    return String.fromCharCode(ASCII.UPPER_A + row - 1)
  }

  /**
   * 根据网格列号获取物理列号（排除过道）
   * @param {number} gridCol - 网格列号（1-13）
   * @returns {number} 物理列号（1-12）
   */
  function getPhysicalCol(gridCol) {
    if (gridCol < GRID_CONFIG.AISLE_COL) {
      return gridCol
    }
    // 过道右侧的列，物理列号减1
    return gridCol - 1
  }

  /**
   * 根据矩阵列索引获取物理列号
   * @param {number} colIndex - 矩阵列索引（0-12）
   * @returns {number} 物理列号（1-12）
   */
  function getPhysicalColByIndex(colIndex) {
    return getPhysicalCol(colIndex + 1)
  }

  /**
   * 判断是否为过道单元格
   * @param {number} colIndex - 列索引（0-based）
   * @returns {boolean} 是否为过道
   */
  function isAisleCell(colIndex) {
    return colIndex === GRID_CONFIG.AISLE_COL_INDEX
  }

  /**
   * 生成模拟设备数据（仅用于 API 失败时的降级显示）
   * @returns {Array<Object>} 模拟设备数组
   */
  function generateMockData() {
    const devices = []
    const statuses = ['ONLINE', 'OFFLINE', 'PRINTING', 'ERROR']
    const nozzleSizes = ['0.4', '0.6', '0.8']

    // 随机填充约70%的位置
    for (let row = 1; row <= GRID_CONFIG.ROWS; row++) {
      for (let col = 1; col <= GRID_CONFIG.COLS; col++) {
        if (Math.random() > 0.3) {
          const status = statuses[Math.floor(Math.random() * statuses.length)]
          const rowLabel = formatRowLabel(row)

          devices.push({
            id: `printer_${row}_${col}`,
            name: `打印机 ${rowLabel}-${col}`,
            ipAddress: `192.168.1.${100 + row * 12 + col}`,
            macAddress: `AA:BB:CC:DD:${row.toString(16).padStart(2, '0')}:${col.toString(16).padStart(2, '0')}`,
            firmwareType: Math.random() > 0.5 ? 'Klipper' : 'Marlin',
            status: status,
            nozzleSize: nozzleSizes[Math.floor(Math.random() * nozzleSizes.length)],
            gridRow: row,
            gridCol: col,
            machineNumber: `#${rowLabel}-${col.toString().padStart(2, '0')}`
          })
        }
      }
    }

    return devices
  }

  /**
   * 获取指定设备的实时状态
   * @param {string|number} printerId - 打印机ID
   * @returns {Object|null}
   */
  function getDeviceRealTimeStatus(printerId) {
    return realTimeStatus.value[printerId] || null
  }

  /**
   * 清空实时状态数据
   */
  function clearRealTimeStatus() {
    realTimeStatus.value = {}
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    rawDeviceList,
    loading,
    realTimeStatus,

    // Constants
    GRID_CONFIG,

    // Getters
    deviceMatrix,
    statusCounts,
    wsConnectionState,
    isWsConnected,

    // Actions
    fetchDeviceData,
    connectWs,
    disconnectWs,
    updateDevicePositions,
    updateDevice,
    removeDeviceFromBoard,

    // Utilities
    formatRowLabel,
    getPhysicalCol,
    getPhysicalColByIndex,
    isAisleCell,
    getDeviceRealTimeStatus,
    clearRealTimeStatus
  }
})
