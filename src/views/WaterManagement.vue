<template>
    <div class="water-management-container">
        <!-- Header -->
        <div class="page-header">
            <h2 class="page-title">Water Management</h2>

            <div class="page-header-right">
                <nav class="breadcrumb">
                    <span>Cavill</span> &gt; <span>Management</span> &gt; <span>Water Management</span>
                </nav>
            </div>
        </div>

        <!-- View Tabs + Download on the same line -->
        <div class="view-tab-bar">
            <div class="view-tab-nav">
                <button :class="{ active: viewTab === 'Dashboard' }" @click="viewTab = 'Dashboard'">Dashboard</button>
                <button v-if="canSeeAdminViews" :class="{ active: viewTab === 'Device List' }"
                    @click="viewTab = 'Device List'">Device List</button>
                <button v-if="canSeeAdminViews" :class="{ active: viewTab === 'Faults' }"
                    @click="viewTab = 'Faults'">Faults</button>
            </div>

            <!-- Download CSV (modal with options) -->
            <button class="icon-btn" @click="openDownloadModal" :disabled="exporting"
                :title="exporting ? 'Preparing…' : 'Export to Excel'">
                <i :class="['fas', exporting ? 'fa-spinner fa-spin' : 'fa-download']"></i>
            </button>

        </div>


        <!-- ========================= DASHBOARD ========================= -->
        <template v-if="viewTab === 'Dashboard'">
            <!-- Primary Tabs: Overall + dynamic blocks (A..K ordering) -->
            <div class="tab-nav">
                <button :class="{ active: currentTab === 'Overall' }" @click="selectBlock('Overall')">Overall</button>

                <!-- Existing dynamic Block tabs (A..K) -->
                <button v-for="b in tabsBlocks" :key="b" :class="{ active: currentTab === b }" @click="selectBlock(b)">
                    Block {{ b }}
                </button>

                <!-- NEW: Special tabs -->
                <button :class="{ active: currentTab === 'Swimming Pool' }" @click="selectBlock('Swimming Pool')">
                    Swimming Pool
                </button>

                <button :class="{ active: currentTab === 'Cooling Tower' }" @click="selectBlock('Cooling Tower')">
                    Cooling Tower
                </button>

                <span v-if="blocksLoading" class="loader">Loading blocks…</span>
                <span v-if="blocksError" class="err">Failed to load blocks</span>
            </div>


            <!-- Level Tabs (only when a specific Block is selected) -->
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
                    <span class="badge">Campus Water Usage</span>
                    <h1>{{ currentTab }}<template v-if="showLevelTabs"> / {{ currentLevel }}</template> — Dashboard
                    </h1>
                </div>
                <div class="right-meta">
                    <div class="meta-chip">
                        Active: <strong>{{ currentTab }}</strong><template v-if="showLevelTabs"> • <strong>{{
                            currentLevel }}</strong></template>
                    </div>
                </div>
            </div>

            <!-- KPI tiles -->
            <section class="grid kpi-grid">
                <div class="card kpi">
                    <div class="kpi-top" style="justify-content:space-between; gap:12px">
                        <div style="display:flex; align-items:center; gap:12px">
                            <div class="kpi-icon" style="background:#3b82f6"><i class="fas fa-faucet"></i></div>
                            <div class="kpi-label">Today's PUB water incoming</div>
                        </div>
                    </div>
                    <div class="kpi-value">{{ showNum(kpiPubToday, 1) }} <small>m³</small></div>
                    <div class="kpi-sub muted">From series × current source mix</div>
                </div>

                <div class="card kpi">
                    <div class="kpi-top">
                        <div class="kpi-icon" style="background:#22c55e"><i class="fas fa-leaf"></i></div>
                        <div class="kpi-label">Today's NEWater incoming</div>
                    </div>
                    <div class="kpi-value">{{ showNum(kpiNeToday, 1) }} <small>m³</small></div>
                    <div class="kpi-sub muted">From series × current source mix</div>
                </div>

                <div class="card kpi">
                    <div class="kpi-top">
                        <div class="kpi-icon" style="background:#f59e0b"><i class="fas fa-building"></i></div>
                        <div class="kpi-label">Today's Total Incoming</div>
                    </div>
                    <div class="kpi-value">{{ fmtNum(kpiCampusToday) }} <small>m³</small></div>
                    <div class="kpi-sub muted">Total for {{ summaryDateLocal }}</div>
                </div>

                <!-- WEI card -->
                <div class="card kpi">
                    <div class="kpi-top">
                        <!-- Blue water droplet icon -->
                        <div class="kpi-icon" style="background:#0ea5e9">
                            <i class="fas fa-tint"></i>
                        </div>
                        <div class="kpi-label">WEI - Water Efficiency Index</div>
                    </div>
                    <div class="kpi-value">
                        {{ weiValue.toFixed(2) }}
                    </div>
                    <div class="kpi-sub muted">
                        L/Pax/day
                    </div>
                </div>

                <!-- BAI card -->
                <div class="card kpi">
                    <div class="kpi-top">
                        <!-- Green briefcase icon -->
                        <div class="kpi-icon" style="background:#22c55e">
                            <i class="fas fa-briefcase"></i>
                        </div>
                        <div class="kpi-label">BAI - Business Activity Indicator</div>

                        <!-- Nicer edit button with pencil icon -->
                        <button class="kpi-edit-btn" @click="isBaiEditOpen = true">
                            <i class="fas fa-pen"></i>
                            Edit
                        </button>
                    </div>
                    <div class="kpi-value">
                        {{ baiValue.toLocaleString() }}
                    </div>
                    <div class="kpi-sub muted">
                        Pax/day
                    </div>
                </div>

                <div v-if="isBaiEditOpen" class="modal-backdrop" @click.self="isBaiEditOpen = false">
                    <div class="modal modal-bai">
                        <div class="modal-header">
                            <h3>Edit BAI</h3>
                            <span class="modal-subtitle">
                                Business Activity Indicator used in WEI calculation.
                            </span>
                        </div>

                        <div class="modal-body">
                            <label class="modal-label">
                                BAI value
                                <input type="number" v-model.number="baiValue" class="modal-input" min="1" />
                            </label>
                            <p class="modal-hint">
                                Default BAI is 24,753.
                            </p>
                        </div>

                        <div class="modal-actions">
                            <button class="modal-btn ghost" @click="isBaiEditOpen = false">
                                <i class="fas fa-times"></i>
                                Close
                            </button>
                        </div>
                    </div>
                </div>



                <!-- <div class="card kpi">
                    <div class="kpi-top" style="justify-content:space-between; gap:12px">
                        <div style="display:flex; align-items:center; gap:12px">
                            <div class="kpi-icon" style="background:#7c3aed"><i class="fas fa-users"></i></div>
                            <div class="kpi-label">Campus WUI</div>
                        </div>
                        <div style="display:flex; gap:8px; align-items:center">
                            <button class="chip" :class="{ active: wuiMode === 'population' }"
                                @click="wuiMode = 'population'">Population</button>
                            <button class="chip" :class="{ active: wuiMode === 'area' }"
                                @click="wuiMode = 'area'">Area</button>
                            <button class="chip" @click="openSiteEdit">{{ isOverall ? 'Edit Overall' : `Edit Block
                                ${currentTab}` }}</button>
                        </div>
                    </div>

                    <div class="kpi-value">
                        {{ showNum(kpiWui, 3) }}
                        <small>{{ wuiUnitLabel }}</small>
                    </div>
                    <div class="kpi-sub muted">
                        <template v-if="isOverall">
                            Total ({{ summaryDateLocal }}): {{ fmtNum(summaryTotalAll) }} m³ •
                            <template v-if="wuiMode === 'population'">
                                Population: {{ siteMeta.population ?? '—' }}
                                <small v-if="siteMeta.pop_updated_at"> • {{ new
                                    Date(siteMeta.pop_updated_at).toLocaleString() }}</small>
                            </template>
                            <template v-else>
                                Area: {{ siteMeta.area ?? '—' }} {{ areaUnitDisplay }}
                                <small v-if="siteMeta.area_updated_at"> • {{ new
                                    Date(siteMeta.area_updated_at).toLocaleString() }}</small>
                            </template>
                            <template v-if="siteMetaError"> • <span class="err">Meta: {{ siteMetaError
                                    }}</span></template>
                        </template>

                        <template v-else>
                            Total Block {{ currentTab }} ({{ summaryDateLocal }}): {{ fmtNum(summaryTotalActive) }} m³ •
                            <template v-if="wuiMode === 'population'">
                                Population: {{ activeBlockMeta.population }}
                                <small v-if="activeBlockMeta.pop_updated_at"> • {{ new
                                    Date(activeBlockMeta.pop_updated_at).toLocaleString() }}</small>
                            </template>
                            <template v-else>
                                Area: {{ activeBlockMeta.area }} {{ areaUnitDisplay }}
                                <small v-if="activeBlockMeta.area_updated_at"> • {{ new
                                    Date(activeBlockMeta.area_updated_at).toLocaleString() }}</small>
                            </template>
                        </template>
                    </div>

                    <div v-if="siteEditOpen" class="edit-panel">
                        <template v-if="isOverall">
                            <div class="edit-row">
                                <label>Overall Population</label>
                                <input type="number" v-model.number="editPopulation" min="0" step="1" />
                                <button class="chip" @click="saveOverallPopulation"
                                    :disabled="updatingPop">Save</button>
                                <span v-if="updatingPop" class="muted">Saving…</span>
                                <span v-if="updateOkPop" class="muted">Saved</span>
                                <span v-if="updateErrorPop" class="err">{{ updateErrorPop }}</span>
                            </div>
                            <div class="edit-row">
                                <label>Overall Area ({{ areaUnitDisplay }})</label>
                                <input type="number" v-model.number="editArea" min="0" step="0.0001" />
                                <button class="chip" @click="saveOverallArea" :disabled="updatingArea">Save</button>
                                <span v-if="updatingArea" class="muted">Saving…</span>
                                <span v-if="updateOkArea" class="muted">Saved</span>
                                <span v-if="updateErrorArea" class="err">{{ updateErrorArea }}</span>
                            </div>
                        </template>

                        <template v-else>
                            <div class="edit-row">
                                <label>Population (Block {{ currentTab }})</label>
                                <input type="number" v-model.number="editPopulation" min="0" step="1" />
                                <button class="chip" @click="saveBlockPopulation" :disabled="updatingPop">Save</button>
                                <span v-if="updatingPop" class="muted">Saving…</span>
                                <span v-if="updateOkPop" class="muted">Saved</span>
                                <span v-if="updateErrorPop" class="err">{{ updateErrorPop }}</span>
                            </div>
                            <div class="edit-row">
                                <label>Area ({{ areaUnitDisplay }}, Block {{ currentTab }})</label>
                                <input type="number" v-model.number="editArea" min="0" step="0.0001" />
                                <button class="chip" @click="saveBlockArea" :disabled="updatingArea">Save</button>
                                <span v-if="updatingArea" class="muted">Saving…</span>
                                <span v-if="updateOkArea" class="muted">Saved</span>
                                <span v-if="updateErrorArea" class="err">{{ updateErrorArea }}</span>
                            </div>
                        </template>

                        <div style="margin-top:6px">
                            <button class="chip" @click="closeSiteEdit">Close</button>
                        </div>
                    </div>
                </div> -->
            </section>

            <!-- Chart controls -->
            <div class="meta-strip" style="margin-top:2%">
                <div class="title-wrap">
                    <span class="badge">Block Series</span>
                    <h1 style="font-size:1rem;margin:6px 0 0">
                        {{ currentTab === 'Overall' ? 'Pick a Block' : 'Series for Block ' + currentTab }}
                    </h1>
                    <p class="subtitle" v-if="seriesError">Error: {{ seriesError }}</p>

                </div>
            </div>

            <!-- Trends + Source Distribution -->
            <section class="grid charts-grid">
                <div class="card chart-card">
                    <div class="card-header">
                        <h3>Water Consumption Trend (Total)</h3>
                        <small class="muted">{{ trendLabel }}</small>

                        <button class="chip" style="margin-left:auto" @click="toggleTrendMode">
                            {{ trendMode === 'line' ? 'Switch to Compare (Bar)' : 'Switch to Line' }}
                        </button>

                        <button class="chip" @click="toggleLineBarOne">
                            {{ lineBarOneMode ? 'Close Line + Bar' : 'Line + Bar' }}
                        </button>

                        <input v-if="lineBarOneMode" class="chip" type="date" v-model="lbDate"
                            @change="loadBlocksCompareForDate" :min="HARD_MIN_CHART_DATE" :max="maxChartISODate()" />

                        <!-- Moved here: below the toggles, aligned right -->
                        <div class="chart-gran">
                            <button class="chip" :class="{ active: wmGran === 'D' }" @click="setGran('D')">D</button>
                            <button class="chip" :class="{ active: wmGran === 'W' }" @click="setGran('W')">W</button>
                            <button class="chip" :class="{ active: wmGran === 'M' }" @click="setGran('M')">M</button>
                            <button class="chip" :class="{ active: wmGran === 'Y' }" @click="setGran('Y')">Y</button>

                            <template v-if="wmGran === 'D'">
                                <input class="chip" type="date" v-model="wmDay" :min="HARD_MIN_CHART_DATE"
                                    :max="maxChartISODate()" />

                            </template>
                            <template v-if="wmGran === 'W'">
                                <input class="chip" type="week" v-model="wmWeek" :min="'2025-W50'" :max="'2025-W50'" />
                            </template>

                            <template v-else-if="wmGran === 'M'">
                                <input class="chip" type="month" v-model="wmMonthStart" />
                                <input class="chip" type="month" v-model="wmMonthEnd" />
                            </template>
                            <template v-else>
                                <input class="chip chip-num" type="number" v-model.number="wmYearStart"
                                    placeholder="2024" />
                                <input class="chip chip-num" type="number" v-model.number="wmYearEnd"
                                    placeholder="2025" />
                            </template>

                            <button class="chip" @click="loadWaterDWMy" :disabled="seriesLoading">Apply</button>
                        </div>
                    </div>


                    <!-- loader -->
                    <div class="chart-wrap" v-if="seriesLoading || (lineBarOneMode && lbLoading)">Loading…</div>

                    <!-- NORMAL (line or bar) when not in mixed mode -->
                    <div class="chart-wrap" v-else-if="!lineBarOneMode && trendMode === 'line'">
                        <LineChartCard :key="'trend-line'" :title="' '" :chartData="chartAChartData"
                            :options="chartOptions" />
                    </div>
                    <div class="chart-wrap" v-else-if="!lineBarOneMode && trendMode !== 'line'">
                        <BarChartCard :key="'trend-compare-bar'" :title="' '" :chartData="compareBarDataSelection"
                            :options="barOptions" />
                    </div>

                    <!-- NEW: SINGLE mixed chart -->
                    <div class="chart-wrap" v-else>
                        <template v-if="lbError">
                            <span class="err">{{ lbError }}</span>
                        </template>
                        <template v-else>
                            <MixedChartCard :key="'trend-linebar-one'" :title="' '" :chartData="lbMixedChartData"
                                :options="lbMixedOptions" />
                            <small class="muted">
                                Bars: totals by block for {{ lbDate }} • Line: previous day ({{ lbPrevDate }})
                            </small>
                        </template>
                    </div>
                </div>

                <div class="card chart-card">
                    <div class="card-header">
                        <h3>
                            Water Source Distribution —
                            <template v-if="currentTab === 'Overall'">All Blocks</template>
                            <template v-else-if="currentLevel === 'Overall'">Block {{ currentTab }}</template>
                            <template v-else>Block {{ currentTab }} • {{ currentLevel }}</template>
                        </h3>
                        <button class="chip" @click="toggleSourceChartType" style="margin-left:auto">
                            {{ sourceChartType === 'pie' ? 'Switch to Bar' : 'Switch to Pie' }}
                        </button>
                    </div>

                    <div class="chart-wrap" style="height:320px">
                        <PieChartCard v-if="sourceChartType === 'pie'" :key="'src-pie'" :title="' '"
                            :chartData="pieChartData" :options="pieChartOptions" />
                        <BarChartCard v-else :key="'src-bar'" :title="' '" :chartData="pieChartBarData"
                            :options="barOptions" />
                    </div>

                    <div class="value-bars">
                        <div class="value-row">
                            <span class="value-label">PUB</span>
                            <div class="value-track">
                                <div class="value-fill pub"
                                    :style="{ width: valueBars.PUB.pct + '%', minWidth: valueBars.PUB.value > 0 ? '8px' : '0' }">
                                </div>
                            </div>
                            <span class="value-num">{{ valueBars.PUB.value.toLocaleString() }} m³ ({{
                                valueBars.PUB.pctOfTotal.toFixed(1) }}%)</span>
                        </div>
                        <div class="value-row">
                            <span class="value-label">NEWater</span>
                            <div class="value-track">
                                <div class="value-fill newater"
                                    :style="{ width: valueBars.NEWater.pct + '%', minWidth: valueBars.NEWater.value > 0 ? '8px' : '0' }">
                                </div>
                            </div>
                            <span class="value-num">{{ valueBars.NEWater.value.toLocaleString() }} m³ ({{
                                valueBars.NEWater.pctOfTotal.toFixed(1) }}%)</span>
                        </div>
                        <div class="value-hint muted">Bars scaled to the larger value for visibility.</div>
                    </div>
                </div>
            </section>
        </template>

        <!-- ========================= FAULTS ========================= -->
        <template v-else-if="viewTab === 'Faults'">
            <section class="grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Active Water Faults</h3>
                        <small v-if="faultsLoading">Loading…</small>
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
        <template v-else>
            <section class="grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Water Meters — {{ currentTab }}<template v-if="showLevelTabs"> / {{ currentLevel
                        }}</template></h3>
                        <small v-if="metersLoading">Loading…</small>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Block</th>
                                    <th>Level</th>
                                    <th>Meter Tag</th>
                                    <th>Place</th>
                                    <th>Serial No.</th>
                                    <th>Latest Cumulative</th>
                                    <th>Section</th>
                                    <th>Source</th>
                                    <th>Remarks</th>
                                    <!-- NEW -->
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="r in tableRows" :key="r.meter_tag + '-' + r.level_label">
                                    <td>{{ r.block }}</td>
                                    <td>{{ r.level_label }}</td>
                                    <td><code>{{ r.meter_tag }}</code></td>
                                    <td>{{ r.place || '—' }}</td>
                                    <td>{{ r.serial_no || '—' }}</td>
                                    <td>
                                        <template v-if="cumulativeLoading.has(r.meter_tag)">Loading…</template>
                                        <template v-else>
                                            {{ cumulativeMap[r.meter_tag]?.value ?? '—' }}
                                            <small v-if="cumulativeMap[r.meter_tag]?.ts" class="muted">
                                                ({{ new Date(cumulativeMap[r.meter_tag].ts).toLocaleString() }})
                                            </small>
                                        </template>
                                    </td>
                                    <td>{{ r.section || '—' }}</td>
                                    <td>{{ r.source }}</td>
                                    <td>{{ r.remarks || '—' }}</td>

                                    <!-- NEW: Action buttons -->
                                    <td>
                                        <div style="display:flex; gap:8px; flex-wrap:wrap">
                                            <button class="chip" @click="openThresholdModal(r.meter_tag)">Set
                                                Threshold</button>
                                            <button class="chip" @click="onRequestDeleteThreshold(r.meter_tag)">Delete
                                                Threshold</button>
                                        </div>
                                    </td>
                                </tr>

                                <tr v-if="!metersLoading && !tableRows.length">
                                    <td colspan="10" class="muted">No meters for this selection.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </template>

        <!-- NEW: Set/Edit Threshold Modal -->
        <div v-if="showThresholdModal" class="modal-backdrop" @click.self="closeThresholdModal">
            <div class="modal">
                <h3 style="margin:0 0 8px">Water Threshold</h3>
                <p class="muted" style="margin-top:0">
                    <template v-if="editTargets.length">
                        {{editTargets.some(n => thresholdsMap[n]) ? 'Update existing threshold(s)' : 'Create new threshold(s)' }} for
                        <code>{{ editTargets.join(', ') }}</code>
                    </template>
                    <template v-else>
                        <span class="err">No BACnet object_name found for this meter.</span>
                    </template>
                </p>


                <div class="edit-row">
                    <label>Min Value</label>
                    <input type="number" step="any" v-model.number="editMin" />
                </div>
                <div class="edit-row">
                    <label>Max Value</label>
                    <input type="number" step="any" v-model.number="editMax" />
                </div>
                <div class="edit-row">
                    <label>Enabled</label>
                    <input type="checkbox" v-model="editEnabled" />
                </div>

                <p v-if="thresholdSaveError" class="err" style="margin: 6px 0 0">{{ thresholdSaveError }}</p>

                <div class="modal-actions">
                    <button class="chip" @click="closeThresholdModal">Cancel</button>
                    <button class="chip" :disabled="savingThreshold" @click="saveThreshold">
                        <i v-if="savingThreshold" class="fas fa-spinner fa-spin"></i>
                        <template v-else>Save</template>
                    </button>
                </div>
            </div>
        </div>


        <!-- Download Options Modal -->
        <div v-if="showDownloadModal" class="modal-backdrop" @click.self="closeDownloadModal">
            <div class="modal">
                <h3 style="margin:0 0 8px">Export to Excel</h3>
                <p class="muted" style="margin-top:0">Choose what to include:</p>

                <label class="modal-check">
                    <input type="checkbox" v-model="includeDeviceList" />
                    <span>Device List (Overall + per Block)</span>
                </label>

                <label class="modal-check">
                    <input type="checkbox" v-model="includeTrend" />
                    <span>Water Consumption Trend (uses current chart range & scope)</span>
                </label>

                <p v-if="downloadValidation" class="err" style="margin:8px 0 0">
                    Please select at least one item to export.
                </p>

                <div class="modal-actions">
                    <button class="chip" @click="closeDownloadModal">Cancel</button>
                    <button class="chip" :disabled="exporting" @click="performDownloadXlsx">
                        {{ exporting ? 'Preparing…' : 'Download' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- ✅ Success (Saved) modal — auto hides after 1.5s -->
        <div v-if="showSavedModal" class="modal-backdrop" @click.self="showSavedModal = false">
            <div class="modal">
                <h3 style="margin:0">Saved</h3>
                <p class="muted" style="margin:8px 0 0">Your changes were saved successfully.</p>
                <div class="modal-actions" style="justify-content:flex-end">
                    <button class="chip" @click="showSavedModal = false">OK</button>
                </div>
            </div>
        </div>

        <!-- ⚠️ Confirm Delete modal -->
        <div v-if="showConfirmDelete" class="modal-backdrop" @click.self="cancelDelete">
            <div class="modal">
                <h3 style="margin:0 0 8px">Delete Threshold?</h3>
                <p class="muted" style="margin:0 0 8px">
                    This will remove the threshold for
                    <code style="font-weight:700">{{ pendingDelete?.object_name }}</code>.
                </p>
                <p class="err" style="margin:0 0 12px">This action cannot be undone.</p>

                <div class="modal-actions">
                    <button class="chip" @click="cancelDelete">Cancel</button>
                    <button class="chip" :disabled="deleting" @click="confirmDeleteNow">
                        {{ deleting ? 'Deleting…' : 'Delete' }}
                    </button>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, unref } from 'vue'
import * as XLSX from 'xlsx'
import LineChartCard from '../components/LineChartCard.vue'
import PieChartCard from '../components/PieChartCard.vue'
import BarChartCard from '../components/BarChartCard.vue'
import MixedChartCard from '../components/MixedChartCard.vue'


/* ------------ View Tab ------------ */
const viewTab = ref('Dashboard')

const FAULTS_URL = 'https://water-meter-demo.onrender.com/faults/water/active'

const faults = ref([])
const faultsLoading = ref(false)
const faultsError = ref(null)
const faultsPollSeconds = 30
let faultsTimer = null

/* ==== Granularity state for Water chart (D/W/M/Y) ==== */
const wmGran = ref('W')
const wmDay = ref(maxChartISODate())
const wmFromTime = ref('00:00')
const wmToTime = ref('23:00')
const wmWeek = ref('2025-W50')
const wmMonthStart = ref(new Date().toISOString().slice(0, 7))
const wmMonthEnd = ref(new Date().toISOString().slice(0, 7))
const wmYearStart = ref(new Date().getFullYear() - 1)
const wmYearEnd = ref(new Date().getFullYear())


// --- Known blocks & levels (fallbacks if you don't have dynamic lists) ---
const ALL_BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K']
const ALL_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8']

function boundsOfWeekContainingDay(yyyyMMDD) {
    const [y, m, d] = String(yyyyMMDD).split('-').map(Number)
    const base = new Date(y, (m || 1) - 1, d || 1)
    const dow = base.getDay() || 7 // Mon=1..Sun=7 (treat Sun as 7)
    const start = new Date(base); start.setDate(base.getDate() - (dow - 1)); start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setDate(start.getDate() + 7) // next Monday 00:00
    return { start, end }
}

function ymdFromIso(s) {
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return null
    const yy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
}

function ymdPrev(yyyyMmDd) {
    const [y, m, d] = String(yyyyMmDd).split('-').map(Number)
    const t = new Date(y, (m || 1) - 1, d || 1)
    t.setDate(t.getDate() - 1)
    const yy = t.getFullYear()
    const mm = String(t.getMonth() + 1).padStart(2, '0')
    const dd = String(t.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
}

// Parse labels robustly (ISO, "YYYY-MM-DD HH:mm", numbers)
function parseTs(x) {
    if (x == null) return null
    if (typeof x === 'number') {
        const d = new Date(x)
        return Number.isFinite(d.getTime()) ? d : null
    }
    const s = String(x)
    const normalized = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? s.replace(' ', 'T') : s
    const d = new Date(normalized)
    return Number.isFinite(d.getTime()) ? d : null
}

// Build local "YYYY-MM-DDTHH:mm" (avoid UTC shift)
function toLocalYmdHm(d) {
    const yy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${yy}-${mm}-${dd}T${hh}:${mi}`
}

function pairsForScope(blockVal, levelVal) {
    const b = String(blockVal || 'Overall').toUpperCase()
    const l = String(levelVal || 'Overall').toUpperCase()
    if (b !== 'OVERALL' && l !== 'OVERALL') return [{ block: b, level: l }]
    if (b !== 'OVERALL' && l === 'OVERALL') return ALL_LEVELS.map(L => ({ block: b, level: L }))
    if (b === 'OVERALL' && l !== 'OVERALL') return ALL_BLOCKS.map(B => ({ block: B, level: l }))
    const out = []; for (const B of ALL_BLOCKS) for (const L of ALL_LEVELS) out.push({ block: B, level: L }); return out
}

// --- Date helpers for D/W ---

// e.g. "2025-10-24"
function todayLocalISODate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
// Hard cap for charts (latest selectable date)
const HARD_MIN_CHART_DATE = '2025-12-08'
const HARD_MAX_CHART_DATE = '2025-12-09'

function maxChartISODate() {
    const today = todayLocalISODate()
    return today > HARD_MAX_CHART_DATE ? HARD_MAX_CHART_DATE : today
}

// "YYYY-Www" for the current week (ISO week, Monday=1)
function getCurrentISOWeek() {
    const d = new Date();
    const dow = d.getDay() || 7;                 // 1..7 (Mon..Sun)
    const thurs = new Date(d); thurs.setDate(d.getDate() + 4 - dow);
    const year = thurs.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const week = Math.ceil((((thurs - yearStart) / 86400000) + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

// Parse "YYYY-Www" -> { start: Mon 00:00, end: next Mon 00:00 } in local time
function weekBounds(weekStr) {
    const m = /^(\d{4})-W(\d{2})$/.exec(String(weekStr || ''));
    if (!m) return { start: '', end: '' };
    const year = Number(m[1]);
    const wk = Number(m[2]);

    // ISO week 1 is the week with Jan 4; find its Monday
    const jan4 = new Date(year, 0, 4);
    const jan4Dow = (jan4.getDay() || 7); // 1..7
    const week1Mon = new Date(jan4);
    week1Mon.setDate(jan4.getDate() - (jan4Dow - 1));
    week1Mon.setHours(0, 0, 0, 0);

    const start = new Date(week1Mon);
    start.setDate(week1Mon.getDate() + (wk - 1) * 7);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setHours(0, 0, 0, 0);

    return { start, end };
}

function setGran(g) {
    wmGran.value = g
    // If you want instant reload on tap, uncomment:
    loadWaterDWMy()
}


/* Endpoints for Month/Year series at Block+Level */
function monthUrl(b, l, startMM, endMM) {
    return `https://water-meter-demo.onrender.com/blocks/${encodeURIComponent(b)}/levels/${encodeURIComponent(l)}/series-monthly?start=${encodeURIComponent(startMM)}&end=${encodeURIComponent(endMM)}`
}
function yearUrl(b, l, startY, endYExclusive) {
    return `https://water-meter-demo.onrender.com/blocks/${encodeURIComponent(b)}/levels/${encodeURIComponent(l)}/series-yearly?start=${encodeURIComponent(startY)}&end=${encodeURIComponent(endYExclusive)}`
}

function addDaysYmd(ymd, delta) {
    const [y, m, d] = String(ymd).split('-').map(Number)
    const t = new Date(y, (m || 1) - 1, d || 1)
    t.setDate(t.getDate() + delta)
    const yy = t.getFullYear()
    const mm = String(t.getMonth() + 1).padStart(2, '0')
    const dd2 = String(t.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd2}`
}



async function aggregateMonthlyForPairs(pairs, startMM, endMMEx) {
    const bucket = new Map()
    await Promise.all(pairs.map(async ({ block, level }) => {
        try {
            const { labels, data } = await fetchMonthlyBlockLevel(block, level, startMM, endMMEx)
            for (let i = 0; i < labels.length; i++) { const k = labels[i]; const v = Number(data[i] || 0); bucket.set(k, (bucket.get(k) || 0) + v) }
        } catch (e) { console.debug('[Water][M] skip', { block, level, err: e?.message }) }
    }))
    const labels = Array.from(bucket.keys()).sort((a, b) => new Date(a) - new Date(b))
    return { labels, data: labels.map(k => bucket.get(k) || 0) }
}


async function aggregateYearlyForPairs(pairs, startY, endYInclusive) {
    const bucket = new Map()

    await Promise.all(pairs.map(async ({ block, level }) => {
        try {
            const { labels, data } = await fetchYearlyBlockLevel(block, level, startY, endYInclusive)
            for (let i = 0; i < labels.length; i++) {
                const k = labels[i]
                const v = Number(data[i] || 0)
                bucket.set(k, (bucket.get(k) || 0) + v)
            }
        } catch (e) {
            console.debug('[Water][Y] skip', { block, level, err: e?.message })
        }
    }))

    const labels = Array.from(bucket.keys()).sort((a, b) => new Date(a) - new Date(b))
    const data = labels.map(k => bucket.get(k) || 0)
    return { labels, data }
}


/* Month/Year fetchers (return {labels,data}) */
async function fetchMonthlyBlockLevel(block, level, startMM, endMM) {
    const r = await fetch(monthUrl(block, level, startMM, endMM), { cache: 'no-cache' })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const body = await r.json()
    const arr = Array.isArray(body?.data) ? body.data : []
    // Keep first-of-month timestamps, clamp to today’s month at most
    const today = new Date(); today.setDate(1); today.setHours(0, 0, 0, 0)
    const labels = []
    const data = []
    for (const row of arr) {
        const d = new Date(row.ts)
        if (Number.isNaN(d)) continue
        // drop any > current month
        const mm = new Date(d.getFullYear(), d.getMonth(), 1)
        if (mm > today) continue
        labels.push(row.ts)
        data.push(Number(row.consumption || 0))
    }
    return { labels, data }
}

async function fetchYearlyBlockLevel(block, level, startYear, endYearInclusive) {
    // API needs end exclusive ⇒ +1
    const r = await fetch(yearUrl(block, level, startYear, Number(endYearInclusive) + 1), { cache: 'no-cache' })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const body = await r.json()
    const arr = Array.isArray(body?.data) ? body.data : []
    // Each point ts = YYYY-01-01T00:00:00; keep within [startYear..endYearInclusive]
    const labels = []
    const data = []
    for (const row of arr) {
        const d = new Date(row.ts)
        const y = d.getFullYear()
        if (!Number.isFinite(y)) continue
        if (y < Number(startYear) || y > Number(endYearInclusive)) continue
        // Drop future years
        const nowY = new Date().getFullYear()
        if (y > nowY) continue
        labels.push(row.ts)
        data.push(Number(row.consumption || 0))
    }
    return { labels, data }
}

/* Small helpers */
function addOneMonthStr(yyyyMM) {
    const [y, m] = String(yyyyMM).split('-').map(Number)
    const d = new Date(y, (m || 1) - 1, 1); d.setMonth(d.getMonth() + 1)
    const yy = d.getFullYear(), mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${yy}-${mm}`
}

// X-axis tick formatter per D/W/M/Y (safe)
// X-axis tick formatter per D/W/M/Y (robust)
const _fmtTime = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
const _fmtDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit' })
const _fmtMonY = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' })

function fmtWaterTick(lbl) {
    if (lbl == null || lbl === '') return ''
    // Accept 'YYYY-MM-DD' or full ISO; build a Date reliably
    const d = /^\d{4}-\d{2}-\d{2}$/.test(lbl) ? new Date(lbl + 'T00:00:00') : new Date(lbl)
    if (!Number.isFinite(d.getTime())) return String(lbl) // ✅ safe guard

    // You asked for no time on Day; show the date (e.g., "Oct 23")
    if (wmGran.value === 'D') return _fmtDate.format(d)
    if (wmGran.value === 'W') return _fmtDate.format(d)
    if (wmGran.value === 'M') return _fmtMonY.format(d)
    return String(d.getFullYear())
}



const chartOptions = computed(() => ({
    responsive: true, maintainAspectRatio: false,
    scales: {
        x: { ticks: { color: '#cbd5e1', callback: (_v, idx) => { const labels = chartA.value?.labels || []; return labels[idx] ? fmtWaterTick(labels[idx]) : '' } } },
        y: { ticks: { color: '#cbd5e1' } }
    },
    plugins: { legend: { labels: { color: '#cbd5e1' } } }
}))

// Day loader: call block/level cumulative series endpoint for ALL pairs and compute daily usage
async function loadDayViaEndpointAllPairs(selectedYmd) {
    const pairs = pairsForScope('Overall', 'Overall') // all block-level pairs
    const results = []
    for (const { block, level } of pairs) {
        const url = `https://water-meter-demo.onrender.com/blocks/${encodeURIComponent(block)}/levels/${encodeURIComponent(level)}/series?fill_missing=false`
        try {
            const r = await fetch(url, { cache: 'no-cache' })
            if (!r.ok) throw new Error('HTTP ' + r.status)
            const json = await r.json()
            const arr = Array.isArray(json?.data) ? json.data : []

            // Map YYYY-MM-DD -> cumulative value
            const map = new Map()
            for (const pt of arr) {
                const d = new Date(pt?.ts ?? null)
                if (!Number.isFinite(d.getTime())) continue
                const yy = d.getFullYear()
                const mm = String(d.getMonth() + 1).padStart(2, '0')
                const dd = String(d.getDate()).padStart(2, '0')
                map.set(`${yy}-${mm}-${dd}`, Number(pt?.consumption ?? 0))
            }

            const cur = map.get(selectedYmd)
            const prev = map.get(ymdPrev(selectedYmd))
            const daily = (Number.isFinite(cur) && Number.isFinite(prev)) ? (cur - prev) : 0
            results.push({ key: `${block}-${level}`, value: Math.max(0, Number(daily) || 0) })
        } catch (e) {
            console.warn('Day series fetch failed for', block, level, e)
            results.push({ key: `${block}-${level}`, value: 0 })
        }
    }

    chartA.value = {
        labels: results.map(r => r.key),
        datasets: [
            { label: 'm³ / day', type: 'bar', data: results.map(r => r.value) }
        ]
    }
}

function tomorrowYmd() {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
}

function monthStartFromYmd(ymd) {
    const [y, m] = String(ymd).split('-').map(Number)
    const d = new Date(y, (m || 1) - 1, 1)
    return d.toISOString().slice(0, 10)
}


// Day view: per-scope totals using block/level endpoint
async function loadDayTotalsViaEndpointScope(selectedYmd) {
    const day = selectedYmd || todayLocalISODate()     // 'YYYY-MM-DD'
    const prevDay = ymdPrev(day)                       // previous day 'YYYY-MM-DD'

    const pairs = pairsForScope(currentTab.value, currentLevel.value)
    const perPair = []  // { block, level, daily }

    for (const { block, level } of pairs) {
        const url = `https://water-meter-demo.onrender.com/blocks/${encodeURIComponent(block)}/levels/${encodeURIComponent(level)}/series?fill_missing=false`

        try {
            const r = await fetch(url, { cache: 'no-cache' })
            if (!r.ok) throw new Error('HTTP ' + r.status)

            const json = await r.json()
            const arr = Array.isArray(json?.data) ? json.data : []

            // Build map: YYYY-MM-DD -> cumulative value
            const map = new Map()
            for (const pt of arr) {
                const ts = pt?.ts ?? null
                const d = new Date(ts)
                if (Number.isNaN(d.getTime())) continue

                const yy = d.getFullYear()
                const mm = String(d.getMonth() + 1).padStart(2, '0')
                const dd = String(d.getDate()).padStart(2, '0')
                const key = `${yy}-${mm}-${dd}`

                const cum = Number(pt?.consumption ?? pt?.value ?? 0)
                if (!Number.isFinite(cum)) continue

                map.set(key, cum)
            }

            const cur = map.get(day)
            const prev = map.get(prevDay)

            // daily = diff of cumulative; clamp negatives / missing to 0
            let daily = 0
            if (Number.isFinite(cur) && Number.isFinite(prev)) {
                daily = cur - prev
            }
            daily = Math.max(0, Number(daily) || 0)

            perPair.push({ block, level, daily })
        } catch (e) {
            console.warn('[Water][Day] endpoint failed', block, level, e)
            // still push 0 so charts show all blocks/levels even if one fails
            perPair.push({ block, level, daily: 0 })
        }
    }

    const blk = String(currentTab.value || 'Overall').toUpperCase()
    const lvl = String(currentLevel.value || 'Overall').toUpperCase()

    // If absolutely nothing came back, just clear chart to avoid weird leftovers
    if (!perPair.length) {
        chartA.value = { labels: [], datasets: [{ label: 'm³ / day', type: 'bar', data: [] }] }
        return
    }

    // 1) Overall / Overall → single bar: total of all blocks + levels
    if (blk === 'OVERALL' && lvl === 'OVERALL') {
        const total = perPair.reduce((s, x) => s + x.daily, 0)
        chartA.value = {
            labels: ['Total'],
            datasets: [{ label: 'm³ / day', type: 'bar', data: [total] }]
        }
        return
    }

    // 2) Overall / Level (e.g. Overall + L3) → bars per block (A..K) at that level
    if (blk === 'OVERALL' && lvl !== 'OVERALL') {
        const byBlock = new Map()
        for (const x of perPair) {
            byBlock.set(x.block, (byBlock.get(x.block) || 0) + x.daily)
        }
        const labels = ALL_BLOCKS.filter(B => byBlock.has(B))
        chartA.value = {
            labels,
            datasets: [{
                label: `m³ / day (${lvl})`,
                type: 'bar',
                data: labels.map(B => byBlock.get(B) || 0)
            }]
        }
        return
    }

    // 3) Block / Overall → bars per level inside that block (the case you mentioned)
    if (blk !== 'OVERALL' && lvl === 'OVERALL') {
        const byLevel = new Map()
        for (const x of perPair) {
            byLevel.set(x.level, (byLevel.get(x.level) || 0) + x.daily)
        }
        const labels = ALL_LEVELS.filter(L => byLevel.has(L))
        chartA.value = {
            labels,
            datasets: [{
                label: `m³ / day (${blk})`,
                type: 'bar',
                data: labels.map(L => byLevel.get(L) || 0)
            }]
        }
        return
    }

    // 4) Specific Block + Level → single bar
    const only = perPair.reduce((s, x) => s + x.daily, 0)
    chartA.value = {
        labels: [`${blk}-${lvl}`],
        datasets: [{ label: 'm³ / day', type: 'bar', data: [only] }]
    }
}

// Simple helper for "today" in YYYY-MM-DD
function todayYmd() {
    return new Date().toISOString().slice(0, 10)
}


// Load hourly NEWater usage for Swimming Pool / Cooling Tower
// Swimming Pool & Cooling Tower: behave like other tabs (D/W/M/Y)

// Swimming Pool & Cooling Tower: D/W/M/Y behaviour
// Uses cumulative consumption_m3 from 8086 and converts to usage by diff

// Swimming Pool & Cooling Tower: D/W/M/Y behaviour using cumulative consumption_m3
async function loadSpecialNeWaterSeries() {
    seriesLoading.value = true
    seriesError.value = null

    try {
        const deviceName = SPECIAL_TABS_MAP[currentTab.value]
        if (!deviceName) {
            chartA.value = { labels: [], datasets: [] }
            specialNeTotal.value = 0
            kpiPubToday.value = 0
            kpiNeToday.value = 0
            kpiCampusToday.value = 0
            return
        }

        const gran = wmGran.value
        const today = todayLocalISODate()

        // 1) Decide “interest” period based on D / W / M / Y
        let interestStartYmd   // inclusive YYYY-MM-DD
        let interestEndYmdEx   // exclusive YYYY-MM-DD
        let labelMonth = ''
        let labelYear = ''

        if (gran === 'D') {
            const day = (wmDay && wmDay.value) ? wmDay.value : today
            interestStartYmd = day
            interestEndYmdEx = addDaysYmd(day, 1)
        } else if (gran === 'W') {
            const { start, end } = weekBounds(wmWeek.value) // Date objects, end exclusive
            const sy = start.getFullYear()
            const sm = String(start.getMonth() + 1).padStart(2, '0')
            const sd = String(start.getDate()).padStart(2, '0')
            const ey = end.getFullYear()
            const em = String(end.getMonth() + 1).padStart(2, '0')
            const ed = String(end.getDate()).padStart(2, '0')
            interestStartYmd = `${sy}-${sm}-${sd}`
            interestEndYmdEx = `${ey}-${em}-${ed}`
        } else if (gran === 'M') {
            const startMM = (wmMonthStart && wmMonthStart.value) || today.slice(0, 7) // YYYY-MM
            const [sy, sm] = String(startMM).split('-').map(Number)
            labelMonth = startMM
            interestStartYmd = `${sy}-${String(sm).padStart(2, '0')}-01`
            // end = first day of next month
            const em = sm
            const ey = sy
            const nextM = (em === 12) ? 1 : (em + 1)
            const nextY = (em === 12) ? (ey + 1) : ey
            interestEndYmdEx = `${nextY}-${String(nextM).padStart(2, '0')}-01`
        } else { // 'Y'
            const startY = (wmYearStart && wmYearStart.value) || new Date().getFullYear()
            labelYear = String(startY)
            interestStartYmd = `${startY}-01-01`
            interestEndYmdEx = `${startY + 1}-01-01` // exclusive, 1 Jan next year
        }

        // 2) Fetch one day BEFORE the interest period so we can diff the first point
        const fetchStartYmd = addDaysYmd(interestStartYmd, -1)
        const fetchEndYmdEx = interestEndYmdEx

        const url =
            'https://water-meter-demo.onrender.com/api/range?deviceName=' +
            encodeURIComponent(deviceName) +
            '&start=' + encodeURIComponent(fetchStartYmd) +
            '&end=' + encodeURIComponent(fetchEndYmdEx)

        const r = await fetch(url, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)

        let body = []
        try { body = await r.json() } catch (e) { body = [] }
        const arr = Array.isArray(body) ? body.slice() : []

        // 3) Sort by time and convert cumulative → usage
        arr.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

        const hourlyMap = new Map() // 'YYYY-MM-DD HH' -> usage
        const dailyMap = new Map() // 'YYYY-MM-DD'    -> daily total

        let prevVal = null

        for (const row of arr) {
            const ts = row.timestamp
            const dt = new Date(ts)
            if (Number.isNaN(dt.getTime())) continue

            const raw = row.consumption_m3
            if (raw == null || !Number.isFinite(Number(raw))) {
                // skip bad reading but keep prevVal
                continue
            }

            const curVal = Number(raw)
            let usage = 0
            if (prevVal != null) {
                const diff = curVal - prevVal
                if (diff > 0) usage = diff // clamp negatives to 0
            }
            prevVal = curVal
            if (usage <= 0) continue

            const y = dt.getFullYear()
            const m = String(dt.getMonth() + 1).padStart(2, '0')
            const d = String(dt.getDate()).padStart(2, '0')
            const hh = String(dt.getHours()).padStart(2, '0')

            const dayKey = `${y}-${m}-${d}`
            const hourKey = `${dayKey} ${hh}` // e.g. "2025-12-04 00"

            // Only aggregate for rows inside the interest period
            if (dayKey < interestStartYmd || dayKey >= interestEndYmdEx) continue

            hourlyMap.set(hourKey, (hourlyMap.get(hourKey) || 0) + usage)
            dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + usage)
        }

        // 4) Total usage for that period (used for month/year single point)
        let totalUsage = 0
        for (const v of dailyMap.values()) totalUsage += v
        specialNeTotal.value = totalUsage

        // 5) Build chart based on granularity
        const labels = []
        const pubData = []
        const neData = []

        if (gran === 'D') {
            // DAY: show hourly, only up to latest timing (no future hours)
            const day = (wmDay && wmDay.value) ? wmDay.value : today

            // latest hour that has any data
            let maxHourData = -1
            for (const key of hourlyMap.keys()) {
                if (key.startsWith(day + ' ')) {
                    const hh = Number(key.slice(11, 13))
                    if (hh > maxHourData) maxHourData = hh
                }
            }

            // latest hour “in time” (so we don’t show future hours)
            let maxHourCurrent = 0
            if (day < today) {
                maxHourCurrent = 23 // past day → full day
            } else if (day === today) {
                maxHourCurrent = new Date().getHours()
            } else {
                maxHourCurrent = maxHourData
            }

            let maxHour = Math.max(maxHourData, maxHourCurrent)

            // no data & future date → just show 0 once
            if (!Number.isFinite(maxHour) || maxHour < 0) {
                labels.push(day)
                pubData.push(0)
                neData.push(0)
            } else {
                for (let h = 0; h <= maxHour; h++) {
                    const hh = String(h).padStart(2, '0')
                    const key = `${day} ${hh}`

                    labels.push(`${hh}:00`) // only hour on x-axis
                    const usage = hourlyMap.get(key) || 0 // missing hour → 0
                    pubData.push(0)
                    neData.push(usage)
                }
            }
        } else if (gran === 'W') {
            const { start, end } = weekBounds(wmWeek.value)
            const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())

            const today = todayLocalISODate() // 'YYYY-MM-DD'

            while (cur < end) {
                const y = cur.getFullYear()
                const m = String(cur.getMonth() + 1).padStart(2, '0')
                const d = String(cur.getDate()).padStart(2, '0')
                const dayKey = `${y}-${m}-${d}`

                // ⛔ stop if this day is after today (don’t show 05/12/2025 onwards)
                if (dayKey > today) break

                labels.push(dayKey)
                const usage = dailyMap.get(dayKey) || 0   // total for that day
                pubData.push(0)
                neData.push(usage)

                cur.setDate(cur.getDate() + 1)
            }
        } else if (gran === 'M') {
            // MONTH: single point = total usage for that month
            const label = labelMonth || interestStartYmd.slice(0, 7) // "YYYY-MM"
            labels.push(label)
            pubData.push(0)
            neData.push(totalUsage)
        } else {
            // YEAR: single point = total usage for that year
            const label = labelYear || interestStartYmd.slice(0, 4) // "YYYY"
            labels.push(label)
            pubData.push(0)
            neData.push(totalUsage)
        }

        // 6) Update chart
        let unitLabel
        if (gran === 'Y') unitLabel = 'm³ / year'
        else if (gran === 'M') unitLabel = 'm³ / month'
        else if (gran === 'W') unitLabel = 'm³ / day'
        else unitLabel = 'm³ / hour'

        chartA.value = {
            labels,
            datasets: [
                { label: `PUB (${unitLabel})`, type: 'line', data: pubData },
                { label: `NEWater (${unitLabel})`, type: 'line', data: neData }
            ]
        }

        // 7) KPIs on Swimming Pool / Cooling Tower tab: today's NEWater for that device
        const todayUsage = dailyMap.get(today) || 0
        kpiPubToday.value = 0
        kpiNeToday.value = todayUsage
        kpiCampusToday.value = todayUsage
    } catch (e) {
        console.error('[Water][Special]', e)
        seriesError.value = (e && e.message) ? e.message : 'Failed to load special series'
        chartA.value = { labels: [], datasets: [] }
        specialNeTotal.value = 0
        kpiPubToday.value = 0
        kpiNeToday.value = 0
        kpiCampusToday.value = 0
    } finally {
        seriesLoading.value = false
    }
}

