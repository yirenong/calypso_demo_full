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

        <!-- Secondary Tabs -->
        <div v-if="currentTab !== 'download'" class="sub-tab-nav">
            <button v-for="campus in campusTabs" :key="campus" :class="{ active: currentSubTab === campus }"
                @click="currentSubTab = campus">
                {{ campus }}
            </button>
        </div>

        <!-- ========================= -->
        <!-- OVERVIEW (uses your data) -->
        <!-- ========================= -->
        <section v-if="currentTab === 'overview'" class="tab-content overview">
            <!-- Header / Meta -->
            <div class="overview-header">
                <div class="ov-left">
                    <span class="badge">Energy Overview</span>
                    <h1 class="ov-title">Overview — {{ overviewBuilding }}</h1>
                    <p class="ov-sub">Live campus power, solar, usage & efficiency summary</p>
                </div>
                <div class="ov-right">
                    <div class="ov-chip">
                        <span class="dot ok"></span> Normal
                    </div>
                    <div class="ov-chip">
                        Updated: <strong>{{ lastUpdated }}</strong>
                    </div>
                </div>
            </div>

            <!-- KPI row (from your campus metrics) -->
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

            <!-- Middle charts -->
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

            <!-- Bottom: latest metrics + quick action -->
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
                        <button class="export-btn">
                            <i class="fa fa-download"></i> Export CSV
                        </button>
                        <p class="note">Includes KPIs and last-7-day trends.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- ========================= -->
        <!-- Chiller Section          -->
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
        <!-- Campus Section           -->
        <!-- ========================= -->
        <div v-if="currentTab === 'campus'" class="sub-tab-nav">
            <button v-for="campus in campusTabs" :key="campus" :class="{ active: currentSubTab === campus }"
                @click="currentSubTab = campus">
                {{ campus }}
            </button>
        </div>

        <section v-if="currentTab === 'campus'" class="tab-content">
            <h2>Campus Electrical Energy — {{ currentSubTab }}</h2>
            <div class="cards-grid">
                <div v-for="type in campusMetricTypes" :key="type" class="card-wrapper value-card">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>
            <div class="cards-grid">
                <div v-for="type in campusChartTypes" :key="type" class="card-wrapper chart-card">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>
        </section>

        <!-- ========================= -->
        <!-- Download Section         -->
        <!-- ========================= -->
        <section v-if="currentTab === 'download'" class="tab-content">
            <h2>Download Full Dataset (CSV)</h2>
            <button class="download-button" @click="downloadCSV">
                <i class="fas fa-download"></i> Download CSV
            </button>
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

/* ==============
   Tabs / Campus
   ============== */
const currentTab = ref('overview') // start on Overview
const campusTabs = [
    'ITE CC & HQ', 'Block A Auditorium', 'Block A Admin',
    'Block B', 'Block C', 'Block D', 'Block E',
    'Block F', 'Block G', 'Block H', 'Block J', 'Block K'
]
const currentSubTab = ref(campusTabs[0])
watch(currentTab, tab => { if (tab === 'campus') currentSubTab.value = campusTabs[0] })

/* ==============
   Helpers
   ============== */
const lastUpdated = new Date().toLocaleString()
const overviewBuilding = computed(() => currentSubTab.value)

function last7Days() {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - 6 + i)
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    })
}
function randomArray(len, max = 500) {
    return Array.from({ length: len }, () => Math.floor(Math.random() * max + 50))
}

/* =========================
   Energy datasets you had
   ========================= */
const chillerTopMetrics = ['SystemRTMetric', 'SystemKWMetric', 'SystemKWRTMetric', 'HeatBalanceMetric']
const chillerChartTypes = ['SystemRTGraph', 'SystemKWGraph', 'SystemKWRTGraph', 'HeatBalanceGraph']
const campusMetricTypes = ['ElecIncoming', 'ElecUsage', 'TenantUsage', 'Solar', 'EVCharging', 'CampusEUI', 'CampusTSE']
const campusChartTypes = ['EnergySourceDistBar', 'CampusEUIBar', 'ElectricalIntakeBar', 'EnergyUsageDistBar', 'AirsideEnergyDistBar', 'EnergySourceDistPie', 'EnergyUsageDistPie']

