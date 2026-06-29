<template>
    <div class="login-root" @keyup.escape="clearErrors">
        <!-- Decorative backdrop -->
        <div class="bg-gradient"></div>
        <div class="glow glow-a"></div>
        <div class="glow glow-b"></div>

        <!-- Card -->
        <section class="card" role="dialog" aria-labelledby="login-title" aria-describedby="login-subtitle">
            <header class="card-header">
                <div class="brand">
                    <div class="brand-mark">C</div>
                    <div class="brand-text">
                        <h1 id="login-title" class="title">Welcome back</h1>
                        <p id="login-subtitle" class="subtitle">Sign in to continue</p>
                    </div>
                </div>
            </header>

            <form class="form" @submit.prevent="onSubmit" novalidate>
                <!-- Error banner -->
                <div v-if="errorMsg" class="alert" role="alert">
                    {{ errorMsg }}
                </div>

                <!-- Username -->
                <label class="label" for="login-username">Username</label>
                <div class="input-wrap">
                    <input id="login-username" class="input" v-model.trim="username" type="text" autocomplete="username"
                        placeholder="admin or user" :aria-invalid="!!fieldError.username"
                        :aria-describedby="fieldError.username ? 'err-user' : undefined" />
                    <span v-if="fieldError.username" id="err-user" class="field-err">{{ fieldError.username }}</span>
                </div>

                <!-- Password -->
                <label class="label" for="login-password">Password</label>
                <div class="input-wrap has-action">
                    <input id="login-password" class="input" :type="showPassword ? 'text' : 'password'"
                        v-model.trim="password" autocomplete="current-password" placeholder="••••••••"
                        :aria-invalid="!!fieldError.password"
                        :aria-describedby="fieldError.password ? 'err-pass' : undefined" />
                    <button type="button" class="input-action" :aria-pressed="showPassword ? 'true' : 'false'"
                        @click="showPassword = !showPassword" :title="showPassword ? 'Hide password' : 'Show password'">
                        {{ showPassword ? 'Hide' : 'Show' }}
                    </button>
                </div>
                <span v-if="fieldError.password" id="err-pass" class="field-err">{{ fieldError.password }}</span>

                <!-- Options row -->
                <div class="row">
                    <label class="check">
                        <input type="checkbox" v-model="remember" />
                        <span>Remember me</span>
                    </label>
                    <button class="link" type="button" @click="onForgot">Forgot password?</button>
                </div>

                <!-- Submit -->
                <button class="btn" type="submit" :disabled="disabled || loading">
                    <span v-if="!loading">Sign In</span>
                    <span v-else class="loader" aria-hidden="true"></span>
                </button>
            </form>
        </section>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// simple in-memory accounts
const accounts = {
    admin: { password: 'admin', role: 'admin' },
    user: { password: 'user123', role: 'user' },
    ite1: { password: '123456', role: 'admin' },
    ite2: { password: '123456', role: 'user' }
}

// form state
const username = ref('')
const password = ref('')
const remember = ref(true)
const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const fieldError = ref({ username: '', password: '' })

const disabled = computed(() => !username.value || !password.value)

function validate() {
    fieldError.value = { username: '', password: '' }
    errorMsg.value = ''
    let ok = true
    if (!username.value) {
        fieldError.value.username = 'Please enter your username.'
        ok = false
    }
    if (!password.value) {
        fieldError.value.password = 'Please enter your password.'
        ok = false
    }
    return ok
}

function clearErrors() {
    errorMsg.value = ''
    fieldError.value = { username: '', password: '' }
}

async function onSubmit() {
    if (!validate()) return
    loading.value = true
    errorMsg.value = ''

    try {
        // Simulate auth request
        await new Promise(res => setTimeout(res, 650))

        const key = username.value.trim().toLowerCase()
        const acct = accounts[key]
        if (!acct || acct.password !== password.value) {
            throw new Error('Invalid credentials.')
        }

        // Clear any stale auth keys first (avoids "stuck as admin")
        const AUTH_KEYS = ['auth_token', 'auth_role', 'role', 'username', 'remember_me']
        AUTH_KEYS.forEach(k => localStorage.removeItem(k))

        const token = 'dummy_token_' + Math.random().toString(36).slice(2)

        // Write fresh auth state
        localStorage.setItem('auth_token', token)
        localStorage.setItem('remember_me', remember.value ? '1' : '0')
        localStorage.setItem('auth_role', acct.role) // source of truth
        localStorage.setItem('role', acct.role)      // legacy (if anything still reads 'role')
        localStorage.setItem('username', key)

        // Notify other tabs/components
        window.dispatchEvent(new Event('auth-changed'))

        router.replace({ name: 'UnifiedDashboard' })
    } catch (e) {
        errorMsg.value = e?.message || 'Unable to sign in. Please try again.'
    } finally {
        loading.value = false
    }
}

function onForgot() {
    errorMsg.value = 'Please contact an administrator to reset your password.'
}
</script>

<style scoped>
/* --------- basic constants --------- */
:root {
    /* no custom properties used; kept for accessibility focus fallback */
}

/* ---------- LAYOUT / BACKDROP ---------- */
.login-root {
    position: relative;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: #0b1220;
    color: #ffffff;
    overflow: hidden;
    padding: 16px;
}

