<template>
    <div class="dashboard-container">
        <!-- Building Selector -->
        <div>
            <div class="dashboard-header">
                <label class="building-select-label">
                    Select Building:
                    <select v-model="selectedBuilding">
                        <option v-for="bld in buildings" :key="bld" :value="bld">{{ bld }}</option>
                    </select>
                </label>
            </div>
            <div class="dashboard-grid">
                <!-- Left Column: Sustainability KPIs -->
                <section class="column">
                    <div class="section-header">
                        <div class="section-title">
                            <span class="icon-wrapper leaf-icon"><i class="fas fa-leaf"></i></span>
                            <h3>Environmental Impact Indicators</h3>
                        </div>
                        <div class="section-actions">
                            <button class="action-btn"><i class="fas fa-info-circle"></i></button>
                            <button class="action-btn" @click="showFilterLeft = !showFilterLeft">
                                <i class="fas fa-filter"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Left Filter Panel -->
                    <div v-if="showFilterLeft" class="filter-panel">
                        <h4>Select Metrics & Modules</h4>
                        <div v-for="opt in filterOptionsLeft" :key="opt.key" class="filter-option">
                            <input type="checkbox" :id="opt.key + '-left'" v-model="selectedLeft" :value="opt.key" />
                            <label :for="opt.key + '-left'">
                                {{ opt.label }}
                                <span v-if="opt.unit">({{ opt.value }} {{ opt.unit }})</span>
                            </label>
                        </div>
                    </div>

                    <!-- KPI Cards -->
                    <div class="kpi-grid-2">
                        <div v-for="key in selectedLeft.filter(k => k !== 'table')" :key="key" class="kpi-card-wrapper">
                            <div class="kpi-title">{{ labelMap[key] }}</div>
                            <div class="kpi-number">{{ values[key] }}</div>
                            <div class="kpi-unit">{{ unitMap[key] }}</div>
                        </div>
                    </div>

                    <!-- Table: only if 'table' is checked -->
                    <TableCard v-if="selectedLeft.includes('table')"
                        title="Sustainability Indicators – Detailed Breakdown" :columns="sustainTable.columns"
                        :rows="sustainTable.rows" />

                    <!-- Waste Management Input & Mixed Chart -->
                    <div class="waste-section card">
                        <h4>Waste Management Trends</h4>

                        <!-- Simple data-entry form -->
                        <div class="waste-form">
                            <label class="waste-field">
                                Date
                                <input type="date" v-model="newWaste.date" />
                            </label>

                            <label class="waste-field">
                                General (kg)
                                <input type="number" v-model.number="newWaste.general" placeholder="e.g. 500" />
                            </label>

                            <label class="waste-field">
                                Recycled (kg)
                                <input type="number" v-model.number="newWaste.recycled" placeholder="e.g. 200" />
                            </label>

                            <button class="waste-add-btn" @click="addWasteData">Add</button>
                        </div>


                        <!-- Render mixed bar+line chart -->
                        <MixedChartCard :chartData="wasteChartData" :options="wasteChartOpts" />
                    </div>
                </section>

                <!-- Middle Column: Asset Performance KPIs -->
                <section class="column">
                    <div class="section-header">
                        <div class="section-title">
                            <span class="icon-wrapper gear-icon"><i class="fas fa-cogs"></i></span>
                            <h3>{{ selectedBuilding }}</h3>
                        </div>
                        <div class="section-actions">
                            <button class="action-btn"><i class="fas fa-info-circle"></i></button>
                            <button class="action-btn" @click="showFilterMiddle = !showFilterMiddle"><i
                                    class="fas fa-filter"></i></button>
                        </div>
                    </div>
                    <!-- Middle Filter Panel -->
                    <div v-if="showFilterMiddle" class="filter-panel">
                        <h4>Select Asset KPIs to Display</h4>
                        <div v-for="opt in filterOptionsMiddle" :key="opt.key" class="filter-option">
                            <input type="checkbox" :id="opt.key + '-mid'" v-model="selectedMiddle" :value="opt.key" />
                            <label :for="opt.key + '-mid'">
                                {{ opt.label }} ({{ opt.value }} {{ opt.unit }})
                            </label>
                        </div>
                    </div>
                    <div class="kpi-grid-2">
                        <div v-for="key in selectedMiddle" :key="key" class="kpi-card-wrapper">
                            <div class="kpi-title">{{ labelMap[key] }}</div>
                            <div class="kpi-number">{{ values[key] }}</div>
                            <div class="kpi-unit">{{ unitMap[key] }}</div>
                        </div>
                    </div>

                    <!-- Chart Controls -->
                    <div class="controls">
                        <select v-model="activeChart">
                            <option v-for="opt in chartOptionsList" :key="opt.value" :value="opt.value">
                                {{ opt.label }}
                            </option>
                        </select>
                        <div class="period-toggle">
                            <button v-for="p in periods" :key="p" :class="{ active: selectedPeriod === p }"
                                @click="selectedPeriod = p">{{ p }}</button>
                        </div>
                    </div>

                    <div class="chart-module">
                        <div class="chart-actions">
                            <button @click="downloadChartCSV" class="chart-btn"><i class="fas fa-download"></i></button>
                            <button @click="toggleFullScreen" class="chart-btn"><i class="fas fa-expand"></i></button>
                        </div>
                        <BarChartCard :chartData="chartData" :options="chartOpts" />
                        <div class="chart-legend">
                            <ul>
                                <li v-for="item in legendItems" :key="item.label">
                                    <span class="legend-color" :style="{ backgroundColor: item.color }"></span>
                                    {{ item.label }}
                                </li>
                            </ul>
                        </div>
                    </div>

                    <TableCard title="Statistical Analysis – System Diagnostics" :columns="systemDiagsTable.columns"
                        :rows="systemDiagsTable.rows" />
                </section>

                <!-- Right Column: Resource Utilization Overview -->
                <section class="column">
                    <div class="section-header">
                        <div class="section-title">
                            <span class="icon-wrapper resources-icon"><i class="fas fa-chart-pie"></i></span>
                            <h3>Waste Indicators</h3>
                        </div>
                        <div class="section-actions">
                            <button class="action-btn"><i class="fas fa-info-circle"></i></button>
                            <button class="action-btn" @click="showFilterRight = !showFilterRight"><i
                                    class="fas fa-filter"></i></button>
                        </div>
                    </div>
                    <!-- Right Filter Panel -->
                    <div v-if="showFilterRight" class="filter-panel">
                        <h4>Select Resource Metrics</h4>
                        <div v-for="opt in filterOptionsRight" :key="opt.key" class="filter-option">
                            <input type="checkbox" :id="opt.key + '-right'" v-model="selectedRight" :value="opt.key" />
                            <label :for="opt.key + '-right'">
                                {{ opt.label }} ({{ opt.value }} {{ opt.unit }})
                            </label>
                        </div>
                    </div>
                    <div class="kpi-grid-2">
                        <div v-for="key in selectedRight" :key="key" class="kpi-card-wrapper">
                            <div class="kpi-title">{{ labelMap[key] }}</div>
                            <div class="kpi-number">{{ values[key] }}</div>
                            <div class="kpi-unit">{{ unitMap[key] }}</div>
                        </div>
                    </div>
                    <div class="pie-stack">
                        <div class="pie-wrapper">
                            <h4 class="pie-title">{{ labelMap.EnergySourceDistPie }}</h4>
                            <PieChartCard :chartData="baseCharts.EnergySourceDistPie[selectedPeriod]"
                                :options="pieOpts" />
                            <!-- NEW: percentage breakdown -->
                            <ul class="pie-breakdown">
                                <li v-for="(row, i) in breakdownEnergy" :key="row.label">
                                    <span class="legend-color" :style="{ backgroundColor: energyColors[i] }"></span>
                                    <span class="label">{{ row.label }}</span>
                                    <span class="pct">{{ row.pct }}%</span>
                                </li>
                            </ul>
                        </div>

                        <div class="pie-wrapper">
                            <h4 class="pie-title">{{ labelMap.WaterEfficiencyPie }}</h4>
                            <PieChartCard :chartData="baseCharts.WaterEfficiencyPie[selectedPeriod]"
                                :options="pieOpts" />
                            <!-- NEW: percentage breakdown -->
                            <ul class="pie-breakdown">
                                <li v-for="(row, i) in breakdownWater" :key="row.label">
                                    <span class="legend-color" :style="{ backgroundColor: waterColors[i] }"></span>
                                    <span class="label">{{ row.label }}</span>
                                    <span class="pct">{{ row.pct }}%</span>
                                </li>
                            </ul>
                        </div>

                    </div>
                </section>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import BarChartCard from '../components/BarChartCard.vue'
