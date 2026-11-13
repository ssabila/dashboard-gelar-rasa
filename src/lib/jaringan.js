import { formatNumber } from './formatters'

export const COMP_THRESHOLD = 85
export const FAR_KM = 400

// Sama dengan ISLAND_BY_PROVINCE di NetworkMap.jsx
const ISLAND_BY_PROVINCE = {
  ACEH: 'Sumatera', 'SUMATERA UTARA': 'Sumatera', 'SUMATERA BARAT': 'Sumatera',
  RIAU: 'Sumatera', JAMBI: 'Sumatera', 'SUMATERA SELATAN': 'Sumatera',
  BENGKULU: 'Sumatera', LAMPUNG: 'Sumatera', 'KEPULAUAN BANGKA BELITUNG': 'Sumatera',
  'KEPULAUAN RIAU': 'Sumatera', 'DKI JAKARTA': 'Jawa', 'JAWA BARAT': 'Jawa',
  'JAWA TENGAH': 'Jawa', 'DI YOGYAKARTA': 'Jawa', 'JAWA TIMUR': 'Jawa', BANTEN: 'Jawa',
  BALI: 'Bali-Nusa Tenggara', 'NUSA TENGGARA BARAT': 'Bali-Nusa Tenggara',
  'NUSA TENGGARA TIMUR': 'Bali-Nusa Tenggara',
  'KALIMANTAN BARAT': 'Kalimantan', 'KALIMANTAN TENGAH': 'Kalimantan',
  'KALIMANTAN SELATAN': 'Kalimantan', 'KALIMANTAN TIMUR': 'Kalimantan',
  'KALIMANTAN UTARA': 'Kalimantan', 'SULAWESI UTARA': 'Sulawesi',
  'SULAWESI TENGAH': 'Sulawesi', 'SULAWESI SELATAN': 'Sulawesi',
  'SULAWESI TENGGARA': 'Sulawesi', GORONTALO: 'Sulawesi', 'SULAWESI BARAT': 'Sulawesi',
  MALUKU: 'Maluku', 'MALUKU UTARA': 'Maluku', 'PAPUA BARAT': 'Papua', PAPUA: 'Papua',
  'PAPUA SELATAN': 'Papua', 'PAPUA TENGAH': 'Papua', 'PAPUA PEGUNUNGAN': 'Papua',
  'PAPUA BARAT DAYA': 'Papua',
}

const islandOf = (s) =>
  s.pulau || ISLAND_BY_PROVINCE[String(s.provinsi ?? '').trim().toUpperCase()] || 'Lainnya'

function sensorStatusOf(s) {
  const statuses = String(s.sensor_status ?? '').split(',').map((x) => x.trim())
  if (statuses.includes('Defective')) return 'Defective'
  if (statuses.includes('Intermittent')) return 'Intermittent'
  if (statuses.includes('Active')) return 'Active'
  return 'Unknown'
}

/**
 * Menghitung angka jaringan dengan logika yang sama seperti halaman Kecukupan Stasiun.
 * Mengembalikan null selama data belum lengkap.
 */
export function buildJaringanStats({ summary, stationsRaw, comp, nearest }) {
  if (!summary || !stationsRaw || !comp || !nearest) return null

  const nnBy = new Map(nearest.map((n) => [n.location_id, n]))

  // Kelengkapan per lokasi = rata-rata antarparameter (sama dengan halaman)
  const acc = new Map()
  for (const r of comp) {
    const v = Number(r.completeness_pct)
    if (r.completeness_pct == null || !Number.isFinite(v)) continue
    const a = acc.get(r.location_id) ?? { sum: 0, n: 0 }
    a.sum += v
    a.n += 1
    acc.set(r.location_id, a)
  }

  const stations = stationsRaw.map((s) => {
    const a = acc.get(s.location_id)
    const nn = nnBy.get(s.location_id)
    return {
      code: s.station_code,
      kota: s.kota_kabupaten,
      provinsi: s.provinsi,
      pulau: islandOf(s),
      status: sensorStatusOf(s),
      completeness: a && a.n ? a.sum / a.n : null,
      jarak: nn?.nearest_distance_km ?? null,
      tetangga: nn?.nearest_station_code ?? null,
    }
  })

  const withComp = stations.filter((s) => s.completeness != null)
  const belowComp = withComp
    .filter((s) => s.completeness < COMP_THRESHOLD)
    .sort((a, b) => a.completeness - b.completeness)
  const lowest = [...withComp].sort((a, b) => a.completeness - b.completeness)[0] ?? null

  const far = stations
    .filter((s) => s.jarak != null && s.jarak > FAR_KM)
    .sort((a, b) => b.jarak - a.jarak)

  const attention = stations.filter(
    (s) => (s.jarak != null && s.jarak > FAR_KM) || (s.completeness != null && s.completeness < COMP_THRESHOLD)
  )

  const perIsland = new Map()
  stations.forEach((s) => perIsland.set(s.pulau, (perIsland.get(s.pulau) ?? 0) + 1))
  const islands = [...perIsland.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const avgComp = withComp.length
    ? withComp.reduce((t, s) => t + s.completeness, 0) / withComp.length
    : null

  return {
    total: summary.total_stations ?? stations.length,
    totalSensors: summary.total_sensors ?? null,
    active: summary.sensor_status?.Active ?? 0,
    intermittent: summary.sensor_status?.Intermittent ?? 0,
    defective: summary.sensor_status?.Defective ?? 0,
    medianJarak: summary.median_nearest_distance_km ?? null,
    farCount: far.length,
    far,
    belowCount: belowComp.length,
    belowComp,
    lowest,
    avgComp,
    islands,
    attention,
    isolatedCount: stations.filter((s) => s.jarak == null || s.jarak > FAR_KM).length,
  }
}

export { formatNumber }