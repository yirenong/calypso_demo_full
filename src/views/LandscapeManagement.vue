<template>
    <div class="energy-management-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Landscape Management</h2>
            <div class="page-header-right">
                <nav class="breadcrumb">
                    <span>Cavill</span> &gt; <span>Management</span> &gt; <span>Landscape Management</span>
                </nav>
            </div>
        </div>

        <!-- View Tabs + Reload + Download -->
        <div class="view-tab-bar">
            <div class="view-tab-nav">
                <button :class="{ active: viewTab === 'Dashboard' }" @click="switchTab('Dashboard')">
                    Dashboard
                </button>
                <button :class="{ active: viewTab === 'Schedule' }" @click="switchTab('Schedule')">
                    Schedule
                </button>
            </div>

            <div style="display:flex; gap:8px">
                <button class="icon-btn" @click="reloadAll" :title="loading ? 'Loading…' : 'Reload'">
                    <i class="fas fa-rotate"></i>
                </button>
                <button class="icon-btn" disabled title="Download (Work in Progress)">
                    <i class="fas fa-file-excel"></i>
                </button>
            </div>
        </div>

        <!-- ========================= DASHBOARD ========================= -->
        <template v-if="viewTab === 'Dashboard'">
            <div class="meta-strip">
                <div class="title-wrap">
                    <span class="badge">Overview</span>
                    <h1>Campus Landscape — Dashboard</h1>
                    <p class="subtitle">Manual override and PLC schedule upload are available in this interface.</p>
                </div>

                <div class="meta-actions">
                    <span class="pill plc-pill">
                        <span class="status-dot" :class="plc.connected ? 'dot-green' : 'dot-orange'"></span>
                        {{ plc.connected ? 'PLC Connected' : 'PLC Offline' }}
                    </span>
                    <span class="pill upload-pill" :class="uploadStatusClass">
                        {{ plc.uploadStatus }}
                    </span>
                </div>
            </div>

            <!-- KPIs -->
            <div class="kpi-section-header">
                <span class="section-chip">Latest</span>
            </div>

            <section class="grid kpi-grid kpi-grid-4">
                <div class="card kpi">
                    <div class="kpi-accent kpi-blue"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-droplet"></i></div>
                        <div class="kpi-label">Today Water Consumption</div>
                    </div>
                    <div class="kpi-value">12.6 <span class="kpi-unit">m³</span></div>
                    <div class="kpi-sub muted">vs yesterday: +1.2 m³</div>
                </div>

                <div class="card kpi">
                    <div class="kpi-accent kpi-green"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-chart-column"></i></div>
                        <div class="kpi-label">This Week Consumption</div>
                    </div>
                    <div class="kpi-value">74.3 <span class="kpi-unit">m³</span></div>
                    <div class="kpi-sub muted">7-day total</div>
                </div>

                <div class="card kpi">
                    <div class="kpi-accent kpi-orange"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-seedling"></i></div>
                        <div class="kpi-label">Irrigation Mode</div>
                    </div>
                    <div class="kpi-value kpi-value-small">
                        <span class="status-dot"
                            :class="irrigation.mode === 'AUTO' ? 'dot-green' : 'dot-orange'"></span>
                        {{ irrigation.mode }}
                    </div>
                    <div class="kpi-sub muted">
                        {{ irrigation.mode === 'AUTO' ? 'Following schedule' : 'Manual override active' }}
                    </div>
                </div>

                <div class="card kpi">
                    <div class="kpi-accent kpi-purple"></div>
                    <div class="kpi-top">
                        <div class="kpi-icon"><i class="fas fa-upload"></i></div>
                        <div class="kpi-label">Last Synced</div>
                    </div>
                    <div class="kpi-value kpi-value-small">{{ plc.lastUploadTime }}</div>
                    <div class="kpi-sub muted">Latest PLC schedule upload</div>
                </div>
            </section>

            <section class="zone-dashboard-grid" style="margin-top:14px">
                <aside class="card zone-filter-card">
                    <div class="card-header">
                        <div>
                            <h3>Filter</h3>
                            <small class="muted">Block and zone</small>
                        </div>
                    </div>

                    <div class="filter-stack">
                        <label class="filter-field">
                            <span class="filter-label">Block</span>
                            <select class="input" v-model="selectedBlock" @change="handleBlockFilterChange">
                                <option>All</option>
                                <option v-for="block in blockOptions" :key="block" :value="block">
                                    {{ block }}
                                </option>
                            </select>
                        </label>

                        <label class="filter-field">
                            <span class="filter-label">Zone</span>
                            <select class="input" v-model="selectedZone" @change="resetZonePage">
                                <option>All</option>
                                <option v-for="zone in zoneFilterOptions" :key="zone" :value="zone">
                                    {{ zone }}
                                </option>
                            </select>
                        </label>
                    </div>
                </aside>

                <div class="card zone-table-card">
                    <div class="card-header">
                        <div>
                            <h3>Zone Status</h3>
                            <small class="muted">Existing controllers and new PLC-connected zones</small>
                        </div>

                        <div class="table-toolbar">
                            <label class="page-size-control">
                                <span>Show</span>
                                <select class="input page-size-select" v-model.number="zonePageSize" @change="resetZonePage">
                                    <option :value="10">10</option>
                                    <option :value="15">15</option>
                                    <option :value="20">20</option>
                                </select>
                            </label>
                            <span class="pill subtle-pill">{{ filteredSolenoids.length }} of {{ solenoids.length }} zones</span>
                        </div>
                    </div>

                    <div class="table-wrap">
                        <table class="tbl zone-status-table">
                            <thead>
                                <tr>
                                    <th>Block</th>
                                    <th>Zone</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="s in paginatedSolenoids" :key="s.id">
                                    <td>
                                        <span class="table-label zone-name">{{ s.block }}</span>
                                    </td>
                                    <td>
                                        <span class="table-label">{{ s.zoneLabel }}</span>
                                    </td>
                                    <td>
                                        <span class="pill status-pill" :class="s.status === 'ON' ? 'pill-on' : 'pill-off'">
                                            {{ s.status === 'ON' ? 'On' : 'Off' }}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="pagination-bar">
                        <div class="muted">
                            Showing {{ zonePageStart }}-{{ zonePageEnd }} of {{ filteredSolenoids.length }}
                        </div>

                        <div class="pagination-actions">
                            <button class="mini-btn ghost-btn" @click="previousZonePage" :disabled="zoneCurrentPage === 1">
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span class="page-indicator">Page {{ zoneCurrentPage }} of {{ zoneTotalPages }}</span>
                            <button class="mini-btn ghost-btn" @click="nextZonePage" :disabled="zoneCurrentPage === zoneTotalPages">
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section class="grid dashboard-grid" style="margin-top:14px">
                <!-- Manual Control -->
                <div class="card">
                    <div class="card-header">
                        <div>
                            <h3>Manual Control</h3>
                            <small class="muted">Irrigation mode and zone control</small>
                        </div>

                        <div class="segmented">
                            <button class="seg-btn" :class="{ active: irrigation.mode === 'AUTO' }"
                                @click="setMode('AUTO')" :disabled="irrigation.isRunning" title="Follow schedule">
                                <i class="fas fa-clock"></i> Auto
                            </button>
                            <button class="seg-btn" :class="{ active: irrigation.mode === 'MANUAL' }"
                                @click="setMode('MANUAL')" title="Manual override">
                                <i class="fas fa-hand"></i> Manual
                            </button>
                        </div>
                    </div>

                    <div class="control-console">
                        <div class="console-strip">
                            <div class="strip-left">
                                <span class="status-dot"
                                    :class="irrigation.isRunning ? 'dot-green' : 'dot-orange'"></span>
                                <div>
                                    <div class="strip-title">
                                        {{ irrigation.isRunning ? 'Irrigation Running' : 'Irrigation Stopped' }}
                                    </div>
                                    <div class="strip-sub muted">
                                        Mode: <strong>{{ irrigation.mode }}</strong>
                                        <span v-if="irrigation.isRunning"> • Active: <strong>{{ irrigation.activeZone
                                                }}</strong></span>
                                    </div>
                                </div>
                            </div>

                            <div class="strip-right muted">
                                {{ irrigation.mode === 'AUTO' ? 'Schedule-driven' : 'Manual control' }}
                            </div>
                        </div>

                        <div class="console-grid">
                            <div class="console-block">
                                <div class="block-title">Zone</div>
                                <div class="block-sub muted">Choose zone for manual run</div>

                                <select class="input" v-model="manualZone"
                                    :disabled="irrigation.mode !== 'MANUAL' || irrigation.isRunning">
                                    <option>Zone A</option>
                                    <option>Zone B</option>
                                    <option>Zone C</option>
                                    <option>Zone D</option>
                                </select>

                                <div class="hint muted" v-if="irrigation.mode !== 'MANUAL'">
                                    Switch to <strong>Manual</strong> to choose a zone.
                                </div>
                            </div>

                            <div class="console-block">
                                <div class="block-title">Actions</div>
                                <div class="block-sub muted">Start or stop irrigation</div>

                                <div class="action-row">
                                    <button class="big-btn" @click="startIrrigation" :disabled="irrigation.isRunning">
                                        <i class="fas fa-play"></i> Start Now
                                    </button>

                                    <button class="big-btn danger" @click="stopIrrigation"
                                        :disabled="!irrigation.isRunning">
                                        <i class="fas fa-stop"></i> Stop
                                    </button>
                                </div>

                                <div class="hint muted">
                                    {{
                                        irrigation.mode === 'MANUAL'
                                            ? 'Manual run uses the selected zone.'
                                            : 'Auto mode uses the next enabled schedule.'
                                    }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <small class="err" v-if="error" style="display:block; margin-top:8px">{{ error }}</small>
                </div>

                <!-- PLC + Status -->
                <div class="card">
                    <div class="card-header">
                        <div>
                            <h3>PLC & System Status</h3>
                            <small class="muted">Connection, sync, and schedule snapshot</small>
                        </div>
                    </div>

                    <div class="status-list">
                        <div class="status-item">
                            <div class="status-left">
                                <span class="status-dot" :class="plc.connected ? 'dot-green' : 'dot-orange'"></span>
                                <div>
                                    <div class="status-title">PLC Controller</div>
                                    <div class="status-sub muted">Interface sync status</div>
                                </div>
                            </div>
                            <div class="status-right muted">{{ plc.connected ? 'Connected' : 'Offline' }}</div>
                        </div>

                        <div class="status-item">
                            <div class="status-left">
                                <span class="status-dot dot-green"></span>
                                <div>
                                    <div class="status-title">Outdoor Gateway</div>
                                    <div class="status-sub muted">Last seen: 2 mins ago</div>
                                </div>
                            </div>
                            <div class="status-right muted">RSSI -71</div>
                        </div>

                        <div class="status-item">
                            <div class="status-left">
                                <span class="status-dot dot-green"></span>
                                <div>
                                    <div class="status-title">Water Meter</div>
                                    <div class="status-sub muted">Live readings OK</div>
                                </div>
                            </div>
                            <div class="status-right muted">Flow normal</div>
                        </div>

                        <div class="status-item">
                            <div class="status-left">
                                <span class="status-dot dot-orange"></span>
                                <div>
                                    <div class="status-title">Next Schedule</div>
                                    <div class="status-sub muted">{{ nextEnabledProgramLabel }}</div>
                                </div>
                            </div>
                            <div class="status-right muted">{{ enabledProgramCount }} enabled</div>
                        </div>
                    </div>
                </div>

                <!-- Solenoid Override -->
                <div class="card dashboard-span-2">
                    <div class="card-header">
                        <div>
                            <h3>Solenoid Override</h3>
                            <small class="muted">Manual ON/OFF control per solenoid</small>
                        </div>

                        <div class="solenoid-header-right">
                            <span class="pill subtle-pill">Manual Override</span>
                        </div>
                    </div>

                    <div class="solenoid-grid">
                        <div class="solenoid-card" v-for="s in solenoids" :key="s.id">
                            <div class="solenoid-top">
                                <div>
                                    <div class="row-title">{{ s.name }}</div>
                                    <div class="row-sub muted">Zone: {{ s.zone }}</div>
                                </div>

                                <div class="solenoid-badges">
                                    <span class="pill mode-pill"
                                        :class="s.mode === 'MANUAL' ? 'mode-manual' : 'mode-auto'">
                                        {{ s.mode }}
                                    </span>
                                    <span class="pill" :class="s.status === 'ON' ? 'pill-on' : 'pill-off'">
                                        {{ s.status }}
                                    </span>
                                </div>
                            </div>

                            <div class="solenoid-actions">
                                <button class="mini-btn on-btn" @click="setSolenoidStatus(s, 'ON')">
                                    <i class="fas fa-toggle-on"></i> ON
                                </button>
                                <button class="mini-btn off-btn" @click="setSolenoidStatus(s, 'OFF')">
                                    <i class="fas fa-toggle-off"></i> OFF
                                </button>
                                <button class="mini-btn ghost-btn" @click="resetSolenoidAuto(s)">
                                    <i class="fas fa-rotate-left"></i> AUTO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Water Consumption Trend -->
                <div class="card chart-card dashboard-span-2" style="max-width:100%; height:420px">
                    <div class="card-header">
                        <h3>Water Consumption Trend</h3>
                        <small class="muted">Daily irrigation usage</small>
                    </div>

                    <div class="chart-wrap" style="height: calc(420px - 70px)">
                        <LineChartCard :title="' '" :chartData="landscapeWaterTrendData" :options="landscapeWaterTrendOptions" />
                    </div>
                </div>
            </section>
        </template>

        <!-- ========================= SCHEDULE ========================= -->
        <template v-else>
            <div class="meta-strip">
                <div class="title-wrap">
                    <span class="badge">Schedule</span>
                    <h1>Irrigation Schedule</h1>
                    <p class="subtitle">Add, edit, save, and sync irrigation schedules.</p>
                </div>

                <div class="meta-actions">
                    <span class="pill plc-pill">
                        <span class="status-dot" :class="plc.connected ? 'dot-green' : 'dot-orange'"></span>
                        {{ plc.connected ? 'PLC Connected' : 'PLC Offline' }}
                    </span>
                </div>
            </div>

            <div class="schedule-sub-tabs">
                <button v-for="tab in scheduleTabs" :key="tab.key" class="schedule-sub-tab"
                    :class="{ active: scheduleBlockTab === tab.key }" @click="setScheduleBlockTab(tab.key)">
                    {{ tab.label }}
                </button>
            </div>

            <section class="grid">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <h3>{{ activeScheduleTabLabel }}</h3>
                            <small class="muted">{{ schedulePrograms.length }} zones shown</small>
                        </div>

                        <div class="table-toolbar">
                            <label class="page-size-control">
                                <span>Show</span>
                                <select class="input page-size-select" v-model.number="schedulePageSize"
                                    @change="resetSchedulePage">
                                    <option :value="10">10</option>
                                    <option :value="15">15</option>
                                    <option :value="20">20</option>
                                </select>
                            </label>

                            <button class="action-btn" @click="addSchedule"
                                :disabled="scheduleSolenoidOptions.length === 0">
                                <i class="fas fa-plus"></i> Add Schedule
                            </button>
                        </div>
                    </div>

                    <div class="table-wrap">
                        <table class="tbl">
                            <thead>
                                <tr>
                                    <th style="width:70px">On</th>
                                    <th style="width:180px">Schedule Name</th>
                                    <th style="width:240px">Name - Zone</th>
                                    <th style="width:180px">Days</th>
                                    <th style="width:130px">Start Time</th>
                                    <th style="width:130px">Duration</th>
                                    <th style="width:190px; text-align:right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="p in paginatedSchedulePrograms" :key="p.id">
                                    <td>
                                        <label class="switch">
                                            <input type="checkbox" v-model="p.enabled" />
                                            <span class="slider"></span>
                                        </label>
                                    </td>

                                    <td>
                                        <template v-if="p.isEditing">
                                            <input class="input" v-model="p.name" placeholder="Schedule name" />
                                        </template>
                                        <template v-else>
                                            <span class="table-label">{{ p.name }}</span>
                                        </template>
                                    </td>

                                    <td>
                                        <template v-if="p.isEditing">
                                            <select class="input" v-model="p.solenoid">
                                                <option v-for="s in scheduleSolenoidOptions" :key="s.id" :value="s.name">
                                                    {{ s.name }}
                                                </option>
                                            </select>
                                        </template>
                                        <template v-else>
                                            <span class="table-label">{{ p.solenoid }}</span>
                                        </template>
                                    </td>

                                    <td>
                                        <template v-if="p.isEditing">
                                            <select class="input" v-model="p.days">
                                                <option>Mon</option>
                                                <option>Tue</option>
                                                <option>Wed</option>
                                                <option>Thu</option>
                                                <option>Fri</option>
                                                <option>Sat</option>
                                                <option>Sun</option>
                                                <option>Mon/Wed/Fri</option>
                                                <option>Tue/Thu</option>
                                                <option>Sat/Sun</option>
                                                <option>Everyday</option>
                                            </select>
                                        </template>
                                        <template v-else>
                                            <span class="table-label">{{ p.days }}</span>
                                        </template>
                                    </td>

                                    <td>
                                        <template v-if="p.isEditing">
                                            <input class="input" type="time" v-model="p.startTime" />
                                        </template>
                                        <template v-else>
                                            <span class="table-label">{{ p.startTime }}</span>
                                        </template>
                                    </td>

                                    <td>
                                        <template v-if="p.isEditing">
                                            <div class="inline-field">
                                                <input class="input duration-input" type="number" min="1" step="1"
                                                    v-model.number="p.durationMin" />
                                                <span class="muted">min</span>
                                            </div>
                                        </template>
                                        <template v-else>
                                            <span class="table-label">{{ p.durationMin }} min</span>
                                        </template>
                                    </td>

                                    <td style="text-align:right">
                                        <div class="table-actions">
                                            <button v-if="p.isEditing" class="mini-btn" @click="p.isEditing = false">
                                                <i class="fas fa-check"></i> Done
                                            </button>

                                            <button v-else class="mini-btn ghost-btn" @click="editSchedule(p)">
                                                <i class="fas fa-pen"></i> Edit
                                            </button>

                                            <button class="mini-btn" @click="runNow(p)" :disabled="!p.enabled">
                                                <i class="fas fa-play"></i> Start
                                            </button>

                                            <button class="mini-btn off-btn" @click="removeSchedule(p.id)">
                                                <i class="fas fa-trash"></i> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="schedulePrograms.length === 0">
                                    <td colspan="7">
                                        <div class="empty-table-state">No zones available for this block.</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="pagination-bar">
                        <div class="muted">
                            Showing {{ schedulePageStart }}-{{ schedulePageEnd }} of {{ schedulePrograms.length }}
                        </div>

                        <div class="pagination-actions">
                            <button class="mini-btn ghost-btn" @click="previousSchedulePage"
                                :disabled="scheduleCurrentPage === 1">
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span class="page-indicator">Page {{ scheduleCurrentPage }} of {{ scheduleTotalPages }}</span>
                            <button class="mini-btn ghost-btn" @click="nextSchedulePage"
                                :disabled="scheduleCurrentPage === scheduleTotalPages">
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>

                    <div class="footer-actions">
                        <div class="muted">
                            <span class="status-dot" :class="hasPendingChanges ? 'dot-orange' : 'dot-green'"></span>
                            {{ hasPendingChanges ? 'Pending changes not saved' : 'All changes saved' }}
                        </div>

                        <div style="display:flex; gap:10px; flex-wrap:wrap">
                            <button class="action-btn ghost" @click="resetPrograms">
                                <i class="fas fa-rotate-left"></i> Reset
                            </button>
                            <button class="action-btn ghost" @click="applySchedule">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                        </div>
                    </div>

                    <small class="err" v-if="error" style="display:block; margin-top:8px">{{ error }}</small>
                </div>

                <div class="card plc-upload-card">
                    <div class="card-header">
                        <div>
                            <h3>PLC Schedule Upload</h3>
                            <small class="muted">Push saved schedule to PLC</small>
                        </div>
                    </div>

                    <div class="plc-upload-panel">
                        <div class="upload-left">
                            <div class="upload-stat">
                                <div class="upload-label">PLC Status</div>
                                <div class="upload-value">
                                    <span class="status-dot" :class="plc.connected ? 'dot-green' : 'dot-orange'"></span>
                                    {{ plc.connected ? 'Connected' : 'Offline' }}
                                </div>
                            </div>

                            <div class="upload-stat">
                                <div class="upload-label">Last Synced</div>
                                <div class="upload-value">{{ plc.lastUploadTime }}</div>
                            </div>

                            <div class="upload-stat">
                                <div class="upload-label">Enabled Schedules</div>
                                <div class="upload-value">{{ enabledProgramCount }}</div>
                            </div>

                            <div class="upload-stat">
                                <div class="upload-label">Upload Status</div>
                                <div class="upload-value">
                                    <span class="pill upload-pill" :class="uploadStatusClass">{{ plc.uploadStatus
                                        }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="upload-right">
                            <button class="action-btn" @click="uploadScheduleToPLC"
                                :disabled="plc.uploadStatus === 'Uploading'">
                                <i class="fas fa-upload"></i>
                                {{ plc.uploadStatus === 'Uploading' ? 'Uploading...' : 'Upload to PLC' }}
                            </button>
                        </div>
                    </div>

                    <div v-if="plc.uploadStatus === 'Success'" class="success-banner">
                        <i class="fas fa-circle-check"></i>
                        Schedule uploaded successfully to PLC.
                    </div>
                </div>
            </section>
        </template>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import LineChartCard from '../components/LineChartCard.vue'

const viewTab = ref('Dashboard')
const loading = ref(false)
const error = ref(null)

const irrigation = ref({
    mode: 'AUTO',
    isRunning: false,
    activeZone: 'Blk B Level 1 - Zone 1',
})

const manualZone = ref('Blk B Level 1 - Zone 1')

const plc = ref({
    connected: true,
    lastUploadTime: '2026-03-23 14:30',
    uploadStatus: 'Idle',
})

const waterTrendSeed = ref(0)

const zoneGroups = [
    { name: 'Blk B Level 1', zones: 4 },
    { name: 'Blk C Level 1', zones: 1 },
    { name: 'Blk D Level 1', zones: 2 },
    { name: 'Blk E Level 1', zones: 1 },
    { name: 'Blk G18 Level 2', zones: 22 },
    { name: 'Blk H Level 1', zones: 4 },
    { name: 'Blk J Level 1', zones: 1 },
    { name: 'Blk K Level 1', zones: 9 },
    { name: 'Blk A Level 7', zones: 3 },
    { name: 'Blk H Rooftop', zones: 1 },
    { name: 'Blk B Sunken Garden', zones: 5 },
]

const landscapeZones = zoneGroups.flatMap((group) =>
    Array.from({ length: group.zones }, (_, index) => `${group.name} - Zone ${index + 1}`)
)

const solenoids = ref(
    zoneGroups.flatMap((group, groupIndex) =>
        Array.from({ length: group.zones }, (_, zoneIndex) => {
            const id =
                zoneGroups.slice(0, groupIndex).reduce((total, item) => total + item.zones, 0) +
                zoneIndex +
                1
            const zoneLabel = `Zone ${zoneIndex + 1}`
            const name = `${group.name} - ${zoneLabel}`

            return {
                id,
                name,
                block: group.name,
                zone: name,
                zoneLabel,
                status: id === 1 ? 'ON' : 'OFF',
                mode: id === 1 ? 'MANUAL' : 'AUTO',
            }
        })
    )
)

const selectedBlock = ref('All')
const selectedZone = ref('All')
const zonePageSize = ref(10)
const zoneCurrentPage = ref(1)

const blockOptions = computed(() => zoneGroups.map((group) => group.name))

const zoneFilterOptions = computed(() => {
    if (selectedBlock.value === 'All') {
        return [...new Set(solenoids.value.map((s) => s.zoneLabel))]
    }

    return solenoids.value.filter((s) => s.block === selectedBlock.value).map((s) => s.zoneLabel)
})

const filteredSolenoids = computed(() => {
    return solenoids.value.filter((s) => {
        const matchesBlock = selectedBlock.value === 'All' || s.block === selectedBlock.value
        const matchesZone = selectedZone.value === 'All' || s.zoneLabel === selectedZone.value
        return matchesBlock && matchesZone
    })
})

const zoneTotalPages = computed(() => {
    return Math.max(1, Math.ceil(filteredSolenoids.value.length / zonePageSize.value))
})

const paginatedSolenoids = computed(() => {
    const currentPage = Math.min(zoneCurrentPage.value, zoneTotalPages.value)
    const start = (currentPage - 1) * zonePageSize.value
    return filteredSolenoids.value.slice(start, start + zonePageSize.value)
})

const zonePageStart = computed(() => {
    if (!filteredSolenoids.value.length) return 0
    return (Math.min(zoneCurrentPage.value, zoneTotalPages.value) - 1) * zonePageSize.value + 1
})

const zonePageEnd = computed(() => {
    return Math.min(zonePageStart.value + paginatedSolenoids.value.length - 1, filteredSolenoids.value.length)
})

const scheduleTabs = computed(() => [
    { key: 'Overall', label: 'Overall', block: 'All' },
    ...zoneGroups.map((group) => ({
        key: group.name,
        label: formatScheduleTabLabel(group.name),
        block: group.name,
    })),
])

const scheduleBlockTab = ref('Overall')
const schedulePageSize = ref(10)
const scheduleCurrentPage = ref(1)

const initialPrograms = solenoids.value.map((s) => ({
    id: s.id,
    enabled: s.id <= 2,
    name: `Schedule ${s.id}`,
    days: 'Everyday',
    startTime: '06:00',
    durationMin: 10,
    solenoid: s.name,
    isEditing: false,
}))

const programs = ref(structuredClone(initialPrograms))
const lastAppliedSnapshot = ref(JSON.stringify(programs.value))

const activeScheduleTab = computed(() => {
    return scheduleTabs.value.find((tab) => tab.key === scheduleBlockTab.value) || scheduleTabs.value[0]
})

const activeScheduleTabLabel = computed(() => {
    return activeScheduleTab.value.label === 'Overall' ? 'Overall Schedule' : `${activeScheduleTab.value.label} Schedule`
})

const scheduleSolenoidOptions = computed(() => {
    if (activeScheduleTab.value.block === 'All') return solenoids.value
    return solenoids.value.filter((s) => s.block === activeScheduleTab.value.block)
})

const schedulePrograms = computed(() => {
    if (activeScheduleTab.value.block === 'All') return programs.value

    const allowedNames = new Set(scheduleSolenoidOptions.value.map((s) => s.name))
    return programs.value.filter((p) => allowedNames.has(p.solenoid))
})

const scheduleTotalPages = computed(() => {
    return Math.max(1, Math.ceil(schedulePrograms.value.length / schedulePageSize.value))
})

const paginatedSchedulePrograms = computed(() => {
    const currentPage = Math.min(scheduleCurrentPage.value, scheduleTotalPages.value)
    const start = (currentPage - 1) * schedulePageSize.value
    return schedulePrograms.value.slice(start, start + schedulePageSize.value)
})

const schedulePageStart = computed(() => {
    if (!schedulePrograms.value.length) return 0
    return (Math.min(scheduleCurrentPage.value, scheduleTotalPages.value) - 1) * schedulePageSize.value + 1
})

const schedulePageEnd = computed(() => {
    return Math.min(
        schedulePageStart.value + paginatedSchedulePrograms.value.length - 1,
        schedulePrograms.value.length
    )
})

const hasPendingChanges = computed(() => {
    return JSON.stringify(programs.value) !== lastAppliedSnapshot.value
})

const enabledProgramCount = computed(() => {
    return programs.value.filter((p) => p.enabled).length
})

const landscapeWaterTrendData = computed(() => {
    const labels = []
    const data = []
    const today = new Date()
    for (let i = 6; i >= 0; i -= 1) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
        data.push(Number((9.8 + (6 - i) * 0.7 + Math.sin((waterTrendSeed.value + i) / 2) * 1.6).toFixed(1)))
    }
    return {
        labels,
        datasets: [{
            label: 'Irrigation m3',
            data,
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 2,
            fill: false,
        }],
    }
})

const landscapeWaterTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,0.08)' } },
        y: { beginAtZero: true, ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,0.08)' } },
    },
    plugins: { legend: { labels: { color: '#cbd5e1' } } },
}

