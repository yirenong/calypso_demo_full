<template>
    <div class="power-management-container">
        <!-- Page Header -->
        <div class="page-header">
            <h2 class="page-title">Energy Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt;
                <span>Management</span> &gt;
                <span>Energy Management</span>
            </nav>
        </div>

        <!-- Primary Tabs -->
        <div class="tab-nav">
            <button :class="{ active: currentTab === 'overview' }" @click="currentTab = 'overview'">Overview</button>
            <button :class="{ active: currentTab === 'chiller' }" @click="currentTab = 'chiller'">Chiller Plant
                Energy</button>
            <button :class="{ active: currentTab === 'campus' }" @click="currentTab = 'campus'">Campus Electrical
                Energy</button>
            <button :class="{ active: currentTab === 'download' }" @click="currentTab = 'download'">Download
                Data</button>
        </div>

        <!-- Secondary Tabs (Campus list for Overview/Chiller/Campus) -->
        <div v-if="currentTab !== 'download'" class="sub-tab-nav">
            <button v-for="campus in campusTabs" :key="campus" :class="{ active: currentSubTab === campus }"
                @click="currentSubTab = campus">
                {{ campus }}
            </button>
        </div>

        <!-- ========================= -->
        <!-- OVERVIEW (kept)          -->
        <!-- ========================= -->
        <section v-if="currentTab === 'overview'" class="tab-content overview">
            <div class="overview-header">
                <div class="ov-left">
                    <span class="badge">Energy Overview</span>
                    <h1 class="ov-title">Overview — {{ overviewBuilding }}</h1>
                    <p class="ov-sub">Live campus power, solar, usage & efficiency summary</p>
                </div>
                <div class="ov-right">
                    <div class="ov-chip"><span class="dot ok"></span> Normal</div>
                    <div class="ov-chip">Updated: <strong>{{ lastUpdated }}</strong></div>
                </div>
            </div>

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

            <div class="ov-charts">
                <!-- Electrical Intake Trend -->
                <div class="card-wrapper chart-card">
                    <div class="ov-card-head">
                        <h3>Electrical Intake • {{ flowPeriodLabel }}</h3>
                        <div class="actions">
                            <button class="chip" :class="{ active: flowPeriod === '1D' }"
                                @click="flowPeriod = '1D'">1D</button>
                            <button class="chip" :class="{ active: flowPeriod === '1W' }"
                                @click="flowPeriod = '1W'">1W</button>
                            <button class="chip" :class="{ active: flowPeriod === '1M' }"
                                @click="flowPeriod = '1M'">1M</button>
                        </div>
                    </div>
                    <LineChartCard :title="'Electrical Intake (kWh)'" :chartData="intakeChartData"
                        :options="flowChartOpts" />
                </div>

                <!-- Energy Source Mix -->
                <div class="card-wrapper chart-card energy-mix">
                    <div class="ov-card-head">
                        <h3>Energy Source Mix</h3>
                        <div class="legend">
                            <span v-for="d in donutLegend" :key="d.label">
                                <i class="legend-dot" :style="{ background: d.color }"></i>{{ d.label }}
                            </span>
                        </div>
                    </div>
                    <PieChartCard :title="'Energy Sources'" :chartData="sourceDonutData" :options="donutOpts" />
                    <div class="consumable-grid">
                        <div class="consumable" v-for="b in usageBreakdown" :key="b.label">
                            <div class="label">{{ b.label }}</div>
                            <div class="bar">
                                <div class="fill" :style="{ width: b.level + '%' }"></div>
                            </div>
                            <div class="pct">{{ b.level }}%</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="ov-bottom">
                <div class="card-wrapper">
                    <div class="ov-card-head">
                        <h3>Latest Key Metrics</h3>
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

                <div class="card-wrapper tips">
                    <div class="card quick-actions">
                        <h3>Quick Actions</h3>
                        <ul>
                            <li>Export today’s campus data snapshot</li>
                            <li>Compare intake vs. solar contribution (last 7 days)</li>
                            <li>Review chiller KPIs (kW/RT, heat balance)</li>
                        </ul>
                        <button class="export-btn"><i class="fa fa-download"></i> Export CSV</button>
                        <p class="note">Includes KPIs and last-7-day trends.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- ========================= -->
        <!-- CHILLER (kept)           -->
        <!-- ========================= -->
        <section v-if="currentTab === 'chiller'" class="tab-content">
            <h2>Chiller Plant Energy</h2>
            <div class="chiller-top-grid">
                <div v-for="type in chillerTopMetrics" :key="type" class="card-wrapper value-card">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>
            <div class="chiller-bottom-grid">
                <div v-for="type in chillerChartTypes" :key="type" class="card-wrapper chart-card">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>
        </section>

        <!-- ========================= -->
        <!-- CAMPUS ELECTRICAL ENERGY -->
        <!-- ========================= -->
        <section v-if="currentTab === 'campus'" class="tab-content">
            <div class="ov-card-head" style="margin-bottom:8px">
                <h2 style="margin:0">Campus Electrical Energy — {{ currentSubTab }}</h2>
                <div class="actions">
                    <button class="chip" :class="{ active: campusPeriod === '1D' }"
                        @click="campusPeriod = '1D'">1D</button>
                    <button class="chip" :class="{ active: campusPeriod === '1W' }"
                        @click="campusPeriod = '1W'">1W</button>
                    <button class="chip" :class="{ active: campusPeriod === '1M' }"
                        @click="campusPeriod = '1M'">1M</button>
                    <button class="chip" :class="{ active: campusPeriod === '1Y' }"
                        @click="campusPeriod = '1Y'">1Y</button>
                </div>
            </div>

            <!-- Metric tiles for the selected campus -->
            <div class="cards-grid">
                <div v-for="type in campusMetricTypes" :key="type" class="card-wrapper value-card">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>

            <!-- Charts -->
            <div class="cards-grid">
                <!-- Daily totals bar: Electrical Intake -->
                <div class="card-wrapper chart-card">
                    <BarChartCard :title="'Electrical Intake (kWh) — Daily totals'"
                        :chartData="campusIntakeDaily.chartData" :options="campusBarsOpts" />
                </div>

                <!-- Stacked daily: Source split Grid/Solar/Generator -->
                <div class="card-wrapper chart-card">
                    <BarChartCard :title="'Source Split (Grid / Solar / Gen) — Daily totals'"
                        :chartData="campusSourceStacked.chartData" :options="campusStackedOpts" />
                </div>

                <!-- EUI (kWh/m²/day) daily -->
                <div class="card-wrapper chart-card">
                    <BarChartCard :title="'Campus EUI (kWh/m²/day)'" :chartData="campusEuiDaily.chartData"
                        :options="campusBarsOpts" />
                </div>

                <!-- Usage Distribution (demo split) -->
                <div class="card-wrapper chart-card">
                    <PieChartCard :title="'Usage Distribution (HVAC/Lighting/Plug/Other)'"
                        :chartData="campusUsagePie.chartData" :options="{ responsive: true }" />
                </div>
            </div>
        </section>

        <!-- ========================= -->
        <!-- Download (kept)          -->
        <!-- ========================= -->
        <section v-if="currentTab === 'download'" class="tab-content">
            <h2>Download Full Dataset (CSV)</h2>
            <button class="download-button" @click="downloadCSV"><i class="fas fa-download"></i> Download CSV</button>
            <p class="note">CSV includes one row per type, with latest metrics or 7-day data.</p>
        </section>
    </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import BarChartCard from '../components/BarChartCard.vue'
