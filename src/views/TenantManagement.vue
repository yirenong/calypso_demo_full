<template>
    <div class="energy-management-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Tenant Management</h2>
            <div class="page-header-right">
                <nav class="breadcrumb">
                    <span>Cavill</span> &gt; <span>Management</span> &gt; <span>Tenant Management</span>
                </nav>
            </div>
        </div>

        <!-- View Tabs -->
        <div class="view-tab-bar">
            <div class="view-tab-nav">
                <button :class="{ active: viewTab === 'Dashboard' }" @click="switchTab('Dashboard')">
                    Dashboard
                </button>
                <button :class="{ active: viewTab === 'Tenants' }" @click="switchTab('Tenants')">
                    Tenants
                </button>
                <button :class="{ active: viewTab === 'Entries' }" @click="switchTab('Entries')">
                    Entries
                </button>
            </div>

            <div style="display:flex; gap:8px">
                <button class="icon-btn" @click="openDownloadModal" :disabled="downloading"
                    :title="downloading ? 'Generating…' : 'Generate Monthly Report'">
                    <i class="fas fa-file-excel" :class="{ 'fa-spin': downloading }"></i>
                </button>

                <button class="icon-btn" @click="reloadAll" :disabled="loading"
                    :title="loading ? 'Loading…' : 'Reload'">
                    <i class="fas fa-rotate" :class="{ 'fa-spin': loading }"></i>
                </button>
            </div>
        </div>

        <!-- DASHBOARD -->
        <template v-if="viewTab === 'Dashboard'">
            <div class="meta-strip">
                <div class="title-wrap">
                    <span class="badge">Overview</span>
                    <h1>Tenant Energy Dashboard</h1>
                    <p class="subtitle">Showing energy summary and graph data from API.</p>
                </div>
            </div>

            <div class="kpi-section-header">
                <span class="section-chip">Latest</span>
            </div>

            <section class="grid kpi-grid kpi-grid-2">
                <div class="card kpi">
                    <div class="kpi-accent kpi-green"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-bolt"></i></div>
                        <div class="kpi-label">Total Energy Consumption</div>
                    </div>
                    <div class="kpi-value kpi-value-small">{{ formatKwh(chartTotalEnergy) }}</div>
                    <div class="kpi-sub muted">Current chart selection</div>
                </div>

                <div class="card kpi">
                    <div class="kpi-accent kpi-orange"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-chart-line"></i></div>
                        <div class="kpi-label">Average Energy Consumption</div>
                    </div>
                    <div class="kpi-value kpi-value-small">{{ formatKwh(avgEnergy) }}</div>
                    <div class="kpi-sub muted">average_hourly_energy_kwh from API</div>
                </div>
            </section>

            <section class="grid charts-grid">
                <div class="card chart-card full-width-chart">
                    <div class="card-header chart-toolbar">
                        <div>
                            <h3>Energy Trend</h3>
                            <small class="muted">
                                {{ selectedDevice === 'overall' ? 'Overall' : getDeviceName(selectedDevice) }}
                                · {{ selectedPeriod }}
                                · {{ getSelectedDateLabel() }}
                            </small>
                        </div>

                        <div class="chart-filters">
                            <select v-model="selectedDevice" class="dark-select" @change="onChartFilterChange">
                                <option v-for="option in deviceOptions" :key="option.value" :value="option.value">
                                    {{ option.label }}
                                </option>
                            </select>

                            <select v-model="selectedPeriod" class="dark-select" @change="onPeriodChange">
                                <option value="hourly">Hourly</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>

                            <input v-if="selectedPeriod === 'hourly'" v-model="selectedDate" type="date"
                                class="dark-select" @change="onChartFilterChange" />

                            <template v-else-if="selectedPeriod === 'daily'">
                                <input v-model="dailyStartDate" type="date" class="dark-select"
                                    @change="onChartFilterChange" />
                                <input v-model="dailyEndDate" type="date" class="dark-select"
                                    @change="onChartFilterChange" />
                            </template>

                            <template v-else-if="selectedPeriod === 'weekly'">
                                <input v-model="weeklyStartWeek" type="week" class="dark-select"
                                    @change="onChartFilterChange" />
                                <input v-model="weeklyEndWeek" type="week" class="dark-select"
                                    @change="onChartFilterChange" />
                            </template>

                            <template v-else-if="selectedPeriod === 'monthly'">
                                <input v-model="monthlyStartMonth" type="month" class="dark-select"
                                    @change="onChartFilterChange" />
                                <input v-model="monthlyEndMonth" type="month" class="dark-select"
                                    @change="onChartFilterChange" />
                            </template>

                            <template v-else-if="selectedPeriod === 'yearly'">
                                <input v-model.number="yearlyStartYear" type="number" min="2000" max="2100" step="1"
                                    class="dark-select year-input" @change="onChartFilterChange" />
                                <input v-model.number="yearlyEndYear" type="number" min="2000" max="2100" step="1"
                                    class="dark-select year-input" @change="onChartFilterChange" />
                            </template>

                            <select v-model="chartType" class="dark-select">
                                <option value="line">Line Chart</option>
                                <option value="bar">Bar Chart</option>
                            </select>
                        </div>
                    </div>

                    <div class="chart-wrap">
                        <div v-if="chartLoading" class="wip-panel">
                            <div>
                                <div class="wip-title">Loading chart...</div>
                                <div class="wip-sub">Fetching graph data.</div>
                            </div>
                        </div>

                        <div v-else-if="!chartLabels.length" class="wip-panel">
                            <div>
                                <div class="wip-title">No chart data</div>
                                <div class="wip-sub">No graph points available for this selection.</div>
                            </div>
                        </div>

                        <Line v-else-if="chartType === 'line'" :data="chartData" :options="chartOptions" />
                        <Bar v-else :data="chartData" :options="chartOptions" />
                    </div>

                    <small class="err" v-if="error">{{ error }}</small>
                </div>
            </section>
        </template>

        <!-- TENANTS -->
        <template v-else-if="viewTab === 'Tenants'">
            <section class="grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Tenant Devices</h3>
                        <small class="muted">Latest energy summary per device</small>
                    </div>

                    <div class="table-wrap">
                        <table class="tenant-table">
                            <thead>
                                <tr>
                                    <th @click="sortBy('device_name')" class="sortable">
                                        Device Name <span class="sort-icon">{{ sortIcon('device_name') }}</span>
                                    </th>
                                    <th @click="sortBy('total_energy_kwh')" class="sortable">
                                        Total Energy (kWh) <span class="sort-icon">{{ sortIcon('total_energy_kwh')
                                        }}</span>
                                    </th>
                                    <th @click="sortBy('average_hourly_energy_kwh')" class="sortable">
                                        Average Energy (kWh)
                                        <span class="sort-icon">{{ sortIcon('average_hourly_energy_kwh') }}</span>
                                    </th>
                                    <th @click="sortBy('hasReading')" class="sortable">
                                        Status <span class="sort-icon">{{ sortIcon('hasReading') }}</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="!tenantRows.length">
                                    <td colspan="5" class="empty-cell">No tenant data available.</td>
                                </tr>

                                <tr v-for="row in tenantRows" :key="row.dev_eui">
                                    <td>{{ row.device_name || '—' }}</td>
                                    <td>{{ row.total_energy_kwh !== null ? Number(row.total_energy_kwh).toFixed(3) : '—'
                                    }}</td>
                                    <td>
                                        {{
                                            row.average_hourly_energy_kwh !== null
                                                ? Number(row.average_hourly_energy_kwh).toFixed(3)
                                                : '—'
                                        }}
                                    </td>
                                    <td>
                                        <span class="status-pill"
                                            :class="row.hasReading ? 'status-online' : 'status-offline'">
                                            {{ row.hasReading ? 'Data Available' : 'No Data' }}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <small class="err" v-if="error" style="display:block; margin-top:10px">
                        {{ error }}
                    </small>
                </div>
            </section>
        </template>

        <!-- ENTRIES -->
        <template v-else>
            <section class="grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Entries</h3>
                        <small class="muted">Work in Progress</small>
                    </div>

                    <div class="wip-panel" style="margin-top:10px">
                        <div>
                            <div class="wip-title">Working in progress</div>
                            <div class="wip-sub">You can use this tab later for logs or manual entries.</div>
                        </div>
                    </div>

                    <small class="err" v-if="error" style="display:block; margin-top:6px">
                        {{ error }}
                    </small>
                </div>
            </section>
        </template>

        <!-- Generate Report Modal -->
        <div v-if="showDownloadModal" class="modal-overlay" @click.self="closeDownloadModal">
            <div class="modal-card">
                <div class="modal-header">
                    <h3>Generate Monthly Report</h3>
                    <button class="modal-close-btn" @click="closeDownloadModal" :disabled="downloading">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Year and Month</label>
                        <input v-model="reportMonth" type="month" class="dark-select modal-input"
                            :disabled="downloading" />
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="modal-btn secondary-btn" @click="closeDownloadModal" :disabled="downloading">
                        Cancel
                    </button>
                    <button class="modal-btn primary-btn" @click="generateMonthlyReport"
                        :disabled="downloading || !reportMonth">
                        <i class="fas fa-file-excel"></i>
                        {{ downloading ? 'Generating...' : 'Generate Report' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
} from 'chart.js'
import { Bar, Line } from 'vue-chartjs'

ChartJS.register(
    Title,
    Tooltip,
    Legend,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale
)

const viewTab = ref('Dashboard')
const loading = ref(false)
const chartLoading = ref(false)
const downloading = ref(false)
const error = ref(null)

const devices = ref([])
const summaryData = ref({
    success: false,
    date: '',
    device_count: 0,
    total_energy_kwh: 0,
    average_hourly_energy_kwh: 0,
    hours_with_data: 0,
    devices: [],
})

const selectedDevice = ref('overall')
const selectedPeriod = ref('hourly')
const chartType = ref('line')

const selectedDate = ref(getTodayLocalDate())
const selectedWeek = ref(getCurrentWeekValue())
const selectedMonth = ref(getCurrentMonthValue())
const dailyStartDate = ref(getTodayLocalDate())
const dailyEndDate = ref(getTodayLocalDate())
const weeklyStartWeek = ref(getCurrentWeekValue())
const weeklyEndWeek = ref(getCurrentWeekValue())
const monthlyStartMonth = ref(getCurrentMonthValue())
const monthlyEndMonth = ref(getCurrentMonthValue())
const yearlyStartYear = ref(new Date().getFullYear() - 1)
const yearlyEndYear = ref(new Date().getFullYear())

function normalizeDailyRange() {
    if (!dailyStartDate.value) dailyStartDate.value = getTodayLocalDate()
    if (!dailyEndDate.value) dailyEndDate.value = getTodayLocalDate()

    if (dailyStartDate.value > dailyEndDate.value) {
        dailyEndDate.value = dailyStartDate.value
    }
}

function normalizeWeekRange() {
    if (!weeklyStartWeek.value) weeklyStartWeek.value = getCurrentWeekValue()
    if (!weeklyEndWeek.value) weeklyEndWeek.value = getCurrentWeekValue()

    if (weeklyStartWeek.value > weeklyEndWeek.value) {
        weeklyEndWeek.value = weeklyStartWeek.value
    }
}

function normalizeMonthRange() {
    if (!monthlyStartMonth.value) monthlyStartMonth.value = getCurrentMonthValue()
    if (!monthlyEndMonth.value) monthlyEndMonth.value = getCurrentMonthValue()

    if (monthlyStartMonth.value > monthlyEndMonth.value) {
        monthlyEndMonth.value = monthlyStartMonth.value
    }
}

function normalizeYearRange() {
    yearlyStartYear.value = Number(yearlyStartYear.value || new Date().getFullYear())
    yearlyEndYear.value = Number(yearlyEndYear.value || yearlyStartYear.value)

    if (yearlyStartYear.value > yearlyEndYear.value) {
        yearlyEndYear.value = yearlyStartYear.value
    }
}

const showDownloadModal = ref(false)
const reportMonth = ref(getCurrentMonthValue())

const chartLabels = ref([])
const chartValues = ref([])

const sortKey = ref('device_name')
const sortDirection = ref('asc')

function switchTab(tab) {
    viewTab.value = tab
}

function sortBy(key) {
    if (sortKey.value === key) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
        sortKey.value = key
        sortDirection.value = 'asc'
    }
}

