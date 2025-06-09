<!-- src/views/PowerManagement.vue -->
<template>
    <div class="power-management-container">
        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!-- 1) PAGE HEADER -->
        <div class="page-header">
            <h2 class="page-title">Energy Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt;
                <span>Management</span> &gt;
                <span>Energy Management</span>
            </nav>
        </div>

        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!-- 2) TAB NAVIGATION -->
        <div class="tab-nav">
            <button :class="{ active: currentTab === 'chiller' }" @click="currentTab = 'chiller'">
                Chiller Plant Energy
            </button>
            <button :class="{ active: currentTab === 'campus' }" @click="currentTab = 'campus'">
                Campus Electrical Energy
            </button>
            <button :class="{ active: currentTab === 'download' }" @click="currentTab = 'download'">
                Download Data
            </button>
        </div>

        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!-- 3) CHILLER PLANT ENERGY TAB -->
        <div v-if="currentTab === 'chiller'" class="tab-content">
            <h2 class="tab-heading">Chiller Plant Energy</h2>

            <!-- ─── Top Row: Four Metric Cards ────────────────────────────────────────── -->
            <div class="chiller-top-grid">
                <div v-for="(type, idx) in chillerTopMetrics" :key="'chiller-top-' + idx"
                    class="card-wrapper value-card">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>

            <!-- ─── Middle Row: 2 Pies | 1 Mini‐Bar | 1 Stacked Bar ──────────────────── -->
            <div class="chiller-mid-grid">
                <!-- 1) Load Distribution (Pie) -->
                <div class="card-wrapper chart-card">
                    <component :is="componentMap['LoadDistPie']" v-bind="generateProps('LoadDistPie')" />
                </div>

                <!-- 2) Tenant Usage (Mini Bar) -->
                <div class="card-wrapper mini-bar-card">
                    <component :is="componentMap['TenantUsageMiniBar']" v-bind="generateProps('TenantUsageMiniBar')" />
                </div>

                <!-- 3) Electrical Intake (Stacked Bar) -->
                <div class="card-wrapper chart-card">
                    <component :is="componentMap['ElectricalIntakeBar']"
                        v-bind="generateProps('ElectricalIntakeBar')" />
                </div>

                <!-- 4) Air-side Energy (Pie) -->
                <div class="card-wrapper chart-card">
                    <component :is="componentMap['AirsideEnergyDistPie']"
                        v-bind="generateProps('AirsideEnergyDistPie')" />
                </div>
            </div>

            <!-- ─── Bottom Row: 4 Equal‐Width Chart Cards (no overflow) ──────────────── -->
            <div class="chiller-bottom-grid">
                <!-- 1) System RT Chart -->
                <div class="card-wrapper chart-card">
                    <component :is="componentMap['SystemRTGraph']" v-bind="generateProps('SystemRTGraph')" />
                </div>

                <!-- 2) System kW Chart -->
                <div class="card-wrapper chart-card">
                    <component :is="componentMap['SystemKWGraph']" v-bind="generateProps('SystemKWGraph')" />
                </div>

                <!-- 3) System kW/RT Chart -->
                <div class="card-wrapper chart-card">
                    <component :is="componentMap['SystemKWRTGraph']" v-bind="generateProps('SystemKWRTGraph')" />
                </div>

                <!-- 4) Heat Balance Chart -->
                <div class="card-wrapper chart-card">
                    <component :is="componentMap['HeatBalanceGraph']" v-bind="generateProps('HeatBalanceGraph')" />
                </div>
            </div>
        </div>

        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!-- 4) CAMPUS ELECTRICAL ENERGY TAB -->
        <div v-if="currentTab === 'campus'" class="tab-content">
            <h2 class="tab-heading">Campus Electrical Energy</h2>

            <!-- Metrics Row -->
            <div class="cards-grid">
                <div v-for="(type, idx) in campusMetricTypes" :key="'campus-metric-' + idx"
                    class="card-wrapper value-card">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>

            <!-- Charts Row -->
            <div class="cards-grid">
                <div v-for="(type, idx) in campusChartTypes" :key="'campus-chart-' + idx"
                    class="card-wrapper chart-card" :style="generateStyle(type)">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>
        </div>

        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!-- 5) DOWNLOAD DATA TAB -->
        <div v-if="currentTab === 'download'" class="tab-content">
            <h2 class="tab-heading">Download Full Dataset (CSV)</h2>
            <button class="download-button" @click="downloadCSV">
                <i class="fas fa-download"></i>
                <span>Download CSV</span>
            </button>
            <p class="note">
                The CSV contains one row per “type” (metric or chart), along with its
                latest value or last‐7‐days data.
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import BarChartCard from '../components/BarChartCard.vue'
import LineChartCard from '../components/LineChartCard.vue'
import PieChartCard from '../components/PieChartCard.vue'
import ValueCard from '../components/ValueCard.vue'