import LineChartCard from '../components/LineChartCard.vue'
import PieChartCard from '../components/PieChartCard.vue'
import ValueCard from '../components/ValueCard.vue'
import { useMqtt } from '../composables/useMqtt'

const { ensureConnected, metrics } = useMqtt()
ensureConnected()

/* =========================
   Live data you already had
   ========================= */
const teLatest = computed(() => metrics?.totalenergy?.latest || null)
const teSlot = computed(() => metrics?.totalenergy?.slot || [])

/* ============== Tabs / Campus ============== */
const currentTab = ref('overview')
const campusTabs = ['ITE CC & HQ', 'Block A Auditorium', 'Block A Admin', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F', 'Block G', 'Block H', 'Block J', 'Block K']
const currentSubTab = ref(campusTabs[0])
watch(currentTab, tab => { if (tab !== 'download') currentSubTab.value = campusTabs[0] })

/* ============== Helpers ============== */
const lastUpdated = computed(() => teLatest.value?.ts_sgt || teLatest.value?.ts_utc || new Date().toLocaleString())
const overviewBuilding = computed(() => currentSubTab.value)

const barColorPalette = ['#1976d2', '#388e3c', '#f57c00', '#c2185b', '#7b1fa2', '#0097a7', '#d32f2f', '#ffa000', '#689f38', '#0288d1', '#512da8']
const assignBarColors = labels => labels.map((_, i) => barColorPalette[i % barColorPalette.length])

// time helpers
const ts = p => Date.parse(p?.ts_sgt || p?.ts_utc || 0) || NaN
const byTs = (a, b) => ts(a) - ts(b)
const dayKey = (ms) => {
    const d = new Date(ms); const y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}
function periodRange(period) {
    const now = new Date(); const end = now
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (period === '1D') return { start: startOfToday, end }
    if (period === '1W') { const s = new Date(startOfToday); s.setDate(s.getDate() - 6); return { start: s, end } }
    if (period === '1M') { const s = new Date(startOfToday); s.setDate(s.getDate() - 29); return { start: s, end } }
    if (period === '1Y') { const s = new Date(startOfToday); s.setFullYear(s.getFullYear() - 1); s.setDate(s.getDate() + 1); return { start: s, end } }
    return { start: startOfToday, end }
}
function dailyAgg(pts, key) {
    const m = new Map()
    pts.forEach(p => {
        const t = ts(p); if (!Number.isFinite(t)) return
        const k = dayKey(t)
        const v = Number(p?.[key] ?? 0)
        m.set(k, (m.get(k) ?? 0) + (Number.isFinite(v) ? v : 0))
    })
    const labels = [...m.keys()].sort()
    const data = labels.map(k => m.get(k))
    return { labels, data }
}

/* =========================
   Overview: KPIs/charts (kept)
   ========================= */
const labelMap = {
    ElecIncoming: "⚡ Today's Electrical Incoming (kWh)",
    ElecUsage: "⚡ Today's Electrical Usage (kWh)",
    TenantUsage: "⚡ Today's Tenant Electrical Usage (kWh)",
    Solar: "🔆 Today's Solar (kWh)",
    EVCharging: '🔋 Today\'s EV Charging (kWh)',
    CampusEUI: '⚡ Campus EUI (kWh/m²)',
    CampusTSE: '⚡ Campus TSE (kW/RT)'
}
const componentMap = { ElecIncoming: ValueCard, ElecUsage: ValueCard, TenantUsage: ValueCard, Solar: ValueCard, EVCharging: ValueCard, CampusEUI: ValueCard, CampusTSE: ValueCard, EnergySourceDistBar: BarChartCard, EnergySourceDistPie: PieChartCard, CampusEUIBar: BarChartCard, ElectricalIntakeBar: BarChartCard, EnergyUsageDistBar: BarChartCard, EnergyUsageDistPie: PieChartCard, AirsideEnergyDistBar: BarChartCard }

const aggregatedCampus = { ElecIncoming: 24000, ElecUsage: 20000, TenantUsage: 12000, Solar: 3200, EVCharging: 450, CampusEUI: 150, CampusTSE: 1.8 }
const buildingTypical = { ElecIncoming: 2200, ElecUsage: 1800, TenantUsage: 1000, Solar: 260, EVCharging: 35, CampusEUI: 135, CampusTSE: 1.95 }

function isSameLocalDay(aISO, b = new Date()) {
    if (!aISO) return false
    const a = new Date(aISO)
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
const todayPoints = computed(() => {
    const slot = (teSlot.value || []).filter(p => isSameLocalDay(p.ts_sgt || p.ts_utc)).sort(byTs)
    const latest = teLatest.value
    if (latest && isSameLocalDay(latest.ts_sgt || latest.ts_utc)) {
        const last = slot[slot.length - 1]; const lastTs = last ? ts(last) : NaN; const latTs = ts(latest)
        if (latTs && latTs !== lastTs) slot.push(latest)
    }
    return slot
})
const electIncomingTodayKwh = computed(() => {
    const pts = todayPoints.value; if (!pts.length) return 0
    const first = pts[0].total_kw; const last = pts[pts.length - 1].total_kw
    return Math.max(0, Math.round(last - first))
})
const elecIncomingDisplay = computed(() => electIncomingTodayKwh.value)

const overviewKpis = computed(() => {
    const v = (key, unit = '', sub = '') => ({ label: labelMap[key].replace(/^⚡ |🔆 |🔋 /, ''), value: generateProps(key).value, unit, sub })
    return [
        { ...v('ElecIncoming', 'kWh', 'today'), icon: 'fas fa-bolt', bg: '#2563eb' },
        { ...v('ElecUsage', 'kWh', 'today'), icon: 'fas fa-plug', bg: '#059669' },
        { ...v('TenantUsage', 'kWh', 'today'), icon: 'fas fa-users', bg: '#0ea5e9' },
        { ...v('Solar', 'kWh', 'today'), icon: 'fas fa-sun', bg: '#f59e0b' },
        { ...v('CampusEUI', 'kWh/m²', ''), icon: 'fas fa-chart-line', bg: '#7c3aed' },
        { ...v('CampusTSE', 'kW/RT', ''), icon: 'fas fa-tachometer-alt', bg: '#c026d3' }
    ]
})

// overview intake line period
const flowPeriod = ref('1D')
const flowPeriodLabel = computed(() => flowPeriod.value === '1D' ? 'Today' : flowPeriod.value === '1W' ? 'This Week' : 'This Month')
const filteredTeSlot = computed(() => {
    const { start, end } = periodRange(flowPeriod.value)
    return (teSlot.value || []).filter(p => {
        const t = ts(p); return Number.isFinite(t) && t >= start.getTime() && t <= end.getTime()
    }).sort(byTs)
})
const intakeChartData = computed(() => {
    const pts = filteredTeSlot.value
    if (flowPeriod.value === '1M') {
        const { labels, data } = dailyAgg(pts, 'est_kwh_10m')
        return { labels, datasets: [{ label: 'Intake (kWh, daily total)', data, tension: .35, fill: true, pointRadius: 2 }] }
    }
    if (!pts.length) {
        const labels = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
        return { labels, datasets: [{ label: 'Intake (kWh, 10-min est)', data: labels.map(() => 0), tension: .35, fill: true, pointRadius: 2 }] }
    }
    const labels = pts.map(p => {
        const d = new Date(p.ts_sgt || p.ts_utc)
        return flowPeriod.value === '1D' ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    })
    const data = pts.map(p => Number(p?.est_kwh_10m ?? 0))
    return { labels, datasets: [{ label: 'Intake (kWh, 10-min est)', data, tension: .35, fill: true, pointRadius: 2 }] }
})
const flowChartOpts = {
    responsive: true, maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
    scales: {
        x: { offset: true, ticks: { color: '#cbd5e1', padding: 10 }, grid: { color: 'rgba(255,255,255,.15)' } },
        y: { beginAtZero: true, ticks: { color: '#cbd5e1', padding: 6 }, grid: { color: 'rgba(255,255,255,.15)' } }
    },
    plugins: { legend: { display: true, labels: { color: '#cbd5e1' } }, tooltip: { mode: 'index', intersect: false } }
}

// overview mix + usage breakdown (demo)
const donutLegend = [{ label: 'Solar', color: '#f59e0b' }, { label: 'Grid', color: '#2563eb' }, { label: 'Generator', color: '#ef4444' }]
const sourceDonutData = computed(() => {
    const solar = Math.floor(10 + Math.random() * 30)
    const gen = Math.floor(2 + Math.random() * 8)
    const grid = Math.max(0, 100 - solar - gen)
    return { labels: ['Solar', 'Grid', 'Generator'], datasets: [{ data: [solar, grid, gen] }] }
})
const donutOpts = { responsive: true, plugins: { legend: { display: false } } }
const usageBreakdown = computed(() => {
    const hvac = 40 + Math.floor(Math.random() * 20)
    const light = 10 + Math.floor(Math.random() * 20)
    const plug = 10 + Math.floor(Math.random() * 20)
    let other = 100 - hvac - light - plug; if (other < 0) other = 5
    return [{ label: 'HVAC', level: hvac }, { label: 'Lighting', level: light }, { label: 'Plug Loads', level: plug }, { label: 'Other', level: other }]
})
const latestRows = computed(() => [
    { label: 'Today’s Electrical Incoming', value: `${elecIncomingDisplay.value} kWh`, note: 'Utility intake' },
    { label: 'Today’s Electrical Usage', value: `${generateProps('ElecUsage').value} kWh`, note: 'Campus total' },
    { label: 'Tenant Electrical Usage', value: `${generateProps('TenantUsage').value} kWh`, note: 'Sub-metered' },
    { label: 'Today’s Solar', value: `${generateProps('Solar').value} kWh`, note: 'PV contribution' },
    { label: 'Campus EUI', value: `${generateProps('CampusEUI').value} kWh/m²`, note: 'Energy per area' },
    { label: 'Campus TSE', value: `${generateProps('CampusTSE').value} kW/RT`, note: 'Chiller efficiency' }
])

/* =========================
   CAMPUS ELECTRICAL ENERGY
   ========================= */
const campusMetricTypes = ['ElecIncoming', 'ElecUsage', 'TenantUsage', 'Solar', 'EVCharging', 'CampusEUI', 'CampusTSE']
const campusPeriod = ref('1M')

// Filter slot by campusPeriod
const campusFilteredSlot = computed(() => {
    const { start, end } = periodRange(campusPeriod.value)
    return (teSlot.value || []).filter(p => {
        const t = ts(p); return Number.isFinite(t) && t >= start.getTime() && t <= end.getTime()
    }).sort(byTs)
})

// 1) Daily totals bar (Electrical Intake)
const campusIntakeDaily = computed(() => {
    const { labels, data } = dailyAgg(campusFilteredSlot.value, 'est_kwh_10m')
    return {
        chartData: { labels, datasets: [{ label: 'Total (kWh/day)', data, backgroundColor: assignBarColors(labels) }] }
    }
})

// 2) Source stacked (Grid/Solar/Generator) daily totals
const campusSourceStacked = computed(() => {
    const pts = campusFilteredSlot.value
    const buckets = new Map() // key -> { total, solar, gen }
    pts.forEach(p => {
        const k = dayKey(ts(p))
        const total = Number(p?.est_kwh_10m ?? 0)
        const solar = Number(p?.solar_kwh_10m ?? 0)    // <-- swap to your real key if different
        const gen = Number(p?.gen_kwh_10m ?? 0)    // <-- swap to your real key if different
        const prev = buckets.get(k) || { total: 0, solar: 0, gen: 0 }
        prev.total += Number.isFinite(total) ? total : 0
        prev.solar += Number.isFinite(solar) ? solar : 0
        prev.gen += Number.isFinite(gen) ? gen : 0
        buckets.set(k, prev)
    })
    const labels = [...buckets.keys()].sort()
    const solar = labels.map(k => Math.max(0, Math.round(buckets.get(k).solar)))
    const gen = labels.map(k => Math.max(0, Math.round(buckets.get(k).gen)))
    const grid = labels.map(k => {
        const b = buckets.get(k); const g = Math.round((b.total - b.solar - b.gen))
        return Math.max(0, g)
    })
    return {
        chartData: {
            labels,
            datasets: [
                { label: 'Grid', data: grid, stack: 'src' },
                { label: 'Solar', data: solar, stack: 'src' },
                { label: 'Gen', data: gen, stack: 'src' }
            ]
        }
    }
})

// 3) EUI (kWh/m²/day)
const CAMPUS_AREA_M2 = 160000 // TODO: replace with actual campus GFA
const campusEuiDaily = computed(() => {
    const { labels, data } = dailyAgg(campusFilteredSlot.value, 'est_kwh_10m')
    const eui = labels.map((k, i) => (CAMPUS_AREA_M2 > 0 ? +(data[i] / CAMPUS_AREA_M2).toFixed(3) : 0))
    return {
        chartData: { labels, datasets: [{ label: 'EUI (kWh/m²/day)', data: eui, backgroundColor: assignBarColors(labels) }] }
    }
})

// 4) Usage Distribution pie (demo, static split per campus)
const campusUsagePie = computed(() => {
    const hvac = 50, light = 20, plug = 22, other = 8
    return { chartData: { labels: ['HVAC', 'Lighting', 'Plug Loads', 'Other'], datasets: [{ data: [hvac, light, plug, other] }] } }
})

// Common chart opts for campus bars
const campusBarsOpts = { responsive: true, scales: { y: { beginAtZero: true } } }
const campusStackedOpts = { responsive: true, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }

/* =========================
   generateProps (kept + tiles)
   ========================= */
function generateProps(type) {
    // metric tiles
    if (campusMetricTypes.includes(type)) {
        if (type === 'ElecIncoming') return { title: labelMap[type], value: elecIncomingDisplay.value }
        const overall = currentSubTab.value === campusTabs[0]
        const base = overall ? aggregatedCampus : buildingTypical
        let val = base[type]
        if (!overall) {
            const idx = Math.max(1, campusTabs.indexOf(currentSubTab.value))
            const factor = 0.85 + (idx % 6) * 0.04 + Math.random() * 0.08
            val = Math.round(val * factor)
        }
        return { title: labelMap[type], value: val }
    }

    // default chart fallback (for other sections)
    const labels = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })
    const data = Array.from({ length: 7 }, () => Math.floor(Math.random() * 300) + 50)
    const isPie = type.endsWith('Pie')
    return { title: type, chartData: { labels, datasets: [{ label: type, data, backgroundColor: isPie ? undefined : assignBarColors(labels) }] }, options: { responsive: true } }
}

