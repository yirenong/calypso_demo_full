<template>
    <div class="dashboard-container">
        <!-- ====== ENERGY (top) ====== -->
        <section class="column">
            <div class="section-header">
                <div class="section-title">
                    <span class="icon-wrapper gear-icon"><i class="fas fa-bolt"></i></span>
                    <h3>Energy Management</h3>
                </div>
            </div>

            <!-- KPI grid -->
            <div class="kpi-grid-2">
                <!-- ===== Month-to-date Energy ===== -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Current Usage for the Month</div>
                    <div class="kpi-number">
                        <span v-if="energyKpiLoading">Loading...</span>
                        <span v-else-if="energyKpiError" class="err">{{ energyKpiError }}</span>
                        <template v-else>{{ fmtNum(kpiEnergyMonthToDate) }}</template>
                    </div>
                    <div class="kpi-unit">kWh</div>
                    <div class="kpi-sub">
                        Avg kW proxy: {{ showNum(kpiEnergyMonthAvgKw, 1) }}
                    </div>
                </div>

                <!-- ===== Day-to-date Energy ===== -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Current Usage for the Day</div>
                    <div class="kpi-number">
                        <span v-if="energyKpiLoading">Loading...</span>
                        <span v-else-if="energyKpiError" class="err">{{ energyKpiError }}</span>
                        <template v-else>{{ fmtNum(kpiEnergyDayToDate) }}</template>
                    </div>
                    <div class="kpi-unit">kWh</div>
                    <div class="kpi-sub">
                        Avg kW proxy: {{ showNum(kpiEnergyDayAvgKw, 1) }}
                    </div>
                </div>

                <!-- EUI (computed locally: (MTD/30)*365 / 192,820) -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">EUI</div>

                    <div class="kpi-number">
                        <span v-if="udEuiLoading">Loading...</span>
                        <span v-else-if="udEuiError" class="err">{{ udEuiError }}</span>
                        <template v-else>{{ showNum(euiNow, 3) }}</template>
                    </div>

                    <div class="kpi-unit">kWh/m2</div>
                    <div class="kpi-sub muted">Cummulative Annual Energy Used / 192,820</div>
                </div>


            </div>

            <!-- Energy trend -->
            <div class="card chart-card">
                <div class="card-head-row card-head-actions">
                    <h4>Energy - Consumption Trend</h4>
                    <div class="actions">
                        <button type="button" class="chip" @click="openEnergyChart">Open Chart</button>
                    </div>
                </div>
            </div>


            <!-- Fullscreen Energy (keep ONLY this one) -->
            <div v-if="fullscreenChart === 'energy'" class="fs-overlay" @click.self="closeFullscreen">
                <div class="fs-modal">
                    <header class="fs-modal-header">
                        <h3>Energy Consumption Trend (Fullscreen)</h3>
                        <button class="fs-close-btn" aria-label="Close fullscreen" title="Close"
                            @click="closeFullscreen">
                            <i class="fas fa-times"></i>
                        </button>
                    </header>
                    <div class="fs-modal-body">
                        <div class="fs-modal-body">
                            <!-- Title + chips -->
                            <div class="card-header trend-row" style="margin-bottom:10px">
                                <h3>Energy Consumption Trend (kWh)</h3>
                                <div class="trend-actions" v-show="trendGran === 'H'">
                                    <button type="button" class="chip" :class="{ active: periodMode === 'overall' }"
                                        @click="setPeriodMode('overall')">Overall</button>
                                    <button type="button" class="chip" :class="{ active: periodMode === 'business' }"
                                        @click="setPeriodMode('business')">Business 7am to 6pm</button>
                                    <button type="button" class="chip" :class="{ active: periodMode === 'offpeak1' }"
                                        @click="setPeriodMode('offpeak1')">Offpeak 1 6pm to 11pm</button>
                                    <button type="button" class="chip" :class="{ active: periodMode === 'offpeak2' }"
                                        @click="setPeriodMode('offpeak2')">Offpeak 2 11pm to 7am</button>
                                </div>
                            </div>

                            <!-- Meta + time pickers -->
                            <div class="trend-controls-row">
                                <small class="muted">
                                    {{ trendLoading ? 'Loading...' : trendGranularityHint }}
                                    <template v-if="!trendLoading && dateLabel"> - {{ dateLabel }}</template>
                                </small>

                                <div class="trend-pickers">
                                    <div class="granularity-buttons">
                                        <button type="button" class="gran-btn" :class="{ active: trendGran === 'H' }"
                                            @click="trendGran = 'H'">H</button>
                                        <button type="button" class="gran-btn" :class="{ active: trendGran === 'D' }"
                                            @click="trendGran = 'D'">D</button>
                                        <button type="button" class="gran-btn" :class="{ active: trendGran === 'W' }"
                                            @click="trendGran = 'W'">W</button>
                                        <button type="button" class="gran-btn" :class="{ active: trendGran === 'M' }"
                                            @click="trendGran = 'M'">M</button>
                                        <button type="button" class="gran-btn" :class="{ active: trendGran === 'Y' }"
                                            @click="trendGran = 'Y'">Y</button>
                                    </div>

                                    <div class="granularity-buttons">
                                        <button type="button" class="gran-btn" title="Line chart"
                                            :class="{ active: energyChartType === 'line' }"
                                            @click="energyChartType = 'line'">
                                            <i class="fas fa-chart-line"></i>
                                        </button>
                                        <button type="button" class="gran-btn" title="Bar chart"
                                            :class="{ active: energyChartType === 'bar' }"
                                            @click="energyChartType = 'bar'">
                                            <i class="fas fa-chart-bar"></i>
                                        </button>
                                    </div>

                                    <template v-if="trendGran === 'H'">
                                        <input class="chip" type="date" v-model="trendDay">
                                        <input class="chip" type="time" step="3600" v-model="trendFromTime">
                                        <span class="muted">-></span>
                                        <input class="chip" type="time" step="3600" v-model="trendToTime">
                                    </template>
                                    <template v-else-if="trendGran === 'D'">
                                        <span class="muted">From</span>
                                        <input class="chip" type="date" v-model="trendDayFrom">
                                        <span class="muted">To</span>
                                        <input class="chip" type="date" v-model="trendDayTo">
                                    </template>
                                    <template v-else-if="trendGran === 'W'">
                                        <span class="muted">From</span>
                                        <input class="chip" type="week" v-model="trendWeekFrom">
                                        <span class="muted">To</span>
                                        <input class="chip" type="week" v-model="trendWeekTo">
                                    </template>
                                    <template v-else-if="trendGran === 'M'">
                                        <span class="muted">From</span>
                                        <input class="chip" type="month" v-model="trendMonthFrom">
                                        <span class="muted">To</span>
                                        <input class="chip" type="month" v-model="trendMonthTo">
                                    </template>
                                    <template v-else>
                                        <span class="muted">From</span>
                                        <input class="chip" type="number" min="2000" max="2100" step="1"
                                            v-model.number="trendYearFrom">
                                        <span class="muted">To</span>
                                        <input class="chip" type="number" min="2000" max="2100" step="1"
                                            v-model.number="trendYearTo">
                                    </template>
                                </div>
                            </div>

                            <!-- Chart -->
                            <div class="chart-wrap" v-if="trendLoading">Loading trend...</div>
                            <div class="chart-wrap" v-else style="height:100%">
                                <LineChartCard :key="chartKey" :title="' '" :chartData="trendChartData"
                                    :options="trendChartOptions" />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>

        <!-- ====== WATER ====== -->
        <section class="column">
            <div class="section-header">
                <div class="section-title">
                    <span class="icon-wrapper leaf-icon"><i class="fas fa-tint"></i></span>
                    <h3>Water Management</h3>
                </div>
            </div>
            <div class="chart-module">
                <WaterOverallTrend ref="waterRef" :bai-value="BAI" @update:bai-value="saveSharedBaiValue"
                    @open-water-chart="openWaterChart"
                    @chart-updated="onWaterChartUpdated" @ui-updated="onWaterUiUpdated" />

            </div>


            <div v-if="fullscreenChart === 'water'" class="fs-overlay" @click.self="closeFullscreen">
                <div class="fs-modal">
                    <header class="fs-modal-header">
                        <h3>Water Consumption Trend (Fullscreen)</h3>
                        <button class="fs-close-btn" aria-label="Close fullscreen" title="Close"
                            @click="closeFullscreen">
                            <i class="fas fa-times"></i>
                        </button>
                    </header>

                    <div class="fs-modal-body">
                        <!-- Controls (driven by child state via @ui-updated) -->
                        <div class="card-header trend-row" style="margin-bottom:10px">
                            <h3>Water Consumption Trend (m3)</h3>
                            <div class="trend-actions">
                                <button type="button" class="chip" :class="{ active: waterUi.rangeMode === 'hour' }"
                                    @click="waterSetRangeMode('hour')">Hourly</button>
                                <button type="button" class="chip" :class="{ active: waterUi.rangeMode === 'day' }"
                                    @click="waterSetRangeMode('day')">Daily</button>
                                <button type="button" class="chip" :class="{ active: waterUi.rangeMode === 'week' }"
                                    @click="waterSetRangeMode('week')">Weekly</button>
                                <button type="button" class="chip" :class="{ active: waterUi.rangeMode === 'month' }"
                                    @click="waterSetRangeMode('month')">Monthly</button>
                                <button type="button" class="chip" :class="{ active: waterUi.rangeMode === 'year' }"
                                    @click="waterSetRangeMode('year')">Yearly</button>
                            </div>
                        </div>

                        <div class="trend-controls-row">
                            <small class="muted">
                                {{ waterUi.granularityHint }}
                                <template v-if="waterUi.dateLabel"> - {{ waterUi.dateLabel }}</template>
                            </small>

                            <div class="trend-pickers">
                                <template v-if="waterUi.rangeMode === 'hour'">
                                    <input class="chip" type="date" :value="waterUi.selectedDay"
                                        @change="onChangeSelectedDay">
                                    <input class="chip" type="time" :value="waterUi.selectedFromTime"
                                        @change="onChangeWaterFromTime">
                                    <span class="muted">to</span>
                                    <input class="chip" type="time" :value="waterUi.selectedToTime"
                                        @change="onChangeWaterToTime">
                                </template>
                                <template v-else-if="waterUi.rangeMode === 'day'">
                                    <input class="chip" type="date" :value="waterUi.selectedDayFrom"
                                        @change="onChangeWaterDayFrom">
                                    <input class="chip" type="date" :value="waterUi.selectedDayTo"
                                        @change="onChangeWaterDayTo">
                                </template>
                                <template v-else-if="waterUi.rangeMode === 'week'">
                                    <input class="chip" type="week" :value="waterUi.selectedWeekFrom"
                                        @change="onChangeWaterWeekFrom">
                                    <input class="chip" type="week" :value="waterUi.selectedWeekTo"
                                        @change="onChangeWaterWeekTo">
                                </template>
                                <template v-else-if="waterUi.rangeMode === 'month'">
                                    <input class="chip" type="month" :value="waterUi.selectedMonth"
                                        @change="onChangeSelectedMonth">
                                </template>
                                <template v-else>
                                    <input class="chip" type="number" min="2000" max="2100" step="1"
                                        :value="waterUi.selectedYear" @change="onChangeSelectedYear">
                                </template>

                                <button type="button" class="chip icon-btn" title="Previous" @click="waterStep(-1)">
                                    <i class="fas fa-angle-left"></i>
                                </button>
                                <button type="button" class="chip icon-btn" title="Next"
                                    :disabled="!waterUi.canStepNext" @click="waterStep(1)">
                                    <i class="fas fa-angle-right"></i>
                                </button>

                            </div>
                        </div>

                        <!-- Chart -->
                        <div class="chart-wrap" v-if="waterFsLoading">Loading...</div>
                        <div class="chart-wrap" v-else style="height:100%">
                            <component :is="waterUi.isLine ? LineChartCard : BarChartCard" :title="' '"
                                :chartData="waterFsChartData" :options="waterFsChartOptions" />
                        </div>
                    </div>
                </div>
            </div>


        </section>

        <!-- ====== WASTE MANAGEMENT ====== -->
        <section class="column">
            <div class="section-header">
                <div class="section-title">
                    <span class="icon-wrapper"><i class="fas fa-recycle"></i></span>
                    <h3>Waste Management</h3>
                </div>
            </div>

            <!-- KPI tiles -->
            <div class="kpi-grid-2">
                <!-- Waste Disposed (kg) -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Waste Disposed (kg)</div>
                    <div class="kpi-number">
                        <span v-if="wasteLoading">Loading...</span>
                        <span v-else-if="wasteError" class="err">{{ wasteError }}</span>
                        <template v-else>
                            {{ fmtNum(currentMonthSummary.general) }}
                        </template>
                    </div>
                    <div class="kpi-unit">kg</div>
                    <div class="kpi-sub muted">
                        {{ currentMonthSummary.label }} - General waste
                    </div>
                </div>

                <!-- Waste Recycled -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Recycled (kg)</div>
                    <div class="kpi-number">
                        <span v-if="wasteLoading">Loading...</span>
                        <span v-else-if="wasteError" class="err">{{ wasteError }}</span>
                        <template v-else>
                            {{ fmtNum(currentMonthSummary.recycled) }}
                        </template>
                    </div>
                    <div class="kpi-unit">kg</div>
                    <div class="kpi-sub muted">
                        {{ currentMonthSummary.label }} - Recycled
                    </div>
                </div>

                <!-- Food Waste -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Food (kg)</div>
                    <div class="kpi-number">
                        <span v-if="wasteLoading">Loading...</span>
                        <span v-else-if="wasteError" class="err">{{ wasteError }}</span>
                        <template v-else>
                            {{ fmtNum(currentMonthSummary.food) }}
                        </template>
                    </div>
                    <div class="kpi-unit">kg</div>
                    <div class="kpi-sub muted">
                        {{ currentMonthSummary.label }} - Food waste
                    </div>
                </div>

                <!-- WDI -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">
                        Waste Disposal Index (WDI)
                        <button type="button" class="chip mini" @click="openBaiEditor">Edit BAI</button>
                    </div>
                    <div class="kpi-number">
                        <span v-if="wasteLoading">Loading...</span>
                        <span v-else-if="wasteError" class="err">{{ wasteError }}</span>
                        <template v-else>
                            {{ showNum(currentMonthSummary.wdi, 3) }}
                        </template>
                    </div>
                    <div class="kpi-unit">index</div>
                    <div class="kpi-sub muted">
                        Op days: {{ currentMonthSummary.operating_days || 0 }} - BAI: {{ fmtNum(BAI) }}
                    </div>
                </div>
                <!-- Avg Waste Disposed (kg) -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Avg Waste Disposed (kg)</div>
                    <div class="kpi-number">
                        <span v-if="wasteLoading">Loading...</span>
                        <span v-else-if="wasteError" class="err">{{ wasteError }}</span>
                        <template v-else>{{ fmtNum(averageSummary.general) }}</template>
                    </div>
                    <div class="kpi-unit">kg</div>
                    <div class="kpi-sub muted">{{ averageSummary.label }} - General waste</div>
                </div>

                <!-- Avg Waste Recycled -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Avg Waste Recycled (kg)</div>
                    <div class="kpi-number">
                        <span v-if="wasteLoading">Loading...</span>
                        <span v-else-if="wasteError" class="err">{{ wasteError }}</span>
                        <template v-else>{{ fmtNum(averageSummary.recycled) }}</template>
                    </div>
                    <div class="kpi-unit">kg</div>
                    <div class="kpi-sub muted">{{ averageSummary.label }} - Recycled</div>
                </div>

                <!-- Avg Food Waste -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Avg Food Waste (kg)</div>
                    <div class="kpi-number">
                        <span v-if="wasteLoading">Loading...</span>
                        <span v-else-if="wasteError" class="err">{{ wasteError }}</span>
                        <template v-else>{{ fmtNum(averageSummary.food) }}</template>
                    </div>
                    <div class="kpi-unit">kg</div>
                    <div class="kpi-sub muted">{{ averageSummary.label }} - Food waste</div>
                </div>

                <!-- Avg WDI -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Avg Waste Disposal Index (WDI)</div>
                    <div class="kpi-number">
                        <span v-if="wasteLoading">Loading...</span>
                        <span v-else-if="wasteError" class="err">{{ wasteError }}</span>
                        <template v-else>{{ showNum(averageSummary.wdi, 3) }}</template>
                    </div>
                    <div class="kpi-unit">index</div>
                    <div class="kpi-sub muted">
                        Avg op days: {{ showNum(averageSummary.operating_days, 1) }} - Avg BAI: {{
                            fmtNum(averageSummary.bai) }}
                    </div>
                </div>

            </div>

            <div v-if="isBaiEditOpen" class="fs-overlay" @click.self="isBaiEditOpen = false">
                <div class="fs-modal fs-modal--compact" @click.stop>
                    <header class="fs-modal-header">
                        <h3>Edit BAI</h3>
                        <button class="fs-close-btn" aria-label="Close" title="Close" @click="isBaiEditOpen = false">
                            <i class="fas fa-times"></i>
                        </button>
                    </header>

                    <div class="fs-modal-body">
                        <div class="trend-controls-row">
                            <small class="muted">Shared with Water Management. Default loads from public/water_bai.json.</small>

                            <div class="trend-pickers">
                                <input class="chip" type="number" v-model.number="baiDraftValue" min="1" />
                                <button type="button" class="chip" @click="isBaiEditOpen = false">Cancel</button>
                                <button type="button" class="chip" @click="saveBaiValue">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- WDI per Month card (no inline chart, only button) -->
            <div class="card" style="margin-top: 1rem;">
                <div class="card-head-row card-head-actions">
                    <h4>Waste Disposal Index (WDI) per Month</h4>
                    <div class="actions">
                        <button type="button" class="chip" @click="openWasteChart">
                            Open Chart
                        </button>
                    </div>
                </div>

                <div class="card-body-text">
                    <p class="muted" v-if="wasteLoading">Loading latest data...</p>
                    <p class="err" v-if="wasteError">{{ wasteError }}</p>
                </div>
            </div>

        </section>


        <!-- ====== Waste fullscreen modal ====== -->
        <!-- Fullscreen Waste -->
        <div v-if="fullscreenChart === 'waste'" class="fs-overlay" @click.self="closeFullscreen">
            <div class="fs-modal">
                <header class="fs-modal-header">
                    <h3>Waste Disposal Index (WDI) per Month</h3>
                    <button class="fs-close-btn" aria-label="Close fullscreen" title="Close" @click="closeFullscreen">
                        <i class="fas fa-times"></i>
                    </button>
                </header>

                <div class="fs-modal-body">
                    <!-- If you want, you can wrap this in another div.fs-modal-body
           like Energy, but it's not required unless your CSS depends on it -->
                    <div class="chart-wrap" style="height:100%;">
                        <LineChartCard :title="' '" :chartData="wdiChartData" :options="wdiChartOptions" />
                    </div>
                </div>
            </div>
        </div>

        <!-- ====== CHILLER (bottom) ====== -->
        <section class="column">
            <div class="section-header">
                <div class="section-title">
                    <span class="icon-wrapper resources-icon"><i class="fas fa-snowflake"></i></span>
                    <h3>Chiller Management</h3>
                </div>

                <!-- NEW: header action -->
                <div class="actions">
                    <button type="button" class="chip" @click.stop="openChillerMonthlyModal">
                        Download Monthly Report
                    </button>
                </div>
            </div>

            <div class="kpi-grid-2 kpi-grid-chillers">
                <!-- 4 efficiency cards -->
                <div v-for="c in totalEfficiencyCards" :key="c.key" class="kpi-card-wrapper chiller-card">
                    <div class="kpi-title">{{ c.name }}</div>

                    <div class="kpi-number">
                        <span v-if="chillerLoading">Loading...</span>
                        <span v-else-if="chillerError" class="err">{{ chillerError }}</span>
                        <template v-else>{{ c.value == null ? '-' : showNum(c.value, 2) }}</template>
                    </div>

                    <div class="kpi-unit">{{ c.units || 'no units' }}</div>

                    <div class="kpi-sub">
                        <small class="muted" v-if="c.ts">as of {{ new Date(c.ts).toLocaleString() }}</small>
                    </div>
                </div>

                <!-- Airside - Latest -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Airside - Latest</div>
                    <div class="kpi-number">
                        <span v-if="airLoading">Loading...</span>
                        <span v-else-if="airError" class="err">{{ airError }}</span>
                        <template v-else>
                            {{ airKwRt == null ? '-' : showNum(airKwRt, 3) }}
                        </template>
                    </div>
                    <div class="kpi-unit">kW/RT</div>
                    <div class="kpi-sub">
                        <small class="muted" v-if="airNow?.ts">as of {{ new Date(airNow.ts).toLocaleString() }}</small>
                    </div>
                    <div class="kpi-sub">
                        <small class="muted" v-if="tseTs">as of {{ new Date(tseTs).toLocaleString() }}</small>
                    </div>
                </div>


                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Waterside - Latest</div>
                    <div class="kpi-number">
                        <template v-if="waterKwRt == null">-</template>
                        <template v-else>{{ showNum(waterKwRt, 3) }}</template>
                    </div>
                    <div class="kpi-unit">kW/RT</div>
                    <div class="kpi-sub">
                        <small class="muted" v-if="tseTs">as of {{ new Date(tseTs).toLocaleString() }}</small>
                    </div>
                </div>

                <!-- Waterside + Airside combined KPI (kept here per requirement #1) -->
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">TSE = Waterside + Airside</div>
                    <div class="kpi-number">
                        <span v-if="tseLoading">Loading...</span>
                        <span v-else-if="tseError" class="err">{{ tseError }}</span>
                        <template v-else>{{ showNum(tseValue, 3) }}</template>
                    </div>
                    <div class="kpi-unit">kW/RT</div>
                    <div class="kpi-sub muted">Total System Efficiency</div>
                </div>
            </div>

            <!-- NOTE: PUB/NEWater cumulative boxes removed here as requested -->
        </section>

        <!-- NEW: Monthly Report modal -->
        <div v-if="showChillerMonthlyModal" class="fs-overlay" @click.self="closeChillerMonthlyModal">
            <div class="fs-modal fs-modal--compact" @click.stop>
                <header class="fs-modal-header">
                    <h3>Download Monthly Report</h3>
                    <button class="fs-close-btn" aria-label="Close" title="Close" @click="closeChillerMonthlyModal">
                        <i class="fas fa-times"></i>
                    </button>
                </header>

                <div class="fs-modal-body">
                    <div class="trend-controls-row">
                        <small class="muted">Select a month, then download CSV.</small>

                        <div class="trend-pickers">
                            <input class="chip" type="month" v-model="chillerReportMonth" />
                            <button type="button" class="chip" @click="downloadChillerMonthlyCsv"
                                :disabled="chillerReportLoading">
                                {{ chillerReportLoading ? 'Downloading...' : 'Download CSV' }}
                            </button>
                            <button type="button" class="chip" @click="closeChillerMonthlyModal"
                                :disabled="chillerReportLoading">
                                Cancel
                            </button>
                        </div>
                    </div>

                    <p v-if="chillerReportError" class="err" style="margin-top:12px;">
                        {{ chillerReportError }}
                    </p>
                </div>
            </div>
        </div>

        <!-- ===== Tenant Management ===== -->
        <section class="column">
            <div class="section-header">
                <div class="section-title">
                    <span class="icon-wrapper tenant-pill"><i class="fas fa-building"></i></span>
                    <h3>Tenant Management</h3>
                </div>
            </div>

            <div class="kpi-grid-2">
                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Total Energy Consumption</div>
                    <div class="kpi-number">
                        <span v-if="tenantLoading">Loading...</span>
                        <span v-else-if="tenantError" class="err">{{ tenantError }}</span>
                        <template v-else>{{ showNum(tenantChartTotalEnergy, 3) }}</template>
                    </div>
                    <div class="kpi-unit">kWh</div>
                    <div class="kpi-sub muted">Current chart selection</div>
                </div>

                <div class="kpi-card-wrapper">
                    <div class="kpi-title">Average Energy Consumption</div>
                    <div class="kpi-number">
                        <span v-if="tenantLoading">Loading...</span>
                        <span v-else-if="tenantError" class="err">{{ tenantError }}</span>
                        <template v-else>{{ showNum(tenantAvgEnergy, 3) }}</template>
                    </div>
                    <div class="kpi-unit">kWh</div>
                    <div class="kpi-sub muted">average_hourly_energy_kwh from API</div>
                </div>
            </div>

            <div class="card chart-card" style="margin-top: 1rem;">
                <div class="card-head-row card-head-actions">
                    <div>
                        <h4>Tenant Energy Trend</h4>
                        <small class="muted">
                            {{ tenantSelectedDeviceLabel }} - {{ tenantSelectedPeriod }} - {{ tenantSelectedDateLabel }}
                        </small>
                    </div>

                    <div class="actions">
                        <button type="button" class="chip" @click="openTenantChart">Open Chart</button>
                    </div>
                </div>
            </div>
        </section>

        <div v-if="fullscreenChart === 'tenant'" class="fs-overlay" @click.self="closeFullscreen">
            <div class="fs-modal">
                <header class="fs-modal-header">
                    <h3>Tenant Energy Trend</h3>
                    <button class="fs-close-btn" aria-label="Close fullscreen" title="Close" @click="closeFullscreen">
                        <i class="fas fa-times"></i>
                    </button>
                </header>

                <div class="fs-modal-body">
                    <div class="fs-modal-body">
                        <div class="card-header chart-toolbar" style="margin-bottom: 14px;">
                            <div>
                                <h3>Energy Trend</h3>
                                <small class="muted">
                                    {{ tenantSelectedDeviceLabel }} - {{ tenantSelectedPeriod }} - {{
                                        tenantSelectedDateLabel }}
                                </small>
                            </div>

                            <div class="chart-filters">
                                <select v-model="tenantSelectedDevice" class="dark-select" @change="reloadTenantCard">
                                    <option v-for="option in tenantDeviceOptions" :key="option.value"
                                        :value="option.value">
                                        {{ option.label }}
                                    </option>
                                </select>

                                <select v-model="tenantSelectedPeriod" class="dark-select" @change="reloadTenantCard">
                                    <option value="hourly">Hourly</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>

                                <input v-if="tenantSelectedPeriod === 'hourly'" v-model="tenantSelectedDate" type="date"
                                    class="dark-select" @change="reloadTenantCard" />

                                <template v-else-if="tenantSelectedPeriod === 'daily'">
                                    <input v-model="tenantDailyStartDate" type="date" class="dark-select"
                                        @change="reloadTenantCard" />
                                    <input v-model="tenantDailyEndDate" type="date" class="dark-select"
                                        @change="reloadTenantCard" />
                                </template>

                                <template v-else-if="tenantSelectedPeriod === 'weekly'">
                                    <input v-model="tenantWeeklyStartWeek" type="week" class="dark-select"
                                        @change="reloadTenantCard" />
                                    <input v-model="tenantWeeklyEndWeek" type="week" class="dark-select"
                                        @change="reloadTenantCard" />
                                </template>

                                <template v-else-if="tenantSelectedPeriod === 'monthly'">
                                    <input v-model="tenantMonthlyStartMonth" type="month" class="dark-select"
                                        @change="reloadTenantCard" />
                                    <input v-model="tenantMonthlyEndMonth" type="month" class="dark-select"
                                        @change="reloadTenantCard" />
                                </template>

                                <template v-else-if="tenantSelectedPeriod === 'yearly'">
                                    <input v-model.number="tenantYearlyStartYear" type="number" min="2000" max="2100"
                                        step="1" class="dark-select" @change="reloadTenantCard" />
                                    <input v-model.number="tenantYearlyEndYear" type="number" min="2000" max="2100"
                                        step="1" class="dark-select" @change="reloadTenantCard" />
                                </template>

                                <select v-model="tenantChartType" class="dark-select">
                                    <option value="line">Line Chart</option>
                                    <option value="bar">Bar Chart</option>
                                </select>
                            </div>
                        </div>

                        <div class="chart-wrap" v-if="tenantChartLoading">Loading chart...</div>

                        <div class="chart-wrap" v-else-if="!tenantChartLabels.length">
                            <div class="wip-panel">
                                <div>
                                    <div class="wip-title">No chart data</div>
                                    <div class="wip-sub">No graph points available for this selection.</div>
                                </div>
                            </div>
                        </div>

                        <div class="chart-wrap" v-else style="height:100%">
                            <Line v-if="tenantChartType === 'line'" :data="tenantChartData"
                                :options="tenantChartOptions" />
                            <Bar v-else :data="tenantChartData" :options="tenantChartOptions" />
                        </div>

                        <small class="err" v-if="tenantError">{{ tenantError }}</small>
                    </div>
                </div>
            </div>
        </div>


    </div>
</template>
<script setup>
import { ref, computed, reactive, watch, onMounted, onBeforeUnmount } from 'vue'
import LineChartCard from '../components/LineChartCard.vue'
import BarChartCard from '../components/BarChartCard.vue'
import WaterOverallTrend from '../components/WaterOverallTrend.vue'
import axios from 'axios'
import { fetchJson } from '../utils/fetchJson'
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
} from 'chart.js'
import { Bar, Line } from 'vue-chartjs'