const labelMap = {
    SystemRTMetric: '⚡ System RT Now (RT)',
    SystemKWMetric: '⚡ System kW Now (kW)',
    SystemKWRTMetric: '⚡ System kW/RT Now (kW/RT)',
    HeatBalanceMetric: '⚡ Heat Balance Now (BTU)',
    SystemRTGraph: 'System RT Chart (Last 7 Days)',
    SystemKWGraph: 'System kW Chart (Last 7 Days)',
    SystemKWRTGraph: 'System kW/RT Chart (Last 7 Days)',
    HeatBalanceGraph: 'Heat Balance Chart (Last 7 Days)',
    ElecIncoming: "⚡ Today's Electrical Incoming (kWh)",
    ElecUsage: "⚡ Today's Electrical Usage (kWh)",
    TenantUsage: "⚡ Today's Tenant Electrical Usage (kWh)",
    Solar: '🔆 Today\'s Solar (kWh)',
    EVCharging: '🔋 Today\'s EV Charging (kWh)',
    CampusEUI: '⚡ Campus EUI (kWh/m²)',
    CampusTSE: '⚡ Campus TSE (kW/RT)',
    EnergySourceDistBar: 'Energy Source Trends (Bar)',
    EnergySourceDistPie: 'Energy Source Dist. (Pie)',
    CampusEUIBar: 'Campus EUI Trend (Bar)',
    ElectricalIntakeBar: 'Electrical Intake (Stacked Bar)',
    EnergyUsageDistBar: 'Energy Usage Trends (Bar)',
    EnergyUsageDistPie: 'Energy Usage Dist. (Pie)',
    AirsideEnergyDistBar: 'Air-side Energy Dist. (Bar)'
}
const componentMap = {
    SystemRTMetric: ValueCard,
    SystemKWMetric: ValueCard,
    SystemKWRTMetric: ValueCard,
    HeatBalanceMetric: ValueCard,
    SystemRTGraph: LineChartCard,
    SystemKWGraph: LineChartCard,
    SystemKWRTGraph: LineChartCard,
    HeatBalanceGraph: LineChartCard,
    ElecIncoming: ValueCard,
    ElecUsage: ValueCard,
    TenantUsage: ValueCard,
    Solar: ValueCard,
    EVCharging: ValueCard,
    CampusEUI: ValueCard,
    CampusTSE: ValueCard,
    EnergySourceDistBar: BarChartCard,
    EnergySourceDistPie: PieChartCard,
    CampusEUIBar: BarChartCard,
    ElectricalIntakeBar: BarChartCard,
    EnergyUsageDistBar: BarChartCard,
    EnergyUsageDistPie: PieChartCard,
    AirsideEnergyDistBar: BarChartCard
}

const aggregatedValues = { SystemRTMetric: 120, SystemKWMetric: 300, SystemKWRTMetric: 2.5, HeatBalanceMetric: 1500 }
const chartOptions = { responsive: true, scales: { y: { beginAtZero: true } } }
const pieOptions = { responsive: true, plugins: { legend: { display: false } } }
const barColorPalette = ['#1976d2', '#388e3c', '#f57c00', '#c2185b', '#7b1fa2', '#0097a7', '#d32f2f', '#ffa000', '#689f38', '#0288d1', '#512da8']
function assignBarColors(labels) { return labels.map((_, i) => barColorPalette[i % barColorPalette.length]) }

function generateProps(type) {
    const isPie = type.endsWith('Pie')

    // Top chiller metrics (leave as-is)
    if (chillerTopMetrics.includes(type)) {
        return { title: labelMap[type], value: aggregatedValues[type] }
    }

    // Campus metric tiles -> depend on selected sub-tab
    if (campusMetricTypes.includes(type)) {
        const overall = currentSubTab.value === campusTabs[0]
        const base = overall ? aggregatedCampus : buildingTypical
        let val = base[type]

        // Slight per-building variation so each tab feels unique
        if (!overall) {
            const idx = Math.max(1, campusTabs.indexOf(currentSubTab.value))
            const factor = 0.85 + (idx % 6) * 0.04 + Math.random() * 0.08 // ~0.85–1.17
            val = Math.round(val * factor)
        }

        return { title: labelMap[type], value: val }
    }

    // (unchanged) default chart fallback
    const labels = last7Days()
    const data = randomArray(7, 300)
    return {
        title: labelMap[type],
        chartData: {
            labels,
            datasets: [{ label: labelMap[type], data, backgroundColor: isPie ? undefined : assignBarColors(labels) }]
        },
        options: isPie ? pieOptions : chartOptions
    }
}


/* =========================
   OVERVIEW: build from your metrics
   ========================= */
const overviewKpis = computed(() => {
    // Pull values via your generator for consistency
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

/* Electrical Intake Trend (Overview) */
const flowPeriod = ref('1D')
const flowPeriodLabel = computed(() => flowPeriod.value === '1D' ? 'Today' : flowPeriod.value === '1W' ? 'This Week' : 'This Month')
const intakeChartData = computed(() => {
    const map = {
        '1D': { labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'], data: randomArray(9, 20).map(v => v * 100) },
        '1W': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: randomArray(7, 80).map(v => v * 100) },
        '1M': { labels: Array.from({ length: 12 }, (_, i) => `W${i + 1}`), data: randomArray(12, 120).map(v => v * 100) }
    }
    const { labels, data } = map[flowPeriod.value]
    return { labels, datasets: [{ label: 'Intake (kWh)', data, tension: 0.35, fill: true }] }
})
const flowChartOpts = { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: true } } }

