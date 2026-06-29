<template>
    <div class="air-management-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Air Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt; <span>Management</span> &gt; <span>Air Management</span>
            </nav>
        </div>

        <!-- Primary Tabs -->
        <div class="tab-nav">
            <button :class="{ active: currentTab === 'overview' }" @click="currentTab = 'overview'">Overview</button>
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
        <!-- OVERVIEW -->
        <!-- ========================= -->
        <section v-if="currentTab === 'overview'" class="overview">
            <!-- Meta strip -->
            <div class="overview-header">
                <div class="ov-left">
                    <span class="badge">Airside</span>
                    <h1 class="ov-title">{{ currentSubTab }} — Overview</h1>
                    <p class="ov-sub">AHU power & kW/RT efficiency snapshot</p>
                </div>
                <div class="ov-right">
                    <div class="ov-chip"><span class="dot ok"></span> Normal</div>
                    <div class="ov-chip">Updated: <strong>{{ lastUpdated }}</strong></div>
                </div>
            </div>

            <!-- KPI row -->
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

            <!-- Charts -->
            <div class="ov-charts">
                <div class="card-wrapper chart-card">
                    <div class="ov-card-head">
                        <h3>Airside & Plant Efficiency • Today</h3>
                        <div class="actions">
                            <button class="chip active">1D</button>
                        </div>
                    </div>
                    <LineChartCard :title="' '" :chartData="effChartData" :options="effChartOpts" />
                </div>

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
            </div>
        </section>

        <!-- ========================= -->
        <!-- Download -->
        <!-- ========================= -->
        <section v-if="currentTab === 'download'" class="tab-content">
            <h2>Download Full Dataset (CSV)</h2>
            <button class="download-button" @click="downloadCSV">
                <i class="fas fa-download"></i> Download CSV
            </button>
            <p class="note">CSV includes KPIs and today’s slot data (airside_eff, cp_eff).</p>
        </section>
    </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import LineChartCard from '../components/LineChartCard.vue'
import ValueCard from '../components/ValueCard.vue'
import { useMqtt } from '../composables/useMqtt'

const { ensureConnected, metrics } = useMqtt()
ensureConnected()

/* Tabs / Campus */
const currentTab = ref('overview')
const campusTabs = [
    'ITE CC & HQ', 'Block A Auditorium', 'Block A Admin',
    'Block B', 'Block C', 'Block D', 'Block E',
    'Block F', 'Block G', 'Block H', 'Block J', 'Block K'
]
const currentSubTab = ref(campusTabs[0])
watch(currentTab, t => { if (t !== 'download') currentSubTab.value = campusTabs[0] })

/* Data wires */
// helper to parse timestamp safely
const toDate = ts => ts ? new Date(ts) : null

const airLatest = computed(() => {
    const arr = airSlot.value || []
    if (!arr.length) return null
    return arr.reduce((latest, cur) => {
        const latestTs = toDate(latest?.ts_sgt || latest?.ts_utc)
        const curTs = toDate(cur?.ts_sgt || cur?.ts_utc)
        return (curTs && (!latestTs || curTs > latestTs)) ? cur : latest
    }, null)
})

const airSlot = computed(() => metrics?.airside?.slot || [])

/* Time helpers */
function isToday(tsISO) {
    if (!tsISO) return false
    const d = new Date(tsISO)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}
const byTs = (a, b) => Date.parse(a.ts_sgt || a.ts_utc || 0) - Date.parse(b.ts_sgt || b.ts_utc || 0)

/* Updated label */
const lastUpdated = computed(() => airLatest.value?.ts_sgt || airLatest.value?.ts_utc || new Date().toLocaleString())

/* Formatters */
// helpers
const numOr0 = n => (n == null ? 0 : Number(n))
const fmt = (n, d = 2) => Number(numOr0(n)).toFixed(d)
const fmt0 = n => fmt(n, 0)
const fmt1 = n => fmt(n, 1)
const fmt2 = n => fmt(n, 2)


/* KPI values from latest */
const kpi_airside_kw = computed(() => fmt1(airLatest.value?.total_ahu_kw))
const kpi_airside_eff = computed(() => fmt2(airLatest.value?.airside_eff))
const kpi_cp_eff = computed(() => fmt2(airLatest.value?.cp_eff))

const kpi_total_rt = computed(() => fmt0(airLatest.value?.total_rt))

const kpi_tse = computed(() => {
    const l = airLatest.value
    // use 0 if null
    const cp = numOr0(l?.cp_eff)
    const air = numOr0(l?.airside_eff)
    return fmt2(cp + air)
})



/* KPI tiles (6) */
const overviewKpis = computed(() => [
    { label: 'Airside Power', value: kpi_airside_kw.value, unit: 'kW', sub: 'AHU total', icon: 'fas fa-fan', bg: '#0ea5e9' },
    { label: 'Airside kW/RT', value: kpi_airside_eff.value, unit: 'kW/RT', sub: 'lower is better', icon: 'fas fa-tachometer-alt', bg: '#10b981' },
    { label: 'Plant kW/RT', value: kpi_cp_eff.value, unit: 'kW/RT', sub: 'from plant', icon: 'fas fa-industry', bg: '#7c3aed' },
    { label: 'Total System kW/RT', value: kpi_tse.value, unit: 'kW/RT', sub: 'plant+airside', icon: 'fas fa-bolt', bg: '#f59e0b' },
    { label: 'Cooling Load', value: kpi_total_rt.value, unit: 'RT', sub: 'from waterside', icon: 'fas fa-thermometer-half', bg: '#2563eb' },
    { label: 'Status', value: 'OK', unit: '', sub: lastUpdated.value, icon: 'fas fa-check-circle', bg: '#22c55e' }
])

