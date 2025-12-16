<template>
    <div class="water-management-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Water Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt; <span>Management</span> &gt; <span>Water Management</span>
            </nav>
        </div>

        <!-- Primary Tabs -->
        <div class="tab-nav">
            <button :class="{ active: currentTab === 'overview' }" @click="currentTab = 'overview'">Overview</button>
            <button :class="{ active: currentTab === 'download' }" @click="currentTab = 'download'">Download
                Data</button>
        </div>

        <!-- OVERVIEW -->
        <section v-if="currentTab === 'overview'" class="overview">
            <!-- Meta strip -->
            <div class="meta-strip">
                <div class="title-wrap">
                    <span class="badge">Waterside (Hourly)</span>
                    <h1>Overview — {{ periodLabel }}</h1>
                    <p class="subtitle">
                        Topic:
                        <code>bms/calculations/hourly{{ period === 'afterhours' ? '/afterhours' : '' }}/waterside</code>
                    </p>
                </div>
                <div class="right-meta">
                    <div class="meta-chip">Updated: <strong>{{ lastUpdated }}</strong></div>

                    <button class="chip" :class="{ active: period === 'business' }"
                        @click="period = 'business'">Business</button>
                    <button class="chip" :class="{ active: period === 'afterhours' }"
                        @click="period = 'afterhours'">After Hours</button>
                </div>
            </div>

            <!-- KPI tiles -->
            <section class="grid kpi-grid">
                <div class="card kpi" v-for="k in kpiTiles" :key="k.label">
                    <div class="kpi-top">
                        <div class="kpi-icon" :style="{ background: k.bg }"><i :class="k.icon"></i></div>
                        <div class="kpi-label">{{ k.label }}</div>
                    </div>
                    <div class="kpi-value">
                        {{ k.value }} <small v-if="k.unit">{{ k.unit }}</small>
                    </div>
                    <div class="kpi-sub" v-if="k.sub">{{ k.sub }}</div>
                </div>
            </section>

            <!-- Charts -->
            <section class="grid charts-grid">
                <div class="card chart-card">
                    <div class="card-header">
                        <h3>Total CH kW</h3>
                    </div>
                    <div class="chart-wrap">
                        <LineChartCard :title="' '" :chartData="chartKW.chartData" :options="chartKW.options" />
                    </div>
                </div>

                <div class="card chart-card">
                    <div class="card-header">
                        <h3>CW Range (°C)</h3>
                    </div>
                    <div class="chart-wrap">
                        <LineChartCard :title="' '" :chartData="chartRange.chartData" :options="chartRange.options" />
                    </div>
                </div>
            </section>

            <!-- Chillers table -->
            <section class="grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Chillers</h3>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Chiller</th>
                                    <th>Status</th>
                                    <th>kW</th>
                                    <th>TR</th>
                                    <th>kW/RT</th>
                                    <th>COP</th>
                                    <th>PLR</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in chillerRows" :key="row.key">
                                    <td>{{ row.name }}</td>
                                    <td>
                                        <span class="pill" :class="row.on ? 'green' : 'gray'">{{ row.on ? 'ON' : 'OFF'
                                            }}</span>
                                    </td>
                                    <td>{{ showNum(row.kW, 1) }}</td>
                                    <td>{{ showNum(row.TR, 1) }}</td>
                                    <td>{{ showNum(row.kW_per_RT, 3) }}</td>
                                    <td>{{ showNum(row.COP, 3) }}</td>
                                    <td>{{ showNum(row.PLR, 3) }}</td>
                                </tr>
                                <tr v-if="!chillerRows.length">
                                    <td colspan="7" class="muted">No chiller data in latest payload.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- Raw payload -->
            <section class="grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Raw payload</h3>
                    </div>
                    <pre class="json">{{ latestPretty }}</pre>
                </div>
            </section>
        </section>

        <!-- DOWNLOAD -->
        <section v-else-if="currentTab === 'download'" class="tab-content">
            <h2 class="tab-heading">Download Waterside Dataset (CSV)</h2>
            <button class="download-button" @click="downloadCSV">
                <i class="fas fa-download"></i> Download CSV
            </button>
            <p class="note">CSV contains today’s points for Waterside ({{ periodLabel }}).</p>
        </section>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, watchEffect } from 'vue'
import LineChartCard from '../components/LineChartCard.vue'
import { useMqtt } from '../composables/useMqtt'

defineOptions({ name: 'WaterManagement' })

const { ensureConnected, getHourly } = useMqtt()
onMounted(() => ensureConnected())
onActivated(() => ensureConnected())

/* ───────── tabs/period ───────── */
const currentTab = ref('overview')
const period = ref('business') // 'business' | 'afterhours'
const periodLabel = computed(() => (period.value === 'business' ? 'Business Hours' : 'After Hours'))

/* ───────── access hourly waterside ───────── */
const historyCount = 48
const bucket = computed(() => getHourly('waterside', period.value) || { latest: null, slot: [] })

