<template>
    <div class="dashboard-container">
        <!-- ====== ENERGY (top) ====== -->
        <section class="column">
            <div class="section-header">
                <div class="section-title">
                    <span class="icon-wrapper gear-icon"><i class="fas fa-bolt"></i></span>
                    <h3>Energy Management</h3>
                </div>
            </div>

            <!-- KPI grid -->
            <!-- KPI grid -->
            <div class="kpi-grid-2">
                <!-- ===== Month-to-date Energy ===== -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Current Usage for the Month</div>
                    <div class="kpi-number">
                        <span v-if="energyKpiLoading">Loading…</span>
                        <span v-else-if="energyKpiError" class="err">{{ energyKpiError }}</span>
                        <template v-else>{{ fmtNum(kpiEnergyMonthToDate) }}</template>
                    </div>
                    <div class="kpi-unit">kWh</div>
                    <div class="kpi-sub">
                        Avg kW proxy: {{ showNum(kpiEnergyMonthAvgKw, 1) }}
                    </div>
                </div>

                <!-- ===== Day-to-date Energy ===== -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Current Usage for the Day</div>
                    <div class="kpi-number">
                        <span v-if="energyKpiLoading">Loading…</span>
                        <span v-else-if="energyKpiError" class="err">{{ energyKpiError }}</span>
                        <template v-else>{{ fmtNum(kpiEnergyDayToDate) }}</template>
                    </div>
                    <div class="kpi-unit">kWh</div>
                    <div class="kpi-sub">
                        Avg kW proxy: {{ showNum(kpiEnergyDayAvgKw, 1) }}
                    </div>
                </div>

                <!-- EUI (computed locally: (MTD/30)*365 / 192,820) -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">EUI</div>

                    <div class="kpi-number">
                        <span v-if="udEuiLoading">Loading…</span>
                        <span v-else-if="udEuiError" class="err">{{ udEuiError }}</span>
                        <template v-else>{{ showNum(euiNow, 3) }}</template>
                    </div>

                    <div class="kpi-unit">kWh/m²</div>
                    <div class="kpi-sub muted">Cummulative Annual Energy Used ÷ 192,820</div>
                </div>


            </div>

            <!-- Energy trend (always visible) -->
            <div class="chart-module">
                <!-- Title + chips -->
                <div class="card-header trend-row" style="margin-bottom:10px">
                    <h3>Energy Consumption Trend (kWh)</h3>

                    <div class="trend-actions">
                        <div class="segmented-pills" role="tablist" aria-label="Energy period filter">
                            <button type="button" class="seg-pill" :class="{ active: periodMode === 'overall' }"
                                @click="setPeriodMode('overall')">
                                Overall
                            </button>

                            <button type="button" class="seg-pill" :class="{ active: periodMode === 'business' }"
                                @click="setPeriodMode('business')">
                                Business
                            </button>

                            <button type="button" class="seg-pill" :class="{ active: periodMode === 'offpeak1' }"
                                @click="setPeriodMode('offpeak1')">
                                Off-peak 1
                            </button>

                            <button type="button" class="seg-pill" :class="{ active: periodMode === 'offpeak2' }"
                                @click="setPeriodMode('offpeak2')">
                                Off-peak 2
                            </button>
                        </div>

                        <div class="period-caption muted">
                            <span v-if="periodMode === 'overall'">All hours</span>
                            <span v-else-if="periodMode === 'business'">07:00–18:00</span>
                            <span v-else-if="periodMode === 'offpeak1'">18:00–23:00</span>
                            <span v-else>23:00–07:00</span>
                        </div>
                    </div>

                </div>

                <!-- Meta + time pickers -->
                <div class="trend-controls-row">
                    <div class="trend-pickers">
                        <select class="chip" v-model="rangeMode" @change="onRangeModeChange">
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                            <option value="year">Year</option>
                        </select>

                        <template v-if="rangeMode === 'day'">
                            <input class="chip" type="date" v-model="selectedDay">
                        </template>
                        <template v-else-if="rangeMode === 'week'">
                            <input class="chip" type="week" v-model="selectedWeek">
                        </template>
                        <template v-else-if="rangeMode === 'month'">
                            <input class="chip" type="month" v-model="selectedMonth">
                        </template>
                        <template v-else>
                            <input class="chip" type="number" min="2000" max="2100" step="1"
                                v-model.number="selectedYear">
                        </template>

                        <button type="button" class="chip icon-btn" title="Previous" @click="stepPeriod(-1)"
                            :disabled="trendLoading">
                            <i class="fas fa-angle-left"></i>
                        </button>
                        <button type="button" class="chip icon-btn" title="Next" @click="stepPeriod(1)"
                            :disabled="trendLoading || !canStepNext">
                            <i class="fas fa-angle-right"></i>
                        </button>

                        <button type="button" class="chip" @click="applyRangeFromControls"
                            :disabled="trendLoading">Apply</button>
                    </div>
                </div>

                <!-- Chart -->
                <div class="chart-wrap" v-if="trendLoading">Loading trend…</div>
                <div class="chart-wrap" v-else style="height:100%">
                    <LineChartCard :key="chartKey" :title="' '" :chartData="trendChartData"
                        :options="trendChartOptions" />
                </div>
            </div>


            <!-- Fullscreen Energy (keep ONLY this one) -->
            <div v-if="fullscreenChart === 'energy'" class="fs-overlay" @click.self="closeFullscreen">
                <div class="fs-modal">
                    <header class="fs-modal-header">
                        <h3>Energy Consumption Trend (Fullscreen)</h3>
                        <button class="fs-close-btn" aria-label="Close fullscreen" title="Close"
                            @click="closeFullscreen">
                            <i class="fas fa-times"></i>
                        </button>
                    </header>
                    <div class="fs-modal-body">
                        <div class="fs-modal-body">
                            <!-- Title + chips -->
                            <div class="card-header trend-row" style="margin-bottom:10px">
                                <h3>Energy Consumption Trend (kWh)</h3>
                                <div class="trend-actions">
                                    <button type="button" class="chip" :class="{ active: periodMode === 'overall' }"
                                        @click="setPeriodMode('overall')">Overall</button>
                                    <button type="button" class="chip" :class="{ active: periodMode === 'business' }"
                                        @click="setPeriodMode('business')">Business 7am to 6pm</button>
                                    <button type="button" class="chip" :class="{ active: periodMode === 'offpeak1' }"
                                        @click="setPeriodMode('offpeak1')">Offpeak 1 6pm to 11pm</button>
                                    <button type="button" class="chip" :class="{ active: periodMode === 'offpeak2' }"
                                        @click="setPeriodMode('offpeak2')">Offpeak 2 11pm to 7am</button>
                                </div>
                            </div>

                            <!-- Meta + time pickers -->
                            <div class="trend-controls-row">
                                <small class="muted">
                                    {{ trendLoading ? 'Loading…' : trendGranularityHint }}
                                    <template v-if="!trendLoading && dateLabel"> • {{ dateLabel }}</template>
                                </small>

                                <div class="trend-pickers">
                                    <select class="chip" v-model="rangeMode" @change="onRangeModeChange">
                                        <option value="day">Day</option>
                                        <option value="week">Week</option>
                                        <option value="month">Month</option>
                                        <option value="year">Year</option>
                                    </select>

                                    <template v-if="rangeMode === 'day'">
                                        <input class="chip" type="date" v-model="selectedDay">
                                    </template>
                                    <template v-else-if="rangeMode === 'week'">
                                        <input class="chip" type="week" v-model="selectedWeek">
                                    </template>
                                    <template v-else-if="rangeMode === 'month'">
                                        <input class="chip" type="month" v-model="selectedMonth">
                                    </template>
                                    <template v-else>
                                        <input class="chip" type="number" min="2000" max="2100" step="1"
                                            v-model.number="selectedYear">
                                    </template>

                                    <button type="button" class="chip icon-btn" title="Previous" @click="stepPeriod(-1)"
                                        :disabled="trendLoading">
                                        <i class="fas fa-angle-left"></i>
                                    </button>
                                    <button type="button" class="chip icon-btn" title="Next" @click="stepPeriod(1)"
                                        :disabled="trendLoading || !canStepNext">
                                        <i class="fas fa-angle-right"></i>
                                    </button>

                                    <button type="button" class="chip" @click="applyRangeFromControls"
                                        :disabled="trendLoading">Apply</button>
                                </div>
                            </div>

                            <!-- Chart -->
                            <div class="chart-wrap" v-if="trendLoading">Loading trend…</div>
                            <div class="chart-wrap" v-else style="height:100%">
                                <LineChartCard :key="chartKey" :title="' '" :chartData="trendChartData"
                                    :options="trendChartOptions" />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>

        <!-- ====== WATER ====== -->
        <section class="column">
            <div class="section-header">
                <div class="section-title">
                    <span class="icon-wrapper leaf-icon"><i class="fas fa-tint"></i></span>
                    <h3>Water Management</h3>
                </div>
            </div>
            <div class="chart-module">
                <WaterOverallTrend ref="waterRef" @open-water-chart="openWaterChart"
                    @chart-updated="onWaterChartUpdated" @ui-updated="onWaterUiUpdated" />

            </div>


            <div v-if="fullscreenChart === 'water'" class="fs-overlay" @click.self="closeFullscreen">
                <div class="fs-modal">
                    <header class="fs-modal-header">
                        <h3>Water Consumption Trend (Fullscreen)</h3>
                        <button class="fs-close-btn" aria-label="Close fullscreen" title="Close"
                            @click="closeFullscreen">
                            <i class="fas fa-times"></i>
                        </button>
                    </header>

                    <div class="fs-modal-body">
                        <!-- Controls (driven by child state via @ui-updated) -->
                        <div class="card-header trend-row" style="margin-bottom:10px">
                            <h3>Water Consumption Trend (m³)</h3>
                            <div class="trend-actions">
                                <button type="button" class="chip" :class="{ active: waterUi.rangeMode === 'day' }"
                                    @click="waterSetRangeMode('day')">Day</button>
                                <button type="button" class="chip" :class="{ active: waterUi.rangeMode === 'week' }"
                                    @click="waterSetRangeMode('week')">Week</button>
                                <button type="button" class="chip" :class="{ active: waterUi.rangeMode === 'month' }"
                                    @click="waterSetRangeMode('month')">Month</button>
                                <button type="button" class="chip" :class="{ active: waterUi.rangeMode === 'year' }"
                                    @click="waterSetRangeMode('year')">Year</button>
                            </div>
                        </div>

                        <div class="trend-controls-row">
                            <small class="muted">
                                {{ waterUi.granularityHint }}
                                <template v-if="waterUi.dateLabel"> • {{ waterUi.dateLabel }}</template>
                            </small>

                            <div class="trend-pickers">
                                <template v-if="waterUi.rangeMode === 'day'">
                                    <input class="chip" type="date" :value="waterUi.selectedDay"
                                        @change="onChangeSelectedDay">
                                </template>
                                <template v-else-if="waterUi.rangeMode === 'week'">
                                    <input class="chip" type="week" :value="waterUi.selectedWeek"
                                        @change="onChangeSelectedWeek">
                                </template>
                                <template v-else-if="waterUi.rangeMode === 'month'">
                                    <input class="chip" type="month" :value="waterUi.selectedMonth"
                                        @change="onChangeSelectedMonth">
                                </template>
                                <template v-else>
                                    <input class="chip" type="number" min="2000" max="2100" step="1"
                                        :value="waterUi.selectedYear" @change="onChangeSelectedYear">
                                </template>

                                <button type="button" class="chip icon-btn" title="Previous" @click="waterStep(-1)">
                                    <i class="fas fa-angle-left"></i>
                                </button>
                                <button type="button" class="chip icon-btn" title="Next"
                                    :disabled="!waterUi.canStepNext" @click="waterStep(1)">
                                    <i class="fas fa-angle-right"></i>
                                </button>

                                <button type="button" class="chip" @click="waterApply">Apply</button>
                            </div>
                        </div>

                        <!-- Chart -->
                        <div class="chart-wrap" v-if="waterFsLoading">Loading…</div>
                        <div class="chart-wrap" v-else style="height:100%">
                            <LineChartCard :title="' '" :chartData="waterFsChartData" :options="waterFsChartOptions" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>
