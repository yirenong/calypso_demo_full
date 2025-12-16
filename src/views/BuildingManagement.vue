<template>
    <div class="device-list-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Real Time Metrics</h2>
            <div class="page-header-right">
                <nav class="breadcrumb">
                    <span>Cavill</span> &gt; <span>Management</span> &gt; <span>Real Time Metrics</span>
                </nav>
            </div>
        </div>

        <!-- Top tabs -->
        <div class="view-tab-bar">
            <div class="view-tab-nav">
                <button :class="{ active: viewTab === 'Device List' }" @click="viewTab = 'Device List'">Device
                    List</button>
                <button :class="{ active: viewTab === 'Faults' }" @click="viewTab = 'Faults'">Faults</button>
                <button :class="{ active: viewTab === 'History' }" @click="viewTab = 'History'">History</button>
            </div>
            <div class="right-tools">
                <div class="meta-chip" v-if="viewTab === 'Faults'">Active: <strong>{{ faultsShown.length }}</strong>
                </div>
                <div class="meta-chip" v-else-if="viewTab === 'History'">Records: <strong>{{ historyShown.length
                }}</strong></div>
            </div>
        </div>

        <!-- ========================= DEVICE LIST ========================= -->
        <template v-if="viewTab === 'Device List'">
            <!-- Toolbar -->
            <div class="toolbar">
                <div class="left-tools">
                    <button class="icon-btn" :title="loadingDevices ? 'Loading…' : 'Reload devices'"
                        @click="loadDevices" :disabled="loadingDevices">
                        <i class="fas fa-rotate"></i>
                    </button>
                    <div class="search">
                        <i class="fas fa-search"></i>
                        <input v-model.trim="q" placeholder="Search id/name…" />
                    </div>
                </div>

                <div class="right-tools">
                    <div class="meta-chip">
                        Devices: <strong>{{ filteredDevices.length }}</strong>
                    </div>
                    <div class="meta-chip" :class="{ 'bad': totalFaultDevices > 0 }">
                        With Faults: <strong>{{ totalFaultDevices }}</strong>
                    </div>
                </div>
            </div>

            <!-- Main grid: devices list (left) and objects (right) -->
            <section class="grid main-grid">
                <!-- Devices list -->
                <div class="card devices-card">
                    <div class="card-header">
                        <h3>Devices</h3>
                        <small class="muted" v-if="loadingDevices">Loading devices…</small>
                        <small class="err" v-else-if="devicesError">{{ devicesError }}</small>
                    </div>

                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:120px">Device ID</th>
                                    <th>Device Name</th>
                                    <th style="width:120px">Vendor</th>
                                    <th style="width:110px">Objects</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="d in filteredDevices" :key="d['device-id']"
                                    :class="{ active: isSelected(d) }" @click="selectDevice(d)">
                                    <td><code>{{ d['device-id'] }}</code></td>
                                    <td class="device-name">
                                        <span>{{ d['device-name'] || '—' }}</span>
                                    </td>
                                    <td>
                                        <a class="link" :href="d.href" target="_blank" rel="noopener">Open</a>
                                    </td>
                                    <td>
                                        <button class="chip tiny" @click.stop="selectDevice(d)">View</button>
                                    </td>
                                </tr>
                                <tr v-if="!loadingDevices && !devicesError && !filteredDevices.length">
                                    <td colspan="4" class="muted">No devices found.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Objects panel -->
                <div class="card objects-card">
                    <div class="card-header">
                        <h3>Objects <template v-if="selectedId">— Device {{ selectedId }}</template></h3>
                        <div class="flex-right">
                            <label class="toggle">
                                <input type="checkbox" v-model="onlyFaults" />
                                <span>Only faults</span>
                            </label>
                            <small class="muted" v-if="loadingObjects">Loading objects…</small>
                            <small class="err" v-else-if="objectsError">{{ objectsError }}</small>
                        </div>
                    </div>

                    <div v-if="!selectedId" class="placeholder muted">
                        Select a device to load its objects.
                    </div>

                    <div v-else class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:140px">Object ID</th>
                                    <th>Object Name</th>
                                    <th style="width:140px">Present Value</th>
                                    <th style="width:140px">Units</th>
                                    <th style="width:150px">Reliability</th>
                                    <th style="width:130px">Status</th>
                                    <th style="width:90px">Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="o in shownObjects" :key="o['object-id']" :class="rowClass(o)">
                                    <td><code>{{ o['object-id'] }}</code></td>
                                    <td class="mono-ellipsis" :title="o['object-name']">{{ o['object-name'] || '—' }}
                                    </td>
                                    <td>{{ fmtNumMaybe(o['present-value']) }}</td>
                                    <td>{{ o['units'] || '—' }}</td>
                                    <td>
                                        <span :class="['tag',
                                            (o.reliability == null || String(o.reliability).trim() === '') ? '' :
                                                (isOkReliability(o) ? 'ok' : 'bad')]">
                                            {{ (o.reliability == null || String(o.reliability).trim() === '') ? '—' :
                                                o.reliability }}
                                        </span>
                                    </td>
                                    <td>
                                        <span v-if="o['status-flags']"
                                            :class="['tag', o['status-flags'].fault ? 'bad' : 'ok']">
                                            {{ o['status-flags'].fault ? 'fault' : 'ok' }}
                                        </span>
                                        <span v-else class="tag">—</span>
                                    </td>
                                    <td>
                                        <a class="link" :href="o.href" target="_blank" rel="noopener">Open</a>
                                    </td>
                                </tr>
                                <tr v-if="!loadingObjects && !objectsError && !shownObjects.length">
                                    <td colspan="7" class="muted">
                                        {{ onlyFaults ? 'No faulty objects.' : 'No objects found.' }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Footer numbers -->
                    <div v-if="selectedId" class="objects-footer">
                        <div class="meta-chip">Objects: <strong>{{ objects.length }}</strong></div>
                        <div class="meta-chip" :class="{ 'bad': faultObjectsCount > 0 }">
                            Faults: <strong>{{ faultObjectsCount }}</strong>
                        </div>
                    </div>
                </div>
            </section>
        </template>

        <!-- ========================= FAULTS (ACTIVE) ========================= -->
        <template v-else-if="viewTab === 'Faults'">
            <div class="toolbar">
                <div class="left-tools">
                    <button class="icon-btn" :title="loadingFaults ? 'Loading…' : 'Reload faults'" @click="loadFaults"
                        :disabled="loadingFaults">
                        <i class="fas fa-rotate"></i>
                    </button>
                    <div class="search">
                        <i class="fas fa-search"></i>
                        <input v-model.trim="fq" placeholder="Search device/object…" />
                    </div>
                    <label class="toggle">
                        <input type="checkbox" v-model="faultsOnlyBad" />
                        <span>Only bad (fault flag or bad reliability)</span>
                    </label>
                </div>
            </div>

            <section class="grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Active Faults</h3>
                        <small class="muted" v-if="loadingFaults">Loading…</small>
                        <small class="err" v-else-if="faultsError">{{ faultsError }}</small>
                    </div>

                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Device Name</th>
                                    <th>Object Name</th>
                                    <th style="width:150px">Reliability</th>
                                    <th style="width:130px">Flags</th>
                                    <th style="width:160px">Fault Reported At</th>
                                    <th style="width:160px">Last Seen</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in faultsShown" :key="r.id" :class="isBadRow(r) ? 'row-bad' : ''">
                                    <td class="mono-ellipsis" :title="r.device_name">{{ r.device_name || '—' }}</td>
                                    <td class="mono-ellipsis" :title="r.object_name">{{ r.object_name || '—' }}</td>
                                    <td>
                                        <span
                                            :class="['tag',
                                                (r.reliability == null || String(r.reliability).trim() === '') ? '' :
                                                    (String(r.reliability).toLowerCase() === 'no-fault-detected' ? 'ok' : 'bad')]">
                                            {{ (r.reliability == null || String(r.reliability).trim() === '') ? '—' :
                                                r.reliability }}
                                        </span>
                                    </td>
                                    <td>
                                        <span :class="['tag', r.fault ? 'bad' : 'ok']">{{ r.fault ? 'fault' : 'ok'
                                        }}</span>
                                    </td>
                                    <td class="mono-ellipsis" :title="r.start_on">{{ fmtTs(r.start_on) }}</td>
                                    <td class="mono-ellipsis" :title="r.last_seen">{{ fmtTs(r.last_seen) }}</td>
                                </tr>
                                <tr v-if="!loadingFaults && !faultsError && !faultsShown.length">
                                    <td colspan="12" class="muted">No active faults.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </template>

        <!-- ========================= HISTORY ========================= -->
        <template v-else>
            <div class="toolbar">
                <div class="left-tools">
                    <button class="icon-btn" :title="loadingHistory ? 'Loading…' : 'Reload history'"
                        @click="loadHistory" :disabled="loadingHistory">
                        <i class="fas fa-rotate"></i>
                    </button>

                    <!-- Date pickers + controls -->
                    <input type="date" v-model="startDate" class="chip" />
                    <input type="date" v-model="endDate" class="chip" />
                    <button class="chip" @click="loadHistory">Apply</button>
                    <button class="chip" @click="clearHistoryDates" :disabled="!startDate && !endDate">Clear</button>

                    <div class="search">
                        <i class="fas fa-search"></i>
                        <input v-model.trim="hq" placeholder="Search device/object…" />
                    </div>
                    <label class="toggle">
                        <input type="checkbox" v-model="historyOnlyUnrectified" />
                        <span>Only unrectified</span>
                    </label>
                    <label class="toggle">
                        <input type="checkbox" v-model="historyOnlyBad" />
                        <span>Only bad (fault flag or bad reliability)</span>
                    </label>
                </div>
            </div>

            <section class="grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Fault History</h3>
                        <small class="muted" v-if="loadingHistory">Loading…</small>
                        <small class="err" v-else-if="historyError">{{ historyError }}</small>
                    </div>

                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Device Name</th>
                                    <th>Object Name</th>
                                    <th style="width:150px">Reliability</th>
                                    <th style="width:130px">Flags</th>
                                    <th style="width:160px">Fault Reported At</th>
                                    <th style="width:160px">Last Seen</th>
                                    <th style="width:160px">Rectified</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in historyShown" :key="r.id" :class="isBadRow(r) ? 'row-bad' : ''">
                                    <td class="mono-ellipsis" :title="r.device_name">{{ r.device_name || '—' }}</td>
                                    <td class="mono-ellipsis" :title="r.object_name">{{ r.object_name || '—' }}</td>
                                    <td>
                                        <span
                                            :class="['tag',
                                                (r.reliability == null || String(r.reliability).trim() === '') ? '' :
                                                    (String(r.reliability).toLowerCase() === 'no-fault-detected' ? 'ok' : 'bad')]">
                                            {{ (r.reliability == null || String(r.reliability).trim() === '') ? '—' :
                                                r.reliability }}
                                        </span>
                                    </td>
                                    <td>
                                        <span :class="['tag', r.fault ? 'bad' : 'ok']">{{ r.fault ? 'fault' : 'ok'
                                        }}</span>
                                    </td>
                                    <td class="mono-ellipsis" :title="r.start_on">{{ fmtTs(r.start_on) }}</td>
                                    <td class="mono-ellipsis" :title="r.last_seen">{{ fmtTs(r.last_seen) }}</td>
                                    <td class="mono-ellipsis" :title="r.rectified_on">{{ r.rectified_on ?
                                        fmtTs(r.rectified_on) : '—' }}</td>
                                </tr>
                                <tr v-if="!loadingHistory && !historyError && !historyShown.length">
                                    <td colspan="13" class="muted">No records.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </template>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

