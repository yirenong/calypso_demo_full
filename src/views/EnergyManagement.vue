<template>
    <div class="energy-management-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Energy Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt; <span>Management</span> &gt; <span>Energy Management</span>
            </nav>
        </div>

        <!-- View Tabs + Download -->
        <div class="view-tab-nav">
            <button :class="{ active: viewTab === 'Dashboard' }" @click="viewTab = 'Dashboard'">Dashboard</button>
            <!-- ⭐ NEW: hide for plain users -->
            <button v-if="canSeeAdminViews" :class="{ active: viewTab === 'Device List' }"
                @click="viewTab = 'Device List'">Device List</button>
            <button v-if="canSeeAdminViews" :class="{ active: viewTab === 'Faults' }"
                @click="viewTab = 'Faults'">Faults</button>

            <span class="tab-spacer"></span>
            <!-- Replace the existing download button -->
            <button class="icon-btn" @click="openDownloadModal" :disabled="exporting" aria-label="Download device list"
                :title="exporting ? 'Preparing…' : 'Download device list'">
                <i :class="['fas', exporting ? 'fa-spinner fa-spin' : 'fa-download']"></i>
            </button>

        </div>

        <!-- ========================= DASHBOARD ========================= -->
        <template v-if="viewTab === 'Dashboard'">
            <!-- Primary Tabs -->
            <div class="tab-nav">
                <button :class="{ active: currentTab === 'Overall' }" @click="selectBlock('Overall')">Overall</button>

                <button v-for="b in tabsBlocks" :key="b" :class="{ active: currentTab === b }" @click="selectBlock(b)">
                    Block {{ b }}
                </button>

                <!-- New: EV Charging Room tab -->
                <button :class="{ active: currentTab === 'EV' }" @click="selectBlock('EV')">
                    EV Charging Room
                </button>

                <span v-if="hierLoading || powerLoading || trendLoading" class="loader">Loading…</span>
                <span v-if="hierError || powerError || trendError" class="err">Failed to load data</span>
            </div>


            <!-- Level Tabs -->
            <div v-if="showLevelTabs" class="sub-tab-nav">
                <button :class="{ active: currentLevel === 'Overall' }" @click="selectLevel('Overall')">Overall</button>
                <button v-for="lvl in levelTabs" :key="lvl" :class="{ active: currentLevel === lvl }"
                    @click="selectLevel(lvl)">
                    {{ lvl }}
                </button>
            </div>

            <!-- Meta -->
            <div class="meta-strip">
                <div class="title-wrap">
                    <span class="badge">Campus Energy Usage</span>
                    <h1>
                        {{ currentTab }}<template v-if="showLevelTabs"> / {{ currentLevel }}</template> — Dashboard
                    </h1>
                </div>
                <div class="right-meta">
                    <div class="meta-chip">
                        Active: <strong>{{ currentTab }}</strong>
                        <template v-if="showLevelTabs"> • <strong>{{ currentLevel }}</strong></template>
                    </div>
                </div>
            </div>

            <!-- KPI tiles -->
            <section class="grid kpi-grid">
                <!-- 1) Current Usage for the Month (Month-to-date) -->
                <div class="card kpi">
                    <div class="kpi-top" style="justify-content:space-between; gap:12px">
                        <div style="display:flex; align-items:center; gap:12px">
                            <div class="kpi-icon" style="background:#a78bfa"><i class="fas fa-calendar-alt"></i></div>
                            <div class="kpi-label">Current Usage for the Month</div>
                        </div>
                        <small class="muted">M-to-date</small>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(monthKpiKwh) }} <small>kWh</small>
                    </div>

                    <div class="kpi-sub muted">
                        From {{ fmtDate(monthStart) }} to {{ fmtDate(new Date()) }}
                    </div>
                </div>

                <!-- 2) Current Usage for the Day (already available) -->
                <div class="card kpi">
                    <div class="kpi-top" style="justify-content:space-between; gap:12px">
                        <div style="display:flex; align-items:center; gap:12px">
                            <div class="kpi-icon" style="background:#22c55e"><i class="fas fa-sun"></i></div>
                            <div class="kpi-label">Current Usage for the Day</div>
                        </div>
                        <small class="muted" v-if="dayDate">date {{ dayDate }}</small>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(dayKpiKwh) }} <small>kWh</small>
                    </div>

                    <div class="kpi-sub muted">
                        Avg kW proxy:
                        <strong>{{ fmtNum(dayKpiKw) }}</strong> kW
                    </div>

                </div>

                <!-- 6) EUI -->
                <div class="card kpi">
                    <div class="kpi-top" style="justify-content:space-between; gap:12px">
                        <div style="display:flex; align-items:center; gap:12px">
                            <div class="kpi-icon" style="background:#ef4444"><i class="fas fa-ruler-combined"></i></div>
                            <div class="kpi-label">EUI</div>
                        </div>
                        <small class="muted">kWh/m² (proxy)</small>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(euiNow) }}
                    </div>

                    <div class="kpi-sub muted">
                        Cummulative Annual Energy Used ÷ 192,820
                    </div>
                </div>
            </section>


            <!-- Trend card -->
            <section class="grid charts-grid">
                <div class="card chart-card" v-if="currentTab !== 'EV'">
                    <!-- Title + chips (same line) -->
                    <div class="card-header trend-row">
                        <h3>Energy Consumption Trend (kWh)</h3>
                        <!-- Scope & quick-action buttons -->
                        <div class="top-controls" v-show="trendGran === 'D'"
                            style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap">
                            <div class="left" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center">
                                <span class="muted">Period</span>
                                <button class="chip" :class="{ active: periodMode === 'overall' }"
                                    @click="setPeriodMode('overall')">Overall</button>
                                <button class="chip" :class="{ active: periodMode === 'business' }"
                                    @click="setPeriodMode('business')">Business</button>
                                <button class="chip" :class="{ active: periodMode === 'offpeak1' }"
                                    @click="setPeriodMode('offpeak1')">Off-peak 1</button>
                                <button class="chip" :class="{ active: periodMode === 'offpeak2' }"
                                    @click="setPeriodMode('offpeak2')">Off-peak 2</button>
                            </div>
                            <div class="right" style="display:flex; gap:8px; align-items:center">
                                <button class="chip" :class="{ active: compareView }"
                                    @click="compareView = !compareView">
                                    {{ compareView ? 'Exit Compare' : 'Compare Blocks' }}
                                </button>
                            </div>

                        </div>


                    </div>

                    <!-- Meta + time pickers (same line) -->
                    <div class="trend-controls-row">
                        <small class="muted">
                            {{ trendLoading ? 'Loading…' : trendGranularityHint }}
                            <template v-if="!trendLoading && dateLabel"> • {{ dateLabel }}</template>
                        </small>

                        <div class="trend-pickers" style="gap:8px; flex-wrap:wrap">
                            <!-- Granularity -->
                            <select class="chip" v-model="trendGran" style="min-width:100px">
                                <option value="D">Day</option>
                                <option value="W">Week</option>
                                <option value="M">Month</option>
                                <option value="Y">Year</option>
                            </select>

                            <!-- Day: pick a date + hourly FROM/TO -->
                            <template v-if="trendGran === 'D'">
                                <input class="chip" type="date" v-model="trendDay" />
                                <input class="chip" type="time" step="3600" v-model="trendFromTime" />
                                <span class="muted">→</span>
                                <input class="chip" type="time" step="3600" v-model="trendToTime" />
                            </template>

                            <!-- Week: HTML week picker (YYYY-Www) -->
                            <input v-else-if="trendGran === 'W'" class="chip" type="week" v-model="trendWeek" />

                            <!-- Month: HTML month picker (YYYY-MM) -->
                            <input v-else-if="trendGran === 'M'" class="chip" type="month" v-model="trendMonth" />

                            <!-- Year: simple number field -->
                            <input v-else class="chip" type="number" step="1" min="2000" :max="new Date().getFullYear()"
                                v-model.number="trendYear" style="width:110px" />

                            <button class="chip" @click="applyGranularTrend"
                                :disabled="trendLoading || !canApplyGranular">
                                Apply
                            </button>
                        </div>

                    </div>

                    <div class="chart-wrap" v-if="trendLoading">Loading trend…</div>
                    <div class="chart-wrap" v-else>
                        <LineChartCard :key="'energy-trend'" :title="' '" :chartData="trendChartData"
                            :options="trendChartOptions" />
                    </div>
                </div>
                <div class="card chart-card" v-else>
                    <div class="card-header trend-row">
                        <h3>EV Charging Room Trend (kWh)</h3>
                    </div>

                    <div class="trend-controls-row">
                        <div class="trend-pickers" style="gap:8px; flex-wrap:wrap">
                            <!-- Granularity for EV -->
                            <select class="chip" v-model="evGran" style="min-width:100px">
                                <option value="D">Day</option>
                                <option value="W">Week</option>
                                <option value="M">Month</option>
                                <option value="Y">Year</option>
                            </select>

                            <!-- Day -->
                            <template v-if="evGran === 'D'">
                                <input type="date" class="chip" v-model="evTrendDate" />
                            </template>

                            <!-- Week: YYYY-Www -->
                            <input v-else-if="evGran === 'W'" type="week" class="chip" v-model="evTrendWeek" />

                            <!-- Month: YYYY-MM -->
                            <input v-else-if="evGran === 'M'" type="month" class="chip" v-model="evTrendMonth" />

                            <!-- Year: simple number -->
                            <input v-else type="number" class="chip" step="1" min="2000" :max="new Date().getFullYear()"
                                v-model.number="evTrendYear" style="width:110px" />

                            <!-- Apply button -->
                            <button class="chip" @click="applyEvTrend" :disabled="evTrendLoading">
                                Apply
                            </button>
                        </div>
                    </div>

                    <div class="chart-wrap" v-if="evTrendLoading">Loading EV trend…</div>
                    <div class="chart-wrap" v-else>
                        <LineChartCard :key="'ev-chart'" :title="' '" :chartData="evTrendChartData"
                            :options="evTrendChartOptions" />
                    </div>
                </div>


                <!-- Top Devices -->
                <div class="card chart-card">
                    <div class="card-header" style="gap:10px">
                        <h3>Top Devices by Energy</h3>
                        <select class="chip" v-model.number="topN" style="min-width:110px">
                            <option :value="5">Top 5</option>
                            <option :value="10">Top 10</option>
                            <option :value="15">Top 15</option>
                        </select>
                        <small v-if="topLoading" class="muted"> • Loading…</small>
                        <small v-else-if="topError" class="err"> • {{ topError }}</small>
                    </div>

                    <div class="chart-wrap" v-if="topLoading">Loading top devices…</div>
                    <div class="chart-wrap" v-else>
                        <BarChartCard :key="topBarKey" :title="' '" :chartData="topBarChartData"
                            :options="topBarOptions" />
                    </div>

                    <div class="table-wrap" style="margin-top:8px">
                        <table>
                            <thead>
                                <tr>
                                    <th @click="sortByTop('rank')" :class="sortClassTop('rank')">#</th>
                                    <th @click="sortByTop('name')" :class="sortClassTop('name')">Equipment</th>
                                    <th @click="sortByTop('block')" :class="sortClassTop('block')">Block</th>
                                    <th @click="sortByTop('level')" :class="sortClassTop('level')">Level</th>
                                    <th @click="sortByTop('kwh')" :class="sortClassTop('kwh')">kWh</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in topRowsSorted" :key="r.meter_key">
                                    <td>{{ r.rank }}</td>
                                    <td><code>{{ deviceName(r) }}</code></td>
                                    <td>{{ r.block || '-' }}</td>
                                    <td>{{ r.level || '-' }}</td>
                                    <td>{{ fmtNum(r.kwh) }}</td>
                                </tr>
                                <tr v-if="!topLoading && !topRowsSorted.length">
                                    <td colspan="5" class="muted">No data</td>
                                </tr>
                            </tbody>

                        </table>
                    </div>
                </div>
            </section>
        </template>

        <!-- ========================= FAULTS ========================= -->
        <template v-else-if="viewTab === 'Faults' && canSeeAdminViews">
            <section class="grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Active Energy Faults</h3>
                        <small v-if="faultsLoading">Loading…</small>
                        <small v-else class="muted"> {{ faults.length }} active</small>

                        <div style="margin-left:auto; display:flex; gap:8px; align-items:center;">
                            <small class="muted">Auto-refresh {{ faultsPollSeconds }}s</small>
                            <button class="chip" @click="loadFaults" :disabled="faultsLoading">Refresh</button>
                        </div>
                    </div>

                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Object Name</th>
                                    <th>Description</th>
                                    <th>Fault Reported At</th>
                                    <th>Last Seen</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="f in faults" :key="f.id">
                                    <td><code>{{ f.object_name }}</code></td>
                                    <td>{{ f.description || '—' }}</td>
                                    <td>{{ fmtDateTime(f.start_on) }}</td>
                                    <td>{{ fmtDateTime(f.last_seen) }}</td>
                                </tr>
                                <tr v-if="!faultsLoading && !faultsError && faults.length === 0">
                                    <td colspan="4" class="muted">No active faults.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </template>

        <!-- ========================= DEVICE LIST ========================= -->
        <template v-else-if="viewTab === 'Device List' && canSeeAdminViews">
            <section class="grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Devices — Overall</h3>
                        <small v-if="powerLoading">Loading…</small>
                        <small v-else-if="powerError" class="err">Error: {{ powerError }}</small>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Device ID</th>
                                    <th>Block</th>
                                    <th>Level</th>
                                    <th>Panels (in selection)</th>
                                    <th>Hour kWh</th>
                                    <th>Day kWh</th>
                                    <th>Meters (hour)</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in deviceListRows" :key="r.device_id">
                                    <td><code>{{ r.device_id }}</code></td>
                                    <td>{{ r.block || '-' }}</td>
                                    <td>{{ r.level || '-' }}</td>
                                    <td>{{ r.panels || '-' }}</td>
                                    <td>{{ fmtNum(r.hour_kwh) }}</td>
                                    <td>{{ fmtNum(r.day_kwh) }}</td>
                                    <td>{{ r.hour_meters ?? '-' }}</td>
                                    <td>
                                        <div class="action-cell">
                                            <select class="chip" :value="getSelectedPanelForDevice(r.device_id)"
                                                @change="setSelectedPanelForDevice(r.device_id, $event.target.value)"
                                                @focus="ensureDefaultPanelForDevice(r.device_id)"
                                                style="min-width: 180px">
                                                <option value="" disabled>Select panel</option>
                                                <option v-for="p in panelsForDevice(r.device_id)" :key="p" :value="p">
                                                    {{ p }}
                                                </option>
                                            </select>

                                            <button class="chip-sm" @click="onClickSetThresholdForDevice(r.device_id)"
                                                :disabled="!panelsForDevice(r.device_id).length">
                                                Set
                                            </button>

                                            <button class="chip-sm danger"
                                                @click="onClickDeleteThresholdForDevice(r.device_id)"
                                                :disabled="!panelsForDevice(r.device_id).length">
                                                Delete
                                            </button>
                                        </div>

                                        <small v-if="getSelectedPanelForDevice(r.device_id)" class="muted"
                                            style="display:block; margin-top:6px">
                                            <template
                                                v-if="panelHasExistingThreshold(getSelectedPanelForDevice(r.device_id))">
                                                Existing threshold found for
                                                <code>
      {{ objectNamesForPanel(getSelectedPanelForDevice(r.device_id)).join(', ') || '—' }}
    </code>
                                            </template>
                                            <template v-else>
                                                No threshold yet for
                                                <code>
      {{ objectNamesForPanel(getSelectedPanelForDevice(r.device_id)).join(', ') || '—' }}
    </code>
                                            </template>
                                        </small>

                                    </td>
                                </tr>
                                <tr v-if="!powerLoading && !deviceTableRows.length">
                                    <td colspan="7" class="muted">No device rows for this selection.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </template>
    </div>
    <!-- Download Options Modal -->
    <div v-if="showDownloadModal" class="modal-backdrop" @click.self="closeDownloadModal">
        <div class="modal">
            <h3 style="margin:0 0 8px">Export to Excel</h3>
            <p class="muted" style="margin-top:0">Choose what to include:</p>

            <label class="modal-check">
                <input type="checkbox" v-model="includeDeviceList" />
                <span>Device List</span>
            </label>

            <!-- Hourly options -->
            <label class="modal-check">
                <input type="checkbox" v-model="includeHourlyTrend" />
                <span>Hourly consumption trend</span>
            </label>

            <!-- Date mode selector (only if hourly trend is selected) -->
            <div v-if="includeHourlyTrend" class="modal-check" style="padding-left:28px; gap:10px;">
                <label style="min-width:120px;">Date mode</label>
                <select v-model="hourlyDateMode" class="chip" style="min-width:160px;">
                    <option value="single">Single day</option>
                    <option value="custom">Custom range</option>
                </select>
            </div>

            <!-- Single-day picker -->
            <div v-if="includeHourlyTrend && hourlyDateMode === 'single'" class="modal-check" style="padding-left:28px">
                <label style="display:flex; align-items:center; gap:10px;">
                    <span class="muted">Select date:</span>
                    <input type="date" v-model="hourlyExportDate" />
                </label>
            </div>

            <!-- Custom range pickers -->
            <div v-if="includeHourlyTrend && hourlyDateMode === 'custom'" class="modal-check"
                style="padding-left:28px; gap:16px; flex-wrap:wrap;">
                <label style="display:flex; align-items:center; gap:10px;">
                    <span class="muted">From:</span>
                    <input type="date" v-model="hourlyExportStart" />
                </label>
                <label style="display:flex; align-items:center; gap:10px;">
                    <span class="muted">To:</span>
                    <input type="date" v-model="hourlyExportEnd" />
                </label>
            </div>



            <label class="modal-check">
                <input type="checkbox" v-model="include7DaysTrend" />
                <span>7 days consumption trend</span>
            </label>

            <p v-if="downloadValidation" class="err" style="margin:8px 0 0">
                Please select at least one item to export.
            </p>

            <div class="modal-actions">
                <button class="chip" @click="closeDownloadModal">Cancel</button>
                <button class="chip" :disabled="exporting" @click="performDownload">
                    {{ exporting ? 'Preparing…' : 'Download' }}
                </button>
            </div>
        </div>
    </div>

    <!-- Energy Set/Edit Threshold Modal -->
    <div v-if="showEThresholdModal" class="modal-backdrop" @click.self="closeEnergyThresholdModal">
        <div class="modal">
            <h3 style="margin:0 0 8px">Energy Threshold</h3>
            <p class="muted" style="margin:0 0 8px">
                {{ eThresholdsMap[eEditTag] ? 'Update existing' : 'Create new' }} for
                <code>{{ eEditTag }}</code>
            </p>

            <div class="modal-check" style="gap:12px">
                <label style="min-width:120px">Min Value</label>
                <input type="number" step="any" v-model.number="eEditMin" />
            </div>
            <div class="modal-check" style="gap:12px">
                <label style="min-width:120px">Max Value</label>
                <input type="number" step="any" v-model.number="eEditMax" />
            </div>
            <div class="modal-check" style="gap:12px">
                <label style="min-width:120px">Enabled</label>
                <input type="checkbox" v-model="eEditEnabled" />
            </div>

            <p v-if="eSaveError" class="err" style="margin:6px 0 0">{{ eSaveError }}</p>

            <div class="modal-actions">
                <button class="chip" @click="closeEnergyThresholdModal">Cancel</button>
                <button class="chip" :disabled="eSaving" @click="saveEnergyThreshold">
                    <i v-if="eSaving" class="fas fa-spinner fa-spin"></i>
                    <template v-else>Save</template>
                </button>
            </div>
        </div>
    </div>

    <!-- Energy: Confirm Delete -->
    <div v-if="showEConfirmDelete" class="modal-backdrop" @click.self="cancelEnergyDelete">
        <div class="modal">
            <h3 style="margin:0 0 8px">Delete Threshold?</h3>
            <p class="muted" style="margin:0 0 8px">
                This will remove the threshold for
                <code style="font-weight:700">
                {{ (ePendingDelete?.targets || []).join(', ') }}
            </code>.
            </p>

            <p class="err" style="margin:0 0 12px">This action cannot be undone.</p>

            <div class="modal-actions">
                <button class="chip" @click="cancelEnergyDelete">Cancel</button>
                <button class="chip danger" :disabled="eDeleting" @click="confirmEnergyDeleteNow">
                    {{ eDeleting ? 'Deleting…' : 'Delete' }}
                </button>
            </div>
        </div>
    </div>

    <!-- Tiny success toast (shared) -->
    <div v-if="showSavedModal" class="modal-backdrop" @click.self="showSavedModal = false">
        <div class="modal">
            <h3 style="margin:0">Saved</h3>
            <p class="muted" style="margin:8px 0 0">Your changes were saved successfully.</p>
            <div class="modal-actions" style="justify-content:flex-end">
                <button class="chip" @click="showSavedModal = false">OK</button>
            </div>
        </div>
    </div>


