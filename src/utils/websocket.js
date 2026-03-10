/**
 * WebSocket 客户端工具类
 * @description 企业级 WebSocket 封装，支持断线重连、事件订阅、自动心跳
 * @author Cline
 * @version 1.0.0
 */

/**
 * WebSocket 连接状态枚举
 * @readonly
 * @enum {number}
 */
const WS_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}

/**
 * WebSocket 默认配置
 * @constant {Object}
 */
const DEFAULT_CONFIG = {
  /** 基础重连延迟时间（毫秒） */
  reconnectDelay: 1000,
  /** 最大重连次数，null 表示无限重连 */
  maxReconnectAttempts: null,
  /** 最大重连延迟（毫秒） */
  maxReconnectDelay: 60000,
  /** 重连退避倍数 */
  reconnectBackoffMultiplier: 2,
  /** 心跳间隔（毫秒），null 表示不发送心跳 */
  heartbeatInterval: null,
  /** 心跳消息内容 */
  heartbeatMessage: 'ping',
  /** 是否自动连接 */
  autoConnect: true,
  /** 连接超时时间（毫秒） */
  connectTimeout: 10000,
  /** 心跳超时时间（毫秒），为心跳间隔的2倍 */
  heartbeatTimeout: null
}

/**
 * WebSocket 客户端类
 * @class
 */
export class WebSocketClient {
  /**
   * 创建 WebSocket 客户端实例
   * @param {string} url - WebSocket 服务器地址
   * @param {Object} options - 配置选项
   */
  constructor(url, options = {}) {
    /** @private */
    this.url = url
    /** @private */
    this.config = { ...DEFAULT_CONFIG, ...options }
    // 设置心跳超时默认为心跳间隔的2倍
    if (this.config.heartbeatInterval && !this.config.heartbeatTimeout) {
      this.config.heartbeatTimeout = this.config.heartbeatInterval * 2
    }
    
    /** @private @type {WebSocket|null} */
    this.ws = null
    /** @private @type {number|null} */
    this.reconnectTimer = null
    /** @private @type {number|null} */
    this.heartbeatTimer = null
    /** @private @type {number|null} */
    this.heartbeatTimeoutTimer = null
    /** @private @type {number|null} */
    this.connectTimeoutTimer = null
    
    /** @private @type {number} */
    this.reconnectAttempts = 0
    /** @private @type {boolean} */
    this.isManualClose = false
    /** @private @type {boolean} */
    this.isDestroyed = false
    
    // 连接锁 - 防止并发连接
    /** @private @type {boolean} */
    this._isConnecting = false
    /** @private @type {Promise<void>|null} */
    this._connectPromise = null
    
    // 心跳状态
    /** @private @type {number} */
    this._lastPongTime = Date.now()
    
    // 事件处理器存储
    /** @private @type {Map<string, Set<Function>>} */
    this.eventHandlers = new Map()
    
    // 绑定方法上下文
    this._handleOpen = this._handleOpen.bind(this)
    this._handleMessage = this._handleMessage.bind(this)
    this._handleClose = this._handleClose.bind(this)
    this._handleError = this._handleError.bind(this)
    
    // 自动连接
    if (this.config.autoConnect) {
      this.connect()
    }
  }

  /**
   * 建立 WebSocket 连接
   * @returns {Promise<void>}
   */
  connect() {
    // 如果连接正在进行中，返回相同的 Promise
    if (this._connectPromise) {
      return this._connectPromise
    }
    
    // 如果已连接，立即 resolve
    if (this.ws && this.ws.readyState === WS_STATE.OPEN) {
      return Promise.resolve()
    }
    
    // 创建新的连接 Promise
    this._connectPromise = this._doConnect()
    
    // 清理引用
    this._connectPromise.finally(() => {
      this._connectPromise = null
      this._isConnecting = false
    })
    
    return this._connectPromise
  }
  