function sortIcon(key) {
    if (sortKey.value !== key) return '↕'
    return sortDirection.value === 'asc' ? '↑' : '↓'
}

const tenantRows = computed(() => {
    const rows = [...devices.value]

    rows.sort((a, b) => {
        let aVal = a[sortKey.value]
        let bVal = b[sortKey.value]

        if (
            sortKey.value === 'total_energy_kwh' ||
            sortKey.value === 'average_hourly_energy_kwh' ||
            sortKey.value === 'hours_with_data'
        ) {
            aVal = Number(aVal ?? -Infinity)
            bVal = Number(bVal ?? -Infinity)
        } else if (sortKey.value === 'hasReading') {
            aVal = aVal ? 1 : 0
            bVal = bVal ? 1 : 0
        } else {
            aVal = String(aVal ?? '').toLowerCase()
            bVal = String(bVal ?? '').toLowerCase()
        }

        if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
        return 0
    })

    return rows
})

const deviceOptions = computed(() => {
    const sorted = [...devices.value].sort((a, b) =>
        String(a.device_name || '').localeCompare(String(b.device_name || ''))
    )

    return [
        { label: 'Overall', value: 'overall' },
        ...sorted.map((d) => ({
            label: d.device_name,
            value: d.dev_eui,
        })),
    ]
})