ChartJS.register(
    Title,
    Tooltip,
    Legend,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale
)
/* ======================= TENANT MANAGEMENT ======================= */
const tenantLoading = ref(false)
const tenantChartLoading = ref(false)
const tenantError = ref(null)

const tenantDevices = ref([])
const tenantSummaryData = ref({
    success: false,
    date: '',
    device_count: 0,
    total_energy_kwh: 0,
    average_hourly_energy_kwh: 0,
    hours_with_data: 0,
    devices: [],
})

const tenantSelectedDevice = ref('overall')
const tenantSelectedPeriod = ref('hourly')
const tenantChartType = ref('line')

const tenantSelectedDate = ref(todayLocalISODate())
const tenantSelectedWeek = ref(isoWeekString(new Date()))
const tenantSelectedMonth = ref(ymString(new Date()))
const tenantDailyStartDate = ref(todayLocalISODate())
const tenantDailyEndDate = ref(todayLocalISODate())
const tenantWeeklyStartWeek = ref(isoWeekString(new Date()))
const tenantWeeklyEndWeek = ref(isoWeekString(new Date()))
const tenantMonthlyStartMonth = ref(ymString(new Date()))
const tenantMonthlyEndMonth = ref(ymString(new Date()))
const tenantYearlyStartYear = ref(new Date().getFullYear() - 1)
const tenantYearlyEndYear = ref(new Date().getFullYear())

const tenantChartLabels = ref([])
const tenantChartValues = ref([])

const tenantAvgEnergy = computed(() => Number(tenantSummaryData.value?.average_hourly_energy_kwh || 0))
const tenantChartTotalEnergy = computed(() =>
    tenantChartValues.value.reduce((sum, value) => sum + Number(value || 0), 0)
)

function normalizeTenantDailyRange() {
    if (!tenantDailyStartDate.value) tenantDailyStartDate.value = todayLocalISODate()
    if (!tenantDailyEndDate.value) tenantDailyEndDate.value = todayLocalISODate()

    if (tenantDailyStartDate.value > tenantDailyEndDate.value) {
        tenantDailyEndDate.value = tenantDailyStartDate.value
    }
}

function normalizeTenantWeekRange() {
    if (!tenantWeeklyStartWeek.value) tenantWeeklyStartWeek.value = isoWeekString(new Date())
    if (!tenantWeeklyEndWeek.value) tenantWeeklyEndWeek.value = isoWeekString(new Date())

    if (tenantWeeklyStartWeek.value > tenantWeeklyEndWeek.value) {
        tenantWeeklyEndWeek.value = tenantWeeklyStartWeek.value
    }
}

function normalizeTenantMonthRange() {
    if (!tenantMonthlyStartMonth.value) tenantMonthlyStartMonth.value = ymString(new Date())
    if (!tenantMonthlyEndMonth.value) tenantMonthlyEndMonth.value = ymString(new Date())

    if (tenantMonthlyStartMonth.value > tenantMonthlyEndMonth.value) {
        tenantMonthlyEndMonth.value = tenantMonthlyStartMonth.value
    }
}

function normalizeTenantYearRange() {
    tenantYearlyStartYear.value = Number(tenantYearlyStartYear.value || new Date().getFullYear())
    tenantYearlyEndYear.value = Number(tenantYearlyEndYear.value || tenantYearlyStartYear.value)

    if (tenantYearlyStartYear.value > tenantYearlyEndYear.value) {
        tenantYearlyEndYear.value = tenantYearlyStartYear.value
    }
}

const tenantDeviceOptions = computed(() => {
    const sorted = [...tenantDevices.value].sort((a, b) =>
        String(a.device_name || '').localeCompare(String(b.device_name || ''))
    )

    return [
        { label: 'Overall', value: 'overall' },
        ...sorted.map((d) => ({
            label: d.device_name,
            value: d.dev_eui,
        })),
    ]
})

const tenantSelectedDeviceLabel = computed(() => {
    if (tenantSelectedDevice.value === 'overall') return 'Overall'
    return tenantDevices.value.find(d => d.dev_eui === tenantSelectedDevice.value)?.device_name || tenantSelectedDevice.value
})

const tenantSelectedDateLabel = computed(() => {
    if (tenantSelectedPeriod.value === 'hourly') {
        return tenantSelectedDate.value
    }
    if (tenantSelectedPeriod.value === 'daily') {
        return `${tenantDailyStartDate.value} to ${tenantDailyEndDate.value}`
    }
    if (tenantSelectedPeriod.value === 'weekly') {
        return `${tenantWeeklyStartWeek.value} to ${tenantWeeklyEndWeek.value}`
    }
    if (tenantSelectedPeriod.value === 'monthly') {
        return `${tenantMonthlyStartMonth.value} to ${tenantMonthlyEndMonth.value}`
    }
    if (tenantSelectedPeriod.value === 'yearly') {
        return `${tenantYearlyStartYear.value} to ${tenantYearlyEndYear.value}`
    }
    return ''
})

const tenantChartData = computed(() => ({
    labels: tenantChartLabels.value,
    datasets: [
        {
            label: `${tenantSelectedDeviceLabel.value} Energy Usage`,
            data: tenantChartValues.value,
            borderWidth: 2,
            tension: 0.3,
            fill: false,
        },
    ],
}))

const tenantChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
        padding: {
            bottom: 24,
        },
    },
    plugins: {
        legend: {
            display: true,
            labels: {
                color: '#cbd5e1',
            },
        },
        title: {
            display: true,
            text: `${tenantSelectedPeriod.value.charAt(0).toUpperCase() + tenantSelectedPeriod.value.slice(1)} Energy Trend`,
            color: '#e5e7eb',
        },
        tooltip: {
            callbacks: {
                label: (context) => `${Number(context.raw || 0).toFixed(3)} kWh`,
            },
        },
    },
    scales: {
        x: {
            ticks: {
                color: '#cbd5e1',
                padding: 8,
                autoSkip: false,
                maxRotation: 0,
                minRotation: 0,
            },
            grid: {
                color: 'rgba(255,255,255,0.08)',
            },
        },
        y: {
            beginAtZero: true,
            ticks: {
                color: '#cbd5e1',
                callback: (value) => `${value} kWh`,
            },
            grid: {
                color: 'rgba(255,255,255,0.08)',
            },
        },
    },
}))

function openTenantChart() {
    fullscreenChart.value = 'tenant'
}

function parseTenantApiDate(value) {
    if (!value) return null
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return null
    return d
}

function normalizeTenantChartRows(rows) {
    if (!Array.isArray(rows)) return []

    return rows
        .map((row) => {
            const dateValue = row.x ?? row.timestamp ?? row.date ?? row.datetime
            const numericValue = row.y ?? row.value ?? row.energy_kwh ?? 0
            const xDate = parseTenantApiDate(dateValue)

            return {
                ...row,
                x: dateValue,
                xDate,
                yValue: Number(numericValue || 0),
            }
        })
        .filter((row) => row.xDate)
        .sort((a, b) => a.xDate - b.xDate)
}