  /**
   * 实际执行连接逻辑
   * @private
   * @returns {Promise<void>}
   */
  _doConnect() {
    return new Promise((resolve, reject) => {
      if (this.isDestroyed) {
        reject(new Error('WebSocket 实例已被销毁'))
        return
      }
      
      // 再次检查是否已连接（防止竞态）
      if (this.ws && this.ws.readyState === WS_STATE.OPEN) {
        console.log('[WebSocket] 连接已存在且处于打开状态')
        resolve()
        return
      }
      
      // 如果正在连接中，等待现有连接完成
      if (this._isConnecting) {
        console.log('[WebSocket] 连接正在进行中，等待结果...')
        const checkInterval = setInterval(() => {
          if (!this._isConnecting) {
            clearInterval(checkInterval)
            if (this.ws && this.ws.readyState === WS_STATE.OPEN) {
              resolve()
            } else {
              reject(new Error('连接失败'))
            }
          }
        }, 50)
        
        setTimeout(() => {
          clearInterval(checkInterval)
          reject(new Error('等待连接超时'))
        }, this.config.connectTimeout)
        return
      }
      
      this._isConnecting = true
      
      try {
        console.log(`[WebSocket] 正在连接到: ${this.url}`)
        this.ws = new WebSocket(this.url)
        
        // 设置连接超时
        this.connectTimeoutTimer = setTimeout(() => {
          if (this.ws && this.ws.readyState === WS_STATE.CONNECTING) {
            console.error('[WebSocket] 连接超时')
            this._isConnecting = false
            this.ws.close()
            reject(new Error('连接超时'))
          }
        }, this.config.connectTimeout)
        
        // 临时的一次性 open 处理器用于 Promise 解析
        const onOpenOnce = () => {
          clearTimeout(this.connectTimeoutTimer)
          this.connectTimeoutTimer = null
          this._isConnecting = false
          this.ws.removeEventListener('open', onOpenOnce)
          resolve()
        }
        
        this.ws.addEventListener('open', onOpenOnce)
        this._bindEvents()
        
      } catch (error) {
        console.error('[WebSocket] 创建连接失败:', error)
        this._isConnecting = false
        this._scheduleReconnect()
        reject(error)
      }
    })
  }

  /**
   * 手动关闭 WebSocket 连接
   * @param {number} [code=1000] - 关闭状态码
   * @param {string} [reason=''] - 关闭原因
   */
  close(code = 1000, reason = '') {
    this.isManualClose = true
    this._clearTimers()
    
    // 重置连接状态
    this._isConnecting = false
    this._connectPromise = null
    
    if (this.ws) {
      if (this.ws.readyState === WS_STATE.OPEN || this.ws.readyState === WS_STATE.CONNECTING) {
        this.ws.close(code, reason)
      }
      this.ws = null
    }
    
    console.log('[WebSocket] 连接已手动关闭')
  }

  /**
   * 销毁实例，清理所有资源
   */
  destroy() {
    this.isDestroyed = true
    this._isConnecting = false
    this._connectPromise = null
    this.close()
    this.eventHandlers.clear()
    console.log('[WebSocket] 实例已销毁')
  }

  /**
   * 发送消息
   * @param {string|Object|Blob|ArrayBuffer} data - 要发送的数据
   * @returns {boolean} 是否发送成功
   */
  send(data) {
    if (!this.ws || this.ws.readyState !== WS_STATE.OPEN) {
      console.warn('[WebSocket] 连接未打开，无法发送消息')
      return false
    }
    
    try {
      let message = data
      if (typeof data === 'object' && !(data instanceof Blob) && !(data instanceof ArrayBuffer)) {
        message = JSON.stringify(data)
      }
      this.ws.send(message)
      return true
    } catch (error) {
      console.error('[WebSocket] 发送消息失败:', error)
      return false
    }
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名称 ('open', 'message', 'close', 'error')
   * @param {Function} handler - 事件处理函数
   * @returns {Function} 取消订阅的函数
   */
  on(event, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('事件处理器必须是函数')
    }
    
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    
    this.eventHandlers.get(event).add(handler)
    
    // 返回取消订阅函数
    return () => this.off(event, handler)
  }

  /**
   * 取消订阅事件
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   */
  off(event, handler) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * 一次性订阅事件
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   */
  once(event, handler) {
    const onceHandler = (...args) => {
      this.off(event, onceHandler)
      handler(...args)
    }
    this.on(event, onceHandler)
  }

  /**
   * 获取当前连接状态
   * @returns {string} 连接状态描述
   */
  getState() {
    if (!this.ws) return 'CLOSED'
    
    const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']
    return states[this.ws.readyState]
  }

  /**
   * 检查是否已连接
   * @returns {boolean}
   */
  isConnected() {
    return this.ws && this.ws.readyState === WS_STATE.OPEN
  }

