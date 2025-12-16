<template>
  <div class="dashboard-container">
    <!-- Tab Navigation -->
    <div class="tab-nav">
      <button :class="{ active: selectedTab === 'overview' }" @click="selectedTab = 'overview'">Overview</button>
      <button :class="{ active: selectedTab === 'custom' }" @click="selectedTab = 'custom'">Customizable</button>
    </div>

    <!-- Overview Tab -->
    <div v-if="selectedTab === 'overview'" class="dashboard-view">
      <!-- Header Row -->
      <div class="header-row">
        <h2 class="dashboard-title">Dashboard</h2>
        <nav class="breadcrumb">
          <span>Cavill</span> &gt;
          <span>Menu</span> &gt;
          <span>Dashboard</span>
        </nav>
      </div>
      <!-- Top Cards -->
      <div class="top-cards">
        <DashboardCard color="#625a9b" title="Power Usage Today" :value="powerUsageToday" description="Power Today"
          link="/">
          <template #icon><i class="fas fa-bolt"></i></template>
        </DashboardCard>
        <DashboardCard color="#42abb7" title="Power Usage This Month" :value="totalPowerUsageThisMonth"
          description="Power Usage This Month" link="/">
          <template #icon><i class="fas fa-calendar-alt"></i></template>
        </DashboardCard>
        <DashboardCard color="#00484a" title="Device Power Usage (Highest)" :value="highestDevicePowerUsage"
          description="Highest Power Consumption" link="/">
          <template #icon><i class="fas fa-plug"></i></template>
        </DashboardCard>
        <DashboardCard color="#245d75" title="Power Efficiency" value="Normal" description="Valid Until 30 June 2025"
          link="/">
          <template #icon><i class="fas fa-leaf"></i></template>

        </DashboardCard>
      </div>
      <!-- Middle Row -->
      <div class="middle-row">
        <div class="card real-time-metrics">
          <h3>Real-Time Metrics</h3>
          <table class="metrics-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="metric in realTimeMetrics" :key="metric.name">
                <td>{{ metric.name }}</td>
                <td>{{ metric.value }}</td>
                <td>{{ metric.unit }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card power-usage-hourly">
          <h3>Power Usage Hourly for the Day</h3>
          <div class="chart-wrapper">
            <PowerHourlyChart :data="hourlyChartData" />
          </div>
          <button class="add-button" @click="navigateToPage('/energy-management/historical-data')">+</button>
        </div>
      </div>
      <!-- Bottom Row -->
      <div class="bottom-row">
        <div class="card power-usage-daily">
          <h3>Power Usage Daily, over 7 days</h3>
          <div class="chart-wrapper">
            <PowerDailyChart :data="dailyChartData" />
          </div>
          <button class="add-button" @click="navigateToPage('/energy-management/historical-data')">+</button>
        </div>
      </div>
    </div>

    <!-- Customizable Tab -->
    <div v-else class="dashboard-container">
      <!-- Page Header -->
      <div class="page-header">
        <h2 class="page-title">Customize Dashboard</h2>
        <nav class="breadcrumb">
          <span>Cavill</span> &gt;
          <span>Menu</span> &gt;
          <span>Customize Dashboard</span>
        </nav>
      </div>
      <!-- Controls -->
      <div class="controls">
        <div class="controls-group">
          <label class="control-label" for="cardTypeSelect">Customize Dashboard</label>
          <select id="cardTypeSelect" v-model="newCardType" class="control-select">
            <optgroup v-for="group in cardGroups" :key="group.label" :label="group.label">
              <option v-for="type in group.types" :key="type" :value="type">{{ labelMap[type] }}</option>
            </optgroup>
          </select>
        </div>
        <button class="control-button" @click="addCard">
          <i class="fas fa-plus"></i> <span>Add Card</span>
        </button>
      </div>
      <!-- Draggable Grid -->
      <draggable v-model:list="cards" item-key="id" tag="div" class="dashboard-grid" :animation="200"
        handle=".card-handle" @start="isDragging = true" @end="isDragging = false">
        <template #item="{ element: card, index }">
          <div class="card-wrapper" :class="{ 'value-card': isMetric(card.type), dragging: isDragging }"
            :style="card.props.style">
            <div class="card-top-actions">
              <button class="edit-btn" @click="editCard(index)"><i class="fas fa-edit"></i></button>
              <button class="delete-btn" @click="removeCard(index)"><i class="fas fa-times"></i></button>
            </div>
            <div class="card-handle">☰</div>
            <component :is="componentMap[card.type]" v-bind="card.props" />
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script>
import draggable from 'vuedraggable';
import DashboardCard from '../components/DashboardCard.vue';
import PowerHourlyChart from '../components/PowerHourlyChart.vue';
import PowerDailyChart from '../components/PowerDailyChart.vue';
import FloorplanComponent from '../components/FloorplanComponent.vue';
import BarChartCard from '../components/BarChartCard.vue';
import LineChartCard from '../components/LineChartCard.vue';
import PieChartCard from '../components/PieChartCard.vue';
import ValueCard from '../components/ValueCard.vue';
import TableCard from '../components/TableCard.vue';

// Helper functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  }
  return days;
}
const labels7 = last7Days();
function randomArray(len, max = 100) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * max));
}
const chartOptions = { responsive: true, scales: { y: { beginAtZero: true } } };

