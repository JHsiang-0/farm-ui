<template>
  <main class="connection-page">
    <section class="connection-card" aria-labelledby="connection-title">
      <div class="connection-brand">
        <span class="connection-brand__mark">3D</span>
        <span>FabMatrix</span>
      </div>

      <header class="connection-header">
        <div>
          <p class="connection-eyebrow">LOCAL EDITION</p>
          <h1 id="connection-title">连接生产服务器</h1>
          <p>先配置 FabMatrix 服务地址，再登录或完成首次管理员初始化。</p>
        </div>
        <t-tag theme="primary" variant="light">安全连接配置</t-tag>
      </header>

      <t-alert v-if="errorMessage" theme="error" :close-btn="false" class="connection-alert">
        {{ errorMessage }}
      </t-alert>
      <t-alert v-else-if="successMessage" theme="success" :close-btn="false" class="connection-alert">
        {{ successMessage }}
      </t-alert>

      <t-form :data="form" :rules="rules" label-align="top" @submit="handleSubmit">
        <t-form-item label="服务器地址" name="apiBaseUrl" help="例如：http://192.168.0.10:8080">
          <t-input v-model="form.apiBaseUrl" placeholder="http://服务器地址:端口" clearable />
        </t-form-item>
        <t-form-item label="WebSocket 地址（可选）" name="wsUrl" help="留空时根据服务器地址自动推导 /ws/farm-status">
          <t-input v-model="form.wsUrl" placeholder="ws://服务器地址:端口/ws/farm-status" clearable />
        </t-form-item>

        <div class="connection-actions">
          <t-button theme="primary" type="submit" :loading="testing">
            {{ testing ? '正在测试连接' : '测试并保存' }}
          </t-button>
          <t-button variant="outline" :disabled="testing" @click="resetToEnvironment">
            使用启动配置
          </t-button>
        </div>
      </t-form>

      <div class="connection-notes">
        <div class="connection-notes__title">连接说明</div>
        <ul>
          <li>地址只保存在当前浏览器或 Electron 用户配置中，不包含账号、密码和 Token。</li>
          <li>自动搜索局域网服务器需要后端提供发现协议；当前 API 的扫描功能仅用于发现打印机。</li>
          <li>测试会访问后端公开的健康检查接口，不会执行业务写操作。</li>
        </ul>
      </div>

      <div class="connection-footer">
        <span>当前配置：{{ displayBaseUrl }}</span>
        <t-button variant="text" size="small" @click="goLogin">返回登录</t-button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getServerConfig, normalizeServerUrl, saveServerConfig } from '@/utils/serverConfig'

defineOptions({ name: 'ServerConnectionView' })

const router = useRouter()
const initialConfig = getServerConfig()
const form = reactive({
  apiBaseUrl: initialConfig.apiBaseUrl,
  wsUrl: initialConfig.wsUrl
})
const testing = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const rules = {
  apiBaseUrl: [{ required: true, message: '请输入服务器地址' }]
}

const displayBaseUrl = computed(() => form.apiBaseUrl || '使用当前页面代理')

const getHealthUrl = baseUrl => `${normalizeServerUrl(baseUrl)}/actuator/health`

const handleSubmit = async ({ validateResult }) => {
  if (validateResult !== true) return

  testing.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await fetch(getHealthUrl(form.apiBaseUrl), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) throw new Error(`服务器返回 HTTP ${response.status}`)

    saveServerConfig(form)
    successMessage.value = '服务器连接成功，配置已保存。'
  } catch (error) {
    errorMessage.value = error?.message || '无法连接服务器，请检查地址、端口和网络。'
  } finally {
    testing.value = false
  }
}

const resetToEnvironment = () => {
  const config = getServerConfig()
  form.apiBaseUrl = config.apiBaseUrl
  form.wsUrl = config.wsUrl
  errorMessage.value = ''
  successMessage.value = '已载入当前启动配置，请测试后保存。'
}

const goLogin = () => router.push({ name: 'login' })
</script>

<style scoped>
.connection-page {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 32px 20px;
  background: var(--app-page-background);
}

.connection-card {
  width: min(100%, 620px);
  padding: 32px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-large);
  box-shadow: var(--app-shadow-raised);
}

.connection-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  color: var(--app-text-primary);
  font-size: 20px;
  font-weight: 700;
}

.connection-brand__mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: var(--app-text-on-brand);
  font-size: 12px;
  background: var(--app-primary);
  border-radius: 10px;
}

.connection-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.connection-eyebrow {
  margin: 0 0 6px;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.connection-header h1 {
  margin: 0;
  color: var(--app-text-primary);
  font-size: 28px;
  line-height: 1.35;
}

.connection-header p:not(.connection-eyebrow) {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.6;
}

.connection-alert {
  margin-bottom: 20px;
}

.connection-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.connection-notes {
  margin-top: 28px;
  padding: 16px;
  color: var(--app-text-secondary);
  background: var(--app-surface-muted);
  border-radius: var(--app-radius);
  font-size: 13px;
  line-height: 1.7;
}

.connection-notes__title {
  margin-bottom: 4px;
  color: var(--app-text-primary);
  font-weight: 600;
}

.connection-notes ul {
  margin: 0;
  padding-left: 18px;
}

.connection-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

@media (max-width: 640px) {
  .connection-card {
    padding: 24px 20px;
  }

  .connection-header {
    flex-direction: column;
  }

  .connection-actions {
    flex-direction: column;
  }

  .connection-actions .t-button {
    width: 100%;
  }

  .connection-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
