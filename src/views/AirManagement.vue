<template>
    <div class="air-management-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Air Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt; <span>Management</span> &gt; <span>Air Management</span>
            </nav>
        </div>

        <!-- Primary Tabs -->
        <div class="tab-nav">
            <button :class="{ active: currentTab === 'overview' }" @click="currentTab = 'overview'">Overview</button>
            <button :class="{ active: currentTab === 'download' }" @click="currentTab = 'download'">Download
                Data</button>
        </div>

        <!-- ========================= -->
        <!-- OVERVIEW                  -->
        <!-- ========================= -->
        <section v-if="currentTab === 'overview'" class="overview">
            <!-- Meta strip -->
            <div class="overview-header">
                <div class="ov-left">
                    <span class="badge">Airside (Hourly)</span>
                    <h1 class="ov-title">{{ currentSubTab }} — Overview</h1>
                    <p class="ov-sub">
                        Topic:
                        <code>bms/calculations/hourly{{ period === 'afterhours' ? '/afterhours' : '' }}/airside</code>
                    </p>
                </div>
                <div class="ov-right">
                    <div class="ov-chip">Updated: <strong>{{ lastUpdated }}</strong></div>
                    <button class="ov-chip" :class="{ active: period === 'business' }"
                        @click="period = 'business'">Business</button>
                    <button class="ov-chip" :class="{ active: period === 'afterhours' }"
                        @click="period = 'afterhours'">After Hours</button>
                </div>
            </div>

            <!-- KPI row (6) -->
            <div class="ov-kpis">
                <div class="ov-kpi" v-for="k in overviewKpis" :key="k.label">
                    <div class="ov-kpi-top">
                        <div class="ov-kpi-ico" :style="{ background: k.bg }"><i :class="k.icon" /></div>
                        <div class="ov-kpi-label">{{ k.label }}</div>
                    </div>
                    <div class="ov-kpi-val">{{ k.value }} <small v-if="k.unit">{{ k.unit }}</small></div>
                    <div class="ov-kpi-sub" v-if="k.sub">{{ k.sub }}</div>
                </div>
            </div>

            <!-- Charts + table -->
            <div class="ov-charts">
                <!-- Chart 1: Measured vs Curve -->
                <div class="card-wrapper chart-card">
                    <div class="ov-card-head">
                        <h3>Air kW (Measured vs Curve)</h3>
                        <div class="actions">
                            <button class="chip active">1D</button>
                        </div>
                    </div>
                    <LineChartCard :title="' '" :chartData="chartKW.chartData" :options="chartKW.options" />
                </div>

                <!-- Latest key metrics -->
                <div class="card-wrapper">
                    <div class="ov-card-head">
                        <h3>Key Metrics</h3>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th>Value</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in latestRows" :key="row.label">
                                    <td>{{ row.label }}</td>
                                    <td>{{ row.value }}</td>
                                    <td class="muted">{{ row.note }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Chart 2: Air kW/RT -->
                <div class="card-wrapper chart-card">
                    <div class="ov-card-head">
                        <h3>Air kW/RT</h3>
                        <div class="actions">
                            <button class="chip active">1D</button>
                        </div>
                    </div>
                    <LineChartCard :title="' '" :chartData="chartEff.chartData" :options="chartEff.options" />
                </div>
            </div>
        </section>

        <!-- ========================= -->
        <!-- Download -->
        <!-- ========================= -->
        <section v-if="currentTab === 'download'" class="tab-content">
            <h2>Download Full Dataset (CSV)</h2>
            <button class="download-button" @click="downloadCSV">
                <i class="fas fa-download"></i> Download CSV
            </button>
            <p class="note">CSV includes today’s hourly airside calculations ({{ period }}) shown on this page.</p>
        </section>
    </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onActivated } from 'vue'
import LineChartCard from '../components/LineChartCard.vue'
import { useMqtt } from '../composables/useMqtt'

defineOptions({ name: 'AirManagement' })

/* MQTT */
const { ensureConnected, getHourly } = useMqtt()
onMounted(() => ensureConnected())
onActivated(() => ensureConnected())

/* Tabs / Campus (cosmetic) */
const currentTab = ref('overview')
const campusTabs = [
    'ITE CC & HQ', 'Block A Auditorium', 'Block A Admin',
    'Block B', 'Block C', 'Block D', 'Block E',
    'Block F', 'Block G', 'Block H', 'Block J', 'Block K'
]
const currentSubTab = ref(campusTabs[0])
watch(currentTab, t => { if (t !== 'download') currentSubTab.value = campusTabs[0] })

/* Period toggle */
const period = ref('business') // 'business' | 'afterhours'
const historyCount = 48

/* Access hourly airside */
const bucket = computed(() => getHourly('airside', period.value) || { latest: null, slot: [] })
const latest = computed(() => bucket.value?.latest || null)
const dataValid = computed(() => latest.value?.data_valid ?? null)
const lastUpdated = computed(() =>
    latest.value?._ts_local || latest.value?.ts_hour || new Date().toLocaleString()
)

