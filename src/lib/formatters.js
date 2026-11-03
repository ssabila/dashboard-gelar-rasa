import { ISPU_CATEGORIES, PM25_BREAKPOINTS, MONTH_NAMES } from './constants'

/* ─── ISPU ───────────────────────────────────────────────────────────────
 * Konversi konsentrasi PM2.5 (µg/m³) ke nilai ISPU (linear interpolasi)
 * dan kembalikan objek kategori lengkap.
 * ─────────────────────────────────────────────────────────────────────── */
export function calcIspu(pm25) {
  if (pm25 == null || isNaN(pm25)) return null

  const bp = PM25_BREAKPOINTS.find(
    (b) => pm25 >= b.concLow && pm25 <= b.concHigh
  ) ?? PM25_BREAKPOINTS.at(-1)

  const ispu = Math.round(
    ((bp.ispuHigh - bp.ispuLow) / (bp.concHigh - bp.concLow)) *
      (pm25 - bp.concLow) +
      bp.ispuLow
  )

  return { value: ispu, ...getIspuCategory(ispu) }
}

/**
 * Ambil kategori ISPU berdasarkan nilai ISPU (bukan konsentrasi).
 * @param {number} ispuValue
 * @returns {object} objek dari ISPU_CATEGORIES
 */
export function getIspuCategory(ispuValue) {
  return (
    ISPU_CATEGORIES.find(
      (c) => ispuValue >= c.range[0] && ispuValue <= c.range[1]
    ) ?? ISPU_CATEGORIES.at(-1)
  )
}

/**
 * Ambil kategori ISPU langsung dari konsentrasi PM2.5.
 * Shorthand untuk Badge dan StationMap.
 * @param {number} pm25  konsentrasi µg/m³
 */
export function getIspuFromPm25(pm25) {
  if (pm25 == null || isNaN(pm25)) return null
  const ispu = calcIspu(pm25)
  return ispu ? getIspuCategory(ispu.value) : null
}

/* ─── Angka & Satuan ─────────────────────────────────────────────────── */

/**
 * Format konsentrasi polutan dengan satuan.
 * @param {number} value
 * @param {string} unit   default 'µg/m³'
 * @param {number} digits desimal (default 1)
 */
export function formatConc(value, unit = 'µg/m³', digits = 1) {
  if (value == null || isNaN(value)) return '—'
  return `${Number(value).toFixed(digits)} ${unit}`
}

/** Format PM2.5 khusus — lebih singkat */
export function formatPm25(value) {
  return formatConc(value, 'µg/m³', 1)
}

/**
 * Format angka besar dengan pemisah ribuan.
 * @param {number} value
 * @param {number} digits desimal (default 0)
 */
export function formatNumber(value, digits = 0) {
  if (value == null || isNaN(value)) return '—'
  return Number(value).toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** Format persen */
export function formatPct(value, digits = 1) {
  if (value == null || isNaN(value)) return '—'
  return `${Number(value).toFixed(digits)}%`
}

/* ─── Tanggal & Waktu ───────────────────────────────────────────────── */

/**
 * Format tanggal ke 'Jan 2024' (untuk label axis).
 * @param {string|Date} date
 */
export function formatMonthLabel(date) {
  const d = new Date(date)
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Format tanggal ke '1 Jan 2024'.
 * @param {string|Date} date
 */
export function formatDate(date) {
  const d = new Date(date)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format jam ke '07.00' (untuk label diurnal).
 * @param {number} hour  0–23
 */
export function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}.00`
}

/* ─── Nama & Label ──────────────────────────────────────────────────── */

/**
 * Potong teks panjang dengan ellipsis.
 * @param {string} text
 * @param {number} maxLen  default 28
 */
export function truncate(text, maxLen = 28) {
  if (!text) return ''
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
}

/**
 * Ambil kode stasiun pendek dari sensor_id, misal 'SENS-001' → 'S-001'.
 * Dipakai di axis chart yang sempit.
 */
export function shortSensorLabel(sensorId) {
  if (!sensorId) return ''
  return sensorId.replace('SENS-', 'S-')
}
