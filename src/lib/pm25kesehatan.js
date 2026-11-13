import { formatNumber } from './formatters'

/* Aturan domain modul PM2.5 & Kesehatan (Tujuan 4). Fungsi murni, tanpa React.
 * Semua angka berasal dari public/data/pm25-kesehatan/t4.json (salinan tabel preprocessing):
 * Z-score, CCF, dan ringkasan ISPA TIDAK dihitung ulang di browser. */

/** Tujuh seri Z-score (nama persis seperti di data_zscore_harian) + warna & satuan nilai asli. */
export const SERIES = [
  { id: 'PM2.5',          color: '#2E6FBF', unit: 'µg/m³',         raw: 'median PM2.5 harian antar-stasiun', width: 2.6 },
  { id: 'ISPA balita',    color: '#EA7A2B', unit: 'kasus/RS/hari', raw: 'rata-rata kasus per RS' },
  { id: 'ISPA lansia',    color: '#8E5BB5', unit: 'kasus/RS/hari', raw: 'rata-rata kasus per RS' },
  { id: 'Asma',           color: '#2F9E8F', unit: 'kasus/RS/hari', raw: 'rata-rata kasus per RS' },
  { id: 'PPOK',           color: '#9A7B2F', unit: 'kasus/RS/hari', raw: 'rata-rata kasus per RS' },
  { id: 'Kardiovaskular', color: '#D1495B', unit: 'kasus/RS/hari', raw: 'rata-rata kasus per RS' },
  { id: 'Kematian',       color: '#55706E', unit: 'kasus/RS/hari', raw: 'rata-rata kasus per RS' },
]
export const SERIES_BY_ID = Object.fromEntries(SERIES.map((s) => [s.id, s]))
/** Enam indikator kesehatan (tanpa PM2.5). */
export const INDICATORS = SERIES.slice(1).map((s) => s.id)
export const BALITA_COLOR = SERIES_BY_ID['ISPA balita'].color
export const LANSIA_COLOR = SERIES_BY_ID['ISPA lansia'].color

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
/** "2025-03-05" → "5 Mar 2025" */
export function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${BULAN[m - 1]} ${y}`
}
export const fmtNum = (v, d = 2) => (v == null || Number.isNaN(v) ? 'NA' : formatNumber(v, d))
/** Koefisien dengan tanda: +0,277 / −0,061 */
export function fmtCoef(r, d = 3) {
  if (r == null || Number.isNaN(r)) return 'NA'
  return `${r < 0 ? '−' : '+'}${formatNumber(Math.abs(r), d)}`
}
/** Z-score dengan tanda dan 2 desimal. */
export const fmtZ = (z) => fmtCoef(z, 2)

/** Indeks tanggal [start, end] inklusif pada array tanggal ISO terurut. */
export function rangeIdx(dates, start, end) {
  let a = 0
  let b = dates.length - 1
  while (a < dates.length && dates[a] < start) a++
  while (b >= 0 && dates[b] > end) b--
  return [a, b]
}

/** Kategori kekuatan |r| pada CCF (sama dengan kategori korelasi di Tujuan 3). */
export function strengthLabel(r) {
  const a = Math.abs(r)
  if (a < 0.2) return 'sangat lemah'
  if (a < 0.4) return 'lemah'
  if (a < 0.6) return 'sedang'
  if (a < 0.8) return 'kuat'
  return 'sangat kuat'
}

/** Rangkum baris hasil_ccf satu indikator: lag di luar CI dan lag terkuat (sesuai ringkasan_ccf). */
export function ccfRows(ccf, indikator) {
  return ccf.filter((r) => r.indikator_kesehatan === indikator).sort((a, b) => a.lag - b.lag)
}
