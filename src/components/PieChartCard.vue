<!-- src/components/PieChartCard.vue -->
<template>
    <div class="pie-card">
        <slot name="actions" />
        <h3 class="card-title">{{ title }}</h3>
        <Pie :data="chartData" :options="options" class="chart-canvas" />
    </div>
</template>

<script setup>
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

// register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend)

// define props
const props = defineProps({
    title: {
        type: String,
        default: ''
    },
    chartData: {
        type: Object,
        required: true
    },
    options: {
        type: Object,
        default: () => ({ responsive: true })
    }
})
</script>

<style scoped>
.pie-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
}

.card-title {
    margin-bottom: 12px;
    font-weight: 600;
}

.chart-canvas {
    /* make sure it fills the card width */
    width: 100% !important;
    max-width: 400px;
    height: auto !important;
}
</style>
