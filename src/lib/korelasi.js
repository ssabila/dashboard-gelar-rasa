import { POLLUTANTS } from './constants'
import { formatNumber } from './formatters'

/* Aturan domain modul Korelasi Polutan (Tujuan 3). Fungsi murni, tanpa React.
 * Semua angka berasal dari public/data/korelasi/t3_tabel.json (+ scatter/<STASIUN>.json),
 * yaitu salinan tabel preprocessing; tidak ada korelasi yang dihitung ulang di browser. */

export const POLLUTANT_ORDER = ['pm25', 'pm10', 'so2', 'co', 'o3', 'no2']
export const polLabel = (k) => POLLUTANTS[k]?.label ?? k
export const polUnit = (k) => POLLUTANTS[k]?.unit ?? 'µg/m³'

/** Lima variabel numerik. kind: met = korelasi per stasiun (median 22 stasiun) | loc = Spearman antar-22 stasiun. */
export const FACTORS = {
  temperature: { label: 'Suhu',                    unit: '°C',            kind: 'met', nav: 'meteorologi' },
  humidity:    { label: 'Kelembapan',              unit: '%',             kind: 'met', nav: 'meteorologi' },
  wind_speed:  { label: 'Kecepatan angin',         unit: 'm/s',           kind: 'met', nav: 'meteorologi' },
  lalu_lintas: { label: 'Intensitas lalu lintas',  unit: 'kendaraan/jam', kind: 'loc', nav: 'karakteristik', col: 'intensitas_lalu_lintas' },
  jarak_jalan: { label: 'Jarak ke jalan raya',     unit: 'm',             kind: 'loc', nav: 'karakteristik', col: 'jarak_ke_jalan_raya_m' },
}
export const MET_KEYS = ['temperature', 'humidity', 'wind_speed']
export const LOC_KEYS = ['lalu_lintas', 'jarak_jalan']
export const FACTOR_KEYS = [...MET_KEYS, ...LOC_KEYS]

/** Urutan 8 sektor sesuai data (kode → nama Indonesia dari tabel). */
export const SECTORS = [
  { code: 'N', name: 'Utara' }, { code: 'NE', name: 'Timur Laut' }, { code: 'E', name: 'Timur' }, { code: 'SE', name: 'Tenggara' },
  { code: 'S', name: 'Selatan' }, { code: 'SW', name: 'Barat Daya' }, { code: 'W', name: 'Barat' }, { code: 'NW', name: 'Barat Laut' },
]
export const SECTOR_NAMES = SECTORS.map((s) => s.name)

/** Lima tipe lokasi (tipe_lokasi_updated) + warna tetap. */
export const GROUP_ORDER = ['Lalu lintas', 'Perkotaan', 'Industri', 'Gambut', 'Latar bersih/regional']
export const GROUP_COLORS = {
  'Latar bersih/regional': '#5FA8A0',
  'Perkotaan':             '#384E77',
  'Lalu lintas':           '#E8833A',
  'Industri':              '#8E5BB5',
  'Gambut':                '#9A7B2F',
}

/* ─── Format ─────────────────────────────────────────────────────────── */

/** Koefisien 3 desimal dengan tanda: +0,762 / −0,691 */
export function fmtRho(r) {
  if (r == null || Number.isNaN(r)) return 'NA'
  return `${r < 0 ? '−' : '+'}${formatNumber(Math.abs(r), 3)}`
}
export function fmtP(p) {
  if (p == null || Number.isNaN(p)) return 'NA'
  return p < 0.001 ? '< 0,001' : formatNumber(p, 3)
}
/** Konsentrasi menurut skala polutan (CO ratusan → 0 desimal). */
export function fmtConc(v, pol) {
  if (v == null || Number.isNaN(v)) return 'NA'
  return formatNumber(v, pol === 'co' ? 0 : 1)
}
/** Nilai sumbu/tabel faktor numerik. */
export function fmtFactor(v, key) {
  if (v == null || Number.isNaN(v)) return 'NA'
  if (key === 'lalu_lintas' || key === 'jarak_jalan') return formatNumber(v, 0)
  return formatNumber(v, 1)
}

/** Kategori kekuatan |ρ| — dipakai konsisten di seluruh halaman dan dijelaskan di legenda. */
export const STRENGTH_BANDS = [
  { max: 0.2, label: 'sangat lemah', range: '|ρ| < 0,2' },
  { max: 0.4, label: 'lemah',        range: '0,2 ≤ |ρ| < 0,4' },
  { max: 0.6, label: 'sedang',       range: '0,4 ≤ |ρ| < 0,6' },
  { max: 0.8, label: 'kuat',         range: '0,6 ≤ |ρ| < 0,8' },
  { max: Infinity, label: 'sangat kuat', range: '|ρ| ≥ 0,8' },
]
export function strengthLabel(r) {
  const a = Math.abs(r)
  return STRENGTH_BANDS.find((b) => a < b.max).label
}
export const directionLabel = (r) => (r > 0 ? 'positif' : r < 0 ? 'negatif' : 'tidak ada arah')
/** Kalimat netral (bukan sebab-akibat). */
export function describeRho(r, a, b) {
  if (r == null || Number.isNaN(r)) return 'Koefisien tidak tersedia.'
  const s = strengthLabel(r)
  if (Math.abs(r) < 0.2) return `Hubungan monoton ${a}–${b} ${s} (ρ ${fmtRho(r)}).`
  return r > 0
    ? `${a} yang lebih tinggi cenderung bersama ${b} yang lebih tinggi (hubungan ${s}, ρ ${fmtRho(r)}).`
    : `${a} yang lebih tinggi cenderung bersama ${b} yang lebih rendah (hubungan ${s}, ρ ${fmtRho(r)}).`
}

