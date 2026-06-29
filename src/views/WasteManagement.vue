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

        <!-- View Tabs + Reload + Download -->
        <div class="view-tab-bar">
            <div class="view-tab-nav">
                <button :class="{ active: viewTab === 'Dashboard' }" @click="switchTab('Dashboard')">Dashboard</button>
                <button :class="{ active: viewTab === 'Entries' }" @click="switchTab('Entries')">Entries</button>
            </div>

            <div style="display:flex; gap:8px">
                <button class="icon-btn" @click="reloadAll" :title="(entriesLoading) ? 'Loading…' : 'Reload'">
                    <i class="fas fa-rotate"></i>
                </button>
                <button class="icon-btn" @click="downloadExcel" title="Download WDI Excel">
                    <i class="fas fa-file-excel"></i>
                </button>
            </div>
        </div>

        <!-- ========================= DASHBOARD ========================= -->
        <template v-if="viewTab === 'Dashboard'">
            <div class="meta-strip">
                <div class="title-wrap">
                    <span class="badge">Overview</span>
                    <h1>Campus Waste — Dashboard</h1>
                    <p class="subtitle">
                        Latest month • {{ latestMonthKey || '—' }}
                        <span v-if="latestMonthKey"> • Avg Jan–{{ latestMonthMM }}</span>
                    </p>
                </div>
            </div>

            <!-- ====== LATEST KPIs HEADER ====== -->
            <div class="kpi-section-header">
                <span class="section-chip">Latest ({{ latestMonthKey || '—' }})</span>
            </div>

            <!-- Row 1: Latest month -->
            <section class="grid kpi-grid">
                <div class="card kpi">
                    <div class="kpi-accent kpi-blue"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-dumpster"></i></div>
                        <div class="kpi-label">Waste Disposed (kg)</div>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(latestSummary.general_kg) }} <small>kg</small>
                    </div>
                    <div class="kpi-sub muted">
                        {{ latestMonthKey || '—' }}
                    </div>
                </div>

                <div class="card kpi">
                    <div class="kpi-accent kpi-green"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-recycle"></i></div>
                        <div class="kpi-label">Recycled (kg)</div>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(latestSummary.recycled_kg) }} <small>kg</small>
                    </div>
                    <div class="kpi-sub muted">
                        {{ latestMonthKey || '—' }}
                    </div>
                </div>

                <div class="card kpi">
                    <div class="kpi-accent kpi-orange"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-chart-area"></i></div>
                        <div class="kpi-label">Food (kg)</div>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(latestSummary.food_kg) }} <small>kg</small>
                    </div>
                    <div class="kpi-sub muted">
                        {{ latestMonthKey || '—' }}
                    </div>
                </div>

                <div class="card kpi">
                    <div class="kpi-accent kpi-purple"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-balance-scale"></i></div>
                        <div class="kpi-label">Waste Disposal Index (WDI)</div>
                    </div>
                    <div class="kpi-value kpi-value-small">
                        {{ showNum(latestSummary.wdi, 3) }}
                    </div>
                    <div class="kpi-sub muted">
                        Op days: {{ showNum(latestSummary.working_days, 1) }}
                    </div>
                </div>
            </section>

            <!-- ====== AVERAGE KPIs HEADER ====== -->
            <div class="kpi-section-header" style="margin-top:14px">
                <span class="section-chip section-chip-avg">Average (Jan–{{ latestMonthMM || '—' }})</span>
            </div>

            <!-- Row 2: Average Jan -> latest -->
            <section class="grid kpi-grid" style="margin-top:10px">
                <div class="card kpi">
                    <div class="kpi-accent kpi-blue"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-dumpster"></i></div>
                        <div class="kpi-label">Avg Waste Disposed (kg)</div>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(avgSummary.avg_general_kg) }} <small>kg</small>
                    </div>
                    <div class="kpi-sub muted">
                        Avg Jan–{{ latestMonthMM || '—' }}
                    </div>
                </div>

                <div class="card kpi">
                    <div class="kpi-accent kpi-green"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-recycle"></i></div>
                        <div class="kpi-label">Avg Recycled</div>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(avgSummary.avg_recycled_kg) }} <small>kg</small>
                    </div>
                    <div class="kpi-sub muted">
                        Avg Jan–{{ latestMonthMM || '—' }}
                    </div>
                </div>

                <div class="card kpi">
                    <div class="kpi-accent kpi-orange"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-chart-area"></i></div>
                        <div class="kpi-label">Avg Food</div>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(avgSummary.avg_food_kg) }} <small>kg</small>
                    </div>
                    <div class="kpi-sub muted">
                        Avg Jan–{{ latestMonthMM || '—' }}
                    </div>
                </div>

                <div class="card kpi">
                    <div class="kpi-accent kpi-purple"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-balance-scale"></i></div>
                        <div class="kpi-label">Avg WDI (computed)</div>
                    </div>
                    <div class="kpi-value kpi-value-small">
                        {{ showNum(avgSummary.avg_wdi, 3) }}
                    </div>
                    <div class="kpi-sub muted">
                        Avg op days: {{ showNum(avgSummary.avg_working_days, 1) }} • BAI: {{ fmtNum(BAI) }}
                    </div>
                </div>
            </section>

            <!-- Chart -->
            <section class="grid charts-grid">
                <div class="card chart-card">
                    <div class="card-header">
                        <h3>Waste Disposal Index (WDI) per Month</h3>
                        <small class="muted">Jan – {{ latestMonthKey || '—' }}</small>
                    </div>

                    <div class="chart-wrap" v-if="entriesLoading">Loading…</div>
                    <div class="chart-wrap" v-else>
                        <LineChartCard :title="' '" :chartData="wdiChartData" :options="trendChartOpts" />
                    </div>

                    <small class="err" v-if="entriesError">{{ entriesError }}</small>
                </div>
            </section>
        </template>

        <!-- ========================= ENTRIES ========================= -->
        <template v-else>
            <section class="grid">
                <!-- Add Entry (POST /waste) -->
                <div class="card">
                    <div class="card-header">
                        <h3>Add Entry</h3>
                    </div>

                    <div class="waste-form">
                        <label class="waste-field">
                            Entry Date
                            <input type="date" v-model="form.entry_date" />
                        </label>

                        <label class="waste-field">
                            Waste Disposed (kg)
                            <input type="number" min="0" step="0.01" v-model.number="form.general_kg"
                                placeholder="e.g. 30950" />
                        </label>

                        <label class="waste-field">
                            Recycled (kg)
                            <input type="number" min="0" step="0.01" v-model.number="form.recycled_kg"
                                placeholder="e.g. 1000" />
                        </label>

                        <label class="waste-field">
                            Food (kg)
                            <input type="number" min="0" step="0.01" v-model.number="form.food_kg"
                                placeholder="e.g. 1000" />
                        </label>

                        <label class="waste-field">
                            Population
                            <input type="number" min="0" step="1" v-model.number="form.population"
                                placeholder="e.g. 73343" />
                        </label>

                        <label class="waste-field">
                            Working Days
                            <input type="number" min="0" step="1" v-model.number="form.working_days"
                                placeholder="e.g. 23" />
                        </label>

                        <button class="waste-add-btn" @click="submitWaste" :disabled="saving || !form.entry_date">
                            <span v-if="saving">Saving…</span>
                            <span v-else>Add</span>
                        </button>
                    </div>

                    <small class="err" v-if="entriesError" style="display:block; margin-top:6px">
                        {{ entriesError }}
                    </small>
                </div>

                <!-- Entries table -->
                <div class="card">
                    <div class="card-header">
                        <h3>Entries ({{ entries.length }})</h3>
                        <small class="muted">{{ entriesLoading ? 'Loading…' : '' }}</small>
                        <button class="chip" style="margin-left:auto" @click="loadEntries">Reload</button>
                    </div>

                    <div class="table-wrap">
                        <table class="waste-table">
                            <thead>
                                <tr>
                                    <th style="min-width:70px">ID</th>
                                    <th style="min-width:110px">Month</th>
                                    <th style="min-width:120px">Entry Date</th>
                                    <th>Waste Disposed (kg)</th>
                                    <th>Recycled (kg)</th>
                                    <th>Food (kg)</th>
                                    <th>Population</th>
                                    <th>Working Days</th>
                                    <th>WDI</th>
                                    <th style="width:220px">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr v-if="entriesLoading">
                                    <td colspan="10" class="muted">Loading entries…</td>
                                </tr>

                                <tr v-else-if="!entries.length">
                                    <td colspan="10" class="muted">No entries found.</td>
                                </tr>

                                <tr v-else v-for="row in entries" :key="row._key">
                                    <td>{{ row.id ?? '—' }}</td>
                                    <td>{{ row.year_month ?? monthFromISO(row.entry_date) }}</td>
                                    <td>{{ row.entry_date ?? '—' }}</td>
                                    <td>{{ fmtNum(row.general_kg) }}</td>
                                    <td>{{ fmtNum(row.recycled_kg) }}</td>
                                    <td>{{ fmtNum(row.food_kg) }}</td>
                                    <td>{{ fmtNum(row.population) }}</td>
                                    <td>{{ row.working_days ?? '—' }}</td>
                                    <td>{{ showNum(row.wdi, 3) }}</td>

                                    <td class="row-actions">
                                        <button class="chip" :disabled="!row._hasId" @click="openEditModal(row)">
                                            Edit
                                        </button>

                                        <button class="chip chip-danger"
                                            :disabled="!row._hasId || deletingId === row.id"
                                            @click="openDeleteModal(row)">
                                            <span v-if="deletingId === row.id">Deleting…</span>
                                            <span v-else>Delete</span>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <small class="err" v-if="entriesError" style="display:block; margin-top:6px">
                        {{ entriesError }}
                    </small>
                </div>
            </section>

            <!-- EDIT MODAL -->
            <div v-if="showEditModal" class="modal-backdrop">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Edit Entry</h3>
                        <button class="chip" @click="closeEditModal" :disabled="savingEdit">×</button>
                    </div>

                    <div class="modal-body">
                        <div class="waste-form">
                            <label class="waste-field">
                                Entry Date
                                <input type="date" v-model="editForm.entry_date" />
                            </label>

                            <label class="waste-field">
                                Waste Disposed (kg)
                                <input type="number" min="0" step="0.01" v-model.number="editForm.general_kg" />
                            </label>

                            <label class="waste-field">
                                Recycled (kg)
                                <input type="number" min="0" step="0.01" v-model.number="editForm.recycled_kg" />
                            </label>

                            <label class="waste-field">
                                Food (kg)
                                <input type="number" min="0" step="0.01" v-model.number="editForm.food_kg" />
                            </label>

                            <label class="waste-field">
                                Population
                                <input type="number" min="0" step="1" v-model.number="editForm.population" />
                            </label>

                            <label class="waste-field">
                                Working Days
                                <input type="number" min="0" step="1" v-model.number="editForm.working_days" />
                            </label>
                        </div>

                        <small class="err" v-if="entriesError" style="display:block; margin-top:6px">
                            {{ entriesError }}
                        </small>
                    </div>

                    <div class="modal-footer">
                        <button class="chip" @click="closeEditModal" :disabled="savingEdit">Cancel</button>
                        <button class="chip" @click="saveEditModal" :disabled="savingEdit || !editForm.entry_date">
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
                        <p>Are you sure you want to delete this entry?</p>

                        <ul class="muted" v-if="deleteTarget">
                            <li><strong>Entry Date:</strong> {{ deleteTarget.entry_date }}</li>
                            <li><strong>General:</strong> {{ fmtNum(deleteTarget.general_kg) }} kg</li>
                            <li><strong>Recycled:</strong> {{ fmtNum(deleteTarget.recycled_kg) }} kg</li>
                            <li><strong>Food:</strong> {{ fmtNum(deleteTarget.food_kg) }} kg</li>
                            <li><strong>Population:</strong> {{ fmtNum(deleteTarget.population) }}</li>
                            <li><strong>Working Days:</strong> {{ deleteTarget.working_days }}</li>
                        </ul>

                        <small class="err" v-if="entriesError" style="display:block; margin-top:6px">
                            {{ entriesError }}
                        </small>
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
const WASTE = `${BASE}/waste`

