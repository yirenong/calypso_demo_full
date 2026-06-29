<template>
  <div id="app">
    <!-- Sidebar listens for toggle-sidebar to open/close on mobile and desktop -->
    <Sidebar :collapsed="isCollapsed" @toggle-sidebar="toggleSidebar" :inert="isLogin" />

    <div class="main" :class="{ collapsed: isCollapsed }" :inert="isLogin">
      <!-- Navbar also emits toggle-sidebar for hamburger -->
      <Navbar :collapsed="isCollapsed" @toggle-sidebar="toggleSidebar" />

      <!-- Main content area -->
      <div class="view-container">
        <router-view />
      </div>
    </div>

    <!-- Fullscreen overlay login; does not change layout underneath -->
    <Login v-if="isLogin" class="login-overlay" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import Navbar from './components/Navbar.vue'
import Login from './views/Login.vue' // <- your login view

const isCollapsed = ref(false)
function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
}

const route = useRoute()
const router = useRouter()

// Helper: read token safely
function hasToken() {
  return !!localStorage.getItem('auth_token')
}

// Keep overlay only on /login
const isLogin = computed(() => route.name === 'Login')

// Redirect rules:
// - If NO token and not already on Login -> go to Login (preserve intended path as ?redirect=...)
// - If HAS token and on Login -> go to UnifiedDashboard
function enforceAuth() {
  const authed = hasToken()
  if (!authed && route.name !== 'Login') {
    router.replace({ name: 'Login', query: { redirect: route.fullPath } })
  } else if (authed && route.name === 'Login') {
    router.replace({ name: 'UnifiedDashboard' })
  }
}

// Initial check
onMounted(() => {
  enforceAuth()
})

// Re-check on every navigation
watch(() => route.fullPath, () => {
  enforceAuth()
})

// Also react to login/logout happening in other tabs or programmatically:
// - Login code should set auth_token and (optionally) dispatch 'auth-changed'
// - Logout should remove it and dispatch too
window.addEventListener('storage', (e) => {
  if (e.key === 'auth_token') enforceAuth()
})
window.addEventListener('auth-changed', enforceAuth)
</script>

<style scoped>
#app {
  display: flex;
  height: 100vh;
  width: 100%;
  min-width: 0;
  position: relative;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 240px;
  transition: margin-left 0.3s;
}

.main.collapsed {
  margin-left: 76px;
}

.view-container {
  margin-top: 60px;
  flex: 1;
  overflow: auto;
  background: var(--main-bg-color);
  padding: clamp(12px, 2vw, 20px);
  min-width: 0;
}

/* Mobile responsive */
@media (max-width: 900px) {
  .main {
    margin-left: 0;
  }

  .main.collapsed {
    margin-left: 0;
  }

  .view-container {
    padding: 12px;
  }
}

/* Fullscreen overlay for login; keeps underlying layout untouched */
.login-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: #0b1220;
  /* or rgba(0,0,0,.75) if you want to dim */
}

/* (Optional) Prevent pointer events to underlying content while login shows */
[inert] {
  pointer-events: none;
}
</style>
