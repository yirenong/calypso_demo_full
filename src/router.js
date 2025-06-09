import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './views/Dashboard.vue'
import EnergyManagement from './views/EnergyManagement.vue'
import WaterManagement from './views/WaterManagement.vue'
import BuildingManagement from './views/BuildingManagement.vue'

const routes = [
    { path: '/', name: 'Dashboard', component: Dashboard },
    { path: '/energy-management', name: 'EnergyManagement', component: EnergyManagement },
    { path: '/water-management', name: 'WaterManagement', component: WaterManagement },
    { path: '/building-management', name: 'BuildingManagement', component: BuildingManagement }
]

export default createRouter({
    history: createWebHistory(),
    routes
})