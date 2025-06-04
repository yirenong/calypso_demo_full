<template>
    <div class="water-management-container">
        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!--  A) PAGE HEADER  -->
        <div class="page-header">
            <h2 class="page-title">Water Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt;
                <span>Management</span> &gt;
                <span>Water Management</span>
            </nav>
        </div>

        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!--  B) TAB NAVIGATION  -->
        <div class="tab-nav">
            <button :class="{ active: currentTab === 'usage' }" @click="currentTab = 'usage'">
                Campus Water Usage
            </button>
            <button :class="{ active: currentTab === 'sustain' }" @click="currentTab = 'sustain'">
                Sustainability Indicators
            </button>
            <button :class="{ active: currentTab === 'stats' }" @click="currentTab = 'stats'">
                Statistical Analysis
            </button>
            <button :class="{ active: currentTab === 'download' }" @click="currentTab = 'download'">
                Download Data
            </button>
        </div>

        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!--  1) CAMPUS WATER USAGE TAB  -->
        <div v-if="currentTab === 'usage'" class="tab-content">
            <h2 class="tab-heading">Campus Water Usage</h2>

            <!-- ───────────────────────── TOP ROW: 5 METRIC CARDS ───────────────────── -->
            <div class="usage-top-grid">
                <div v-for="(type, idx) in topMetrics" :key="'top-metric-' + idx" class="card-wrapper value-card">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>

            <!-- NEW: “pie, chart, chart, pie” (4 equal columns) -->
            <div class="usage-mid-grid">
                <!-- 1) Left‐most pie: “Water Efficiency” -->
                <div class="card-wrapper gauge-card">
                    <component :is="componentMap['WaterEfficiency']" v-bind="generateProps('WaterEfficiency')" />
                </div>

                <!-- 2) Middle‐left chart: “Tenant Water Meters” -->
                <div class="card-wrapper chart-card">
                    <component :is="componentMap['TenantWaterMetersBar']"
                        v-bind="generateProps('TenantWaterMetersBar')" />
                </div>

                <!-- 3) Middle‐right chart: “Water Consumption by Block” -->
                <div class="card-wrapper chart-card">
                    <component :is="componentMap['WaterConsumptionByBlockBar']"
                        v-bind="generateProps('WaterConsumptionByBlockBar')" />
                </div>

                <!-- 4) Right‐most pie: “Airside Efficiency” -->
                <div class="card-wrapper gauge-card">
                    <component :is="componentMap['AirsideEfficiency']" v-bind="generateProps('AirsideEfficiency')" />
                </div>
            </div>


            <!-- ───────────────────────── BOTTOM ROW: WIDE BAR | STACKED | WIDE BAR ───────────────────────── -->
            <div class="usage-bottom-grid">
                <!-- 1) “Energy Consumption by Block” spans 2 columns -->
                <div class="card-wrapper chart-card span-2">
                    <component :is="componentMap['EnergyConsumptionByBlockBar']"
                        v-bind="generateProps('EnergyConsumptionByBlockBar')" />
                </div>

                <!-- 2) Stacked: “Solar generated” above “Tenant Energy Meters” (1 column) -->
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

                <!-- 3) “Water Consumption by Block” spans 2 columns -->
                <div class="card-wrapper chart-card span-2">
                    <component :is="componentMap['WaterConsumptionByBlockBar']"
                        v-bind="generateProps('WaterConsumptionByBlockBar')" />
                </div>
            </div>
        </div>

        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!--  2) SUSTAINABILITY INDICATORS TAB  -->
        <div v-if="currentTab === 'sustain'" class="tab-content">
            <h2 class="tab-heading">Sustainability Indicators</h2>
            <div class="cards-grid">
                <div v-for="(tbl, idx) in sustainTables" :key="'sustain-table-' + idx" class="card-wrapper chart-card">
                    <TableCard :title="tbl.title" :columns="tbl.columns" :rows="tbl.rows" />
                </div>
            </div>
        </div>

        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!--  3) STATISTICAL ANALYSIS TAB  -->
        <div v-if="currentTab === 'stats'" class="tab-content">
            <h2 class="tab-heading">Statistical Analysis</h2>
            <div class="cards-grid">
                <div v-for="(tbl, idx) in statsTables" :key="'stats-table-' + idx" class="card-wrapper chart-card">
                    <TableCard :title="tbl.title" :columns="tbl.columns" :rows="tbl.rows" />
                </div>
            </div>
        </div>

        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!--  4) DOWNLOAD DATA TAB  -->
        <div v-if="currentTab === 'download'" class="tab-content">
            <h2 class="tab-heading">Download Full Dataset (CSV)</h2>
            <button class="download-button" @click="downloadCSV">
                <i class="fas fa-download"></i>
                <span>Download CSV</span>
            </button>
            <p class="note">
                The CSV contains one row per “type” (metric, chart, or table), along with its latest
                value, last‐7‐days data, or table contents as JSON.
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import BarChartCard from '../components/BarChartCard.vue'
import LineChartCard from '../components/LineChartCard.vue'
import PieChartCard from '../components/PieChartCard.vue'
import ValueCard from '../components/ValueCard.vue'
import TableCard from '../components/TableCard.vue'
import DateSliderCard from '../components/DateSliderCard.vue'