// Get daily NEWater usage from Swimming Pool + Cooling Tower between [startYmd, endYmdEx)
// Returns Map('YYYY-MM-DD' -> usage_m3)
async function fetchSpecialNeDailyMap(startYmd, endYmdEx) {
    const result = new Map()

    const specialNames = Object.values(SPECIAL_TABS_MAP || {})
        .map(n => String(n || '').trim())
        .filter(Boolean)

    if (!specialNames.length) return result

    // Fetch one day BEFORE the interest window so we can diff correctly
    const fetchStart = addDaysYmd(startYmd, -1)

    for (const name of specialNames) {
        try {
            const url =
                'https://water-meter-demo.onrender.com/api/range?deviceName=' +
                encodeURIComponent(name) +
                '&start=' + encodeURIComponent(fetchStart) +
                '&end=' + encodeURIComponent(endYmdEx)

            const r = await fetch(url, { cache: 'no-cache' })
            if (!r.ok) throw new Error('HTTP ' + r.status)

            let body = []
            try { body = await r.json() } catch (e) { body = [] }
            const arr = Array.isArray(body) ? body.slice() : []

            // Sort by time
            arr.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

            let prevVal = null
            for (const row of arr) {
                const ts = row.timestamp
                const dt = new Date(ts)
                if (Number.isNaN(dt.getTime())) continue

                const raw = row.consumption_m3
                if (raw == null || !Number.isFinite(Number(raw))) {
                    // skip invalid but keep prevVal
                    continue
                }

                const curVal = Number(raw)
                let usage = 0
                if (prevVal != null) {
                    const diff = curVal - prevVal
                    if (diff > 0) usage = diff   // clamp negatives to 0
                }
                prevVal = curVal
                if (usage <= 0) continue

                const dayKey = ymd(dt)
                if (dayKey < startYmd || dayKey >= endYmdEx) continue

                result.set(dayKey, (result.get(dayKey) || 0) + usage)
            }
        } catch (e) {
            console.error('[Water] fetchSpecialNeDailyMap error for', name, e)
        }
    }

    return result
}


