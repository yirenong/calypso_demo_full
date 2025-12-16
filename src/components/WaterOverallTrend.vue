<template>
    <section class="grid charts-grid">
        <!-- === TOP KPI ROW (2 x 2) === -->
        <div class="top-kpi-row">
            <div class="kpi-card">
                <div class="kpi-title">Today's PUB Water Incoming</div>
                <div class="kpi-value">{{ fmtNum(kpiPubIncoming) }}</div>
                <div class="kpi-sub">m³</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-title">Today's NEWater Incoming</div>
                <div class="kpi-value">{{ fmtNum(kpiNeIncoming) }}</div>
                <div class="kpi-sub">m³</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-title">Today's Total Incoming</div>
                <div class="kpi-value">{{ fmtNum(kpiTotalIncoming) }}</div>
                <div class="kpi-sub">m³</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-title">WEI – Water Efficiency Index</div>
                <div class="kpi-value">{{ weiValue.toFixed(2) }}</div>
                <div class="kpi-sub">L/Pax/day</div>
            </div>

            <div class="kpi-card kpi-card-inline">
                <div class="kpi-header">
                    <div>
                        <div class="kpi-title">BAI – Business Activity Indicator</div>
                        <div class="kpi-sub">Used in WEI calculation</div>
                    </div>
                    <button class="chip chip-ghost" @click="openBaiEdit">Edit</button>
                </div>
                <div class="kpi-value">{{ baiValue.toLocaleString() }}</div>
                <div class="kpi-sub">Pax/day</div>
            </div>
        </div>

        <!-- === INLINE CHART CARD (with controls + inline chart) === -->
        <div class="card chart-card">
            <div class="card-header card-head-actions">
                <h3>Water — Consumption Trend</h3>
                <div class="spacer"></div>
            </div>

            <!-- ✅ Controls (INLINE) -->
            <div class="trend-controls-row">
                <div class="trend-actions">
                    <button class="chip" :class="{ active: wmGran === 'D' }" @click="setGran('D')">Day</button>
                    <button class="chip" :class="{ active: wmGran === 'W' }" @click="setGran('W')">Week</button>
                    <button class="chip" :class="{ active: wmGran === 'M' }" @click="setGran('M')">Month</button>
                    <button class="chip" :class="{ active: wmGran === 'Y' }" @click="setGran('Y')">Year</button>

                    <button class="chip" v-if="wmGran === 'W' && !seriesLoading" @click="toggleTrendMode"
                        style="margin-left:8px">
                        {{ trendMode === 'line' ? 'Compare (Bar)' : 'Switch to Line' }}
                    </button>
                </div>

                <div class="trend-pickers">
                    <template v-if="wmGran === 'D'">
                        <input class="chip" type="date" v-model="wmDay" :max="maxSelectableDate()" />
                    </template>

                    <template v-else-if="wmGran === 'W'">
                        <input class="chip" type="week" v-model="wmWeek" />
                    </template>

                    <template v-else-if="wmGran === 'M'">
                        <input class="chip" type="month" v-model="wmMonthStart" />
                        <input class="chip" type="month" v-model="wmMonthEnd" />
                    </template>

                    <template v-else>
                        <input class="chip chip-num" type="number" v-model.number="wmYearStart" />
                        <input class="chip chip-num" type="number" v-model.number="wmYearEnd" />
                    </template>

                    <button class="chip" @click="loadWaterDWMy" :disabled="seriesLoading">Apply</button>
                </div>
            </div>

            <!-- ✅ Inline chart -->
            <div class="chart-wrap" v-if="seriesLoading">Loading…</div>
            <div class="chart-wrap" v-else-if="seriesError">
                <span class="err">{{ seriesError }}</span>
            </div>
            <div class="chart-wrap" v-else style="height:420px">
                <component :is="fsIsLine ? LineChartCard : BarChartCard" :title="' '" :chartData="fsChartData"
                    :options="fsChartOptions" />
            </div>
        </div>

        <!-- ===== BAI modal ===== -->
        <Teleport to="body">
            <div v-if="isBaiEditOpen" class="bai-modal-backdrop" @click.self="isBaiEditOpen = false">
                <div class="bai-modal">
                    <div class="bai-modal-header">
                        <h3>Edit BAI</h3>
                        <span class="bai-modal-subtitle">Business Activity Indicator used for WEI.</span>
                    </div>

                    <div class="bai-modal-body">
                        <label class="bai-modal-label">
                            BAI value
                            <input type="number" min="1" v-model.number="baiDraft" class="bai-modal-input" />
                        </label>
                        <p class="bai-modal-hint">
                            Default is 24,753. Higher BAI → lower WEI (more efficient).
                        </p>
                    </div>

                    <div class="bai-modal-actions">
                        <button class="bai-modal-btn ghost" @click="isBaiEditOpen = false">✕ Close</button>
                        <button class="bai-modal-btn primary" @click="saveBai">Save</button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- ===== Fullscreen Modal ===== -->
        <Teleport to="body">
            <div v-if="showFs" class="fs-overlay" @click.self="closeFs">
                <div class="fs-modal">
                    <header class="fs-modal-header">
                        <h3>Water Consumption Trend (Fullscreen)</h3>
                        <button class="fs-close-btn" aria-label="Close fullscreen" title="Close"
                            @click="closeFs">×</button>
                    </header>

                    <div class="fs-modal-body">
                        <!-- ✅ Controls (FULLSCREEN) -->
                        <div class="trend-controls-row">
                            <div class="trend-actions">
                                <button class="chip" :class="{ active: wmGran === 'D' }"
                                    @click="setGran('D')">Day</button>
                                <button class="chip" :class="{ active: wmGran === 'W' }"
                                    @click="setGran('W')">Week</button>
                                <button class="chip" :class="{ active: wmGran === 'M' }"
                                    @click="setGran('M')">Month</button>
                                <button class="chip" :class="{ active: wmGran === 'Y' }"
                                    @click="setGran('Y')">Year</button>

                                <button class="chip" v-if="wmGran === 'W' && !seriesLoading" @click="toggleTrendMode"
                                    style="margin-left:8px">
                                    {{ trendMode === 'line' ? 'Compare (Bar)' : 'Switch to Line' }}
                                </button>
                            </div>

                            <div class="trend-pickers">
                                <template v-if="wmGran === 'D'">
                                    <input class="chip" type="date" v-model="wmDay" :max="maxSelectableDate()" />
                                </template>

                                <template v-else-if="wmGran === 'W'">
                                    <input class="chip" type="week" v-model="wmWeek" />
                                </template>

                                <template v-else-if="wmGran === 'M'">
                                    <input class="chip" type="month" v-model="wmMonthStart" />
                                    <input class="chip" type="month" v-model="wmMonthEnd" />
                                </template>

                                <template v-else>
                                    <input class="chip chip-num" type="number" v-model.number="wmYearStart" />
                                    <input class="chip chip-num" type="number" v-model.number="wmYearEnd" />
                                </template>

                                <button class="chip" @click="loadWaterDWMy" :disabled="seriesLoading">Apply</button>
                            </div>
                        </div>

                        <small class="muted">{{ headerDateLabel }}</small>

                        <div class="chart-wrap" v-if="seriesLoading">Loading…</div>
                        <div class="chart-wrap" v-else-if="seriesError">
                            <span class="err">{{ seriesError }}</span>
                        </div>
                        <div class="chart-wrap" v-else style="height:100%">
                            <component :is="fsIsLine ? LineChartCard : BarChartCard" :title="' '"
                                :chartData="fsChartData" :options="fsChartOptions" />
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    </section>
</template>