import PieChartCard from '../components/PieChartCard.vue'
import TableCard from '../components/TableCard.vue'
import MixedChartCard from '../components/MixedChartCard.vue'
// --- ADD (near top with other imports) ---
import { onMounted} from 'vue'
import { useMqtt } from '../composables/useMqtt'


const { ensureConnected } = useMqtt()

onMounted(() => {
  // MQTT starts right away on this page load
  ensureConnected()
})


// New: building selector data
const buildings = [
    'ITE CC & HQ',
    'Block A Auditorium',
    'Block A Admin',
    'Block B',
    'Block C',
    'Block D',
    'Block E',
    'Block F',
    'Block G',
    'Block H',
    'Block J',
    'Block K'
]
const selectedBuilding = ref(buildings[0])

// filter toggles
const showFilterLeft = ref(false)
const showFilterMiddle = ref(false)
const showFilterRight = ref(false)

const newWaste = reactive({
    date: '',
    general: null,
    recycled: null
})

const wasteData = ref([])

function addWasteData() {
    if (!newWaste.date) return
    // push a copy
    wasteData.value.push({ ...newWaste })
    // reset form
    newWaste.date = ''
    newWaste.general = 0
    newWaste.recycled = 0
}

// Helper to turn a pie chart dataset into label + % rows
function asBreakdown(chartData) {
    const labels = chartData?.labels ?? [];
    const data = chartData?.datasets?.[0]?.data ?? [];
    const total = data.reduce((a, b) => a + b, 0) || 1;
    return labels.map((label, i) => ({
        label,
        pct: Math.round((data[i] / total) * 100),
    }));
}

