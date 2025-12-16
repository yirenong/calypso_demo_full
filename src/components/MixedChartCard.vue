<template>
    <div style="height:100%;width:100%">
        <canvas ref="cv"></canvas>
    </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import {
    Chart, BarController, BarElement, CategoryScale, LinearScale, PointElement, LineElement, LineController, Tooltip, Legend
} from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, PointElement, LineElement, LineController, Tooltip, Legend)

const props = defineProps({
    title: { type: String, default: '' },
    chartData: { type: Object, required: true },   // { labels, datasets:[{type:'bar'|'line', data, ...}, ...] }
    options: { type: Object, default: () => ({}) }
})

const cv = ref(null)
let chart

const make = () => {
    if (!cv.value) return
    if (chart) chart.destroy()
    chart = new Chart(cv.value.getContext('2d'), {
        type: 'bar',            // base type; datasets can override with type:'line'
        data: props.chartData,
        options: props.options
    })
}

watch(() => props.chartData, make, { deep: true })
watch(() => props.options, make, { deep: true })
onMounted(make)
onBeforeUnmount(() => chart && chart.destroy())
</script>