const nextEnabledProgramLabel = computed(() => {
    const nextProgram = programs.value.find((p) => p.enabled)
    if (!nextProgram) return 'No enabled schedule'
    return `${nextProgram.days}, ${nextProgram.startTime} • ${nextProgram.solenoid}`
})

const uploadStatusClass = computed(() => {
    if (plc.value.uploadStatus === 'Success') return 'upload-success'
    if (plc.value.uploadStatus === 'Uploading') return 'upload-uploading'
    return 'upload-idle'
})

function switchTab(tab) {
    viewTab.value = tab
}

function formatScheduleTabLabel(blockName) {
    return blockName.replace('Level', 'L')
}

function setScheduleBlockTab(tabKey) {
    scheduleBlockTab.value = tabKey
    resetSchedulePage()
}

function resetSchedulePage() {
    scheduleCurrentPage.value = 1
}

function previousSchedulePage() {
    scheduleCurrentPage.value = Math.max(1, scheduleCurrentPage.value - 1)
}

function nextSchedulePage() {
    scheduleCurrentPage.value = Math.min(scheduleTotalPages.value, scheduleCurrentPage.value + 1)
}

function handleBlockFilterChange() {
    selectedZone.value = 'All'
    resetZonePage()
}

function resetZonePage() {
    zoneCurrentPage.value = 1
}