<script setup>
import { ref, computed, reactive, watch, onMounted, onBeforeUnmount } from 'vue'
import LineChartCard from '../components/LineChartCard.vue'
import WaterOverallTrend from '../components/WaterOverallTrend.vue'

function onWasteApply() {
    if (!isWasteRangeValid.value) return;
    loadWasteLast7(); // refresh the “last 7” view against current dates
    loadWdi();        // keep WDI in sync
}

const LATEST_DATA_DAY_ISO = '2025-12-08';
const LATEST_DATA_END = new Date(`${LATEST_DATA_DAY_ISO}T23:59:59`);

function startOfLatestDataDay() {
    return new Date(`${LATEST_DATA_DAY_ISO}T00:00:00`);
}
function endOfLatestDataDay() {
    return new Date(`${LATEST_DATA_DAY_ISO}T23:59:59`);
}



// clamp a day input so user can't select beyond latest data
function clampDayISO(iso) {
    if (!iso) return iso;
    const d = new Date(`${iso}T00:00:00`);
    const max = new Date(`${LATEST_DATA_DAY_ISO}T00:00:00`);
    return d > max ? LATEST_DATA_DAY_ISO : iso;
}

// endpoints (reuse your existing base if different)
const UD_HIERARCHY_URL = 'http://127.0.0.1:8081/meta/hierarchy'
const UD_TREND_BASE_URL = 'http://127.0.0.1:8081/power/block-level/trend'
const UD_EUI_DENOMINATOR = 192820
const UD_EUI_DAILY_BASELINE = 40000  // kWh/day assumption for remaining days

// state
const udPairs = ref([])           // [{ block, level }]
const udMonthTotalKwh = ref(0)
const udEuiLoading = ref(false)
const udEuiError = ref(null)


/* ===== Water: D/W/M/Y selection ===== */
const waterRangeMode = ref('day');
const waterSelectedDay = ref(todayLocalISODate());
const waterSelectedWeek = ref(isoWeekString(new Date()));
const waterSelectedMonth = ref(ymString(new Date()));
const waterSelectedYear = ref(new Date().getFullYear());

// script setup (top of Dashboard.vue)
const waterRef = ref(null)

const waterFsChartData = ref({ labels: [], datasets: [] })
const waterFsChartOptions = ref({})
const waterFsLoading = ref(false)

// NEW: mirror of the child’s UI state for rendering controls in the modal
const waterUi = reactive({
    rangeMode: 'day',              // 'day' | 'week' | 'month' | 'year'
    dateLabel: '',
    canStepNext: false,
    selectedDay: '',
    selectedWeek: '',
    selectedMonth: '',
    selectedYear: new Date().getFullYear(),
    granularityHint: '',
})

// called whenever child’s chart changes
function onWaterChartUpdated(payload) {
    if (!payload) return
    waterFsChartData.value = payload.chartData || { labels: [], datasets: [] }
    waterFsChartOptions.value = payload.chartOptions || {}
    waterFsLoading.value = !!payload.loading
}

// NEW: receive child’s UI snapshot
function onWaterUiUpdated(ui) {
    Object.assign(waterUi, ui || {})
}

function openWaterChart() {
    // refresh the inline chart state (no fullscreen)
    const payload = waterRef.value?.getChartPayload?.()
    if (payload) onWaterChartUpdated(payload)

    const ui = waterRef.value?.getUi?.()
    if (ui) onWaterUiUpdated(ui)
}

// Controls call through to child
function waterSetRangeMode(mode) {
    waterRef.value?.setRangeMode?.(mode)
}
function waterApply() {
    waterRef.value?.applyFromUi?.()
}
function waterStep(delta) {
    waterRef.value?.stepPeriod?.(delta)
}

// Bind inputs back to child (so the child stays the single source of truth)
function onChangeSelectedDay(e) { waterRef.value?.setSelectedDay?.(e.target.value) }
function onChangeSelectedWeek(e) { waterRef.value?.setSelectedWeek?.(e.target.value) }
function onChangeSelectedMonth(e) { waterRef.value?.setSelectedMonth?.(e.target.value) }
function onChangeSelectedYear(e) { waterRef.value?.setSelectedYear?.(Number(e.target.value)) }

const waterGranularityHint = computed(() => {
    const m = { day: 'Summed m³ — Day view (Hourly)', week: 'Summed m³ — Week view (Daily)', month: 'Summed m³ — Month view (Daily)', year: 'Summed m³ — Year view (Daily)' };
    return m[waterRangeMode.value];
});

// period "now" should be based on latest data date, not real today
function currentPeriodStartFor(mode) {
    const now = new Date(LATEST_DATA_END); // ✅ use max data date
    if (mode === 'day') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    if (mode === 'week') return mondayOfISOWeek(now);
    if (mode === 'month') return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function waterBoundsForSelection() {
    const mode = waterRangeMode.value;
    if (mode === 'day') {
        const d = waterSelectedDay.value ? new Date(waterSelectedDay.value) : startOfToday();
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 1);
        return { start, end };
    }
    if (mode === 'week') {
        const start = weekStringToDate(waterSelectedWeek.value);
        const end = new Date(start); end.setDate(end.getDate() + 7);
        return { start, end };
    }
    if (mode === 'month') {
        const start = ymToDate(waterSelectedMonth.value);
        const end = new Date(start); end.setMonth(end.getMonth() + 1, 1);
        return { start, end };
    }
    const y = Number(waterSelectedYear.value || new Date().getFullYear());
    const start = new Date(y, 0, 1, 0, 0, 0, 0);
    const end = new Date(y + 1, 0, 1, 0, 0, 0, 0);
    return { start, end };
}

const waterDateLabel = computed(() => {
    const { start, end } = waterBoundsForSelection();
    if (!start || !end) return '';
    if (waterRangeMode.value === 'day') return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(start);
    if (waterRangeMode.value === 'week') {
        const endMinus1 = new Date(end.getTime() - 86400e3);
        return `Week ${weekNumber(start)} (${new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(start)} – ${new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(endMinus1)})`;
    }
    if (waterRangeMode.value === 'month') return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(start);
    return String(start.getFullYear());
});

const waterCanStepNext = computed(() => {
    const { start } = waterBoundsForSelection();
    if (!start) return false;
    return start.getTime() < waterCurrentPeriodStartFor(waterRangeMode.value).getTime();
});

// helpers
function udMonthStart() {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
}
function udToISOsec(dt) {
    const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, '0'), d = String(dt.getDate()).padStart(2, '0')
    const hh = String(dt.getHours()).padStart(2, '0'), mm = String(dt.getMinutes()).padStart(2, '0'), ss = String(dt.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}`
}
// === Use the labels actually rendered by the chart ===
function getActiveLabels() {
    return Array.isArray(trendChartData.value?.labels)
        ? trendChartData.value.labels
        : [];
}

// Map tick "value" to the real label (handles numeric index or string)
function labelFromTickValue(value, idx) {
    const labels = getActiveLabels();
    if (typeof value === 'string') {
        const matchIdx = labels.indexOf(value);
        if (matchIdx !== -1) return labels[matchIdx];
        if (labels[idx] != null) return labels[idx];
        return value;
    }
    if (typeof value === 'number' && labels[value] != null) {
        return labels[value];
    }
    if (labels[idx] != null) return labels[idx];
    return String(value ?? '');
}

async function udLoadPairs() {
    udEuiError.value = null
    try {
        const r = await fetch(UD_HIERARCHY_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        const bbl = b?.by_block_level || {}
        const out = []
        for (const blk of Object.keys(bbl)) {
            for (const lvl of Object.keys(bbl[blk] || {})) {
                out.push({ block: blk, level: lvl })
            }
        }
        udPairs.value = out
    } catch (e) {
        udPairs.value = []
        udEuiError.value = e?.message ?? 'Failed to load hierarchy'
    }
}

async function udFetchTrend(block, level, startIso, endIso) {
    const params = new URLSearchParams({ block, level, start: startIso, end: endIso })
    const url = `${UD_TREND_BASE_URL}?${params.toString()}`
    const r = await fetch(url, { cache: 'no-cache' })
    if (!r.ok) throw new Error(`${block}.${level} HTTP ${r.status}`)
    return r.json()
}

async function udSumRange(startDate, endDate) {
    const startIso = udToISOsec(startDate)
    const endIso = udToISOsec(endDate)
    if (!udPairs.value.length) return 0

    const payloads = await Promise.all(
        udPairs.value.map(p => udFetchTrend(p.block, p.level, startIso, endIso))
    )

    let total = 0
    for (const pl of payloads) {
        for (const s of (pl?.series || [])) {
            for (const pt of (s.points || [])) {
                total += Number(pt.kwh || 0)
            }
        }
    }
    return total
}

async function refreshUdMonthTotal() {
    udEuiLoading.value = true;
    udEuiError.value = null;

    try {
        const now = new Date();
        // REUSE the same function your energy KPIs use
        udMonthTotalKwh.value = await sumEnergyKwhBetween(udMonthStart(), now);
    } catch (e) {
        udEuiError.value = e?.message ?? 'Failed to compute MTD';
        udMonthTotalKwh.value = 0;
    } finally {
        udEuiLoading.value = false;
    }
}


// identical to EnergyManagement.vue formula
const euiNow = computed(() => {
    const mtd = Number(udMonthTotalKwh.value || 0)

    // x: days of data this month (using day-of-month as a pragmatic proxy)
    const today = new Date()
    const x = Math.min(today.getDate(), 365) // clamp just in case

    const v = (((365 - x) * UD_EUI_DAILY_BASELINE) + mtd) / UD_EUI_DENOMINATOR

    console.info('[EUI DEBUG]', {
        mtd: Number(udMonthTotalKwh.value || 0),
        x: new Date().getDate(),                         // your X
        baseline: UD_EUI_DAILY_BASELINE,
        denom: UD_EUI_DENOMINATOR,
        day: Math.min(new Date().getDate(), 365),
        monthly: Number(udMonthTotalKwh.value || 0),
        calc: (((365 - Math.min(new Date().getDate(), 365)) * UD_EUI_DAILY_BASELINE) + Number(udMonthTotalKwh.value || 0)) / UD_EUI_DENOMINATOR
    });

    return Number.isFinite(v) ? v : 0
})

// init
onMounted(async () => {
    await udLoadPairs()
    await refreshUdMonthTotal()
})
/* ======================= Fullscreen (shared) ======================= */
const fullscreenChart = ref(null) // 'energy' | 'water' | 'waste' | 'chiller' | null
function closeFullscreen() { fullscreenChart.value = null }
function onEsc(e) { if (e.key === 'Escape' && fullscreenChart.value) closeFullscreen() }
onMounted(() => window.addEventListener('keydown', onEsc))
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc))

const wasteFromISO = ref(todayLocalISODate())
const wasteToISO = ref(todayLocalISODate())
const isWasteRangeValid = computed(() => {
    if (!wasteFromISO.value || !wasteToISO.value) return false
    return new Date(wasteFromISO.value) <= new Date(wasteToISO.value)
})


/* ======================= UI / Filters / Editors ======================= */
const ui = reactive({
    openFilter: {
        energy: false,
        water: false,
        waste: false,
        chiller: false,
        env: false,  // kept for backward-compat with older templates
        mid: false,
        right: false,
    },
    openEdit: {
        meta: false, // for population/area editor popover
    }
})
// Close any popover when user clicks outside
if (typeof window !== 'undefined') {
    window.addEventListener('click', () => {
        ui.openFilter.energy = ui.openFilter.water = ui.openFilter.waste = ui.openFilter.chiller = false
        ui.openFilter.env = ui.openFilter.mid = ui.openFilter.right = false
        ui.openEdit.meta = false
    })
}

const chartKey = computed(() =>
    [
        'energy-trend',
        (compareView.value ? 'cmp' : 'time'),
        trendMode.value,
        periodMode.value,
        rangeMode.value,
        trendSeries.value.type,
        trendStartLocal.value,
        trendEndLocal.value,
        (trendSeries.value.labels?.length ?? 0),
    ].join('-')
);

function onRangeModeChange() {
    resetToTimeTrend();
    initRangeControlsToNow(rangeMode.value);
}

/* Helpful formatters used widely */
function fmtNum(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString() : '—' }
function showNum(v, dp = 1) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(dp) : '—' }
function todayLocalISODate() {
    const now = new Date()
    const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
function toLocalISO(dt) {
    const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, '0'), d = String(dt.getDate()).padStart(2, '0')
    const hh = String(dt.getHours()).padStart(2, '0'), mm = String(dt.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d}T${hh}:${mm}`
}
function toIsoWithSeconds(localDT) {
    if (!localDT) return ''
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localDT) ? `${localDT}:00` : localDT
}
function yyyy_mm_dd_to_ddmmyyyy(isoDate) {
    if (!isoDate) return ''
    const [y, m, d] = String(isoDate).split('-')
    return `${d}/${m}/${y}`
}