<script setup>
import { ref, computed, onMounted, watch, toRefs } from 'vue'
import LineChartCard from '../components/LineChartCard.vue'
import BarChartCard from '../components/BarChartCard.vue'


const props = defineProps({
    // shared BAI from parent (same BAI used elsewhere)
    baiValue: {
        type: Number,
        default: 24753
    }
})

const emit = defineEmits(['update:baiValue'])

const { baiValue } = toRefs(props)
/* ---------- Dataset colors (legend + strokes/fills) ---------- */
const DS_COLORS = {
    pub: {
        borderColor: 'rgba(59,130,246,1)',       // blue-500
        backgroundColor: 'rgba(59,130,246,0.25)',
        pointBackgroundColor: 'rgba(59,130,246,1)',
        pointBorderColor: 'rgba(59,130,246,1)',
    },
    ne: {
        borderColor: 'rgba(16,185,129,1)',       // emerald-500
        backgroundColor: 'rgba(16,185,129,0.25)',
        pointBackgroundColor: 'rgba(16,185,129,1)',
        pointBorderColor: 'rgba(16,185,129,1)',
    },
    total: {
        backgroundColor: 'rgba(99,102,241,0.35)', // indigo-500 fill for bars
        borderColor: 'rgba(99,102,241,1)',
    }
}

// === 8086 range-based main meters (PUB + NEWater) ==========================
const RANGE_BASE_URL = 'http://localhost:8086/api/range'
// Map these to your actual devices if swapped in backend
const RANGE_PUB_DEVICE = 'Water Meter ff02008000000058'
const RANGE_NE_DEVICE = 'Water Meter ff02008000000061'

