import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import router from '@/router'
import { HTTP_STATUS, BUSINESS_CODE, REQUEST_TIMEOUT } from './constants'

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
    const res = response.data

    // 业务状态码校验
    if (res.code !== BUSINESS_CODE.SUCCESS) {
      ElMessage.error(res.message || '系统异常')

      // 401 身份过期处理
      if (res.code === BUSINESS_CODE.UNAUTHORIZED) {
        const userStore = useUserStore()
        userStore.logout()
        router.push('/login')
      }
      
      return Promise.reject(new Error(res.message || 'Error'))
    }

    // 成功返回数据
    return res
  },
  error => {
    const getErrorMessage = () => {
      if (error.response) {
        switch (error.response.status) {
          case HTTP_STATUS.UNAUTHORIZED:
            return '登录已过期，请重新登录'
          case HTTP_STATUS.FORBIDDEN:
            return '拒绝访问'
          case HTTP_STATUS.NOT_FOUND:
            return '请求的资源不存在'
          case HTTP_STATUS.SERVER_ERROR:
            return '服务器内部错误'
          default:
            return error.response.data?.message || `请求失败 (${error.response.status})`
        }
      }
      return error.message || '网络连接异常'
    }

    ElMessage.error(getErrorMessage())
    console.error('[Response Error]', error)
    
    return Promise.reject(error)
  }
)

export default service
