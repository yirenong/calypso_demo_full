<!-- src/views/Dashboard.vue -->
<template>
    <div class="dashboard-container">
        <!-- Page Header -->
        <div class="page-header">
            <h2 class="page-title">Home</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt;
                <span>Menu</span> &gt;
                <span>Home</span>
            </nav>
        </div>

        <!-- Controls -->
        <div class="controls">
            <div class="controls-group">
                <label class="control-label" for="cardTypeSelect">Customize Dashboard</label>
                <select id="cardTypeSelect" v-model="newCardType" class="control-select">
                    <optgroup v-for="group in cardGroups" :key="group.label" :label="group.label">
                        <option v-for="type in group.types" :key="type" :value="type">
                            {{ labelMap[type] }}
                        </option>
                    </optgroup>
                </select>
            </div>
            <button class="control-button" @click="addCard">
                <i class="fas fa-plus"></i>
                <span>Add Card</span>
            </button>
        </div>

        <!-- Draggable Grid -->
        <draggable v-model:list="cards" item-key="id" tag="div" class="dashboard-grid" :animation="200"
            handle=".card-handle" @start="isDragging = true" @end="isDragging = false">
            <template #item="{ element: card, index }">
                <div class="card-wrapper" :class="{ 'value-card': isMetric(card.type), dragging: isDragging }"
                    :style="card.props.style">
                    <div class="card-top-actions">
                        <button class="edit-btn" @click="editCard(index)">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" @click="removeCard(index)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="card-handle">☰</div>
                    <component :is="componentMap[card.type]" v-bind="card.props" />
                </div>
            </template>
        </draggable>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import draggable from 'vuedraggable'
import BarChartCard from '../components/BarChartCard.vue'
import LineChartCard from '../components/LineChartCard.vue'
import PieChartCard from '../components/PieChartCard.vue'
import ValueCard from '../components/ValueCard.vue'
import TableCard from '../components/TableCard.vue'

const labelMap = {
    MonthlySales: 'Monthly Sales',
    MonthlyTrend: 'Monthly Trend',
    CurrentKPI: 'Current KPI',
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
    AirsideEnergyDistBar: 'Air-side Energy Distribution (Bar)',
    PubWaterIncoming: "Today's PUB water incoming (m³)",
    NEWaterIncoming: "Today's NEWater incoming (m³)",
    CampusWaterUsage: "Today's Campus Water Usage (m³)",
    CampusWUI: 'Campus WUI (m³/population)',
    WaterSourceDistPie: 'Water Source Distribution (Pie)',
    WaterSourceDistBar: 'Water Source Trends (Bar)',
    CampusWUITrendBar: 'Campus WUI Trend (Bar)',
    WaterIntakeBar: 'Water Intake Sources (Stacked Bar)',
    WaterConsumptionTrendBar: 'Water Consumption Trend (Bar)',
    WaterUsageDistPie: 'Water Usage Distribution (Pie)',
    WaterUsageDistBar: 'Water Usage Trends (Bar)',
    CarbonFootprint: 'Carbon Footprint & Emissions (Table)',
    AlertsCCTV: 'Alerts from CCTV Video Analytics (Table)',
    DiagnosticReport: 'Diagnostic Report & Analysis (Table)',
    AvoidableCostReport: 'Avoidable Cost Report & Graph'
}