/* === Bar/Line aggregation helpers === */
function periodAllow(ts, period) {
    if (!period || period === 'overall') return true;
    const h = new Date(ts).getHours();
    if (period === 'business') return h >= 7 && h < 18;
    if (period === 'offpeak1') return h >= 18 && h < 23;
    return h < 7 || h >= 23;
}

function keyFor(ts, mode) {
    const d = new Date(ts);
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    if (mode === 'week' || mode === 'day') return `${y}-${m}-${day}`;
    if (mode === 'month') return `${y}-${m}`;
    if (mode === 'year') return String(y);
    return ts;
}

function sortKeyFn(mode) {
    if (mode === 'week' || mode === 'day') {
        return (a, b) => new Date(a) - new Date(b);
    }
    if (mode === 'month') {
        return (a, b) => {
            const [ay, am] = a.split('-').map(Number);
            const [by, bm] = b.split('-').map(Number);
            return ay !== by ? ay - by : am - bm;
        };
    }
    if (mode === 'year') return (a, b) => Number(a) - Number(b);
    return (a, b) => a.localeCompare(b);
}

/* Label formatters */
const fmtDay = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
const fmtMonthYear = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });
const fmtTime = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

function isValidDate(d) {
    return d instanceof Date && !Number.isNaN(d.getTime());
}

function safeFormat(dtf, input) {
    const d = new Date(input);
    return isValidDate(d) ? dtf.format(d) : String(input ?? '');
}

function formatLabel(label) {
    const s = String(label ?? '');
    if (!s) return '';

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(s)) {
        return safeFormat(fmtTime, s);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return safeFormat(fmtDay, `${s}T00:00:00`);
    }
    if (/^\d{4}-\d{2}$/.test(s)) {
        return safeFormat(fmtMonthYear, `${s}-01T00:00:00`);
    }
    if (/^\d{4}$/.test(s)) return s;

    const d = new Date(s);
    return isValidDate(d) ? fmtDay.format(d) : s;
}

/* ==== Range-mode controls ==== */
const rangeMode = ref('day');
const selectedDay = ref(todayLocalISODate());
const selectedWeek = ref(isoWeekString(new Date()));
const selectedMonth = ref(ymString(new Date()));
const selectedYear = ref(new Date().getFullYear());

const dtDay = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
const dtMonthYear = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });

const trendGranularityHint = computed(() => {
    const m = { day: 'Day view', week: 'Week view', month: 'Month view', year: 'Year view' };
    return `Summed kWh — ${m[rangeMode.value]}`;
});

const dateLabel = computed(() => {
    const { start, end } = boundsForSelection();
    if (!start || !end) return '';
    if (rangeMode.value === 'day') return dtDay.format(start);
    if (rangeMode.value === 'week') {
        const endMinus1 = new Date(end.getTime() - 86400e3);
        return `Week ${weekNumber(start)} (${dtDay.format(start)} – ${dtDay.format(endMinus1)})`;
    }
    if (rangeMode.value === 'month') return dtMonthYear.format(start);
    return String(start.getFullYear());
});

const canStepNext = computed(() => {
    const { start } = boundsForSelection();
    if (!start) return false;
    return start.getTime() < currentPeriodStartFor(rangeMode.value).getTime();
});


async function applyRangeFromControls() {
    const { start, end } = boundsForSelection();
    if (!start || !end) return;
    trendStartLocal.value = toLocalISO(start);
    trendEndLocal.value = toLocalISO(end);
    resetToTimeTrend();
    await loadTrendForSelection();
}

function stepPeriod(delta) {
    const d = clampInt(delta);
    if (!d) return;

    if (rangeMode.value === 'day') {
        const cur = selectedDay.value ? new Date(selectedDay.value) : startOfToday();
        cur.setDate(cur.getDate() + d);
        selectedDay.value = clampDayISO(isoDate(cur)); // ✅ clamp
    } else if (rangeMode.value === 'week') {
        const a = weekStringToDate(selectedWeek.value);
        a.setDate(a.getDate() + 7 * d);

        // ✅ clamp week if it goes beyond latest data week
        const maxWeek = isoWeekString(new Date(LATEST_DATA_END));
        selectedWeek.value = (isoWeekString(a) > maxWeek) ? maxWeek : isoWeekString(a);
    } else if (rangeMode.value === 'month') {
        const a = ymToDate(selectedMonth.value);
        a.setMonth(a.getMonth() + d, 1);

        // ✅ clamp month
        const maxMonth = ymString(new Date(LATEST_DATA_END));
        selectedMonth.value = (ymString(a) > maxMonth) ? maxMonth : ymString(a);
    } else {
        const nextYear = Number(selectedYear.value || new Date().getFullYear()) + d;

        // ✅ clamp year
        const maxYear = new Date(LATEST_DATA_END).getFullYear();
        selectedYear.value = Math.min(nextYear, maxYear);
    }

    applyRangeFromControls();
}


function boundsForSelection() {
    const mode = rangeMode.value;
    if (mode === 'day') {
        const d = selectedDay.value ? new Date(selectedDay.value) : startOfToday();
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 1);
        return { start, end };
    }
    if (mode === 'week') {
        const start = weekStringToDate(selectedWeek.value);
        const end = new Date(start); end.setDate(end.getDate() + 7);
        return { start, end };
    }
    if (mode === 'month') {
        const start = ymToDate(selectedMonth.value);
        const end = new Date(start); end.setMonth(end.getMonth() + 1, 1);
        return { start, end };
    }
    const y = Number(selectedYear.value || new Date().getFullYear());
    const start = new Date(y, 0, 1, 0, 0, 0, 0);
    const end = new Date(y + 1, 0, 1, 0, 0, 0, 0);
    return { start, end };
}

function initRangeControlsToNow(mode = 'day') {
    const now = new Date(LATEST_DATA_END); // ✅ was new Date()
    rangeMode.value = mode;
    selectedDay.value = isoDate(now);
    selectedWeek.value = isoWeekString(now);
    selectedMonth.value = ymString(now);
    selectedYear.value = now.getFullYear();
}


// small utils
function clampInt(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }
function pad2(n) { return String(n).padStart(2, '0'); }
function isoDate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function ymString(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; }
function ymToDate(ym) {
    if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1, 0, 0, 0, 0);
}

