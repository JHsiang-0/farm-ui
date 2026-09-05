import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import TDesign from 'tdesign-vue-next'

// Tailwind 仅提供布局工具；应用主题层在 TDesign 样式之后映射语义 Token。
import '@/styles/index.css'
import 'tdesign-vue-next/es/style/index.css'
import '@/styles/theme.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(TDesign)

app.mount('#app')