/* =========================
   Download CSV (kept)
   ========================= */
function downloadCSV() {
    const header = ['Type', 'Label', 'Category', 'Metric/Chart', 'Value', 'Last7'].join(',')
    const all = [...campusMetricTypes, 'ElectricalIntakeBar', 'EnergySourceDistBar', 'CampusEUIBar', 'EnergyUsageDistPie']
    const rows = all.map(type => {
        const cat = campusMetricTypes.includes(type) ? 'Campus Metric' : 'Campus Chart'
        if (campusMetricTypes.includes(type)) return [type, labelMap[type] || type, cat, 'Metric', generateProps(type).value, ''].join(',')
        // simple export using daily totals for those charts
        let labels = [], data = []
        if (type === 'ElectricalIntakeBar') { labels = campusIntakeDaily.chartData.labels; data = campusIntakeDaily.chartData.datasets[0].data }
        else if (type === 'CampusEUIBar') { labels = campusEuiDaily.chartData.labels; data = campusEuiDaily.chartData.datasets[0].data }
        else if (type === 'EnergySourceDistBar') { labels = campusSourceStacked.chartData.labels; data = campusSourceStacked.chartData.datasets.map(ds => `${ds.label}:${ds.data.join('|')}`).join(';') }
        else { data = [] }
        return [type, labelMap[type] || type, cat, 'Chart', '', Array.isArray(data) ? data.join('|') : data].join(',')
    })
    const blob = new Blob([[header, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'energy_management_data.csv'
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
}
</script>

<style scoped>
/* (styles are the same as you posted; campus section uses existing classes) */
.power-management-container {
    padding: 20px;
    font-family: sans-serif;
    background-color: #0a1f44;
    min-height: 100vh;
    color: white
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px
}

.page-title {
    font-size: 24px;
    margin: 0;
    color: white
}

.breadcrumb span {
    font-size: 14px;
    color: white;
    margin: 0 4px
}

.tab-nav {
    display: flex;
    gap: 10px;
    margin-bottom: 16px
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
    transition: background .2s
}

.tab-nav button:hover {
    background: rgba(255, 255, 255, .2)
}

.tab-nav button.active {
    background: #1976d2;
    color: white
}

.sub-tab-nav {
    display: flex;
    gap: 10px;
    margin: 16px 0
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
    transition: background .2s
}

.sub-tab-nav button.active {
    background: #1976d2;
    color: white
}

.cards-grid {
    display: grid;
    gap: 10px;
    margin-bottom: 16px;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))
}

.card-wrapper {
    background: #1e2a47;
    color: white;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, .2)
}