const history = computed(() => {
    const arr = Array.isArray(bucket.value?.slot) ? bucket.value.slot.slice() : []
    arr.sort((a, b) => Date.parse(a?.ts_hour ?? 0) - Date.parse(b?.ts_hour ?? 0))
    return arr.slice(-historyCount)
})

const latest = computed(() => bucket.value?.latest || null)
const dataValid = computed(() => latest.value?.data_valid ?? null)
const lastUpdated = computed(() => latest.value?._ts_local || latest.value?.ts_hour || new Date().toLocaleString())

/* ───────── KPIs (from latest) ───────── */
const kpiTiles = computed(() => [
    { label: 'Total CH kW', value: showNum(latest.value?.kW_ch, 1), unit: 'kW', icon: 'fas fa-bolt', bg: '#2563eb' },
    { label: 'CW Range', value: showNum(latest.value?.cw_range_C, 3), unit: '°C', icon: 'fas fa-temperature-low', bg: '#7c3aed' },
    { label: 'CW Approach', value: showNum(latest.value?.cw_approach_C, 3), unit: '°C', icon: 'fas fa-temperature-high', bg: '#f59e0b' },
    { label: 'Plant kW/RT', value: showNum(latest.value?.plant_kw_per_rt, 3), unit: 'kW/RT', icon: 'fas fa-tachometer-alt', bg: '#06b6d4' },
    { label: 'Heat Balance', value: showNum(latest.value?.heat_balance_pct, 1), unit: '%', icon: 'fas fa-balance-scale', bg: '#10b981' },
])


/* ───────── Chillers table rows ───────── */
const chillerRows = computed(() => {
    const ch = latest.value?.chillers || {}
    return Object.keys(ch).map(name => ({
        key: name,
        name,
        on: !!ch[name]?.on,
        kW: ch[name]?.kW ?? null,
        TR: ch[name]?.TR ?? null,
        kW_per_RT: ch[name]?.kW_per_RT ?? null,
        COP: ch[name]?.COP ?? null,
        PLR: ch[name]?.PLR ?? null,
    }))
})

/* ───────── Charts ───────── */
const labels = computed(() => history.value.map(p => {
    const d = new Date(p?.ts_hour || Date.now())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}))

const seriesKW = computed(() => history.value.map(p => cleanNum(p?.kW_ch)))
const seriesRange = computed(() => history.value.map(p => cleanNum(p?.cw_range_C)))

const chartKW = computed(() => mkLine(labels.value, [{ label: 'CH kW', data: seriesKW.value, fill: true }]))
const chartRange = computed(() => mkLine(labels.value, [{ label: 'CW Range (°C)', data: seriesRange.value, fill: true }]))

/* ───────── CSV (today only) ───────── */
function isToday(tsISO) {
    if (!tsISO) return false
    const d = new Date(tsISO), now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}
