<!-- src/views/BuildingManagement.vue -->
<template>
    <div class="building-management-container">
        <div class="page-header">
            <h2 class="page-title">Power Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt;
                <span>Management</span> &gt;
                <span>Power Management</span>
            </nav>
        </div>
        <!-- Tab Navigation -->
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

        <!-- Chiller Plant Energy Tab -->
        <div v-if="currentTab === 'chiller'" class="tab-content">
            <h2>Chiller Plant Energy</h2>
            <div class="cards-grid">
                <div v-for="(type, idx) in chillerTypes" :key="idx" class="card-wrapper"
                    :class="{ 'value-card': isMetric(type) }" :style="generateStyle(type)">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>
        </div>

        <!-- Campus Electrical Energy Tab -->
        <div v-if="currentTab === 'campus'" class="tab-content">
            <h2>Campus Electrical Energy</h2>

            <!-- Metrics Row -->
            <div class="cards-grid">
                <div v-for="(type, idx) in campusMetricTypes" :key="idx" class="card-wrapper value-card">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>

            <!-- Charts Row -->
            <div class="cards-grid">
                <div v-for="(type, idx) in campusChartTypes" :key="idx" class="card-wrapper chart-card"
                    :style="generateStyle(type)">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>
        </div>

        <!-- Download Data Tab -->
        <div v-if="currentTab === 'download'" class="tab-content">
            <h2>Download Full Dataset (CSV)</h2>
            <button class="download-button" @click="downloadCSV">
                <i class="fas fa-download"></i>
                <span>Download CSV</span>
            </button>
            <p class="note">
                This CSV will contain one row per “type” (metric or chart), along
                with its latest value or last‐7‐days data.
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

// 1) Define all “types” and groupings exactly as before
const chillerTypes = [
    'SystemRTMetric',
    'SystemKWMetric',
    'SystemKWRTMetric',
    'HeatBalanceMetric',
    'SystemRTGraph',
    'SystemKWGraph',
    'SystemKWRTGraph',
    'HeatBalanceGraph'
]

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
    'EnergyUsageDistPie',
]

// 2) Friendly labels
const labelMap = {
    SystemRTGraph: 'System RT Chart',
    SystemRTMetric: 'System RT Now',
    SystemKWGraph: 'System kW Chart',
    SystemKWMetric: 'System kW Now',
    SystemKWRTGraph: 'System kW/RT Chart',
    SystemKWRTMetric: 'System kW/RT Now',
    HeatBalanceGraph: 'Heat Balance Chart',
    HeatBalanceMetric: 'Heat Balance Now',
    ElecIncoming: "Today's Electrical Incoming (kWh)",
    ElecUsage: "Today's Electrical Usage (kWh)",
    TenantUsage: "Today's Tenant Electrical Usage (kWh)",
    Solar: "Today's Solar (kWh)",
    EVCharging: "Today's EV Charging (kWh)",
    CampusEUI: 'Campus EUI (kWh/m²)',
    CampusTSE: 'Campus TSE (kW/RT)',
    EnergySourceDistPie: 'Energy Source Distribution (Pie)',
    EnergySourceDistBar: 'Energy Source Trends (Bar)',
    CampusEUIBar: 'Campus EUI Trend (Bar)',
    ElectricalIntakeBar: 'Electrical Intake Sources (Stacked Bar)',
    EnergyUsageDistPie: 'Energy Usage Distribution (Pie)',
    EnergyUsageDistBar: 'Energy Usage Trends (Bar)',
    AirsideEnergyDistBar: 'Air-side Energy Distribution (Bar)'
}

// 3) componentMap
const componentMap = {
    SystemRTGraph: LineChartCard,
    SystemRTMetric: ValueCard,
    SystemKWGraph: LineChartCard,
    SystemKWMetric: ValueCard,
    SystemKWRTGraph: LineChartCard,
    SystemKWRTMetric: ValueCard,
    HeatBalanceGraph: LineChartCard,
    HeatBalanceMetric: ValueCard,
    ElecIncoming: ValueCard,
    ElecUsage: ValueCard,
    TenantUsage: ValueCard,
    Solar: ValueCard,
    EVCharging: ValueCard,
    CampusEUI: ValueCard,
    CampusTSE: ValueCard,
    EnergySourceDistPie: PieChartCard,
    EnergySourceDistBar: BarChartCard,
    CampusEUIBar: BarChartCard,
    ElectricalIntakeBar: BarChartCard,
    EnergyUsageDistPie: PieChartCard,
    EnergyUsageDistBar: BarChartCard,
    AirsideEnergyDistBar: BarChartCard
}