function previousZonePage() {
    zoneCurrentPage.value = Math.max(1, zoneCurrentPage.value - 1)
}

function nextZonePage() {
    zoneCurrentPage.value = Math.min(zoneTotalPages.value, zoneCurrentPage.value + 1)
}

function reloadAll() {
    loading.value = true
    error.value = null
    waterTrendSeed.value += 1
    plc.value.connected = true

    setTimeout(() => {
        loading.value = false
    }, 250)
}

function setMode(mode) {
    irrigation.value.mode = mode
}

function startIrrigation() {
    error.value = null
    irrigation.value.isRunning = true

    if (irrigation.value.mode === 'MANUAL') {
        irrigation.value.activeZone = manualZone.value
        return
    }

    const firstEnabled = programs.value.find((p) => p.enabled)
    if (!firstEnabled) {
        irrigation.value.activeZone = landscapeZones[0]
        return
    }

    const matchedSolenoid = solenoids.value.find((s) => s.name === firstEnabled.solenoid)
    irrigation.value.activeZone = matchedSolenoid?.zone || landscapeZones[0]
}

function stopIrrigation() {
    error.value = null
    irrigation.value.isRunning = false

    solenoids.value.forEach((s) => {
        if (s.mode === 'MANUAL') {
            s.status = 'OFF'
        }
    })
}