// Energy Source Dist. breakdown + colors
const energyData = computed(() => baseCharts.EnergySourceDistPie[selectedPeriod.value] || {});
const energyColors = computed(() => energyData.value?.datasets?.[0]?.backgroundColor || []);
const breakdownEnergy = computed(() => asBreakdown(energyData.value));

// Water Efficiency breakdown + colors
const waterData = computed(() => baseCharts.WaterEfficiencyPie[selectedPeriod.value] || {});
const waterColors = computed(() => waterData.value?.datasets?.[0]?.backgroundColor || []);
const breakdownWater = computed(() => asBreakdown(waterData.value));


// filter options
const filterOptionsLeft = reactive([
    { key: 'ElectricalConsumption', label: 'Building Electrical Consumption', value: 56105, unit: 'kWh' },
    { key: 'EnergyUseIntensity', label: 'Energy Use Intensity', value: 122.43, unit: 'kWh/m²/year' },
    { key: 'WaterConsumption', label: 'Water Consumption', value: 83, unit: 'm³' },
    { key: 'WaterUseIntensity', label: 'Water Use Intensity', value: 0.18, unit: 'm³/man/day' },
    { key: 'ExtraMetric1', label: 'Extra Metric 1', value: 123, unit: 'Units' },
    { key: 'ExtraMetric2', label: 'Extra Metric 2', value: 456, unit: 'Units' },
    { key: 'table', label: 'Show Breakdown Table', value: '', unit: '' }
])
const filterOptionsMiddle = reactive([
    { key: 'AvgLoadCapacity', label: 'Avg Load / Capacity', value: '473 / 4,400', unit: 'TR' },
    { key: 'ChillerEfficiency', label: 'Chiller Efficiency', value: 1.797, unit: 'kW/RT' },
])
const filterOptionsRight = reactive([
    { key: 'ElecIncoming', label: "Today's Electrical Incoming", value: 24000, unit: 'kWh' },
    { key: 'Solar', label: "Today's Solar Generation", value: 3200, unit: 'kWh' },
])