/* Energy Source Mix (Overview) */
const donutLegend = [
    { label: 'Solar', color: '#f59e0b' },
    { label: 'Grid', color: '#2563eb' },
    { label: 'Generator', color: '#ef4444' }
]
const sourceDonutData = computed(() => {
    // Derive a believable mix (solar shares ~10–40%, generator small)
    const solar = Math.floor(10 + Math.random() * 30)
    const gen = Math.floor(2 + Math.random() * 8)
    const grid = Math.max(0, 100 - solar - gen)
    return { labels: ['Solar', 'Grid', 'Generator'], datasets: [{ data: [solar, grid, gen] }] }
})

/* Usage breakdown bars (Overview) */
const usageBreakdown = computed(() => {
    // HVAC largest share; rest split
    const hvac = 40 + Math.floor(Math.random() * 20)   // 40–60
    const light = 10 + Math.floor(Math.random() * 20)  // 10–30
    const plug = 10 + Math.floor(Math.random() * 20)   // 10–30
    let other = 100 - hvac - light - plug
    if (other < 0) other = 5
    return [
        { label: 'HVAC', level: hvac },
        { label: 'Lighting', level: light },
        { label: 'Plug Loads', level: plug },
        { label: 'Other', level: other }
    ]
})

/* Table rows from your KPIs */
const latestRows = computed(() => [
    { label: 'Today’s Electrical Incoming', value: `${generateProps('ElecIncoming').value} kWh`, note: 'Utility intake' },
    { label: 'Today’s Electrical Usage', value: `${generateProps('ElecUsage').value} kWh`, note: 'Campus total' },
    { label: 'Tenant Electrical Usage', value: `${generateProps('TenantUsage').value} kWh`, note: 'Sub-metered' },
    { label: 'Today’s Solar', value: `${generateProps('Solar').value} kWh`, note: 'PV contribution' },
    { label: 'Campus EUI', value: `${generateProps('CampusEUI').value} kWh/m²`, note: 'Energy per area' },
    { label: 'Campus TSE', value: `${generateProps('CampusTSE').value} kW/RT`, note: 'Chiller efficiency' }
])

// Baselines for "Overall" vs a single building
const aggregatedCampus = {
    ElecIncoming: 24000,   // kWh
    ElecUsage: 20000,   // kWh
    TenantUsage: 12000,   // kWh
    Solar: 3200,   // kWh
    EVCharging: 450,   // kWh
    CampusEUI: 150,   // kWh/m²
    CampusTSE: 1.8    // kW/RT
};

const buildingTypical = {
    ElecIncoming: 2200,
    ElecUsage: 1800,
    TenantUsage: 1000,
    Solar: 260,
    EVCharging: 35,
    CampusEUI: 135,
    CampusTSE: 1.95
};


