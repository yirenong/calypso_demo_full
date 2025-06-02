<template>
    <div class="water-management-container">
        <div class="page-header">
            <h2 class="page-title">Water Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt;
                <span>Management</span> &gt;
                <span>Water Management</span>
            </nav>
        </div>
        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!-- Tab Navigation -->
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
        <!-- 1) Campus Water Usage Tab -->
        <div v-if="currentTab === 'usage'" class="tab-content">
            <h2>Campus Water Usage</h2>

            <!-- ── Top: Four Metric Cards ────────────────────────────────────────────── -->
            <div class="cards-grid">
                <div v-for="(type, idx) in waterMetricTypes" :key="'metric-' + idx" class="card-wrapper value-card">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>

            <!-- ── Bottom: Pie Charts (span two columns each) ─────────────────────────── -->
            <div class="cards-grid">
                <div v-for="(type, idx) in waterPieCharts" :key="'pie-' + idx" class="card-wrapper chart-card"
                    :style="generateStyle(type)">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>

            <!-- ── Bottom: Bar Charts (span two columns each) ─────────────────────────── -->
            <div class="cards-grid">
                <div v-for="(type, idx) in waterBarCharts" :key="'bar-' + idx" class="card-wrapper chart-card"
                    :style="generateStyle(type)">
                    <component :is="componentMap[type]" v-bind="generateProps(type)" />
                </div>
            </div>
        </div>

        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!-- 2) Sustainability Indicators Tab -->
        <div v-if="currentTab === 'sustain'" class="tab-content">
            <h2>Sustainability Indicators</h2>
            <div class="cards-grid">
                <div v-for="(tbl, idx) in sustainTables" :key="'sustain-table-' + idx" class="card-wrapper chart-card">
                    <TableCard :title="tbl.title" :columns="tbl.columns" :rows="tbl.rows" />
                </div>
            </div>
        </div>

        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!-- 3) Statistical Analysis Tab -->
        <div v-if="currentTab === 'stats'" class="tab-content">
            <h2>Statistical Analysis</h2>
            <div class="cards-grid">
                <div v-for="(tbl, idx) in statsTables" :key="'stats-table-' + idx" class="card-wrapper chart-card">
                    <TableCard :title="tbl.title" :columns="tbl.columns" :rows="tbl.rows" />
                </div>
            </div>
        </div>

        <!-- ─────────────────────────────────────────────────────────────────────────── -->
        <!-- 4) Download Data Tab -->
        <div v-if="currentTab === 'download'" class="tab-content">
            <h2>Download Full Dataset (CSV)</h2>
            <button class="download-button" @click="downloadCSV">
                <i class="fas fa-download"></i>
                <span>Download CSV</span>
            </button>
            <p class="note">
                The CSV contains one row per “type” (metric, chart, or table), along
                with its latest value, last-7-days data, or table contents as JSON.
            </p>
        </div>
    </div>
</template>

<script setup>
// ───────────────────────────────────────────────────────────────────────────────
// Imports
// ───────────────────────────────────────────────────────────────────────────────
import { ref, watch, onMounted, nextTick } from 'vue'
import BarChartCard from '../components/BarChartCard.vue'
import LineChartCard from '../components/LineChartCard.vue'
import PieChartCard from '../components/PieChartCard.vue'
import ValueCard from '../components/ValueCard.vue'
import TableCard from '../components/TableCard.vue'


// ───────────────────────────────────────────────────────────────────────────────
// 1) Types for “Campus Water Usage”
//    - Four ValueCard metrics
//    - Two Pie charts
//    - Four Bar charts
// ───────────────────────────────────────────────────────────────────────────────
const waterMetricTypes = [
    'PubIncoming',      // Today's PUB Water Incoming (m³)
    'NeWaterIncoming',  // Today's NEWater Incoming (m³)
    'CampusUsage',      // Today's Campus Water Usage (m³)
    'CampusWUI'         // Campus WUI (m³/population)
]

const waterPieCharts = [
    'WaterSourceDistPie',     // Water Source Distribution (Pie)
    'WaterUsageDistPie'       // Water Usage Distribution (Pie)
]

const waterBarCharts = [
    'WaterSourceDistBar',       // Water Source Trends (Bar)
    'CampusWUIBar',             // Campus WUI Trend (Bar)
    'WaterIntakeBar',           // Water Intake Sources (Stacked Bar)
    'WaterConsumptionTrendBar'  // Water Consumption Trend (Bar)
]


// ───────────────────────────────────────────────────────────────────────────────
// 2) “Sustainability Indicators” Tables
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
    // You can add more sustainability tables here if needed.
]