  /**
   * 获取重连尝试次数
   * @returns {number}
   */
  getReconnectAttempts() {
    return this.reconnectAttempts
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 绑定 WebSocket 原生事件
   * @private
   */
  _bindEvents() {
    if (!this.ws) return
    
    this.ws.addEventListener('open', this._handleOpen)
    this.ws.addEventListener('message', this._handleMessage)
    this.ws.addEventListener('close', this._handleClose)
    this.ws.addEventListener('error', this._handleError)
  }

  /**
   * 处理连接打开事件
   * @private
   */
  _handleOpen(event) {
    console.log('[WebSocket] 连接成功')
    this.reconnectAttempts = 0
    this.isManualClose = false
    this._isConnecting = false
    this._lastPongTime = Date.now()
    this._startHeartbeat()
    this._emit('open', event)
  }

  /**
   * 处理消息接收事件
   * @private
   */
  _handleMessage(event) {
    // 处理心跳响应
    if (typeof event.data === 'string' && (event.data === 'pong' || event.data === '"pong"')) {
      this._handlePong()
      return
    }
    
    let data = event.data
    // 只对字符串类型尝试 JSON 解析
    if (typeof event.data === 'string') {
      try {
        data = JSON.parse(event.data)
      } catch {
        // 保持原始字符串
      }
    }
    
    this._emit('message', data, event)
  }
  
  /**
   * 处理心跳响应
   * @private
   */
  _handlePong() {
    this._lastPongTime = Date.now()
    
    // 清除心跳超时定时器
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
    
    console.log('[WebSocket] 收到心跳响应')
  }

  /**
   * 处理连接关闭事件
   * @private
   */
  _handleClose(event) {
    console.log(`[WebSocket] 连接关闭: code=${event.code}, reason=${event.reason}`)
    this._clearTimers()
    this._emit('close', event)
    
    // 非手动关闭时触发重连
    if (!this.isManualClose && !this.isDestroyed) {
      this._scheduleReconnect()
    }
  }

  /**
   * 处理错误事件
   * @private
   */
  _handleError(event) {
    console.error('[WebSocket] 发生错误:', event)
    this._emit('error', event)
  }

  /**
   * 触发自定义事件
   * @private
   */
  _emit(event, ...args) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args)
        } catch (error) {
          console.error(`[WebSocket] 事件处理器执行出错 (${event}):`, error)
        }
      })
    }
  }

  /**
   * 计算重连延迟（指数退避 + 随机抖动）
   * @private
   * @returns {number} 重连延迟时间（毫秒）
   */
  _calculateReconnectDelay() {
    // 指数退避: delay * 2^(n-1)，但不超过最大值
    const baseDelay = this.config.reconnectDelay
    const multiplier = Math.pow(this.config.reconnectBackoffMultiplier, this.reconnectAttempts)
    const exponentialDelay = Math.min(
      baseDelay * multiplier,
      this.config.maxReconnectDelay
    )
    
    // 添加随机抖动 (±25%)，避免惊群效应
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1)
    const finalDelay = Math.floor(exponentialDelay + jitter)
    
    return Math.max(finalDelay, 100) // 最小 100ms
  }
  
  /**
   * 安排重新连接
   * @private
   */
  _scheduleReconnect() {
    if (this.isDestroyed || this.isManualClose) return
    
    // 检查最大重连次数
    if (this.config.maxReconnectAttempts !== null && 
        this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log(`[WebSocket] 已达到最大重连次数 (${this.config.maxReconnectAttempts})，停止重连`)
      this._emit('maxReconnectReached', this.reconnectAttempts)
      return
    }
    
    this.reconnectAttempts++
    const delay = this._calculateReconnectDelay()
    
    console.log(`[WebSocket] ${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连...`)
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isDestroyed && !this.isManualClose) {
        this.connect().catch(() => {
          // 连接失败会在 _handleClose 中再次触发重连
        })
      }
    }, delay)
  }

  /**
   * 启动心跳
   * @private
   */
  _startHeartbeat() {
    if (!this.config.heartbeatInterval || this.heartbeatTimer) return
    
    // 初始化上次心跳响应时间
    this._lastPongTime = Date.now()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send(this.config.heartbeatMessage)
        
        // 设置心跳超时检测
        if (this.config.heartbeatTimeout) {
          this.heartbeatTimeoutTimer = setTimeout(() => {
            const timeSinceLastPong = Date.now() - this._lastPongTime
            if (timeSinceLastPong >= this.config.heartbeatTimeout) {
              console.warn('[WebSocket] 心跳超时，强制重连')
              // 触发超时事件
              this._emit('heartbeatTimeout', { lastPongTime: this._lastPongTime, timeout: this.config.heartbeatTimeout })
              // 强制关闭连接，触发重连
              this.close(4001, 'Heartbeat timeout')
            }
          }, this.config.heartbeatTimeout)
        }
      }
    }, this.config.heartbeatInterval)
  }

  /**
   * 清除所有定时器
   * @private
   */
  _clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
    
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer)
      this.connectTimeoutTimer = null
    }
  }
}

/**
 * 创建 WebSocket 客户端的工厂函数
 * @param {string} url - WebSocket 服务器地址
 * @param {Object} options - 配置选项
 * @returns {WebSocketClient}
 */
export function createWebSocket(url, options) {
  return new WebSocketClient(url, options)
}

export default WebSocketClient