function runNow(program) {
    if (!program.enabled) return

    irrigation.value.mode = 'MANUAL'
    irrigation.value.isRunning = true

    const matchedSolenoid = solenoids.value.find((s) => s.name === program.solenoid)
    if (matchedSolenoid) {
        irrigation.value.activeZone = matchedSolenoid.zone

        solenoids.value.forEach((s) => {
            if (s.name === program.solenoid) {
                s.status = 'ON'
                s.mode = 'MANUAL'
            } else if (s.mode === 'MANUAL') {
                s.status = 'OFF'
            }
        })
    }
}

function resetPrograms() {
    programs.value = structuredClone(initialPrograms)
    error.value = null
}

function applySchedule() {
    programs.value.forEach((p) => {
        p.isEditing = false
    })

    lastAppliedSnapshot.value = JSON.stringify(programs.value)
    error.value = null
}

function editSchedule(program) {
    program.isEditing = true
}

function uploadScheduleToPLC() {
    error.value = null
    plc.value.uploadStatus = 'Uploading'

    setTimeout(() => {
        plc.value.uploadStatus = 'Success'
        plc.value.lastUploadTime = formatNow()
        lastAppliedSnapshot.value = JSON.stringify(programs.value)
    }, 800)
}

function setSolenoidStatus(solenoid, status) {
    solenoid.status = status
    solenoid.mode = 'MANUAL'
    irrigation.value.mode = 'MANUAL'
}