function downloadCSV() {
    const slot = (bucket.value?.slot || []).filter(p => isToday(p.ts_hour))
    const header = [
        'ts_hour', 'period', 'tr_avg', 'plant_kw_per_rt', 'cw_range_C', 'cw_approach_C', 'heat_balance_pct',
        'kW_ch', 'kW_chwp', 'kW_cwp', 'kW_ct', 'kW_plant',
        'kWh_ch', 'kWh_chwp', 'kWh_cwp', 'kWh_ct', 'kWh_plant', 'valid_slots', 'data_valid'
    ].join(',')
    const rows = slot.map(p => ([
        p.ts_hour ?? '', p.period ?? '', p.tr_avg ?? '', p.plant_kw_per_rt ?? '', p.cw_range_C ?? '', p.cw_approach_C ?? '', p.heat_balance_pct ?? '',
        p.kW_ch ?? '', p.kW_chwp ?? '', p.kW_cwp ?? '', p.kW_ct ?? '', p.kW_plant ?? '',
        p.kWh_ch ?? '', p.kWh_chwp ?? '', p.kWh_cwp ?? '', p.kWh_ct ?? '', p.kWh_plant ?? '', p.valid_slots ?? '', p.data_valid ?? ''
    ].join(',')))
    const blob = new Blob([[header, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `waterside_${period.value}_today.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
}

/* ───────── utils ───────── */
function cleanNum(v) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
}
function showNum(v, dp = 2) {
    const n = Number(v)
    return Number.isFinite(n) ? n.toFixed(dp) : '—'
}
const latestPretty = computed(() => latest.value ? JSON.stringify(latest.value, null, 2) : 'null')

function mkLine(labels, datasets) {
    return {
        chartData: {
            labels,
            datasets: datasets.map(ds => ({ ...ds, borderWidth: 2, tension: .35, pointRadius: 0 }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
            scales: {
                x: { offset: true, ticks: { color: '#cbd5e1', padding: 10 }, grid: { color: 'rgba(255,255,255,.15)' } },
                y: { beginAtZero: false, ticks: { color: '#cbd5e1', padding: 6 }, grid: { color: 'rgba(255,255,255,.15)' } }
            },
            plugins: { legend: { position: 'top', labels: { color: '#cbd5e1' } }, tooltip: { mode: 'index', intersect: false } }
        }
    }
}

/* helpful log */
watchEffect(() => {
    if (latest.value) {
        console.log('[waterside latest]', { period: period.value, ts: latest.value.ts_hour, valid: latest.value.data_valid })
    }
})
</script>

<style scoped>
/* Base */
.water-management-container {
    margin: 0 auto;
    padding: 24px 28px;
    background: #0a1f44;
    min-height: 100vh;
    color: #fff;
    font-family: sans-serif;
}

/* Header */
.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.page-title {
    margin: 0;
    font-size: 24px;
}

.breadcrumb span {
    font-size: 14px;
    margin: 0 4px;
}

/* Tabs */
.tab-nav {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
}

.tab-nav button {
    padding: 6px 12px;
    border: none;
    background: rgba(255, 255, 255, .1);
    border-radius: 6px;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
    font-size: .9rem;
}

.tab-nav button:hover {
    background: rgba(255, 255, 255, .2);
}

.tab-nav button.active {
    background: #1976d2;
}

/* Meta strip */
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
}

.subtitle {
    color: #c8d5ff;
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

.meta-chip {
    background: #11284d;
    border: 1px solid rgba(255, 255, 255, .08);
    padding: 8px 12px;
    border-radius: 12px;
    font-size: .85rem;
    display: flex;
    align-items: center;
    gap: 8px;
}

.meta-chip .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    display: inline-block;
}

.meta-chip.ok {
    background: rgba(34, 197, 94, .12);
    border-color: rgba(34, 197, 94, .35);
}

.meta-chip.bad {
    background: rgba(239, 68, 68, .12);
    border-color: rgba(239, 68, 68, .35);
}

.dot.ok {
    background: #22c55e;
}

.dot.bad {
    background: #ef4444;
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

.chip.active {
    background: #1976d2;
}

/* Grid + Cards */
.grid {
    display: grid;
    gap: 20px;
}

.kpi-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
}

.card {
    background: #11284d;
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, .2);
}

/* KPI tile */
.kpi-top {
    display: flex;
    align-items: center;
    gap: 12px;
}

.kpi-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #fff;
}

.kpi-label {
    color: #c8d5ff;
    font-size: .85rem;
}

.kpi-value {
    font-size: 1.55rem;
    font-weight: 800;
    margin-top: 4px;
}

.kpi-value small {
    font-weight: 600;
    color: #c8d5ff;
    margin-left: 4px;
}

.kpi-sub {
    color: #c8d5ff;
    font-size: .8rem;
    margin-top: 2px;
}

/* Charts */
.charts-grid {
    display: grid;
    grid-template-columns: 2fr 1.25fr;
    column-gap: 22px;
    row-gap: 20px;
    margin: 2% 0;
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.card-header h3 {
    margin: 0;
    font-size: 1rem;
}

.chart-wrap {
    height: 420px;
}

.chart-card {
    padding: 14px 16px 16px;
    border-radius: 16px;
    overflow: hidden;
}

.chart-card .chart-wrap {
    margin: 0;
    padding: 0 0 40px;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
}

.chart-card .chart-wrap canvas {
    width: 100% !important;
    height: 100% !important;
    display: block;
}

/* Table */
.table-wrap {
    overflow: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    color: #fff;
}

th,
td {
    border: 1px solid rgba(255, 255, 255, .18);
    padding: 8px;
    text-align: left;
}

.pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, .12);
    border: 1px solid rgba(255, 255, 255, .18);
}

.pill.green {
    background: rgba(46, 204, 113, .2);
    border-color: rgba(46, 204, 113, .45);
}

.pill.gray {
    background: rgba(255, 255, 255, .08);
    border-color: rgba(255, 255, 255, .18);
}

.muted {
    color: #c8d5ff;
    opacity: .9;
}

/* JSON */
.json {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 12px;
    background: #0f1a33;
    border: 1px solid rgba(255, 255, 255, .08);
    padding: 10px;
    border-radius: 8px;
    overflow: auto;
}

/* Download */
.tab-content .download-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    font-size: .9rem;
}

.tab-content .download-button:hover {
    background: #125ea3;
}

.note {
    margin-top: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, .8);
}

/* Responsive */
@media (max-width:1100px) {
    .charts-grid {
        grid-template-columns: 1fr;
    }

    .chart-wrap {
        height: 320px;
    }
}

@media (max-width:768px) {
    .water-management-container {
        padding: 16px;
    }

    .tab-nav {
        flex-direction: column;
        gap: 10px;
    }

    .chart-wrap {
        height: 280px;
    }
}
</style>