// Fetch cumulative series (consumption_m3) for a device between two dates (YYYY-MM-DD)
async function fetchRangeDevice(deviceName, startYmd, endYmd) {
    if (!startYmd || !endYmd) return []
    const url = `${RANGE_BASE_URL}?deviceName=${encodeURIComponent(deviceName)}&start=${encodeURIComponent(startYmd)}&end=${encodeURIComponent(endYmd)}`
    try {
        const r = await fetch(url, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const data = await r.json()
        const arr = Array.isArray(data) ? data : []
        return arr
            .filter(row => row && row.timestamp)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    } catch (e) {
        console.warn('[range] failed', deviceName, e)
        return []
    }
}

function buildDailyTotalsFromCumulativeRange(rows) {
    const daily = new Map()

    // Sort by timestamp ascending
    const sorted = [...rows].sort((a, b) => {
        const ta = new Date(a.timestamp).getTime()
        const tb = new Date(b.timestamp).getTime()
        return ta - tb
    })

    let lastVal = null
    let isFirstValid = true   // <-- NEW FLAG

    for (const row of sorted) {
        const v = Number(row.consumption_m3)
        if (!Number.isFinite(v)) continue

        const dayKey = ymd(row.timestamp)

        if (isFirstValid) {
            // 🔥 FIRST VALID ROW → ALWAYS 0 CONSUMPTION
            daily.set(dayKey, 0)
            lastVal = v
            isFirstValid = false
            continue
        }

        // Normal delta logic
        let delta = v - lastVal
        if (!Number.isFinite(delta) || delta < 0) delta = 0

        daily.set(dayKey, (daily.get(dayKey) || 0) + delta)
        lastVal = v
    }

    return daily
}


function getDailyFromMap(map, dayYmd) {
    return Number(map.get(dayYmd) || 0)
}

// Month + year bucketing helpers for the range meters
function bucketDailyToMonthFromMap(dailyMap) {
    const byMonth = new Map() // 'YYYY-MM' -> total
    dailyMap.forEach((val, day) => {
        const key = String(day).slice(0, 7)
        byMonth.set(key, (byMonth.get(key) || 0) + Number(val || 0))
    })
    return byMonth
}
function bucketDailyToYearFromMap(dailyMap) {
    const byYear = new Map() // 'YYYY' -> total
    dailyMap.forEach((val, day) => {
        const key = String(day).slice(0, 4)
        byYear.set(key, (byYear.get(key) || 0) + Number(val || 0))
    })
    return byYear
}


/* ---------- Formatters ---------- */
const _fmtDay = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
const _fmtMonY = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' })
const _fmtDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit' })

/* ---------- Helpers ---------- */
const lockKpisToYesterday = ref(false)
const ALL_BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K']
const ALL_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8']
function pairsForScope() { const o = []; for (const B of ALL_BLOCKS) for (const L of ALL_LEVELS) o.push({ block: B, level: L }); return o }
function todayLocalISODate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
// ✅ Freeze everything to this latest date
const AS_OF_YMD = '2025-12-09' // change year if needed

function asOfDateObj() {
    const [y, m, d] = AS_OF_YMD.split('-').map(Number)
    return new Date(y, m - 1, d, 23, 59, 59, 999) // end of AS_OF day (local)
}

// clamp any YYYY-MM-DD so it never exceeds AS_OF_YMD
function clampYmdToAsOf(ymdStr) {
    if (!ymdStr) return AS_OF_YMD
    return (new Date(ymdStr) > new Date(AS_OF_YMD)) ? AS_OF_YMD : ymdStr
}

// for <input type="date"> max
function maxSelectableDate() {
    return AS_OF_YMD
}

// ISO (YYYY-MM-DDTHH:mm:ss) end time used in fetchSeries windows
function asOfEndISO() {
    const d = asOfDateObj()
    return d.toISOString().slice(0, 19)
}

function getISOWeekString(dateObj) {
    const d = new Date(dateObj)
    const dow = d.getDay() || 7
    const th = new Date(d); th.setDate(d.getDate() + 4 - dow)
    const y = th.getFullYear()
    const ys = new Date(y, 0, 1)
    const w = Math.ceil(((th - ys) / 86400000 + 1) / 7)
    return `${y}-W${String(w).padStart(2, '0')}`
}
function getCurrentISOWeek() { return getISOWeekString(new Date()) }
function getYesterdayISOWeek() { const d = new Date(); d.setDate(d.getDate() - 1); return getISOWeekString(d) }
function isMondayToday() { return (new Date().getDay() || 7) === 1 }
function prevISOWeek(weekStr) {
    const m = /^(\d{4})-W(\d{2})$/.exec(String(weekStr || ''))
    if (!m) return weekStr
    const y = +m[1], w = +m[2]
    const jan4 = new Date(y, 0, 4), jan4Dow = jan4.getDay() || 7
    const w1 = new Date(jan4); w1.setDate(jan4.getDate() - (jan4Dow - 1))
    const monday = new Date(w1); monday.setDate(w1.getDate() + (w - 1) * 7)
    monday.setHours(0, 0, 0, 0)
    monday.setDate(monday.getDate() - 7)
    return getISOWeekString(monday)
}

function weekBounds(weekStr) {
    const m = /^(\d{4})-W(\d{2})$/.exec(String(weekStr || '')); if (!m) return { start: '', end: '' }
    const y = +m[1], wk = +m[2], jan4 = new Date(y, 0, 4), jan4Dow = jan4.getDay() || 7, w1 = new Date(jan4); w1.setDate(jan4.getDate() - (jan4Dow - 1)); w1.setHours(0, 0, 0, 0)
    const start = new Date(w1); start.setDate(w1.getDate() + (wk - 1) * 7); start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setDate(start.getDate() + 7); end.setHours(0, 0, 0, 0)
    return { start, end }
}
function ymd(s) { const d = new Date(s); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function ymdPrev(x) { const [y, m, d] = String(x).split('-').map(Number); const t = new Date(y, (m || 1) - 1, d || 1); t.setDate(t.getDate() - 1); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}` }
function toLocalYmdHm(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

/* ---------- State ---------- */
const wmGran = ref('W')
const wmDay = ref(AS_OF_YMD)
const wmWeek = ref(getISOWeekString(new Date(AS_OF_YMD))) // week containing 8 Dec

const asOf = new Date(AS_OF_YMD)
const asOfYYYYMM = `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, '0')}`

const wmMonthStart = ref(asOfYYYYMM)
const wmMonthEnd = ref(asOfYYYYMM)

const wmYearStart = ref(asOf.getFullYear() - 1)
const wmYearEnd = ref(asOf.getFullYear())


const trendMode = ref('line')
function toggleTrendMode() { trendMode.value = trendMode.value === 'line' ? 'compare' : 'line' }
function setGran(g) { wmGran.value = g }

const kpiPubIncoming = ref(0)
const kpiNeIncoming = ref(0)
const kpiTotalIncoming = computed(() => Number(kpiPubIncoming.value || 0) + Number(kpiNeIncoming.value || 0))
function fmtNum(v) { const n = Number(v || 0); if (!Number.isFinite(n)) return '0.0'; return n.toLocaleString(undefined, { maximumFractionDigits: 1 }) }

/* ---------- Header label ---------- */
const headerDateLabel = computed(() => {
    if (wmGran.value === 'D') return _fmtDay.format(new Date(wmDay.value))
    if (wmGran.value === 'W') { const { start, end } = weekBounds(wmWeek.value); const endMinus1 = new Date(end.getTime() - 86400e3); return `${_fmtDay.format(start)} – ${_fmtDay.format(endMinus1)}` }
    if (wmGran.value === 'M') return `${_fmtMonY.format(new Date(wmMonthStart.value + '-01'))} – ${_fmtMonY.format(new Date(wmMonthEnd.value + '-01'))}`
    return `${wmYearStart.value} – ${wmYearEnd.value}`
})

// Shift 'YYYY-MM-DD' by offsetDays
function shiftYmd(ymdStr, offsetDays) {
    const d = new Date(ymdStr)
    d.setDate(d.getDate() + offsetDays)
    return ymd(d) // you already have ymd(date) => 'YYYY-MM-DD'
}

// Pad a range by -1 day on start and +1 day on end
function padRangeForCumulative(startYmd, endYmd) {
    const startPad = shiftYmd(startYmd, -1)
    const endPad = shiftYmd(endYmd, +1)
    return { startPad, endPad }
}

function debugNeBreakdownForDay(targetYmd, dailyCumByTag, tags) {
    console.log('==== NE Breakdown for', targetYmd, '====')
    const isNE = (tag) => (meterTagToSource.value[tag] || 'PUB') === 'NEWater'

    for (const t of tags) {
        if (!isNE(t)) continue
        const m = dailyCumByTag[t]
        if (!m) continue

        const v = m.get(targetYmd)
        if (v == null) continue

        console.log('Tag:', t, 'cumulative @', targetYmd, '=', v)
    }
    console.log('====================================')
}


// Get month start/end for any date 'YYYY-MM-DD'
function monthBoundsForDate(dayYmd) {
    const d = new Date(dayYmd)
    const year = d.getFullYear()
    const month = d.getMonth()       // 0-based

    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0) // last day of month

    return {
        monthStart: ymd(start),        // e.g. '2025-12-01'
        monthEnd: ymd(end),          // e.g. '2025-12-31'
    }
}

/* ---------- Chart state ---------- */
const chartA = ref({ labels: [], datasets: [] })
const seriesLoading = ref(false)
const seriesError = ref(null)

/* ---------- KPIs from latest point ---------- */
function updateTopKpisFromChart() {
    if (lockKpisToYesterday.value) return  // keep today's numbers

    const labels = chartA.value?.labels || []
    const ds = chartA.value?.datasets || []
    if (!labels.length) { kpiPubIncoming.value = 0; kpiNeIncoming.value = 0; return }

    if (wmGran.value === 'W' && ds.length >= 2) {
        const idx = labels.length - 1   // always use last day in chart
        kpiPubIncoming.value = Number(ds[0]?.data?.[idx] ?? 0)
        kpiNeIncoming.value = Number(ds[1]?.data?.[idx] ?? 0)
        return
    }


    const idx = labels.length - 1
    const total = Number(ds[0]?.data?.[idx] ?? 0)
    kpiPubIncoming.value = total
    kpiNeIncoming.value = 0
}


/* ---------- Yesterday-only KPI (independent of chart) ---------- */
/* ---------- Today's KPI (independent of chart) ---------- */
function todayYmd() {
    return AS_OF_YMD
}


async function loadTodayKpis() {
    const tags = allMeterTags.value
    if (!tags.length) {
        kpiPubIncoming.value = 0
        kpiNeIncoming.value = 0
        return
    }

    // Look back 7 days to be safe for cumulative logic
    const end = asOfDateObj()                  // ✅ stop at AS_OF
    const start = new Date(end)
    start.setDate(start.getDate() - 7)

    const startISO = start.toISOString().slice(0, 19)
    const endISO = end.toISOString().slice(0, 19)

    const seriesArr = await Promise.all(tags.map(t => fetchSeries(t, startISO, endISO)))
    const today = todayYmd()

    let pubSum = 0, neSum = 0

    for (let i = 0; i < tags.length; i++) {
        const tag = tags[i]
        const dailyCum = buildDailyCumForTag(seriesArr[i] || [])

        // cumulative at/ before today
        const cy = cumAtOrBefore(dailyCum, today)
        // cumulative before today (yesterday or nearest)
        const prev = cumBefore(dailyCum, today)
        const delta = Math.max(0, cy - prev)

        if ((meterTagToSource.value[tag] || 'PUB') === 'NEWater') neSum += delta
        else pubSum += delta
    }

    kpiPubIncoming.value = pubSum
    kpiNeIncoming.value = neSum

}

function cumAtOrBefore(map, dayYmd, maxLookback = 14) {
    // nearest cumulative value at or before the given day
    const d = new Date(dayYmd)
    for (let i = 0; i <= maxLookback; i++) {
        const key = ymd(d)
        if (map.has(key)) return Number(map.get(key) || 0)
        d.setDate(d.getDate() - 1)
    }
    return 0
}
function cumBefore(map, dayYmd, maxLookback = 14) {
    // nearest cumulative value strictly before the given day
    const d = new Date(dayYmd)
    d.setDate(d.getDate() - 1)
    for (let i = 0; i < maxLookback; i++) {
        const key = ymd(d)
        if (map.has(key)) return Number(map.get(key) || 0)
        d.setDate(d.getDate() - 1)
    }
    return 0
}

async function loadYesterdayKpis() {
    const tags = allMeterTags.value
    if (!tags.length) { kpiPubIncoming.value = 0; kpiNeIncoming.value = 0; return }

    const end = new Date(); end.setHours(0, 0, 0, 0)           // today 00:00
    const start = new Date(end); start.setDate(start.getDate() - 7) // 1 week window for safety
    const startISO = start.toISOString().slice(0, 19)
    const endISO = end.toISOString().slice(0, 19)

    const seriesArr = await Promise.all(tags.map(t => fetchSeries(t, startISO, endISO)))
    const yday = yesterdayYmd()
    let pubSum = 0, neSum = 0

    for (let i = 0; i < tags.length; i++) {
        const tag = tags[i]
        const dailyCum = buildDailyCumForTag(seriesArr[i] || [])
        const cy = cumAtOrBefore(dailyCum, yday)
        const prev = cumBefore(dailyCum, yday)
        const delta = Math.max(0, cy - prev)
        if ((meterTagToSource.value[tag] || 'PUB') === 'NEWater') neSum += delta
        else pubSum += delta
    }
    kpiPubIncoming.value = pubSum
    kpiNeIncoming.value = neSum
    lockKpisToYesterday.value = true   // keep them locked to yesterday
}

/* ---------- Dark-friendly chart options ---------- */
const baseChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: {
            grid: { color: 'rgba(255,255,255,0.08)' },
            ticks: {
                color: '#e5e7eb',
                callback: (_v, i) => {
                    const labels = chartA.value?.labels || []
                    const lbl = labels[i]; if (!lbl) return ''
                    const d = new Date(lbl); if (!Number.isFinite(d.getTime())) return String(lbl)
                    if (wmGran.value === 'M') return _fmtMonY.format(d)
                    if (wmGran.value === 'Y') return String(d.getFullYear())
                    return _fmtDate.format(d)
                }
            }
        },
        y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#e5e7eb' } }
    },
    plugins: {
        legend: {
            labels: {
                color: '#e5e7eb',
                usePointStyle: true,
                boxWidth: 12,
                boxHeight: 12
            }
        },
        tooltip: {
            titleColor: '#e5e7eb',
            bodyColor: '#e5e7eb',
            callbacks: {
                title: (items) => items?.length ? String(items[0].label ?? '').replace(/T.*/, '') : ''
            }
        }
    },
    elements: { line: { borderWidth: 2 }, point: { radius: 2 } }
}))
const barOptions = baseChartOptions

// WEI = (Daily campus water usage * 1000) / BAI
const weiValue = computed(() => {
    const bai = baiValue.value || 1
    const daily = Number(kpiTotalIncoming.value || 0)
    return bai > 0 ? (daily * 1000) / bai : 0
})

// BAI edit modal
const isBaiEditOpen = ref(false)
const baiDraft = ref(baiValue.value)

watch(baiValue, (v) => {
    baiDraft.value = v
})

function openBaiEdit() {
    baiDraft.value = baiValue.value
    isBaiEditOpen.value = true
}

function saveBai() {
    const v = Number(baiDraft.value || 0)
    if (v > 0) {
        emit('update:baiValue', v) // tell parent about the change
    }
    isBaiEditOpen.value = false
}

/* ---------- Compare (bar) aggregation ---------- */
const compareBarDataSelection = computed(() => {
    const ds = chartA.value.datasets || []
    const pub = ds[0]?.data?.reduce((a, b) => a + (Number(b) || 0), 0) || 0
    const ne = ds[1]?.data?.reduce((a, b) => a + (Number(b) || 0), 0) || 0
    return { labels: ['PUB', 'NEWater'], datasets: [{ label: 'Total (selected range)', data: [pub, ne], ...DS_COLORS.total }] }
})

/* ---------- Endpoints + meters ---------- */
const METERS_URL = '/water_meters_combined_full_sorted.json'
function monthUrl(b, l, startMM, endMM) { return `http://localhost:8080/blocks/${encodeURIComponent(b)}/levels/${encodeURIComponent(l)}/series-monthly?start=${encodeURIComponent(startMM)}&end=${encodeURIComponent(endMM)}` }
function yearUrl(b, l, startY, endYExclusive) { return `http://localhost:8080/blocks/${encodeURIComponent(b)}/levels/${encodeURIComponent(l)}/series-yearly?start=${encodeURIComponent(startY)}&end=${encodeURIComponent(endYExclusive)}` }

