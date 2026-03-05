import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import router from '@/router'

// 创建 axios 实例
const service = axios.create({
  baseURL: '', // 使用了 vite proxy，这里留空即可
  timeout: 10000 // 请求超时时间
})

// Request 拦截器：出门前检查并带上门禁卡 (Token)
service.interceptors.request.use(
  config => {
    const userStore = useUserStore()
    if (userStore.token) {
      // 携带企业级标准 Token 格式
      config.headers['Authorization'] = 'Bearer ' + userStore.token
    }
    return config
  },
  error => Promise.reject(error)
)

// Response 拦截器：回家时检查后端的统一 Result 对象
service.interceptors.response.use(
  response => {
    const res = response.data
    // 如果后端的统一返回 code 不是 200，说明业务报错了
    if (res.code !== 200) {
      ElMessage.error(res.message || '系统异常')
      
      // 401 身份过期拦截
      if (res.code === 401) {
        const userStore = useUserStore()
        userStore.logout() // 清除失效 token
        router.push('/login') // 踢回登录页
      }
      return Promise.reject(new Error(res.message || 'Error'))
    } else {
      // 成功则直接返回 data，前端业务代码就不用再 res.data.data 解构了
      return res
    }
  },
  error => {
    ElMessage.error(error.response?.data?.message || error.message || '网络请求异常')
    return Promise.reject(error)
  }
)

export default service