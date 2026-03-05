import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref({})

  // 登录动作
  const userLogin = async (loginForm) => {
    const res = await login(loginForm)
    // 假设后端 LoginResultDTO 返回了 token 和 username 等信息
    token.value = res.data.token
    userInfo.value = res.data
  }

  // 登出动作
  const logout = () => {
    token.value = ''
    userInfo.value = {}
  }

  return { token, userInfo, userLogin, logout }
}, {
  persist: true // 这个配置会自动把 token 存进 localStorage！
})