/** Tabs */
const viewTab = ref('Device List')

/** Endpoints */
const BASE = 'http://localhost:47800/api/v1/bacnet'
const DEVICES_URL = `${BASE}/devices?refresh=false`
const objectsUrl = (id) =>
    `${BASE}/devices/${encodeURIComponent(id)}/objects?limit=999&properties=object-name&properties=present-value&properties=status-flags&properties=reliability&properties=units`

const FAULTS_ACTIVE_URL = 'http://localhost:8084/faults/active'
const FAULTS_HISTORY_URL = 'http://localhost:8084/faults/history'

/** ---------- Helpers ---------- */
const dtFmtOpts = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
}
function fmtTs(ts) {
    if (!ts) return '—'
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return ts // fall back if unparsable
    return d.toLocaleString(undefined, dtFmtOpts) // user’s locale/timezone
}

function fmtNumMaybe(v) {
    const n = Number(v)
    if (!Number.isFinite(n)) return v ?? '—'
    const abs = Math.abs(n)
    if (Number.isInteger(n)) return n.toString()
    return abs < 1e-3 ? n.toExponential(3) : n.toFixed(6).replace(/\.?0+$/, '')
}
function isOkReliabilityLike(rel) {
    if (rel == null || String(rel).trim() === '') return true
    return String(rel).toLowerCase() === 'no-fault-detected'
}
function isBadRow(row) {
    return !!row?.fault || !isOkReliabilityLike(row?.reliability)
}

