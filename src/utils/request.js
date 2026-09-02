import axios from 'axios'
import { message } from './message'
import { useUserStore } from '@/stores/user'
import router from '@/router'
import { HTTP_STATUS, BUSINESS_CODE, REQUEST_TIMEOUT } from './constants'
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

const withAuthHeader = config => {
  const userStore = useUserStore()
  const headers = { ...config.headers }

  if (userStore.token) {
    headers.Authorization = `Bearer ${userStore.token}`
  }

  return { ...config, headers }
}

const validateResponse = res => {
  if (res.code !== BUSINESS_CODE.SUCCESS) {
    const error = new Error(res.message || '系统异常')
    error.response = {
      status: res.code,
      data: res
    }
    throw error
  }

  return res
}

const handleRequestError = error => {
  const responseData = error.response?.data
  const status = error.response?.status
  const getErrorMessage = () => {
    if (responseData?.message) return responseData.message

    switch (status) {
      case HTTP_STATUS.UNAUTHORIZED:
        return '登录已过期，请重新登录'
      case HTTP_STATUS.FORBIDDEN:
        return '拒绝访问'
      case HTTP_STATUS.NOT_FOUND:
        return '请求的资源不存在'
      case HTTP_STATUS.SERVER_ERROR:
        return '服务器内部错误'
      default:
        return status ? `请求失败 (${status})` : error.message || '网络连接异常'
    }
  }

  if (status === HTTP_STATUS.UNAUTHORIZED || responseData?.code === BUSINESS_CODE.UNAUTHORIZED) {
    const userStore = useUserStore()
    userStore.logout()
    if (router.currentRoute.value.path !== '/login') {
      router.push('/login')
    }
  }

  message.error(getErrorMessage())
  console.error('[Response Error]', error)
  return Promise.reject(error)
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

const request = config => {
  if (!isMockEnabled) return service(config)

  return mockRequest(withAuthHeader(config))
    .then(validateResponse)
    .catch(handleRequestError)
}

export default request