</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, onBeforeUnmount } from 'vue'

import LineChartCard from '../components/LineChartCard.vue'
import BarChartCard from '../components/BarChartCard.vue'
import * as XLSX from 'xlsx' // npm i xlsx
import { getDate } from 'date-fns'

/** Endpoints */
const HIERARCHY_URL = 'http://127.0.0.1:8081/meta/hierarchy'
const HOUR_URL = 'http://127.0.0.1:8081/power/block-level/hour'
const DAY_URL = 'http://127.0.0.1:8081/power/block-level/day'
const DEV_HOUR_URL = 'http://127.0.0.1:8081/power/device/hour'
const DEV_DAY_URL = 'http://127.0.0.1:8081/power/device/day'
const METER_HOUR_URL = 'http://127.0.0.1:8081/power/meter/hour?limit=10000&offset=0'
const TREND_BASE_URL = 'http://127.0.0.1:8081/power/block-level/trend'

// New blocks-level trend endpoint (no levels)
const BLOCKS_TREND_URL = 'http://127.0.0.1:8081/power/blocks/trend'


/* Airside endpoints */
const AIR_BASE = 'http://127.0.0.1:8081/efficiency'
const AIR_HOUR_URL = `${AIR_BASE}/hour`
const AIR_DAY_URL = `${AIR_BASE}/day`
const AIR_BIZ_URL = `${AIR_BASE}/day/business`
const AIR_OFFPEAK_URL = `${AIR_BASE}/day/offpeak`

/* TOP DEVICES —— endpoint */
const TOP_BASE_URL = 'http://127.0.0.1:8081/power/top'

// ✅ ADD: per-block fallback (Top 5 each)
const TOP_FALLBACK_BY_BLOCK = {
    A: [
        { meter_key: 'A-mock-001', object_name: 'AHU-A-01', block: 'A', level: '02', kwh: 8420 },
        { meter_key: 'A-mock-002', object_name: 'CHWP-A-01', block: 'A', level: '03', kwh: 7900 },
        { meter_key: 'A-mock-003', object_name: 'FCU-A-02', block: 'A', level: '04', kwh: 7250 },
        { meter_key: 'A-mock-004', object_name: 'EXF-A-01', block: 'A', level: '05', kwh: 6810 },
        { meter_key: 'A-mock-005', object_name: 'DB-A-PANEL-1', block: 'A', level: '01', kwh: 6420 },
    ],
    B: [
        { meter_key: 'B-mock-001', object_name: 'CTF-B-01', block: 'B', level: '05', kwh: 7350 },
        { meter_key: 'B-mock-002', object_name: 'FCU-B-2-1', block: 'B', level: '04', kwh: 6820 },
        { meter_key: 'B-mock-003', object_name: 'AHU-B-02', block: 'B', level: '06', kwh: 6410 },
        { meter_key: 'B-mock-004', object_name: 'EXF-B-02', block: 'B', level: '07', kwh: 6030 },
        { meter_key: 'B-mock-005', object_name: 'UPS-B-01', block: 'B', level: '01', kwh: 5580 },
    ],
    C: [
        { meter_key: 'C-mock-001', object_name: 'FCU-C-2-2', block: 'C', level: '04', kwh: 6390 },
        { meter_key: 'C-mock-002', object_name: 'AHU-C-02-EAST', block: 'C', level: '06', kwh: 6100 },
        { meter_key: 'C-mock-003', object_name: 'CHWP-C-01', block: 'C', level: '03', kwh: 5790 },
        { meter_key: 'C-mock-004', object_name: 'DB-C-PANEL-3', block: 'C', level: '02', kwh: 5410 },
        { meter_key: 'C-mock-005', object_name: 'EXF-C-01', block: 'C', level: '07', kwh: 5120 },
    ],
    D: [
        { meter_key: 'D-mock-001', object_name: 'LCP-D-L1', block: 'D', level: '01', kwh: 5750 },
        { meter_key: 'D-mock-002', object_name: 'EXF-D-01', block: 'D', level: '07', kwh: 5440 },
        { meter_key: 'D-mock-003', object_name: 'AHU-D-01', block: 'D', level: '02', kwh: 5190 },
        { meter_key: 'D-mock-004', object_name: 'FCU-D-01', block: 'D', level: '04', kwh: 4970 },
        { meter_key: 'D-mock-005', object_name: 'UPS-D-01', block: 'D', level: '01', kwh: 4630 },
    ],
    E: [
        { meter_key: 'E-mock-001', object_name: 'AHU-E-01', block: 'E', level: '02', kwh: 6200 },
        { meter_key: 'E-mock-002', object_name: 'FCU-E-01', block: 'E', level: '03', kwh: 5840 },
        { meter_key: 'E-mock-003', object_name: 'EXF-E-01', block: 'E', level: '05', kwh: 5520 },
        { meter_key: 'E-mock-004', object_name: 'DB-E-PANEL-1', block: 'E', level: '01', kwh: 5190 },
        { meter_key: 'E-mock-005', object_name: 'UPS-E-01', block: 'E', level: '01', kwh: 4870 },
    ],
    F: [
        { meter_key: 'F-mock-001', object_name: 'AHU-F-01', block: 'F', level: '02', kwh: 5980 },
        { meter_key: 'F-mock-002', object_name: 'FCU-F-01', block: 'F', level: '04', kwh: 5660 },
        { meter_key: 'F-mock-003', object_name: 'EXF-F-01', block: 'F', level: '07', kwh: 5310 },
        { meter_key: 'F-mock-004', object_name: 'DB-F-PANEL-2', block: 'F', level: '02', kwh: 4980 },
        { meter_key: 'F-mock-005', object_name: 'UPS-F-01', block: 'F', level: '01', kwh: 4720 },
    ],
    G: [
        { meter_key: 'G-mock-001', object_name: 'AHU-G-01', block: 'G', level: '03', kwh: 5770 },
        { meter_key: 'G-mock-002', object_name: 'FCU-G-01', block: 'G', level: '04', kwh: 5480 },
        { meter_key: 'G-mock-003', object_name: 'EXF-G-01', block: 'G', level: '06', kwh: 5120 },
        { meter_key: 'G-mock-004', object_name: 'DB-G-PANEL-1', block: 'G', level: '02', kwh: 4860 },
        { meter_key: 'G-mock-005', object_name: 'UPS-G-01', block: 'G', level: '01', kwh: 4510 },
    ],
    H: [
        { meter_key: 'H-mock-001', object_name: 'AHU-H-01', block: 'H', level: '02', kwh: 5610 },
        { meter_key: 'H-mock-002', object_name: 'FCU-H-01', block: 'H', level: '05', kwh: 5330 },
        { meter_key: 'H-mock-003', object_name: 'EXF-H-01', block: 'H', level: '07', kwh: 5010 },
        { meter_key: 'H-mock-004', object_name: 'DB-H-PANEL-3', block: 'H', level: '02', kwh: 4720 },
        { meter_key: 'H-mock-005', object_name: 'UPS-H-01', block: 'H', level: '01', kwh: 4390 },
    ],
    J: [
        { meter_key: 'J-mock-001', object_name: 'DB-J-PANEL-3', block: 'J', level: '02', kwh: 5120 },
        { meter_key: 'J-mock-002', object_name: 'UPS-J-01', block: 'J', level: '01', kwh: 4880 },
        { meter_key: 'J-mock-003', object_name: 'AHU-J-01', block: 'J', level: '03', kwh: 4510 },
        { meter_key: 'J-mock-004', object_name: 'EXF-J-01', block: 'J', level: '05', kwh: 4270 },
        { meter_key: 'J-mock-005', object_name: 'FCU-J-01', block: 'J', level: '04', kwh: 3990 },
    ],
    K: [
        { meter_key: 'K-mock-001', object_name: 'AHU-K-01', block: 'K', level: '02', kwh: 5460 },
        { meter_key: 'K-mock-002', object_name: 'FCU-K-01', block: 'K', level: '04', kwh: 5180 },
        { meter_key: 'K-mock-003', object_name: 'EXF-K-01', block: 'K', level: '06', kwh: 4870 },
        { meter_key: 'K-mock-004', object_name: 'DB-K-PANEL-1', block: 'K', level: '01', kwh: 4590 },
        { meter_key: 'K-mock-005', object_name: 'UPS-K-01', block: 'K', level: '01', kwh: 4230 },
    ],
}

// helper
function topFallbackRowsFor(blockOrOverall, n = 5) {
    const key = String(blockOrOverall || '').toUpperCase()
    if (key && TOP_FALLBACK_BY_BLOCK[key]) return TOP_FALLBACK_BY_BLOCK[key].slice(0, n)

    // Overall = combine all blocks then take top N
    const combined = Object.values(TOP_FALLBACK_BY_BLOCK).flat()
    return combined.sort((a, b) => (b.kwh || 0) - (a.kwh || 0)).slice(0, n)
}

// ✅ ADD: device list fallback derived from TOP_FALLBACK_BY_BLOCK
const DEVICE_LIST_FALLBACK_ROWS = Object.values(TOP_FALLBACK_BY_BLOCK)
    .flat()
    .map(r => ({
        device_id: r.meter_key,     // device list expects device_id
        block: r.block,
        level: r.level,
        panels: '-',                // no panel mapping in mock
        hour_kwh: r.kwh,            // mock: reuse kwh
        day_kwh: r.kwh,             // mock: reuse kwh
        hour_meters: '-',           // mock
    }))

/* ========================= FAULTS ========================= */
const FAULTS_URL = 'http://localhost:8084/faults/energy/active'

/* ---- NEW: EUI + Waterside + Month/Annual totals ---- */
const EUI_DENOMINATOR = 192820

// Waterside endpoints (mirror Airside pattern; adjust if your API differs)
const WATER_BASE = 'http://127.0.0.1:8081/efficiency/waterside'
const WATER_HOUR_URL = `${WATER_BASE}/hour`
const WATER_DAY_URL = `${WATER_BASE}/day`

const waterMode = ref('hour')        // 'hour' | 'day'
const waterLoading = ref(false)
const waterError = ref(null)
const waterNow = ref({ ts: null, kw_per_rt: null })

/* =========================================================
   CHILLER — status/efficiency cards + TSE (kW/RT) combo
========================================================= */
const CHILLER_POINTS_URL = 'http://localhost:8082/points/latest?limit=500&offset=0'
const chillerLoading = ref(false), chillerError = ref(null), chillerPoints = ref([])

/* Granularity & pickers */
const trendGran = ref('D'); // 'D'|'W'|'M'|'Y'

const trendDay = ref(ymdFrom(fixedToday()));
const trendFromTime = ref('00:00');
const trendToTime = ref('23:59'); // so 23:00 samples aren’t clipped


const trendWeek = ref(getCurrentISOWeek(fixedToday()));
const trendMonth = ref(ymdFrom(fixedToday()).slice(0, 7));
const trendYear = ref(fixedToday().getFullYear());

// ---- Month/Year compare APIs ----
const POWER_MONTH_URL = 'http://127.0.0.1:8081/power/block-level/month'
const POWER_YEAR_URL = 'http://127.0.0.1:8081/power/block-level/year'

// Download modal: date mode for hourly trend
const hourlyDateMode = ref('single') // 'single' | 'custom'
const hourlyExportStart = ref(new Date().toISOString().slice(0, 10))
const hourlyExportEnd = ref(new Date().toISOString().slice(0, 10))

// Force "today" to Dec 8 of the current year
function fixedToday() {
    const now = new Date()
    return new Date(now.getFullYear(), 11, 9, 0, 0, 0) // month 11 = Dec
}

function ymdFrom(d) {
    return d.toISOString().slice(0, 10)
}


