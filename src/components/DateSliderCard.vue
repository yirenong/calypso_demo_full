<template>
    <div class="date-slider-card">
        <!-- Card title -->
        <h3 class="card-title">{{ title }}</h3>

        <!-- Two date‐picker inputs side by side -->
        <div class="date-pickers">
            <div class="date-picker">
                <label>
                    From:
                    <input type="date" v-model="startDate" :min="minDate" :max="maxDate" />
                </label>
            </div>
            <div class="date-picker">
                <label>
                    To:
                    <input type="date" v-model="endDate" :min="minDate" :max="maxDate" />
                </label>
            </div>
        </div>

        <!-- Dual‐handle slider (two overlaid range inputs) -->
        <div class="slider-wrapper">
            <!-- Lower handle -->
            <input type="range" :min="0" :max="totalDays" v-model="startOffset" class="slider lower" />
            <!-- Upper handle -->
            <input type="range" :min="0" :max="totalDays" v-model="endOffset" class="slider upper" />
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

// ───────────────────────────────────────────────────────────────────────────────
// Define props: title, minDate, maxDate
// ───────────────────────────────────────────────────────────────────────────────
const props = defineProps({
    title: {
        type: String,
        default: 'Filter: Date Between'
    },
    // Expect ISO‐format date strings, e.g. "2024-01-01"
    minDate: {
        type: String,
        required: true
    },
    maxDate: {
        type: String,
        required: true
    }
})

// Emit an event (“update:range”) whenever the selected range changes
const emit = defineEmits(['update:range'])

// ───────────────────────────────────────────────────────────────────────────────
// Helper functions to convert between dates and “day offset”
// ───────────────────────────────────────────────────────────────────────────────
function parseDate(str) {
    return str ? new Date(str) : null
}

function daysBetween(a, b) {
    return Math.floor((a - b) / (1000 * 60 * 60 * 24))
}

// Compute the total number of days between minDate and maxDate:
const totalDays = computed(() => {
    const start = parseDate(props.minDate)
    const end = parseDate(props.maxDate)
    if (!start || !end) return 0
    return daysBetween(end, start)
})

// ───────────────────────────────────────────────────────────────────────────────
// Reactive “model” for the two date‐pickers
// ───────────────────────────────────────────────────────────────────────────────
const startDate = ref(props.minDate)
const endDate = ref(props.maxDate)

// Offsets in days from minDate; used by the two slider handles:
const startOffset = ref(0)
const endOffset = ref(totalDays.value)

// Whenever totalDays changes (due to prop change), reset endOffset:
watch(totalDays, (newVal) => {
    endOffset.value = newVal
})

// When the user types a new date into either date‐picker, update the offsets:
watch([startDate, endDate], () => {
    const minD = parseDate(props.minDate)
    const sD = parseDate(startDate.value)
    const eD = parseDate(endDate.value)

    if (minD && sD) {
        startOffset.value = daysBetween(sD, minD)
    }
    if (minD && eD) {
        endOffset.value = daysBetween(eD, minD)
    }

    // Emit the updated range upstream:
    emit('update:range', { start: startDate.value, end: endDate.value })
})

// When the user drags either slider handle, update the date‐pickers:
watch([startOffset, endOffset], () => {
    const minD = parseDate(props.minDate)
    if (!minD) return

    // Compute the new “From” date:
    const newStart = new Date(minD.getTime() + startOffset.value * 86400000)
    startDate.value = newStart.toISOString().split('T')[0]

    // Compute the new “To” date:
    const newEnd = new Date(minD.getTime() + endOffset.value * 86400000)
    endDate.value = newEnd.toISOString().split('T')[0]

    // Emit the updated range upstream:
    emit('update:range', { start: startDate.value, end: endDate.value })
})
</script>

<style scoped>
/* ───────────────────────────────────────────────────────────────────────────── */
/*  Container for the entire card                                             */
/* ───────────────────────────────────────────────────────────────────────────── */
.date-slider-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background-color: #1e2a47;
    /* dark navy (match dashboard) */
    padding: 12px;
    border-radius: 8px;
    color: white;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/*  Card Title                                                                 */
/* ───────────────────────────────────────────────────────────────────────────── */
.card-title {
    margin: 0;
    font-size: 1rem;
    font-weight: bold;
    color: white;
}

/* ───────────────────────────────────────────────────────────────────────────── */
/*  Date‐picker Inputs                                                         */
/* ───────────────────────────────────────────────────────────────────────────── */
.date-pickers {
    display: flex;
    gap: 12px;
}

.date-picker label {
    display: flex;
    flex-direction: column;
    font-size: 0.9rem;
    color: white;
}

.date-picker input[type="date"] {
    margin-top: 4px;
    padding: 4px 8px;
    background-color: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    color: white;
}

/* Make the built-in calendar icon invert to white */
.date-picker input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
}

/* ───────────────────────────────────────────────────────────────────────────── */
/*  Dual‐handle Slider                                                           */
/*  We overlay two range inputs; each “thumb” is a circle that can be dragged.  */
/* ───────────────────────────────────────────────────────────────────────────── */
.slider-wrapper {
    position: relative;
    height: 32px;
    margin-top: 8px;
}

.slider {
    position: absolute;
    width: 100%;
    pointer-events: none;
    -webkit-appearance: none;
    background: transparent;
    top: 50%;
    transform: translateY(-50%);
}

/* The “runnable track” background: a dim white bar */
.slider::-webkit-slider-runnable-track {
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
}

.slider::-moz-range-track {
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
}

/* The “thumb” style: a bright blue circle */
.slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    pointer-events: all;
    width: 16px;
    height: 16px;
    background: #1976d2;
    /* same accent blue as tabs */
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid white;
    margin-top: -5px;
    /* center the thumb vertically */
}

.slider::-moz-range-thumb {
    -webkit-appearance: none;
    appearance: none;
    pointer-events: all;
    width: 16px;
    height: 16px;
    background: #1976d2;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid white;
}

/* We want each handle to be on top when it moves: */
.slider.lower {
    z-index: 2;
}

.slider.upper {
    z-index: 1;
}
</style>