// selected by default
const selectedLeft = ref(filterOptionsLeft.map(o => o.key))
const selectedMiddle = ref(filterOptionsMiddle.map(o => o.key))
const selectedRight = ref(filterOptionsRight.map(o => o.key))

// build values / labels / units maps
const values = reactive({
    ...filterOptionsLeft.reduce((a, o) => (a[o.key] = o.value, a), {}),
    ...filterOptionsMiddle.reduce((a, o) => (a[o.key] = o.value, a), {}),
    ...filterOptionsRight.reduce((a, o) => (a[o.key] = o.value, a), {}),
})
const labelMap = reactive({
    ...filterOptionsLeft.reduce((a, o) => (a[o.key] = o.label, a), {}),
    ...filterOptionsMiddle.reduce((a, o) => (a[o.key] = o.label, a), {}),
    ...filterOptionsRight.reduce((a, o) => (a[o.key] = o.label, a), {}),
    EnergySourceDistPie: 'Energy Source Dist.', WaterEfficiencyPie: 'Water Efficiency Break.'
})
const unitMap = reactive({
    ...filterOptionsLeft.reduce((a, o) => (a[o.key] = o.unit, a), {}),
    ...filterOptionsMiddle.reduce((a, o) => (a[o.key] = o.unit, a), {}),
    ...filterOptionsRight.reduce((a, o) => (a[o.key] = o.unit, a), {}),
})

// tables
const sustainTable = reactive({
    columns: ['Indicator', 'Current Value', 'Target', 'Unit', 'Change %'],
    rows: [
        { Indicator: 'Scope 1 CO₂', 'Current Value': '1,200', Target: '1,000', Unit: 't', 'Change %': '-20%' },
        { Indicator: 'Scope 2 CO₂', 'Current Value': '3,400', Target: '3,200', Unit: 't', 'Change %': '-6%' },
        { Indicator: 'Scope 3 CO₂', 'Current Value': '2,500', Target: '2,000', Unit: 't', 'Change %': '-20%' },
    ]
})
const systemDiagsTable = reactive({
    columns: ['Report', 'Status', 'Last Run', 'Duration', 'Errors'],
    rows: [
        { Report: 'Report A', Status: 'OK', 'Last Run': '2025-06-11', Duration: '2m', Errors: '0' },
        { Report: 'Report B', Status: 'Warning', 'Last Run': '2025-06-11', Duration: '3m', Errors: '1' },
        { Report: 'Report C', Status: 'OK', 'Last Run': '2025-06-11', Duration: '1m', Errors: '0' },
    ]
})

const wasteChartData = computed(() => {
    // sort your entries ascending by date
    const sorted = [...wasteData.value].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
    );

    return {
        labels: sorted.map(d => d.date),
        datasets: [
            {
                type: 'bar',
                label: 'General',
                data: sorted.map(d => d.general),
                backgroundColor: '#D3D3D3',
                order: 1              // draw bars first
            },
            {
                type: 'line',
                label: 'Recycled',
                data: sorted.map(d => d.recycled),
                borderColor: '#43a047',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                order: 2,             // draw line on top
                pointBackgroundColor: '#43a047', // make sure your dots are visible
                pointBorderColor: '#fff'
            }
        ]
    }
});