.chiller-top-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 12px
}

.chiller-bottom-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 16px
}

.chiller-bottom-grid .chart-card {
    background: #1e2a47;
    color: white;
    border-radius: 8px;
    padding: 8px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, .2)
}

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
    font-size: .9rem
}

.download-button:hover {
    background: #125ea3
}

.note {
    margin-top: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, .8)
}

.overview .card-wrapper {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 12px;
    padding: 12px
}

.overview-header {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    align-items: start;
    margin-bottom: 12px
}

.badge {
    display: inline-block;
    background: rgba(34, 197, 94, .15);
    color: #86efac;
    font-size: .75rem;
    padding: 4px 8px;
    border-radius: 999px
}

.ov-title {
    margin: 6px 0 2px;
    font-size: 1.3rem
}

.ov-sub {
    color: #cbd5e1;
    margin: 0;
    font-size: .9rem
}

.ov-right {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center
}

.ov-chip {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, .08);
    padding: 8px 10px;
    border-radius: 10px;
    font-size: .85rem;
    display: flex;
    align-items: center;
    gap: 8px
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    display: inline-block
}

.dot.ok {
    background: #22c55e
}

.ov-kpis {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px
}

.ov-kpi {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 12px;
    padding: 12px
}

.ov-kpi-top {
    display: flex;
    align-items: center;
    gap: 10px
}

