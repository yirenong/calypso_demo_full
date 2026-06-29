<template>
    <header :class="['app-header', { collapsed }]">
        <button class="hamburger-menu" @click="$emit('toggle-sidebar')">
            <i class="fas fa-bars"></i>
        </button>
        <div class="flex-spacer"></div>

        <div class="header-right">
            <!-- Fullscreen -->
            <button class="header-icon" @click="toggleFullScreen">
                <i class="fas fa-expand"></i>
            </button>

            <!-- Theme switch -->
            <button class="header-icon" @click="toggleTheme">
                <i :class="isDarkMode ? 'fas fa-sun' : 'fas fa-moon'"></i>
            </button>

            <!-- User menu -->
            <div class="user-menu-wrapper">
                <button class="header-icon user-icon" @click="toggleUserMenu">
                    <i class="fas fa-user"></i>
                </button>

                <div v-if="showUserMenu" class="user-menu">
                    <button class="logout-btn" @click="logout">Logout</button>
                </div>
            </div>
        </div>
    </header>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({ collapsed: Boolean })
const isDarkMode = ref(true)
const showUserMenu = ref(false)
const router = useRouter()

function toggleTheme() {
    isDarkMode.value = !isDarkMode.value
    document.body.classList.toggle('dark-mode', isDarkMode.value)
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
    } else if (document.exitFullscreen) {
        document.exitFullscreen()
    }
}

function toggleUserMenu() {
    showUserMenu.value = !showUserMenu.value
}

async function logout() {
    try {
        // 1) Close the dropdown
        showUserMenu.value = false

        // 2) Local/session storage
        localStorage.clear()
        sessionStorage.clear()

        // 3) Cookies for this origin (best-effort)
        document.cookie.split(';').forEach(c => {
            const [name] = c.split('=')
            if (!name) return
            document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        })

        // 4) IndexedDB (supported in modern browsers)
        if (window.indexedDB) {
            if (indexedDB.databases) {
                // Enumerate and delete all DBs (Chromium/Firefox)
                const dbs = await indexedDB.databases()
                await Promise.all(
                    dbs.map(db => db?.name && new Promise((res, rej) => {
                        const req = indexedDB.deleteDatabase(db.name)
                        req.onsuccess = () => res()
                        req.onerror = () => rej(req.error)
                        req.onblocked = () => res() // best effort
                    }))
                )
            } else {
                // Fallback: if you know your DB names, delete them explicitly here
                // e.g. deleteDB('myAppDB')
            }
        }

        // 5) Cache Storage (Service Worker caches)
        if ('caches' in window) {
            const keys = await caches.keys()
            await Promise.all(keys.map(k => caches.delete(k)))
        }

        // 6) Unregister service workers (forces fresh load next visit)
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations()
            await Promise.all(regs.map(r => r.unregister()))
        }

        // 7) Let other tabs know
        window.dispatchEvent(new Event('auth-changed'))
    } catch (err) {
        // Not fatal; we still redirect.
        console.warn('Logout cleanup issue:', err)
    } finally {
        // 8) Hard-redirect to login to ensure a clean app state
        router.replace('/login')
    }
}


// Close dropdown if clicked outside
function handleClickOutside(event) {
    const menu = document.querySelector('.user-menu-wrapper')
    if (menu && !menu.contains(event.target)) {
        showUserMenu.value = false
    }
}

onMounted(() => {
    document.body.classList.add('dark-mode')
    document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.app-header {
    position: fixed;
    top: 0;
    left: 240px;
    width: calc(100% - 240px);
    height: 60px;
    background: var(--header-bg-color);
    border-bottom: 1px solid var(--header-border-color);
    display: flex;
    align-items: center;
    padding: 0 20px;
    transition: left 0.3s, width 0.3s;
    z-index: 10;
}

.app-header.collapsed {
    left: 76px;
    width: calc(100% - 76px);
}

.hamburger-menu,
.header-icon {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--header-text-color);
}

.hamburger-menu {
    font-size: 24px;
}

.flex-spacer {
    flex: 1;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 15px;
}

.header-icon {
    font-size: 20px;
    transition: color 0.3s;
}

.header-icon:hover {
    color: var(--header-icon-hover-color);
}

.user-icon {
    font-size: 20px;
}

.user-menu-wrapper {
    position: relative;
}

.user-menu {
    position: absolute;
    right: 0;
    top: 40px;
    background: var(--header-bg-color);
    border: 1px solid var(--header-border-color);
    border-radius: 6px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    padding: 10px;
    z-index: 20;
}

.logout-btn {
    background: #e74c3c;
    color: white;
    border: none;
    padding: 8px 14px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    width: 100%;
    text-align: left;
}

.logout-btn:hover {
    background: #c0392b;
}

/* Mobile: full-width header */
@media (max-width: 900px) {
    .app-header,
    .app-header.collapsed {
        left: 0 !important;
        width: 100% !important;
        padding: 0 12px;
    }

    .header-right {
        gap: 8px;
    }

    .header-icon {
        font-size: 18px;
        padding: 8px;
    }
}
</style>