function getTenantWeekStartEnd(weekString) {
    const [yearPart, weekPart] = weekString.split('-W')
    const year = Number(yearPart)
    const week = Number(weekPart)

    const simple = new Date(year, 0, 1 + (week - 1) * 7)
    const dayOfWeek = simple.getDay()
    const monday = new Date(simple)

    if (dayOfWeek <= 4 && dayOfWeek !== 0) {
        monday.setDate(simple.getDate() - dayOfWeek + 1)
    } else if (dayOfWeek === 0) {
        monday.setDate(simple.getDate() - 6)
    } else {
        monday.setDate(simple.getDate() + 8 - dayOfWeek)
    }

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    monday.setHours(0, 0, 0, 0)
    sunday.setHours(23, 59, 59, 999)

    return { start: monday, end: sunday }
}

function addTenantMonth(yyyyMm) {
    const [year, month] = String(yyyyMm).split('-').map(Number)
    const d = new Date(year, (month || 1) - 1, 1)
    d.setMonth(d.getMonth() + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function tenantLocalDateTime(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
    ).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(
        date.getMinutes()
    ).padStart(2, '0')}:00`
}

function listTenantWeeksInclusive(startWeek, endWeek) {
    const weeks = []
    const startInfo = getTenantWeekStartEnd(startWeek)
    const endInfo = getTenantWeekStartEnd(endWeek)
    let cursor = new Date(startInfo.start)
    let last = new Date(endInfo.start)

    if (cursor > last) [cursor, last] = [last, cursor]

    while (cursor <= last) {
        weeks.push(isoWeekString(cursor))
        cursor.setDate(cursor.getDate() + 7)
    }
    return weeks
}

function tenantWeekLabel(weekValue) {
    const weekNo = String(weekValue || '').split('-W')[1] || ''
    return `Week ${Number(weekNo) || weekNo}`
}

function listTenantMonthsInclusive(startMonth, endMonth) {
    const months = []
    let cursor = String(startMonth)
    const last = String(endMonth)
    if (cursor > last) cursor = last

    while (cursor <= last) {
        months.push(cursor)
        cursor = addTenantMonth(cursor)
    }
    return months
}

function toTenantYmdFromApiDate(dateValue) {
    const d = new Date(dateValue)
    if (Number.isNaN(d.getTime())) return ''

    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function isSameTenantDateValue(dateValue, yyyyMmDd) {
    return toTenantYmdFromApiDate(dateValue) === yyyyMmDd
}

function isSameTenantMonth(dateObj, yyyyMm) {
    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}` === yyyyMm
}

function filterTenantRowsBySelectedPeriod(rows) {
    if (!Array.isArray(rows)) return []

    if (tenantSelectedPeriod.value === 'hourly') {
        return rows.filter((row) => toTenantYmdFromApiDate(row.xDate) === tenantSelectedDate.value)
    }

    if (tenantSelectedPeriod.value === 'daily') {
        return rows
    }

    if (tenantSelectedPeriod.value === 'weekly') {
        normalizeTenantWeekRange()
        const { start } = getTenantWeekStartEnd(tenantWeeklyStartWeek.value)
        const { end } = getTenantWeekStartEnd(tenantWeeklyEndWeek.value)
        const today = new Date()
        today.setHours(23, 59, 59, 999)

        return rows.filter((row) => {
            const rowDate = new Date(row.xDate)
            return rowDate >= start && rowDate <= end && rowDate <= today
        })
    }

    if (tenantSelectedPeriod.value === 'monthly') {
        normalizeTenantMonthRange()
        const start = new Date(`${tenantMonthlyStartMonth.value}-01T00:00:00`)
        const end = new Date(`${addTenantMonth(tenantMonthlyEndMonth.value)}-01T00:00:00`)
        return rows.filter((row) => row.xDate >= start && row.xDate < end)
    }

    if (tenantSelectedPeriod.value === 'yearly') {
        normalizeTenantYearRange()
        const start = new Date(`${tenantYearlyStartYear.value}-01-01T00:00:00`)
        const end = new Date(`${Number(tenantYearlyEndYear.value) + 1}-01-01T00:00:00`)
        return rows.filter((row) => row.xDate >= start && row.xDate < end)
    }

    return rows
}

function formatTenantXAxisLabel(dateObj, rawX = null) {
    if (!dateObj && !rawX) return '-'

    const d = dateObj || parseTenantApiDate(rawX)

    if (tenantSelectedPeriod.value === 'hourly') {
        return `${String(d.getHours()).padStart(2, '0')}:00`
    }

    if (tenantSelectedPeriod.value === 'daily' || tenantSelectedPeriod.value === 'weekly') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    if (tenantSelectedPeriod.value === 'monthly') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }

    if (tenantSelectedPeriod.value === 'yearly') {
        return String(d.getFullYear())
    }

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function fetchTenantEnergySummary() {
    const { data } = await axios.get('http://localhost:8087/api/energy-summary', {
        params: {
            target_date: tenantSelectedDate.value,
        },
    })

    if (!data?.success) {
        throw new Error('Invalid tenant energy summary response')
    }

    tenantSummaryData.value = data

    const deviceRows = Array.isArray(data.devices) ? data.devices : []
    tenantDevices.value = deviceRows.map((device) => ({
        dev_eui: device.dev_eui,
        device_name: String(device.device_name || '').trim(),
        total_energy_kwh: device.total_energy_kwh ?? null,
        average_hourly_energy_kwh: device.average_hourly_energy_kwh ?? null,
        hours_with_data: device.hours_with_data ?? null,
        hasReading: Array.isArray(device.data) && device.data.length > 0,
        data: Array.isArray(device.data) ? device.data : [],
    }))
}
function addDaysToYmd(ymd, days) {
    const d = new Date(`${ymd}T00:00:00`)
    d.setDate(d.getDate() + days)

    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function aggregateTenantRowsByWeek(rows) {
    const buckets = new Map()

    for (const row of rows) {
        if (!row?.xDate) continue
        const week = isoWeekString(row.xDate)
        buckets.set(week, Number(buckets.get(week) || 0) + Number(row.yValue || 0))
    }

    normalizeTenantWeekRange()
    return listTenantWeeksInclusive(tenantWeeklyStartWeek.value, tenantWeeklyEndWeek.value).map((week) => {
        const { start } = getTenantWeekStartEnd(week)
        return {
            x: tenantWeekLabel(week),
            label: tenantWeekLabel(week),
            xDate: start,
            yValue: Number(buckets.get(week) || 0),
        }
    })
}

function aggregateTenantRowsByMonth(rows) {
    const buckets = new Map()

    for (const row of rows) {
        if (!row?.xDate) continue
        const month = `${row.xDate.getFullYear()}-${String(row.xDate.getMonth() + 1).padStart(2, '0')}`
        buckets.set(month, Number(buckets.get(month) || 0) + Number(row.yValue || 0))
    }

    normalizeTenantMonthRange()
    return listTenantMonthsInclusive(tenantMonthlyStartMonth.value, tenantMonthlyEndMonth.value).map((month) => ({
        x: month,
        label: month,
        xDate: new Date(`${month}-01T00:00:00`),
        yValue: Number(buckets.get(month) || 0),
    }))
}

function aggregateTenantRowsByYear(rows) {
    const buckets = new Map()

    for (const row of rows) {
        if (!row?.xDate) continue
        const year = row.xDate.getFullYear()
        buckets.set(year, Number(buckets.get(year) || 0) + Number(row.yValue || 0))
    }

    normalizeTenantYearRange()
    const out = []
    for (let year = tenantYearlyStartYear.value; year <= tenantYearlyEndYear.value; year += 1) {
        out.push({
            x: String(year),
            label: String(year),
            xDate: new Date(`${year}-01-01T00:00:00`),
            yValue: Number(buckets.get(year) || 0),
        })
    }
    return out
}

async function fetchTenantGraphData(devEui = null) {
    const params = {
        granularity: tenantSelectedPeriod.value === 'yearly' ? 'monthly' : tenantSelectedPeriod.value,
        limit: 5000,
    }

    if (devEui) {
        params.dev_eui = devEui
    }

    if (tenantSelectedPeriod.value === 'daily') {
        normalizeTenantDailyRange()

        params.start = `${tenantDailyStartDate.value}T00:00:00`
        params.end = `${addDaysToYmd(tenantDailyEndDate.value, 1)}T00:00:00`
    } else if (tenantSelectedPeriod.value === 'weekly') {
        normalizeTenantWeekRange()
        const { start } = getTenantWeekStartEnd(tenantWeeklyStartWeek.value)
        const { end } = getTenantWeekStartEnd(tenantWeeklyEndWeek.value)
        end.setDate(end.getDate() + 1)

        params.start = tenantLocalDateTime(start)
        params.end = tenantLocalDateTime(end)
    } else if (tenantSelectedPeriod.value === 'monthly') {
        normalizeTenantMonthRange()

        params.start = `${tenantMonthlyStartMonth.value}-01T00:00:00`
        params.end = `${addTenantMonth(tenantMonthlyEndMonth.value)}-01T00:00:00`
    } else if (tenantSelectedPeriod.value === 'yearly') {
        normalizeTenantYearRange()

        params.start = `${tenantYearlyStartYear.value}-01-01T00:00:00`
        params.end = `${Number(tenantYearlyEndYear.value) + 1}-01-01T00:00:00`
    }

    const { data } = await axios.get('http://localhost:8087/api/hourly-graph', { params })

    if (!data?.success || !Array.isArray(data.data)) {
        throw new Error(
            devEui
                ? `Invalid ${tenantSelectedPeriod.value} graph response for ${devEui}`
                : `Invalid ${tenantSelectedPeriod.value} graph response`
        )
    }

    return data.data
}

async function loadTenantChartData() {
    tenantChartLoading.value = true

    try {
        tenantError.value = null

        let rows = []

        if (tenantSelectedDevice.value === 'overall') {
            rows = await fetchTenantGraphData()
        } else {
            const selected = tenantDevices.value.find((d) => d.dev_eui === tenantSelectedDevice.value)

            if (!selected) {
                tenantChartLabels.value = []
                tenantChartValues.value = []
                return
            }

            rows = await fetchTenantGraphData(tenantSelectedDevice.value)
        }

        let normalized = normalizeTenantChartRows(rows)
        normalized = filterTenantRowsBySelectedPeriod(normalized)
        if (tenantSelectedPeriod.value === 'weekly') {
            normalized = aggregateTenantRowsByWeek(normalized)
        } else if (tenantSelectedPeriod.value === 'monthly') {
            normalized = aggregateTenantRowsByMonth(normalized)
        } else if (tenantSelectedPeriod.value === 'yearly') {
            normalized = aggregateTenantRowsByYear(normalized)
        }

        tenantChartLabels.value = normalized.map((row) => row.label || formatTenantXAxisLabel(row.xDate, row.x))
        tenantChartValues.value = normalized.map((row) => Number(row.yValue.toFixed(3)))
    } catch (err) {
        tenantError.value = err?.message || 'Failed to load tenant chart data'
        tenantChartLabels.value = []
        tenantChartValues.value = []
    } finally {
        tenantChartLoading.value = false
    }
}

async function reloadTenantCard() {
    tenantLoading.value = true

    try {
        tenantError.value = null

        if (tenantSelectedPeriod.value === 'daily') {
            normalizeTenantDailyRange()
        } else if (tenantSelectedPeriod.value === 'weekly') {
            normalizeTenantWeekRange()
        } else if (tenantSelectedPeriod.value === 'monthly') {
            normalizeTenantMonthRange()
        } else if (tenantSelectedPeriod.value === 'yearly') {
            normalizeTenantYearRange()
        }

        await fetchTenantEnergySummary()
        await loadTenantChartData()
    } catch (err) {
        tenantError.value = err?.message || 'Failed to load tenant data'
    } finally {
        tenantLoading.value = false
    }
}

function onWasteApply() {
    if (!isWasteRangeValid.value) return;
    loadWasteLast7(); // refresh the "last 7" view against current dates
    loadWdi();        // keep WDI in sync
}


// endpoints (reuse your existing base if different)
const UD_HIERARCHY_URL = 'http://127.0.0.1:8081/meta/hierarchy'
const UD_TREND_BASE_URL = 'http://127.0.0.1:8081/power/block-level/trend'
const UD_EUI_DENOMINATOR = 192820
const UD_EUI_DAILY_BASELINE = 40000  // kWh/day assumption for remaining days

// state
const udPairs = ref([])           // [{ block, level }]
const udMonthTotalKwh = ref(0)
const udEuiLoading = ref(false)
const udEuiError = ref(null)


/* ===== Water: D/W/M/Y selection ===== */
const waterRangeMode = ref('day');
const waterSelectedDay = ref(todayLocalISODate());
const waterSelectedWeek = ref(isoWeekString(new Date()));
const waterSelectedMonth = ref(ymString(new Date()));
const waterSelectedYear = ref(new Date().getFullYear());

// script setup (top of Dashboard.vue)
const waterRef = ref(null)

const waterFsChartData = ref({ labels: [], datasets: [] })
const waterFsChartOptions = ref({})
const waterFsLoading = ref(false)

// NEW: mirror of the child's UI state for rendering controls in the modal
const waterUi = reactive({
    rangeMode: 'hour',             // 'hour' | 'day' | 'week' | 'month' | 'year'
    dateLabel: '',
    canStepNext: false,
    selectedDay: '',
    selectedFromTime: '00:00',
    selectedToTime: '23:59',
    selectedDayFrom: '',
    selectedDayTo: '',
    selectedWeek: '',
    selectedWeekFrom: '',
    selectedWeekTo: '',
    selectedMonth: '',
    selectedMonthStart: '',
    selectedMonthEnd: '',
    selectedYear: new Date().getFullYear(),
    selectedYearStart: new Date().getFullYear(),
    selectedYearEnd: new Date().getFullYear(),
    granularityHint: '',
    isLine: true,
})

// called whenever child's chart changes
function onWaterChartUpdated(payload) {
    if (!payload) return
    waterFsChartData.value = payload.chartData || { labels: [], datasets: [] }
    waterFsChartOptions.value = payload.chartOptions || {}
    waterFsLoading.value = !!payload.loading
}

// NEW: receive child's UI snapshot
function onWaterUiUpdated(ui) {
    Object.assign(waterUi, ui || {})
}

// keep your ref + open
function openWaterChart() {
    // grab the latest chart payload + UI snapshot
    const payload = waterRef.value?.getChartPayload?.()
    if (payload) onWaterChartUpdated(payload)
    const ui = waterRef.value?.getUi?.()
    if (ui) onWaterUiUpdated(ui)
    fullscreenChart.value = 'water'
}

// Controls call through to child
function waterSetRangeMode(mode) {
    waterRef.value?.setRangeMode?.(mode)
    waterRef.value?.applyFromUi?.()
}
function waterApply() {
    waterRef.value?.applyFromUi?.()
}
function waterStep(delta) {
    waterRef.value?.stepPeriod?.(delta)
}

// Bind inputs back to child (so the child stays the single source of truth)
function applyWaterAfterChange() {
    setTimeout(() => waterRef.value?.applyFromUi?.(), 0)
}
function onChangeSelectedDay(e) { waterRef.value?.setSelectedDay?.(e.target.value); applyWaterAfterChange() }
function onChangeWaterFromTime(e) { waterRef.value?.setSelectedFromTime?.(e.target.value); applyWaterAfterChange() }
function onChangeWaterToTime(e) { waterRef.value?.setSelectedToTime?.(e.target.value); applyWaterAfterChange() }
function onChangeWaterDayFrom(e) { waterRef.value?.setSelectedDayFrom?.(e.target.value); applyWaterAfterChange() }
function onChangeWaterDayTo(e) { waterRef.value?.setSelectedDayTo?.(e.target.value); applyWaterAfterChange() }
function onChangeSelectedWeek(e) { waterRef.value?.setSelectedWeek?.(e.target.value); applyWaterAfterChange() }
function onChangeWaterWeekFrom(e) { waterRef.value?.setSelectedWeekFrom?.(e.target.value); applyWaterAfterChange() }
function onChangeWaterWeekTo(e) { waterRef.value?.setSelectedWeekTo?.(e.target.value); applyWaterAfterChange() }
function onChangeSelectedMonth(e) { waterRef.value?.setSelectedMonth?.(e.target.value); applyWaterAfterChange() }
function onChangeSelectedYear(e) { waterRef.value?.setSelectedYear?.(Number(e.target.value)); applyWaterAfterChange() }

const BLOCK_MONTH_URL = 'http://127.0.0.1:8081/power/block/month'

function ymdLocal(d = new Date()) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

async function loadEnergyKpis() {
    energyKpiLoading.value = true
    energyKpiError.value = null

    try {
        const resp = await fetch(BLOCK_MONTH_URL, { cache: 'no-cache' })
        if (!resp.ok) throw new Error('Month HTTP ' + resp.status)

        const body = await resp.json()

        // Monthly = API total_kwh
        kpiEnergyMonthToDate.value = Number(body?.total_kwh || 0)

        // Daily (today) = sum rows where date == today
        const today = ymdLocal(new Date())
        const rows = Array.isArray(body?.rows) ? body.rows : []
        const todayTotal = rows
            .filter(r => r?.date === today)
            .reduce((sum, r) => sum + Number(r?.kwh || 0), 0)

        kpiEnergyDayToDate.value = todayTotal
    } catch (e) {
        energyKpiError.value = e?.message ?? 'Failed to load energy KPIs'
    } finally {
        energyKpiLoading.value = false
    }
}


const waterGranularityHint = computed(() => {
    const m = { day: 'Summed m3 - Day view (Hourly)', week: 'Summed m3 - Week view (Daily)', month: 'Summed m3 - Month view (Daily)', year: 'Summed m3 - Year view (Daily)' };
    return m[waterRangeMode.value];
});

function waterCurrentPeriodStartFor(mode) {
    const now = new Date();
    if (mode === 'day') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    if (mode === 'week') return mondayOfISOWeek(now);
    if (mode === 'month') return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function waterBoundsForSelection() {
    const mode = waterRangeMode.value;
    if (mode === 'day') {
        const d = waterSelectedDay.value ? new Date(waterSelectedDay.value) : startOfToday();
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 1);
        return { start, end };
    }
    if (mode === 'week') {
        const start = weekStringToDate(waterSelectedWeek.value);
        const end = new Date(start); end.setDate(end.getDate() + 7);
        return { start, end };
    }
    if (mode === 'month') {
        const start = ymToDate(waterSelectedMonth.value);
        const end = new Date(start); end.setMonth(end.getMonth() + 1, 1);
        return { start, end };
    }
    const y = Number(waterSelectedYear.value || new Date().getFullYear());
    const start = new Date(y, 0, 1, 0, 0, 0, 0);
    const end = new Date(y + 1, 0, 1, 0, 0, 0, 0);
    return { start, end };
}

const waterDateLabel = computed(() => {
    const { start, end } = waterBoundsForSelection();
    if (!start || !end) return '';
    if (waterRangeMode.value === 'day') return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(start);
    if (waterRangeMode.value === 'week') {
        const endMinus1 = new Date(end.getTime() - 86400e3);
        return `Week ${weekNumber(start)} (${new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(start)} - ${new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(endMinus1)})`;
    }
    if (waterRangeMode.value === 'month') return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(start);
    return String(start.getFullYear());
});

const waterCanStepNext = computed(() => {
    const { start } = waterBoundsForSelection();
    if (!start) return false;
    return start.getTime() < waterCurrentPeriodStartFor(waterRangeMode.value).getTime();
});

function waterStepPeriod(delta) {
    const d = clampInt(delta);
    if (!d) return;

    if (waterRangeMode.value === 'day') {
        const cur = waterSelectedDay.value ? new Date(waterSelectedDay.value) : startOfToday();
        cur.setDate(cur.getDate() + d);
        waterSelectedDay.value = isoDate(cur);
    } else if (waterRangeMode.value === 'week') {
        const a = weekStringToDate(waterSelectedWeek.value);
        a.setDate(a.getDate() + 7 * d);
        waterSelectedWeek.value = isoWeekString(a);
    } else if (waterRangeMode.value === 'month') {
        const a = ymToDate(waterSelectedMonth.value);
        a.setMonth(a.getMonth() + d, 1);
        waterSelectedMonth.value = ymString(a);
    } else {
        waterSelectedYear.value = Number(waterSelectedYear.value || new Date().getFullYear()) + d;
    }
    // watcher will auto-apply
}

// ===== Chiller Monthly Report (CSV) =====
const showChillerMonthlyModal = ref(false)
const chillerReportMonth = ref(ymString(new Date())) // "YYYY-MM"
const chillerReportLoading = ref(false)
const chillerReportError = ref(null)

function openChillerMonthlyModal() {
    chillerReportError.value = null
    chillerReportMonth.value = ymString(new Date())
    showChillerMonthlyModal.value = true
}
function closeChillerMonthlyModal() {
    showChillerMonthlyModal.value = false
}

function toCsvNumber(v, dp = 6) {
    const n = Number(v)
    if (!Number.isFinite(n)) return ''
    return n.toFixed(dp)
}

function buildChillerMonthlyRows(month) {
    const [year, monthNo] = String(month).split('-').map(Number)
    const days = new Date(year, monthNo, 0).getDate()
    return Array.from({ length: days }, (_, idx) => {
        const day = `${month}-${String(idx + 1).padStart(2, '0')}`
        const airside = Number((0.72 + Math.sin(idx / 5) * 0.035).toFixed(3))
        const waterside = Number((0.915 + Math.sin(idx / 4) * 0.045).toFixed(3))
        return {
            date: day,
            waterside,
            airside,
            tse: Number((waterside + airside).toFixed(3)),
        }
    })
}

function buildAndDownloadCsv(rows, filename) {
    const header = ['Date', 'Waterside', 'Airside', 'Total System Efficiency']
    const csvLines = [
        header.join(','),
        ...rows.map(r => [
            r.date,
            toCsvNumber(r.waterside),
            toCsvNumber(r.airside),
            toCsvNumber(r.tse),
        ].join(','))
    ]

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

async function downloadChillerMonthlyCsv() {
    const month = chillerReportMonth.value // "YYYY-MM"
    if (!month) return

    chillerReportLoading.value = true
    chillerReportError.value = null

    try {
        buildAndDownloadCsv(buildChillerMonthlyRows(month), `Chiller_Monthly_Report_${month}.csv`)
        closeChillerMonthlyModal()
    } catch (e) {
        chillerReportError.value = e?.message ?? 'Failed to download report'
    } finally {
        chillerReportLoading.value = false
    }
}


// helpers
function udMonthStart() {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
}
function udToISOsec(dt) {
    const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, '0'), d = String(dt.getDate()).padStart(2, '0')
    const hh = String(dt.getHours()).padStart(2, '0'), mm = String(dt.getMinutes()).padStart(2, '0'), ss = String(dt.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}`
}
// === Use the labels actually rendered by the chart ===
function getActiveLabels() {
    return Array.isArray(trendChartData.value?.labels)
        ? trendChartData.value.labels
        : [];
}

// Map tick "value" to the real label (handles numeric index or string)
function labelFromTickValue(value, idx) {
    const labels = getActiveLabels();
    if (typeof value === 'string') {
        const matchIdx = labels.indexOf(value);
        if (matchIdx !== -1) return labels[matchIdx];
        if (labels[idx] != null) return labels[idx];
        return value;
    }
    if (typeof value === 'number' && labels[value] != null) {
        return labels[value];
    }
    if (labels[idx] != null) return labels[idx];
    return String(value ?? '');
}

async function udLoadPairs() {
    udEuiError.value = null
    try {
        const r = await fetch(UD_HIERARCHY_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        const bbl = b?.by_block_level || {}
        const out = []
        for (const blk of Object.keys(bbl)) {
            for (const lvl of Object.keys(bbl[blk] || {})) {
                out.push({ block: blk, level: lvl })
            }
        }
        udPairs.value = out
    } catch (e) {
        udPairs.value = []
        udEuiError.value = e?.message ?? 'Failed to load hierarchy'
    }
}

async function udFetchTrend(block, level, startIso, endIso) {
    const params = new URLSearchParams({ block, level, start: startIso, end: endIso })
    const url = `${UD_TREND_BASE_URL}?${params.toString()}`
    const r = await fetch(url, { cache: 'no-cache' })
    if (!r.ok) throw new Error(`${block}.${level} HTTP ${r.status}`)
    return r.json()
}

async function udSumRange(startDate, endDate) {
    const startIso = udToISOsec(startDate)
    const endIso = udToISOsec(endDate)
    if (!udPairs.value.length) return 0

    const payloads = await Promise.all(
        udPairs.value.map(p => udFetchTrend(p.block, p.level, startIso, endIso))
    )

    let total = 0
    for (const pl of payloads) {
        for (const s of (pl?.series || [])) {
            for (const pt of (s.points || [])) {
                total += Number(pt.kwh || 0)
            }
        }
    }
    return total
}

async function refreshUdMonthTotal() {
    udEuiLoading.value = true;
    udEuiError.value = null;

    try {
        const now = new Date();
        // REUSE the same function your energy KPIs use
        udMonthTotalKwh.value = await sumEnergyKwhBetween(udMonthStart(), now);
    } catch (e) {
        udEuiError.value = e?.message ?? 'Failed to compute MTD';
        udMonthTotalKwh.value = 0;
    } finally {
        udEuiLoading.value = false;
    }
}


// identical to EnergyManagement.vue formula
const euiNow = computed(() => {
    // OK use the SAME value shown in "Current Usage for the Month"
    const mtd = Number(kpiEnergyMonthToDate.value || 0)

    const today = new Date()
    const x = Math.min(today.getDate(), 365)

    const v =
        (((365 - x) * UD_EUI_DAILY_BASELINE) + mtd) /
        UD_EUI_DENOMINATOR

    return Number.isFinite(v) ? v : 0
})

// init
onMounted(async () => {
    await udLoadPairs()
    await refreshUdMonthTotal()
    await reloadTenantCard()
})
/* ======================= Fullscreen (shared) ======================= */
const fullscreenChart = ref(null) // 'energy' | 'water' | 'waste' | 'chiller' | null
function closeFullscreen() { fullscreenChart.value = null }
function onEsc(e) { if (e.key === 'Escape' && fullscreenChart.value) closeFullscreen() }
onMounted(() => window.addEventListener('keydown', onEsc))
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc))

function openEnergyChart() { fullscreenChart.value = 'energy' }



const wasteFromISO = ref(todayLocalISODate())
const wasteToISO = ref(todayLocalISODate())
const isWasteRangeValid = computed(() => {
    if (!wasteFromISO.value || !wasteToISO.value) return false
    return new Date(wasteFromISO.value) <= new Date(wasteToISO.value)
})


/* ======================= UI / Filters / Editors ======================= */
const ui = reactive({
    openFilter: {
        energy: false,
        water: false,
        waste: false,
        chiller: false,
        env: false,  // kept for backward-compat with older templates
        mid: false,
        right: false,
    },
    openEdit: {
        meta: false, // for population/area editor popover
    }
})
// Close any popover when user clicks outside
if (typeof window !== 'undefined') {
    window.addEventListener('click', () => {
        ui.openFilter.energy = ui.openFilter.water = ui.openFilter.waste = ui.openFilter.chiller = false
        ui.openFilter.env = ui.openFilter.mid = ui.openFilter.right = false
        ui.openEdit.meta = false
    })
}

const chartKey = computed(() =>
    [
        'energy-trend',
        (compareView.value ? 'cmp' : 'time'),
        trendMode.value,
        periodMode.value,
        rangeMode.value,
        energyChartType.value,
        trendSeries.value.type,
        trendStartLocal.value,
        trendEndLocal.value,
        (trendSeries.value.labels?.length ?? 0),
    ].join('-')
);

function onRangeModeChange() {
    resetToTimeTrend();
    initRangeControlsToNow(rangeMode.value);
}

/* Helpful formatters used widely */
function fmtNum(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString() : '-' }
function showNum(v, dp = 1) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(dp) : '-' }
function todayLocalISODate() {
    const now = new Date()
    const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
function toLocalISO(dt) {
    const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, '0'), d = String(dt.getDate()).padStart(2, '0')
    const hh = String(dt.getHours()).padStart(2, '0'), mm = String(dt.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d}T${hh}:${mm}`
}
function toIsoWithSeconds(localDT) {
    if (!localDT) return ''
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localDT) ? `${localDT}:00` : localDT
}
function yyyy_mm_dd_to_ddmmyyyy(isoDate) {
    if (!isoDate) return ''
    const [y, m, d] = String(isoDate).split('-')
    return `${d}/${m}/${y}`
}