// 1) Types for “Chiller Plant Energy”
const chillerTypes = [
    'SystemRTMetric',
    'SystemKWMetric',
    'SystemKWRTMetric',
    'HeatBalanceMetric',
    'ChillerEfficiency',
    'ChillerCOP',
    'LoadDistPie',
    'TenantUsageMiniBar',
    'ElectricalIntakeBar',
    'AirsideEnergyDistPie',
    'SystemRTGraph',
    'SystemKWGraph',
    'SystemKWRTGraph',
    'HeatBalanceGraph'
]

const chillerTopMetrics = [
    'SystemRTMetric',
    'SystemKWMetric',
    'SystemKWRTMetric',
    'HeatBalanceMetric'
]

// 2) Types for “Campus Electrical Energy”
const campusMetricTypes = [
    'ElecIncoming',
    'ElecUsage',
    'TenantUsage',
    'Solar',
    'EVCharging',
    'CampusEUI',
    'CampusTSE'
]
const campusChartTypes = [
    'EnergySourceDistBar',
    'CampusEUIBar',
    'ElectricalIntakeBar',
    'EnergyUsageDistBar',
    'AirsideEnergyDistBar',
    'EnergySourceDistPie',
    'EnergyUsageDistPie'
]

// 3) Friendly labels
const labelMap = {
    // Chiller‐top metrics
    SystemRTMetric: '⚡ System RT Now (RT)',
    SystemKWMetric: '⚡ System kW Now (kW)',
    SystemKWRTMetric: '⚡ System kW/RT Now (kW/RT)',
    HeatBalanceMetric: '⚡ Heat Balance Now (BTU)',

    // Chiller “extra” small‐cards
    ChillerEfficiency: '🔧 Chiller Efficiency (%)',
    ChillerCOP: '🔧 Chiller COP',

    // Chiller middle‐row charts
    LoadDistPie: 'Load Distribution (Pie)',
    TenantUsageMiniBar: 'Tenant Usage (Mini Bar)',
    ElectricalIntakeBar: 'Electrical Intake (Stacked Bar)',
    AirsideEnergyDistPie: 'Air-side Energy Dist. (Pie)',

    // Chiller bottom‐row charts
    SystemRTGraph: 'System RT Chart (Last 7 Days)',
    SystemKWGraph: 'System kW Chart (Last 7 Days)',
    SystemKWRTGraph: 'System kW/RT Chart (Last 7 Days)',
    HeatBalanceGraph: 'Heat Balance Chart (Last 7 Days)',

    // Campus metrics
    ElecIncoming: "⚡ Today's Electrical Incoming (kWh)",
    ElecUsage: "⚡ Today's Electrical Usage (kWh)",
    TenantUsage: "⚡ Today's Tenant Electrical Usage (kWh)",
    Solar: "🔆 Today's Solar (kWh)",
    EVCharging: "🔋 Today's EV Charging (kWh)",
    CampusEUI: '⚡ Campus EUI (kWh/m²)',
    CampusTSE: '⚡ Campus TSE (kW/RT)',

    // Campus charts
    EnergySourceDistPie: 'Energy Source Dist. (Pie)',
    EnergySourceDistBar: 'Energy Source Trends (Bar)',
    CampusEUIBar: 'Campus EUI Trend (Bar)',
    ElectricalIntakeBar: 'Electrical Intake (Stacked Bar)',
    EnergyUsageDistPie: 'Energy Usage Dist. (Pie)',
    EnergyUsageDistBar: 'Energy Usage Trends (Bar)',
    AirsideEnergyDistBar: 'Air-side Energy Dist. (Bar)'
}