const avgEnergy = computed(() => Number(summaryData.value?.average_hourly_energy_kwh || 0))
const chartTotalEnergy = computed(() =>
    chartValues.value.reduce((sum, value) => sum + Number(value || 0), 0)
)

const chartData = computed(() => ({
    labels: chartLabels.value,
    datasets: [
        {
            label:
                selectedDevice.value === 'overall'
                    ? 'Overall Energy Usage'
                    : `${getDeviceName(selectedDevice.value)} Energy Usage`,
            data: chartValues.value,
            borderWidth: 2,
            tension: 0.3,
            fill: false,
        },
    ],
}))

const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
        padding: {
            bottom: 24,
        },
    },
    plugins: {
        legend: {
            display: true,
            labels: {
                color: '#cbd5e1',
            },
        },
        title: {
            display: true,
            text: `${capitalize(selectedPeriod.value)} Energy Trend`,
            color: '#e5e7eb',
        },
        tooltip: {
            callbacks: {
                label: (context) => `${Number(context.raw || 0).toFixed(3)} kWh`,
            },
        },
    },
    scales: {
        x: {
            ticks: {
                color: '#cbd5e1',
                padding: 8,
                autoSkip: true,
                maxRotation: 0,
                minRotation: 0,
            },
            grid: {
                color: 'rgba(255,255,255,0.08)',
            },
        },
        y: {
            beginAtZero: true,
            ticks: {
                color: '#cbd5e1',
                callback: (value) => `${value} kWh`,
            },
            grid: {
                color: 'rgba(255,255,255,0.08)',
            },
        },
    },
}))

