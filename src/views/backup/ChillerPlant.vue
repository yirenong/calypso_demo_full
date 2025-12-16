<template>
    <div class="chiller-plant-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Chiller Plant</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt; <span>Management</span> &gt; <span>Chiller Plant</span>
            </nav>
        </div>

        <!-- Period chips -->
        <div class="tab-nav">
            <button class="chip" :class="{ active: period === '1D' }" @click="period = '1D'">1D</button>
            <button class="chip" :class="{ active: period === '1W' }" @click="period = '1W'">1W</button>
            <button class="chip" :class="{ active: period === '1M' }" @click="period = '1M'">1M</button>
            <div class="spacer"></div>
            <div class="ov-chip">Updated: <strong>{{ lastUpdated }}</strong></div>
        </div>

        <!-- KPI tiles (raw passthrough from latest, 2dp) -->
        <section class="kpi-grid">
            <div class="kpi" v-for="k in kpis" :key="k.label">
                <div class="kpi-top">
                    <div class="kpi-ico" :style="{ background: k.bg }"><i :class="k.icon" /></div>
                    <div class="kpi-label">{{ k.label }}</div>
                </div>
                <div class="kpi-val">{{ k.value }} <small v-if="k.unit">{{ k.unit }}</small></div>
                <div class="kpi-sub" v-if="k.sub">{{ k.sub }}</div>
            </div>
        </section>

        <!-- Charts -->
        <section class="charts-grid">
            <div class="card chart-card">
                <div class="ov-card-head">
                    <h3>kW/RT (Total &amp; CP) • {{ periodLabel }}</h3>
                </div>
                <LineChartCard :title="' '" :chartData="kwrtChart.chartData" :options="kwrtChart.options" />
            </div>

            <div class="card chart-card">
                <div class="ov-card-head">
                    <h3>COP (Total &amp; CP) • {{ periodLabel }}</h3>
                </div>
                <LineChartCard :title="' '" :chartData="copChart.chartData" :options="copChart.options" />
            </div>

            <div class="card chart-card">
                <div class="ov-card-head">
                    <h3>Temps • HDR CHWS / HDR CHWR / WS Wet Bulb • {{ periodLabel }}</h3>
                </div>
                <LineChartCard :title="' '" :chartData="tempsChart.chartData" :options="tempsChart.options" />
            </div>
        </section>

        <!-- Raw latest (both topics) -->
        <section class="raw-grid">
            <div class="card">
                <div class="ov-card-head">
                    <h3>plant_advanced — Latest (raw)</h3>
                </div>
                <pre class="json">{{ pretty(advLatest) }}</pre>
            </div>
            <div class="card">
                <div class="ov-card-head">
                    <h3>Chiller_ITE_1210_1210 — Latest (raw)</h3>
                </div>
                <pre class="json">{{ pretty(trendLatest) }}</pre>
            </div>
        </section>

        <div class="actions-row">
            <button class="download-button" @click="downloadCSV">
                <i class="fas fa-download"></i> Download CSV
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import LineChartCard from '../components/LineChartCard.vue'
import { useMqtt } from '../composables/useMqtt'

const { ensureConnected, metrics } = useMqtt()
ensureConnected()

/* ===== MQTT wires ===== */
const adv = computed(() => metrics?.plant_advanced || {}) // bms/metrics/plant_advanced
const advLatest = computed(() => adv.value?.latest || null)
const advSlot = computed(() => adv.value?.slot || [])

const trend = computed(() => metrics?.trend?.['Chiller_ITE_1210_1210'] || {})
const trendLatest = computed(() => trend.value?.latest || null)
const trendSlot = computed(() => trend.value?.slot || [])

/* ===== Helpers ===== */
const fmt2 = n => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00')
const round2 = arr => arr.map(v => (Number.isFinite(Number(v)) ? +Number(Number(v).toFixed(2)) : 0))
const pretty = v => (v ? JSON.stringify(v, null, 2) : 'null')

function pickTsISO(p) {
    // plant_advanced uses ts_sgt / ts_utc
    if (p?.ts_sgt) return p.ts_sgt
    if (p?.ts_utc) return p.ts_utc
    // trend uses minute_iso or epoch seconds
    if (p?.minute_iso) return p.minute_iso
    if (p?.ts) return new Date(p.ts * 1000).toISOString()
    return null
}

function isSameLocalDay(iso, ref = new Date()) {
    if (!iso) return false
    const d = new Date(iso)
    return d.getFullYear() === ref.getFullYear() &&
        d.getMonth() === ref.getMonth() &&
        d.getDate() === ref.getDate()
}