// ───────────────────────────────────────────────────────────────────────────────
// 1) “Campus Water Usage” original types (for CSV logic, etc.)
// ───────────────────────────────────────────────────────────────────────────────
const waterMetricTypes = [
    'PubIncoming',
    'NeWaterIncoming',
    'CampusUsage',
    'CampusWUI'
]
const waterPieCharts = ['WaterSourceDistPie', 'WaterUsageDistPie']
const waterBarCharts = [
    'WaterSourceDistBar',
    'CampusWUIBar',
    'WaterIntakeBar',
    'WaterConsumptionTrendBar'
]

// ───────────────────────────────────────────────────────────────────────────────
// 2) NEW arrays for the redesigned “Usage” tab
// ───────────────────────────────────────────────────────────────────────────────
// Top‐row metric keys:
const topMetrics = [
    'TSE',           // e.g. “TSE (kW/RT)”
    'EUI',           // e.g. “EUI (kWh/m²/yr)”
    'FilterEnergy',  // Date slider for energy
    'WaterCUM',      // e.g. “Water (Cu.M)”
    'WEI'            // e.g. “WEI (litres/person/day)”
]

// Middle‐row gauge keys:
const gaugeCards = [
    'WaterEfficiency',   // “Water Efficiency (kW/RT)”
    'AirsideEfficiency'  // “Airside Efficiency (kW/RT)”
]

// Bottom‐row chart keys:
const usageBottomCharts = [
    'EnergyConsumptionByBlockBar',
    'SolarGeneratedLine',
    'TenantEnergyMetersBar',
    'WaterConsumptionByBlockBar'
]

// ───────────────────────────────────────────────────────────────────────────────
// 3) “Sustainability Indicators” tables
// ───────────────────────────────────────────────────────────────────────────────
const sustainTables = [
    {
        title: 'Sustainability Indicators – Carbon Footprint & Emissions',
        columns: ['Item', 'Value'],
        rows: [
            { Item: 'Scope 1 CO₂', Value: '1,200 t' },
            { Item: 'Scope 2 CO₂', Value: '3,400 t' }
        ]
    }
]

// ───────────────────────────────────────────────────────────────────────────────
// 4) “Statistical Analysis” tables
// ───────────────────────────────────────────────────────────────────────────────
const statsTables = [
    {
        title: 'Statistical Analysis – Alerts from CCTV Video Analytics',
        columns: ['Item', 'Value', 'Warning'],
        rows: [
            { Item: 'Motion Alerts', Value: '12' , Warning : 'Yes'},
            { Item: 'Object Alerts', Value: '5' , Warning: 'No'}
        ]
    },
    {
        title: 'Statistical Analysis – Diagnostic Report & Analysis',
        columns: ['Item', 'Value'],
        rows: [
            { Item: 'Report A Status', Value: 'OK' },
            { Item: 'Report B Status', Value: 'Warning' }
        ]
    }
]

