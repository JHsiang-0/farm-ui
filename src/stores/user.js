import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { login } from '@/api/user'

const SESSION_STORAGE_KEY = 'farm-ui-session'

const readStoredSession = () => {
  if (typeof window === 'undefined') return null

  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      const value = storage.getItem(SESSION_STORAGE_KEY)
      if (value) return JSON.parse(value)
    } catch {
      // 存储不可用或内容损坏时继续尝试另一个存储区。
    }
  }

  return null
}

const clearStoredSession = () => {
  if (typeof window === 'undefined') return
  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      storage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      // 忽略浏览器禁用存储的情况，内存中的登录态仍会被清理。
    }
  }
}

const storedSession = readStoredSession()

export const useUserStore = defineStore('user', () => {
  const token = ref(storedSession?.token || '')
  const userInfo = ref(storedSession?.userInfo || {})
  const isAdmin = computed(() => userInfo.value.role === 'ADMIN')
  const isOperator = computed(() => userInfo.value.role === 'OPERATOR')

  const persistSession = remember => {
    if (typeof window === 'undefined') return

    clearStoredSession()
    try {
      const storage = remember ? window.localStorage : window.sessionStorage
      storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        token: token.value,
        userInfo: userInfo.value
      }))
    } catch {
      // 存储不可用时保留当前页面内存登录态，不阻断登录。
    }
  }

  const applyLoginResult = (data, options = {}) => {
    const role = String(data?.role || '').toUpperCase()

    if (!data?.token || !['ADMIN', 'OPERATOR'].includes(role)) {
      token.value = ''
      userInfo.value = {}
      clearStoredSession()
      throw new Error('登录响应缺少有效的身份信息')
    }

    token.value = String(data.token)
    userInfo.value = { ...data, role }
    persistSession(options.remember === true)
  }

  // 登录动作
  const userLogin = async (loginForm, options = {}) => {
    const res = await login(loginForm)
    applyLoginResult(res.data, options)
  }

  // 首次管理员初始化接口已经返回登录结果，避免创建后再次发送一次密码登录请求。
  const userLoginWithResult = (data, options = {}) => {
    applyLoginResult(data, options)
  }

  const hasRole = roles => {
    const requiredRoles = Array.isArray(roles) ? roles : [roles]
    return requiredRoles.filter(Boolean).some(role => role === userInfo.value.role)
  }

  // 登出动作
  const logout = () => {
    token.value = ''
    userInfo.value = {}
    clearStoredSession()
  }

  return {
    token,
    userInfo,
    isAdmin,
    isOperator,
    userLogin,
    userLoginWithResult,
    hasRole,
    logout
  }
})