const flatRows = ref([])
const meterTagToSource = computed(() => { const m = Object.create(null); for (const r of flatRows.value || []) if (r?.meter_tag) m[r.meter_tag] = r.source || 'PUB'; return m })
const allMeterTags = computed(() => Array.from(new Set((flatRows.value || []).map(r => r.meter_tag).filter(Boolean))).sort())

function classifySource(remarks) { if (!remarks) return 'PUB'; const s = String(remarks).trim().toLowerCase(); return s === 'irrigation meter' || s.includes('irrigation') ? 'NEWater' : 'PUB' }
function flattenMeters(obj) {
    const out = []; const toBlock = (label) => (String(label).match(/Block\s+([A-Z])/i)?.[1] ?? '').toUpperCase()
    Object.entries(obj || {}).forEach(([blockLabel, branch]) => {
        const block = toBlock(blockLabel)
        Object.entries(branch || {}).forEach(([k2, v2]) => {
            const isLevel = /^level\b/i.test(k2)
            if (isLevel) {
                const levelLabel = k2
                Object.values(v2 || {}).forEach(m => { const mi = m?.meter_info || {}; out.push({ block: String(mi.block || block || ''), level_label: levelLabel, meter_tag: mi.meter_tag || '', place: mi.place ?? '', serial_no: mi.serial_no ?? '', section: mi.section ?? '', remarks: mi.remarks ?? '', source: classifySource(mi.remarks) }) })
            } else {
                const place = k2
                Object.entries(v2 || {}).forEach(([levelLabel, metersAtLevel]) => {
                    Object.values(metersAtLevel || {}).forEach(m => { const mi = m?.meter_info || {}; out.push({ block: String(mi.block || block || ''), level_label: levelLabel, meter_tag: mi.meter_tag || '', place: mi.place ?? place, serial_no: mi.serial_no ?? '', section: mi.section ?? '', remarks: mi.remarks ?? '', source: classifySource(mi.remarks) }) })
                })
            }
        })
    })
    return out
}
async function loadMeters() {
    try { const r = await fetch(METERS_URL, { cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status); const data = await r.json(); flatRows.value = flattenMeters(data) }
    catch (e) { console.warn('meters load failed', e); flatRows.value = [] }
}

/* ---------- Series helpers ---------- */
async function fetchSeries(tag, startISO, endISO) {
    try {
        const url = `http://localhost:8080/meters/${encodeURIComponent(tag)}/series?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}&fill_missing=false`
        const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status)
        const data = await r.json(); const arr = Array.isArray(data?.data) ? data.data : []
        return arr.map(row => ({ ts: row.ts, value: Number(row.consumption ?? 0) })).sort((a, b) => new Date(a.ts) - new Date(b.ts))
    } catch (e) { console.warn('[series] fail', tag, e); return [] }
}
function looksCumulative(arr) { let inc = 0, dec = 0; for (let i = 1; i < arr.length; i++) { const d = Number(arr[i].value) - Number(arr[i - 1].value); if (Number.isFinite(d)) (d >= -1e-6 ? inc++ : dec++) } return inc >= dec * 3 }
function buildDailyCumForTag(arr) {
    const byDay = new Map()
    for (const p of arr) {
        const day = ymd(p.ts); const cur = byDay.get(day) || { lastTs: null, lastVal: 0, sum: 0 }; const v = Number(p.value || 0)
        if (!cur.lastTs || new Date(p.ts) > new Date(cur.lastTs)) { cur.lastTs = p.ts; cur.lastVal = v }
        cur.sum += v; byDay.set(day, cur)
    }
    const days = Array.from(byDay.keys()).sort(); const isCum = looksCumulative(arr); const out = new Map(); let running = 0
    for (const d of days) { const { lastVal, sum } = byDay.get(d); if (isCum) out.set(d, Number(lastVal || 0)); else { running += Number(sum || 0); out.set(d, running) } }
    return out
}