const byTs = (a, b) => {
    const ta = Date.parse(pickTsISO(a) || 0)
    const tb = Date.parse(pickTsISO(b) || 0)
    return ta - tb
}
function filterByPeriod(arr, period) {
    if (!Array.isArray(arr) || !arr.length) return []

    if (period === '1D') {
        // Include every point whose local calendar date equals today
        return arr.filter(p => isSameLocalDay(pickTsISO(p))).sort(byTs)
    }

    // For 1W/1M we’ll use a range, but from midnight today backwards
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = now.getTime()
    const spanDays = period === '1W' ? 7 : 30
    const start = new Date(startOfToday); start.setDate(start.getDate() - (spanDays - 1))
    const s = start.getTime(), e = end

    return arr.filter(p => {
        const t = Date.parse(pickTsISO(p) || 0)
        return Number.isFinite(t) && t >= s && t <= e
    }).sort(byTs)
}


function withFallback(lineObj) {
    const hasData = lineObj.chartData?.labels?.length > 1
    if (hasData) return lineObj
    const labels = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00']
    return mkLine(labels, lineObj.chartData.datasets.map(ds => ({ ...ds, data: labels.map(() => 0) })))
}


// safer getter for trend.values with multiple possible keys
const pickVals = (p, keys) => {
    const v = p?.values || {}
    for (const k of keys) {
        if (v[k] != null && Number.isFinite(Number(v[k]))) return Number(v[k])
    }
    return 0
}

function pointTs(p) {
    const iso = p?.ts_sgt || p?.ts_utc || p?.minute_iso
    if (iso) { const t = Date.parse(iso); return Number.isNaN(t) ? NaN : t }
    if (p?.ts != null) return Number(p.ts) * 1000 // epoch sec
    return NaN
}