const cardGroups = [
    {
        label: 'Chiller Plant Energy',
        types: [
            'SystemRTGraph', 'SystemRTMetric', 'SystemKWGraph', 'SystemKWMetric',
            'SystemKWRTGraph', 'SystemKWRTMetric', 'HeatBalanceGraph', 'HeatBalanceMetric'
        ]
    },
    {
        label: 'Campus Electrical Energy',
        types: [
            'ElecIncoming', 'ElecUsage', 'TenantUsage', 'Solar', 'EVCharging',
            'CampusEUI', 'CampusTSE',
            'EnergySourceDistPie', 'EnergySourceDistBar', 'CampusEUIBar', 'ElectricalIntakeBar',
            'EnergyUsageDistPie', 'EnergyUsageDistBar', 'AirsideEnergyDistBar'
        ]
    },
    {
        label: 'Campus Water Usage',
        types: [
            'PubWaterIncoming', 'NEWaterIncoming', 'CampusWaterUsage', 'CampusWUI',
            'WaterSourceDistPie', 'WaterSourceDistBar', 'CampusWUITrendBar',
            'WaterIntakeBar', 'WaterConsumptionTrendBar', 'WaterUsageDistPie', 'WaterUsageDistBar'
        ]
    },
    { label: 'Sustainability Indicators', types: ['CarbonFootprint'] },
    { label: 'Statistical Analysis', types: ['AlertsCCTV', 'DiagnosticReport', 'AvoidableCostReport'] },
    { label: 'Monthly Reports', types: ['MonthlySales', 'MonthlyTrend'] },
    { label: 'KPIs', types: ['CurrentKPI'] }
]

const groupMap = {}
cardGroups.forEach(g => g.types.forEach(t => (groupMap[t] = g.label)))

const newCardType = ref('SystemRTGraph')
const cards = ref([])
const isDragging = ref(false)

function isMetric(type) {
    return [
        'CurrentKPI',
        'SystemRTMetric', 'SystemKWMetric', 'SystemKWRTMetric', 'HeatBalanceMetric',
        'ElecIncoming', 'ElecUsage', 'TenantUsage', 'Solar', 'EVCharging', 'CampusEUI', 'CampusTSE'
    ].includes(type)
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
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

const componentMap = {
    MonthlySales: BarChartCard,
    MonthlyTrend: LineChartCard,
    CurrentKPI: ValueCard,
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
    AirsideEnergyDistBar: BarChartCard,
    PubWaterIncoming: ValueCard,
    NEWaterIncoming: ValueCard,
    CampusWaterUsage: ValueCard,
    CampusWUI: ValueCard,
    WaterSourceDistPie: PieChartCard,
    WaterSourceDistBar: BarChartCard,
    CampusWUITrendBar: BarChartCard,
    WaterIntakeBar: BarChartCard,
    WaterConsumptionTrendBar: BarChartCard,
    WaterUsageDistPie: PieChartCard,
    WaterUsageDistBar: BarChartCard,
    CarbonFootprint: TableCard,
    AlertsCCTV: TableCard,
    DiagnosticReport: TableCard,
    AvoidableCostReport: TableCard
}

function getTitle(type) {
    const grp = groupMap[type] || ''
    const name = labelMap[type] || type
    return grp ? `${grp} – ${name}` : name
}

function addCard() {
    const type = newCardType.value
    const id = generateId()

    // If it’s a table‐type
    if (['CarbonFootprint', 'AlertsCCTV', 'DiagnosticReport', 'AvoidableCostReport'].includes(type)) {
        const cols = ['Item', 'Value']
        let rows = []
        if (type === 'CarbonFootprint') rows = [{ Item: 'Scope 1 CO₂', Value: '1,200 t' }, { Item: 'Scope 2 CO₂', Value: '3,400 t' }]
        if (type === 'AlertsCCTV') rows = [{ Item: 'Motion Alerts', Value: '12' }, { Item: 'Object Alerts', Value: '5' }]
        if (type === 'DiagnosticReport') rows = [{ Item: 'Report A Status', Value: 'OK' }, { Item: 'Report B Status', Value: 'Warning' }]
        if (type === 'AvoidableCostReport') rows = [{ Item: 'Energy Wastage', Value: '$1,500' }, { Item: 'Maintenance', Value: '$700' }]
        cards.value.push({
            id,
            type,
            props: {
                title: getTitle(type),
                columns: cols,
                rows,
                style: { gridColumn: 'span 2' }
            }
        })
    }
    // If it’s a chart‐type
    else if (type.match(/Chart|Bar|Pie$/)) {
        cards.value.push({
            id,
            type,
            props: {
                title: getTitle(type),
                chartData: {
                    labels: labels7,
                    datasets: [{ label: labelMap[type], data: randomArray(7) }]
                },
                options: chartOptions,
                style: { gridColumn: 'span 2' }
            }
        })
    }
    // Otherwise it’s a simple ValueCard
    else {
        cards.value.push({
            id,
            type,
            props: {
                title: getTitle(type),
                value: randomArray(1, 10000)[0],
                style: {}
            }
        })
    }
}

function removeCard(i) {
    cards.value.splice(i, 1)
}
function editCard(i) {
    const c = cards.value[i]
    const t = prompt('New title:', c.props.title)
    if (t !== null) c.props.title = t
}

onMounted(() => {
    const raw = localStorage.getItem('dashboard-cards')
    if (raw) {
        cards.value = JSON.parse(raw)
    }
    nextTick(() => { })
})
watch(cards, (v) => {
    localStorage.setItem('dashboard-cards', JSON.stringify(v))
}, { deep: true })
</script>

<style scoped>
/* ───────────────────────────────────────────────────────────────────────────── */
/* 1) CONTAINER & TYPOGRAPHY                                                      */
/* ───────────────────────────────────────────────────────────────────────────── */
.dashboard-container {
    padding: 20px;
    background-color: #0a1f44;
    /* very dark navy */
    min-height: 100vh;
    color: white;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 2) HEADER & BREADCRUMB                                                         */
/* ───────────────────────────────────────────────────────────────────────────── */
.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
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
/* 3) CONTROLS                                                                     */
/* ───────────────────────────────────────────────────────────────────────────── */
.controls {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    margin-bottom: 24px;
}

.control-label {
    display: block;
    margin-bottom: 4px;
    color: #e2e8f0;
    /* light gray */
    font-size: 14px;
}

.control-select {
    padding: 8px 12px;
    border: 1px solid #555;
    /* darker border */
    border-radius: 4px;
    background-color: #1e2a47;
    /* dark‐blue input background */
    color: white;
}

.control-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background-color: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    transition: background 0.2s;
}