// ───────────────────────────────────────────────────────────────────────────────
// 5) Friendly labels for all “type” strings
// ───────────────────────────────────────────────────────────────────────────────
const labelMap = {
    // Original Usage:
    PubIncoming: "Today's PUB Water Incoming (m³)",
    NeWaterIncoming: "Today's NEWater Incoming (m³)",
    CampusUsage: "Today's Campus Water Usage (m³)",
    CampusWUI: 'Campus WUI (m³/population)',
    WaterSourceDistPie: 'Water Source Distribution (Pie)',
    WaterUsageDistPie: 'Water Usage Distribution (Pie)',
    WaterSourceDistBar: 'Water Source Trends (Bar)',
    CampusWUIBar: 'Campus WUI Trend (Bar)',
    WaterIntakeBar: 'Water Intake Sources (Stacked Bar)',
    WaterConsumptionTrendBar: 'Water Consumption Trend (Bar)',

    // New Top‐Row Metrics:
    TSE: 'TSE (kW/RT)',
    EUI: 'EUI (kWh/m²/yr)',
    FilterEnergy: 'Filter Energy: Date Between',
    WaterCUM: 'Water (Cu.M)',
    WEI: 'WEI (litres/person/day)',

    // New Middle‐Row Gauges:
    WaterEfficiency: 'Water Efficiency (kW/RT)',
    AirsideEfficiency: 'Airside Efficiency (kW/RT)',

    // (If you ever need the actual gauge‐pie label, e.g. “Water Efficiency”)
    // For demonstration, we treat gauge charts as PieChartCard with random data.

    // New Middle‐Row Pie:
    EnergyByProportionPie: 'Energy by Proportion',
    WaterByProportionPie: 'Water by Proportion',

    // New Middle‐Row Bar:
    TenantWaterMetersBar: 'Tenant Water Meters',

    // New Bottom‐Row Bars/Lines:
    EnergyConsumptionByBlockBar: 'Energy Consumption by Block',
    SolarGeneratedLine: 'Solar generated (kWh)',
    TenantEnergyMetersBar: 'Tenant Energy Meters',
    WaterConsumptionByBlockBar: 'Water Consumption by Block'
}

// ───────────────────────────────────────────────────────────────────────────────
// 6) Map each “type” → its Vue component
// ───────────────────────────────────────────────────────────────────────────────
const componentMap = {
    // Original Usage:
    PubIncoming: ValueCard,
    NeWaterIncoming: ValueCard,
    CampusUsage: ValueCard,
    CampusWUI: ValueCard,
    WaterSourceDistPie: PieChartCard,
    WaterUsageDistPie: PieChartCard,
    WaterSourceDistBar: BarChartCard,
    CampusWUIBar: BarChartCard,
    WaterIntakeBar: BarChartCard,
    WaterConsumptionTrendBar: BarChartCard,

    // Top‐Row metrics:
    TSE: ValueCard,
    EUI: ValueCard,
    FilterEnergy: DateSliderCard,
    WaterCUM: ValueCard,
    WEI: ValueCard,

    // Middle‐Row Gauges (rendered as pie charts for demo):
    WaterEfficiency: PieChartCard,
    AirsideEfficiency: PieChartCard,

    // Middle‐Row Pie (if you ever need to show a separate “Energy by Proportion” below):
    EnergyByProportionPie: PieChartCard,
    WaterByProportionPie: PieChartCard,

    // Middle‐Row Bar:
    TenantWaterMetersBar: BarChartCard,

    // Bottom‐Row:
    EnergyConsumptionByBlockBar: BarChartCard,
    SolarGeneratedLine: LineChartCard,
    TenantEnergyMetersBar: BarChartCard,
    WaterConsumptionByBlockBar: BarChartCard
}

// ───────────────────────────────────────────────────────────────────────────────
// 7) Helpers for random data & last-7-days labels (demo only)
// ───────────────────────────────────────────────────────────────────────────────
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

const chartOptions = {
    responsive: true,
    scales: { y: { beginAtZero: true } }
}

// ───────────────────────────────────────────────────────────────────────────────
// 8) Determine if a “type” is a ValueCard (metric) vs. a chart
//    **Now includes the new top-row keys so they show a numeric value**
// ───────────────────────────────────────────────────────────────────────────────
function isMetric(type) {
    return [
        'PubIncoming',
        'NeWaterIncoming',
        'CampusUsage',
        'CampusWUI',
        'TSE',
        'EUI',
        'WaterCUM',
        'WEI'
    ].includes(type)
}

// ───────────────────────────────────────────────────────────────────────────────
// 9) Build props on the fly for each card
//    - If isMetric(type), return { title, value }
//    - Else (any chart), return { title, chartData, options }
// ───────────────────────────────────────────────────────────────────────────────
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

// ───────────────────────────────────────────────────────────────────────────────
// 10) Tab state
// ───────────────────────────────────────────────────────────────────────────────
const currentTab = ref('usage')