const wasteChartOpts = {
    responsive: true,
    maintainAspectRatio: false,

    // ⬇ tell Chart.js first draw ALL bars, then draw ALL lines
    datasets: {
        bar: { order: 1 },
        line: { order: 2 }
    },

    scales: {
        x: {
            title: {
                display: true,
                text: 'Date',
                color: '#fff'
            },
            ticks: {
                color: '#fff'
            }
        },
        y: {
            beginAtZero: true,
            title: {
                display: true,
                text: 'Kilograms',
                color: '#fff'
            },
            ticks: {
                color: '#fff'
            }
        }
    },

    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                color: '#fff'
            }
        },
        tooltip: {
            mode: 'index',
            intersect: false
        }
    }
}


// chart controls
const activeChart = ref('EnergyConsumptionTrend')
const chartOptionsList = [{ value: 'WaterConsumptionTrend', label: 'Water' }, { value: 'EnergyConsumptionTrend', label: 'Electricity' }]
const periods = ['1D', '1W', '1M', '3M', '6M', '1Y']
const selectedPeriod = ref('1W')

// helpers
const randomData = (len, min, max) => Array.from({ length: len }, () => Math.floor(Math.random() * (max - min) + min))
const last7 = () => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// base chart data
const baseCharts = reactive({
    EnergyConsumptionTrend: {
        '1D': {
            labels: ['Now'], datasets: [
                { label: 'Unocc-Prev', data: [5000], backgroundColor: '#1976d2' },
                { label: 'Occ-Prev', data: [6000], backgroundColor: '#388e3c' },
                { label: 'Occ-Pres', data: [7000], backgroundColor: '#f57c00' }]
        },
        '1W': {
            labels: last7(), datasets: [
                { label: 'Unocc-Prev', data: randomData(7, 2000, 10000), backgroundColor: '#1976d2' },
                { label: 'Occ-Prev', data: randomData(7, 2000, 10000), backgroundColor: '#388e3c' },
                { label: 'Occ-Pres', data: randomData(7, 2000, 10000), backgroundColor: '#f57c00' }]
        },
        '1M': {
            labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`), datasets: [
                { label: 'Unocc-Prev', data: randomData(30, 2000, 10000), backgroundColor: '#1976d2' },
                { label: 'Occ-Prev', data: randomData(30, 2000, 10000), backgroundColor: '#388e3c' },
                { label: 'Occ-Pres', data: randomData(30, 2000, 10000), backgroundColor: '#f57c00' }]
        },
        '3M': {
            labels: ['Jan', 'Feb', 'Mar'], datasets: [
                { label: 'Unocc-Prev', data: randomData(3, 20000, 90000), backgroundColor: '#1976d2' },
                { label: 'Occ-Prev', data: randomData(3, 20000, 90000), backgroundColor: '#388e3c' },
                { label: 'Occ-Pres', data: randomData(3, 20000, 90000), backgroundColor: '#f57c00' }]
        },
        '6M': {
            labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], datasets: [
                { label: 'Unocc-Prev', data: randomData(6, 20000, 100000), backgroundColor: '#1976d2' },
                { label: 'Occ-Prev', data: randomData(6, 20000, 100000), backgroundColor: '#388e3c' },
                { label: 'Occ-Pres', data: randomData(6, 20000, 100000), backgroundColor: '#f57c00' }]
        },
        '1Y': {
            labels: ['Q1', 'Q2', 'Q3', 'Q4'], datasets: [
                { label: 'Unocc-Prev', data: randomData(4, 100000, 300000), backgroundColor: '#1976d2' },
                { label: 'Occ-Prev', data: randomData(4, 100000, 300000), backgroundColor: '#388e3c' },
                { label: 'Occ-Pres', data: randomData(4, 100000, 300000), backgroundColor: '#f57c00' }]
        },
    },
    WaterConsumptionTrend: {
        '1D': {
            labels: ['Now'], datasets: [
                { label: 'Unocc-Prev', data: [150], backgroundColor: '#0288d1' },
                { label: 'Occ-Pres', data: [180], backgroundColor: '#f57c00' }]
        },
        '1W': {
            labels: last7(), datasets: [
                { label: 'Unocc-Prev', data: randomData(7, 100, 200), backgroundColor: '#0288d1' },
                { label: 'Occ-Pres', data: randomData(7, 100, 200), backgroundColor: '#f57c00' }]
        },
        '1M': {
            labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`), datasets: [
                { label: 'Unocc-Prev', data: randomData(30, 100, 200), backgroundColor: '#0288d1' },
                { label: 'Occ-Pres', data: randomData(30, 100, 200), backgroundColor: '#f57c00' }]
        },
        '3M': {
            labels: ['Jan', 'Feb', 'Mar'], datasets: [
                { label: 'Unocc-Prev', data: randomData(3, 500, 2000), backgroundColor: '#0288d1' },
                { label: 'Occ-Pres', data: randomData(3, 500, 2000), backgroundColor: '#f57c00' }]
        },
        '6M': {
            labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], datasets: [
                { label: 'Unocc-Prev', data: randomData(6, 1000, 3000), backgroundColor: '#0288d1' },
                { label: 'Occ-Pres', data: randomData(6, 1000, 3000), backgroundColor: '#f57c00' }]
        },
        '1Y': {
            labels: ['Q1', 'Q2', 'Q3', 'Q4'], datasets: [
                { label: 'Unocc-Prev', data: randomData(4, 3000, 8000), backgroundColor: '#0288d1' },
                { label: 'Occ-Pres', data: randomData(4, 3000, 8000), backgroundColor: '#f57c00' }]
        },
    },
    EnergySourceDistPie: {
        '1W': {
            labels: ['Solar', 'Grid', 'Generator'], datasets: [
                { data: [3200, 18000, 800], backgroundColor: ['#fbc02d', '#1976d2', '#c2185b'] }]
        }
    },
    WaterEfficiencyPie: {
        '1W': {
            labels: ['Rainwater', 'PUB', 'NEWater'], datasets: [
                { data: [32330, 38400, 33600], backgroundColor: ['#FFFF00', '#388e3c', '#0288d1'] }]
        }
    }
})

