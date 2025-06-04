<!-- src/views/BuildingManagement.vue -->
<template>
    <div class="building-management-container">
        <div class="page-header">
            <h2 class="page-title">Building Management</h2>
            <nav class="breadcrumb">
                <span>Cavill</span> &gt;
                <span>Management</span> &gt;
                <span>Building Management</span>
            </nav>
        </div>

        <!-- Tab Navigation -->
        <div class="tab-nav">
            <button :class="{ active: currentTab === 'overview' }" @click="currentTab = 'overview'">
                Sensor Overview
            </button>
            <button :class="{ active: currentTab === 'download' }" @click="currentTab = 'download'">
                Download Data
            </button>
        </div>

        <!-- SENSOR OVERVIEW TAB -->
        <div v-if="currentTab === 'overview'" class="tab-content">
            <!-- Chilled Water Pump Section -->
            <h2 class="section-heading">Chilled Water Pump</h2>
            <div class="sensors-grid">
                <div v-for="sensor in chilledPumpSensors" :key="sensor.id" class="sensor-card">
                    <h3 class="sensor-title">{{ sensor.name }}</h3>
                    <div class="sensor-body">
                        <p class="sensor-value">
                            Value: <span>{{ sensor.displayValue }}</span>
                        </p>
                        <p class="sensor-updated">
                            Last Updated: <span>{{ sensor.lastUpdated }}</span>
                        </p>
                    </div>
                </div>
            </div>

            <!-- Chiller Section -->
            <h2 class="section-heading">Chiller</h2>
            <div class="sensors-grid">
                <div v-for="sensor in chillerSensors" :key="sensor.id" class="sensor-card">
                    <h3 class="sensor-title">{{ sensor.name }}</h3>
                    <div class="sensor-body">
                        <p class="sensor-value">
                            Value: <span>{{ sensor.displayValue }}</span>
                        </p>
                        <p class="sensor-updated">
                            Last Updated: <span>{{ sensor.lastUpdated }}</span>
                        </p>
                    </div>
                </div>
            </div>

            <!-- Compiled Section -->
            <h2 class="section-heading">Compiled</h2>
            <div class="sensors-grid">
                <div v-for="sensor in compiledSensors" :key="sensor.id" class="sensor-card">
                    <h3 class="sensor-title">{{ sensor.name }}</h3>
                    <div class="sensor-body">
                        <p class="sensor-value">
                            Value: <span>{{ sensor.displayValue }}</span>
                        </p>
                        <p class="sensor-updated">
                            Last Updated: <span>{{ sensor.lastUpdated }}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- DOWNLOAD DATA TAB -->
        <div v-if="currentTab === 'download'" class="tab-content download-tab">
            <h2 class="section-heading">Download Current Sensor Data (CSV)</h2>
            <button class="download-button" @click="downloadCSV">
                <i class="fas fa-download"></i>
                <span>Download CSV</span>
            </button>
            <p class="note">
                This CSV contains one row per sensor (from every category), showing its name,
                current value, and last‐updated timestamp.
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Utility: format current date/time as “YYYY-MM-DD HH:mm:ss”
function nowFormatted() {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const year = d.getFullYear()
    const month = pad(d.getMonth() + 1)
    const day = pad(d.getDate())
    const hours = pad(d.getHours())
    const mins = pad(d.getMinutes())
    const secs = pad(d.getSeconds())
    return `${year}-${month}-${day} ${hours}:${mins}:${secs}`
}

// 1) Define sensor lists by category
const chilledPumpSensors = ref([
    {
        id: 'cwp-flow',
        name: 'Chilled Water Flow Rate',
        rawValue: 0.0,
        displayValue: '0.0 L/s',
        lastUpdated: nowFormatted(),
    },
    {
        id: 'cwp-status',
        name: 'Chilled Water Pump Status',
        rawValue: 0.0,
        displayValue: '0.0',
        lastUpdated: nowFormatted(),
    },
    {
        id: 'cwp-command',
        name: 'Chilled Water Pump Command',
        rawValue: 0.0,
        displayValue: '0.0',
        lastUpdated: nowFormatted(),
    },
])

const chillerSensors = ref([
    {
        id: 'chiller-status',
        name: 'Chiller Status',
        rawValue: 0.0,
        displayValue: '0.0',
        lastUpdated: nowFormatted(),
    },
    {
        id: 'chiller-command',
        name: 'Chiller Command',
        rawValue: 0.0,
        displayValue: '0.0',
        lastUpdated: nowFormatted(),
    },
])

const compiledSensors = ref([
    {
        id: 'compiled-eff',
        name: 'System Efficiency',
        rawValue: 0.0,
        displayValue: '0.0 KW/TON',
        lastUpdated: nowFormatted(),
    },
    {
        id: 'compiled-power',
        name: 'Total Power Consumption',
        rawValue: 0.3,
        displayValue: '0.3 KW',
        lastUpdated: nowFormatted(),
    },
    {
        id: 'compiled-cooling',
        name: 'Total Cooling Load',
        rawValue: 0.0,
        displayValue: '0.0 KW',
        lastUpdated: nowFormatted(),
    },
    {
        id: 'compiled-heatbal',
        name: 'Heat Balance',
        rawValue: 0.0,
        displayValue: '0.0 %',
        lastUpdated: nowFormatted(),
    },
])

// 2) Create a single array reference containing all sensors (for CSV)
const allSensors = ref([
    ...chilledPumpSensors.value,
    ...chillerSensors.value,
    ...compiledSensors.value,
])