async function loadWaterDWMy() {
    // Special tabs: Swimming Pool / Cooling Tower use the NEWater endpoint directly
    if (isSpecialTab.value) {
        await loadSpecialNeWaterSeries()
        return
    }

    // DAY: use block/level endpoint + scope aggregation
    if (wmGran.value === 'D') {
        try {
            seriesLoading.value = true
            seriesError.value = null
            await loadDayTotalsViaEndpointScope(wmDay.value)
        } catch (e) {
            console.error('[Water][Day]', e)
            seriesError.value = (e && e.message) ? e.message : 'Failed to load day totals'
            chartA.value = { labels: [], datasets: [] }
        } finally {
            seriesLoading.value = false
        }
        return
    }

    seriesLoading.value = true
    seriesError.value = null
    try {
        /* ---------- WEEK ---------- */
        if (wmGran.value === 'W') {
            const { start, end } = weekBounds(wmWeek.value) // Mon 00:00 .. next Mon 00:00
            startLocal.value = toLocalYmdHm(start)
            endLocal.value = toLocalYmdHm(end)

            // build PUB + NEWater daily from normal meters
            await loadSeriesForActiveTab()

            // Only add Swimming Pool + Cooling Tower when at Overall / Overall
            if (currentTab.value === 'Overall' && currentLevel.value === 'Overall') {
                const startYmd = ymd(start)
                const endYmdEx = ymd(end) // exclusive

                const extraDaily = await fetchSpecialNeDailyMap(startYmd, endYmdEx)

                const chart = chartA.value || {}
                const labels = Array.isArray(chart.labels) ? chart.labels.slice() : []
                const datasets = Array.isArray(chart.datasets) ? chart.datasets.slice() : []

                // in loadSeriesForActiveTab, dataset[0] = PUB, dataset[1] = NEWater
                if (datasets.length >= 2) {
                    const neIdx = 1
                    const baseNe = Array.isArray(datasets[neIdx].data)
                        ? datasets[neIdx].data.slice()
                        : []

                    const newNe = labels.map((lab, idx) => {
                        const key = String(lab).slice(0, 10) // 'YYYY-MM-DD'
                        const extra = extraDaily.get(key) || 0
                        return Number(baseNe[idx] || 0) + extra
                    })

                    datasets[neIdx] = { ...datasets[neIdx], data: newNe }
                    chartA.value = { ...chart, labels, datasets }
                }
            }

            return
        }

        /* ---------- MONTH / YEAR ---------- */
        const pairs = pairsForScope(currentTab.value, currentLevel.value)

        if (wmGran.value === 'M') {
            const startMM = wmMonthStart.value          // 'YYYY-MM'
            const endMMEx = addOneMonthStr(wmMonthEnd.value) // 'YYYY-MM' of month AFTER last

            const { labels, data } = await aggregateMonthlyForPairs(pairs, startMM, endMMEx)
            let finalData = data

            // Only Overall / Overall needs Swimming Pool + Cooling Tower added
            if (currentTab.value === 'Overall' && currentLevel.value === 'Overall') {
                const rangeStartYmd = `${startMM}-01`
                const rangeEndYmdEx = `${endMMEx}-01`

                const extraDaily = await fetchSpecialNeDailyMap(rangeStartYmd, rangeEndYmdEx)
                const extraByMonth = new Map()

                extraDaily.forEach((val, day) => {
                    const mk = String(day).slice(0, 7) // 'YYYY-MM'
                    extraByMonth.set(mk, (extraByMonth.get(mk) || 0) + val)
                })

                finalData = labels.map((lab, idx) => {
                    const mk = String(lab).slice(0, 7)
                    return Number(data[idx] || 0) + (extraByMonth.get(mk) || 0)
                })
            }

            chartA.value = {
                labels,
                datasets: [{ label: 'm³ / month', type: 'bar', data: finalData }]
            }
            return
        }

        // YEAR
        const startY = Number(wmYearStart.value)
        const endY = Number(wmYearEnd.value)
        const { labels, data } = await aggregateYearlyForPairs(pairs, startY, endY)
        let finalYearData = data

        if (currentTab.value === 'Overall' && currentLevel.value === 'Overall') {
            const rangeStartYmd = `${startY}-01-01`
            const rangeEndYmdEx = `${endY + 1}-01-01`

            const extraDaily = await fetchSpecialNeDailyMap(rangeStartYmd, rangeEndYmdEx)
            const extraByYear = new Map()

            extraDaily.forEach((val, day) => {
                const yKey = String(day).slice(0, 4) // 'YYYY'
                extraByYear.set(yKey, (extraByYear.get(yKey) || 0) + val)
            })

            finalYearData = labels.map((lab, idx) => {
                const yKey = String(lab).slice(0, 4)
                return Number(data[idx] || 0) + (extraByYear.get(yKey) || 0)
            })
        }

        chartA.value = {
            labels,
            datasets: [{ label: 'm³ / year', type: 'bar', data: finalYearData }]
        }
    } catch (e) {
        console.error('[Water][DWMy]', e)
        seriesError.value = e?.message ?? 'Failed to load series'
        chartA.value = { labels: [], datasets: [] }
    } finally {
        seriesLoading.value = false
    }
}



