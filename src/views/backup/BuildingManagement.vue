<template>
    <div class="building-management-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Building Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt; <span>Management</span> &gt; <span>Building Management</span>
            </nav>
        </div>

        <!-- Tabs -->
        <div class="tab-nav">
            <button :class="{ active: currentTab === 'overview' }" @click="currentTab = 'overview'">Sensor
                Overview</button>
            <button :class="{ active: currentTab === 'download' }" @click="currentTab = 'download'">Download
                Data</button>

            <!-- MQTT status -->
            <span :title="mqttConnected ? 'MQTT connected' : 'MQTT disconnected'"
                style="margin-left:auto;display:inline-flex;align-items:center;gap:6px">
                <span :style="{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: mqttConnected ? '#2ecc71' : '#e74c3c'
                }"></span>
                <small>{{ mqttConnected ? 'Connected' : 'Disconnected' }}</small>
            </span>
        </div>

        <!-- Route switch (hide page when inside /trend) -->
        <div v-if="!isTrendRoute">
            <!-- Overview: Blocks → Levels → Devices → Tables -->
            <div v-if="currentTab === 'overview'" class="tab-content groups-wrap">
                <!-- Step 1: Blocks -->
                <div v-if="!activeBlock" class="group-grid">
                    <button v-for="b in blockNames" :key="b" class="group-card" @click="selectBlock(b)">
                        <div class="group-title">Block {{ b }}</div>
                        <div class="group-meta"><span>{{ blockCounts[b] ?? 0 }} points</span></div>
                    </button>
                </div>

                <!-- Step 2: Levels -->
                <div v-else-if="activeBlock && !activeLevel">
                    <div class="group-detail-header">
                        <button class="back-btn" @click="activeBlock = null">← Back to Blocks</button>
                        <h3>Block {{ activeBlock }}</h3>
                    </div>

                    <div class="group-grid">
                        <button v-for="lvl in levelNames" :key="lvl" class="group-card" @click="selectLevel(lvl)">
                            <div class="group-title">{{ lvl }}</div>
                            <div class="group-meta"><span>{{ levelCounts[lvl] ?? 0 }} points</span></div>

                        </button>
                    </div>
                </div>

                <!-- Step 3: Devices -->
                <div v-else-if="activeBlock && activeLevel && !activeDeviceKey">
                    <div class="group-detail-header">
                        <button class="back-btn" @click="activeLevel = null">← Back to Levels</button>
                        <h3>Block {{ activeBlock }} / {{ activeLevel }}</h3>
                    </div>

                    <div class="group-grid">
                        <button v-for="dev in devicesAtLevel" :key="dev.key" class="group-card"
                            @click="selectDevice(dev.key)">
                            <div class="group-title">{{ dev.name }}</div>
                            <div class="group-meta">
                                <span>{{ dev.type }}</span>
                                <span>id: {{ dev.device_id }}</span>
                                <span>{{ deviceTypeCounts(dev).total }} points</span>
                            </div>
                            <div class="group-meta" style="margin-top:6px">
                                <small class="muted">topic: bms/data/{{ dev.key }}</small>
                            </div>
                        </button>
                    </div>
                </div>

                <!-- Step 4: Tables for selected device -->
                <div v-else>
                    <div class="group-detail-header" style="align-items:baseline">
                        <button class="back-btn" @click="activeDeviceKey = null">← Back to Devices</button>
                        <div>
                            <h3 style="margin:0">Block {{ activeBlock }} / {{ activeLevel }}</h3>
                            <small class="muted">Device topic: <code>bms/data/{{ activeDeviceKey }}</code></small>
                        </div>
                    </div>

                    <!-- AI / AO / AV -->
                    <div v-if="rowsAI.length" class="table-card">
                        <h4 style="margin:0 0 8px">Analog Input</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Device Name</th>
                                    <th>Type</th>
                                    <th>Value</th>
                                    <th>Units</th>
                                    <th>Status</th>
                                    <th>Faults</th>
                                    <th>Last Updated</th>
                                    <th>Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in rowsAI" :key="r._key">
                                    <td>{{ show(r.deviceName) }}</td>
                                    <td>{{ show(r.type) }}</td>
                                    <td>{{ valueShow(r.value) }}</td>
                                    <td>{{ show(r.units) }}</td>
                                    <td>{{ r.status }}</td>
                                    <td>{{ r.faults }}</td>
                                    <td>{{ r.updated || '-' }}</td>
                                    <td>
                                        <router-link :to="trendLinkTopic(activeDeviceKey, r._type, r._id)">View
                                            Trend</router-link>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div v-if="rowsAO.length" class="table-card">
                        <h4 style="margin:0 0 8px">Analog Output</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Device Name</th>
                                    <th>Type</th>
                                    <th>Value</th>
                                    <th>Units</th>
                                    <th>Status</th>
                                    <th>Faults</th>
                                    <th>Last Updated</th>
                                    <th>Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in rowsAO" :key="r._key">
                                    <td>{{ show(r.deviceName) }}</td>
                                    <td>{{ show(r.type) }}</td>
                                    <td>{{ valueShow(r.value) }}</td>
                                    <td>{{ show(r.units) }}</td>
                                    <td>{{ r.status }}</td>
                                    <td>{{ r.faults }}</td>
                                    <td>{{ r.updated || '-' }}</td>
                                    <td>
                                        <router-link :to="trendLinkTopic(activeDeviceKey, r._type, r._id)">View
                                            Trend</router-link>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div v-if="rowsAV.length" class="table-card">
                        <h4 style="margin:0 0 8px">Analog Value</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Device Name</th>
                                    <th>Type</th>
                                    <th>Value</th>
                                    <th>Units</th>
                                    <th>Status</th>
                                    <th>Faults</th>
                                    <th>Last Updated</th>
                                    <th>Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in rowsAV" :key="r._key">
                                    <td>{{ show(r.deviceName) }}</td>
                                    <td>{{ show(r.type) }}</td>
                                    <td>{{ valueShow(r.value) }}</td>
                                    <td>{{ show(r.units) }}</td>
                                    <td>{{ r.status }}</td>
                                    <td>{{ r.faults }}</td>
                                    <td>{{ r.updated || '-' }}</td>
                                    <td>
                                        <router-link :to="trendLinkTopic(activeDeviceKey, r._type, r._id)">View
                                            Trend</router-link>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- BI / BO -->
                    <div v-if="rowsBI.length" class="table-card">
                        <h4 style="margin:0 0 8px">Binary Input</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Device Name</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Active</th>
                                    <th>Faults</th>
                                    <th>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in rowsBI" :key="r._key">
                                    <td>{{ show(r.deviceName) }}</td>
                                    <td>{{ show(r.type) }}</td>
                                    <td>{{ r.status }}</td>
                                    <td>{{ r.active }}</td>
                                    <td>{{ r.faults }}</td>
                                    <td>{{ r.updated || '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div v-if="rowsBO.length" class="table-card">
                        <h4 style="margin:0 0 8px">Binary Output</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Device Name</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Active</th>
                                    <th>Faults</th>
                                    <th>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in rowsBO" :key="r._key">
                                    <td>{{ show(r.deviceName) }}</td>
                                    <td>{{ show(r.type) }}</td>
                                    <td>{{ r.status }}</td>
                                    <td>{{ r.active }}</td>
                                    <td>{{ r.faults }}</td>
                                    <td>{{ r.updated || '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- MSI / MSO / MSV -->
                    <div v-if="rowsMSI.length" class="table-card">
                        <h4 style="margin:0 0 8px">Multi-state Input</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Device Name</th>
                                    <th>Type</th>
                                    <th>Value</th>
                                    <th>Status</th>
                                    <th>Faults</th>
                                    <th>Present State</th>
                                    <th>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in rowsMSI" :key="r._key">
                                    <td>{{ show(r.deviceName) }}</td>
                                    <td>{{ show(r.type) }}</td>
                                    <td>{{ valueShow(r.value) }}</td>
                                    <td>{{ r.status }}</td>
                                    <td>{{ r.faults }}</td>
                                    <td>{{ r.presentState }}</td>
                                    <td>{{ r.updated || '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div v-if="rowsMSO.length" class="table-card">
                        <h4 style="margin:0 0 8px">Multi-state Output</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Device Name</th>
                                    <th>Type</th>
                                    <th>Value</th>
                                    <th>Status</th>
                                    <th>Faults</th>
                                    <th>Present State</th>
                                    <th>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in rowsMSO" :key="r._key">
                                    <td>{{ show(r.deviceName) }}</td>
                                    <td>{{ show(r.type) }}</td>
                                    <td>{{ valueShow(r.value) }}</td>
                                    <td>{{ r.status }}</td>
                                    <td>{{ r.faults }}</td>
                                    <td>{{ r.presentState }}</td>
                                    <td>{{ r.updated || '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div v-if="rowsMSV.length" class="table-card">
                        <h4 style="margin:0 0 8px">Multi-state Value</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Device Name</th>
                                    <th>Type</th>
                                    <th>Value</th>
                                    <th>Status</th>
                                    <th>Faults</th>
                                    <th>Present State</th>
                                    <th>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in rowsMSV" :key="r._key">
                                    <td>{{ show(r.deviceName) }}</td>
                                    <td>{{ show(r.type) }}</td>
                                    <td>{{ valueShow(r.value) }}</td>
                                    <td>{{ r.status }}</td>
                                    <td>{{ r.faults }}</td>
                                    <td>{{ r.presentState }}</td>
                                    <td>{{ r.updated || '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- empty state -->
                    <div v-if="!rowsAI.length && !rowsAO.length && !rowsAV.length &&
                        !rowsBI.length && !rowsBO.length &&
                        !rowsMSI.length && !rowsMSO.length && !rowsMSV.length" class="table-card">
                        <em>No points published yet for this device.</em>
                    </div>
                </div>
            </div>

            <!-- Download tab -->
            <div v-if="currentTab === 'download'" class="tab-content download-tab">
                <h2 class="section-heading">Download Current Sensor Data (CSV)</h2>
                <button class="download-button" @click="downloadCSV">
                    <i class="fas fa-download"></i><span>Download CSV</span>
                </button>
                <p class="note">
                    The CSV contains one section per non-empty table (AI/AO/AV, BI/BO, MSI/MSO/MSV).
                </p>
            </div>
        </div>

        <!-- nested route (Trend) -->
        <router-view v-else />
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onActivated, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useMqtt } from '../composables/useMqtt'

function countPointsForDeviceKey(key) {
    const node = live?.bms?.data?.[key] || {}
    let total = 0
    for (const t of Object.keys(node)) {
        if (!allowedTypes.has(t)) continue
        total += Object.keys(node[t] || {}).length
    }
    return total
}


// ---------- routing guard to hide page when viewing /trend ----------
const route = useRoute()
const isTrendRoute = computed(() => route.name === 'trend-point')

// ---------- MQTT ----------
const { ensureConnected, mqttConnected, live, getTrendSeries } = useMqtt()
onMounted(() => ensureConnected())
onActivated(() => ensureConnected())

// ---------- Blocks -> Levels -> Devices (from /itecc_building.json) ----------
/**
 * Expected JSON shape:
 * {
 *   "A": {
 *     "ROOF": { "name":"NAE-A-RF-24","base_name":"NAE-A-RF-24","type":"NAE","block":"A","level":"ROOF","device_id":624 },
 *     "L1"  : { ... }
 *   },
 *   "B": { ... }
 * }
 */
const catalog = reactive({}) // { A: { ROOF: [ {name,base_name,device_id,type, key}, ... ], ... }, ... }
const dataLoaded = ref(false)

// Human-readable timestamp (accepts ISO string or seconds)
function formatTs(ts) {
    if (!ts) return '-'
    // handle numeric seconds (e.g. 1756096640.1455)
    if (typeof ts === 'number') {
        const d = new Date(ts * 1000)
        return isNaN(d) ? '-' : d.toLocaleString([], {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        })
    }
    // handle ISO string (e.g. "2025-08-25T14:03:07.441953+08:00")
    const d = new Date(ts)
    if (isNaN(d)) return '-'
    return d.toLocaleString([], {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    })
}


async function loadCatalog() {
    try {
        const res = await fetch('/itecc_building.json', { cache: 'no-store' })
        if (!res.ok) throw new Error('unable to fetch /itecc_building.json')
        const json = await res.json()

        // normalize → array at each level
        for (const blk of Object.keys(json || {})) {
            catalog[blk] = catalog[blk] || {}
            for (const lvl of Object.keys(json[blk] || {})) {
                const d = json[blk][lvl]
                // if a single device object, make array; if already array, keep it
                const arr = Array.isArray(d) ? d : [d]
                catalog[blk][lvl] = arr
                    .filter(Boolean)
                    .map(x => ({
                        ...x,
                        key: `${x.name}` // topic suffix under bms/data/
                    }))
            }
        }
        dataLoaded.value = true
    } catch (e) {
        console.error('Catalog load failed:', e)
        dataLoaded.value = true
    }
}
onMounted(loadCatalog)

// ---------- navigation state ----------
const currentTab = ref('overview')
const activeBlock = ref(null)      // 'A'
const activeLevel = ref(null)      // 'ROOF'
const activeDeviceKey = ref(null)  // 'NAE-A-RF-24_624'

const blockNames = computed(() => Object.keys(catalog).sort())
const levelNames = computed(() =>
    activeBlock.value ? Object.keys(catalog[activeBlock.value] || {}).sort() : []
)
const devicesAtLevel = computed(() => {
    if (!activeBlock.value || !activeLevel.value) return []
    return catalog?.[activeBlock.value]?.[activeLevel.value] || []
})

const blockCounts = computed(() => {
    const out = {}
    for (const b of Object.keys(catalog)) {
        let sum = 0
        for (const l of Object.keys(catalog[b] || {})) {
            const devices = catalog[b][l] || []
            for (const dev of devices) sum += countPointsForDeviceKey(dev.key)
        }
        out[b] = sum
    }
    return out
})

const levelCounts = computed(() => {
    const out = {}
    const b = activeBlock.value; if (!b) return out
    for (const l of Object.keys(catalog[b] || {})) {
        const devices = catalog[b][l] || []
        let sum = 0
        for (const dev of devices) sum += countPointsForDeviceKey(dev.key)
        out[l] = sum
    }
    return out
})


function selectBlock(b) { activeBlock.value = b; activeLevel.value = null; activeDeviceKey.value = null }
function selectLevel(l) { activeLevel.value = l; activeDeviceKey.value = null }
function selectDevice(key) { activeDeviceKey.value = key }

// ---------- table data ----------
const rowsAI = ref([])
const rowsAO = ref([])
const rowsAV = ref([])
const rowsBI = ref([])
const rowsBO = ref([])
const rowsMSI = ref([])
const rowsMSO = ref([])
const rowsMSV = ref([])

// Active device node from MQTT cache
const deviceNode = computed(() => {
    const key = activeDeviceKey.value
    return key ? (live?.bms?.data?.[key] || {}) : {}
})
const allowedTypes = new Set([
    'analogInput', 'analogOutput', 'analogValue',
    'binaryInput', 'binaryOutput',
    'multiStateInput', 'multiStateOutput', 'multiStateValue'
])
const presentTypes = computed(() =>
    Object.keys(deviceNode.value).filter(t => allowedTypes.has(t))
)
function getTypeMapForDevice(type) {
    const node = deviceNode.value?.[type]
    return (node && typeof node === 'object') ? node : {}
}
function deviceTypeCounts(dev) {
    const node = live?.bms?.data?.[dev.key] || {}
    let total = 0
    for (const t of Object.keys(node)) {
        if (!allowedTypes.has(t)) continue
        total += Object.keys(node[t] || {}).length
    }
    return { total }
}

// Build the rows whenever selection or live data changes
function rebuildRows() {
    rowsAI.value = []; rowsAO.value = []; rowsAV.value = []
    rowsBI.value = []; rowsBO.value = []
    rowsMSI.value = []; rowsMSO.value = []; rowsMSV.value = []

    const key = activeDeviceKey.value; if (!key) return
    const types = presentTypes.value

    // AI/AO/AV
    for (const t of ['analogInput', 'analogOutput', 'analogValue']) {
        if (!types.includes(t)) continue
        const m = getTypeMapForDevice(t)
        for (const id of Object.keys(m)) {
            const p = m[id] || {}
            const row = {
                _key: `${key}|${t}|${id}`,
                _id: id,
                _type: t,
                deviceName: p.objectName || '-',
                type: t,
                value: p.presentValue ?? '-',
                units: p.units || '-',
                status: (p.statusFlags ? String(p.statusFlags) : 'Ok'),
                faults: (p.reliability === 'no-fault-detected' ? 'No Fault' : (p.reliability || '-')),
                updated: formatTs(p._ts_sgt || p._ts || p.ts_utc || p.ts)
            }
            if (t === 'analogInput') rowsAI.value.push(row)
            else if (t === 'analogOutput') rowsAO.value.push(row)
            else rowsAV.value.push(row)
        }
    }

    // BI/BO
    for (const t of ['binaryInput', 'binaryOutput']) {
        if (!types.includes(t)) continue
        const m = getTypeMapForDevice(t)
        for (const id of Object.keys(m)) {
            const p = m[id] || {}
            const active = String(p.presentValue).toLowerCase() === 'active' ? 'Yes' : 'No'
            const row = {
                _key: `${key}|${t}|${id}`,
                deviceName: p.objectName || '-',
                type: t,
                status: (p.statusFlags ? String(p.statusFlags) : 'Ok'),
                active,
                faults: (p.reliability === 'no-fault-detected' ? 'No Fault' : (p.reliability || '-')),
                updated: formatTs(p._ts_sgt || p._ts || p.ts_utc || p.ts)
            }
            if (t === 'binaryInput') rowsBI.value.push(row)
            else rowsBO.value.push(row)
        }
    }

    // MSI/MSO/MSV
    for (const t of ['multiStateInput', 'multiStateOutput', 'multiStateValue']) {
        if (!types.includes(t)) continue
        const m = getTypeMapForDevice(t)
        for (const id of Object.keys(m)) {
            const p = m[id] || {}
            const row = {
                _key: `${key}|${t}|${id}`,
                deviceName: p.objectName || '-',
                type: t,
                value: p.presentValue ?? '-',
                status: (p.statusFlags ? String(p.statusFlags) : 'Ok'),
                faults: (p.reliability === 'no-fault-detected' ? 'No Fault' : (p.reliability || '-')),
                presentState: p.presentStateText || '-',
                updated: formatTs(p._ts_sgt || p._ts || p.ts_utc || p.ts)
            }
            if (t === 'multiStateInput') rowsMSI.value.push(row)
            else if (t === 'multiStateOutput') rowsMSO.value.push(row)
            else rowsMSV.value.push(row)
        }
    }
}
watchEffect(rebuildRows)

// ---------- trend links ----------
function trendLinkTopic(deviceKey, type, id) {
    const pointKey = `${type}/${id}`
    return { name: 'trend-point', query: { controller: deviceKey, point: pointKey, type } }
}

// ---------- utils ----------
const show = v => (v === '' || v === null || v === undefined) ? '-' : String(v)
const valueShow = v => (v === '' || v === null || v === undefined) ? '-' : v

// ---------- CSV download ----------
function downloadCSV() {
    const sections = []

    const pushTable = (title, header, rows, pick) => {
        if (!rows.length) return
        sections.push(title)
        sections.push(header.join(','))
        rows.forEach(r => {
            const vals = pick(r).map(s => `"${String(show(s)).replace(/"/g, '""')}"`)
            sections.push(vals.join(','))
        })
        sections.push('')
    }

    pushTable('Analog Input',
        ['Device Name', 'Type', 'Value', 'Units', 'Status', 'Faults', 'Last Updated'],
        rowsAI.value, r => [r.deviceName, r.type, r.value, r.units, r.status, r.faults, r.updated])

    pushTable('Analog Output',
        ['Device Name', 'Type', 'Value', 'Units', 'Status', 'Faults', 'Last Updated'],
        rowsAO.value, r => [r.deviceName, r.type, r.value, r.units, r.status, r.faults, r.updated])

    pushTable('Analog Value',
        ['Device Name', 'Type', 'Value', 'Units', 'Status', 'Faults', 'Last Updated'],
        rowsAV.value, r => [r.deviceName, r.type, r.value, r.units, r.status, r.faults, r.updated])

    pushTable('Binary Input',
        ['Device Name', 'Type', 'Status', 'Active', 'Faults', 'Last Updated'],
        rowsBI.value, r => [r.deviceName, r.type, r.status, r.active, r.faults, r.updated])

    pushTable('Binary Output',
        ['Device Name', 'Type', 'Status', 'Active', 'Faults', 'Last Updated'],
        rowsBO.value, r => [r.deviceName, r.type, r.status, r.active, r.faults, r.updated])

    pushTable('Multi-state Input',
        ['Device Name', 'Type', 'Value', 'Status', 'Faults', 'Present State', 'Last Updated'],
        rowsMSI.value, r => [r.deviceName, r.type, r.value, r.status, r.faults, r.presentState, r.updated])

    pushTable('Multi-state Output',
        ['Device Name', 'Type', 'Value', 'Status', 'Faults', 'Present State', 'Last Updated'],
        rowsMSO.value, r => [r.deviceName, r.type, r.value, r.status, r.faults, r.presentState, r.updated])

    pushTable('Multi-state Value',
        ['Device Name', 'Type', 'Value', 'Status', 'Faults', 'Present State', 'Last Updated'],
        rowsMSV.value, r => [r.deviceName, r.type, r.value, r.status, r.faults, r.presentState, r.updated])

    if (!sections.length) sections.push('No data')

    const blob = new Blob([sections.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `bms_${activeDeviceKey.value || 'device'}_snapshot.csv`)
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
}
</script>

<style scoped>
/* container & typography */
.building-management-container {
    padding: 20px;
    font-family: Arial, sans-serif;
    background: #0a1f44;
    min-height: 100vh;
    color: #fff
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px
}

.page-title {
    font-size: 24px;
    margin: 0;
    color: #fff
}

.breadcrumb span {
    font-size: 14px;
    color: #fff;
    margin: 0 4px
}

/* tabs */
.tab-nav {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    align-items: center
}

.tab-nav button {
    padding: 8px 16px;
    border: none;
    background: rgba(255, 255, 255, .1);
    color: #fff;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition: background .2s
}

.tab-nav button:hover {
    background: rgba(255, 255, 255, .2)
}

.tab-nav button.active {
    background: #1976d2;
    color: #fff
}

/* groups view */
.groups-wrap {
    width: 100%
}

.group-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px
}

.group-card {
    appearance: none;
    border: 1px solid rgba(255, 255, 255, .18);
    background: linear-gradient(180deg, #1d3670, #172c5d);
    color: #fff;
    border-radius: 12px;
    padding: 14px 16px;
    text-align: left;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0, 0, 0, .25);
    transition: transform .12s, box-shadow .12s, background .12s, border-color .12s
}

.group-card:hover {
    transform: translateY(-2px);
    background: linear-gradient(180deg, #244083, #19326a);
    box-shadow: 0 8px 18px rgba(0, 0, 0, .35)
}

.group-title {
    font-weight: 800;
    font-size: 1rem;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px
}

.group-meta {
    font-size: .85rem;
    opacity: .92;
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap
}

.group-meta span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, .08);
    border: 1px solid rgba(255, 255, 255, .12)
}

.group-detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 8px 0 14px
}

.back-btn {
    appearance: none;
    border: 1px solid rgba(255, 255, 255, .25);
    background: transparent;
    color: #fff;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer
}

.back-btn:hover {
    background: rgba(255, 255, 255, .08);
    border-color: rgba(255, 255, 255, .4)
}

.muted {
    color: #cbd5e0;
    opacity: .9
}

/* tables */
.table-card {
    background: #112d5c;
    border: 1px solid rgba(255, 255, 255, .2);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 14px
}

table {
    width: 100%;
    border-collapse: collapse;
    color: #fff
}

th,
td {
    border: 1px solid rgba(255, 255, 255, .2);
    padding: 8px;
    text-align: left
}

/* download */
.download-tab {
    display: flex;
    flex-direction: column;
    align-items: flex-start
}

.download-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 12px
}

.download-button:hover {
    background: #125ea3
}

.note {
    font-size: 14px;
    color: #cbd5e0
}

@media (max-width:768px) {
    .building-management-container {
        padding: 10px
    }

    .tab-nav {
        flex-direction: column;
        gap: 12px
    }
}
</style>