// ───────────────────────────────────────────────────────────────────────────────
// 11) Download CSV logic (unchanged from earlier)
// ───────────────────────────────────────────────────────────────────────────────
function downloadCSV() {
    const header = [
        'Type',
        'Friendly Label',
        'Category',
        'Metric/Chart/Table',
        'Most Recent Value',
        'Last 7 Days Data (|-separated)',
        'Table Contents (JSON)'
    ].join(',')

    const allTypes = [
        ...waterMetricTypes,
        ...waterPieCharts,
        ...waterBarCharts,
        ...sustainTables.map((_, i) => `SustainTable${i}`),
        ...statsTables.map((_, i) => `StatsTable${i}`)
    ]

    const rows = allTypes.map((type) => {
        let category = ''
        if (
            waterMetricTypes.includes(type) ||
            waterPieCharts.includes(type) ||
            waterBarCharts.includes(type)
        ) {
            category = 'Campus Water Usage'
        } else if (type.startsWith('SustainTable')) {
            category = 'Sustainability Indicators'
        } else if (type.startsWith('StatsTable')) {
            category = 'Statistical Analysis'
        }

        // Original four metrics (PubIncoming, etc.)
        if (waterMetricTypes.includes(type)) {
            const val = randomArray(1, 10000)[0]
            return [
                type,
                `"${labelMap[type]}"`,
                category,
                'Metric',
                val,
                '',
                ''
            ].join(',')
        }
        // Original pie/bar charts
        else if (waterPieCharts.includes(type) || waterBarCharts.includes(type)) {
            const arr = randomArray(7).join('|')
            const chartType = type.endsWith('Pie') ? 'Pie Chart' : 'Bar Chart'
            return [
                type,
                `"${labelMap[type]}"`,
                category,
                chartType,
                '',
                `"${arr}"`,
                ''
            ].join(',')
        }
        // Sustainability table
        else if (type.startsWith('SustainTable')) {
            const idx = parseInt(type.replace('SustainTable', ''), 10)
            const tbl = sustainTables[idx]
            const tableJSON = JSON.stringify(tbl.rows)
            return [
                type,
                `"${tbl.title}"`,
                category,
                'Table',
                '',
                '',
                `"${tableJSON}"`
            ].join(',')
        }
        // Stats table
        else if (type.startsWith('StatsTable')) {
            const idx = parseInt(type.replace('StatsTable', ''), 10)
            const tbl = statsTables[idx]
            const tableJSON = JSON.stringify(tbl.rows)
            return [
                type,
                `"${tbl.title}"`,
                category,
                'Table',
                '',
                '',
                `"${tableJSON}"`
            ].join(',')
        }
        return ''
    })

    const csvContent = [header, ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', 'water_management_data.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

// ───────────────────────────────────────────────────────────────────────────────
// 12) Persist cards ordering (drag/drop stub, unchanged)
// ───────────────────────────────────────────────────────────────────────────────
const cards = ref([])

onMounted(() => {
    const raw = localStorage.getItem('water-mgmt-cards')
    if (raw) {
        try {
            const saved = JSON.parse(raw)
            if (Array.isArray(saved)) cards.value = saved
        } catch { }
    }
    nextTick(() => { })
})

watch(
    () => cards.value,
    (newVal) => {
        localStorage.setItem('water-mgmt-cards', JSON.stringify(newVal))
    },
    { deep: true }
)

// ───────────────────────────────────────────────────────────────────────────────
// 13) Handler for date slider updates (optional API refetch)
// ───────────────────────────────────────────────────────────────────────────────
function onDateRangeChanged({ start, end }) {
    console.log('Date range selected:', start, '→', end)
    // Example: fetchData({ startDate: start, endDate: end })
}
</script>

<style scoped>
/* ───────────────────────────────────────────────────────────────────────────── */
/* 1) GLOBAL PAGE BACKGROUND & TYPOGRAPHY                                                   */
/* ───────────────────────────────────────────────────────────────────────────── */
.water-management-container {
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
    /* slightly smaller */
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
/* 2) TAB NAVIGATION                                                                  */
/* ───────────────────────────────────────────────────────────────────────────── */
.tab-nav {
    display: flex;
    gap: 10px;
    /* smaller gap */
    margin-bottom: 16px;
    /* smaller margin */
}

.tab-nav button {
    padding: 6px 12px;
    /* smaller button */
    border: none;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    font-weight: bold;
    color: white;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 0.9rem;
}

.tab-nav button:hover {
    background: rgba(255, 255, 255, 0.2);
}

.tab-nav button.active {
    background: #1976d2;
    /* accent blue */
    color: white;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 3) TAB CONTENT HEADINGS                                                             */
/* ───────────────────────────────────────────────────────────────────────────── */
.tab-content h2 {
    margin-top: 0;
    margin-bottom: 12px;
    /* smaller */
    color: white;
    font-size: 1.4rem;
    /* slightly smaller */
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 4) SHARED GRID FOR TABLES (SUSTAIN & STATS)                           */
/* ───────────────────────────────────────────────────────────────────────────── */
.cards-grid {
    display: grid;
    gap: 10px;
    /* smaller gap */
    margin-bottom: 16px;
    /* smaller margin */
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 5) CARD WRAPPER STYLES                                                              */
/* ───────────────────────────────────────────────────────────────────────────── */
.card-wrapper {
    background-color: #1e2a47;
    /* dark navy */
    color: white;
    border-radius: 8px;
    padding: 12px;
    /* smaller padding */
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-wrapper:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

/* Force Chart.js canvases to use white text/axes */
.card-wrapper canvas {
    color: white !important;
}

/* Ensure ValueCard’s title & value remain legible */
.card-wrapper.value-card .value,
.card-wrapper.value-card .title {
    color: white !important;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 6) USAGE TAB: TOP ROW (5 equal columns)                                                 */
/* ───────────────────────────────────────────────────────────────────────────── */
.usage-top-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    /* smaller */
    margin-bottom: 16px;
    /* smaller */
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 7) USAGE TAB: MIDDLE ROW (4 columns, capped height, no vertical stretching) */
/* ───────────────────────────────────────────────────────────────────────────── */
.usage-mid-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    /* exactly 4 equal‐width columns */
    gap: 6px;
    /* horizontal gap between cards */
    margin-bottom: 12px;
    /* space below this row */
    align-items: stretch;
    /* force all 4 cards to share the same row‐height */
}

/* Cap every mid-row card’s height so the row never exceeds 260px */
.usage-mid-grid .card-wrapper {
    display: flex;
    flex-direction: column;
    /* Since align-items: stretch is on the grid, each card will be exactly the same height */
}

/* Force any .span-2 item to occupy 2 of the 4 columns */
.usage-mid-grid .span-2 {
    grid-column: span 1;
}

/* Ensure the contents of each mid-row card stay at the top */
.usage-mid-grid .card-wrapper>* {
    flex-shrink: 0;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 8) USAGE TAB: BOTTOM ROW (5 columns, with two wide spans)                              */
/* ───────────────────────────────────────────────────────────────────────────── */
.usage-bottom-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    /* smaller */
    margin-bottom: 16px;
    /* smaller */
}

.usage-bottom-grid .span-2 {
    grid-column: span 2;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 9) STACKED CHART CONTAINER                                                             */
/* ───────────────────────────────────────────────────────────────────────────── */
.stacked-card-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    /* smaller gap */
}

