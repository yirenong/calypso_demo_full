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
            <button :class="{ active: currentTab === 'chiller' }" @click="currentTab = 'chiller'">Chiller Plant
                Energy</button>
            <button :class="{ active: currentTab === 'campus' }" @click="currentTab = 'campus'">Campus Electrical
                Energy</button>
            <button :class="{ active: currentTab === 'download' }" @click="currentTab = 'download'">Download
                Data</button>
        </div>

        <!-- Secondary Tabs for Campus -->
        <div v-if="currentTab === 'campus'" class="sub-tab-nav">
            <button v-for="campus in campusTabs" :key="campus" :class="{ active: currentSubTab === campus }"
                @click="currentSubTab = campus">
                {{ campus }}
            </button>
        </div>

        <!-- Chiller Section -->
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

        <!-- Campus Section -->
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

        <!-- Download Section -->
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
import { ref, watch } from 'vue'
import BarChartCard from '../components/BarChartCard.vue'
import LineChartCard from '../components/LineChartCard.vue'
import PieChartCard from '../components/PieChartCard.vue'
import ValueCard from '../components/ValueCard.vue'

// State
const currentTab = ref('chiller')
const campusTabs = [
    'ITE CC & HQ', 'Block A Auditorium', 'Block A Admin',
    'Block B', 'Block C', 'Block D', 'Block E',
    'Block F', 'Block G', 'Block H', 'Block J', 'Block K'
]
const currentSubTab = ref(campusTabs[0])
watch(currentTab, tab => { if (tab === 'campus') currentSubTab.value = campusTabs[0] })

// Metrics & Charts
const chillerTopMetrics = ['SystemRTMetric', 'SystemKWMetric', 'SystemKWRTMetric', 'HeatBalanceMetric']
const chillerChartTypes = ['SystemRTGraph', 'SystemKWGraph', 'SystemKWRTGraph', 'HeatBalanceGraph']
const campusMetricTypes = ['ElecIncoming', 'ElecUsage', 'TenantUsage', 'Solar', 'EVCharging', 'CampusEUI', 'CampusTSE']
const campusChartTypes = ['EnergySourceDistBar', 'CampusEUIBar', 'ElectricalIntakeBar', 'EnergyUsageDistBar', 'AirsideEnergyDistBar', 'EnergySourceDistPie', 'EnergyUsageDistPie']

// Labels & Components
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

// Data & Options
const aggregatedValues = { SystemRTMetric: 120, SystemKWMetric: 300, SystemKWRTMetric: 2.5, HeatBalanceMetric: 1500 }
const buildingValues = { SystemRTMetric: 30, SystemKWMetric: 100, SystemKWRTMetric: 2.8, HeatBalanceMetric: 400 }
const chartOptions = { responsive: true, scales: { y: { beginAtZero: true } } }
const pieOptions = { responsive: true, plugins: { legend: { display: false } } }

// Color Palette
const barColorPalette = ['#1976d2', '#388e3c', '#f57c00', '#c2185b', '#7b1fa2', '#0097a7', '#d32f2f', '#ffa000', '#689f38', '#0288d1', '#512da8']
function assignBarColors(labels) { return labels.map((_, i) => barColorPalette[i % barColorPalette.length]) }

// Helpers
function last7Days() { return Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }) }
function randomArray(len, max = 500) { return Array.from({ length: len }, () => Math.floor(Math.random() * max + 50)) }

// Props Generator
function generateProps(type) {
    const isPie = type.endsWith('Pie')

    // Campus chart override
    if (currentTab.value === 'campus' && campusChartTypes.includes(type)) {
        const labels = currentSubTab.value === campusTabs[0]
            ? campusTabs.slice(1)
            : last7Days()
        const data = currentSubTab.value === campusTabs[0]
            ? labels.map(() => Math.floor(Math.random() * 500 + 200))
            : randomArray(7, 300)
        return {
            title: labelMap[type],
            chartData: { labels, datasets: [{ label: labelMap[type], data, backgroundColor: assignBarColors(labels) }] },
            options: isPie ? pieOptions : chartOptions
        }
    }

    // Metric cards
    if (chillerTopMetrics.includes(type)) {
        return { title: labelMap[type], value: aggregatedValues[type] }
    }
    if (campusMetricTypes.includes(type)) {
        return { title: labelMap[type], value: Math.floor(Math.random() * 10000 + 1000) }
    }

    // Fallback chart
    const labels = last7Days()
    const data = randomArray(7, 300)
    return { title: labelMap[type], chartData: { labels, datasets: [{ label: labelMap[type], data, backgroundColor: isPie ? undefined : assignBarColors(labels) }] }, options: isPie ? pieOptions : chartOptions }
}

// Download CSV
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
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'energy_management_data.csv'; document.body.appendChild(link); link.click(); document.body.removeChild(link)
}
</script>

<style scoped>
/* ───────────────────────────────────────────────────────────────────────────── */
/* 1) CONTAINER & TYPOGRAPHY                                                      */
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
/* 2) TAB NAVIGATION                                                              */
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
    font-size: 0.9rem;
    transition: background 0.2s;
}

.tab-nav button:hover {
    background: rgba(255, 255, 255, 0.2);
}

.tab-nav button.active {
    background: #1976d2;
    color: white;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 3) SECONDARY TAB NAV                                                           */
/* ───────────────────────────────────────────────────────────────────────────── */
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
    font-size: 0.9rem;
    transition: background 0.2s;
}

.sub-tab-nav button.active {
    background: #1976d2;
    color: white;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 4) CHILLER TOP ROW (4 columns)                                                 */
/* ───────────────────────────────────────────────────────────────────────────── */
.chiller-top-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 12px;
}

.value-card {
    background-color: #1e2a47;
    color: white;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
    text-align: center;
}

.value-card .title {
    font-size: 1rem;
    margin-bottom: 8px;
    color: white;
}

.value-card .value {
    font-size: 2rem;
    font-weight: bold;
    color: white;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 5) CHILLER BOTTOM ROW (4 equal columns)                                        */
/* ───────────────────────────────────────────────────────────────────────────── */
.chiller-bottom-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 16px;
}

.chiller-bottom-grid .chart-card {
    background-color: #1e2a47;
    color: white;
    border-radius: 8px;
    padding: 8px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    overflow: hidden;
}

.chiller-bottom-grid .chart-card .card-title {
    margin: 0 0 6px;
    font-size: 1rem;
    text-align: center;
    color: white;
    flex: 0 0 auto;
    line-height: 1.2;
    max-height: 30px;
}

.chiller-bottom-grid .chart-card canvas {
    width: 100% !important;
    max-height: calc(100% - 30px) !important;
    height: auto !important;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 6) CAMPUS CARDS GRID                                                           */
/* ───────────────────────────────────────────────────────────────────────────── */
.cards-grid {
    display: grid;
    gap: 10px;
    margin-bottom: 16px;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.cards-grid .card-wrapper {
    background-color: #1e2a47;
    color: white;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 7) DOWNLOAD BUTTON                                                             */
/* ───────────────────────────────────────────────────────────────────────────── */
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
    font-size: 0.9rem;
    transition: background 0.2s;
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
/* 8) RESPONSIVE                                                                 */
/* ───────────────────────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
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

    .chiller-bottom-grid .chart-card canvas {
        max-height: 120px !important;
    }
}
</style>
