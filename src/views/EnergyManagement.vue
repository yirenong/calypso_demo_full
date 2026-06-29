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
            <!-- New NEW: hide for plain users -->
            <!-- <button v-if="canSeeAdminViews" :class="{ active: viewTab === 'Device List' }"
                @click="viewTab = 'Device List'">Device List</button> -->
            <button v-if="canSeeAdminViews" :class="{ active: viewTab === 'Faults' }"
                @click="viewTab = 'Faults'">Faults</button>

            <span class="tab-spacer"></span>
            <!-- Replace the existing download button -->
            <button class="icon-btn" @click="openDownloadModal" :disabled="exporting" aria-label="Download device list"
                :title="exporting ? 'Preparing...' : 'Download device list'">
                <i :class="['fas', exporting ? 'fa-spinner fa-spin' : 'fa-download']"></i>
            </button>

        </div>

        <!-- ========================= DASHBOARD ========================= -->
        <template v-if="viewTab === 'Dashboard'">
            <!-- Primary Tabs -->
            <div class="tab-nav">
                <button :class="{ active: currentTab === 'Overall' }" @click="selectBlock('Overall')">Overall</button>

                <button v-for="b in tabsBlocks" :key="b" :class="{ active: currentTab === b }" @click="selectBlock(b)">
                    {{ b }}
                </button>

                <!-- NEW: Utility Power tab -->
                <!-- <button :class="{ active: currentTab === 'UTILITY' }" @click="selectBlock('UTILITY')">
                    Utility Power
                </button> -->

                <!-- New: EV Charging Room tab -->
                <span v-if="hierLoading || powerLoading || trendLoading" class="loader">Loading...</span>
            </div>


            <!-- Level Tabs -->
            <!-- <div v-if="showLevelTabs" class="sub-tab-nav">
                <button :class="{ active: currentLevel === 'Overall' }" @click="selectLevel('Overall')">Overall</button>
                <button v-for="lvl in levelTabs" :key="lvl" :class="{ active: currentLevel === lvl }"
                    @click="selectLevel(lvl)">
                    {{ lvl }}
                </button>
            </div> -->

            <!-- Meta -->
            <div class="meta-strip">
                <div class="title-wrap">
                    <span class="badge">Campus Energy Usage</span>
                    <h1>
                        {{ currentTab }}<template v-if="showLevelTabs"> / {{ currentLevel }}</template>  Dashboard
                    </h1>
                </div>
                <div class="right-meta">
                    <div class="meta-chip">
                        Active: <strong>{{ currentTab }}</strong>
                        <template v-if="showLevelTabs"> - <strong>{{ currentLevel }}</strong></template>
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

                <!-- 3) Airside   Latest (Daily only) -->
                <div class="card kpi">
                    <div class="kpi-top" style="justify-content:space-between; gap:12px">
                        <div style="display:flex; align-items:center; gap:12px">
                            <div class="kpi-icon" style="background:#0ea5e9"><i class="fas fa-fan"></i></div>
                            <div class="kpi-label">Airside   Latest</div>
                        </div>
                        <!-- Just a static label now -->
                        <small class="muted">Daily average</small>
                    </div>
                    <div class="kpi-value">
                        <span v-if="airLoading">Loading...</span>
                        <span v-else-if="airError" class="err">{{ airError }}</span>
                        <template v-else>{{ fmtNum(airNow.kw_per_rt) }} <small>kW/RT</small></template>
                    </div>
                    <div class="kpi-sub muted" v-if="airNow.ts">
                        as of <small>{{ fmtDateTime(airNow.ts) }}</small>
                    </div>
                </div>


                <!-- Waterside   Latest -->
                <div class="card kpi">
                    <div class="kpi-top" style="justify-content:space-between; gap:12px">
                        <div style="display:flex; align-items:center; gap:12px">
                            <div class="kpi-icon"><i class="fas fa-water"></i></div>
                            <div class="kpi-label">Waterside   Latest</div>
                        </div>
                    </div>
                    <div class="kpi-value">
                        <span v-if="chillerLoading">Loading...</span>
                        <span v-else-if="chillerError" class="err">{{ chillerError }}</span>
                        <template v-else>{{ fmtNum(waterKwPerRt) }} <small>kW/RT</small></template>
                    </div>
                    <div class="kpi-sub muted" v-if="waterTs">as of <small>{{ fmtDateTime(waterTs) }}</small></div>
                </div>



                <!-- 5) TSE = Waterside + Airside -->
                <div class="card kpi">
                    <div class="kpi-top" style="justify-content:space-between; gap:12px">
                        <div style="display:flex; align-items:center; gap:12px">
                            <div class="kpi-icon" style="background:#f59e0b"><i class="fas fa-equals"></i></div>
                            <div class="kpi-label">TSE = Waterside + Airside</div>
                        </div>
                        <small class="muted">kW/RT</small>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(tseNow) }} <small>kW/RT</small>
                    </div>
                    <div class="kpi-sub muted">
                        (<small>Air {{ fmtNum(airNow.kw_per_rt) }}</small> + <small>Water {{ fmtNum(waterKwPerRt)
                            }}</small>)
                    </div>
                </div>

                <!-- 6) EUI -->
                <div class="card kpi">
                    <div class="kpi-top" style="justify-content:space-between; gap:12px">
                        <div style="display:flex; align-items:center; gap:12px">
                            <div class="kpi-icon" style="background:#ef4444"><i class="fas fa-ruler-combined"></i></div>
                            <div class="kpi-label">EUI</div>
                        </div>
                        <small class="muted">kWh/m2 (proxy)</small>
                    </div>
                    <div class="kpi-value">
                        {{ fmtNum(euiNow) }}
                    </div>

                    <div class="kpi-sub muted">
                        Cummulative Annual Energy Used / 192,820
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
                        <div class="top-controls" v-show="trendGran === 'H'"
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
                        </div>


                    </div>

                    <!-- Meta + time pickers (same line) -->
                    <div class="trend-controls-row">

                        <div class="trend-pickers" style="gap:8px; flex-wrap:wrap">
                            <!-- Granularity -->
                            <div class="granularity-buttons">
                                <button class="gran-btn" :class="{ active: trendGran === 'H' }"
                                    @click="trendGran = 'H'">H</button>
                                <button class="gran-btn" :class="{ active: trendGran === 'D' }"
                                    @click="trendGran = 'D'">D</button>
                                <button class="gran-btn" :class="{ active: trendGran === 'W' }"
                                    @click="trendGran = 'W'">W</button>
                                <button class="gran-btn" :class="{ active: trendGran === 'M' }"
                                    @click="trendGran = 'M'">M</button>
                                <button class="gran-btn" :class="{ active: trendGran === 'Y' }"
                                    @click="trendGran = 'Y'">Y</button>
                            </div>

                            <div class="granularity-buttons">
                                <button class="gran-btn" title="Line chart" :class="{ active: energyChartType === 'line' }"
                                    @click="energyChartType = 'line'">
                                    <i class="fas fa-chart-line"></i>
                                </button>
                                <button class="gran-btn" title="Bar chart" :class="{ active: energyChartType === 'bar' }"
                                    @click="energyChartType = 'bar'">
                                    <i class="fas fa-chart-bar"></i>
                                </button>
                            </div>

                            <!-- Day: pick a date + hourly FROM/TO -->
                            <template v-if="trendGran === 'H'">
                                <input class="chip" type="date" v-model="trendDay" />
                                <input class="chip" type="time" step="3600" v-model="trendFromTime" />
                                <span class="muted">to</span>
                                <input class="chip" type="time" step="3600" v-model="trendToTime" />
                            </template>

                            <!-- Daily: compare daily totals across a date range -->
                            <template v-else-if="trendGran === 'D'">
                                <span class="muted">From</span>
                                <input class="chip" type="date" v-model="trendDayFrom" />
                                <span class="muted">To</span>
                                <input class="chip" type="date" v-model="trendDayTo" />
                            </template>

                            <!-- Weekly: compare week totals across a week range -->
                            <template v-else-if="trendGran === 'W'">
                                <span class="muted">From</span>
                                <input class="chip" type="week" v-model="trendWeekFrom" />
                                <span class="muted">To</span>
                                <input class="chip" type="week" v-model="trendWeekTo" />
                            </template>

                            <!-- Monthly: compare month totals across a month range -->
                            <template v-else-if="trendGran === 'M'">
                                <span class="muted">From</span>
                                <input class="chip" type="month" v-model="trendMonthFrom" />
                                <span class="muted">To</span>
                                <input class="chip" type="month" v-model="trendMonthTo" />
                            </template>

                            <!-- Yearly: compare yearly totals across a year range -->
                            <template v-else>
                                <span class="muted">From</span>
                                <input class="chip" type="number" step="1" min="2000" :max="new Date().getFullYear()"
                                    v-model.number="trendYearFrom" style="width:110px" />
                                <span class="muted">To</span>
                                <input class="chip" type="number" step="1" min="2000" :max="new Date().getFullYear()"
                                    v-model.number="trendYearTo" style="width:110px" />
                            </template>

                        </div>

                    </div>

                    <div class="chart-wrap" v-if="trendLoading">Loading trend...</div>
                    <div class="chart-wrap" v-else>
                        <LineChartCard :key="`energy-trend-${currentTab}-${currentLevel}-${trendGran}-${periodMode}-${energyChartType}`"
                            :title="' '" :chartData="trendChartData" :options="trendChartOptions" />

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

                    <div class="chart-wrap" v-if="evTrendLoading">Loading EV trend...</div>
                    <div class="chart-wrap" v-else>
                        <LineChartCard :key="'ev-chart'" :title="' '" :chartData="evTrendChartData"
                            :options="evTrendChartOptions" />
                    </div>
                </div>


                <!-- Top Devices -->
                <div class="card chart-card top-blocks-card">
                    <div class="card-header" style="gap:10px">
                        <h3>Top Blocks by Energy</h3>
                        <select class="chip" v-model.number="topN" style="min-width:110px">
                            <option :value="5">Top 5</option>
                            <option :value="10">Top 10</option>
                            <option :value="15">Top 15</option>
                        </select>
                    </div>

                    <div class="chart-wrap top-blocks-chart" v-if="topLoading">Loading top devices...</div>
                    <div class="chart-wrap top-blocks-chart" v-else>
                        <BarChartCard :key="topBarKey" :title="' '" :chartData="topBarChartData"
                            :options="topBarOptions" />
                    </div>

                    <div class="table-wrap top-blocks-table" style="margin-top:8px">
                        <table>
                            <thead>
                                <tr>
                                    <th @click="sortByTop('rank')" :class="sortClassTop('rank')">#</th>
                                    <th @click="sortByTop('block')" :class="sortClassTop('block')">Block</th>
                                    <th @click="sortByTop('kwh')" :class="sortClassTop('kwh')">kWh</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in topBlocksRows" :key="r.block">
                                    <td>{{ r.rank }}</td>
                                    <td>{{ r.block }}</td>
                                    <td>{{ fmtNum(r.kwh) }}</td>
                                </tr>

                                <tr v-if="!topLoading && !topBlocksRows.length">
                                    <td colspan="3" class="muted">No data</td>
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
                        <small v-if="faultsLoading">Loading...</small>
                        <small v-else-if="faultsError" class="err">Error: {{ faultsError }}</small>
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
                                    <td>{{ f.description || ' ' }}</td>
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
        <!-- <template v-else-if="viewTab === 'Device List' && canSeeAdminViews">
            <section class="grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Devices   Overall</h3>
                        <small v-if="powerLoading">Loading...</small>
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
      {{ objectNamesForPanel(getSelectedPanelForDevice(r.device_id)).join(', ') || ' ' }}
    </code>
                                            </template>
                                            <template v-else>
                                                No threshold yet for
                                                <code>
      {{ objectNamesForPanel(getSelectedPanelForDevice(r.device_id)).join(', ') || ' ' }}
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
        </template> -->
    </div>
    <!-- Download Options Modal -->
    <div v-if="showDownloadModal" class="modal-backdrop" @click.self="closeDownloadModal">
        <div class="modal">
            <h3 style="margin:0 0 8px">Meter Snapshots Export</h3>
            <p class="muted" style="margin:0 0 12px">
                Choose single date or date range.
            </p>

            <div style="display:flex; flex-direction:column; gap:12px;">
                <div class="modal-check" style="gap:12px">
                    <label style="min-width:120px">Export mode</label>
                    <select v-model="snapshotMode" class="chip" style="min-width:180px">
                        <option value="single">Single date</option>
                        <option value="range">From / To</option>
                    </select>
                </div>

                <div v-if="snapshotMode === 'single'" class="modal-check" style="gap:12px">
                    <label style="min-width:120px">Date</label>
                    <input type="date" v-model="snapshotSingleDate" />
                </div>

                <template v-if="snapshotMode === 'range'">
                    <div class="modal-check" style="gap:12px">
                        <label style="min-width:120px">From</label>
                        <input type="date" v-model="snapshotStartDate" />
                    </div>

                    <div class="modal-check" style="gap:12px">
                        <label style="min-width:120px">To</label>
                        <input type="date" v-model="snapshotEndDate" />
                    </div>
                </template>
                <div class="modal-check" style="gap:12px">
                    <label style="min-width:120px">Options</label>
                    <div style="display:flex; flex-direction:column; gap:8px">
                        <label style="display:flex; align-items:center; gap:8px; color:#e2e8f0">
                            <input type="checkbox" v-model="snapshotShowCumulative" />
                            <span>Show Cumulative</span>
                        </label>

                        <label style="display:flex; align-items:center; gap:8px; color:#e2e8f0">
                            <input type="checkbox" v-model="snapshotShowUsage" />
                            <span>Show Usage</span>
                        </label>
                    </div>
                </div>
            </div>

            <p v-if="downloadValidation" class="err" style="margin:12px 0 0">
                Please select a valid date.
            </p>

            <div class="modal-actions">
                <button class="chip" @click="closeDownloadModal">Cancel</button>
                <button class="chip" :disabled="exporting" @click="performDownload">
                    {{ exporting ? 'Downloading...' : 'Download' }}
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
                    {{ eDeleting ? 'Deleting...' : 'Delete' }}
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

