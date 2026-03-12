import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { inject } from '@vercel/analytics'
import './styles/main.scss'

const app = createApp(App)
inject()

app.use(createPinia())
app.use(router)

app.mount('#app')
