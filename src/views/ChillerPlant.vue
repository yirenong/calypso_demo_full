<template>
    <div class="chiller-management-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Chiller Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt; <span>Management</span> &gt; <span>Chiller Management</span>
            </nav>
        </div>

        <!-- Meta / Controls -->
        <div class="meta-strip">
            <div class="title-wrap">
                <span class="badge">Plant — Chillers 1–5</span>
                <h1>Live Points (Latest)</h1>
                <p class="subtitle">
                    <span v-if="loading">Fetching…</span>
                    <span v-else-if="error" class="err">Error: {{ error }}</span>
                    <span v-else>Last updated: {{ lastUpdated ? fmtDateTime(lastUpdated) : '—' }}</span>
                </p>
            </div>

            <div class="right-meta">
                <label class="toggle">
                    <input type="checkbox" v-model="autoRefresh" />
                    <span>Auto refresh (30s)</span>
                </label>
                <button class="chip" @click="reload" :disabled="loading">Refresh</button>
            </div>
        </div>

        <!-- 5 KPI cards -->
        <section class="grid kpi-grid">
            <div v-for="n in 5" :key="n" class="card kpi">
                <div class="kpi-top" style="justify-content:space-between; gap:12px">
                    <div style="display:flex; align-items:center; gap:12px">
                        <div class="kpi-icon" :style="{ background: colorFor(n) }">
                            <i class="fas fa-snowflake"></i>
                        </div>
                        <div class="kpi-label">Chiller {{ n }}</div>
                    </div>
                    <div class="status-pill" :class="statusClass(n)">
                        <span class="status-dot" :class="statusClass(n)"></span>
                        {{ statusText(n) }}
                    </div>
                </div>

                <div class="kpi-value">
                    {{ showEff(n) }} <small>efficiency</small>
                </div>

                <div class="kpi-sub muted">
                    <template v-if="tsFor(n)">
                        point time: <small>{{ fmtDateTime(tsFor(n)) }}</small>
                    </template>
                    <template v-else>
                        <small>No recent data</small>
                    </template>
                </div>

                <div class="kpi-flags" v-if="flagsFor(n)">
                    <span v-if="flagsFor(n).in_alarm" class="flag warn">Alarm</span>
                    <span v-if="flagsFor(n).fault" class="flag error">Fault</span>
                    <span v-if="flagsFor(n).out_of_service" class="flag muted">OOS</span>
                    <span v-if="flagsFor(n).overridden" class="flag info">Overridden</span>
                    <span v-if="flagsFor(n).reliability && flagsFor(n).reliability !== 'no-fault-detected'"
                        class="flag info">
                        {{ flagsFor(n).reliability }}
                    </span>
                </div>
            </div>
        </section>

        <!-- Table (optional visibility) -->
        <section class="grid" v-if="debug">
            <div class="card">
                <div class="card-header">
                    <h3>Raw Points (filtered)</h3>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>object_name</th>
                                <th>value</th>
                                <th>units</th>
                                <th>ts</th>
                                <th>device</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in debugRows" :key="row.object_name">
                                <td><code>{{ row.object_name }}</code></td>
                                <td>{{ row.value }}</td>
                                <td>{{ row.units || '—' }}</td>
                                <td>{{ fmtDateTime(row.ts) }}</td>
                                <td>{{ row.device_id || '—' }}</td>
                            </tr>
                            <tr v-if="!debugRows.length">
                                <td colspan="5" class="muted">No rows</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

/** Endpoint */
const API_URL = 'http://localhost:8082/points/latest?limit=500&offset=0'

/** State */
const loading = ref(false)
const error = ref(null)
const points = ref([]) // raw array from API
const mapByName = ref(Object.create(null)) // object_name -> point
const lastUpdated = ref(null)

const autoRefresh = ref(true)
let timer = null
const debug = ref(false) // flip to true to show the raw table

