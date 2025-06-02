import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './views/Dashboard.vue'
import PowerManagement from './views/PowerManagement.vue'
import WaterManagement from './views/WaterManagement.vue'
import BuildingManagement from './views/BuildingManagement.vue'

const routes = [
    { path: '/', name: 'Dashboard', component: Dashboard },
    { path: '/power-management', name: 'PowerManagement', component: PowerManagement },
    { path: '/water-management', name: 'WaterManagement', component: WaterManagement },
    { path: '/building-management', name: 'BuildingManagement', component: BuildingManagement }
]

export default createRouter({
    history: createWebHistory(),
    routes
})