.bg-gradient {
    position: absolute;
    inset: -20%;
    background:
        radial-gradient(60% 60% at 20% 20%, rgba(56, 189, 248, 0.15), transparent 60%),
        radial-gradient(50% 50% at 80% 20%, rgba(34, 197, 94, 0.12), transparent 60%),
        radial-gradient(60% 60% at 50% 90%, rgba(99, 102, 241, 0.14), transparent 60%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
    filter: blur(20px);
    z-index: 0;
}

.glow {
    position: absolute;
    width: 420px;
    height: 420px;
    border-radius: 9999px;
    filter: blur(70px);
    opacity: 0.55;
    z-index: 0;
    pointer-events: none;
    transform: translateZ(0);
    animation: float 14s ease-in-out infinite;
}

.glow-a {
    background: rgba(59, 130, 246, 0.2);
    top: 8%;
    left: 8%;
    animation-delay: -2s;
}

.glow-b {
    background: rgba(16, 185, 129, 0.18);
    bottom: 6%;
    right: 10%;
    animation-delay: -6s;
}

@keyframes float {
    0% {
        transform: translate3d(0, 0, 0);
    }

    50% {
        transform: translate3d(0, -18px, 0);
    }

    100% {
        transform: translate3d(0, 0, 0);
    }
}

/* ---------- CARD ---------- */
.card {
    position: relative;
    z-index: 1;
    width: min(92vw, 440px);
    padding: 28px 26px 24px;
    background: rgba(15, 23, 42, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    box-shadow:
        0 10px 30px rgba(0, 0, 0, 0.45),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
}

/* ---------- HEADER ---------- */
.card-header {
    margin-bottom: 16px;
}

.brand {
    display: flex;
    align-items: center;
    gap: 12px;
}

.brand-mark {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    font-weight: 800;
    letter-spacing: 0.5px;
    background: linear-gradient(135deg, #3b82f6, #22c55e);
    color: #fff;
    box-shadow: 0 6px 16px rgba(34, 197, 94, 0.28);
}

.brand-text {
    display: flex;
    flex-direction: column;
}

.title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    color: #fff;
    line-height: 1.2;
}

.subtitle {
    margin: 4px 0 0;
    font-size: 0.95rem;
    color: #ffffff;
    line-height: 1.2;
}

/* ---------- FORM ---------- */
.form {
    display: grid;
    gap: 12px;
}

.label {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.9);
    margin-top: 2px;
}

.input-wrap {
    position: relative;
    display: grid;
    gap: 6px;
}

.input {
    width: 100%;
    height: 44px;
    padding: 12px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.06);
    color: #fff;
    outline: none;
    transition: box-shadow .2s, border-color .2s, background .2s;
    box-sizing: border-box;
}

.input::placeholder {
    color: rgba(255, 255, 255, 0.55);
}

.input:focus {
    border-color: rgba(99, 102, 241, 0.6);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
    background: rgba(255, 255, 255, 0.09);
}

.has-action {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: stretch;
    column-gap: 8px;
}

.input-action {
    height: 44px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    font-size: 0.85rem;
    padding: 0 12px;
    border-radius: 10px;
    cursor: pointer;
    transition: background .2s, border-color .2s, transform .05s, opacity .2s;
    box-sizing: border-box;
}

.input-action:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.26);
}

.input-action:active {
    transform: translateY(1px);
}

/* ---------- ROW / LINKS ---------- */
.row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 2px;
}

.check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.9);
}

.check input {
    accent-color: #3b82f6;
}

.link {
    appearance: none;
    border: none;
    background: transparent;
    color: #ffffff;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 2px 0;
    transition: color .2s, opacity .2s;
}

.link:hover {
    color: #bfdbfe;
}

/* ---------- BUTTON ---------- */
.btn {
    display: grid;
    place-items: center;
    width: 100%;
    margin-top: 6px;
    height: 46px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: linear-gradient(135deg, #6366f1, #22c55e);
    color: #fff;
    font-weight: 800;
    letter-spacing: .2px;
    cursor: pointer;
    transition: transform .05s, filter .2s, opacity .2s;
    padding: 12px;
}

.btn:active {
    transform: translateY(1px);
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    filter: grayscale(30%);
}

/* ---------- LOADER ---------- */
.loader {
    width: 1.35em;
    height: 1.35em;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, .45);
    border-top-color: #fff;
    animation: spin 0.7s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* ---------- ERRORS ---------- */
.alert {
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid rgba(239, 68, 68, 0.35);
    background: rgba(239, 68, 68, 0.14);
    color: #fff;
    font-size: .9rem;
}

.field-err {
    color: #fecaca;
    font-size: 0.8rem;
    line-height: 1.2;
}

/* ---------- ACCESSIBILITY ---------- */
:focus-visible {
    outline: 2px solid rgba(99, 102, 241, 0.9);
    outline-offset: 2px;
}

/* ---------- REDUCED MOTION ---------- */
@media (prefers-reduced-motion: reduce) {

    .glow,
    .loader {
        animation: none !important;
    }
}

/* ---------- SMALL SCREENS ---------- */
@media (max-width: 420px) {
    .card {
        padding: 22px 18px 18px;
    }
}
</style>