// Build local ISO with seconds (no timezone conversion)
function toISOsec(dt) {
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    const hh = String(dt.getHours()).padStart(2, '0')
    const mm = String(dt.getMinutes()).padStart(2, '0')
    const ss = String(dt.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}`
}

// Start of current month (local)
function monthStartFn() {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
}

// Generic: sum all kWh in /power/blocks/trend for given block scope
async function fetchBlocksMonthTotal(scopeBlock = 'Overall') {
    const start = monthStartFn()
    const end = new Date() // now; you can clamp to end of day if you want

    const params = new URLSearchParams({
        start: toISOsec(start),
        end: toISOsec(end),
    })

    const resp = await fetch(`${BLOCKS_TREND_URL}?${params.toString()}`, {
        cache: 'no-cache',
    })
    if (!resp.ok) throw new Error('HTTP ' + resp.status)

    const body = await resp.json()
    const series = Array.isArray(body?.series) ? body.series : []

    const want = String(scopeBlock || 'Overall').toUpperCase()
    let total = 0

    for (const s of series) {
        const key = String(s.key || '').toUpperCase()

        // If a specific block is selected, skip others
        if (want !== 'OVERALL' && key !== want) continue

        for (const pt of (s.points || [])) {
            total += Number(pt.kwh || 0)
        }
    }

    return total
}

// ✅ ADD: fallback faults (shows when API has no data)
const FAULTS_FALLBACK = [
    {
        id: 'mock-fault-001',
        object_name: 'AHU-A-01',
        description: 'Energy threshold exceeded (kW/RT above max).',
        start_on: '2025-12-08T09:12:00',
        last_seen: '2025-12-08T09:18:00',
    },
    {
        id: 'mock-fault-002',
        object_name: 'CHWP-C-01',
        description: 'Abnormal energy spike detected (sudden jump in kWh).',
        start_on: '2025-12-08T11:40:00',
        last_seen: '2025-12-08T11:45:00',
    },
    {
        id: 'mock-fault-003',
        object_name: 'UPS-J-01',
        description: 'Energy meter not updating (stale readings).',
        start_on: '2025-12-08T14:05:00',
        last_seen: '2025-12-08T14:15:00',
    },
    {
        id: 'mock-fault-004',
        object_name: 'FCU-F-01',
        description: 'Efficiency drop detected (higher kWh than expected).',
        start_on: '2025-12-08T16:20:00',
        last_seen: '2025-12-08T16:28:00',
    },
    {
        id: 'mock-fault-005',
        object_name: 'EXF-H-01',
        description: 'Potential schedule issue (running during off-peak).',
        start_on: '2025-12-08T23:10:00',
        last_seen: '2025-12-08T23:18:00',
    },
]


const periodModeLabel = computed(() => {
    if (periodMode.value === 'overall') return 'Overall (00:00–24:00)'
    if (periodMode.value === 'business') return 'Business (7am–6pm)'
    if (periodMode.value === 'offpeak1') return 'Off-peak 1 (6pm–11pm)'
    if (periodMode.value === 'offpeak2') return 'Off-peak 2 (11pm–7am)'
    return ''
})

function dayOfYear(d = new Date()) {
    const start = new Date(d.getFullYear(), 0, 1);
    start.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000) + 1; // 1..365
    return Math.min(365, Math.max(1, diffDays));
}

function periodWindowsForDay(period, anchorDate) {
    const y = anchorDate.getFullYear(), m = anchorDate.getMonth() + 1, d = anchorDate.getDate();
    // Helpers that include seconds so 23:00 entries are kept
    const d000000 = atHM(y, m, d, 0, 0, 0);
    const d070000 = atHM(y, m, d, 7, 0, 0);
    const d180000 = atHM(y, m, d, 18, 0, 0);
    const d230000 = atHM(y, m, d, 23, 0, 0);
    const d235959 = atHM(y, m, d, 23, 59, 59);

    if (period === 'business') return [{ start: d070000, end: d180000 }];
    if (period === 'offpeak1') return [{ start: d180000, end: d235959 }];

    if (period === 'offpeak2') {
        // Off-peak 2 spans two slices for a given calendar day:
        // 00:00–07:00 (belongs to previous day's Off-peak 2), and 23:00–23:59 of this day.
        return [
            { start: d000000, end: d070000 },
            { start: d230000, end: d235959 },
        ];
    }

    // Fallback: no filtering
    return [{ start: d000000, end: d235959 }];
}
// --- EV Charging Room (Energy Node 1) ---
// API: http://localhost:8086/api/range?deviceName=Energy%20Node%201&start=YYYY-MM-DD&end=YYYY-MM-DD

const EV_API_BASE = 'http://localhost:8086/api/range'

const evDayTotalPower = ref(0)
const evMonthTotalPower = ref(0)
const evLoading = ref(false)
const evError = ref(null)

function ymd(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
}

async function fetchEvRangeTotal(startYmd, endYmd) {
    const params = new URLSearchParams({
        deviceName: 'Energy Node 1',
        start: startYmd,
        end: endYmd,
    })

    const resp = await fetch(`${EV_API_BASE}?${params.toString()}`, {
        cache: 'no-cache',
    })
    if (!resp.ok) throw new Error('HTTP ' + resp.status)

    const body = await resp.json()
    const rows = Array.isArray(body) ? body : []

    let total = 0
    for (const r of rows) {
        total += Number(r.totalPower ?? 0) // <-- use totalPower from your response
    }
    return total
}

async function loadEvTotals() {
    evLoading.value = true
    evError.value = null
    try {
        const now = fixedToday()
        // Daily: today 00:00 to tomorrow 00:00
        const dayStartYmd = ymd(now)
        const dayEndYmd = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))

        // Monthly: 1st of this month to 1st of next month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        const monthStartYmd = ymd(monthStart)
        const monthEndYmd = ymd(monthEnd)

        const [dayTotal, monthTotal] = await Promise.all([
            fetchEvRangeTotal(dayStartYmd, dayEndYmd),
            fetchEvRangeTotal(monthStartYmd, monthEndYmd),
        ])

        evDayTotalPower.value = dayTotal
        evMonthTotalPower.value = monthTotal
    } catch (e) {
        console.error('EV totals failed:', e)
        evError.value = e?.message ?? 'Failed to load EV totals'
        evDayTotalPower.value = 0
        evMonthTotalPower.value = 0
    } finally {
        evLoading.value = false
    }
}

const dayTotalKwhSelected = ref(0)

async function refreshDayTotalSelected() {
    const dateStr = trendDay.value // YYYY-MM-DD from the chart picker
    if (!dateStr) { dayTotalKwhSelected.value = 0; return }

    // full-day window: [00:00, next day 00:00)
    const startIso = `${dateStr}T00:00:00`
    const end = new Date(`${dateStr}T00:00:00`)
    end.setDate(end.getDate() + 1)
    const endIso = toISOsec(end)

    // reuse your existing blocks-trend loader logic, but sum instead of plotting
    const params = new URLSearchParams({ start: startIso, end: endIso })
    const resp = await fetch(`${BLOCKS_TREND_URL}?${params.toString()}`, { cache: 'no-cache' })
    if (!resp.ok) { dayTotalKwhSelected.value = 0; return }

    const body = await resp.json()
    const series = Array.isArray(body?.series) ? body.series : []

    const scopeBlock = String(currentTab.value || '').toUpperCase()
    let total = 0

    for (const s of series) {
        const blockKey = String(s.key || '').toUpperCase()
        if (scopeBlock !== 'OVERALL' && blockKey !== scopeBlock) continue

        for (const pt of (s.points || [])) {
            total += Number(pt.kwh || 0)   // <-- sum every hour
        }
    }

    dayTotalKwhSelected.value = total
}


const dayKpiKwh = computed(() => {
    const base = Number(dayTotalKwhSelected.value || 0)
    const ev = evDayTotalPower.value || 0

    if (currentTab.value === 'EV') return ev
    return base
})


const monthKpiKwh = computed(() => {
    const base = Number(monthTotalKwh.value || 0);
    const ev = evMonthTotalPower.value || 0;

    if (currentTab.value === 'EV') return ev;
    if (currentTab.value === 'Overall') return base;
    return base;
});


function filterByWindows(labels, windows) {
    return labels.filter(iso => {
        const t = new Date(iso).getTime();
        return windows.some(w => t >= w.start.getTime() && t <= w.end.getTime());
    });
}


function todayMidnight() {
    const d = fixedToday()
    d.setHours(0, 0, 0, 0)
    return d
}

function tomorrowMidnightFixed() {
    const d = fixedToday()
    d.setDate(d.getDate() + 1)
    return d
}


// ---- Weekly debug switch + helper ----
const DEBUG_WEEK = true;
const dbgW = (...a) => { if (DEBUG_WEEK) console.log('%c[WEEK]', 'color:#10b981', ...a); };

// Remember the user’s last non-Overall scope so we can restore it
const prevScope = reactive({ tab: null, level: null })

watch(trendGran, (g) => {
    if (g === 'D') {
        // Restore the user’s previous scope (if any)
        if (prevScope.tab !== null) { currentTab.value = prevScope.tab; prevScope.tab = null }
        if (prevScope.level !== null) { currentLevel.value = prevScope.level; prevScope.level = null }
    } else {
        // Stash current scope once, then force Overall for W/M/Y
        if (prevScope.tab === null) prevScope.tab = currentTab.value
        if (prevScope.level === null) prevScope.level = currentLevel.value
        if (currentTab.value !== 'Overall') currentTab.value = 'Overall'
        if (currentLevel.value !== 'Overall') currentLevel.value = 'Overall'
    }
    // Auto-apply the new granularity + scope (no button click)
    applyGranularTrend()
})
function filterRowsForScope(rows) {
    const blk = String(currentTab.value || '').toUpperCase();
    const lvl = String(currentLevel.value || '');
    let arr = Array.isArray(rows) ? rows : [];
    if (currentTab.value !== 'Overall') {
        arr = arr.filter(r => String(r.block || '').toUpperCase() === blk);
    }
    if (currentTab.value !== 'Overall' && currentLevel.value !== 'Overall') {
        arr = arr.filter(r => String(r.level || r.level_label || '') === lvl);
    }
    return arr;
}
const sumKwh = (rows) => (rows || []).reduce((a, r) => a + (Number(r.kwh || r.kw || 0)), 0);

function monthPrevStr(mm) {
    const [y, m] = String(mm).split('-').map(Number);
    const d = new Date(y, (m || 1) - 2, 1);
    const yy = d.getFullYear(), mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${yy}-${mo}`;
}

async function fetchMonthTotal(monthStr) {
    const url = `${POWER_MONTH_URL}?month=${encodeURIComponent(monthStr)}`;
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const body = await r.json();
    const inScope = filterRowsForScope(body?.rows || []);
    return inScope.length ? sumKwh(inScope) : Number(body?.total_kwh || 0);
}
async function fetchYearTotal(yearVal) {
    const url = `${POWER_YEAR_URL}?year=${encodeURIComponent(yearVal)}`;
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const body = await r.json();
    const inScope = filterRowsForScope(body?.rows || []);
    return inScope.length ? sumKwh(inScope) : Number(body?.total_kwh || 0);
}

async function loadMonthCompare() {
    trendLoading.value = true; trendError.value = null;
    try {
        const curMonth = trendMonth.value || new Date().toISOString().slice(0, 7);
        const prevMonth = monthPrevStr(curMonth);
        const [prevTotal, curTotal] = await Promise.all([fetchMonthTotal(prevMonth), fetchMonthTotal(curMonth)]);
        trendCompare.value = { labels: ['Last Month', 'This Month'], datasets: [{ label: 'kWh', data: [prevTotal, curTotal] }] };
        trendSeries.value = { labels: ['Last Month', 'This Month'], data: [prevTotal, curTotal] };
    } catch (e) {
        trendError.value = e?.message ?? 'Month compare failed';
        trendCompare.value = null; trendSeries.value = { labels: [], data: [] };
    } finally { trendLoading.value = false; }
}

async function loadYearCompare() {
    trendLoading.value = true; trendError.value = null;
    try {
        const thisYear = Number(trendYear.value || new Date().getFullYear());
        const lastYear = thisYear - 1;
        const [prevTotal, curTotal] = await Promise.all([fetchYearTotal(lastYear), fetchYearTotal(thisYear)]);
        trendCompare.value = { labels: ['Last Year', 'This Year'], datasets: [{ label: 'kWh', data: [prevTotal, curTotal] }] };
        trendSeries.value = { labels: ['Last Year', 'This Year'], data: [prevTotal, curTotal] };
    } catch (e) {
        trendError.value = e?.message ?? 'Year compare failed';
        trendCompare.value = null; trendSeries.value = { labels: [], data: [] };
    } finally { trendLoading.value = false; }
}


/* Can-apply guard per granularity */
const canApplyGranular = computed(() => {
    if (trendGran.value === 'D') return !!trendDay.value && !!trendFromTime.value && !!trendToTime.value;
    if (trendGran.value === 'W') return !!trendWeek.value;
    if (trendGran.value === 'M') return !!trendMonth.value;
    return Number.isFinite(trendYear.value);
});

/* Build [startIso, endIso] for D/W/M/Y and pipe to existing flow */
function applyGranularTrend() {
    const { startIso, endIso } = rangeFromGranularity();
    if (!startIso || !endIso) return;
    // Reuse your existing pathway:
    trendStartLocal.value = startIso; // existing refs
    trendEndLocal.value = endIso;     // existing refs
    applyTrend();                     // calls your loader and resets compare view
}

function hasHierarchy() {
    return Object.keys(hierarchy.value?.by_block_level || {}).length > 0;
}


// NEW: always-sum across ALL blocks/levels (ignores currentTab/currentLevel)
// Helper: always sum ALL blocks/levels (ignores currentTab/currentLevel)
async function sumTrendOverallRange(startDate, endDate) {
    const startIso = toISOsec(startDate), endIso = toISOsec(endDate)
    const pairs = allBlockLevelPairs()   // ← every {block,level}
    if (!pairs.length) return 0

    const payloads = await Promise.all(
        pairs.map(p => fetchTrendForOne(p.block, p.level, startIso, endIso))
    )

    let total = 0
    for (const pl of payloads) {
        for (const s of (pl?.series || [])) {
            for (const pt of (s.points || [])) total += Number(pt.kwh || 0)
        }
    }
    return total
}

// Replace these two functions
async function refreshMonthTotal() {
    try {
        // KPI should follow the current block tab:
        //   - Overall tab → sum all blocks
        //   - Block A tab → only A
        //   - Block BD tab → only BD, etc.
        const blockScope = currentTab.value || 'Overall'
        monthTotalKwh.value = await fetchBlocksMonthTotal(blockScope)
    } catch (e) {
        console.error('Failed to refresh month total from /power/blocks/trend:', e)
        monthTotalKwh.value = 0
    }
}


async function refreshAnnualTotal() {
    if (!hasHierarchy()) return
    annualTotalKwh.value = await sumTrendOverallRange(yearStartFn(), new Date())
}

// You can keep this one as-is; it doesn't affect EUI.
async function refreshMonthDaysWithData() {
    monthDataDays.value = new Date().getDate()
}



/* Range builders */
function rangeFromGranularity() {
    if (trendGran.value === 'D') {
        const day = new Date(trendDay.value)
        const today = fixedToday()

        let endTime = trendToTime.value

        // If selected day is today → clamp
        if (
            day.getFullYear() === today.getFullYear() &&
            day.getMonth() === today.getMonth() &&
            day.getDate() === today.getDate()
        ) {
            endTime = '23:00' // or current hour if you want
        }

        const s = combineDateTime(trendDay.value, trendFromTime.value)
        const e = combineDateTime(trendDay.value, endTime)

        return {
            startIso: toIsoWithSeconds(s),
            endIso: toIsoWithSeconds(e)
        }
    }

    if (trendGran.value === 'W') {
        const { start, end } = weekBounds(trendWeek.value);
        return { startIso: toIsoWithSeconds(start), endIso: toIsoWithSeconds(end) };
    }
    if (trendGran.value === 'M') {
        const { start, end } = monthBounds(trendMonth.value);
        return { startIso: toIsoWithSeconds(start), endIso: toIsoWithSeconds(end) };
    }
    const { start, end } = yearBounds(trendYear.value);
    return { startIso: toIsoWithSeconds(start), endIso: toIsoWithSeconds(end) };
}


function combineDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return '';
    // local ISO WITHOUT converting to UTC
    return `${dateStr}T${timeStr}:00`;
}



function getCurrentISOWeek(dateObj = new Date()) {
    const d = new Date(dateObj)
    const oneJan = new Date(d.getFullYear(), 0, 1)
    const day = Math.floor((d - oneJan) / 86400000) + 1
    const week = Math.ceil((day + oneJan.getDay()) / 7)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-W${pad(week)}`
}

function weekBounds(weekStr) {
    // 'YYYY-Www' -> Monday 00:00 local to next Monday 00:00
    const m = /^(\d{4})-W(\d{2})$/.exec(String(weekStr || ''));
    if (!m) return { start: '', end: '' };
    const year = Number(m[1]), wk = Number(m[2]);
    // ISO week: find Thursday of week 1 then move
    const jan4 = new Date(year, 0, 4);
    const jan4Dow = (jan4.getDay() || 7); // 1..7
    const week1Mon = new Date(jan4); week1Mon.setDate(jan4.getDate() - (jan4Dow - 1));
    const start = new Date(week1Mon); start.setDate(week1Mon.getDate() + (wk - 1) * 7);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    return { start, end };
}
function monthBounds(monthStr) {
    // 'YYYY-MM' -> first day 00:00 to first day of next month 00:00
    const [y, m] = String(monthStr || '').split('-').map(Number);
    if (!y || !m) return { start: '', end: '' };
    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 1, 0, 0, 0, 0);
    return { start, end };
}
function yearBounds(yearVal) {
    const y = Number(yearVal);
    if (!Number.isFinite(y)) return { start: '', end: '' };
    const start = new Date(y, 0, 1, 0, 0, 0, 0);
    const end = new Date(y + 1, 0, 1, 0, 0, 0, 0);
    return { start, end };
}

/* ===== Display aggregation for D/W/M/Y on the chart ===== */
const displaySeries = computed(() => {
    if (compareView.value) {
        return { labels: blocksCompare.value.labels, data: blocksCompare.value.data };
    }

    const labels = trendSeries.value.labels || [];
    const data = trendSeries.value.data || [];

    if (trendGran.value === 'D') return { labels, data };

    // Aggregate: daily for W/M, monthly for Y
    const bucket = new Map();
    const keyOf = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d)) return null;
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0');
        if (trendGran.value === 'Y') return `${y}-${m}-01T00:00:00`;
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}T00:00:00`;
    };
    for (let i = 0; i < labels.length; i++) {
        const k = keyOf(labels[i]); if (!k) continue;
        bucket.set(k, (bucket.get(k) || 0) + Number(data[i] || 0));
    }

    // WEEK: Mon..today (no future)
    if (trendGran.value === 'W') {
        const { start, end } = weekBounds(trendWeek.value);
        const hardEnd = new Date(
            Math.min(end.getTime(), tomorrowMidnightFixed().getTime())
        )
        const out = [];
        const cur = new Date(start);
        const pad = (n) => String(n).padStart(2, '0');
        while (cur < hardEnd) {
            const y = cur.getFullYear(), m = pad(cur.getMonth() + 1), d = pad(cur.getDate());
            out.push(`${y}-${m}-${d}T00:00:00`);
            cur.setDate(cur.getDate() + 1);
        }
        return { labels: out, data: out.map(k => bucket.get(k) || 0) };
    }

    // MONTH/YEAR: remove future anchors
    let outLabels = Array.from(bucket.keys()).sort();
    const tMid = todayMidnight();
    outLabels = outLabels.filter(k => new Date(k) <= tMid);
    return { labels: outLabels, data: outLabels.map(k => bucket.get(k) || 0) };
});



function normalizeName(s) {
    return String(s || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}
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
    } catch (e) {
        chillerError.value = e?.message ?? 'Failed to load chiller points'
        chillerPoints.value = []
    } finally { chillerLoading.value = false }
}


function toggleWaterMode() { waterMode.value = waterMode.value === 'hour' ? 'day' : 'hour' }

const totalSystemEfficiencyPt = computed(() =>
    getPointByName('Total System Efficiency') ||
    getPointByName('Total_System_Efficiency') ||
    getPointByName('Total-System-Efficiency') ||
    getPointByName('TSE') ||
    getPointByName('Total System Efficiency (kW/RT)')
)
const waterKwPerRt = computed(() => Number(totalSystemEfficiencyPt.value?.value ?? 0))
const waterTs = computed(() => totalSystemEfficiencyPt.value?.ts || null)


