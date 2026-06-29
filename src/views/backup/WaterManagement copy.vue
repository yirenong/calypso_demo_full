<template>
    <div class="water-management-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Water Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt;
                <span>Management</span> &gt;
                <span>Water Management</span>
            </nav>
        </div>

        <!-- Primary Tabs -->
        <div class="tab-nav">
            <button :class="{ active: currentTab === 'overview' }" @click="currentTab = 'overview'">Overview</button>
            <button :class="{ active: currentTab === 'usage' }" @click="currentTab = 'usage'">Campus Water
                Usage</button>
            <button :class="{ active: currentTab === 'sustain' }" @click="currentTab = 'sustain'">Sustainability
                Indicators</button>
            <button :class="{ active: currentTab === 'stats' }" @click="currentTab = 'stats'">Statistical
                Analysis</button>
            <button :class="{ active: currentTab === 'download' }" @click="currentTab = 'download'">Download
                Data</button>
        </div>

        <!-- Secondary Tabs -->
        <div v-if="currentTab !== 'download'" class="sub-tab-nav">
            <button v-for="campus in campusTabs" :key="campus" :class="{ active: currentSubTab === campus }"
                @click="currentSubTab = campus">
                {{ campus }}
            </button>
        </div>

        <!-- ========================= -->
        <!-- OVERVIEW (SmartToilet UX) -->
        <!-- ========================= -->
        <section v-if="currentTab === 'overview'" class="overview">
            <!-- A) Meta strip -->
            <div class="meta-strip">
                <div class="title-wrap">
                    <span class="badge">Campus</span>
                    <h1>{{ currentSubTab }} – Overview</h1>
                    <p class="subtitle">Today’s intake, distribution and ops snapshot</p>
                </div>
                <div class="right-meta">
                    <div class="meta-chip"><span class="dot ok"></span> Normal</div>
                    <div class="meta-chip">Updated: <strong>{{ lastUpdated }}</strong></div>
                </div>
            </div>

            <!-- B) KPI tiles (6) -->
            <section class="grid kpi-grid">
                <div class="card kpi" v-for="k in kpiTiles" :key="k.label">
                    <div class="kpi-top">
                        <div class="kpi-icon" :style="{ background: k.bg }">
                            <i :class="k.icon"></i>
                        </div>
                        <div class="kpi-label">{{ k.label }}</div>
                    </div>
                    <div class="kpi-value">
                        {{ k.value }}
                        <small v-if="k.unit">{{ k.unit }}</small>
                    </div>
                    <div class="kpi-sub" v-if="k.sub">{{ k.sub }}</div>
                </div>
            </section>

            <!-- C) Charts row -->
            <section class="grid charts-grid">
                <!-- Left: Waterside Temps & ΔT -->
                <div class="card chart-card">

                    <div class="card-header">
                        <h3>CHWR Flow & Load • {{ period }}</h3>
                    </div>
                    <div class="chart-wrap">
                        <LineChartCard :title="' '" :chartData="watersideFlowRtLine.chartData"
                            :options="watersideFlowRtLine.options" />
                    </div>
                </div>

                <!-- Right: Waterside Flow & Load -->
                <div class="card chart-card">
                    <div class="card-header">
                        <h3>Waterside Temps & ΔT • {{ period }}</h3>
                        <div class="actions">
                            <button class="chip" @click="setPeriod('1D')"
                                :class="{ active: period === '1D' }">1D</button>
                            <button class="chip" @click="setPeriod('1W')"
                                :class="{ active: period === '1W' }">1W</button>
                            <button class="chip" @click="setPeriod('1M')"
                                :class="{ active: period === '1M' }">1M</button>
                        </div>
                    </div>
                    <div class="chart-wrap">
                        <LineChartCard :title="' '" :chartData="watersideTempsLine.chartData"
                            :options="watersideTempsLine.options" />
                    </div>
                </div>

            </section>

            <!-- D) Bottom row: Events + Checklist -->
            <section class="grid bottom-grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Recent Events</h3>
                        <button class="chip ghost" @click="ackAll">Acknowledge All</button>
                    </div>
                    <div class="table-wrap">
                        <TableCard :title="''" :columns="overviewEvents.columns" :rows="overviewEvents.rows" />
                    </div>
                </div>

                <div class="card tips">
                    <div class="card-header">
                        <h3>Water Ops Checklist</h3>
                    </div>
                    <ul class="checklist">
                        <li v-for="t in checklist" :key="t">{{ t }}</li>
                    </ul>
                    <button class="btn" @click="markCompleted">Mark as Completed</button>
                    <small class="muted">Last completed: {{ lastCompleted }}</small>
                </div>
            </section>
        </section>

        <!-- ========================= -->
        <!-- Your original tabs below  -->
        <!-- ========================= -->
        <div v-if="currentTab === 'usage'" class="tab-content">
            <h2 class="tab-heading">{{ currentSubTab }} Water Usage</h2>

            <div class="usage-top-grid">
                <div v-for="type in topMetrics" :key="type" class="card-wrapper value-card">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>

            <div class="usage-mid-grid">
                <div class="card-wrapper gauge-card">
                    <component :is="componentMap['WaterEfficiency']" v-bind="generateProps('WaterEfficiency')" />
                </div>
                <div class="card-wrapper chart-card">
                    <component :is="componentMap['TenantWaterMetersBar']"
                        v-bind="generateProps('TenantWaterMetersBar')" />
                </div>
                <div class="card-wrapper chart-card">
                    <component :is="componentMap['WaterConsumptionByBlockBar']"
                        v-bind="generateProps('WaterConsumptionByBlockBar')" />
                </div>
                <div class="card-wrapper gauge-card">
                    <component :is="componentMap['AirsideEfficiency']" v-bind="generateProps('AirsideEfficiency')" />
                </div>
            </div>

            <div class="usage-bottom-grid">
                <div class="card-wrapper chart-card span-2">
                    <component :is="componentMap['EnergyConsumptionByBlockBar']"
                        v-bind="generateProps('EnergyConsumptionByBlockBar')" />
                </div>
                <div class="stacked-card-container">
                    <div class="card-wrapper chart-card small-chart">
                        <component :is="componentMap['SolarGeneratedLine']"
                            v-bind="generateProps('SolarGeneratedLine')" />
                    </div>
                    <div class="card-wrapper chart-card small-chart">
                        <component :is="componentMap['TenantEnergyMetersBar']"
                            v-bind="generateProps('TenantEnergyMetersBar')" />
                    </div>
                </div>
                <div class="card-wrapper chart-card span-2">
                    <component :is="componentMap['WaterConsumptionByBlockBar']"
                        v-bind="generateProps('WaterConsumptionByBlockBar')" />
                </div>
            </div>
        </div>

        <div v-if="currentTab === 'sustain'" class="tab-content">
            <h2 class="tab-heading">{{ currentSubTab }} Sustainability Indicators</h2>
            <div class="cards-grid">
                <div v-for="(tbl, i) in sustainTables" :key="i" class="card-wrapper chart-card">
                    <TableCard :title="tbl.title" :columns="tbl.columns" :rows="tbl.rows" />
                </div>
            </div>
        </div>

        <div v-if="currentTab === 'stats'" class="tab-content">
            <h2 class="tab-heading">{{ currentSubTab }} Statistical Analysis</h2>
            <div class="cards-grid">
                <div v-for="(tbl, i) in statsTables" :key="i" class="card-wrapper chart-card">
                    <TableCard :title="tbl.title" :columns="tbl.columns" :rows="tbl.rows" />
                </div>
            </div>
        </div>

        <div v-if="currentTab === 'download'" class="tab-content">
            <h2 class="tab-heading">Download Full Dataset (CSV)</h2>
            <button class="download-button" @click="downloadCSV">
                <i class="fas fa-download"></i> Download CSV
            </button>
            <p class="note">CSV includes one row per metric/chart/table, with recent values or JSON.</p>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import BarChartCard from '../components/BarChartCard.vue'