/* ------------------- View Tab ------------------- */
const viewTab = ref('Dashboard')
function switchTab(tab) {
    viewTab.value = tab
    // We always keep entries fresh since Dashboard uses them too
    loadEntries()
}

/* ------------------- Helpers ------------------- */
function fmtNum(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString() : '—' }
function showNum(v, dp = 1) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(dp) : '—' }
function nz(v) { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0 }
function monthFromISO(iso) { return iso ? String(iso).slice(0, 7) : '' } // "YYYY-MM-DD" -> "YYYY-MM"

function ymToIndex(ym) {
    // "2025-10" -> sortable index
    const [y, m] = String(ym).split('-').map(Number)
    if (!Number.isFinite(y) || !Number.isFinite(m)) return -1
    return y * 12 + (m - 1)
}

function ymToDisplay(ym) {
    // "2025-10" -> "10/2025"
    if (!ym || String(ym).length < 7) return ''
    const yyyy = String(ym).slice(0, 4)
    const mm = String(ym).slice(5, 7)
    return `${mm}/${yyyy}`
}

/* ------------------- Entries (GET/POST/PUT/DELETE on /waste) ------------------- */
const entries = ref([])
const entriesLoading = ref(false)
const entriesError = ref(null)
const deletingId = ref(null)

/** GET /waste */
async function fetchWasteRows() {
    const r = await fetch(WASTE, { cache: 'no-cache' })
    if (!r.ok) {
        const t = await r.text().catch(() => '')
        throw new Error(`Waste HTTP ${r.status}: ${t || 'failed'}`)
    }

    const rows = await r.json()
    const list = (Array.isArray(rows) ? rows : []).map((x, idx) => {
        const key = x.id ?? `${x.year_month || monthFromISO(x.entry_date) || 'no-month'}#${idx}`
        return { ...x, _key: key, _hasId: Boolean(x.id) }
    })

    // Sort by year_month ascending (so chart + averaging is stable)
    list.sort((a, b) => ymToIndex(a.year_month) - ymToIndex(b.year_month))
    return list
}