// ISO week helpers
function isoWeekString(d) {
    // Monday of the week for `d` (you already have this helper)
    const m = mondayOfISOWeek(d);

    // Monday of ISO week 1 (the week containing Jan 4)
    const jan4 = new Date(m.getFullYear(), 0, 4);
    const jan4Mon = mondayOfISOWeek(jan4);

    // Whole weeks between Jan4's Monday and our Monday
    const diffDays = Math.floor((m.getTime() - jan4Mon.getTime()) / 86400000);
    const week = 1 + Math.floor(diffDays / 7);

    return `${m.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weekStringToDate(w) {
    const m = String(w || '').match(/^(\d{4})-W(\d{2})$/);
    if (!m) { return mondayOfISOWeek(new Date()); }
    const y = Number(m[1]), wk = Number(m[2]);
    const jan4 = new Date(y, 0, 4);
    const jan4Mon = mondayOfISOWeek(jan4);
    const d = new Date(jan4Mon); d.setDate(d.getDate() + (wk - 1) * 7);
    d.setHours(0, 0, 0, 0);
    return d;
}
function mondayOfISOWeek(d) {
    const x = new Date(d); x.setHours(0, 0, 0, 0);
    const day = x.getDay() || 7;
    if (day !== 1) x.setDate(x.getDate() - (day - 1));
    return x;
}
function weekNumber(d) {
    const s = isoWeekString(d); return Number(s.slice(6));
}

/* =========================================================
   WATER — blocks, meters, cumulative mix, daily summary, trend
========================================================= */
const BLOCKS_URL = 'http://localhost:8080/blocks'
const METERS_URL = '/water_meters_combined_full_sorted.json'
const SUMMARY_URL = 'http://localhost:8080/summary/block' // ?date=YYYY-MM-DD

// ------- WDI -------
const wdiLoading = ref(false);
const wdiError = ref(null);
const wdiData = ref(null);
const wdiValue = computed(() => {
    const v = wdiData.value?.wdi;
    return Number.isFinite(Number(v)) ? Number(v) : null;
});
function minusDaysISO(iso, days) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d)) return '';
    d.setDate(d.getDate() - Math.abs(Number(days) || 0));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}
async function loadWdi() {
    wdiLoading.value = true;
    wdiError.value = null;
    try {
        const startIso = minusDaysISO(wasteFromISO.value, 1) || minusDaysISO(new Date().toISOString().slice(0, 10), 1);
        const endIso = wasteToISO.value || new Date().toISOString().slice(0, 10);
        const start = encodeURIComponent(yyyy_mm_dd_to_ddmmyyyy(startIso));
        const end = encodeURIComponent(yyyy_mm_dd_to_ddmmyyyy(endIso));
        const url = `${WASTE_BASE}/stats/wdi?start=${start}&end=${end}`
            + `&operational_days=1&staff_per_day=1&visitors_per_day=1`
            + `&include_recycled_in_disposed=false&use_year_totals=true`;
        const r = await fetch(url, { cache: 'no-cache' });
        if (!r.ok) throw new Error(`WDI HTTP ${r.status}`);
        const body = await r.json();
        wdiData.value = body || {};
    } catch (e) {
        wdiError.value = e?.message ?? 'Failed to load WDI';
        wdiData.value = null;
    } finally {
        wdiLoading.value = false;
    }
}
watch([wasteFromISO, wasteToISO], () => {
    if (isWasteRangeValid.value) loadWdi();
}, { immediate: true });

const apiBlocks = ref([]), blocksLoading = ref(false), blocksError = ref(false)
async function loadBlocks() {
    blocksLoading.value = true; blocksError.value = false
    try {
        const r = await fetch(BLOCKS_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        apiBlocks.value = Array.isArray(b?.items) ? b.items : []
    } catch (_) { blocksError.value = true } finally { blocksLoading.value = false }
}

/* Flatten meters for tag/source classification */
const metersLoading = ref(false), metersError = ref(null), flatRows = ref([])
function classifySource(remarks) {
    if (!remarks) return 'PUB'
    const s = String(remarks).trim().toLowerCase()
    return s === 'irrigation meter' || s.includes('irrigation') ? 'NEWater' : 'PUB'
}
async function loadMeters() {
    metersLoading.value = true; metersError.value = null
    try {
        const r = await fetch(METERS_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const data = await r.json()
        flatRows.value = flattenMeters(data)
    } catch (e) { metersError.value = e?.message ?? 'Load failed' } finally { metersLoading.value = false }
}
function flattenMeters(obj) {
    const out = []
    const toBlock = (label) => (String(label).match(/Block\s+([A-Z])/i)?.[1] ?? '').toUpperCase()
    Object.entries(obj || {}).forEach(([blockLabel, branch]) => {
        const block = toBlock(blockLabel)
        Object.entries(branch || {}).forEach(([k2, v2]) => {
            const isLevelAtK2 = /^level\b/i.test(k2)
            if (isLevelAtK2) {
                const levelLabel = k2
                Object.values(v2 || {}).forEach(meter => {
                    const mi = meter?.meter_info || {}
                    out.push({
                        block: String(mi.block || block || ''), level_label: levelLabel, level: mi.level || '',
                        meter_tag: mi.meter_tag || '', place: mi.place ?? '', location: mi.location ?? '',
                        serial_no: mi.serial_no ?? '', remarks: mi.remarks ?? '', section: mi.section ?? '',
                        source: classifySource(mi.remarks)
                    })
                })
            } else {
                const place = k2
                Object.entries(v2 || {}).forEach(([levelLabel, metersAtLevel]) => {
                    Object.values(metersAtLevel || {}).forEach(meter => {
                        const mi = meter?.meter_info || {}
                        out.push({
                            block: String(mi.block || block || ''), level_label: levelLabel, level: mi.level || '',
                            meter_tag: mi.meter_tag || '', place: mi.place ?? place, location: mi.location ?? '',
                            serial_no: mi.serial_no ?? '', remarks: mi.remarks ?? '', section: mi.section ?? '',
                            source: classifySource(mi.remarks)
                        })
                    })
                })
            }
        })
    })
    out.sort((a, b) => a.block.localeCompare(b.block) || a.level_label.localeCompare(b.level_label) || a.meter_tag.localeCompare(b.meter_tag))
    return out
}
const meterTagToSource = computed(() => {
    const m = Object.create(null)
    for (const r of flatRows.value || []) if (r?.meter_tag) m[r.meter_tag] = r.source || 'PUB'
    return m
})

const allMeterTags = computed(() => Array.from(new Set((flatRows.value || []).map(r => r?.meter_tag).filter(Boolean))).sort())
const selectionMeterTags = computed(() => allMeterTags.value)

// Water KPI values (filled by WaterOverallTrend.vue)
const kpiPubToday = ref(0)
const kpiNeToday = ref(0)

// when child emits { pub, ne } we update our cards
function onWaterDayPicked(payload = {}) {
    kpiPubToday.value = Number(payload.pub || 0)
    kpiNeToday.value = Number(payload.ne || 0)
}

function computeYesterdayIncoming(days, pubDaily, neDaily) {
    // Today, yesterday, and 2 days before (YYYY-MM-DD)
    const today = todayLocalISODate()
    const yday = ymdPrev(today)
    const yday2 = ymdPrev(yday)

    // Find their indexes in the daily arrays
    const idxY1 = days.indexOf(yday)
    const idxY2 = days.indexOf(yday2)

    // Compute the difference (yesterday - 2 days before)
    let pubDiff = 0, neDiff = 0
    if (idxY1 >= 0 && idxY2 >= 0) {
        pubDiff = (pubDaily[idxY1] || 0) - (pubDaily[idxY2] || 0)
        neDiff = (neDaily[idxY1] || 0) - (neDaily[idxY2] || 0)
    }

    // Return positive-only values (no negatives if data rolled over)
    return {
        pubIncoming: pubDiff > 0 ? pubDiff : 0,
        neIncoming: neDiff > 0 ? neDiff : 0,
    }
}




/* Daily campus usage summary (WUI numerator) */
const summaryDateLocal = ref(minusDaysISO(todayLocalISODate(), 1))
const summaryItems = ref([]), summaryLoading = ref(false), summaryError = ref(null)
async function loadBlockSummary() {
    summaryLoading.value = true; summaryError.value = null
    try {
        const url = `${SUMMARY_URL}?date=${encodeURIComponent(summaryDateLocal.value)}`
        const r = await fetch(url, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const p = await r.json()
        summaryItems.value = Array.isArray(p?.items) ? p.items : []
    } catch (e) { summaryError.value = e?.message ?? 'Load failed'; summaryItems.value = [] }
    finally { summaryLoading.value = false }
}
const kpiCampusToday = computed(() =>
    (summaryItems.value || []).reduce((a, it) => a + (Number(it.consumption) || 0), 0)
)

/* Water trend (All blocks) — PUB vs NEWater split line chart */
const granularity = ref('hourly')
const seriesLoading = ref(false), seriesError = ref(null)
const chartA = ref({ labels: [], datasets: [] })

// pick PUB + NEWater for a specific day from the chart
function syncWaterKpisFromChart(targetYmd = null) {
    const labels = chartA.value?.labels || []
    const datasets = chartA.value?.datasets || []
    if (!labels.length || !datasets.length) return

    // find PUB and NEWater datasets in the chart
    const pubDs = datasets.find(ds => String(ds.label || '').toLowerCase().includes('pub'))
    const neDs = datasets.find(ds => String(ds.label || '').toLowerCase().includes('ne'))

    // if chart doesn’t have both, don’t touch the KPIs
    if (!pubDs || !neDs) return

    // 1) if you gave me a date (e.g. 2025-10-30) and it exists, use it
    // 2) else fall back to the LAST label (latest day on chart)
    let wantedLabel = null
    if (targetYmd && labels.includes(targetYmd)) {
        wantedLabel = targetYmd
    } else {
        wantedLabel = labels[labels.length - 1]
    }

    const idx = labels.indexOf(wantedLabel)
    if (idx === -1) return

    const pubVal = Number(pubDs.data?.[idx] ?? 0)
    const neVal = Number(neDs.data?.[idx] ?? 0)

    // write into your existing KPIs
    kpiPubToday.value = Number.isFinite(pubVal) ? pubVal : 0
    kpiNeToday.value = Number.isFinite(neVal) ? neVal : 0
    // total = just use in template: kpiPubToday + kpiNeToday
}


function defaultStartISO() { return new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 19) + 'Z' }
function defaultEndISO() { return new Date().toISOString().slice(0, 19) + 'Z' }

function startOfYesterdayISO() {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    d.setHours(0, 0, 0, 0)
    return toIsoWithSeconds(toLocalISO(d))
}


function ymd(dateLike) {
    const d = new Date(dateLike)
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}
async function fetchSeries(tag, startISO, endISO) {
    try {
        const url = `http://localhost:8080/meters/${encodeURIComponent(tag)}/series?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}&fill_missing=false`
        const r = await fetch(url, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const data = await r.json()
        const arr = Array.isArray(data?.data) ? data.data : []
        return arr.map(row => ({ ts: row.ts, value: Number(row.consumption ?? 0) }))
    } catch { return [] }
}
function unionSortedTimestamps(seriesMap) {
    const set = new Set()
    for (const arr of Object.values(seriesMap)) for (const row of arr) if (row?.ts) set.add(row.ts)
    return Array.from(set).sort((a, b) => new Date(a) - new Date(b))
}
function valAt(arr, ts) {
    if (!Array.isArray(arr) || !arr.length) return 0
    const found = arr.find(x => x.ts === ts)
    const v = Number(found?.value ?? 0)
    return Number.isFinite(v) ? v : 0
}

async function loadWaterSeriesForSelection() {
    seriesLoading.value = true
    seriesError.value = null
    try {
        const { start, end } = waterBoundsForSelection()
        if (!start || !end) {
            chartA.value = { labels: [], datasets: [] }
            return
        }

        // Day → hourly, others → daily
        granularity.value = (waterRangeMode.value === 'day') ? 'hourly' : 'daily'

        const startISO = toIsoWithSeconds(toLocalISO(start))
        const endISO = toIsoWithSeconds(toLocalISO(end))

        const tags = selectionMeterTags.value || []
        if (!tags.length) {
            seriesError.value = 'No meter tags loaded. Check METERS_URL or flattening.'
            chartA.value = { labels: [], datasets: [] }
            return
        }

        // fetch all series within range
        const seriesMap = {}
        for (const t of tags) {
            seriesMap[t] = await fetchSeries(t, startISO, endISO)
        }

        // union timeline
        const timeline = unionSortedTimestamps(seriesMap)

        // split PUB/NEWater per point
        const pubHourly = []
        const neHourly = []
        for (const ts of timeline) {
            let pub = 0, ne = 0
            for (const tag of tags) {
                const val = valAt(seriesMap[tag], ts)
                if ((meterTagToSource.value[tag] || 'PUB') === 'NEWater') ne += val
                else pub += val
            }
            pubHourly.push(pub)
            neHourly.push(ne)
        }

        if (granularity.value === 'daily') {
            // aggregate to daily
            const bucket = new Map()
            for (let i = 0; i < timeline.length; i++) {
                const day = ymd(timeline[i])
                const cur = bucket.get(day) || { pub: 0, ne: 0 }
                cur.pub += Number(pubHourly[i] || 0)
                cur.ne += Number(neHourly[i] || 0)
                bucket.set(day, cur)
            }
            const days = Array.from(bucket.keys()).sort((a, b) => new Date(a) - new Date(b))
            const pubDaily = days.map(d => bucket.get(d).pub)
            const neDaily = days.map(d => bucket.get(d).ne)

            chartA.value = {
                labels: days,
                datasets: [
                    { label: 'PUB', data: pubDaily },
                    { label: 'NEWater', data: neDaily },
                ],
            }

            // ✅ update Water KPIs from chart (use selected day if present, else last day)
            syncWaterKpisFromChart(waterRangeMode.value === 'day' ? waterSelectedDay.value : null)
        } else {
            // hourly
            chartA.value = {
                labels: timeline,
                datasets: [
                    { label: 'PUB', data: pubHourly },
                    { label: 'NEWater', data: neHourly },
                ],
            }

            // ✅ update Water KPIs from chart (latest)
            syncWaterKpisFromChart()
        }

        // Optional: quick visibility while debugging
        console.info('[Water] tags:', tags.length, 'timeline points:', timeline.length)
        console.info('[Water] chart datasets sizes:',
            chartA.value.datasets?.map(d => d?.data?.length))
    } catch (e) {
        seriesError.value = e?.message ?? 'Load failed'
        chartA.value = { labels: [], datasets: [] }
    } finally {
        seriesLoading.value = false
    }
}


watch(
    [waterRangeMode, waterSelectedDay, waterSelectedWeek, waterSelectedMonth, waterSelectedYear],
    () => { if (!seriesLoading.value) loadWaterSeriesForSelection() },
    { immediate: true }
)

// If user toggles granularity manually (you can keep/remove this if you prefer strict auto):
watch(granularity, () => { if (!seriesLoading.value) loadWaterSeriesForSelection(); });

/* Water chart options */
const dtfHourly = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
const dtfDaily = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' })
const dtfFull = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
function fmtTick(iso, gran) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return gran === 'daily' ? dtfDaily.format(d) : dtfHourly.format(d)
}

function fmtTooltipTitle(iso) {
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '' : dtfFull.format(d)
}

const chartOptions = computed(() => {
    const ds = (chartA.value?.datasets?.[0]?.data ?? [])
    const finite = ds.filter(n => typeof n === 'number' && Number.isFinite(n))
    const min = finite.length ? Math.min(...finite) : 0
    const max = finite.length ? Math.max(...finite) : 0
    const isFlat = min === max
    const pad = isFlat ? (max === 0 ? 1 : Math.abs(max) * 0.1) : 0
    return {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
        scales: {
            x: { ticks: { color: '#cbd5e1', padding: 10, callback: (val, idx) => fmtTick(chartA.value?.labels?.[idx], granularity.value) }, grid: { color: 'rgba(255,255,255,.15)' } },
            y: { beginAtZero: true, suggestedMin: isFlat ? min : undefined, suggestedMax: isFlat ? max + pad : undefined, ticks: { color: '#cbd5e1', padding: 6 }, grid: { color: 'rgba(255,255,255,.15)' } }
        },
        plugins: {
            legend: { position: 'top', labels: { color: '#cbd5e1' } },
            tooltip: { mode: 'index', intersect: false, callbacks: { title: (items) => fmtTooltipTitle(chartA.value?.labels?.[items?.[0]?.dataIndex]) } }
        }
    }
})
const chartAChartData = computed(() => ({
    labels: chartA.value.labels,
    datasets: (chartA.value.datasets || []).map(ds => ({ ...ds, borderWidth: 2, tension: .35, pointRadius: 0, fill: false }))
}))

