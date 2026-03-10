import { ref, computed, shallowRef, markRaw } from 'vue'
import { defineStore } from 'pinia'
import { WebSocketClient } from '@/utils/websocket'
import { PRINTER_STATE } from '@/utils/constants'

/**
 * WebSocket 实时状态管理 Store
 * @description 负责 WebSocket 连接管理和实时状态更新
 * 优化：使用 shallowRef + RAF 批量更新，避免 Vue 响应式系统卡顿
 * @author Cline
 */
export const useRealtimeStore = defineStore('realtime', () => {
  // ============================================
  // State
  // ============================================

  /**
   * 实时状态数据 - 使用 shallowRef 避免深层响应式开销
   * @type {ShallowRef<Map<string, Object>>}
   */
  const statusMap = shallowRef(new Map())

  /** WebSocket 客户端实例 - 使用 markRaw 避免响应式代理 */
  let wsClient = null

  // ============================================
  // RAF 批量更新机制
  // ============================================

  /** 待处理的 WebSocket 消息队列 */
  const pendingUpdates = new Map()

  /** RAF 帧 ID */
  let rafId = null

  /** 是否正在等待下一帧 */
  let isScheduled = false

  // ============================================
  // WebSocket 配置
  // ============================================

  const WS_CONFIG = {
    url: 'ws://localhost:8080/ws/farm-status',
    reconnectDelay: 3000,
    maxReconnectDelay: 60000,
    reconnectBackoffMultiplier: 2,
    maxReconnectAttempts: null, // 无限重连
    heartbeatInterval: 30000,   // 30秒心跳
    heartbeatTimeout: 90000,    // 90秒超时（增加容错空间）
    autoConnect: false          // 手动连接
  }

  // ============================================
  // Getters (Computed)
  // ============================================

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

  /**
   * 获取指定设备的实时状态（兼容原有 API）
   * @returns {Function}
   */
  const realTimeStatus = computed(() => {
    // 返回一个代理对象，兼容原有的 realTimeStatus[printerId] 访问方式
    return new Proxy({}, {
      get(_, id) {
        return statusMap.value.get(String(id))
      },
      has(_, id) {
        return statusMap.value.has(String(id))
      },
      ownKeys() {
        return Array.from(statusMap.value.keys())
      },
      getOwnPropertyDescriptor(_, id) {
        if (statusMap.value.has(String(id))) {
          return { enumerable: true, configurable: true }
        }
      }
    })
  })

  /**
   * 获取指定设备的实时状态
   * @param {string|number} printerId - 打印机ID
   * @returns {Object|null}
   */
  function getDeviceRealTimeStatus(printerId) {
    return statusMap.value.get(String(printerId)) || null
  }

  // ============================================
  // RAF 批量更新机制
  // ============================================

  /**
   * 调度批量更新（使用 RAF）
   * @private
   */
  function scheduleBatchUpdate() {
    if (isScheduled || pendingUpdates.size === 0) return

    isScheduled = true
    rafId = requestAnimationFrame(() => {
      flushPendingUpdates()
      isScheduled = false
      rafId = null
    })
  }

  /**
   * 执行批量更新
   * @private
   */
  function flushPendingUpdates() {
    if (pendingUpdates.size === 0) return

    // 创建新的 Map 实例，触发 shallowRef 更新
    const newMap = new Map(statusMap.value)

    pendingUpdates.forEach((update, idKey) => {
      const { data, timestamp } = update

      newMap.set(idKey, {
        state: data.unifiedState || data.state || PRINTER_STATE.STANDBY,
        progress: data.progress ?? 0,
        toolTemperature: data.toolTemperature ?? 0,
        bedTemperature: data.bedTemperature ?? 0,
        printDuration: data.printDuration ?? 0,
        filamentUsed: data.filamentUsed ?? 0,
        systemMessage: data.systemMessage || '',
        lastUpdate: timestamp
      })
    })

    // 替换整个 Map，触发响应式更新
    statusMap.value = newMap
    pendingUpdates.clear()
  }

  /**
   * 取消待处理的 RAF 更新
   * @private
   */
  function cancelPendingUpdate() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
      isScheduled = false
    }
  }

  // ============================================
  // WebSocket 管理
  // ============================================

  /**
   * 处理 WebSocket 消息
   * @param {Object} message - WebSocket 消息对象
   * @private
   */
  function handleWebSocketMessage(message) {
    const { printerId, data, timestamp } = message

    if (printerId === undefined || printerId === null || !data) {
      console.warn('[RealtimeStore] 收到无效的 WebSocket 消息:', message)
      return
    }

    // 将消息加入待处理队列
    const idKey = String(printerId)
    pendingUpdates.set(idKey, { data, timestamp })

    // 调度批量更新
    scheduleBatchUpdate()
  }

  /**
   * 连接 WebSocket
   */
  function connectWs() {
    // 如果已存在连接，先关闭
    if (wsClient) {
      disconnectWs()
    }

    // 创建新的 WebSocket 客户端 - 使用 markRaw 避免响应式代理
    wsClient = markRaw(new WebSocketClient(WS_CONFIG.url, {
      reconnectDelay: WS_CONFIG.reconnectDelay,
      maxReconnectDelay: WS_CONFIG.maxReconnectDelay,
      reconnectBackoffMultiplier: WS_CONFIG.reconnectBackoffMultiplier,
      maxReconnectAttempts: WS_CONFIG.maxReconnectAttempts,
      heartbeatInterval: WS_CONFIG.heartbeatInterval,
      heartbeatTimeout: WS_CONFIG.heartbeatTimeout,
      autoConnect: true
    }))

    // 订阅消息事件
    wsClient.on('message', handleWebSocketMessage)

    // 订阅连接事件
    wsClient.on('open', () => {
      console.log('[RealtimeStore] WebSocket 连接已建立')
    })

    wsClient.on('close', () => {
      console.log('[RealtimeStore] WebSocket 连接已关闭')
    })

    wsClient.on('error', (error) => {
      console.error('[RealtimeStore] WebSocket 错误:', error)
    })

    wsClient.on('heartbeatTimeout', () => {
      console.warn('[RealtimeStore] WebSocket 心跳超时')
    })
  }

  /**
   * 断开 WebSocket 连接
   */
  function disconnectWs() {
    // 取消待处理的 RAF 更新
    cancelPendingUpdate()

    // 清空待处理队列
    pendingUpdates.clear()

    if (wsClient) {
      // 清理所有事件监听器
      wsClient.destroy()
      wsClient = null
    }

    // 清空实时状态数据
    statusMap.value = new Map()
  }

  /**
   * 清空实时状态数据
   */
  function clearRealTimeStatus() {
    cancelPendingUpdate()
    pendingUpdates.clear()
    statusMap.value = new Map()
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State (兼容原有 API)
    realTimeStatus,
    statusMap,

    // Getters
    wsConnectionState,
    isWsConnected,

    // Actions
    connectWs,
    disconnectWs,
    getDeviceRealTimeStatus,
    clearRealTimeStatus
  }
})