/* Optional: auto-apply when granularity changes */
onMounted(() => { loadWaterDWMy() })

// NEW: keep raw meters JSON & a quick lookup from meter_tag -> [object_name...]
const metersRaw = ref({})
const meterTagToObjectNames = ref(Object.create(null))

function buildTagToObjectMap(obj) {
    const map = Object.create(null)
    // Walk the nested shape Block -> Place/Level -> Level/Place -> "A-...-WM" -> { points: [...] }
    Object.values(obj || {}).forEach(blockBranch => {
        Object.values(blockBranch || {}).forEach(levelOrPlace => {
            Object.values(levelOrPlace || {}).forEach(maybeLevels => {
                // Depending on structure, this might already be the meter object or a nested branch
                Object.values(maybeLevels || {}).forEach(meterOrBranch => {
                    if (meterOrBranch?.meter_info?.meter_tag) {
                        const tag = String(meterOrBranch.meter_info.meter_tag)
                        const points = Array.isArray(meterOrBranch.points) ? meterOrBranch.points : []
                        const names = points.map(p => String(p?.object_name || '')).filter(Boolean)
                        map[tag] = names.length ? names : []
                    } else {
                        // Some branches (e.g., place->level->meters) need one more dive
                        Object.values(meterOrBranch || {}).forEach(meter => {
                            if (meter?.meter_info?.meter_tag) {
                                const tag = String(meter.meter_info.meter_tag)
                                const points = Array.isArray(meter.points) ? meter.points : []
                                const names = points.map(p => String(p?.object_name || '')).filter(Boolean)
                                map[tag] = names.length ? names : []
                            }
                        })
                    }
                })
            })
        })
    })
    return map
}


function fmtDateTime(v) {
    if (!v) return '—'
    const d = new Date(v)
    return isNaN(d) ? String(v) : d.toLocaleString()
}

// --------- Demo / Fake faults (for when no API exists) ----------
function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function _randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function generateFakeFaults(count = 8) {
    const blocks = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K']
    const levels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8']
    const types = [
        'No data received for 15 mins',
        'Meter offline (heartbeat missed)',
        'Sudden spike detected (possible leak)',
        'Threshold exceeded (high flow)',
        'Negative delta detected (possible reset)',
        'Abnormal night usage (after-hours)'
    ]

    const now = Date.now()

    return Array.from({ length: count }, (_, i) => {
        const b = _pick(blocks)
        const l = _pick(levels)
        const meterNo = String(_randInt(1, 12)).padStart(2, '0')

        const startAgoMin = _randInt(5, 180) // within last 3 hours
        const lastAgoMin = _randInt(0, Math.min(10, startAgoMin)) // last seen within ~10 mins of now
        const start = new Date(now - startAgoMin * 60_000)
        const last = new Date(now - lastAgoMin * 60_000)

        return {
            id: `DEMO-${now}-${i}`,
            object_name: `${b}-${l}-WM${meterNo}`,
            description: _pick(types),
            start_on: start.toISOString(),
            last_seen: last.toISOString(),
        }
    }).sort((a, b) => new Date(b.start_on) - new Date(a.start_on))
}