// computed chart data
const chartData = computed(() => {
    const base = (baseCharts[activeChart.value] || {})[selectedPeriod.value] || { labels: [], datasets: [] }
    let ds = base.datasets.map(d => ({ ...d }))
    if (activeChart.value === 'EnergyConsumptionTrend') {
        ds.push({
            label: 'EUI',
            data: base.labels.map(_ => Math.random() * 0.5 + 0.8),
            type: 'line', yAxisID: 'eui', borderColor: '#e91e63', borderWidth: 2, fill: false
        })
    }
    return { labels: [...base.labels], datasets: ds }
})
const legendItems = computed(() => activeChart.value === 'EnergyConsumptionTrend'
    ? [
        { label: 'Unocc-Prev', color: '#1976d2' },
        { label: 'Occ-Prev', color: '#388e3c' },
        { label: 'Occ-Pres', color: '#f57c00' },
        { label: 'EUI', color: '#e91e63' },
    ]
    : [
        { label: 'Unocc-Prev', color: '#1976d2' },
        { label: 'Occ-Pres', color: '#f57c00' },
    ]
)
const chartOpts = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,

    scales: {
        x: {
            ticks: { color: '#fff' },
            grid: { color: 'rgba(255,255,255,0.2)' }
        },
        y: {
            beginAtZero: true,
            ticks: { color: '#fff' },
            grid: { color: 'rgba(255,255,255,0.2)' }
        },
        eui: {
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#fff' }
        }
    },

    plugins: {
        legend: {
            position: 'bottom',
            labels: { color: '#fff' }   // legend label color
        }
    }
}))

const pieOpts = {
    responsive: true,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                color: '#fff'   // legend label text in white
            }
        }
    }
}

