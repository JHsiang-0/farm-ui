import { computed, shallowRef, markRaw, ref } from 'vue'
import { defineStore } from 'pinia'
import { WebSocketClient } from '@/utils/websocket'
import { PRINTER_STATE } from '@/utils/constants'
import { normalizeId } from '@/utils/dataAdapters'
import { normalizeProgress } from '@/utils/formatters'
import { isMockEnabled } from '@/mock'
import { useUserStore } from '@/stores/user'
import { useJobStore } from '@/stores/jobStore'
import { createMockWebSocketStream } from '@/mock/websocket'
import { getPrinterList } from '@/api/printer'
import { acceptRealtimeSequence } from '@/utils/realtimeSequence'
import {
  isSupportedRealtimeVersion,
  rememberRealtimeEvent
} from '@/utils/realtimeProtocol'
import {
  getRealtimeAlertClearId,
  toRealtimeAlert,
  toRealtimeSnapshotEntries
} from '@/utils/realtimeAlerts'

const MAX_SEEN_EVENT_IDS = 1000

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
  const alerts = ref([])

  /** WebSocket 客户端实例 - 使用 markRaw 避免响应式代理 */
  let wsClient = null
  let mockStream = null
  const mockConnectionState = ref('CLOSED')
  const lastSequence = ref(null)
  const lastEventId = ref(null)
  const seenEventIds = new Set()
  const isRealtimeStale = ref(false)
  const isRecovering = ref(false)
  let recoveryPromise = null
  const userStore = useUserStore()
  const jobStore = useJobStore()

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

  // 获取 WebSocket 地址：优先使用环境变量，否则使用当前页面 host
  const getWsUrl = () => {
    const envWsUrl = import.meta.env.VITE_WS_URL
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
    const baseUrl = envWsUrl || (() => {
      if (apiBaseUrl) {
        try {
          const apiUrl = new URL(apiBaseUrl)
          const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
          return `${protocol}//${apiUrl.host}/ws/farm-status`
        } catch {
          console.warn('[RealtimeStore] VITE_API_BASE_URL 不是有效地址')
        }
      }

      if (window.location.host && ['http:', 'https:'].includes(window.location.protocol)) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        return `${protocol}//${window.location.host}/ws/farm-status`
      }

      return ''
    })()
    if (userStore.token) {
      const separator = baseUrl.includes('?') ? '&' : '?'
      return `${baseUrl}${separator}token=${encodeURIComponent(userStore.token)}`
    }
    if (!userStore.token || !baseUrl) return baseUrl
  }

  const WS_CONFIG = {
    reconnectDelay: 3000,
    maxReconnectDelay: 60000,
    reconnectBackoffMultiplier: 2,
    maxReconnectAttempts: null, // 无限重连
    inactivityTimeout: 90000,   // 90秒无连接/业务消息活动后重连
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
    return isMockEnabled ? mockConnectionState.value : (wsClient ? wsClient.getState() : 'CLOSED')
  })

  /**
   * 是否已连接到 WebSocket
   * @returns {boolean}
   */
  const isWsConnected = computed(() => {
    return isMockEnabled ? mockConnectionState.value === 'OPEN' : (wsClient ? wsClient.isConnected() : false)
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

      // 将后端数据格式转换为前端组件期望的格式
      newMap.set(idKey, {
        // 优先使用 unifiedState，这是后端融合后的最终状态
        unifiedState: normalizeRealtimeState(data),
        state: normalizeRealtimeState(data),
        progress: normalizeProgress(data.progress), // 契约统一为 0-100
        // 温度数据 - 兼容 extruder/heaterBed 嵌套格式
        extruder: {
          temperature: data.toolTemperature ?? 0,
          target: data.toolTarget ?? 0
        },
        heaterBed: {
          temperature: data.bedTemperature ?? 0,
          target: data.bedTarget ?? 0
        },
        // 保留原始字段供直接访问
        toolTemperature: data.toolTemperature ?? 0,
        toolTarget: data.toolTarget ?? 0,
        bedTemperature: data.bedTemperature ?? 0,
        bedTarget: data.bedTarget ?? 0,
        printDuration: data.printDuration ?? 0,
        filamentUsed: data.filamentUsed ?? 0,
        systemMessage: data.systemMessage || '',
        lastUpdate: timestamp,
        // 任务相关字段
        currentJobId: normalizeId(data.currentJobId),
        currentJobFileName: data.currentJobFileName,
        currentJobStatus: data.currentJobStatus
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
  function normalizeRealtimeState(data = {}) {
    const state = String(data.status || data.unifiedState || data.state || PRINTER_STATE.UNKNOWN).toUpperCase()
    if (state === 'IDLE') return PRINTER_STATE.STANDBY
    if (state === 'ERROR') return PRINTER_STATE.FAULT
    if (state === 'OFFLINE') return PRINTER_STATE.UNKNOWN
    return state
  }

  function queueRealtimeUpdate(printerId, data, timestamp) {
    if (printerId === undefined || printerId === null) return
    const idKey = String(printerId)
    const previous = pendingUpdates.get(idKey) || { data: statusMap.value.get(idKey) || {} }
    pendingUpdates.set(idKey, {
      data: { ...previous?.data, ...data },
      timestamp: timestamp || Date.now()
    })
    scheduleBatchUpdate()
  }

  function refreshJobState() {
    jobStore.refresh().catch(error => {
      console.error('[RealtimeStore] 任务状态恢复失败:', error)
    })
  }

  function handleWebSocketMessage(message) {
    const { version, type, printerId, data, timestamp, sequence, eventId } = message || {}

    if (!isSupportedRealtimeVersion(version)) {
      isRealtimeStale.value = true
      recoverRealtimeSnapshot()
      return
    }

    if (rememberRealtimeEvent(seenEventIds, eventId, MAX_SEEN_EVENT_IDS)) return
    if (eventId !== undefined && eventId !== null && String(eventId)) {
      lastEventId.value = eventId
    }

    const sequenceResult = acceptRealtimeSequence(lastSequence.value, sequence)
    if (!sequenceResult.accepted) return
    if (Number.isInteger(Number(sequence)) && Number(sequence) >= 0) {
      if (sequenceResult.gap) {
        isRealtimeStale.value = true
        recoverRealtimeSnapshot()
      }
      lastSequence.value = sequenceResult.nextSequence
    }
    const alert = toRealtimeAlert(message)
    if (alert) {
      const nextAlerts = alerts.value.filter(item => item.id !== alert.id)
      alerts.value = [alert, ...nextAlerts].slice(0, 20)
    }

    const clearAlertId = getRealtimeAlertClearId(message)
    if (clearAlertId) {
      alerts.value = alerts.value.filter(item => item.id !== clearAlertId)
    }

    if (type === 'SNAPSHOT') {
      isRealtimeStale.value = false
      toRealtimeSnapshotEntries(data).forEach(entry => queueRealtimeUpdate(entry.printerId, entry.data, timestamp))
      return
    }

    if (type === 'PRINTER_OFFLINE') {
      queueRealtimeUpdate(printerId, {
        unifiedState: PRINTER_STATE.UNKNOWN,
        state: PRINTER_STATE.UNKNOWN,
        systemMessage: data?.reason || data?.message || data?.systemMessage || '设备已离线'
      }, timestamp)
      return
    }

    if (type === 'JOB_STATUS') {
      jobStore.applyRealtimeJobStatus(message)
      queueRealtimeUpdate(printerId, {
        currentJobId: data?.currentJobId ?? message.jobId,
        currentJobStatus: data?.status ?? data?.currentJobStatus,
        progress: data?.progress
      }, timestamp)
      return
    }

    if (printerId === undefined || printerId === null || !data) {
      console.warn('[RealtimeStore] 收到无效的 WebSocket 消息:', message)
      return
    }

    // 将消息加入待处理队列
    queueRealtimeUpdate(printerId, data, timestamp)

    // 调度批量更新
    scheduleBatchUpdate()
  }

  /**
   * WebSocket 断档时用打印机分页接口重新拉取当前快照。
   * 这是恢复当前状态，不试图补 replay 历史事件。
   */
  async function recoverRealtimeSnapshot() {
    if (recoveryPromise) return recoveryPromise
    isRecovering.value = true
    recoveryPromise = getPrinterList({ pageNum: 1, pageSize: 100 })
      .then(response => {
        const records = response?.data?.records || []
        records.forEach(printer => {
          queueRealtimeUpdate(printer.id, {
            unifiedState: printer.status,
            state: printer.status,
            currentJobId: printer.currentJobId,
            currentJobStatus: printer.currentJobStatus,
            progress: printer.progress
          }, printer.updatedAt || Date.now())
        })
        isRealtimeStale.value = false
        refreshJobState()
      })
      .catch(error => {
        console.error('[RealtimeStore] WebSocket 断档恢复失败:', error)
        isRealtimeStale.value = true
      })
      .finally(() => {
        isRecovering.value = false
        recoveryPromise = null
      })
    return recoveryPromise
  }

  /**
   * 连接 WebSocket
   */
  function connectWs() {
    if (isMockEnabled) {
      if (mockStream) return
      lastSequence.value = null
      mockConnectionState.value = 'OPEN'
      mockStream = createMockWebSocketStream({
        onOpen: () => {
          resetSequenceBaseline()
          refreshJobState()
        },
        onMessage: handleWebSocketMessage,
        onClose: () => { mockConnectionState.value = 'CLOSED' }
      })
      return
    }

    if (!userStore.token) {
      console.warn('未检测到登录令牌，跳过 WebSocket 连接')
      return
    }

    const wsUrl = getWsUrl()
    if (!wsUrl) {
      console.warn('未配置 WebSocket 地址，跳过 WebSocket 连接')
      return
    }

    // 如果已存在连接，先关闭
    if (wsClient) {
      disconnectWs()
    }

    // 创建新的 WebSocket 客户端 - 使用 markRaw 避免响应式代理
    wsClient = markRaw(new WebSocketClient(wsUrl, {
      reconnectDelay: WS_CONFIG.reconnectDelay,
      maxReconnectDelay: WS_CONFIG.maxReconnectDelay,
      reconnectBackoffMultiplier: WS_CONFIG.reconnectBackoffMultiplier,
      maxReconnectAttempts: WS_CONFIG.maxReconnectAttempts,
      inactivityTimeout: WS_CONFIG.inactivityTimeout,
      autoConnect: false
    }))

    // 订阅消息事件
    wsClient.on('message', handleWebSocketMessage)

    // 订阅连接事件
    wsClient.on('open', () => {
      resetSequenceBaseline()
      refreshJobState()
      console.log('[RealtimeStore] WebSocket 连接已建立')
    })

    wsClient.on('close', event => {
      if (event?.code !== 1000) isRealtimeStale.value = true
      console.log('[RealtimeStore] WebSocket 连接已关闭')
    })

    wsClient.on('error', (error) => {
      console.error('[RealtimeStore] WebSocket 错误:', error)
    })

    wsClient.on('inactivityTimeout', () => {
      console.warn('[RealtimeStore] WebSocket 连接不活跃，准备重连')
    })

    wsClient.connect().catch(error => {
      console.error('[RealtimeStore] WebSocket 初次连接失败:', error)
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

    if (mockStream) {
      mockStream.close()
      mockStream = null
      mockConnectionState.value = 'CLOSED'
    }

    if (wsClient) {
      // 清理所有事件监听器
      wsClient.destroy()
      wsClient = null
    }

    // 清空实时状态数据
    statusMap.value = new Map()
    alerts.value = []
    lastSequence.value = null
    lastEventId.value = null
    seenEventIds.clear()
    isRealtimeStale.value = false
    isRecovering.value = false
    recoveryPromise = null
  }

  function resetSequenceBaseline() {
    lastSequence.value = null
  }

  /**
   * 清空实时状态数据
   */
  function clearRealTimeStatus() {
    cancelPendingUpdate()
    pendingUpdates.clear()
    statusMap.value = new Map()
  }

  function dismissAlert(alertId) {
    alerts.value = alerts.value.filter(item => item.id !== alertId)
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State (兼容原有 API)
    realTimeStatus,
    statusMap,
    alerts,

    // Getters
    wsConnectionState,
    isWsConnected,

    // Actions
    connectWs,
    disconnectWs,
    getDeviceRealTimeStatus,
    clearRealTimeStatus,
    dismissAlert,
    lastSequence,
    lastEventId,
    isRealtimeStale,
    isRecovering
  }
})