let intervalId = null

onMounted(() => {
    // Every 3 seconds, update every sensor with a small random walk
    intervalId = setInterval(() => {
        // Helper to update a single sensor’s value and timestamp
        function updateSensor(sensor) {
            // ±0.5 random variation
            const variation = (Math.random() - 0.5) * 1.0
            sensor.rawValue = parseFloat((sensor.rawValue + variation).toFixed(1))

            // Determine unit by sensor name
            let unit = ''
            const nameLower = sensor.name.toLowerCase()

            if (nameLower.includes('temperature')) {
                unit = ' °C'
            } else if (nameLower.includes('flow rate')) {
                unit = ' L/s'
            } else if (nameLower.includes('valve')) {
                unit = ' %'
            } else if (nameLower.includes('humidity')) {
                unit = ' %'
            } else if (nameLower.includes('kw/ton') || nameLower.includes('kw')) {
                unit = nameLower.includes('kw/ton') ? ' KW/TON' : ' KW'
            } else if (nameLower.includes('heat balance')) {
                unit = ' %'
            } else {
                // default: treat as plain number
                unit = ''
            }

            sensor.displayValue = `${sensor.rawValue.toFixed(1)}${unit}`.trim()
            sensor.lastUpdated = nowFormatted()
        }

        // Update each category
        chilledPumpSensors.value.forEach(updateSensor)
        chillerSensors.value.forEach(updateSensor)
        compiledSensors.value.forEach(updateSensor)

        // Also refresh the “allSensors” reference every cycle
        allSensors.value = [
            ...chilledPumpSensors.value,
            ...chillerSensors.value,
            ...compiledSensors.value,
        ]
    }, 3000)
})

onUnmounted(() => {
    clearInterval(intervalId)
})

// 3) Tab switching state
const currentTab = ref('overview')

// 4) CSV download logic
function downloadCSV() {
    // Header row
    const header = ['Sensor Name', 'Current Value', 'Category', 'Last Updated'].join(',')

    // Build rows: take each sensor from allSensors plus infer category by ID lookup
    function categoryOf(sensorId) {
        if (chilledPumpSensors.value.find((s) => s.id === sensorId)) {
            return 'Chilled Water Pump'
        }
        if (chillerSensors.value.find((s) => s.id === sensorId)) {
            return 'Chiller'
        }
        return 'Compiled'
    }

    const rows = allSensors.value.map((sensor) => {
        const name = `"${sensor.name}"`
        const value = `"${sensor.displayValue}"`
        const category = `"${categoryOf(sensor.id)}"`
        const updated = `"${sensor.lastUpdated}"`
        return [name, value, category, updated].join(',')
    })

    const csvContent = [header, ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', 'building_management_sensors.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
</script>

<style scoped>
/* ───────────────────────────────────────────────────────────────────────────── */
/* 1) CONTAINER & TYPOGRAPHY                                                      */
/* ───────────────────────────────────────────────────────────────────────────── */
.building-management-container {
    padding: 20px;
    font-family: Arial, sans-serif;
    background-color: #0a1f44;
    /* very dark blue */
    min-height: 100vh;
    color: white;
    /* default text color */
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.page-title {
    font-size: 24px;
    margin: 0;
    color: white;
}

.breadcrumb span {
    font-size: 14px;
    color: white;
    margin: 0 4px;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 2) TAB NAVIGATION                                                              */
/* ───────────────────────────────────────────────────────────────────────────── */
.tab-nav {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
}

.tab-nav button {
    padding: 8px 16px;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.2s;
}

.tab-nav button:hover {
    background: rgba(255, 255, 255, 0.2);
}

.tab-nav button.active {
    background: #1976d2;
    color: white;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 3) SECTION HEADINGS                                                            */
/* ───────────────────────────────────────────────────────────────────────────── */
.section-heading {
    margin-top: 32px;
    margin-bottom: 12px;
    color: white;
    font-size: 20px;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 4) SENSOR GRID: two columns on desktop, one on narrow screens                  */
/* ───────────────────────────────────────────────────────────────────────────── */
.sensors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 5) Each sensor card                                                            */
/* ───────────────────────────────────────────────────────────────────────────── */
.sensor-card {
    background-color: #1e2a47;
    /* dark navy card */
    color: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.sensor-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

.sensor-title {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: bold;
    color: #edf2f7;
}

.sensor-body {
    margin-top: 8px;
}

.sensor-value {
    font-size: 16px;
    margin: 0 0 6px 0;
    color: #e2e8f0;
}

.sensor-value span {
    font-weight: 600;
    color: #fff;
}

.sensor-updated {
    font-size: 14px;
    color: #a0aec0;
    /* lighter gray */
    margin: 0;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 6) DOWNLOAD TAB Styles                                                          */
/* ───────────────────────────────────────────────────────────────────────────── */
.download-tab {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.download-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 12px;
    transition: background 0.2s;
}

.download-button i {
    font-size: 16px;
}

.download-button:hover {
    background: #125ea3;
}

.note {
    font-size: 14px;
    color: #cbd5e0;
    /* subdued gray text */
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* 7) RESPONSIVE: single column below 768px                                        */
/* ───────────────────────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
    .building-management-container {
        padding: 10px;
    }

    .tab-nav {
        flex-direction: column;
        gap: 12px;
    }

    .sensors-grid {
        grid-template-columns: 1fr !important;
        gap: 16px;
    }
}
</style>
