import { reactive, ref } from 'vue'
import mqtt from 'mqtt'

let client = null

/* ───────────────── connection state ───────────────── */
const mqttConnected = ref(false)

/* ───────────────── top-level reactive stores ───────────────── */
const live = reactive(Object.create(null))
live.bms = reactive(Object.create(null))
live.bms.data = reactive(Object.create(null))

const metrics = reactive({
  totalenergy: { latest: null, slot: [] },
  waterside: { latest: null, slot: [] },
  airside: { latest: null, slot: [] },
  plant_advanced: { latest: null, slot: [] },

  trend: reactive(Object.create(null)),
  trendPoints: reactive(Object.create(null)),

  hourly: reactive(Object.create(null)),
})

/* ───────────────── debug ring buffer ───────────────── */
const debug = reactive({
  messages: [], // { ts, topic, retained, qos, len, sample }
  max: 300
})
function recordDebug(topic, packet, payload) {
  const sample = (() => {
    try {
      const s = typeof payload === 'string' ? payload : JSON.stringify(payload)
      return s.length > 180 ? s.slice(0, 180) + '…' : s
    } catch { return '' }
  })()
  debug.messages.push({
    ts: new Date().toISOString(),
    topic,
    retained: !!packet?.retain,
    qos: packet?.qos ?? null,
    len: (packet?.payload && packet.payload.length) || 0,
    sample
  })
  if (debug.messages.length > debug.max) {
    debug.messages.splice(0, debug.messages.length - debug.max)
  }
}

/* ───────────────── helpers ───────────────── */
const MAX_KEEP = 1000

function upsertLive(controller, p) {
  const id = p.id || p.objectId || p._instance || null
  const name = p.objectName || p.path || p.label || 'raw'
  const key = `${controller || 'unknown'}:${id || name}`
  const ex = live[key] || {}

  live[key] = {
    controller: controller || ex.controller || null,
    id: id ?? ex.id ?? null,
    path: name ?? ex.path ?? null,
    value: p.presentValue ?? p.value ?? null,
    units: p.units || p.unit || ex.units || '',
    flags: p.statusFlags || p.flags || ex.flags || '',
    reliability: p.reliability || ex.reliability || '',
    retained: !!p._retained,
    updatedAt:
      p._ts_sgt ||
      p.ts_sgt ||
      (p._ts ? new Date(p._ts * 1000).toISOString() : new Date().toISOString()),
  }
}

function controllerFromTopicOrPayload(topic, p) {
  const parts = topic.split('/')
  if (parts[0] === 'bms' && parts[1] === 'data' && parts[2]) return parts[2]
  return p?.controller || null
}

/* ───────────── trend helpers ───────────── */
function ensureTrendFrameBucket(key) {
  return metrics.trend[key] || (metrics.trend[key] = reactive({ latest: null, slot: [] }))
}
function pushTrendFrame(key, frame) {
  const bucket = ensureTrendFrameBucket(key)
  bucket.latest = frame
  bucket.slot.push(frame)
  if (bucket.slot.length > MAX_KEEP) bucket.slot.splice(0, bucket.slot.length - MAX_KEEP)
}

function ensureTrendPointsController(ctrl) {
  return (
    metrics.trendPoints[ctrl] ||
    (metrics.trendPoints[ctrl] = reactive({
      points: reactive(Object.create(null)),
      latestFrameTs: null,
    }))
  )
}
function ensureTrendPoint(ctrl, pointKey, type = null) {
  const cont = ensureTrendPointsController(ctrl)
  const p =
    cont.points[pointKey] ||
    (cont.points[pointKey] = reactive({
      type,
      latest: null,
      slot: [],
      meta: reactive(Object.create(null)),
      latestMeta: null,
    }))
  if (type && !p.type) p.type = type
  return p
}
function appendPointSample(ctrl, pointKey, value, tsISO, type = null, meta = null) {
  const pt = ensureTrendPoint(ctrl, pointKey, type)
  const row = { ts: tsISO || new Date().toISOString(), value: Number(value) }
  pt.latest = row
  pt.slot.push(row)
  if (pt.slot.length > MAX_KEEP) pt.slot.splice(0, pt.slot.length - MAX_KEEP)

  if (meta && typeof meta === 'object') {
    pt.latestMeta = meta
    if (meta.units != null) pt.meta.units = meta.units
    if (meta.reliability != null) pt.meta.reliability = meta.reliability
    if (meta.objectName != null) pt.meta.objectName = meta.objectName
    if (meta.statusFlags != null) pt.meta.statusFlags = meta.statusFlags
  }
}