/* Site meta + WUI */
const META_URL = 'http://localhost:8080/meta/site'
const PUT_POP_URL = 'http://localhost:8080/meta/site/population'
const PUT_AREA_URL = 'http://localhost:8080/meta/site/area'
const site = reactive({ population: 0, area: 0, units: { area: 'km2' }, populationDraft: 0, areaDraft: 0, saving: false, error: null })
async function loadSiteMeta() {
    try {
        const r = await fetch(META_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        site.population = Number(b?.population || 0)
        site.area = Number(b?.area || 0)
        site.units = b?.units || { area: 'km2' }
        site.populationDraft = site.population
        site.areaDraft = site.area
    } catch (e) { site.error = e?.message ?? 'Failed to load site meta' }
}
async function savePopulation() {
    site.saving = true; site.error = null
    try {
        const r = await fetch(PUT_POP_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ population: site.populationDraft }) })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        site.population = Number(b?.population || site.populationDraft)
    } catch (e) { site.error = e?.message ?? 'Save failed' } finally { site.saving = false }
}
async function saveArea() {
    site.saving = true; site.error = null
    try {
        const r = await fetch(PUT_AREA_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ area: site.areaDraft }) })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        site.area = Number(b?.area || site.areaDraft)
    } catch (e) { site.error = e?.message ?? 'Save failed' } finally { site.saving = false }
}
const wuiMode = ref('population') // 'population' | 'area'
const kpiWui = computed(() => {
    const total = kpiCampusToday.value
    const denom = wuiMode.value === 'population' ? (Number(site.population) || 0) : (Number(site.area) || 0)
    if (!Number.isFinite(denom) || denom <= 0) return 0
    return total / denom
})

/* =========================================================
   ENERGY — hierarchy, windows, trend + Airside KPI
========================================================= */
const HIERARCHY_URL = 'http://127.0.0.1:8081/meta/hierarchy'
const HOUR_URL = 'http://127.0.0.1:8081/power/block-level/hour'
const DAY_URL = 'http://127.0.0.1:8081/power/block-level/day'
const DEV_HOUR_URL = 'http://127.0.0.1:8081/power/device/hour'
const DEV_DAY_URL = 'http://127.0.0.1:8081/power/device/day'
const METER_HOUR_URL = 'http://127.0.0.1:8081/power/meter/hour?limit=10000&offset=0'
const TREND_BASE_URL = 'http://127.0.0.1:8081/power/block-level/trend'

// NEW: aggregated by block (A, BD, C, ...)
const BLOCKS_TREND_URL = 'http://127.0.0.1:8081/power/blocks/trend'


