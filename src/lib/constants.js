/* ─── ISPU (Indeks Standar Pencemar Udara) ───────────────────────────────
 * Referensi: Permen LHK No. 14 Tahun 2020
 * Dipakai di: Badge, StationMap, MetricCard, tabel peringkat
 * ─────────────────────────────────────────────────────────────────────── */
export const ISPU_CATEGORIES = [
  {
    id: 'baik',
    label: 'Baik',
    range: [1, 50],
    color: '#22C55E',
    bg: 'rgba(34, 197, 94, 0.12)',
    description: 'Tingkat kualitas udara yang tidak memberikan efek bagi kesehatan.',
  },
  {
    id: 'sedang',
    label: 'Sedang',
    range: [51, 100],
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.12)',
    description: 'Kualitas udara yang tidak berpengaruh pada kesehatan manusia atau hewan.',
  },
  {
    id: 'tidak-sehat',
    label: 'Tidak Sehat',
    range: [101, 200],
    color: '#FACC15',
    bg: 'rgba(250, 204, 21, 0.12)',
    description: 'Berdampak pada manusia ataupun kelompok hewan yang sensitif.',
  },
  {
    id: 'sangat-tidak-sehat',
    label: 'Sangat Tidak Sehat',
    range: [201, 300],
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    description: 'Kualitas udara yang dapat merugikan kesehatan pada sejumlah segmen populasi.',
  },
  {
    id: 'berbahaya',
    label: 'Berbahaya',
    range: [301, Infinity],
    color: '#111827',
    bg: 'rgba(17, 24, 39, 0.12)',
    description: 'Kualitas udara berbahaya yang secara umum dapat merugikan kesehatan.',
  },
]

/* ─── Konversi PM2.5 (µg/m³) → ISPU
 * Referensi: PP No. 22 Tahun 2021 & Permen LHK No. 14 Tahun 2020
 * Breakpoint PM2.5 24-jam:
 *   Baik         : 0–15.5
 *   Sedang       : 15.6–55.4
 *   Tidak Sehat  : 55.5–150.4
 *   Sangat Tidak : 150.5–250.4
 *   Berbahaya    : ≥250.5
 * ─────────────────────────────────────────────────────────────────────── */
export const PM25_BREAKPOINTS = [
  { ispuLow: 0,   ispuHigh: 50,  concLow: 0,     concHigh: 15.4  },
  { ispuLow: 51,  ispuHigh: 100, concLow: 15.5,  concHigh: 55.4  },
  { ispuLow: 101, ispuHigh: 200, concLow: 55.5,  concHigh: 150.4 },
  { ispuLow: 201, ispuHigh: 300, concLow: 150.5, concHigh: 250.4 },
  { ispuLow: 301, ispuHigh: 500, concLow: 250.5, concHigh: 500.4 },
]

/* ─── Polutan ──────────────────────────────────────────────────────────── */
export const POLLUTANTS = {
  pm25: {
    key:       'pm25_ug_m3',
    label:     'PM2.5',
    unit:      'µg/m³',
    color:     '#E6F9AF',  /* accent */
    shortDesc: 'Partikel halus < 2,5 µm',
    naaqs: 25,          // 24 jam (tidak dipakai untuk rata-rata periode)
    who: 15,
    naaqsAnnual: 15,    // PP 22/2021, tahunan
    whoAnnual: 5,       // WHO AQG 2021, tahunan
  },
  pm10: {
    key:       'pm10_ug_m3',
    label:     'PM10',
    unit:      'µg/m³',
    color:     '#8BBEB2',  /* muted */
    naaqs:     75,
    who:       45,
    shortDesc: 'Partikel debu < 10 µm',
  },
  so2: {
    key:       'so2_ug_m3',
    label:     'SO₂',
    unit:      'µg/m³',
    color:     '#FACC15',
    naaqs:     150,
    who:       40,
    shortDesc: 'Sulfur dioksida',
  },
  co: {
    key:       'co_ug_m3',
    label:     'CO',
    unit:      'µg/m³',
    color:     '#FB923C',
    naaqs:     10000,
    who:       null,
    shortDesc: 'Karbon monoksida',
  },
  o3: {
    key:       'o3_ug_m3',
    label:     'O₃',
    unit:      'µg/m³',
    color:     '#60A5FA',
    naaqs:     150,
    who:       100,
    shortDesc: 'Ozon permukaan',
  },
  no2: {
    key:       'no2_ug_m3',
    label:     'NO₂',
    unit:      'µg/m³',
    color:     '#F87171',
    naaqs:     200,
    who:       25,
    shortDesc: 'Nitrogen dioksida',
  },
}