/* ───────────── hourly helpers ───────────── */
function ensure(obj, key) {
  if (!obj[key]) obj[key] = reactive(Object.create(null))
  return obj[key]
}
function ensureHourlyBucket(category, period) {
  const cat = ensure(metrics.hourly, category)
  const per = ensure(cat, period)
  if (!per.latest) per.latest = null
  if (!per.slot) per.slot = reactive([])
  return per
}
function pushHourly(category, period, row) {
  const bucket = ensureHourlyBucket(category, period)
  bucket.latest = row
  bucket.slot.push(row)
  if (bucket.slot.length > MAX_KEEP) bucket.slot.splice(0, bucket.slot.length - MAX_KEEP)
}

/* ───────────────── connect + route ───────────────── */
function ensureConnected() {
  if (client) return
  client = mqtt.connect('ws://127.0.0.1:9001', {
    username: 'cavillpc',
    password: '04.Cc47Cc777',
    reconnectPeriod: 3000,
    keepalive: 60,
    clean: true,
    clientId: 'web_' + Math.random().toString(16).slice(2),
    // If your broker supports MQTT v5 you can uncomment the next line
    // to explicitly control retain handling during subscribe.
    // protocolVersion: 5,
  })

  client.on('connect', () => {
    mqttConnected.value = true

    // If using MQTT v5, you can pass retainHandling=0 to always receive retained.
    const subOpts = { qos: 0 /*, properties: { retainHandling: 0, retainAsPublished: true }*/ }

    client.subscribe('bms/data/#', subOpts)
    client.subscribe('bms/metrics/#', subOpts)
    client.subscribe('bms/trend/#', subOpts)
    client.subscribe('bms/calculation/hourly/#', subOpts) // hourly calcs (business & afterhours)
  })

  client.on('close', () => {
    mqttConnected.value = false
  })
  client.on('error', e => console.error('MQTT error', e))

  // include 'packet' to read the retain flag
  client.on('message', (topic, payloadBuf, packet) => {
    let data
    const payloadStr = new TextDecoder().decode(payloadBuf)
    try {
      data = JSON.parse(payloadStr)
    } catch {
      recordDebug(topic, packet, payloadStr)
      return
    }
    recordDebug(topic, packet, data)

    const isRetained = !!packet?.retain

    /* ───────── BMS DATA ───────── */
    if (topic.startsWith('bms/data/')) {
      const parts = topic.split('/')
      const controller = parts[2]
      const typeRaw = parts[3] || ''
      const id = parts[4]

      const normType = (typeRaw || '').toLowerCase().replace(/[^a-z]/g, '')
      let type = null
      if (normType.includes('analoginput')) type = 'analogInput'
      else if (normType.includes('analogoutput')) type = 'analogOutput'
      else if (normType.includes('analogvalue')) type = 'analogValue'
      else if (normType.includes('binaryinput')) type = 'binaryInput'
      else if (normType.includes('binaryoutput')) type = 'binaryOutput'
      else if (normType.includes('binaryvalue')) type = 'binaryValue'
      else if (normType.includes('multistateinput')) type = 'multiStateInput'
      else if (normType.includes('multistateoutput')) type = 'multiStateOutput'
      else if (normType.includes('multistatevalue')) type = 'multiStateValue'

      if (!controller || !type || !id) {
        upsertLive(controllerFromTopicOrPayload(topic, data), { ...data, _retained: isRetained })
        return
      }

      const tsISO =
        data?._ts_sgt ||
        data?.ts_sgt ||
        data?.ts_utc ||
        (data?._ts ? new Date(data._ts * 1000).toISOString() : null) ||
        new Date().toISOString()

      const payloadObj = {
        ...data,
        _type: type,
        _instance: id,
        _ts_sgt: tsISO,
        _retained: isRetained,
        _arrivedAt: new Date().toISOString(),
      }
      const ctrlNode = ensure(live.bms.data, controller)
      const typeNode = ensure(ctrlNode, type)
      typeNode[id] = payloadObj
      upsertLive(controller, payloadObj)
      return
    }

    /* ───────── METRICS ───────── */
    if (topic.startsWith('bms/metrics/')) {
      const parts = topic.split('/')
      let metric = parts[2]
      if (metric === 'water' || metric === 'campuswater') metric = 'waterside'
      if (!metric) return

      const store = metrics[metric] || (metrics[metric] = { latest: null, slot: [] })
      if (data && typeof data === 'object' && ('latest' in data || 'slot' in data)) {
        if (data.latest) store.latest = data.latest
        if (Array.isArray(data.slot)) store.slot = data.slot
      } else {
        store.slot.push(data)
        if (store.slot.length > MAX_KEEP) store.slot.splice(0, store.slot.length - MAX_KEEP)
      }
      return
    }

    /* ───────── TREND ───────── */
    if (topic.startsWith('bms/trend/')) {
      const parts = topic.split('/')
      if (parts.length >= 5) {
        const maybeController = parts[2]
        const maybeTypeRaw = (parts[3] || '').toLowerCase()
        const maybeId = parts[4]
        let maybeType = null
        if (maybeTypeRaw.includes('analoginput')) maybeType = 'analogInput'
        else if (maybeTypeRaw.includes('analogoutput')) maybeType = 'analogOutput'
        else if (maybeTypeRaw.includes('analogvalue')) maybeType = 'analogValue'
        if (maybeController && maybeType && maybeId) {
          const tsISO =
            data?.minute_iso ||
            data?._ts_sgt ||
            data?.ts_sgt ||
            data?.ts_utc ||
            (typeof data?.ts === 'number'
              ? new Date(data.ts * 1000).toISOString()
              : new Date().toISOString())
          const value =
            (typeof data === 'object' && 'value' in data) ? data.value :
            (typeof data === 'object' && 'presentValue' in data) ? data.presentValue :
            data
          const meta = {
            units: data?.units ?? null,
            reliability: data?.reliability ?? null,
            objectName: data?.objectName ?? null,
            statusFlags: data?.statusFlags ?? null,
          }
          const pointKey = `${maybeType}/${maybeId}`
          appendPointSample(maybeController, pointKey, value, tsISO, maybeType, meta)
          return
        }
      }
      if (parts.length >= 3) {
        const key = parts[2]
        const minute_iso =
          data?.minute_iso ||
          data?._ts_sgt ||
          data?.ts_sgt ||
          data?.ts_utc ||
          (typeof data?.ts === 'number' ? new Date(data.ts * 1000).toISOString() : null)
        const frame = minute_iso ? { ...data, minute_iso } : data
        pushTrendFrame(key, frame)
        const ctrlBucket = ensureTrendPointsController(key)
        ctrlBucket.latestFrameTs = minute_iso || null
        if (frame && frame.values && typeof frame.values === 'object') {
          const tsISO = frame.minute_iso || new Date().toISOString()
          for (const [k, v] of Object.entries(frame.values)) {
            appendPointSample(key, k, v, tsISO, null, null)
          }
        }
        return
      }
    }

    /* ───────── HOURLY calculation ─────────
       Topics supported:
       - bms/calculation/hourly/<category>
       - bms/calculation/hourly/afterhours/<category>
    */
    if (topic.startsWith('bms/calculation/hourly/')) {
      const parts = topic.split('/') // 0:bms 1:calculation 2:hourly 3:(afterhours|category) 4:(category?)
      let period = 'business'
      let category = null

      if (parts[3] === 'afterhours') {
        period = 'afterhours'
        category = parts[4] || null
      } else {
        category = parts[3] || null
      }
      if (!category) return

      const tsHour = 
        data?.ts_hour || 
        data?.ts_slot ||
        data?.minute_iso ||
        data?.ts_utc ||
        (typeof data?.ts === 'number' ? new Date(data.ts * 1000).toISOString() : null)

      let tsLocal = '-'
      if (tsHour) {
        const d = new Date(tsHour)
        if (!isNaN(d)) {
          tsLocal = d.toLocaleString([], {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })
        }
      }
      const row = { ...data, ts_hour: tsHour, _ts_local: tsLocal } // ensure ts_hour exists
      const bucket = ensureHourlyBucket(category, period)
      bucket.latest = row
      bucket.slot.push(row)
      if (bucket.slot.length > MAX_KEEP) bucket.slot.splice(0, bucket.slot.length - MAX_KEEP)
      return
    }
  })
}


