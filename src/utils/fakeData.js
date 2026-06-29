import axios from 'axios'

const ENABLE_FAKE_DATA = true

const BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K']
const LEVELS = ['Level 1', 'Level 2', 'Level 3', 'Level 4']
const ENERGY_BLOCKS = ['BLK A', 'BLK B', 'BLK C', 'BLK D', 'BLK E', 'BLK F', 'BLK G', 'BLK H', 'BLK J', 'BLK K']
const SHARED_AIRSIDE_KW_RT = 0.72
const SHARED_WATERSIDE_KW_RT = 0.915
const TENANT_DEVICES = [
  ['tenant-001', 'Food Court 1'],
  ['tenant-002', 'Bookshop'],
  ['tenant-003', 'Training Kitchen'],
  ['tenant-004', 'Makerspace'],
  ['tenant-005', 'Cafe Annex'],
]

function hashText(value) {
  let h = 0
  for (const ch of String(value || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

function round(value, dp = 2) {
  const p = 10 ** dp
  return Math.round(Number(value || 0) * p) / p
}

function todayYmd() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(ymd, delta) {
  const d = new Date(`${ymd || todayYmd()}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ym(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
}

function csvResponse(text, filename = 'fake_export.csv') {
  return new Response(text, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  })
}

function blockWater(block, date = todayYmd()) {
  const i = Math.max(0, BLOCKS.indexOf(String(block).toUpperCase()))
  const day = Number(String(date).slice(-2)) || 1
  return round(42 + i * 7.5 + (day % 7) * 2.2 + Math.sin((day + i) / 2) * 4, 2)
}

function energyValue(block, level, date = todayYmd(), hour = 12) {
  const bi = Math.max(0, ENERGY_BLOCKS.indexOf(String(block).toUpperCase()))
  const li = Math.max(0, LEVELS.indexOf(String(level)))
  const day = Number(String(date).slice(-2)) || 1
  const loadShape = 0.65 + Math.sin(((hour - 7) / 24) * Math.PI) * 0.45
  return round((18 + bi * 3.8 + li * 1.9 + (day % 6)) * Math.max(loadShape, 0.35), 3)
}

function dateRange(start, end) {
  const out = []
  let cur = new Date(`${start || addDays(todayYmd(), -6)}T00:00:00`)
  const stop = new Date(`${end || addDays(todayYmd(), 1)}T00:00:00`)
  while (cur < stop && out.length < 730) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`)
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

function hourlyRange(startIso, endIso) {
  const out = []
  const start = new Date(startIso || `${todayYmd()}T00:00:00`)
  const end = new Date(endIso || `${addDays(todayYmd(), 1)}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out
  const cur = new Date(start)
  cur.setMinutes(0, 0, 0)
  if (cur < start) cur.setHours(cur.getHours() + 1)
  while (cur <= end && out.length < 8784) {
    out.push(new Date(cur))
    cur.setHours(cur.getHours() + 1)
  }
  return out
}

function localIsoHour(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:00:00`
}

function monthRange(startMonth, endMonthExclusive) {
  const out = []
  let cur = new Date(`${startMonth || ym()}-01T00:00:00`)
  const stop = new Date(`${endMonthExclusive || ym()}-01T00:00:00`)
  if (cur >= stop) stop.setMonth(stop.getMonth() + 1)
  while (cur < stop && out.length < 60) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
    cur.setMonth(cur.getMonth() + 1)
  }
  return out
}

function fakeWasteRows() {
  const key = 'fake-waste-rows'
  const cached = localStorage.getItem(key)
  if (cached) return JSON.parse(cached)
  const year = new Date().getFullYear()
  const rows = Array.from({ length: new Date().getMonth() + 1 }, (_, idx) => {
    const month = String(idx + 1).padStart(2, '0')
    const general = 28500 + idx * 620 + (idx % 3) * 1100
    const recycled = 3900 + idx * 140
    const food = 2100 + idx * 95
    const population = 24753
    const workingDays = idx % 2 ? 22 : 21
    return {
      id: idx + 1,
      year_month: `${year}-${month}`,
      entry_date: `${year}-${month}-28`,
      general_kg: general,
      recycled_kg: recycled,
      food_kg: food,
      population,
      working_days: workingDays,
      wdi: round(general / population / workingDays, 3),
    }
  })
  localStorage.setItem(key, JSON.stringify(rows))
  return rows
}

function saveWasteRows(rows) {
  localStorage.setItem('fake-waste-rows', JSON.stringify(rows))
}

function parseWasteDate(value, fallback) {
  const raw = String(value || '').trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split('/')
    return `${yyyy}-${mm}-${dd}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return fallback
}

function fakeWasteTrend(url) {
  const start = parseWasteDate(url.searchParams.get('start'), addDays(todayYmd(), -30))
  const end = parseWasteDate(url.searchParams.get('end'), todayYmd())
  return dateRange(start, addDays(end, 1)).map((date, idx) => {
    const general = 900 + (idx % 7) * 42 + Math.sin(idx / 2) * 65
    const recycled = 150 + (idx % 5) * 18
    const food = 80 + (idx % 4) * 12
    const total = general + recycled + food
    const [yyyy, mm, dd] = date.split('-')
    return {
      date: `${dd}/${mm}/${yyyy}`,
      total_general: round(general, 2),
      total_recycled: round(recycled, 2),
      total_food: round(food, 2),
      total_waste: round(total, 2),
      total_waste_ma7: round(total * (0.96 + (idx % 3) * 0.015), 2),
      diversion_rate: round(recycled / Math.max(total, 1), 4),
      diversion_rate_ma7: round(recycled / Math.max(total, 1), 4),
    }
  })
}

function fakeWasteMonthly(url) {
  const rows = fakeWasteRows()
  return rows.map((row) => {
    const [yyyy, mm] = String(row.year_month).split('-')
    const total = Number(row.general_kg || 0) + Number(row.recycled_kg || 0) + Number(row.food_kg || 0)
    return {
      month: `${mm}/${yyyy}`,
      year_month: row.year_month,
      total_general: row.general_kg,
      total_recycled: row.recycled_kg,
      total_food: row.food_kg,
      total_waste: round(total, 2),
      diversion_rate: round(Number(row.recycled_kg || 0) / Math.max(total, 1), 4),
      wdi: row.wdi,
    }
  })
}

function fakeWasteSummary(url) {
  const trend = fakeWasteTrend(url)
  const totalGeneral = round(trend.reduce((sum, row) => sum + Number(row.total_general || 0), 0), 2)
  const totalRecycled = round(trend.reduce((sum, row) => sum + Number(row.total_recycled || 0), 0), 2)
  const totalFood = round(trend.reduce((sum, row) => sum + Number(row.total_food || 0), 0), 2)
  const totalWaste = round(totalGeneral + totalRecycled + totalFood, 2)
  return {
    start: trend[0]?.date || null,
    end: trend.at(-1)?.date || null,
    days: trend.length,
    entries: trend.length,
    total_general: totalGeneral,
    total_recycled: totalRecycled,
    total_food: totalFood,
    total_waste: totalWaste,
    avg_per_day_total: round(totalWaste / Math.max(trend.length, 1), 2),
    diversion_rate: round(totalRecycled / Math.max(totalWaste, 1), 4),
  }
}

function fakeWasteWdi(url) {
  const summary = fakeWasteSummary(url)
  const operationalDays = Number(url.searchParams.get('operational_days') || summary.days || 21)
  const denominator = 24753 * Math.max(operationalDays, 1)
  return {
    disposed_total: round(summary.total_general + summary.total_food, 2),
    denominator,
    wdi: round((summary.total_general + summary.total_food) / Math.max(denominator, 1), 3),
  }
}

function fakeTenantSummary(targetDate = todayYmd()) {
  const devices = TENANT_DEVICES.map(([dev_eui, device_name], idx) => {
    const data = Array.from({ length: 24 }, (_, hour) => ({
      timestamp: `${targetDate}T${String(hour).padStart(2, '0')}:00:00`,
      energy_kwh: round(4.2 + idx * 0.9 + Math.sin(hour / 3) * 1.4 + (hour >= 9 && hour <= 18 ? 2.1 : 0), 3),
    }))
    const total = round(data.reduce((s, x) => s + x.energy_kwh, 0), 3)
    return {
      dev_eui,
      device_name,
      total_energy_kwh: total,
      average_hourly_energy_kwh: round(total / data.length, 3),
      hours_with_data: data.length,
      data,
    }
  })
  const total = round(devices.reduce((s, d) => s + d.total_energy_kwh, 0), 3)
  return {
    success: true,
    date: targetDate,
    device_count: devices.length,
    total_energy_kwh: total,
    average_hourly_energy_kwh: round(total / 24, 3),
    hours_with_data: 24,
    devices,
  }
}

function fakeTenantGraph(params = {}) {
  const granularity = params.granularity || 'hourly'
  const devEui = params.dev_eui || 'overall'
  const seed = hashText(devEui) % 17
  const rows = []
  if (granularity === 'hourly') {
    const day = String(params.start || params.target_date || todayYmd()).slice(0, 10)
    for (let h = 0; h < 24; h += 1) {
      rows.push({ x: `${day}T${String(h).padStart(2, '0')}:00:00`, y: round(18 + seed + Math.sin(h / 3) * 5 + (h >= 8 && h <= 18 ? 12 : 0), 3) })
    }
  } else {
    const start = String(params.start || addDays(todayYmd(), -13)).slice(0, 10)
    const end = String(params.end || addDays(todayYmd(), 1)).slice(0, 10)
    dateRange(start, end).forEach((day, idx) => rows.push({ x: `${day}T00:00:00`, y: round(260 + seed * 4 + idx * 3 + Math.sin(idx) * 24, 3) }))
  }
  return { success: true, data: rows }
}

function fakeHierarchy() {
  const byBlockLevel = {}
  const byPanel = {}
  ENERGY_BLOCKS.forEach((block, bi) => {
    byBlockLevel[block] = {}
    byBlockLevel[`Block ${block.replace('BLK ', '')}`] = byBlockLevel[block]
    LEVELS.forEach((level, li) => {
      const panel = `${block}-${level}`.replace(/\s+/g, '-')
      byBlockLevel[block][level] = [panel]
      byPanel[panel] = { device_ids: [`${bi + 1}${li + 1}01`, `${bi + 1}${li + 1}02`] }
    })
  })
  return { by_block_level: byBlockLevel, by_panel: byPanel }
}

function fakePowerRows(date = todayYmd(), hour = 12) {
  const rows = []
  ENERGY_BLOCKS.forEach((block, bi) => {
    LEVELS.forEach((level, li) => {
      const kwh = energyValue(block, level, date, hour) * (hour === null ? 24 : 1)
      rows.push({ block, level, kwh, kw: round(kwh / (hour === null ? 24 : 1), 3), device_id: `${bi + 1}${li + 1}01`, panel: `${block}-${level}` })
    })
  })
  return rows
}

function fakeBlockMonth(url) {
  const params = url.searchParams
  const start = String(params.get('start') || `${ym()}-01`).slice(0, 10)
  const end = String(params.get('end') || addDays(todayYmd(), 1)).slice(0, 10)
  const rows = []
  dateRange(start, end).forEach((date) => {
    ENERGY_BLOCKS.forEach((block) => rows.push({ date, block, kwh: round(LEVELS.reduce((s, l) => s + energyValue(block, l, date, null) * 24, 0), 2) }))
  })
  return { window: 'month', date: todayYmd(), rows, total_kwh: round(rows.reduce((s, r) => s + r.kwh, 0), 2) }
}

function fakeBlocksTrend(url) {
  const startIso = url.searchParams.get('start') || `${todayYmd()}T00:00:00`
  const endIso = url.searchParams.get('end') || `${addDays(todayYmd(), 1)}T00:00:00`
  const hours = hourlyRange(startIso, endIso)
  return {
    series: ENERGY_BLOCKS.map((block) => ({
      key: block.replace('BLK ', '').replace('B', block === 'BLK B' ? 'BD' : 'B'),
      points: hours.map((dt) => {
        const day = localIsoHour(dt).slice(0, 10)
        const hour = dt.getHours()
        return { ts: localIsoHour(dt), kwh: round(LEVELS.reduce((s, l) => s + energyValue(block, l, day, hour), 0), 3) }
      }),
    })),
  }
}

function fakeBlockLevelTrend(url) {
  const block = url.searchParams.get('block') || 'BLK A'
  const level = url.searchParams.get('level') || 'Level 1'
  const startIso = url.searchParams.get('start') || `${todayYmd()}T00:00:00`
  const endIso = url.searchParams.get('end') || `${addDays(todayYmd(), 1)}T00:00:00`
  const points = hourlyRange(startIso, endIso).map((dt) => {
    const ts = localIsoHour(dt)
    return { ts, kwh: energyValue(block, level, ts.slice(0, 10), dt.getHours()) }
  })
  return { series: [{ key: `${block}-${level}`, points }] }
}

function fakeWaterSummary(date = todayYmd()) {
  const items = BLOCKS.map((block) => ({ block, consumption: blockWater(block, date) }))
  return { date, items, total: round(items.reduce((s, x) => s + x.consumption, 0), 2) }
}

function fakeWaterSeries(tag, startIso, endIso) {
  const seed = (hashText(tag) % 50) / 10
  let cumulative = 1000 + seed * 50
  const data = hourlyRange(startIso || `${addDays(todayYmd(), -7)}T00:00:00`, endIso || `${addDays(todayYmd(), 1)}T00:00:00`).map((dt, idx) => {
    const hour = dt.getHours()
    const daytime = hour >= 7 && hour <= 20 ? 1 : 0.35
    cumulative += 0.18 + seed * 0.025 + daytime * 0.32 + (idx % 6) * 0.015
    return { ts: localIsoHour(dt), consumption: round(cumulative, 3) }
  })
  return { data }
}

function fakeWaterMonthly(url) {
  const start = url.searchParams.get('start') || ym()
  const end = url.searchParams.get('end') || ym()
  const block = decodeURIComponent(url.pathname.split('/')[2] || 'A').toUpperCase()
  const data = monthRange(start, end).map((month, idx) => ({ ts: `${month}-01T00:00:00`, consumption: round(980 + block.charCodeAt(0) * 3 + idx * 35, 2) }))
  return { data }
}

function fakeSpecialWater(url) {
  const start = String(url.searchParams.get('start') || addDays(todayYmd(), -7)).slice(0, 10)
  const end = String(url.searchParams.get('end') || addDays(todayYmd(), 1)).slice(0, 10)
  let cumulative = 5000 + (hashText(url.searchParams.get('deviceName')) % 300)
  return dateRange(start, end).flatMap((day, idx) => {
    return [0, 6, 12, 18].map((hour) => {
      cumulative += 1.8 + (idx % 4) * 0.4
      return { timestamp: `${day}T${String(hour).padStart(2, '0')}:00:00`, consumption_m3: round(cumulative, 3) }
    })
  })
}

function fakeChillerPoints() {
  const ts = new Date().toISOString()
  const mk = (object_name, value, units = 'kW/RT') => ({
    object_name,
    value: round(value, 3),
    units,
    ts,
    device_id: 'CHILLER_PLANT',
    in_alarm: false,
    fault: false,
    out_of_service: false,
    overridden: false,
    reliability: 'no-fault-detected',
  })
  const rows = [
    mk('Total CH Efficiency', 0.642),
    mk('Total CT Efficiency', 0.118),
    mk('Total CHWP Efficiency', 0.084),
    mk('Total CWP Efficiency', 0.071),
    mk('Total System Efficiency', SHARED_WATERSIDE_KW_RT),
  ]
  for (let i = 1; i <= 5; i += 1) {
    rows.push(mk(`CH${i}_Efficiency`, 0.58 + i * 0.035))
    rows.push({ ...mk(`CH${i}_status`, i <= 4 ? 1 : 0, ''), value: i <= 4 ? 1 : 0 })
  }
  return rows
}

function fakeChillerDaily(url) {
  const month = url.searchParams.get('month') || ym()
  const [year, monthNo] = month.split('-').map(Number)
  const days = new Date(year, monthNo, 0).getDate()
  return {
    rows: Array.from({ length: days }, (_, idx) => {
      const day = `${month}-${String(idx + 1).padStart(2, '0')}`
      return { date: day, kw_per_rt: round(0.86 + Math.sin(idx / 4) * 0.06, 3) }
    }),
  }
}

function fakeBacnetDevices() {
  const devices = [
    [528, 'Chiller Plant Controller'],
    [539, 'Block A Air Handling'],
    [549, 'Block B Air Handling'],
    [558, 'Block C Air Handling'],
    [598, 'Water Meter Gateway'],
    [608, 'Energy Meter Gateway'],
    [631, 'Campus Utility Gateway'],
  ].map(([id, name]) => ({
    'device-id': id,
    'device-name': name,
    address: `192.168.10.${id % 255}`,
    vendor: 'Cavill Demo',
    online: true,
  }))
  return { devices }
}

function fakeBacnetObjects(deviceId) {
  const names = ['Supply Air Temp', 'Return Air Temp', 'Valve Position', 'Fan Speed', 'Power Demand', 'Runtime Hours']
  const objects = names.map((name, idx) => ({
    'object-id': `analogInput:${3000 + idx}`,
    'object-name': name,
    'present-value': round(18 + idx * 7 + (Number(deviceId) % 9) * 0.8, idx >= 2 ? 1 : 2),
    'status-flags': { inAlarm: false, fault: false, overridden: false, outOfService: false },
    reliability: 'no-fault-detected',
    units: idx < 2 ? 'degC' : idx < 4 ? '%' : idx === 4 ? 'kW' : 'h',
    fault: false,
  }))
  return { objects }
}

function fakeMeterSnapshotCsv(url) {
  const date = url.searchParams.get('date') || todayYmd()
  const rows = ['date,block,level,meter,kwh']
  ENERGY_BLOCKS.slice(0, 6).forEach((block) => {
    LEVELS.forEach((level, idx) => {
      rows.push(`${date},${block},${level},${block.replace(' ', '-')}-${idx + 1},${energyValue(block, level, date, 12)}`)
    })
  })
  return csvResponse(rows.join('\n'), `meter_snapshots_${date}.csv`)
}

async function fakeFetch(input, options = {}) {
  const rawUrl = typeof input === 'string' ? input : input?.url
  const method = String(options?.method || 'GET').toUpperCase()
  if (!rawUrl) return null
  const url = new URL(rawUrl, window.location.origin)
  const host = url.hostname
  const path = url.pathname
  const isLocalApi = ['localhost', '127.0.0.1'].includes(host)
  if (!isLocalApi) return null

  if (host === 'localhost' && url.port === '8083' && path.startsWith('/waste')) {
    const rows = fakeWasteRows()
    const id = Number(path.split('/')[2])
    if (method === 'POST') {
      const body = JSON.parse(options.body || '{}')
      const row = { ...body, id: Math.max(0, ...rows.map((r) => Number(r.id || 0))) + 1, year_month: String(body.entry_date || todayYmd()).slice(0, 7) }
      row.wdi = round(Number(row.general_kg || 0) / Number(row.population || 24753) / Number(row.working_days || 21), 3)
      rows.push(row); saveWasteRows(rows)
      return jsonResponse(row)
    }
    if (method === 'PUT' && id) {
      const body = JSON.parse(options.body || '{}')
      const idx = rows.findIndex((r) => Number(r.id) === id)
      if (idx >= 0) rows[idx] = { ...rows[idx], ...body, year_month: String(body.entry_date || rows[idx].entry_date).slice(0, 7) }
      saveWasteRows(rows)
      return jsonResponse(rows[idx] || {})
    }
    if (method === 'DELETE' && id) {
      saveWasteRows(rows.filter((r) => Number(r.id) !== id))
      return jsonResponse({ ok: true })
    }
    return jsonResponse(rows)
  }

  if (host === 'localhost' && url.port === '8083' && path.startsWith('/stats/')) {
    if (path === '/stats/trend') return jsonResponse(fakeWasteTrend(url))
    if (path === '/stats/monthly') return jsonResponse(fakeWasteMonthly(url))
    if (path === '/stats/summary') return jsonResponse(fakeWasteSummary(url))
    if (path === '/stats/wdi') return jsonResponse(fakeWasteWdi(url))
  }

  if (host === 'localhost' && url.port === '47800' && path.startsWith('/api/v1/bacnet')) {
    if (path.endsWith('/devices')) return jsonResponse(fakeBacnetDevices())
    const deviceMatch = path.match(/\/devices\/([^/]+)\/objects$/)
    if (deviceMatch) return jsonResponse(fakeBacnetObjects(deviceMatch[1]))
    return jsonResponse(fakeBacnetDevices())
  }

  if (url.port === '8080') {
    if (path === '/blocks') return jsonResponse({ items: BLOCKS })
    if (path === '/summary/block') return jsonResponse(fakeWaterSummary(url.searchParams.get('date') || todayYmd()))
    if (path === '/meta/site') return jsonResponse({ population: 24753, area: 1.92, units: { area: 'km2' }, blocks: BLOCKS.map((block) => ({ block, population: 1800 + block.charCodeAt(0) * 15, area: 0.12 })) })
    if (path.includes('/latest-cumulative')) return jsonResponse({ last_value: 1200 + (hashText(path) % 800), last_ts: new Date().toISOString() })
    if (path.includes('/series-monthly')) return jsonResponse(fakeWaterMonthly(url))
    if (path.includes('/series-yearly')) return jsonResponse({ data: [2024, 2025, 2026].map((year, idx) => ({ ts: `${year}-01-01T00:00:00`, consumption: 9800 + idx * 820 + (hashText(path) % 500) })) })
    if (path.includes('/series')) return jsonResponse(fakeWaterSeries(path.split('/')[2], url.searchParams.get('start'), url.searchParams.get('end')))
  }

  if (url.port === '8086' && path === '/api/range') return jsonResponse(fakeSpecialWater(url))

  if (url.port === '8084') {
    if (path.includes('/faults/')) return jsonResponse([])
    if (path.includes('/thresholds/')) return jsonResponse([])
  }

  if (url.port === '8081') {
    if (path === '/meta/hierarchy') return jsonResponse(fakeHierarchy())
    if (path === '/meter-snapshots/export') return fakeMeterSnapshotCsv(url)
    if (path === '/power/block-level/hour') return jsonResponse({ window: 'hour', ts: `${todayYmd()}T12:00:00`, rows: fakePowerRows(todayYmd(), 12), total_kwh: 0, total_kw: 0 })
    if (path === '/power/block-level/day') return jsonResponse({ window: 'day', date: todayYmd(), rows: fakePowerRows(todayYmd(), null), total_kwh: 0, total_kw: 0 })
    if (path === '/power/device/hour' || path === '/power/device/day' || path === '/power/meter/hour') return jsonResponse({ window: 'hour', ts: `${todayYmd()}T12:00:00`, rows: fakePowerRows(todayYmd(), 12), total_kwh: 0, total_kw: 0 })
    if (path === '/power/block/month' || path === '/power/block/month/total' || path === '/power/block/day') return jsonResponse(fakeBlockMonth(url))
    if (path === '/power/block/day/hour') return jsonResponse({ rows: fakePowerRows(url.searchParams.get('date') || todayYmd(), 12).map((r) => ({ block: r.block, kwh: r.kwh })) })
    if (path === '/power/blocks/trend') return jsonResponse(fakeBlocksTrend(url))
    if (path === '/power/block-level/trend') return jsonResponse(fakeBlockLevelTrend(url))
    if (path === '/power/top') return jsonResponse({ window: url.searchParams.get('window') || 'hour', rows: fakePowerRows(todayYmd(), 12).slice(0, 15).map((r, idx) => ({ rank: idx + 1, name: `Meter ${idx + 1}`, block: r.block, level: r.level, kwh: r.kwh })) })
    if (path === '/efficiency/hour') return jsonResponse({ ts: `${todayYmd()}T12:00:00`, kw_per_rt: SHARED_AIRSIDE_KW_RT })
    if (path === '/efficiency/day') return jsonResponse({ ts: `${todayYmd()}T12:00:00`, kw_per_rt: SHARED_AIRSIDE_KW_RT })
    if (path === '/efficiency/month') return jsonResponse({ rows: fakeChillerDaily(url).rows.map((r) => ({ ...r, kw_per_rt: round(SHARED_AIRSIDE_KW_RT + Math.sin(hashText(r.date) / 1000) * 0.04, 3) })) })
    if (path.startsWith('/efficiency/')) return jsonResponse([{ ts: `${todayYmd()}T12:00:00`, kw_per_rt: SHARED_AIRSIDE_KW_RT }])
  }

  if (url.port === '8082') {
    if (path === '/points/latest') return jsonResponse(fakeChillerPoints())
    if (path === '/points/total-system-efficiency/daily') return jsonResponse(fakeChillerDaily(url))
    return jsonResponse(fakeChillerPoints())
  }
  if (isLocalApi && url.port && url.port !== '5174') {
    return jsonResponse({ ok: true, rows: [], items: [], data: [], devices: [], objects: [] })
  }
  return null
}

function installFetch() {
  const nativeFetch = window.fetch.bind(window)
  window.fetch = async (input, options) => {
    const fake = await fakeFetch(input, options)
    if (fake) return fake
    return nativeFetch(input, options)
  }
}

function installAxios() {
  axios.defaults.adapter = async (config) => {
    const url = new URL(config.url, window.location.origin)
    if (url.hostname === 'localhost' && url.port === '8087') {
      Object.entries(config.params || {}).forEach(([key, value]) => url.searchParams.set(key, value))
      if (url.pathname === '/api/energy-summary') {
        return { data: fakeTenantSummary(url.searchParams.get('target_date') || todayYmd()), status: 200, statusText: 'OK', headers: {}, config, request: null }
      }
      if (url.pathname === '/api/hourly-graph') {
        return { data: fakeTenantGraph(Object.fromEntries(url.searchParams.entries())), status: 200, statusText: 'OK', headers: {}, config, request: null }
      }
      if (url.pathname.includes('/reports/')) {
        return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config, request: null }
      }
    }
    throw new Error(`No fake axios response for ${config.url}`)
  }
}

export function installFakeData() {
  if (!ENABLE_FAKE_DATA || typeof window === 'undefined') return
  installFetch()
  installAxios()
  window.__ITECC_FAKE_DATA__ = true
}