/** Helpers */
function fmtDateTime(iso) {
    const d = new Date(iso)
    if (Number.isNaN(d)) return String(iso || '')
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    }).format(d)
}
function fmtNum(n, dp = 3) {
    const v = Number(n)
    if (!Number.isFinite(v)) return '—'
    // Show 3dp for small values, 2dp otherwise
    const fixed = Math.abs(v) < 10 ? v.toFixed(dp) : v.toFixed(2)
    return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Fetch */
async function fetchPoints() {
    loading.value = true
    error.value = null
    try {
        const res = await fetch(API_URL, { cache: 'no-cache' })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const body = await res.json()
        const arr = Array.isArray(body) ? body : []
        points.value = arr

        // Build quick lookup by object_name (last one wins)
        const map = Object.create(null)
        for (const row of arr) {
            const key = String(row.object_name || '')
            if (!key) continue
            map[key] = row
        }
        mapByName.value = map

        // pick a "last updated" as max ts of the rows we care about
        const allTs = []
        for (let i = 1; i <= 5; i++) {
            const eff = map[`CH${i}_Efficiency`]?.ts
            const st = map[`CH${i}_status`]?.ts
            if (eff) allTs.push(eff)
            if (st) allTs.push(st)
        }
        lastUpdated.value = allTs.length
            ? new Date(Math.max(...allTs.map(t => new Date(t).getTime()))).toISOString()
            : null
    } catch (e) {
        error.value = e?.message ?? 'Load failed'
        points.value = []
        mapByName.value = Object.create(null)
        lastUpdated.value = null
    } finally {
        loading.value = false
    }
}

function reload() { fetchPoints() }

function schedule() {
    if (timer) clearInterval(timer)
    if (autoRefresh.value) {
        timer = setInterval(fetchPoints, 30_000) // 30s
    }
}

onMounted(() => {
    fetchPoints()
    schedule()
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
watch(autoRefresh, schedule)

/** UI bindings per chiller n = 1..5 */
function statusValue(n) {
    const raw = mapByName.value[`CH${n}_status`]?.value
    const v = Number(raw)
    return Number.isFinite(v) ? v : null
}
function statusText(n) {
    const v = statusValue(n)
    if (v === null) return '—'
    return v === 1 ? 'Online' : 'Offline'
}
function statusClass(n) {
    const v = statusValue(n)
    if (v === 1) return 'online'
    if (v === 0) return 'offline'
    return 'unknown'
}
function showEff(n) {
    const v = mapByName.value[`CH${n}_Efficiency`]?.value
    return fmtNum(v)
}
function tsFor(n) {
    // Prefer efficiency timestamp; fall back to status
    return mapByName.value[`CH${n}_Efficiency`]?.ts || mapByName.value[`CH${n}_status`]?.ts || ''
}
function flagsFor(n) {
    const p = mapByName.value[`CH${n}_Efficiency`]
    if (!p) return null
    return {
        in_alarm: !!p.in_alarm,
        fault: !!p.fault,
        out_of_service: !!p.out_of_service,
        overridden: !!p.overridden,
        reliability: p.reliability || ''
    }
}
function colorFor(n) {
    // simple distinct hues for cards
    const palette = ['#3b82f6', '#22c55e', '#f59e0b', '#0ea5e9', '#7c3aed']
    return palette[(n - 1) % palette.length]
}

/** Debug table content (optional) */
const debugRows = computed(() => {
    const out = []
    for (let i = 1; i <= 5; i++) {
        const e = mapByName.value[`CH${i}_Efficiency`]
        const s = mapByName.value[`CH${i}_status`]
        if (e) out.push(e)
        if (s) out.push(s)
    }
    return out
})
</script>

<style scoped>
/* Base (match your other pages) */
.chiller-management-container {
    margin: 0 auto;
    padding: 24px 28px;
    background: #0b1220;
    min-height: 100vh;
    color: #e5e7eb;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
    overflow-x: hidden;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
}

.page-title {
    margin: 0;
    font-size: 24px;
    color: #f8fafc;
}

.breadcrumb {
    color: #9fb0ff;
}

.breadcrumb span {
    font-size: 14px;
    margin: 0 4px;
}

/* Meta */
.meta-strip {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: start;
    margin-bottom: 14px;
}

.title-wrap h1 {
    margin: 6px 0 2px;
    font-size: 1.2rem;
    color: #f8fafc;
}

.subtitle {
    color: #9fb0ff;
    margin: 0;
    font-size: .9rem;
}

.badge {
    display: inline-block;
    background: rgba(34, 197, 94, .15);
    color: #86efac;
    font-size: .75rem;
    padding: 4px 8px;
    border-radius: 999px;
}

.right-meta {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}

.chip {
    font-size: .8rem;
    color: #fff;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .12);
    padding: 7px 12px;
    border-radius: 999px;
    cursor: pointer;
}

.toggle {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Grid + Cards */
.grid {
    display: grid;
    gap: 16px;
}

.kpi-grid {
    grid-template-columns: repeat(5, minmax(220px, 1fr));
}

@media (max-width: 1300px) {
    .kpi-grid {
        grid-template-columns: repeat(3, minmax(220px, 1fr));
    }
}

@media (max-width: 900px) {
    .kpi-grid {
        grid-template-columns: repeat(2, minmax(200px, 1fr));
    }
}

@media (max-width: 600px) {
    .kpi-grid {
        grid-template-columns: 1fr;
    }
}

.card {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, .25);
}

/* KPI */
.kpi-top {
    display: flex;
    align-items: center;
    gap: 10px;
}

.kpi-icon {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #fff;
}

.kpi-label {
    color: #cbd5e1;
    font-size: .9rem;
}

.kpi-value {
    font-size: 1.55rem;
    font-weight: 800;
    margin-top: 4px;
    color: #f8fafc;
}

.kpi-value small {
    font-weight: 600;
    color: #cbd5e1;
    margin-left: 4px;
}

.kpi-sub {
    color: #9fb0ff;
    font-size: .8rem;
    margin-top: 2px;
}

/* Status pill */
.status-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: .8rem;
    font-weight: 700;
    border: 1px solid rgba(255, 255, 255, .14);
    background: rgba(255, 255, 255, .06);
}

.status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, .15) inset;
}