async function loadEntries() {
    entriesLoading.value = true
    entriesError.value = null
    try {
        entries.value = await fetchWasteRows()
    } catch (e) {
        entriesError.value = e?.message ?? 'Failed to load entries'
        entries.value = []
    } finally {
        entriesLoading.value = false
    }
}

/** POST /waste */
const form = reactive({
    entry_date: '',
    general_kg: null,
    recycled_kg: null,
    food_kg: null,
    population: null,
    working_days: null
})
const saving = ref(false)

async function submitWaste() {
    if (!form.entry_date) return
    saving.value = true
    entriesError.value = null
    try {
        const payload = {
            entry_date: form.entry_date,
            general_kg: nz(form.general_kg),
            recycled_kg: nz(form.recycled_kg),
            food_kg: nz(form.food_kg),
            population: nz(form.population),
            working_days: nz(form.working_days)
        }

        const r = await fetch(WASTE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!r.ok) {
            const txt = await r.text().catch(() => '')
            let detail = ''
            try { detail = JSON.parse(txt)?.detail } catch { }
            throw new Error(detail || txt || `HTTP ${r.status}`)
        }

        // refresh data, not page
        await loadEntries()

        // reset form
        form.entry_date = ''
        form.general_kg = null
        form.recycled_kg = null
        form.food_kg = null
        form.population = null
        form.working_days = null
    } catch (e) {
        entriesError.value = e?.message ?? 'Save failed'
    } finally {
        saving.value = false
    }
}