const hierLoading = ref(false), hierError = ref(null)
const hierarchy = ref({ by_block_level: {}, by_panel: {} })
async function loadHierarchy() {
    hierLoading.value = true; hierError.value = null
    try {
        const r = await fetch(HIERARCHY_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        hierarchy.value = { by_block_level: b?.by_block_level || {}, by_panel: b?.by_panel || {} }
    } catch (e) {
        hierError.value = e?.message ?? 'Load failed'
        hierarchy.value = { by_block_level: {}, by_panel: {} }
    } finally { hierLoading.value = false }
}

/* ======================= ENERGY KPIs — MTD & DTD ======================= */
const energyKpiLoading = ref(false);
const energyKpiError = ref(null);
const kpiEnergyMonthToDate = ref(0);
const kpiEnergyDayToDate = ref(0);

function startOfMonth() { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }

// Sum kWh across all block+level pairs between [start, end)
async function sumEnergyKwhBetween(startDate, endDate) {
    const startIso = toIsoWithSeconds(toLocalISO(startDate));
    const endIso = toIsoWithSeconds(toLocalISO(endDate));

    const params = new URLSearchParams({ start: startIso, end: endIso });

    const resp = await fetch(`${BLOCKS_TREND_URL}?${params.toString()}`, {
        cache: 'no-cache',
    });

    const body = await resp.json();
    const series = Array.isArray(body?.series) ? body.series : [];

    let total = 0;
    for (const s of series) {
        for (const pt of (s.points || [])) {
            total += Number(pt.kwh || 0);
        }
    }

    return total;
}


async function loadEnergyKpis() {
    energyKpiLoading.value = true;
    energyKpiError.value = null;

    try {
        const latestEnd = endOfLatestDataDay();     // ✅ 8 Dec 23:59:59
        const latestStart = startOfLatestDataDay(); // ✅ 8 Dec 00:00:00

        const [mtd, dtd] = await Promise.all([
            // Month-to-date: from month start -> latest data end
            sumEnergyKwhBetween(startOfMonth(), latestEnd),

            // Day-to-date: from latest day start -> latest day end
            sumEnergyKwhBetween(latestStart, latestEnd),
        ]);

        kpiEnergyMonthToDate.value = mtd;
        kpiEnergyDayToDate.value = dtd;
    } catch (e) {
        energyKpiError.value = e?.message ?? 'Failed to load energy KPIs';
    } finally {
        energyKpiLoading.value = false;
    }
}


// Simple average kW proxies (kWh / hours elapsed)
const kpiEnergyMonthAvgKw = computed(() => {
    const start = startOfMonth().getTime();
    const hours = Math.max((Date.now() - start) / 3600000, 0.001);
    return kpiEnergyMonthToDate.value / hours;
});
const kpiEnergyDayAvgKw = computed(() => {
    const start = startOfToday().getTime();
    const hours = Math.max((Date.now() - start) / 3600000, 0.001);
    return kpiEnergyDayToDate.value / hours;
});

// Recompute when hierarchy arrives/changes
watch(() => hierarchy.value, () => { loadEnergyKpis(); }, { deep: true });

const powerLoading = ref(false), powerError = ref(null)
const hourPayload = ref({ window: 'hour', ts: null, rows: [], total_kwh: 0, total_kw: 0 })
const dayPayload = ref({ window: 'day', date: null, rows: [], total_kwh: 0, total_kw: 0 })
const devHourPayload = ref({ window: 'hour', ts: null, rows: [], total_kwh: 0, total_kw: 0 })
const devDayPayload = ref({ window: 'day', date: null, rows: [], total_kwh: 0, total_kw: 0 })
const meterHourPayload = ref({ window: 'hour', ts: null, rows: [] })
async function loadPowerWindows() {
    powerLoading.value = true; powerError.value = null
    try {
        const [rh, rd, rdh, rdd, rmh] = await Promise.all([
            fetch(HOUR_URL, { cache: 'no-cache' }),
            fetch(DAY_URL, { cache: 'no-cache' }),
            fetch(DEV_HOUR_URL, { cache: 'no-cache' }),
            fetch(DEV_DAY_URL, { cache: 'no-cache' }),
            fetch(METER_HOUR_URL, { cache: 'no-cache' }),
        ])
        if (!rh.ok) throw new Error('Hour HTTP ' + rh.status)
        if (!rd.ok) throw new Error('Day HTTP ' + rd.status)
        if (!rdh.ok) throw new Error('DevHour HTTP ' + rdh.status)
        if (!rdd.ok) throw new Error('DevDay HTTP ' + rdd.status)
        if (!rmh.ok) throw new Error('MeterHour HTTP ' + rmh.status)
        const [bh, bd, bdh, bdd, bmh] = await Promise.all([rh.json(), rd.json(), rdh.json(), rdd.json(), rmh.json()])
        hourPayload.value = { window: bh?.window || 'hour', ts: bh?.ts || null, rows: Array.isArray(bh?.rows) ? bh.rows : [], total_kwh: Number(bh?.total_kwh || 0), total_kw: Number(bh?.total_kw || 0) }
        dayPayload.value = { window: bd?.window || 'day', date: bd?.date || null, rows: Array.isArray(bd?.rows) ? bd.rows : [], total_kwh: Number(bd?.total_kwh || 0), total_kw: Number(bd?.total_kw || 0) }
        devHourPayload.value = { window: bdh?.window || 'hour', ts: bdh?.ts || null, rows: Array.isArray(bdh?.rows) ? bdh.rows : [], total_kwh: Number(bdh?.total_kwh || 0), total_kw: Number(bdh?.total_kw || 0) }
        devDayPayload.value = { window: bdd?.window || 'day', date: bdd?.date || null, rows: Array.isArray(bdd?.rows) ? bdd.rows : [], total_kwh: Number(bdd?.total_kwh || 0), total_kw: Number(bdd?.total_kw || 0) }
        meterHourPayload.value = { window: bmh?.window || 'hour', ts: bmh?.ts || null, rows: Array.isArray(bmh?.rows) ? bmh.rows : [] }
    } catch (e) {
        powerError.value = e?.message ?? 'Load failed'
        hourPayload.value = { window: 'hour', ts: null, rows: [], total_kwh: 0, total_kw: 0 }
        dayPayload.value = { window: 'day', date: null, rows: [], total_kwh: 0, total_kw: 0 }
        devHourPayload.value = { window: 'hour', ts: null, rows: [], total_kwh: 0, total_kw: 0 }
        devDayPayload.value = { window: 'day', date: null, rows: [], total_kwh: 0, total_kw: 0 }
        meterHourPayload.value = { window: 'hour', ts: null, rows: [] }
    } finally { powerLoading.value = false }
}
function sum(arr) { return arr.reduce((a, b) => a + Number(b || 0), 0) }
function aggregateFromRows(rows) { if (!Array.isArray(rows) || !rows.length) return { total_kwh: 0, total_kw: 0, rows: [] }; return { total_kwh: sum(rows.map(r => r.kwh)), total_kw: sum(rows.map(r => r.kw)), rows: [...rows] } }
const selectedHour = computed(() => aggregateFromRows(hourPayload.value.rows))

/* ===== Airside efficiency (robust) ===== */
/* ===== Airside efficiency (from /day) ===== */
const AIR_BASE = 'http://127.0.0.1:8081/efficiency';
const AIR_HOUR_URL = `${AIR_BASE}/day`;


const airLoading = ref(false), airError = ref(null);
const airNow = ref({ ts: null, kw_per_rt: null });

function pad(n) { return String(n).padStart(2, '0'); }
function hourFloor(d) { const x = new Date(d); x.setMinutes(0, 0, 0); return x; }
function fmtSGT(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00:00`; }
function fmtSGTOffset(d) { return `${fmtSGT(d)}+08:00`; }
function fmtUTC(d) {
    const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), 0, 0));
    return u.toISOString().replace('.000Z', 'Z');
}
function getLatestHourTs() {
    const d = new Date(); d.setMinutes(0, 0, 0)
    return d.toLocaleString('sv-SE', { timeZone: 'Asia/Singapore', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(' ', 'T')
}

async function loadAirLatest() {
    airLoading.value = true;
    airError.value = null;

    const now = new Date();
    const cur = hourFloor(now);
    const prev = hourFloor(new Date(cur.getTime() - 3600e3));

    const candidates = [
        null,
        fmtSGT(cur), fmtSGT(prev),
        fmtSGTOffset(cur), fmtSGTOffset(prev),
        fmtUTC(cur), fmtUTC(prev),
    ];

    function extractKwRt(b) {
        const p = Number(b?.kw_per_rt);
        if (Number.isFinite(p) && p > 0) return p;
        const kw = Number(b?.airside_kw);
        const rt = Number(b?.rt);
        if (Number.isFinite(kw) && Number.isFinite(rt) && rt > 0) {
            const d = kw / rt;
            return Number.isFinite(d) && d > 0 ? d : null;
        }
        return null;
    }

    try {
        let found = null;

        for (const ts of candidates) {
            const url = ts ? `${AIR_HOUR_URL}?ts=${encodeURIComponent(ts)}` : AIR_HOUR_URL;
            const r = await fetch(url, { cache: 'no-cache' });
            if (!r.ok) continue;

            const b = await r.json();
            let val = extractKwRt(b);

            if ((val == null || val === 0) && b && b.airside_kw != null && b.rt != null) {
                const kw = Number(b.airside_kw), rt = Number(b.rt);
                if (Number.isFinite(kw) && Number.isFinite(rt) && rt > 0) val = kw / rt;
            }

            if (val != null && Number.isFinite(val) && val > 0) {
                found = { ts: b?.ts ?? ts ?? null, kw_per_rt: val };
                break;
            }
        }

        if (!found) {
            // No usable data – treat as 0 instead of showing an error
            airNow.value = { ts: null, kw_per_rt: 0 };
            return;
        }

        airNow.value = found;
    } catch (e) {
        airError.value = e?.message ?? 'Failed to load airside efficiency';
        // Still show 0 in the KPI when there’s an error
        airNow.value = { ts: null, kw_per_rt: 0 };
    } finally {
        airLoading.value = false;
    }
}

/* =========================================================
   CHILLER — status/efficiency cards + TSE (kW/RT) combo
========================================================= */
const CHILLER_POINTS_URL = 'http://localhost:8082/points/latest?limit=500&offset=0'
const chillerLoading = ref(false), chillerError = ref(null), chillerPoints = ref([])
function normalizeName(s) { return String(s || '').trim().toLowerCase().replace(/[\s-]+/g, '_') }
function getPointByName(name) {
    if (!Array.isArray(chillerPoints.value)) return null
    const want = normalizeName(name)
    return chillerPoints.value.find(p => normalizeName(p?.object_name) === want) || null
}
function findStatusPoint(n) {
    const candidates = [`CH${n}_status`, `CH${n}_Status`, `Ch${n}_status`, `Ch${n}_Status`, `CH${n} status`, `CH${n}-status`]
    for (const nm of candidates) { const pt = getPointByName(nm); if (pt) return pt }
    return null
}
async function loadChillerPoints() {
    chillerLoading.value = true; chillerError.value = null
    try {
        const r = await fetch(CHILLER_POINTS_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const body = await r.json()
        chillerPoints.value = Array.isArray(body) ? body : (Array.isArray(body?.rows) ? body.rows : [])
    } catch (e) { chillerError.value = e?.message ?? 'Failed to load chiller points'; chillerPoints.value = [] }
    finally { chillerLoading.value = false }
}
const chillerCards = computed(() => {
    const out = []
    for (let i = 1; i <= 5; i++) {
        const eff = getPointByName(`CH${i}_Efficiency`) || getPointByName(`CH${i}_Efficienc`)
        const st = findStatusPoint(i)
        const online = st?.value === 1 ? true : st?.value === 0 ? false : null
        out.push({ id: i, effName: eff?.object_name || null, effValue: Number(eff?.value ?? NaN), effUnits: eff?.units || null, statusName: st?.object_name || null, online, ts: eff?.ts || st?.ts || null })
    }
    return out
})

/* TSE parts: point + hour API combined */
const EFF_HOUR_URL = 'http://127.0.0.1:8081/efficiency/hour'
const tseKwPerRt = ref(0), tseKwLoading = ref(false), tseKwError = ref(null)
async function loadTseKwPerRt() {
    tseKwLoading.value = true; tseKwError.value = null
    try {
        const params = new URLSearchParams({ ts: getLatestHourTs() })
        const r = await fetch(`${EFF_HOUR_URL}?${params.toString()}`, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        const v = Number(b?.kw_per_rt)
        tseKwPerRt.value = Number.isFinite(v) ? v : 0
    } catch (e) { tseKwError.value = e?.message ?? 'Load failed'; tseKwPerRt.value = 0 }
    finally { tseKwLoading.value = false }
}
const totalSystemEfficiencyPt = computed(() =>
    getPointByName('Total System Efficiency') ||
    getPointByName('Total_System_Efficiency') ||
    getPointByName('Total-System-Efficiency') ||
    getPointByName('TSE') ||
    getPointByName('Total System Efficiency (kW/RT)')
)
const tsePointValue = computed(() => {
    const v = Number(totalSystemEfficiencyPt.value?.value)
    return Number.isFinite(v) ? v : null
})
const tseTs = computed(() => totalSystemEfficiencyPt.value?.ts || null)

const airKwRt = computed(() => {
    const v = Number(airNow.value?.kw_per_rt);
    return Number.isFinite(v) ? v : null;
});

const waterKwRt = computed(() => {
    const v = Number(tsePointValue.value)
    return Number.isFinite(v) ? v : null
})

airKwRt
const tseValue = computed(() => {
    if (airKwRt.value == null || waterKwRt.value == null) return null
    return airKwRt.value + waterKwRt.value
})

const tseLoading = computed(() => chillerLoading.value || tseKwPerRt.value === null)
const tseError = computed(() => chillerError.value || tseKwError.value)

/* =========================================================
   WASTE — last 7 trend + range sheets + WDI
========================================================= */
const WASTE_BASE = 'http://localhost:8083'
const WASTE_TREND = `${WASTE_BASE}/stats/trend`
const WASTE_MONTHLY = `${WASTE_BASE}/stats/monthly`
const WASTE_SUMMARY = `${WASTE_BASE}/stats/summary`
// ===== WASTE — use /entries directly ==================================

const WASTE_ENTRIES_URL = 'http://localhost:8083/entries?limit=5000&offset=0&sort=asc'

const wasteEntries = ref([])
const wasteLoading = ref(false)
const wasteError = ref(null)

// Business Activity Indicator
const BAI = 24753

const MONTH_LABELS_SHORT = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
}

// "31/01/2025" -> Date
function parseDdMmYyyy(s) {
    if (!s) return null
    const parts = String(s).split('/')
    if (parts.length !== 3) return null
    const dd = Number(parts[0])
    const mm = Number(parts[1])
    const yyyy = Number(parts[2])
    const d = new Date(yyyy, mm - 1, dd)
    if (Number.isNaN(d.getTime())) return null
    return d
}

// 1. Build monthly WDI rows from /entries
// 1. Build monthly WDI rows from /entries,
//    ensuring every month appears (zero-filled if no data)
const wdiMonthlyRows = computed(() => {
    const acc = new Map()
    const yearSet = new Set()

    // First, accumulate actual data we have
    for (const row of wasteEntries.value || []) {
        const d = parseDdMmYyyy(row.date)
        if (!d) continue

        const year = d.getFullYear()
        const monthNum = d.getMonth() + 1
        const mm = String(monthNum).padStart(2, '0')
        const monthKey = `${mm}/${year}`

        yearSet.add(year)

        const cur = acc.get(monthKey) || {
            year,
            monthNum,
            general: 0,
            recycled: 0,
            food: 0
        }

        const g = Number(row.general ?? 0)
        const r = Number(row.recycled ?? 0)
        const f = Number(row.food ?? 0)

        acc.set(monthKey, {
            year,
            monthNum,
            general: cur.general + (Number.isFinite(g) ? g : 0),
            recycled: cur.recycled + (Number.isFinite(r) ? r : 0),
            food: cur.food + (Number.isFinite(f) ? f : 0)
        })
    }

    // If we have no data at all, just use the current year
    if (yearSet.size === 0) {
        yearSet.add(new Date().getFullYear())
    }

    const years = Array.from(yearSet).sort((a, b) => a - b)
    const out = []

    // For every year and every month, either use real data or zero-fill
    for (const year of years) {
        for (let monthNum = 1; monthNum <= 12; monthNum++) {
            const mm = String(monthNum).padStart(2, '0')
            const monthKey = `${mm}/${year}`
            const sums = acc.get(monthKey) || {
                year,
                monthNum,
                general: 0,
                recycled: 0,
                food: 0
            }

            const general = sums.general
            const recycled = sums.recycled
            const food = sums.food
            const total = general + recycled + food
            const daysInMonth = new Date(year, monthNum, 0).getDate()
            const operating_days = daysInMonth

            let wdi = 0
            if (general > 0 && BAI > 0 && operating_days > 0) {
                wdi = general / BAI / operating_days
            }

            const label = `${MONTH_LABELS_SHORT[mm] || mm} ${year}`

            out.push({
                month: monthKey,
                label,
                year,
                monthNum,
                general,
                recycled,
                food,
                total,
                operating_days,
                wdi
            })
        }
    }

    return out
})


// 2. Current month for KPI cards = *calendar* current month
const currentMonthSummary = computed(() => {
    const rows = wdiMonthlyRows.value || []

    // figure out this month (calendar)
    const now = new Date()
    const year = now.getFullYear()
    const monthNum = now.getMonth() + 1
    const mm = String(monthNum).padStart(2, '0')
    const monthKey = `${mm}/${year}`

    // try to find the row for *this* month,
    // even if total is 0 (because we zero-filled)
    const thisMonth = rows.find(r => r.month === monthKey)
    if (thisMonth) {
        return thisMonth
    }

    // if somehow there is no row for this month, fall back:
    const rowsWithData = rows.filter(r => r.total > 0)
    if (rowsWithData.length) {
        return rowsWithData[rowsWithData.length - 1]
    }

    // final fallback – empty current month object
    const daysInMonth = new Date(year, monthNum, 0).getDate()
    return {
        month: monthKey,
        label: `${MONTH_LABELS_SHORT[mm] || mm} ${year}`,
        general: 0,
        recycled: 0,
        food: 0,
        total: 0,
        operating_days: daysInMonth,
        wdi: 0
    }
})


// 3. Chart data/options (inline + fullscreen)
const wdiChartData = computed(() => ({
    labels: wdiMonthlyRows.value.map(r => r.label),
    datasets: [
        {
            label: 'Waste Disposal Index (WDI)',
            data: wdiMonthlyRows.value.map(r => r.wdi),
            borderWidth: 1,
            tension: 0.35,
            cubicInterpolationMode: 'monotone',
            pointRadius: 2,
            spanGaps: true,
            fill: false
        }
    ]
}))

const wdiChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 32, left: 8 } },
    scales: {
        x: {
            type: 'category',
            ticks: { color: '#cbd5e1' },
            grid: { color: 'rgba(255,255,255,0.15)' }
        },
        y: {
            beginAtZero: true,
            ticks: { color: '#cbd5e1' },
            grid: { color: 'rgba(255,255,255,0.15)' }
        }
    },
    plugins: {
        legend: { position: 'top', labels: { color: '#cbd5e1' } },
        tooltip: { mode: 'index', intersect: false }
    }
}

// 4. Loader for /entries
async function loadWasteEntries() {
    wasteLoading.value = true
    wasteError.value = null
    try {
        const res = await fetch(WASTE_ENTRIES_URL, { cache: 'no-cache' })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const data = await res.json()
        wasteEntries.value = Array.isArray(data) ? data : []
    } catch (e) {
        wasteError.value = e && e.message ? e.message : 'Failed to load waste entries'
        wasteEntries.value = []
    } finally {
        wasteLoading.value = false
    }
}

// 5. Fullscreen handler (you already have fullscreenChart + closeFullscreen)
function openWasteChart() {
    fullscreenChart.value = 'waste'
}

const wasteTrendRows = ref([])
const wasteMonthlyRows = ref([])
const wasteSummary = reactive({ start: null, end: null, days: 0, entries: 0, total_general: 0, total_recycled: 0, total_waste: 0, avg_per_day_total: 0, diversion_rate: 0 })

const wasteLoading7 = ref(false), wasteError7 = ref(null)
const wasteTrendRows7 = ref([])
const wasteSummary7 = reactive({ start: null, end: null, days: 0, entries: 0, total_general: 0, total_recycled: 0, total_waste: 0, avg_per_day_total: 0, diversion_rate: 0 })
function isoMinusDays(isoYYYYMMDD, days) {
    const [y, m, d] = isoYYYYMMDD.split('-').map(Number)
    const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() - days)
    const yy = dt.getFullYear(), mm = String(dt.getMonth() + 1).padStart(2, '0'), dd = String(dt.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
}
const last7FromISO = computed(() => isoMinusDays(todayLocalISODate(), 6))
const last7ToISO = computed(() => todayLocalISODate())
const last7DateLabel = computed(() => `${yyyy_mm_dd_to_ddmmyyyy(last7FromISO.value)} – ${yyyy_mm_dd_to_ddmmyyyy(last7ToISO.value)}`)

function aggregateByKey(rows, key, fieldsToSum) {
    const map = new Map()
    for (const r of rows || []) {
        const k = r?.[key]; if (!k) continue
        const cur = map.get(k) || {}
        const nxt = { ...cur }
        for (const f of fieldsToSum) {
            const v = Number(r?.[f] ?? 0)
            nxt[f] = Number(nxt[f] ?? 0) + (Number.isFinite(v) ? v : 0)
        }
        nxt[key] = k
        map.set(k, nxt)
    }
    const out = Array.from(map.values())
    if (key === 'date') {
        out.sort((a, b) => {
            const [ad, am, ay] = a.date.split('/').map(Number)
            const [bd, bm, by] = b.date.split('/').map(Number)
            return new Date(ay, am - 1, ad) - new Date(by, bm - 1, bd)
        })
    } else if (key === 'month') {
        out.sort((a, b) => {
            const [am, ay] = a.month.split('/').map(Number)
            const [bm, by] = b.month.split('/').map(Number)
            return new Date(ay, am - 1, 1) - new Date(by, bm - 1, 1)
        })
    }
    return out
}
const wasteTrendAggRows7 = computed(() => aggregateByKey(wasteTrendRows7.value, 'date', ['total_waste_ma7', 'diversion_rate_ma7']))
const wasteTrendChartData7 = computed(() => ({
    labels: wasteTrendAggRows7.value.map(r => r.date),
    datasets: [
        { label: 'Total Waste MA7 (kg)', data: wasteTrendAggRows7.value.map(r => r.total_waste_ma7 ?? null), borderWidth: 2, tension: 0.35, cubicInterpolationMode: 'monotone', pointRadius: 2, spanGaps: true, fill: false },
        { label: 'Diversion Rate MA7 (%)', data: wasteTrendAggRows7.value.map(r => r.diversion_rate_ma7 != null ? (r.diversion_rate_ma7 * 100) : null), borderWidth: 2, tension: 0.35, cubicInterpolationMode: 'monotone', pointRadius: 2, spanGaps: true, fill: false }
    ]
}))
const wasteTrendChartOpts = {
    responsive: true, maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
    scales: {
        x: { type: 'category', ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,.15)' } },
        y: { beginAtZero: true, ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,.15)' } }
    },
    plugins: { legend: { position: 'top', labels: { color: '#cbd5e1' } }, tooltip: { mode: 'index', intersect: false } }
}

async function loadWasteLast7() {
    wasteLoading7.value = true; wasteError7.value = null
    try {
        const p1 = new URLSearchParams({ start: yyyy_mm_dd_to_ddmmyyyy(last7FromISO.value), end: yyyy_mm_dd_to_ddmmyyyy(last7ToISO.value), window: '7' })
        const r1 = await fetch(`${WASTE_TREND}?${p1.toString()}`, { cache: 'no-cache' })
        if (!r1.ok) throw new Error(`Trend7 HTTP ${r1.status}`)
        wasteTrendRows7.value = await r1.json()

        const p2 = new URLSearchParams({ start: yyyy_mm_dd_to_ddmmyyyy(last7FromISO.value), end: yyyy_mm_dd_to_ddmmyyyy(last7ToISO.value) })
        const r2 = await fetch(`${WASTE_SUMMARY}?${p2.toString()}`, { cache: 'no-cache' })
        if (!r2.ok) throw new Error(`Summary7 HTTP ${r2.status}`)
        Object.assign(wasteSummary7, await r2.json())
    } catch (e) {
        wasteError7.value = e?.message ?? 'Failed to load last-7 waste data'
        wasteTrendRows7.value = []
        Object.assign(wasteSummary7, { days: 0, entries: 0, total_waste: 0, avg_per_day_total: 0, diversion_rate: 0 })
    } finally { wasteLoading7.value = false }
}

async function loadWasteTrend() {
    const params = new URLSearchParams()
    if (wasteFromISO.value) params.set('start', yyyy_mm_dd_to_ddmmyyyy(wasteFromISO.value))
    if (wasteToISO.value) params.set('end', yyyy_mm_dd_to_ddmmyyyy(wasteToISO.value))
    params.set('window', '7')
    const r = await fetch(`${WASTE_TREND}?${params.toString()}`, { cache: 'no-cache' })
    if (!r.ok) {
        const t = await r.text().catch(() => '')
        throw new Error(`Trend HTTP ${r.status}: ${t || 'failed'}`)
    }
    wasteTrendRows.value = await r.json()
}
async function loadWasteMonthly() {
    const params = new URLSearchParams()
    if (wasteFromISO.value) params.set('start', yyyy_mm_dd_to_ddmmyyyy(wasteFromISO.value))
    if (wasteToISO.value) params.set('end', yyyy_mm_dd_to_ddmmyyyy(wasteToISO.value))
    const r = await fetch(`${WASTE_MONTHLY}?${params.toString()}`, { cache: 'no-cache' })
    if (!r.ok) throw new Error(`Monthly HTTP ${r.status}`)
    wasteMonthlyRows.value = await r.json()
}
async function loadWasteSummary() {
    const params = new URLSearchParams()
    if (wasteFromISO.value) params.set('start', yyyy_mm_dd_to_ddmmyyyy(wasteFromISO.value))
    if (wasteToISO.value) params.set('end', yyyy_mm_dd_to_ddmmyyyy(wasteToISO.value))
    const r = await fetch(`${WASTE_SUMMARY}?${params.toString()}`, { cache: 'no-cache' })
    if (!r.ok) throw new Error(`Summary HTTP ${r.status}`)
    Object.assign(wasteSummary, await r.json() || {})
}
async function loadWasteAll() {
    if (!isWasteRangeValid.value) return
    wasteLoading.value = true; wasteError.value = null
    try {
        await Promise.all([loadWasteTrend(), loadWasteMonthly(), loadWasteSummary()])
    } catch (e) {
        wasteError.value = e?.message ?? 'Failed to load waste data'
        wasteTrendRows.value = []; wasteMonthlyRows.value = []
    } finally { wasteLoading.value = false }
}


/* ===================== Kickoff & timed refresh ===================== */
let hourlyTimer = null
onMounted(async () => {
    // WATER
    await Promise.all([loadBlocks(), loadMeters()])
    await loadBlockSummary()
    await loadWaterSeriesForSelection()
    await loadSiteMeta()

    // ENERGY
    await loadEnergyKpis();
    await loadHierarchy()
    await loadPowerWindows()

    // Trend default = today 00:00 -> now
    initRangeControlsToNow('day');
    await applyRangeFromControls(); // this already calls loadTrendForSelection()

    // Airside + Chiller + TSE
    await Promise.all([loadAirLatest(), loadChillerPoints()])
    await loadTseKwPerRt()

    // Waste defaults + last 7 + WDI
    await loadWasteAll()
    await loadWasteLast7()
    await loadWdi()

    await loadWasteEntries()

    // hourly soft refresh
    scheduleHourlyReload()
})

onBeforeUnmount(() => { if (hourlyTimer) clearTimeout(hourlyTimer) })
function scheduleHourlyReload() {
    const now = new Date(), next = new Date(now)
    next.setHours(now.getHours() + 1, 1, 0, 0)
    const msUntilNext = next.getTime() - now.getTime()
    hourlyTimer = setTimeout(async () => {
        trendStartLocal.value = toLocalISO(startOfToday())
        trendEndLocal.value = toLocalISO(new Date())
        await Promise.all([
            loadHierarchy(), loadPowerWindows(), loadAirLatest(), loadChillerPoints(), loadTseKwPerRt(),
            loadWasteAll(), loadWasteLast7(), loadWdi(), loadEnergyKpis(),
        ])


        scheduleHourlyReload()
    }, msUntilNext)
}

/* Period segmented control */
const periodMode = ref('overall') // or 'business' if you prefer that as default

async function setPeriodMode(mode) {
    if (periodMode.value === mode) return   // nothing to do

    periodMode.value = mode
    resetToTimeTrend()                      // exit Compare view if active

    // Re-run the trend using the current day/week/month/year selection
    await applyTrend()
}

// Trend inputs
const trendStartLocal = ref('');
const trendEndLocal = ref('');
const canApplyTrend = computed(() => {
    const s = trendStartLocal.value, e = trendEndLocal.value;
    return !!(s && e && new Date(s) < new Date(e));
});

const trendLoading = ref(false), trendError = ref(null);
const trendSeries = ref({ labels: [], data: [], type: 'line' });

// Fetch per block/level
async function fetchTrendForOne(block, level, startIso, endIso) {
    const params = new URLSearchParams({ block, level, start: startIso, end: endIso });
    const url = `${TREND_BASE_URL}?${params.toString()}`;
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${block}.${level} HTTP ${r.status}`);
    return r.json();
}
function allBlockLevelPairs() {
    const out = [], bbl = hierarchy.value.by_block_level || {};
    for (const blk of Object.keys(bbl)) for (const lvl of Object.keys(bbl[blk] || {})) out.push({ block: blk, level: lvl });
    return out;
}

