import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'

// 引入自定义主题样式，覆盖项目级视觉规范
import '@/styles/index.css'

// 引入全局响应式样式（包含流式排版、响应式容器、断点工具类等）
import '@/styles/responsive.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(TDesign)

app.mount('#app')