function getPeriodRange(period) {
    const now = new Date()
    const end = now
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (period === '1D') return { start: startOfToday, end }
    if (period === '1W') { const s = new Date(startOfToday); s.setDate(s.getDate() - 6); return { start: s, end } }
    const s = new Date(startOfToday); s.setDate(s.getDate() - 29); return { start: s, end }
}
function toLocalDateKey(ms) {
    const d = new Date(ms)
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/* ===== Period control ===== */
const period = ref('1D')
const periodLabel = computed(() => (period.value === '1D' ? 'Today' : period.value === '1W' ? 'Last 7 Days' : 'Last 30 Days'))

/* Unified filtered slots (time-windowed & sorted) */
const advFiltered = computed(() => filterByPeriod(advSlot.value || [], period.value))
const trendFiltered = computed(() => filterByPeriod(trendSlot.value || [], period.value))

function labelFor(p) {
    const iso = pickTsISO(p)
    const d = iso ? new Date(iso) : new Date(0)
    if (period.value === '1M') {
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}


/* ===== Last updated label (robust) ===== */
const lastUpdated = computed(() => {
    const stamps = []
    const a = advLatest.value, t = trendLatest.value
    if (a) stamps.push(a.ts_sgt || a.ts_utc)
    if (t) stamps.push(t.minute_iso || (t.ts ? new Date(t.ts * 1000).toISOString() : null))
    if (advFiltered.value.length) {
        const p = advFiltered.value.at(-1); stamps.push(p.ts_sgt || p.ts_utc)
    }
    if (trendFiltered.value.length) {
        const p = trendFiltered.value.at(-1); stamps.push(p.minute_iso || (p.ts ? new Date(p.ts * 1000).toISOString() : null))
    }
    return stamps.find(Boolean) || new Date().toLocaleString()
})

/* ===== KPIs (2dp formatting) ===== */
const kpis = computed(() => {
    const a = advLatest.value || {}
    const t = trendLatest.value || {}
    // prefer adv for Total System kW; fallback to trend field name
    const totalSysKw = a.kw_total_sys ?? t?.values?.['Total System kW']

    return [
        { label: 'Total System kW', value: fmt2(totalSysKw), unit: '', icon: 'fas fa-bolt', bg: '#2563eb' },
        { label: 'kW/RT Total (MA)', value: fmt2(a.kw_per_rt_total_ma), unit: '', icon: 'fas fa-gauge', bg: '#7c3aed' },
        { label: 'kW/RT CP (MA)', value: fmt2(a.kw_per_rt_cp_ma), unit: '', icon: 'fas fa-industry', bg: '#0ea5e9' },
        { label: 'ΔT (adv)', value: fmt2(a.delta_t), unit: '°C', icon: 'fas fa-temperature-low', bg: '#f59e0b' },
        { label: 'COP (Total)', value: fmt2(a.cop_total), unit: '', icon: 'fas fa-chart-line', bg: '#10b981' },
        { label: 'Tonnage (est)', value: fmt2(a.tonnage_est), unit: 'RT', icon: 'fas fa-snowflake', bg: '#06b6d4' }
    ]
})

/* ===== Line chart factory ===== */
function mkLine(labels, datasets, yOpts = { beginAtZero: true }) {
    return {
        chartData: {
            labels,
            datasets: datasets.map(ds => ({ ...ds, borderWidth: 2, tension: 0.35, pointRadius: 0 }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
            scales: {
                x: { offset: true, ticks: { color: '#cbd5e1', padding: 10 }, grid: { color: 'rgba(255,255,255,.15)' } },
                y: { ...yOpts, ticks: { color: '#cbd5e1', padding: 6 }, grid: { color: 'rgba(255,255,255,.15)' } }
            },
            plugins: { legend: { labels: { color: '#cbd5e1' } }, tooltip: { mode: 'index', intersect: false } }
        }
    }
}

/* ===== Charts ===== */
// kW/RT chart (1D/1W raw, 1M averaged by day)
const kwrtChart = computed(() => {
    const pts = advFiltered.value

    if (period.value === '1M') {
        // bucket by day
        const bins = new Map()
        for (const p of pts) {
            const key = (new Date(pickTsISO(p))).toLocaleDateString('en-CA') // YYYY-MM-DD
            const rec = bins.get(key) || { n: 0, tot: 0, cp: 0 }
            rec.n++
            rec.tot += Number(p.kw_per_rt_total_ma ?? p.kw_per_rt_total ?? 0)
            rec.cp += Number(p.kw_per_rt_cp_ma ?? p.kw_per_rt_cp ?? 0)
            bins.set(key, rec)
        }
        const labels = [...bins.keys()].sort()
        const d1 = labels.map(k => +(bins.get(k).tot / bins.get(k).n || 0).toFixed(3))
        const d2 = labels.map(k => +(bins.get(k).cp / bins.get(k).n || 0).toFixed(3))
        return mkLine(labels, [
            { label: 'kW/RT Total (avg)', data: d1, fill: false },
            { label: 'kW/RT CP (avg)', data: d2, fill: false }
        ])
    }

    const labels = pts.map(labelFor)
    const total = pts.map(p => Number(p.kw_per_rt_total_ma ?? p.kw_per_rt_total ?? 0))
    const cp = pts.map(p => Number(p.kw_per_rt_cp_ma ?? p.kw_per_rt_cp ?? 0))
    return mkLine(labels, [
        { label: 'kW/RT Total', data: total, fill: false },
        { label: 'kW/RT CP', data: cp, fill: false }
    ])
})


/* 2) COP (Total & CP) */
const copChart = computed(() => {
    const pts = advFiltered.value

    if (period.value === '1M') {
        const bins = new Map()
        for (const p of pts) {
            const key = (new Date(pickTsISO(p))).toLocaleDateString('en-CA')
            const rec = bins.get(key) || { n: 0, tot: 0, cp: 0 }
            rec.n++; rec.tot += Number(p.cop_total ?? 0); rec.cp += Number(p.cop_cp ?? 0)
            bins.set(key, rec)
        }
        const labels = [...bins.keys()].sort()
        const d1 = labels.map(k => +(bins.get(k).tot / bins.get(k).n || 0).toFixed(3))
        const d2 = labels.map(k => +(bins.get(k).cp / bins.get(k).n || 0).toFixed(3))
        return mkLine(labels, [
            { label: 'COP Total (avg)', data: d1, fill: true },
            { label: 'COP CP (avg)', data: d2, fill: false }
        ])
    }

    const labels = pts.map(labelFor)
    const d1 = pts.map(p => Number(p.cop_total ?? 0))
    const d2 = pts.map(p => Number(p.cop_cp ?? 0))
    return mkLine(labels, [
        { label: 'COP Total', data: d1, fill: true },
        { label: 'COP CP', data: d2, fill: false }
    ])
})


/* 3) Temps (from trend topic; robust key lookup) */
const tempsChart = computed(() => {
    const pts = trendFiltered.value;

    // Fallback dataset if nothing yet
    if (!pts.length) {
        const labels = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
        return mkLine(labels, [
            { label: 'HDR CHWS (°C)', data: labels.map(() => 0), fill: false },
            { label: 'HDR CHWR (°C)', data: labels.map(() => 0), fill: false },
            { label: 'WS Wet Bulb (°C)', data: labels.map(() => 0), fill: false }
        ], { beginAtZero: false });
    }

    const labels = pts.map(p => {
        const d = p.minute_iso ? new Date(p.minute_iso) : (p.ts ? new Date(p.ts * 1000) : new Date(0));
        return period.value === '1D'
            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    });

    // robust value picking from sample keys
    const chws = round2(pts.map(p => pickVals(p, ['HDR_CHWS_Temp(H)', 'HDR_CHWS_Temp', 'CHWS_Temp'])));
    const chwr = round2(pts.map(p => pickVals(p, ['HDR_CHWR_Temp(H)', 'HDR_CHWR_Temp', 'CHWR_Temp'])));
    const wb = round2(pts.map(p => pickVals(p, ['WS_WetBulb_Temp', 'WS_DB_Temp', 'WS_WB_Temp'])));

    return mkLine(labels, [
        { label: 'HDR CHWS (°C)', data: chws, fill: false },
        { label: 'HDR CHWR (°C)', data: chwr, fill: false },
        { label: 'WS Wet Bulb (°C)', data: wb, fill: false }
    ], { beginAtZero: false });
});


/* ===== CSV export ===== */
function downloadCSV() {
    const head1 = ['ts', 'kw_per_rt_total_ma', 'kw_per_rt_cp_ma', 'cop_total', 'cop_cp', 'delta_t', 'tonnage_est', 'kw_total_sys'].join(',')
    const rows1 = advFiltered.value.map(p => [
        p.ts_sgt || p.ts_utc || '',
        p.kw_per_rt_total_ma ?? '',
        p.kw_per_rt_cp_ma ?? '',
        p.cop_total ?? '',
        p.cop_cp ?? '',
        p.delta_t ?? '',
        p.tonnage_est ?? '',
        p.kw_total_sys ?? ''
    ].join(','))

    const head2 = ['minute_iso', 'HDR_CHWS_Temp(H)', 'HDR_CHWR_Temp(H)', 'WS_WetBulb_Temp', 'Total System kW'].join(',')
    const rows2 = trendFiltered.value.map(p => [
        p.minute_iso || (p.ts ? new Date(p.ts * 1000).toISOString() : ''),
        p.values?.['HDR_CHWS_Temp(H)'] ?? p.values?.['HDR_CHWS_Temp'] ?? '',
        p.values?.['HDR_CHWR_Temp(H)'] ?? p.values?.['HDR_CHWR_Temp'] ?? '',
        p.values?.['WS_WetBulb_Temp'] ?? p.values?.['WS_DB_Temp'] ?? '',
        p.values?.['Total System kW'] ?? ''
    ].join(','))

    const blob = new Blob([
        'plant_advanced', '\r\n', head1, '\r\n', rows1.join('\r\n'), '\r\n\r\n',
        'Chiller_ITE_1210_1210', '\r\n', head2, '\r\n', rows2.join('\r\n')
    ], { type: 'text/csv;charset=utf-8' })

    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'chiller_plant.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
}
</script>

<style scoped>
.chiller-plant-container {
    padding: 20px;
    background: #0a1f44;
    color: #fff;
    min-height: 100vh;
    font-family: sans-serif;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.page-title {
    margin: 0;
    font-size: 24px;
}

.breadcrumb span {
    font-size: 14px;
    margin: 0 4px;
}

.tab-nav {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 12px;
}

.spacer {
    flex: 1
}

.chip {
    font-size: .85rem;
    color: #fff;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .12);
    padding: 6px 10px;
    border-radius: 999px;
    cursor: pointer;
}

.chip.active {
    background: #1976d2;
    border-color: #1976d2;
}

.ov-chip {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, .08);
    padding: 6px 10px;
    border-radius: 10px;
    font-size: .85rem;
}

.kpi-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px;
}

.kpi {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 12px;
    padding: 12px;
}

.kpi-top {
    display: flex;
    align-items: center;
    gap: 10px;
}

.kpi-ico {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #fff;
}

.kpi-label {
    color: #cbd5e1;
    font-size: .85rem;
}

.kpi-val {
    font-size: 1.45rem;
    font-weight: 700;
    margin-top: 4px;
}

.kpi-sub {
    color: #cbd5e1;
    font-size: .8rem;
    margin-top: 2px;
}

.charts-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 12px;
}

.card.chart-card {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 12px;
    padding: 12px;
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

.raw-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 8px;
}

.card {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 12px;
    padding: 12px;
}

.json {
    background: #0f1a33;
    border: 1px solid rgba(255, 255, 255, .08);
    padding: 12px;
    border-radius: 8px;
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 12px;
    max-height: 360px;
    overflow: auto;
    white-space: pre-wrap;
}

.download-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    font-size: .9rem;
}

.download-button:hover {
    background: #125ea3;
}

.actions-row {
    margin-top: 10px;
}

@media (max-width:1200px) {
    .kpi-grid {
        grid-template-columns: repeat(3, 1fr);
    }

    .charts-grid {
        grid-template-columns: 1fr;
    }

    .raw-grid {
        grid-template-columns: 1fr;
    }
}
</style>
