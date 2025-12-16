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

        <!-- View Tabs + Single Download button -->
        <div class="view-tab-bar">
            <div class="view-tab-nav">
                <button :class="{ active: viewTab === 'Dashboard' }" @click="switchTab('Dashboard')">Dashboard</button>
                <button :class="{ active: viewTab === 'Entries' }" @click="switchTab('Entries')">Entries</button>
            </div>

            <!-- Reload + WDI Excel -->
            <div style="display:flex; gap:8px">
                <button class="icon-btn" @click="reloadAll"
                    :title="(wasteLoading || entriesLoading) ? 'Loading…' : 'Reload'">
                    <i class="fas fa-rotate"></i>
                </button>
                <button class="icon-btn" @click="downloadExcel" title="Download WDI Excel">
                    <i class="fas fa-file-excel"></i>
                </button>
            </div>
        </div>

        <!-- ========================= DASHBOARD ========================= -->
        <template v-if="viewTab === 'Dashboard'">
            <!-- Meta strip (whole-year only) -->
            <div class="meta-strip">
                <div class="title-wrap">
                    <span class="badge">Overview</span>
                    <h1>Campus Waste — Dashboard</h1>
                    <p class="subtitle">
                        Selected period • {{ yearRangeLabel }}
                    </p>
                </div>
            </div>

            <!-- KPI tiles (current month) -->
            <section class="grid kpi-grid">
                <!-- Waste Disposed -->
                <div class="card kpi">
                    <div class="kpi-accent kpi-blue"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-dumpster"></i></div>
                        <div class="kpi-label">Waste Disposed (kg)</div>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(currentMonthSummary.general) }} <small>kg</small>
                    </div>
                    <div class="kpi-sub muted">
                        {{ currentMonthSummary.month }} • General waste
                    </div>
                </div>

                <!-- Waste Recycled -->
                <div class="card kpi">
                    <div class="kpi-accent kpi-green"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-recycle"></i></div>
                        <div class="kpi-label">Waste Recycled (kg)</div>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(currentMonthSummary.recycled) }} <small>kg</small>
                    </div>
                    <div class="kpi-sub muted">
                        {{ currentMonthSummary.month }} • Recycled
                    </div>
                </div>

                <!-- Food Waste -->
                <div class="card kpi">
                    <div class="kpi-accent kpi-orange"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-chart-area"></i></div>
                        <div class="kpi-label">Food Waste Segregated for Treatment (kg)</div>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(currentMonthSummary.food) }} <small>kg</small>
                    </div>
                    <div class="kpi-sub muted">
                        {{ currentMonthSummary.month }} • Food waste
                    </div>
                </div>

                <!-- WDI -->
                <div class="card kpi">
                    <div class="kpi-accent kpi-purple"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-balance-scale"></i></div>
                        <div class="kpi-label">Waste Disposal Index (WDI)</div>
                    </div>
                    <div class="kpi-value kpi-value-small">
                        {{ showNum(currentMonthSummary.wdi, 3) }}
                    </div>
                    <div class="kpi-sub muted">
                        Op days: {{ currentMonthSummary.operating_days || 0 }} • BAI: {{ fmtNum(BAI) }}
                    </div>
                </div>
            </section>

            <!-- Charts -->
            <section class="grid charts-grid">
                <!-- WDI per month -->
                <div class="card chart-card">
                    <div class="card-header">
                        <h3>Waste Disposal Index (WDI) per Month</h3>
                        <small class="muted">
                            Year {{ currentYear }}
                        </small>
                    </div>
                    <div class="chart-wrap" v-if="wasteLoading">Loading WDI…</div>
                    <div class="chart-wrap" v-else>
                        <LineChartCard :title="' '" :chartData="wdiChartData" :options="trendChartOpts" />
                    </div>
                    <small class="err" v-if="wasteError">{{ wasteError }}</small>
                </div>
            </section>
        </template>

        <!-- ========================= ENTRIES ========================= -->
        <template v-else>
            <section class="grid">
                <!-- Add Entry (MONTH-based) -->
                <div class="card">
                    <div class="card-header">
                        <h3>Add Entry (by Month)</h3>
                    </div>

                    <div class="waste-form">
                        <label class="waste-field">
                            Month
                            <input type="month" v-model="form.month" />
                        </label>
                        <label class="waste-field">
                            General (kg)
                            <input type="number" min="0" step="0.01" v-model.number="form.general"
                                placeholder="e.g. 30950" />
                        </label>
                        <label class="waste-field">
                            Recycled (kg)
                            <input type="number" min="0" step="0.01" v-model.number="form.recycled"
                                placeholder="e.g. 0" />
                        </label>
                        <label class="waste-field">
                            Food (kg)
                            <input type="number" min="0" step="0.01" v-model.number="form.food"
                                placeholder="e.g. 2354" />
                        </label>
                        <button class="waste-add-btn" @click="submitWaste" :disabled="saving">
                            <span v-if="saving">Saving…</span>
                            <span v-else>Add</span>
                        </button>
                    </div>
                    <small class="muted">
                        Month is chosen by user. Backend will receive the last day of the month as
                        <code>dd/mm/yyyy</code>.
                    </small>
                    <small class="err" v-if="wasteError" style="display:block; margin-top:6px">{{ wasteError }}</small>
                </div>

                <!-- Year summary -->
                <div class="card">
                    <div class="card-header">
                        <h3>Current Year Summary</h3>
                        <small class="muted">{{ yearRangeLabel }}</small>
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

                <!-- Entries table -->
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
                                    <th style="width:220px">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="entriesLoading">
                                    <td colspan="8" class="muted">Loading entries…</td>
                                </tr>
                                <tr v-else-if="!entries.length">
                                    <td colspan="8" class="muted">No entries in this year.</td>
                                </tr>
                                <tr v-else v-for="row in entries" :key="row._key">
                                    <td>{{ row.date }}</td>
                                    <td>{{ fmtNum(row.general) }}</td>
                                    <td>{{ fmtNum(row.recycled) }}</td>
                                    <td>{{ fmtNum(row.food) }}</td>

                                    <td class="row-actions">
                                        <!-- Edit (open modal) -->
                                        <button class="chip" :disabled="!row._hasId"
                                            :title="!row._hasId ? 'Edit disabled: server did not return an id' : 'Edit'"
                                            @click="openEditModal(row)">
                                            Edit
                                        </button>

                                        <!-- Delete (open delete modal) -->
                                        <button class="chip chip-danger"
                                            :disabled="!row._hasId || deletingId === row.id"
                                            :title="!row._hasId ? 'Delete disabled: server did not return an id' : 'Delete'"
                                            @click="openDeleteModal(row)">
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
            </section>

            <!-- EDIT MODAL -->
            <div v-if="showEditModal" class="modal-backdrop">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Edit Entry</h3>
                        <button class="chip" @click="closeEditModal">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="waste-form">
                            <label class="waste-field">
                                Month
                                <input type="month" v-model="editForm.month" />
                            </label>
                            <label class="waste-field">
                                General (kg)
                                <input type="number" min="0" step="0.01" v-model.number="editForm.general" />
                            </label>
                            <label class="waste-field">
                                Recycled (kg)
                                <input type="number" min="0" step="0.01" v-model.number="editForm.recycled" />
                            </label>
                            <label class="waste-field">
                                Food (kg)
                                <input type="number" min="0" step="0.01" v-model.number="editForm.food" />
                            </label>
                        </div>
                        <small class="muted">
                            Date sent to backend will be the <strong>last day</strong> of the selected month in
                            <code>dd/mm/yyyy</code> format.
                        </small>
                        <small class="err" v-if="entriesError" style="display:block; margin-top:6px">{{ entriesError
                        }}</small>
                    </div>
                    <div class="modal-footer">
                        <button class="chip" @click="closeEditModal" :disabled="savingEdit">Cancel</button>
                        <button class="chip" @click="saveEditModal" :disabled="savingEdit || !editForm.month">
                            <span v-if="savingEdit">Saving…</span>
                            <span v-else>Save</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- DELETE MODAL -->
            <div v-if="showDeleteModal" class="modal-backdrop">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Delete Entry</h3>
                        <button class="chip" @click="closeDeleteModal" :disabled="deletingId !== null">×</button>
                    </div>
                    <div class="modal-body">
                        <p>
                            Are you sure you want to delete this entry?
                        </p>
                        <ul class="muted" v-if="deleteTarget">
                            <li><strong>Date:</strong> {{ deleteTarget.date }}</li>
                            <li><strong>General:</strong> {{ fmtNum(deleteTarget.general) }} kg</li>
                            <li><strong>Recycled:</strong> {{ fmtNum(deleteTarget.recycled) }} kg</li>
                            <li><strong>Food:</strong> {{ fmtNum(deleteTarget.food) }} kg</li>
                        </ul>
                        <small class="err" v-if="entriesError" style="display:block; margin-top:6px">{{ entriesError
                            }}</small>
                    </div>
                    <div class="modal-footer">
                        <button class="chip" @click="closeDeleteModal" :disabled="deletingId !== null">Cancel</button>
                        <button class="chip chip-danger" @click="confirmDelete"
                            :disabled="!deleteTarget || deletingId !== null">
                            <span v-if="deletingId !== null">Deleting…</span>
                            <span v-else>Delete</span>
                        </button>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import LineChartCard from '../components/LineChartCard.vue'

