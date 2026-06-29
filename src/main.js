import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { installFakeData } from './utils/fakeData'
import './assets/styles.css'
import './assets/base.css' 
import '@fortawesome/fontawesome-free/css/all.css'

installFakeData()

createApp(App)
    .use(router)
    .mount('#app')
