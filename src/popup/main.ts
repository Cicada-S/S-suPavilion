import { createApp } from 'vue'
import { createPinia } from 'pinia'
import MenuApp from './MenuApp.vue'
import './styles/main.scss'

const app = createApp(MenuApp)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
