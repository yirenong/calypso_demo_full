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
            <button :class="{ active: currentTab === 'overview' }" @click="currentTab = 'overview'">Overview</button>
            <button :class="{ active: currentTab === 'download' }" @click="currentTab = 'download'">Download
                Data</button>
        </div>

        <!-- ========================= -->
        <!-- OVERVIEW (hooked to hourly energy) -->
        <!-- ========================= -->
        <section v-if="currentTab === 'overview'" class="tab-content overview">
            <div class="overview-header">
                <div class="ov-left">
                    <span class="badge">Hourly Energy</span>
                    <h1 class="ov-title">Overview — {{ overviewBuilding }}</h1>
                    <p class="ov-sub">System/Plant/Air power &amp; system kW/RT, hourly · <strong>{{ periodLabel
                    }}</strong></p>
                </div>
                <div class="ov-right">
                    <div class="ov-chip"><span class="dot ok"></span> Normal</div>
                    <div class="ov-chip">Updated: <strong>{{ energyLastUpdated }}</strong></div>
                    <div class="period-toggle">
                        <button :class="{ active: period === 'business' }" @click="period = 'business'">
                            Business
                        </button>
                        <button :class="{ active: period === 'afterhours' }" @click="period = 'afterhours'">
                            After Hours
                        </button>
                    </div>

                </div>

            </div>

            <!-- KPI row -->
            <div class="ov-kpis">
                <div class="ov-kpi" v-for="k in overviewKpis" :key="k.label">
                    <div class="ov-kpi-top">
                        <div class="ov-kpi-ico" :style="{ background: k.bg }"><i :class="k.icon" /></div>
                        <div class="ov-kpi-label">{{ k.label }}</div>
                    </div>
                    <div class="ov-kpi-val">
                        {{ k.value }} <small v-if="k.unit">{{ k.unit }}</small>
                    </div>
                    <div class="ov-kpi-sub" v-if="k.sub">{{ k.sub }}</div>
                </div>
            </div>

            <div class="ov-charts">
                <!-- Hourly kW line -->
                <div class="card-wrapper chart-card">
                    <div class="ov-card-head">
                        <h3>Electrical Intake (kW_system) • Today • {{ periodLabel }}</h3>
                        <div class="actions"><button class="chip active">1D</button></div>
                    </div>
                    <LineChartCard :title="' '" :chartData="intakeChartData" :options="intakeChartOpts" />
                </div>

                <!-- Latest non-null metrics of the latest hour -->
                <div class="card-wrapper">
                    <div class="ov-card-head">
                        <h3>Key Metrics • {{ periodLabel }}</h3>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in latestRows" :key="row.label">
                                    <td>{{ row.label }}</td>
                                    <td>{{ row.value }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>

        <!-- ========================= -->
        <!-- CHILLER (visual stub; unchanged behavior) -->
        <!-- ========================= -->
        <section v-if="currentTab === 'chiller'" class="tab-content">
            <h2>Chiller Plant Energy</h2>
            <div class="chiller-top-grid">
                <div v-for="type in chillerTopMetrics" :key="type" class="card-wrapper value-card">
                    <ValueCard :title="type" :value="randomInt(250, 950)" />
                </div>
            </div>
            <div class="chiller-bottom-grid">
                <div class="card-wrapper chart-card">
                    <LineChartCard :title="'Demo — Plant Power (kW)'" :chartData="demoLine.chartData"
                        :options="demoLine.options" />
                </div>
                <div class="card-wrapper chart-card">
                    <LineChartCard :title="'Demo — Plant kW/RT'" :chartData="demoLine2.chartData"
                        :options="demoLine2.options" />
                </div>
                <div class="card-wrapper chart-card">
                    <LineChartCard :title="'Demo — System kW/RT'" :chartData="demoLine3.chartData"
                        :options="demoLine3.options" />
                </div>
                <div class="card-wrapper chart-card">
                    <LineChartCard :title="'Demo — Airside Power (kW)'" :chartData="demoLine4.chartData"
                        :options="demoLine4.options" />
                </div>
            </div>
        </section>

        <!-- ========================= -->
        <!-- CAMPUS (visual; unchanged) -->
        <!-- ========================= -->
        <section v-if="currentTab === 'campus'" class="tab-content">
            <div class="ov-card-head" style="margin-bottom:8px">
                <h2 style="margin:0">Campus Electrical Energy — {{ currentSubTab }} • {{ periodLabel }}</h2>
            </div>
            <div class="cards-grid">
                <div class="card-wrapper value-card">
                    <ValueCard title="Today’s Estimated Intake (kWh)" :value="todayEstIntakeKwh" />
                </div>
                <div class="card-wrapper value-card">
                    <ValueCard title="Today’s Estimated Usage (kWh)" :value="Math.round(todayEstIntakeKwh * 0.88)" />
                </div>
                <div class="card-wrapper value-card">
                    <ValueCard title="Campus TSE (kW/RT)" :value="showNum2(latestTSE)" />
                </div>
            </div>

            <div class="cards-grid">
                <div class="card-wrapper chart-card">
                    <LineChartCard :title="'kW_system — Today • ' + periodLabel" :chartData="intakeChartData"
                        :options="intakeChartOpts" />
                </div>
                <div class="card-wrapper chart-card">
                    <LineChartCard :title="'kW_plant — Today • ' + periodLabel" :chartData="plantChartData"
                        :options="intakeChartOpts" />
                </div>
                <div class="card-wrapper chart-card">
                    <LineChartCard :title="'kW_air_measured — Today • ' + periodLabel" :chartData="airChartData"
                        :options="intakeChartOpts" />
                </div>
            </div>
        </section>

        <!-- ========================= -->
        <!-- Download -->
        <!-- ========================= -->
        <section v-if="currentTab === 'download'" class="tab-content">
            <h2>Download Hourly Energy (Today) — CSV</h2>
            <button class="download-button" @click="downloadCSV"><i class="fas fa-download"></i> Download CSV</button>
            <p class="note">
                Exports today’s hourly values for: ts_hour, kW_system, kW_plant, kW_air_measured,
                tse_kw_per_rt, kWh_system, kWh_plant, kWh_air_measured.
            </p>
        </section>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import LineChartCard from '../components/LineChartCard.vue'
import ValueCard from '../components/ValueCard.vue'
import { useMqtt } from '../composables/useMqtt'

const { ensureConnected, getHourly } = useMqtt()
ensureConnected()

/* ───────────────── helpers ───────────────── */
const campusTabs = [
    'ITE CC & HQ', 'Block A Auditorium', 'Block A Admin',
    'Block B', 'Block C', 'Block D', 'Block E',
    'Block F', 'Block G', 'Block H', 'Block J', 'Block K'
]
const currentTab = ref('overview')
const currentSubTab = ref(campusTabs[0])
const overviewBuilding = computed(() => currentSubTab.value)

const randomInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1))
const toNumOrNull = (n) => {
    const v = Number(n)
    return Number.isFinite(v) ? v : null
}
const showNum = (n, d = 2) => {
    const v = Number(n)
    return Number.isFinite(v) ? v.toFixed(d) : '—'
}
const showNum1 = (n) => showNum(n, 1)
const showNum2 = (n) => showNum(n, 2)
const isSameLocalDay = (iso, ref = new Date()) => {
  if (!iso) return false
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear()
    && d.getMonth() === ref.getMonth()
    && d.getDate() === ref.getDate()
}