// handlers
function downloadChartCSV() {
    const { labels, datasets } = chartData.value
    const header = ['Label', ...datasets.map(d => d.label)].join(',')
    const rows = labels.map((l, i) => [l, ...datasets.map(d => d.data[i])].join(','))
    const csv = [header, ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob)
    link.download = `${activeChart.value}_${selectedPeriod.value}.csv`
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
}
function toggleFullScreen() {
    const el = document.querySelector('.chart-module')
    if (!document.fullscreenElement) el.requestFullscreen()
    else document.exitFullscreen()
}
</script>

<style scoped>
.dashboard-container {
    padding: 16px;
    background: #0a1f44;
    /* dark blue overall background */
    color: #fff;
    /* default text color white */
}

.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
}

.waste-form {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 1rem;
}

.waste-field {
    display: flex;
    flex-direction: column;
    font-size: 0.9rem;
    color: #fff;
}

.waste-field input {
    margin-top: 4px;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: transparent;
    color: #fff;
}


/* Card backgrounds: slightly lighter than container */
.column {
    background: #112d5c;
    border-radius: 8px;
    padding: 12px;
}

.card {
    background: #1e3f7a;
    /* match your KPI cards */
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

/* Optional: give the waste-section title a bit of breathing room */
.waste-section h4 {
    margin-top: 0;
    margin-bottom: 12px;
    color: #fff;
}

/* Section header */
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.section-title {
    display: flex;
    align-items: center;
    gap: 8px;
}

.section-title h3 {
    margin: 0;
    font-size: 1rem;
    color: #fff;
}

.icon-wrapper {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1976d2;
    border-radius: 50%;
    color: #fff;
}

.section-actions button {
    background: none;
    border: none;
    color: #fff;
    margin-left: 8px;
    cursor: pointer;
}

/* KPI grid */
.kpi-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 12px;
}

.kpi-card-wrapper {
    background: #1e3f7a;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 4px 8px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 90px;
}

.kpi-title {
    font-size: 0.75rem;
    color: #fff;
    margin-bottom: 4px;
}

.kpi-number {
    font-size: 1.3rem;
    font-weight: bold;
    color: #fff;
    margin-bottom: 2px;
}

.kpi-unit {
    font-size: 0.75rem;
    color: #fff;
}

/* Filter panel */
.filter-panel {
    padding: 12px;
    background: #112d5c;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    margin-bottom: 12px;
}

.filter-panel h4 {
    margin: 0 0 8px;
    color: #fff;
}

.filter-option {
    margin-bottom: 8px;
}

.filter-option label {
    color: #fff;
    cursor: pointer;
}

/* Controls */
.controls {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
    background: #112d5c;
    /* match your card bg */
    color: #fff;
    /* selected text */

}

.controls select {
    padding: 4px 8px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 4px;
    background: transparent;
    color: #fff;
}

.controls select option {
    background-color: #112d5c;
    color: #fff;
}

/* Highlight hovered option in list */
.controls select option:hover,
.controls select option:checked {
    background-color: #1976d2;
    color: #fff;
}

.period-toggle {
    display: flex;
    gap: 4px;
}

.period-toggle button {
    padding: 4px 8px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
    color: #fff;
}

.period-toggle button.active {
    background: #1976d2;
    color: #fff;
    border-color: #1976d2;
}

/* Chart module */
.chart-module {
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
    background: #112d5c;
    height: 325px;
}

.chart-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 8px;
}

.chart-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: #fff;
}

.chart-btn i {
    color: #fff;
}

/* Chart legend */
.chart-legend ul {
    display: flex;
    gap: 12px;
    list-style: none;
    padding: 0;
    margin-top: 8px;
}

.chart-legend li {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: #fff;
}

.legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
}

/* Tables */
table {
    width: 100%;
    border-collapse: collapse;
    color: #fff;
    margin-bottom: 12px;
}

th,
td {
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 8px;
    text-align: left;
}

