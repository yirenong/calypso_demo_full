// src/components/TableCard.vue
<template>
    <div class="card">
        <div class="card-header">
            <h3>{{ title }}</h3>
        </div>
        <div class="card-body">
            <table class="data-table">
                <thead>
                    <tr>
                        <th v-for="col in columns" :key="col">{{ col }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, i) in rows" :key="i">
                        <td v-for="col in columns" :key="col">{{ row[col] }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    title: String,
    columns: Array,
    rows: Array
})
</script>

<style scoped>
.card {
    background: transparent;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    padding: 16px;
}

.card-header h3 {
    margin: 0;
    font-size: 18px;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
}

.data-table th,
.data-table td {
    border: 1px solid #e2e8f0;
    padding: 8px;
    text-align: left;
    font-size: 14px;
}

.data-table th {
    background: #516fb4;
}
</style>