.small-chart {
    flex: 1 1 auto;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 10) DOWNLOAD BUTTON                                                                       */
/* ───────────────────────────────────────────────────────────────────────────── */
.download-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    /* smaller gap */
    padding: 8px 16px;
    /* smaller padding */
    background: #1976d2;
    /* accent blue */
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 0.9rem;
}

.download-button i {
    font-size: 14px;
    /* smaller */
}

.download-button:hover {
    background: #125ea3;
    /* darker */
}

.note {
    margin-top: 8px;
    /* smaller */
    font-size: 13px;
    /* slightly smaller */
    color: rgba(255, 255, 255, 0.8);
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 11) RESPONSIVE ADJUSTMENTS                                                             */
/* ───────────────────────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
    .water-management-container {
        padding: 10px;
    }

    .tab-nav {
        flex-direction: column;
        gap: 8px;
        /* smaller on mobile */
    }

    /* Collapse usage grids to single-column on narrow screens */
    .usage-top-grid,
    .usage-mid-grid,
    .usage-bottom-grid {
        grid-template-columns: 1fr !important;
    }

    .usage-mid-grid .span-2,
    .usage-bottom-grid .span-2 {
        grid-column: span 1 !important;
    }

    .cards-grid {
        grid-template-columns: 1fr !important;
        gap: 8px;
        /* smaller on mobile */
    }
}
</style>