function capitalize(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

function getDeviceName(devEui) {
    const found = devices.value.find((d) => d.dev_eui === devEui)
    return found?.device_name || devEui
}

function formatKwh(value) {
    return `${Number(value || 0).toFixed(3)} kWh`
}

function getTodayLocalDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function getCurrentMonthValue() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getCurrentWeekValue() {
    const now = new Date()
    return getIsoWeekValue(now)
}

function getIsoWeekValue(dateValue) {
    const now = new Date(dateValue)
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function getSelectedDateLabel() {
    if (selectedPeriod.value === 'hourly') {
        return selectedDate.value
    }
    if (selectedPeriod.value === 'daily') {
        return `${dailyStartDate.value} to ${dailyEndDate.value}`
    }
    if (selectedPeriod.value === 'weekly') {
        return `${weeklyStartWeek.value} to ${weeklyEndWeek.value}`
    }
    if (selectedPeriod.value === 'monthly') {
        return `${monthlyStartMonth.value} to ${monthlyEndMonth.value}`
    }
    if (selectedPeriod.value === 'yearly') {
        return `${yearlyStartYear.value} to ${yearlyEndYear.value}`
    }
    return ''
}

function parseApiDate(value) {
    if (!value) return null
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return null
    return d
}

function normalizeChartRows(rows) {
    if (!Array.isArray(rows)) return []

    return rows
        .map((row) => {
            const dateValue = row.x ?? row.timestamp ?? row.date ?? row.datetime
            const numericValue = row.y ?? row.value ?? row.energy_kwh ?? 0
            const xDate = parseApiDate(dateValue)

            return {
                ...row,
                x: dateValue,
                xDate,
                yValue: Number(numericValue || 0),
            }
        })
        .filter((row) => row.xDate)
        .sort((a, b) => a.xDate - b.xDate)
}

function getWeekStartEnd(weekString) {
    const [yearPart, weekPart] = weekString.split('-W')
    const year = Number(yearPart)
    const week = Number(weekPart)

    const simple = new Date(year, 0, 1 + (week - 1) * 7)
    const dayOfWeek = simple.getDay()
    const monday = new Date(simple)
    if (dayOfWeek <= 4 && dayOfWeek !== 0) {
        monday.setDate(simple.getDate() - dayOfWeek + 1)
    } else if (dayOfWeek === 0) {
        monday.setDate(simple.getDate() - 6)
    } else {
        monday.setDate(simple.getDate() + 8 - dayOfWeek)
    }

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    monday.setHours(0, 0, 0, 0)
    sunday.setHours(23, 59, 59, 999)

    return { start: monday, end: sunday }
}

function listWeeksInclusive(startWeek, endWeek) {
    const weeks = []
    const startInfo = getWeekStartEnd(startWeek)
    const endInfo = getWeekStartEnd(endWeek)
    let cursor = new Date(startInfo.start)
    let last = new Date(endInfo.start)

    if (cursor > last) [cursor, last] = [last, cursor]

    while (cursor <= last) {
        weeks.push(getIsoWeekValue(cursor))
        cursor.setDate(cursor.getDate() + 7)
    }

    return weeks
}

function labelWeek(weekValue) {
    const weekNo = String(weekValue || '').split('-W')[1] || ''
    return `Week ${Number(weekNo) || weekNo}`
}

function addOneMonth(yyyyMm) {
    const [year, month] = String(yyyyMm).split('-').map(Number)
    const d = new Date(year, (month || 1) - 1, 1)
    d.setMonth(d.getMonth() + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function listMonthsInclusive(startMonth, endMonth) {
    const months = []
    let cursor = String(startMonth)
    const last = String(endMonth)
    if (cursor > last) cursor = last

    while (cursor <= last) {
        months.push(cursor)
        cursor = addOneMonth(cursor)
    }

    return months
}

function toLocalDateTime(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
    ).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(
        date.getMinutes()
    ).padStart(2, '0')}:00`
}

function toYmdFromApiDate(dateValue) {
    const d = new Date(dateValue)
    if (Number.isNaN(d.getTime())) return ''

    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function isSameDateValue(dateValue, yyyyMmDd) {
    return toYmdFromApiDate(dateValue) === yyyyMmDd
}

function isSameMonth(dateObj, yyyyMm) {
    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}` === yyyyMm
}

function filterRowsBySelectedPeriod(rows) {
    if (!Array.isArray(rows)) return []

    if (selectedPeriod.value === 'hourly') {
        return rows.filter((row) => toYmdFromApiDate(row.xDate) === selectedDate.value)
    }

    if (selectedPeriod.value === 'daily') {
        return rows
    }

    if (selectedPeriod.value === 'weekly') {
        normalizeWeekRange()
        const { start } = getWeekStartEnd(weeklyStartWeek.value)
        const { end } = getWeekStartEnd(weeklyEndWeek.value)

        const today = new Date()
        today.setHours(23, 59, 59, 999)

        return rows.filter((row) => {
            const rowDate = new Date(row.xDate)
            return rowDate >= start && rowDate <= end && rowDate <= today
        })
    }

    if (selectedPeriod.value === 'monthly') {
        normalizeMonthRange()
        const start = new Date(`${monthlyStartMonth.value}-01T00:00:00`)
        const endMonth = addOneMonth(monthlyEndMonth.value)
        const end = new Date(`${endMonth}-01T00:00:00`)
        return rows.filter((row) => row.xDate >= start && row.xDate < end)
    }

    if (selectedPeriod.value === 'yearly') {
        normalizeYearRange()
        const start = new Date(`${yearlyStartYear.value}-01-01T00:00:00`)
        const end = new Date(`${Number(yearlyEndYear.value) + 1}-01-01T00:00:00`)
        return rows.filter((row) => row.xDate >= start && row.xDate < end)
    }

    return rows
}

function formatXAxisLabel(dateObj, rawX = null) {
    if (!dateObj && !rawX) return '—'

    const d = dateObj || parseApiDate(rawX)

    if (selectedPeriod.value === 'hourly') {
        return `${String(d.getHours()).padStart(2, '0')}:00`
    }

    if (selectedPeriod.value === 'daily' || selectedPeriod.value === 'weekly') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
            d.getDate()
        ).padStart(2, '0')}`
    }

    if (selectedPeriod.value === 'monthly') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }

    if (selectedPeriod.value === 'yearly') {
        return String(d.getFullYear())
    }

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
    ).padStart(2, '0')}`
}