/* Download CSV (yours, unchanged) */
function downloadCSV() {
    const header = ['Type', 'Label', 'Category', 'Metric/Chart', 'Value', 'Last7'].join(',')
    const all = [...chillerTopMetrics, ...chillerChartTypes, ...campusMetricTypes, ...campusChartTypes]
    const rows = all.map(type => {
        const cat = chillerTopMetrics.includes(type) || chillerChartTypes.includes(type) ? 'Chiller' : 'Campus'
        if (chillerTopMetrics.includes(type) || campusMetricTypes.includes(type)) return [type, labelMap[type], cat, 'Metric', generateProps(type).value, ''].join(',')
        const arr = generateProps(type).chartData.datasets[0].data.join('|')
        return [type, labelMap[type], cat, 'Chart', '', arr].join(',')
    })
    const blob = new Blob([[header, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'energy_management_data.csv'
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
}
</script>

<style scoped>
/* ───────────────────────────────────────────────────────────────────────────── */
/* Container & Typography */
/* ───────────────────────────────────────────────────────────────────────────── */
.power-management-container {
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

/* ───────────────────────────────────────────────────────────────────────────── */
/* Primary Tabs */
/* ───────────────────────────────────────────────────────────────────────────── */
.tab-nav {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
}

.tab-nav button {
    padding: 6px 12px;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    font-weight: bold;
    color: white;
    cursor: pointer;
    font-size: .9rem;
    transition: background .2s;
}

.tab-nav button:hover {
    background: rgba(255, 255, 255, 0.2);
}

.tab-nav button.active {
    background: #1976d2;
    color: white;
}

/* Sub Tabs (Campus) */
.sub-tab-nav {
    display: flex;
    gap: 10px;
    margin: 16px 0;
}

.sub-tab-nav button {
    padding: 6px 12px;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    font-weight: bold;
    color: white;
    cursor: pointer;
    font-size: .9rem;
    transition: background .2s;
}

.sub-tab-nav button.active {
    background: #1976d2;
    color: white;
}

/* Cards/Grids */
.cards-grid {
    display: grid;
    gap: 10px;
    margin-bottom: 16px;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.card-wrapper {
    background: #1e2a47;
    color: white;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
}

/* Chiller grids */
.chiller-top-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 12px;
}

.chiller-bottom-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 16px;
}

.chiller-bottom-grid .chart-card {
    background: #1e2a47;
    color: white;
    border-radius: 8px;
    padding: 8px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
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
    color: rgba(255, 255, 255, 0.8);
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* OVERVIEW Styles */
/* ───────────────────────────────────────────────────────────────────────────── */
.overview .card-wrapper {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 12px;
}

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
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 8px 10px;
    border-radius: 10px;
    font-size: .85rem;
    display: flex;
    align-items: center;
    gap: 8px;
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

.ov-kpis {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px;
}

.ov-kpi {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, 0.08);
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

.ov-charts {
    display: grid;
    grid-template-columns: 2fr 1.3fr;
    gap: 10px;
    margin-bottom: 12px;
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

.legend {
    display: flex;
    gap: 12px;
    color: #cbd5e1;
    font-size: .85rem;
}

.legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    display: inline-block;
    margin-right: 6px;
}

.consumable-grid {
    margin-top: 10px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.consumable .label {
    color: #cbd5e1;
    font-size: .85rem;
    margin-bottom: 6px;
}

.consumable .bar {
    height: 8px;
    background: #0f172a;
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.06);
}

.consumable .fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #16a34a);
}

.consumable .pct {
    font-size: .8rem;
    color: #cbd5e1;
    margin-top: 4px;
}

.ov-bottom {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 10px;
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

th {
    color: #cbd5e1;
    font-weight: 600;
}

.muted {
    color: #cbd5e1;
    opacity: .85;
}

/* Responsive */
@media (max-width:1100px) {
    .ov-kpis {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .ov-charts,
    .ov-bottom {
        grid-template-columns: 1fr;
    }
}

@media (max-width:768px) {
    .power-management-container {
        padding: 10px;
    }

    .tab-nav {
        flex-direction: column;
        gap: 8px;
    }

    .sub-tab-nav {
        flex-wrap: wrap;
    }

    .chiller-top-grid,
    .chiller-bottom-grid,
    .cards-grid {
        grid-template-columns: 1fr !important;
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
    height: 100%;
}

.quick-actions h3 {
    font-size: 1.1rem;
    margin-bottom: 10px;
}

.quick-actions ul {
    padding-left: 18px;
    margin: 0;
    list-style-type: disc;
}

.quick-actions ul li {
    margin-bottom: 6px;
    font-size: 0.9rem;
}

.export-btn {
    background-color: #007bff;
    border: none;
    color: white;
    padding: 6px 12px;
    font-size: 0.9rem;
    border-radius: 5px;
    cursor: pointer;
    margin-top: 10px;
    align-self: flex-start;
}

.export-btn i {
    margin-right: 6px;
}

.note {
    font-size: 0.75rem;
    opacity: 0.8;
    margin-top: 6px;
}

/* Make the Energy Source Mix card a 3-row grid:
   header (auto), pie chart (fixed), breakdown (fills the rest) */
.energy-mix {
    display: grid;
    grid-template-rows: auto 240px 1fr;
    /* adjust 240px if you want a taller/shorter pie */
}

/* Let the breakdown take all remaining height and distribute items evenly */
.energy-mix .consumable-grid {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    /* two columns */
    gap: 12px;
    height: 100%;
    /* fill the '1fr' row */
    align-content: stretch;
    /* stretch rows to fill */
    grid-auto-rows: 1fr;
    /* each item gets equal height */
}

/* Structure each item so the bits stack nicely */
.energy-mix .consumable {
    display: flex;
    flex-direction: column;
    padding: 2px 0;
    /* tiny breathing space inside each cell */
}

/* Keep label at the top, pct at the bottom */
.energy-mix .consumable .label {
    margin-bottom: 8px;
}

.energy-mix .consumable .pct {
    margin-top: 8px;
    font-size: .8rem;
    color: #cbd5e1;
}

/* Progress bar remains compact but full-width */
.energy-mix .consumable .bar {
    height: 10px;
    background: #0f172a;
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.06);
}

.energy-mix .consumable .fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #16a34a);
}
</style>