const labelMap = {
  MonthlySales: 'Monthly Sales',
  MonthlyTrend: 'Monthly Trend',
  CurrentKPI: 'Current KPI',
  SystemRTGraph: 'System RT Chart',
  SystemRTMetric: 'System RT Now',
  SystemKWGraph: 'System kW Chart',
  SystemKWMetric: 'System kW Now',
  SystemKWRTGraph: 'System kW/RT Chart',
  SystemKWRTMetric: 'System kW/RT Now',
  HeatBalanceGraph: 'Heat Balance Chart',
  HeatBalanceMetric: 'Heat Balance Now',
  ElecIncoming: "Today's Electrical Incoming (kWh)",
  ElecUsage: "Today's Electrical Usage (kWh)",
  TenantUsage: "Today's Tenant Electrical Usage (kWh)",
  Solar: "Today's Solar (kWh)",
  EVCharging: "Today's EV Charging (kWh)",
  CampusEUI: 'Campus EUI (kWh/m²)',
  CampusTSE: 'Campus TSE (kW/RT)',
  EnergySourceDistPie: 'Energy Source Distribution (Pie)',
  EnergySourceDistBar: 'Energy Source Trends (Bar)',
  CampusEUIBar: 'Campus EUI Trend (Bar)',
  ElectricalIntakeBar: 'Electrical Intake Sources (Stacked Bar)',
  EnergyUsageDistPie: 'Energy Usage Distribution (Pie)',
  EnergyUsageDistBar: 'Energy Usage Trends (Bar)',
  AirsideEnergyDistBar: 'Air-side Energy Distribution (Bar)',
  PubWaterIncoming: "Today's PUB water incoming (m³)",
  NEWaterIncoming: "Today's NEWater incoming (m³)",
  CampusWaterUsage: "Today's Campus Water Usage (m³)",
  CampusWUI: 'Campus WUI (m³/population)',
  WaterSourceDistPie: 'Water Source Distribution (Pie)',
  WaterSourceDistBar: 'Water Source Trends (Bar)',
  CampusWUITrendBar: 'Campus WUI Trend (Bar)',
  WaterIntakeBar: 'Water Intake Sources (Stacked Bar)',
  WaterConsumptionTrendBar: 'Water Consumption Trend (Bar)',
  WaterUsageDistPie: 'Water Usage Distribution (Pie)',
  WaterUsageDistBar: 'Water Usage Trends (Bar)',
  CarbonFootprint: 'Carbon Footprint & Emissions (Table)',
  AlertsCCTV: 'Alerts from CCTV Video Analytics (Table)',
  DiagnosticReport: 'Diagnostic Report & Analysis (Table)',
  AvoidableCostReport: 'Avoidable Cost Report & Graph'
};
const cardGroups = [
  { label: 'Chiller Plant Energy', types: ['SystemRTGraph', 'SystemRTMetric', 'SystemKWGraph', 'SystemKWMetric', 'SystemKWRTGraph', 'SystemKWRTMetric', 'HeatBalanceGraph', 'HeatBalanceMetric'] },
  { label: 'Campus Electrical Energy', types: ['ElecIncoming', 'ElecUsage', 'TenantUsage', 'Solar', 'EVCharging', 'CampusEUI', 'CampusTSE', 'EnergySourceDistPie', 'EnergySourceDistBar', 'CampusEUIBar', 'ElectricalIntakeBar', 'EnergyUsageDistPie', 'EnergyUsageDistBar', 'AirsideEnergyDistBar'] },
  { label: 'Campus Water Usage', types: ['PubWaterIncoming', 'NEWaterIncoming', 'CampusWaterUsage', 'CampusWUI', 'WaterSourceDistPie', 'WaterSourceDistBar', 'CampusWUITrendBar', 'WaterIntakeBar', 'WaterConsumptionTrendBar', 'WaterUsageDistPie', 'WaterUsageDistBar'] },
  { label: 'Sustainability Indicators', types: ['CarbonFootprint'] },
  { label: 'Statistical Analysis', types: ['AlertsCCTV', 'DiagnosticReport', 'AvoidableCostReport'] },
  { label: 'Monthly Reports', types: ['MonthlySales', 'MonthlyTrend'] },
  { label: 'KPIs', types: ['CurrentKPI'] }
];
const componentMap = {
  MonthlySales: BarChartCard,
  MonthlyTrend: LineChartCard,
  CurrentKPI: ValueCard,
  SystemRTGraph: LineChartCard,
  SystemRTMetric: ValueCard,
  SystemKWGraph: LineChartCard,
  SystemKWMetric: ValueCard,
  SystemKWRTGraph: LineChartCard,
  SystemKWRTMetric: ValueCard,
  HeatBalanceGraph: LineChartCard,
  HeatBalanceMetric: ValueCard,
  ElecIncoming: ValueCard,
  ElecUsage: ValueCard,
  TenantUsage: ValueCard,
  Solar: ValueCard,
  EVCharging: ValueCard,
  CampusEUI: ValueCard,
  CampusTSE: ValueCard,
  EnergySourceDistPie: PieChartCard,
  EnergySourceDistBar: BarChartCard,
  CampusEUIBar: BarChartCard,
  ElectricalIntakeBar: BarChartCard,
  EnergyUsageDistPie: PieChartCard,
  EnergyUsageDistBar: BarChartCard,
  AirsideEnergyDistBar: BarChartCard,
  PubWaterIncoming: ValueCard,
  NEWaterIncoming: ValueCard,
  CampusWaterUsage: ValueCard,
  CampusWUI: ValueCard,
  WaterSourceDistPie: PieChartCard,
  WaterSourceDistBar: BarChartCard,
  CampusWUITrendBar: BarChartCard,
  WaterIntakeBar: BarChartCard,
  WaterConsumptionTrendBar: BarChartCard,
  WaterUsageDistPie: PieChartCard,
  WaterUsageDistBar: BarChartCard,
  CarbonFootprint: TableCard,
  AlertsCCTV: TableCard,
  DiagnosticReport: TableCard,
  AvoidableCostReport: TableCard
};

