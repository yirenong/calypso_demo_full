<template>
    <div class="water-management-container">
        <!-- A) PAGE HEADER -->
        <div class="page-header">
            <h2 class="page-title">Water Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt;
                <span>Management</span> &gt;
                <span>Water Management</span>
            </nav>
        </div>

        <!-- B) PRIMARY TAB NAV -->
        <div class="tab-nav">
            <button :class="{ active: currentTab === 'usage' }" @click="currentTab = 'usage'">Campus Water
                Usage</button>
            <button :class="{ active: currentTab === 'sustain' }" @click="currentTab = 'sustain'">Sustainability
                Indicators</button>
            <button :class="{ active: currentTab === 'stats' }" @click="currentTab = 'stats'">Statistical
                Analysis</button>
            <button :class="{ active: currentTab === 'download' }" @click="currentTab = 'download'">Download
                Data</button>
        </div>

        <!-- C) SECONDARY TAB NAV -->
        <div v-if="currentTab !== 'download'" class="sub-tab-nav">
            <button v-for="campus in campusTabs" :key="campus" :class="{ active: currentSubTab === campus }"
                @click="currentSubTab = campus">
                {{ campus }}
            </button>
        </div>

        <!-- D) USAGE TAB -->
        <div v-if="currentTab === 'usage'" class="tab-content">
            <h2 class="tab-heading">{{ currentSubTab }} Water Usage</h2>

            <!-- 1) TOP ROW -->
            <div class="usage-top-grid">
                <div v-for="type in topMetrics" :key="type" class="card-wrapper value-card">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>

            <!-- 2) MID ROW -->
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

            <!-- 3) BOTTOM ROW -->
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

        <!-- SUSTAIN -->
        <div v-if="currentTab === 'sustain'" class="tab-content">
            <h2 class="tab-heading">{{ currentSubTab }} Sustainability Indicators</h2>
            <div class="cards-grid">
                <div v-for="(tbl, i) in sustainTables" :key="i" class="card-wrapper chart-card">
                    <TableCard :title="tbl.title" :columns="tbl.columns" :rows="tbl.rows" />
                </div>
            </div>
        </div>

        <!-- STATS -->
        <div v-if="currentTab === 'stats'" class="tab-content">
            <h2 class="tab-heading">{{ currentSubTab }} Statistical Analysis</h2>
            <div class="cards-grid">
                <div v-for="(tbl, i) in statsTables" :key="i" class="card-wrapper chart-card">
                    <TableCard :title="tbl.title" :columns="tbl.columns" :rows="tbl.rows" />
                </div>
            </div>
        </div>

        <!-- DOWNLOAD -->
        <div v-if="currentTab === 'download'" class="tab-content">
            <h2 class="tab-heading">Download Full Dataset (CSV)</h2>
            <button class="download-button" @click="downloadCSV">
                <i class="fas fa-download"></i> Download CSV
            </button>
            <p class="note">
                CSV includes one row per metric/chart/table, with recent values or JSON.
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import BarChartCard from '../components/BarChartCard.vue'
import LineChartCard from '../components/LineChartCard.vue'
import PieChartCard from '../components/PieChartCard.vue'
import ValueCard from '../components/ValueCard.vue'
import TableCard from '../components/TableCard.vue'
import DateSliderCard from '../components/DateSliderCard.vue'

// 1) Tab state
const currentTab = ref('usage')
const campusTabs = [
    'ITE CC & HQ',
    'Block A Auditorium', 'Block A Admin', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F', 'Block G', 'Block H', 'Block J', 'Block K'
]
const currentSubTab = ref(campusTabs[0])
watch(currentTab, t => { if (t !== 'download') currentSubTab.value = campusTabs[0] })

// 2) Metrics & tables
const topMetrics = ['TSE', 'EUI', 'FilterEnergy', 'WaterCUM', 'WEI']
const sustainTables = [
    {
        title: 'Sustainability Indicators – Detailed Breakdown', columns: ['Indicator', 'Current Value', 'Target', 'Unit', 'Change %'], rows: [
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
        title: 'Statistical Analysis – CCTV Analytics Metrics', columns: ['Metric', 'Value', 'Threshold', 'Alert', 'Last Updated'], rows: [
            { Metric: 'Motion Alerts', Value: '12', Threshold: '10', Alert: 'Yes', 'Last Updated': '2025-06-10' },
            { Metric: 'Object Alerts', Value: '5', Threshold: '8', Alert: 'No', 'Last Updated': '2025-06-10' },
            { Metric: 'Person Detections', Value: '3', Threshold: '2', Alert: 'Yes', 'Last Updated': '2025-06-10' },
            { Metric: 'Loitering Alerts', Value: '7', Threshold: '5', Alert: 'Yes', 'Last Updated': '2025-06-10' },
            { Metric: 'False Positives', Value: '4', Threshold: '6', Alert: 'No', 'Last Updated': '2025-06-10' }
        ]
    },
    {
        title: 'Statistical Analysis – System Diagnostics', columns: ['Report', 'Status', 'Last Run', 'Duration', 'Errors'], rows: [
            { Report: 'Report A', Status: 'OK', 'Last Run': '2025-06-11', Duration: '2m', Errors: '0' },
            { Report: 'Report B', Status: 'Warning', 'Last Run': '2025-06-11', Duration: '3m', Errors: '1' },
            { Report: 'Report C', Status: 'OK', 'Last Run': '2025-06-11', Duration: '1m', Errors: '0' },
            { Report: 'Report D', Status: 'Error', 'Last Run': '2025-06-11', Duration: '4m', Errors: '3' },
            { Report: 'Report E', Status: 'OK', 'Last Run': '2025-06-11', Duration: '2m', Errors: '0' }
        ]
    }
]

// 3) Labels & components
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

// 4) Data & options
const aggregatedValues = { TSE: 38400, EUI: 33600, WaterCUM: 72000, WEI: 120 }
const buildingValues = { TSE: 3200, EUI: 2800, WaterCUM: 6000, WEI: 120 }
const chartOptions = {
    responsive: true,
    scales: {
        x: { ticks: { color: 'white' } },
        y: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.2)' } }
    }
}
const pieOptions = { responsive: true, plugins: { legend: { display: false } } }