// 4) Map each “type” → component
const componentMap = {
    // Chiller metrics
    SystemRTMetric: ValueCard,
    SystemKWMetric: ValueCard,
    SystemKWRTMetric: ValueCard,
    HeatBalanceMetric: ValueCard,
    ChillerEfficiency: ValueCard,
    ChillerCOP: ValueCard,

    // Chiller middle‐row
    LoadDistPie: PieChartCard,
    TenantUsageMiniBar: BarChartCard,
    ElectricalIntakeBar: BarChartCard,
    AirsideEnergyDistPie: PieChartCard,

    // Chiller bottom‐row
    SystemRTGraph: LineChartCard,
    SystemKWGraph: LineChartCard,
    SystemKWRTGraph: LineChartCard,
    HeatBalanceGraph: LineChartCard,

    // Campus metrics
    ElecIncoming: ValueCard,
    ElecUsage: ValueCard,
    TenantUsage: ValueCard,
    Solar: ValueCard,
    EVCharging: ValueCard,
    CampusEUI: ValueCard,
    CampusTSE: ValueCard,

    // Campus charts
    EnergySourceDistPie: PieChartCard,
    EnergySourceDistBar: BarChartCard,
    CampusEUIBar: BarChartCard,
    ElectricalIntakeBar: BarChartCard,
    EnergyUsageDistPie: PieChartCard,
    EnergyUsageDistBar: BarChartCard,
    AirsideEnergyDistBar: BarChartCard
}

// 5) Helpers for random data / last‐7‐days labels
function last7Days() {
    const days = []
    for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        days.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
    }
    return days
}
const labels7 = last7Days()

function randomArray(len, max = 100) {
    return Array.from({ length: len }, () => Math.floor(Math.random() * max))
}

const chartOptions = { responsive: true, scales: { y: { beginAtZero: true } } }

// 6) Determine if a “type” is a ValueCard (metric) or a chart
function isMetric(type) {
    return [
        'SystemRTMetric',
        'SystemKWMetric',
        'SystemKWRTMetric',
        'HeatBalanceMetric',
        'ChillerEfficiency',
        'ChillerCOP',
        'ElecIncoming',
        'ElecUsage',
        'TenantUsage',
        'Solar',
        'EVCharging',
        'CampusEUI',
        'CampusTSE'
    ].includes(type)
}

// 7) Build props for each card on the fly
function generateProps(type) {
    if (isMetric(type)) {
        return {
            title: labelMap[type] || type,
            value: randomArray(1, 10000)[0]
        }
    } else {
        return {
            title: labelMap[type] || type,
            chartData: {
                labels: labels7,
                datasets: [
                    {
                        label: labelMap[type],
                        data: randomArray(7)
                    }
                ]
            },
            options: type.endsWith('Pie') ? { responsive: true } : chartOptions
        }
    }
}

// 8) Inline “style” (not used for bottom‐row charts)
function generateStyle(type) {
    return {}
}

// 9) Tab state & download logic
const currentTab = ref('chiller')

