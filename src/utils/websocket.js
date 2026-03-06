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
  /** 重连延迟时间（毫秒） */
  reconnectDelay: 3000,
  /** 最大重连次数，null 表示无限重连 */
  maxReconnectAttempts: null,
  /** 心跳间隔（毫秒），null 表示不发送心跳 */
  heartbeatInterval: null,
  /** 心跳消息内容 */
  heartbeatMessage: 'ping',
  /** 是否自动连接 */
  autoConnect: true,
  /** 连接超时时间（毫秒） */
  connectTimeout: 10000
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
    
    /** @private @type {WebSocket|null} */
    this.ws = null
    /** @private @type {number|null} */
    this.reconnectTimer = null
    /** @private @type {number|null} */
    this.heartbeatTimer = null
    /** @private @type {number|null} */
    this.connectTimeoutTimer = null
    
    /** @private @type {number} */
    this.reconnectAttempts = 0
    /** @private @type {boolean} */
    this.isManualClose = false
    /** @private @type {boolean} */
    this.isDestroyed = false
    
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
    return new Promise((resolve, reject) => {
      if (this.isDestroyed) {
        reject(new Error('WebSocket 实例已被销毁'))
        return
      }
      
      if (this.ws && this.ws.readyState === WS_STATE.OPEN) {
        console.log('[WebSocket] 连接已存在且处于打开状态')
        resolve()
        return
      }
      
      if (this.ws && this.ws.readyState === WS_STATE.CONNECTING) {
        console.log('[WebSocket] 连接正在建立中...')
        // 等待连接结果
        const checkState = setInterval(() => {
          if (!this.ws || this.ws.readyState !== WS_STATE.CONNECTING) {
            clearInterval(checkState)
            if (this.ws && this.ws.readyState === WS_STATE.OPEN) {
              resolve()
            } else {
              reject(new Error('连接失败'))
            }
          }
        }, 100)
        
        // 设置连接超时
        setTimeout(() => {
          clearInterval(checkState)
          reject(new Error('连接超时'))
        }, this.config.connectTimeout)
        return
      }
      
      try {
        console.log(`[WebSocket] 正在连接到: ${this.url}`)
        this.ws = new WebSocket(this.url)
        
        // 设置连接超时
        this.connectTimeoutTimer = setTimeout(() => {
          if (this.ws && this.ws.readyState === WS_STATE.CONNECTING) {
            console.error('[WebSocket] 连接超时')
            this.ws.close()
            reject(new Error('连接超时'))
          }
        }, this.config.connectTimeout)
        
        // 临时的一次性 open 处理器用于 Promise 解析
        const onOpenOnce = () => {
          clearTimeout(this.connectTimeoutTimer)
          this.connectTimeoutTimer = null
          this.ws.removeEventListener('open', onOpenOnce)
          resolve()
        }
        
        this.ws.addEventListener('open', onOpenOnce)
        this._bindEvents()
        
      } catch (error) {
        console.error('[WebSocket] 创建连接失败:', error)
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
    this._startHeartbeat()
    this._emit('open', event)
  }

  /**
   * 处理消息接收事件
   * @private
   */
  _handleMessage(event) {
    // 处理心跳响应
    if (event.data === 'pong' || event.data === '"pong"') {
      console.log('[WebSocket] 收到心跳响应')
      return
    }
    
    let data = event.data
    try {
      // 尝试解析 JSON
      data = JSON.parse(event.data)
    } catch {
      // 保持原始字符串
    }
    
    this._emit('message', data, event)
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
    
    console.log(`[WebSocket] ${this.config.reconnectDelay}ms 后尝试第 ${this.reconnectAttempts} 次重连...`)
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isDestroyed && !this.isManualClose) {
        this.connect().catch(() => {
          // 连接失败会在 _handleClose 中再次触发重连
        })
      }
    }, this.config.reconnectDelay)
  }

  /**
   * 启动心跳
   * @private
   */
  _startHeartbeat() {
    if (!this.config.heartbeatInterval || this.heartbeatTimer) return
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send(this.config.heartbeatMessage)
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