async function loadWaterLatest() {
    waterLoading.value = true; waterError.value = null
    try {
        const url = waterMode.value === 'hour' ? WATER_HOUR_URL : WATER_DAY_URL
        const r = await fetch(url, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        const pick = Array.isArray(b)
            ? [...b].sort((a, c) => new Date(a.ts) - new Date(c.ts)).at(-1) ?? {}
            : (b ?? {})
        waterNow.value = { ts: pick.ts ?? null, kw_per_rt: Number(pick.kw_per_rt ?? 0) }
    } catch (e) {
        waterError.value = e?.message ?? 'Load failed'
        waterNow.value = { ts: null, kw_per_rt: 0 }
    } finally { waterLoading.value = false }
}
watch(waterMode, loadWaterLatest)

// Month/Annual totals via trend summation (selection-aware)
const monthTotalKwh = ref(0)
const annualTotalKwh = ref(0)

const dayTotalKwhFixed = ref(0)

async function refreshDayTotalFixed() {
    if (!hasHierarchy()) return
    // fixedToday() already returns 2024-12-08T00:00:00
    const start = new Date(fixedToday())
    start.setHours(0, 0, 0, 0)

    const end = new Date(fixedToday())
    end.setDate(end.getDate() + 1)
    end.setHours(0, 0, 0, 0)

    dayTotalKwhFixed.value = await sumTrendForSelectionRange(start, end)
}


function yearStartFn() { const d = new Date(); d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d }
const monthStart = computed(() => monthStartFn())

async function sumTrendForSelectionRange(startDate, endDate) {
    const startIso = toISOsec(startDate), endIso = toISOsec(endDate)
    let pairs = []
    if (currentTab.value === 'Overall') pairs = allBlockLevelPairs()
    else if (currentLevel.value === 'Overall') pairs = blockAllLevels(currentTab.value)
    else pairs = [{ block: currentTab.value, level: currentLevel.value }]

    if (!pairs.length) return 0

    const payloads = await Promise.all(pairs.map(p => fetchTrendForOne(p.block, p.level, startIso, endIso)))
    let total = 0
    for (const pl of payloads) {
        for (const s of (pl?.series || [])) {
            for (const pt of (s.points || [])) total += Number(pt.kwh || 0)
        }
    }
    return total
}

// TSE (kW/RT) & EUI (kWh/m²)
// OLD: const tseNow = computed(() => Number(airNow.value.kw_per_rt || 0) + Number(waterNow.value.kw_per_rt || 0))
const tseNow = computed(() => Number(airNow.value.kw_per_rt || 0) + Number(waterKwPerRt.value || 0))

const monthDataDays = ref(0); // x

function ymdLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

async function countMonthDataDays() {
    const startDate = monthStartFn();     // local month start
    const endDate = new Date();         // now
    const startIso = toISOsec(startDate);
    const endIso = toISOsec(endDate);

    let pairs = [];
    if (currentTab.value === 'Overall') pairs = allBlockLevelPairs();
    else if (currentLevel.value === 'Overall') pairs = blockAllLevels(currentTab.value);
    else pairs = [{ block: currentTab.value, level: currentLevel.value }];

    if (!pairs.length) return 0;

    const payloads = await Promise.all(
        pairs.map(p => fetchTrendForOne(p.block, p.level, startIso, endIso))
    );

    const days = new Set();
    for (const pl of payloads) {
        for (const s of (pl?.series || [])) {
            for (const pt of (s.points || [])) {
                const d = new Date(pt.ts);              // parse
                if (!Number.isNaN(d)) days.add(ymdLocal(d)); // use LOCAL y-m-d
            }
        }
    }
    return days.size;
}


// NEW: year-scoped days-with-data
const yearDataDays = ref(0)

async function countDataDaysInRange(startDate, endDate) {
    const startIso = toISOsec(startDate), endIso = toISOsec(endDate)

    // reuse your selection scoping
    let pairs = []
    if (currentTab.value === 'Overall') pairs = allBlockLevelPairs()
    else if (currentLevel.value === 'Overall') pairs = blockAllLevels(currentTab.value)
    else pairs = [{ block: currentTab.value, level: currentLevel.value }]

    if (!pairs.length) return 0

    const payloads = await Promise.all(
        pairs.map(p => fetchTrendForOne(p.block, p.level, startIso, endIso))
    )

    const days = new Set()
    for (const pl of payloads) {
        for (const s of (pl?.series || [])) {
            for (const pt of (s.points || [])) {
                const iso = String(pt.ts || '')
                if (iso.length >= 10) days.add(iso.slice(0, 10)) // YYYY-MM-DD
            }
        }
    }
    return days.size
}



const euiNow = ref(0)
const euiReady = ref(false) // gates recomputation so we don't recalc too early

function daysInYear(y) {
    return ((y % 4 === 0) && (y % 100 !== 0)) || (y % 400 === 0) ? 366 : 365;
}

function recomputeEui() {
    if (!euiReady.value) return

    const kwhSoFar = Number(annualTotalKwh?.value ?? 0) // your YTD kWh
    const today = new Date()
    const daysPassedThisMonth = today.getDate() // 1..31

    const projectedAnnualKwh = ((365 - daysPassedThisMonth) * 40000) + monthTotalKwh.value
    const v = projectedAnnualKwh / EUI_DENOMINATOR

    euiNow.value = Number.isFinite(v) ? v : 0

    console.log(monthTotalKwh.value)
    console.log(daysPassedThisMonth)
    console.log(projectedAnnualKwh)
    console.log(EUI_DENOMINATOR)
    console.log(euiNow)
}



watch(annualTotalKwh, () => {
    if (euiReady.value) recomputeEui()
})

// Resolve object_names for a given panel from hierarchy.by_panel
function objectNamesForPanel(panelName) {
    const arr = hierarchy.value?.by_panel?.[panelName]?.object_names
    return Array.isArray(arr) ? arr.filter(Boolean) : []
}

// Track all target object_names we’ll write thresholds to (derived from a panel)
const eEditTargets = ref([])   // array of object_names for the panel

// Utility: does ANY object under this panel already have a threshold?
function panelHasExistingThreshold(panelName) {
    const names = objectNamesForPanel(panelName)
    return names.some(n => !!eThresholdsMap.value?.[n])
}


const faults = ref([])
const faultsLoading = ref(false)
const faultsError = ref(null)
const faultsPollSeconds = 30
let faultsTimer = null

async function loadFaults() {
    faultsLoading.value = true
    faultsError.value = null
    try {
        const r = await fetch(FAULTS_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const arr = await r.json()
        // normalize and sort newest first by start_on
        const safe = Array.isArray(arr) ? arr : []
        const use = safe.length ? safe : FAULTS_FALLBACK

        faults.value = [...use].sort(
            (a, b) => new Date(b.start_on || 0) - new Date(a.start_on || 0)
        )

        faults.value = [...safe].sort(
            (a, b) => new Date(b.start_on || 0) - new Date(a.start_on || 0)
        )
    } catch (e) {
        faultsError.value = e?.message ?? 'Failed to load faults'
        faults.value = [...FAULTS_FALLBACK]

    } finally {
        faultsLoading.value = false
    }
}

// Kick off initial load + polling
onMounted(() => {
    loadFaults()
    faultsTimer = window.setInterval(loadFaults, faultsPollSeconds * 1000)
})

onBeforeUnmount(() => {
    if (faultsTimer) window.clearInterval(faultsTimer)
})


// --- sorting helpers ---
const blockCompare = (a, b) =>
    String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })

function levelCompare(a, b) {
    const sa = String(a ?? '')
    const sb = String(b ?? '')
    const na = Number(sa.match(/\d+/)?.[0] ?? NaN)
    const nb = Number(sb.match(/\d+/)?.[0] ?? NaN)

    // numeric level wins over non-numeric ("-")
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
    if (Number.isFinite(na) && !Number.isFinite(nb)) return -1
    if (!Number.isFinite(na) && Number.isFinite(nb)) return 1

    // fallback to alpha (L1A vs L1B, or plain text)
    return sa.localeCompare(sb, undefined, { sensitivity: 'base' })
}

/* View tab */
const viewTab = ref('Dashboard') // 'Dashboard' | 'Device List'

/* Helpers / formatters */
function fmtNum(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString() : '-' }
function fmtDateTime(iso) {
    const d = new Date(iso); if (Number.isNaN(d)) return String(iso || '')
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d)
}
function sum(arr) { return arr.reduce((a, b) => a + Number(b || 0), 0) }
function toIsoWithSeconds(localDT) {
    if (!localDT) return '';
    if (localDT instanceof Date) {
        const y = localDT.getFullYear();
        const m = String(localDT.getMonth() + 1).padStart(2, '0');
        const d = String(localDT.getDate()).padStart(2, '0');
        const hh = String(localDT.getHours()).padStart(2, '0');
        const mm = String(localDT.getMinutes()).padStart(2, '0');
        const ss = String(localDT.getSeconds()).padStart(2, '0');
        return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
    }
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localDT) ? `${localDT}:00` : String(localDT);
}


