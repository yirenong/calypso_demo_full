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
                <!-- Left: Line (Water Intake) -->
                <div class="card chart-card">
                    <div class="card-header">
                        <h3>Water Intake (m³) • {{ period }}</h3>
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
                        <LineChartCard :title="' '" :chartData="intakeLine.chartData" :options="intakeLine.options" />
                    </div>
                </div>

                <!-- Right: Donut + bars -->
                <div class="card chart-card">
                    <div class="card-header">
                        <h3>Water Source Levels</h3>
                        <div class="legend">
                            <span v-for="d in donutLegend" :key="d.label">
                                <i class="dot" :style="{ background: d.color }"></i>{{ d.label }}
                            </span>
                        </div>
                    </div>
                    <div class="chart-wrap">
                        <PieChartCard :title="' '" :chartData="waterEfficiencyPie.chartData"
                            :options="waterEfficiencyPie.options" />
                    </div>
                    <div class="consumable-grid">
                        <div class="consumable" v-for="c in topBlocks" :key="c.label">
                            <div class="label">{{ c.label }}</div>
                            <div class="bar">
                                <div class="fill" :style="{ width: c.level + '%' }"></div>
                            </div>
                            <div class="pct">{{ c.level }}%</div>
                        </div>
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

/* Tabs */
const currentTab = ref('overview')
const campusTabs = [
    'ITE CC & HQ', 'Block A Auditorium', 'Block A Admin', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F', 'Block G', 'Block H', 'Block J', 'Block K'
]
const currentSubTab = ref(campusTabs[0])
watch(currentTab, t => { if (t !== 'download') currentSubTab.value = campusTabs[0] })

/* Labels/Components (reused) */
const labelMap = {
    TSE: "PUB Water (Today) Incoming (m³)",
    EUI: "NEWater (Today) Incoming (m³)",
    FilterEnergy: "Filter Energy: Date Between",
    WaterCUM: "Campus Water (Today) Incoming (m³)",
    WEI: "Campus WUI (ℓ/person/day)",
    WaterEfficiency: 'PUB vs NEWater',
    AirsideEfficiency: 'Building Breakdown',
    TenantWaterMetersBar: 'Water by Building (m³)',
    WaterConsumptionByBlockBar: 'Block-wise Water (m³)',
    EnergyConsumptionByBlockBar: 'Block-wise Energy (kWh)',
    SolarGeneratedLine: 'Solar Generation (kWh)',
    TenantEnergyMetersBar: 'Energy by Building (kWh)'
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

/* KPI tiles (computed to match SmartToilet layout = 6 items) */
const lastUpdated = new Date().toLocaleString()
const period = ref('1D')
const setPeriod = p => period.value = p

/* Intake line data (1D/1W/1M) */
const intakeLine = computed(() => {
    const make = (labels, data) => ({
        chartData: {
            labels,
            datasets: [{
                label: 'Intake',
                data,
                borderWidth: 2,
                tension: 0.35,
                fill: true,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } }, // ⬅ more bottom room
            scales: {
                x: {
                    offset: true,                               // ⬅ adds space left/right of first/last tick
                    ticks: { color: '#cbd5e1', padding: 10 },   // ⬅ keep labels off the edge
                    grid: { color: 'rgba(255,255,255,.15)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#cbd5e1', padding: 6 },
                    grid: { color: 'rgba(255,255,255,.15)' }
                }
            },
            plugins: {
                legend: { position: 'top', labels: { color: '#cbd5e1' } },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });

    if (period.value === '1D')
        return make(['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
            [6, 5, 7, 6, 8, 6, 8, 7, 6]);
    if (period.value === '1W')
        return make(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [18, 21, 19, 23, 25, 16, 14]);
    return make(Array.from({ length: 12 }, (_, i) => `W${i + 1}`), [76, 82, 79, 86, 91, 87, 94, 96, 98, 92, 89, 91]);
});



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
    { label: 'Campus Water', value: (currentSubTab.value === campusTabs[0] ? aggregatedValues.WaterCUM : buildingValues.WaterCUM), unit: 'm³', sub: 'today', icon: 'fas fa-tint', bg: '#0ea5e9' },
    { label: 'PUB Intake', value: (currentSubTab.value === campusTabs[0] ? aggregatedValues.TSE : buildingValues.TSE), unit: 'm³', sub: 'today', icon: 'fas fa-faucet', bg: '#2563eb' },
    { label: 'NEWater', value: (currentSubTab.value === campusTabs[0] ? aggregatedValues.EUI : buildingValues.EUI), unit: 'm³', sub: 'today', icon: 'fas fa-water', bg: '#10b981' },
    { label: 'WUI', value: (currentSubTab.value === campusTabs[0] ? aggregatedValues.WEI : buildingValues.WEI), unit: 'ℓ/pax/day', sub: 'campus', icon: 'fas fa-users', bg: '#7c3aed' },
    { label: 'Avg Flow', value: avgFlowToday.value, unit: 'm³', sub: 'today', icon: 'fas fa-chart-line', bg: '#f59e0b' },
    { label: 'Open Alerts', value: openAlerts.value, unit: '', sub: 'diagnostics', icon: 'fas fa-exclamation-triangle', bg: '#ef4444' }
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
    height: 320px;
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