import LineChartCard from '../components/LineChartCard.vue'
import PieChartCard from '../components/PieChartCard.vue'
import ValueCard from '../components/ValueCard.vue'
import TableCard from '../components/TableCard.vue'
import DateSliderCard from '../components/DateSliderCard.vue'
// 💧 live data (rename the path if your topic is different)
import { useMqtt } from '../composables/useMqtt'
const { ensureConnected, metrics } = useMqtt()
ensureConnected()

/// ✅ point to the "waterside" metric bucket
const wmLatest = computed(() => metrics?.waterside?.latest || null)
const wmSlot = computed(() => metrics?.waterside?.slot || [])

// last *today* point (sorted) – used for point-in-time KPIs
const lastTodayPoint = computed(() => {
    const { start, end } = getPeriodRange('1D')
    const s = start.getTime(), e = end.getTime()
    const pts = (wmSlot.value || [])
        .filter(p => {
            const t = pointTs(p)
            return Number.isFinite(t) && t >= s && t <= e
        })
        .sort(byTs)
    return pts.length ? pts[pts.length - 1] : (wmLatest.value || null)
})


// KPIs from waterside
const plantLoadRT = computed(() => {
    const p = lastTodayPoint.value
    return p && Number.isFinite(Number(p.total_rt)) ? Math.round(Number(p.total_rt)) : 0
})

const deltaT = computed(() => {
    const p = lastTodayPoint.value
    const chws = Number(p?.chws_temp_h)
    const chwr = Number(p?.chwr_temp_h)
    return Number.isFinite(chws) && Number.isFinite(chwr) ? +(chwr - chws).toFixed(2) : 0
})