/* ─── Health Outcomes ──────────────────────────────────────────────────── */
export const HEALTH_OUTCOMES = {
  resp_admissions_under5: {
    label:     'Rawat Inap ISPA (Balita)',
    shortLabel: 'ISPA < 5th',
    color:     '#FB923C',
    group:     'respiratory',
  },
  resp_admissions_over60: {
    label:     'Rawat Inap Pernapasan (Lansia)',
    shortLabel: 'Napas > 60th',
    color:     '#F87171',
    group:     'respiratory',
  },
  asthma_emergency_cases: {
    label:     'Kasus Darurat Asma',
    shortLabel: 'Asma',
    color:     '#FACC15',
    group:     'respiratory',
  },
  copd_admissions: {
    label:     'Rawat Inap PPOK',
    shortLabel: 'PPOK',
    color:     '#C084FC',
    group:     'respiratory',
  },
  resp: {
    label:     'Total Kasus Pernapasan',
    shortLabel: 'Total Napas',
    color:     '#8BBEB2',
    group:     'respiratory',
  },
  cvd: {
    label:     'Penyakit Kardiovaskular',
    shortLabel: 'CVD',
    color:     '#F472B6',
    group:     'cardiovascular',
  },
  death: {
    label:     'Kematian',
    shortLabel: 'Kematian',
    color:     '#94A3B8',
    group:     'mortality',
  },
}

/* ─── Site Types ───────────────────────────────────────────────────────── */
export const SITE_TYPE_LABELS = {
  'Urban Background':                  'Latar Perkotaan',
  'Industrial Perimeter':              'Perimeter Industri',
  'Traffic / Roadside':                'Tepi Jalan',
  'Regional / Clean Background':       'Latar Bersih',
  'Peatland Boundary':                 'Batas Gambut',
  'Peatland Buffer / Urban':           'Penyangga Gambut',
  'Coastal / Regional Background':     'Pesisir / Latar Bersih',
  'Urban Background / Valley':         'Latar Perkotaan (Lembah)',
  'Industrial / Karst Perimeter':      'Industri / Karst',
  'Airport & Peatland Buffer':         'Bandara & Gambut',
  'Peatland & Plantation Hinterland':  'Gambut & Perkebunan',
  'Industrial & Deforestation Buffer': 'Industri & Deforestasi',
  'Industrial Perimeter / Maritime':   'Industri / Maritim',
  'Urban Coastal Background':          'Pesisir Perkotaan',
  'Coastal / Remote Savanna':          'Pesisir / Sabana Terpencil',
  'Peatland Boundary / Inland':        'Batas Gambut Pedalaman',
  'Peatland Boundary / Airport':       'Gambut / Bandara',
  'Peatland Buffer / Urban Artery':    'Gambut / Arteri Kota',
  'Urban Background / Highway Corridor': 'Latar Kota / Arteri',
}

/* ─── Region Groups ────────────────────────────────────────────────────── */
export const REGION_COLORS = {
  'Jakarta':           '#E6F9AF',
  'Bogor':             '#8BBEB2',
  'Yogyakarta':        '#60A5FA',
  'Jawa Timur':        '#818CF8',
  'Sumatera Utara':    '#FB923C',
  'Sumatera Barat':    '#FACC15',
  'Riau':              '#F87171',
  'Jambi':             '#C084FC',
  'Sumatera':          '#A78BFA',
  'Sumatera Selatan':  '#34D399',
  'Bengkulu':          '#22D3EE',
  'Lampung':           '#F472B6',
  'Kepulauan Riau':    '#FCD34D',
  'Kalimantan Tengah': '#4ADE80',
  'Kalimantan Barat':  '#2DD4BF',
  'Kalimantan Timur':  '#38BDF8',
  'Kalimantan Selatan':'#A3E635',
  'Aceh':              '#FCA5A5',
  'Sulawesi Selatan':  '#C4B5FD',
  'Sulawesi Tengah':   '#86EFAC',
  'Papua Barat Daya':  '#FDE68A',
  'Papua':             '#BAE6FD',
}

/* ─── Nama bulan (untuk label chart) ──────────────────────────────────── */
export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des',
]

export const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