/* TOP DEVICES    endpoint */
const TOP_BASE_URL = 'http://127.0.0.1:8081/power/top'

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
   CHILLER   status/efficiency cards + TSE (kW/RT) combo
========================================================= */
const CHILLER_POINTS_URL = 'http://localhost:8082/points/latest?limit=500&offset=0'
const chillerLoading = ref(false), chillerError = ref(null), chillerPoints = ref([])

/* Granularity & pickers */
const trendGran = ref('H'); // 'H'|'D'|'W'|'M'|'Y'

const trendDay = ref(new Date().toISOString().slice(0, 10)); // 'YYYY-MM-DD'
const trendFromTime = ref('00:00');
const trendToTime = ref('23:59'); // so 23:00 samples aren't clipped


const trendDayFrom = ref(trendDay.value);
const trendDayTo = ref(trendDay.value);
const trendWeek = ref(getCurrentISOWeek()); // e.g., '2025-W43'
const trendWeekFrom = ref(trendWeek.value);
const trendWeekTo = ref(trendWeek.value);
const trendMonth = ref(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
const trendMonthFrom = ref(trendMonth.value);
const trendMonthTo = ref(trendMonth.value);
const trendYear = ref(new Date().getFullYear());
const trendYearFrom = ref(trendYear.value - 1);
const trendYearTo = ref(trendYear.value);

// ---- Month/Year compare APIs ----
const POWER_MONTH_URL = 'http://127.0.0.1:8081/power/block-level/month'
const POWER_YEAR_URL = 'http://127.0.0.1:8081/power/block-level/year'

// Download modal: date mode for hourly trend
// const hourlyDateMode = ref('single') // 'single' | 'custom'
// const hourlyExportStart = ref(new Date().toISOString().slice(0, 10))
// const hourlyExportEnd = ref(new Date().toISOString().slice(0, 10))

const TOP_BLOCKS_DAY_URL = 'http://127.0.0.1:8081/power/block/day/hour'

const topBlocksRows = ref([]) // [{ rank, block, kwh }]

const BLOCK_MONTH_URL = 'http://127.0.0.1:8081/power/block/month'

const monthBlockLoading = ref(false)
const monthBlockError = ref(null)
const monthBlockPayload = ref({ window: 'month', date: null, rows: [], total_kwh: 0 })
const dayKpiLoading = ref(false)
const dayKpiError = ref(null)
const dayKpiPayload = ref({ date: null, rows: [] })

// Utility Power endpoints (new)
const UTIL_DAY_URL = 'http://127.0.0.1:8081/power/block/day'
const UTIL_MONTH_TOTAL_URL = 'http://127.0.0.1:8081/power/block/month/total'

const utilDayKwh = ref(0)
const utilMonthKwh = ref(0)
const utilLoading = ref(false)
const utilError = ref(null)

// function findUtilityKwh(rows) {
//     const hit = (rows || []).find(r => String(r?.block || '').trim().toLowerCase() === 'utility power')
//     return Number(hit?.kwh || 0)
// }

const snapshotShowCumulative = ref(true)
const snapshotShowUsage = ref(true)

function csvCell(value) {
    if (value === null || value === undefined) return ''
    const text = String(value)
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function downloadLocalCsv(filename, header, rows) {
    const lines = [
        header.map(csvCell).join(','),
        ...rows.map(row => header.map(key => csvCell(row[key])).join(',')),
    ]
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(blobUrl)
}

function datesBetweenYmd(start, end) {
    const out = []
    const cur = new Date(`${start}T00:00:00`)
    const stop = new Date(`${end}T00:00:00`)
    while (cur <= stop && out.length < 366) {
        out.push(cur.toISOString().slice(0, 10))
        cur.setDate(cur.getDate() + 1)
    }
    return out
}

function fakeSnapshotUsage(block, level, date) {
    const blockNo = Math.max(1, block.charCodeAt(block.length - 1) - 64)
    const levelNo = Number(String(level).match(/\d+/)?.[0] || 1)
    const day = Number(String(date).slice(-2)) || 1
    return Number((85 + blockNo * 11.5 + levelNo * 8.2 + Math.sin((day + blockNo + levelNo) / 3) * 9).toFixed(2))
}

function buildMeterSnapshotRows(startDate, endDate, includeCumulative = true, includeUsage = true) {
    const dates = datesBetweenYmd(startDate, endDate)
    const levels = ['Level 1', 'Level 2', 'Level 3', 'Level 4']
    const rows = []
    for (const date of dates) {
        for (const { api: block } of BLOCK_TABS) {
            for (const level of levels) {
                const usage = fakeSnapshotUsage(block, level, date)
                const blockNo = Math.max(1, block.charCodeAt(block.length - 1) - 64)
                const levelNo = Number(level.match(/\d+/)?.[0] || 1)
                const cumulative = Number((10000 + blockNo * 1250 + levelNo * 310 + usage * (Number(date.slice(-2)) || 1)).toFixed(2))
                const row = {
                    Date: date,
                    Block: block,
                    Level: level,
                    Meter: `${block.replace(/\s+/g, '-')}-${level.replace(/\s+/g, '-')}`,
                }
                if (includeCumulative) row['Cumulative kWh'] = cumulative
                if (includeUsage) row['Usage kWh'] = usage
                rows.push(row)
            }
        }
    }
    return rows
}

function downloadMeterSnapshotCsvFile(startDate, endDate, filename) {
    const includeCumulative = snapshotShowCumulative.value
    const includeUsage = snapshotShowUsage.value
    const header = ['Date', 'Block', 'Level', 'Meter']
    if (includeCumulative) header.push('Cumulative kWh')
    if (includeUsage) header.push('Usage kWh')
    const rows = buildMeterSnapshotRows(startDate, endDate, includeCumulative, includeUsage)
    downloadLocalCsv(filename, header, rows)
}

async function downloadMeterSnapshotsCsv() {
    let fallbackName = 'meter_snapshots.csv'

    if (snapshotMode.value === 'single') {
        if (!snapshotSingleDate.value) {
            throw new Error('Please select a date.')
        }

        fallbackName = `meter_snapshots_${snapshotSingleDate.value}.csv`
        downloadMeterSnapshotCsvFile(snapshotSingleDate.value, snapshotSingleDate.value, fallbackName)
    } else {
        if (!snapshotStartDate.value || !snapshotEndDate.value) {
            throw new Error('Please select both From and To dates.')
        }

        if (snapshotStartDate.value > snapshotEndDate.value) {
            throw new Error('From date cannot be later than To date.')
        }

        fallbackName = `meter_snapshots_${snapshotStartDate.value}_to_${snapshotEndDate.value}.csv`
        downloadMeterSnapshotCsvFile(snapshotStartDate.value, snapshotEndDate.value, fallbackName)
    }
}

async function loadUtilityDay(dateYmd) {
    if (!dateYmd) return
    utilLoading.value = true
    utilError.value = null
    try {
        const r = await fetch(`${UTIL_DAY_URL}?date=${encodeURIComponent(dateYmd)}`, { cache: 'no-cache' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const body = await r.json()
        utilDayKwh.value = findUtilityKwh(body?.rows)
    } catch (e) {
        utilError.value = e?.message ?? 'Failed to load Utility Power (day)'
        utilDayKwh.value = 0
    } finally {
        utilLoading.value = false
    }
}

async function loadUtilityMonth(monthYm) {
    if (!monthYm) return
    utilLoading.value = true
    utilError.value = null
    try {
        const r = await fetch(`${UTIL_MONTH_TOTAL_URL}?month=${encodeURIComponent(monthYm)}`, { cache: 'no-cache' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const body = await r.json()
        utilMonthKwh.value = findUtilityKwh(body?.rows)
    } catch (e) {
        utilError.value = e?.message ?? 'Failed to load Utility Power (month)'
        utilMonthKwh.value = 0
    } finally {
        utilLoading.value = false
    }
}

async function loadBlockMonth() {
    monthBlockLoading.value = true
    monthBlockError.value = null
    try {
        const r = await fetch(BLOCK_MONTH_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        monthBlockPayload.value = data || { window: 'month', date: null, rows: [], total_kwh: 0 }
    } catch (e) {
        monthBlockError.value = e?.message ?? 'Failed to load month block data'
        monthBlockPayload.value = { window: 'month', date: null, rows: [], total_kwh: 0 }
    } finally {
        monthBlockLoading.value = false
    }
}

async function loadLatestDailyKpi() {
    dayKpiLoading.value = true
    dayKpiError.value = null
    try {
        const r = await fetch(BLOCK_MONTH_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        const rows = Array.isArray(data?.rows) ? data.rows : []
        let latest = null
        for (const row of rows) {
            const d = String(row?.date || '')
            if (d && (latest === null || d > latest)) latest = d
        }
        dayKpiPayload.value = {
            date: latest,
            rows: latest ? rows.filter(row => String(row?.date || '') === latest) : [],
        }
    } catch (e) {
        dayKpiError.value = e?.message ?? 'Failed to load latest daily KPI'
        dayKpiPayload.value = { date: null, rows: [] }
    } finally {
        dayKpiLoading.value = false
    }
}

function uiToBlocksTrendKey(tab) {
    const t = String(tab || '').trim().toUpperCase()
    if (!t || t === 'OVERALL') return 'OVERALL'
    if (t === 'B') return 'BD'     // IMPORTANT: API uses "BD" for Block B
    return t                       // A, C, D, E, F, G, H, J, K...
}


const monthPayload = ref(null)
const monthLoading = ref(false)
const monthError = ref(null)

const currentYm = () => new Date().toISOString().slice(0, 7) // "YYYY-MM"

onMounted(() => {
    loadBlockMonth(currentYm())
    loadLatestDailyKpi()
})

onMounted(() => {
    loadBlockMonth()
})


const latestMonthDate = computed(() => {
    const rows = monthBlockPayload.value?.rows || []
    let max = null
    for (const r of rows) {
        const d = String(r.date || '')
        if (!d) continue
        if (max === null || d > max) max = d // YYYY-MM-DD lexicographic works
    }
    return max
})

function sumMonthForBlock(blockNameOrNull) {
    const rows = monthBlockPayload.value?.rows || []

    if (!blockNameOrNull) {
        return rows.reduce((a, r) => {
            if (String(r.block).toLowerCase() === 'utility power') return a
            return a + Number(r.kwh || 0)
        }, 0)
    }

    const blk = String(blockNameOrNull).toUpperCase()
    return rows.reduce((a, r) => {
        if (String(r.block).toLowerCase() === 'utility power') return a
        if (String(r.block || '').toUpperCase() !== blk) return a
        return a + Number(r.kwh || 0)
    }, 0)
}

function sumDayForBlock(dateStr, blockNameOrNull) {
    const rows = monthBlockPayload.value?.rows || []
    const d0 = String(dateStr || '')
    if (!d0) return 0

    const blk = blockNameOrNull ? String(blockNameOrNull).toUpperCase() : null

    return rows.reduce((a, r) => {
        if (String(r.block).toLowerCase() === 'utility power') return a
        if (String(r.date || '') !== d0) return a
        if (blk && String(r.block || '').toUpperCase() !== blk) return a
        return a + Number(r.kwh || 0)
    }, 0)
}

function sumRowsForBlock(rows, blockNameOrNull) {
    if (!blockNameOrNull) {
        return (rows || []).reduce((a, r) => {
            if (String(r.block).toLowerCase() === 'utility power') return a
            return a + Number(r.kwh || 0)
        }, 0)
    }

    const blk = String(blockNameOrNull).toUpperCase()
    return (rows || []).reduce((a, r) => {
        if (String(r.block).toLowerCase() === 'utility power') return a
        if (String(r.block || '').toUpperCase() !== blk) return a
        return a + Number(r.kwh || 0)
    }, 0)
}


function uiToApiBlock(tab) {
    const t = String(tab || '').trim()
    if (!t) return ''

    if (/^BLK\s+/i.test(t)) return t.toUpperCase()

    // "Block A" -> "BLK A"
    const m = t.match(/^Block\s+([A-Z])$/i)
    if (m) return `BLK ${m[1].toUpperCase()}`

    return t
}

const monthRows = computed(() => Array.isArray(monthPayload.value?.rows) ? monthPayload.value.rows : [])

const BLOCK_TABS = [
    { ui: 'Block A', api: 'BLK A' },
    { ui: 'Block B', api: 'BLK B' },
    { ui: 'Block C', api: 'BLK C' },
    { ui: 'Block D', api: 'BLK D' },
    { ui: 'Block E', api: 'BLK E' },
    { ui: 'Block F', api: 'BLK F' },
    { ui: 'Block G', api: 'BLK G' },
    { ui: 'Block H', api: 'BLK H' },
    { ui: 'Block J', api: 'BLK J' },
    { ui: 'Block K', api: 'BLK K' },
]

// UI tab name -> backend block name
const TAB_TO_BLOCK = {
    'Block A': 'BLK A',
    'Block B': 'BLK B',
    'Block C': 'BLK C',
    'Block D': 'BLK D',
    'Block E': 'BLK E',
    'Block F': 'BLK F',
    'Block G': 'BLK G',
    'Block H': 'BLK H',
    'Block J': 'BLK J',
    'Block K': 'BLK K',
}

function tabToBackendBlock(tab) {
    return TAB_TO_BLOCK[tab] || tab
}

async function fetchBlocksTrend(startIso, endIso) {
    const url = `${BLOCKS_TREND_URL}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`
    const r = await fetch(url, { cache: 'no-cache' })
    if (!r.ok) throw new Error(`blocks/trend HTTP ${r.status}`)
    return await r.json()
}

function extractSeriesByKey(trendPayload, keyName) {
    const arr = Array.isArray(trendPayload) ? trendPayload : (trendPayload?.series || [])

    const hit = arr.find(s =>
        String(s?.key || '').trim().toLowerCase() === String(keyName).trim().toLowerCase()
    )

    return (hit?.points || []).map(p => ({
        ts: String(p.ts),
        kwh: Number(p.kwh || 0)
    }))
}

/* TOP DEVICES    state + fetch + chart */
const topWindow = ref('hour') // 'hour' | 'day'
const topN = ref(5) // 5 | 10 | 15
const topLoading = ref(false), topError = ref(null)
const topPayload = ref({ window: 'hour', ts: null, date: null, rows: [] })

async function loadTopBlocksByDay(dateYmd) {
    topLoading.value = true
    topError.value = null

    try {
        const r = await fetch(`${TOP_BLOCKS_DAY_URL}?date=${encodeURIComponent(dateYmd)}`, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)

        const body = await r.json()
        const rows = Array.isArray(body?.rows) ? body.rows : []

        // sum per block
        const totals = new Map()
        for (const x of rows) {
            const blk = String(x.block || '').trim()
            if (!blk) continue
            totals.set(blk, (totals.get(blk) || 0) + Number(x.kwh || 0))
        }

        // sort desc, take Top N
        const sorted = Array.from(totals.entries())
            .map(([block, kwh]) => ({ block, kwh }))
            .sort((a, b) => b.kwh - a.kwh)

        topBlocksRows.value = sorted.slice(0, topN.value).map((r, i) => ({
            rank: i + 1,
            block: r.block,
            kwh: r.kwh,
        }))
    } catch (e) {
        topError.value = e?.message ?? 'Failed to load top blocks'
        topBlocksRows.value = []
    } finally {
        topLoading.value = false
    }
}
function tabToApiBlock(tab) {
    const t = String(tab || '').trim();

    if (!t || t.toLowerCase() === 'overall') return 'Overall';

    // already backend style
    if (/^BLK\s+/i.test(t)) return t.toUpperCase();

    // "Block A" -> "BLK A"
    const m = t.match(/^Block\s+([A-Z])$/i);
    if (m) return `BLK ${m[1].toUpperCase()}`;

    // "A" -> "BLK A"
    if (/^[A-Z]$/i.test(t)) return `BLK ${t.toUpperCase()}`;

    return t.toUpperCase();
}


const topBarChartData = computed(() => ({
    labels: topBlocksRows.value.map(r => r.block),
    datasets: [{ label: 'kWh', data: topBlocksRows.value.map(r => r.kwh) }],
}))

const todayYmd = () => new Date().toISOString().slice(0, 10)

onMounted(() => {
    loadTopBlocksByDay(todayYmd())
})

watch(topN, () => {
    loadTopBlocksByDay(todayYmd())
})

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

    const want = tabToBlocksTrendKey(scopeBlock || 'Overall')

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

const periodModeLabel = computed(() => {
    if (periodMode.value === 'overall') return 'Overall (00:00-24:00)'
    if (periodMode.value === 'business') return 'Business (7am-6pm)'
    if (periodMode.value === 'offpeak1') return 'Off-peak 1 (6pm-11pm)'
    if (periodMode.value === 'offpeak2') return 'Off-peak 2 (11pm-7am)'
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
        // 00:00-07:00 (belongs to previous day's Off-peak 2), and 23:00-23:59 of this day.
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

const BLOCK_MONTH_TOTAL_URL = 'http://127.0.0.1:8081/power/block/month/total'

async function fetchBlockMonthTotalRange(startYmd, endYmd) {
    const url = `${BLOCK_MONTH_TOTAL_URL}?start=${encodeURIComponent(startYmd)}&end=${encodeURIComponent(endYmd)}`
    const r = await fetch(url, { cache: 'no-cache' })
    if (!r.ok) throw new Error(`Monthly API error: HTTP ${r.status}`)
    const body = await r.json()
    return Array.isArray(body?.rows) ? body.rows : []
}

// Normalize block labels into stable keys
function canonicalBlockKey(rawBlock) {
    const raw = String(rawBlock || '').trim()
    if (!raw) return ''
    return raw.toUpperCase()
        .replace(/\s+/g, ' ')
        .replace(/\s*-\s*/g, '-') // keep "Blk A-Admin ..." stable-ish
        .trim()
}

// Build a Map<canonicalKey, displayName> from any rows[] list
function buildBlockDictionary(rows) {
    const dict = new Map()
    for (const r of (rows || [])) {
        const key = canonicalBlockKey(r?.block)
        if (!key) continue
        if (!dict.has(key)) dict.set(key, String(r?.block || '').trim())
    }
    return dict
}

function pad2(n) { return String(n).padStart(2, '0') }

function localYmd(d = new Date()) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function localYm(d = new Date()) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

function addMonthsYm(yyyyMm, delta) {
    const [y, m] = yyyyMm.split('-').map(Number)
    const d = new Date(y, (m - 1) + delta, 1) // local
    return localYm(d) // OK local formatting (no ISO)
}

function lastDayOfMonthYmd(yyyyMm) {
    const [y, m] = yyyyMm.split('-').map(Number)
    const d = new Date(y, m, 0) // last day of month (local)
    return localYmd(d)
}

function firstDayOfMonthYmd(yyyyMm) {
    return `${yyyyMm}-01`
}

// Sort columns so BLK A..K come first, and "BLK G TF 7" stays near BLK G
function sortBlocksNiceByKey(aKey, bKey) {
    const order = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K']

    const rank = (key) => {
        const s = String(key || '').toUpperCase().trim()
        const m = s.match(/^BLK\s+([A-H]|J|K)\b/) // OK allow suffixes
        if (!m) return 999
        return order.indexOf(m[1])
    }

    const ra = rank(aKey), rb = rank(bKey)
    if (ra !== rb) return ra - rb

    // stable tie-break (numeric-aware)
    return String(aKey).localeCompare(String(bKey), undefined, { numeric: true, sensitivity: 'base' })
}

function isUtilitySeriesKey(key) {
    return String(key || '').trim().toLowerCase() === 'utility power'
}

function ymdToday() {
    return new Date().toISOString().slice(0, 10)
}
function monthStrFromYmd(ymd) { return String(ymd).slice(0, 7) } // YYYY-MM

function firstDayOfMonth(yyyyMm) { return `${yyyyMm}-01` }

function lastDayOfMonth(yyyyMm) {
    const [y, m] = yyyyMm.split('-').map(Number)
    const d = new Date(y, m, 0) // day 0 of next month => last day of this month
    return d.toISOString().slice(0, 10)
}

function addMonths(yyyyMm, delta) {
    const [y, m] = yyyyMm.split('-').map(Number)
    const d = new Date(y, (m - 1) + delta, 1)
    return d.toISOString().slice(0, 7)
}

function buildMonthList(startMonth, endMonth) {
    const out = []
    let cur = startMonth

    for (let i = 0; i < 24; i++) {
        out.push(cur)
        if (cur === endMonth) break
        cur = addMonthsYm(cur, 1)
    }
    return out
}

function monthWindowFromOption(option) {
    const cur = localYm() // OK local month
    const monthsBack =
        option === '3m' ? 2 :
            option === '6m' ? 5 :
                option === '12m' ? 11 :
                    0

    const startMonth = addMonthsYm(cur, -monthsBack)
    const endMonth = cur

    return {
        startYmd: firstDayOfMonthYmd(startMonth),
        endYmd: lastDayOfMonthYmd(endMonth),
        months: buildMonthList(startMonth, endMonth),
    }
}


function groupRowsByMonth(rows) {
    const byMonth = {}
    for (const r of (rows || [])) {
        const m = String(r?.month || '').slice(0, 7) // "2026-01"
        if (!m) continue
        if (!byMonth[m]) byMonth[m] = []
        byMonth[m].push(r)
    }
    return byMonth
}

function buildMonthlyTotalsPivot(months, byMonth, allRowsForDict) {
    const dict = buildBlockDictionary(allRowsForDict) // OK union across entire fetched window
    // Rename CP to Chiller Plant for export
    for (const [key, value] of dict.entries()) {
        if (value === 'BLK CP' || value === 'CP') {
            dict.set(key, 'Chiller Plant')
        }
    }

    const blockKeys = Array.from(dict.keys())
        .filter(k => !k.includes('BD'))   // <- remove BD
        .sort(sortBlocksNiceByKey)

    const out = []

    for (const m of months) {
        const rows = Array.isArray(byMonth?.[m]) ? byMonth[m] : []

        const totals = {}
        const seen = {}
        for (const k of blockKeys) { totals[k] = 0; seen[k] = false }

        for (const r of rows) {
            const key = canonicalBlockKey(r?.block)
            if (!key || totals[key] === undefined) continue
            totals[key] += Number(r?.kwh || 0)
            seen[key] = true
        }

        const row = { month: m }
        let total = 0
        for (const k of blockKeys) {
            const disp = dict.get(k)
            const val = seen[k] ? totals[k] : (EXPORT_BLANKS_FOR_MISSING ? '' : 0)
            row[disp] = val
            total += Number(totals[k] || 0)
        }
        row.Total = total
        out.push(row)
    }

    // TOTAL row
    const totalRow = { month: 'TOTAL' }
    let grand = 0
    for (const k of blockKeys) {
        const disp = dict.get(k)
        const s = out.reduce((a, r) => a + Number(r?.[disp] || 0), 0)
        totalRow[disp] = s
        grand += s
    }
    totalRow.Total = grand
    out.push(totalRow)

    return out
}

const includeMonthlySummary = ref(true)
const monthRangeOption = ref('this')

const EXPORT_BLANKS_FOR_MISSING = false

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
        const now = new Date()

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


function filterByWindows(labels, windows) {
    return labels.filter(iso => {
        const t = new Date(iso).getTime();
        return windows.some(w => t >= w.start.getTime() && t <= w.end.getTime());
    });
}


function todayMidnight() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function tomorrowMidnight() { const d = todayMidnight(); d.setDate(d.getDate() + 1); return d; }

// ---- Weekly debug switch + helper ----
const DEBUG_WEEK = true;
const dbgW = (...a) => { if (DEBUG_WEEK) console.log('%c[WEEK]', 'color:#10b981', ...a); };

// Remember the user's last non-Overall scope so we can restore it
watch(trendGran, (g) => {
    if (g !== 'M' && g !== 'Y') trendCompare.value = null

    if (false && typeof prevScope !== 'undefined') {
        // Restore the user's previous scope (if any)
        if (prevScope.tab !== null) { currentTab.value = prevScope.tab; prevScope.tab = null }
        if (prevScope.level !== null) { currentLevel.value = prevScope.level; prevScope.level = null }
    } else if (false && typeof prevScope !== 'undefined') {
        // Stash current scope once, then force Overall for D/W/M/Y
        if (prevScope.tab === null) prevScope.tab = currentTab.value
        if (prevScope.level === null) prevScope.level = currentLevel.value
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

function listMonthsInclusive(startYm, endYm) {
    const out = [];
    let cur = startYm;
    while (cur <= endYm) {
        out.push(cur);
        cur = addMonthsYm(cur, 1);
    }
    return out;
}

function labelMonth(ym) {
    const [y, m] = String(ym).split('-').map(Number);
    if (!y || !m) return String(ym || '');
    return new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(y, m - 1, 1));
}

function ymFirstDay(ym) {
    return `${ym}-01`;
}

function yearFirstDay(yearVal) {
    return `${Number(yearVal)}-01-01`;
}

async function fetchBlockMonthRangeRows(startYmd, endYmd) {
    const url = `${BLOCK_MONTH_URL}?start=${encodeURIComponent(startYmd)}&end=${encodeURIComponent(endYmd)}`;
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const body = await r.json();
    return Array.isArray(body?.rows) ? body.rows : [];
}

function blockMonthRowsForCurrentTab(rows) {
    if (currentTab.value === 'Overall') return rows || [];

    const wanted = tabToApiBlock(currentTab.value);
    if (!wanted || String(wanted).toLowerCase() === 'overall') return rows || [];

    const wantedUpper = String(wanted).toUpperCase();
    return (rows || []).filter(row => String(row?.block || '').toUpperCase() === wantedUpper);
}

function sumRowsByDatePart(rows, keyFn) {
    const bucket = new Map();
    for (const row of rows || []) {
        const key = keyFn(String(row?.date || ''));
        if (!key) continue;
        bucket.set(key, (bucket.get(key) || 0) + Number(row?.kwh || 0));
    }
    return bucket;
}

async function loadMonthCompare() {
    trendLoading.value = true; trendError.value = null;
    try {
        const months = listMonthsInclusive(trendMonthFrom.value, trendMonthTo.value);
        const startYmd = ymFirstDay(trendMonthFrom.value);
        const endYmd = ymFirstDay(addMonthsYm(trendMonthTo.value, 1));
        const rows = blockMonthRowsForCurrentTab(await fetchBlockMonthRangeRows(startYmd, endYmd));
        const byMonth = sumRowsByDatePart(rows, (date) => date.slice(0, 7));
        const totals = months.map(month => byMonth.get(month) || 0);
        const labels = months.map(labelMonth);
        trendCompare.value = { labels, datasets: [{ label: 'kWh', data: totals }] };
        trendSeries.value = { labels, data: totals };
    } catch (e) {
        trendError.value = e?.message ?? 'Month compare failed';
        trendCompare.value = null; trendSeries.value = { labels: [], data: [] };
    } finally { trendLoading.value = false; }
}

async function loadYearCompare() {
    trendLoading.value = true; trendError.value = null;
    try {
        const years = [];
        for (let y = Number(trendYearFrom.value); y <= Number(trendYearTo.value); y += 1) years.push(y);
        const startYmd = yearFirstDay(trendYearFrom.value);
        const endYmd = yearFirstDay(Number(trendYearTo.value) + 1);
        const rows = blockMonthRowsForCurrentTab(await fetchBlockMonthRangeRows(startYmd, endYmd));
        const byYear = sumRowsByDatePart(rows, (date) => date.slice(0, 4));
        const totals = years.map(year => byYear.get(String(year)) || 0);
        const labels = years.map(String);
        trendCompare.value = { labels, datasets: [{ label: 'kWh', data: totals }] };
        trendSeries.value = { labels, data: totals };
    } catch (e) {
        trendError.value = e?.message ?? 'Year compare failed';
        trendCompare.value = null; trendSeries.value = { labels: [], data: [] };
    } finally { trendLoading.value = false; }
}


/* Can-apply guard per granularity */
const canApplyGranular = computed(() => {
    if (trendGran.value === 'H') return !!trendDay.value && !!trendFromTime.value && !!trendToTime.value;
    if (trendGran.value === 'D') return !!trendDayFrom.value && !!trendDayTo.value && trendDayFrom.value <= trendDayTo.value;
    if (trendGran.value === 'W') return !!trendWeekFrom.value && !!trendWeekTo.value && trendWeekFrom.value <= trendWeekTo.value;
    if (trendGran.value === 'M') return !!trendMonthFrom.value && !!trendMonthTo.value && trendMonthFrom.value <= trendMonthTo.value;
    return Number.isFinite(trendYearFrom.value) && Number.isFinite(trendYearTo.value) && trendYearFrom.value <= trendYearTo.value;
});

/* Build [startIso, endIso] for H/D/W/M/Y and pipe to existing flow */
function applyGranularTrend() {
    const { startIso, endIso } = rangeFromGranularity();
    if (!startIso || !endIso) return;
    // Reuse your existing pathway:
    trendStartLocal.value = startIso; // existing refs
    trendEndLocal.value = endIso;     // existing refs
    applyTrend();                     // calls your loader and resets compare view
}

let trendAutoApplyTimer = null;
function scheduleGranularTrendApply() {
    if (trendAutoApplyTimer) clearTimeout(trendAutoApplyTimer);
    trendAutoApplyTimer = setTimeout(() => {
        trendAutoApplyTimer = null;
        if (canApplyGranular.value) applyGranularTrend();
    }, 250);
}

watch([
    trendDay,
    trendFromTime,
    trendToTime,
    trendDayFrom,
    trendDayTo,
    trendWeekFrom,
    trendWeekTo,
    trendMonthFrom,
    trendMonthTo,
    trendYearFrom,
    trendYearTo,
], scheduleGranularTrendApply)

function hasHierarchy() {
    return Object.keys(hierarchy.value?.by_block_level || {}).length > 0;
}


// NEW: always-sum across ALL blocks/levels (ignores currentTab/currentLevel)
// Helper: always sum ALL blocks/levels (ignores currentTab/currentLevel)
async function sumTrendOverallRange(startDate, endDate) {
    const startIso = toISOsec(startDate), endIso = toISOsec(endDate)
    const pairs = allBlockLevelPairs()   // <- every {block,level}
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
        //   - Overall tab -> sum all blocks
        //   - Block A tab -> only A
        //   - Block BD tab -> only BD, etc.
        const blockScope = tabToApiBlock(currentTab.value || 'Overall')
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

const BLOCK_DAY_HOUR_URL = 'http://127.0.0.1:8081/power/block/day/hour'

async function fetchBlockDayHourRange(startYmd, endYmd) {
    const url = `${BLOCK_DAY_HOUR_URL}?start=${encodeURIComponent(startYmd)}&end=${encodeURIComponent(endYmd)}`
    const r = await fetch(url, { cache: 'no-cache' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const b = await r.json()
    return Array.isArray(b?.rows) ? b.rows : []
}

function addDaysYmd(ymdStr, deltaDays) {
    const d = new Date(`${ymdStr}T00:00:00`)
    d.setDate(d.getDate() + deltaDays)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function listDatesInclusive(startYmd, endYmd) {
    const out = []
    let cur = startYmd
    while (cur <= endYmd) {
        out.push(cur)
        cur = addDaysYmd(cur, 1)
    }
    return out
}

/* Range builders */
function rangeFromGranularity() {
    if (trendGran.value === 'H') {
        const s = combineDateTime(trendDay.value, trendFromTime.value);
        const e = combineDateTime(trendDay.value, trendToTime.value);
        return { startIso: toIsoWithSeconds(s), endIso: toIsoWithSeconds(e) };
    }
    if (trendGran.value === 'D') {
        const s = combineDateTime(trendDayFrom.value, '00:00');
        const e = combineDateTime(addDaysYmd(trendDayTo.value, 1), '00:00');
        return { startIso: toIsoWithSeconds(s), endIso: toIsoWithSeconds(e) };
    }
    if (trendGran.value === 'W') {
        const from = weekBounds(trendWeekFrom.value);
        const to = weekBounds(trendWeekTo.value);
        return { startIso: toIsoWithSeconds(from.start), endIso: toIsoWithSeconds(to.end) };
    }
    if (trendGran.value === 'M') {
        const from = monthBounds(trendMonthFrom.value);
        const to = monthBounds(trendMonthTo.value);
        return { startIso: toIsoWithSeconds(from.start), endIso: toIsoWithSeconds(to.end) };
    }
    const start = yearBounds(trendYearFrom.value).start;
    const end = yearBounds(trendYearTo.value).end;
    return { startIso: toIsoWithSeconds(start), endIso: toIsoWithSeconds(end) };
}


function combineDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return '';
    // local ISO WITHOUT converting to UTC
    return `${dateStr}T${timeStr}:00`;
}



/* Week/month/year helpers */
function getCurrentISOWeek() {
    // yyyy-Www based on today (approx good enough for picker seed)
    const d = new Date();
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const day = Math.floor((d - oneJan) / 86400000) + 1;
    const week = Math.ceil((day + oneJan.getDay()) / 7);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-W${pad(week)}`;
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

function labelDay(isoOrYmd) {
    const d = new Date(isoOrYmd);
    if (Number.isNaN(d.getTime())) return String(isoOrYmd || '');
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function isoWeekInfo(dateVal) {
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const week = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return { year: d.getFullYear(), week };
}

function isoWeekKey(dateVal) {
    const info = isoWeekInfo(dateVal);
    return info ? `${info.year}-W${String(info.week).padStart(2, '0')}` : null;
}

function labelWeek(weekKey) {
    const m = /^(\d{4})-W(\d{2})$/.exec(String(weekKey || ''));
    if (!m) return String(weekKey || '');
    return `Week ${Number(m[2])}`;
}

function listWeeksInclusive(startWeek, endWeek) {
    const out = [];
    const { start } = weekBounds(startWeek);
    const { start: endStart } = weekBounds(endWeek);
    if (!start || !endStart) return out;
    const cur = new Date(start);
    while (cur <= endStart) {
        out.push(isoWeekKey(cur));
        cur.setDate(cur.getDate() + 7);
    }
    return out.filter(Boolean);
}

/* ===== Display aggregation for H/D/W/M/Y on the chart ===== */
const displaySeries = computed(() => {
    if (compareView.value) {
        return { labels: blocksCompare.value.labels, data: blocksCompare.value.data };
    }

    const labels = trendSeries.value.labels || [];
    const data = trendSeries.value.data || [];

    if (trendGran.value === 'H') return { labels, data };

    if (trendGran.value === 'D') {
        const bucket = new Map();
        for (let i = 0; i < labels.length; i++) {
            const d = new Date(labels[i]);
            if (Number.isNaN(d.getTime())) continue;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            bucket.set(key, (bucket.get(key) || 0) + Number(data[i] || 0));
        }
        const days = listDatesInclusive(trendDayFrom.value, trendDayTo.value);
        return { labels: days.map(labelDay), data: days.map(day => bucket.get(day) || 0) };
    }

    if (trendGran.value === 'W') {
        const bucket = new Map();
        for (let i = 0; i < labels.length; i++) {
            const key = isoWeekKey(labels[i]);
            if (!key) continue;
            bucket.set(key, (bucket.get(key) || 0) + Number(data[i] || 0));
        }
        const weeks = listWeeksInclusive(trendWeekFrom.value, trendWeekTo.value);
        return { labels: weeks.map(labelWeek), data: weeks.map(week => bucket.get(week) || 0) };
    }

    // Legacy fallback: monthly anchors for any non-compare month/year path.
    const bucket = new Map();
    const keyOf = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d)) return null;
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}-01T00:00:00`;
    };
    for (let i = 0; i < labels.length; i++) {
        const k = keyOf(labels[i]); if (!k) continue;
        bucket.set(k, (bucket.get(k) || 0) + Number(data[i] || 0));
    }

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

// TSE (kW/RT) & EUI (kWh/m2)
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
    const apiBlock = tabToApiBlock(currentTab.value);

    if (apiBlock === 'Overall') {
        pairs = allBlockLevelPairs();
    } else if (currentLevel.value === 'Overall') {
        pairs = blockAllLevels(apiBlock);
    } else {
        pairs = [{ block: apiBlock, level: currentLevel.value }];
    }


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

    const today = new Date()
    const daysPassedThisMonth = today.getDate() // 1..31

    // OK use the KPI month value instead of monthTotalKwh
    const monthUsageKwh = Number(monthKpiKwh.value ?? 0)

    const projectedAnnualKwh = ((365 - daysPassedThisMonth) * 40000) + monthUsageKwh
    const v = projectedAnnualKwh / EUI_DENOMINATOR

    euiNow.value = Number.isFinite(v) ? v : 0
}




// Resolve object_names for a given panel from hierarchy.by_panel
function objectNamesForPanel(panelName) {
    const arr = hierarchy.value?.by_panel?.[panelName]?.object_names
    return Array.isArray(arr) ? arr.filter(Boolean) : []
}

// Track all target object_names we'll write thresholds to (derived from a panel)
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
        faults.value = [...safe].sort(
            (a, b) => new Date(b.start_on || 0) - new Date(a.start_on || 0)
        )
    } catch (e) {
        faultsError.value = e?.message ?? 'Failed to load faults'
        faults.value = []
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
    if (canApplyGranular.value) applyGranularTrend()
    else if (canApplyTrend.value) loadTrendForSelection()
}



// Build merged time-series for the current scope using /power/blocks/trend
async function loadTrendFromBlocks(startIso, endIso) {
    trendLoading.value = true
    trendError.value = null
    trendCompare.value = null

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
        const scopeBlock = tabToBlocksTrendKey(currentTab.value)

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

        // For Hourly granularity, apply period filter (business / offpeak1 / offpeak2)
        if (trendGran.value === 'H' && periodMode.value && periodMode.value !== 'overall') {
            const anchor = new Date(`${trendDay.value}T00:00:00`)
            const windows = periodWindowsForDay(periodMode.value, anchor)
            const allowed = new Set(filterByWindows(labels, windows))

            labels = labels.filter(ts => allowed.has(ts))
            data = labels.map(ts => bucket.get(ts) || 0)
        }

        trendSeries.value = { labels, data }

        // For the little "- dateLabel" in the UI
        trendStartLocal.value = startIso
        trendEndLocal.value = endIso
    } catch (e) {
        console.error(e)
        trendError.value = e?.message ?? 'Failed to load trend'
        trendSeries.value = { labels: [], data: [] }
    } finally {
        trendLoading.value = false
    }
}


async function applyTrend() {
    // make sure compare mode is off when we're in "normal" view
    compareView.value = false

    if (trendGran.value === 'M') { await loadMonthCompare(); return }
    if (trendGran.value === 'Y') { await loadYearCompare(); return }

    trendCompare.value = null

    const { startIso, endIso } = rangeFromGranularity()
    if (!startIso || !endIso) return

    await loadTrendFromBlocks(startIso, endIso)
}


// Map an hour (0-23) to the new period buckets.
function periodNameForHour(h) {
    if (h >= 7 && h < 18) return 'business'   // 07:00-17:59
    if (h >= 18 && h < 23) return 'offpeak1'  // 18:00-22:59
    // 23:00-23:59 and 00:00-06:59
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
const trendGranularityHint = computed(() => {
    if (trendGran.value === 'H') return 'Hourly data'
    if (trendGran.value === 'D') return 'Daily data'
    if (trendGran.value === 'W') return 'Weekly data'
    if (trendGran.value === 'M') return 'Monthly data'
    return 'Yearly data'
})
const dateLabel = computed(() => {
    if (!trendStartLocal.value || !trendEndLocal.value) return ' '
    const s = new Date(trendStartLocal.value), e = new Date(trendEndLocal.value), today = new Date()
    if (isSameLocalDay(s, today) && isSameLocalDay(e, today)) return 'Today'
    return isSameLocalDay(s, e) ? fmtDate(s) : `${fmtDate(s)} -> ${fmtDate(e)}`
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
const tabsBlocks = computed(() => BLOCK_TABS.map(b => b.ui))


const levelTabs = computed(() => {
    if (!showLevelTabs.value) return []
    const lvls = Object.keys(hierarchy.value.by_block_level?.[currentTab.value] || {})
    return lvls.sort(levelCompare)
})

// Toggle for trend card: 'line' (line only) or 'combo' (bar + line overlay)
const trendMode = ref('line');
const energyChartType = ref('line');
function toggleTrendMode() {
    trendMode.value = trendMode.value === 'line' ? 'combo' : 'line';
}


/* Selection scope helpers */
const selectionScope = computed(() => {
    if (currentTab.value === 'Overall') return {}
    if (currentTab.value === 'EV') return { block: 'EV' } // keep your EV logic unchanged if you already handle it
    const apiBlock = uiToApiBlock(currentTab.value)
    return { block: apiBlock }
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

// Convert UI tab ("Block A", "BLK A", "A", "BLK CP") -> API key ("A", "CP", "BD", ... , "Utility Power")
function tabToBlocksTrendKey(tab) {
    const t = String(tab || '').toUpperCase().trim()

    if (t === 'OVERALL') return 'OVERALL'

    // OK ADD THIS (so "UTILITY" tab matches API key "Utility Power")
    if (t === 'UTILITY' || t === 'UTILITY POWER') return 'UTILITY POWER'

    if (t.includes('AUDI') && (t.includes('BLK A') || t === 'A AUDI' || t.includes('BLOCK A'))) return 'A-AUDI'

    if (t.includes('BLK B') || t === 'B' || t.includes('BLOCK B')) return 'BD'
    if (t.includes('BLK D') || t === 'D' || t.includes('BLOCK D')) return 'D'

    // generic cases
    return t
        .replace(/^BLOCK\s+/, '')
        .replace(/^BLK\s+/, '')
        .trim()
}

const dayDate = computed(() => dayKpiPayload.value.date || latestMonthDate.value)

const dayKpiKwh = computed(() => {
    const ev = evDayTotalPower.value || 0

    // EV tab = EV only
    if (currentTab.value === 'EV') return ev

    // campus day = latest daily KPI snapshot, independent from chart filters
    const backendBlock =
        currentTab.value === 'Overall' ? null : tabToBackendBlock(currentTab.value)

    const campusDay = sumRowsForBlock(dayKpiPayload.value.rows, backendBlock)

    // Overall = campus + EV, Blocks = campus only
    return currentTab.value === 'Overall' ? (campusDay) : campusDay
})

const dayKpiKw = computed(() => Number(dayKpiKwh.value || 0) / 24)

const monthKpiKwh = computed(() => {
    const ev = evMonthTotalPower.value || 0

    if (currentTab.value === 'EV') return ev

    const backendBlock =
        currentTab.value === 'Overall' ? null : tabToBackendBlock(currentTab.value)

    const campusMonth = sumMonthForBlock(backendBlock)

    return currentTab.value === 'Overall' ? (campusMonth) : campusMonth
})


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
    const { startIso, endIso } = rangeFromGranularity()
    if (!startIso || !endIso) {
        blocksCompare.value = { labels: [], data: [] }
        return
    }

    trendLoading.value = true
    trendError.value = null

    try {
        const params = new URLSearchParams({
            start: startIso,
            end: endIso
        })

        const resp = await fetch(`${BLOCKS_TREND_URL}?${params.toString()}`, {
            cache: 'no-cache'
        })

        if (!resp.ok) throw new Error('HTTP ' + resp.status)

        const body = await resp.json()
        const series = Array.isArray(body?.series) ? body.series : []

        const labels = []
        const data = []

        for (const s of series) {
            // Exclude EXCLUDE Utility Power (applies to ALL periods)
            if (String(s?.key || '').trim().toLowerCase() === 'utility power') continue

            const total = (s.points || []).reduce((acc, pt) => {
                return acc + Number(pt.kwh || 0)
            }, 0)

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
        // ===== NEW: Utility Power uses /power/blocks/trend and key="Utility Power" =====
        // OK Utility Power plot only (does not affect other blocks)
        if (currentTab.value === 'UTILITY') {
            // trendJson shape: { start, end, series: [ { key, points } ... ] }
            const utilSeries = (trendJson?.series || []).find(s => s.key === 'Utility Power')

            const pts = (utilSeries?.points || [])
                .map(p => ({ ts: p.ts, kwh: Number(p.kwh || 0) }))
                .sort((a, b) => new Date(a.ts) - new Date(b.ts))

            // Use whatever your chart expects:
            // Option A (if your chart uses trendSeries.value like {labels,data})
            trendSeries.value = {
                labels: pts.map(p => p.ts),
                data: pts.map(p => p.kwh),
            }

            // Clear compare if you have it (safe)
            trendCompare.value = null

            return // OK IMPORTANT so it doesn't fall into the normal block logic
        }


        // ===== END Utility Power special-case =====

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

        // Only Hourly uses period window; range views keep all points for aggregation.
        let filtered = labels;
        if (trendGran.value === 'H') {
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

watch([currentTab, currentLevel], () => {
    // Use the SAME pathway as the Apply button (date picker + period gets applied)
    if (canApplyGranular.value) applyGranularTrend()
    else if (canApplyTrend.value) loadTrendForSelection()
})

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
        // Month/Year pair compare   bar by default
        return {
            labels: trendCompare.value.labels,
            datasets: trendCompare.value.datasets.map((ds, i) => ({
                ...ds,
                type: energyChartType.value,
                borderWidth: 2,
                tension: .35,
                pointRadius: energyChartType.value === 'line' ? 2 : 0,
                fill: false
            }))
        }
    }
    // Day/Week single line
    return {
        labels: displaySeries.value.labels,
        datasets: [{
            label: 'kWh',
            data: displaySeries.value.data,
            type: energyChartType.value,
            borderWidth: 2,
            tension: .35,
            pointRadius: energyChartType.value === 'line' ? 2 : 0,
            fill: false
        }]
    }
})

function fmtTrendTickDWMy(idx) {
    const lbl = trendChartData.value?.labels?.[idx];
    if (compareView.value || isCompareBar.value) return String(lbl ?? ''); // use literal text for bars
    const d = new Date(lbl);
    if (Number.isNaN(d.getTime())) return String(lbl ?? '');
    if (trendGran.value === 'H') return dtfTime.format(d);
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
    if (trendGran.value === 'H') return dtfTime.format(d)   // time only
    if (trendGran.value === 'Y') return dtfMonth.format(d)  // month name
    return dtfDate.format(d)                                // date only
}
// --- Chart.js options (fix interaction + tooltip for bars) ---
const trendChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { bottom: 24 } }, // (or your existing bottom padding)
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

/* TOP DEVICES    fetch + compute */
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
    } catch (e) {
        topError.value = e?.message ?? 'Load failed'
        topPayload.value = { window: topWindow.value, ts: null, date: null, rows: [] }
    } finally { topLoading.value = false }
}
watch([topWindow, topN], loadTopDevices)

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
    if (p === 'business') return 'Business 7am-6pm'
    if (p === 'offpeak1') return 'Offpeak 1 6pm-11pm'
    if (p === 'offpeak2') return 'Offpeak 2 11pm-7am'
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



async function buildTrendBucketsForExport(startIso, endIso) {
    const overallBucket = new Map()          // ts -> sum kWh across all
    const perBlockBucket = new Map()         // block -> Map(ts->sum)
    const perBlockLevelBucket = new Map()    // block -> Map(level -> Map(ts->kWh))

    const bbl = hierarchy.value?.by_block_level || {}
    const pairs = []

    for (const blk of Object.keys(bbl)) {
        for (const lvl of Object.keys(bbl[blk] || {})) {
            pairs.push({ block: blk, level: lvl })
        }
    }

    // ---- Fallback path: if hierarchy isn't ready, use /power/blocks/trend ----
    if (!pairs.length) {
        const params = new URLSearchParams({ start: startIso, end: endIso })
        const url = `${BLOCKS_TREND_URL}?${params.toString()}`
        const r = await fetch(url, { cache: 'no-cache' })
        if (!r.ok) throw new Error(`blocks trend HTTP ${r.status}`)
        const body = await r.json()
        const series = Array.isArray(body?.series) ? body.series : []

        for (const s of series) {
            const blockKey = String(s?.key ?? '')
            if (!perBlockBucket.has(blockKey)) perBlockBucket.set(blockKey, new Map())
            const blockMap = perBlockBucket.get(blockKey)

            for (const pt of (s?.points || [])) {
                const ts = String(pt?.ts ?? '')
                if (!ts) continue
                const v = Number(pt?.kwh ?? 0)

                overallBucket.set(ts, (overallBucket.get(ts) || 0) + v)
                blockMap.set(ts, (blockMap.get(ts) || 0) + v)
            }
        }

        return { overallBucket, perBlockBucket, perBlockLevelBucket }
    }

    // ---- Normal path: hierarchy exists, use /power/block-level/trend per pair ----
    const payloads = await Promise.all(
        pairs.map(p => fetchTrendForOne(p.block, p.level, startIso, endIso))
    )

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
                const ts = String(pt.ts)
                if (!ts) continue
                const v = Number(pt.kwh || 0)

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

watch([annualTotalKwh, monthKpiKwh], () => {
    if (euiReady.value) recomputeEui()
})

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
            allAOA.push(['Device List   Overall'])
            allAOA.push(...jsonRowsToAOA(COLUMNS, overallDevRows))
            allAOA.push([])
        }

        if (hourly) {
            allAOA.push(['Energy Consumption Trend   Overall'])
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
                allAOA.push(['Last 7 Days   Total kWh (All Blocks)'])
                allAOA.push(['Date', 'Total kWh'])
                for (let i = 0; i < rowsOverall7.length; i++) {
                    const r = rowsOverall7[i]
                    allAOA.push([r.Date, r['Total kWh']])
                }
            } catch (e) {
                console.error('Failed to fetch/aggregate last 7 days:', e)
                allAOA.push([])
                allAOA.push(['Last 7 Days   Total kWh (All Blocks)'])
                allAOA.push(['Date', 'Total kWh'])
                allAOA.push([' ', ' '])
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
            allAOA.push(['Daily Energy Trend   Overall'])
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

                blAOA.push(['Device List   Block ' + b])
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
                blAOA.push(['Energy Consumption Trend   Block ' + b + ' (Overall)'])
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
                    blAOA.push(['Daily Energy Trend   Block ' + b])
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
                    blAOA.push(['Energy Consumption Trend   Block ' + b + ' - ' + lvl])
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
                        blAOA.push(['Daily Energy Trend   Block ' + b + ' - ' + lvl])
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
                blAOA.push(['Last 7 Days   Total kWh (Block ' + b + ')'])
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
                    blAOA.push([' ', ' '])
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
        loadLatestDailyKpi(),
    ]);

    await Promise.all([
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
    await refreshMonthTotal();
    await refreshMonthDaysWithData();
    if (!freezeEuiOnScopeChange) {
        await refreshAnnualTotal();
    }
});




onBeforeUnmount(() => {
    if (hourlyTimer) clearTimeout(hourlyTimer)
    if (trendAutoApplyTimer) clearTimeout(trendAutoApplyTimer)
})
function scheduleHourlyReload() {
    const now = new Date(), next = new Date(now)
    next.setHours(now.getHours() + 1, 1, 0, 0) // next hour + 1 minute
    const msUntilNext = next.getTime() - now.getTime()
    hourlyTimer = setTimeout(() => {
        trendStartLocal.value = toLocalISO(startOfToday())
        trendEndLocal.value = toLocalISO(new Date())
        loadHierarchy()
        loadPowerWindows()
        loadLatestDailyKpi()
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

// Actions wired to the dropdown's current value (PER DEVICE)
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
    // NOTE: no scope filter here   include ALL panels
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

    const arr = Array.from(map.values());
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

function groupRowsByDateFromTs(rows) {
    const byDate = {}
    const arr = Array.isArray(rows) ? rows : []

    for (const r of arr) {
        const ts = r?.ts
        if (!ts || typeof ts !== 'string') continue

        // Expecting "YYYY-MM-DDTHH:mm:ss"
        const dateKey = ts.slice(0, 10)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue

        if (!byDate[dateKey]) byDate[dateKey] = []
        byDate[dateKey].push(r)
    }

    return byDate
}

function buildHourlyPivotForDate(dateYmd, rowsForDay, dictAll, blockKeysAll) {
    // Always fixed 24 hours -> prevents "invalid array length"
    const HOURS = [
        '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
        '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
        '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
        '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
    ]

    const rows = Array.isArray(rowsForDay) ? rowsForDay : []
    const dict = dictAll instanceof Map ? dictAll : new Map()
    const blockKeysRaw = Array.isArray(blockKeysAll) ? blockKeysAll : []

    // 1) Remove BD from hourly export
    const blockKeys = blockKeysRaw.filter(k => !String(k).includes('BD'))

    // 2) Rename CP -> Chiller Plant (display only)
    const dispOf = (k) => {
        const disp = dict.get(k)
        if (disp === 'BLK CP' || disp === 'CP') return 'Chiller Plant'
        return disp
    }

    // Init rows
    const out = HOURS.map(h => {
        const r = { Date: dateYmd, Hour: h }
        for (const k of blockKeys) {
            const disp = dispOf(k)
            if (disp) r[disp] = 0
        }
        r.Total = 0
        return r
    })

    // Accumulate
    for (const r of rows) {
        const ts = String(r?.ts || '')
        if (ts.length < 13) continue

        const hourIdx = Number(ts.slice(11, 13))
        if (!Number.isFinite(hourIdx) || hourIdx < 0 || hourIdx > 23) continue

        const key = canonicalBlockKey(r?.block)

        // Skip BD rows
        if (String(key).includes('BD')) continue

        let disp = dict.get(key)
        if (!disp) continue

        // Rename CP column
        if (disp === 'BLK CP' || disp === 'CP') disp = 'Chiller Plant'

        const kwh = Number(r?.kwh || 0)
        out[hourIdx][disp] = Number(out[hourIdx][disp] || 0) + kwh
        out[hourIdx].Total += kwh
    }

    // TOTAL row
    const totalRow = { Date: 'TOTAL', Hour: '' }
    let grand = 0
    for (const k of blockKeys) {
        const disp = dispOf(k)
        if (!disp) continue
        const sum = out.reduce((a, rr) => a + Number(rr?.[disp] || 0), 0)
        totalRow[disp] = sum
        grand += sum
    }
    totalRow.Total = grand

    out.push(totalRow)
    return out
}


function buildDailyTotalsPivot(dates, byDate) {
    const safeDates = Array.isArray(dates) ? dates : []

    // Union all rows so we know every block column to create
    const allRows = []
    for (const d of safeDates) {
        const arr = byDate?.[d]
        if (Array.isArray(arr)) allRows.push(...arr)
    }

    const dict = buildBlockDictionary(allRows) // Map<canonicalKey, displayName>

    // Remove BD columns
    const blockKeys = Array.from(dict.keys())
        .filter(k => !String(k).includes('BD'))
        .sort(sortBlocksNiceByKey)

    // Rename CP display
    const dispOf = (k) => {
        const disp = dict.get(k)
        if (disp === 'BLK CP' || disp === 'CP') return 'Chiller Plant'
        return disp
    }

    const out = []

    for (const d of safeDates) {
        const rows = Array.isArray(byDate?.[d]) ? byDate[d] : []

        const totals = {}
        for (const k of blockKeys) totals[k] = 0

        for (const r of rows) {
            const key = canonicalBlockKey(r?.block)
            if (!key || totals[key] === undefined) continue

            // Skip BD rows
            if (String(key).includes('BD')) continue

            totals[key] += Number(r?.kwh || 0)
        }

        const row = { Date: d }
        let dayTotal = 0
        for (const k of blockKeys) {
            const disp = dispOf(k)
            if (!disp) continue
            const v = Number(totals[k] || 0)
            row[disp] = v
            dayTotal += v
        }
        row.Total = dayTotal
        out.push(row)
    }

    // TOTAL row
    const totalRow = { Date: 'TOTAL' }
    let grand = 0
    for (const k of blockKeys) {
        const disp = dispOf(k)
        if (!disp) continue
        const s = out.reduce((a, r) => a + Number(r?.[disp] || 0), 0)
        totalRow[disp] = s
        grand += s
    }
    totalRow.Total = grand
    out.push(totalRow)

    return out
}


const showDownloadModal = ref(false)
const downloadValidation = ref(false)

const snapshotMode = ref('single')
const snapshotSingleDate = ref(new Date().toISOString().slice(0, 10))
const snapshotStartDate = ref(new Date().toISOString().slice(0, 10))
const snapshotEndDate = ref(new Date().toISOString().slice(0, 10))

function openDownloadModal() {
    showDownloadModal.value = true
    downloadValidation.value = false
    snapshotMode.value = 'single'
    snapshotSingleDate.value = new Date().toISOString().slice(0, 10)
    snapshotStartDate.value = new Date().toISOString().slice(0, 10)
    snapshotEndDate.value = new Date().toISOString().slice(0, 10)

    snapshotShowCumulative.value = true
    snapshotShowUsage.value = true
}

function closeDownloadModal() {
    showDownloadModal.value = false
}

function getFilenameFromDisposition(disposition) {
    if (!disposition) return null

    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])

    const plainMatch = disposition.match(/filename="?([^"]+)"?/i)
    if (plainMatch?.[1]) return plainMatch[1]

    return null
}

async function performDownload() {
    downloadValidation.value = false

    let fallbackName = 'meter_snapshots.csv'
    let startDate = ''
    let endDate = ''

    if (snapshotMode.value === 'single') {
        if (!snapshotSingleDate.value) {
            downloadValidation.value = true
            return
        }

        startDate = snapshotSingleDate.value
        endDate = snapshotSingleDate.value
        fallbackName = `meter_snapshots_${snapshotSingleDate.value}.csv`
    } else {
        if (!snapshotStartDate.value || !snapshotEndDate.value || snapshotStartDate.value > snapshotEndDate.value) {
            downloadValidation.value = true
            return
        }

        startDate = snapshotStartDate.value
        endDate = snapshotEndDate.value
        fallbackName = `meter_snapshots_${snapshotStartDate.value}_to_${snapshotEndDate.value}.csv`
    }

    try {
        exporting.value = true
        downloadMeterSnapshotCsvFile(startDate, endDate, fallbackName)
        closeDownloadModal()
    } catch (err) {
        console.error(err)
        alert(err.message || 'Download failed.')
    } finally {
        exporting.value = false
    }
}


function formatEvLabel(ts) {
    const d = new Date(ts);
    if (Number.isNaN(d)) return String(ts ?? '');

    if (evGran.value === 'D') {
        // Day view -> show time HH:MM
        return d.toLocaleTimeString('en-SG', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    }

    if (evGran.value === 'W' || evGran.value === 'M') {
        // Week / Month -> 01 Dec, 02 Dec, ...
        return d.toLocaleDateString('en-SG', {
            day: '2-digit',
            month: 'short',
        });
    }

    if (evGran.value === 'Y') {
        // Year -> Jan, Feb, ...
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

// Actions wired to the dropdown's current value
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

        // Change THIS is what we change
        if (evGran.value === 'W') {
            // Week -> sum per DAY
            return `${y}-${m}-${day}`;      // 2025-12-03
        }

        if (evGran.value === 'M') {
            // Month -> sum entire MONTH (you'll get one "Dec", not 01/02/03)
            return `${y}-${m}-01`;          // 2025-12-01
        }

        if (evGran.value === 'Y') {
            // Year -> sum entire YEAR (one point "2025")
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

watch([currentTab, dayDate], async () => {
    if (currentTab.value !== 'UTILITY') return

    const d = dayDate.value || new Date().toISOString().slice(0, 10) // fallback
    const m = String(d).slice(0, 7)
    await Promise.all([loadUtilityDay(d), loadUtilityMonth(m)])
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

/* === Responsive Chart Sizing (use this ONE copy only) === */

.chart-card {
    display: flex;
    flex-direction: column;
    height: auto;
    /* important: do NOT force 730px etc */
    min-height: 0;
    overflow: hidden;
}

.chart-wrap {
    flex: 1 1 auto;
    position: relative;

    /* responsive height: grows/shrinks with screen */
    height: clamp(260px, 42vh, 575px);

    /* keep it safe on small screens */
    min-height: 260px;
}

/* if your chart component renders a canvas inside */
.chart-wrap canvas {
    width: 100% !important;
    height: 100% !important;
}

.top-blocks-card {
    padding-bottom: 10px;
}

.top-blocks-chart {
    height: clamp(190px, 28vh, 300px);
    min-height: 190px;
}

.top-blocks-table {
    max-height: 150px;
    overflow: auto;
}

.top-blocks-table th,
.top-blocks-table td {
    padding-top: 8px;
    padding-bottom: 8px;
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
    content: ' up';
    font-size: .8em;
    opacity: .8;
}

th.desc::after {
    content: ' down';
    font-size: .8em;
    opacity: .8;
}

/* NEW: controls row with meta + pickers on one line */
.trend-controls-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
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

/* ================================
   Export to Excel Modal (Larger UI)
   ================================ */

.export-modal {
    width: 520px;
    max-width: 90vw;
    padding: 24px 28px;
    background: linear-gradient(180deg, #0f172a, #020617);
    border-radius: 14px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    color: #e5e7eb;
    font-size: 14px;
}

/* Title */
.export-modal h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 18px;
    color: #f8fafc;
}

/* Rows */
.export-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
}

.export-row.column {
    flex-direction: column;
    align-items: flex-start;
}

/* Labels */
.export-label {
    font-size: 14px;
    color: #e5e7eb;
    user-select: none;
}

/* Checkboxes */
.export-row input[type="checkbox"] {
    cursor: pointer;
}

/* Select & Date Inputs */
.export-modal select,
.export-modal input[type="date"] {
    min-width: 180px;
    height: 36px;
    padding: 6px 10px;
    font-size: 14px;
    background: #020617;
    color: #f8fafc;
    border: 1px solid #1e293b;
    border-radius: 8px;
}

.export-modal select:focus,
.export-modal input[type="date"]:focus {
    outline: none;
    border-color: #38bdf8;
}

/* Divider */
.export-divider {
    margin: 16px 0;
    height: 1px;
    background: linear-gradient(to right, transparent, #1e293b, transparent);
}

/* Action Buttons */
.export-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
}

.export-actions button {
    min-width: 96px;
    height: 36px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 8px;
    cursor: pointer;
}

.export-actions .btn-cancel {
    background: #020617;
    color: #cbd5f5;
    border: 1px solid #1e293b;
}

.export-actions .btn-primary {
    background: linear-gradient(135deg, #38bdf8, #0ea5e9);
    color: #020617;
    border: none;
}

.export-actions button:hover {
    opacity: 0.9;
}

/* ================================
   FORCE bigger + consistent modal UI
   (Overrides existing styles)
   ================================ */

/* Modal panel */
.export-modal,
.export-modal * {
    box-sizing: border-box;
}

/* Make the panel bigger no matter what */
.export-modal {
    width: 620px !important;
    max-width: 92vw !important;
    padding: 26px 30px !important;
    border-radius: 14px !important;
    background: linear-gradient(180deg, #0f172a, #020617) !important;
    color: #e5e7eb !important;
    box-shadow: 0 22px 70px rgba(0, 0, 0, 0.65) !important;
    font-size: 15px !important;
}

/* Title */
.export-modal h3 {
    font-size: 18px !important;
    font-weight: 650 !important;
    margin: 0 0 16px 0 !important;
    color: #f8fafc !important;
}

/* Layout rows */
.export-modal .export-row {
    display: grid !important;
    grid-template-columns: 18px 1fr auto !important;
    align-items: center !important;
    gap: 10px 12px !important;
    margin: 10px 0 !important;
}

/* Rows with inputs (date mode / select date) */
.export-modal .export-row.two-col {
    grid-template-columns: 120px 1fr !important;
    /* label + control */
}

/* Checkbox */
.export-modal input[type="checkbox"] {
    width: 18px !important;
    height: 18px !important;
    accent-color: #38bdf8 !important;
    cursor: pointer !important;
}

/* Labels */
.export-modal .export-label {
    font-size: 14px !important;
    color: #e5e7eb !important;
    user-select: none !important;
}

/* Make selects + date inputs match (no tiny weird box) */
.export-modal select,
.export-modal input[type="date"],
.export-modal input[type="text"],
.export-modal input[type="number"] {
    width: 220px !important;
    max-width: 100% !important;
    height: 38px !important;
    padding: 8px 12px !important;
    font-size: 14px !important;
    line-height: 1.2 !important;
    border-radius: 10px !important;
    border: 1px solid rgba(148, 163, 184, 0.25) !important;
    background: rgba(2, 6, 23, 0.85) !important;
    color: #f8fafc !important;
    outline: none !important;
}

/* Focus */
.export-modal select:focus,
.export-modal input[type="date"]:focus,
.export-modal input[type="text"]:focus {
    border-color: #38bdf8 !important;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18) !important;
}

/* Fix "Range" row so label + select align nicely */
.export-modal .range-row {
    display: grid !important;
    grid-template-columns: 18px 1fr 220px !important;
    gap: 10px 12px !important;
    align-items: center !important;
}

/* Make the select not look squashed */
.export-modal .range-row select {
    width: 220px !important;
}

/* Action buttons */
.export-modal .export-actions {
    display: flex !important;
    justify-content: flex-end !important;
    gap: 12px !important;
    margin-top: 18px !important;
}

.export-modal .export-actions button {
    min-width: 104px !important;
    height: 38px !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    border-radius: 10px !important;
    cursor: pointer !important;
}

.export-modal .export-actions .btn-cancel {
    background: rgba(2, 6, 23, 0.9) !important;
    color: #e2e8f0 !important;
    border: 1px solid rgba(148, 163, 184, 0.25) !important;
}

.export-modal .export-actions .btn-primary {
    border: none !important;
    background: linear-gradient(135deg, #38bdf8, #0ea5e9) !important;
    color: #020617 !important;
}

.export-modal .export-actions button:hover {
    opacity: 0.92 !important;
}

.modal-section {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.modal-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.modal-range {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.modal-label {
    min-width: 90px;
    color: #cbd5e1;
    font-size: 14px;
}

.modal-input {
    min-width: 180px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.06);
    color: #fff;
    padding: 0 10px;
    outline: none;
}

.modal-input:focus {
    border-color: rgba(96, 165, 250, 0.9);
}

.validation-text {
    margin-top: 10px;
    color: #fca5a5;
    font-size: 13px;
}

.granularity-buttons {
    display: flex;
    gap: 6px;
    align-items: center;
}

.gran-btn {
    width: 33px;
    height: 30px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: #1f2d46;
    color: #cbd5e1;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
}

.gran-btn.active {
    background: #1976d2;
    color: white;
    border-color: #1976d2;
}

@media (max-width: 640px) {
    .export-modal {
        width: 94vw !important;
        max-height: 88vh !important;
        overflow: auto !important;
        padding: 18px !important;
    }

    .export-modal .export-row,
    .export-modal .export-row.two-col,
    .export-modal .range-row {
        grid-template-columns: 1fr !important;
    }

    .export-modal select,
    .export-modal input[type="date"],
    .export-modal input[type="text"],
    .export-modal input[type="number"],
    .export-modal .range-row select {
        width: 100% !important;
    }

    .export-modal .export-actions {
        flex-direction: column !important;
    }

    .export-modal .export-actions button {
        width: 100% !important;
    }
}
</style>
