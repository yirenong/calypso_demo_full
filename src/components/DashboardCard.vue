<template>
  <div class="dashboard-card" :style="{ backgroundColor: color }">
    <div class="top-row">
      <div class="icon"><slot name="icon" /></div>
      <div class="main">
        <p class="value">{{ value }}</p>
        <p class="title">{{ title }}</p>
        <p class="description">{{ description }}</p>
      </div>
    </div>
    <div v-if="link" class="footer">
      <router-link :to="link" class="more">VIEW MORE</router-link>
      <i class="fas fa-chevron-right arrow"></i>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DashboardCard',
  props: {
    color: { type: String, default: '#625a9b' },
    title: { type: String, required: true },
    value: { type: [String, Number], required: true },
    description: { type: String, default: '' },
    link: { type: String, default: '' }
  }
};
</script>

<style scoped>
.dashboard-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* push footer to bottom */
  padding: 18px;
  border-radius: 8px;
  color: #fff;
  /* removed min-height for auto sizing */
}
.top-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}
.main {
  flex: 1;
  text-align: right; /* align text to the right */
}
.value {
  margin: 0;
  font-size: 1.75rem;
  font-weight: bold;
  line-height: 1;
}
.title {
  margin: 4px 0 0;
  font-size: 0.875rem;
}
.description {
  margin: 2px 0 0;
  font-size: 0.75rem;
  opacity: 0.8;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between; /* place view more left, arrow right */
  margin-top: 12px;
}
.more {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  margin: 0;
}
.arrow {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  margin-left: 8px;
}
</style>