function openDownloadModal() {
    reportMonth.value = getCurrentMonthValue()
    showDownloadModal.value = true
}

function closeDownloadModal() {
    showDownloadModal.value = false
}

async function generateMonthlyReport() {
    if (!reportMonth.value) return

    downloading.value = true

    Swal.fire({
        title: 'Generating Report...',
        text: `Preparing report for ${reportMonth.value}`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading()
        },
    })

    try {
        error.value = null

        const { data } = await axios.get(
            'http://localhost:8087/api/reports/power-meters/monthly',
            {
                params: {
                    template_path: 'Power Meters Template.xlsx',
                    report_path: 'Power Meters Report.xlsx',
                    month: reportMonth.value,
                    force: false,
                },
            }
        )

        console.log('Monthly report response:', data)

        closeDownloadModal()

        Swal.fire({
            icon: 'success',
            title: 'Report Generated!',
            text: `Report for ${reportMonth.value} has been saved to server.`,
            confirmButtonColor: '#2563eb',
        })
    } catch (err) {
        console.error('generateMonthlyReport error:', err)

        error.value =
            err?.response?.data?.message ||
            err?.message ||
            'Failed to generate monthly report'

        Swal.fire({
            icon: 'error',
            title: 'Failed',
            text: error.value,
            confirmButtonColor: '#dc2626',
        })
    } finally {
        downloading.value = false
    }
}