function resetSolenoidAuto(solenoid) {
    solenoid.mode = 'AUTO'
    solenoid.status = 'OFF'
}

function addSchedule() {
  const nextId =
    programs.value.length > 0
      ? Math.max(...programs.value.map((p) => p.id)) + 1
      : 1
  const defaultSolenoid = scheduleSolenoidOptions.value[0]?.name || solenoids.value[0]?.name || landscapeZones[0]

  programs.value.push({
    id: nextId,
    enabled: true,
    name: `Schedule ${nextId}`,
    days: 'Mon',
    startTime: '06:00',
    durationMin: 5,
    solenoid: defaultSolenoid,
    isEditing: true,
  })
}

function removeSchedule(id) {
    programs.value = programs.value.filter((p) => p.id !== id)
}

function formatNow() {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}
</script>

<style scoped>
.energy-management-container {
    margin: 0 auto;
    padding: 24px 28px;
    background: #0b1220;
    min-height: 100vh;
    color: #e5e7eb;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
}

.page-header-right {
    display: flex;
    align-items: center;
    gap: 10px;
}

.page-title {
    margin: 0;
    font-size: 24px;
    color: #f8fafc;
}

.breadcrumb {
    color: #9fb0ff;
}

.breadcrumb span {
    font-size: 14px;
    margin: 0 4px;
}

