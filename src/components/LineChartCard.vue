<template>
    <WidgetCard v-if="hasChrome" :title="title">
        <template #icon>
            <i class="fas fa-chart-line"></i>
        </template>
        <canvas ref="canvas"></canvas>
        <template #actions>
            <slot name="actions" />
        </template>
    </WidgetCard>
    <div v-else class="line-chart-plain">
        <canvas ref="canvas"></canvas>
    </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import WidgetCard from './WidgetCard.vue'


Chart.register(...registerables)
const props = defineProps({
    title: { type: String, default: '' },
    chartData: { type: Object, required: true },
    options: { type: Object, default: () => ({ responsive: true }) }
})

const canvas = ref(null)
let chartInstance = null
const hasChrome = computed(() => props.title.trim().length > 0)

onMounted(() => {
    if (canvas.value && props.chartData && props.chartData.labels) {
        chartInstance = new Chart(canvas.value, {
            type: 'line',
            data: props.chartData,
            options: props.options
        })
    }
})

watch(() => props.chartData, (newData) => {
    if (chartInstance && newData && newData.labels) {
        chartInstance.data = newData
        chartInstance.update()
    }
}, { deep: true })
</script>

<style scoped>
.line-chart-plain {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
}

canvas {
    display: block;
    width: 100%;
    height: 100%;
}
</style>