export default {
  name: 'Dashboard',
  components: {
    draggable,
    DashboardCard,
    PowerHourlyChart,
    PowerDailyChart,
    FloorplanComponent,
    BarChartCard,
    LineChartCard,
    PieChartCard,
    ValueCard,
    TableCard
  },
  data() {
    return {
      selectedTab: 'overview',
      realTimeMetrics: [
        { name: 'Temperature', value: 24.5, unit: '°C' },
        { name: 'Humidity', value: 55, unit: '%' },
        { name: 'Air Pressure', value: 101.3, unit: 'kPa' },
        { name: 'CO₂ Level', value: 415, unit: 'ppm' },
        { name: 'PM2.5', value: 12, unit: 'µg/m³' },
        { name: 'PM10', value: 20, unit: 'µg/m³' },
        { name: 'VOC', value: 0.45, unit: 'ppm' },
        { name: 'Noise Level', value: 35, unit: 'dB' },
        { name: 'Light Level', value: 300, unit: 'lux' },
        { name: 'Battery Level', value: 80, unit: '%' }
      ],
      hourlyChartData: [
        { label: '00:00', value: 1.2 }, { label: '01:00', value: 1.0 }, { label: '02:00', value: 0.8 },
        { label: '03:00', value: 0.6 }, { label: '04:00', value: 0.5 }, { label: '05:00', value: 0.7 },
        { label: '06:00', value: 1.1 }, { label: '07:00', value: 2.0 }, { label: '08:00', value: 3.5 },
        { label: '09:00', value: 4.0 }, { label: '10:00', value: 4.5 }, { label: '11:00', value: 5.0 },
        { label: '12:00', value: 5.5 }, { label: '13:00', value: 5.2 }, { label: '14:00', value: 4.8 },
        { label: '15:00', value: 4.3 }, { label: '16:00', value: 4.0 }, { label: '17:00', value: 3.8 },
        { label: '18:00', value: 3.2 }, { label: '19:00', value: 2.5 }, { label: '20:00', value: 2.0 },
        { label: '21:00', value: 1.8 }, { label: '22:00', value: 1.5 }, { label: '23:00', value: 1.3 }
      ],
      dailyChartData: [
        { label: '2025-06-02', value: 24.5 }, { label: '2025-06-03', value: 26.0 }, { label: '2025-06-04', value: 25.2 },
        { label: '2025-06-05', value: 27.8 }, { label: '2025-06-06', value: 30.1 }, { label: '2025-06-07', value: 28.4 },
        { label: '2025-06-08', value: 29.0 }
      ],
      selectedImage: 'Floorplan.jpg',
      labelMap,
      cardGroups,
      newCardType: 'SystemRTGraph',
      cards: [],
      isDragging: false,
      componentMap
    };
  },
  computed: {
    powerUsageToday() {
      const total = this.hourlyChartData.reduce((sum, e) => sum + e.value, 0);
      return `${total.toFixed(2)} kWh`;
    },
    highestDevicePowerUsage() {
      return '12.45 kWh';
    },
    totalPowerUsageThisMonth() {
      const total = this.dailyChartData.reduce((sum, e) => sum + e.value, 0);
      return `${total.toFixed(2)} kWh`;
    }
  },
  methods: {
    navigateToPage(path) {
      this.$router.push(path);
    },
    isMetric(type) {
      return [
        'CurrentKPI', 'SystemRTMetric', 'SystemKWMetric', 'SystemKWRTMetric', 'HeatBalanceMetric',
        'ElecIncoming', 'ElecUsage', 'TenantUsage', 'Solar', 'EVCharging', 'CampusEUI', 'CampusTSE'
      ].includes(type);
    },
    addCard() {
      const type = this.newCardType;
      const id = generateId();
      if (['CarbonFootprint', 'AlertsCCTV', 'DiagnosticReport', 'AvoidableCostReport'].includes(type)) {
        const cols = ['Item', 'Value'];
        let rows = [];
        if (type === 'CarbonFootprint') rows = [{ Item: 'Scope 1 CO₂', Value: '1,200 t' }, { Item: 'Scope 2 CO₂', Value: '3,400 t' }];
        if (type === 'AlertsCCTV') rows = [{ Item: 'Motion Alerts', Value: '12' }, { Item: 'Object Alerts', Value: '5' }];
        if (type === 'DiagnosticReport') rows = [{ Item: 'Report A Status', Value: 'OK' }, { Item: 'Report B Status', Value: 'Warning' }];
        if (type === 'AvoidableCostReport') rows = [{ Item: 'Energy Wastage', Value: '$1,500' }, { Item: 'Maintenance', Value: '$700' }];
        this.cards.push({ id, type, props: { title: labelMap[type], columns: cols, rows, style: { gridColumn: 'span 2' } } });
      } else if (/(Graph|Chart|Bar|Pie)$/.test(type)) {
        this.cards.push({
          id,
          type,
          props: {
            title: labelMap[type],
            chartData: {
              labels: labels7,
              datasets: [{ label: labelMap[type], data: randomArray(7) }]
            },
            options: chartOptions,
            style: { gridColumn: 'span 2' }
          }
        })
      } else {
        this.cards.push({ id, type, props: { title: labelMap[type], value: randomArray(1, 10000)[0], style: {} } });
      }
    },
    removeCard(index) {
      this.cards.splice(index, 1);
    },
    editCard(index) {
      const card = this.cards[index];
      const newTitle = prompt('Enter new title:', card.props.title);
      if (newTitle !== null) card.props.title = newTitle;
    }
  },
  mounted() {
    const saved = localStorage.getItem('dashboard-cards');
    if (saved) this.cards = JSON.parse(saved);
  },
  watch: {
    cards: {
      handler(cards) {
        localStorage.setItem('dashboard-cards', JSON.stringify(cards));
      },
      deep: true
    }
  }
};
</script>


