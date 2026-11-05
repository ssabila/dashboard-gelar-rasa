import { ISPU_CATEGORIES } from './constants'
import { getIspuFromPm25 } from './formatters'

/* ─── Konstanta domain halaman Kecukupan Stasiun ───────────────────────── */

export const NO_DATA = '#E5E7EB'

export const PERAN_COLORS = {
  Kritis: '#F87171',
  Sedang: '#FACC15',
  Redundan: '#60A5FA',
}

export const PULAU_ORDER = [
  'Sumatera', 'Jawa', 'Kalimantan', 'Sulawesi', 'Bali & Nusa Tenggara', 'Maluku', 'Papua',
]

export const METRICS = [
  { id: 'jarak', label: 'Jarak', hint: 'Jarak titik representatif kabupaten ke stasiun terdekat.' },
  { id: 'cov',   label: 'Cakupan', hint: 'Persentase luas daratan kabupaten dalam radius stasiun.' },
  { id: 'gap',   label: 'Gap score', hint: 'Skor prioritas gabungan; makin tinggi makin butuh stasiun.' },
  { id: 'pm25',  label: 'PM2.5', hint: 'Estimasi PM2.5 (IDW dari stasiun sekitar). Makin jauh dari stasiun, makin tidak pasti.' },
  { id: 'bivar', label: 'PM2.5 × Jarak', hint: 'PM2.5 tinggi dan jauh dari stasiun = wilayah paling terlewat.' },
]

export const DEFAULT_WEIGHTS = { jarak: 0.3, pm25: 0.3, luas: 0.25, sumber: 0.15 }

export const GAP_COMPONENTS = [
  { key: 'jarak',  norm: 'jarak_norm',  label: 'Jarak ke stasiun',     color: '#384E77' },
  { key: 'pm25',   norm: 'pm25_norm',   label: 'Estimasi PM2.5',       color: '#FB923C' },
  { key: 'luas',   norm: 'luas_norm',   label: 'Luas tak terlayani',   color: '#8BBEB2' },
  { key: 'sumber', norm: 'sumber_norm', label: 'Proxy sumber polusi',  color: '#C084FC' },
]

/* ─── Warna ────────────────────────────────────────────────────────────── */

const RAMPS = {
  jarak: ['#E6F3EF', '#8BBEB2', '#F5B642', '#EF6B3B', '#B91C1C'],
  gap:   ['#FEF6D8', '#FCD34D', '#FB923C', '#DC2626', '#6B21A8'],
  cov:   ['#F1F5F9', '#BFD9D2', '#8BBEB2', '#4E7A9B', '#18314F'],
}

// Baris = PM2.5 (rendah → tinggi), kolom = jarak (dekat → jauh)
export const BIVAR = [
  ['#EDF1F5', '#BFD0E6', '#7FA3D1'],
  ['#F7DDB6', '#C9B9B0', '#8C8FAE'],
  ['#F59E4B', '#C9695F', '#8E2F6B'],
]

const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