async function fetchEnergySummary() {
    const { data } = await axios.get('http://localhost:8087/api/energy-summary', {
        params: {
            target_date: selectedDate.value,
        },
    })

    if (!data?.success) {
        throw new Error('Invalid energy summary response')
    }

    summaryData.value = data

    const deviceRows = Array.isArray(data.devices) ? data.devices : []

    devices.value = deviceRows.map((device) => ({
        dev_eui: device.dev_eui,
        device_name: String(device.device_name || '').trim(),
        total_energy_kwh: device.total_energy_kwh ?? null,
        average_hourly_energy_kwh: device.average_hourly_energy_kwh ?? null,
        hours_with_data: device.hours_with_data ?? null,
        hasReading: Array.isArray(device.data) && device.data.length > 0,
        data: Array.isArray(device.data) ? device.data : [],
    }))
}

function addDaysToYmd(ymd, days) {
    const d = new Date(`${ymd}T00:00:00`)
    d.setDate(d.getDate() + days)

    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function aggregateRowsByYear(rows) {
    const buckets = new Map()

    for (const row of rows) {
        if (!row?.xDate) continue
        const year = row.xDate.getFullYear()
        buckets.set(year, Number(buckets.get(year) || 0) + Number(row.yValue || 0))
    }

    normalizeYearRange()
    const out = []
    for (let year = yearlyStartYear.value; year <= yearlyEndYear.value; year += 1) {
        out.push({
            x: String(year),
            label: String(year),
            xDate: new Date(`${year}-01-01T00:00:00`),
            yValue: Number(buckets.get(year) || 0),
        })
    }
    return out
}

function aggregateRowsByWeek(rows) {
    const buckets = new Map()

    for (const row of rows) {
        if (!row?.xDate) continue
        const week = getIsoWeekValue(row.xDate)
        buckets.set(week, Number(buckets.get(week) || 0) + Number(row.yValue || 0))
    }

    normalizeWeekRange()
    return listWeeksInclusive(weeklyStartWeek.value, weeklyEndWeek.value).map((week) => {
        const { start } = getWeekStartEnd(week)
        return {
            x: labelWeek(week),
            label: labelWeek(week),
            xDate: start,
            yValue: Number(buckets.get(week) || 0),
        }
    })
}

function aggregateRowsByMonth(rows) {
    const buckets = new Map()

    for (const row of rows) {
        if (!row?.xDate) continue
        const month = `${row.xDate.getFullYear()}-${String(row.xDate.getMonth() + 1).padStart(2, '0')}`
        buckets.set(month, Number(buckets.get(month) || 0) + Number(row.yValue || 0))
    }

    normalizeMonthRange()
    return listMonthsInclusive(monthlyStartMonth.value, monthlyEndMonth.value).map((month) => ({
        x: month,
        label: month,
        xDate: new Date(`${month}-01T00:00:00`),
        yValue: Number(buckets.get(month) || 0),
    }))
}

async function fetchGraphData(devEui = null) {
    const params = {
        granularity: selectedPeriod.value === 'yearly' ? 'monthly' : selectedPeriod.value,
        limit: 5000,
    }

    if (devEui) {
        params.dev_eui = devEui
    }

    if (selectedPeriod.value === 'daily') {
        normalizeDailyRange()

        params.start = `${dailyStartDate.value}T00:00:00`
        params.end = `${addDaysToYmd(dailyEndDate.value, 1)}T00:00:00`
    } else if (selectedPeriod.value === 'weekly') {
        normalizeWeekRange()
        const { start } = getWeekStartEnd(weeklyStartWeek.value)
        const { end } = getWeekStartEnd(weeklyEndWeek.value)
        end.setDate(end.getDate() + 1)

        params.start = toLocalDateTime(start)
        params.end = toLocalDateTime(end)
    } else if (selectedPeriod.value === 'monthly') {
        normalizeMonthRange()

        params.start = `${monthlyStartMonth.value}-01T00:00:00`
        params.end = `${addOneMonth(monthlyEndMonth.value)}-01T00:00:00`
    } else if (selectedPeriod.value === 'yearly') {
        normalizeYearRange()

        params.start = `${yearlyStartYear.value}-01-01T00:00:00`
        params.end = `${Number(yearlyEndYear.value) + 1}-01-01T00:00:00`
    }

    const { data } = await axios.get('http://localhost:8087/api/hourly-graph', { params })

    if (!data?.success || !Array.isArray(data.data)) {
        throw new Error(
            devEui
                ? `Invalid ${selectedPeriod.value} graph response for ${devEui}`
                : `Invalid ${selectedPeriod.value} graph response`
        )
    }

    return data.data
}

async function loadChartData() {
    chartLoading.value = true

    try {
        error.value = null

        let rows = []

        if (selectedDevice.value === 'overall') {
            rows = await fetchGraphData()
        } else {
            const selected = devices.value.find((d) => d.dev_eui === selectedDevice.value)

            if (!selected) {
                chartLabels.value = []
                chartValues.value = []
                return
            }

            rows = await fetchGraphData(selectedDevice.value)
        }

        let normalized = normalizeChartRows(rows)
        normalized = filterRowsBySelectedPeriod(normalized)
        if (selectedPeriod.value === 'weekly') {
            normalized = aggregateRowsByWeek(normalized)
        } else if (selectedPeriod.value === 'monthly') {
            normalized = aggregateRowsByMonth(normalized)
        } else if (selectedPeriod.value === 'yearly') {
            normalized = aggregateRowsByYear(normalized)
        }

        chartLabels.value = normalized.map((row) => row.label || formatXAxisLabel(row.xDate, row.x))
        chartValues.value = normalized.map((row) => Number(row.yValue.toFixed(3)))
    } catch (err) {
        console.error('loadChartData error:', err)
        error.value = err?.message || 'Failed to load chart data'
        chartLabels.value = []
        chartValues.value = []
    } finally {
        chartLoading.value = false
    }
}

async function reloadAll() {
    loading.value = true

    try {
        error.value = null

        if (selectedPeriod.value === 'daily') {
            normalizeDailyRange()
        } else if (selectedPeriod.value === 'weekly') {
            normalizeWeekRange()
        } else if (selectedPeriod.value === 'monthly') {
            normalizeMonthRange()
        } else if (selectedPeriod.value === 'yearly') {
            normalizeYearRange()
        }

        await fetchEnergySummary()
        await loadChartData()
    } catch (err) {
        console.error('reloadAll error:', err)
        error.value = err?.message || 'Failed to load tenant data'
    } finally {
        loading.value = false
    }
}

async function onChartFilterChange() {
    await reloadAll()
}

async function onPeriodChange() {
    await reloadAll()
}

onMounted(async () => {
    await reloadAll()
})
</script>

<style scoped>
.energy-management-container {
    margin: 0 auto;
    padding: 24px 28px;
    background: #0b1220;
    min-height: 100vh;
    color: #e5e7eb;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
}

.page-header-right {
    display: flex;
    align-items: center;
    gap: 10px;
}

.page-title {
    margin: 0;
    font-size: 24px;
    color: #f8fafc;
}

.breadcrumb {
    color: #9fb0ff;
}

.breadcrumb span {
    font-size: 14px;
    margin: 0 4px;
}

.icon-btn {
    display: inline-grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    cursor: pointer;
}

.icon-btn:hover {
    background: rgba(255, 255, 255, 0.18);
}

.icon-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.view-tab-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0 12px;
}

