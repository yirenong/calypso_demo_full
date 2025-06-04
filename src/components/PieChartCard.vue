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
ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
    title: { type: String, default: '' },
    chartData: { type: Object, required: true },
    options: { type: Object, default: () => ({ responsive: true }) }
})
</script>

<style scoped>
.pie-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    /* Cap the internal pie card so it never grows beyond a certain point */
    max-height: 240px;
    /* leave room for the title + padding */
    overflow: hidden;
}

.card-title {
    margin-bottom: 8px;
    color: white;
    font-weight: 600;
    text-align: center;
}

/* Keep the pie canvas itself at roughly 180×180 max */
.chart-canvas {
    width: 100% !important;
    max-width: 180px;
    max-height: 180px;
    height: auto !important;
}
</style>