export function rampColor(stops, t) {
  if (!Number.isFinite(t)) return NO_DATA
  const c = Math.min(1, Math.max(0, t))
  const x = c * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(x))
  const f = x - i
  const a = toRgb(stops[i])
  const b = toRgb(stops[i + 1])
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`
}

export function quantile(sorted, q) {
  if (!sorted.length) return NaN
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

const bucket = (v, [a, b]) => (v <= a ? 0 : v <= b ? 1 : 2)

/* ─── Gap score (dihitung ulang di browser saat bobot diubah) ──────────── */

export function computeGap(row, weights) {
  const sum = GAP_COMPONENTS.reduce((s, c) => s + (weights[c.key] ?? 0), 0)
  if (!sum) return 0
  return GAP_COMPONENTS.reduce((s, c) => s + (weights[c.key] ?? 0) * (row[c.norm] ?? 0), 0) / sum
}

export function buildGapMap(rows, weights) {
  const m = new Map()
  rows.forEach((r) => m.set(r.kab_id, computeGap(r, weights)))
  return m
}

/* ─── Konteks skala (domain warna) ─────────────────────────────────────── */

export function buildContext(rows, radius, gapById) {
  const sortedOf = (k) => rows.map((r) => r[k]).filter(Number.isFinite).sort((a, b) => a - b)
  const d = sortedOf('jarak_km')
  const p = sortedOf('pm25_idw')
  const g = [...gapById.values()].filter(Number.isFinite)
  return {
    radius,
    gapById,
    jarakMax: quantile(d, 0.95) || 1,
    jarakQ: [quantile(d, 1 / 3), quantile(d, 2 / 3)],
    pm25Q: [quantile(p, 1 / 3), quantile(p, 2 / 3)],
    gapMin: g.length ? Math.min(...g) : 0,
    gapMax: g.length ? Math.max(...g) : 1,
  }
}

/* ─── Warna & nilai per kabupaten ──────────────────────────────────────── */

export function kabColor(p, metric, ctx) {
  switch (metric) {
    case 'jarak':
      return rampColor(RAMPS.jarak, p.jarak_km / ctx.jarakMax)
    case 'cov':
      return rampColor(RAMPS.cov, (p[`cov_pct_${ctx.radius}`] ?? NaN) / 100)
    case 'gap': {
      const v = ctx.gapById.get(p.kab_id)
      return rampColor(RAMPS.gap, (v - ctx.gapMin) / ((ctx.gapMax - ctx.gapMin) || 1))
    }
    case 'pm25':
      return getIspuFromPm25(p.pm25_idw)?.color ?? NO_DATA
    case 'bivar': {
      if (!Number.isFinite(p.pm25_idw) || !Number.isFinite(p.jarak_km)) return NO_DATA
      return BIVAR[bucket(p.pm25_idw, ctx.pm25Q)][bucket(p.jarak_km, ctx.jarakQ)]
    }
    default:
      return NO_DATA
  }
}

export function formatKabValue(p, metric, ctx) {
  const n = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—')
  switch (metric) {
    case 'jarak': return `${n(p.jarak_km)} km ke ${p.stasiun_terdekat}`
    case 'cov':   return `${n(p[`cov_pct_${ctx.radius}`])}% tercakup (${ctx.radius} km)`
    case 'gap':   return `Gap score ${n(ctx.gapById.get(p.kab_id), 2)}`
    case 'pm25':  return `±${n(p.pm25_idw, 1)} µg/m³ (estimasi)`
    case 'bivar': return `PM2.5 ±${n(p.pm25_idw, 1)} · ${n(p.jarak_km)} km dari stasiun`
    default:      return ''
  }
}

/* ─── Spesifikasi legenda ──────────────────────────────────────────────── */

export function legendFor(metric, ctx) {
  switch (metric) {
    case 'jarak':
      return { type: 'gradient', stops: RAMPS.jarak, min: '0 km', max: `≥ ${Math.round(ctx.jarakMax)} km`, title: 'Jarak ke stasiun terdekat' }
    case 'cov':
      return { type: 'gradient', stops: RAMPS.cov, min: '0%', max: '100%', title: `Luas tercakup (radius ${ctx.radius} km)` }
    case 'gap':
      return { type: 'gradient', stops: RAMPS.gap, min: 'Rendah', max: 'Tinggi', title: 'Gap score (bobot saat ini)' }
    case 'pm25':
      return {
        type: 'categories',
        title: 'Estimasi PM2.5 menurut kategori ISPU',
        items: ISPU_CATEGORIES.map((c) => ({ label: c.label, color: c.color })),
      }
    case 'bivar':
      return {
        type: 'bivar',
        title: 'PM2.5 × jarak ke stasiun',
        grid: BIVAR,
        rowLabel: 'PM2.5 estimasi →',
        colLabel: 'Jarak ke stasiun →',
      }
    default:
      return null
  }
}