.icon-btn {
    display: inline-grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    cursor: pointer;
}

.icon-btn:hover {
    background: rgba(255, 255, 255, 0.18);
}

.icon-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.view-tab-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0 12px;
}

.view-tab-bar .view-tab-nav {
    flex: 1 1 auto;
    display: flex;
    gap: 10px;
    overflow-x: auto;
    white-space: nowrap;
    padding-bottom: 4px;
}

.view-tab-nav button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    color: #e5e7eb;
    font-weight: 700;
    cursor: pointer;
    font-size: 0.9rem;
    line-height: 1;
    flex: 0 0 auto;
}

.view-tab-nav button:hover {
    background: rgba(255, 255, 255, 0.18);
}

.view-tab-nav button.active {
    background: #1976d2;
    border-color: #1976d2;
    color: #fff;
}

.meta-strip {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: start;
    margin-bottom: 14px;
}

.meta-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}

.title-wrap h1 {
    margin: 6px 0 2px;
    font-size: 1.2rem;
    color: #f8fafc;
}

.subtitle {
    color: #9fb0ff;
    margin: 0;
    font-size: 0.9rem;
}

.badge {
    display: inline-block;
    background: rgba(34, 197, 94, 0.15);
    color: #86efac;
    font-size: 0.75rem;
    padding: 4px 8px;
    border-radius: 999px;
}

.kpi-section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0 10px;
}

.section-chip {
    font-size: 0.8rem;
    font-weight: 800;
    color: #fff;
    background: rgba(255, 255, 255, 0.10);
    border: 1px solid rgba(255, 255, 255, 0.14);
    padding: 7px 12px;
    border-radius: 999px;
    letter-spacing: 0.2px;
}

.grid {
    display: grid;
    gap: 16px;
}

.kpi-grid-4 {
    grid-template-columns: repeat(4, minmax(220px, 1fr));
}