/* ------------------- Edit modal (PUT /waste/{id}) ------------------- */
const showEditModal = ref(false)
const editingRow = ref(null)
const editForm = reactive({
    entry_date: '',
    general_kg: null,
    recycled_kg: null,
    food_kg: null,
    population: null,
    working_days: null
})
const savingEdit = ref(false)

function openEditModal(row) {
    if (!row?._hasId) return
    editingRow.value = row
    showEditModal.value = true
    editForm.entry_date = row.entry_date || ''
    editForm.general_kg = row.general_kg ?? 0
    editForm.recycled_kg = row.recycled_kg ?? 0
    editForm.food_kg = row.food_kg ?? 0
    editForm.population = row.population ?? 0
    editForm.working_days = row.working_days ?? 0
}

function closeEditModal() {
    if (savingEdit.value) return
    showEditModal.value = false
    editingRow.value = null
    editForm.entry_date = ''
    editForm.general_kg = null
    editForm.recycled_kg = null
    editForm.food_kg = null
    editForm.population = null
    editForm.working_days = null
}

async function saveEditModal() {
    if (!editingRow.value?.id) {
        entriesError.value = 'Update failed: missing entry id.'
        return
    }
    if (!editForm.entry_date) return

    savingEdit.value = true
    entriesError.value = null

    try {
        const payload = {
            entry_date: editForm.entry_date,
            general_kg: nz(editForm.general_kg),
            recycled_kg: nz(editForm.recycled_kg),
            food_kg: nz(editForm.food_kg),
            population: nz(editForm.population),
            working_days: nz(editForm.working_days)
        }

        const url = `${WASTE}/${encodeURIComponent(editingRow.value.id)}`
        const r = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!r.ok) {
            const txt = await r.text().catch(() => '')
            let detail = ''
            try { detail = JSON.parse(txt)?.detail } catch { }
            throw new Error(detail || txt || `HTTP ${r.status}`)
        }

        // ✅ close modal on success
        closeEditModal()

        // ✅ refresh data, not page
        await loadEntries()
    } catch (e) {
        entriesError.value = e?.message ?? 'Update failed'
    } finally {
        savingEdit.value = false
        closeEditModal();
    }
}