// Use /power/blocks/trend and always show OVERALL (sum of blocks A,B,C,D,E,F,G,H,J,K)
async function loadTrendForSelection() {
    const startIso = toIsoWithSeconds(trendStartLocal.value);
    const endIso = toIsoWithSeconds(trendEndLocal.value);
    if (!startIso || !endIso) return;

    trendLoading.value = true;
    trendError.value = null;

    try {
        const params = new URLSearchParams({ start: startIso, end: endIso });

        const resp = await fetch(`${BLOCKS_TREND_URL}?${params.toString()}`, {
            cache: 'no-cache',
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);

        const body = await resp.json();
        const series = Array.isArray(body?.series) ? body.series : [];

        // Only count these blocks
        const allowedBlocks = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K']);

        // ts -> total kWh across allowed blocks
        const bucket = new Map();

        for (const s of series) {
            const key = String(s.key || '').toUpperCase();
            if (!allowedBlocks.has(key)) continue;  // skip anything else

            for (const pt of (s.points || [])) {
                const ts = String(pt.ts);
                const val = Number(pt.kwh || 0);
                if (!Number.isFinite(val)) continue;
                bucket.set(ts, (bucket.get(ts) || 0) + val);
            }
        }

        // All timestamps sorted
        const tsAll = Array.from(bucket.keys())
            .sort((a, b) => new Date(a) - new Date(b));

        // Apply Overall / Business / Offpeak1 / Offpeak2 filter
        const tsFiltered = tsAll.filter(ts => periodAllow(ts, periodMode.value));

        if (rangeMode.value === 'day') {
            // Day view = hourly line, filtered by period
            trendSeries.value = {
                labels: tsFiltered,
                data: tsFiltered.map(ts => bucket.get(ts) || 0),
                type: 'line',
            };
        } else {
            // Week / Month / Year = aggregate filtered hours by day / month / year
            const agg = new Map(); // keyFor(...) -> total kWh
            for (const ts of tsFiltered) {
                const k = keyFor(ts, rangeMode.value);
                agg.set(k, (agg.get(k) || 0) + (bucket.get(ts) || 0));
            }

            const sorter = sortKeyFn(rangeMode.value);
            const labels = Array.from(agg.keys()).sort(sorter);

            trendSeries.value = {
                labels,
                data: labels.map(k => agg.get(k) || 0),
                type: 'bar',
            };
        }
    } catch (e) {
        console.error('loadTrendForSelection error', e);
        trendError.value = e?.message ?? 'Trend load failed';
        trendSeries.value = { labels: [], data: [], type: 'line' };
    } finally {
        trendLoading.value = false;
    }
}




// Chart plumbing
function fmtTrendTick(value, idx) {
    const raw = labelFromTickValue(value, idx);
    return formatLabel(raw);
}
function fmtTrendTooltip(idx) {
    const labels = getActiveLabels();
    const raw = labels[idx];
    return formatLabel(raw);
}

const trendChartData = computed(() => {
    if (compareView.value) {
        const base = { data: blocksCompare.value.data };
        const line = { ...base, label: 'kWh', type: 'line', borderWidth: 2, tension: 0.35, pointRadius: 3, fill: false };
        if (trendMode.value === 'combo') {
            const bars = { ...base, label: 'kWh (bars)', type: 'bar' };
            return { labels: blocksCompare.value.labels, datasets: [bars, line] };
        }
        return { labels: blocksCompare.value.labels, datasets: [line] };
    }

    return {
        labels: trendSeries.value.labels,
        datasets: [{
            label: 'kWh',
            type: trendSeries.value.type,
            data: trendSeries.value.data,
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 0,
            fill: false
        }]
    };
});

const trendChartOptions = computed(() => ({
    responsive: true, maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
    scales: {
        x: {
            ticks: {
                color: '#cbd5e1',
                padding: 10,
                autoSkip: true,
                maxTicksLimit: 12,
                maxRotation: 0,
                callback: (value, idx) => fmtTrendTick(value, idx),
            },
            grid: { color: 'rgba(255,255,255,.15)' }
        },
        y: {
            beginAtZero: true,
            ticks: { color: '#cbd5e1', padding: 6 },
            grid: { color: 'rgba(255,255,255,.15)' }
        },
    },
    plugins: {
        legend: { position: 'top', labels: { color: '#cbd5e1' } },
        tooltip: {
            mode: 'index', intersect: false,
            callbacks: {
                title: (items) => fmtTrendTooltip(items?.[0]?.dataIndex ?? 0)
            }
        }
    },
}));

// Apply button
function applyTrend() {
    if (!canApplyTrend.value) return;
    resetToTimeTrend();
    loadTrendForSelection();
}

/* Compare view + chart mode */
const compareView = ref(false)
const trendMode = ref('line') // 'line' | 'combo'
function enterBlocksCompare(mode) {
    trendMode.value = (mode === 'combo') ? 'combo' : 'line'
    compareView.value = true
    recomputeBlocksCompare()
}
const resetToTimeTrend = () => { compareView.value = false }

function periodNameForHour(h) {
    if (h >= 7 && h < 18) return 'business'
    if (h >= 18 && h < 23) return 'offpeak1'
    return 'offpeak2'
}

const blocksCompare = ref({ labels: [], data: [] })

async function recomputeBlocksCompare() {
    const sel = selectedDayISO()
    if (!sel) { blocksCompare.value = { labels: [], data: [] }; return }

    const pairs = allBlockLevelPairs()
    if (!pairs.length) { blocksCompare.value = { labels: [], data: [] }; return }

    try {
        const payloads = await Promise.all(
            pairs.map(p => fetchTrendForOne(p.block, p.level, sel.startIso, sel.endIso))
        )

        const byBlock = new Map()

        for (let i = 0; i < pairs.length; i++) {
            const block = pairs[i].block
            const series = payloads[i]?.series || []
            for (const s of series) {
                for (const pt of (s.points || [])) {
                    const prev = byBlock.get(block) || 0
                    byBlock.set(block, prev + Number(pt.kwh || 0))
                }
            }
        }

        const labels = Array.from(byBlock.keys())
            .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }))

        blocksCompare.value = { labels, data: labels.map(b => byBlock.get(b) || 0) }
    } catch (e) {
        console.error('recomputeBlocksCompare failed:', e)
        blocksCompare.value = { labels: [], data: [] }
    }
}