/* ------------------- Endpoints ------------------- */
const BASE = 'http://localhost:8083'
const WASTE_MONTHLY = `${BASE}/stats/monthly`
const WASTE_SUMMARY = `${BASE}/stats/summary`
const ENTRIES = `${BASE}/entries`
const HEADCOUNTS = `${BASE}/headcounts`
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
        loadHeadcounts()
    }
}

/* ------------------- Helpers ------------------- */
function fmtNum(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString() : '—' }
function showNum(v, dp = 1) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(dp) : '—' }
function todayLocalMonth() {
    const now = new Date()
    const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
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
function isoToMonthInput(iso) {
    if (!iso) return ''
    const [y, m] = String(iso).split('-')
    return `${y}-${m}`
}
function lastDateISOFromMonth(monthStr) {
    if (!monthStr) return ''
    const [yStr, mStr] = monthStr.split('-')
    const y = Number(yStr)
    const m = Number(mStr)
    if (!y || !m) return ''
    const lastDay = new Date(y, m, 0).getDate()
    const mm = String(m).padStart(2, '0')
    const dd = String(lastDay).padStart(2, '0')
    return `${y}-${mm}-${dd}`
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
    if (key === 'month') {
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

/* ------------------- Year setup ------------------- */
const currentYear = new Date().getFullYear()
const yearStartISO = `${currentYear}-01-01`
const yearEndISO = `${currentYear}-12-31`
const yearRangeLabel = computed(() => `01/01/${currentYear} – 31/12/${currentYear}`)

/* ------------------- Dashboard Data ------------------- */
const wasteLoading = ref(false)
const wasteError = ref(null)
const monthlyRows = ref([])  // from /stats/monthly
const summary = reactive({
    start: null, end: null, days: 0, entries: 0,
    total_general: 0, total_recycled: 0, total_waste: 0,
    avg_per_day_total: 0, diversion_rate: 0
})

/* ------------------- Entries State ------------------- */
const entries = ref([])
const entriesLoading = ref(false)
const entriesError = ref(null)
const deletingId = ref(null)

/* Edit modal state */
const showEditModal = ref(false)
const editingRow = ref(null)
const editForm = reactive({
    month: '',
    general: null,
    recycled: null,
    food: null
})
const savingEdit = ref(false)

/* Delete modal state */
const showDeleteModal = ref(false)
const deleteTarget = ref(null)

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
    const startISO = yearStartISO
    const endISO = yearEndISO

    wasteLoading.value = true
    wasteError.value = null
    try {
        const [monthly, sum] = await Promise.all([
            fetchMonthly(startISO, endISO),
            fetchSummary(startISO, endISO)
        ])
        monthlyRows.value = monthly
        Object.assign(summary, sum)
    } catch (e) {
        wasteError.value = e?.message ?? 'Failed to load waste data'
        monthlyRows.value = []
        Object.assign(summary, { days: 0, entries: 0, total_waste: 0, avg_per_day_total: 0, diversion_rate: 0 })
    } finally {
        wasteLoading.value = false
    }
}

/* ------------------- Entries: GET + DELETE ------------------- */
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
    const startISO = yearStartISO
    const endISO = yearEndISO
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

/* Edit modal logic (PUT /entries/{id}) */
function openEditModal(row) {
    if (!row._hasId) return
    editingRow.value = row
    showEditModal.value = true
    editForm.month = row.dateISO ? isoToMonthInput(row.dateISO) : todayLocalMonth()
    editForm.general = row.general
    editForm.recycled = row.recycled
    editForm.food = row.food
}
function closeEditModal() {
    showEditModal.value = false
    editingRow.value = null
    editForm.month = ''
    editForm.general = null
    editForm.recycled = null
    editForm.food = null
}
async function saveEditModal() {
    if (!editingRow.value || !editingRow.value.id) {
        entriesError.value = 'Update failed: missing entry id from API.'
        return
    }
    if (!editForm.month) return

    savingEdit.value = true
    entriesError.value = null
    try {
        const isoDate = lastDateISOFromMonth(editForm.month)
        const payload = {
            date: yyyy_mm_dd_to_ddmmyyyy(isoDate),
            general: nz(editForm.general),
            recycled: nz(editForm.recycled),
            food: nz(editForm.food)
        }
        const r = await fetch(`${ENTRIES}/${encodeURIComponent(editingRow.value.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (!r.ok) {
            const msg = await r.json().catch(() => ({}))
            throw new Error(msg?.detail || `HTTP ${r.status}`)
        }
        closeEditModal()
        await loadEntries()
        await loadWasteAll()
    } catch (e) {
        entriesError.value = e?.message ?? 'Update failed'
    } finally {
        savingEdit.value = false
    }
}

/* Delete modal logic */
function openDeleteModal(row) {
    if (!row._hasId) return
    deleteTarget.value = row
    showDeleteModal.value = true
}
function closeDeleteModal() {
    if (deletingId.value !== null) return
    showDeleteModal.value = false
    deleteTarget.value = null
}

async function confirmDelete() {
    if (!deleteTarget.value) return
    entriesError.value = null
    await deleteEntry(deleteTarget.value)
    // Only close modal if delete didn't fail with an error
    if (!entriesError.value) {
        closeDeleteModal()
    }
}

/* Delete (DELETE /entries/{id}) */
async function deleteEntry(row) {
    if (!row?.id) { entriesError.value = 'Delete failed: missing entry id from API.'; return }
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
    } catch (e) {
        entriesError.value = e?.message ?? 'Delete failed'
    } finally {
        deletingId.value = null
    }
}

/* ------------------- Add Entry (POST /entries) ------------------- */
const form = reactive({ month: todayLocalMonth(), general: null, recycled: null, food: null })
const saving = ref(false)
async function submitWaste() {
    if (!form.month) return
    saving.value = true; wasteError.value = null
    try {
        const isoDate = lastDateISOFromMonth(form.month) // last day of month
        const payload = {
            date: yyyy_mm_dd_to_ddmmyyyy(isoDate),
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
        await loadHeadcounts()
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
        await loadHeadcounts()
        headcountFile.value = null
        uploadFileName.value = ''
    } catch (e) {
        headcountUploadError.value = e?.message ?? 'Upload failed'
    } finally {
        headcountUploading.value = false
    }
}

/* ------------------- Charts + WDI ------------------- */
const monthlyAggRows = computed(() =>
    aggregateByKey(monthlyRows.value, 'month', ['general', 'recycled', 'food', 'total', 'diversion_rate'])
)

// Business Activity Indicator
const BAI = 24753 // Person/Day

// Month meta for 2025
const MONTH_META_2025 = {
    '01/2025': { days: 31, weekends: 8, publicHolidays: 3, operatingDays: 20 },
    '02/2025': { days: 28, weekends: 8, publicHolidays: 0, operatingDays: 20 },
    '03/2025': { days: 31, weekends: 10, publicHolidays: 1, operatingDays: 20 },
    '04/2025': { days: 30, weekends: 8, publicHolidays: 1, operatingDays: 21 },
    '05/2025': { days: 31, weekends: 9, publicHolidays: 2, operatingDays: 20 },
    '06/2025': { days: 30, weekends: 9, publicHolidays: 0, operatingDays: 21 },
    '07/2025': { days: 31, weekends: 8, publicHolidays: 0, operatingDays: 23 },
    '08/2025': { days: 31, weekends: 10, publicHolidays: 0, operatingDays: 21 },
    '09/2025': { days: 30, weekends: 8, publicHolidays: 0, operatingDays: 22 },
    '10/2025': { days: 31, weekends: 8, publicHolidays: 1, operatingDays: 22 },
    '11/2025': { days: 30, weekends: 10, publicHolidays: 0, operatingDays: 20 },
    '12/2025': { days: 31, weekends: 8, publicHolidays: 1, operatingDays: 22 }
}

const ACTIVE_MONTH_META = computed(() =>
    currentYear === 2025 ? MONTH_META_2025 : {}
)

const monthKeysForYear = computed(() =>
    Array.from({ length: 12 }, (_, i) => {
        const mm = String(i + 1).padStart(2, '0')
        return `${mm}/${currentYear}`
    })
)

const wdiMonthlyRows = computed(() => {
    const meta = ACTIVE_MONTH_META.value
    return monthKeysForYear.value.map(monthKey => {
        const row = monthlyAggRows.value.find(r => r.month === monthKey) || {}
        const general = nz(row.general)
        const recycled = nz(row.recycled)
        const food = nz(row.food)
        const total = general + recycled + food
        const mMeta = meta[monthKey] || {}
        const operating_days = mMeta.operatingDays ?? 0

        let wdi = 0
        if (general > 0 && BAI > 0 && operating_days > 0) {
            wdi = general / BAI / operating_days
        }

        return {
            month: monthKey,
            general,
            recycled,
            food,
            total,
            operating_days,
            days: mMeta.days ?? 0,
            weekends: mMeta.weekends ?? 0,
            publicHolidays: mMeta.publicHolidays ?? 0,
            wdi
        }
    })
})

const currentMonthKey = computed(() => {
    const d = new Date()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${mm}/${d.getFullYear()}`
})

const currentMonthSummary = computed(() => {
    const found = wdiMonthlyRows.value.find(r => r.month === currentMonthKey.value)
    if (found) return found
    const mMeta = ACTIVE_MONTH_META.value[currentMonthKey.value] || {}
    return {
        month: currentMonthKey.value,
        general: 0,
        recycled: 0,
        food: 0,
        total: 0,
        operating_days: mMeta.operatingDays ?? 0,
        wdi: 0
    }
})

const MONTH_LABELS_SHORT = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
}

const wdiChartData = computed(() => ({
    labels: wdiMonthlyRows.value.map(r => {
        const [mm] = r.month.split('/')
        return MONTH_LABELS_SHORT[mm] || r.month
    }),
    datasets: [
        {
            label: 'Waste Disposal Index (WDI)',
            data: wdiMonthlyRows.value.map(r => r.wdi),
            borderWidth: 1,
            tension: 0.35,
            cubicInterpolationMode: 'monotone',
            pointRadius: 1.5,
            spanGaps: true,
            fill: false
        }
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

/* ------------------- Download Excel (CSV) ------------------- */
function downloadExcel() {
    const meta = ACTIVE_MONTH_META.value
    const header = [
        'Month',
        'Waste Disposed (kg)',
        'Food Waste Segregated for Treatment (kg)',
        'Waste Recycled (kg)',
        'Business Activity Indicator (BAI) (Person/Day)',
        'Number of Days',
        'Number of Weekends',
        'Number of Public Holidays',
        'Number of Operating Days',
        'Waste Disposal Index'
    ]

    const delimiter = ','

    const csvVal = (v) => {
        if (v === null || v === undefined) return ''
        const s = String(v)
        if (/[",\r\n]/.test(s)) {
            return `"${s.replace(/"/g, '""')}"`
        }
        return s
    }

    const lines = []
    lines.push(header.map(csvVal).join(delimiter))

    for (const mRow of wdiMonthlyRows.value) {
        const [mm] = mRow.month.split('/')
        const label = MONTH_LABELS_SHORT[mm] || mRow.month
        const mMeta = meta[mRow.month] || {}
        const wdiVal =
            mRow.general > 0 && mRow.operating_days > 0 ? mRow.wdi.toFixed(3) : ''

        const row = [
            label,
            mRow.general || 0,
            mRow.food || 0,
            mRow.recycled || 0,
            BAI,
            mMeta.days ?? 0,
            mMeta.weekends ?? 0,
            mMeta.publicHolidays ?? 0,
            mMeta.operatingDays ?? mRow.operating_days ?? 0,
            wdiVal
        ]
        lines.push(row.map(csvVal).join(delimiter))
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Waste_WDI_${currentYear}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/* ------------------- Kickoff ------------------- */
onMounted(async () => {
    await loadWasteAll()
    await loadHeadcounts()
    if (viewTab.value === 'Entries') await loadEntries()
})

function reloadAll() {
    if (viewTab.value === 'Dashboard') {
        loadWasteAll()
    } else {
        loadEntries()
        loadHeadcounts()
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

.chip-danger {
    background: rgba(239, 68, 68, .2);
    border-color: rgba(239, 68, 68, .6)
}

.chip-danger:disabled {
    opacity: .7
}

/* Inputs */
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

/* KPI */
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

.kpi-value-small {
    font-size: 1.1rem;
    font-weight: 700;
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
    grid-template-columns: 1fr;
    gap: 16px;
    margin: 14px 0;
    justify-items: start;
}

.chart-card {
    padding: 14px 14px 10px;
    border-radius: 12px;
    overflow: hidden;
    height: 190%;
    max-width: 60%;
    width: 100%;
    margin: 0;
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
    height: 260px
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

/* Modal */
.modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 50;
}

.modal {
    background: #020617;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.5);
    padding: 16px 18px;
    max-width: 640px;
    width: 100%;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.modal-header h3 {
    margin: 0;
    font-size: 1rem;
}

.modal-body {
    margin-bottom: 12px;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
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
    padding: 8px 14px;
    min-height: 36px;
    line-height: 1;
    border-radius: 999px;
}

.file-chip__icon {
    font-size: 16px;
    line-height: 1;
    vertical-align: middle;
}

.file-chip__text {
    display: inline-block;
    line-height: 1;
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
        height: 240px
    }
}

@media (max-width:768px) {
    .waste-management-container {
        padding: 16px
    }

    .chart-wrap {
        height: 220px
    }
}

.modal-body ul {
  list-style: none;
  padding-left: 0;
  margin: 4px 0 0;
}

</style>