/* === Bar/Line aggregation helpers === */
function periodAllow(ts, period) {
    if (!period || period === 'overall') return true;
    const h = new Date(ts).getHours();
    if (period === 'business') return h >= 7 && h < 18;
    if (period === 'offpeak1') return h >= 18 && h < 23;
    return h < 7 || h >= 23;
}

function keyFor(ts, mode) {
    const d = new Date(ts);
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    if (mode === 'week' || mode === 'day') return `${y}-${m}-${day}`;
    if (mode === 'month') return `${y}-${m}`;
    if (mode === 'year') return String(y);
    return ts;
}

function sortKeyFn(mode) {
    if (mode === 'week' || mode === 'day') {
        return (a, b) => new Date(a) - new Date(b);
    }
    if (mode === 'month') {
        return (a, b) => {
            const [ay, am] = a.split('-').map(Number);
            const [by, bm] = b.split('-').map(Number);
            return ay !== by ? ay - by : am - bm;
        };
    }
    if (mode === 'year') return (a, b) => Number(a) - Number(b);
    return (a, b) => a.localeCompare(b);
}

/* Label formatters */
const fmtDay = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
const fmtMonthYear = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });
const fmtTime = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

function isValidDate(d) {
    return d instanceof Date && !Number.isNaN(d.getTime());
}

function safeFormat(dtf, input) {
    const d = new Date(input);
    return isValidDate(d) ? dtf.format(d) : String(input ?? '');
}

function formatLabel(label) {
    const s = String(label ?? '');
    if (!s) return '';

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(s)) {
        return safeFormat(fmtTime, s);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return safeFormat(fmtDay, `${s}T00:00:00`);
    }
    if (/^\d{4}-\d{2}$/.test(s)) {
        return safeFormat(fmtMonthYear, `${s}-01T00:00:00`);
    }
    if (/^\d{4}$/.test(s)) return s;

    const d = new Date(s);
    return isValidDate(d) ? fmtDay.format(d) : s;
}

/* ==== Range-mode controls ==== */
const rangeMode = ref('day');
const selectedDay = ref(todayLocalISODate());
const selectedWeek = ref(isoWeekString(new Date()));
const selectedMonth = ref(ymString(new Date()));
const selectedYear = ref(new Date().getFullYear());

const trendGran = ref('H'); // 'H' | 'D' | 'W' | 'M' | 'Y'
const trendDay = ref(selectedDay.value);
const trendFromTime = ref('00:00');
const trendToTime = ref('23:59');
const trendDayFrom = ref(selectedDay.value);
const trendDayTo = ref(selectedDay.value);
const trendWeekFrom = ref(selectedWeek.value);
const trendWeekTo = ref(selectedWeek.value);
const trendMonthFrom = ref(selectedMonth.value);
const trendMonthTo = ref(selectedMonth.value);
const trendYearFrom = ref(selectedYear.value - 1);
const trendYearTo = ref(selectedYear.value);

const dtDay = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
const dtMonthYear = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });

const trendGranularityHint = computed(() => {
    if (trendGran.value === 'H') return 'Hourly data';
    if (trendGran.value === 'D') return 'Daily data';
    if (trendGran.value === 'W') return 'Weekly data';
    if (trendGran.value === 'M') return 'Monthly data';
    return 'Yearly data';
});

const dateLabel = computed(() => {
    const { start, end } = boundsForSelection();
    if (!start || !end) return '';
    if (trendGran.value === 'H') return dtDay.format(start);
    if (trendGran.value === 'D') return `${dtDay.format(start)} - ${dtDay.format(new Date(end.getTime() - 86400e3))}`;
    if (trendGran.value === 'W') {
        const endMinus1 = new Date(end.getTime() - 86400e3);
        return `Week ${weekNumber(start)} (${dtDay.format(start)} - ${dtDay.format(endMinus1)})`;
    }
    if (trendGran.value === 'M') return `${dtMonthYear.format(start)} - ${dtMonthYear.format(new Date(end.getFullYear(), end.getMonth() - 1, 1))}`;
    return `${start.getFullYear()} - ${end.getFullYear() - 1}`;
});

function currentPeriodStartFor(mode) {
    const now = new Date();
    if (mode === 'day') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    if (mode === 'week') return mondayOfISOWeek(now);
    if (mode === 'month') return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
}

const canStepNext = computed(() => {
    const { start } = boundsForSelection();
    if (!start) return false;
    return start.getTime() < currentPeriodStartFor(rangeMode.value).getTime();
});

function addDaysYmd(ymd, days) {
    const d = new Date(`${ymd}T00:00:00`);
    d.setDate(d.getDate() + days);
    return isoDate(d);
}

function addMonthsYm(ym, months) {
    const [y, m] = String(ym).split('-').map(Number);
    return ymString(new Date(y, (m || 1) - 1 + months, 1));
}

function listDatesInclusive(startYmd, endYmd) {
    const out = [];
    let cur = startYmd;
    while (cur <= endYmd) {
        out.push(cur);
        cur = addDaysYmd(cur, 1);
    }
    return out;
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

async function fetchEnergyBlockMonthRows(startYmd, endYmd) {
    const params = new URLSearchParams({ start: startYmd, end: endYmd });
    const r = await fetch(`${BLOCK_MONTH_URL}?${params.toString()}`, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`Month range HTTP ${r.status}`);
    const body = await r.json();
    return Array.isArray(body?.rows) ? body.rows : [];
}

function sumRowsByKey(rows, keyFn) {
    const bucket = new Map();
    for (const row of rows || []) {
        const key = keyFn(String(row?.date || ''));
        if (!key) continue;
        bucket.set(key, (bucket.get(key) || 0) + Number(row?.kwh || 0));
    }
    return bucket;
}

function labelMonth(ym) {
    const [y, m] = String(ym).split('-').map(Number);
    if (!y || !m) return String(ym || '');
    return new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(y, m - 1, 1));
}

function isoWeekKey(dateVal) {
    return isoWeekString(new Date(dateVal));
}

function labelWeek(weekKey) {
    const m = /^(\d{4})-W(\d{2})$/.exec(String(weekKey || ''));
    return m ? `Week ${Number(m[2])}` : String(weekKey || '');
}

function listWeeksInclusive(startWeek, endWeek) {
    const out = [];
    const cur = weekStringToDate(startWeek);
    const end = weekStringToDate(endWeek);
    while (cur <= end) {
        out.push(isoWeekString(cur));
        cur.setDate(cur.getDate() + 7);
    }
    return out;
}

async function loadEnergyMonthCompare() {
    trendLoading.value = true;
    trendError.value = null;
    try {
        const months = listMonthsInclusive(trendMonthFrom.value, trendMonthTo.value);
        const rows = await fetchEnergyBlockMonthRows(`${trendMonthFrom.value}-01`, `${addMonthsYm(trendMonthTo.value, 1)}-01`);
        const byMonth = sumRowsByKey(rows, date => date.slice(0, 7));
        trendSeries.value = {
            labels: months.map(labelMonth),
            data: months.map(month => byMonth.get(month) || 0),
            type: 'bar',
        };
    } catch (e) {
        trendError.value = e?.message ?? 'Month trend failed';
        trendSeries.value = { labels: [], data: [], type: 'bar' };
    } finally {
        trendLoading.value = false;
    }
}