function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
function toLocalISO(dt) {
    const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, '0'), d = String(dt.getDate()).padStart(2, '0')
    const hh = String(dt.getHours()).padStart(2, '0'), mm = String(dt.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d}T${hh}:${mm}`
}
function isSameLocalDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
function fmtDate(d) { return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) }
function clampSheetName(name) { return name.slice(0, 31) }

/* Tabs state */
const currentTab = ref('Overall')
const currentLevel = ref('Overall')
function selectBlock(b) { currentTab.value = b; currentLevel.value = 'Overall'; }
function selectLevel(l) { currentLevel.value = l }

/* Period segmented control */
const periodMode = ref('business') // 'overall' | 'business' | 'offpeak1' | 'offpeak2'

function setPeriodMode(mode) {
    if (periodMode.value === mode) return   // nothing to do
    periodMode.value = mode
    resetToTimeTrend()                      // exit Compare view if active
    // DO NOT call loadTrendForSelection here
}



// Build merged time-series for the current scope using /power/blocks/trend
async function loadTrendFromBlocks(startIso, endIso) {
    trendLoading.value = true
    trendError.value = null

    try {
        const params = new URLSearchParams({
            start: startIso,
            end: endIso,
        })

        const resp = await fetch(`${BLOCKS_TREND_URL}?${params.toString()}`, {
            cache: 'no-cache',
        })
        if (!resp.ok) throw new Error('HTTP ' + resp.status)

        const body = await resp.json()
        const series = Array.isArray(body?.series) ? body.series : []

        // We only care about Overall vs Block scope now
        const scopeBlock = String(currentTab.value || '').toUpperCase()

        // Map ts -> summed kWh
        const bucket = new Map()

        for (const s of series) {
            const blockKey = String(s.key || '').toUpperCase()

            // If scope is a specific block, skip others
            if (scopeBlock !== 'OVERALL' && blockKey !== scopeBlock) continue

            for (const pt of (s.points || [])) {
                const ts = String(pt.ts)
                const kwh = Number(pt.kwh || 0)
                bucket.set(ts, (bucket.get(ts) || 0) + kwh)
            }
        }

        // Sort timestamps
        let labels = Array.from(bucket.keys()).sort()
        let data = labels.map(ts => bucket.get(ts) || 0)

        // For Day granularity, apply period filter (business / offpeak1 / offpeak2)
        if (trendGran.value === 'D' && periodMode.value && periodMode.value !== 'overall') {
            const anchor = new Date(`${trendDay.value}T00:00:00`)
            const windows = periodWindowsForDay(periodMode.value, anchor)
            const allowed = new Set(filterByWindows(labels, windows))

            labels = labels.filter(ts => allowed.has(ts))
            data = labels.map(ts => bucket.get(ts) || 0)
        }

        trendSeries.value = { labels, data }

        // For the little “• dateLabel” in the UI
        trendStartLocal.value = startIso
        trendEndLocal.value = endIso
        dateLabel.value = `${startIso} → ${endIso}`
    } catch (e) {
        console.error(e)
        trendError.value = e?.message ?? 'Failed to load trend'
        trendSeries.value = { labels: [], data: [] }
    } finally {
        trendLoading.value = false
    }
}


async function applyTrend() {
    // make sure compare mode is off when we’re in “normal” view
    compareView.value = false

    const { startIso, endIso } = rangeFromGranularity()
    if (!startIso || !endIso) return

    await loadTrendFromBlocks(startIso, endIso)
}


// Map an hour (0-23) to the new period buckets.
function periodNameForHour(h) {
    if (h >= 7 && h < 18) return 'business'   // 07:00–17:59
    if (h >= 18 && h < 23) return 'offpeak1'  // 18:00–22:59
    // 23:00–23:59 and 00:00–06:59
    return 'offpeak2'
}

// Given an ISO time, return 'overall' | 'business' | 'offpeak1' | 'offpeak2'
function periodFromISO(tsISO) {
    const d = new Date(tsISO)
    const h = d.getHours()
    return periodNameForHour(h)
}

// === Period windows anchored to "today" with fallbacks ===

// Make local Date at specific HH:MM:SS for a given Y/M/D
function atHM(y, m, d, hh, mm = 0, ss = 0) {
    return new Date(y, m - 1, d, hh, mm, ss, 0);
}

// Return a {start,end} window (Date objects) for the chosen period, anchored to "today".
// For Offpeak 2 we may return a window crossing midnight.
function periodWindowForToday(period, now = new Date()) {
    const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
    const today7 = atHM(y, m, d, 7);
    const today18 = atHM(y, m, d, 18);
    const today23 = atHM(y, m, d, 23);
    const tomorrow7 = (() => { const t = new Date(atHM(y, m, d, 7)); t.setDate(t.getDate() + 1); return t; })();
    const yesterday = new Date(atHM(y, m, d, 0)); yesterday.setDate(yesterday.getDate() - 1);
    const yY = yesterday.getFullYear(), yM = yesterday.getMonth() + 1, yD = yesterday.getDate();
    const y23 = atHM(yY, yM, yD, 23);

    if (period === 'business') return { start: today7, end: today18 };
    if (period === 'offpeak1') return { start: atHM(y, m, d, 18), end: atHM(y, m, d, 23) };
    if (period === 'offpeak2') {
        // If now is between 00:00 and 07:00, show yesterday 23:00 -> now (capped by 07:00)
        if (now.getHours() < 7) {
            const capEnd = new Date(Math.min(now.getTime(), atHM(y, m, d, 7).getTime()));
            return { start: y23, end: capEnd };
        }
        // Otherwise show today 23:00 -> tomorrow 07:00
        return { start: today23, end: tomorrow7 };
    }
    // overall
    return null;
}


watch([trendDay, currentTab], () => {
    refreshDayTotalSelected()
})

onMounted(async () => {
    await refreshDayTotalSelected()
})
// Build yesterday fallback windows for offpeak cases
function fallbackWindow(period, now = new Date()) {
    const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
    const yesterday = new Date(atHM(y, m, d, 0)); yesterday.setDate(yesterday.getDate() - 1);
    const yY = yesterday.getFullYear(), yM = yesterday.getMonth() + 1, yD = yesterday.getDate();
    if (period === 'offpeak1') {
        return { start: atHM(yY, yM, yD, 18), end: atHM(yY, yM, yD, 23) };
    }
    if (period === 'offpeak2') {
        // last completed Offpeak2: yesterday 23:00 -> today 07:00
        return { start: atHM(yY, yM, yD, 23), end: atHM(y, m, d, 7) };
    }
    return null;
}

// Given aggregated labels (ISO strings) + bucket map (ts -> kWh), keep data in (start,end).
// If window has zero points and a fallback window is provided, use the fallback.
function filterByWindowWithFallback(labels, bucketMap, period, now = new Date()) {
    if (period === 'overall' || !period) {
        return labels; // no filtering
    }

    const win = periodWindowForToday(period, now);
    const inWin = (iso) => {
        const t = new Date(iso).getTime();
        return win && t >= win.start.getTime() && t < win.end.getTime();
    };

    let kept = labels.filter(inWin);
    if (kept.length > 0) return kept;

    // Fallback only for offpeak1/offpeak2 (and only if empty)
    const fb = fallbackWindow(period, now);
    if (!fb) return kept;

    const inFb = (iso) => {
        const t = new Date(iso).getTime();
        return t >= fb.start.getTime() && t < fb.end.getTime();
        // NOTE: even if this returns a single point, we keep it.
    };

    kept = labels.filter(inFb);
    return kept;
}

// Auto-select period on page load
function autoSetPeriodModeBasedOnLocalTime() {
    const h = new Date().getHours()
    periodMode.value = periodNameForHour(h)
}

/* Formatters for trend axis/tooltip */
const dtfTickHourly = new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})
const dtfTooltipHourly = new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})

function fmtTrendTooltip(idx) {
    const lbl = trendChartData.value?.labels?.[idx]
    if (compareView.value) return String(lbl ?? '')
    const d = new Date(lbl)
    return Number.isNaN(d) ? '' : dtfTooltipHourly.format(d)
}


/* Hierarchy */
const hierLoading = ref(false), hierError = ref(null)
const hierarchy = ref({ by_block_level: {}, by_panel: {} })

/* Power windows */
const powerLoading = ref(false), powerError = ref(null)
const hourPayload = ref({ window: 'hour', ts: null, rows: [], total_kwh: 0, total_kw: 0 })
const dayPayload = ref({ window: 'day', date: null, rows: [], total_kwh: 0, total_kw: 0 })
const devHourPayload = ref({ window: 'hour', ts: null, rows: [], total_kwh: 0, total_kw: 0 })
const devDayPayload = ref({ window: 'day', date: null, rows: [], total_kwh: 0, total_kw: 0 })
const meterHourPayload = ref({ window: 'hour', ts: null, rows: [] })

/* Trend */
const trendStartLocal = ref('')
const trendEndLocal = ref('')
const trendLoading = ref(false), trendError = ref(null)
const trendSeries = ref({ labels: [], data: [] })
const trendGranularityHint = computed(() => 'Hourly points (as returned)')
const dateLabel = computed(() => {
    if (!trendStartLocal.value || !trendEndLocal.value) return '—'
    const s = new Date(trendStartLocal.value), e = new Date(trendEndLocal.value), today = new Date()
    if (isSameLocalDay(s, today) && isSameLocalDay(e, today)) return 'Today'
    return isSameLocalDay(s, e) ? fmtDate(s) : `${fmtDate(s)} → ${fmtDate(e)}`
})



// === All-Blocks comparison view (selected day) ===
const compareView = ref(false)        // false = time trend, true = per-block compare

function enterBlocksCompare(mode) {
    trendMode.value = mode === 'combo' ? 'combo' : 'line'
    compareView.value = true
    // Ensure data is (re)built for current day selection
    recomputeBlocksCompare()
}

// When the user changes period or hits Apply, return to time-trend automatically
const resetToTimeTrend = () => { compareView.value = false }

/* TOP DEVICES —— state + fetch + chart */
const topWindow = ref('hour') // 'hour' | 'day'
const topN = ref(5) // 5 | 10 | 15
const topLoading = ref(false), topError = ref(null)
const topPayload = ref({ window: 'hour', ts: null, date: null, rows: [] })

/* Airside KPI state */
const airMode = ref('day') // was 'hour' | 'day'
const airLoading = ref(false), airError = ref(null)
const airNow = ref({ ts: null, kw_per_rt: null })

function toggleAirMode() {
    // no longer used, can be left or deleted
    airMode.value = 'day'
}


/* Fetchers */
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

async function loadAirLatest() {
    airLoading.value = true; airError.value = null
    try {
        // always use daily URL
        const url = AIR_DAY_URL
        const r = await fetch(url, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        const pick = Array.isArray(b)
            ? [...b].sort((a, c) => new Date(a.ts) - new Date(c.ts)).at(-1) ?? {}
            : (b ?? {})
        airNow.value = { ts: pick.ts ?? null, kw_per_rt: Number(pick.kw_per_rt ?? 0) }
    } catch (e) {
        airError.value = e?.message ?? 'Load failed'
        airNow.value = { ts: null, kw_per_rt: 0 }
    } finally { airLoading.value = false }
}

watch(airMode, loadAirLatest)

/* Tabs / Levels */

const showLevelTabs = computed(() => currentTab.value !== 'Overall')
const tabsBlocks = computed(() =>
    Object.keys(hierarchy.value.by_block_level || {}).sort(blockCompare)
)

const levelTabs = computed(() => {
    if (!showLevelTabs.value) return []
    const lvls = Object.keys(hierarchy.value.by_block_level?.[currentTab.value] || {})
    return lvls.sort(levelCompare)
})

// Toggle for trend card: 'line' (line only) or 'combo' (bar + line overlay)
const trendMode = ref('line');
function toggleTrendMode() {
    trendMode.value = trendMode.value === 'line' ? 'combo' : 'line';
}


/* Selection scope helpers */
const selectionScope = computed(() => {
    if (currentTab.value === 'Overall') return {}
    if (currentLevel.value === 'Overall') return { block: currentTab.value }
    return { block: currentTab.value, level: currentLevel.value }
})

/* Aggregations */
function aggregateFromRows(rows, scope) {
    if (!Array.isArray(rows) || !rows.length) return { total_kwh: 0, total_kw: 0, rows: [] }
    if (!scope.block) return { total_kwh: sum(rows.map(r => r.kwh)), total_kw: sum(rows.map(r => r.kw)), rows: [...rows] }
    const inBlock = rows.filter(r => r.block === scope.block)
    if (!scope.level) return { total_kwh: sum(inBlock.map(r => r.kwh)), total_kw: sum(inBlock.map(r => r.kw)), rows: inBlock }
    const single = inBlock.find(r => r.level === scope.level)
    return { total_kwh: Number(single?.kwh || 0), total_kw: Number(single?.kw || 0), rows: single ? [single] : [] }
}
const selectedHour = computed(() => aggregateFromRows(hourPayload.value.rows, selectionScope.value))
const selectedDay = computed(() => aggregateFromRows(dayPayload.value.rows, selectionScope.value))
const hourTs = computed(() => hourPayload.value.ts)
const dayDate = computed(() => ymd(fixedToday()))



const dayKpiKw = computed(() =>
    currentTab.value === 'EV' ? 0 : selectedDay.value.total_kw
)

/* Devices table (filtered by selection) */
const selectionDeviceIds = computed(() => {
    const ids = new Set(), bbl = hierarchy.value.by_block_level || {}, byPanel = hierarchy.value.by_panel || {}
    const addPanels = (panels) => { for (const p of panels || []) { for (const d of (byPanel[p]?.device_ids || [])) ids.add(String(d)) } }
    if (currentTab.value === 'Overall') { for (const blk of Object.keys(bbl)) for (const lvl of Object.keys(bbl[blk] || {})) addPanels(bbl[blk][lvl]); return ids }
    if (currentLevel.value === 'Overall') { for (const lvl of Object.keys(bbl[currentTab.value] || {})) addPanels(bbl[currentTab.value][lvl]); return ids }
    addPanels(bbl[currentTab.value]?.[currentLevel.value] || []); return ids
})
const selectedDeviceHourRows = computed(() => {
    const allow = selectionDeviceIds.value; if (!allow.size) return []
    return (devHourPayload.value.rows || []).filter(r => allow.has(String(r.device_id)))
})
const selectedDeviceDayRows = computed(() => {
    const allow = selectionDeviceIds.value; if (!allow.size) return []
    return (devDayPayload.value.rows || []).filter(r => allow.has(String(r.device_id)))
})
const panelNamesByDeviceInSelection = computed(() => {
    const map = new Map(), scope = selectionScope.value
    for (const r of (meterHourPayload.value.rows || [])) {
        if (scope.block && r.block !== scope.block) continue
        if (scope.level && r.level !== scope.level) continue
        const dev = String(r.device_id), panel = String(r.panel || '')
        if (!map.has(dev)) map.set(dev, new Set()); if (panel) map.get(dev).add(panel)
    }
    return map
})
const deviceTableRows = computed(() => {
    const map = new Map()
    const add = (arr, kind) => {
        for (const r of arr || []) {
            const id = String(r.device_id); if (!map.has(id)) map.set(id, { device_id: id })
            const obj = map.get(id)
            if (kind === 'hour') { obj.hour_kwh = Number(r.kwh || 0); obj.hour_kw = Number(r.kw || 0); obj.hour_meters = r.meters }
            else { obj.day_kwh = Number(r.kwh || 0); obj.day_kw = Number(r.kw || 0) }
            if (r.block && !obj.block) obj.block = r.block
            if (r.level && !obj.level) obj.level = r.level
        }
    }
    add(selectedDeviceHourRows.value, 'hour')
    add(selectedDeviceDayRows.value, 'day')
    for (const [devId, setPanels] of panelNamesByDeviceInSelection.value.entries()) {
        if (!map.has(devId)) map.set(devId, { device_id: devId })
        const obj = map.get(devId)
        obj.panels = Array.from(setPanels).sort().join(', ')
    }
    for (const r of (meterHourPayload.value.rows || [])) {
        const id = String(r.device_id)
        if (!map.has(id)) continue
        const obj = map.get(id)
        if (!obj.block && r.block) obj.block = r.block
        if (!obj.level && r.level) obj.level = r.level
    }
    const arr = Array.from(map.values())
    arr.forEach(x => { if (!x.block) x.block = '-'; if (!x.level) x.level = '-' })
    arr.sort((a, b) => {
        // push "-" blocks to the end
        const ab = a.block || '~'
        const bb = b.block || '~'
        const bc = blockCompare(ab, bb)
        if (bc) return bc

        // levels numeric first (L1..L7), "-" last
        const al = a.level || '~'
        const bl = b.level || '~'
        const lc = levelCompare(al, bl)
        if (lc) return lc

        // finally by device id (natural-ish)
        return String(a.device_id).localeCompare(String(b.device_id), undefined, { numeric: true, sensitivity: 'base' })
    })

    return arr
})

/* Trend fetching/combining for CHART */
const canApplyTrend = computed(() => {
    const s = trendStartLocal.value, e = trendEndLocal.value
    if (!s || !e) return false
    return new Date(s) < new Date(e)
})
async function fetchTrendForOne(block, level, startIso, endIso) {
    const params = new URLSearchParams({ block, level, start: startIso, end: endIso })
    const url = `${TREND_BASE_URL}?${params.toString()}`
    const r = await fetch(url, { cache: 'no-cache' })
    if (!r.ok) throw new Error(`${block}.${level} HTTP ${r.status}`)
    return r.json()
}

// Build [labels=data blocks, data=total kWh] for the selected day
const blocksCompare = ref({ labels: [], data: [] })

function selectedDayISO() {
    // Use the date part of trendStartLocal as the selected day
    if (!trendStartLocal.value) return null
    const [y, m, d] = trendStartLocal.value.slice(0, 10).split('-').map(Number)
    if (!y || !m || !d) return null
    const pad = n => String(n).padStart(2, '0')
    const start = new Date(y, m - 1, d, 0, 0, 0, 0)
    const end = new Date(start); end.setDate(end.getDate() + 1)
    const toISO = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
    return { startIso: toISO(start), endIso: toISO(end), dateKey: `${y}-${pad(m)}-${pad(d)}` }
}

onMounted(() => {
    // your existing init stuff...
    loadEvTotals()
})

watch(currentTab, (tab) => {
    if (tab === 'EV') {
        loadEvTotals()
    }
})


async function recomputeBlocksCompare() {
    // We only support compare for Day granularity for now
    if (trendGran.value !== 'D') {
        blocksCompare.value = { labels: [], data: [] }
        return
    }

    const { startIso, endIso } = rangeFromGranularity()
    if (!startIso || !endIso) return

    trendLoading.value = true
    trendError.value = null

    try {
        const params = new URLSearchParams({ start: startIso, end: endIso })
        const resp = await fetch(`${BLOCKS_TREND_URL}?${params.toString()}`, {
            cache: 'no-cache',
        })
        if (!resp.ok) throw new Error('HTTP ' + resp.status)

        const body = await resp.json()
        const series = Array.isArray(body?.series) ? body.series : []

        const labels = []
        const data = []

        for (const s of series) {
            const total = (s.points || []).reduce((acc, pt) => acc + Number(pt.kwh || 0), 0)
            labels.push(`Block ${s.key}`)
            data.push(total)
        }

        blocksCompare.value = { labels, data }
    } catch (e) {
        console.error(e)
        trendError.value = e?.message ?? 'Compare blocks failed'
        blocksCompare.value = { labels: [], data: [] }
    } finally {
        trendLoading.value = false
    }
}


// Keep it fresh when inputs change
watch([trendStartLocal, trendEndLocal, () => hierarchy.value], () => {
    if (compareView.value) recomputeBlocksCompare()
}, { deep: true })


function allBlockLevelPairs() {
    const out = [], bbl = hierarchy.value.by_block_level || {}
    for (const blk of Object.keys(bbl)) for (const lvl of Object.keys(bbl[blk] || {})) out.push({ block: blk, level: lvl })
    return out
}
function blockAllLevels(block) {
    const out = [], levels = Object.keys(hierarchy.value.by_block_level?.[block] || {})
    for (const lvl of levels) out.push({ block, level: lvl })
    return out
}

// Holds Month/Year comparison series when active; null otherwise
const trendCompare = ref(null) // { labels, datasets:[{label,data},{label,data}] } | null

// Bucket a payload list of hourly points into a Map keyed by ISO midnight (day) or by first-of-month ISO
function bucketPoints(payloads, keyFn) {
    const bucket = new Map()
    for (const pl of payloads) for (const s of (pl?.series || [])) for (const pt of (s.points || [])) {
        const k = keyFn(String(pt.ts))
        if (!k) continue
        bucket.set(k, (bucket.get(k) || 0) + Number(pt.kwh || 0))
    }
    return bucket
}

function isoMidnight(y, m, d) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${y}-${pad(m)}-${pad(d)}T00:00:00`
}
function isoMonthAnchor(y, m) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${y}-${pad(m)}-01T00:00:00`
}

async function fetchSumTimeseries(startIso, endIso) {
    // Reuse your selection logic to pick block/level pairs
    let pairs = []
    if (currentTab.value === 'Overall') pairs = allBlockLevelPairs()
    else if (currentLevel.value === 'Overall') pairs = blockAllLevels(currentTab.value)
    else pairs = [{ block: currentTab.value, level: currentLevel.value }]
    if (!pairs.length) return []

    return Promise.all(pairs.map(p => fetchTrendForOne(p.block, p.level, startIso, endIso)))
}

async function loadTrendForSelection() {
    const startIso = toIsoWithSeconds(trendStartLocal.value);
    const endIso = toIsoWithSeconds(trendEndLocal.value);

    // Month/Year -> use compare loaders and return
    if (trendGran.value === 'M') { await loadMonthCompare(); return; }
    if (trendGran.value === 'Y') { await loadYearCompare(); return; }

    trendLoading.value = true; trendError.value = null; trendCompare.value = null;
    try {
        let pairs = [];
        if (currentTab.value === 'Overall') pairs = allBlockLevelPairs();
        else if (currentLevel.value === 'Overall') pairs = blockAllLevels(currentTab.value);
        else pairs = [{ block: currentTab.value, level: currentLevel.value }];

        const payloads = await Promise.all(
            pairs.map(p => fetchTrendForOne(p.block, p.level, startIso, endIso))
        );

        const bucket = new Map();
        for (const pl of payloads) for (const s of (pl?.series || [])) for (const pt of (s.points || [])) {
            const ts = String(pt.ts), v = Number(pt.kwh || 0);
            bucket.set(ts, (bucket.get(ts) || 0) + v);
        }
        const labels = Array.from(bucket.keys()).sort((a, b) => new Date(a) - new Date(b));

        // Only Day uses period window; Week keeps all points
        let filtered = labels;
        if (trendGran.value === 'D') {
            // Anchor to the chosen day (trendStartLocal already reflects your day picker)
            const anchor = new Date(trendStartLocal.value || combineDateTime(trendDay.value, '00:00'));
            anchor.setHours(12, 0, 0, 0); // normalize to midday of the selected day
            const wins = periodWindowsForDay(periodMode.value, anchor);
            filtered = filterByWindows(labels, wins);
        }

        trendSeries.value = { labels: filtered, data: filtered.map(ts => bucket.get(ts) || 0) };
    } catch (e) {
        trendError.value = e?.message ?? 'Trend load failed';
        trendSeries.value = { labels: [], data: [] };
    } finally {
        trendLoading.value = false;
    }
}

watch([currentTab, currentLevel], () => { if (canApplyTrend.value) loadTrendForSelection() })
const trendDatasets = computed(() => {
    // Base line always shown
    const line = {
        label: 'kWh',
        data: trendSeries.value.data,
        type: 'line',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 0,
        fill: false,
    };

    if (trendMode.value === 'combo') {
        // Add bars for the same series
        const bars = {
            label: 'kWh (bars)',
            data: trendSeries.value.data,
            type: 'bar',
        };
        return [bars, line];
    }
    return [line];
});

// Datasets for blocks comparison
const blocksDatasets = computed(() => {
    const base = {
        data: blocksCompare.value.data
    }
    const line = {
        ...base,
        label: 'kWh',
        type: 'line',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 3,
        fill: false,
    }
    if (trendMode.value === 'combo') {
        const bars = { ...base, label: 'kWh (bars)', type: 'bar' }
        return [bars, line]
    }
    return [line]
})

const trendChartData = computed(() => {
    if (compareView.value) {
        return { labels: blocksCompare.value.labels, datasets: blocksDatasets.value }
    }
    if (trendCompare.value) {
        // Month/Year pair compare — bar by default
        return {
            labels: trendCompare.value.labels,
            datasets: trendCompare.value.datasets.map((ds, i) => ({
                ...ds,
                type: (trendMode.value === 'combo' && i === 0) ? 'bar' : 'bar', // always bar is fine
                borderWidth: 2,
                tension: .35,
                pointRadius: 0,
                fill: false
            }))
        }
    }
    // Day/Week single line
    return {
        labels: displaySeries.value.labels,
        datasets: [{ label: 'kWh', data: displaySeries.value.data, borderWidth: 2, tension: .35, pointRadius: 0, fill: false }]
    }
})

function fmtTrendTickDWMy(idx) {
    const lbl = trendChartData.value?.labels?.[idx];
    if (compareView.value || isCompareBar.value) return String(lbl ?? ''); // use literal text for bars
    const d = new Date(lbl);
    if (Number.isNaN(d.getTime())) return String(lbl ?? '');
    if (trendGran.value === 'D') return dtfTime.format(d);
    if (trendGran.value === 'Y') return dtfMonth.format(d);
    return dtfDate.format(d);
}

function fmtTrendTooltipDWMy(idx) {
    const lbl = trendChartData.value?.labels?.[idx];
    const d = new Date(lbl);
    if (Number.isNaN(d.getTime())) return String(lbl ?? '');  // for M/Y bars, show the raw label
    return dtfFull.format(d);
}


// --- helpers used by ticks & tooltip (safe for D/W/M/Y) ---
const dtfTime = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
const dtfDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit' });
const dtfMonth = new Intl.DateTimeFormat(undefined, { month: 'short' });
const dtfFull = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const numFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

const isCompareBar = computed(() => !!trendCompare.value);   // true for M/Y compare bars 

function fmtTrendTick(idx) {
    const lbl = trendChartData.value?.labels?.[idx]
    if (compareView.value) return String(lbl ?? '')
    const d = new Date(lbl)
    if (Number.isNaN(d.getTime())) return String(lbl ?? '') // Month/Year pair labels
    if (trendGran.value === 'D') return dtfTime.format(d)   // time only
    if (trendGran.value === 'Y') return dtfMonth.format(d)  // month name
    return dtfDate.format(d)                                // date only
}
// --- Chart.js options (fix interaction + tooltip for bars) ---
const trendChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
    interaction: {
        // For bars, hovering must intersect the bar for a solid hit;
        // for line, 'index/false' keeps the nice vertical hover.
        mode: isCompareBar.value ? 'nearest' : 'index',
        intersect: isCompareBar.value ? true : false,
    },
    scales: {
        x: {
            ticks: {
                color: '#cbd5e1',
                padding: 10,
                autoSkip: true,
                maxTicksLimit: 12,
                maxRotation: 0,
                callback: (_val, idx) => fmtTrendTickDWMy(idx),
            },
            grid: { color: 'rgba(255,255,255,0.15)' },
        },
        y: {
            beginAtZero: true,
            ticks: { color: '#cbd5e1', padding: 6 },
            grid: { color: 'rgba(255,255,255,0.15)' },
        },
    },
    plugins: {
        legend: { position: 'top', labels: { color: '#cbd5e1' } },
        tooltip: {
            enabled: true,
            mode: isCompareBar.value ? 'nearest' : 'index',
            intersect: isCompareBar.value ? true : false,
            callbacks: {
                // Title: use human date for D/W/Y, raw label for compare bars
                title: (items) => {
                    const idx = items?.[0]?.dataIndex ?? 0;
                    return fmtTrendTooltipDWMy(idx);
                },
                // Body line: "<dataset>: 12,345 kWh"
                label: (ctx) => {
                    const v = ctx.parsed?.y ?? ctx.raw;
                    const ds = ctx.dataset?.label ?? 'kWh';
                    return `${ds}: ${numFmt.format(Number(v || 0))} kWh`;
                },
            },
        },
    },
}));

function genRandomTopRows(n = 10) {
    const blocks = ['A', 'B', 'C', 'D', 'J']
    const levels = ['01', '02', '03', '04', '05', '06', '07', '08']

    const rows = Array.from({ length: n }, (_, i) => {
        const block = blocks[Math.floor(Math.random() * blocks.length)]
        const level = levels[Math.floor(Math.random() * levels.length)]
        const name = `AHU-${block}-${level}-${(i % 4) + 1}`

        return {
            rank: i + 1,
            meter_key: `mock:${block}:${level}:${i + 1}`, // must be unique (used as :key) :contentReference[oaicite:2]{index=2}
            object_name: `LCP-${name}-PM`,
            block,
            level,
            kwh: Math.round(500 + Math.random() * 9500) // 500 ~ 10,000
        }
    })

    // sort highest kWh first, then re-rank
    rows.sort((a, b) => b.kwh - a.kwh)
    rows.forEach((r, idx) => (r.rank = idx + 1))
    return rows
}

function getTopFallbackRowsForCurrentTab() {
    const blk = String(currentTab.value || 'Overall').toUpperCase()

    // If Overall (or unknown), combine all blocks then take topN
    if (blk === 'OVERALL' || blk === 'EV') {
        const combined = Object.values(TOP_FALLBACK_BY_BLOCK).flat()
        combined.sort((a, b) => Number(b.kwh) - Number(a.kwh))
        return combined.slice(0, topN.value || 5)
    }

    // Block tab (A/B/C/D/J...)
    const rows = TOP_FALLBACK_BY_BLOCK[blk] || []
    return rows.slice(0, topN.value || 5)
}


async function loadTopDevices() {
    topLoading.value = true; topError.value = null
    try {
        const params = new URLSearchParams({ window: topWindow.value, n: String(topN.value) })
        const url = `${TOP_BASE_URL}?${params.toString()}`
        const r = await fetch(url, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()

        topPayload.value = {
            window: b?.window || topWindow.value,
            ts: b?.ts || null,
            date: b?.date || null,
            rows: Array.isArray(b?.rows) ? b.rows : []
        }

        // ✅ fallback even if API succeeds but has no rows
        if (!topPayload.value.rows.length) {
            topPayload.value.rows = getTopFallbackRowsForCurrentTab()
        }
    } catch (e) {
        topError.value = e?.message ?? 'Load failed'
        topPayload.value = {
            window: topWindow.value,
            ts: null,
            date: null,
            rows: getTopFallbackRowsForCurrentTab(),
        }
    } finally { topLoading.value = false }
}

watch([topWindow, topN, currentTab], loadTopDevices)


const topRows = computed(() => {
    const rows = topPayload.value.rows || []
    const clone = rows.slice().sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0))
    const limit = Number(topN.value) || 5
    return clone.slice(0, limit)
})

// ----- Sorting for Top Devices table -----
const topSortKey = ref('rank');      // 'rank' | 'name' | 'block' | 'level' | 'kwh'
const topSortDir = ref('asc');       // 'asc' | 'desc'

function sortByTop(key) {
    if (topSortKey.value === key) {
        topSortDir.value = topSortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
        topSortKey.value = key;
        topSortDir.value = 'asc';
    }
}

function sortClassTop(key) {
    return {
        sortable: true,
        asc: topSortKey.value === key && topSortDir.value === 'asc',
        desc: topSortKey.value === key && topSortDir.value === 'desc',
    };
}

const topRowsSorted = computed(() => {
    const arr = topRows.value.slice();
    const dir = topSortDir.value === 'asc' ? 1 : -1;

    const getVal = (r) => {
        switch (topSortKey.value) {
            case 'name': return (deviceName(r) || '').toString();
            case 'block': return (r.block || '').toString();
            case 'level': return (r.level || '').toString();
            case 'kwh': return Number(r.kwh || 0);
            case 'rank':
            default: return Number(r.rank || 0);
        }
    };

    arr.sort((a, b) => {
        const va = getVal(a);
        const vb = getVal(b);
        if (typeof va === 'number' && typeof vb === 'number') {
            return (va - vb) * dir;
        }
        return va.toString().localeCompare(vb.toString(), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });

    return arr;
});


function extractCoreName(raw) {
    const s = String(raw || '');
    // Try patterns like D-7-2 or AA-7-2 inside a longer hyphenated string
    const parts = s.split('-');
    for (let i = 0; i < parts.length - 2; i++) {
        const p = parts[i], p1 = parts[i + 1], p2 = parts[i + 2];
        if (/^[A-Za-z]+$/.test(p) && /^\d+$/.test(p1) && /^\d+$/.test(p2)) {
            return `${p}-${p1}-${p2}`;
        }
    }
    // Fallback: if already short like D-7-2
    const m = s.match(/([A-Za-z]+)-(\d+)-(\d+)/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return s || '-';
}

function deviceName(r) {
    // prefer object_name, else meter_key
    const mk = String(r?.meter_key || '');
    const src = r?.object_name
        ? String(r.object_name)
        : (mk.includes(':') ? mk.split(':').slice(1).join(':') : mk);

    // We want AHU-J-5-1 instead of LCP-AHU-J-5-1-PM
    let name = src;

    // Pick last chunk after dot if object_name is used
    if (r?.object_name) {
        const parts = src.split('.');
        name = parts[parts.length - 2] || src; // LCP-AHU-J-5-1-PM
    }

    // Remove LCP- prefix and -PM suffix
    name = name.replace(/^LCP-/, '').replace(/-PM$/, '');

    return name || '-';
}


const topBarKey = computed(() =>
    'top-devices-bar-' + topRowsSorted.value.map(r => deviceName(r)).join('|')
);

const topBarChartData = computed(() => ({
    labels: topRowsSorted.value.map(r => deviceName(r)),
    datasets: [{ label: 'kWh', data: topRowsSorted.value.map(r => Number(r.kwh || 0)) }]
}));

const topBarOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
    scales: {
        x: { ticks: { color: '#cbd5e1', autoSkip: false, maxRotation: 45, minRotation: 0 }, grid: { color: 'rgba(255,255,255,.15)' } },
        y: { beginAtZero: true, ticks: { color: '#cbd5e1', padding: 6 }, grid: { color: 'rgba(255,255,255,.15)' } }
    },
    plugins: { legend: { position: 'top', labels: { color: '#cbd5e1' } }, tooltip: { mode: 'index', intersect: false } }
}))

/* ===== Export helpers (devices + trends) ===== */
const exporting = ref(false)

function asDash(v) {
    return (v === null || v === undefined || v === '' ||
        (typeof v === 'number' && !Number.isFinite(v)))
        ? '-' : v
}
const devMetaMap = computed(() => {
    const map = new Map()
    for (const r of (meterHourPayload.value.rows || [])) {
        const id = String(r.device_id)
        if (!map.has(id)) map.set(id, { block: r.block || '-', level: r.level || '-', panels: new Set() })
        const meta = map.get(id)
        if (r.panel) meta.panels.add(String(r.panel))
        if ((!meta.block || meta.block === '-') && r.block) meta.block = r.block
        if ((!meta.level || meta.level === '-') && r.level) meta.level = r.level
    }
    return map
})
const devHourMap = computed(() => {
    const m = new Map()
    for (const r of (devHourPayload.value.rows || [])) {
        m.set(String(r.device_id), { kwh: Number(r.kwh ?? NaN), kw: Number(r.kw ?? NaN), meters: r.meters ?? '-' })
    }
    return m
})
const devDayMap = computed(() => {
    const m = new Map()
    for (const r of (devDayPayload.value.rows || [])) {
        m.set(String(r.device_id), { kwh: Number(r.kwh ?? NaN), kw: Number(r.kw ?? NaN) })
    }
    return m
})
const allDeviceIds = computed(() => {
    const s = new Set()
    for (const id of devMetaMap.value.keys()) s.add(id)
    for (const id of devHourMap.value.keys()) s.add(id)
    for (const id of devDayMap.value.keys()) s.add(id)
    return Array.from(s).sort()
})
function buildOverallDeviceRows() {
    const rows = []
    for (const id of allDeviceIds.value) {
        const meta = devMetaMap.value.get(id) || { block: '-', level: '-', panels: new Set() }
        const hour = devHourMap.value.get(id) || {}
        const day = devDayMap.value.get(id) || {}
        const panelsStr = meta.panels && meta.panels.size ? Array.from(meta.panels).sort().join(', ') : '-'
        rows.push({
            'Block': asDash(meta.block),
            'Level': asDash(meta.level),
            'Device ID': asDash(id),
            'Hour kWh': Number.isFinite(hour.kwh) ? hour.kwh : '-',
            'Day kWh': Number.isFinite(day.kwh) ? day.kwh : '-',
            'Hour Meters': asDash(hour.meters),
        })
    }
    return rows
}

/* Trend export: full timestamps + Period column */
function periodLabelFromISO(tsISO) {
    const p = periodFromISO(tsISO)
    if (p === 'business') return 'Business 7am–6pm'
    if (p === 'offpeak1') return 'Offpeak 1 6pm–11pm'
    if (p === 'offpeak2') return 'Offpeak 2 11pm–7am'
    return 'Overall'
}

function bucketToAOAFull(bucketMap) {
    const labels = Array.from(bucketMap.keys()).sort((a, b) => new Date(a) - new Date(b))
    const aoa = [['timestamp', 'kWh', 'Period']]
    for (const ts of labels) {
        aoa.push([ts, bucketMap.get(ts) || 0, periodLabelFromISO(ts)])
    }
    return aoa
}

/* Build trend buckets (overall + per block + per level) for the given range */
async function buildTrendBucketsForExport(startIso, endIso) {
    const bbl = hierarchy.value.by_block_level || {}
    const overallBucket = new Map() // ts -> sum kWh across all
    const perBlockBucket = new Map() // block -> Map(ts->sum)
    const perBlockLevelBucket = new Map() // block -> Map(level -> Map(ts->kWh))

    const pairs = []
    for (const blk of Object.keys(bbl)) {
        for (const lvl of Object.keys(bbl[blk] || {})) {
            pairs.push({ block: blk, level: lvl })
        }
    }

    if (!pairs.length) {
        return { overallBucket, perBlockBucket, perBlockLevelBucket }
    }

    const payloads = await Promise.all(pairs.map(p => fetchTrendForOne(p.block, p.level, startIso, endIso)))
    for (let i = 0; i < pairs.length; i++) {
        const { block, level } = pairs[i]
        const pl = payloads[i]
        if (!pl?.series?.length) continue

        if (!perBlockLevelBucket.has(block)) perBlockLevelBucket.set(block, new Map())
        if (!perBlockBucket.has(block)) perBlockBucket.set(block, new Map())

        const blockMap = perBlockBucket.get(block)
        const levelMap = perBlockLevelBucket.get(block)
        if (!levelMap.has(level)) levelMap.set(level, new Map())
        const thisLevelMap = levelMap.get(level)

        for (const s of (pl.series || [])) {
            for (const pt of (s.points || [])) {
                const ts = String(pt.ts), v = Number(pt.kwh || 0)
                overallBucket.set(ts, (overallBucket.get(ts) || 0) + v)
                blockMap.set(ts, (blockMap.get(ts) || 0) + v)
                thisLevelMap.set(ts, (thisLevelMap.get(ts) || 0) + v)
            }
        }
    }

    return { overallBucket, perBlockBucket, perBlockLevelBucket }
}

/* Sheet helpers */
function autofitSheetFromAOA(ws, aoa) {
    const colCount = Math.max(...aoa.map(r => r.length))
    const lens = new Array(colCount).fill(0)
    for (const row of aoa) {
        row.forEach((cell, i) => {
            const len = String(cell ?? '').length
            lens[i] = Math.max(lens[i], len)
        })
    }
    ws['!cols'] = lens.map(ch => ({ wch: Math.min(Math.max(ch + 2, 6), 60) }))
}
function jsonRowsToAOA(headers, rows) {
    const aoa = [headers]
    for (const r of rows) {
        aoa.push(headers.map(h => r[h]))
    }
    return aoa
}

/* MAIN DOWNLOAD: Overall sheet + per-block sheets (checkbox-controlled) */
// MAIN DOWNLOAD: Overall sheet + per-block sheets (with hourly + daily grouped)
async function downloadAllXLSX(opts = { devices: true, hourly: true, sevenDays: true, hourlyRange: null }) {
    const { devices, hourly, sevenDays, hourlyRange } = opts
    if (exporting.value) return
    if (!devices && !hourly && !sevenDays) return

    exporting.value = true
    try {
        const wb = XLSX.utils.book_new()
        const COLUMNS = ['Block', 'Level', 'Device ID', 'Hour kWh', 'Day kWh', 'Hour Meters']

        // Device list rows (overall)
        const overallDevRows = devices ? buildOverallDeviceRows() : []

        // Chosen range (for hourly + daily trends)
        const chosenStartIso = (hourlyRange && hourlyRange.startIso) || toIsoWithSeconds(trendStartLocal.value)
        const chosenEndIso = (hourlyRange && hourlyRange.endIso) || toIsoWithSeconds(trendEndLocal.value)

        const rangeStartLabel = String(chosenStartIso).slice(0, 10)
        const rangeEndLabel = String(chosenEndIso).slice(0, 10)
        const rangeLabel = rangeStartLabel + ' to ' + rangeEndLabel

        // Buckets for selected range
        let overallBucket = new Map()
        let perBlockBucket = new Map()
        let perBlockLevelBucket = new Map()

        if (hourly) {
            const r = await buildTrendBucketsForExport(chosenStartIso, chosenEndIso)
            overallBucket = r.overallBucket
            perBlockBucket = r.perBlockBucket
            perBlockLevelBucket = r.perBlockLevelBucket
        }

        // ---------- Overall sheet ----------
        const allAOA = []

        if (devices) {
            allAOA.push(['Device List — Overall'])
            allAOA.push(...jsonRowsToAOA(COLUMNS, overallDevRows))
            allAOA.push([])
        }

        if (hourly) {
            allAOA.push(['Energy Consumption Trend — Overall'])
            allAOA.push(['Selected range: ' + rangeLabel])
            allAOA.push(...bucketToAOAFull(overallBucket))
        }

        // ----- Last 7 days (overall + per-block) -----
        let perBlockDailyTotals = new Map()
        if (sevenDays) {
            const endDay = new Date()
            endDay.setHours(0, 0, 0, 0)
            const startDay = new Date(endDay)
            startDay.setDate(startDay.getDate() - 7)

            const pad = (n) => String(n).padStart(2, '0')
            const toISOWithSecs = (d) =>
                d.getFullYear() + '-' +
                pad(d.getMonth() + 1) + '-' +
                pad(d.getDate()) + 'T' +
                pad(d.getHours()) + ':' +
                pad(d.getMinutes()) + ':' +
                pad(d.getSeconds())

            const dailyUrl =
                'http://127.0.0.1:8081/power/blocks/trend?start=' + encodeURIComponent(toISOWithSecs(startDay)) +
                '&end=' + encodeURIComponent(toISOWithSecs(endDay))

            const overallDailyTotals = new Map()

            try {
                const resp = await fetch(dailyUrl, { cache: 'no-cache' })
                if (!resp.ok) throw new Error('HTTP ' + resp.status)
                const body = await resp.json()
                const series = Array.isArray(body && body.series) ? body.series : []

                for (let i = 0; i < series.length; i++) {
                    const s = series[i]
                    const blockKey = String((s && s.key) || '')
                    const pts = Array.isArray(s && s.points) ? s.points : []
                    if (!perBlockDailyTotals.has(blockKey)) perBlockDailyTotals.set(blockKey, new Map())
                    const blockMap = perBlockDailyTotals.get(blockKey)

                    for (let j = 0; j < pts.length; j++) {
                        const p = pts[j]
                        const ts = p && p.ts
                        const date = String(ts || '').slice(0, 10)
                        if (!date) continue
                        const val = Number((p && p.kwh) || 0)
                        overallDailyTotals.set(date, (overallDailyTotals.get(date) || 0) + val)
                        blockMap.set(date, (blockMap.get(date) || 0) + val)
                    }
                }

                const rowsOverall7 = Array.from(overallDailyTotals.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(pair => ({ Date: pair[0], 'Total kWh': pair[1] }))

                allAOA.push([])
                allAOA.push(['Last 7 Days — Total kWh (All Blocks)'])
                allAOA.push(['Date', 'Total kWh'])
                for (let i = 0; i < rowsOverall7.length; i++) {
                    const r = rowsOverall7[i]
                    allAOA.push([r.Date, r['Total kWh']])
                }
            } catch (e) {
                console.error('Failed to fetch/aggregate last 7 days:', e)
                allAOA.push([])
                allAOA.push(['Last 7 Days — Total kWh (All Blocks)'])
                allAOA.push(['Date', 'Total kWh'])
                allAOA.push(['—', '—'])
            }
        }

        // ----- Daily trend (Overall, selected range) -----
        if (hourly && overallBucket.size) {
            const dailyTotals = new Map()

            overallBucket.forEach((val, ts) => {
                const dateKey = String(ts).slice(0, 10)
                if (!dateKey) return
                const num = Number(val || 0)
                dailyTotals.set(dateKey, (dailyTotals.get(dateKey) || 0) + num)
            })

            const dailyRows = Array.from(dailyTotals.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(pair => ({ Date: pair[0], 'Total kWh': pair[1] }))

            allAOA.push([])
            allAOA.push(['Daily Energy Trend — Overall'])
            allAOA.push(['Selected range: ' + rangeLabel])
            allAOA.push(['Date', 'Total kWh'])
            for (let i = 0; i < dailyRows.length; i++) {
                const r = dailyRows[i]
                allAOA.push([r.Date, r['Total kWh']])
            }
        }

        const wsAll = XLSX.utils.aoa_to_sheet(allAOA)
        autofitSheetFromAOA(wsAll, allAOA)
        XLSX.utils.book_append_sheet(wb, wsAll, clampSheetName('Overall'))

        // ---------- Per-block sheets ----------
        const bbl = (hierarchy.value && hierarchy.value.by_block_level) || {}
        const blocks = Object.keys(bbl).sort()

        for (let bi = 0; bi < blocks.length; bi++) {
            const b = blocks[bi]
            const blAOA = []

            // Block device list
            if (devices) {
                const blockRows = overallDevRows
                    .filter(r => r['Block'] === b)
                    .sort((a, c) => {
                        const lvComp = levelCompare(a['Level'], c['Level'])
                        if (lvComp !== 0) return lvComp
                        return String(a['Device ID']).localeCompare(String(c['Device ID']), undefined, {
                            numeric: true,
                            sensitivity: 'base',
                        })
                    })

                blAOA.push(['Device List — Block ' + b])
                blAOA.push(...jsonRowsToAOA(COLUMNS, blockRows))
                blAOA.push([])
            }

            if (hourly) {
                const blockBucket = perBlockBucket.get(b) || new Map()
                const lvlMap = perBlockLevelBucket.get(b) || new Map()
                const levels = Array.from(lvlMap.keys()).sort((a, c) => {
                    const ma = a.match(/\d+/)
                    const mc = c.match(/\d+/)
                    const na = ma ? Number(ma[0]) : NaN
                    const nb = mc ? Number(mc[0]) : NaN
                    if (isFinite(na) && isFinite(nb) && na !== nb) return na - nb
                    return a.localeCompare(c)
                })

                // 1) Block Overall HOURLY
                blAOA.push(['Energy Consumption Trend — Block ' + b + ' (Overall)'])
                blAOA.push(['Selected range: ' + rangeLabel])
                blAOA.push(...bucketToAOAFull(blockBucket))

                // 2) Block Overall DAILY (selected range)
                if (blockBucket.size) {
                    const dailyTotalsBlock = new Map()
                    blockBucket.forEach((val, ts) => {
                        const dateKey = String(ts).slice(0, 10)
                        if (!dateKey) return
                        const num = Number(val || 0)
                        dailyTotalsBlock.set(dateKey, (dailyTotalsBlock.get(dateKey) || 0) + num)
                    })

                    const dailyRowsBlock = Array.from(dailyTotalsBlock.entries())
                        .sort((a, c) => a[0].localeCompare(c[0]))
                        .map(pair => ({ Date: pair[0], 'Total kWh': pair[1] }))

                    blAOA.push([])
                    blAOA.push(['Daily Energy Trend — Block ' + b])
                    blAOA.push(['Selected range: ' + rangeLabel])
                    blAOA.push(['Date', 'Total kWh'])
                    for (let di = 0; di < dailyRowsBlock.length; di++) {
                        const r = dailyRowsBlock[di]
                        blAOA.push([r.Date, r['Total kWh']])
                    }
                }

                // 3) For each LEVEL: HOURLY then DAILY
                for (let li = 0; li < levels.length; li++) {
                    const lvl = levels[li]
                    const lvlBucket = lvlMap.get(lvl) || new Map()

                    // Level HOURLY
                    blAOA.push([])
                    blAOA.push(['Energy Consumption Trend — Block ' + b + ' • ' + lvl])
                    blAOA.push(['Selected range: ' + rangeLabel])
                    blAOA.push(...bucketToAOAFull(lvlBucket))

                    // Level DAILY
                    if (lvlBucket.size) {
                        const dailyTotalsLevel = new Map()
                        lvlBucket.forEach((val, ts) => {
                            const dateKey = String(ts).slice(0, 10)
                            if (!dateKey) return
                            const num = Number(val || 0)
                            dailyTotalsLevel.set(dateKey, (dailyTotalsLevel.get(dateKey) || 0) + num)
                        })

                        const dailyRowsLevel = Array.from(dailyTotalsLevel.entries())
                            .sort((a, c) => a[0].localeCompare(c[0]))
                            .map(pair => ({ Date: pair[0], 'Total kWh': pair[1] }))

                        blAOA.push([])
                        blAOA.push(['Daily Energy Trend — Block ' + b + ' • ' + lvl])
                        blAOA.push(['Selected range: ' + rangeLabel])
                        blAOA.push(['Date', 'Total kWh'])
                        for (let di = 0; di < dailyRowsLevel.length; di++) {
                            const r = dailyRowsLevel[di]
                            blAOA.push([r.Date, r['Total kWh']])
                        }
                    }
                }
            }

            // Last 7 days per block (unchanged)
            if (sevenDays) {
                const map = perBlockDailyTotals.get(b)
                blAOA.push([])
                blAOA.push(['Last 7 Days — Total kWh (Block ' + b + ')'])
                blAOA.push(['Date', 'Total kWh'])
                if (map && map.size) {
                    const rows = Array.from(map.entries())
                        .sort((a, c) => a[0].localeCompare(c[0]))
                        .map(pair => ({ Date: pair[0], 'Total kWh': pair[1] }))
                    for (let i = 0; i < rows.length; i++) {
                        const r = rows[i]
                        blAOA.push([r.Date, r['Total kWh']])
                    }
                } else {
                    blAOA.push(['—', '—'])
                }
            }

            if (blAOA.length) {
                const wsB = XLSX.utils.aoa_to_sheet(blAOA)
                autofitSheetFromAOA(wsB, blAOA)
                XLSX.utils.book_append_sheet(wb, wsB, clampSheetName('Block ' + b))
            }
        }

        const fname = 'Energy_Devices+Trends_' + new Date().toISOString().slice(0, 10) + '.xlsx'
        XLSX.writeFile(wb, fname)
    } catch (e) {
        console.error('Download failed:', e)
        alert('Failed to build the Excel. See console for details.')
    } finally {
        exporting.value = false
    }
}



/* Mount + refresh */
let hourlyTimer = null
onMounted(async () => {
    trendStartLocal.value = toLocalISO(startOfToday());
    trendEndLocal.value = toLocalISO(new Date());
    autoSetPeriodModeBasedOnLocalTime();

    await loadHierarchy();

    await Promise.all([
        loadPowerWindows(),
        loadAirLatest(),
        loadWaterLatest(),
        loadChillerPoints(),
        loadTopDevices(),
    ]);

    await Promise.all([
        refreshDayTotalFixed(),
        refreshMonthTotal(),
        refreshAnnualTotal(),   // <-- EUI depends on this
        applyGranularTrend(),
    ]);

    euiReady.value = true     // <-- allow EUI to compute from now on
    recomputeEui()            // <-- compute EUI last, once deps are stable

    scheduleHourlyReload();
    await loadEnergyThresholds();
});


const freezeEuiOnScopeChange = true;

watch([currentTab, currentLevel], async () => {
    await refreshDayTotalFixed()
    await refreshMonthTotal()
    await refreshMonthDaysWithData()
    if (!freezeEuiOnScopeChange) {
        await refreshAnnualTotal()
    }
})

onBeforeUnmount(() => { if (hourlyTimer) clearTimeout(hourlyTimer) })
function scheduleHourlyReload() {
    const now = new Date(), next = new Date(now)
    next.setHours(now.getHours() + 1, 1, 0, 0) // next hour + 1 minute
    const msUntilNext = next.getTime() - now.getTime()
    hourlyTimer = setTimeout(() => {
        trendStartLocal.value = toLocalISO(startOfToday())
        trendEndLocal.value = toLocalISO(new Date())
        loadHierarchy()
        loadPowerWindows()
        applyGranularTrend()
        loadAirLatest()
        loadTopDevices()
        scheduleHourlyReload()
    }, msUntilNext)
}

/* ================== Energy Thresholds (CRUD) ================== */
const E_THRESHOLDS_URL = 'http://localhost:8084/thresholds/energy'

const eThresholdsLoading = ref(false)
const eThresholdsError = ref(null)
const eThresholdsMap = ref({}) // { [object_name(panel)]: { object_name,min_value,max_value,enabled } }

/** Load existing thresholds and index by object_name (== panel name) */
async function loadEnergyThresholds() {
    eThresholdsLoading.value = true; eThresholdsError.value = null
    try {
        const r = await fetch(E_THRESHOLDS_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const arr = await r.json()
        const map = {}
        for (const t of (arr || [])) {
            const key = String(t.object_name || t?.id || '').trim()
            if (key) map[key] = {
                object_name: key,
                min_value: Number(t.min_value ?? 0),
                max_value: Number(t.max_value ?? 0),
                enabled: !!t.enabled
            }
        }
        eThresholdsMap.value = map
    } catch (e) {
        eThresholdsError.value = e?.message ?? 'Failed to load thresholds'
        eThresholdsMap.value = {}
    } finally { eThresholdsLoading.value = false }
}

/* --- modal state --- */
const showEThresholdModal = ref(false)
const eEditTag = ref('')     // panel name (object_name)
const eEditMin = ref(0)
const eEditMax = ref(0)
const eEditEnabled = ref(true)
const eSaving = ref(false)
const eSaveError = ref(null)

/** Open Set/Edit modal for a specific panel name */
function openEnergyThresholdModal(panelName) {
    // Gather object_names for this panel; fallback to panel itself if none found
    const targets = objectNamesForPanel(panelName)
    eEditTargets.value = targets.length ? targets : [panelName]

    // Prefill fields using the FIRST target that already has a threshold (if any)
    const firstExisting = eEditTargets.value.find(n => eThresholdsMap.value?.[n])
    const t = firstExisting ? eThresholdsMap.value[firstExisting] : null

    eEditTag.value = panelName // keep for display
    eEditMin.value = Number(t?.min_value ?? 0)
    eEditMax.value = Number(t?.max_value ?? 0)
    eEditEnabled.value = Boolean(t?.enabled ?? true)
    eSaveError.value = null
    showEThresholdModal.value = true
}

function closeEnergyThresholdModal() { showEThresholdModal.value = false }

/** Save (create/update) */
async function saveEnergyThreshold() {
    eSaveError.value = null
    if (!eEditTag.value) { eSaveError.value = 'Invalid panel name.'; return }
    if (!eEditTargets.value?.length) { eSaveError.value = 'No targets found for this panel.'; return }

    const baseBody = {
        min_value: Number(eEditMin.value ?? 0),
        max_value: Number(eEditMax.value ?? 0),
        enabled: Boolean(eEditEnabled.value)
    }

    eSaving.value = true
    try {
        // POST one request per object_name
        for (const name of eEditTargets.value) {
            const body = { object_name: name, ...baseBody }
            const r = await fetch(E_THRESHOLDS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            if (!r.ok) throw new Error('HTTP ' + r.status)

            // Optimistic local update, keyed by object_name (not panel)
            eThresholdsMap.value = {
                ...eThresholdsMap.value,
                [name]: {
                    object_name: name,
                    min_value: body.min_value,
                    max_value: body.max_value,
                    enabled: body.enabled
                }
            }
        }

        showEThresholdModal.value = false
        showSavedToast()
        loadEnergyThresholds() // optional refresh to stay in sync
    } catch (e) {
        eSaveError.value = e?.message ?? 'Failed to save threshold(s)'
    } finally {
        eSaving.value = false
    }
}

/** Delete flow (confirm modal) */
const showEConfirmDelete = ref(false)
const eDeleting = ref(false)
const ePendingDelete = ref(null) // { object_name }

function onRequestDeleteEnergyThreshold(panelName) {
    const targets = objectNamesForPanel(panelName)
    ePendingDelete.value = {
        panel: panelName,                     // for reference
        targets: targets.length ? targets : [panelName]  // delete by object_names
    }
    showEConfirmDelete.value = true
}


function cancelEnergyDelete() {
    showEConfirmDelete.value = false
    ePendingDelete.value = null
}
async function confirmEnergyDeleteNow() {
    const targets = ePendingDelete.value?.targets || []
    if (!targets.length) return
    eDeleting.value = true

    try {
        for (const name of targets) {
            const url = `${E_THRESHOLDS_URL}?object_name=${encodeURIComponent(name)}`
            const r = await fetch(url, { method: 'DELETE', cache: 'no-cache' })
            if (!r.ok) throw new Error('HTTP ' + r.status)

            // optimistic local update
            const clone = { ...eThresholdsMap.value }
            delete clone[name]
            eThresholdsMap.value = clone
        }

        showEConfirmDelete.value = false
        ePendingDelete.value = null
        showSavedToast()
        loadEnergyThresholds() // optional sync
    } catch (e) {
        alert(`Failed to delete: ${e?.message ?? 'Unknown error'}`)
    } finally {
        eDeleting.value = false
    }
}




/* --- tiny "Saved" toast (optional, reuse across the page) --- */
const showSavedModal = ref(false)
function showSavedToast() {
    showSavedModal.value = true
    window.setTimeout(() => { showSavedModal.value = false }, 1500)
}

/* Mount: also load thresholds */
onMounted(async () => {
    await loadEnergyThresholds()
})


// --- Device List (ALWAYS Overall) ---
const overallDeviceIds = computed(() => {
    // collect ALL device ids from hierarchy (no block/level filter)
    const ids = new Set();
    const bbl = hierarchy.value.by_block_level || {};
    const byPanel = hierarchy.value.by_panel || {};
    for (const blk of Object.keys(bbl)) {
        for (const lvl of Object.keys(bbl[blk] || {})) {
            for (const p of bbl[blk][lvl] || []) {
                for (const d of (byPanel[p]?.device_ids || [])) ids.add(String(d));
            }
        }
    }
    return ids;
});

const overallDeviceHourRows = computed(() => {
    const allow = overallDeviceIds.value; if (!allow.size) return [];
    return (devHourPayload.value.rows || []).filter(r => allow.has(String(r.device_id)));
});

const overallDeviceDayRows = computed(() => {
    const allow = overallDeviceIds.value; if (!allow.size) return [];
    return (devDayPayload.value.rows || []).filter(r => allow.has(String(r.device_id)));
});

// --- per-device selection state for the dropdown ---
const selectedPanelByDevice = ref(new Map())

function panelsForDevice(deviceId) {
    const set = panelNamesByDeviceOverall.value.get(String(deviceId))
    return set ? Array.from(set).sort() : []
}

function getSelectedPanelForDevice(deviceId) {
    return selectedPanelByDevice.value.get(String(deviceId)) || ''
}
function setSelectedPanelForDevice(deviceId, val) {
    selectedPanelByDevice.value.set(String(deviceId), val)
}
function ensureDefaultPanelForDevice(deviceId) {
    const k = String(deviceId)
    if (!selectedPanelByDevice.value.has(k)) {
        const opts = panelsForDevice(deviceId)
        if (opts.length) selectedPanelByDevice.value.set(k, opts[0])
    }
}

// Actions wired to the dropdown’s current value (PER DEVICE)
function onClickSetThresholdForDevice(deviceId) {
    ensureDefaultPanelForDevice(deviceId)
    const p = getSelectedPanelForDevice(deviceId)
    if (!p) { alert('No panel for this device.'); return }
    openEnergyThresholdModal(p)
}

function onClickDeleteThresholdForDevice(deviceId) {
    ensureDefaultPanelForDevice(deviceId)
    const p = getSelectedPanelForDevice(deviceId)
    if (!p) { alert('No panel for this device.'); return }
    onRequestDeleteEnergyThreshold(p)
}


const panelNamesByDeviceOverall = computed(() => {
    // NOTE: no scope filter here — include ALL panels
    const map = new Map();
    for (const r of (meterHourPayload.value.rows || [])) {
        const dev = String(r.device_id), panel = String(r.panel || '');
        if (!map.has(dev)) map.set(dev, new Set());
        if (panel) map.get(dev).add(panel);
    }
    return map;
});

const deviceListRows = computed(() => {
    // Build rows exactly like deviceTableRows, but using the *overall* sets above
    const map = new Map();
    const add = (arr, kind) => {
        for (const r of arr || []) {
            const id = String(r.device_id);
            if (!map.has(id)) map.set(id, { device_id: id });
            const obj = map.get(id);
            if (kind === 'hour') {
                obj.hour_kwh = Number(r.kwh || 0);
                obj.hour_kw = Number(r.kw || 0);
                obj.hour_meters = r.meters;
            } else {
                obj.day_kwh = Number(r.kwh || 0);
                obj.day_kw = Number(r.kw || 0);
            }
            if (r.block && !obj.block) obj.block = r.block;
            if (r.level && !obj.level) obj.level = r.level;
        }
    };
    add(overallDeviceHourRows.value, 'hour');
    add(overallDeviceDayRows.value, 'day');

    // Panels (overall, not scoped)
    for (const [devId, setPanels] of panelNamesByDeviceOverall.value.entries()) {
        if (!map.has(devId)) map.set(devId, { device_id: devId });
        const obj = map.get(devId);
        obj.panels = Array.from(setPanels).sort().join(', ');
    }

    // Fill missing block/level from meterHour payload if available
    for (const r of (meterHourPayload.value.rows || [])) {
        const id = String(r.device_id);
        if (!map.has(id)) continue;
        const obj = map.get(id);
        if (!obj.block && r.block) obj.block = r.block;
        if (!obj.level && r.level) obj.level = r.level;
    }

    let arr = Array.from(map.values());

    // ✅ if API gives nothing, show fallback devices instead
    if (!arr.length) {
        arr = DEVICE_LIST_FALLBACK_ROWS.slice();
    }

    arr.forEach(x => { if (!x.block) x.block = '-'; if (!x.level) x.level = '-' });
    arr.sort((a, b) => {
        const bc = blockCompare(a.block || '~', b.block || '~'); if (bc) return bc;
        const lc = levelCompare(a.level || '~', b.level || '~'); if (lc) return lc;
        return String(a.device_id).localeCompare(String(b.device_id), undefined, { numeric: true, sensitivity: 'base' });
    });
    return arr;

    arr.forEach(x => { if (!x.block) x.block = '-'; if (!x.level) x.level = '-' });
    arr.sort((a, b) => {
        const bc = blockCompare(a.block || '~', b.block || '~'); if (bc) return bc;
        const lc = levelCompare(a.level || '~', b.level || '~'); if (lc) return lc;
        return String(a.device_id).localeCompare(String(b.device_id), undefined, { numeric: true, sensitivity: 'base' });
    });
    return arr;
});

const last7DayTotals = computed(() => {
    // group by date
    const byDate = new Map();
    for (const r of (devDayPayload.value.rows || [])) {
        const d = String(r.date || '').slice(0, 10); // YYYY-MM-DD
        if (!d) continue;
        const kwh = Number(r.kwh || 0);
        byDate.set(d, (byDate.get(d) || 0) + kwh);
    }
    // sort descending, then keep last 7
    const arr = Array.from(byDate.entries())
        .map(([date, total_kwh]) => ({ date, total_kwh }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7)
        .reverse(); // oldest first
    return arr;
});

/* ===== Modal state for selective export ===== */
const showDownloadModal = ref(false)
const includeDeviceList = ref(true)
const includeHourlyTrend = ref(true)
const include7DaysTrend = ref(true)
const downloadValidation = ref(false)

function openDownloadModal() {
    downloadValidation.value = false
    showDownloadModal.value = true
}
function closeDownloadModal() {
    showDownloadModal.value = false
}

// Default to today in local time (YYYY-MM-DD)
const hourlyExportDate = ref(new Date().toISOString().slice(0, 10))

// Build local midnight ISO with seconds for a given YYYY-MM-DD
function dayToLocalIsoMidnight(dateStr /* 'YYYY-MM-DD' */) {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(y, (m - 1), d, 0, 0, 0, 0) // local midnight
    const pad = (n) => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
}
function nextDayLocalIsoMidnight(dateStr) {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(y, (m - 1), d, 0, 0, 0, 0)
    dt.setDate(dt.getDate() + 1)
    const pad = (n) => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
}


function performDownload() {
    // Must choose at least one thing
    if (!includeDeviceList.value && !includeHourlyTrend.value && !include7DaysTrend.value) {
        downloadValidation.value = true
        return
    }

    // Build hourly range (if needed) from Single day or Custom range
    let hourlyRange = null
    if (includeHourlyTrend.value) {
        if (hourlyDateMode.value === 'single') {
            if (!hourlyExportDate.value) {
                downloadValidation.value = true
                return
            }
            const startIso = dayToLocalIsoMidnight(hourlyExportDate.value)       // YYYY-MM-DDT00:00:00
            const endIso = nextDayLocalIsoMidnight(hourlyExportDate.value)      // next day T00:00:00
            hourlyRange = { startIso, endIso }
        } else {
            // custom range
            if (!hourlyExportStart.value || !hourlyExportEnd.value) {
                downloadValidation.value = true
                return
            }
            // Ensure start <= end
            const start = new Date(hourlyExportStart.value)
            const end = new Date(hourlyExportEnd.value)
            if (isNaN(start) || isNaN(end) || start > end) {
                alert('Please choose a valid date range.')
                return
            }

            const startIso = dayToLocalIsoMidnight(hourlyExportStart.value)
            // end is exclusive → add 1 day to include the end date fully
            const endIso = nextDayLocalIsoMidnight(hourlyExportEnd.value)
            hourlyRange = { startIso, endIso }
        }
    }

    // Reuse your existing Excel export (it already handles multi-day ranges)
    downloadAllXLSX({
        devices: includeDeviceList.value,
        hourly: includeHourlyTrend.value,
        sevenDays: include7DaysTrend.value,
        hourlyRange,
    })

    showDownloadModal.value = false
}

function formatEvLabel(ts) {
    const d = new Date(ts);
    if (Number.isNaN(d)) return String(ts ?? '');

    if (evGran.value === 'D') {
        // Day view → show time HH:MM
        return d.toLocaleTimeString('en-SG', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    }

    if (evGran.value === 'W' || evGran.value === 'M') {
        // Week / Month → 01 Dec, 02 Dec, ...
        return d.toLocaleDateString('en-SG', {
            day: '2-digit',
            month: 'short',
        });
    }

    if (evGran.value === 'Y') {
        // Year → Jan, Feb, ...
        return d.toLocaleDateString('en-SG', { month: 'short' });
    }

    return String(ts ?? '');
}


// --- selection state for the dropdown per row (keyed by block|level) ---
const selectedPanelByLevel = ref(new Map())
function levelKey(block, level) { return `${block || '-'}|${level || '-'}` }

// All panels present on a specific block + level (from meterHourPayload)
function panelsForLevel(block, level) {
    const out = new Set()
    for (const r of (meterHourPayload.value.rows || [])) {
        if ((block && r.block !== block) || (level && r.level !== level)) continue
        if (r.panel) out.add(String(r.panel))
    }
    return Array.from(out).sort()
}

// read/write helpers for v-model on <select>
function getSelectedPanel(block, level) {
    const k = levelKey(block, level)
    return selectedPanelByLevel.value.get(k) || ''
}
function setSelectedPanel(block, level, val) {
    const k = levelKey(block, level)
    selectedPanelByLevel.value.set(k, val)
}

// Convenience to ensure there's a sensible default selection the first time
function ensureDefaultPanel(block, level) {
    const k = levelKey(block, level)
    if (!selectedPanelByLevel.value.has(k)) {
        const opts = panelsForLevel(block, level)
        if (opts.length) selectedPanelByLevel.value.set(k, opts[0])
    }
}

// Actions wired to the dropdown’s current value
function onClickSetThreshold(block, level) {
    ensureDefaultPanel(block, level)
    const p = getSelectedPanel(block, level)
    if (!p) { alert('No panel on this level.'); return }
    openEnergyThresholdModal(p) // from your energy thresholds code
}

function onClickDeleteThreshold(block, level) {
    ensureDefaultPanel(block, level)
    const p = getSelectedPanel(block, level)
    if (!p) { alert('No panel on this level.'); return }
    onRequestDeleteEnergyThreshold(p) // from your energy thresholds code
}

// --- add near other refs at the top of <script setup>
const authRole = ref(localStorage.getItem('auth_role') || 'user') // e.g. 'admin' | 'user'
const canSeeAdminViews = computed(() => authRole.value !== 'user')

// --- EV trend controls ---
const evGran = ref('D'); // 'D' | 'W' | 'M' | 'Y'

const evTrendDate = ref(new Date().toISOString().slice(0, 10)); // Day: YYYY-MM-DD
const evTrendWeek = ref(getCurrentISOWeek());                   // Week: YYYY-Www
const evTrendMonth = ref(new Date().toISOString().slice(0, 7)); // Month: YYYY-MM
const evTrendYear = ref(new Date().getFullYear());              // Year: YYYY

const evTrendLoading = ref(false);
const evTrendError = ref(null);
const evTrendPoints = ref([]);


async function applyEvTrend() {
    evTrendLoading.value = true;
    evTrendError.value = null;

    try {
        let startYmd = '';
        let endYmd = '';

        if (evGran.value === 'D') {
            const d = new Date(evTrendDate.value);
            if (Number.isNaN(d)) throw new Error('Invalid day');
            startYmd = evTrendDate.value;
            endYmd = ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
        } else if (evGran.value === 'W') {
            const { start, end } = weekBounds(evTrendWeek.value);
            if (!start || !end) throw new Error('Invalid week');
            startYmd = ymd(start);
            endYmd = ymd(end);
        } else if (evGran.value === 'M') {
            const { start, end } = monthBounds(evTrendMonth.value);
            if (!start || !end) throw new Error('Invalid month');
            startYmd = ymd(start);
            endYmd = ymd(end);
        } else if (evGran.value === 'Y') {
            const { start, end } = yearBounds(evTrendYear.value);
            if (!start || !end) throw new Error('Invalid year');
            startYmd = ymd(start);
            endYmd = ymd(end);
        }

        const params = new URLSearchParams({
            deviceName: 'Energy Node 1',
            start: startYmd,
            end: endYmd,
        });

        const resp = await fetch(`${EV_API_BASE}?${params.toString()}`, {
            cache: 'no-cache',
        });
        if (!resp.ok) throw new Error('EV API error');

        const data = await resp.json();
        evTrendPoints.value = (Array.isArray(data) ? data : []).map(r => ({
            ts: r.timestamp,
            v: Number(r.totalPower || 0),
        }));
    } catch (err) {
        console.error(err);
        evTrendError.value = err.message || 'Failed to load EV trend';
        evTrendPoints.value = [];
    } finally {
        evTrendLoading.value = false;
    }
}

let trendAutoTimer = null

function autoApplyTrendSoon() {
    if (trendAutoTimer) clearTimeout(trendAutoTimer)
    trendAutoTimer = setTimeout(() => {
        // If user is on EV tab, apply EV chart instead
        if (currentTab.value === 'EV') {
            applyEvTrend()
            return
        }

        // Normal chart
        if (!canApplyGranular.value) return
        applyGranularTrend()
    }, 200)
}

// ✅ Auto apply when changing block tab / level tab
watch([currentTab, currentLevel], autoApplyTrendSoon)


function formatEvTime(ts) {
    const d = new Date(ts);
    if (Number.isNaN(d)) return String(ts ?? '');

    // 24-hour HH:MM
    return d.toLocaleTimeString('en-SG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

const evDisplaySeries = computed(() => {
    const pts = evTrendPoints.value || [];
    if (!pts.length) return { labels: [], data: [] };

    if (evGran.value === 'D') {
        return {
            labels: pts.map(p => formatEvLabel(p.ts)),
            data: pts.map(p => p.v),
        };
    }

    const bucket = new Map();

    const keyOf = (ts) => {
        const d = new Date(ts);
        if (Number.isNaN(d)) return null;

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        // ⬇️ THIS is what we change
        if (evGran.value === 'W') {
            // Week → sum per DAY
            return `${y}-${m}-${day}`;      // 2025-12-03
        }

        if (evGran.value === 'M') {
            // Month → sum entire MONTH (you'll get one "Dec", not 01/02/03)
            return `${y}-${m}-01`;          // 2025-12-01
        }

        if (evGran.value === 'Y') {
            // Year → sum entire YEAR (one point "2025")
            return `${y}-01-01`;            // 2025-01-01
        }

        return null;
    };

    for (const p of pts) {
        const k = keyOf(p.ts);
        if (!k) continue;
        const val = Number(p.v || 0);
        bucket.set(k, (bucket.get(k) || 0) + val);
    }

    const entries = Array.from(bucket.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

    const labels = entries.map(([k]) => formatEvLabel(k));
    const data = entries.map(([, sum]) => sum);

    return { labels, data };
});

const evTrendChartData = computed(() => {
    // Sort points by time first (nicer x-axis)
    const points = [...evTrendPoints.value]
        .filter(p => p && p.ts != null)
        .sort((a, b) => new Date(a.ts) - new Date(b.ts));

    // ---------------- Day (no bucketing) ----------------
    if (evGran.value === 'D') {
        return {
            labels: points.map(p => formatEvLabel(p.ts)),
            datasets: [
                {
                    label: 'kWh',
                    data: points.map(p => Number(p.v || 0)),
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 2,
                },
            ],
        };
    }

    // ---------------- Week / Month / Year (bucket + sum) ----------------
    const bucketMap = new Map(); // key -> { sum, date }

    for (const p of points) {
        const d = new Date(p.ts);
        if (Number.isNaN(d)) continue;

        let key;

        if (evGran.value === 'W' || evGran.value === 'M') {
            // bucket by calendar day (YYYY-MM-DD)
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            key = `${y}-${m}-${dd}`;
        } else if (evGran.value === 'Y') {
            // bucket by calendar month (YYYY-MM)
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            key = `${y}-${m}`;
        } else {
            key = String(p.ts);
        }

        const existing = bucketMap.get(key);
        if (!existing) {
            bucketMap.set(key, { sum: Number(p.v || 0), date: d });
        } else {
            existing.sum += Number(p.v || 0);
            // keep earliest date for a stable label
            if (d < existing.date) existing.date = d;
        }
    }

    const sortedKeys = Array.from(bucketMap.keys()).sort();
    const labels = [];
    const data = [];

    for (const key of sortedKeys) {
        const { sum, date } = bucketMap.get(key);
        let label;

        if (evGran.value === 'W' || evGran.value === 'M') {
            // 01 Dec, 02 Dec, 03 Dec...
            label = date.toLocaleDateString('en-SG', {
                day: '2-digit',
                month: 'short',
            });
        } else if (evGran.value === 'Y') {
            // Jan, Feb...
            label = date.toLocaleDateString('en-SG', { month: 'short' });
        } else {
            label = formatEvLabel(date.toISOString());
        }

        labels.push(label);
        data.push(sum);
    }

    return {
        labels,
        datasets: [
            {
                label: 'kWh',
                data,
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 2,
            },
        ],
    };
});


const evTrendChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
    interaction: {
        mode: 'index',
        intersect: false,
    },
    scales: {
        x: {
            ticks: {
                color: '#ffffff',          // brighter
                padding: 10,
                autoSkip: true,
                maxTicksLimit: 12,
                maxRotation: 0,
                callback: (_val, idx) => {
                    const lbl = evTrendChartData.value?.labels?.[idx];
                    return String(lbl ?? '');
                },
            },
            grid: { color: 'rgba(255,255,255,0.15)' },
        },
        y: {
            beginAtZero: true,
            ticks: {
                color: '#ffffff',          // brighter
                padding: 6,
            },
            grid: { color: 'rgba(255,255,255,0.15)' },
        },
    },
    plugins: {
        legend: {
            position: 'top',
            labels: { color: '#ffffff' }, // legend text white
        },
        tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            callbacks: {
                title: (items) => {
                    const idx = items?.[0]?.dataIndex ?? 0;
                    const lbl = evTrendChartData.value?.labels?.[idx];
                    return String(lbl ?? '');
                },
                label: (ctx) => {
                    const v = ctx.parsed?.y ?? ctx.raw;
                    return `kWh: ${numFmt.format(Number(v || 0))}`;
                },
            },
        },
    },
}));

watch(currentTab, (tab) => {
    if (tab === 'EV') {
        applyEvTrend();
    }
});

// force-tab guard (blocks manual changes)
watch(viewTab, (v) => {
    if (!canSeeAdminViews.value && v !== 'Dashboard') {
        viewTab.value = 'Dashboard'
    }
})


</script>
<style scoped>
/* Base */
.energy-management-container {
    margin: 0 auto;
    padding: 24px 28px;
    background: #0b1220;
    min-height: 100vh;
    color: #e5e7eb;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
}

/* Header grid */
.page-header {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    align-items: end;
    row-gap: 8px;
    column-gap: 12px;
    margin-bottom: 18px;
}

.page-title {
    grid-column: 1/2;
    grid-row: 1/2;
    margin: 0;
    font-size: 24px;
    color: #f8fafc
}

.breadcrumb {
    grid-column: 2/3;
    grid-row: 1/2;
    color: #9fb0ff;
    text-align: right
}

.breadcrumb span {
    font-size: 14px;
    margin: 0 4px
}

/* View Tabs */
.view-tab-nav {
    display: flex;
    gap: 10px;
    margin: 10px 0 12px;
    overflow-x: auto;
    white-space: nowrap;
    padding-bottom: 4px;
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
    flex: 0 0 auto;
}

.view-tab-nav button:hover {
    background: rgba(255, 255, 255, .18)
}

.view-tab-nav button.active {
    background: #1976d2;
    border-color: #1976d2;
    color: #fff
}

.view-tab-nav .tab-spacer {
    flex: 1 1 auto
}

/* Icon-only button (rounded square) */
.icon-btn {
    width: 40px;
    height: 40px;
    display: inline-grid;
    place-items: center;
    border-radius: 10px !important;
    background: rgba(255, 255, 255, .08);
    border: 1px solid rgba(255, 255, 255, .12);
    color: #e5e7eb;
    cursor: pointer;
}

.icon-btn:hover {
    background: rgba(255, 255, 255, .18)
}

.icon-btn[disabled] {
    opacity: .6;
    cursor: not-allowed
}

.icon-btn i {
    font-size: 16px;
    line-height: 1
}

.icon-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, .45);
    border-color: rgba(25, 118, 210, .6)
}

/* Tabs */
.tab-nav,
.sub-tab-nav {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    white-space: nowrap;
    padding-bottom: 4px;
}

.tab-nav {
    margin-bottom: 10px
}

.sub-tab-nav {
    margin-bottom: 16px
}

.tab-nav::-webkit-scrollbar,
.sub-tab-nav::-webkit-scrollbar {
    height: 6px
}

.tab-nav::-webkit-scrollbar-thumb,
.sub-tab-nav::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, .15);
    border-radius: 999px
}

.tab-nav button,
.sub-tab-nav button {
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
    flex: 0 0 auto;
}

.tab-nav button:hover,
.sub-tab-nav button:hover {
    background: rgba(255, 255, 255, .18)
}

.tab-nav button.active,
.sub-tab-nav button.active {
    background: #1976d2;
    border-color: #1976d2;
    color: #fff
}

.tab-nav .err,
.sub-tab-nav .err {
    margin-left: 8px;
    color: #fda4af;
    font-size: .85rem
}

.tab-nav .loader,
.sub-tab-nav .loader {
    margin-left: 8px;
    color: #93c5fd;
    font-size: .85rem
}

/* Meta */
.meta-strip {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: start;
    margin-bottom: 14px;
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
    color: #e5e7eb;
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

/* highlight selected chip */
.chip.active {
    background: #fff;
    color: #0a1f44;
    /* your dark navy */
    border-color: #fff;
}


/* Grid + Cards */
.grid {
    display: grid;
    gap: 16px
}

.kpi-grid {
    grid-template-columns: repeat(3, minmax(240px, 1fr))
}

.card {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, .25);
}

/* KPI */
.kpi-top {
    display: flex;
    align-items: center;
    gap: 10px
}

.kpi-icon {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #fff
}

.kpi-label {
    color: #cbd5e1;
    font-size: .9rem
}

.kpi-value {
    font-size: 1.55rem;
    font-weight: 800;
    margin-top: 4px;
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

/* Charts */
.charts-grid {
    display: grid;
    grid-template-columns: 2fr 1.2fr;
    gap: 16px;
    margin: 14px 0
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    padding-top: 1%
}

.card-header h3 {
    margin: 0;
    font-size: 1rem;
    color: #e5e7eb
}

.chart-wrap {
    height: 420px
}

.chart-card {
    height: 650px;
    padding: 14px 14px 10px;
    border-radius: 12px;
    overflow: hidden
}

.chart-card .chart-wrap {
    padding: 0 0 40px;
    background: transparent;
    box-shadow: none
}

/* Trend layout */
.trend-row {
    display: flex;
    align-items: center;
    gap: 12px
}

.trend-row h3 {
    margin: 0
}

.trend-actions {
    margin-left: auto;
    display: inline-flex;
    gap: 8px
}

th.sortable {
    cursor: pointer;
    user-select: none;
}

th.asc::after {
    content: ' ▲';
    font-size: .8em;
    opacity: .8;
}

th.desc::after {
    content: ' ▼';
    font-size: .8em;
    opacity: .8;
}

/* NEW: controls row with meta + pickers on one line */
.trend-controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: -4px;
    margin-bottom: 2%;
}

.trend-pickers {
    display: flex;
    gap: 8px;
    align-items: center
}

/* Table */
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

.muted {
    color: #9fb0ff;
    opacity: .9
}

.err {
    color: #fda4af
}

/* Dark theme for selects */
select.chip {
    background-color: #121a2c;
    color: #e5e7eb;
    border-color: rgba(255, 255, 255, .24)
}

select.chip option {
    background-color: #0b1220;
    color: #e5e7eb
}

select.chip:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, .45)
}

/* Modal */
.modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .6);
    display: grid;
    place-items: center;
    z-index: 9999;
}

.modal {
    width: min(520px, 92vw);
    background: #0f172a;
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, .12);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, .5);
}

.modal-check {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
}

.action-cell {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
}

.chip-sm {
    padding: 5px 10px;
    font-size: .78rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .12);
    color: #fff;
    cursor: pointer;
}

.chip-sm.danger {
    background: rgba(220, 38, 38, .15);
    border-color: rgba(220, 38, 38, .35);
}

.chip-sm.danger:hover {
    background: rgba(220, 38, 38, .25);
}



.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 12px;
}


/* Responsive */
@media (max-width:1100px) {
    .charts-grid {
        grid-template-columns: 1fr
    }

    .chart-wrap {
        height: 320px
    }
}

@media (max-width:720px) {
    .trend-row {
        flex-wrap: wrap;
        gap: 8px
    }

    .trend-actions {
        width: 100%;
        justify-content: flex-start
    }

    .trend-controls-row {
        flex-wrap: wrap;
    }

    .trend-pickers {
        width: 100%;
        justify-content: flex-start
    }
}

@media (max-width:768px) {
    .energy-management-container {
        padding: 16px
    }

    .chart-wrap {
        height: 280px
    }
}
</style>