<style scoped>
/* Ensure header row items are spaced correctly */
/* Customizable‐tab cards */
[v-cloak] .dashboard-container[v-if] .dashboard-grid .card-wrapper,
.dashboard-container .dashboard-grid .card-wrapper {
  /* only applies in the Customizable tab when .dashboard-grid is rendered */
  background-color: #1e2a47 !important;
  color: #ffffff !important;
}

.dashboard-container .dashboard-grid .card-wrapper * {
  color: inherit !important;
}


.dashboard-container {
  background-color: #0a1f44;
  min-height: 100vh;
  /* so it always fills the viewport height */
  padding: 20px;
  /* optional, to restore your original padding */
}

/* Customizable Tab Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  color: #ffffff;
  margin: 0;
  font-size: 24px;
}

.page-header .breadcrumb {
  display: flex;
  align-items: center;
  color: #ffffff;
  font-size: 14px;
}

.page-header .breadcrumb span {
  margin: 0 4px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  /* title on left, breadcrumb on right */
  align-items: center;
  margin-bottom: 20px;
}

.header-row .breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  /* space between each span and separator */
}

.header-row .breadcrumb span {
  margin: 0;
  /* reset any default margins */
}


/* Title in white */
.dashboard-title {
  color: #ffffff !important;
}

/* Breadcrumb on the right, no extra bottom margin */
.header-row .breadcrumb {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 0;
  /* remove the extra bottom margin */
  color: #ffffff;
  /* make all text white */
}