.control-button i {
    font-size: 14px;
}

.control-button:hover {
    background-color: #125ea3;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 4) GRID LAYOUT                                                                 */
/* ───────────────────────────────────────────────────────────────────────────── */
.dashboard-grid {
    display: grid;
    grid-auto-rows: auto;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 5) CARD WRAPPER                                                                */
/* ───────────────────────────────────────────────────────────────────────────── */
.card-wrapper {
    position: relative;
    background-color: #1e2a47;
    /* dark‐blue card background */
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    color: white;
    /* card text white */
}

.card-wrapper:hover:not(.dragging) {
    transform: translateY(-4px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5);
}

/* If it’s a “small value” card, limit width slightly */
.card-wrapper.value-card {
    max-width: 200px;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 6) DRAG HANDLE & TOP ACTIONS                                                    */
/* ───────────────────────────────────────────────────────────────────────────── */
.card-handle {
    position: absolute;
    top: 8px;
    left: 8px;
    font-size: 1.2rem;
    cursor: grab;
    color: #cbd5e0;
    /* light gray */
    z-index: 10;
}

.card-handle:active {
    cursor: grabbing;
}

/* Edit/Delete icons */
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
    color: #e2e8f0;
    /* light gray */
    font-size: 16px;
    cursor: pointer;
    transition: color 0.2s;
}

.card-top-actions button:hover {
    color: #fff;
}

/* While dragging, remove hover transform/shadow */
.card-wrapper.dragging {
    transition: none !important;
}

.card-wrapper.dragging:hover {
    transform: none !important;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3) !important;
}

/* Prevent Sortable.js ghost/chosen classes from altering styling */
::v-deep .sortable-chosen,
::v-deep .sortable-ghost {
    transform: none !important;
    box-shadow: none !important;
    transition: none !important;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 7) MEDIA QUERIES                                                               */
/* ───────────────────────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
    .dashboard-container {
        padding: 10px;
    }

    .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }

    .page-title {
        font-size: 20px;
    }

    .breadcrumb {
        width: 100%;
        overflow-x: auto;
    }

    .controls {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    }

    .control-select,
    .control-button {
        width: 100%;
        justify-content: center;
    }

    .dashboard-grid {
        grid-template-columns: 1fr !important;
        gap: 16px;
    }
}
</style>
