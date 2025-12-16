// If you’re in JS, remove the type annotations.
// Endpoint pattern:
// http://localhost:8080/blocks/:block/series?granularity=hourly|daily&start=ISO&end=ISO&fill_missing=false

export function useBlockSeries() {
    const BASE = 'http://localhost:8080/blocks';

    // Build the URL with optional start/end
    function buildUrl(block: string, granularity: 'hourly' | 'daily', start?: string, end?: string) {
        const params = new URLSearchParams();
        params.set('granularity', granularity);
        params.set('fill_missing', 'false');
        if (start) params.set('start', start);   // e.g. '2025-09-03T17:00:00'
        if (end) params.set('end', end);       // e.g. '2025-09-04T17:00:00'
        return `${BASE}/${encodeURIComponent(block)}/series?${params.toString()}`;
    }

    // Tolerant parser → returns { labels: string[], datasets: {label:string, data:number[]}[] }
    function normalizeSeriesPayload(payload: any) {
        // Case 1: { series: [{ name, points:[{t,v}...] }, ...] }
        if (payload && Array.isArray(payload.series)) {
            const labelsSet = new Set<string>();
            payload.series.forEach((s: any) => (s.points || []).forEach((p: any) => labelsSet.add(String(p.t))));
            const labels = Array.from(labelsSet).sort();
            const datasets = payload.series.map((s: any) => {
                const map = new Map((s.points || []).map((p: any) => [String(p.t), Number(p.v)]));
                return { label: s.name ?? 'series', data: labels.map(l => (Number.isFinite(map.get(l)) ? (map.get(l) as number) : null)) };
            });
            return { labels, datasets };
        }

        // Case 2: flat array: [{ timestamp, value, seriesName? }, ...]
        if (Array.isArray(payload)) {
            const labels = payload.map((r: any) => String(r.timestamp ?? r.t ?? r.time ?? r.date)).filter(Boolean);
            const values = payload.map((r: any) => Number(r.value ?? r.v ?? r.y));
            return { labels, datasets: [{ label: 'value', data: values }] };
        }

        // Fallback: empty
        return { labels: [], datasets: [] };
    }

    // Fetcher
    async function fetchBlockSeries(block: string, granularity: 'hourly' | 'daily', start?: string, end?: string) {
        const url = buildUrl(block, granularity, start, end);
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        return normalizeSeriesPayload(payload);
    }

    return { fetchBlockSeries, buildUrl, normalizeSeriesPayload };
}
