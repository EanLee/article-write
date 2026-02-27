import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import { initSentry } from './config/sentry'

// 盡早初始化 Sentry Renderer，確保能捕捉到應用啟動階段的錯誤
initSentry()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')