// 4) Helpers for random data
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

// 5) Detect “metric” (ValueCard) vs “chart” (span multiple columns)
function isMetric(type) {
    return [
        'SystemRTMetric',
        'SystemKWMetric',
        'SystemKWRTMetric',
        'HeatBalanceMetric',
        'ElecIncoming',
        'ElecUsage',
        'TenantUsage',
        'Solar',
        'EVCharging',
        'CampusEUI',
        'CampusTSE'
    ].includes(type)
}

// 6) Build props on‐the‐fly
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
                datasets: [{ label: labelMap[type], data: randomArray(7) }]
            },
            options: type.endsWith('Pie') ? { responsive: true } : chartOptions
        }
    }
}

// 7) Compute inline “gridColumn” style for wide charts
function generateStyle(type) {
    if (!isMetric(type)) {
        // span 3 columns now (instead of 2) to be bigger
        return { gridColumn: 'span 2' }
    }
    return {} // metrics remain 1‐column
}

// 8) Tab state & download logic
const currentTab = ref('chiller')

function downloadCSV() {
    const header = [
        'Type',
        'Friendly Label',
        'Category',
        'Metric/Chart',
        'Most Recent Value',
        'Last 7 Days Data (|‐separated)'
    ].join(',')

    const allTypes = [
        ...chillerTypes,
        ...campusMetricTypes,
        ...campusChartTypes
    ]

    const rows = allTypes.map((type) => {
        const category = chillerTypes.includes(type)
            ? 'Chiller Plant Energy'
            : campusMetricTypes.includes(type) || campusChartTypes.includes(type)
                ? 'Campus Electrical Energy'
                : ''

        if (isMetric(type)) {
            const val = randomArray(1, 10000)[0]
            return [
                type,
                `"${labelMap[type]}"`,
                category,
                'Metric',
                val,
                ''
            ].join(',')
        } else {
            const arr = randomArray(7).join('|')
            return [
                type,
                `"${labelMap[type]}"`,
                category,
                type.endsWith('Pie') ? 'Pie Chart' : 'Bar/Line Chart',
                '',
                `"${arr}"`
            ].join(',')
        }
    })

    const csvContent = [header, ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', 'building_management_data.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
</script>

<style scoped>
.building-management-container {
    padding: 20px;
    font-family: sans-serif;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px
}

.page-title {
    font-size: 24px;
    margin: 0;
    color: var(--main-text-color)
}

.breadcrumb span {
    font-size: 14px;
    color: var(--main-text-color);
    margin: 0 4px
}

/* Tab Navigation */
.tab-nav {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
}

.tab-nav button {
    padding: 8px 16px;
    border: none;
    background: #f1f5f9;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.2s;
}

.tab-nav button:hover {
    background: #e2e8f0;
}

.tab-nav button.active {
    background: #ff9800;
    color: white;
}

/* Tab Content */
.tab-content h2 {
    margin-top: 0;
    margin-bottom: 16px;
    color: var(--main-text-color);
}

/* Grid of Cards (now min‐width 300px) */
.cards-grid {
    display: grid;
    gap: 20px;
    margin-bottom: 24px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

/* Card Base Styles */
.card-wrapper {
    position: relative;
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-wrapper:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

/* Metric/Value Cards constrained to one column width */
.card-wrapper.value-card {
    max-width: 100%;
    /* slightly larger if you want */
}

/* Drag Handle */
.card-handle {
    position: absolute;
    top: 8px;
    left: 8px;
    font-size: 1.2rem;
    cursor: grab;
    z-index: 10;
}

.card-handle:active {
    cursor: grabbing;
}

/* Edit/Delete Buttons */
.card-top-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 8px;
    z-index: 10;
}

.card-top-actions button {
    background: none;
    border: none;
    color: var(--main-text-color);
    font-size: 16px;
    cursor: pointer;
    transition: color 0.2s;
}

.card-top-actions button:hover {
    color: var(--header-icon-hover-color);
}

/* Download Tab */
.download-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--header-icon-hover-color);
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
}

.download-button i {
    font-size: 16px;
}

.download-button:hover {
    background: var(--header-icon-color);
}

.note {
    margin-top: 12px;
    font-size: 14px;
    color: var(--main-text-color);
}

/* Responsive */
@media (max-width: 768px) {
    .building-management-container {
        padding: 10px;
    }

    .tab-nav {
        flex-direction: column;
        gap: 12px;
    }

    .cards-grid {
        grid-template-columns: 1fr !important;
        gap: 16px;
    }
}
</style>