.status-pill.online {
    border-color: rgba(34, 197, 94, .4);
    background: rgba(34, 197, 94, .12);
    color: #86efac;
}

.status-pill.offline {
    border-color: rgba(148, 163, 184, .4);
    background: rgba(148, 163, 184, .12);
    color: #cbd5e1;
}

.status-pill.unknown {
    border-color: rgba(248, 113, 113, .35);
    background: rgba(248, 113, 113, .12);
    color: #fecaca;
}

.status-dot.online {
    background: #22c55e;
}

.status-dot.offline {
    background: #94a3b8;
}

.status-dot.unknown {
    background: #f87171;
}

/* Flags row */
.kpi-flags {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.flag {
    font-size: .72rem;
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, .14);
    background: rgba(255, 255, 255, .06);
}

.flag.warn {
    color: #fde68a;
    border-color: rgba(251, 191, 36, .4);
    background: rgba(251, 191, 36, .12);
}

.flag.error {
    color: #fecaca;
    border-color: rgba(248, 113, 113, .4);
    background: rgba(248, 113, 113, .12);
}

.flag.info {
    color: #93c5fd;
    border-color: rgba(59, 130, 246, .35);
    background: rgba(59, 130, 246, .12);
}

.flag.muted {
    color: #cbd5e1;
}

/* Table (debug) */
.table-wrap {
    overflow: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    color: #e5e7eb;
}

th,
td {
    border: 1px solid rgba(255, 255, 255, .18);
    padding: 8px;
    text-align: left;
}

th {
    background: rgba(255, 255, 255, .04);
}

.err {
    color: #fda4af;
}
</style>