.ov-kpi-ico {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #fff
}

.ov-kpi-label {
    color: #cbd5e1;
    font-size: .85rem
}

.ov-kpi-val {
    font-size: 1.45rem;
    font-weight: 700;
    margin-top: 4px
}

.ov-kpi-val small {
    font-weight: 500;
    color: #cbd5e1;
    margin-left: 2px
}

.ov-kpi-sub {
    color: #cbd5e1;
    font-size: .8rem;
    margin-top: 2px
}

.ov-charts {
    display: grid;
    grid-template-columns: 2fr 1.3fr;
    gap: 10px;
    margin-bottom: 12px
}

.ov-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px
}

.ov-card-head h3 {
    margin: 0;
    font-size: 1rem
}

.actions .chip {
    font-size: .8rem;
    color: white;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .15);
    padding: 6px 10px;
    border-radius: 999px;
    cursor: pointer
}

.actions .chip.active {
    background: #1976d2;
    border-color: #1976d2
}

.legend {
    display: flex;
    gap: 12px;
    color: #cbd5e1;
    font-size: .85rem
}

.legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    display: inline-block;
    margin-right: 6px
}

.consumable-grid {
    margin-top: 10px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px
}

.consumable .label {
    color: #cbd5e1;
    font-size: .85rem;
    margin-bottom: 6px
}