/* ───────────────── utilities ───────────────── */
function resubscribeData() {
  if (!client) return
  // Force a re-subscribe to trigger retained delivery (if any exist on broker)
  client.unsubscribe('bms/data/#', () => {
    const subOpts = { qos: 0 /*, properties: { retainHandling: 0, retainAsPublished: true }*/ }
    client.subscribe('bms/data/#', subOpts)
  })
}

function getRetainedPoints(controllerKey) {
  const out = []
  const node = live?.bms?.data?.[controllerKey] || {}
  for (const type of Object.keys(node)) {
    const map = node[type] || {}
    for (const [instance, p] of Object.entries(map)) {
      if (p?._retained) {
        out.push({
          controller: controllerKey,
          type,
          instance,
          objectName: p.objectName ?? '',
          presentValue: p.presentValue ?? p.value ?? null,
          units: p.units ?? '',
          retained: !!p._retained,
          updatedAt: p._ts_sgt || p.ts_utc || p._arrivedAt || null,
        })
      }
    }
  }
  return out
}

function getAnyRetainedCounts() {
  const results = []
  const devices = live?.bms?.data || {}
  for (const devKey of Object.keys(devices)) {
    const pts = getRetainedPoints(devKey)
    results.push({ device: devKey, retainedCount: pts.length })
  }
  return results
}