/** =========================================================
 *                    DEVICE LIST (existing)
 *  ========================================================= */
const devices = ref([])
const loadingDevices = ref(false)
const devicesError = ref(null)
const q = ref('')

async function loadDevices() {
    loadingDevices.value = true
    devicesError.value = null
    try {
        const r = await fetch(DEVICES_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const body = await r.json()
        const arr = Array.isArray(body?.devices) ? body.devices : []
        devices.value = arr.slice().sort((a, b) => {
            const ai = Number(a['device-id']); const bi = Number(b['device-id'])
            if (Number.isFinite(ai) && Number.isFinite(bi)) return ai - bi
            return String(a['device-id']).localeCompare(String(b['device-id']))
        })
    } catch (e) {
        devicesError.value = e?.message ?? 'Failed to load devices'
        devices.value = []
    } finally {
        loadingDevices.value = false
    }
}

const filteredDevices = computed(() => {
    const s = q.value.trim().toLowerCase()
    if (!s) return devices.value
    return devices.value.filter(d =>
        String(d['device-id']).toLowerCase().includes(s) ||
        String(d['device-name'] || '').toLowerCase().includes(s)
    )
})

const selectedId = ref(null)
const objects = ref([])
const loadingObjects = ref(false)
const objectsError = ref(null)
const onlyFaults = ref(false)

function isSelected(d) { return String(d['device-id']) === String(selectedId.value) }

async function selectDevice(d) {
    const id = d?.['device-id']
    if (!id) return
    selectedId.value = String(id)
    await loadObjectsForSelected()
}

function isOkReliability(o) {
    return isOkReliabilityLike(o?.reliability)
}

function rowClass(o) {
    const hasFaultFlag = !!o?.['status-flags']?.fault
    const bad = hasFaultFlag || !isOkReliability(o)
    return bad ? 'row-bad' : ''
}

const faultObjectsCount = computed(() =>
    (objects.value || []).reduce((n, o) => n + ((!isOkReliability(o) || !!o?.['status-flags']?.fault) ? 1 : 0), 0)
)

const totalFaultDevices = computed(() => 0) // placeholder

const shownObjects = computed(() => {
    if (!onlyFaults.value) return objects.value
    return (objects.value || []).filter(o => !isOkReliability(o) || !!o?.['status-flags']?.fault)
})

async function loadObjectsForSelected() {
    if (!selectedId.value) return
    loadingObjects.value = true
    objectsError.value = null
    try {
        const r = await fetch(objectsUrl(selectedId.value), { cache: 'no-cache' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const body = await r.json()
        const arr = Array.isArray(body?.objects) ? body.objects : []
        arr.sort((a, b) => {
            const af = (!isOkReliability(a) || !!a?.['status-flags']?.fault) ? 1 : 0
            const bf = (!isOkReliability(b) || !!b?.['status-flags']?.fault) ? 1 : 0
            if (af !== bf) return bf - af
            return String(a['object-id']).localeCompare(String(b['object-id']))
        })
        objects.value = arr
    } catch (e) {
        objectsError.value = e?.message ?? 'Failed to load objects'
        objects.value = []
    } finally {
        loadingObjects.value = false
    }
}

/** =========================================================
 *                           FAULTS
 *  ========================================================= */
const faults = ref([])
const loadingFaults = ref(false)
const faultsError = ref(null)
const fq = ref('')
const faultsOnlyBad = ref(true)

async function loadFaults() {
    loadingFaults.value = true
    faultsError.value = null
    try {
        const r = await fetch(FAULTS_ACTIVE_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const body = await r.json()
        const arr = Array.isArray(body) ? body : []
        // Sort: bad first, then last_seen desc
        arr.sort((a, b) => {
            const af = isBadRow(a) ? 1 : 0
            const bf = isBadRow(b) ? 1 : 0
            if (af !== bf) return bf - af
            return String(b.last_seen).localeCompare(String(a.last_seen))
        })
        faults.value = arr
    } catch (e) {
        faultsError.value = e?.message ?? 'Failed to load active faults'
        faults.value = []
    } finally {
        loadingFaults.value = false
    }
}

const faultsFiltered = computed(() => {
    const s = fq.value.trim().toLowerCase()
    if (!s) return faults.value
    return (faults.value || []).filter(r =>
        String(r.device_id).toLowerCase().includes(s) ||
        String(r.device_name || '').toLowerCase().includes(s) ||
        String(r.object_id || '').toLowerCase().includes(s) ||
        String(r.object_name || '').toLowerCase().includes(s)
    )
})
const faultsShown = computed(() => {
    if (!faultsOnlyBad.value) return faultsFiltered.value
    return faultsFiltered.value.filter(r => isBadRow(r))
})

/** =========================================================
 *                           HISTORY
 *  ========================================================= */
const history = ref([])
const loadingHistory = ref(false)
const historyError = ref(null)
const hq = ref('')
const historyOnlyUnrectified = ref(false)
const historyOnlyBad = ref(false)

/* date pickers state */
const startDate = ref('')  // YYYY-MM-DD
const endDate = ref('')  // YYYY-MM-DD

/* build URL based on selected dates */
function historyUrl() {
    if (!startDate.value && !endDate.value) return FAULTS_HISTORY_URL
    // Construct query string safely
    const params = new URLSearchParams()
    if (startDate.value) params.set('start', startDate.value)
    if (endDate.value) params.set('end', endDate.value)
    params.set('limit', '5000')
    return `${FAULTS_HISTORY_URL}?${params.toString()}`
}

async function loadHistory() {
    loadingHistory.value = true
    historyError.value = null
    try {
        const url = historyUrl()
        const r = await fetch(url, { cache: 'no-cache' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const body = await r.json()
        const arr = Array.isArray(body) ? body : []
        // Sort: most recent last_seen first
        arr.sort((a, b) => String(b.last_seen).localeCompare(String(a.last_seen)))
        history.value = arr
    } catch (e) {
        historyError.value = e?.message ?? 'Failed to load history'
        history.value = []
    } finally {
        loadingHistory.value = false
    }
}

function clearHistoryDates() {
    startDate.value = ''
    endDate.value = ''
    loadHistory()
}

const historyFiltered = computed(() => {
    const s = hq.value.trim().toLowerCase()
    let list = history.value || []
    if (s) {
        list = list.filter(r =>
            String(r.device_id).toLowerCase().includes(s) ||
            String(r.device_name || '').toLowerCase().includes(s) ||
            String(r.object_id || '').toLowerCase().includes(s) ||
            String(r.object_name || '').toLowerCase().includes(s)
        )
    }
    if (historyOnlyUnrectified.value) {
        list = list.filter(r => r.rectified_on == null)
    }
    if (historyOnlyBad.value) {
        list = list.filter(r => isBadRow(r))
    }
    return list
})
const historyShown = historyFiltered

/** Kickoff */
onMounted(async () => {
    await loadDevices()
    // Preload others so tabs feel instant
    loadFaults()
    loadHistory()
})
</script>

<style scoped>
/* Base */
.device-list-container {
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

.page-title {
    margin: 0;
    font-size: 24px;
    color: #f8fafc
}

.page-header-right {
    display: flex;
    align-items: center;
    gap: 10px
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

/* Tabs on top */
.view-tab-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0 12px
}

.view-tab-nav {
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

/* Toolbar */
.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin: 10px 0 12px
}

.left-tools {
    display: flex;
    align-items: center;
    gap: 10px
}

.right-tools {
    display: flex;
    align-items: center;
    gap: 10px;
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

.meta-chip.bad {
    border-color: rgba(239, 68, 68, .45);
    color: #fecaca;
    background: rgba(239, 68, 68, .15)
}

.search {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #121a2c;
    border: 1px solid rgba(255, 255, 255, .12);
    padding: 6px 10px;
    border-radius: 10px;
    min-width: 260px
}

.search input {
    background: transparent;
    border: none;
    outline: none;
    color: #e5e7eb;
    flex: 1 1 auto
}

/* Grid */
.grid {
    display: grid;
    gap: 16px
}

.main-grid {
    grid-template-columns: 1.2fr 2fr
}

/* Cards / tables */
.card {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, .25)
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

.flex-right {
    display: flex;
    align-items: center;
    gap: 10px
}

.table-wrap {
    overflow: auto
}

table {
    width: 100%;
    border-collapse: collapse;
    color: #e5e7eb
}

th,
td {
    border: 1px solid rgba(255, 255, 255, .18);
    padding: 8px;
    text-align: left
}

th {
    background: rgba(255, 255, 255, .04)
}

tr.active {
    outline: 2px solid rgba(59, 130, 246, .6)
}

.link {
    color: #93c5fd;
    text-decoration: none
}

.link:hover {
    text-decoration: underline
}

.device-name,
.mono-ellipsis {
    max-width: 520px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis
}

.placeholder {
    padding: 10px
}

.toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: .9rem;
    color: #cbd5e1
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

.chip.tiny {
    padding: 5px 10px;
    font-size: .78rem
}

/* Status tags and row highlighting */
.tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .2px;
    border: 1px solid rgba(255, 255, 255, .25);
    background: rgba(255, 255, 255, .08);
    color: #e5e7eb
}

.tag.ok {
    background: rgba(34, 197, 94, .18);
    border-color: rgba(34, 197, 94, .45);
    color: #bbf7d0
}

.tag.bad {
    background: rgba(239, 68, 68, .18);
    border-color: rgba(239, 68, 68, .45);
    color: #fecaca
}

.row-bad {
    background: rgba(239, 68, 68, .08)
}

/* Footer */
.objects-footer {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 10px
}

/* Responsive */
@media (max-width:1100px) {
    .main-grid {
        grid-template-columns: 1fr
    }
}

@media (max-width:768px) {
    .device-list-container {
        padding: 16px
    }
}

.muted {
    color: #9fb0ff;
    opacity: .9
}

.err {
    color: #fda4af
}
</style>