function downloadCSV() {
    const header = [
        'Type',
        'Friendly Label',
        'Category',
        'Metric/Chart',
        'Most Recent Value',
        'Last 7 Days Data (|-separated)'
    ].join(',')

    const allTypes = [...chillerTypes, ...campusMetricTypes, ...campusChartTypes]

    const rows = allTypes.map((type) => {
        let category = ''
        if (chillerTypes.includes(type)) category = 'Chiller Plant Energy'
        else if (
            campusMetricTypes.includes(type) ||
            campusChartTypes.includes(type)
        ) {
            category = 'Campus Electrical Energy'
        }

        if (isMetric(type)) {
            const val = randomArray(1, 10000)[0]
            return [type, `"${labelMap[type]}"`, category, 'Metric', val, ''].join(',')
        } else {
            const arr = randomArray(7).join('|')
            const chartType = type.endsWith('Pie') ? 'Pie Chart' : 'Line/Bar Chart'
            return [type, `"${labelMap[type]}"`, category, chartType, '', `"${arr}"`].join(
                ','
            )
        }
    })

    const csvContent = [header, ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', 'power_management_data.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
    /* very dark blue */
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
/* 3) CHILLER TOP ROW (4 columns)                                                 */
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
/* 4) CHILLER MID ROW (4 equal columns)                                           */
/* ───────────────────────────────────────────────────────────────────────────── */
.chiller-mid-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 12px;
}

.chart-card,
.mini-bar-card {
    background-color: #1e2a47;
    color: white;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    min-height: 140px;
}

.chart-card .card-title,
.mini-bar-card .card-title {
    margin: 0 0 8px;
    font-size: 1rem;
    text-align: center;
    color: white;
}

.chart-card canvas,
.mini-bar-card canvas {
    max-width: 90%;
    max-height: 70%;
    width: auto !important;
    height: auto !important;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 5) CHILLER BOTTOM ROW (4 equal columns, fixed height)                          */
/* ───────────────────────────────────────────────────────────────────────────── */
.chiller-bottom-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 16px;
}

/* Shrink each card to 180px total height and reduce padding */
.chiller-bottom-grid .chart-card {
    background-color: #1e2a47;
    color: white;
    border-radius: 8px;
    padding: 8px;
    /* reduced from 12px */
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    overflow: hidden;
    /* reduced from 200px */
}

/* Force the title to occupy about 30px, then give the chart the rest */
.chiller-bottom-grid .chart-card .card-title {
    margin: 0 0 6px;
    /* a bit less bottom margin */
    font-size: 1rem;
    text-align: center;
    color: white;
    flex: 0 0 auto;
    line-height: 1.2;
    /* force the title to about ~24px–30px tall */
    max-height: 30px;
}

/* Now clamp the canvas to whatever remains (about 150px or less) */
.chiller-bottom-grid .chart-card canvas {
    width: 100% !important;
    max-height: calc(100% - 30px) !important;
    /* leave space for title */
    height: auto !important;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 6) CAMPUS TAB: Shared cards‐grid styling                                       */
/* ───────────────────────────────────────────────────────────────────────────── */
.cards-grid {
    display: grid;
    gap: 10px;
    margin-bottom: 16px;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.cards-grid .value-card,
.cards-grid .chart-card {
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

.download-button i {
    font-size: 14px;
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
/* 8) RESPONSVIE ADJUSTMENTS                                                       */
/* ───────────────────────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
    .power-management-container {
        padding: 10px;
    }

    .tab-nav {
        flex-direction: column;
        gap: 8px;
    }

    /* Collapse chiller grids to single column on mobile */
    .chiller-top-grid,
    .chiller-mid-grid,
    .chiller-bottom-grid {
        grid-template-columns: 1fr !important;
    }

    /* Let bottom‐row cards grow in height */
    .chiller-bottom-grid .chart-card {
        height: auto !important;
    }

    .chiller-bottom-grid .chart-card canvas {
        max-height: 120px !important;
    }

    /* Collapse campus‐grid as well */
    .cards-grid {
        grid-template-columns: 1fr !important;
        gap: 8px;
    }
}
</style>