.view-tab-bar .view-tab-nav {
    flex: 1 1 auto;
    display: flex;
    gap: 10px;
    overflow-x: auto;
    white-space: nowrap;
    padding-bottom: 4px;
}

.view-tab-nav button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    color: #e5e7eb;
    cursor: pointer;
}

.view-tab-nav button.active {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    border-color: rgba(96, 165, 250, 0.55);
}

.meta-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 8px 0 18px;
}

.title-wrap h1 {
    margin: 6px 0 4px;
    font-size: 28px;
    color: #f8fafc;
}

.subtitle {
    margin: 0;
    color: #94a3b8;
    font-size: 14px;
}

.badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.14);
    color: #93c5fd;
    border: 1px solid rgba(59, 130, 246, 0.28);
    font-size: 12px;
}

.kpi-section-header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
}

.section-chip {
    display: inline-flex;
    align-items: center;
    padding: 5px 10px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.14);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #cbd5e1;
    font-size: 12px;
}

.grid {
    display: grid;
    gap: 18px;
}

.kpi-grid {
    margin-bottom: 18px;
}

.kpi-grid-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.charts-grid {
    grid-template-columns: 1fr;
}

.card {
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9));
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 18px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
    padding: 16px;
}

.kpi {
    position: relative;
    overflow: hidden;
    min-height: 150px;
}

