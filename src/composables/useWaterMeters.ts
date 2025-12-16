import { ref, computed } from 'vue'
import type { FlatMeterRow, MeterInfo } from '../types/waterMeters'

const PUBLIC_URL = '/water_meters_combined_full_sorted.json'  // served from /public

export function useWaterMeters() {
    const loading = ref(false)
    const error = ref<string | null>(null)
    const raw = ref<any | null>(null)         // nested object
    const rows = ref<FlatMeterRow[]>([])      // flattened table rows

    async function loadMeters() {
        loading.value = true
        error.value = null
        try {
            const res = await fetch(PUBLIC_URL, { cache: 'no-cache' })
            if (!res.ok) throw new Error('HTTP ' + res.status)
            raw.value = await res.json()
            rows.value = flatten(raw.value)
        } catch (e: any) {
            error.value = e?.message ?? 'Load failed'
            console.error('[useWaterMeters] load error:', e)
        } finally {
            loading.value = false
        }
    }

    function flatten(obj: any): FlatMeterRow[] {
        const out: FlatMeterRow[] = []
        Object.entries<any>(obj || {}).forEach(([blockLabel, places]) => {
            // blockLabel like "Block A" -> block "A"
            const block = (blockLabel.match(/Block\s+([A-Z])/i)?.[1] ?? '').toUpperCase()
            Object.entries<any>(places || {}).forEach(([place, levels]) => {
                Object.entries<any>(levels || {}).forEach(([levelLabel, meters]) => {
                    Object.values<any>(meters || {}).forEach((meter) => {
                        const mi = (meter?.meter_info ?? {}) as MeterInfo
                        out.push({
                            block: mi.block || block,
                            level_label: levelLabel,
                            level: mi.level || '',
                            meter_tag: mi.meter_tag || '',
                            location: mi.location ?? '',
                            serial_no: mi.serial_no ?? '',
                            place: mi.place ?? place,
                            remarks: mi.remarks ?? '',
                            section: mi.section ?? '',
                        })
                    })
                })
            })
        })
        // sort: block, level, meter_tag
        out.sort((a, b) =>
            (a.block.localeCompare(b.block) || a.level.localeCompare(b.level) || a.meter_tag.localeCompare(b.meter_tag))
        )
        return out
    }

    // filter helper for a selected block tab ("Overall" shows all)
    function filterByBlock(selected: string) {
        if (!selected || selected === 'Overall') return rows.value
        return rows.value.filter(r => r.block.toUpperCase() === selected.toUpperCase())
    }

    const blocks = computed(() => {
        const set = new Set(rows.value.map(r => r.block))
        return Array.from(set).sort()
    })

    return { loading, error, raw, rows, blocks, loadMeters, filterByBlock }
}