async function loadEnergyYearCompare() {
    trendLoading.value = true;
    trendError.value = null;
    try {
        const years = [];
        for (let y = Number(trendYearFrom.value); y <= Number(trendYearTo.value); y += 1) years.push(y);
        const rows = await fetchEnergyBlockMonthRows(`${trendYearFrom.value}-01-01`, `${Number(trendYearTo.value) + 1}-01-01`);
        const byYear = sumRowsByKey(rows, date => date.slice(0, 4));
        trendSeries.value = {
            labels: years.map(String),
            data: years.map(year => byYear.get(String(year)) || 0),
            type: 'bar',
        };
    } catch (e) {
        trendError.value = e?.message ?? 'Year trend failed';
        trendSeries.value = { labels: [], data: [], type: 'bar' };
    } finally {
        trendLoading.value = false;
    }
}

async function applyRangeFromControls() {
    const { start, end } = boundsForSelection();
    if (!start || !end) return;
    trendStartLocal.value = toLocalISO(start);
    trendEndLocal.value = toLocalISO(end);
    resetToTimeTrend();
    if (trendGran.value === 'M') return loadEnergyMonthCompare();
    if (trendGran.value === 'Y') return loadEnergyYearCompare();
    await loadTrendForSelection();
}
function stepPeriod(delta) {
    const d = clampInt(delta);
    if (!d) return;
    if (rangeMode.value === 'day') {
        const cur = selectedDay.value ? new Date(selectedDay.value) : startOfToday();
        cur.setDate(cur.getDate() + d);
        selectedDay.value = isoDate(cur);
    } else if (rangeMode.value === 'week') {
        const a = weekStringToDate(selectedWeek.value);
        a.setDate(a.getDate() + 7 * d);
        selectedWeek.value = isoWeekString(a);
    } else if (rangeMode.value === 'month') {
        const a = ymToDate(selectedMonth.value);
        a.setMonth(a.getMonth() + d, 1);
        selectedMonth.value = ymString(a);
    } else {
        selectedYear.value = Number(selectedYear.value || new Date().getFullYear()) + d;
    }
    applyRangeFromControls();
}

function boundsForSelection() {
    if (trendGran.value === 'H') {
        const s = `${trendDay.value}T${trendFromTime.value || '00:00'}:00`;
        const e = `${trendDay.value}T${trendToTime.value || '23:59'}:00`;
        return { start: new Date(s), end: new Date(e) };
    }
    if (trendGran.value === 'D') {
        const start = new Date(`${trendDayFrom.value}T00:00:00`);
        const end = new Date(`${trendDayTo.value}T00:00:00`);
        end.setDate(end.getDate() + 1);
        return { start, end };
    }
    if (trendGran.value === 'W') {
        const start = weekStringToDate(trendWeekFrom.value);
        const end = weekStringToDate(trendWeekTo.value);
        end.setDate(end.getDate() + 7);
        return { start, end };
    }
    if (trendGran.value === 'M') {
        const start = ymToDate(trendMonthFrom.value);
        const end = ymToDate(trendMonthTo.value);
        end.setMonth(end.getMonth() + 1, 1);
        return { start, end };
    }
    const yFrom = Number(trendYearFrom.value || new Date().getFullYear());
    const yTo = Number(trendYearTo.value || yFrom);
    return {
        start: new Date(yFrom, 0, 1, 0, 0, 0, 0),
        end: new Date(yTo + 1, 0, 1, 0, 0, 0, 0),
    };
}

function legacyBoundsForSelection() {
    const mode = rangeMode.value;
    if (mode === 'day') {
        const d = selectedDay.value ? new Date(selectedDay.value) : startOfToday();
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 1);
        return { start, end };
    }
    if (mode === 'week') {
        const start = weekStringToDate(selectedWeek.value);
        const end = new Date(start); end.setDate(end.getDate() + 7);
        return { start, end };
    }
    if (mode === 'month') {
        const start = ymToDate(selectedMonth.value);
        const end = new Date(start); end.setMonth(end.getMonth() + 1, 1);
        return { start, end };
    }
    const y = Number(selectedYear.value || new Date().getFullYear());
    const start = new Date(y, 0, 1, 0, 0, 0, 0);
    const end = new Date(y + 1, 0, 1, 0, 0, 0, 0);
    return { start, end };
}

function initRangeControlsToNow(mode = 'day') {
    const now = new Date();
    rangeMode.value = mode;
    selectedDay.value = isoDate(now);
    selectedWeek.value = isoWeekString(now);
    selectedMonth.value = ymString(now);
    selectedYear.value = now.getFullYear();
    trendGran.value = mode === 'day' ? 'H' : mode === 'week' ? 'W' : mode === 'month' ? 'M' : 'Y';
    trendDay.value = selectedDay.value;
    trendDayFrom.value = selectedDay.value;
    trendDayTo.value = selectedDay.value;
    trendWeekFrom.value = selectedWeek.value;
    trendWeekTo.value = selectedWeek.value;
    trendMonthFrom.value = selectedMonth.value;
    trendMonthTo.value = selectedMonth.value;
    trendYearFrom.value = selectedYear.value - 1;
    trendYearTo.value = selectedYear.value;
}

const canApplyGranularTrend = computed(() => {
    if (trendGran.value === 'H') return !!trendDay.value && !!trendFromTime.value && !!trendToTime.value;
    if (trendGran.value === 'D') return !!trendDayFrom.value && !!trendDayTo.value && trendDayFrom.value <= trendDayTo.value;
    if (trendGran.value === 'W') return !!trendWeekFrom.value && !!trendWeekTo.value && trendWeekFrom.value <= trendWeekTo.value;
    if (trendGran.value === 'M') return !!trendMonthFrom.value && !!trendMonthTo.value && trendMonthFrom.value <= trendMonthTo.value;
    return Number.isFinite(trendYearFrom.value) && Number.isFinite(trendYearTo.value) && trendYearFrom.value <= trendYearTo.value;
});

let energyAutoApplyTimer = null;
function scheduleEnergyAutoApply() {
    if (energyAutoApplyTimer) clearTimeout(energyAutoApplyTimer);
    energyAutoApplyTimer = setTimeout(() => {
        energyAutoApplyTimer = null;
        if (canApplyGranularTrend.value) applyRangeFromControls();
    }, 250);
}

watch([
    trendGran,
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
], () => {
    rangeMode.value = trendGran.value === 'H' || trendGran.value === 'D'
        ? 'day'
        : trendGran.value === 'W'
            ? 'week'
            : trendGran.value === 'M'
                ? 'month'
                : 'year';
    selectedDay.value = trendDay.value;
    scheduleEnergyAutoApply();
})

// small utils
function clampInt(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }
function pad2(n) { return String(n).padStart(2, '0'); }
function isoDate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function ymString(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; }
function ymToDate(ym) {
    if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1, 0, 0, 0, 0);
}

// ISO week helpers
function isoWeekString(d) {
    // Monday of the week for `d` (you already have this helper)
    const m = mondayOfISOWeek(d);

    // Monday of ISO week 1 (the week containing Jan 4)
    const jan4 = new Date(m.getFullYear(), 0, 4);
    const jan4Mon = mondayOfISOWeek(jan4);

    // Whole weeks between Jan4's Monday and our Monday
    const diffDays = Math.floor((m.getTime() - jan4Mon.getTime()) / 86400000);
    const week = 1 + Math.floor(diffDays / 7);

    return `${m.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weekStringToDate(w) {
    const m = String(w || '').match(/^(\d{4})-W(\d{2})$/);
    if (!m) { return mondayOfISOWeek(new Date()); }
    const y = Number(m[1]), wk = Number(m[2]);
    const jan4 = new Date(y, 0, 4);
    const jan4Mon = mondayOfISOWeek(jan4);
    const d = new Date(jan4Mon); d.setDate(d.getDate() + (wk - 1) * 7);
    d.setHours(0, 0, 0, 0);
    return d;
}
function mondayOfISOWeek(d) {
    const x = new Date(d); x.setHours(0, 0, 0, 0);
    const day = x.getDay() || 7;
    if (day !== 1) x.setDate(x.getDate() - (day - 1));
    return x;
}
function weekNumber(d) {
    const s = isoWeekString(d); return Number(s.slice(6));
}

/* =========================================================
   WATER - blocks, meters, cumulative mix, daily summary, trend
========================================================= */
const BLOCKS_URL = 'http://localhost:8080/blocks'
const METERS_URL = '/water_meters_combined_full_sorted.json'
const SUMMARY_URL = 'http://localhost:8080/summary/block' // ?date=YYYY-MM-DD

// ------- WDI -------
const wdiLoading = ref(false);
const wdiError = ref(null);
const wdiData = ref(null);
const wdiValue = computed(() => {
    const v = wdiData.value?.wdi;
    return Number.isFinite(Number(v)) ? Number(v) : null;
});
function minusDaysISO(iso, days) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d)) return '';
    d.setDate(d.getDate() - Math.abs(Number(days) || 0));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}
async function loadWdi() {
    wdiLoading.value = true;
    wdiError.value = null;
    try {
        const startIso = minusDaysISO(wasteFromISO.value, 1) || minusDaysISO(new Date().toISOString().slice(0, 10), 1);
        const endIso = wasteToISO.value || new Date().toISOString().slice(0, 10);
        const start = encodeURIComponent(yyyy_mm_dd_to_ddmmyyyy(startIso));
        const end = encodeURIComponent(yyyy_mm_dd_to_ddmmyyyy(endIso));
        const url = `${WASTE_BASE}/stats/wdi?start=${start}&end=${end}`
            + `&operational_days=1&staff_per_day=1&visitors_per_day=1`
            + `&include_recycled_in_disposed=false&use_year_totals=true`;
        const r = await fetch(url, { cache: 'no-cache' });
        if (!r.ok) throw new Error(`WDI HTTP ${r.status}`);
        const body = await r.json();
        wdiData.value = body || {};
    } catch (e) {
        wdiError.value = e?.message ?? 'Failed to load WDI';
        wdiData.value = null;
    } finally {
        wdiLoading.value = false;
    }
}
watch([wasteFromISO, wasteToISO], () => {
    if (isWasteRangeValid.value) loadWdi();
}, { immediate: true });

const apiBlocks = ref([]), blocksLoading = ref(false), blocksError = ref(false)
async function loadBlocks() {
    blocksLoading.value = true; blocksError.value = false
    try {
        const r = await fetch(BLOCKS_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        apiBlocks.value = Array.isArray(b?.items) ? b.items : []
    } catch (_) { blocksError.value = true } finally { blocksLoading.value = false }
}

/* Flatten meters for tag/source classification */
const metersLoading = ref(false), metersError = ref(null), flatRows = ref([])
function classifySource(remarks) {
    if (!remarks) return 'PUB'
    const s = String(remarks).trim().toLowerCase()
    return s === 'irrigation meter' || s.includes('irrigation') ? 'NEWater' : 'PUB'
}
async function loadMeters() {
    metersLoading.value = true; metersError.value = null
    try {
        const data = await fetchJson(METERS_URL, { cache: 'no-cache' })
        flatRows.value = flattenMeters(data)
    } catch (e) { metersError.value = e?.message ?? 'Load failed' } finally { metersLoading.value = false }
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
                Object.values(v2 || {}).forEach(meter => {
                    const mi = meter?.meter_info || {}
                    out.push({
                        block: String(mi.block || block || ''), level_label: levelLabel, level: mi.level || '',
                        meter_tag: mi.meter_tag || '', place: mi.place ?? '', location: mi.location ?? '',
                        serial_no: mi.serial_no ?? '', remarks: mi.remarks ?? '', section: mi.section ?? '',
                        source: classifySource(mi.remarks)
                    })
                })
            } else {
                const place = k2
                Object.entries(v2 || {}).forEach(([levelLabel, metersAtLevel]) => {
                    Object.values(metersAtLevel || {}).forEach(meter => {
                        const mi = meter?.meter_info || {}
                        out.push({
                            block: String(mi.block || block || ''), level_label: levelLabel, level: mi.level || '',
                            meter_tag: mi.meter_tag || '', place: mi.place ?? place, location: mi.location ?? '',
                            serial_no: mi.serial_no ?? '', remarks: mi.remarks ?? '', section: mi.section ?? '',
                            source: classifySource(mi.remarks)
                        })
                    })
                })
            }
        })
    })
    out.sort((a, b) => a.block.localeCompare(b.block) || a.level_label.localeCompare(b.level_label) || a.meter_tag.localeCompare(b.meter_tag))
    return out
}
const meterTagToSource = computed(() => {
    const m = Object.create(null)
    for (const r of flatRows.value || []) if (r?.meter_tag) m[r.meter_tag] = r.source || 'PUB'
    return m
})

const allMeterTags = computed(() => Array.from(new Set((flatRows.value || []).map(r => r?.meter_tag).filter(Boolean))).sort())
const selectionMeterTags = computed(() => allMeterTags.value)

// Water KPI values (filled by WaterOverallTrend.vue)
const kpiPubToday = ref(0)
const kpiNeToday = ref(0)

// when child emits { pub, ne } we update our cards
function onWaterDayPicked(payload = {}) {
    kpiPubToday.value = Number(payload.pub || 0)
    kpiNeToday.value = Number(payload.ne || 0)
}

function computeYesterdayIncoming(days, pubDaily, neDaily) {
    // Today, yesterday, and 2 days before (YYYY-MM-DD)
    const today = todayLocalISODate()
    const yday = ymdPrev(today)
    const yday2 = ymdPrev(yday)

    // Find their indexes in the daily arrays
    const idxY1 = days.indexOf(yday)
    const idxY2 = days.indexOf(yday2)

    // Compute the difference (yesterday - 2 days before)
    let pubDiff = 0, neDiff = 0
    if (idxY1 >= 0 && idxY2 >= 0) {
        pubDiff = (pubDaily[idxY1] || 0) - (pubDaily[idxY2] || 0)
        neDiff = (neDaily[idxY1] || 0) - (neDaily[idxY2] || 0)
    }

    // Return positive-only values (no negatives if data rolled over)
    return {
        pubIncoming: pubDiff > 0 ? pubDiff : 0,
        neIncoming: neDiff > 0 ? neDiff : 0,
    }
}




/* Daily campus usage summary (WUI numerator) */
const summaryDateLocal = ref(minusDaysISO(todayLocalISODate(), 1))
const summaryItems = ref([]), summaryLoading = ref(false), summaryError = ref(null)
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
const kpiCampusToday = computed(() =>
    (summaryItems.value || []).reduce((a, it) => a + (Number(it.consumption) || 0), 0)
)

/* Water trend (All blocks) - PUB vs NEWater split line chart */
const granularity = ref('hourly')
const seriesLoading = ref(false), seriesError = ref(null)
const chartA = ref({ labels: [], datasets: [] })

// pick PUB + NEWater for a specific day from the chart
function syncWaterKpisFromChart(targetYmd = null) {
    const labels = chartA.value?.labels || []
    const datasets = chartA.value?.datasets || []
    if (!labels.length || !datasets.length) return

    // find PUB and NEWater datasets in the chart
    const pubDs = datasets.find(ds => String(ds.label || '').toLowerCase().includes('pub'))
    const neDs = datasets.find(ds => String(ds.label || '').toLowerCase().includes('ne'))

    // if chart doesn't have both, don't touch the KPIs
    if (!pubDs || !neDs) return

    // 1) if you gave me a date (e.g. 2025-10-30) and it exists, use it
    // 2) else fall back to the LAST label (latest day on chart)
    let wantedLabel = null
    if (targetYmd && labels.includes(targetYmd)) {
        wantedLabel = targetYmd
    } else {
        wantedLabel = labels[labels.length - 1]
    }

    const idx = labels.indexOf(wantedLabel)
    if (idx === -1) return

    const pubVal = Number(pubDs.data?.[idx] ?? 0)
    const neVal = Number(neDs.data?.[idx] ?? 0)

    // write into your existing KPIs
    kpiPubToday.value = Number.isFinite(pubVal) ? pubVal : 0
    kpiNeToday.value = Number.isFinite(neVal) ? neVal : 0
    // total = just use in template: kpiPubToday + kpiNeToday
}


function defaultStartISO() { return new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 19) + 'Z' }
function defaultEndISO() { return new Date().toISOString().slice(0, 19) + 'Z' }

function startOfYesterdayISO() {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    d.setHours(0, 0, 0, 0)
    return toIsoWithSeconds(toLocalISO(d))
}


function ymd(dateLike) {
    const d = new Date(dateLike)
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}
async function fetchSeries(tag, startISO, endISO) {
    try {
        const url = `http://localhost:8080/meters/${encodeURIComponent(tag)}/series?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}&fill_missing=false`
        const r = await fetch(url, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const data = await r.json()
        const arr = Array.isArray(data?.data) ? data.data : []
        return arr.map(row => ({ ts: row.ts, value: Number(row.consumption ?? 0) }))
    } catch { return [] }
}
function unionSortedTimestamps(seriesMap) {
    const set = new Set()
    for (const arr of Object.values(seriesMap)) for (const row of arr) if (row?.ts) set.add(row.ts)
    return Array.from(set).sort((a, b) => new Date(a) - new Date(b))
}
function valAt(arr, ts) {
    if (!Array.isArray(arr) || !arr.length) return 0
    const found = arr.find(x => x.ts === ts)
    const v = Number(found?.value ?? 0)
    return Number.isFinite(v) ? v : 0
}