// ───────────────────────────────────────────────────────────────────────────────
// 3) “Statistical Analysis” Tables
// ───────────────────────────────────────────────────────────────────────────────
const statsTables = [
    {
        title: 'Statistical Analysis – Alerts from CCTV Video Analytics',
        columns: ['Item', 'Value'],
        rows: [
            { Item: 'Motion Alerts', Value: '12' },
            { Item: 'Object Alerts', Value: '5' }
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
// 4) Friendly labels for all “type” strings
// ───────────────────────────────────────────────────────────────────────────────
const labelMap = {
    PubIncoming: "Today's PUB Water Incoming (m³)",
    NeWaterIncoming: "Today's NEWater Incoming (m³)",
    CampusUsage: "Today's Campus Water Usage (m³)",
    CampusWUI: 'Campus WUI (m³/population)',
    WaterSourceDistPie: 'Water Source Distribution (Pie)',
    WaterUsageDistPie: 'Water Usage Distribution (Pie)',
    WaterSourceDistBar: 'Water Source Trends (Bar)',
    CampusWUIBar: 'Campus WUI Trend (Bar)',
    WaterIntakeBar: 'Water Intake Sources (Stacked Bar)',
    WaterConsumptionTrendBar: 'Water Consumption Trend (Bar)'
}


// ───────────────────────────────────────────────────────────────────────────────
// 5) Map each “type” → Component
// ───────────────────────────────────────────────────────────────────────────────
const componentMap = {
    PubIncoming: ValueCard,
    NeWaterIncoming: ValueCard,
    CampusUsage: ValueCard,
    CampusWUI: ValueCard,
    WaterSourceDistPie: PieChartCard,
    WaterUsageDistPie: PieChartCard,
    WaterSourceDistBar: BarChartCard,
    CampusWUIBar: BarChartCard,
    WaterIntakeBar: BarChartCard,
    WaterConsumptionTrendBar: BarChartCard
}


// ───────────────────────────────────────────────────────────────────────────────
// 6) Helpers for random data + last-7-days labels
// ───────────────────────────────────────────────────────────────────────────────
function last7Days() {
    const days = []
    for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        days.push(
            d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        )
    }
    return days
}
const labels7 = last7Days()

function randomArray(len, max = 100) {
    return Array.from({ length: len }, () =>
        Math.floor(Math.random() * max)
    )
}

const chartOptions = {
    responsive: true,
    scales: { y: { beginAtZero: true } }
}


// ───────────────────────────────────────────────────────────────────────────────
// 7) Determine if a “type” is a ValueCard (metric) or a chart
// ───────────────────────────────────────────────────────────────────────────────
function isMetric(type) {
    return [
        'PubIncoming',
        'NeWaterIncoming',
        'CampusUsage',
        'CampusWUI'
    ].includes(type)
}


// ───────────────────────────────────────────────────────────────────────────────
// 8) Build props for each card on the fly
//
//    - For ValueCard (metrics), return { title, value }
//    - For charts (Pie/Bar), return { title, chartData, options }
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
// 9) Inline “style” so that any chart spans two columns
//     (because we use `grid-template-columns: repeat(auto-fill, minmax(300px,1fr))`)
// ───────────────────────────────────────────────────────────────────────────────
function generateStyle(type) {
    if (!isMetric(type)) {
        return { gridColumn: 'span 2' }
    }
    return {}
}


// ───────────────────────────────────────────────────────────────────────────────
// 10) Tab state
// ───────────────────────────────────────────────────────────────────────────────
const currentTab = ref('usage')


// ───────────────────────────────────────────────────────────────────────────────
// 11) Download CSV logic
// ───────────────────────────────────────────────────────────────────────────────
function downloadCSV() {
    // 11a) Build CSV header
    const header = [
        'Type',
        'Friendly Label',
        'Category',
        'Metric/Chart/Table',
        'Most Recent Value',
        'Last 7 Days Data (|-separated)',
        'Table Contents (JSON)'
    ].join(',')

    // 11b) Combine all “types” (metrics + charts + dynamic table‐IDs)
    const allTypes = [
        ...waterMetricTypes,
        ...waterPieCharts,
        ...waterBarCharts,
        // For each sustain table, assign an artificial “SustainTableX” ID
        ...sustainTables.map((_, i) => `SustainTable${i}`),
        // For each stats table, assign “StatsTableX”
        ...statsTables.map((_, i) => `StatsTable${i}`)
    ]

    // 11c) Map each type → one CSV row
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

        // 11d) If type is one of the four metrics
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
        // 11e) If type is one of the pie/bar charts
        else if (
            waterPieCharts.includes(type) ||
            waterBarCharts.includes(type)
        ) {
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
        // 11f) If type is a Sustainability table
        else if (type.startsWith('SustainTable')) {
            const idx = parseInt(type.replace('SustainTable', ''), 10)
            const tbl = sustainTables[idx]
            // We stringify the rows array as JSON
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
        // 11g) If type is a Stats table
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
        // fallback → empty row
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
// 12) (Optional) Persist “cards” ordering if you implement drag/drop later.
//     Currently this demo does not reorder anything but we keep the stub.
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
    nextTick(() => {
        // no special “animation” needed
    })
})

watch(
    () => cards.value,
    (newVal) => {
        localStorage.setItem('water-mgmt-cards', JSON.stringify(newVal))
    },
    { deep: true }
)
</script>

<style scoped>
.water-management-container {
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

/* ────────────────── Tab Navigation ───────────────────────────────────────── */
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
    background: #1976d2;
    color: white;
}

/* ─────────────────── Tab Content Header ─────────────────────────────────── */
.tab-content h2 {
    margin-top: 0;
    margin-bottom: 16px;
    color: var(--main-text-color);
}

/* ─────────────────── Shared Grid for Cards ───────────────────────────────── */
.cards-grid {
    display: grid;
    gap: 20px;
    margin-bottom: 24px;
    /* Each column min 300px, auto‐fill as many as fit */
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

/* ─────────────────── Card Styles ─────────────────────────────────────────── */
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

/* For charts, we rely on inline style generateStyle(type) to span 2 columns. */
/* Metric/Value cards stay single‐column: */
.card-wrapper.value-card {
    max-width: 100%;
}

/* ─────────────────── Drag Handle (optional) ───────────────────────────────── */
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

/* ─────────────────── Edit/Delete Buttons (not used in this version) ───────── */
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

/* ─────────────────── Download Tab Button ──────────────────────────────────── */
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

/* ─────────────────── Responsive Adjustments ───────────────────────────────── */
@media (max-width: 768px) {
    .water-management-container {
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