/* Pie charts */
.pie-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.pie-wrapper {
    background: #112d5c;
    padding: 12px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.pie-title {
    margin: 0 0 8px;
    font-size: 1rem;
    color: #fff;
}

.waste-form {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    /* line up children on their bottom edge */
    gap: 1rem;
    margin-bottom: 1rem;
}

.waste-field {
    display: flex;
    flex-direction: column;
    font-size: 0.9rem;
    color: #fff;
    flex: 1 0 auto;
    min-width: 8rem;
}

.waste-field input {
    margin-top: 4px;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: transparent;
    color: #fff;
    width: 100%;
}

.waste-add-btn {
    align-self: flex-end;
    /* sit on the same bottom line as inputs */
    padding: 0.5rem 1rem;
    background: #28a745;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    flex: 0 0 auto;
}

.waste-add-btn:hover {
    background: #218838;
}

/* Header for building selector */
.dashboard-header {
    margin-bottom: 16px;
}

.building-select-label {
    font-size: 1rem;
    color: #fff;
}

.building-select-label select {
    margin-left: 8px;
    padding: 4px 8px;
    border-radius: 4px;
}

.pie-breakdown {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
    margin-top: 8px;
    padding: 0;
    list-style: none;
}

.pie-breakdown li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
}

.pie-breakdown .legend-color {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.pie-breakdown .label {
    color: #fff;
    opacity: 0.95;
}

.pie-breakdown .pct {
    color: #fff;
    font-weight: 600;
    opacity: 0.95;
}

/* ===== Groups tab styles ===== */

.groups-wrap {
    width: 100%;
}

/* Responsive grid for cards */
.group-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
}

/* Card-like buttons */
.group-card {
    --card-bg: #1d3670;
    --card-border: rgba(255, 255, 255, 0.18);
    --card-hover: #244083;
    --ring: rgba(66, 153, 225, 0.6);

    appearance: none;
    border: 1px solid var(--card-border);
    background: linear-gradient(180deg, var(--card-bg), #172c5d);
    color: #fff;
    border-radius: 12px;
    padding: 14px 16px;
    text-align: left;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0, 0, 0, .25);
    transition: transform .12s ease, box-shadow .12s ease, background .12s ease, border-color .12s ease;
}

.group-card:hover {
    transform: translateY(-2px);
    background: linear-gradient(180deg, var(--card-hover), #19326a);
    box-shadow: 0 8px 18px rgba(0, 0, 0, .35);
}

.group-card:active {
    transform: translateY(0);
}

.group-card:focus {
    outline: none;
}

.group-card:focus-visible {
    box-shadow: 0 0 0 3px var(--ring), 0 8px 18px rgba(0, 0, 0, .35);
}

/* Optional “selected” visual (add .is-active on the button if you want) */
.group-card.is-active {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px #3b82f6 inset, 0 8px 18px rgba(0, 0, 0, .35);
}

/* Card content */
.group-title {
    font-weight: 800;
    font-size: 1rem;
    letter-spacing: .2px;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.group-meta {
    font-size: .85rem;
    opacity: .92;
    display: flex;
    gap: 8px;
    align-items: center;
}

/* Back header row */
.group-detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 8px 0 14px;
}

/* Back button */
.back-btn {
    --ring: rgba(66, 153, 225, 0.6);
    appearance: none;
    border: 1px solid rgba(255, 255, 255, .25);
    background: transparent;
    color: #fff;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: background .12s ease, border-color .12s ease, transform .08s ease, box-shadow .12s ease;
}

.back-btn:hover {
    background: rgba(255, 255, 255, .08);
    border-color: rgba(255, 255, 255, .4);
}

.back-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--ring);
}

/* Optional tiny badge style if you want to highlight counts */
.group-meta span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
}

/* Tab container */
.tab-bar {
    display: flex;
    gap: 10px;
    border-bottom: 2px solid #ddd;
    margin-bottom: 1rem;
}

/* Tab button base style */
.tab-button {
    background: none;
    border: none;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 500;
    color: #555;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
}

/* Hover effect */
.tab-button:hover {
    color: #007bff;
}

/* Active tab */
.tab-button.active {
    color: #007bff;
    border-bottom-color: #007bff;
    font-weight: 600;
}
</style>