async function loadWaterSeriesForSelection() {
    seriesLoading.value = true
    seriesError.value = null
    try {
        const { start, end } = waterBoundsForSelection()
        if (!start || !end) {
            chartA.value = { labels: [], datasets: [] }
            return
        }

        // Day -> hourly, others -> daily
        granularity.value = (waterRangeMode.value === 'day') ? 'hourly' : 'daily'

        const startISO = toIsoWithSeconds(toLocalISO(start))
        const endISO = toIsoWithSeconds(toLocalISO(end))

        const tags = selectionMeterTags.value || []
        if (!tags.length) {
            seriesError.value = 'No meter tags loaded. Check METERS_URL or flattening.'
            chartA.value = { labels: [], datasets: [] }
            return
        }

        // fetch all series within range
        const seriesMap = {}
        for (const t of tags) {
            seriesMap[t] = await fetchSeries(t, startISO, endISO)
        }

        // union timeline
        const timeline = unionSortedTimestamps(seriesMap)

        // split PUB/NEWater per point
        const pubHourly = []
        const neHourly = []
        for (const ts of timeline) {
            let pub = 0, ne = 0
            for (const tag of tags) {
                const val = valAt(seriesMap[tag], ts)
                if ((meterTagToSource.value[tag] || 'PUB') === 'NEWater') ne += val
                else pub += val
            }
            pubHourly.push(pub)
            neHourly.push(ne)
        }

        if (granularity.value === 'daily') {
            // aggregate to daily
            const bucket = new Map()
            for (let i = 0; i < timeline.length; i++) {
                const day = ymd(timeline[i])
                const cur = bucket.get(day) || { pub: 0, ne: 0 }
                cur.pub += Number(pubHourly[i] || 0)
                cur.ne += Number(neHourly[i] || 0)
                bucket.set(day, cur)
            }
            const days = Array.from(bucket.keys()).sort((a, b) => new Date(a) - new Date(b))
            const pubDaily = days.map(d => bucket.get(d).pub)
            const neDaily = days.map(d => bucket.get(d).ne)

            chartA.value = {
                labels: days,
                datasets: [
                    { label: 'PUB', data: pubDaily },
                    { label: 'NEWater', data: neDaily },
                ],
            }

            // OK update Water KPIs from chart (use selected day if present, else last day)
            syncWaterKpisFromChart(waterRangeMode.value === 'day' ? waterSelectedDay.value : null)
        } else {
            // hourly
            chartA.value = {
                labels: timeline,
                datasets: [
                    { label: 'PUB', data: pubHourly },
                    { label: 'NEWater', data: neHourly },
                ],
            }

            // OK update Water KPIs from chart (latest)
            syncWaterKpisFromChart()
        }

        // Optional: quick visibility while debugging
        console.info('[Water] tags:', tags.length, 'timeline points:', timeline.length)
        console.info('[Water] chart datasets sizes:',
            chartA.value.datasets?.map(d => d?.data?.length))
    } catch (e) {
        seriesError.value = e?.message ?? 'Load failed'
        chartA.value = { labels: [], datasets: [] }
    } finally {
        seriesLoading.value = false
    }
}


watch(
    [waterRangeMode, waterSelectedDay, waterSelectedWeek, waterSelectedMonth, waterSelectedYear],
    () => { if (!seriesLoading.value) loadWaterSeriesForSelection() },
    { immediate: true }
)

// If user toggles granularity manually (you can keep/remove this if you prefer strict auto):
watch(granularity, () => { if (!seriesLoading.value) loadWaterSeriesForSelection(); });

/* Water chart options */
const dtfHourly = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
const dtfDaily = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' })
const dtfFull = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
function fmtTick(iso, gran) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return gran === 'daily' ? dtfDaily.format(d) : dtfHourly.format(d)
}

function fmtTooltipTitle(iso) {
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '' : dtfFull.format(d)
}

const chartOptions = computed(() => {
    const ds = (chartA.value?.datasets?.[0]?.data ?? [])
    const finite = ds.filter(n => typeof n === 'number' && Number.isFinite(n))
    const min = finite.length ? Math.min(...finite) : 0
    const max = finite.length ? Math.max(...finite) : 0
    const isFlat = min === max
    const pad = isFlat ? (max === 0 ? 1 : Math.abs(max) * 0.1) : 0
    return {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
        scales: {
            x: { ticks: { color: '#cbd5e1', padding: 10, callback: (val, idx) => fmtTick(chartA.value?.labels?.[idx], granularity.value) }, grid: { color: 'rgba(255,255,255,.15)' } },
            y: { beginAtZero: true, suggestedMin: isFlat ? min : undefined, suggestedMax: isFlat ? max + pad : undefined, ticks: { color: '#cbd5e1', padding: 6 }, grid: { color: 'rgba(255,255,255,.15)' } }
        },
        plugins: {
            legend: { position: 'top', labels: { color: '#cbd5e1' } },
            tooltip: { mode: 'index', intersect: false, callbacks: { title: (items) => fmtTooltipTitle(chartA.value?.labels?.[items?.[0]?.dataIndex]) } }
        }
    }
})
const chartAChartData = computed(() => ({
    labels: chartA.value.labels,
    datasets: (chartA.value.datasets || []).map(ds => ({ ...ds, borderWidth: 2, tension: .35, pointRadius: 0, fill: false }))
}))

/* Site meta + WUI */
const META_URL = 'http://localhost:8080/meta/site'
const PUT_POP_URL = 'http://localhost:8080/meta/site/population'
const PUT_AREA_URL = 'http://localhost:8080/meta/site/area'
const site = reactive({ population: 0, area: 0, units: { area: 'km2' }, populationDraft: 0, areaDraft: 0, saving: false, error: null })
async function loadSiteMeta() {
    try {
        const r = await fetch(META_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        site.population = Number(b?.population || 0)
        site.area = Number(b?.area || 0)
        site.units = b?.units || { area: 'km2' }
        site.populationDraft = site.population
        site.areaDraft = site.area
    } catch (e) { site.error = e?.message ?? 'Failed to load site meta' }
}
async function savePopulation() {
    site.saving = true; site.error = null
    try {
        const r = await fetch(PUT_POP_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ population: site.populationDraft }) })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        site.population = Number(b?.population || site.populationDraft)
    } catch (e) { site.error = e?.message ?? 'Save failed' } finally { site.saving = false }
}
async function saveArea() {
    site.saving = true; site.error = null
    try {
        const r = await fetch(PUT_AREA_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ area: site.areaDraft }) })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        site.area = Number(b?.area || site.areaDraft)
    } catch (e) { site.error = e?.message ?? 'Save failed' } finally { site.saving = false }
}
const wuiMode = ref('population') // 'population' | 'area'
const kpiWui = computed(() => {
    const total = kpiCampusToday.value
    const denom = wuiMode.value === 'population' ? (Number(site.population) || 0) : (Number(site.area) || 0)
    if (!Number.isFinite(denom) || denom <= 0) return 0
    return total / denom
})

/* =========================================================
   ENERGY - hierarchy, windows, trend + Airside KPI
========================================================= */
const HIERARCHY_URL = 'http://127.0.0.1:8081/meta/hierarchy'
const HOUR_URL = 'http://127.0.0.1:8081/power/block-level/hour'
const DAY_URL = 'http://127.0.0.1:8081/power/block-level/day'
const DEV_HOUR_URL = 'http://127.0.0.1:8081/power/device/hour'
const DEV_DAY_URL = 'http://127.0.0.1:8081/power/device/day'
const METER_HOUR_URL = 'http://127.0.0.1:8081/power/meter/hour?limit=10000&offset=0'
const TREND_BASE_URL = 'http://127.0.0.1:8081/power/block-level/trend'

// NEW: aggregated by block (A, BD, C, ...)
const BLOCKS_TREND_URL = 'http://127.0.0.1:8081/power/blocks/trend'


const hierLoading = ref(false), hierError = ref(null)
const hierarchy = ref({ by_block_level: {}, by_panel: {} })
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

/* ======================= ENERGY KPIs - MTD & DTD ======================= */
const energyKpiLoading = ref(false);
const energyKpiError = ref(null);
const kpiEnergyMonthToDate = ref(0);
const kpiEnergyDayToDate = ref(0);

function startOfMonth() { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }

// Sum kWh across all block+level pairs between [start, end)
async function sumEnergyKwhBetween(startDate, endDate) {
    const startIso = toIsoWithSeconds(toLocalISO(startDate));
    const endIso = toIsoWithSeconds(toLocalISO(endDate));

    const params = new URLSearchParams({ start: startIso, end: endIso });

    const resp = await fetch(`${BLOCKS_TREND_URL}?${params.toString()}`, {
        cache: 'no-cache',
    });

    const body = await resp.json();
    const series = Array.isArray(body?.series) ? body.series : [];

    let total = 0;
    for (const s of series) {
        for (const pt of (s.points || [])) {
            total += Number(pt.kwh || 0);
        }
    }

    return total;
}

// Simple average kW proxies (kWh / hours elapsed)
const kpiEnergyMonthAvgKw = computed(() => {
    const start = startOfMonth().getTime();
    const hours = Math.max((Date.now() - start) / 3600000, 0.001);
    return kpiEnergyMonthToDate.value / hours;
});
const kpiEnergyDayAvgKw = computed(() => {
    const start = startOfToday().getTime();
    const hours = Math.max((Date.now() - start) / 3600000, 0.001);
    return kpiEnergyDayToDate.value / hours;
});

// Recompute when hierarchy arrives/changes
watch(() => hierarchy.value, () => { loadEnergyKpis(); }, { deep: true });

const powerLoading = ref(false), powerError = ref(null)
const hourPayload = ref({ window: 'hour', ts: null, rows: [], total_kwh: 0, total_kw: 0 })
const dayPayload = ref({ window: 'day', date: null, rows: [], total_kwh: 0, total_kw: 0 })
const devHourPayload = ref({ window: 'hour', ts: null, rows: [], total_kwh: 0, total_kw: 0 })
const devDayPayload = ref({ window: 'day', date: null, rows: [], total_kwh: 0, total_kw: 0 })
const meterHourPayload = ref({ window: 'hour', ts: null, rows: [] })
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
function sum(arr) { return arr.reduce((a, b) => a + Number(b || 0), 0) }
function aggregateFromRows(rows) { if (!Array.isArray(rows) || !rows.length) return { total_kwh: 0, total_kw: 0, rows: [] }; return { total_kwh: sum(rows.map(r => r.kwh)), total_kw: sum(rows.map(r => r.kw)), rows: [...rows] } }
const selectedHour = computed(() => aggregateFromRows(hourPayload.value.rows))

/* ===== Airside efficiency (robust) ===== */
/* ===== Airside efficiency (from /day) ===== */
const AIR_BASE = 'http://127.0.0.1:8081/efficiency';
const AIR_HOUR_URL = `${AIR_BASE}/day`;


const airLoading = ref(false), airError = ref(null);
const airNow = ref({ ts: null, kw_per_rt: null });