/* Today’s slot points */
const todaySlot = computed(() =>
    (airSlot.value || []).filter(p => isToday(p.ts_sgt || p.ts_utc)).sort(byTs)
)

/* Line chart: airside_eff & cp_eff today */
const effChartData = computed(() => {
    const pts = todaySlot.value
    if (!pts.length) {
        const labels = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00']
        return {
            labels, datasets: [
                { label: 'Airside kW/RT', data: labels.map(() => 0), tension: 0.35, fill: false, borderWidth: 2, yAxisID: 'y1' },
                { label: 'Plant kW/RT', data: labels.map(() => 0), tension: 0.35, fill: false, borderWidth: 2, yAxisID: 'y1' }
            ]
        }
    }

    const labels = pts.map(p => {
        const d = new Date(p.ts_sgt || p.ts_utc)
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
    const air = pts.map(p => numOr0(p.airside_eff))
    const cp = pts.map(p => numOr0(p.cp_eff))


    return {
        labels,
        datasets: [
            { label: 'Airside kW/RT', data: air, tension: 0.35, fill: false, borderWidth: 2, yAxisID: 'y1' },
            { label: 'Plant kW/RT', data: cp, tension: 0.35, fill: false, borderWidth: 2, yAxisID: 'y1' }
        ]
    }
})

const effChartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
        y1: { type: 'linear', position: 'left', beginAtZero: true, ticks: { color: '#cbd5e1' } },
        x: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,.12)' } }
    },
    plugins: { legend: { labels: { color: '#cbd5e1' } } }
}

/* Table rows */
const latestRows = computed(() => {
    const l = airLatest.value || {}
    return [
        { label: 'Total AHU Power', value: `${fmt1(l.total_ahu_kw)} kW`, note: 'Sum of AHU active power' },
        { label: 'Cooling Load', value: `${fmt0(l.total_rt)} RT`, note: 'Carried from waterside' },
        { label: 'Plant kW/RT', value: `${fmt2(l.cp_eff)} kW/RT`, note: 'cp_kw / total_rt' },
        { label: 'Airside kW/RT', value: `${fmt2(l.airside_eff)} kW/RT`, note: 'total_ahu_kw / total_rt' },
        { label: 'Total System kW/RT', value: `${fmt2(numOr0(l.cp_eff) + numOr0(l.airside_eff))} kW/RT`, note: 'cp_eff + airside_eff' }
    ]
})


/* CSV */
function downloadCSV() {
    const header = ['ts_sgt', 'ts_utc', 'total_ahu_kw', 'total_rt', 'cp_eff', 'airside_eff', 'tse'].join(',')
    const today = todaySlot.value
    const rows = today.length ? today.map(p =>
        [p.ts_sgt ?? '', p.ts_utc ?? '', p.total_ahu_kw ?? '', p.total_rt ?? '', p.cp_eff ?? '', p.airside_eff ?? '', p.tse ?? ''].join(',')
    ) : []
    const blob = new Blob([[header, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'airside_today.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
}
</script>

<style scoped>
/* Base (match your dark theme) */
.air-management-container {
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

/* Tabs */
.tab-nav {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
}

.tab-nav button {
    padding: 6px 12px;
    border: none;
    background: rgba(255, 255, 255, .1);
    border-radius: 4px;
    font-weight: bold;
    color: white;
    cursor: pointer;
    font-size: .9rem;
}

.tab-nav button:hover {
    background: rgba(255, 255, 255, .2);
}

.tab-nav button.active {
    background: #1976d2;
    color: white;
}

/* Sub tabs */
.sub-tab-nav {
    display: flex;
    gap: 10px;
    margin: 16px 0;
}

.sub-tab-nav button {
    padding: 6px 12px;
    border: none;
    background: rgba(255, 255, 255, .1);
    border-radius: 4px;
    font-weight: bold;
    color: white;
    cursor: pointer;
    font-size: .9rem;
}

.sub-tab-nav button.active {
    background: #1976d2;
    color: white;
}

/* Overview header */
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
    border: 1px solid rgba(255, 255, 255, .08);
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

/* KPI row */
.ov-kpis {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px;
}

.ov-kpi {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, .08);
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

/* Charts + table */
.ov-charts {
    display: grid;
    grid-template-columns: 2fr 1.3fr;
    gap: 10px;
    margin-bottom: 12px;
}

.card-wrapper {
    background: #1e2a47;
    color: white;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, .2);
}

.chart-card {
    background: #1e2a47;
    border-radius: 8px;
    padding: 8px;
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
    border-bottom: 1px solid rgba(255, 255, 255, .06);
}

th {
    color: #cbd5e1;
    font-weight: 600;
}

.muted {
    color: #cbd5e1;
    opacity: .85;
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
    color: rgba(255, 255, 255, .8);
}

/* Responsive */
@media (max-width:1100px) {
    .ov-kpis {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .ov-charts {
        grid-template-columns: 1fr;
    }
}

@media (max-width:768px) {
    .air-management-container {
        padding: 10px;
    }

    .tab-nav {
        flex-direction: column;
        gap: 8px;
    }

    .sub-tab-nav {
        flex-wrap: wrap;
    }

    .ov-kpis {
        grid-template-columns: 1fr !important;
    }
}
</style>
