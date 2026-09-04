import axios from 'axios'
import { message } from './message'
import { useUserStore } from '@/stores/user'
import router from '@/router'
import {
  HTTP_STATUS,
  BUSINESS_CODE,
  ERROR_MESSAGE_MAP,
  REQUEST_TIMEOUT
} from './constants'
import { isMockEnabled, mockRequest } from '@/mock'

/**
 * 请求配置常量
 * @constant {Object}
 */
const REQUEST_CONFIG = {
  TIMEOUT: REQUEST_TIMEOUT.DEFAULT,
  BASE_URL: '' // 使用 Vite proxy，此处留空
}

// 创建 axios 实例
const service = axios.create({
  baseURL: REQUEST_CONFIG.BASE_URL,
  timeout: REQUEST_CONFIG.TIMEOUT
})

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete'])
const pendingRequests = new Map()

const isUnsupportedBody = value => {
  if (value == null) return false

  return (
    (typeof FormData !== 'undefined' && value instanceof FormData) ||
    (typeof Blob !== 'undefined' && value instanceof Blob) ||
    (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer)
  )
}

const serializeRequestPart = value => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (isUnsupportedBody(value)) return null

  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

/**
 * 为非幂等请求生成锁键。同一请求在完成前只执行一次，避免快速重复点击造成重复提交。
 */
const getRequestLockKey = config => {
  if (config.dedupe === false) return null

  const method = String(config.method || 'get').toLowerCase()
  if (!MUTATING_METHODS.has(method)) return null

  if (config.dedupeKey) return String(config.dedupeKey)

  const params = serializeRequestPart(config.params)
  const data = serializeRequestPart(config.data)
  if (params === null || data === null) return null

  return `${method}:${config.url || ''}:${params}:${data}`
}

const withAuthHeader = config => {
  const userStore = useUserStore()
  const headers = { ...config.headers }

  if (userStore.token) {
    headers.Authorization = `Bearer ${userStore.token}`
  }

  return { ...config, headers }
}

const validateResponse = res => {
  if (!res || res.code !== BUSINESS_CODE.SUCCESS) {
    const error = new Error(res?.message || '系统异常')
    error.code = res?.code
    error.response = {
      status: res?.code,
      data: res
    }
    throw error
  }

  return res
}

const handleRequestError = error => {
  const safeError = error instanceof Error ? error : new Error(String(error || '请求失败'))
  if (safeError.code === 'ERR_CANCELED' || safeError.name === 'CanceledError') {
    return Promise.reject(safeError)
  }
  const responseData = safeError.response?.data
  const status = safeError.response?.status
  const code = responseData?.code ?? safeError.code ?? status
  const getErrorMessage = () => {
    if (responseData?.message) return responseData.message

    if (ERROR_MESSAGE_MAP[code]) return ERROR_MESSAGE_MAP[code]

    if (!status && !responseData) {
      return safeError.code === 'ECONNABORTED' || safeError.message?.includes('timeout')
        ? '请求超时，请检查后端服务是否正常运行'
        : '网络连接异常，请检查服务地址和网络连接'
    }

    switch (status) {
      case HTTP_STATUS.UNAUTHORIZED:
        return ERROR_MESSAGE_MAP[BUSINESS_CODE.UNAUTHORIZED]
      case HTTP_STATUS.FORBIDDEN:
        return ERROR_MESSAGE_MAP[BUSINESS_CODE.FORBIDDEN]
      case HTTP_STATUS.NOT_FOUND:
        return ERROR_MESSAGE_MAP[BUSINESS_CODE.NOT_FOUND]
      case HTTP_STATUS.CONFLICT:
        return ERROR_MESSAGE_MAP[BUSINESS_CODE.CONFLICT]
      case HTTP_STATUS.UNPROCESSABLE_ENTITY:
        return ERROR_MESSAGE_MAP[BUSINESS_CODE.UNPROCESSABLE_ENTITY]
      case HTTP_STATUS.SERVER_ERROR:
        return ERROR_MESSAGE_MAP[BUSINESS_CODE.ERROR]
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        return '服务暂时不可用，请稍后重试'
      default:
        return status ? `请求失败 (${status})` : safeError.message || '网络连接异常'
    }
  }

  if (status === HTTP_STATUS.UNAUTHORIZED || code === BUSINESS_CODE.UNAUTHORIZED) {
    const userStore = useUserStore()
    userStore.logout()
    if (router.currentRoute.value.path !== '/login') {
      router.push('/login')
    }
  }

  message.error(getErrorMessage())
  console.error('[Response Error]', safeError)
  return Promise.reject(safeError)
}

// Request 拦截器：统一处理请求配置
service.interceptors.request.use(
  config => {
    const userStore = useUserStore()
    
    // 携带 Token
    if (userStore.token) {
      config.headers['Authorization'] = `Bearer ${userStore.token}`
    }

    return config
  },
  error => {
    console.error('[Request Error]', error)
    return Promise.reject(error)
  }
)

// Response 拦截器：统一处理响应数据和错误
service.interceptors.response.use(
  response => {
    try {
      return validateResponse(response.data)
    } catch (error) {
      return handleRequestError(error)
    }
  },
  handleRequestError
)

const executeRequest = config => {
  if (!isMockEnabled) return service(config)

  return mockRequest(withAuthHeader(config))
    .then(validateResponse)
    .catch(handleRequestError)
}

const request = config => {
  const requestConfig = { ...config }
  const lockKey = getRequestLockKey(requestConfig)
  delete requestConfig.dedupe
  delete requestConfig.dedupeKey

  if (!lockKey) return executeRequest(requestConfig)

  const pendingRequest = pendingRequests.get(lockKey)
  if (pendingRequest) return pendingRequest

  const promise = Promise.resolve()
    .then(() => executeRequest(requestConfig))
    .finally(() => {
      if (pendingRequests.get(lockKey) === promise) {
        pendingRequests.delete(lockKey)
      }
    })

  pendingRequests.set(lockKey, promise)
  return promise
}

export default request
