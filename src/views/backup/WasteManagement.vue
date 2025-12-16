<template>
    <div class="waste-management-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Waste Management</h2>
            <div class="page-header-right">
                <nav class="breadcrumb">
                    <span>Cavill</span> &gt; <span>Management</span> &gt; <span>Waste Management</span>
                </nav>
            </div>
        </div>

        <!-- View Tabs + Download buttons on same line -->
        <div class="view-tab-bar">
            <div class="view-tab-nav">
                <button :class="{ active: viewTab === 'Dashboard' }" @click="switchTab('Dashboard')">Dashboard</button>
                <button :class="{ active: viewTab === 'Entries' }" @click="switchTab('Entries')">Entries</button>
            </div>

            <!-- Quick exports (server CSV endpoints) -->
            <div style="display:flex; gap:8px">
                <button class="icon-btn" @click="reloadAll"
                    :title="(wasteLoading || entriesLoading) ? 'Loading…' : 'Reload'">
                    <i class="fas fa-rotate"></i>
                </button>
                <a class="icon-btn" :href="WASTE_EXPORT_DAILY" target="_blank" rel="noopener" title="Daily CSV">
                    <i class="fas fa-file-csv"></i>
                </a>
                <a class="icon-btn" :href="WASTE_EXPORT_MONTHLY" target="_blank" rel="noopener" title="Monthly CSV">
                    <i class="fas fa-calendar"></i>
                </a>
                <a class="icon-btn" :href="WASTE_EXPORT_SUMMARY" target="_blank" rel="noopener" title="Summary CSV">
                    <i class="fas fa-chart-line"></i>
                </a>
                <a class="icon-btn" :href="WASTE_EXPORT_REPORT" target="_blank" rel="noopener" title="Full Report CSV">
                    <i class="fas fa-download"></i>
                </a>
            </div>
        </div>

        <!-- ========================= DASHBOARD ========================= -->
        <template v-if="viewTab === 'Dashboard'">
            <!-- Meta strip (range) -->
            <div class="meta-strip">
                <div class="title-wrap">
                    <span class="badge">Overview</span>
                    <h1>Campus Waste — Dashboard</h1>
                    <p class="subtitle">
                        <template v-if="useLast7">Last 7 days • {{ last7DateLabel }}</template>
                        <template v-else>Custom range • {{ rangeLabel }}</template>
                    </p>
                </div>

                <div class="right-meta">
                    <div class="meta-chip">
                        Mode:
                        <strong>{{ useLast7 ? 'Last 7 Days' : 'Custom' }}</strong>
                    </div>
                    <button class="chip" :class="{ active: useLast7 }" @click="setModeLast7">Last 7</button>
                    <button class="chip" :class="{ active: !useLast7 }" @click="setModeCustom">Custom</button>
                </div>
            </div>

            <!-- Range pickers (shown only in Custom mode) -->
            <div class="meta-strip" v-if="!useLast7">
                <div class="title-wrap">
                    <span class="badge">Date Range</span>
                    <h1 style="font-size:1rem;margin:6px 0 0">Pick a range and Apply</h1>
                </div>
                <div class="right-meta">
                    <div class="waste-range">
                        <input type="date" v-model="wasteFromISO" class="chip" />
                        <input type="date" v-model="wasteToISO" class="chip" />
                        <button class="chip" @click="loadWasteAll"
                            :disabled="wasteLoading || !isWasteRangeValid">Apply</button>
                        <small v-if="!isWasteRangeValid" class="err">Pick a valid range.</small>
                    </div>
                </div>
            </div>

            <!-- KPI tiles -->
            <section class="grid kpi-grid">
                <div class="card kpi">
                    <div class="kpi-accent kpi-blue"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-dumpster"></i></div>
                        <div class="kpi-label">Total Waste</div>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(summary.total_waste) }} <small>kg</small>
                    </div>
                    <div class="kpi-sub muted">
                        {{ summary.days }} day(s), {{ summary.entries }} entr(y/ies)
                    </div>
                </div>

                <div class="card kpi">
                    <div class="kpi-accent kpi-green"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-recycle"></i></div>
                        <div class="kpi-label">Diversion Rate</div>
                    </div>
                    <div class="kpi-value">
                        {{ showPct(summary.diversion_rate) }} <small>%</small>
                    </div>
                    <div class="kpi-sub muted">Recycled / Total</div>
                </div>

                <div class="card kpi">
                    <div class="kpi-accent kpi-orange"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-chart-area"></i></div>
                        <div class="kpi-label">Avg / Day</div>
                    </div>
                    <div class="kpi-value">
                        {{ showNum(summary.avg_per_day_total, 1) }} <small>kg</small>
                    </div>
                    <div class="kpi-sub muted">Across selected period</div>
                </div>

                <!-- NEW: WDI KPI -->
                <div class="card kpi">
                    <div class="kpi-accent kpi-purple"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-balance-scale"></i></div>
                        <div class="kpi-label">WDI</div>
                    </div>
                    <div class="kpi-value">
                        {{ wdiLoading ? '—' : fmtNum(wdi.wdi) }}
                    </div>
                    <div class="kpi-sub muted">
                        <template v-if="wdiError">Error</template>
                        <template v-else>
                            Disposed: {{ fmtNum(wdi.disposed_total) }} kg • Denominator: {{ showNum(wdi.denominator, 2)
                            }}
                        </template>
                    </div>
                </div>
            </section>

            <!-- WDI Controls -->
            <section class="grid" style="margin-top:10px">
                <div class="card">
                    <div class="card-header">
                        <h3>WDI Controls</h3>
                        <small class="muted">{{ useLast7 ? last7DateLabel : rangeLabel }}</small>
                        <button class="chip" style="margin-left:auto" @click="loadWdi"
                            :disabled="wdiLoading">Refresh</button>
                    </div>
                    <div class="controls-wrap">
                        <label class="waste-field narrow">
                            FY (from Headcounts)
                            <select v-model="wdiFy">
                                <option :value="''">— none —</option>
                                <option v-for="hc in headcountsSorted" :key="hc.fy" :value="hc.fy">{{ hc.fy }}</option>
                            </select>
                        </label>

                        <label class="waste-field narrow">
                            Operational days
                            <input type="number" min="1" step="1" v-model.number="wdiOperationalDays" />
                        </label>

                        <label class="waste-field wide">
                            Include recycled in disposed?
                            <select v-model="wdiIncludeRecycled">
                                <option :value="false">No (general + food)</option>
                                <option :value="true">Yes (general + food + recycled)</option>
                            </select>
                        </label>

                        <label class="waste-field narrow">
                            Use year totals
                            <select v-model="wdiUseYearTotals">
                                <option :value="true">True</option>
                                <option :value="false">False</option>
                            </select>
                        </label>

                        <!-- Only show staff/visitors/day when NOT using FY totals -->
                        <template v-if="!wdiUseYearTotals">
                            <label class="waste-field narrow">
                                Staff / day
                                <input type="number" min="0" step="1" v-model.number="wdiStaffPerDay" />
                            </label>
                            <label class="waste-field narrow">
                                Visitors / day
                                <input type="number" min="0" step="1" v-model.number="wdiVisitorsPerDay" />
                            </label>
                        </template>
                    </div>
                    <small class="err" v-if="wdiError" style="display:block; margin-top:6px">{{ wdiError }}</small>
                </div>
            </section>

            <!-- Trends -->
            <section class="grid charts-grid">
                <div class="card chart-card">
                    <div class="card-header">
                        <h3>Daily Trend (7-day MAs)</h3>
                        <small class="muted">
                            {{ wasteLoading ? 'Loading…' : (useLast7 ? last7DateLabel : 'dd/mm/yyyy') }}
                        </small>
                    </div>

                    <div class="chart-wrap" v-if="wasteLoading">Loading trend…</div>
                    <div class="chart-wrap" v-else>
                        <LineChartCard :title="' '" :chartData="trendChartData" :options="trendChartOpts" />
                    </div>
                    <small class="err" v-if="wasteError">{{ wasteError }}</small>
                </div>

                <div class="card chart-card">
                    <div class="card-header">
                        <h3>Monthly Summary</h3>
                        <small class="muted">
                            {{ wasteLoading ? 'Loading…' : (useLast7 ? last7YearMonth : 'mm/yyyy') }}
                        </small>
                    </div>
                    <div class="chart-wrap" v-if="wasteLoading">Loading monthly…</div>
                    <div class="chart-wrap" v-else>
                        <LineChartCard :title="' '" :chartData="monthlyChartData" :options="trendChartOpts" />
                    </div>
                </div>
            </section>
        </template>

        <!-- ========================= ENTRIES ========================= -->
        <template v-else>
            <section class="grid">
                <!-- Add Entry -->
                <div class="card">
                    <div class="card-header">
                        <h3>Add Entry</h3>
                    </div>

                    <div class="waste-form">
                        <label class="waste-field">
                            Date
                            <input type="date" v-model="form.dateISO" />
                        </label>
                        <label class="waste-field">
                            General (kg)
                            <input type="number" min="0" step="0.01" v-model.number="form.general"
                                placeholder="e.g. 500" />
                        </label>
                        <label class="waste-field">
                            Recycled (kg)
                            <input type="number" min="0" step="0.01" v-model.number="form.recycled"
                                placeholder="e.g. 200" />
                        </label>
                        <label class="waste-field">
                            Food (kg)
                            <input type="number" min="0" step="0.01" v-model.number="form.food"
                                placeholder="e.g. 120" />
                        </label>

                        <!-- Live computed (read-only, client-side) -->
                        <label class="waste-field">
                            Total Waste (kg)
                            <input type="number" :value="showNum(totalWaste, 2)" readonly />
                        </label>
                        <label class="waste-field">
                            Total Disposed (kg)
                            <input type="number" :value="showNum(totalDisposed, 2)" readonly />
                        </label>
                        <label class="waste-field">
                            Diversion Rate (%)
                            <input type="number" :value="showNum(diversionRate * 100, 2)" readonly />
                        </label>

                        <button class="waste-add-btn" @click="submitWaste" :disabled="saving">
                            <span v-if="saving">Saving…</span>
                            <span v-else>Add</span>
                        </button>
                    </div>
                    <small class="muted">
                        Date is local (yyyy-mm-dd). Backend expects dd/mm/yyyy—handled for you.
                    </small>
                    <small class="err" v-if="wasteError" style="display:block; margin-top:6px">{{ wasteError }}</small>
                </div>

                <!-- Range summary -->
                <div class="card">
                    <div class="card-header">
                        <h3>Current Range Summary</h3>
                        <small class="muted">{{ useLast7 ? last7DateLabel : rangeLabel }}</small>
                        <button class="chip" style="margin-left:auto" @click="reloadAll">Reload</button>
                    </div>

                    <div class="summary-row" style="display:flex; gap:8px; flex-wrap:wrap">
                        <div class="meta-chip">Days: <strong>{{ summary.days }}</strong></div>
                        <div class="meta-chip">Entries: <strong>{{ summary.entries }}</strong></div>
                        <div class="meta-chip">Total (kg): <strong>{{ fmtNum(summary.total_waste) }}</strong></div>
                        <div class="meta-chip">Diversion: <strong>{{ showPct(summary.diversion_rate) }}%</strong></div>
                        <div class="meta-chip">Avg/day (kg): <strong>{{ showNum(summary.avg_per_day_total, 1)
                                }}</strong></div>
                    </div>
                </div>

                <!-- Entries table (with Edit/Delete) -->
                <div class="card">
                    <div class="card-header">
                        <h3>Entries ({{ entries.length }})</h3>
                        <small class="muted">{{ entriesLoading ? 'Loading…' : '' }}</small>
                    </div>

                    <div class="table-wrap">
                        <table class="waste-table">
                            <thead>
                                <tr>
                                    <th style="min-width:110px">Date</th>
                                    <th>General (kg)</th>
                                    <th>Recycled (kg)</th>
                                    <th>Food (kg)</th>
                                    <th>Total Waste (kg)</th>
                                    <th>Total Disposed (kg)</th>
                                    <th>Diversion (%)</th>
                                    <th style="width:220px">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="entriesLoading">
                                    <td colspan="8" class="muted">Loading entries…</td>
                                </tr>
                                <tr v-else-if="!entries.length">
                                    <td colspan="8" class="muted">No entries in this range.</td>
                                </tr>
                                <tr v-else v-for="row in entries" :key="row._key">
                                    <td>
                                        <template v-if="editKey === row._key">
                                            <input type="date" v-model="editBuf.dateISO" />
                                        </template>
                                        <template v-else>{{ row.date }}</template>
                                    </td>

                                    <td>
                                        <template v-if="editKey === row._key">
                                            <input type="number" min="0" step="0.01" v-model.number="editBuf.general" />
                                        </template>
                                        <template v-else>{{ fmtNum(row.general) }}</template>
                                    </td>

                                    <td>
                                        <template v-if="editKey === row._key">
                                            <input type="number" min="0" step="0.01"
                                                v-model.number="editBuf.recycled" />
                                        </template>
                                        <template v-else>{{ fmtNum(row.recycled) }}</template>
                                    </td>

                                    <td>
                                        <template v-if="editKey === row._key">
                                            <input type="number" min="0" step="0.01" v-model.number="editBuf.food" />
                                        </template>
                                        <template v-else>{{ fmtNum(row.food) }}</template>
                                    </td>

                                    <td>{{ fmtNum(row._total_waste) }}</td>
                                    <td>{{ fmtNum(row._total_disposed) }}</td>
                                    <td>{{ showNum(row._diversion_rate * 100, 2) }}</td>

                                    <td class="row-actions">
                                        <!-- Edit -->
                                        <button v-if="editKey !== row._key" class="chip" :disabled="!row._hasId"
                                            :title="!row._hasId ? 'Edit disabled: server did not return an id' : 'Edit'"
                                            @click="beginEdit(row)">
                                            Edit
                                        </button>
                                        <template v-else>
                                            <button class="chip" @click="saveEdit(row)"
                                                :disabled="savingEdit">Save</button>
                                            <button class="chip" @click="cancelEdit"
                                                :disabled="savingEdit">Cancel</button>
                                        </template>

                                        <!-- Delete -->
                                        <button class="chip chip-danger"
                                            :disabled="!row._hasId || deletingId === row.id"
                                            :title="!row._hasId ? 'Delete disabled: server did not return an id' : 'Delete'"
                                            @click="deleteEntry(row)">
                                            <span v-if="deletingId === row.id">Deleting…</span>
                                            <span v-else>Delete</span>
                                        </button>

                                        <small v-if="!row._hasId" class="muted hint">no id from API</small>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <small class="err" v-if="entriesError" style="display:block; margin-top:6px">{{ entriesError
                        }}</small>
                </div>

                <!-- Headcounts manager -->
                <div class="card">
                    <div class="card-header">
                        <h3>Headcounts (FY)</h3>
                        <div class="flex-gap">
                            <!-- Downloads -->
                            <a class="chip" :href="HEADCOUNT_TEMPLATE" target="_blank" rel="noopener">Download Template
                                CSV</a>
                            <a class="chip" :href="HEADCOUNT_PREFILLED_2024" target="_blank" rel="noopener">Download
                                Prefilled
                                FY2024</a>
                            <!-- Upload (restyled) -->
                            <label class="chip file-chip" role="button">
                                <i class="fas fa-file-upload file-chip__icon" aria-hidden="true"></i>
                                <span class="file-chip__text">{{ uploadFileName || 'Choose CSV…' }}</span>
                                <input type="file" accept=".csv" @change="onHeadcountFilePick" />
                            </label>
                            
                            <button class="chip" @click="uploadHeadcountsCsv"
                                :disabled="!headcountFile || headcountUploading">
                                <span v-if="headcountUploading">Uploading…</span>
                                <span v-else>Upload CSV</span>
                            </button>
                            <button class="chip" @click="loadHeadcounts" :disabled="headcountLoading">Reload</button>
                        </div>
                    </div>

                    <!-- Manual add (optional if not using CSV) -->
                    <div class="waste-form">
                        <label class="waste-field">
                            FY (e.g. 2025)
                            <input type="text" v-model="hcForm.fy" placeholder="2025" />
                        </label>
                        <label class="waste-field">
                            PET Students
                            <input type="number" min="0" step="1" v-model.number="hcForm.pet_students" />
                        </label>
                        <label class="waste-field">
                            CET Students
                            <input type="number" min="0" step="1" v-model.number="hcForm.cet_students" />
                        </label>
                        <label class="waste-field">
                            WSDIP Students
                            <input type="number" min="0" step="1" v-model.number="hcForm.wsdip_students" />
                        </label>
                        <label class="waste-field">
                            EIP Students
                            <input type="number" min="0" step="1" v-model.number="hcForm.eip_students" />
                        </label>
                        <label class="waste-field">
                            Staff Strength
                            <input type="number" min="0" step="1" v-model.number="hcForm.staff_strength" />
                        </label>

                        <button class="waste-add-btn" @click="submitHeadcount" :disabled="headcountSaving">
                            <span v-if="headcountSaving">Saving…</span>
                            <span v-else>Add FY</span>
                        </button>
                    </div>

                    <!-- Table -->
                    <div class="table-wrap">
                        <table class="waste-table">
                            <thead>
                                <tr>
                                    <th>FY</th>
                                    <th>PET</th>
                                    <th>CET</th>
                                    <th>WSDIP</th>
                                    <th>EIP</th>
                                    <th>Staff</th>
                                    <th style="width:120px">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="headcountLoading">
                                    <td colspan="7" class="muted">Loading headcounts…</td>
                                </tr>
                                <tr v-else-if="!headcounts.length">
                                    <td colspan="7" class="muted">No headcounts yet.</td>
                                </tr>
                                <tr v-else v-for="h in headcountsSorted" :key="h.fy">
                                    <td>{{ h.fy }}</td>
                                    <td>{{ fmtNum(h.pet_students) }}</td>
                                    <td>{{ fmtNum(h.cet_students) }}</td>
                                    <td>{{ fmtNum(h.wsdip_students) }}</td>
                                    <td>{{ fmtNum(h.eip_students) }}</td>
                                    <td>{{ fmtNum(h.staff_strength) }}</td>
                                    <td>
                                        <button class="chip chip-danger" @click="deleteHeadcount(h)"
                                            :disabled="deletingFy === h.fy">
                                            <span v-if="deletingFy === h.fy">Deleting…</span>
                                            <span v-else>Delete</span>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <small class="err" v-if="headcountError" style="display:block; margin-top:6px">{{ headcountError
                        }}</small>
                    <small class="err" v-if="headcountUploadError" style="display:block; margin-top:6px">{{
                        headcountUploadError
                        }}</small>
                    <small class="muted" v-if="headcountUploadOk" style="display:block; margin-top:6px">Upload
                        complete.</small>
                </div>
            </section>
        </template>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import LineChartCard from '../components/LineChartCard.vue'

