<template>
    <aside :class="['app-sidebar', { collapsed }]">
        <div class="logo-section">
            <img src="../assets/cavill_logo2.png" alt="Logo" class="logo" />
        </div>

        <!-- Close button on mobile only -->
        <button class="close-btn" @click="$emit('toggle-sidebar')">&times;</button>

        <nav>
            <div class="menu-section">
                <span class="menu-title">MENU</span>
                <ul class="menu">
                    <li>
                        <router-link to="/" class="menu-link">
                            <i class="fas fa-home"></i>
                            <span class="link-text">Dashboard</span>
                        </router-link>
                    </li>
                </ul>
            </div>

            <div class="menu-section">
                <span class="menu-title">MANAGEMENT</span>
                <ul class="menu">
                    <li>
                        <router-link to="/energy-management" class="menu-link">
                            <i class="fas fa-bolt"></i>
                            <span class="link-text">Energy Management</span>
                        </router-link>
                    </li>
                    <li>
                        <router-link to="/water-management" class="menu-link">
                            <i class="fas fa-tint"></i>
                            <span class="link-text">Water Management</span>
                        </router-link>
                    </li>
                    <li>
                        <router-link to="/waste-management" class="menu-link">
                            <i class="fas fa-recycle"></i>
                            <span class="link-text">Waste Management</span>
                        </router-link>
                    </li>
                    <li>
                        <router-link to="/tenant-management" class="menu-link">
                            <i class="fas fa-person"></i>
                            <span class="link-text">Tenant Management</span>
                        </router-link>
                    </li>
                    <li>
                        <router-link to="/landscape-management" class="menu-link">
                            <i class="fas fa-leaf"></i>
                            <span class="link-text">Landscape Management</span>
                        </router-link>
                    </li>
                </ul>
            </div>
        </nav>

        <!-- ✅ Bottom Logo (icon persists when collapsed) -->
        <div class="bottom-logo">
            <img src="../assets/cavill_logo.png" alt="Cavill Logo" />
        </div>
    </aside>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

defineProps({ collapsed: Boolean })

const role = ref(localStorage.getItem('auth_role') || 'user')
const isAdmin = computed(() => role.value === 'admin')

function syncRole() {
    role.value = localStorage.getItem('auth_role') || 'user'
}

onMounted(() => {
    window.addEventListener('storage', syncRole)
    window.addEventListener('auth-changed', syncRole)
})

onBeforeUnmount(() => {
    window.removeEventListener('storage', syncRole)
    window.removeEventListener('auth-changed', syncRole)
})
</script>

<style scoped>
.app-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 240px;
    background: var(--sidebar-bg-color);
    color: var(--sidebar-text-color);
    padding: 24px 0 0;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    transition: width 0.3s, transform 0.3s;
    overflow: hidden;
}

.app-sidebar.collapsed {
    width: 76px;
}

nav {
    padding: 0 14px;
}

/* Hide text/titles when collapsed (desktop only) */
@media (min-width: 769px) {

    .app-sidebar.collapsed .link-text,
    .app-sidebar.collapsed .menu-title {
        display: none;
    }
}

/* Menu layout */
.menu-section {
    margin-bottom: 32px;
}

.menu-title {
    display: block;
    padding: 0 6px;
    margin-bottom: 8px;
}

.menu li {
    margin: 8px 0;
}

.menu-link {
    display: flex;
    align-items: center;
    padding: 12px 14px;
    color: inherit;
    text-decoration: none;
    border-radius: 4px;
    transition: background 0.2s;
}

.menu-link i {
    margin-right: 12px;
    font-size: 16px;
}

.menu-link:hover {
    background: var(--sidebar-hover-color);
}

.router-link-active {
    background: var(--sidebar-hover-color);
    border-left: 4px solid var(--header-icon-hover-color);
    padding-left: 10px;
}

/* Logo */
.logo-section {
    text-align: center;
    margin-bottom: 32px;
}

.logo {
    height: 80px;
    max-width: calc(100% - 24px);
    object-fit: contain;
}

/* Center icons when collapsed */
.app-sidebar.collapsed .menu-link {
    justify-content: center;
    padding: 12px 0;
}

.app-sidebar.collapsed nav {
    padding: 0 8px;
}

/* Bottom logo */
.bottom-logo {
    position: absolute;
    bottom: 16px;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.3s;
}

.bottom-logo img {
    height: 55px;
    transition: transform 0.3s, max-width 0.3s;
}

/* ✅ Shrink logo into icon when collapsed (desktop) */
@media (min-width: 769px) {
    .app-sidebar.collapsed .bottom-logo img {
        max-width: 55px;
    }
}

/* Close button (mobile only) */
.close-btn {
    display: none;
}

@media (max-width: 900px) {
    .app-sidebar {
        transform: translateX(-100%);
        width: 0;
        z-index: 1000;
        max-width: 320px;
    }

    .app-sidebar.collapsed {
        transform: translateX(0);
        width: min(82vw, 320px);
    }

    .close-btn {
        display: block;
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
    }

    /* Always show text on mobile */
    .link-text,
    .menu-title {
        display: block !important;
    }

    .app-sidebar.collapsed .menu-link {
        justify-content: left;
        padding: 16px 16px;
    }

    nav {
        padding: 0 18px;
    }
}

@media (max-width: 520px) {
    .app-sidebar.collapsed {
        width: 100vw;
        max-width: none;
    }

    .bottom-logo {
        position: static;
        margin-top: 24px;
        padding-bottom: 16px;
    }

    .app-sidebar {
        overflow-y: auto;
    }
}
</style>