function selectedDayISO() {
    if (!selectedDay.value) return null
    const sd = new Date(selectedDay.value)
    const start = new Date(sd); start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setDate(end.getDate() + 1)
    return { startIso: toIsoWithSeconds(toLocalISO(start)), endIso: toIsoWithSeconds(toLocalISO(end)) }
}

/* Keep compare data fresh when inputs change */
watch([trendStartLocal, trendEndLocal, () => hierarchy.value], () => {
    if (compareView.value) recomputeBlocksCompare()
}, { deep: true })

/* Watchers */
watch(granularity, loadWaterSeriesForSelection)
watch(summaryDateLocal, loadBlockSummary)
watch([wasteFromISO, wasteToISO], () => { if (isWasteRangeValid.value) { loadWasteAll(); loadWdi() } })
</script>



<style scoped>
/* ===== Prevent page "expansion" when popovers open ===== */
:root {
    scrollbar-gutter: stable both-edges;
}

@supports not (scrollbar-gutter: stable) {
    html {
        overflow-y: scroll;
    }
}

/* =========================
   Base layout + theme
   ========================= */
.dashboard-container {
    display: grid;
    /* 2×2 layout for the 4 sections */
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 16px;
    background: #0a1f44;
    /* deep navy */
    color: #fff;
}

/* Each category panel */
.column {
    background: #112d5c;
    border-radius: 8px;
    padding: 12px;
    min-width: 0;
    /* prevent chart overflow */
}

/* =========================
   Section header + controls
   ========================= */
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    position: relative;
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
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: #1976d2;
}

/* Optional different tints per section */
.gear-icon {
    background: #f59e0b;
}

/* energy - amber */
.leaf-icon {
    background: #3b82f6;
}

/* water  - blue  */
.resources-icon {
    background: #a855f7;
}

/* chiller - purple */

/* =========================
   Cards
   ========================= */
.card {
    background: #1e3f7a;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.card-head-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

/* =========================
   KPI grid
   ========================= */
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
    padding: 6px 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 96px;
    position: relative;
}

.kpi-title {
    font-size: .78rem;
    color: #fff;
    margin-bottom: 4px;
    opacity: .95;
    display: flex;
    align-items: center;
    gap: 6px;
}

.kpi-number {
    font-size: 1.3rem;
    font-weight: 800;
    color: #fff;
    margin-bottom: 2px;
}

.kpi-unit {
    font-size: .75rem;
    color: #fff;
    opacity: .95;
}

.kpi-sub {
    font-size: .75rem;
    color: #cbd5e1;
}

/* =========================
   Chips / buttons / segmented
   ========================= */
.chip {
    font-size: .8rem;
    color: #fff;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .12);
    padding: 7px 12px;
    border-radius: 999px;
    cursor: pointer;
}

.chip.mini {
    padding: 2px 8px;
    font-size: .72rem;
}

.icon-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    display: grid;
    place-items: center;
    border-radius: 999px;
}

.icon-btn i {
    pointer-events: none;
}

.segmented {
    display: inline-flex;
    gap: 6px;
    margin-left: 8px;
}

.segmented-placeholder {
    width: 0;
    flex: 1 0 auto;
}

.chip.active {
    background: rgba(59, 130, 246, .25);
    border-color: rgba(59, 130, 246, .5);
}

/* =========================
   WUI editor popover
   ========================= */
.wui-card {
    position: relative;
}

.edit-btn {
    position: absolute;
    top: 8px;
    right: 8px;
}

.meta-editor {
    position: absolute;
    top: 42px;
    right: 8px;
    z-index: 25;
    width: 300px;
    max-width: min(300px, calc(100% - 16px));
    background: rgba(7, 19, 48, .94);
    border: 1px solid rgba(255, 255, 255, .25);
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, .45);
}

.meta-editor label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
}

.meta-editor input {
    width: 100%;
    margin-top: 4px;
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, .25);
    background: #16366f;
    color: #fff;
}

.meta-editor .editor-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 6px 0 4px;
}

.meta-editor small {
    display: block;
}

/* =========================
   Controls (selectors, inputs)
   ========================= */
.controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
    background: #112d5c;
    padding: 8px;
    border-radius: 6px;
}

.controls-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

select,
input[type="datetime-local"],
input[type="date"],
input[type="number"] {
    background: #16366f;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, .25);
    border-radius: 6px;
    padding: 6px 8px;
}

select {
    background-color: #1e293b;
    color: #fff;
    border: 1px solid #334155;
}

select:focus {
    outline: none;
    border-color: #3b82f6;
}

option {
    background-color: #1e293b;
    color: #fff;
}

/* =========================
   Chart module
   ========================= */
.chart-module {
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
    background: #112d5c;
    min-height: 300px;
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.card-header h3 {
    margin: 0;
    font-size: 1rem;
    color: #e5e7eb;
}

.chart-wrap {
    height: 100%;
}

/* =========================
   Waste summary chips
   ========================= */
.summary-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.summary-chip {
    background: rgba(255, 255, 255, .08);
    border: 1px solid rgba(255, 255, 255, .18);
    color: #e5e7eb;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: .82rem;
}

/* =========================
   Chiller cards
   ========================= */
.kpi-grid-chillers .chiller-card {
    position: relative;
    min-height: 96px;
}

.status-pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .2px;
    border: 1px solid rgba(255, 255, 255, .25);
    background: rgba(255, 255, 255, .08);
    color: #e5e7eb;
}

.status-pill.ok {
    background: rgba(34, 197, 94, .18);
    border-color: rgba(34, 197, 94, .45);
    color: #bbf7d0;
}

.status-pill.bad {
    background: rgba(239, 68, 68, .18);
    border-color: rgba(239, 68, 68, .45);
    color: #fecaca;
}

.status-pill.unknown {
    background: rgba(148, 163, 184, .18);
    border-color: rgba(148, 163, 184, .45);
    color: #e2e8f0;
}

/* =========================
   Fullscreen modals (charts)
   ========================= */
.fs-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    background: rgba(0, 0, 0, .55);
    display: grid;
    place-items: center;
}

.fs-modal {
    width: min(1400px, 96vw);
    height: min(86vh, 900px);
    background: #0f172a;
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, .12);
    border-radius: 12px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, .6);
    display: grid;
    grid-template-rows: auto 1fr;
    overflow: hidden;
}

.fs-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, .12);
}

.fs-close-btn {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, .15);
    background: rgba(255, 255, 255, .08);
    color: #fff;
    cursor: pointer;
}

.fs-close-btn:hover {
    background: rgba(255, 255, 255, .18);
}

.fs-modal-body {
    padding: 8px 12px 12px;
    height: 100%;
}

.fs-modal-body .chart-wrap,
.fs-modal-body canvas {
    height: 100% !important;
}

/* =========================
   Utilities
   ========================= */
.muted {
    color: #9fb0ff;
    opacity: .9;
}

.err {
    color: #fda4af;
}

/* =========================
   Responsive
   ========================= */
@media (max-width: 1200px) {
    .dashboard-container {
        grid-template-columns: 1fr;
        /* stack all four sections */
    }

    .chart-wrap {
        height: 280px;
    }
}

@media (max-width: 768px) {
    .dashboard-container {
        padding: 12px;
    }

    .chart-wrap {
        height: 240px;
    }
}

/* ===== Energy trend controls ===== */
.trend-controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin: 6px 0 10px;
}

.trend-controls-row .muted {
    font-weight: 600;
    white-space: nowrap;
}

/* Right-side picker cluster */
.trend-pickers {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

/* Make all chips/inputs the same height and vertically centered */
.trend-pickers .chip {
    display: inline-flex;
    align-items: center;
    height: 34px;
    line-height: 1;
    padding: 6px 10px;
    /* keep pill look */
}

/* Inputs sizing */
.trend-pickers input[type="date"],
.trend-pickers input[type="week"],
.trend-pickers input[type="month"] {
    min-width: 150px;
}

.trend-pickers input[type="number"] {
    width: 92px;
    /* year input */
    text-align: center;
}

/* Steppers */
.trend-pickers .icon-btn {
    width: 34px;
    height: 34px;
    padding: 12px;
}

.trend-pickers .icon-btn:disabled {
    opacity: .5;
    cursor: not-allowed;
}

/* Compact on small screens: stack label above controls */
@media (max-width: 880px) {
    .trend-controls-row {
        flex-direction: column;
        align-items: stretch;
    }

    .trend-pickers {
        justify-content: flex-start;
    }
}

/* ===== Nicer Period Segmented Control ===== */
.segmented-pills {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, .08);
    border: 1px solid rgba(255, 255, 255, .14);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .12);
}

.seg-pill {
    height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    border: 0;
    cursor: pointer;
    color: #e5e7eb;
    background: transparent;
    font-size: .8rem;
    font-weight: 700;
    letter-spacing: .1px;
    transition: background .15s ease, border-color .15s ease, transform .05s ease;
}

.seg-pill:hover {
    background: rgba(255, 255, 255, .08);
}

.seg-pill:active {
    transform: translateY(1px);
}

.seg-pill.active {
    background: rgba(59, 130, 246, .22);
    border: 1px solid rgba(59, 130, 246, .45);
    color: #fff;
}

.period-caption {
    margin-top: 6px;
    font-size: .78rem;
    color: #cbd5e1;
    opacity: .95;
}

/* Make it wrap nicely on small screens */
@media (max-width: 880px) {
    .trend-actions {
        width: 100%;
    }

    .segmented-pills {
        width: 100%;
        justify-content: space-between;
    }

    .seg-pill {
        flex: 1 1 auto;
        text-align: center;
    }
}

/* Make the row behave like: left info | (spacer) | right controls */
.trend-controls-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    /* not space-between */
    gap: 12px;
    flex-wrap: wrap;
    /* keeps it responsive */
}

/* Push date pickers cluster to the right */
.trend-pickers {
    margin-left: auto;
    /* ✅ this is the key */
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}
</style>