.kpi-accent {
    position: absolute;
    inset: 0 auto 0 0;
    width: 5px;
    border-radius: 18px 0 0 18px;
}

.kpi-blue {
    background: #3b82f6;
}

.kpi-green {
    background: #10b981;
}

.kpi-orange {
    background: #f59e0b;
}

.kpi-top {
    display: flex;
    align-items: center;
    gap: 10px;
}

.kpi-icon {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
}

.kpi-label {
    font-size: 14px;
    color: #cbd5e1;
}

.kpi-value {
    font-weight: 700;
    color: #f8fafc;
    margin-top: 14px;
}

.kpi-value-small {
    font-size: 28px;
    line-height: 1.2;
}

.kpi-sub {
    margin-top: 8px;
    font-size: 13px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

.card-header h3 {
    margin: 0;
    color: #f8fafc;
}

.chart-toolbar {
    flex-wrap: wrap;
    margin-bottom: 14px;
}

.chart-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.dark-select {
    background: rgba(255, 255, 255, 0.08);
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 10px;
    padding: 8px 10px;
    min-height: 38px;
}

.chart-card {
    min-height: 520px;
}

.full-width-chart {
    width: 100%;
}

.chart-wrap {
    position: relative;
    min-height: 380px;
    height: 380px;
    padding-bottom: 40px;
    overflow: visible;
}

.table-wrap {
    overflow-x: auto;
}

.tenant-table {
    width: 100%;
    border-collapse: collapse;
}

.tenant-table th,
.tenant-table td {
    padding: 12px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    text-align: left;
    font-size: 14px;
}

.tenant-table th {
    color: #cbd5e1;
    font-weight: 600;
}

.sortable {
    cursor: pointer;
    user-select: none;
}

.sort-icon {
    margin-left: 6px;
    color: #94a3b8;
    font-size: 12px;
}

.status-pill {
    display: inline-flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
}

.status-online {
    background: rgba(16, 185, 129, 0.15);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.28);
}

.status-offline {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.28);
}

.wip-panel {
    min-height: 260px;
    border: 1px dashed rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    display: grid;
    place-items: center;
    text-align: center;
    background: rgba(255, 255, 255, 0.03);
}

.wip-title {
    font-size: 20px;
    font-weight: 700;
    color: #f8fafc;
}

.wip-sub {
    color: #94a3b8;
    margin-top: 6px;
}

.empty-cell {
    text-align: center !important;
    color: #94a3b8;
    padding: 24px !important;
}

.muted {
    color: #94a3b8;
}

.err {
    color: #fca5a5;
    margin-top: 8px;
    display: inline-block;
}

.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 16px;
}

.modal-card {
    width: 100%;
    max-width: 420px;
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95));
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 18px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
    overflow: hidden;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-header h3 {
    margin: 0;
    color: #f8fafc;
    font-size: 18px;
}

.modal-close-btn {
    display: inline-grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    cursor: pointer;
}

.modal-body {
    padding: 18px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-label {
    color: #cbd5e1;
    font-size: 14px;
    font-weight: 600;
}

.modal-input {
    width: 100%;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 18px 18px;
}

.modal-btn {
    border: none;
    border-radius: 10px;
    padding: 10px 16px;
    font-weight: 600;
    cursor: pointer;
    min-height: 40px;
}

.primary-btn {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #fff;
}

.secondary-btn {
    background: rgba(255, 255, 255, 0.08);
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, 0.12);
}

.modal-btn:disabled,
.modal-close-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

@media (max-width: 1100px) {
    .kpi-grid-3 {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .energy-management-container {
        padding: 18px;
    }

    .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }

    .card-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .chart-wrap {
        height: 320px;
        min-height: 320px;
    }
}

.dark-select {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 10px;
    padding: 8px 10px;
    min-height: 38px;
}

.dark-select option {
    background: #0f172a;
    color: #ffffff;
}

.dark-select:focus {
    color: #ffffff;
    outline: none;
    border-color: rgba(96, 165, 250, 0.7);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.kpi-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}
</style>