.dashboard-grid {
    grid-template-columns: 1.05fr 0.95fr;
}

.dashboard-span-2 {
    grid-column: 1 / -1;
}

.card {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 14px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
    position: relative;
    overflow: hidden;
}

.card.kpi {
    padding-top: 10px;
}

.kpi-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
}

.kpi-blue {
    background: #3b82f6;
}

.kpi-green {
    background: #22c55e;
}

.kpi-orange {
    background: #f59e0b;
}

.kpi-purple {
    background: #8b5cf6;
}

.kpi-top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 2px;
}

.kpi-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
}

.kpi-label {
    color: #cbd5e1;
    font-size: 0.9rem;
    font-weight: 600;
}

.kpi-value {
    font-size: 1.55rem;
    font-weight: 800;
    margin-top: 6px;
    color: #f8fafc;
}

.kpi-value-small {
    font-size: 1.05rem;
    font-weight: 800;
    margin-top: 8px;
    color: #f8fafc;
    line-height: 1.35;
}

.kpi-unit {
    font-size: 0.9rem;
    font-weight: 700;
    color: #cbd5e1;
}

.kpi-sub {
    color: #9fb0ff;
    font-size: 0.8rem;
    margin-top: 2px;
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    gap: 12px;
    flex-wrap: wrap;
}

.card-header h3 {
    margin: 0;
    font-size: 1rem;
    color: #e5e7eb;
}

.muted {
    color: #9fb0ff;
    opacity: 0.9;
}

.err {
    color: #fda4af;
}

.segmented {
    display: inline-flex;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.06);
    border-radius: 999px;
    padding: 3px;
    gap: 4px;
}

.seg-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    font-weight: 900;
    color: #e5e7eb;
    background: transparent;
}

.seg-btn:hover {
    background: rgba(255, 255, 255, 0.10);
}

.seg-btn.active {
    background: #1976d2;
    color: #fff;
}

.seg-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.control-console {
    margin-top: 10px;
    display: grid;
    gap: 12px;
}

.console-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    background: rgba(255, 255, 255, 0.03);
}

.strip-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.strip-title {
    font-weight: 900;
    color: #f8fafc;
}

.strip-sub {
    font-size: 0.85rem;
    margin-top: 2px;
}

.console-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.console-block {
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    background: rgba(255, 255, 255, 0.03);
}

.block-title {
    font-weight: 900;
    color: #f8fafc;
}

.block-sub {
    font-size: 0.82rem;
    margin-top: 2px;
    margin-bottom: 10px;
}

.action-row {
    display: flex;
    gap: 10px;
}

.big-btn {
    flex: 1 1 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.10);
    color: #fff;
    cursor: pointer;
    font-weight: 900;
}

.big-btn:hover {
    background: rgba(255, 255, 255, 0.18);
}

.big-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.big-btn.danger {
    background: rgba(244, 63, 94, 0.18);
    border-color: rgba(244, 63, 94, 0.35);
}

.big-btn.danger:hover {
    background: rgba(244, 63, 94, 0.26);
}

.hint {
    margin-top: 10px;
    font-size: 0.85rem;
}

.input {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #fff;
    border-radius: 10px;
    padding: 8px 10px;
    outline: none;
}

.input:focus {
    border-color: rgba(25, 118, 210, 0.9);
}

select.input,
select {
    background: rgba(255, 255, 255, 0.06);
    color: #fff;
}

select option {
    background-color: #0f172a;
    color: #fff;
}

.status-list {
    display: grid;
    gap: 10px;
}

.status-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 10px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
}

.status-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.status-title {
    font-weight: 800;
    color: #f8fafc;
    font-size: 0.95rem;
}

.status-sub {
    font-size: 0.8rem;
}

.status-right {
    font-size: 0.85rem;
}

.status-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    display: inline-block;
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.06);
}

.dot-green {
    background: #22c55e;
}

.dot-orange {
    background: #f59e0b;
}

.chart-card {
    border-radius: 12px;
    overflow: hidden;
}

.chart-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
}

.wip-panel {
    border: 1px dashed rgba(255, 255, 255, 0.25);
    border-radius: 12px;
    padding: 18px 16px;
    width: 100%;
    max-width: 520px;
    text-align: center;
    background: rgba(255, 255, 255, 0.03);
}

.wip-title {
    font-weight: 800;
    color: #f8fafc;
    margin-bottom: 6px;
}

.wip-sub {
    color: #9fb0ff;
    font-size: 0.9rem;
}

.solenoid-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(260px, 1fr));
    gap: 12px;
}

.solenoid-card {
    padding: 12px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    background: rgba(255, 255, 255, 0.03);
}

.solenoid-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
}

.solenoid-badges {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.solenoid-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.solenoid-header-right {
    display: flex;
    gap: 8px;
    align-items: center;
}

.zone-dashboard-grid {
    display: grid;
    grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
}

.zone-filter-card {
    position: sticky;
    top: 14px;
}

.filter-stack {
    display: grid;
    gap: 14px;
}

.filter-field {
    display: grid;
    gap: 7px;
}

.filter-field .input {
    width: 100%;
}

.filter-label {
    color: #cbd5e1;
    font-size: 0.82rem;
    font-weight: 900;
}

.schedule-sub-tabs {
    display: flex;
    gap: 10px;
    margin: 0 0 14px;
    overflow-x: auto;
    padding-bottom: 4px;
}

.schedule-sub-tab {
    flex: 0 0 auto;
    padding: 8px 13px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.08);
    color: #e5e7eb;
    cursor: pointer;
    font-weight: 900;
}

.schedule-sub-tab:hover {
    background: rgba(255, 255, 255, 0.18);
}

.schedule-sub-tab.active {
    background: #1976d2;
    border-color: #1976d2;
    color: #fff;
}

.empty-table-state {
    padding: 20px 10px;
    text-align: center;
    color: #9fb0ff;
    font-weight: 800;
}

.table-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.page-size-control {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #cbd5e1;
    font-size: 0.82rem;
    font-weight: 900;
}

.page-size-select {
    width: 78px;
}