const plantKwPerRT = computed(() => {
    const p = lastTodayPoint.value
    const kw = Number(p?.cp_kw)
    const rt = Number(p?.total_rt)
    if (!Number.isFinite(kw) || !Number.isFinite(rt) || rt <= 0) return 0
    return +(kw / rt).toFixed(2)
})


// Shared helpers
// ----- Period helpers (calendar-true; local timezone) -----
const pointTs = (p) => Date.parse(p?.ts_sgt || p?.ts_utc || 0) || NaN

function getPeriodRange(period) {
    const now = new Date()
    const end = now
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (period === '1D') {
        return { start: startOfToday, end }
    }
    if (period === '1W') {
        const start = new Date(startOfToday)
        start.setDate(start.getDate() - 6) // last 7 calendar days incl today
        return { start, end }
    }
    // 1M = last 30 days (calendar)
    const start = new Date(startOfToday)
    start.setDate(start.getDate() - 29)
    return { start, end }
}

const byTs = (a, b) => pointTs(a) - pointTs(b)

// daily bucket key in local time
function toLocalDateKey(ms) {
    const d = new Date(ms)
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}


const filteredWmSlot = computed(() => {
    const { start, end } = getPeriodRange(period.value)
    const s = start.getTime(), e = end.getTime()
    return (wmSlot.value || [])
        .filter(p => {
            const t = pointTs(p)
            return Number.isFinite(t) && t >= s && t <= e
        })
        .sort(byTs)
})

const lastUpdated = computed(() => wmLatest.value?.ts_sgt || wmLatest.value?.ts_utc || new Date().toLocaleString())


// period control (you already had these)
const period = ref('1D')
const setPeriod = p => period.value = p


// convert one point to m³ for the chart
function m3FromPoint(p) {
    // preferred: your backend provides this
    if (p.est_m3_10m != null) return Number(p.est_m3_10m)

    // fallback: derive from flow if it's m³/h and samples are every 10 minutes
    if (p.chwr_flow_h != null) return Number(p.chwr_flow_h) * (10 / 60)

    // last resort: try cumulative if you add it later (diff will be handled below)
    if (p.total_m3 != null) return Number(p.total_m3)

    return 0
}