/* ───────────────── period toggle (no merging) ───────────────── */
const period = ref('business') // 'business' | 'afterhours'
const periodLabel = computed(() => (period.value === 'business' ? 'Business' : 'Afterhours'))

// Selected hourly bucket
const energySel = computed(() => getHourly('energy', period.value) || { latest: null, slot: [] })

// Only the selected period’s rows (today)
const selectedDayRows = computed(() => {
  const arr = energySel.value?.slot || []
  if (!arr.length) return []

  // try today first
  const todayRows = arr
    .filter(p => isSameLocalDay(p?.ts_hour, new Date()))
    .map(p => ({ ...p, _ts: p.ts_hour }))
  if (todayRows.length) {
    return todayRows.sort((a, b) => Date.parse(a._ts) - Date.parse(b._ts))
  }

  // fallback: the day of the latest sample in this period
  const latestTs = energySel.value?.latest?.ts_hour || arr.at(-1)?.ts_hour
  if (!latestTs) return []
  const ref = new Date(latestTs)
  const refRows = arr
    .filter(p => isSameLocalDay(p?.ts_hour, ref))
    .map(p => ({ ...p, _ts: p.ts_hour }))
  return refRows.sort((a, b) => Date.parse(a._ts) - Date.parse(b._ts))
})


// Latest sample for the selected period
const latestEnergy = computed(() => energySel.value?.latest || energySel.value?.slot?.at(-1) || null)