/* Individual breadcrumb pieces in white */
.header-row .breadcrumb .breadcrumb-item,
.header-row .breadcrumb .breadcrumb-separator {
  color: #ffffff;
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.tab-nav button {
  padding: 0.5rem 1rem;
  border: none;
  background: #ddd;
  cursor: pointer;
  border-radius: 4px;
}

.tab-nav button.active {
  background: #1e2a47;
  color: #fff;
}

/* Overview Layout */
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.top-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.middle-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.bottom-row {
  display: flex;
  gap: 20px;
}

.card {
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: #4a4a4a;
  position: relative;
}

.card h3 {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
}

.chart-wrapper {
  width: 100%;
}

.floorplan {
  display: flex;
  justify-content: center;
}

.add-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #f43f5e;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 18px;
  cursor: pointer;
}

.add-button:hover {
  background-color: #e11d48;
}

/* Customizable Layout */
.controls {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 24px;
}

.control-label {
  display: block;
  margin-bottom: 4px;
  color: white;
  font-size: 14px;
}

.control-select {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  color: #333;
}

.control-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}

.control-button:hover {
  background-color: #125ea3;
}

.dashboard-grid {
  display: grid;
  grid-auto-rows: auto;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.card-wrapper {
  background-color: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-wrapper.value-card {
  max-width: 200px;
}

.card-wrapper:hover:not(.dragging) {
  transform: translateY(-4px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.card-handle {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 1.2rem;
  cursor: grab;
  color: #888;
}

.card-handle:active {
  cursor: grabbing;
}

.card-top-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 8px;
}

.card-top-actions button {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #555;
}

.card-top-actions button:hover {
  color: #000;
}

.card-wrapper.dragging {
  transition: none !important;
}

.card-wrapper.dragging:hover {
  transform: none !important;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1) !important;
}

.metrics-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}

.metrics-table th,
.metrics-table td {
  padding: 6px;
  border: 1px solid #ccc;
  text-align: left;
}

.metrics-table th {
  background: #245d75;
  color: #fff;
}


/* Responsive */
@media (max-width: 768px) {
  .dashboard-view {
    gap: 10px;
  }

  .top-cards,
  .middle-row,
  .bottom-row {
    display: block;
  }

  .controls {
    flex-direction: column;
  }

  .dashboard-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
