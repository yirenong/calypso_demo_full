<template>
    <canvas ref="canvas"></canvas>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import {
    Chart,
    BarController, BarElement,
    CategoryScale, LinearScale,
    Tooltip, Legend, Title
} from 'chart.js'

// Register bar chart bits
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title)

const props = defineProps({
    title: { type: String, default: '' },
    chartData: { type: Object, required: true },   // { labels:[], datasets:[...] }
    options: { type: Object, default: () => ({}) }
})

const canvas = ref(null)
let chart

function build() {
    if (!canvas.value) return
    if (chart) chart.destroy()

    const data = props.chartData || { labels: [], datasets: [] }
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: { display: !!props.title, text: props.title }
        },
        ...props.options
    }

    chart = new Chart(canvas.value.getContext('2d'), {
        type: 'bar',
        data,
        options
    })
}

onMounted(build)
watch(() => [props.chartData, props.options, props.title], build, { deep: true })
onBeforeUnmount(() => { if (chart) chart.destroy() })
</script>

<style scoped>
canvas {
    width: 100%;
    height: 100%;
}
</style>