function pad(n) { return String(n).padStart(2, '0'); }
function hourFloor(d) { const x = new Date(d); x.setMinutes(0, 0, 0); return x; }
function fmtSGT(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00:00`; }
function fmtSGTOffset(d) { return `${fmtSGT(d)}+08:00`; }
function fmtUTC(d) {
    const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), 0, 0));
    return u.toISOString().replace('.000Z', 'Z');
}
function getLatestHourTs() {
    const d = new Date(); d.setMinutes(0, 0, 0)
    return d.toLocaleString('sv-SE', { timeZone: 'Asia/Singapore', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(' ', 'T')
}

async function loadAirLatest() {
    airLoading.value = true;
    airError.value = null;

    const now = new Date();
    const cur = hourFloor(now);
    const prev = hourFloor(new Date(cur.getTime() - 3600e3));

    const candidates = [
        null,
        fmtSGT(cur), fmtSGT(prev),
        fmtSGTOffset(cur), fmtSGTOffset(prev),
        fmtUTC(cur), fmtUTC(prev),
    ];

    function extractKwRt(b) {
        const p = Number(b?.kw_per_rt);
        if (Number.isFinite(p) && p > 0) return p;
        const kw = Number(b?.airside_kw);
        const rt = Number(b?.rt);
        if (Number.isFinite(kw) && Number.isFinite(rt) && rt > 0) {
            const d = kw / rt;
            return Number.isFinite(d) && d > 0 ? d : null;
        }
        return null;
    }

    try {
        let found = null;

        for (const ts of candidates) {
            const url = ts ? `${AIR_HOUR_URL}?ts=${encodeURIComponent(ts)}` : AIR_HOUR_URL;
            const r = await fetch(url, { cache: 'no-cache' });
            if (!r.ok) continue;

            const b = await r.json();
            let val = extractKwRt(b);

            if ((val == null || val === 0) && b && b.airside_kw != null && b.rt != null) {
                const kw = Number(b.airside_kw), rt = Number(b.rt);
                if (Number.isFinite(kw) && Number.isFinite(rt) && rt > 0) val = kw / rt;
            }

            if (val != null && Number.isFinite(val) && val > 0) {
                found = { ts: b?.ts ?? ts ?? null, kw_per_rt: val };
                break;
            }
        }

        if (!found) {
            // No usable data - treat as 0 instead of showing an error
            airNow.value = { ts: null, kw_per_rt: 0 };
            return;
        }

        airNow.value = found;
    } catch (e) {
        airError.value = e?.message ?? 'Failed to load airside efficiency';
        // Still show 0 in the KPI when there's an error
        airNow.value = { ts: null, kw_per_rt: 0 };
    } finally {
        airLoading.value = false;
    }
}

/* =========================================================
   CHILLER - status/efficiency cards + TSE (kW/RT) combo
========================================================= */
const CHILLER_POINTS_URL = 'http://localhost:8082/points/latest?limit=500&offset=0'
const chillerLoading = ref(false), chillerError = ref(null), chillerPoints = ref([])
function normalizeName(s) { return String(s || '').trim().toLowerCase().replace(/[\s-]+/g, '_') }
function getPointByName(name) {
    if (!Array.isArray(chillerPoints.value)) return null
    const want = normalizeName(name)
    return chillerPoints.value.find(p => normalizeName(p?.object_name) === want) || null
}
// ---- NEW: Total efficiency points (4 cards) ----
const TOTAL_EFF_NAMES = [
    'Total CH Efficiency',
    'Total CT Efficiency',
    'Total CHWP Efficiency',
    'Total CWP Efficiency',
]

// pick up the four points from the same chillerPoints list
const totalEfficiencyCards = computed(() => {
    return TOTAL_EFF_NAMES.map((nm) => {
        const pt =
            getPointByName(nm) ||
            getPointByName(nm.replace(/\s+/g, '_')) ||     // Total_CH_Efficiency
            getPointByName(nm.replace(/\s+/g, '-'))        // Total-CH-Efficiency

        const v = Number(pt?.value)
        return {
            key: nm,
            name: nm,
            value: Number.isFinite(v) ? v : null,
            units: pt?.units || null,
            ts: pt?.ts || null,
        }
    })
})

// ---- NEW: Total System Efficiency = sum of the 4 totals ----
const totalSystemEfficiencySum = computed(() => {
    const vals = totalEfficiencyCards.value.map(c => Number(c.value))
    // if all missing, show -
    if (!vals.some(v => Number.isFinite(v))) return null
    return vals.reduce((a, v) => a + (Number.isFinite(v) ? v : 0), 0)
})

// Units + timestamp for the total card (best-effort)
const totalSystemUnits = computed(() => {
    // if all 4 share units, use it; otherwise fall back to first non-null
    const units = totalEfficiencyCards.value.map(c => c.units).filter(Boolean)
    if (!units.length) return null
    return units.every(u => u === units[0]) ? units[0] : units[0]
})

const totalSystemTs = computed(() => {
    // show the most recent timestamp among the 4
    const tsList = totalEfficiencyCards.value.map(c => c.ts).filter(Boolean)
    if (!tsList.length) return null
    return tsList.reduce((latest, cur) =>
        new Date(cur).getTime() > new Date(latest).getTime() ? cur : latest
    )
})

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
    } catch (e) { chillerError.value = e?.message ?? 'Failed to load chiller points'; chillerPoints.value = [] }
    finally { chillerLoading.value = false }
}
const chillerCards = computed(() => {
    const out = []
    for (let i = 1; i <= 5; i++) {
        const eff = getPointByName(`CH${i}_Efficiency`) || getPointByName(`CH${i}_Efficienc`)
        const st = findStatusPoint(i)
        const online = st?.value === 1 ? true : st?.value === 0 ? false : null
        out.push({ id: i, effName: eff?.object_name || null, effValue: Number(eff?.value ?? NaN), effUnits: eff?.units || null, statusName: st?.object_name || null, online, ts: eff?.ts || st?.ts || null })
    }
    return out
})

/* TSE parts: point + hour API combined */
const EFF_HOUR_URL = 'http://127.0.0.1:8081/efficiency/hour'
const tseKwPerRt = ref(0), tseKwLoading = ref(false), tseKwError = ref(null)
async function loadTseKwPerRt() {
    tseKwLoading.value = true; tseKwError.value = null
    try {
        const params = new URLSearchParams({ ts: getLatestHourTs() })
        const r = await fetch(`${EFF_HOUR_URL}?${params.toString()}`, { cache: 'no-cache' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = await r.json()
        const v = Number(b?.kw_per_rt)
        tseKwPerRt.value = Number.isFinite(v) ? v : 0
    } catch (e) { tseKwError.value = e?.message ?? 'Load failed'; tseKwPerRt.value = 0 }
    finally { tseKwLoading.value = false }
}
const totalSystemEfficiencyPt = computed(() =>
    getPointByName('Total System Efficiency') ||
    getPointByName('Total_System_Efficiency') ||
    getPointByName('Total-System-Efficiency') ||
    getPointByName('TSE') ||
    getPointByName('Total System Efficiency (kW/RT)')
)
const tsePointValue = computed(() => {
    const v = Number(totalSystemEfficiencyPt.value?.value)
    return Number.isFinite(v) ? v : null
})
const tseTs = computed(() => totalSystemEfficiencyPt.value?.ts || null)

const airKwRt = computed(() => {
    const v = Number(airNow.value?.kw_per_rt);
    return Number.isFinite(v) ? v : null;
});

const waterKwRt = computed(() => {
    const v = Number(tsePointValue.value)
    return Number.isFinite(v) ? v : null
})

airKwRt
const tseValue = computed(() => {
    if (airKwRt.value == null || waterKwRt.value == null) return null
    return airKwRt.value + waterKwRt.value
})

const tseLoading = computed(() => chillerLoading.value || tseKwPerRt.value === null)
const tseError = computed(() => chillerError.value || tseKwError.value)

/* =========================================================
   WASTE - last 7 trend + range sheets + WDI
========================================================= */
const WASTE_BASE = 'http://localhost:8083'
const WASTE_TREND = `${WASTE_BASE}/stats/trend`
const WASTE_MONTHLY = `${WASTE_BASE}/stats/monthly`
const WASTE_SUMMARY = `${WASTE_BASE}/stats/summary`
// ===== WASTE - use /entries directly ==================================
// ======================= WASTE (NEW API: /waste) =======================
const WASTE_ENTRIES_URL = 'http://localhost:8083/waste'

const wasteLoading = ref(false)
const wasteError = ref(null)
const wasteEntries = ref([])

// KPI object used by your template (general/recycled/food/wdi/operating_days/label)
const currentMonthSummary = reactive({
    label: '',
    general: 0,
    recycled: 0,
    food: 0,
    wdi: null,
    operating_days: 0,
})

const BAI_CONFIG_URL = '/water_bai.json'
const BAI_STORAGE_KEY = 'water-management-bai'
const BAI_CHANGE_EVENT = 'water-management-bai-change'
const DEFAULT_BAI_VALUE = 24753
const BAI = ref(DEFAULT_BAI_VALUE)
const baiDraftValue = ref(DEFAULT_BAI_VALUE)
const isBaiEditOpen = ref(false)

function normalizeBaiValue(value) {
    const bai = Number(value)
    return Number.isFinite(bai) && bai > 0 ? bai : DEFAULT_BAI_VALUE
}

function syncBaiValueFromStorage(event) {
    if (event.key !== BAI_STORAGE_KEY || !event.newValue) return
    try {
        const parsed = JSON.parse(event.newValue)
        applyBaiValue(parsed?.bai ?? parsed)
    } catch (e) {
        console.warn('[UnifiedDashboard] Failed to sync BAI value', e)
    }
}

function syncBaiValueFromApp(event) {
    applyBaiValue(event?.detail?.bai)
}

function applyBaiValue(value) {
    BAI.value = normalizeBaiValue(value)
    if (!isBaiEditOpen.value) baiDraftValue.value = BAI.value
}

function persistBaiValue(value) {
    const next = normalizeBaiValue(value)
    localStorage.setItem(BAI_STORAGE_KEY, JSON.stringify({ bai: next }))
    window.dispatchEvent(new CustomEvent(BAI_CHANGE_EVENT, { detail: { bai: next } }))
}

function openBaiEditor() {
    baiDraftValue.value = BAI.value
    isBaiEditOpen.value = true
}

function saveSharedBaiValue(value) {
    const next = normalizeBaiValue(value)
    BAI.value = next
    baiDraftValue.value = next
    try {
        persistBaiValue(next)
    } catch (e) {
        console.warn('[UnifiedDashboard] Failed to save local BAI value', e)
    }
}

function saveBaiValue() {
    saveSharedBaiValue(baiDraftValue.value)
    isBaiEditOpen.value = false
}

async function loadBaiValue() {
    try {
        const stored = localStorage.getItem(BAI_STORAGE_KEY)
        if (stored) {
            const parsed = JSON.parse(stored)
            BAI.value = normalizeBaiValue(parsed?.bai ?? parsed)
            baiDraftValue.value = BAI.value
            return
        }
    } catch (e) {
        console.warn('[UnifiedDashboard] Failed to read local BAI value', e)
    }

    try {
        const res = await fetch(BAI_CONFIG_URL, { cache: 'no-cache' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const config = await res.json()
        BAI.value = normalizeBaiValue(config?.bai)
        baiDraftValue.value = BAI.value
    } catch (e) {
        console.warn('[UnifiedDashboard] Failed to load BAI config, using default', e)
        BAI.value = DEFAULT_BAI_VALUE
        baiDraftValue.value = BAI.value
    }
}

onMounted(loadBaiValue)
onMounted(() => window.addEventListener('storage', syncBaiValueFromStorage))
onMounted(() => window.addEventListener(BAI_CHANGE_EVENT, syncBaiValueFromApp))
onBeforeUnmount(() => window.removeEventListener('storage', syncBaiValueFromStorage))
onBeforeUnmount(() => window.removeEventListener(BAI_CHANGE_EVENT, syncBaiValueFromApp))

const averageSummary = computed(() => {
    const rows = Array.isArray(wasteEntries.value) ? wasteEntries.value : []
    if (!rows.length) {
        return {
            label: 'Average',
            general: 0,
            recycled: 0,
            food: 0,
            wdi: 0,
            operating_days: 0,
            bai: 0,
        }
    }

    // sort by year_month so we can show a nice range label
    const sorted = [...rows].sort((a, b) => String(a.year_month).localeCompare(String(b.year_month)))
    const from = sorted[0]?.year_month
    const to = sorted.at(-1)?.year_month
    const label = from && to ? `Avg (${from} -> ${to})` : 'Average'

    const n = rows.length
    const sum = (key) => rows.reduce((acc, r) => acc + Number(r?.[key] ?? 0), 0)

    return {
        label,
        general: sum('general_kg') / n,
        recycled: sum('recycled_kg') / n,
        food: sum('food_kg') / n,
        wdi: sum('wdi') / n,
        operating_days: sum('working_days') / n,
        bai: BAI.value,
    }
})


// WDI per month chart (used by LineChartCard in fullscreen modal)
const wdiChartData = ref({ labels: [], datasets: [] })
const wdiChartOptions = ref({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: '#ffffff', // legend text
            },
        },
        tooltip: {
            callbacks: {
                label: (ctx) => `WDI: ${Number(ctx.parsed?.y ?? 0).toFixed(3)}`,
            },
        },
    },
    scales: {
        x: {
            ticks: {
                color: '#ffffff',        // X-axis labels
            },
            grid: {
                color: 'rgba(255,255,255,0.08)', // vertical grid lines
            },
            border: {
                color: 'rgba(255,255,255,0.3)',  // X-axis line
            },
        },
        y: {
            ticks: {
                color: '#ffffff',        // Y-axis labels
                callback: (v) => Number(v).toFixed(2),
            },
            grid: {
                color: 'rgba(255,255,255,0.08)', // horizontal grid lines
            },
            border: {
                color: 'rgba(255,255,255,0.3)',  // Y-axis line
            },
        },
    },
})

function getLatestWasteEntry(arr) {
    if (!Array.isArray(arr) || !arr.length) return null
    // Use entry_date (YYYY-MM-DD) to find latest
    return [...arr].sort((a, b) => String(a.entry_date).localeCompare(String(b.entry_date))).at(-1) || null
}

function monthLabelFromYearMonth(ym) {
    // ym = "2025-10" -> "Oct 2025"
    if (!ym || !/^\d{4}-\d{2}$/.test(String(ym))) return String(ym ?? '')
    const [y, m] = String(ym).split('-').map(Number)
    const d = new Date(y, m - 1, 1)
    return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(d)
}

function buildWdiChart(entries) {
    const rows = (Array.isArray(entries) ? entries : [])
        .filter(r => r && r.year_month)
        .sort((a, b) => String(a.year_month).localeCompare(String(b.year_month)))

    const labels = rows.map(r => monthLabelFromYearMonth(r.year_month))
    const data = rows.map(r => Number(r.wdi ?? 0))

    wdiChartData.value = {
        labels,
        datasets: [
            {
                label: 'WDI',
                data,
                tension: 0.35,
                pointRadius: 3,
            },
        ],
    }
}

async function loadWasteFromNewApi() {
    wasteLoading.value = true
    wasteError.value = null

    try {
        const r = await fetch(WASTE_ENTRIES_URL, { cache: 'no-cache' })
        if (!r.ok) throw new Error(`Waste HTTP ${r.status}`)
        const arr = await r.json()

        wasteEntries.value = Array.isArray(arr) ? arr : []

        const latest = getLatestWasteEntry(wasteEntries.value)
        if (!latest) {
            Object.assign(currentMonthSummary, {
                label: 'No data',
                general: 0,
                recycled: 0,
                food: 0,
                wdi: null,
                operating_days: 0,
            })
            wdiChartData.value = { labels: [], datasets: [] }
            return
        }

        Object.assign(currentMonthSummary, {
            label: monthLabelFromYearMonth(latest.year_month),
            general: Number(latest.general_kg || 0),
            recycled: Number(latest.recycled_kg || 0),
            food: Number(latest.food_kg || 0),
            wdi: Number.isFinite(Number(latest.wdi)) ? Number(latest.wdi) : null,
            operating_days: Number(latest.working_days || 0), // map working_days -> operating_days
        })

        buildWdiChart(wasteEntries.value)
    } catch (e) {
        wasteError.value = e?.message ?? 'Failed to load waste data'
        wasteEntries.value = []
        wdiChartData.value = { labels: [], datasets: [] }
    } finally {
        wasteLoading.value = false
    }
}

// call it on mount (and optionally on an interval if you want)
onMounted(() => {
    loadWasteFromNewApi()
})


// 5. Fullscreen handler (you already have fullscreenChart + closeFullscreen)
function openWasteChart() {
    fullscreenChart.value = 'waste'
}

const wasteTrendRows = ref([])
const wasteMonthlyRows = ref([])
const wasteSummary = reactive({ start: null, end: null, days: 0, entries: 0, total_general: 0, total_recycled: 0, total_waste: 0, avg_per_day_total: 0, diversion_rate: 0 })

const wasteLoading7 = ref(false), wasteError7 = ref(null)
const wasteTrendRows7 = ref([])
const wasteSummary7 = reactive({ start: null, end: null, days: 0, entries: 0, total_general: 0, total_recycled: 0, total_waste: 0, avg_per_day_total: 0, diversion_rate: 0 })
function isoMinusDays(isoYYYYMMDD, days) {
    const [y, m, d] = isoYYYYMMDD.split('-').map(Number)
    const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() - days)
    const yy = dt.getFullYear(), mm = String(dt.getMonth() + 1).padStart(2, '0'), dd = String(dt.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
}
const last7FromISO = computed(() => isoMinusDays(todayLocalISODate(), 6))
const last7ToISO = computed(() => todayLocalISODate())
const last7DateLabel = computed(() => `${yyyy_mm_dd_to_ddmmyyyy(last7FromISO.value)} - ${yyyy_mm_dd_to_ddmmyyyy(last7ToISO.value)}`)

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
const wasteTrendAggRows7 = computed(() => aggregateByKey(wasteTrendRows7.value, 'date', ['total_waste_ma7', 'diversion_rate_ma7']))
const wasteTrendChartData7 = computed(() => ({
    labels: wasteTrendAggRows7.value.map(r => r.date),
    datasets: [
        { label: 'Total Waste MA7 (kg)', data: wasteTrendAggRows7.value.map(r => r.total_waste_ma7 ?? null), borderWidth: 2, tension: 0.35, cubicInterpolationMode: 'monotone', pointRadius: 2, spanGaps: true, fill: false },
        { label: 'Diversion Rate MA7 (%)', data: wasteTrendAggRows7.value.map(r => r.diversion_rate_ma7 != null ? (r.diversion_rate_ma7 * 100) : null), borderWidth: 2, tension: 0.35, cubicInterpolationMode: 'monotone', pointRadius: 2, spanGaps: true, fill: false }
    ]
}))
const wasteTrendChartOpts = {
    responsive: true, maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
    scales: {
        x: { type: 'category', ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,.15)' } },
        y: { beginAtZero: true, ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,.15)' } }
    },
    plugins: { legend: { position: 'top', labels: { color: '#cbd5e1' } }, tooltip: { mode: 'index', intersect: false } }
}

async function loadWasteLast7() {
    wasteLoading7.value = true; wasteError7.value = null
    try {
        const p1 = new URLSearchParams({ start: yyyy_mm_dd_to_ddmmyyyy(last7FromISO.value), end: yyyy_mm_dd_to_ddmmyyyy(last7ToISO.value), window: '7' })
        const r1 = await fetch(`${WASTE_TREND}?${p1.toString()}`, { cache: 'no-cache' })
        if (!r1.ok) throw new Error(`Trend7 HTTP ${r1.status}`)
        wasteTrendRows7.value = await r1.json()

        const p2 = new URLSearchParams({ start: yyyy_mm_dd_to_ddmmyyyy(last7FromISO.value), end: yyyy_mm_dd_to_ddmmyyyy(last7ToISO.value) })
        const r2 = await fetch(`${WASTE_SUMMARY}?${p2.toString()}`, { cache: 'no-cache' })
        if (!r2.ok) throw new Error(`Summary7 HTTP ${r2.status}`)
        Object.assign(wasteSummary7, await r2.json())
    } catch (e) {
        wasteError7.value = e?.message ?? 'Failed to load last-7 waste data'
        wasteTrendRows7.value = []
        Object.assign(wasteSummary7, { days: 0, entries: 0, total_waste: 0, avg_per_day_total: 0, diversion_rate: 0 })
    } finally { wasteLoading7.value = false }
}

async function loadWasteTrend() {
    const params = new URLSearchParams()
    if (wasteFromISO.value) params.set('start', yyyy_mm_dd_to_ddmmyyyy(wasteFromISO.value))
    if (wasteToISO.value) params.set('end', yyyy_mm_dd_to_ddmmyyyy(wasteToISO.value))
    params.set('window', '7')
    const r = await fetch(`${WASTE_TREND}?${params.toString()}`, { cache: 'no-cache' })
    if (!r.ok) {
        const t = await r.text().catch(() => '')
        throw new Error(`Trend HTTP ${r.status}: ${t || 'failed'}`)
    }
    wasteTrendRows.value = await r.json()
}
async function loadWasteMonthly() {
    const params = new URLSearchParams()
    if (wasteFromISO.value) params.set('start', yyyy_mm_dd_to_ddmmyyyy(wasteFromISO.value))
    if (wasteToISO.value) params.set('end', yyyy_mm_dd_to_ddmmyyyy(wasteToISO.value))
    const r = await fetch(`${WASTE_MONTHLY}?${params.toString()}`, { cache: 'no-cache' })
    if (!r.ok) throw new Error(`Monthly HTTP ${r.status}`)
    wasteMonthlyRows.value = await r.json()
}
async function loadWasteSummary() {
    const params = new URLSearchParams()
    if (wasteFromISO.value) params.set('start', yyyy_mm_dd_to_ddmmyyyy(wasteFromISO.value))
    if (wasteToISO.value) params.set('end', yyyy_mm_dd_to_ddmmyyyy(wasteToISO.value))
    const r = await fetch(`${WASTE_SUMMARY}?${params.toString()}`, { cache: 'no-cache' })
    if (!r.ok) throw new Error(`Summary HTTP ${r.status}`)
    Object.assign(wasteSummary, await r.json() || {})
}
async function loadWasteAll() {
    if (!isWasteRangeValid.value) return
    wasteLoading.value = true; wasteError.value = null
    try {
        await Promise.all([loadWasteTrend(), loadWasteMonthly(), loadWasteSummary()])
    } catch (e) {
        wasteError.value = e?.message ?? 'Failed to load waste data'
        wasteTrendRows.value = []; wasteMonthlyRows.value = []
    } finally { wasteLoading.value = false }
}


/* ===================== Kickoff & timed refresh ===================== */
let hourlyTimer = null
onMounted(async () => {
    // WATER
    await Promise.all([loadBlocks(), loadMeters()])
    await loadBlockSummary()
    await loadWaterSeriesForSelection()
    await loadSiteMeta()

    // ENERGY
    await loadEnergyKpis();
    await loadHierarchy()
    await loadPowerWindows()

    // Trend default = today 00:00 -> now
    initRangeControlsToNow('day');
    await applyRangeFromControls(); // this already calls loadTrendForSelection()

    // Airside + Chiller + TSE
    await Promise.all([loadAirLatest(), loadChillerPoints()])
    await loadTseKwPerRt()
    // hourly soft refresh
    scheduleHourlyReload()
})

onBeforeUnmount(() => {
    if (hourlyTimer) clearTimeout(hourlyTimer)
    if (energyAutoApplyTimer) clearTimeout(energyAutoApplyTimer)
})
function scheduleHourlyReload() {
    const now = new Date(), next = new Date(now)
    next.setHours(now.getHours() + 1, 1, 0, 0)
    const msUntilNext = next.getTime() - now.getTime()
    hourlyTimer = setTimeout(async () => {
        trendStartLocal.value = toLocalISO(startOfToday())
        trendEndLocal.value = toLocalISO(new Date())
        await Promise.all([
            loadHierarchy(), loadPowerWindows(), loadAirLatest(), loadChillerPoints(), loadTseKwPerRt(),
            loadWasteAll(), loadWasteLast7(), loadWdi(), loadEnergyKpis(),
        ])


        scheduleHourlyReload()
    }, msUntilNext)
}

/* Period segmented control */
const periodMode = ref('overall') // or 'business' if you prefer that as default

async function setPeriodMode(mode) {
    if (periodMode.value === mode) return   // nothing to do

    periodMode.value = mode
    resetToTimeTrend()                      // exit Compare view if active

    // Re-run the trend using the current day/week/month/year selection
    await applyTrend()
}

// Trend inputs
const trendStartLocal = ref('');
const trendEndLocal = ref('');
const canApplyTrend = computed(() => {
    const s = trendStartLocal.value, e = trendEndLocal.value;
    return !!(s && e && new Date(s) < new Date(e));
});

const trendLoading = ref(false), trendError = ref(null);
const trendSeries = ref({ labels: [], data: [], type: 'line' });
const energyChartType = ref('line');

// Fetch per block/level
async function fetchTrendForOne(block, level, startIso, endIso) {
    const params = new URLSearchParams({ block, level, start: startIso, end: endIso });
    const url = `${TREND_BASE_URL}?${params.toString()}`;
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${block}.${level} HTTP ${r.status}`);
    return r.json();
}
function allBlockLevelPairs() {
    const out = [], bbl = hierarchy.value.by_block_level || {};
    for (const blk of Object.keys(bbl)) for (const lvl of Object.keys(bbl[blk] || {})) out.push({ block: blk, level: lvl });
    return out;
}

