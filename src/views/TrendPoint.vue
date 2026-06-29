<template>
    <div class="trend-point-page">
        <div class="header">
            <div class="left">
                <button class="back-btn" @click="$router.back()">← Back</button>
                <h2>Trend • {{ controller }} • {{ decodedPoint }}</h2>
            </div>
            <div class="chips">
                <span class="chip" title="Units">Units: {{ units || '—' }}</span>
                <span class="chip reliability-chip"
                    :class="{ green: reliability === 'No Fault', red: reliability && reliability !== 'No Fault' }"
                    title="Reliability">
                    {{ reliability || 'Faulty' }}
                </span>


                <span class="chip" title="Status">{{ statusFlags || '—' }}</span>

                <button class="chip" :class="{ active: period === '1D' }" @click="period = '1D'">1D</button>
                <button class="chip" :class="{ active: period === '1W' }" @click="period = '1W'">1W</button>
                <button class="chip" :class="{ active: period === '1M' }" @click="period = '1M'">1M</button>
            </div>

        </div>

        <div class="card chart-card">
            <LineChartCard :title="''" :chartData="line.chartData" :options="line.options" />
        </div>

        <div class="card">
            <h3>Latest</h3>
            <pre class="json">{{ latestPretty }}</pre>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, onMounted, onActivated, watch } from 'vue'
import { useRoute } from 'vue-router'
import LineChartCard from '../components/LineChartCard.vue'
import { useMqtt } from '../composables/useMqtt'

defineOptions({ name: 'TrendPoint' })

const route = useRoute()
const { ensureConnected, getTrendSeries } = useMqtt()

onMounted(() => ensureConnected())
onActivated(() => ensureConnected())

const controller = computed(() => route.query.controller || '')
const rawPoint = computed(() => route.query.point || '')
const decodedPoint = computed(() => {
    try { return decodeURIComponent(rawPoint.value) } catch { return rawPoint.value }
})

// Try decoded first, then raw as a fallback
const series = computed(() =>
    getTrendSeries(controller.value, decodedPoint.value) ||
    getTrendSeries(controller.value, rawPoint.value)
)


// Pull meta from series (set by useMqtt now)
const meta = computed(() => series.value?.meta || series.value?.latestMeta || {})

const units = computed(() => meta.value?.units || '')
const reliability = computed(() => {
    const r = meta.value?.reliability
    if (!r) return ''
    return r === 'no-fault-detected' ? 'No Fault' : r
})
const statusFlags = computed(() => {
    const s = meta.value?.statusFlags
    return s ? String(s) : ''
})
const titleText = computed(() => {
    const name = meta.value?.objectName || decodedPoint.value
    const parts = [name]
    if (units.value) parts.push(`[${units.value}]`)
    if (reliability.value) parts.push(`• ${reliability.value}`)
    if (statusFlags.value && statusFlags.value !== '') parts.push(`• ${statusFlags.value}`)
    return parts.join(' ')
})

const period = ref('1D')

function isInPeriod(tsISO, p) {
    if (!tsISO) return false
    const now = new Date()
    const t = Date.parse(tsISO)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (p === '1D') return new Date(tsISO).toDateString() === startOfToday.toDateString()
    const span = p === '1W' ? 7 : 30
    const s = new Date(startOfToday); s.setDate(s.getDate() - (span - 1))
    return t >= s.getTime() && t <= now.getTime()
}

const filtered = computed(() => {
    const arr = series.value?.slot || []
    return arr
        .filter(p => isInPeriod(p.ts, period.value))
        .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))
})

const latestPretty = computed(() => series.value?.latest ? JSON.stringify({
    ...series.value.latest,
    _units: units.value || undefined,
    _reliability: reliability.value || undefined,
    _statusFlags: statusFlags.value || undefined,
    _objectName: meta.value?.objectName || undefined
}, null, 2) : 'null')

const line = computed(() => {
    const pts = filtered.value
    const labels = pts.map(p => {
        const d = new Date(p.ts)
        return period.value === '1M'
            ? d.toLocaleDateString([], { month: 'short', day: 'numeric' })
            : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
    const data = pts.map(p => Number(p.value ?? 0))

    // Label just "Value" (per your request)
    return mkLine(labels, [{
        label: 'Value',
        data,
        fill: true
    }])
})

watch(series, (s) => {
    if (s) {
        console.log('[trend view] series ready:', {
            controller: controller.value,
            pointKey: decodedPoint.value,
            samples: s.slot?.length ?? 0,
            meta: s.meta || s.latestMeta || null
        })
    } else {
        console.log('[trend view] series NULL for', controller.value, decodedPoint.value)
    }
}, { immediate: true })

function mkLine(labels, datasets) {
    return {
        chartData: {
            labels,
            datasets: datasets.map(ds => ({ ...ds, borderWidth: 2, tension: .35, pointRadius: 0 }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 8, right: 8, bottom: 40, left: 8 } },
            scales: {
                x: { offset: true, ticks: { color: '#cbd5e1', padding: 10 }, grid: { color: 'rgba(255,255,255,.15)' } },
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: '#cbd5e1',
                        padding: 6,
                        // Show units on ticks if available
                        callback: (v) => units.value ? `${v} ${units.value}` : v
                    },
                    grid: { color: 'rgba(255,255,255,.15)' }
                }
            },
            plugins: {
                legend: { labels: { color: '#cbd5e1' } },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (ctx) => {
                            const v = ctx.parsed.y
                            return units.value ? `Value: ${v} ${units.value}` : `Value: ${v}`
                        }
                    }
                },
                title: {
                    display: true,
                    text: titleText.value,
                    color: '#fff',
                    font: { size: 14 }
                }
            }
        }
    }
}
</script>


<style scoped>
.trend-point-page {
    padding: 20px;
    background: #0a1f44;
    color: #fff;
    min-height: 100vh;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.back-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: #fff;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.2s, border-color 0.2s;
}

.back-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: #1976d2;
}

.chips {
    display: flex;
    gap: 8px;
}

.chip {
    font-size: 0.85rem;
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 999px;
    padding: 6px 10px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
}

.chip:hover {
    background: rgba(255, 255, 255, 0.25);
}

.chip.active {
    background: #1976d2;
    border-color: #1976d2;
}

.card {
    background: #1e2a47;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 12px;
    margin-top: 10px;
}

.chart-card {
    height: 100%;
    margin-bottom: 16px;
    position: relative;
    overflow: hidden;
}

.chart-card :deep(canvas) {
    width: 100% !important;
    height: 100% !important;
    max-height: 100%;
    display: block;
}

.card+.card {
    margin-top: 16px;
}

.json {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 12px;
    background: #0f1a33;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 10px;
    border-radius: 8px;
    overflow: auto;
}

.reliability-chip.green {
    background: #22c55e;
    /* Tailwind green-500 */
    border-color: #22c55e;
    color: #fff;
}

.reliability-chip.red {
    background: #ef4444;
    /* Tailwind red-500 */
    border-color: #ef4444;
    color: #fff;
}
</style>
