<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

// ✅ Auto-register all controllers/elements (Pie, Doughnut, etc.)
import 'chart.js/auto'
import { Chart } from 'chart.js'

const props = defineProps({
    title: { type: String, default: '' },
    chartData: {
        type: Object,
        default: () => ({ labels: [], datasets: [] })
    },
    options: {
        type: Object,
        default: () => ({
            responsive: true,
            maintainAspectRatio: false
        })
    }
})

const canvasRef = ref(null)
let chart = null

function makeChart() {
    if (!canvasRef.value) return
    destroyChart()
    chart = new Chart(canvasRef.value.getContext('2d'), {
        type: 'pie',
        data: props.chartData,
        options: props.options
    })
}
function destroyChart() {
    if (chart) {
        chart.destroy()
        chart = null
    }
}

onMounted(() => {
    makeChart()
})

onBeforeUnmount(() => {
    destroyChart()
})

// Deep-watch data/options to update chart
watch(
    () => props.chartData,
    () => {
        if (!chart) return makeChart()
        chart.data = props.chartData
        chart.update()
    },
    { deep: true }
)

watch(
    () => props.options,
    () => {
        if (!chart) return makeChart()
        chart.options = props.options
        chart.update()
    },
    { deep: true }
)
</script>

<template>
    <div class="pie-chart-card" style="width:100%; height:100%">
        <canvas ref="canvasRef"></canvas>
    </div>
</template>

<style scoped>
.pie-chart-card {
    position: relative;
}
</style>