.consumable .bar {
    height: 8px;
    background: #0f172a;
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, .06)
}

.consumable .fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #16a34a)
}

.consumable .pct {
    font-size: .8rem;
    color: #cbd5e1;
    margin-top: 4px
}

.ov-bottom {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 10px
}

.table-wrap {
    overflow: auto
}

table {
    width: 100%;
    border-collapse: collapse
}

th,
td {
    text-align: left;
    padding: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, .06)
}

th {
    color: #cbd5e1;
    font-weight: 600
}

.muted {
    color: #cbd5e1;
    opacity: .85
}

@media (max-width:1100px) {
    .ov-kpis {
        grid-template-columns: repeat(3, minmax(0, 1fr))
    }

    .ov-charts,
    .ov-bottom {
        grid-template-columns: 1fr
    }
}

@media (max-width:768px) {
    .power-management-container {
        padding: 10px
    }

    .tab-nav {
        flex-direction: column;
        gap: 8px
    }

    .sub-tab-nav {
        flex-wrap: wrap
    }

    .chiller-top-grid,
    .chiller-bottom-grid,
    .cards-grid {
        grid-template-columns: 1fr !important
    }
}

.quick-actions {
    background-color: var(--card-bg);
    color: var(--text-color);
    border-radius: 10px;
    padding: 15px;
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%
}