// A) Temps + ΔT (°C)
const watersideTempsLine = computed(() => {
    const pts = filteredWmSlot.value

    const labels = pts.map(p => {
        const d = new Date(p.ts_sgt || p.ts_utc)
        return period.value === '1D'
            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    })

    const chws = pts.map(p => Number(p.chws_temp_h) || 0)
    const chwr = pts.map(p => Number(p.chwr_temp_h) || 0)
    const dt = pts.map((_, i) => (chwr[i] || 0) - (chws[i] || 0))

    return {
        chartData: {
            labels,
            datasets: [
                { label: 'CHWS (°C)', data: chws, borderWidth: 2, tension: 0.35, fill: false, pointRadius: 0 },
                { label: 'CHWR (°C)', data: chwr, borderWidth: 2, tension: 0.35, fill: false, pointRadius: 0 },
                { label: 'ΔT (°C)', data: dt, borderWidth: 2, tension: 0.35, fill: false, pointRadius: 0 }
            ]
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
})


// B) Flow (L/s) + Load (RT) — plotted together but same axis; values differ in magnitude, this is fine for trend.
const watersideFlowRtLine = computed(() => {
    const pts = filteredWmSlot.value

    const labels = pts.map(p => {
        const d = new Date(p.ts_sgt || p.ts_utc)
        return period.value === '1D'
            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    })

    const flow = pts.map(p => Number(p.chwr_flow_h) || 0) // L/s (or your unit)
    const rt = pts.map(p => Number(p.total_rt) || 0) // RT

    return {
        chartData: {
            labels,
            datasets: [
                { label: 'Flow (L/s)', data: flow, borderWidth: 2, tension: 0.35, fill: true, pointRadius: 0 },
                { label: 'Load (RT)', data: rt, borderWidth: 2, tension: 0.35, fill: false, pointRadius: 0 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
            scales: {
                x: { offset: true, ticks: { color: '#cbd5e1', padding: 10 }, grid: { color: 'rgba(255,255,255,.15)' } },
                y: { beginAtZero: true, ticks: { color: '#cbd5e1', padding: 6 }, grid: { color: 'rgba(255,255,255,.15)' } }
            },
            plugins: { legend: { position: 'top', labels: { color: '#cbd5e1' } }, tooltip: { mode: 'index', intersect: false } }
        }
    }
})



const currentDeltaT = computed(() => {
    const p = wmLatest.value
    if (!p) return 0
    const chws = Number(p.chws_temp_h)
    const chwr = Number(p.chwr_temp_h)
    if (!Number.isFinite(chws) || !Number.isFinite(chwr)) return 0
    return Number((chwr - chws).toFixed(2))
})

const currentLoadRT = computed(() => {
    const v = Number(wmLatest.value?.total_rt)
    return Number.isFinite(v) ? Math.round(v) : 0
})

const currentCpKwPerRt = computed(() => {
    const cp = Number(wmLatest.value?.cp_kw)
    const rt = Number(wmLatest.value?.total_rt)
    if (cp > 0 && rt > 0) return Number((cp / rt).toFixed(2))
    return 0
})

/* Tabs */
const currentTab = ref('overview')
const campusTabs = [
    'ITE CC & HQ', 'Block A Auditorium', 'Block A Admin', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F', 'Block G', 'Block H', 'Block J', 'Block K'
]
const currentSubTab = ref(campusTabs[0])
watch(currentTab, t => { if (t !== 'download') currentSubTab.value = campusTabs[0] })

/* Labels/Components (reused) */
// labelMap (rename & keep water-only)
const labelMap = {
    TSE: "PUB Water Incoming (m³) — Today",
    EUI: "NEWater Incoming (m³) — Today",
    WaterCUM: "Campus Water Incoming (m³) — Today",
    WEI: "Campus WUI (ℓ/person/day)",
    WaterEfficiency: "Water Source Distribution",
    TenantWaterMetersBar: "Water by Building (m³)",
    WaterConsumptionByBlockBar: "Block-wise Water (m³)",
    // remove energy keys here:
    // EnergyConsumptionByBlockBar, SolarGeneratedLine, TenantEnergyMetersBar
}

const componentMap = {
    TSE: ValueCard, EUI: ValueCard, FilterEnergy: DateSliderCard,
    WaterCUM: ValueCard, WEI: ValueCard,
    WaterEfficiency: PieChartCard, AirsideEfficiency: PieChartCard,
    TenantWaterMetersBar: BarChartCard,
    WaterConsumptionByBlockBar: BarChartCard,
    EnergyConsumptionByBlockBar: BarChartCard,
    SolarGeneratedLine: LineChartCard,
    TenantEnergyMetersBar: BarChartCard
}

/* Simple data */
const aggregatedValues = { TSE: 38400, EUI: 33600, WaterCUM: 72000, WEI: 120 }
const buildingValues = { TSE: 3200, EUI: 2800, WaterCUM: 6000, WEI: 120 }

/* Chart helpers */
const barColors = ['#1976d2', '#388e3c', '#f57c00', '#c2185b', '#7b1fa2', '#0097a7', '#d32f2f', '#ffa000', '#689f38', '#0288d1', '#512da8']
const colorAt = (i) => barColors[i % barColors.length]
const labels7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })
const randArr = (n, max = 500) => Array.from({ length: n }, () => Math.floor(Math.random() * max + 50))

/* Intake line data (1D/1W/1M) */
const intakeLine = computed(() => {
    // helper for making the chart object
    const make = (labels, data, label) => ({
        chartData: {
            labels,
            datasets: [{
                label,
                data,
                borderWidth: 2,
                tension: 0.35,
                fill: true,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
            scales: {
                x: { offset: true, ticks: { color: '#cbd5e1', padding: 10 }, grid: { color: 'rgba(255,255,255,.15)' } },
                y: { beginAtZero: true, ticks: { color: '#cbd5e1', padding: 6 }, grid: { color: 'rgba(255,255,255,.15)' } }
            },
            plugins: { legend: { position: 'top', labels: { color: '#cbd5e1' } }, tooltip: { mode: 'index', intersect: false } }
        }
    })

    const pts = filteredWmSlot.value

    // 1M: aggregate to daily totals
    if (period.value === '1M') {
        // Convert each point to 10-min m³
        const per10m = pts.map((p, i) => {
            // prefer est_m3_10m if present
            if (p.est_m3_10m != null) return Number(p.est_m3_10m)
            // diff cumulative total_m3 if available
            if (p.total_m3 != null && i > 0 && pts[i - 1].total_m3 != null) {
                return Math.max(0, Number(p.total_m3) - Number(pts[i - 1].total_m3))
            }
            // derive from flow if needed (L/s * 600s = L → m³)
            if (p.chwr_flow_h != null) return Number(p.chwr_flow_h) * (10 / 60)
            return 0
        })

        // bucket by local day
        const daily = new Map()
        pts.forEach((p, i) => {
            const t = pointTs(p); if (!t) return
            const key = toLocalDateKey(t)
            const prev = daily.get(key) ?? 0
            const val = Number.isFinite(per10m[i]) ? per10m[i] : 0
            daily.set(key, prev + val)
        })

        const labels = [...daily.keys()].sort()
        const data = labels.map(k => Math.round(daily.get(k)))
        if (!labels.length) {
            const fallback = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']
            return make(fallback, fallback.map(() => 0), 'Intake (m³, daily total)')
        }
        return make(labels, data, 'Intake (m³, daily total)')
    }

    // 1D / 1W: show raw 10-min points
    if (!pts.length) {
        const labels = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
        return make(labels, labels.map(() => 0), 'Intake (m³ / 10-min)')
    }

    // build per-10-min series
    const per10m = pts.map((p, i) => {
        if (p.est_m3_10m != null) return Number(p.est_m3_10m)
        if (p.total_m3 != null && i > 0 && pts[i - 1].total_m3 != null) {
            return Math.max(0, Number(p.total_m3) - Number(pts[i - 1].total_m3))
        }
        if (p.chwr_flow_h != null) return Number(p.chwr_flow_h) * (10 / 60)
        return 0
    })

    const labels = pts.map(p => {
        const d = new Date(p.ts_sgt || p.ts_utc)
        return period.value === '1D'
            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    })

    return make(labels, per10m, 'Intake (m³ / 10-min)')
})


// sum today from sorted points
// Sum today's water volume from flow (L/s) → m³ per 10-min
const waterTodayM3 = computed(() => {
    const pts = filteredWmSlot.value  // already time-filtered & sorted
    if (!pts.length) return 0

    let sum = 0
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i]

        // Prefer direct 10-min volume if available
        if (p.est_m3_10m != null) { sum += Number(p.est_m3_10m); continue }

        // If cumulative provided, take diff
        if (p.total_m3 != null && i > 0 && pts[i - 1].total_m3 != null) {
            const diff = Number(p.total_m3) - Number(pts[i - 1].total_m3)
            sum += Math.max(0, diff)
            continue
        }

        // Fallback from flow (L/s * 600 s = L → m³)
        const flowLs = Number(p.chwr_flow_h)
        if (Number.isFinite(flowLs)) sum += flowLs * 0.6
    }

    return Math.round(sum)
})



/* KPI tile values */
const avgFlowToday = computed(() => {
    const ds = intakeLine.value.chartData.datasets[0].data
    if (!ds.length) return 0
    const sum = ds.reduce((a, b) => a + b, 0)
    return Math.round(sum / ds.length)
})
/* Open alerts from diagnostics table (errors > 0 or Status != OK) */
const diagnosticsRows = [
    { Report: 'Report A', Status: 'OK', 'Last Run': '2025-06-11', Duration: '2m', Errors: '0' },
    { Report: 'Report B', Status: 'Warning', 'Last Run': '2025-06-11', Duration: '3m', Errors: '1' },
    { Report: 'Report C', Status: 'OK', 'Last Run': '2025-06-11', Duration: '1m', Errors: '0' },
    { Report: 'Report D', Status: 'Error', 'Last Run': '2025-06-11', Duration: '4m', Errors: '3' }
]
const openAlerts = computed(() => diagnosticsRows.filter(r => r.Status !== 'OK' || Number(r.Errors) > 0).length)

const kpiTiles = computed(() => [
    { label: 'Campus Water', value: waterTodayM3.value, unit: 'm³', sub: 'today', icon: 'fas fa-tint', bg: '#0ea5e9' },

    // ✅ new KPI tiles
    { label: 'Plant Load', value: plantLoadRT.value, unit: 'RT', sub: 'now', icon: 'fas fa-snowflake', bg: '#06b6d4' },
    { label: 'ΔT', value: deltaT.value, unit: '°C', sub: 'now', icon: 'fas fa-temperature-low', bg: '#a855f7' },
    { label: 'Plant kW/RT', value: plantKwPerRT.value, unit: 'kW/RT', sub: 'now', icon: 'fas fa-bolt', bg: '#f59e0b' },

    { label: 'PUB Intake', value: (currentSubTab.value === campusTabs[0] ? aggregatedValues.TSE : buildingValues.TSE), unit: 'm³', sub: 'today', icon: 'fas fa-faucet', bg: '#2563eb' },
    { label: 'NEWater', value: (currentSubTab.value === campusTabs[0] ? aggregatedValues.EUI : buildingValues.EUI), unit: 'm³', sub: 'today', icon: 'fas fa-water', bg: '#10b981' },
    { label: 'Avg Flow', value: avgFlowToday.value, unit: 'm³', sub: 'today', icon: 'fas fa-chart-line', bg: '#f59e0b' }
])

/* Donut (PUB vs NEWater) using your WaterEfficiency */
const waterEfficiencyPie = computed(() => {
    // Simulate currentSubTab breakdown: if overall, use fixed; else random split
    const overall = currentSubTab.value === campusTabs[0]
    const pub = overall ? 38400 : Math.floor(Math.random() * 4000 + 1200)
    const ne = overall ? 33600 : Math.floor(Math.random() * 3500 + 1000)
    const rw = overall ? 36600 : Math.floor(Math.random() * 3500 + 1000)
    return {
        chartData: { labels: ['PUB', 'NEWater', 'RainWater'], datasets: [{ data: [pub, ne, rw] }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    }
})
const donutLegend = [
    { label: 'PUB', color: '#22c55e' },
    { label: 'NEWater', color: '#3b82f6' }
]

/* Bars under donut: top 4 consuming blocks from TenantWaterMetersBar */
const topBlocks = computed(() => {
    const labels = currentSubTab.value === campusTabs[0] ? campusTabs.slice(1, 5) : ['Mon', 'Tue', 'Wed', 'Thu']
    const vals = labels.map(() => Math.floor(Math.random() * 100) + 40) // 40–139
    const max = Math.max(...vals) || 1
    return labels.map((l, i) => ({ label: l, level: Math.round(vals[i] / max * 100) }))
})

/* Overview events table reusing diagnostics */
const overviewEvents = {
    columns: ['Report', 'Status', 'Last Run', 'Duration', 'Errors'],
    rows: diagnosticsRows
}
const ackAll = () => { /* hook */ }
const checklist = [
    'Meters polled successfully',
    'PUB/NEWater readings synced',
    'Leak checks cleared',
    'Block-level anomalies reviewed'
]
const lastCompleted = ref('Today • 10:45')
const markCompleted = () => { lastCompleted.value = `${new Date().toLocaleDateString()} • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` }

/* ===== YOUR ORIGINAL "Usage / Sustain / Stats / Download" plumbing ===== */
const topMetrics = ['TSE', 'EUI', 'FilterEnergy', 'WaterCUM', 'WEI']
const sustainTables = [
    {
        title: 'Sustainability Indicators – Detailed Breakdown',
        columns: ['Indicator', 'Current Value', 'Target', 'Unit', 'Change %'],
        rows: [
            { Indicator: 'Scope 1 CO₂', 'Current Value': '1,200', Target: '1,000', Unit: 't', 'Change %': '-20%' },
            { Indicator: 'Scope 2 CO₂', 'Current Value': '3,400', Target: '3,200', Unit: 't', 'Change %': '-6%' },
            { Indicator: 'Scope 3 CO₂', 'Current Value': '2,500', Target: '2,000', Unit: 't', 'Change %': '-20%' },
            { Indicator: 'Total Water Use', 'Current Value': '500', Target: '450', Unit: 'm³', 'Change %': '-10%' },
            { Indicator: 'Total Energy Use', 'Current Value': '10,000', Target: '9,000', Unit: 'kWh', 'Change %': '-10%' },
            { Indicator: 'Waste Generated', 'Current Value': '75', Target: '60', Unit: 't', 'Change %': '-20%' }
        ]
    }
]
const statsTables = [
    {
        title: 'Statistical Analysis – CCTV Analytics Metrics',
        columns: ['Metric', 'Value', 'Threshold', 'Alert', 'Last Updated'],
        rows: [
            { Metric: 'Motion Alerts', Value: '12', Threshold: '10', Alert: 'Yes', 'Last Updated': '2025-06-10' },
            { Metric: 'Object Alerts', Value: '5', Threshold: '8', Alert: 'No', 'Last Updated': '2025-06-10' },
            { Metric: 'Person Detections', Value: '3', Threshold: '2', Alert: 'Yes', 'Last Updated': '2025-06-10' },
            { Metric: 'Loitering Alerts', Value: '7', Threshold: '5', Alert: 'Yes', 'Last Updated': '2025-06-10' },
            { Metric: 'False Positives', Value: '4', Threshold: '6', Alert: 'No', 'Last Updated': '2025-06-10' }
        ]
    },
    {
        title: 'Statistical Analysis – System Diagnostics',
        columns: ['Report', 'Status', 'Last Run', 'Duration', 'Errors'],
        rows: diagnosticsRows
    }
]

function generateProps(type) {
    const isPie = ['WaterEfficiency', 'AirsideEfficiency'].includes(type)
    if (type === 'FilterEnergy') return { title: labelMap[type], start: '2025-06-01', end: '2025-06-19', onChange: () => { } }

    // HQ => per-building bars; building => last-7
    const barKeys = ['TenantWaterMetersBar', 'WaterConsumptionByBlockBar', 'EnergyConsumptionByBlockBar', 'TenantEnergyMetersBar']
    if (barKeys.includes(type)) {
        const labels = currentSubTab.value === campusTabs[0] ? campusTabs.slice(1) : labels7
        const data = currentSubTab.value === campusTabs[0] ? labels.map((_, i) => 200 + i * 30 + Math.floor(Math.random() * 80)) : randArr(7)
        return { title: labelMap[type], chartData: { labels, datasets: [{ label: labelMap[type], data, backgroundColor: labels.map((_, i) => colorAt(i)) }] }, options: { responsive: true, scales: { y: { beginAtZero: true } } } }
    }

    if (['TSE', 'EUI', 'WaterCUM', 'WEI'].includes(type)) {
        const src = currentSubTab.value === campusTabs[0] ? aggregatedValues : buildingValues
        return { title: labelMap[type], value: src[type] }
    }

    // Pie/line fallback
    return { title: labelMap[type], chartData: { labels: labels7, datasets: [{ label: labelMap[type], data: randArr(7) }] }, options: { responsive: true } }
}

function downloadCSV() {
    const header = ['Type', 'Label', 'Category', 'Metric/Chart/Table', 'Most Recent Value', 'Last 7 Days Data', 'Table JSON'].join(',')
    const all = [...topMetrics, 'WaterEfficiency', 'AirsideEfficiency', 'TenantWaterMetersBar', 'WaterConsumptionByBlockBar', 'EnergyConsumptionByBlockBar', 'SolarGeneratedLine', 'TenantEnergyMetersBar']
    const rows = all.map(type => {
        if (['TSE', 'EUI', 'WaterCUM', 'WEI', 'FilterEnergy'].includes(type)) {
            const v = generateProps(type).value ?? ''
            return [type, `"${labelMap[type]}"`, 'Usage', 'Metric', v, '', ''].join(',')
        }
        const arr = generateProps(type).chartData.datasets[0].data.join('|')
        return [type, `"${labelMap[type]}"`, 'Usage', 'Chart', '', arr, ''].join(',')
    })
    const blob = new Blob([header, ...rows].join('\r\n'), { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'water_management_data.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a)
}
</script>

<style scoped>
/* ─────────────────────────────────────────────────────────────────────────────
   Base page (dark, like your app) + wider canvas
   ───────────────────────────────────────────────────────────────────────────── */
.water-management-container {
    /* new: center & cap width */
    margin: 0 auto;
    /* new: center content */
    padding: 24px 28px;
    /* was 20px */
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
    /* was 16px */
}

.page-title {
    margin: 0;
    font-size: 24px;
}

.breadcrumb span {
    font-size: 14px;
    margin: 0 4px;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Tabs
   ───────────────────────────────────────────────────────────────────────────── */
.tab-nav {
    display: flex;
    gap: 12px;
    /* was 10px */
    margin-bottom: 20px;
    /* was 16px */
}

.tab-nav button {
    padding: 6px 12px;
    border: none;
    background: rgba(255, 255, 255, .1);
    border-radius: 6px;
    /* was 4px */
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

/* Sub tabs */
.sub-tab-nav {
    display: flex;
    gap: 12px;
    /* was 10px */
    margin-bottom: 20px;
    /* was 16px */
}

.sub-tab-nav button {
    padding: 6px 12px;
    border: none;
    background: rgba(255, 255, 255, .1);
    border-radius: 6px;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
    font-size: .9rem;
}

.sub-tab-nav button:hover {
    background: rgba(255, 255, 255, .2);
}

.sub-tab-nav button:first-child {
    padding-right: 16px;
    border-right: 1px solid rgba(255, 255, 255, .3);
    margin-right: 8px;
}

.sub-tab-nav button.active {
    background: #1976d2;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SmartToilet-like overview header strip
   ───────────────────────────────────────────────────────────────────────────── */
.meta-strip {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    /* was 12px */
    align-items: start;
    margin-bottom: 14px;
    /* was 10px */
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
    /* was 8px */
    align-items: center;
}

.meta-chip {
    background: #11284d;
    border: 1px solid rgba(255, 255, 255, .08);
    padding: 8px 12px;
    /* was 8px 10px */
    border-radius: 12px;
    /* was 10px */
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

.dot.ok {
    background: #22c55e;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Grid helpers / cards
   ───────────────────────────────────────────────────────────────────────────── */
.grid {
    display: grid;
    gap: 20px;
}

/* was 16px */

.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    /* 6×200 + 5×16 = 1360 fits */
    gap: 16px;
}


.card {
    background: #11284d;
    border-radius: 16px;
    /* was 14px */
    padding: 16px;
    /* was 14px */
    /* new subtle lift */
}

/* KPI tile internals */
.kpi-top {
    display: flex;
    align-items: center;
    gap: 12px;
    /* was 10px */
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

/* a bit bigger & heavier */
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

/* ─────────────────────────────────────────────────────────────────────────────
   Charts area
   ───────────────────────────────────────────────────────────────────────────── */
.charts-grid {
    display: grid;
    grid-template-columns: 2fr 1.25fr;
    /* was 2fr 1.3fr */
    column-gap: 22px;
    /* new: explicit column gap */
    row-gap: 20px;
    margin-top: 2%;
    margin-bottom: 2%;
    align-items: stretch;

}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    /* was 8px */
}

.card-header h3 {
    margin: 0;
    font-size: 1rem;
}

.actions .chip {
    margin-left: 6px;
}

/* Taller charts so they breathe */
.chart-wrap {
    height: 420px;
}

/* was 280px */

/* Donut legend + bars */
.legend {
    display: flex;
    gap: 12px;
    color: #c8d5ff;
    font-size: .85rem;
}

.legend .dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    display: inline-block;
    margin-right: 6px;
}

.consumable-grid {
    margin-top: 12px;
    /* was 10px */
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    /* was 10px */
}

.consumable .label {
    color: #c8d5ff;
    font-size: .85rem;
    margin-bottom: 6px;
}

.consumable .bar {
    height: 8px;
    background: #0f172a;
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, .08);
}

.consumable .fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #16a34a);
}

.consumable .pct {
    font-size: .8rem;
    color: #c8d5ff;
    margin-top: 4px;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Bottom row (table + checklist)
   ───────────────────────────────────────────────────────────────────────────── */
.bottom-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    column-gap: 22px;
    row-gap: 20px;
}

.table-wrap {
    overflow: auto;
}

.tips .checklist {
    padding-left: 18px;
    margin: 0 0 10px;
    /* was 8px */
}

.btn {
    background: #2563eb;
    border: none;
    color: #fff;
    border-radius: 10px;
    padding: 10px 14px;
    cursor: pointer;
    margin-top: 8px;
}

.muted {
    color: #c8d5ff;
    display: block;
    margin-top: 8px;
}

/* Chips & buttons */
.chip {
    font-size: .8rem;
    color: #fff;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .12);
    padding: 7px 12px;
    /* was 6px 10px */
    border-radius: 999px;
    cursor: pointer;
}

.chip.active {
    background: #1976d2;
}

.chip.ghost {
    background: transparent;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Your original “usage” layouts (kept, with small comfort tweaks)
   ───────────────────────────────────────────────────────────────────────────── */
.card-wrapper {
    background: #11284d;
    color: #fff;
    border-radius: 12px;
    /* was 8px */
    padding: 16px;
    /* was 12px */
    box-shadow: 0 6px 18px rgba(0, 0, 0, .2);
    /* slightly deeper */
}

.cards-grid {
    display: grid;
    gap: 14px;
    /* was 10px */
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
}

.usage-top-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    /* was 10px */
    margin-bottom: 18px;
    /* was 16px */
}

.usage-mid-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    /* was 6px */
    margin-bottom: 16px;
    /* was 12px */
}

.usage-bottom-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    /* was 10px */
    margin-bottom: 18px;
    /* was 16px */
}

.usage-bottom-grid .span-2 {
    grid-column: span 2;
}

.stacked-card-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    /* was 10px */
}

.small-chart {
    flex: 1 1 auto;
}

/* Download button */
.download-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 6px;
    /* was 4px */
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

/* ─────────────────────────────────────────────────────────────────────────────
   Responsive
   ───────────────────────────────────────────────────────────────────────────── */
@media (max-width:1100px) {
    .kpi-grid {
        grid-template-columns: repeat(3, 1fr);
    }

    /* still wraps via auto-fit */
    .charts-grid {
        grid-template-columns: 1fr;
    }

    .chart-wrap {
        height: 300px;
    }

    /* was 320px */
    .bottom-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width:768px) {
    .water-management-container {
        padding: 16px;
    }

    /* was 10px */
    .tab-nav {
        flex-direction: column;
        gap: 10px;
    }

    /* was 8px */
    .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .usage-top-grid,
    .usage-mid-grid,
    .usage-bottom-grid {
        grid-template-columns: 1fr !important;
    }

    .cards-grid {
        grid-template-columns: 1fr !important;
        gap: 10px;
    }

    /* was 8px */
    .chart-wrap {
        height: 280px;
    }
}

/* Make the whole card the only rounded surface */
.card.chart-card {
    padding: 14px 16px 16px;
    /* card padding keeps header spacing */
    border-radius: 16px;
    overflow: hidden;
    /* clip canvas glow at edges */
}

/* Kill the inner rounded panel look */
.card.chart-card .chart-wrap {
    margin: 0;
    /* remove inner margins */
    padding: 0 0 40px;
    /* keep bottom room for x-axis */
    background: transparent;
    /* no inner background */
    border-radius: 0;
    box-shadow: none;
}

/* Ensure canvas fills and axis isn’t cropped */
.card.chart-card .chart-wrap canvas {
    width: 100% !important;
    height: 100% !important;
    display: block;
}
</style>