/* ───────────────── updated label ───────────────── */
const energyLastUpdated = computed(() => latestEnergy.value?.ts_hour || new Date().toLocaleString())

/* ───────────────── KPIs (latest hour) ───────────────── */
const kpi_kW_system = computed(() => showNum1(latestEnergy.value?.kW_system))
const kpi_kW_plant = computed(() => showNum1(latestEnergy.value?.kW_plant))
const kpi_kW_air = computed(() => showNum1(latestEnergy.value?.kW_air_measured))
const kpi_tse = computed(() => showNum2(latestEnergy.value?.tse_kw_per_rt))
const kpi_kWh_system = computed(() => showNum1(latestEnergy.value?.kWh_system))
const kpi_kWh_plant = computed(() => showNum1(latestEnergy.value?.kWh_plant))

const overviewKpis = computed(() => [
    { label: 'System Power', value: kpi_kW_system.value, unit: 'kW', sub: 'kW_system', icon: 'fas fa-bolt', bg: '#2563eb' },
    { label: 'Plant Power', value: kpi_kW_plant.value, unit: 'kW', sub: 'kW_plant', icon: 'fas fa-industry', bg: '#7c3aed' },
    { label: 'Airside Power', value: showNum2(Number(latestEnergy.value?.kW_plant) - Number(latestEnergy.value?.kW_system)), unit: 'kW', sub: 'kW_air_measured', icon: 'fas fa-fan', bg: '#0ea5e9' },
    { label: 'System kW/RT', value: kpi_tse.value, unit: 'kW/RT', sub: 'tse_kw_per_rt', icon: 'fas fa-tachometer-alt', bg: '#f59e0b' },
    { label: 'System Energy', value: kpi_kWh_system.value, unit: 'kWh', sub: 'kWh_system (hour)', icon: 'fas fa-plug', bg: '#059669' },
    { label: 'Plant Energy', value: kpi_kWh_plant.value, unit: 'kWh', sub: 'kWh_plant (hour)', icon: 'fas fa-charging-station', bg: '#c026d3' }
])

/* ───────────────── charts (today, selected period) ───────────────── */
function lineFromToday(key, label, decimals = 2) {
  const labels = selectedDayRows.value.map(p =>
    new Date(p._ts).toLocaleTimeString([], { hour: '2-digit' })
  )
  const data = selectedDayRows.value.map(p => {
    const v = toNumOrNull(p?.[key])
    return v == null ? null : Number(v.toFixed(decimals))
  })
  return {
    labels,
    datasets: [{ label, data, borderWidth: 2, tension: 0.35, pointRadius: 2, fill: false }]
  }
}


const intakeChartData = computed(() => lineFromToday('kW_system', 'kW_system', 1))
const plantChartData = computed(() => lineFromToday('kW_plant', 'kW_plant', 1))
const airChartData = computed(() => lineFromToday('kW_air_measured', 'kW_air_measured', 1))

const intakeChartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
        y: { beginAtZero: true, ticks: { color: '#cbd5e1' } },
        x: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,.12)' } }
    },
    plugins: { legend: { labels: { color: '#cbd5e1' } } }
}

/* ───────────────── table: latest non-null rows (selected period) ───────────────── */
const latestRows = computed(() => {
    const l = latestEnergy.value || {}
    const fields = [
        ['ts_hour', 'Timestamp'],
        ['kW_system', 'kW_system (kW)'],
        ['kW_plant', 'kW_plant (kW)'],
        ['kW_air_measured', 'kW_air_measured (kW)'],
        ['tse_kw_per_rt', 'System kW/RT'],
        ['kWh_system', 'kWh_system (hour)'],
        ['kWh_plant', 'kWh_plant (hour)'],
        ['kWh_air_measured', 'kWh_air_measured (hour)']
    ]
    return fields
        .filter(([k]) => l[k] != null)
        .map(([k, label]) => {
            const v = l[k]
            if (typeof v === 'number') {
                const isKWh = k.startsWith('kWh')
                const dp = isKWh || k === 'tse_kw_per_rt' ? 2 : 1
                return { label, value: showNum(v, dp) }
            }
            return { label, value: v == null ? '—' : String(v) }
        })
})