// Use /power/blocks/trend and always show OVERALL (sum of blocks A,B,C,D,E,F,G,H,J,K)
async function loadTrendForSelection() {
    const startIso = toIsoWithSeconds(trendStartLocal.value);
    const endIso = toIsoWithSeconds(trendEndLocal.value);
    if (!startIso || !endIso) return;

    trendLoading.value = true;
    trendError.value = null;

    try {
        const params = new URLSearchParams({ start: startIso, end: endIso });

        const resp = await fetch(`${BLOCKS_TREND_URL}?${params.toString()}`, {
            cache: 'no-cache',
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);

        const body = await resp.json();
        const series = Array.isArray(body?.series) ? body.series : [];

        // Only count these blocks
        const allowedBlocks = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K']);

        // ts -> total kWh across allowed blocks
        const bucket = new Map();

        for (const s of series) {
            const key = String(s.key || '').toUpperCase();
            if (!allowedBlocks.has(key)) continue;  // skip anything else

            for (const pt of (s.points || [])) {
                const ts = String(pt.ts);
                const val = Number(pt.kwh || 0);
                if (!Number.isFinite(val)) continue;
                bucket.set(ts, (bucket.get(ts) || 0) + val);
            }
        }

        // All timestamps sorted
        const tsAll = Array.from(bucket.keys())
            .sort((a, b) => new Date(a) - new Date(b));

        const tsFiltered = trendGran.value === 'H'
            ? tsAll.filter(ts => periodAllow(ts, periodMode.value))
            : tsAll;

        if (trendGran.value === 'H') {
            trendSeries.value = {
                labels: tsFiltered,
                data: tsFiltered.map(ts => bucket.get(ts) || 0),
                type: 'line',
            };
        } else if (trendGran.value === 'D') {
            const agg = new Map();
            for (const ts of tsFiltered) {
                const k = keyFor(ts, 'day');
                agg.set(k, (agg.get(k) || 0) + (bucket.get(ts) || 0));
            }
            const days = listDatesInclusive(trendDayFrom.value, trendDayTo.value);
            trendSeries.value = {
                labels: days.map(d => `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}/${d.slice(0, 4)}`),
                data: days.map(day => agg.get(day) || 0),
                type: 'bar',
            };
        } else if (trendGran.value === 'W') {
            const agg = new Map();
            for (const ts of tsFiltered) {
                const k = isoWeekKey(ts);
                agg.set(k, (agg.get(k) || 0) + (bucket.get(ts) || 0));
            }
            const weeks = listWeeksInclusive(trendWeekFrom.value, trendWeekTo.value);
            trendSeries.value = {
                labels: weeks.map(labelWeek),
                data: weeks.map(week => agg.get(week) || 0),
                type: 'bar',
            };
        } else {
            const agg = new Map(); // keyFor(...) -> total kWh
            for (const ts of tsFiltered) {
                const k = keyFor(ts, rangeMode.value);
                agg.set(k, (agg.get(k) || 0) + (bucket.get(ts) || 0));
            }

            const sorter = sortKeyFn(rangeMode.value);
            const labels = Array.from(agg.keys()).sort(sorter);

            trendSeries.value = {
                labels,
                data: labels.map(k => agg.get(k) || 0),
                type: 'bar',
            };
        }
    } catch (e) {
        console.error('loadTrendForSelection error', e);
        trendError.value = e?.message ?? 'Trend load failed';
        trendSeries.value = { labels: [], data: [], type: 'line' };
    } finally {
        trendLoading.value = false;
    }
}




// Chart plumbing
function fmtTrendTick(value, idx) {
    const raw = labelFromTickValue(value, idx);
    return formatLabel(raw);
}
function fmtTrendTooltip(idx) {
    const labels = getActiveLabels();
    const raw = labels[idx];
    return formatLabel(raw);
}

const trendChartData = computed(() => {
    if (compareView.value) {
        const base = { data: blocksCompare.value.data };
        const line = { ...base, label: 'kWh', type: 'line', borderWidth: 2, tension: 0.35, pointRadius: 3, fill: false };
        if (trendMode.value === 'combo') {
            const bars = { ...base, label: 'kWh (bars)', type: 'bar' };
            return { labels: blocksCompare.value.labels, datasets: [bars, line] };
        }
        return { labels: blocksCompare.value.labels, datasets: [line] };
    }

    return {
        labels: trendSeries.value.labels,
        datasets: [{
            label: 'kWh',
            type: energyChartType.value,
            data: trendSeries.value.data,
            borderWidth: 2,
            tension: 0.35,
            pointRadius: energyChartType.value === 'line' ? 2 : 0,
            fill: false
        }]
    };
});

const trendChartOptions = computed(() => ({
    responsive: true, maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
    scales: {
        x: {
            ticks: {
                color: '#cbd5e1',
                padding: 10,
                autoSkip: true,
                maxTicksLimit: 12,
                maxRotation: 0,
                callback: (value, idx) => fmtTrendTick(value, idx),
            },
            grid: { color: 'rgba(255,255,255,.15)' }
        },
        y: {
            beginAtZero: true,
            ticks: { color: '#cbd5e1', padding: 6 },
            grid: { color: 'rgba(255,255,255,.15)' }
        },
    },
    plugins: {
        legend: { position: 'top', labels: { color: '#cbd5e1' } },
        tooltip: {
            mode: 'index', intersect: false,
            callbacks: {
                title: (items) => fmtTrendTooltip(items?.[0]?.dataIndex ?? 0)
            }
        }
    },
}));

// Apply button
function applyTrend() {
    if (!canApplyTrend.value) return;
    resetToTimeTrend();
    applyRangeFromControls();
}

/* Compare view + chart mode */
const compareView = ref(false)
const trendMode = ref('line') // 'line' | 'combo'
function enterBlocksCompare(mode) {
    trendMode.value = (mode === 'combo') ? 'combo' : 'line'
    compareView.value = true
    recomputeBlocksCompare()
}
const resetToTimeTrend = () => { compareView.value = false }

function periodNameForHour(h) {
    if (h >= 7 && h < 18) return 'business'
    if (h >= 18 && h < 23) return 'offpeak1'
    return 'offpeak2'
}

const blocksCompare = ref({ labels: [], data: [] })

async function recomputeBlocksCompare() {
    const sel = selectedDayISO()
    if (!sel) { blocksCompare.value = { labels: [], data: [] }; return }

    const pairs = allBlockLevelPairs()
    if (!pairs.length) { blocksCompare.value = { labels: [], data: [] }; return }

    try {
        const payloads = await Promise.all(
            pairs.map(p => fetchTrendForOne(p.block, p.level, sel.startIso, sel.endIso))
        )

        const byBlock = new Map()

        for (let i = 0; i < pairs.length; i++) {
            const block = pairs[i].block
            const series = payloads[i]?.series || []
            for (const s of series) {
                for (const pt of (s.points || [])) {
                    const prev = byBlock.get(block) || 0
                    byBlock.set(block, prev + Number(pt.kwh || 0))
                }
            }
        }

        const labels = Array.from(byBlock.keys())
            .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }))

        blocksCompare.value = { labels, data: labels.map(b => byBlock.get(b) || 0) }
    } catch (e) {
        console.error('recomputeBlocksCompare failed:', e)
        blocksCompare.value = { labels: [], data: [] }
    }
}

function selectedDayISO() {
    if (!selectedDay.value) return null
    const sd = new Date(selectedDay.value)
    const start = new Date(sd); start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setDate(end.getDate() + 1)
    return { startIso: toIsoWithSeconds(toLocalISO(start)), endIso: toIsoWithSeconds(toLocalISO(end)) }
}

/* Keep compare data fresh when inputs change */
watch([trendStartLocal, trendEndLocal, () => hierarchy.value], () => {
    if (compareView.value) recomputeBlocksCompare()
}, { deep: true })

/* Watchers */
watch(granularity, loadWaterSeriesForSelection)
watch(summaryDateLocal, loadBlockSummary)
watch([wasteFromISO, wasteToISO], () => { if (isWasteRangeValid.value) { loadWasteAll(); loadWdi() } })
</script>



<style scoped>
/* ===== Prevent page "expansion" when popovers open ===== */
:root {
    scrollbar-gutter: stable both-edges;
}

@supports not (scrollbar-gutter: stable) {
    html {
        overflow-y: scroll;
    }
}

/* =========================
   Base layout + theme
   ========================= */
.dashboard-container {
    display: grid;
    /* 2x2 layout for the 4 sections */
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 16px;
    background: #0a1f44;
    /* deep navy */
    color: #fff;
}

/* Each category panel */
.column {
    background: #112d5c;
    border-radius: 8px;
    padding: 12px;
    min-width: 0;
    /* prevent chart overflow */
}

/* =========================
   Section header + controls
   ========================= */
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    position: relative;
}

.section-title {
    display: flex;
    align-items: center;
    gap: 8px;
}

.section-title h3 {
    margin: 0;
    font-size: 1rem;
    color: #fff;
}

.icon-wrapper {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: #1976d2;
}

/* Optional different tints per section */
.gear-icon {
    background: #f59e0b;
}

/* energy - amber */
.leaf-icon {
    background: #3b82f6;
}

/* water  - blue  */
.resources-icon {
    background: #a855f7;
}

/* chiller - purple */

/* =========================
   Cards
   ========================= */
.card {
    background: #1e3f7a;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.card-head-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

/* =========================
   KPI grid
   ========================= */
.kpi-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 12px;
}

.kpi-card-wrapper {
    background: #1e3f7a;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 6px 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 96px;
    position: relative;
}

.kpi-title {
    font-size: .78rem;
    color: #fff;
    margin-bottom: 4px;
    opacity: .95;
    display: flex;
    align-items: center;
    gap: 6px;
}

.kpi-number {
    font-size: 1.3rem;
    font-weight: 800;
    color: #fff;
    margin-bottom: 2px;
}

.kpi-unit {
    font-size: .75rem;
    color: #fff;
    opacity: .95;
}

.kpi-sub {
    font-size: .75rem;
    color: #cbd5e1;
}

/* =========================
   Chips / buttons / segmented
   ========================= */
.chip {
    font-size: .8rem;
    color: #fff;
    background: rgba(255, 255, 255, .1);
    border: 1px solid rgba(255, 255, 255, .12);
    padding: 7px 12px;
    border-radius: 999px;
    cursor: pointer;
}

.chip.mini {
    padding: 2px 8px;
    font-size: .72rem;
}

.icon-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    display: grid;
    place-items: center;
    border-radius: 999px;
}

.icon-btn i {
    pointer-events: none;
}

.segmented {
    display: inline-flex;
    gap: 6px;
    margin-left: 8px;
}

.segmented-placeholder {
    width: 0;
    flex: 1 0 auto;
}

.chip.active {
    background: rgba(59, 130, 246, .25);
    border-color: rgba(59, 130, 246, .5);
}

/* =========================
   WUI editor popover
   ========================= */
.wui-card {
    position: relative;
}

.edit-btn {
    position: absolute;
    top: 8px;
    right: 8px;
}

.meta-editor {
    position: absolute;
    top: 42px;
    right: 8px;
    z-index: 25;
    width: 300px;
    max-width: min(300px, calc(100% - 16px));
    background: rgba(7, 19, 48, .94);
    border: 1px solid rgba(255, 255, 255, .25);
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, .45);
}

.meta-editor label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
}

.meta-editor input {
    width: 100%;
    margin-top: 4px;
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, .25);
    background: #16366f;
    color: #fff;
}

.meta-editor .editor-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 6px 0 4px;
}

.meta-editor small {
    display: block;
}

/* =========================
   Controls (selectors, inputs)
   ========================= */
.controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
    background: #112d5c;
    padding: 8px;
    border-radius: 6px;
}

.controls-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

select,
input[type="datetime-local"],
input[type="date"],
input[type="number"] {
    background: #16366f;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, .25);
    border-radius: 6px;
    padding: 6px 8px;
}

select {
    background-color: #1e293b;
    color: #fff;
    border: 1px solid #334155;
}

select:focus {
    outline: none;
    border-color: #3b82f6;
}

option {
    background-color: #1e293b;
    color: #fff;
}

/* =========================
   Chart module
   ========================= */
.chart-module {
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
    background: #112d5c;
    min-height: 300px;
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.card-header h3 {
    margin: 0;
    font-size: 1rem;
    color: #e5e7eb;
}

.chart-wrap {
    position: relative;
    height: 100%;
    min-height: 380px;
    padding-bottom: 40px;
    overflow: visible;
}

/* =========================
   Waste summary chips
   ========================= */
.summary-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.summary-chip {
    background: rgba(255, 255, 255, .08);
    border: 1px solid rgba(255, 255, 255, .18);
    color: #e5e7eb;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: .82rem;
}

/* =========================
   Chiller cards
   ========================= */
.kpi-grid-chillers .chiller-card {
    position: relative;
    min-height: 96px;
}

.status-pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .2px;
    border: 1px solid rgba(255, 255, 255, .25);
    background: rgba(255, 255, 255, .08);
    color: #e5e7eb;
}

.status-pill.ok {
    background: rgba(34, 197, 94, .18);
    border-color: rgba(34, 197, 94, .45);
    color: #bbf7d0;
}

.status-pill.bad {
    background: rgba(239, 68, 68, .18);
    border-color: rgba(239, 68, 68, .45);
    color: #fecaca;
}

.status-pill.unknown {
    background: rgba(148, 163, 184, .18);
    border-color: rgba(148, 163, 184, .45);
    color: #e2e8f0;
}

/* =========================
   Fullscreen modals (charts)
   ========================= */
.fs-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    background: rgba(0, 0, 0, .55);
    display: grid;
    place-items: center;
}

.fs-modal {
    width: min(1400px, 96vw);
    height: min(86vh, 900px);
    background: #0f172a;
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, .12);
    border-radius: 12px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, .6);
    display: grid;
    grid-template-rows: auto 1fr;
    overflow: hidden;
}

.fs-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, .12);
}

.fs-close-btn {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, .15);
    background: rgba(255, 255, 255, .08);
    color: #fff;
    cursor: pointer;
}

.fs-close-btn:hover {
    background: rgba(255, 255, 255, .18);
}

.fs-modal-body {
    padding: 8px 12px 12px;
    height: 100%;
}

.fs-modal-body .chart-wrap,
.fs-modal-body canvas {
    height: 100% !important;
}

/* =========================
   Utilities
   ========================= */
.muted {
    color: #9fb0ff;
    opacity: .9;
}

.err {
    color: #fda4af;
}

/* =========================
   Responsive
   ========================= */
@media (max-width: 1200px) {
    .dashboard-container {
        grid-template-columns: 1fr;
        /* stack all four sections */
    }

    .chart-wrap {
        height: 280px;
    }
}

@media (max-width: 768px) {
    .dashboard-container {
        padding: 12px;
    }

    .chart-wrap {
        height: 240px;
    }
}

/* ===== Energy trend controls ===== */
.trend-controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin: 6px 0 10px;
}

.trend-controls-row .muted {
    font-weight: 600;
    white-space: nowrap;
}

/* Right-side picker cluster */
.trend-pickers {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

/* Make all chips/inputs the same height and vertically centered */
.trend-pickers .chip {
    display: inline-flex;
    align-items: center;
    height: 34px;
    line-height: 1;
    padding: 6px 10px;
    /* keep pill look */
}

/* Inputs sizing */
.trend-pickers input[type="date"],
.trend-pickers input[type="week"],
.trend-pickers input[type="month"] {
    min-width: 150px;
}

.trend-pickers input[type="number"] {
    width: 92px;
    /* year input */
    text-align: center;
}

/* Steppers */
.trend-pickers .icon-btn {
    width: 34px;
    height: 34px;
    padding: 12px;
}

.trend-pickers .icon-btn:disabled {
    opacity: .5;
    cursor: not-allowed;
}

/* Compact on small screens: stack label above controls */
@media (max-width: 880px) {
    .trend-controls-row {
        flex-direction: column;
        align-items: stretch;
    }

    .trend-pickers {
        justify-content: flex-start;
    }
}

/* Compact modal for Monthly Report */
.fs-modal--compact {
    width: 520px;
    max-width: 90vw;
    min-height: unset;
    max-height: unset;
    padding-bottom: 16px;
}

/* Reduce body height */
.fs-modal--compact .fs-modal-body {
    padding: 16px 20px;
}

/* Header spacing tighter */
.fs-modal--compact .fs-modal-header {
    padding: 16px 20px;
}

/* Make controls sit nicely on one row */
.fs-modal--compact .trend-controls-row {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* Force compact height */
.fs-modal--compact {
    width: 520px;
    max-width: 90vw;

    height: auto;
    min-height: unset;
    max-height: none;

    display: block;
}

/* Kill any flex stretching from fullscreen styles */
.fs-modal--compact .fs-modal-body {
    height: auto;
    min-height: unset;
    max-height: none;

    display: block;
    padding: 16px 20px 20px;
}

.tenant-icon {
    background: rgba(139, 92, 246, 0.2);
    color: #c4b5fd;
}

/* Tenant Management card */
.tenant-mgmt-card {
    max-width: 100%;
}

/* Header */
.header-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.icon-pill {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, .12);
}

.tenant-pill {
    background: rgba(139, 92, 246, 0.18);
    color: #c4b5fd;
}

/* Inner KPI grid */
.tenant-kpi-grid {
    grid-template-columns: repeat(3, minmax(220px, 1fr));
    margin-top: 10px;
}

/* Placeholder */
.tenant-placeholder {
    margin-top: 14px;
}

/* WIP panel */
.wip-panel {
    border: 1px dashed rgba(255, 255, 255, .25);
    border-radius: 12px;
    padding: 18px;
    text-align: center;
    background: rgba(255, 255, 255, .03);
}

.wip-title {
    font-weight: 800;
    color: #f8fafc;
    margin-bottom: 6px;
}

.wip-sub {
    color: #9fb0ff;
    font-size: .9rem;
}

.chart-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
}

.chart-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.dark-select {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 10px;
    padding: 8px 10px;
    min-height: 38px;
}

.dark-select option {
    background: #0f172a;
    color: #ffffff;
}

.fs-modal {
    width: min(1200px, 96vw);
    height: min(88vh, 900px);
    display: flex;
    flex-direction: column;
}

.fs-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 0 0 auto;
}

.fs-modal-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
}

.chart-wrap {
    position: relative;
    min-height: 380px;
    height: 100%;
}

.fs-close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
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
</style>

