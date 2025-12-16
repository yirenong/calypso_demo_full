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
                    <!-- Admin-only: hidden completely for non-admins -->
                    <!-- <li v-if="isAdmin">
                        <router-link to="/building-management" class="menu-link">
                            <i class="fas fa-building"></i>
                            <span class="link-text">Real-Time Metrics</span>
                        </router-link>
                    </li> -->

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
                    <!-- <li>
                        <router-link to="/waste-management" class="menu-link">
                            <i class="fas fa-recycle"></i>
                            <span class="link-text">Waste Management</span>
                        </router-link>
                    </li> -->
                </ul>
            </div>
        </nav>
    </aside>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

defineProps({ collapsed: Boolean })

// read once, then keep in sync via events
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
    width: 15%;
    background: var(--sidebar-bg-color);
    color: var(--sidebar-text-color);
    padding-top: 24px;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    transition: width 0.3s, transform 0.3s;
    overflow: hidden;
}

.app-sidebar.collapsed {
    width: 5%;
}

/* Remove spacing between sections when collapsed */
.app-sidebar.collapsed .menu-section {
    margin-bottom: 0;
}

/* Only hide text/titles on desktop when collapsed */
@media (min-width: 769px) {

    .app-sidebar.collapsed .link-text,
    .app-sidebar.collapsed .menu-title {
        display: none;
    }
}

/* Spacing and layout */
.menu-section {
    margin-bottom: 32px;
}

.menu li {
    margin: 8px 0;
}

.menu-link {
    display: flex;
    align-items: center;
    padding: 12px 20px;
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
    padding-left: 12px;
    color: var(--sidebar-text-color);
}

/* Logo & titles */
.logo-section {
    text-align: center;
    margin-bottom: 32px;
}

.logo {
    height: 84px;
}

.menu-title {
    margin-left: 16px;
    margin-bottom: 8px;
    font-size: 11px;
    letter-spacing: 1px;
    color: var(--sidebar-text-color);
    text-transform: uppercase;
}

.app-sidebar.collapsed .menu-link {
    justify-content: center;
    padding: 12px 0;
}

.link-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Close “×” button: hidden desktop, visible mobile */
.close-btn {
    display: none;
}

@media (max-width: 768px) {
    .app-sidebar {
        transform: translateX(-100%);
        width: 0;
        z-index: 1000;
    }

    .app-sidebar.collapsed {
        transform: translateX(0);
        width: 100%;
    }

    .close-btn {
        display: block;
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        color: var(--sidebar-text-color);
        font-size: 24px;
        cursor: pointer;
    }

    /* Always show text/titles on mobile */
    .link-text,
    .menu-title {
        display: block !important;
    }

    /* Keep layout nice when expanded on mobile */
    .app-sidebar.collapsed .menu-link {
        justify-content: left;
        padding: 16px 16px;
    }
}

/* (Removed the greyed-out .disabled style since we no longer render it) */
</style>