/* ------------------- Endpoints ------------------- */
const BASE = 'http://localhost:8083'
const WASTE_TREND = `${BASE}/stats/trend`
const WASTE_MONTHLY = `${BASE}/stats/monthly`
const WASTE_SUMMARY = `${BASE}/stats/summary`
const ENTRIES = `${BASE}/entries`
const HEADCOUNTS = `${BASE}/headcounts`
const STATS_WDI = `${BASE}/stats/wdi`
const WASTE_EXPORT_DAILY = `${BASE}/export/daily.csv`
const WASTE_EXPORT_MONTHLY = `${BASE}/export/monthly.csv`
const WASTE_EXPORT_SUMMARY = `${BASE}/export/summary.csv`
const WASTE_EXPORT_REPORT = `${BASE}/export/report.csv`
const HEADCOUNT_TEMPLATE = `${BASE}/templates/headcounts.csv`
const HEADCOUNT_PREFILLED_2024 = `${BASE}/templates/headcounts_fy2024_prefilled.csv`

/* ------------------- View Tab ------------------- */
const viewTab = ref('Dashboard')
function switchTab(tab) {
    viewTab.value = tab
    if (tab === 'Entries') {
        loadEntries()
        loadHeadcounts()
    } else {
        loadWasteAll()
        loadHeadcounts().finally(loadWdi)
    }
}

