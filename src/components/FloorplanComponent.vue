<template>
  <div class="floorplan-container">
    <img :src="ccMap" alt="Floorplan" class="floorplan-img" />
  </div>
</template>

<script>
import ccMap from '../assets/cc-map.png';

export default {
  name: 'FloorplanComponent',
  setup() {
    return { ccMap };
  }
};
</script>

<style scoped>
.floorplan-container {
  width: 100%;
  height: auto;
}
.floorplan-img {
  width: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}
</style>