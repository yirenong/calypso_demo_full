<template>
  <canvas ref="canvas" />
</template>

<script>
import { onMounted, ref, watch } from 'vue';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export default {
  name: 'PowerHourlyChart',
  props: {
    data: { type: Array, required: true }
  },
  setup(props) {
    const canvas = ref(null);
    let chart = null;

    const drawChart = () => {
      if (chart) chart.destroy();
      chart = new Chart(canvas.value.getContext('2d'), {
        type: 'line',
        data: {
          labels: props.data.map(d => d.label),
          datasets: [{
            label: 'kWh',
            data: props.data.map(d => d.value),
            tension: 0.4,
            fill: false,
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    };

    onMounted(drawChart);
    watch(() => props.data, drawChart, { deep: true });

    return { canvas };
  }
};
</script>

<style scoped>
canvas {
  width: 100%;
  height: 200px;
}
</style>