async function loadFaults() {
    faultsLoading.value = true
    faultsError.value = null
    try {
        const r = await fetch(FAULTS_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const arr = await r.json()
        // Normalize & sort newest first (by start_on)
        const safe = Array.isArray(arr) ? arr : []
        faults.value = [...safe].sort((a, b) => new Date(b.start_on || 0) - new Date(a.start_on || 0))
    } catch (e) {
        // No API / API down → show demo faults instead of an empty table
        faultsError.value = null
        faults.value = generateFakeFaults(10)
        console.warn('[Water Faults] Using demo faults (no API).', e)
    } finally {
            faultsLoading.value = false
        }
    }


    /* Helpers */
    function fmtNum(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString() : '—' }
    function showNum(v, dp = 1) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(dp) : '—' }
    function classifySource(remarks) {
        if (!remarks) return 'PUB'
        const s = String(remarks).trim().toLowerCase()
        return s === 'irrigation meter' || s.includes('irrigation') ? 'NEWater' : 'PUB'
    }
    function defaultStartISO() { return new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 19) } // yyyy-mm-ddTHH:MM:SS
    function defaultEndISO() { return new Date().toISOString().slice(0, 19) }
    function ymd(date) {
        const d = new Date(date)
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
    }

    /* Endpoints */
    const BLOCKS_URL = 'https://water-meter-demo.onrender.com/blocks'
    const METERS_URL = '/water_meters_combined_full_sorted.json'
    const SUMMARY_URL = 'https://water-meter-demo.onrender.com/summary/block'
    const SITE_META_URL = 'https://water-meter-demo.onrender.com/meta/site'

    /* ===== Site meta (Overall + Blocks) ===== */
    const siteMetaLoading = ref(false), siteMetaError = ref(null)
    const siteMeta = ref({
        population: null,
        area: null,
        pop_updated_at: null,
        area_updated_at: null,
        units: { area: 'km2' },
        blocks: []
    })
    async function loadSiteMeta() {
        siteMetaLoading.value = true; siteMetaError.value = null
        try {
            const r = await fetch(SITE_META_URL, { cache: 'no-cache' })
            if (!r.ok) throw new Error('HTTP ' + r.status)
            const b = await r.json()
            siteMeta.value = {
                population: Number(b?.population ?? null),
                area: Number(b?.area ?? null),
                pop_updated_at: b?.pop_updated_at ?? null,
                area_updated_at: b?.area_updated_at ?? null,
                units: b?.units ?? { area: 'km2' },
                blocks: Array.isArray(b?.blocks) ? b.blocks.map(x => ({
                    block: String(x.block || '').toUpperCase(),
                    population: Number(x.population || 0),
                    area: Number(x.area || 0),
                    pop_updated_at: x.pop_updated_at ?? null,
                    area_updated_at: x.area_updated_at ?? null
                })) : []
            }
        } catch (e) { siteMetaError.value = e?.message ?? 'Load failed' }
        finally { siteMetaLoading.value = false }
    }

    /* Download modal state */
    const showDownloadModal = ref(false)
    const includeDeviceList = ref(true)
    const includeTrend = ref(true)
    const downloadValidation = ref(false)
    const exporting = ref(false)

    function openDownloadModal() { downloadValidation.value = false; showDownloadModal.value = true }
    function closeDownloadModal() { showDownloadModal.value = false }

    function makeTrendSheet(wb, name) {
        // chartA is already computed from the current selection and date range
        const labels = chartA.value.labels || []
        const pub = chartA.value.datasets?.[0]?.data || []
        const ne = chartA.value.datasets?.[1]?.data || []
        const aoa = [['Timestamp', 'PUB (m³)', 'NEWater (m³)', 'Total (m³)']]
        for (let i = 0; i < labels.length; i++) {
            const p = Number(pub[i] || 0), n = Number(ne[i] || 0)
            aoa.push([labels[i], p, n, p + n])
        }
        const ws = XLSX.utils.aoa_to_sheet(aoa)
        ws['!cols'] = [{ wch: 26 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
    }


    /* Group helpers for device CSVs */
    function rowsForScope(rows, { block = null, level = null } = {}) {
        let out = rows || []
        if (block) out = out.filter(r => String(r.block).toUpperCase() === String(block).toUpperCase())
        if (level) out = out.filter(r => r.level_label === level)
        return out
    }

    // -------- Line + Bar (single chart) --------
    const lineBarOneMode = ref(false)
    const lbDate = ref(todayLocalISODate())
    const lbPrevDate = computed(() => {
        const d = new Date(lbDate.value)
        d.setDate(d.getDate() - 1)
        return d.toISOString().slice(0, 10)
    })
    const lbLoading = ref(false)
    const lbError = ref(null)
    const lbRowsToday = ref([])     // [{block, consumption}]
    const lbRowsPrev = ref([])      // [{block, consumption}]

    // Open/close mixed mode
    function toggleLineBarOne() {
        lineBarOneMode.value = !lineBarOneMode.value
        if (lineBarOneMode.value) loadBlocksCompareForDate()
    }

    // Fetch helper
    async function fetchBlockSummaryByDate(dateStr) {
        const url = `${SUMMARY_URL}?date=${encodeURIComponent(dateStr)}`
        const r = await fetch(url, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        const items = Array.isArray(b?.items) ? b.items : []
        // normalize per-block totals
        const rows = items.map(it => ({
            block: String(it.block || it.name || it.id || '').toUpperCase(),
            consumption: Number(it.consumption || 0)
        })).filter(x => x.block)
        // sort A..K then others
        const AtoK = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']
        rows.sort((a, b) => {
            const ia = AtoK.indexOf(a.block), ib = AtoK.indexOf(b.block)
            if (ia !== -1 || ib !== -1) {
                if (ia === -1) return 1
                if (ib === -1) return -1
                return ia - ib
            }
            return a.block.localeCompare(b.block)
        })
        return rows
    }

    // Load both today (picked) and previous day (line)
    async function loadBlocksCompareForDate() {
        lbLoading.value = true
        lbError.value = null
        try {
            const [todayRows, prevRows] = await Promise.all([
                fetchBlockSummaryByDate(lbDate.value),
                fetchBlockSummaryByDate(lbPrevDate.value)
            ])
            lbRowsToday.value = todayRows
            lbRowsPrev.value = prevRows
        } catch (e) {
            lbError.value = e?.message ?? 'Failed to load comparison'
            lbRowsToday.value = []
            lbRowsPrev.value = []
        } finally {
            lbLoading.value = false
        }
    }

    // Build unified labels (blocks union), then map values
    const lbLabels = computed(() => {
        const set = new Set()
        lbRowsToday.value.forEach(r => set.add(r.block))
        lbRowsPrev.value.forEach(r => set.add(r.block))
        // keep A..K first then others in alpha
        const AtoK = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']
        const all = Array.from(set)
        const ak = AtoK.filter(b => all.includes(b))
        const others = all.filter(b => !AtoK.includes(b)).sort()
        return [...ak, ...others]
    })

    function valuesFor(labels, rows) {
        const map = Object.create(null)
        rows.forEach(r => { map[r.block] = Number(r.consumption || 0) })
        return labels.map(l => Number(map[l] || 0))
    }

    // Mixed chart data (one chart)
    const lbMixedChartData = computed(() => {
        const labels = lbLabels.value
        return {
            labels,
            datasets: [
                {
                    type: 'bar',
                    label: `Total m³ (${lbDate.value})`,
                    data: valuesFor(labels, lbRowsToday.value)
                },
                {
                    type: 'line',
                    label: `Total m³ (${lbPrevDate.value})`,
                    data: valuesFor(labels, lbRowsPrev.value),
                    tension: 0.25,
                    pointRadius: 3,
                    yAxisID: 'y'
                }
            ]
        }
    })

    // Options: reuse your dark axis/legend styling; enable nice stacking if desired
    const lbMixedOptions = computed(() => ({
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { ticks: { color: '#cbd5e1' } },
            y: { ticks: { color: '#cbd5e1' }, beginAtZero: true }
        },
        plugins: {
            legend: { labels: { color: '#cbd5e1' } },
            tooltip: { mode: 'index', intersect: false }
        }
    }))

    async function buildTrendForTags(tags, startISO, endISO) {
        if (!tags?.length) return { labels: [], pub: [], ne: [] }

        // fetch per-tag series
        const seriesMap = {}
        for (const t of tags) {
            seriesMap[t] = await fetchSeries(t, startISO, endISO) // already defined above
        }

        // union timeline
        const timeline = unionSortedTimestamps(seriesMap) // already defined above

        // aggregate PUB vs NEWater
        const pubArr = [], neArr = []
        for (const ts of timeline) {
            let pub = 0, ne = 0
            for (const tag of tags) {
                const arr = seriesMap[tag] || []
                const val = safeGetValueAtTs(arr, ts) // already defined above
                if ((meterTagToSource.value[tag] || 'PUB') === 'NEWater') ne += val
                else pub += val
            }
            pubArr.push(pub)
            neArr.push(ne)
        }

        // nice labels (human-readable)
        const labels = timeline.map(ts => new Date(ts).toLocaleString())
        return { labels, pub: pubArr, ne: neArr }
    }

    /** create a Trend section AOA (Timestamp, PUB, NEWater, Total) */
    function trendToAOA(title, trend) {
        const aoa = [[title], ['Timestamp', 'PUB (m³)', 'NEWater (m³)', 'Total (m³)']]
        for (let i = 0; i < trend.labels.length; i++) {
            const p = Number(trend.pub[i] || 0), n = Number(trend.ne[i] || 0)
            aoa.push([trend.labels[i], p, n, p + n])
        }
        return aoa
    }

    /** tags for a block / block+level */
    function tagsForBlock(block) {
        const b = String(block || '').toUpperCase()
        return (flatRows.value || []).filter(r => String(r.block).toUpperCase() === b).map(r => r.meter_tag).filter(Boolean)
    }
    function tagsForBlockLevel(block, levelLabel) {
        const b = String(block || '').toUpperCase()
        return (flatRows.value || [])
            .filter(r => String(r.block).toUpperCase() === b && r.level_label === levelLabel)
            .map(r => r.meter_tag).filter(Boolean)
    }

    /** sheet util: set decent column widths from AOA */
    function autofitSheetFromAOA(ws, aoa) {
        const cols = Math.max(...aoa.map(r => r.length))
        const lens = new Array(cols).fill(0)
        for (const row of aoa) row.forEach((cell, i) => { lens[i] = Math.max(lens[i], String(cell ?? '').length) })
        ws['!cols'] = lens.map(w => ({ wch: Math.min(Math.max(w + 2, 6), 60) }))
    }


    function buildDeviceListCsvFromRows(rows) {
        const HEADERS = [
            'Block', 'Level', 'Meter Tag', 'Place', 'Serial No.',
            'Latest Cumulative', 'Section', 'Source', 'Remarks'
        ]
        const toRow = (r) => {
            const cum = cumulativeMap.value?.[r.meter_tag]?.value
            return {
                'Block': r.block ?? '-',
                'Level': r.level_label ?? '-',
                'Meter Tag': r.meter_tag ?? '-',
                'Place': r.place ?? '-',
                'Serial No.': r.serial_no ?? '-',
                'Latest Cumulative': Number.isFinite(cum) ? cum : '-',
                'Section': r.section ?? '-',
                'Source': r.source ?? '-',
                'Remarks': r.remarks ?? '-',
            }
        }
        return csvFromRows(HEADERS, (rows || []).map(toRow))
    }

    function uniqueName(base) {
        // ensure uniqueness even if user double-clicks
        const rand = Math.random().toString(36).slice(2, 7)
        return `${base}_${TSstamp()}_${rand}.csv`
    }


    const areaUnitDisplay = computed(() => (siteMeta.value?.units?.area || 'km2') === 'km2' ? 'km²' : (siteMeta.value?.units?.area || 'km2'))
    const wuiMode = ref('population')
    const wuiUnitLabel = computed(() => wuiMode.value === 'population' ? 'm³ / population' : `m³ / ${areaUnitDisplay.value}`)

    /* Overall/Block editing UI state */
    const siteEditOpen = ref(false)
    const editPopulation = ref(null), editArea = ref(null)
    const updatingPop = ref(false), updatingArea = ref(false)
    const updateErrorPop = ref(null), updateErrorArea = ref(null)
    const updateOkPop = ref(false), updateOkArea = ref(false)

    /* Blocks list */
    const blocksLoading = ref(false), blocksError = ref(false), apiBlocks = ref([])
    async function loadBlocks() {
        blocksLoading.value = true; blocksError.value = false
        try {
            const r = await fetch(BLOCKS_URL, { cache: 'no-cache' })
            if (!r.ok) throw new Error('HTTP ' + r.status)
            const b = await r.json()
            apiBlocks.value = Array.isArray(b?.items) ? b.items : []
        } catch (e) { blocksError.value = true }
        finally { blocksLoading.value = false }
    }

    function goDeviceList() {
        // always reset filters to Overall when opening Device List
        currentTab.value = 'Overall'
        currentLevel.value = 'Overall'
        viewTab.value = 'Device List'
    }

    /* Meters JSON -> flat rows */
    const metersLoading = ref(false), metersError = ref(null), flatRows = ref([])
    async function loadMeters() {
        metersLoading.value = true; metersError.value = null
        try {
            const r = await fetch(METERS_URL, { cache: 'no-cache' })
            if (!r.ok) throw new Error('HTTP ' + r.status)
            const data = await r.json()
            metersRaw.value = data
            meterTagToObjectNames.value = buildTagToObjectMap(data)
            flatRows.value = flattenMeters(data)
        } catch (e) {
            metersError.value = e?.message ?? 'Load failed'
        } finally {
            metersLoading.value = false
        }
    }


    // Given a meter_tag, return array of object_name(s)
    function objectNamesForTag(tag) {
        const arr = meterTagToObjectNames.value?.[String(tag)] || []
        return Array.isArray(arr) ? arr.filter(Boolean) : []
    }
    // Does ANY object_name under this tag already have a threshold?
    function tagHasAnyThreshold(tag) {
        return objectNamesForTag(tag).some(n => !!thresholdsMap.value?.[n])
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
                    Object.values(v2 || {}).forEach(m => {
                        const mi = m?.meter_info || {}
                        out.push({
                            block: String(mi.block || block || ''), level_label: levelLabel, level: mi.level || '',
                            meter_tag: mi.meter_tag || '', location: mi.location ?? '', serial_no: mi.serial_no ?? '',
                            place: mi.place ?? '', remarks: mi.remarks ?? '', section: mi.section ?? '',
                            source: classifySource(mi.remarks)
                        })
                    })
                } else {
                    const place = k2
                    Object.entries(v2 || {}).forEach(([levelLabel, metersAtLevel]) => {
                        Object.values(metersAtLevel || {}).forEach(m => {
                            const mi = m?.meter_info || {}
                            out.push({
                                block: String(mi.block || block || ''), level_label: levelLabel, level: mi.level || '',
                                meter_tag: mi.meter_tag || '', location: mi.location ?? '', serial_no: mi.serial_no ?? '',
                                place: mi.place ?? place, remarks: mi.remarks ?? '', section: mi.section ?? '',
                                source: classifySource(mi.remarks)
                            })
                        })
                    })
                }
            })
        })
        out.sort((a, b) => {
            const bcmp = a.block.localeCompare(b.block); if (bcmp) return bcmp
            const na = Number(a.level_label.match(/(\d+)/)?.[1] ?? NaN)
            const nb = Number(b.level_label.match(/(\d+)/)?.[1] ?? NaN)
            if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
            const lcmp = a.level_label.localeCompare(b.level_label); if (lcmp) return lcmp
            return a.meter_tag.localeCompare(b.meter_tag)
        })
        return out
    }

    /* Tabs + table */
    const metersBlocks = computed(() => Array.from(new Set(flatRows.value.map(r => r.block).filter(Boolean))).sort())
    const AtoK = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']
    const tabsBlocks = computed(() => {
        const fromApi = (apiBlocks.value || []).map(b => String(typeof b === 'string' ? b : (b.block ?? b.name ?? b.id ?? b)).toUpperCase())
        const fromMeters = metersBlocks.value.map(b => String(b).toUpperCase())
        const union = Array.from(new Set([...fromApi, ...fromMeters]))
        const inAK = union.filter(x => AtoK.includes(x)).sort((a, b) => AtoK.indexOf(a) - AtoK.indexOf(b))
        const others = union.filter(x => !AtoK.includes(x)).sort()
        return [...inAK, ...others]
    })

    const currentTab = ref('Overall')
    const currentLevel = ref('Overall')

    // Special tabs → external NEWater meters
    const SPECIAL_TABS_MAP = {
        'Swimming Pool': 'Water Meter ff02008000000058',
        'Cooling Tower': 'Water Meter ff02008000000061'
    }

    const isSpecialTab = computed(() =>
        Object.prototype.hasOwnProperty.call(SPECIAL_TABS_MAP, currentTab.value)
    )

    // Total NEWater usage for the special tabs (for pie chart)
    const specialNeTotal = ref(0)

    // Generic helper: sum Swimming Pool + Cooling Tower NEWater usage
    // for any [start, end) date range (YYYY-MM-DD, end is exclusive).
    async function fetchSpecialNeTotalRange(startYmd, endYmdEx) {
        let grandTotal = 0

        for (const deviceName of Object.values(SPECIAL_TABS_MAP)) {
            const url =
                'https://water-meter-demo.onrender.com/api/range?deviceName=' +
                encodeURIComponent(deviceName) +
                '&start=' + encodeURIComponent(startYmd) +
                '&end=' + encodeURIComponent(endYmdEx)

            try {
                const r = await fetch(url, { cache: 'no-cache' })
                if (!r.ok) throw new Error('HTTP ' + r.status)
                const raw = await r.json()
                const arr = Array.isArray(raw) ? raw.slice() : []

                // sort ascending by timestamp
                arr.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

                let prev = null
                for (const row of arr) {
                    const vRaw = row.consumption_m3
                    if (vRaw == null || !Number.isFinite(Number(vRaw))) continue

                    const cur = Number(vRaw)
                    if (prev != null) {
                        const diff = cur - prev
                        if (diff > 0) grandTotal += diff   // only positive increments
                    }
                    prev = cur
                }
            } catch (e) {
                console.error('[Water][fetchSpecialNeTotalRange]', deviceName, e)
                // skip failed meter, don't break everything
            }
        }

        return grandTotal
    }

    // Convenience: today only, using [today, tomorrow) range
    async function fetchTodaySpecialNeTotal() {
        const day = todayLocalISODate()   // 'YYYY-MM-DD'
        const endDay = tomorrowYmd()      // 'YYYY-MM-DD' (exclusive)
        return fetchSpecialNeTotalRange(day, endDay)
    }



    function selectBlock(b) {
        currentTab.value = b;
        currentLevel.value = 'Overall';
        siteEditOpen.value = false;
        loadWaterDWMy() // ← respect D/W/M/Y
    }

    function selectLevel(l) {
        currentLevel.value = l;
        loadWaterDWMy() // ← respect D/W/M/Y
    }

    const showLevelTabs = computed(
        () => currentTab.value !== 'Overall' && !isSpecialTab.value
    )

    const isOverall = computed(() => currentTab.value === 'Overall')

    const levelTabs = computed(() => {
        if (!showLevelTabs.value) return []
        const rows = flatRows.value.filter(r => r.block?.toUpperCase() === currentTab.value.toUpperCase())
        const arr = Array.from(new Set(rows.map(r => r.level_label).filter(Boolean)))
        arr.sort((a, b) => {
            const na = Number(a.match(/(\d+)/)?.[1] ?? NaN), nb = Number(b.match(/(\d+)/)?.[1] ?? NaN)
            if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
            return a.localeCompare(b)
        })
        return arr
    })

    const tableRows = computed(() => {
        if (currentTab.value === 'Overall') return flatRows.value
        const blockRows = flatRows.value.filter(r => r.block?.toUpperCase() === currentTab.value.toUpperCase())
        if (currentLevel.value === 'Overall') return blockRows
        return blockRows.filter(r => r.level_label === currentLevel.value)
    })

    // NEW: line+bar combo mode
    const lineBarMode = ref(false)
    const lineBarDate = ref(todayLocalISODate())
    const blocksBarLoading = ref(false)
    const blocksBarError = ref(null)
    const blocksBarRows = ref([]) // [{ block, consumption }]

    // Toggle handler
    function toggleLineBar() {
        lineBarMode.value = !lineBarMode.value
        if (lineBarMode.value) {
            // ensure a date is set and data is loaded the first time
            if (!lineBarDate.value) lineBarDate.value = todayLocalISODate()
            loadBlocksBarForDate()
        }
    }

    // Pull per-block totals for a specific date using your existing summary API
    async function loadBlocksBarForDate() {
        if (!lineBarDate.value) return
        blocksBarLoading.value = true
        blocksBarError.value = null
        try {
            const url = `https://water-meter-demo.onrender.com/summary/block?date=${encodeURIComponent(lineBarDate.value)}`
            const r = await fetch(url, { cache: 'no-cache' })
            if (!r.ok) throw new Error('HTTP ' + r.status)
            const body = await r.json()
            const items = Array.isArray(body?.items) ? body.items : []
            // Normalize -> [{block, consumption}]
            blocksBarRows.value = items
                .map(it => ({
                    block: String(it.block || it.name || it.id || '').toUpperCase(),
                    consumption: Number(it.consumption || 0)
                }))
                .filter(x => x.block)
                // A..K first then others, like your tabs
                .sort((a, b) => {
                    const AtoK = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']
                    const ia = AtoK.indexOf(a.block), ib = AtoK.indexOf(b.block)
                    if (ia !== -1 || ib !== -1) {
                        if (ia === -1) return 1
                        if (ib === -1) return -1
                        return ia - ib
                    }
                    return a.block.localeCompare(b.block)
                })
        } catch (e) {
            blocksBarError.value = e?.message ?? 'Failed to load block comparison'
            blocksBarRows.value = []
        } finally {
            blocksBarLoading.value = false
        }
    }

    // Bar chart data for the right panel
    const blocksBarChartData = computed(() => ({
        labels: blocksBarRows.value.map(r => `Block ${r.block}`),
        datasets: [
            {
                label: `Total m³ (${lineBarDate.value})`,
                data: blocksBarRows.value.map(r => r.consumption)
            }
        ]
    }))

    // Reuse your barOptions styling
    const blocksBarOptions = computed(() => barOptions)

    watch(lineBarMode, (on) => { if (on) loadBlocksBarForDate() })

    /* Daily summary (KPI + WUI numerator) */
    const summaryDateLocal = ref('2025-12-09')
    const summaryLoading = ref(false), summaryError = ref(null), summaryItems = ref([])
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

    function dayWindowISO(yyyyMmDd) {
        const [y, m, d] = String(yyyyMmDd).split('-').map(Number)
        const start = new Date(y, (m || 1) - 1, (d || 1) - 1) // prev day 00:00 local
        start.setHours(0, 0, 0, 0)
        const end = new Date(y, (m || 1) - 1, (d || 1) + 1)   // next day 00:00 local
        end.setHours(0, 0, 0, 0)
        return { startISO: start.toISOString(), endISO: end.toISOString() }
    }

    // Extra NEWater from Swimming Pool + Cooling Tower for a given day (YYYY-MM-DD)
    async function fetchSpecialNeForDay(targetYmd) {
        let grandTotal = 0

        // Window: previous day .. next day (exclusive) so we can form proper diffs
        const startYmd = addDaysYmd(targetYmd, -1)
        const endYmdEx = addDaysYmd(targetYmd, 1)

        for (const deviceName of Object.values(SPECIAL_TABS_MAP)) {
            const url =
                'https://water-meter-demo.onrender.com/api/range?deviceName=' +
                encodeURIComponent(deviceName) +
                '&start=' + encodeURIComponent(startYmd) +
                '&end=' + encodeURIComponent(endYmdEx)

            try {
                const r = await fetch(url, { cache: 'no-cache' })
                if (!r.ok) throw new Error('HTTP ' + r.status)
                let body = []
                try { body = await r.json() } catch (e) { body = [] }
                const arr = Array.isArray(body) ? body.slice() : []

                // Sort by time
                arr.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

                let prevVal = null
                for (const row of arr) {
                    const ts = row.timestamp
                    const d = new Date(ts)
                    if (Number.isNaN(d.getTime())) continue

                    const raw = row.consumption_m3
                    if (raw == null || !Number.isFinite(Number(raw))) continue

                    const curVal = Number(raw)
                    let usage = 0
                    if (prevVal != null) {
                        const diff = curVal - prevVal
                        if (diff > 0) usage = diff      // clamp negatives to 0
                    }
                    prevVal = curVal
                    if (usage <= 0) continue

                    // Use your existing ymd() helper to get 'YYYY-MM-DD'
                    const dayKey = ymd(ts)
                    if (dayKey === targetYmd) {
                        grandTotal += usage
                    }
                }
            } catch (e) {
                console.error('[Water] fetchSpecialNeForDay', deviceName, e)
                // skip this meter if it fails
            }
        }

        return grandTotal
    }

    async function refreshPubNeKpisForDay(targetYmd) {
        const tags = activeMeterTags.value
        if (!tags.length) {
            // No tags yet (meters not loaded / no meters for this scope),
            // just keep the previous KPI values instead of blanking them.
            return
        }

        const { startISO, endISO } = dayWindowISO(targetYmd)

        // fetch per-tag short window around the day
        const seriesMap = {}
        for (const t of tags) {
            seriesMap[t] = await fetchSeries(t, startISO, endISO) // returns [{ts, value}] (you already have this)
        }

        const prevYmd = ymdPrev(targetYmd)
        let pubPrev = 0, pubCur = 0, nePrev = 0, neCur = 0
        for (const t of tags) {
            const m = buildDailyCumForTag(seriesMap[t] || []) // Map(day -> cumulative)
            const vPrev = Number(m.get(prevYmd) ?? 0)
            const vCur = Number(m.get(targetYmd) ?? vPrev)   // carry-forward if missing
            if ((meterTagToSource.value[t] || 'PUB') === 'NEWater') {
                nePrev += vPrev; neCur += vCur
            } else {
                pubPrev += vPrev; pubCur += vCur
            }
        }

        const pubDay = Math.max(0, pubCur - pubPrev)
        let neDay = Math.max(0, neCur - nePrev)

        // If we're on Overall / Overall, add NEWater from Swimming Pool + Cooling Tower
        if (currentTab.value === 'Overall' && currentLevel.value === 'Overall') {
            try {
                const extraNe = await fetchSpecialNeForDay(targetYmd)
                neDay += extraNe
            } catch (e) {
                console.error('[Water] failed to add special NE to KPI', e)
            }
        }

        kpiPubToday.value = pubDay
        kpiNeToday.value = neDay
        kpiCampusToday.value = pubDay + neDay

    }


    onMounted(() => { refreshPubNeKpisForDay(summaryDateLocal.value) })
    watch([summaryDateLocal, currentTab, currentLevel, flatRows], () => {
        refreshPubNeKpisForDay(summaryDateLocal.value)
    })


    const summaryTotalAll = computed(() =>
        (summaryItems.value || []).reduce((a, it) => a + (Number(it.consumption) || 0), 0)
    )
    const summaryTotalActive = computed(() => {
        if (isOverall.value) return summaryTotalAll.value
        const blk = String(currentTab.value || '').toUpperCase()
        const row = (summaryItems.value || []).find(it =>
            String(it.block || it.name || it.id || '').toUpperCase() === blk
        )
        return Number(row?.consumption || 0)
    })

    // run once and whenever the “day” you display changes
    watch(summaryDateLocal)


    /* -------- SERIES UI & DATA -------- */
    const granularity = ref('hourly') // not used by API, kept for UI consistency
    const startLocal = ref('')  // datetime-local
    const endLocal = ref('')
    const seriesLoading = ref(false), seriesError = ref(null)
    const chartA = ref({ labels: [], datasets: [] })
    const chartAChartData = computed(() => chartA.value)
    const trendMode = ref('line')
    const trendLabel = computed(() => trendMode.value === 'line'
        ? (currentTab.value === 'Overall' ? 'Line • Total trend' : 'Line • Filter by Hourly/Daily')
        : (currentTab.value === 'Overall' ? 'Bar • PUB vs NEWater (range total)' : (currentLevel.value === 'Overall'
            ? `Bar • PUB vs NEWater (Block ${currentTab.value})`
            : `Bar • PUB vs NEWater (Block ${currentTab.value} • ${currentLevel.value})`))
    )
    function toggleTrendMode() { trendMode.value = trendMode.value === 'line' ? 'compare' : 'line' }

    const compareBarDataSelection = computed(() => {
        // totals over current chart for PUB/NEWater
        const ds = chartA.value.datasets || []
        const pub = ds[0]?.data?.reduce((a, b) => a + (Number(b) || 0), 0) || 0
        const ne = ds[1]?.data?.reduce((a, b) => a + (Number(b) || 0), 0) || 0
        return {
            labels: ['PUB', 'NEWater'],
            datasets: [{ label: 'Total (selected range)', data: [pub, ne] }]
        }
    })
    const barOptions = chartOptions

    /* Cumulative cache (existing) */
    const cumulativeMap = ref({})      // { [meter_tag]: { value, ts } }
    const cumulativeLoading = ref(new Set())
    async function fetchCumulative(tag) {
        if (!tag || cumulativeMap.value[tag] || cumulativeLoading.value.has(tag)) return
        cumulativeLoading.value.add(tag)
        try {
            const url = `https://water-meter-demo.onrender.com/meters/${encodeURIComponent(tag)}/latest-cumulative`
            const r = await fetch(url, { cache: 'no-cache' })
            let body = null; try { body = await r.json() } catch { }
            if (r.ok && body && typeof body.last_value === 'number') {
                cumulativeMap.value[tag] = { value: body.last_value, ts: body.last_ts ?? null }
            } else {
                cumulativeMap.value[tag] = { value: 0, ts: null }
            }
        } catch {
            cumulativeMap.value[tag] = { value: 0, ts: null }
        } finally {
            cumulativeLoading.value.delete(tag)
        }
    }
    const allMeterTags = computed(() => Array.from(new Set((flatRows.value || []).map(r => r?.meter_tag).filter(Boolean))).sort())
    watch(flatRows, () => { for (const t of allMeterTags.value) { fetchCumulative(t) } })

    /* Pub vs NEWater classification map */
    const meterTagToSource = computed(() => {
        const m = Object.create(null)
        for (const r of flatRows.value || []) if (r?.meter_tag) m[r.meter_tag] = r.source || 'PUB'
        return m
    })

    /* Pie (existing cumulative-based) */
    const pieBySource = computed(() => {
        // Special Swimming Pool / Cooling Tower tabs:
        // All water here is NEWater incoming, PUB = 0.
        if (isSpecialTab.value) {
            return { PUB: 0, NEWater: specialNeTotal.value || 0 }
        }

        let pub = 0
        let ne = 0
        const tags = new Set(activeMeterTags.value)

        for (const r of flatRows.value || []) {
            if (!tags.has(r.meter_tag)) continue
            const v = cumulativeMap.value[r.meter_tag]?.value
            if (!Number.isFinite(v)) continue
            if (meterTagToSource.value[r.meter_tag] === 'NEWater') {
                ne += v
            } else {
                pub += v
            }
        }

        return { PUB: pub, NEWater: ne }
    })


    const pieStats = computed(() => {
        const pub = pieBySource.value.PUB || 0, ne = pieBySource.value.NEWater || 0
        const total = pub + ne
        return { PUB: { value: pub, pctOfTotal: total ? (pub / total) * 100 : 0 }, NEWater: { value: ne, pctOfTotal: total ? (ne / total) * 100 : 0 }, total }
    })
    const valueBars = computed(() => {
        const max = Math.max(pieStats.value.PUB.value, pieStats.value.NEWater.value, 1)
        const toPct = v => (v / max) * 100
        return {
            PUB: { value: pieStats.value.PUB.value, pct: toPct(pieStats.value.PUB.value), pctOfTotal: pieStats.value.PUB.pctOfTotal },
            NEWater: { value: pieStats.value.NEWater.value, pct: toPct(pieStats.value.NEWater.value), pctOfTotal: pieStats.value.NEWater.pctOfTotal }
        }
    })
    const sourceChartType = ref('pie')
    function toggleSourceChartType() { sourceChartType.value = sourceChartType.value === 'pie' ? 'bar' : 'pie' }
    const pieChartData = computed(() => ({ labels: ['PUB', 'NEWater'], datasets: [{ data: [pieBySource.value.PUB, pieBySource.value.NEWater] }] }))
    const pieChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: '#cbd5e1' } } } }
    const pieChartBarData = pieChartData

    /* ======== KPIs from series (mutable) ======== */
    const kpiPubToday = ref(0)
    const kpiNeToday = ref(0)
    const kpiCampusToday = ref(0) // 👈 keep this

    // BAI – Business Activity Indicator (editable)
    const baiValue = ref(24753)        // default 24753
    const isBaiEditOpen = ref(false)   // controls the Edit modal

    // WEI = (Daily Campus Usage * 1000) / BAI
    const weiValue = computed(() => {
        const daily = Number(kpiCampusToday.value || 0)
        const bai = Number(baiValue.value || 0)
        if (!bai) return 0 // avoid divide-by-zero
        return (daily * 1000) / bai
    })

    /* -------- Active tags for current scope -------- */
    const activeMeterTags = computed(() => {
        if (isOverall.value) return allMeterTags.value
        const rows = flatRows.value.filter(r => r.block?.toUpperCase() === currentTab.value.toUpperCase())
        if (currentLevel.value !== 'Overall') {
            return rows.filter(r => r.level_label === currentLevel.value).map(r => r.meter_tag).filter(Boolean)
        }
        return rows.map(r => r.meter_tag).filter(Boolean)
    })

    /* -------- SERIES FETCH + AGGREGATE -------- */
    // 1) Replace fetchSeries with this version (maps data[].consumption -> value)
    async function fetchSeries(tag, startISO, endISO) {
        try {
            const url = `https://water-meter-demo.onrender.com/meters/${encodeURIComponent(tag)}/series?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}&fill_missing=false`
            const r = await fetch(url, { cache: 'no-cache' })
            if (!r.ok) throw new Error('HTTP ' + r.status)
            const data = await r.json()

            // Expect: { data: [{ ts, consumption }, ...] }
            const arr = Array.isArray(data?.data) ? data.data : []
            // Normalize to { ts, value } so downstream code stays the same
            return arr
                .map(row => ({ ts: row.ts, value: Number(row.consumption ?? 0) }))
                .sort((a, b) => new Date(a.ts) - new Date(b.ts))

        } catch (e) {
            console.warn('[series] fail', tag, e)
            return []
        }
    }


    // 2) Keep these helpers as-is (they already work once "value" exists)
    function unionSortedTimestamps(seriesMap) {
        const set = new Set()
        for (const arr of Object.values(seriesMap)) {
            for (const row of arr) if (row?.ts) set.add(row.ts)
        }
        return Array.from(set).sort((a, b) => new Date(a) - new Date(b))
    }

    function safeGetValueAtTs(arr, ts) {
        if (!Array.isArray(arr) || !arr.length) return 0
        const found = arr.find(x => x.ts === ts)
        const v = Number(found?.value ?? 0)
        return Number.isFinite(v) ? v : 0
    }

    function looksCumulative(arr) {
        // crude heuristic: mostly non-decreasing => cumulative
        let inc = 0, dec = 0
        for (let i = 1; i < arr.length; i++) {
            const d = Number(arr[i].value) - Number(arr[i - 1].value)
            if (Number.isFinite(d)) (d >= -1e-6 ? inc++ : dec++)
        }
        return inc >= dec * 3
    }

    // Build per-tag daily "cumulative" series so that diff(day) = daily usage
    function buildDailyCumForTag(arr) {
        const byDay = new Map() // day -> { lastTs, lastVal, sum }
        for (const p of arr) {
            const day = ymd(p.ts)
            const cur = byDay.get(day) || { lastTs: null, lastVal: 0, sum: 0 }
            if (!cur.lastTs || new Date(p.ts) > new Date(cur.lastTs)) {
                cur.lastTs = p.ts
                cur.lastVal = Number(p.value || 0)
            }
            cur.sum += Number(p.value || 0)
            byDay.set(day, cur)
        }

        const days = Array.from(byDay.keys()).sort()
        const isCum = looksCumulative(arr)

        const out = new Map() // day -> cumulative up to that day
        let running = 0
        for (const d of days) {
            const { lastVal, sum } = byDay.get(d)
            if (isCum) {
                // already cumulative: carry last-of-day as the cumulative marker
                out.set(d, lastVal)
            } else {
                // not cumulative: build a running total across days
                running += sum
                out.set(d, running)
            }
        }
        return out // Map(day -> cumulative total)
    }


    async function loadSeriesForActiveTab() {
        seriesLoading.value = true
        seriesError.value = null
        try {
            // range: datetime-local controls, else default last 7 days
            const startISO = startLocal.value ? new Date(startLocal.value).toISOString() : (defaultStartISO() + 'Z')
            const endISO = endLocal.value ? new Date(endLocal.value).toISOString() : (defaultEndISO() + 'Z')

            const tags = activeMeterTags.value
            if (!tags.length) {
                chartA.value = { labels: [], datasets: [] }
                return
            }

            // Fetch series per tag
            const seriesMap = {}
            for (const t of tags) {
                // Expected from fetchSeries: [{ ts, value }, ...]
                const arr = await fetchSeries(t, startISO, endISO)
                // Sort by timestamp just in case
                seriesMap[t] = Array.isArray(arr)
                    ? arr
                        .map(p => ({ ts: p.ts, value: Number(p.value ?? 0) }))
                        .sort((a, b) => new Date(a.ts) - new Date(b.ts))
                    : []
            }

            // ---------- Helpers (scoped to this function) ----------
            function looksCumulative(arr) {
                // Heuristic: mostly non-decreasing -> cumulative counter
                let inc = 0, dec = 0
                for (let i = 1; i < arr.length; i++) {
                    const d = Number(arr[i].value) - Number(arr[i - 1].value)
                    if (Number.isFinite(d)) (d >= -1e-6 ? inc++ : dec++)
                }
                return inc >= dec * 3
            }

            // Build per-tag "daily cumulative" map: day -> cumulative up to that day.
            // If the raw series is already cumulative, we take the last value of each day.
            // If not cumulative (interval usage), we sum within a day, then form a running total across days.
            function buildDailyCumForTag(arr) {
                const byDay = new Map() // day -> { lastTs, lastVal, sum }
                for (const p of arr) {
                    const day = ymd(p.ts) // uses your global util that returns 'YYYY-MM-DD'
                    const cur = byDay.get(day) || { lastTs: null, lastVal: 0, sum: 0 }
                    const v = Number(p.value || 0)

                    // track last-of-day value
                    if (!cur.lastTs || new Date(p.ts) > new Date(cur.lastTs)) {
                        cur.lastTs = p.ts
                        cur.lastVal = v
                    }
                    // also track sum-of-day
                    cur.sum += v
                    byDay.set(day, cur)
                }

                const days = Array.from(byDay.keys()).sort()
                const isCum = looksCumulative(arr)

                const out = new Map() // day -> cumulative total
                let running = 0
                for (const d of days) {
                    const { lastVal, sum } = byDay.get(d)
                    if (isCum) {
                        out.set(d, Number(lastVal || 0))
                    } else {
                        running += Number(sum || 0)
                        out.set(d, running)
                    }
                }
                return out
            }

            const isNE = (tag) => (meterTagToSource.value[tag] || 'PUB') === 'NEWater'
            const toDaily = (cum) => cum.map((v, i) => (i === 0 ? 0 : Math.max(0, Number(v) - Number(cum[i - 1]))))

            // ---------- Build daily cumulative per tag ----------
            const dailyCumByTag = {} // tag -> Map(day -> cumulative)
            for (const t of tags) {
                dailyCumByTag[t] = buildDailyCumForTag(seriesMap[t] || [])
            }

            // ---------- Union of all days across all tags ----------
            const allDays = new Set()
            Object.values(dailyCumByTag).forEach(m => m.forEach((_, d) => allDays.add(d)))
            const days = Array.from(allDays).sort() // 'YYYY-MM-DD'

            // ---------- Sum cumulative per source (PUB vs NEWater), with carry-forward ----------
            const pubCum = [], neCum = []
            for (let i = 0; i < days.length; i++) {
                const d = days[i]
                let pub = 0, ne = 0
                for (const t of tags) {
                    const m = dailyCumByTag[t]
                    if (!m) continue
                    // carry-forward if missing on this day
                    let v
                    if (m.has(d)) {
                        v = m.get(d)
                    } else {
                        // look back for previous day’s cumulative
                        v = 0
                        for (let k = i - 1; k >= 0; k--) {
                            const prevDay = days[k]
                            if (m.has(prevDay)) { v = m.get(prevDay); break }
                        }
                    }
                    if (isNE(t)) ne += Number(v || 0)
                    else pub += Number(v || 0)
                }
                pubCum.push(pub)
                neCum.push(ne)
            }

            // ---------- Daily usage = day-over-day diff ----------
            const pubDaily = toDaily(pubCum)
            const neDaily = toDaily(neCum)

            chartA.value = {
                labels: days, // keep as 'YYYY-MM-DD'
                datasets: [
                    { label: 'PUB (daily m³)', data: pubDaily },
                    { label: 'NEWater (daily m³)', data: neDaily }
                ]
            }

            // ---------- KPIs: show TODAY's daily usage (Campus = PUB + NEWater) ----------
            const today = todayLocalISODate()
            const idxT = days.indexOf(today)
            // fallback: last day if today not present
            const idxForKpi = idxT >= 0 ? idxT : (days.length ? days.length - 1 : -1)


            let pubKpi = 0
            let neKpi = 0
            let campusKpi = 0

            if (idxForKpi >= 0) {
                pubKpi = Number(pubDaily[idxForKpi] || 0)
                neKpi = Number(neDaily[idxForKpi] || 0)
            }

            // If we're on Overall-Overall, include Swimming Pool + Cooling Tower NEWater
            if (String(currentTab.value || '').toUpperCase() === 'OVERALL' &&
                String(currentLevel.value || '').toUpperCase() === 'OVERALL') {
                try {
                    const extraNe = await fetchTodaySpecialNeTotal()
                    neKpi += extraNe
                } catch (e) {
                    console.error('[Water] Failed to add special NEWater for KPI', e)
                }
            }




        } catch (e) {
            seriesError.value = e?.message ?? 'Series load failed'
            chartA.value = { labels: [], datasets: [] }
            kpiPubToday.value = 0
            kpiNeToday.value = 0
        } finally {
            seriesLoading.value = false
        }
    }


    /* --------- WUI denominator & active block meta ---------- */
    const activeBlockMeta = computed(() => {
        if (isOverall.value) return { block: 'ALL', population: 0, area: 0, pop_updated_at: null, area_updated_at: null }
        const blk = String(currentTab.value || '').toUpperCase()
        const rec = (siteMeta.value.blocks || []).find(b => b.block === blk)
        return rec || { block: blk, population: 0, area: 0, pop_updated_at: null, area_updated_at: null }
    })
    const wuiDenominator = computed(() => {
        const byPop = wuiMode.value === 'population'
        if (isOverall.value) {
            return byPop ? Number(siteMeta.value.population || 0) : Number(siteMeta.value.area || 0)
        } else {
            return byPop ? Number(activeBlockMeta.value.population || 0) : Number(activeBlockMeta.value.area || 0)
        }
    })
    const kpiWui = computed(() => {
        const total = isOverall.value ? summaryTotalAll.value : summaryTotalActive.value
        const denom = wuiDenominator.value
        if (!Number.isFinite(denom) || denom <= 0) return NaN
        return total / denom
    })

    /* --------- Edit panel open/close ---------- */
    function openSiteEdit() {
        updateErrorPop.value = updateErrorArea.value = null
        updateOkPop.value = updateOkArea.value = false
        if (isOverall.value) {
            editPopulation.value = Number(siteMeta.value.population ?? 0) || 0
            editArea.value = Number(siteMeta.value.area ?? 0) || 0
        } else {
            const m = activeBlockMeta.value
            editPopulation.value = Number(m.population || 0)
            editArea.value = Number(m.area || 0)
        }
        siteEditOpen.value = true
    }
    function closeSiteEdit() { siteEditOpen.value = false }

    /* --------- PUT helpers (preserve other fields) ---------- */
    async function putMeta(payload) {
        const r = await fetch(SITE_META_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
    }
    function normalizedBlocks(arr) {
        return (arr || []).map(b => ({
            block: String(b.block || '').toUpperCase(),
            population: Number(b.population || 0),
            area: Number(b.area || 0)
        }))
    }

    /* --------- Save Overall ---------- */
    async function saveOverallPopulation() {
        updateErrorPop.value = null; updateOkPop.value = false
        const val = Number(editPopulation.value)
        if (!Number.isFinite(val) || val < 0) { updateErrorPop.value = 'Enter a non-negative number'; return }
        updatingPop.value = true
        try {
            await putMeta({
                population: val,
                area: Number(siteMeta.value.area ?? 0) || 0,
                blocks: normalizedBlocks(siteMeta.value.blocks)
            })
            await loadSiteMeta()
            updateOkPop.value = true
        } catch (e) { updateErrorPop.value = e?.message ?? 'Update failed' }
        finally { updatingPop.value = false }
    }

    async function saveOverallArea() {
        updateErrorArea.value = null; updateOkArea.value = false
        const val = Number(editArea.value)
        if (!Number.isFinite(val) || val < 0) { updateErrorArea.value = 'Enter a non-negative number'; return }
        updatingArea.value = true
        try {
            await putMeta({
                population: Number(siteMeta.value.population ?? 0) || 0,
                area: val,
                blocks: normalizedBlocks(siteMeta.value.blocks)
            })
            await loadSiteMeta()
            updateOkArea.value = true
        } catch (e) { updateErrorArea.value = e?.message ?? 'Update failed' }
        finally { updatingArea.value = false }
    }

    /* --------- Save Block ---------- */
    async function saveBlockPopulation() {
        updateErrorPop.value = null; updateOkPop.value = false
        const val = Number(editPopulation.value)
        if (!Number.isFinite(val) || val < 0) { updateErrorPop.value = 'Enter a non-negative number'; return }
        updatingPop.value = true
        try {
            const blk = String(currentTab.value || '').toUpperCase()
            const current = Array.from(siteMeta.value.blocks || [])
            const idx = current.findIndex(b => b.block === blk)
            if (idx >= 0) current[idx] = { ...current[idx], population: val }
            else current.push({ block: blk, population: val, area: 0 })
            await putMeta({
                population: Number(siteMeta.value.population ?? 0) || 0,
                area: Number(siteMeta.value.area ?? 0) || 0,
                blocks: normalizedBlocks(current)
            })
            await loadSiteMeta()
            updateOkPop.value = true
        } catch (e) { updateErrorPop.value = e?.message ?? 'Update failed' }
        finally { updatingPop.value = false }
    }

    /* ===== CSV modal state ===== */
    const showCsvModal = ref(false)
    const csvIncludeDeviceList = ref(true)
    const csvIncludeTrend = ref(true)
    const csvValidationError = ref(false)
    const csvExporting = ref(false)

    function openCsvModal() {
        csvValidationError.value = false
        showCsvModal.value = true
    }
    function closeCsvModal() {
        showCsvModal.value = false
    }

    /* ===== CSV helpers ===== */
    function csvEscape(val) {
        // Turn any value into CSV-safe string
        const s = (val ?? '').toString()
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
        return s
    }
    function csvFromRows(headers, rows) {
        const head = headers.map(csvEscape).join(',')
        const lines = rows.map(r => headers.map(h => csvEscape(r[h])).join(','))
        return [head, ...lines].join('\n')
    }
    function downloadCsv(filename, text) {
        const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }
    function TSstamp() {
        const d = new Date()
        const pad = n => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`
    }

    /* ===== Build Device List CSV (respects current tab/level selection) ===== */
    function buildDeviceListCsv() {
        // Mirror your table columns
        const HEADERS = [
            'Block', 'Level', 'Meter Tag', 'Place', 'Serial No.', 'Latest Cumulative', 'Section', 'Source', 'Remarks'
        ]

        const toRow = (r) => {
            const cum = cumulativeMap.value?.[r.meter_tag]?.value
            return {
                'Block': r.block ?? '-',
                'Level': r.level_label ?? '-',
                'Meter Tag': r.meter_tag ?? '-',
                'Place': r.place ?? '-',
                'Serial No.': r.serial_no ?? '-',
                'Latest Cumulative': Number.isFinite(cum) ? cum : '-',
                'Section': r.section ?? '-',
                'Source': r.source ?? '-',
                'Remarks': r.remarks ?? '-',
            }
        }

        const rows = (tableRows.value || []).map(toRow)
        return csvFromRows(HEADERS, rows)
    }

    const summaryDateMinus1 = computed(() => {
        const s = unref(summaryDateLocal)
        if (!s) return ''
        const d = new Date(s)                // works if s is a Date or date-string
        if (Number.isNaN(d.getTime())) return String(s)

        d.setDate(d.getDate() - 1)           // minus 1 day (local time, no UTC shift)
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`         // match your YYYY-MM-DD style; tweak if needed
    })


    /* ===== Build Trend CSV from chartA (labels + PUB/NEWater datasets) ===== */
    function buildTrendCsv() {
        // chartA.value has: { labels: [tsStr...], datasets: [{label:'PUB', data:[...]},{label:'NEWater', data:[...]}] }
        const labels = chartA.value?.labels || []
        const ds = chartA.value?.datasets || []
        const pub = ds[0]?.data || []
        const ne = ds[1]?.data || []

        const HEADERS = ['Timestamp', 'PUB (m3)', 'NEWater (m3)', 'Total (m3)']
        const rows = labels.map((ts, i) => {
            const p = Number(pub[i] || 0)
            const n = Number(ne[i] || 0)
            return {
                'Timestamp': ts,
                'PUB (m3)': p,
                'NEWater (m3)': n,
                'Total (m3)': p + n
            }
        })

        return csvFromRows(HEADERS, rows)
    }

    /* ===== Orchestrate the download ===== */
    async function performDownloadXlsx() {
        if (!includeDeviceList.value && !includeTrend.value) {
            downloadValidation.value = true
            return
        }
        exporting.value = true
        try {
            // Use the same time window as the UI pickers
            const startISO = startLocal.value ? new Date(startLocal.value).toISOString() : (defaultStartISO() + 'Z')
            const endISO = endLocal.value ? new Date(endLocal.value).toISOString() : (defaultEndISO() + 'Z')

            const wb = XLSX.utils.book_new()

            // ---------- OVERALL SHEET ----------
            {
                const aoa = []
                if (includeDeviceList.value) {
                    aoa.push(['Device List — Overall'])
                    aoa.push(...toAOA(flatRows.value || [])) // reuses your existing table->AOA
                    aoa.push([])
                }
                if (includeTrend.value) {
                    // overall = all meter tags
                    const overallTags = allMeterTags.value
                    const tr = await buildTrendForTags(overallTags, startISO, endISO)
                    aoa.push(...trendToAOA('Trend — Overall', tr))
                }
                const ws = XLSX.utils.aoa_to_sheet(aoa.length ? aoa : [['(no sections selected)']])
                autofitSheetFromAOA(ws, aoa)
                XLSX.utils.book_append_sheet(wb, ws, 'Overall')
            }

            // Helper to sort levels nicely (L1..L10 then others)
            const sortLevels = (arr) => {
                return [...arr].sort((a, b) => {
                    const na = Number(String(a).match(/\d+/)?.[0] ?? NaN)
                    const nb = Number(String(b).match(/\d+/)?.[0] ?? NaN)
                    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
                    if (Number.isFinite(na) && !Number.isFinite(nb)) return -1
                    if (!Number.isFinite(na) && Number.isFinite(nb)) return 1
                    return String(a).localeCompare(String(b))
                })
            }

            // Collect blocks: A–K first then others
            const presentBlocks = Array.from(
                new Set((flatRows.value || []).map(r => String(r.block || '').toUpperCase()).filter(Boolean))
            )
            const blocksAK = AtoK.filter(b => presentBlocks.includes(b))
            const blocksOther = presentBlocks.filter(b => !AtoK.includes(b)).sort()

            const allBlocksOrdered = [...blocksAK, ...blocksOther]

            // ---------- PER-BLOCK SHEETS ----------
            for (const blk of allBlocksOrdered) {
                const aoa = []

                // 1) Device List — Block blk
                if (includeDeviceList.value) {
                    const rows = (flatRows.value || []).filter(r => String(r.block || '').toUpperCase() === blk)
                    aoa.push([`Device List — Block ${blk}`])
                    aoa.push(...toAOA(rows))
                    aoa.push([])
                }

                if (includeTrend.value) {
                    // 2) Trend — Block blk (Overall)
                    const blockTags = tagsForBlock(blk)
                    const trBlock = await buildTrendForTags(blockTags, startISO, endISO)
                    aoa.push(...trendToAOA(`Trend — Block ${blk} (Overall)`, trBlock))

                    // 3) Trend — Block blk • each level
                    const levels = sortLevels(
                        Array.from(new Set((flatRows.value || [])
                            .filter(r => String(r.block || '').toUpperCase() === blk)
                            .map(r => r.level_label)
                            .filter(Boolean)))
                    )
                    for (const lvl of levels) {
                        aoa.push([]) // spacer
                        const levelTags = tagsForBlockLevel(blk, lvl)
                        const trLvl = await buildTrendForTags(levelTags, startISO, endISO)
                        aoa.push(...trendToAOA(`Trend — Block ${blk} • ${lvl}`, trLvl))
                    }
                }

                const ws = XLSX.utils.aoa_to_sheet(aoa.length ? aoa : [['(no sections selected)']])
                autofitSheetFromAOA(ws, aoa)
                XLSX.utils.book_append_sheet(wb, ws, `Block ${blk}`.slice(0, 31))
            }

            // ---------- write the single workbook ----------
            XLSX.writeFile(wb, filenameWithTimestamp('Water_Report'))
            showDownloadModal.value = false
        } catch (e) {
            console.error('Export failed:', e)
            alert('Failed to build the Excel. See console for details.')
        } finally {
            exporting.value = false
        }
    }

    async function saveBlockArea() {
        updateErrorArea.value = null; updateOkArea.value = false
        const val = Number(editArea.value)
        if (!Number.isFinite(val) || val < 0) { updateErrorArea.value = 'Enter a non-negative number'; return }
        updatingArea.value = true
        try {
            const blk = String(currentTab.value || '').toUpperCase()
            const current = Array.from(siteMeta.value.blocks || [])
            const idx = current.findIndex(b => b.block === blk)
            if (idx >= 0) current[idx] = { ...current[idx], area: val }
            else current.push({ block: blk, population: 0, area: val })
            await putMeta({
                population: Number(siteMeta.value.population ?? 0) || 0,
                area: Number(siteMeta.value.area ?? 0) || 0,
                blocks: normalizedBlocks(current)
            })
            await loadSiteMeta()
            updateOkArea.value = true
        } catch (e) { updateErrorArea.value = e?.message ?? 'Update failed' }
        finally { updatingArea.value = false }
    }

    /* ---------- MULTI-SHEET XLSX EXPORT ---------- */
    function filenameWithTimestamp(prefix) {
        const d = new Date()
        const pad = n => String(n).padStart(2, '0')
        const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`
        return `${prefix}_${stamp}.xlsx`
    }
    function toAOA(rows) {
        const header = ['Block', 'Level', 'Meter Tag', 'Place', 'Serial No.', 'Latest Cumulative', 'Section', 'Source', 'Remarks']
        const aoa = [header]
        const dashIfEmpty = (v) => {
            if (v === 0) return 0
            if (typeof v === 'number') return Number.isFinite(v) ? v : '-'
            if (v === null || v === undefined) return '-'
            const s = String(v).trim()
            return s.length ? v : '-'
        }
        for (const r of rows) {
            const cumRaw = cumulativeMap.value?.[r.meter_tag]?.value
            const cum = Number.isFinite(cumRaw) ? cumRaw : '-'
            aoa.push([
                dashIfEmpty(r.block),
                dashIfEmpty(r.level_label),
                dashIfEmpty(r.meter_tag),
                dashIfEmpty(r.place),
                dashIfEmpty(r.serial_no),
                cum,
                dashIfEmpty(r.section),
                dashIfEmpty(r.source),
                dashIfEmpty(r.remarks)
            ])
        }
        return aoa
    }
    function defaultCols() {
        return [
            { wch: 7 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
            { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 22 }
        ]
    }

    /* ================== Thresholds (CRUD) ================== */
    const THRESHOLDS_URL = 'https://water-meter-demo.onrender.com/thresholds/water'

    const thresholdsLoading = ref(false)
    const thresholdsError = ref(null)
    const thresholdsMap = ref({}) // keyed by object_name (meter_tag)

    /** Load all thresholds and index by object_name */
    async function loadThresholds() {
        thresholdsLoading.value = true
        thresholdsError.value = null
        try {
            const r = await fetch(THRESHOLDS_URL, { cache: 'no-cache' })
            if (!r.ok) throw new Error('HTTP ' + r.status)
            const arr = await r.json()
            const map = {}
            for (const t of (arr || [])) {
                const key = String(t.object_name || t?.meter_tag || t?.id || '').trim()
                if (key) map[key] = {
                    object_name: key,
                    min_value: Number(t.min_value ?? 0),
                    max_value: Number(t.max_value ?? 0),
                    enabled: !!t.enabled
                }
            }
            thresholdsMap.value = map
        } catch (e) {
            thresholdsError.value = e?.message ?? 'Failed to load thresholds'
            thresholdsMap.value = {}
        } finally {
            thresholdsLoading.value = false
        }
    }

    /* Row action loading flags */
    const savingTag = ref(null)   // meter_tag being saved via inline op (unused, but wired for future)
    const deletingTag = ref(null) // meter_tag being deleted

    /* Modal state */
    const showThresholdModal = ref(false)
    const editTargets = ref([])
    const editMin = ref(0)
    const editMax = ref(0)
    const editEnabled = ref(true)
    const savingThreshold = ref(false)
    const thresholdSaveError = ref(null)

    function openThresholdModal(tag) {
        const targets = objectNamesForTag(tag)
        editTargets.value = targets.length ? targets : []

        let seed = null
        for (const name of editTargets.value) {
            if (thresholdsMap.value?.[name]) { seed = thresholdsMap.value[name]; break }
        }
        editMin.value = Number(seed?.min_value ?? 0)
        editMax.value = Number(seed?.max_value ?? 0)
        editEnabled.value = Boolean(seed?.enabled ?? true)
        thresholdSaveError.value = null
        showThresholdModal.value = true
    }

    function closeThresholdModal() {
        showThresholdModal.value = false
    }


    async function saveThreshold() {
        thresholdSaveError.value = null
        if (!Array.isArray(editTargets.value) || editTargets.value.length === 0) {
            thresholdSaveError.value = 'No BACnet object_name found for this meter.'
            return
        }

        const payloads = editTargets.value.map(name => ({
            object_name: name,
            min_value: Number(editMin.value ?? 0),
            max_value: Number(editMax.value ?? 0),
            enabled: Boolean(editEnabled.value)
        }))

        savingThreshold.value = true
        try {
            for (const body of payloads) {
                const r = await fetch(THRESHOLDS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                })
                if (!r.ok) throw new Error('HTTP ' + r.status)
                thresholdsMap.value = {
                    ...thresholdsMap.value,
                    [body.object_name]: { ...body }
                }
            }
            showThresholdModal.value = false
            showSavedToast()
            loadThresholds()
        } catch (e) {
            thresholdSaveError.value = e?.message ?? 'Failed to save threshold'
        } finally {
            savingThreshold.value = false
        }
    }



    /** Delete threshold for a tag */
    async function deleteThreshold(tag) {
        if (!thresholdsMap.value?.[tag]) return
        // optional confirm:
        // if (!confirm(`Delete threshold for ${tag}?`)) return

        deletingTag.value = tag
        try {
            const url = `${THRESHOLDS_URL}?object_name=${encodeURIComponent(tag)}`
            const r = await fetch(url, { method: 'DELETE' })
            if (!r.ok) throw new Error('HTTP ' + r.status)
            await loadThresholds()
        } catch (e) {
            alert(`Failed to delete threshold: ${e?.message ?? 'Unknown error'}`)
        } finally {
            deletingTag.value = null
        }
    }

    // ---- Modals state ----
    const showSavedModal = ref(false)
    const showConfirmDelete = ref(false)
    const deleting = ref(false)

    // Show a quick "Saved" modal and auto-close it
    function showSavedToast() {
        showSavedModal.value = true
        window.setTimeout(() => { showSavedModal.value = false }, 1500)
    }

    // Call this after a successful POST (Set Threshold / Update)
    function onThresholdSaved() {
        // refresh any local cache/UI if you keep thresholds in memory
        // await loadThresholds()  // (optional if you have it)
        showSavedToast()
    }


    // Close confirm modal
    function cancelDelete() {
        showConfirmDelete.value = false
        pendingDelete.value = null
    }
    const pendingDelete = ref(null)

    function onRequestDeleteThreshold(tag) {
        const targets = objectNamesForTag(tag)
        pendingDelete.value = { targets }
        showConfirmDelete.value = true
    }

    async function confirmDeleteNow() {
        const targets = pendingDelete.value?.targets || []
        if (!targets.length) return
        deleting.value = true
        try {
            for (const name of targets) {
                const url = `${THRESHOLDS_URL}?object_name=${encodeURIComponent(name)}`
                const r = await fetch(url, { method: 'DELETE', cache: 'no-cache' })
                if (!r.ok) throw new Error('HTTP ' + r.status)
                const clone = { ...thresholdsMap.value }
                delete clone[name]
                thresholdsMap.value = clone
            }
            showConfirmDelete.value = false
            pendingDelete.value = null
            showSavedToast()
            loadThresholds()
        } catch (e) {
            alert(`Failed to delete: ${e?.message ?? 'Unknown error'}`)
        } finally {
            deleting.value = false
        }
    }


    onMounted(() => {
        // initial fetch
        loadFaults()
        // poll
        faultsTimer = window.setInterval(loadFaults, faultsPollSeconds * 1000)
    })

    onUnmounted(() => {
        if (faultsTimer) window.clearInterval(faultsTimer)
    })



    /* Load thresholds with your other initial data */
    onMounted(async () => {
        // ...you already have other awaits here
        await loadThresholds()
    })


    function makeSheet(wb, name, rows) {
        const aoa = toAOA(rows)
        const ws = XLSX.utils.aoa_to_sheet(aoa)
        ws['!cols'] = defaultCols()
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
    }
    function blockRows(block) {
        return (flatRows.value || []).filter(r => (r.block || '').toUpperCase() === String(block).toUpperCase())
    }
    function blocksPresentAK() {
        const present = new Set((flatRows.value || []).map(r => String(r.block || '').toUpperCase()).filter(Boolean))
        return AtoK.filter(b => present.has(b))
    }
    function downloadReportXlsx() {
        const wb = XLSX.utils.book_new()
        makeSheet(wb, 'Overall', flatRows.value || [])
        const ordered = blocksPresentAK()
        for (const b of ordered) makeSheet(wb, `Block ${b}`, blockRows(b))
        const otherBlocks = Array.from(new Set((flatRows.value || []).map(r => String(r.block || '').toUpperCase())))
            .filter(b => !AtoK.includes(b))
            .sort()
        for (const b of otherBlocks) makeSheet(wb, `Block ${b}`, blockRows(b))
        XLSX.writeFile(wb, filenameWithTimestamp('Water_Report_Multi-Tab'))
    }

    onMounted(async () => {
        await Promise.all([loadBlocks(), loadMeters()])
        await loadSiteMeta()
        await loadBlockSummary()
        // Use the new unified loader so Overall W/M/Y includes Swimming Pool + Cooling Tower
        await loadWaterDWMy()
    })


    // --- add near other refs at the top of <script setup>
    const authRole = ref(localStorage.getItem('auth_role') || 'user') // e.g. 'admin' | 'user'
    const canSeeAdminViews = computed(() => authRole.value !== 'user')

    // force-tab guard (blocks manual changes)
    watch(viewTab, (v) => {
        if (!canSeeAdminViews.value && v !== 'Dashboard') {
            viewTab.value = 'Dashboard'
        }
    })

</script>

<style scoped>
/* Base */
.water-management-container {
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

/* View Tabs */
.view-tab-nav {
    display: flex;
    gap: 10px;
    margin: 10px 0 12px;
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

/* Tabs */
.tab-nav,
.sub-tab-nav {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    white-space: nowrap;
    padding-bottom: 4px
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
    flex: 0 0 auto
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

/* Common chips */
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
    box-shadow: 0 6px 18px rgba(0, 0, 0, .25)
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

/* Edit */
.edit-panel {
    margin-top: 8px;
    padding: 10px;
    background: #121a2c;
    border: 1px solid rgba(255, 255, 255, .12);
    border-radius: 8px
}

.edit-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px
}

.edit-row label {
    min-width: 170px;
    color: #cbd5e1
}

.edit-row input {
    width: 160px;
    padding: .3rem .5rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, .3);
    background: transparent;
    color: #fff
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

/* put near your other chart styles */
.chart-split {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 12px;
}

@media (max-width: 1100px) {
    .chart-split {
        grid-template-columns: 1fr;
    }
}


.chart-card {
    padding: 14px 14px 10px;
    border-radius: 12px;
    overflow: hidden;
    height: 650px
}

.chart-card .chart-wrap {
    padding: 0 0 40px;
    background: transparent;
    box-shadow: none
}

/* Pie bars */
.value-bars {
    display: grid;
    gap: 8px;
    margin-top: 12px
}

.value-row {
    display: grid;
    grid-template-columns: 72px 1fr auto;
    align-items: center;
    gap: 10px
}

.value-label {
    font-weight: 700;
    color: #cbd5e1
}

.value-track {
    height: 16px;
    background: rgba(255, 255, 255, .12);
    border-radius: 8px;
    overflow: hidden
}

select {
    background-color: #1e293b;
    /* dark navy background */
    color: #ffffff;
    /* white text */
    border: 1px solid #334155;
    /* subtle border */
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 14px;
}

select:focus {
    outline: none;
    border-color: #3b82f6;
    /* highlight when active */
}

option {
    background-color: #1e293b;
    /* dark background in dropdown list */
    color: #ffffff;
    /* white text */
}


.value-fill {
    height: 100%;
    border-radius: 8px
}

.value-fill.pub {
    background: #3b82f6
}

.value-fill.newater {
    background: #22c55e
}

.value-num {
    font-size: .85rem;
    color: #e5e7eb;
    white-space: nowrap
}

/* Row that holds tabs on the left and the icon on the right */
.view-tab-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 0 12px;
}

/* Keep your existing .view-tab-nav look, but make it flex-1 so it can scroll */
.view-tab-bar .view-tab-nav {
    flex: 1 1 auto;
    display: flex;
    gap: 10px;
    overflow-x: auto;
    white-space: nowrap;
    padding-bottom: 4px;
}

/* The icon stays fixed at the right edge */
.view-tab-bar .icon-btn {
    flex: 0 0 auto;
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

/* Modal */
/* put near bottom with other styles */
.modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .6);
    display: grid;
    place-items: center;
    z-index: 9999
}

.modal {
    width: min(520px, 92vw);
    background: #0f172a;
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, .12);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, .5)
}

.modal-check {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 12px
}

/* Small chips for row actions */
.chip-sm {
    padding: 5px 10px;
    font-size: 0.78rem;
}

.chip.danger {
    background: rgba(220, 38, 38, .15);
    border-color: rgba(220, 38, 38, .35);
}

.chip.danger:hover {
    background: rgba(220, 38, 38, .25);
}

.action-cell {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
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

@media (max-width:768px) {
    .water-management-container {
        padding: 16px
    }

    .chart-wrap {
        height: 280px
    }
}

.card-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

/* new row + right aligned */
.chart-gran {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    flex-basis: 100%;
    /* forces a new line under the toggles */
    justify-content: flex-end;
    /* align to the right */
}

.chart-gran .chip-num {
    width: 90px;
    text-align: right;
}

.kpi-top {
    display: flex;
    align-items: center;
    gap: 12px;
}

.kpi-top .kpi-label {
    flex: 1;
}

/* Edit button style */
.kpi-edit-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    border: none;
    font-size: 12px;
    cursor: pointer;
    background: #1d4ed8;
    /* change if you want */
    color: #ffffff;
}

.kpi-edit-btn i {
    font-size: 11px;
}

.kpi-edit-btn:hover {
    background: #2563eb;
}

.modal-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    background: rgba(15, 23, 42, 0.9);
    color: #e5e7eb;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.05s;
}

.modal-btn i {
    font-size: 0.8rem;
}

.modal-btn:hover {
    background: #1e293b;
    border-color: #93c5fd;
    transform: translateY(-1px);
}

.modal-btn.secondary {
    /* matches your dark theme subtle action */
    background: rgba(15, 23, 42, 0.9);
}

.modal-btn.secondary:hover {
    background: #111827;
}

/* BAI modal size */
.modal-bai {
    width: min(420px, 90vw);
    padding: 16px 18px;
}

/* Header */
.modal-header h3 {
    margin: 0;
    font-size: 1rem;
    color: #f9fafb;
}

.modal-subtitle {
    display: block;
    margin-top: 4px;
    font-size: 0.8rem;
    color: #9fb0ff;
}

/* Body */
.modal-body {
    margin-top: 12px;
    margin-bottom: 8px;
}

.modal-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.85rem;
    color: #cbd5e1;
}

.modal-input {
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    background: #020617;
    color: #e5e7eb;
    font-size: 0.9rem;
}

.modal-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.5);
}

.modal-hint {
    margin-top: 6px;
    font-size: 0.75rem;
    color: #64748b;
}

/* Actions row */
.modal-actions {
    margin-top: 14px;
    display: flex;
    justify-content: flex-end;
}

/* Reuse your fancy pill button */
.modal-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    background: transparent;
    color: #e5e7eb;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.05s;
}

.modal-btn i {
    font-size: 0.8rem;
}

.modal-btn:hover {
    background: #111827;
    border-color: #93c5fd;
    transform: translateY(-1px);
}

.modal-btn.ghost {
    background: rgba(15, 23, 42, 0.9);
}
</style>