/* Sorted history, clamp to last N */
const history = computed(() => {
    const arr = Array.isArray(bucket.value?.slot) ? bucket.value.slot.slice() : []
    arr.sort((a, b) => Date.parse(a?.ts_hour ?? 0) - Date.parse(b?.ts_hour ?? 0))
    return arr.slice(-historyCount)
})

/* Formatters */
const toNum = v => {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
}
const showNum = (v, dp = 2) => {
    const n = Number(v)
    return Number.isFinite(n) ? n.toFixed(dp) : '—'
}

/* KPI tiles (mapped to hourly airside fields) */
const overviewKpis = computed(() => {
    const l = latest.value || {}
    return [
        { label: 'Air kW (Measured)', value: showNum(l.kW_air_measured, 1), unit: 'kW', sub: '', icon: 'fas fa-fan', bg: '#0ea5e9' },
        { label: 'Air kW (Curve)', value: showNum(l.kW_air_curve, 1), unit: 'kW', sub: '', icon: 'fas fa-sliders-h', bg: '#38bdf8' },
        { label: 'Air kW/RT', value: showNum(l.air_kw_per_rt, 3), unit: 'kW/RT', sub: 'lower is better', icon: 'fas fa-tachometer-alt', bg: '#10b981' },
        { label: 'kWh (Measured)', value: showNum(l.kWh_air_measured, 1), unit: 'kWh', sub: '', icon: 'fas fa-battery-half', bg: '#f59e0b' },
        { label: 'kWh (Curve)', value: showNum(l.kWh_air_curve, 1), unit: 'kWh', sub: '', icon: 'fas fa-battery-three-quarters', bg: '#fbbf24' },
        { label: 'TR Reference', value: showNum(l.tr_ref, 0), unit: 'RT', sub: '', icon: 'fas fa-thermometer-half', bg: '#7c3aed' },
    ]
})