.quick-actions h3 {
    font-size: 1.1rem;
    margin-bottom: 10px
}

.quick-actions ul {
    padding-left: 18px;
    margin: 0;
    list-style-type: disc
}

.quick-actions ul li {
    margin-bottom: 6px;
    font-size: .9rem
}

.export-btn {
    background-color: #007bff;
    border: none;
    color: white;
    padding: 6px 12px;
    font-size: .9rem;
    border-radius: 5px;
    cursor: pointer;
    margin-top: 10px;
    align-self: flex-start
}

.export-btn i {
    margin-right: 6px
}

.note {
    font-size: .75rem;
    opacity: .8;
    margin-top: 6px
}

.energy-mix {
    display: grid;
    grid-template-rows: auto 240px 1fr
}

.energy-mix .consumable-grid {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    height: 100%;
    align-content: stretch;
    grid-auto-rows: 1fr
}

.energy-mix .consumable {
    display: flex;
    flex-direction: column;
    padding: 2px 0
}

.energy-mix .consumable .label {
    margin-bottom: 8px
}

.energy-mix .consumable .pct {
    margin-top: 8px;
    font-size: .8rem;
    color: #cbd5e1
}

.energy-mix .consumable .bar {
    height: 10px;
    background: #0f172a;
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, .06)
}

.energy-mix .consumable .fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #16a34a)
}
</style>