/* ───────────────── campus section (selected period) ───────────────── */
const todayEstIntakeKwh = computed(() =>
  selectedDayRows.value.reduce((sum, p) => {
    const v = Number(p?.kWh_system)
    return Number.isFinite(v) ? sum + v : sum
  }, 0)
)

const latestTSE = computed(() => latestEnergy.value?.tse_kw_per_rt ?? null)

/* ───────────────── demo charts for chiller tab ───────────────── */
function demoLineGen(name) {
    const labels = Array.from({ length: 10 }, (_, i) => `${8 + i}:00`)
    const data = labels.map(() => Math.round(300 + Math.random() * 300))
    return {
        chartData: { labels, datasets: [{ label: name, data, borderWidth: 2, tension: 0.35, pointRadius: 2 }] },
        options: intakeChartOpts
    }
}
const chillerTopMetrics = ['Plant kW', 'Chiller kW', 'CT kW', 'CWP kW']
const demoLine = demoLineGen('Plant kW')
const demoLine2 = demoLineGen('Plant kW/RT')
const demoLine3 = demoLineGen('System kW/RT')
const demoLine4 = demoLineGen('Airside kW')

/* ───────────────── CSV (today, selected period only) ───────────────── */
function downloadCSV() {
    const header = [
        'ts_hour',
        'kW_system',
        'kW_plant',
        'kW_air_measured',
        'tse_kw_per_rt',
        'kWh_system',
        'kWh_plant',
        'kWh_air_measured'
    ]
    const rows = todayEnergy.value.map((p) => ([
        p.ts_hour ?? '',
        p.kW_system ?? '',
        p.kW_plant ?? '',
        p.kW_air_measured ?? '',
        p.tse_kw_per_rt ?? '',
        p.kWh_system ?? '',
        p.kWh_plant ?? '',
        p.kWh_air_measured ?? ''
    ].join(',')))

    const blob = new Blob([[header.join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `energy_hourly_today_${period.value}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
}
</script>

<style scoped>
/* (reuse your existing styles) */
.power-management-container {
    padding: 20px;
    font-family: sans-serif;
    background-color: #0a1f44;
    min-height: 100vh;
    color: white
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px
}

.page-title {
    font-size: 24px;
    margin: 0;
    color: white
}

.breadcrumb span {
    font-size: 14px;
    color: white;
    margin: 0 4px
}

.tab-nav {
    display: flex;
    gap: 10px;
    margin-bottom: 16px
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
    transition: background .2s
}

.tab-nav button:hover {
    background: rgba(255, 255, 255, .2)
}

.tab-nav button.active {
    background: #1976d2;
    color: white
}

.sub-tab-nav {
    display: flex;
    gap: 10px;
    margin: 16px 0
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
    transition: background .2s
}

.sub-tab-nav button.active {
    background: #1976d2;
    color: white
}

/* NEW: Business/Afterhours toggle */
.period-nav {
    display: flex;
    gap: 10px;
    margin: 4px 0 16px;
}

.period-nav button {
    padding: 6px 12px;
    border: none;
    background: rgba(255, 255, 255, .1);
    border-radius: 4px;
    font-weight: bold;
    color: white;
    cursor: pointer;
    font-size: .9rem;
    transition: background .2s;
}

.period-nav button:hover {
    background: rgba(255, 255, 255, .2);
}

.period-nav button.active {
    background: #1976d2;
    color: white;
}

.overview .card-wrapper {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 12px;
    padding: 12px
}

.overview-header {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    align-items: start;
    margin-bottom: 12px
}

.badge {
    display: inline-block;
    background: rgba(34, 197, 94, .15);
    color: #86efac;
    font-size: .75rem;
    padding: 4px 8px;
    border-radius: 999px
}

.ov-title {
    margin: 6px 0 2px;
    font-size: 1.3rem
}

.ov-sub {
    color: #cbd5e1;
    margin: 0;
    font-size: .9rem
}

.ov-right {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center
}

.ov-chip {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, .08);
    padding: 8px 10px;
    border-radius: 10px;
    font-size: .85rem;
    display: flex;
    align-items: center;
    gap: 8px
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    display: inline-block
}

.dot.ok {
    background: #22c55e
}

.ov-kpis {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px
}

.ov-kpi {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 12px;
    padding: 12px
}

.ov-kpi-top {
    display: flex;
    align-items: center;
    gap: 10px
}

.ov-kpi-ico {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #fff
}

.ov-kpi-label {
    color: #cbd5e1;
    font-size: .85rem
}

.ov-kpi-val {
    font-size: 1.45rem;
    font-weight: 700;
    margin-top: 4px
}

.ov-kpi-val small {
    font-weight: 500;
    color: #cbd5e1;
    margin-left: 2px
}

.ov-kpi-sub {
    color: #cbd5e1;
    font-size: .8rem;
    margin-top: 2px
}

.ov-charts {
    display: grid;
    grid-template-columns: 2fr 1.3fr;
    gap: 10px;
    margin-bottom: 12px
}

.card-wrapper {
    background: #1e2a47;
    color: white;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, .2)
}

.chart-card {
    background: #1e2a47;
    border-radius: 8px;
    padding: 8px
}

.ov-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px
}

.ov-card-head h3 {
    margin: 0;
    font-size: 1rem
}

.actions .chip {
    font-size: .8rem;
    color: white;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .15);
    padding: 6px 10px;
    border-radius: 999px;
    cursor: pointer
}

.actions .chip.active {
    background: #1976d2;
    border-color: #1976d2
}

.table-wrap {
    overflow: auto
}

table {
    width: 100%;
    border-collapse: collapse
}

th,
td {
    text-align: left;
    padding: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, .06)
}

th {
    color: #cbd5e1;
    font-weight: 600
}

.note {
    margin-top: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, .8)
}

.chiller-top-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 12px
}

.chiller-bottom-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 16px
}

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
    font-size: .9rem
}

.download-button:hover {
    background: #125ea3
}

@media (max-width:1100px) {
    .ov-kpis {
        grid-template-columns: repeat(3, minmax(0, 1fr))
    }

    .ov-charts {
        grid-template-columns: 1fr
    }
}

@media (max-width:768px) {
    .power-management-container {
        padding: 10px
    }

    .tab-nav {
        flex-direction: column;
        gap: 8px
    }

    .sub-tab-nav {
        flex-wrap: wrap
    }

    .chiller-top-grid,
    .chiller-bottom-grid {
        grid-template-columns: 1fr !important
    }

    .ov-kpis {
        grid-template-columns: 1fr !important
    }
}

/* inline beside the chips */
.period-toggle {
    display: inline-flex;
    gap: 8px;
    margin-left: 8px;
}

/* base pill */
.period-toggle button {
    appearance: none;
    border: 1px solid rgba(255, 255, 255, .16);
    background: linear-gradient(180deg, #253557, #1a2a4b);
    color: #dbe7ff;
    border-radius: 999px;
    padding: 8px 16px;
    font-weight: 700;
    letter-spacing: .2px;
    cursor: pointer;
    transition: filter .18s ease, transform .08s ease, background .18s ease, border-color .18s ease;
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, .08),
        0 4px 10px rgba(0, 0, 0, .25);
}

/* hover/active press */
.period-toggle button:hover {
    filter: brightness(1.08);
}

.period-toggle button:active {
    transform: translateY(1px);
}

/* selected pill */
.period-toggle button.active {
    color: #fff;
    background: linear-gradient(180deg, #2f76ff 0%, #1d5fe5 100%);
    border-color: rgba(59, 130, 246, .7);
    box-shadow:
        0 6px 16px rgba(29, 95, 229, .35),
        inset 0 1px 0 rgba(255, 255, 255, .18);
}

/* optional: focus ring for keyboard users */
.period-toggle button:focus-visible {
    outline: 2px solid #60a5fa;
    outline-offset: 2px;
    border-color: #60a5fa;
}
</style>