/* ─── Statistik ringan untuk tampilan ───────────────────────────────── */

/** Kuantil linear (sama dengan pandas default). values boleh tak terurut. */
export function quantile(values, q) {
  const a = values.filter((v) => v != null && !Number.isNaN(v)).sort((x, y) => x - y)
  if (!a.length) return null
  const pos = (a.length - 1) * q
  const lo = Math.floor(pos)
  return a[lo] + (a[Math.min(lo + 1, a.length - 1)] - a[lo]) * (pos - lo)
}

/** Boxplot Tukey dari sekumpulan nilai (dipakai untuk median-stasiun). */
export function boxStats(values) {
  const a = values.filter((v) => v != null && !Number.isNaN(v)).sort((x, y) => x - y)
  if (!a.length) return null
  const q1 = quantile(a, 0.25); const med = quantile(a, 0.5); const q3 = quantile(a, 0.75)
  const iqr = q3 - q1
  const inside = a.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr)
  return { n: a.length, min: inside[0], q1, med, q3, max: inside.at(-1), iqr, outliers: a.filter((v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr) }
}

/** Garis tren visual: median y per kelas x (kelas berisi kuantil sama banyak). Panduan visual, bukan model. */
export function binnedMedian(xs, ys, bins = 20) {
  const idx = []
  for (let i = 0; i < xs.length; i++) if (xs[i] != null && ys[i] != null) idx.push(i)
  if (idx.length < bins * 5) return []
  idx.sort((a, b) => xs[a] - xs[b])
  const out = []
  const size = idx.length / bins
  for (let b = 0; b < bins; b++) {
    const part = idx.slice(Math.floor(b * size), Math.floor((b + 1) * size))
    if (!part.length) continue
    const x = quantile(part.map((i) => xs[i]), 0.5)
    const y = quantile(part.map((i) => ys[i]), 0.5)
    if (!out.length || out.at(-1)[0] !== x) out.push([x, y])
  }
  return out
}

/** Regresi linear biasa (hanya untuk garis panduan pada 22 titik). */
export function linearFit(points) {
  const p = points.filter(([x, y]) => x != null && y != null)
  const n = p.length
  if (n < 3) return null
  const mx = p.reduce((s, q) => s + q[0], 0) / n
  const my = p.reduce((s, q) => s + q[1], 0) / n
  const sxx = p.reduce((s, q) => s + (q[0] - mx) ** 2, 0)
  if (sxx === 0) return null
  const slope = p.reduce((s, q) => s + (q[0] - mx) * (q[1] - my), 0) / sxx
  return { slope, intercept: my - slope * mx }
}

/** "2024-01-01T00:00" + indeks jam → "2024-03-05 14:00" (waktu lokal data, tanpa zona). */
export function hourLabel(t0, h) {
  const d = new Date(Date.parse(`${t0}:00Z`) + h * 3600000)
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

/** Median dari median-stasiun per arah/tipe, dsb. — ringkas untuk insight. */
export const maxBy = (arr, f) => arr.reduce((b, x) => (b == null || f(x) > f(b) ? x : b), null)
export const minBy = (arr, f) => arr.reduce((b, x) => (b == null || f(x) < f(b) ? x : b), null)

/* ─── Indeks tabel Tujuan 3 (hanya penataan, tanpa perhitungan korelasi) ─── */

/** Memetakan t3_tabel.json menjadi struktur siap pakai: sel heatmap, indeks detail, stasiun. */
export function indexTables(t) {
  const cells = {}
  for (const k of MET_KEYS) cells[k] = {}
  for (const r of t.median_korelasi) {
    cells[r.variabel][r.polutan] = { rho: r.median_spearman, n: r.jumlah_stasiun_valid, min: r.min_rho, max: r.maks_rho, sub: `median dari ${r.jumlah_stasiun_valid} stasiun (rentang ${fmtRho(r.min_rho)} s.d. ${fmtRho(r.maks_rho)})` }
  }
  for (const k of LOC_KEYS) cells[k] = {}
  for (const r of t.korelasi_karakteristik) {
    cells[r.variabel_karakteristik][r.polutan] = { rho: r.spearman_rho, n: r.jumlah_stasiun_valid, p: r.p_value, sub: `antar-${r.jumlah_stasiun_valid} stasiun (satu titik = satu stasiun)` }
  }
  const detail = new Map(t.detail_korelasi.map((r) => [`${r.stasiun}|${r.variabel_meteorologi}|${r.polutan}`, r]))
  const stations = [...t.stasiun].sort((a, b) => a.stasiun.localeCompare(b.stasiun))
  const byCode = Object.fromEntries(stations.map((s) => [s.stasiun, s]))
  return { cells, detail, stations, byCode }
}
