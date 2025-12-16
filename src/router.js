import { createRouter, createWebHistory } from 'vue-router'

// VIEWS
import EnergyManagement from './views/EnergyManagement.vue'
import WaterManagement from './views/WaterManagement.vue'
import BuildingManagement from './views/BuildingManagement.vue'
import UnifiedDashboard from './views/UnifiedDashboard.vue'
import AirManagement from './views/AirManagement.vue'
import ChillerPlant from './views/ChillerPlant.vue'
import TrendPoint from './views/TrendPoint.vue'
import ChillerDataPoints from './views/ChillerDataPoints.vue'
import WasteManagement from './views/WasteManagement.vue'
import Login from './views/Login.vue'

// --- helpers
function isAuthed() {
    return !!localStorage.getItem('auth_token')
}
function getRole() {
    return localStorage.getItem('auth_role') || 'user'
}

const routes = [
    // Public
    { path: '/login', name: 'Login', component: Login, meta: { public: true } },

    // Protected (auth)
    { path: '/', name: 'UnifiedDashboard', component: UnifiedDashboard, meta: { requiresAuth: true } },
    { path: '/energy-management', name: 'EnergyManagement', component: EnergyManagement, meta: { requiresAuth: true } },
    { path: '/water-management', name: 'WaterManagement', component: WaterManagement, meta: { requiresAuth: true } },
    {
        path: '/building-management',
        name: 'building-management',
        component: BuildingManagement,
        meta: { requiresAuth: true, requiresAdmin: true }, // ← admin only
        children: [
            {
                path: 'trend',
                name: 'trend-point',
                component: TrendPoint,
                meta: { requiresAuth: true, requiresAdmin: true } // ← admin only
            }
        ]
    },
    { path: '/air-management', name: 'AirManagement', component: AirManagement, meta: { requiresAuth: true } },
    { path: '/chiller-management', name: 'ChillerPlant', component: ChillerPlant, meta: { requiresAuth: true } },
    { path: '/chiller-points', name: 'ChillerDataPoints', component: ChillerDataPoints, meta: { requiresAuth: true } },
    { path: '/waste-management', name: 'WasteManagement', component: WasteManagement, meta: { requiresAuth: true } },

    // catch-all
    { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, from, next) => {
    const loggedIn = isAuthed()
    const role = getRole()

    if (to.matched.some(r => r.meta.requiresAuth) && !loggedIn) {
        return next({ name: 'Login', query: { redirect: to.fullPath } })
    }

    if (to.matched.some(r => r.meta.requiresAdmin) && role !== 'admin') {
        // non-admin trying to enter admin route
        return next({ path: '/' })
    }

    if (to.name === 'Login' && loggedIn) {
        return next(to.query.redirect || '/')
    }

    next()
})

export default router