.pagination-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
    flex-wrap: wrap;
}

.pagination-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.page-indicator {
    color: #f8fafc;
    font-size: 0.85rem;
    font-weight: 900;
    padding: 0 4px;
}

.table-wrap {
    overflow: auto;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.tbl {
    width: 100%;
    border-collapse: collapse;
    min-width: 980px;
    background: rgba(255, 255, 255, 0.02);
}

.zone-status-table {
    min-width: 620px;
    table-layout: fixed;
}

.zone-status-table th,
.zone-status-table td {
    width: 33.333%;
    text-align: right;
}

.tbl th,
.tbl td {
    padding: 12px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    text-align: left;
    vertical-align: top;
}

.tbl th {
    font-size: 0.85rem;
    color: #cbd5e1;
    font-weight: 900;
    background: rgba(255, 255, 255, 0.04);
    position: sticky;
    top: 0;
}

.row-title {
    font-weight: 900;
    color: #f8fafc;
}

.row-sub {
    font-size: 0.82rem;
    margin-top: 2px;
}

.pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    font-weight: 800;
    font-size: 0.8rem;
}

.subtle-pill {
    color: #cbd5e1;
}

.mode-pill {
    min-width: 74px;
    justify-content: center;
}

.mode-manual {
    background: rgba(245, 158, 11, 0.16);
    border-color: rgba(245, 158, 11, 0.35);
    color: #fcd34d;
}

.mode-auto {
    background: rgba(59, 130, 246, 0.16);
    border-color: rgba(59, 130, 246, 0.35);
    color: #93c5fd;
}

.pill-on {
    background: rgba(34, 197, 94, 0.18);
    border-color: rgba(34, 197, 94, 0.35);
    color: #86efac;
}

.pill-off {
    background: rgba(244, 63, 94, 0.18);
    border-color: rgba(244, 63, 94, 0.35);
    color: #fda4af;
}

.plc-pill {
    color: #e5e7eb;
}

.upload-pill {
    min-width: 92px;
    justify-content: center;
}

.status-pill {
    min-width: 64px;
    justify-content: center;
}

.upload-idle {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.12);
    color: #cbd5e1;
}

.upload-uploading {
    background: rgba(245, 158, 11, 0.16);
    border-color: rgba(245, 158, 11, 0.35);
    color: #fcd34d;
}

.upload-success {
    background: rgba(34, 197, 94, 0.18);
    border-color: rgba(34, 197, 94, 0.35);
    color: #86efac;
}

.mini-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.10);
    color: #fff;
    cursor: pointer;
    font-weight: 900;
}

.mini-btn:hover {
    background: rgba(255, 255, 255, 0.18);
}

.mini-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.on-btn {
    background: rgba(34, 197, 94, 0.2);
    border-color: rgba(34, 197, 94, 0.4);
}

.on-btn:hover {
    background: rgba(34, 197, 94, 0.3);
}

.off-btn {
    background: rgba(244, 63, 94, 0.18);
    border-color: rgba(244, 63, 94, 0.35);
}

.off-btn:hover {
    background: rgba(244, 63, 94, 0.28);
}

.ghost-btn {
    background: rgba(255, 255, 255, 0.06);
}

.footer-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    flex-wrap: wrap;
}

.action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid rgba(25, 118, 210, 0.5);
    background: #1976d2;
    color: #fff;
    font-weight: 800;
    cursor: pointer;
}

.action-btn:hover {
    filter: brightness(1.08);
}

.action-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
}

.action-btn.ghost {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
}

.inline-field {
    display: flex;
    align-items: center;
    gap: 8px;
}

.duration-input {
    width: 90px;
}

.table-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
}

.plc-upload-card {
    overflow: visible;
}

.plc-upload-panel {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    gap: 16px;
    flex-wrap: wrap;
}

.upload-left {
    flex: 1 1 480px;
    display: grid;
    grid-template-columns: repeat(2, minmax(180px, 1fr));
    gap: 12px;
}

.upload-stat {
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    background: rgba(255, 255, 255, 0.03);
}

.upload-label {
    font-size: 0.8rem;
    color: #9fb0ff;
    margin-bottom: 6px;
}

.upload-value {
    font-size: 0.95rem;
    font-weight: 800;
    color: #f8fafc;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.upload-right {
    display: flex;
    align-items: center;
    justify-content: center;
}

.success-banner {
    margin-top: 14px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid rgba(34, 197, 94, 0.35);
    background: rgba(34, 197, 94, 0.12);
    color: #86efac;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
}

.switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
}

.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    transition: 0.2s;
    border-radius: 999px;
}

.slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    top: 2.5px;
    background: #fff;
    transition: 0.2s;
    border-radius: 999px;
}

.switch input:checked+.slider {
    background: rgba(34, 197, 94, 0.35);
    border-color: rgba(34, 197, 94, 0.55);
}

.switch input:checked+.slider:before {
    transform: translateX(20px);
}

@media (max-width: 1200px) {
    .kpi-grid-4 {
        grid-template-columns: repeat(2, minmax(220px, 1fr));
    }

    .dashboard-grid {
        grid-template-columns: 1fr;
    }

    .console-grid {
        grid-template-columns: 1fr;
    }

    .solenoid-grid {
        grid-template-columns: 1fr;
    }

    .zone-dashboard-grid {
        grid-template-columns: 1fr;
    }

    .zone-filter-card {
        position: static;
    }
}

@media (max-width: 768px) {
    .energy-management-container {
        padding: 16px;
    }

    .meta-strip {
        grid-template-columns: 1fr;
    }

    .kpi-grid-4 {
        grid-template-columns: 1fr;
    }

    .console-strip {
        flex-direction: column;
        align-items: flex-start;
    }

    .upload-left {
        grid-template-columns: 1fr;
    }

    .upload-right {
        width: 100%;
        justify-content: flex-start;
    }
}

.table-label {
    display: inline-block;
    padding: 8px 10px;
    min-height: 38px;
    line-height: 20px;
    color: #f8fafc;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    min-width: 100px;
}
</style>
