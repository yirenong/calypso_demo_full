<template>
  <canvas ref="canvas" />
</template>

<script>
import { onMounted, ref, watch } from 'vue';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export default {
  name: 'PowerDailyChart',
  props: {
    data: { type: Array, required: true }
  },
  setup(props) {
    const canvas = ref(null);
    let chart = null;

    const drawChart = () => {
      if (chart) chart.destroy();
      chart = new Chart(canvas.value.getContext('2d'), {
        type: 'bar',
        data: {
          labels: props.data.map(d => d.label),
          datasets: [{
            label: 'kWh',
            data: props.data.map(d => d.value),
            backgroundColor: 'rgba(54, 162, 235, 0.5)'
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
