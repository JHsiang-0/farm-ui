<template>
  <div class="login-page">
    <div class="login-container animate-slide-up">
      <!-- 左侧品牌区 -->
      <div class="brand-panel">
        <div class="brand-content">
          <div class="brand-icon">
            <Monitor :size="64" stroke-color="#ffffff" />
          </div>
          <h1 class="brand-title">3D 打印农场</h1>
          <p class="brand-subtitle">智能总控管理系统</p>

          <div class="brand-divider"></div>

          <div class="feature-list">
            <div class="feature-item">
              <div class="feature-icon">
                <span><View /></span>
              </div>
              <span class="feature-text">实时监控设备状态</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">
                <span><DataAnalysis /></span>
              </div>
              <span class="feature-text">智能数据分析</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">
                <span><Connection /></span>
              </div>
              <span class="feature-text">远程批量控制</span>
            </div>
          </div>
        </div>

        <!-- 装饰圆圈 -->
        <div class="decoration-circle circle-1"></div>
        <div class="decoration-circle circle-2"></div>
      </div>

      <!-- 右侧表单区 -->
      <div class="form-panel">
        <!-- 登录表单 -->
        <div class="form-wrapper animate-fade-in">
          <div class="form-header">
            <h2 class="form-title">欢迎回来</h2>
            <p class="form-desc">请登录您的账户以继续操作</p>
          </div>

          <t-form :data="loginForm"
            :rules="rules"
            ref="loginFormRef"
            size="large"
            class="login-form"
          >
            <t-form-item name="username">
              <t-input
                v-model="loginForm.username"
                placeholder="请输入用户名"
                :prefix-icon="renderIcon(User)"
                clearable
              />
            </t-form-item>

            <t-form-item name="password">
              <t-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                :prefix-icon="renderIcon(Lock)"
                @keyup.enter="handleLogin"
              />
            </t-form-item>

            <div class="form-options">
              <t-checkbox v-model="rememberMe">记住我</t-checkbox>
              <t-link theme="primary" :underline="false" class="forgot-link">
                忘记密码？
              </t-link>
            </div>

            <t-button theme="primary"
              size="large"
              class="submit-btn"
              :loading="loading"
              @click="handleLogin"
            >
              登 录
            </t-button>
          </t-form>

        </div>
      </div>
    </div>

    <!-- 页脚版权 -->
    <div class="login-footer">
      <p>&copy; 2024 3D打印农场管理系统. All rights reserved.</p>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: 'LoginView' })
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from '@/utils/message'
import { renderIcon } from '@/utils/tdesign'
import { useUserStore } from '@/stores/user'
import {
  UserIcon as User,
  LockOnIcon as Lock,
  DesktopIcon as Monitor,
  ViewImageIcon as View,
  ChartIcon as DataAnalysis,
  MapConnectionIcon as Connection
} from 'tdesign-icons-vue-next'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const rememberMe = ref(false)

const loginForm = reactive({ username: '', password: '' })

const loginFormRef = ref(null)

const validatePassword = (value) => {
  if (!value) return { result: false, message: '请输入密码' }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,20}$/.test(value)) {
    return { result: false, message: '密码必须为6-20位且包含大小写字母和数字' }
  }
  return true
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度应为3-20个字符', trigger: 'blur' }
  ],
  password: [
    { validator: validatePassword, trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  await loginFormRef.value.validate()
  loading.value = true
  try {
    await userStore.userLogin(loginForm, { remember: rememberMe.value })
    message.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/'
    router.push(redirect)
  } catch (e) {
    message.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}

</script>

<style scoped>
/* ============================================
   Login Page Styles - Enterprise Theme
   使用 CSS 变量确保兼容性
   ============================================ */

.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1f2937 0%, #1e3a8a 50%, #1e40af 100%);
  padding: 24px;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.login-page::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 70%, rgba(29, 78, 216, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 70% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 40%);
  pointer-events: none;
}

.login-container {
  display: flex;
  width: 100%;
  max-width: 1000px;
  min-height: 600px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  position: relative;
  z-index: 1;
}

/* ============================================
   Brand Panel - 左侧品牌区
   ============================================ */
.brand-panel {
  width: 42%;
  background: linear-gradient(135deg, var(--farm-color-primary) 0%, #1e40af 60%, #1e3a8a 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 32px;
}

.brand-content {
  text-align: center;
  position: relative;
  z-index: 2;
}

.brand-icon {
  margin-bottom: 24px;
  animation: float 3s ease-in-out infinite;
}

.brand-icon :deep(.t-icon) {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.brand-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
  letter-spacing: 2px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.brand-subtitle {
  font-size: 14px;
  margin: 0;
  opacity: 0.85;
  font-weight: 400;
  letter-spacing: 1px;
}

.brand-divider {
  width: 60px;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  margin: 24px auto;
  border-radius: 2px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 13px;
  opacity: 0.9;
}

.feature-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
}

.feature-icon .t-icon {
  font-size: 16px;
}

.feature-text {
  font-weight: 500;
}

/* 装饰圆圈 */
.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  pointer-events: none;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
}

.circle-2 {
  width: 200px;
  height: 200px;
  bottom: -60px;
  left: -60px;
}

/* ============================================
   Form Panel - 右侧表单区
   ============================================ */
.form-panel {
  width: 58%;
  padding: 40px 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: #ffffff;
}

.form-wrapper {
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--farm-text-color-primary);
  margin: 0 0 8px;
}

.form-desc {
  font-size: 14px;
  color: var(--farm-text-color-secondary);
  margin: 0;
}

/* 表单样式 */
.login-form :deep(.t-form-item),
.register-form :deep(.t-form-item) {
  margin-bottom: 20px;
}

.login-form :deep(.t-form-item:last-child),
.register-form :deep(.t-form-item:last-child) {
  margin-bottom: 0;
}

.login-form :deep(.t-input__wrapper),
.register-form :deep(.t-input__wrapper) {
  padding: 1px 16px;
}

.login-form :deep(.t-input__inner),
.register-form :deep(.t-input__inner) {
  height: 48px;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.form-options :deep(.t-checkbox__label) {
  font-size: 13px;
  color: var(--farm-text-color-regular);
}

.forgot-link {
  font-size: 13px;
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 6px;
}

.terms-item {
  margin-bottom: 16px !important;
}

.terms-text {
  font-size: 13px;
  color: var(--farm-text-color-regular);
}

.terms-text :deep(.t-link) {
  font-size: 13px;
  vertical-align: baseline;
}

/* 切换区域 */
.form-switch {
  margin-top: 32px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.switch-text {
  font-size: 13px;
  color: var(--farm-text-color-secondary);
}

.switch-btn {
  font-size: 13px;
  font-weight: 600;
}

/* ============================================
   Footer - 页脚
   ============================================ */
.login-footer {
  margin-top: 32px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  position: relative;
  z-index: 1;
}

.login-footer p {
  margin: 0;
}

/* ============================================
   Responsive - 响应式
   ============================================ */
@media (max-width: 900px) {
  .login-container {
    flex-direction: column;
    max-width: 480px;
  }

  .brand-panel,
  .form-panel {
    width: 100%;
  }

  .brand-panel {
    min-height: 200px;
    padding: 32px;
  }

  .form-panel {
    padding: 32px;
  }

  .circle-1,
  .circle-2 {
    display: none;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 16px;
  }

  .form-panel {
    padding: 24px;
  }

  .brand-title {
    font-size: 24px;
  }

  .form-title {
    font-size: 20px;
  }
}
</style>