/* ------------------- Delete modal (DELETE /waste/{id}) ------------------- */
const showDeleteModal = ref(false)
const deleteTarget = ref(null)

function openDeleteModal(row) {
    if (!row?._hasId) return
    deleteTarget.value = row
    showDeleteModal.value = true
}
function closeDeleteModal() {
    if (deletingId.value !== null) return
    showDeleteModal.value = false
    deleteTarget.value = null
}
async function confirmDelete() {
    if (!deleteTarget.value?.id) return
    await deleteWaste(deleteTarget.value.id)
    if (!entriesError.value) closeDeleteModal()
}

async function deleteWaste(id) {
    try {
        deletingId.value = id
        entriesError.value = null

        const url = `${WASTE}/${encodeURIComponent(id)}`
        const r = await fetch(url, { method: 'DELETE' })

        if (!r.ok) {
            const txt = await r.text().catch(() => '')
            let detail = ''
            try { detail = JSON.parse(txt)?.detail } catch { }
            throw new Error(detail || txt || `HTTP ${r.status}`)
        }

        await loadEntries()
    } catch (e) {
        entriesError.value = e?.message ?? 'Delete failed'
    } finally {
        deletingId.value = null
    }
}

/* ------------------- Dashboard (computed from /waste rows) ------------------- */
const BAI = 24753 // Person/Day (keep your constant)

const latestRow = computed(() => {
    if (!entries.value.length) return null
    // entries are sorted ascending by year_month already
    return entries.value[entries.value.length - 1]
})

const latestMonthKey = computed(() => {
    const r = latestRow.value
    return r?.year_month ? ymToDisplay(r.year_month) : ''
})

const latestMonthMM = computed(() => {
    // "10/2025" -> "10"
    if (!latestMonthKey.value) return ''
    return latestMonthKey.value.split('/')[0]
})

const latestSummary = computed(() => {
    const r = latestRow.value || {}
    return {
        general_kg: nz(r.general_kg),
        recycled_kg: nz(r.recycled_kg),
        food_kg: nz(r.food_kg),
        working_days: nz(r.working_days),
        wdi: Number.isFinite(Number(r.wdi)) ? Number(r.wdi) : 0
    }
})

const rowsJanToLatest = computed(() => {
    const r = latestRow.value
    if (!r?.year_month) return []
    const latestYear = String(r.year_month).slice(0, 4)
    const latestYMIdx = ymToIndex(r.year_month)

    return (entries.value || []).filter(x => {
        const ym = x?.year_month
        if (!ym) return false
        if (String(ym).slice(0, 4) !== latestYear) return false
        return ymToIndex(ym) <= latestYMIdx
    })
})

