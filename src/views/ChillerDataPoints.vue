<!-- src/views/HQ.vue -->
<template>
    <div class="hq-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Chiller Plant Data Points</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt; <span>Management</span> &gt; <span>Chiller Plant Data Points</span>
            </nav>
        </div>

        <!-- Status bar -->
        <div class="topbar">
            <span class="status" :class="mqttConnected ? 'ok' : 'bad'">
                <i class="fas" :class="mqttConnected ? 'fa-circle-check' : 'fa-circle-xmark'"></i>
                {{ mqttConnected ? 'MQTT Connected' : 'MQTT Disconnected' }}
            </span>
            <span v-if="dataLoaded" class="status neutral">
                <i class="fas fa-database"></i>
                {{ hqFound ? 'HQ catalog loaded' : 'HQ not found in itecc_building.json' }}
            </span>
            <span v-if="autoSelectedInfo" class="status hint">
                <i class="fas fa-bolt"></i>
                {{ autoSelectedInfo }}
            </span>
        </div>
        <!-- No HQ -->
        <div v-if="dataLoaded && !hqFound" class="empty big">
            <div><i class="fas fa-circle-info"></i> Couldn’t find “HQ” in <code>/itecc_building.json</code>.</div>
        </div>

        <!-- Devices view (auto-selected) -->
        <div v-if="hqFound && activeLevel && activeDeviceKey" class="tables-wrap">
            <div class="level-header" style="align-items: baseline">
                <div class="left">
                    <h3 style="margin:0">Chiller Plant Data Points</h3>
                    <small class="muted">Device topic: <code>bms/data/{{ activeDeviceKey }}</code></small>
                </div>
                <!-- per your request: removed the Change Device / Change Level buttons -->
            </div>

            <!-- One section per GROUP (Ch1..Ch5, Chemical, WS, HDR, AC, Others) -->
            <div v-for="g in orderedGroupKeys" :key="g" class="group-section">
                <!-- Top-level TOTALS (cards under the title) -->
                <section v-if="totalsTop.length" class="totals-top">
                    <h3 class="section-title">Totals</h3>
                    <div class="totals-grid top">
                        <div class="total-card" v-for="t in totalsTop" :key="t._key">
                            <!-- Title -->
                            <div class="total-title">
                                <span class="chip-small">{{ typeShort(t.type) }}</span>
                                <span class="name">{{ t.deviceName }}</span>
                            </div>

                            <!-- 1st row: Value -->
                            <div class="total-val">{{ show2(t.value) }}</div>

                            <!-- 2nd row: Units -->
                            <div class="total-units">{{ t.units || '-' }}</div>

                            <!-- 3rd row: Last Updated -->
                            <div class="total-sub">Last Updated: {{ t.updated || '-' }}</div>
                        </div>

                    </div>
                </section>
                <h3 class="group-title">Group — {{ g }}</h3>

                <!-- AI -->
                <div v-if="groupedTables[g].AI.rows.length" class="table-card">
                    <h4 class="table-title">Analog Input</h4>
                    <table class="tbl">
                        <thead>
                            <tr>
                                <th>Device Name</th>
                                <th>Type</th>
                                <th>Value</th>
                                <th>Units</th>
                                <th>Status</th>
                                <th>Faults</th>
                                <th>Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="r in groupedTables[g].AI.rows" :key="r._key">
                                <td>{{ r.deviceName }}</td>
                                <td>{{ r.type }}</td>
                                <td>{{ show2(r.value) }}</td>
                                <td>{{ r.units }}</td>
                                <td>{{ r.status }}</td>
                                <td>{{ r.faults }}</td>
                                <td>{{ r.updated || '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div v-if="!groupedTables[g].AO.rows.length && !groupedTables[g].AV.rows.length &&
                        !groupedTables[g].BI.rows.length && !groupedTables[g].BO.rows.length &&
                        !groupedTables[g].MSI.rows.length && !groupedTables[g].MSO.rows.length &&
                        !groupedTables[g].MSV.rows.length && !groupHasAny(groupedTables[g])" class="table-card">
                        <em>No points in this group.</em>
                    </div>
                </div>

                <!-- AO -->
                <div v-if="groupedTables[g].AO.rows.length" class="table-card">
                    <h4 class="table-title">Analog Output</h4>
                    <table class="tbl">
                        <thead>
                            <tr>
                                <th>Device Name</th>
                                <th>Type</th>
                                <th>Value</th>
                                <th>Units</th>
                                <th>Status</th>
                                <th>Faults</th>
                                <th>Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="r in groupedTables[g].AO.rows" :key="r._key">
                                <td>{{ r.deviceName }}</td>
                                <td>{{ r.type }}</td>
                                <td>{{ show2(r.value) }}</td>
                                <td>{{ r.units }}</td>
                                <td>{{ r.status }}</td>
                                <td>{{ r.faults }}</td>
                                <td>{{ r.updated || '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- AV -->
                <div v-if="groupedTables[g].AV.rows.length" class="table-card">
                    <h4 class="table-title">Analog Value</h4>
                    <table class="tbl">
                        <thead>
                            <tr>
                                <th>Device Name</th>
                                <th>Type</th>
                                <th>Value</th>
                                <th>Units</th>
                                <th>Status</th>
                                <th>Faults</th>
                                <th>Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="r in groupedTables[g].AV.rows" :key="r._key">
                                <td>{{ r.deviceName }}</td>
                                <td>{{ r.type }}</td>
                                <td>{{ show2(r.value) }}</td>
                                <td>{{ r.units }}</td>
                                <td>{{ r.status }}</td>
                                <td>{{ r.faults }}</td>
                                <td>{{ r.updated || '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- BI -->
                <div v-if="groupedTables[g].BI.rows.length" class="table-card">
                    <h4 class="table-title">Binary Input</h4>
                    <table class="tbl">
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
                            <tr v-for="r in groupedTables[g].BI.rows" :key="r._key">
                                <td>{{ r.deviceName }}</td>
                                <td>{{ r.type }}</td>
                                <td>{{ r.status }}</td>
                                <td>{{ r.active }}</td>
                                <td>{{ r.faults }}</td>
                                <td>{{ r.updated || '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- BO -->
                <div v-if="groupedTables[g].BO.rows.length" class="table-card">
                    <h4 class="table-title">Binary Output</h4>
                    <table class="tbl">
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
                            <tr v-for="r in groupedTables[g].BO.rows" :key="r._key">
                                <td>{{ r.deviceName }}</td>
                                <td>{{ r.type }}</td>
                                <td>{{ r.status }}</td>
                                <td>{{ r.active }}</td>
                                <td>{{ r.faults }}</td>
                                <td>{{ r.updated || '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- MSI -->
                <div v-if="groupedTables[g].MSI.rows.length" class="table-card">
                    <h4 class="table-title">Multi-state Input</h4>
                    <table class="tbl">
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
                            <tr v-for="r in groupedTables[g].MSI.rows" :key="r._key">
                                <td>{{ r.deviceName }}</td>
                                <td>{{ r.type }}</td>
                                <td>{{ show2(r.value) }}</td>
                                <td>{{ r.status }}</td>
                                <td>{{ r.faults }}</td>
                                <td>{{ r.presentState }}</td>
                                <td>{{ r.updated || '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- MSO -->
                <div v-if="groupedTables[g].MSO.rows.length" class="table-card">
                    <h4 class="table-title">Multi-state Output</h4>
                    <table class="tbl">
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
                            <tr v-for="r in groupedTables[g].MSO.rows" :key="r._key">
                                <td>{{ r.deviceName }}</td>
                                <td>{{ r.type }}</td>
                                <td>{{ show2(r.value) }}</td>
                                <td>{{ r.status }}</td>
                                <td>{{ r.faults }}</td>
                                <td>{{ r.presentState }}</td>
                                <td>{{ r.updated || '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- MSV -->
                <div v-if="groupedTables[g].MSV.rows.length" class="table-card">
                    <h4 class="table-title">Multi-state Value</h4>
                    <table class="tbl">
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
                            <tr v-for="r in groupedTables[g].MSV.rows" :key="r._key">
                                <td>{{ r.deviceName }}</td>
                                <td>{{ r.type }}</td>
                                <td>{{ show2(r.value) }}</td>
                                <td>{{ r.status }}</td>
                                <td>{{ r.faults }}</td>
                                <td>{{ r.presentState }}</td>
                                <td>{{ r.updated || '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- If a group ends up empty -->
                <div v-if="!groupHasAny(groupedTables[g])" class="table-card">
                    <em>No points in this group.</em>
                </div>
            </div>
        </div>

        <!-- Fallback UIs (only visible if auto-select didn’t run) -->
        <div v-if="hqFound && !activeLevel" class="levels-grid">
            <button v-for="lvl in levelNames" :key="lvl" class="level-card" @click="selectLevel(lvl)">
                <div class="level-title">{{ lvl }}</div>
                <div class="level-meta"><span>{{ (devicesByLevel[lvl] || []).length }} device(s)</span></div>
            </button>
        </div>

        <div v-if="hqFound && activeLevel && !activeDeviceKey">
            <div class="level-header">
                <button class="back-btn" @click="activeLevel = null">← Back to HQ Levels</button>
                <h3>HQ / {{ activeLevel }}</h3>
            </div>

            <div class="devices-grid">
                <button v-for="dev in devicesAtLevel" :key="dev.key" class="device-card" @click="selectDevice(dev.key)">
                    <div class="device-title">{{ dev.name }}</div>
                    <div class="topic">topic: <code>bms/data/{{ dev.key }}</code></div>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watchEffect } from 'vue'
import { useMqtt } from '../composables/useMqtt'

/* MQTT */
const { ensureConnected, mqttConnected, live } = useMqtt()
ensureConnected()

/* ===== Preferences for auto-select ===== */
const PREFERRED_LEVELS = ['L1', 'LEVEL 1', 'L01']
const PREFERRED_DEVICE_NAMES = ['Chiller_ITE_1210_1210']
const PREFERRED_DEVICE_CONTAINS = ['chiller_ite_1210_1210', 'chiller', '1210']

/* ===== Load HQ from /itecc_building.json ===== */
const dataLoaded = ref(false)
const hqFound = ref(false)
const autoSelectedInfo = ref('')

/** devicesByLevel: { "ROOF": [ { name, base_name, device_id, type, key }, ... ], ... } */
const devicesByLevel = reactive({})

async function loadHqCatalog() {
    try {
        const res = await fetch('/itecc_building.json', { cache: 'no-store' })
        if (!res.ok) throw new Error('Unable to fetch /itecc_building.json')
        const json = await res.json()

        const normalized = findHqLevels(json)
        for (const lvl of Object.keys(devicesByLevel)) delete devicesByLevel[lvl]
        for (const [lvl, arr] of Object.entries(normalized)) devicesByLevel[lvl] = arr

        hqFound.value = Object.keys(devicesByLevel).length > 0
        if (hqFound.value) autoSelectDefault()
    } catch (e) {
        console.error('[HQ] Catalog load failed:', e)
        hqFound.value = false
    } finally {
        dataLoaded.value = true
    }
}
onMounted(loadHqCatalog)

/* Find "HQ" levels/devices in JSON */
function findHqLevels(json) {
    const out = {}
    if (!json || typeof json !== 'object') return out

    const hqKey = Object.keys(json).find(k => k.toLowerCase() === 'hq')
    if (hqKey) {
        const levelsObj = json[hqKey] || {}
        for (const lvl of Object.keys(levelsObj)) {
            const d = levelsObj[lvl]
            const arr = Array.isArray(d) ? d : [d]
            out[lvl] = arr.filter(Boolean).map(x => ({ ...x, key: `${x.name}` }))
        }
        return out
    }

    for (const blk of Object.keys(json)) {
        const levels = json[blk]
        if (!levels || typeof levels !== 'object') continue
        for (const lvl of Object.keys(levels)) {
            const raw = levels[lvl]
            const arr = Array.isArray(raw) ? raw : [raw]
            for (const dev of arr) {
                if (!dev) continue
                const blockMatch = String(dev.block || '').toLowerCase() === 'hq'
                const nameMatch = /hq/i.test(String(dev.name || '')) || /hq/i.test(String(dev.base_name || ''))
                if (blockMatch || nameMatch) {
                    if (!out[lvl]) out[lvl] = []
                    out[lvl].push({ ...dev, key: `${dev.name}` })
                }
            }
        }
    }
    return out
}

/* ===== Auto-select logic ===== */
const activeLevel = ref(null)
const activeDeviceKey = ref(null)

const levelNames = computed(() => Object.keys(devicesByLevel).sort())
const devicesAtLevel = computed(() => devicesByLevel[activeLevel.value] || [])

function normalizeLevel(s) {
    return String(s || '').replace(/\s+/g, '').replace(/-/g, '').toUpperCase()
}
function matchesPreferredLevel(lvl) {
    const L = normalizeLevel(lvl)
    return PREFERRED_LEVELS.some(p => normalizeLevel(p) === L)
}

function autoSelectDefault() {
    const levels = levelNames.value
    if (!levels.length) return
    const pickLevel = levels.find(matchesPreferredLevel) || levels[0]
    activeLevel.value = pickLevel

    const devs = devicesByLevel[pickLevel] || []
    if (!devs.length) { activeDeviceKey.value = null; return }

    const exactLower = PREFERRED_DEVICE_NAMES.map(s => s.toLowerCase())
    const byExact = devs.find(d => exactLower.includes(String(d.name || '').toLowerCase()))
    if (byExact) {
        activeDeviceKey.value = byExact.key
        autoSelectedInfo.value = `Auto-selected: ${pickLevel} / ${byExact.name}`
        return
    }
    const byContains = devs.find(d => {
        const name = String(d.name || '').toLowerCase()
        return PREFERRED_DEVICE_CONTAINS.every(term => name.includes(term.toLowerCase()))
    })
    if (byContains) {
        activeDeviceKey.value = byContains.key
        autoSelectedInfo.value = `Auto-selected (fuzzy): ${pickLevel} / ${byContains.name}`
        return
    }
    activeDeviceKey.value = devs[0].key
    autoSelectedInfo.value = `Auto-selected (fallback): ${pickLevel} / ${devs[0].name}`
}

function selectLevel(lvl) { activeLevel.value = lvl; activeDeviceKey.value = null }
function selectDevice(key) { activeDeviceKey.value = key }

/* ===== Device tables from live.bms.data ===== */
const rowsAI = ref([]), rowsAO = ref([]), rowsAV = ref([])
const rowsBI = ref([]), rowsBO = ref([])
const rowsMSI = ref([]), rowsMSO = ref([]), rowsMSV = ref([])

const deviceNode = computed(() => {
    const key = activeDeviceKey.value
    return key ? (live?.bms?.data?.[key] || {}) : {}
})
const presentTypes = computed(() => Object.keys(deviceNode.value || {}))

function getTypeMapForDevice(type) {
    const node = deviceNode.value?.[type]
    return (node && typeof node === 'object') ? node : {}
}

function formatTs(ts) {
    if (!ts) return '-'
    if (typeof ts === 'number') {
        const d = new Date(ts * 1000)
        return isNaN(d) ? '-' : d.toLocaleString([], {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        })
    }
    const d = new Date(ts)
    return isNaN(d) ? '-' : d.toLocaleString([], {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    })
}

/* === Grouping helpers (no ID usage; objectName-driven) === */
function groupFromObjectName(objectName = '') {
    const s = String(objectName || '')
    if (s.startsWith('Chemical')) return 'Chemical'
    if (s.startsWith('WS')) return 'WS'
    if (s.startsWith('HDR')) return 'HDR'
    if (s.startsWith('AC') || s.includes('AC_')) return 'AC'
    const head = s.split('_')[0] || s
    const m = head.match(/[1-5]/)
    if (m) return `Ch${m[0]}`
    return 'Others'
}
const GROUP_ORDER = ['Ch1', 'Ch2', 'Ch3', 'Ch4', 'Ch5', 'Chemical', 'WS', 'HDR', 'AC', 'Others']
const isTotalName = (name) => /total/i.test(String(name || ''))
const typeShort = (t) => ({
    analogInput: 'AI', analogOutput: 'AO', analogValue: 'AV',
    binaryInput: 'BI', binaryOutput: 'BO',
    multiStateInput: 'MSI', multiStateOutput: 'MSO', multiStateValue: 'MSV'
}[t] || t)

/* Numeric formatting to 2dp where applicable */
const show2 = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n.toFixed(2) : (v === '' || v == null ? '-' : String(v))
}

/* Build base rows from live cache */
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
                _key: `${key}|${t}|${id}`, _id: id, _type: t,
                _group: groupFromObjectName(p.objectName),
                deviceName: p.objectName || '-', type: t,
                value: p.presentValue ?? '-', units: p.units || '-',
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
                _group: groupFromObjectName(p.objectName),
                deviceName: p.objectName || '-', type: t,
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
                _group: groupFromObjectName(p.objectName),
                deviceName: p.objectName || '-', type: t,
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

/* Build grouped tables with TOTAL separation */
const groupedTables = computed(() => {
    const map = Object.create(null)
    const ensure = g => (map[g] ||= {
        AI: { totals: [], rows: [] }, AO: { totals: [], rows: [] }, AV: { totals: [], rows: [] },
        BI: { totals: [], rows: [] }, BO: { totals: [], rows: [] },
        MSI: { totals: [], rows: [] }, MSO: { totals: [], rows: [] }, MSV: { totals: [], rows: [] },
    })

    const add = (arr, key) => {
        arr.forEach(r => {
            const g = ensure(r._group)
            const bucket = g[key]
            if (isTotalName(r.deviceName)) bucket.totals.push(r)
            else bucket.rows.push(r)
        })
    }
    add(rowsAI.value, 'AI'); add(rowsAO.value, 'AO'); add(rowsAV.value, 'AV')
    add(rowsBI.value, 'BI'); add(rowsBO.value, 'BO')
    add(rowsMSI.value, 'MSI'); add(rowsMSO.value, 'MSO'); add(rowsMSV.value, 'MSV')

    // sort rows & totals by deviceName
    Object.values(map).forEach(section => {
        for (const k of Object.keys(section)) {
            section[k].rows.sort((a, b) => String(a.deviceName || '').localeCompare(String(b.deviceName || '')))
            section[k].totals.sort((a, b) => String(a.deviceName || '').localeCompare(String(b.deviceName || '')))
        }
    })
    return map
})

/* Consolidated list of ALL totals (for the top strip) */
const totalsTop = computed(() => {
    const arr = []
    const seen = new Set()
    const map = groupedTables.value
    Object.keys(map).forEach(g => {
        const sec = map[g]
        const all = [
            ...sec.AI.totals, ...sec.AO.totals, ...sec.AV.totals,
            ...sec.BI.totals, ...sec.BO.totals,
            ...sec.MSI.totals, ...sec.MSO.totals, ...sec.MSV.totals,
        ]
        for (const r of all) {
            if (seen.has(r._key)) continue
            seen.add(r._key)
            arr.push(r)
        }
    })
    // Sort by deviceName for a stable top strip
    arr.sort((a, b) => String(a.deviceName || '').localeCompare(String(b.deviceName || '')))
    return arr
})

const orderedGroupKeys = computed(() => {
    const keys = Object.keys(groupedTables.value)
    return [
        ...GROUP_ORDER.filter(g => keys.includes(g)),
        ...keys.filter(k => !GROUP_ORDER.includes(k)).sort()
    ]
})

/* helpers for template */
const groupHasAny = (groupObj) => {
    if (!groupObj) return false
    const anyTotals = (
        groupObj.AI.totals.length || groupObj.AO.totals.length || groupObj.AV.totals.length ||
        groupObj.BI.totals.length || groupObj.BO.totals.length ||
        groupObj.MSI.totals.length || groupObj.MSO.totals.length || groupObj.MSV.totals.length
    ) > 0
    const anyRows = Object.values(groupObj).some(b => b.rows.length)
    return anyTotals || anyRows
}
</script>

<style scoped>
.hq-container {
    padding: 20px;
    background: #0a1f44;
    color: #fff;
    min-height: 100vh;
    font-family: Arial, sans-serif;
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

/* status bar */
.topbar {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 12px;
    flex-wrap: wrap;
}

.status {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    padding: 4px 8px;
    border-radius: 999px;
    font-size: .85rem;
}

.status.ok {
    background: rgba(16, 185, 129, .15);
    border: 1px solid rgba(16, 185, 129, .3);
    color: #a7f3d0;
}

.status.bad {
    background: rgba(239, 68, 68, .15);
    border: 1px solid rgba(239, 68, 68, .3);
    color: #fecaca;
}

.status.neutral {
    background: rgba(59, 130, 246, .15);
    border: 1px solid rgba(59, 130, 246, .3);
    color: #bfdbfe;
}

.status.hint {
    background: rgba(234, 179, 8, .15);
    border: 1px solid rgba(234, 179, 8, .3);
    color: #fde68a;
}

/* totals at top */
.totals-top {
    margin: 6px 0 14px;
}

.section-title {
    margin: 0 0 8px;
    font-size: 1.05rem;
    color: #cbd5e1;
}

.totals-grid.top {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 10px;
}

.total-card {
    background: #0f1a33;
    border: 1px solid rgba(255, 255, 255, .15);
    border-radius: 10px;
    padding: 10px;
}

.total-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #cbd5e1;
    font-size: .9rem;
}

.total-title .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.chip-small {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 999px;
    font-size: .75rem;
    background: rgba(255, 255, 255, .12);
    border: 1px solid rgba(255, 255, 255, .18);
}

.total-value {
    font-size: 1.35rem;
    font-weight: 800;
    margin-top: 4px;
}

.total-value small {
    font-weight: 600;
    color: #cbd5e1;
    margin-left: 4px;
}

.total-sub {
    margin-top: 2px;
    font-size: .8rem;
    color: #94a3b8;
}

/* fallback navigation */
.levels-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
}

.level-card {
    appearance: none;
    cursor: pointer;
    background: linear-gradient(180deg, #1d3670, #172c5d);
    border: 1px solid rgba(255, 255, 255, .18);
    color: #fff;
    border-radius: 12px;
    padding: 14px 16px;
    text-align: left;
    transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
    box-shadow: 0 4px 10px rgba(0, 0, 0, .25);
}

.level-card:hover {
    transform: translateY(-2px);
    background: linear-gradient(180deg, #244083, #19326a);
    box-shadow: 0 8px 18px rgba(0, 0, 0, .35);
}

.level-title {
    font-weight: 800;
    font-size: 1rem;
    margin-bottom: 6px;
}

.level-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    font-size: .85rem;
    opacity: .92;
}

.level-meta span {
    background: rgba(255, 255, 255, .08);
    border: 1px solid rgba(255, 255, 255, .12);
    padding: 2px 8px;
    border-radius: 999px;
}

.level-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 8px 0 14px;
}

.back-btn,
.ghost-btn {
    appearance: none;
    border: 1px solid rgba(255, 255, 255, .25);
    background: transparent;
    color: #fff;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
}

.back-btn:hover,
.ghost-btn:hover {
    background: rgba(255, 255, 255, .08);
    border-color: rgba(255, 255, 255, .4);
}

/* grouped sections */
.group-section {
    margin-bottom: 18px;
}

.group-title {
    margin: 0 0 10px;
    font-size: 1.05rem;
    color: #cbd5e1;
    border-left: 4px solid #1976d2;
    padding-left: 8px;
}

/* tables */
.tables-wrap {
    margin-top: 6px;
}

.table-card {
    background: #112d5c;
    border: 1px solid rgba(255, 255, 255, .2);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 14px;
}

.table-title {
    margin: 0 0 8px;
}

.tbl {
    width: 100%;
    border-collapse: collapse;
    background: #0f1a33;
    color: #e5e7eb;
    border: none;
    outline: none;
}

.tbl th,
.tbl td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, .08);
}

.tbl thead th {
    background: #16264d;
    color: #cbd5e1;
    position: sticky;
    top: 0;
    z-index: 1;
}

.tbl tbody tr:nth-child(odd) {
    background: #0f1a33;
}

.tbl tbody tr:nth-child(even) {
    background: #12214a;
}

.tbl tbody tr:hover {
    background: #1a2a59;
}

.empty {
    background: #0f1a33;
    border: 1px dashed rgba(255, 255, 255, .15);
    color: #94a3b8;
    border-radius: 8px;
    padding: 12px;
    font-size: .95rem;
}

.empty.big {
    padding: 16px;
}

.muted {
    color: #cbd5e0;
    opacity: .9
}

.total-val {
    font-size: 1.6rem;
    font-weight: 800;
    margin-top: 4px;
    line-height: 1.1;
}

.total-units {
    margin-top: 2px;
    font-size: .95rem;
    color: #cbd5e1;
}

.total-sub {
    margin-top: 6px;
    /* slightly more space before timestamp */
    font-size: .8rem;
    color: #94a3b8;
}
</style>