/* OPTIONAL: publish a retained test message (use from browser console) */
function publishTestRetained(controller = 'Chiller_ITE_1210_1210') {
  if (!client) return { ok: false, error: 'client not connected' }
  const topic = `bms/data/${controller}/analogInput/999`
  const msg = {
    presentValue: 123.45,
    statusFlags: '',
    reliability: 'no-fault-detected',
    objectName: 'TEST1_Value',
    units: 'units'
  }
  client.publish(topic, JSON.stringify(msg), { qos: 0, retain: true }, (err) => {
    if (err) console.error('publishTestRetained error:', err)
  })
  return { ok: true, topic }
}

/* expose some debug helpers on window for quick testing */
if (typeof window !== 'undefined') {
  window.$mqtt = {
    resubscribeData,
    getRetainedPoints,
    getAnyRetainedCounts,
    debug
  }
}

/* ───────────────── public API ───────────────── */
export function useMqtt() {
  return {
    ensureConnected,
    mqttConnected,
    live,
    metrics,
    getTrendFrame(controllerOrName) {
      return metrics.trend?.[controllerOrName] || null
    },
    getTrendSeries(controller, pointKey) {
      return metrics.trendPoints?.[controller]?.points?.[pointKey] || null
    },
    getHourly(category, period = 'business') {
      return metrics.hourly?.[category]?.[period] || null
    },
    // retained helpers
    getRetainedPoints,
    getAnyRetainedCounts,
    resubscribeData,
    publishTestRetained, // optional
    debug,               // expose debug ring buffer to components if needed
  }
}