/* ---------- Loaders ---------- */
function addOneMonthStr(yyyyMM) { const [y, m] = String(yyyyMM).split('-').map(Number); const d = new Date(y, (m || 1) - 1, 1); d.setMonth(d.getMonth() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

async function fetchMonthlyBlockLevel(block, level, startMM, endMM) {
    const r = await fetch(monthUrl(block, level, startMM, endMM), { cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status)
    const body = await r.json(); const arr = Array.isArray(body?.data) ? body.data : []; const today = new Date(); today.setDate(1); today.setHours(0, 0, 0, 0)
    const labels = [], data = []
    for (const row of arr) { const d = new Date(row.ts); if (Number.isNaN(d.getTime())) continue; const mm = new Date(d.getFullYear(), d.getMonth(), 1); if (mm > today) continue; labels.push(row.ts); data.push(Number(row.consumption || 0)) }
    return { labels, data }
}
async function fetchYearlyBlockLevel(block, level, startYear, endYearInclusive) {
    const r = await fetch(yearUrl(block, level, startYear, Number(endYearInclusive) + 1), { cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status)
    const body = await r.json(); const arr = Array.isArray(body?.data) ? body.data : []; const labels = [], data = []
    for (const row of arr) { const d = new Date(row.ts), y = d.getFullYear(); if (!Number.isFinite(y)) continue; if (y < Number(startYear) || y > Number(endYearInclusive)) continue; if (y > new Date().getFullYear()) continue; labels.push(row.ts); data.push(Number(row.consumption || 0)) }
    return { labels, data }
}
async function aggregateMonthlyForPairs(pairs, startMM, endMMEx) {
    const bucket = new Map()
    await Promise.all(pairs.map(async ({ block, level }) => {
        try { const { labels, data } = await fetchMonthlyBlockLevel(block, level, startMM, endMMEx); for (let i = 0; i < labels.length; i++) { const k = labels[i]; const v = Number(data[i] || 0); bucket.set(k, (bucket.get(k) || 0) + v) } } catch { }
    }))
    const labels = Array.from(bucket.keys()).sort((a, b) => new Date(a) - new Date(b))
    return { labels, data: labels.map(k => bucket.get(k) || 0) }
}
async function aggregateYearlyForPairs(pairs, startY, endY) {
    const bucket = new Map()
    await Promise.all(pairs.map(async ({ block, level }) => {
        try { const { labels, data } = await fetchYearlyBlockLevel(block, level, startY, endY); for (let i = 0; i < labels.length; i++) { const k = labels[i]; const v = Number(data[i] || 0); bucket.set(k, (bucket.get(k) || 0) + v) } } catch { }
    }))
    const labels = Array.from(bucket.keys()).sort((a, b) => new Date(a) - new Date(b))
    return { labels, data: labels.map(k => bucket.get(k) || 0) }
}

/* Day (single total bar) */
// Day view: per-scope totals using block/level endpoint
async function loadDayTotalsViaEndpointScope(selectedYmd) {
    const day = selectedYmd || todayLocalISODate()     // 'YYYY-MM-DD'
    const prevDay = ymdPrev(day)                       // previous day 'YYYY-MM-DD'

    const pairs = pairsForScope(currentTab.value, currentLevel.value)
    const perPair = []  // { block, level, daily }

    for (const { block, level } of pairs) {
        const url = `http://127.0.0.1:8080/blocks/${encodeURIComponent(block)}/levels/${encodeURIComponent(level)}/series?fill_missing=false`

        try {
            const r = await fetch(url, { cache: 'no-cache' })
            if (!r.ok) throw new Error('HTTP ' + r.status)

            const json = await r.json()
            const arr = Array.isArray(json?.data) ? json.data : []

            // Build map: YYYY-MM-DD -> cumulative value
            const map = new Map()
            for (const pt of arr) {
                const ts = pt?.ts ?? null
                const d = new Date(ts)
                if (Number.isNaN(d.getTime())) continue

                const yy = d.getFullYear()
                const mm = String(d.getMonth() + 1).padStart(2, '0')
                const dd = String(d.getDate()).padStart(2, '0')
                const key = `${yy}-${mm}-${dd}`

                const cum = Number(pt?.consumption ?? pt?.value ?? 0)
                if (!Number.isFinite(cum)) continue

                map.set(key, cum)
            }

            const cur = map.get(day)
            const prev = map.get(prevDay)

            // daily = diff of cumulative; clamp negatives / missing to 0
            let daily = 0
            if (Number.isFinite(cur) && Number.isFinite(prev)) {
                daily = cur - prev
            }
            daily = Math.max(0, Number(daily) || 0)

            perPair.push({ block, level, daily })
        } catch (e) {
            console.warn('[Water][Day] endpoint failed', block, level, e)
            // still push 0 so charts show all blocks/levels even if one fails
            perPair.push({ block, level, daily: 0 })
        }
    }

    const blk = String(currentTab.value || 'Overall').toUpperCase()
    const lvl = String(currentLevel.value || 'Overall').toUpperCase()

    // If absolutely nothing came back, just clear chart to avoid weird leftovers
    if (!perPair.length) {
        chartA.value = { labels: [], datasets: [{ label: 'm³ / day', type: 'bar', data: [] }] }
        return
    }

    // 1) Overall / Overall → single bar: total of all blocks + levels
    if (blk === 'OVERALL' && lvl === 'OVERALL') {
        const total = perPair.reduce((s, x) => s + x.daily, 0)
        chartA.value = {
            labels: ['Total'],
            datasets: [{ label: 'm³ / day', type: 'bar', data: [total] }]
        }
        return
    }

    // 2) Overall / Level (e.g. Overall + L3) → bars per block (A..K) at that level
    if (blk === 'OVERALL' && lvl !== 'OVERALL') {
        const byBlock = new Map()
        for (const x of perPair) {
            byBlock.set(x.block, (byBlock.get(x.block) || 0) + x.daily)
        }
        const labels = ALL_BLOCKS.filter(B => byBlock.has(B))
        chartA.value = {
            labels,
            datasets: [{
                label: `m³ / day (${lvl})`,
                type: 'bar',
                data: labels.map(B => byBlock.get(B) || 0)
            }]
        }
        return
    }

    // 3) Block / Overall → bars per level inside that block (the case you mentioned)
    if (blk !== 'OVERALL' && lvl === 'OVERALL') {
        const byLevel = new Map()
        for (const x of perPair) {
            byLevel.set(x.level, (byLevel.get(x.level) || 0) + x.daily)
        }
        const labels = ALL_LEVELS.filter(L => byLevel.has(L))
        chartA.value = {
            labels,
            datasets: [{
                label: `m³ / day (${blk})`,
                type: 'bar',
                data: labels.map(L => byLevel.get(L) || 0)
            }]
        }
        return
    }

    // 4) Specific Block + Level → single bar
    const only = perPair.reduce((s, x) => s + x.daily, 0)
    chartA.value = {
        labels: [`${blk}-${lvl}`],
        datasets: [{ label: 'm³ / day', type: 'bar', data: [only] }]
    }
}


/* Week (PUB vs NEWater lines) */
function defaultStartISO() { const d = new Date(Date.now() - 7 * 86400e3); return d.toISOString().slice(0, 19) }
function defaultEndISO() {
    const d = new Date()        // now
    return d.toISOString().slice(0, 19)
}

// === Overlay helpers: add Swimming Pool + Cooling Tower NEWater from 8086 ===

// Day: add today's Swimming Pool + Cooling Tower NEWater on top of the single bar
async function overlayRangeForDayOnChart(dayYmd) {
    const labels = (chartA.value && Array.isArray(chartA.value.labels))
        ? chartA.value.labels
        : []
    if (!labels.length) return

    const blk = String(currentTab.value || 'Overall').toUpperCase()
    const lvl = String(currentLevel.value || 'Overall').toUpperCase()

    // Only overlay when looking at Overall / Overall with a single "Total" bar
    if (!(blk === 'OVERALL' && lvl === 'OVERALL' && labels.length === 1)) {
        return
    }

    const day = dayYmd || todayLocalISODate() // 'YYYY-MM-DD'

    // Range used for cumulative: day-1 .. day+1
    const { startPad, endPad } = padRangeForCumulative(day, day)

    const [poolRows, coolingRows] = await Promise.all([
        fetchRangeDevice(RANGE_PUB_DEVICE, startPad, endPad), // Swimming Pool
        fetchRangeDevice(RANGE_NE_DEVICE, startPad, endPad), // Cooling Tower
    ])

    const poolDailyMap = buildDailyTotalsFromCumulativeRange(poolRows)
    const coolingDailyMap = buildDailyTotalsFromCumulativeRange(coolingRows)

    const pool = Number(getDailyFromMap(poolDailyMap, day) || 0)
    const cooling = Number(getDailyFromMap(coolingDailyMap, day) || 0)
    const extraNe = pool + cooling

    const ds = Array.isArray(chartA.value.datasets) ? chartA.value.datasets.slice() : []
    if (!ds.length || !Array.isArray(ds[0].data)) return

    const base0 = Number(ds[0].data[0] || 0)

    ds[0] = {
        ...ds[0],
        data: [base0 + extraNe],
    }

    chartA.value = {
        ...(chartA.value || {}),
        datasets: ds,
    }
}

// Week: add Swimming Pool + Cooling Tower onto the NEWater line only,
// but ignore the FIRST non-zero daily delta from each meter (treat as baseline).
async function overlayRangeForWeekFromChart() {
    const labels = Array.isArray(chartA.value?.labels)
        ? chartA.value.labels
        : [];
    if (!labels.length) return;

    const first = labels[0];
    const last = labels[labels.length - 1];

    // Use padded range for cumulative→daily conversion
    const { startPad, endPad } = padRangeForCumulative(first, last);

    // RANGE_PUB_DEVICE = Swimming Pool
    // RANGE_NE_DEVICE  = Cooling Tower
    const [poolRows, towerRows] = await Promise.all([
        fetchRangeDevice(RANGE_PUB_DEVICE, startPad, endPad),
        fetchRangeDevice(RANGE_NE_DEVICE, startPad, endPad),
    ]);

    // Local helper: build daily totals, but SKIP the first positive delta
    function buildDailyTotalsSkipFirstDelta(rows) {
        const daily = new Map();

        const sorted = [...rows].sort((a, b) => {
            const ta = new Date(a.timestamp).getTime();
            const tb = new Date(b.timestamp).getTime();
            return ta - tb;
        });

        let lastVal = null;
        let firstDeltaSkipped = false;

        for (const row of sorted) {
            const v = Number(row.consumption_m3);
            if (!Number.isFinite(v)) continue;

            if (lastVal === null) {
                // first valid reading → baseline only
                lastVal = v;
                continue;
            }

            let delta = v - lastVal;
            if (!Number.isFinite(delta) || delta <= 0) {
                lastVal = v;
                continue;
            }

            const dayKey = ymd(row.timestamp); // 'YYYY-MM-DD'

            if (!firstDeltaSkipped) {
                // 🔥 FIRST positive delta → treat as baseline, force 0 for that day
                if (!daily.has(dayKey)) {
                    daily.set(dayKey, 0);
                }
                firstDeltaSkipped = true;
            } else {
                // Subsequent deltas are counted as real consumption
                daily.set(dayKey, (daily.get(dayKey) || 0) + delta);
            }

            lastVal = v;
        }

        return daily;
    }

    const poolDailyMap = buildDailyTotalsSkipFirstDelta(poolRows);
    const towerDailyMap = buildDailyTotalsSkipFirstDelta(towerRows);

    // Both meters are NEWater → sum them as extra NE per day
    const extraNeDaily = labels.map((d) => {
        const pool = Number(poolDailyMap.get(d) || 0);
        const tower = Number(towerDailyMap.get(d) || 0);
        return pool + tower;
    });

    console.log('labels:', labels);
    console.log('extraNeDaily from 8086 (after skipping first delta):', extraNeDaily);

    const ds = Array.isArray(chartA.value?.datasets)
        ? [...chartA.value.datasets]
        : [];
    if (!ds.length) return;

    // Prefer to add into NEWater series (index 1)
    if (ds.length >= 2 && Array.isArray(ds[1].data)) {
        ds[1] = {
            ...ds[1],
            data: ds[1].data.map((v, i) =>
                Number(v || 0) + Number(extraNeDaily[i] || 0)
            ),
        };
    } else if (Array.isArray(ds[0].data)) {
        // Fallback: single dataset = Total
        ds[0] = {
            ...ds[0],
            data: ds[0].data.map((v, i) =>
                Number(v || 0) + Number(extraNeDaily[i] || 0)
            ),
        };
    }

    chartA.value = {
        ...(chartA.value || {}),
        datasets: ds,
    };
}




// Month: add Swimming Pool + Cooling Tower NEWater to month totals
async function overlayRangeForMonthFromChart() {
    const labels = Array.isArray(chartA.value?.labels)
        ? chartA.value.labels
        : [];
    if (!labels.length) return;

    const firstDate = new Date(labels[0]);
    const lastDate = new Date(labels[labels.length - 1]);
    if (Number.isNaN(firstDate.getTime()) || Number.isNaN(lastDate.getTime())) {
        return;
    }

    // Full calendar span for the visible months
    const monthStartYmd = `${firstDate.getFullYear()}-${String(
        firstDate.getMonth() + 1
    ).padStart(2, "0")}-01`;
    const nextMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1);
    const monthEndYmd = ymd(
        new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 0)
    );

    const { startPad, endPad } = padRangeForCumulative(monthStartYmd, monthEndYmd);

    const [poolRows, towerRows] = await Promise.all([
        fetchRangeDevice(RANGE_PUB_DEVICE, startPad, endPad),
        fetchRangeDevice(RANGE_NE_DEVICE, startPad, endPad),
    ]);

    const poolDailyMap = buildDailyTotalsFromCumulativeRange(poolRows);
    const towerDailyMap = buildDailyTotalsFromCumulativeRange(towerRows);

    const poolByMonth = bucketDailyToMonthFromMap(poolDailyMap);
    const towerByMonth = bucketDailyToMonthFromMap(towerDailyMap);

    // Extra NE per label (each label is a timestamp in that month)
    const extraNePerLabel = labels.map((lbl) => {
        const d = new Date(lbl);
        if (Number.isNaN(d.getTime())) return 0;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            "0"
        )}`;
        const pool = Number(poolByMonth.get(key) || 0);
        const tower = Number(towerByMonth.get(key) || 0);
        return pool + tower;
    });

    const ds = Array.isArray(chartA.value.datasets)
        ? [...chartA.value.datasets]
        : [];
    if (!ds.length) return;

    // If we have split PUB / NE, add only into NE (index 1).
    if (ds.length >= 2 && Array.isArray(ds[1].data)) {
        ds[1] = {
            ...ds[1],
            data: ds[1].data.map((v, i) =>
                Number(v || 0) + Number(extraNePerLabel[i] || 0)
            ),
        };
    } else if (Array.isArray(ds[0].data)) {
        // Otherwise treat single dataset as "Total"
        ds[0] = {
            ...ds[0],
            data: ds[0].data.map((v, i) =>
                Number(v || 0) + Number(extraNePerLabel[i] || 0)
            ),
        };
    }

    chartA.value = {
        ...chartA.value,
        datasets: ds,
    };
}
watch(wmDay, (v) => { wmDay.value = clampYmdToAsOf(v) })
watch(wmMonthEnd, (v) => {
    // prevent picking a month after AS_OF month
    if (String(v) > String(asOfYYYYMM)) wmMonthEnd.value = asOfYYYYMM
})
watch(wmYearEnd, (v) => {
    const maxY = new Date(AS_OF_YMD).getFullYear()
    if (Number(v) > maxY) wmYearEnd.value = maxY
})


// Year: add Swimming Pool + Cooling Tower NEWater to year totals
async function overlayRangeForYearFromChart() {
    const labels = Array.isArray(chartA.value?.labels)
        ? chartA.value.labels
        : [];
    if (!labels.length) return;

    // Extract numeric years from labels (they may be timestamps or bare numbers)
    const years = labels
        .map((lbl) => {
            const d = new Date(lbl);
            if (!Number.isNaN(d.getTime())) return d.getFullYear();
            const n = Number(lbl);
            return Number.isFinite(n) ? n : null;
        })
        .filter((y) => y != null);

    if (!years.length) return;

    const startYear = Math.min(...years);
    const endYear = Math.max(...years);

    const startYmd = `${startYear}-01-01`;
    const endYmd = `${endYear}-12-31`;

    const { startPad, endPad } = padRangeForCumulative(startYmd, endYmd);

    const [poolRows, towerRows] = await Promise.all([
        fetchRangeDevice(RANGE_PUB_DEVICE, startPad, endPad),
        fetchRangeDevice(RANGE_NE_DEVICE, startPad, endPad),
    ]);

    const poolDailyMap = buildDailyTotalsFromCumulativeRange(poolRows);
    const towerDailyMap = buildDailyTotalsFromCumulativeRange(towerRows);

    const poolByYear = bucketDailyToYearFromMap(poolDailyMap);
    const towerByYear = bucketDailyToYearFromMap(towerDailyMap);

    const extraNePerLabel = labels.map((lbl) => {
        let year = null;
        const d = new Date(lbl);
        if (!Number.isNaN(d.getTime())) {
            year = d.getFullYear();
        } else {
            const n = Number(lbl);
            if (Number.isFinite(n)) year = n;
        }
        if (year == null) return 0;

        const key = String(year);
        const pool = Number(poolByYear.get(key) || 0);
        const tower = Number(towerByYear.get(key) || 0);
        return pool + tower;
    });

    const ds = Array.isArray(chartA.value.datasets)
        ? [...chartA.value.datasets]
        : [];
    if (!ds.length) return;

    if (ds.length >= 2 && Array.isArray(ds[1].data)) {
        // Add to NEWater only
        ds[1] = {
            ...ds[1],
            data: ds[1].data.map((v, i) =>
                Number(v || 0) + Number(extraNePerLabel[i] || 0)
            ),
        };
    } else if (Array.isArray(ds[0].data)) {
        // Fallback: single dataset = Total
        ds[0] = {
            ...ds[0],
            data: ds[0].data.map((v, i) =>
                Number(v || 0) + Number(extraNePerLabel[i] || 0)
            ),
        };
    }

    chartA.value = {
        ...chartA.value,
        datasets: ds,
    };
}


// Use the 8086 range meters to ADD onto today's NEWater KPI (not PUB)
async function loadTodayKpisFromRange() {
    const today = todayYmd() // 'YYYY-MM-DD'

    // Get full month bounds for today (e.g. 2025-12-01 .. 2025-12-31)
    const { monthStart, monthEnd } = monthBoundsForDate(today)

    // Pad by -1 / +1 day for cumulative diff logic
    const { startPad, endPad } = padRangeForCumulative(monthStart, monthEnd)

    const [poolRows, coolingRows] = await Promise.all([
        fetchRangeDevice(RANGE_PUB_DEVICE, startPad, endPad),
        fetchRangeDevice(RANGE_NE_DEVICE, startPad, endPad),
    ])

    const poolDailyMap = buildDailyTotalsFromCumulativeRange(poolRows)
    const coolingDailyMap = buildDailyTotalsFromCumulativeRange(coolingRows)

    const poolToday = Number(getDailyFromMap(poolDailyMap, today) || 0)
    const coolingToday = Number(getDailyFromMap(coolingDailyMap, today) || 0)

    const extraNe = poolToday + coolingToday

    // Do NOT touch PUB – both meters are NEWater
    if (Number.isFinite(extraNe) && extraNe >= 0) {
        kpiNeIncoming.value += extraNe
    }
}

async function loadSeriesOverallWeekly(start, end) {
    // Dates that define the *visible* week range
    const displayStart = start ? new Date(start) : null
    const displayEnd = end ? new Date(end) : null

    // Dates used for fetching (with extra 7-day lookback for baseline)
    const startDateObj = start ? new Date(start) : new Date(Date.now() - 7 * 86400e3)
    const endDateObj = end ? new Date(end) : asOfDateObj()
    const maxEnd = asOfDateObj()
    if (endDateObj > maxEnd) endDateObj.setTime(maxEnd.getTime())


    // look back an extra 7 days for baseline
    startDateObj.setDate(startDateObj.getDate() - 7)

    const startISO = startDateObj.toISOString().slice(0, 19)
    const endISO = endDateObj.toISOString().slice(0, 19)

    const tags = allMeterTags.value
    if (!tags.length) {
        chartA.value = { labels: [], datasets: [] }
        seriesError.value = seriesError.value || 'No meters found (check /water_meters_combined_full_sorted.json)'
        return
    }

    // Fetch all series for the extended range
    const seriesArr = await Promise.all(tags.map(t => fetchSeries(t, startISO, endISO)))
    const seriesMap = Object.fromEntries(tags.map((t, i) => [t, seriesArr[i]]))

    // Build per-tag cumulative-by-day maps
    const dailyCumByTag = {}
    for (const t of tags) {
        dailyCumByTag[t] = buildDailyCumForTag(seriesMap[t] || [])
    }

    // Collect all days that have any data
    const allDays = new Set()
    Object.values(dailyCumByTag).forEach(m => m.forEach((_, d) => allDays.add(d)))
    const days = Array.from(allDays).sort()   // 'YYYY-MM-DD'

    const isNE = (tag) => (meterTagToSource.value[tag] || 'PUB') === 'NEWater'
    const pubCum = []
    const neCum = []

    // Build cumulative PUB / NE over all days in the extended range
    for (let i = 0; i < days.length; i++) {
        const d = days[i]
        let pub = 0
        let ne = 0

        for (const t of tags) {
            const m = dailyCumByTag[t]
            if (!m) continue

            let v
            if (m.has(d)) {
                v = m.get(d)
            } else {
                // back-fill from previous days if missing
                v = 0
                for (let k = i - 1; k >= 0; k--) {
                    const prev = days[k]
                    if (m.has(prev)) { v = m.get(prev); break }
                }
            }

            if (isNE(t)) ne += Number(v || 0)
            else pub += Number(v || 0)
        }

        pubCum.push(pub)
        neCum.push(ne)
    }

    const toDaily = (cum) => cum.map((v, i) =>
        i === 0 ? 0 : Math.max(0, Number(v) - Number(cum[i - 1]))
    )

    const pubDailyAll = toDaily(pubCum)
    const neDailyAll = toDaily(neCum)

    // 🔎 Now filter to ONLY the selected week [displayStart, displayEnd)
    let labels = []
    let pubDaily = []
    let neDaily = []

    if (displayStart && displayEnd) {
        for (let i = 0; i < days.length; i++) {
            const dStr = days[i]
            const dObj = new Date(dStr)

            // In weekBounds, `end` is the first day AFTER the week,
            // so we keep start <= day < end.
            if (dObj >= displayStart && dObj < displayEnd) {
                labels.push(dStr)
                pubDaily.push(pubDailyAll[i])
                neDaily.push(neDailyAll[i])
            }
        }
    } else {
        // Fallback: no explicit range → keep everything
        labels = days.map(d => d)
        pubDaily = pubDailyAll
        neDaily = neDailyAll
    }

    chartA.value = {
        labels,
        datasets: [
            {
                label: 'PUB (daily m³)',
                type: 'line',
                data: pubDaily,
                tension: 0,
                fill: false,
                ...DS_COLORS.pub,
            },
            {
                label: 'NEWater (daily m³)',
                type: 'line',
                data: neDaily,
                tension: 0,
                fill: false,
                ...DS_COLORS.ne,
            },
        ],
    }
}

/* Month / Year (single total bar) */
async function loadMonthOverall() {
    const pairs = pairsForScope(); const startMM = wmMonthStart.value; const endMMEx = addOneMonthStr(wmMonthEnd.value)
    const { labels, data } = await aggregateMonthlyForPairs(pairs, startMM, endMMEx)
    chartA.value = { labels, datasets: [{ label: 'm³ / month', type: 'bar', data, ...DS_COLORS.total }] }
}
async function loadYearOverall() {
    const pairs = pairsForScope(); const startY = Number(wmYearStart.value); const endY = Number(wmYearEnd.value)
    const { labels, data } = await aggregateYearlyForPairs(pairs, startY, endY)
    chartA.value = { labels, datasets: [{ label: 'm³ / year', type: 'bar', data, ...DS_COLORS.total }] }
}

/* ---------- Watch & orchestrator ---------- */
watch(wmDay, () => { if (wmGran.value === 'D') loadWaterDWMy() })
const startLocal = ref(''), endLocal = ref('')
async function loadWaterDWMy() {
    wmDay.value = clampYmdToAsOf(wmDay.value)
    seriesLoading.value = true;
    seriesError.value = null;

    try {
        if (wmGran.value === 'D') {
            await loadDayTotalsViaEndpointScope(wmDay.value);
            await overlayRangeForDayOnChart(wmDay.value);
            return;
        }

        if (wmGran.value === 'W') {
            let selectedWeek = wmWeek.value;

            if (isMondayToday() && selectedWeek === getCurrentISOWeek()) {
                selectedWeek = prevISOWeek(selectedWeek);
                wmWeek.value = selectedWeek;
            }

            const { start, end } = weekBounds(selectedWeek);
            startLocal.value = toLocalYmdHm(start);
            endLocal.value = toLocalYmdHm(end);

            await loadSeriesOverallWeekly(startLocal.value, endLocal.value);
            await overlayRangeForWeekFromChart();
            updateTopKpisFromChart();
            return;
        }

        if (wmGran.value === 'M') {
            await loadMonthOverall();
            await overlayRangeForMonthFromChart();
            updateTopKpisFromChart();
            return;
        }

        await loadYearOverall();
        await overlayRangeForYearFromChart();
        updateTopKpisFromChart();
    }
    catch (e) {
        seriesError.value = e?.message ?? 'Failed to load series';
        chartA.value = { labels: [], datasets: [] };
        updateTopKpisFromChart();
    }
    finally {
        seriesLoading.value = false;
    }
}


/* ---------- Fullscreen state ---------- */
const showFs = ref(false)
function openFs() { showFs.value = true }
function closeFs() { showFs.value = false }
const fsIsLine = computed(() => wmGran.value === 'W' && trendMode.value === 'line')
const fsChartData = computed(() => fsIsLine.value ? chartA.value : (wmGran.value === 'W' && trendMode.value !== 'line') ? compareBarDataSelection.value : chartA.value)
const fsChartOptions = computed(() => fsIsLine.value ? baseChartOptions.value : barOptions.value)

onMounted(async () => {
    await loadMeters()
    await loadTodayKpis()          // existing base KPIs from 8080
    await loadTodayKpisFromRange() // now adds Swimming Pool + Cooling Tower NEWater
    await loadWaterDWMy()
})


</script>

<style scoped>
.chart-card {
    padding: 14px 14px 10px;
    border-radius: 12px;
    overflow: hidden;
    background-color: #1e3f7a;
}

.chart-wrap {
    height: 420px;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 10px;
}

.chip {
    font-size: .8rem;
    color: #fff;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .12);
    padding: 7px 12px;
    border-radius: 999px;
    cursor: pointer;
}

.chip.active {
    background: #1976d2;
    border-color: #1976d2;
}

.err {
    color: #fda4af;
}

.top-kpi-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    /* 2 columns */
    gap: 10px;
    margin-bottom: 12px;
}


.kpi-card {
    background: #1e3f7a;
    border-radius: 4px;
    padding: 10px 14px 12px;
    border: 1px solid rgba(255, 255, 255, .2);
}

.kpi-card-wide {
    grid-column: 1 / span 2;
}

.kpi-title {
    font-size: .7rem;
    color: rgba(255, 255, 255, .75);
    margin-bottom: 4px;
}

.kpi-value {
    font-size: 1.4rem;
    font-weight: 600;
    color: #fff;
    line-height: 1.1;
}

.kpi-sub {
    font-size: .65rem;
    color: rgba(255, 255, 255, .4);
    margin-top: 2px;
}

.card-head-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.spacer {
    flex: 1 1 auto;
}

.card-head-actions .chip {
    height: 32px;
    padding: 6px 12px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
}

@media (max-width:520px) {
    .hide-sm {
        display: none;
    }
}

/* ===== Fullscreen modal ===== */
.fs-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 10, .6);
    z-index: 9999;
    display: grid;
    place-items: center;
}

.fs-modal {
    width: min(1200px, 92vw);
    height: min(80vh, 92vh);
    background: #112d5c;
    border: 1px solid rgba(255, 255, 255, .2);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0, 0, 0, .5);
}

.fs-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, .2);
    color: #e5e7eb;
}

.fs-close-btn {
    background: transparent;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, .2);
    border-radius: 999px;
    width: 32px;
    height: 32px;
    cursor: pointer;
}

.fs-modal-body {
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    color: #e5e7eb;
}

.trend-controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
}

.trend-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.trend-pickers {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.kpi-card-inline .kpi-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
}

/* Ghost-style chip for Edit */
.chip-ghost {
    background: transparent;
    border-color: rgba(255, 255, 255, 0.25);
}

/* ===== BAI modal ===== */
.bai-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.7);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.bai-modal {
    width: min(420px, 90vw);
    background: #020617;
    border-radius: 12px;
    padding: 16px 18px;
    border: 1px solid rgba(148, 163, 184, 0.5);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
    color: #e5e7eb;
}

.bai-modal-header h3 {
    margin: 0;
    font-size: 1rem;
}

.bai-modal-subtitle {
    display: block;
    margin-top: 4px;
    font-size: 0.8rem;
    color: #9ca3af;
}

.bai-modal-body {
    margin-top: 12px;
}

.bai-modal-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.85rem;
}

.bai-modal-input {
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.8);
    background: #020617;
    color: #e5e7eb;
    font-size: 0.9rem;
}

.bai-modal-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.6);
}

.bai-modal-hint {
    margin-top: 6px;
    font-size: 0.75rem;
    color: #6b7280;
}

.bai-modal-actions {
    margin-top: 14px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.bai-modal-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    background: rgba(15, 23, 42, 0.9);
    color: #e5e7eb;
    font-size: 0.85rem;
    cursor: pointer;
}

.bai-modal-btn.primary {
    background: #2563eb;
    border-color: #2563eb;
}

.bai-modal-btn:hover {
    opacity: 0.95;
}
</style>
