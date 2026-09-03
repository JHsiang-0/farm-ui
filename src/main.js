import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import TDesign from 'tdesign-vue-next'

// Tailwind 仅提供布局工具；TDesign 样式放在自定义样式之后，确保组件使用原生默认外观。
import '@/styles/index.css'
import '@/styles/responsive.css'
import 'tdesign-vue-next/es/style/index.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(TDesign)

app.mount('#app')