/* Charts */
const labels = computed(() =>
    history.value.map(p => {
        const d = new Date(p?.ts_hour || Date.now())
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
)

const seriesKWMeasured = computed(() => history.value.map(p => toNum(p?.kW_air_measured)))
const seriesKWCurve = computed(() => history.value.map(p => toNum(p?.kW_air_curve)))
const seriesEff = computed(() => history.value.map(p => toNum(p?.air_kw_per_rt)))

function mkLine(labels, datasets, { yLabel } = {}) {
    return {
        chartData: {
            labels,
            datasets: datasets.map(ds => ({ ...ds, pointRadius: 0 }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            layout: { padding: { top: 8, right: 8, bottom: 32, left: 8 } },
            scales: {
                y1: {
                    type: 'linear',
                    position: 'left',
                    beginAtZero: false,
                    ticks: { color: '#cbd5e1', padding: 6 },
                    grid: { color: 'rgba(255,255,255,.12)' },
                    title: yLabel ? { display: true, text: yLabel, color: '#cbd5e1' } : undefined
                },
                x: { ticks: { color: '#cbd5e1', padding: 8 }, grid: { color: 'rgba(255,255,255,.12)' } }
            },
            plugins: { legend: { labels: { color: '#cbd5e1' } } }
        }
    }
}

const chartKW = computed(() =>
    mkLine(
        labels.value,
        [
            { label: 'kW (Measured)', data: seriesKWMeasured.value, borderWidth: 2, tension: 0.35, fill: false, yAxisID: 'y1' },
            { label: 'kW (Curve)', data: seriesKWCurve.value, borderWidth: 2, tension: 0.35, fill: false, yAxisID: 'y1' }
        ],
        { yLabel: 'kW' }
    )
)

const chartEff = computed(() =>
    mkLine(
        labels.value,
        [{ label: 'Air kW/RT', data: seriesEff.value, borderWidth: 2, tension: 0.35, fill: true, yAxisID: 'y1' }],
        { yLabel: 'kW/RT' }
    )
)

/* Latest table rows (no Hour row) */
const latestRows = computed(() => {
    const l = latest.value || {}
    return [
        { label: 'kW (Measured)', value: showNum(l.kW_air_measured, 1), note: 'Aggregated last hour' },
        { label: 'kW (Curve)', value: showNum(l.kW_air_curve, 1), note: 'Model/reference' },
        { label: 'Air kW/RT', value: showNum(l.air_kw_per_rt, 3), note: 'Lower is better' },
        { label: 'kWh (Measured)', value: showNum(l.kWh_air_measured, 1), note: 'Energy over hour' },
        { label: 'kWh (Curve)', value: showNum(l.kWh_air_curve, 1), note: 'Reference energy' },
        { label: 'TR Reference', value: showNum(l.tr_ref, 0), note: 'Load reference' },
    ]
})

/* CSV (today, current period) */
function isToday(ts) {
    if (!ts) return false
    const d = new Date(ts), now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}
function downloadCSV() {
    const all = Array.isArray(bucket.value?.slot) ? bucket.value.slot : []
    const today = all.filter(p => isToday(p?.ts_hour))
    const header = [
        'ts_hour', 'period', 'kW_air_measured', 'kW_air_curve', 'air_kw_per_rt',
        'kWh_air_measured', 'kWh_air_curve', 'tr_ref', 'valid_slots', 'data_valid', 'notes'
    ].join(',')

    const safe = v => (v == null ? '' : String(v))
    const quote = s => `"${String(s).replace(/"/g, '""')}"`

    const rows = today.map(p => [
        safe(p.ts_hour), safe(p.period), safe(p.kW_air_measured), safe(p.kW_air_curve), safe(p.air_kw_per_rt),
        safe(p.kWh_air_measured), safe(p.kWh_air_curve), safe(p.tr_ref),
        safe(p.valid_slots), safe(p.data_valid), quote(p.notes ?? '')
    ].join(','))

    const blob = new Blob([[header, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `airside_${period.value}_today.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
}
</script>

<style scoped>
/* Base (match your dark theme) */
.air-management-container {
    padding: 20px;
    font-family: sans-serif;
    background-color: #0a1f44;
    min-height: 100vh;
    color: white;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.page-title {
    font-size: 24px;
    margin: 0;
    color: white;
}

.breadcrumb span {
    font-size: 14px;
    color: white;
    margin: 0 4px;
}

/* Tabs */
.tab-nav {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
}

.tab-nav button {
    padding: 6px 12px;
    border: none;
    background: rgba(255, 255, 255, .1);
    border-radius: 4px;
    font-weight: bold;
    color: white;
    cursor: pointer;
    font-size: .9rem;
}

.tab-nav button:hover {
    background: rgba(255, 255, 255, .2);
}

.tab-nav button.active {
    background: #1976d2;
    color: white;
}

/* Sub tabs */
.sub-tab-nav {
    display: flex;
    gap: 10px;
    margin: 16px 0;
}

.sub-tab-nav button {
    padding: 6px 12px;
    border: none;
    background: rgba(255, 255, 255, .1);
    border-radius: 4px;
    font-weight: bold;
    color: white;
    cursor: pointer;
    font-size: .9rem;
}

.sub-tab-nav button.active {
    background: #1976d2;
    color: white;
}

/* Overview header */
.overview-header {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    align-items: start;
    margin-bottom: 12px;
}

.badge {
    display: inline-block;
    background: rgba(34, 197, 94, .15);
    color: #86efac;
    font-size: .75rem;
    padding: 4px 8px;
    border-radius: 999px;
}

.ov-title {
    margin: 6px 0 2px;
    font-size: 1.3rem;
}

.ov-sub {
    color: #cbd5e1;
    margin: 0;
    font-size: .9rem;
}

.ov-right {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
}

.ov-chip {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, .08);
    padding: 8px 10px;
    border-radius: 10px;
    font-size: .85rem;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff;
    cursor: default;
}

.ov-chip.active {
    background: #1976d2;
    border-color: #1976d2;
    cursor: pointer;
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    display: inline-block;
}

.dot.ok {
    background: #22c55e;
}

.dot.bad {
    background: #ef4444;
}

/* KPI row */
.ov-kpis {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px;
}

.ov-kpi {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 12px;
    padding: 12px;
}

.ov-kpi-top {
    display: flex;
    align-items: center;
    gap: 10px;
}

.ov-kpi-ico {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #fff;
}

.ov-kpi-label {
    color: #cbd5e1;
    font-size: .85rem;
}

.ov-kpi-val {
    font-size: 1.45rem;
    font-weight: 700;
    margin-top: 4px;
}

.ov-kpi-val small {
    font-weight: 500;
    color: #cbd5e1;
    margin-left: 2px;
}

.ov-kpi-sub {
    color: #cbd5e1;
    font-size: .8rem;
    margin-top: 2px;
}

/* Charts + table */
.ov-charts {
    display: grid;
    grid-template-columns: 2fr 1.3fr;
    gap: 10px;
    margin-bottom: 12px;
}

.card-wrapper {
    background: #1e2a47;
    color: white;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, .2);
}

.chart-card {
    background: #1e2a47;
    border-radius: 8px;
    padding: 8px;
}

.ov-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}

.ov-card-head h3 {
    margin: 0;
    font-size: 1rem;
}

.actions .chip {
    font-size: .8rem;
    color: white;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .15);
    padding: 6px 10px;
    border-radius: 999px;
    cursor: pointer;
}

.actions .chip.active {
    background: #1976d2;
    border-color: #1976d2;
}

.table-wrap {
    overflow: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th,
td {
    text-align: left;
    padding: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, .06);
}

th {
    color: #cbd5e1;
    font-weight: 600;
}

.muted {
    color: #cbd5e1;
    opacity: .85;
}

/* Download */
.download-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    font-size: .9rem;
}

.download-button:hover {
    background: #125ea3;
}

.note {
    margin-top: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, .8);
}

/* Responsive */
@media (max-width:1100px) {
    .ov-kpis {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .ov-charts {
        grid-template-columns: 1fr;
    }
}

@media (max-width:768px) {
    .air-management-container {
        padding: 10px;
    }

    .tab-nav {
        flex-direction: column;
        gap: 8px;
    }

    .sub-tab-nav {
        flex-wrap: wrap;
    }

    .ov-kpis {
        grid-template-columns: 1fr !important;
    }
}
</style>
