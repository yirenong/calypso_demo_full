<template>
    <div class="mixed-chart-card">
        <canvas ref="canvas"></canvas>
    </div>
</template>

<script>
import {
    Chart,
    BarController,
    BarElement,
    LineController,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Legend,
    Tooltip
} from 'chart.js';

Chart.register(
    BarController,
    BarElement,
    LineController,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Legend,
    Tooltip
);

export default {
    name: 'MixedChartCard',
    props: {
        chartData: { type: Object, required: true },
        options: { type: Object, required: true }
    },
    mounted() {
        this._chart = new Chart(this.$refs.canvas.getContext('2d'), {
            data: this.chartData,
            options: this.options
        });
    },
    watch: {
        chartData: {
            deep: true,
            handler(newData) {
                this._chart.data = newData;
                this._chart.update();
            }
        }
    }
};
</script>

<style scoped>
.mixed-chart-card {
    position: relative;
    height: 300px;
}
</style>