// 5) Bar color palette
const barColorPalette = ['#1976d2', '#388e3c', '#f57c00', '#c2185b', '#7b1fa2', '#0097a7', '#d32f2f', '#ffa000', '#689f38', '#0288d1', '#512da8']
function assignBarColors(labels) { return labels.map((_, i) => barColorPalette[i % barColorPalette.length]) }

// 6) Helpers
function last7Days() { return Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }) }
function randomArray(len, max = 500) { return Array.from({ length: len }, () => Math.floor(Math.random() * max + 50)) }
const labels7 = last7Days()

// 7) Props generator
function generateProps(type) {
    const isPie = ['WaterEfficiency', 'AirsideEfficiency'].includes(type)
    if (type === 'FilterEnergy') {
        return { title: labelMap[type], start: '2025-06-01', end: '2025-06-19', onChange: ({ start, end }) => { } }
    }
    // HQ breakdown
    if (currentSubTab.value === campusTabs[0] && !['TSE', 'EUI', 'WaterCUM', 'WEI', 'FilterEnergy'].includes(type)) {
        const labels = campusTabs.slice(1)
        const data = labels.map(() => Math.floor(Math.random() * 500 + 200))
        return { title: labelMap[type], chartData: { labels, datasets: [{ label: labelMap[type], data, backgroundColor: assignBarColors(labels) }] }, options: isPie ? pieOptions : chartOptions }
    }
    // metrics
    if (['TSE', 'EUI', 'WaterCUM', 'WEI'].includes(type)) {
        const src = currentSubTab.value === campusTabs[0] ? aggregatedValues : buildingValues
        return { title: labelMap[type], value: src[type] }
    }
    // bar charts per-block or trend
    const barKeys = ['TenantWaterMetersBar', 'WaterConsumptionByBlockBar', 'EnergyConsumptionByBlockBar', 'TenantEnergyMetersBar']
    if (barKeys.includes(type)) {
        const labels = currentSubTab.value === campusTabs[0] ? campusTabs.slice(1) : labels7
        const data = currentSubTab.value === campusTabs[0] ? labels.map(() => Math.floor(Math.random() * 500 + 200)) : randomArray(7)
        return { title: labelMap[type], chartData: { labels, datasets: [{ label: labelMap[type], data, backgroundColor: assignBarColors(labels) }] }, options: chartOptions }
    }
    // fallback pie/line
    const data = labels7.map(() => 0)
    return { title: labelMap[type], chartData: { labels: labels7, datasets: [{ label: labelMap[type], data: randomArray(7), backgroundColor: isPie ? undefined : assignBarColors(labels7) }] }, options: isPie ? pieOptions : chartOptions }
}

// 8) Download CSV
function downloadCSV() {
    const header = ['Type', 'Label', 'Category', 'Metric/Chart/Table', 'Most Recent Value', 'Last 7 Days Data', 'Table JSON'].join(',')
    const all = [...topMetrics, 'WaterEfficiency', 'AirsideEfficiency', 'TenantWaterMetersBar', 'WaterConsumptionByBlockBar', 'EnergyConsumptionByBlockBar', 'SolarGeneratedLine', 'TenantEnergyMetersBar']
    const rows = all.map(type => {
        if (['TSE', 'EUI', 'WaterCUM', 'WEI', 'FilterEnergy'].includes(type)) {
            return [type, `"${labelMap[type]}"`, 'Usage', 'Metric', generateProps(type).value, '', ''].join(',')
        }
        const arr = generateProps(type).chartData.datasets[0].data.join('|')
        return [type, `"${labelMap[type]}"`, 'Usage', 'Chart', '', arr, ''].join(',')
    })
    const blob = new Blob([header, ...rows].join('\r\n'), { type: 'text/csv' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'water_management_data.csv'; document.body.appendChild(link); link.click(); document.body.removeChild(link)
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

.tab-nav button.active,
.sub-tab-nav button.active {
    background: #1976d2;
    color: white;
}

/* ensure .sub-tab-nav matches .tab-nav styling */
.sub-tab-nav {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
}

.sub-tab-nav button {
    padding: 6px 12px;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    font-weight: bold;
    color: white;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 0.9rem;
}

.sub-tab-nav button:hover {
    background: rgba(255, 255, 255, 0.2);
}

.sub-tab-nav {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
}

/* Draw a divider after the “Overall” button */
.sub-tab-nav button:first-child {
    padding-right: 16px;
    border-right: 1px solid rgba(255, 255, 255, 0.3);
    margin-right: 8px;
}

/* Active states */
.tab-nav button.active,
.sub-tab-nav button.active {
    background: #1976d2;
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
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
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