const avgSummary = computed(() => {
    const rows = rowsJanToLatest.value
    if (!rows.length) {
        return { avg_general_kg: 0, avg_recycled_kg: 0, avg_food_kg: 0, avg_working_days: 0, avg_wdi: 0 }
    }

    const n = rows.length
    let sumG = 0, sumR = 0, sumF = 0
    let sumOp = 0, opCnt = 0

    for (const r of rows) {
        sumG += nz(r.general_kg)
        sumR += nz(r.recycled_kg)
        sumF += nz(r.food_kg)

        const op = Number(r.working_days)
        if (Number.isFinite(op) && op > 0) {
            sumOp += op
            opCnt += 1
        }
    }

    const avg_general_kg = sumG / n
    const avg_recycled_kg = sumR / n
    const avg_food_kg = sumF / n
    const avg_working_days = opCnt ? (sumOp / opCnt) : 0

    // use avg operating days to calculate WDI portion (based on avg general)
    const avg_wdi = (avg_general_kg > 0 && BAI > 0 && avg_working_days > 0)
        ? (avg_general_kg / BAI / avg_working_days)
        : 0

    return { avg_general_kg, avg_recycled_kg, avg_food_kg, avg_working_days, avg_wdi }
})

/* ------------------- Chart (Jan -> latest) ------------------- */
const MONTH_LABELS_SHORT = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
}

const wdiChartData = computed(() => {
    const rows = rowsJanToLatest.value
    const labels = rows.map(r => {
        const ym = String(r.year_month || '')
        const mm = ym.slice(5, 7)
        return MONTH_LABELS_SHORT[mm] || ym
    })

    const data = rows.map(r => {
        const v = Number(r.wdi)
        return Number.isFinite(v) ? v : 0
    })

    return {
        labels,
        datasets: [
            {
                label: 'Waste Disposal Index (WDI)',
                data,
                borderWidth: 1,
                tension: 0.35,
                cubicInterpolationMode: 'monotone',
                pointRadius: 1.5,
                spanGaps: true,
                fill: false
            }
        ]
    }
})

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
    const rows = rowsJanToLatest.value

    const header = [
        'Month',
        'Waste Disposed (kg)',
        'Food (kg)',
        'Recycled (kg)',
        'Population',
        'Working Days',
        'Waste Disposal Index (WDI)'
    ]

    const delimiter = ','
    const csvVal = (v) => {
        if (v === null || v === undefined) return ''
        const s = String(v)
        if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
        return s
    }

    const lines = []
    lines.push(header.map(csvVal).join(delimiter))

    for (const r of rows) {
        const ym = String(r.year_month || '')
        const mm = ym.slice(5, 7)
        const label = MONTH_LABELS_SHORT[mm] || ym

        lines.push([
            label,
            nz(r.general_kg),
            nz(r.food_kg),
            nz(r.recycled_kg),
            nz(r.population),
            nz(r.working_days),
            (Number.isFinite(Number(r.wdi)) ? Number(r.wdi).toFixed(3) : '')
        ].map(csvVal).join(delimiter))
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Waste_WDI_${latestRow.value?.year_month?.slice(0, 4) || 'data'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/* ------------------- Kickoff + Reload ------------------- */
onMounted(async () => {
    await loadEntries()
})

function reloadAll() {
    loadEntries()
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
    min-width: 10rem
}

.waste-field input {
    margin-top: 4px;
    background: #16366f;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, .25);
    border-radius: 6px;
    padding: 6px 8px
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
    font-weight: 700
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
    height: auto;
    max-width: 100%;
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
    max-width: 760px;
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

.muted {
    color: #9fb0ff;
    opacity: .9
}

.err {
    color: #fda4af
}

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

.kpi-section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0 10px;
}

.section-chip {
    font-size: .8rem;
    font-weight: 800;
    color: #fff;
    background: rgba(255, 255, 255, .10);
    border: 1px solid rgba(255, 255, 255, .14);
    padding: 7px 12px;
    border-radius: 999px;
    letter-spacing: .2px;
}

.section-chip-avg {
    background: rgba(34, 197, 94, .14);
    border-color: rgba(34, 197, 94, .35);
    color: #bbf7d0;
}
</style>
