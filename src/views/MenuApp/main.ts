import { createApp } from 'vue'
import { createPinia } from 'pinia'
import MenuApp from './index.vue'
import '../../styles/menu.scss'

const app = createApp(MenuApp)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