/* ------------------- Helpers ------------------- */
function fmtNum(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString() : '—' }
function showNum(v, dp = 1) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(dp) : '—' }
function todayLocalISODate() {
    const now = new Date()
    const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}
function yyyy_mm_dd_to_ddmmyyyy(isoDate) {
    if (!isoDate) return ''
    const [y, m, d] = String(isoDate).split('-')
    return `${d}/${m}/${y}`
}
function ddmmyyyy_to_iso(ddmmyyyy) {
    if (!ddmmyyyy) return ''
    const [d, m, y] = String(ddmmyyyy).split('/')
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}
function isoMinusDays(isoYYYYMMDD, days) {
    const [y, m, d] = isoYYYYMMDD.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    dt.setDate(dt.getDate() - days)
    const yy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
}
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
function showPct(p) { const n = Number(p); if (!Number.isFinite(n)) return '—'; return (n * 100).toFixed(2) }
function nz(v) { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0 }

/* ------------------- Mode & Ranges ------------------- */
const useLast7 = ref(true)
const wasteFromISO = ref(todayLocalISODate())
const wasteToISO = ref(todayLocalISODate())
const isWasteRangeValid = computed(() => {
    if (!wasteFromISO.value || !wasteToISO.value) return false
    return new Date(wasteFromISO.value) <= new Date(wasteToISO.value)
})
function setModeLast7() {
    useLast7.value = true
    loadWasteAll(); loadWdi()
}
function setModeCustom() { useLast7.value = false }
const last7FromISO = computed(() => isoMinusDays(todayLocalISODate(), 6))
const last7ToISO = computed(() => todayLocalISODate())
const last7DateLabel = computed(() =>
    `${yyyy_mm_dd_to_ddmmyyyy(last7FromISO.value)} – ${yyyy_mm_dd_to_ddmmyyyy(last7ToISO.value)}`
)
const rangeLabel = computed(() =>
    `${yyyy_mm_dd_to_ddmmyyyy(wasteFromISO.value)} – ${yyyy_mm_dd_to_ddmmyyyy(wasteToISO.value)}`
)
const last7YearMonth = computed(() => {
    const d = new Date(last7ToISO.value)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${mm}/${d.getFullYear()}`
})

/* ------------------- Dashboard Data ------------------- */
const wasteLoading = ref(false)
const wasteError = ref(null)
const trendRows = ref([])    // from /stats/trend
const monthlyRows = ref([])  // from /stats/monthly
const summary = reactive({
    start: null, end: null, days: 0, entries: 0,
    total_general: 0, total_recycled: 0, total_waste: 0,
    avg_per_day_total: 0, diversion_rate: 0
})

/* ------------------- WDI State ------------------- */
const wdi = reactive({
    start: null, end: null, disposed_total: 0, operational_days: 0,
    staff_per_day: 0, visitors_per_day: 0, include_recycled_in_disposed: false,
    denominator: 0, wdi: 0
})
const wdiLoading = ref(false)
const wdiError = ref(null)

// Controls
const wdiFy = ref('')
const wdiOperationalDays = ref(1)
const wdiIncludeRecycled = ref(false)
const wdiUseYearTotals = ref(true)
const wdiStaffPerDay = ref(1)
const wdiVisitorsPerDay = ref(1)

/* ------------------- Entries State ------------------- */
const entries = ref([])
const entriesLoading = ref(false)
const entriesError = ref(null)
const editKey = ref(null)
const editBuf = reactive({ dateISO: '', general: null, recycled: null, food: null })
const savingEdit = ref(false)
const deletingId = ref(null)

/* ------------------- Headcounts State + CSV Upload ------------------- */
const headcounts = ref([])
const headcountLoading = ref(false)
const headcountSaving = ref(false)
const headcountError = ref(null)
const deletingFy = ref(null)
const hcForm = reactive({
    fy: '',
    pet_students: 0, cet_students: 0, wsdip_students: 0, eip_students: 0, staff_strength: 0
})
const headcountsSorted = computed(() => {
    const arr = [...headcounts.value]
    arr.sort((a, b) => String(b.fy).localeCompare(String(a.fy)))
    return arr
})
// CSV Upload
const headcountFile = ref(null)
const uploadFileName = ref('')
const headcountUploading = ref(false)
const headcountUploadError = ref(null)
const headcountUploadOk = ref(false)
function onHeadcountFilePick(e) {
    const f = e?.target?.files?.[0]
    headcountFile.value = f || null
    uploadFileName.value = f ? f.name : ''
}

/* ------------------- Fetchers (Dashboard) ------------------- */
async function fetchTrend(startISO, endISO) {
    const params = new URLSearchParams()
    params.set('start', yyyy_mm_dd_to_ddmmyyyy(startISO))
    params.set('end', yyyy_mm_dd_to_ddmmyyyy(endISO))
    params.set('window', '7')
    const r = await fetch(`${WASTE_TREND}?${params.toString()}`, { cache: 'no-cache' })
    if (!r.ok) {
        const t = await r.text().catch(() => '')
        throw new Error(`Trend HTTP ${r.status}: ${t || 'failed'}`)
    }
    const body = await r.json()
    return Array.isArray(body) ? body : []
}
async function fetchMonthly(startISO, endISO) {
    const params = new URLSearchParams()
    params.set('start', yyyy_mm_dd_to_ddmmyyyy(startISO))
    params.set('end', yyyy_mm_dd_to_ddmmyyyy(endISO))
    const r = await fetch(`${WASTE_MONTHLY}?${params.toString()}`, { cache: 'no-cache' })
    if (!r.ok) throw new Error(`Monthly HTTP ${r.status}`)
    const body = await r.json()
    return Array.isArray(body) ? body : []
}
async function fetchSummary(startISO, endISO) {
    const params = new URLSearchParams()
    params.set('start', yyyy_mm_dd_to_ddmmyyyy(startISO))
    params.set('end', yyyy_mm_dd_to_ddmmyyyy(endISO))
    const r = await fetch(`${WASTE_SUMMARY}?${params.toString()}`, { cache: 'no-cache' })
    if (!r.ok) throw new Error(`Summary HTTP ${r.status}`)
    const s = await r.json()
    return s || {}
}

/* master loader (Dashboard datasets) */
async function loadWasteAll() {
    const startISO = useLast7.value ? last7FromISO.value : wasteFromISO.value
    const endISO = useLast7.value ? last7ToISO.value : wasteToISO.value
    if (!startISO || !endISO) return
    if (!useLast7.value && !isWasteRangeValid.value) return

    wasteLoading.value = true
    wasteError.value = null
    try {
        const [trend, monthly, sum] = await Promise.all([
            fetchTrend(startISO, endISO),
            fetchMonthly(startISO, endISO),
            fetchSummary(startISO, endISO)
        ])
        trendRows.value = trend
        monthlyRows.value = monthly
        Object.assign(summary, sum)
        if (summary?.days > 0) wdiOperationalDays.value = summary.days
    } catch (e) {
        wasteError.value = e?.message ?? 'Failed to load waste data'
        trendRows.value = []
        monthlyRows.value = []
        Object.assign(summary, { days: 0, entries: 0, total_waste: 0, avg_per_day_total: 0, diversion_rate: 0 })
    } finally {
        wasteLoading.value = false
    }
}

/* ------------------- WDI Loader ------------------- */
async function loadWdi() {
    const startISO = useLast7.value ? last7FromISO.value : wasteFromISO.value
    const endISO = useLast7.value ? last7ToISO.value : wasteToISO.value
    if (!startISO || !endISO) return
    if (!useLast7.value && !isWasteRangeValid.value) return

    wdiLoading.value = true
    wdiError.value = null
    try {
        const q = new URLSearchParams()
        q.set('start', yyyy_mm_dd_to_ddmmyyyy(startISO))
        q.set('end', yyyy_mm_dd_to_ddmmyyyy(endISO))
        q.set('operational_days', String(Math.max(1, Number(wdiOperationalDays.value || 1))))
        q.set('include_recycled_in_disposed', String(Boolean(wdiIncludeRecycled.value)))
        q.set('use_year_totals', String(Boolean(wdiUseYearTotals.value)))
        if (wdiUseYearTotals.value && wdiFy.value) {
            q.set('fy', String(wdiFy.value))
        } else {
            q.set('staff_per_day', String(Math.max(0, Number(wdiStaffPerDay.value || 0))))
            q.set('visitors_per_day', String(Math.max(0, Number(wdiVisitorsPerDay.value || 0))))
        }

        const r = await fetch(`${STATS_WDI}?${q.toString()}`, { cache: 'no-cache' })
        if (!r.ok) {
            const t = await r.text().catch(() => '')
            throw new Error(`WDI HTTP ${r.status}: ${t || 'failed'}`)
        }
        const body = await r.json()
        Object.assign(wdi, body || {})
    } catch (e) {
        wdiError.value = e?.message ?? 'Failed to load WDI'
        Object.assign(wdi, { disposed_total: 0, denominator: 0, wdi: 0 })
    } finally {
        wdiLoading.value = false
    }
}

/* ------------------- Entries: GET + PUT + DELETE ------------------- */
async function fetchEntries(startISO, endISO) {
    const params = new URLSearchParams()
    params.set('start', yyyy_mm_dd_to_ddmmyyyy(startISO))
    params.set('end', yyyy_mm_dd_to_ddmmyyyy(endISO))
    const r = await fetch(`${ENTRIES}?${params.toString()}`, { cache: 'no-cache' })
    if (!r.ok) {
        const t = await r.text().catch(() => '')
        throw new Error(`Entries HTTP ${r.status}: ${t || 'failed'}`)
    }
    const rows = await r.json()
    const list = (Array.isArray(rows) ? rows : []).map((x, idx) => {
        const general = nz(x.general), recycled = nz(x.recycled), food = nz(x.food)
        const total_waste = general + recycled + food
        const total_disposed = general + food
        const diversion_rate = total_waste > 0 ? recycled / total_waste : 0
        const dateISO = x.date ? ddmmyyyy_to_iso(x.date) : ''
        const key = x.id ?? `${x.date || 'no-date'}#${idx}`
        return {
            ...x,
            _key: key,
            dateISO,
            _hasId: Boolean(x.id),
            _total_waste: total_waste,
            _total_disposed: total_disposed,
            _diversion_rate: diversion_rate
        }
    })
    list.sort((a, b) => (a.dateISO && b.dateISO) ? (new Date(a.dateISO) - new Date(b.dateISO)) : 0)
    return list
}
async function loadEntries() {
    const startISO = useLast7.value ? last7FromISO.value : wasteFromISO.value
    const endISO = useLast7.value ? last7ToISO.value : wasteToISO.value
    if (!startISO || !endISO) return
    if (!useLast7.value && !isWasteRangeValid.value) return

    entriesLoading.value = true
    entriesError.value = null
    try {
        entries.value = await fetchEntries(startISO, endISO)
    } catch (e) {
        entriesError.value = e?.message ?? 'Failed to load entries'
        entries.value = []
    } finally {
        entriesLoading.value = false
    }
}
function beginEdit(row) {
    if (!row._hasId) return
    editKey.value = row._key
    editBuf.dateISO = row.dateISO || ddmmyyyy_to_iso(row.date)
    editBuf.general = row.general
    editBuf.recycled = row.recycled
    editBuf.food = row.food
}
function cancelEdit() {
    editKey.value = null
    editBuf.dateISO = ''
    editBuf.general = null
    editBuf.recycled = null
    editBuf.food = null
}
async function saveEdit(row) {
    if (!row?.id) { entriesError.value = 'Update failed: missing entry id from API.'; return }
    savingEdit.value = true
    entriesError.value = null
    try {
        const payload = {
            date: yyyy_mm_dd_to_ddmmyyyy(editBuf.dateISO),
            general: nz(editBuf.general),
            recycled: nz(editBuf.recycled),
            food: nz(editBuf.food)
        }
        const r = await fetch(`${ENTRIES}/${encodeURIComponent(row.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (!r.ok) {
            const msg = await r.json().catch(() => ({}))
            throw new Error(msg?.detail || `HTTP ${r.status}`)
        }
        cancelEdit()
        await loadEntries()
        await loadWasteAll()
        await loadWdi()
    } catch (e) {
        entriesError.value = e?.message ?? 'Update failed'
    } finally {
        savingEdit.value = false
    }
}
async function deleteEntry(row) {
    if (!row?.id) { entriesError.value = 'Delete failed: missing entry id from API.'; return }
    const ok = window.confirm(`Delete entry for ${row.date}? This cannot be undone.`)
    if (!ok) return

    try {
        deletingId.value = row.id
        entriesError.value = null
        const r = await fetch(`${ENTRIES}/${encodeURIComponent(row.id)}`, { method: 'DELETE' })
        if (!r.ok) {
            const msg = await r.json().catch(() => ({}))
            throw new Error(msg?.detail || `HTTP ${r.status}`)
        }
        await loadEntries()
        await loadWasteAll()
        await loadWdi()
    } catch (e) {
        entriesError.value = e?.message ?? 'Delete failed'
    } finally {
        deletingId.value = null
    }
}

/* ------------------- Add Entry (POST) ------------------- */
const form = reactive({ dateISO: todayLocalISODate(), general: null, recycled: null, food: null })
const saving = ref(false)
const totalWaste = computed(() => nz(form.general) + nz(form.recycled) + nz(form.food))
const totalDisposed = computed(() => nz(form.general) + nz(form.food))
const diversionRate = computed(() => {
    const tw = totalWaste.value
    return tw > 0 ? nz(form.recycled) / tw : 0
})
async function submitWaste() {
    if (!form.dateISO) return
    saving.value = true; wasteError.value = null
    try {
        const payload = {
            date: yyyy_mm_dd_to_ddmmyyyy(form.dateISO),
            general: nz(form.general),
            recycled: nz(form.recycled),
            food: nz(form.food)
        }
        const r = await fetch(ENTRIES, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (!r.ok) {
            const msg = await r.json().catch(() => ({}))
            throw new Error(msg?.detail || `HTTP ${r.status}`)
        }
        await loadWasteAll()
        await loadEntries()
        await loadWdi()
        form.general = null
        form.recycled = null
        form.food = null
    } catch (e) {
        wasteError.value = e?.message ?? 'Save failed'
    } finally {
        saving.value = false
    }
}

/* ------------------- Headcounts CRUD + Upload ------------------- */
async function loadHeadcounts() {
    headcountLoading.value = true
    headcountError.value = null
    try {
        const r = await fetch(HEADCOUNTS, { cache: 'no-cache' })
        if (!r.ok) throw new Error(`Headcounts HTTP ${r.status}`)
        const rows = await r.json()
        headcounts.value = Array.isArray(rows) ? rows : []
        // default FY selection if empty
        if (!wdiFy.value && headcounts.value.length) {
            wdiFy.value = String(headcountsSorted.value[0].fy || '')
        }
    } catch (e) {
        headcountError.value = e?.message ?? 'Failed to load headcounts'
        headcounts.value = []
    } finally {
        headcountLoading.value = false
    }
}
async function submitHeadcount() {
    headcountSaving.value = true
    headcountError.value = null
    try {
        const payload = {
            fy: String(hcForm.fy || '').trim(),
            pet_students: nz(hcForm.pet_students),
            cet_students: nz(hcForm.cet_students),
            wsdip_students: nz(hcForm.wsdip_students),
            eip_students: nz(hcForm.eip_students),
            staff_strength: nz(hcForm.staff_strength)
        }
        const r = await fetch(HEADCOUNTS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (!r.ok) {
            const msg = await r.json().catch(() => ({}))
            throw new Error(msg?.detail || `HTTP ${r.status}`)
        }
        await loadHeadcounts()
        await loadWdi()
        // clear form
        hcForm.fy = ''; hcForm.pet_students = 0; hcForm.cet_students = 0
        hcForm.wsdip_students = 0; hcForm.eip_students = 0; hcForm.staff_strength = 0
    } catch (e) {
        headcountError.value = e?.message ?? 'Save failed'
    } finally {
        headcountSaving.value = false
    }
}
async function deleteHeadcount(h) {
    const ok = window.confirm(`Delete headcounts for FY ${h.fy}? This cannot be undone.`)
    if (!ok) return
    try {
        deletingFy.value = h.fy
        headcountError.value = null
        const r = await fetch(`${HEADCOUNTS}/${encodeURIComponent(h.fy)}`, { method: 'DELETE' })
        if (!r.ok) {
            const msg = await r.json().catch(() => ({}))
            throw new Error(msg?.detail || `HTTP ${r.status}`)
        }
        if (wdiFy.value === String(h.fy)) wdiFy.value = ''
        await loadHeadcounts()
        await loadWdi()
    } catch (e) {
        headcountError.value = e?.message ?? 'Delete failed'
    } finally {
        deletingFy.value = null
    }
}
async function uploadHeadcountsCsv() {
    headcountUploadError.value = null
    headcountUploadOk.value = false
    if (!headcountFile.value) return
    try {
        headcountUploading.value = true
        const fd = new FormData()
        fd.append('file', headcountFile.value)
        const r = await fetch(`${HEADCOUNTS}/upload`, { method: 'POST', body: fd })
        if (!r.ok) {
            const t = await r.text().catch(() => '')
            throw new Error(`Upload HTTP ${r.status}: ${t || 'failed'}`)
        }
        headcountUploadOk.value = true
        // post-upload refresh
        await loadHeadcounts()
        await loadWdi()
        headcountFile.value = null
        uploadFileName.value = ''
    } catch (e) {
        headcountUploadError.value = e?.message ?? 'Upload failed'
    } finally {
        headcountUploading.value = false
    }
}

/* ------------------- Charts ------------------- */
const trendAggRows = computed(() =>
    aggregateByKey(trendRows.value, 'date', ['total_waste_ma7', 'diversion_rate_ma7'])
)
const monthlyAggRows = computed(() =>
    aggregateByKey(monthlyRows.value, 'month', ['general', 'recycled', 'total', 'diversion_rate'])
)
const trendChartData = computed(() => ({
    labels: trendAggRows.value.map(r => r.date),
    datasets: [
        { label: 'Total Waste MA7 (kg)', data: trendAggRows.value.map(r => r.total_waste_ma7 ?? null), borderWidth: 2, tension: 0.35, cubicInterpolationMode: 'monotone', pointRadius: 2, spanGaps: true, fill: false },
        { label: 'Diversion Rate MA7 (%)', data: trendAggRows.value.map(r => r.diversion_rate_ma7 != null ? (r.diversion_rate_ma7 * 100) : null), borderWidth: 2, tension: 0.35, cubicInterpolationMode: 'monotone', pointRadius: 2, spanGaps: true, fill: false }
    ]
}))
const monthlyChartData = computed(() => ({
    labels: monthlyAggRows.value.map(r => r.month),
    datasets: [
        { label: 'General (kg)', data: monthlyAggRows.value.map(r => r.general), borderWidth: 2, tension: .35, pointRadius: 2, fill: false },
        { label: 'Recycled (kg)', data: monthlyAggRows.value.map(r => r.recycled), borderWidth: 2, tension: .35, pointRadius: 2, fill: false },
        { label: 'Total (kg)', data: monthlyAggRows.value.map(r => r.total), borderWidth: 2, tension: .35, pointRadius: 2, fill: false }
    ]
}))
const trendChartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
    scales: {
        x: { type: 'category', ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,.15)' } },
        y: { beginAtZero: true, ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,.15)' } }
    },
    plugins: {
        legend: { position: 'top', labels: { color: '#cbd5e1' } },
        tooltip: { mode: 'index', intersect: false }
    }
}

/* ------------------- Kickoff + reactive reloads ------------------- */
onMounted(async () => {
    await loadWasteAll()
    await loadHeadcounts()
    await loadWdi()
    if (viewTab.value === 'Entries') await loadEntries()
})
watch([useLast7, wasteFromISO, wasteToISO], async () => {
    if (!useLast7.value && !isWasteRangeValid.value) return
    if (viewTab.value === 'Dashboard') {
        await loadWasteAll()
        await loadWdi()
    } else {
        await loadEntries()
    }
})
watch([wdiFy, wdiOperationalDays, wdiIncludeRecycled, wdiUseYearTotals, wdiStaffPerDay, wdiVisitorsPerDay], () => {
    if (viewTab.value === 'Dashboard') loadWdi()
})

function reloadAll() {
    if (viewTab.value === 'Dashboard') {
        loadWasteAll(); loadWdi()
    } else {
        loadEntries(); loadHeadcounts()
    }
}
</script>

<style scoped>
/* Base */
.waste-management-container {
    margin: 0 auto;
    padding: 24px 28px;
    background: #0b1220;
    min-height: 100vh;
    color: #e5e7eb;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px
}

.page-header-right {
    display: flex;
    align-items: center;
    gap: 10px
}

.page-title {
    margin: 0;
    font-size: 24px;
    color: #f8fafc
}

.breadcrumb {
    color: #9fb0ff
}

.breadcrumb span {
    font-size: 14px;
    margin: 0 4px
}

.icon-btn {
    display: inline-grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, .15);
    background: rgba(255, 255, 255, .08);
    color: #fff;
    cursor: pointer
}

.icon-btn:hover {
    background: rgba(255, 255, 255, .18)
}

/* View Tabs */
.view-tab-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0 12px
}

.view-tab-bar .view-tab-nav {
    flex: 1 1 auto;
    display: flex;
    gap: 10px;
    overflow-x: auto;
    white-space: nowrap;
    padding-bottom: 4px
}

.view-tab-nav button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid rgba(255, 255, 255, .12);
    background: rgba(255, 255, 255, .08);
    border-radius: 999px;
    color: #e5e7eb;
    font-weight: 700;
    cursor: pointer;
    font-size: .9rem;
    line-height: 1;
    flex: 0 0 auto
}

.view-tab-nav button:hover {
    background: rgba(255, 255, 255, .18)
}

.view-tab-nav button.active {
    background: #1976d2;
    border-color: #1976d2;
    color: #fff
}

/* Meta */
.meta-strip {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: start;
    margin-bottom: 14px
}

.title-wrap h1 {
    margin: 6px 0 2px;
    font-size: 1.2rem;
    color: #f8fafc
}

.subtitle {
    color: #9fb0ff;
    margin: 0;
    font-size: .9rem
}

.badge {
    display: inline-block;
    background: rgba(34, 197, 94, .15);
    color: #86efac;
    font-size: .75rem;
    padding: 4px 8px;
    border-radius: 999px
}

.right-meta {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap
}

.meta-chip {
    background: #121a2c;
    border: 1px solid rgba(255, 255, 255, .12);
    padding: 7px 12px;
    border-radius: 12px;
    font-size: .85rem;
    color: #e5e7eb
}

.chip {
    font-size: .8rem;
    color: #fff;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .12);
    padding: 7px 12px;
    border-radius: 999px;
    cursor: pointer
}

.chip.active {
    background: #1976d2;
    border-color: #1976d2
}

.chip-danger {
    background: rgba(239, 68, 68, .2);
    border-color: rgba(239, 68, 68, .6)
}

.chip-danger:disabled {
    opacity: .7
}

/* Inputs */
.waste-range input[type="date"] {
    background: #16366f;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, .25);
    border-radius: 6px;
    padding: 6px 8px
}

.waste-field {
    display: flex;
    flex-direction: column;
    font-size: .9rem;
    color: #fff;
    flex: 1 0 auto;
    min-width: 8rem
}

.waste-field input,
.waste-field select {
    margin-top: 4px;
    background: #16366f;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, .25);
    border-radius: 6px;
    padding: 6px 8px
}

.waste-field.narrow {
    max-width: 12rem
}

.waste-field.wide {
    max-width: 16rem
}

.controls-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: flex-end
}

/* Grid + Cards */
.grid {
    display: grid;
    gap: 16px
}

.kpi-grid {
    grid-template-columns: repeat(4, minmax(240px, 1fr))
}

.card {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, .25);
    position: relative;
    overflow: hidden;
}

/* KPI (clean, consistent) */
.card.kpi {
    padding-top: 10px
}

.kpi-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
}

.kpi-blue {
    background: #3b82f6
}

.kpi-green {
    background: #22c55e
}

.kpi-orange {
    background: #f59e0b
}

.kpi-purple {
    background: #8b5cf6
}

.kpi-top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 2px
}

.kpi-icon {
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: #fff;
    background: rgba(255, 255, 255, .12)
}

.kpi-label {
    color: #cbd5e1;
    font-size: .9rem;
    font-weight: 600
}

.kpi-value {
    font-size: 1.55rem;
    font-weight: 800;
    margin-top: 6px;
    color: #f8fafc
}

.kpi-value small {
    font-weight: 600;
    color: #cbd5e1;
    margin-left: 4px
}

.kpi-sub {
    color: #9fb0ff;
    font-size: .8rem;
    margin-top: 2px
}

.row-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center
}

.hint {
    opacity: .7
}

/* Charts */
.charts-grid {
    display: grid;
    grid-template-columns: 2fr 1.2fr;
    gap: 16px;
    margin: 14px 0
}

.chart-card {
    padding: 14px 14px 10px;
    border-radius: 12px;
    overflow: hidden;
    height: 575px
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px
}

.card-header h3 {
    margin: 0;
    font-size: 1rem;
    color: #e5e7eb
}

.chart-wrap {
    height: 420px
}

.chart-card .chart-wrap {
    padding: 0 0 40px;
    background: transparent;
    box-shadow: none
}

/* Forms & Buttons */
.waste-form {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 1rem
}

.waste-add-btn {
    align-self: flex-end;
    padding: .5rem 1rem;
    background: #28a745;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    flex: 0 0 auto
}

.waste-add-btn:hover {
    background: #218838
}

.flex-gap {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap
}

.file-chip {
    position: relative;
    overflow: hidden
}

.file-chip input[type="file"] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer
}

/* Table */
.table-wrap {
    overflow: auto;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 10px
}

.waste-table {
    width: 100%;
    border-collapse: collapse;
    font-size: .9rem
}

.waste-table th,
.waste-table td {
    border-bottom: 1px solid rgba(255, 255, 255, .08);
    padding: 8px 10px;
    text-align: left
}

.waste-table th {
    color: #cbd5e1;
    background: #0d1630;
    position: sticky;
    top: 0;
    z-index: 1
}

.waste-table input[type="number"],
.waste-table input[type="date"] {
    width: 100%;
    background: #16366f;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, .25);
    border-radius: 6px;
    padding: 6px 8px;
    box-sizing: border-box
}

/* Misc */
.muted {
    color: #9fb0ff;
    opacity: .9
}

.err {
    color: #fda4af
}

/* Improve spacing & alignment for the CSV picker chip */
.file-chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    /* space between icon and text */
    padding: 8px 14px;
    /* more breathing room */
    min-height: 36px;
    /* consistent pill height */
    line-height: 1;
    /* avoid tall line box */
    border-radius: 999px;
    /* keep it pill-shaped */
}

/* Make the whole chip clickable while keeping native file picker */
.file-chip input[type="file"] {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
}

/* Tidy icon sizing and vertical alignment */
.file-chip__icon {
    font-size: 16px;
    line-height: 1;
    vertical-align: middle;
}

/* Slight nudge to keep text vertically centered with the icon */
.file-chip__text {
    display: inline-block;
    line-height: 1;
}

/* Make sure the container spacing is comfy */
.flex-gap {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}


/* Responsive */
@media (max-width:1200px) {
    .kpi-grid {
        grid-template-columns: repeat(2, minmax(240px, 1fr))
    }
}

@media (max-width:1100px) {
    .charts-grid {
        grid-template-columns: 1fr
    }

    .chart-wrap {
        height: 320px
    }
}

@media (max-width:768px) {
    .waste-management-container {
        padding: 16px
    }

    .chart-wrap {
        height: 280px
    }
}
</style>
