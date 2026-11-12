'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState, useRef } from 'react'
import {
  Activity,
  Wind,
  MapPin,
  TrendingUp,
  RotateCcw,
  CloudSun,
  BarChart3,
  MapPinned,
  CalendarDays,
  ChevronDown,
  AlertTriangle,
  Clock3,
} from 'lucide-react'



import './aqms.css'

import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { EChart } from './EChart'
import { useCoverageGeo } from '@/hooks/useCoverageData'

const AirQualityMap = dynamic(
  () => import('@/map/AirQualityMap').then((m) => m.AirQualityMap),
  {
    ssr: false,
    loading: () => <div className="empty">Memuat peta stasiun...</div>,
  }
)

const HazeEpisodeMap = dynamic(
  () => import('@/map/HazeEpisodeMap').then((m) => m.HazeEpisodeMap),
  {
    ssr: false,
    loading: () => <div className="empty">Memuat peta indikasi episode...</div>,
  }
)



const PARAMETERS = {
  pm25: { label: 'PM2.5', unit: 'µg/m³' },
  pm10: { label: 'PM10', unit: 'µg/m³' },
  so2: { label: 'SO₂', unit: 'µg/m³' },
  co: { label: 'CO', unit: 'µg/m³' },
  o3: { label: 'O₃', unit: 'µg/m³' },
  no2: { label: 'NO₂', unit: 'µg/m³' },
}


const AIR_QUALITY_STANDARDS = {
  bmua: {
    label: 'BMUA PP No. 22 Tahun 2021',
    shortLabel: 'BMUA',
    period: '24 jam',
    values: {
      pm25: 55,
      pm10: 75,
      so2: 75,
      no2: 65,
    },
  },
  who: {
    label: 'WHO Air Quality Guidelines 2021',
    shortLabel: 'WHO',
    period: '24 jam',
    values: {
      pm25: 15,
      pm10: 45,
      so2: 40,
      no2: 25,
    },
  },
}


const ISPU_COLORS = {
  Baik: '#4ADE80',
  Sedang: '#FACC15',
  'Tidak Sehat': '#FB923C',
  'Sangat Tidak Sehat': '#F87171',
  Berbahaya: '#C026D3',
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April',
  'Mei', 'Juni', 'Juli', 'Agustus',
  'September', 'Oktober', 'November', 'Desember',
]

const SELECT_STYLE = {
  height: 40,
  border: '1px solid var(--color-border)',
  borderRadius: 9,
  padding: '0 11px',
  background: '#FFFFFF',
  color: '#20344F',
  fontSize: 13,
  minWidth: 120,
  width: '100%',
  outline: 'none',
}

function average(values) {
  const valid = values
    .map(Number)
    .filter(Number.isFinite)

  if (!valid.length) return null

  return valid.reduce((sum, value) => sum + value, 0) /
    valid.length
}

function formatValue(value, digits = 1) {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    !Number.isFinite(Number(value))
  ) {
    return '--'
  }

  return Number(value).toLocaleString('id-ID', {
    maximumFractionDigits: digits,
  })
}

function getYear(row) {
  if (row.tahun !== undefined && row.tahun !== null) {
    return String(row.tahun).slice(0, 4)
  }

  const keys = [
    'tanggal',
    'date',
    'tanggal_pengukuran',
    'measurement_date',
    'periode_harian',
    'periode',
    'datetime',
    'timestamp',
    'waktu',
  ]

  for (const key of keys) {
    const match = String(row[key] ?? '').match(/(19|20)\d{2}/)
    if (match) return match[0]
  }

  return ''
}

function isInDateRange(row, from, to) {
  if (!from && !to) return true

  const raw = String(
    row.tanggal ?? row.date ?? row.periode_bulan ?? row.timestamp ?? row.tahun ?? row.year ?? ''
  )
  if (!raw) return true

  const length = Math.min(raw.length, 10)   // 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD'
  const value = raw.slice(0, length)

  return (
    (!from || value >= from.slice(0, length)) &&
    (!to || value <= to.slice(0, length))
  )
}

const AREA_TYPES = ['Perkotaan', 'Industri', 'Latar Bersih', 'Penyangga Gambut']

function getMonth(row) {
  const raw = row.bulan ?? row.month

  if (raw !== undefined && raw !== null && raw !== '') {
    const value = String(raw).trim().toLowerCase()

    const names = {
      januari: '01', jan: '01',
      februari: '02', feb: '02',
      maret: '03', mar: '03',
      april: '04', apr: '04',
      mei: '05',
      juni: '06', jun: '06',
      juli: '07', jul: '07',
      agustus: '08', agu: '08', aug: '08',
      september: '09', sep: '09',
      oktober: '10', okt: '10', oct: '10',
      november: '11', nov: '11',
      desember: '12', des: '12', dec: '12',
    }

    const number = Number(value)

    if (Number.isInteger(number) && number >= 1 && number <= 12) {
      return String(number).padStart(2, '0')
    }

    if (names[value]) return names[value]
  }

  const keys = [
    'tanggal',
    'date',
    'tanggal_pengukuran',
    'measurement_date',
    'periode_harian',
    'periode',
    'datetime',
    'timestamp',
    'waktu',
  ]

  for (const key of keys) {
    const value = String(row[key] ?? '')

    let match = value.match(/(?:19|20)\d{2}[-/](\d{1,2})/)

    if (match) {
      const month = Number(match[1])
      if (month >= 1 && month <= 12) {
        return String(month).padStart(2, '0')
      }
    }

    match = value.match(/^\d{1,2}[-/](\d{1,2})[-/](?:19|20)\d{2}$/)

    if (match) {
      const month = Number(match[1])
      if (month >= 1 && month <= 12) {
        return String(month).padStart(2, '0')
      }
    }
  }

  return ''
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="aq-filter-field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={SELECT_STYLE}
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function LocalFilter({ children, onReset }) {
  return (
    <div className="aq-filter-toolbar">
      <div className="aq-filter-fields">{children}</div>

      <button
        type="button"
        className="aq-filter-reset"
        onClick={onReset}
      >
        <RotateCcw size={13} />
        Reset
      </button>
    </div>
  )
}


function FilterResetToolbar({ children, onReset }) {
  return (
    <div className="aq-filter-with-reset">
      {children}

      <button
        type="button"
        className="aq-filter-reset"
        onClick={onReset}
      >
        <RotateCcw size={13} />
        Reset
      </button>
    </div>
  )
}


function SectionTitle({ number, title, description }) {
  return (
    <div className="aq-section-heading">
      <div className="aq-section-number">{number}</div>
      <div className="aq-section-copy">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
  )
}

function EmptyData({ message }) {
  return (
    <div className="empty aq-empty">
      <BarChart3 size={28} />
      <strong>Data belum tersedia</strong>
      <span>{message}</span>
    </div>
  )
}

function CategoryDistribution({ rows }) {
  const categories = [
    'Baik',
    'Sedang',
    'Tidak Sehat',
    'Sangat Tidak Sehat',
    'Berbahaya',
  ]

  const counts = categories.map((category) => ({
    category,
    count: rows.filter(
      (row) => row.kategori_ispu === category
    ).length,
  }))

  const max = Math.max(1, ...counts.map((item) => item.count))

  if (!rows.length) {
    return (
      <EmptyData message="Tidak ada catatan ISPU pada periode yang dipilih." />
    )
  }

  return (
    <div className="stack">
      {counts.map((item) => (
        <div key={item.category} className="stack-sm">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>{item.category}</span>
            <strong>{item.count.toLocaleString('id-ID')}</strong>
          </div>

          <div className="aq-progress">
            <div
              style={{
                width: `${(item.count / max) * 100}%`,
                background: ISPU_COLORS[item.category],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function ChartDistribution({ rows }) {
  const categories = [
    'Baik',
    'Sedang',
    'Tidak Sehat',
    'Sangat Tidak Sehat',
    'Berbahaya',
  ]

  const counts = categories.map((category) => ({
    category,
    count: rows.filter(
      (row) => row.kategori_ispu === category
    ).length,
  }))

  const total = counts.reduce(
    (sum, item) => sum + item.count,
    0
  )

  const max = Math.max(1, ...counts.map((item) => item.count))

  if (!rows.length) {
    return (
      <EmptyData message="Tidak ada catatan ISPU pada periode yang dipilih." />
    )
  }

  return (
    <div className="aq-distribusi-chart">
      {counts.map((item) => {
        const percentage = total
          ? (item.count / total) * 100
          : 0

        return (
          <div key={item.category} className="aq-distribusi-item">
            <div className="aq-distribusi-info">
              <span className="aq-distribusi-label">
                {item.category}
              </span>

              <strong>
                {item.count.toLocaleString('id-ID')}
                <small>
                  {' '}({percentage.toFixed(1)}%)
                </small>
              </strong>
            </div>

            <div className="aq-distribusi-track">
              <div
                className="aq-distribusi-bar"
                style={{
                  width: `${(item.count / max) * 100}%`,
                  background: ISPU_COLORS[item.category],
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function weightedAverage(rows, key) {
  const valid = rows.filter(
    row => Number.isFinite(Number(row[key]))
  )

  const totalWeight = valid.reduce(
    (sum, row) => sum + Number(row.jumlah_hari || 1), 0
  )

  if (!totalWeight) return null

  return valid.reduce(
    (sum, row) =>
      sum + Number(row[key]) * Number(row.jumlah_hari || 1), 0
  ) / totalWeight
}

function StationDetail({ station, rows }) {
  if (!station) {
    return (
      <div className="aq-station-empty">
        <MapPinned size={30} />
        <strong>Belum ada stasiun dipilih</strong>
        <span>Klik marker pada peta untuk melihat informasi stasiun.</span>
      </div>
    )
  }
  

  const pm25 = weightedAverage(rows, 'pm25')
  const pm10 = weightedAverage(rows, 'pm10')

  const pollutants = [
    ['SO₂', 'so2'],
    ['CO', 'co'],
    ['O₃', 'o3'],
    ['NO₂', 'no2'],
  ]

  const detail = [
    ['Kota/Kabupaten', station.kota_kabupaten],
    ['Provinsi', station.provinsi],
    ['Karakteristik wilayah', station.karakteristik_wilayah],
    ['Tipe lokasi', station.site_type],
    ['Status operasional', station.status_operasional],
  ]

  return (
    <div className="aq-station-detail">

      <div className="aq-station-heading">
        <div>
          <span className="card-sub">Stasiun terpilih</span>
          <h3>{station.station_id}</h3>
        </div>

        <span
    className={`aq-category-pill ${
      {
        'Baik': 'ispu-baik',
        'Sedang': 'ispu-sedang',
        'Tidak Sehat': 'ispu-tidak-sehat',
        'Sangat Tidak Sehat': 'ispu-sangat-tidak-sehat',
        'Berbahaya': 'ispu-berbahaya',
      }[station.kategori_ispu] || ''
    }`}
  >
    {station.kategori_ispu ?? '--'}
  </span>
      </div>

      <div className="aq-station-metrics">
        <div className="aq-station-metric">
          <span>Rata-rata PM2.5</span>
          <strong>{formatValue(pm25)}</strong>
          <small>µg/m³</small>
        </div>

        <div className="aq-station-metric">
          <span>Rata-rata PM10</span>
          <strong>{formatValue(pm10)}</strong>
          <small>µg/m³</small>
        </div>
      </div>

      <div className="aq-pollutant-summary">
        <h4>Rata-rata polutan lainnya</h4>

        <table className="aq-comparison-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Rata-rata konsentrasi</th>
            </tr>
          </thead>
          <tbody>
            {pollutants.map(([label, key]) => (
              <tr key={key}>
                <td>{label}</td>
                <td>
                  {formatValue(weightedAverage(rows, key))} µg/m³
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="aq-station-info">
        {detail.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value || '--'}</strong>
          </div>
        ))}
      </div>

      {!rows.length && (
        <p className="card-sub">
          Tidak ada data pengukuran untuk periode yang dipilih.
        </p>
      )}

    </div>
  )
}

function StationInsight({ station, rows }) {
  if (!station) {
    return (
      <div className="aq-station-insight">
        <p>
          Pilih marker stasiun pada peta untuk melihat
          ringkasan hasil pengukuran dan ketersediaan datanya.
        </p>
      </div>
    )
  }

  const pm25 = average(rows.map((row) => row.pm25))
  const pm10 = average(rows.map((row) => row.pm10))

  const observationDays = new Set(
    rows.map((row) => String(row.tanggal ?? '').slice(0, 10))
      .filter(Boolean)
  ).size

  return (
    <div className="aq-station-insight">
      <p>
  Berdasarkan rentang waktu yang dipilih, stasiun
  {` ${station.station_id} `}
  memiliki {rows.length.toLocaleString('id-ID')} catatan
  pengukuran dari {observationDays.toLocaleString('id-ID')} hari pengamatan.
  {observationDays > 0 && (
    <>
      {' '}Hal ini menunjukkan bahwa data pengamatan tersedia
      selama periode tersebut, dengan rata-rata sekitar{' '}
      {(rows.length / observationDays).toLocaleString('id-ID', {
        maximumFractionDigits: 1,
      })} catatan per hari.
      Ketersediaan data ini dapat membantu memberikan gambaran
      kondisi kualitas udara stasiun selama periode pengamatan.
    </>
  )}
</p>
      
    </div>
  )
}

function buildBarOption(labels, values, colors = '#4F83CC') {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: 100,
      right: 35,
      top: 15,
      bottom: 25,
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#8490A5' },
      splitLine: {
        lineStyle: { color: 'rgba(130,145,170,.15)' },
      },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: labels,
      axisLabel: { color: '#8490A5' },
    },
    series: [{
      type: 'bar',
      data: values.map((value, index) => ({
        value,
        itemStyle: {
          color: Array.isArray(colors) ? colors[index] : colors,
        },
      })),
      barMaxWidth: 22,
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
      },
    }],
  }
}


function getQuantile(sorted, q) {
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) return sorted[lower];

  return sorted[lower] +
    (sorted[upper] - sorted[lower]) *
    (position - lower);
}


function PollutantBoxplot({ rows, parameter }) {
  const groups = {};

  // 1. Kelompokkan data berdasarkan pulau
  rows.forEach((row) => {
    const island = row.pulau || 'Tidak diketahui';
    const value = Number(row[parameter]);

    if (!Number.isFinite(value)) return;

    if (!groups[island]) {
      groups[island] = [];
    }

    groups[island].push(value);
  });

  const labels = Object.keys(groups);

  const boxData = [];
  const outliers = [];
  const validLabels = [];

  // 2. Hitung statistik boxplot setiap pulau
  labels.forEach((island) => {
    const values = groups[island].sort((a, b) => a - b);

    if (values.length < 4) return;

    const q1 = getQuantile(values, 0.25);
    const median = getQuantile(values, 0.50);
    const q3 = getQuantile(values, 0.75);

    const iqr = q3 - q1;

    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;

    const normalValues = values.filter(
      (v) => v >= lowerFence && v <= upperFence
    );

    if (!normalValues.length) return;

    const low = normalValues[0];
    const high = normalValues[normalValues.length - 1];

    validLabels.push(island);

    boxData.push({
      name: island,
      value: [low, q1, median, q3, high],
    });

    // Simpan outlier berdasarkan nama pulau
    values.forEach((value) => {
      if (value < lowerFence || value > upperFence) {
        outliers.push([value, island]);
      }
    });
  });

  // 3. Konfigurasi grafik
  const option = {
    animation: true,

    tooltip: {
      trigger: 'item',
      confine: true,

      formatter: (params) => {
        if (params.seriesType === 'scatter') {
          return `
            <b>${params.value[1]}</b><br/>
            <span style="color:#E58A61">●</span>
            Outlier: ${Number(params.value[0]).toFixed(2)} µg/m³
          `;
        }

        const v = params.data.value;

        return `
          <b>${params.name}</b><br/>
          Minimum: ${v[0].toFixed(2)} µg/m³<br/>
          Q1: ${v[1].toFixed(2)} µg/m³<br/>
          Median: ${v[2].toFixed(2)} µg/m³<br/>
          Q3: ${v[3].toFixed(2)} µg/m³<br/>
          Maksimum: ${v[4].toFixed(2)} µg/m³
        `;
      },
    },

    grid: {
  left: 15,
  right: 35,
  top: 20,
  bottom: 75,
  containLabel: true,
},

    xAxis: {
      type: 'value',
      name: 'Konsentrasi (µg/m³)',
      nameLocation: 'middle',
      nameGap: 40,

      axisLabel: {
        color: '#64748B',
        fontSize: 11,
      },

      axisLine: {
        lineStyle: {
          color: '#64748B',
        },
      },

      splitLine: {
        show: true,
        lineStyle: {
          color: '#E5EAF0',
        },
      },
    },

    yAxis: {
      type: 'category',
      data: validLabels,
      inverse: true,

      axisLabel: {
        color: '#71839D',
        fontSize: 12,
        margin: 15,
      },

      axisLine: {
        show: false,
      },

      axisTick: {
        show: false,
      },
    },

    dataZoom: [
  {
    type: 'inside',
    xAxisIndex: 0,
    filterMode: 'none',
  },
{
  type: 'slider',
  xAxisIndex: 0,
  filterMode: 'none',

  left: '8%',
  right: '8%',
  bottom: 5,
  height: 10,

  showDetail: false,
  showDataShadow: false,
  brushSelect: false,

  borderColor: 'transparent',
  backgroundColor: '#EDF1F7',
  fillerColor: 'rgba(79,131,204,0.25)',

  handleSize: 8,
  handleStyle: {
    color: '#4F83CC',
    borderColor: '#4F83CC',
  },

  moveHandleSize: 3,
},
],
    series: [
      {
        name: 'Distribusi Konsentrasi',
        type: 'boxplot',
        layout: 'horizontal',
        data: boxData,

        boxWidth: [20, 36],

        itemStyle: {
          color: 'rgba(79,131,204,0.18)',
          borderColor: '#4F83CC',
          borderWidth: 2,
        },

        emphasis: {
          itemStyle: {
            borderColor: '#18314F',
            borderWidth: 2,
          },
        },
      },

      {
        name: 'Outlier',
        type: 'scatter',
        data: outliers,
        symbolSize: 7,

        itemStyle: {
          color: '#E58A61',
          opacity: 0.7,
        },

        z: 5,
      },
    ],
  };

  // 4. Jika tidak ada data
  if (!boxData.length) {
    return (
      <EmptyData message="Data distribusi polutan belum tersedia." />
    );
  }

  return (
  <div className="aq-boxplot-wrapper">
    <EChart
      option={option}
      height={360}
    />

    <div className="aq-boxplot-help">
      
      <span>
        Geser slider di bawah grafik untuk memperbesar
        atau memperkecil rentang konsentrasi polutan.
      </span>
    </div>
    <div className="aq-distribusi-footer">
    <p>
      *Stasiun bersatuan ppm dan stasiun dengan data tidak mencukupi
      tidak disertakan.
    </p>
  </div>

  </div>
);

}

function ComparisonTable({ rows, view, stations }) {
  const stationLookup = Object.fromEntries(
    stations.map((station) => [station.station_id, station])
  )

  const groups = {}

  rows.forEach((row) => {
    const key = view === 'stasiun'
      ? (row.station_id || 'Tidak diketahui')
      : (row.provinsi || 'Tidak diketahui')

    if (!groups[key]) {
      const station = stationLookup[key]

      groups[key] = {
        name: key,
        sensor: station?.nama_sensor ?? '--',
        provinsi: row.provinsi ?? station?.provinsi ?? '--',
        pulau: row.pulau ?? station?.pulau ?? '--',
        count: 0,
        pm25: [],
        pm10: [],
        so2: [],
        co: [],
        o3: [],
        no2: [],
      }
    }

    groups[key].count += 1

    Object.keys(PARAMETERS).forEach((parameter) => {
      const value = Number(row[parameter])

      if (Number.isFinite(value)) {
        groups[key][parameter].push(value)
      }
    })
  })

  const result = Object.values(groups)
    .map((item) => ({
      ...item,
      ...Object.fromEntries(
        Object.keys(PARAMETERS).map((parameter) => [
          parameter,
          average(item[parameter]),
        ])
      ),
    }))
    .sort((a, b) => (b.pm25 ?? -Infinity) - (a.pm25 ?? -Infinity))

  if (!result.length) {
    return (
      <EmptyData message="Data perbandingan wilayah belum tersedia pada periode ini." />
    )
  }

return (
  <div className="aq-comparison-scroll">
    <table className="aq-comparison-table">
        <thead>
          <tr>
            {view === 'stasiun' ? (
              <>
                <th>Stasiun</th>
                <th>Nama stasiun</th>
                <th>Provinsi</th>
                <th>Pulau</th>
              </>
            ) : (
              <>
                <th>Provinsi</th>
                <th>Pulau</th>
              </>
            )}

            <th>PM2.5</th>
            <th>PM10</th>
            <th>SO₂</th>
            <th>CO</th>
            <th>O₃</th>
            <th>NO₂</th>
            <th>Jumlah data</th>
          </tr>
        </thead>

        <tbody>
          {result.map((item) => (
            <tr key={item.name}>
              <td>{item.name}</td>

              {view === 'stasiun' ? (
                <>
                  <td>{item.sensor}</td>
                  <td>{item.provinsi}</td>
                  <td>{item.pulau}</td>
                </>
              ) : (
                <td>{item.pulau}</td>
              )}

              {Object.keys(PARAMETERS).map((parameter) => (
                <td key={parameter}>
                  {formatValue(item[parameter])}
                </td>
              ))}

              <td>{item.count.toLocaleString('id-ID')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


// ======================================================
// ANALISIS WAKTU KRITIS
// ======================================================

const HOURLY_COLORS = [
  '#4CAF50', // Rendah
  '#FACC15', // Sedang
  '#FB923C', // Tinggi
  '#EF4444', // Sangat tinggi
]

const HOURLY_LEVELS = [
  'Rendah',
  'Sedang',
  'Tinggi',
  'Sangat tinggi',
]

// Menghitung rata-rata konsentrasi setiap jam
function getHourlySummary(rows = [], parameter = 'pm25') {
  const groups = Array.from({ length: 24 }, () => [])

  rows.forEach((row) => {
    const hour = Number(row.jam)
    const value = Number(row[parameter])

    if (
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23 ||
      !Number.isFinite(value)
    ) return

    groups[hour].push(value)
  })

  const values = groups.map((items) => average(items))

  const validValues = values.filter(Number.isFinite)

  if (!validValues.length) {
    return {
      values,
      min: null,
      max: null,
      peak: null,
      lowest: null,
      topHours: [],
    }
  }

  const min = Math.min(...validValues)
  const max = Math.max(...validValues)

  const peak = values.reduce((best, value, hour) => {
    if (value === null) return best

    if (best === null || value > best.value) {
      return { hour, value }
    }

    return best
  }, null)

  const lowest = values.reduce((best, value, hour) => {
    if (value === null) return best

    if (best === null || value < best.value) {
      return { hour, value }
    }

    return best
  }, null)

  const topHours = values
    .map((value, hour) => ({ hour, value }))
    .filter((item) => item.value !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)

  return {
    values,
    min,
    max,
    peak,
    lowest,
    topHours,
  }
}

// Menentukan tingkat warna relatif pada heatmap
function getHourlyLevel(value, min, max) {
  if (
    value === null ||
    min === null ||
    max === null
  ) return -1

  if (max === min) return 0

  const ratio = (value - min) / (max - min)

  if (ratio <= 0.25) return 0
  if (ratio <= 0.50) return 1
  if (ratio <= 0.75) return 2

  return 3
}

// Legenda warna dengan rentang nilai dinamis
function HourlyLegend({ min, max }) {
  if (min === null || max === null) return null

  const interval = (max - min) / 4

  const ranges = Array.from({ length: 4 }, (_, index) => {
    const lower = min + interval * index
    const upper = index === 3
      ? max
      : min + interval * (index + 1)

    return {
      label: HOURLY_LEVELS[index],
      color: HOURLY_COLORS[index],
      range: `${formatValue(lower, 1)}–${formatValue(upper, 1)}`,
    }
  })

  return (
    <div className="aq-hourly-legend">
      <strong>Legenda konsentrasi relatif</strong>

      <div className="aq-hourly-legend-items">
        {ranges.map((item) => (
          <div className="aq-hourly-legend-item" key={item.label}>
            <span
              className="aq-hourly-legend-color"
              style={{ background: item.color }}
            />

            <span>
              <strong>{item.label}</strong>
              <small>{item.range} µg/m³</small>
            </span>
          </div>
        ))}
      </div>

      <small className="aq-hourly-legend-note">
        Rentang warna dihitung berdasarkan nilai minimum dan
        maksimum pada hasil filter yang sedang dipilih.
        Kategori ini merupakan skala relatif, bukan kategori ISPU
        atau penilaian baku mutu.
      </small>
    </div>
  )
}

// Heatmap konsentrasi per jam
function HourlyHeatmap({ rows, parameter }) {
  const summary = getHourlySummary(rows, parameter)

  if (summary.peak === null) {
    return (
      <EmptyData message="Data konsentrasi per jam belum tersedia." />
    )
  }

  return (
    <div className="aq-hourly-wrap">
      <div className="aq-hourly-grid">
        {summary.values.map((value, hour) => {
          const level = getHourlyLevel(
            value,
            summary.min,
            summary.max
          )

          const isPeak = summary.peak.hour === hour

          return (
            <div
              key={hour}
              className={`aq-hour-cell ${isPeak ? 'is-peak' : ''}`}
              style={{
                background: value === null
                  ? '#F1F4F8'
                  : HOURLY_COLORS[level],
                color: level >= 2 ? '#FFFFFF' : '#18314F',
              }}
              title={
                value === null
                  ? `${String(hour).padStart(2, '0')}.00: Tidak ada data`
                  : `${String(hour).padStart(2, '0')}.00: ${formatValue(value, 2)} µg/m³`
              }
            >
              <span>
                {String(hour).padStart(2, '0')}.00
              </span>

              <strong>
                {formatValue(value, 1)}
              </strong>

              {isPeak && (
                <small className="aq-hour-peak-label">
                  Tertinggi
                </small>
              )}
            </div>
          )
        })}
      </div>

      <HourlyLegend
        min={summary.min}
        max={summary.max}
      />
    </div>
  )
}

// Interpretasi pola konsentrasi per jam
function HourlyInterpretation({ rows, parameter }) {
  const summary = getHourlySummary(rows, parameter)

  const parameterLabel =
    PARAMETERS[parameter]?.label ?? parameter.toUpperCase()

  if (summary.peak === null) {
    return (
      <EmptyData message="Interpretasi belum dapat dibuat karena data tidak tersedia." />
    )
  }

  const peakHour = `${String(summary.peak.hour).padStart(2, '0')}.00`
  const lowestHour = `${String(summary.lowest.hour).padStart(2, '0')}.00`

  return (
    <div className="aq-time-interpretation">
      <div className="aq-time-highlight">
        <span>Jam dengan konsentrasi tertinggi</span>

        <strong>{peakHour}</strong>

        <b>
          {formatValue(summary.peak.value, 2)} µg/m³
        </b>
      </div>

<p>
  Berdasarkan hasil penyaringan data, konsentrasi rata-rata{' '}
  {parameterLabel} tertinggi tercatat pada pukul{' '}
  <strong>{peakHour}</strong>, yaitu sebesar{' '}
  <strong>{formatValue(summary.peak.value, 2)} µg/m³</strong>.
  Tiga jam dengan konsentrasi tertinggi adalah{' '}
  <strong>
    {summary.topHours
      .map((item) => `${String(item.hour).padStart(2, '0')}.00`)
      .join(', ')}
  </strong>.
  Sementara itu, konsentrasi terendah tercatat pada pukul{' '}
  <strong>{lowestHour}</strong>, sebesar{' '}
  <strong>{formatValue(summary.lowest.value, 2)} µg/m³</strong>.
</p>

      <div className="aq-distribusi-footer">
        <strong>Catatan analisis: </strong>
        <p>
          Pola tersebut menunjukkan perbedaan konsentrasi
          berdasarkan waktu pengamatan. Peningkatan pada jam
          tertentu belum dapat digunakan untuk memastikan sumber
          pencemaran atau penyebabnya.
        </p>
      </div>
    </div>
  )
}

// Menghitung rata-rata hari kerja dan akhir pekan

function getWeekendSummary(rows = [], parameter = 'pm25') {
  const getGroup = (label) => {
    const matching = rows.filter(
      (row) => row.tipe_hari === label
    )

    const valid = matching.filter((row) =>
      row[parameter] !== null &&
      row[parameter] !== undefined &&
      row[parameter] !== '' &&
      Number.isFinite(Number(row[parameter]))
    )

    return {
      value: average(valid.map((row) => row[parameter])),
      count: valid.length,
    }
  }

  const weekday = getGroup('Hari Kerja')
  const weekend = getGroup('Akhir Pekan')

  let difference = null
  let percentage = null
  let higher = null

  if (
    weekday.value !== null &&
    weekend.value !== null
  ) {
    difference = Math.abs(weekend.value - weekday.value)

    if (weekend.value > weekday.value) {
      higher = 'Akhir Pekan'
    } else if (weekday.value > weekend.value) {
      higher = 'Hari Kerja'
    } else {
      higher = 'Sama'
    }

    if (weekday.value !== 0) {
      percentage =
        ((weekend.value - weekday.value) / weekday.value) * 100
    }
  }

  return {
    weekday: weekday.value,
    weekend: weekend.value,
    weekdayCount: weekday.count,
    weekendCount: weekend.count,
    difference,
    percentage,
    higher,
  }
}


// Grafik hari kerja vs akhir pekan
function WeekendChart({ rows, parameter }) {
  const summary = getWeekendSummary(rows, parameter)

  if (
    summary.weekday === null &&
    summary.weekend === null
  ) {
    return (
      <EmptyData message="Data hari kerja dan akhir pekan belum tersedia." />
    )
  }

  
return (
  <>
    <EChart
      height={260}
      option={{
        tooltip: {
          trigger: 'axis',
          valueFormatter: (value) =>
            `${formatValue(value, 2)} µg/m³`,
        },

        grid: {
          left: 55,
          right: 25,
          top: 30,
          bottom: 40,
          containLabel: true,
        },

        xAxis: {
          type: 'category',
          data: ['Hari Kerja', 'Akhir Pekan'],
          axisLabel: { color: '#718399' },
        },

        yAxis: {
          type: 'value',
          name: 'µg/m³',
          axisLabel: { color: '#718399' },
          splitLine: {
            lineStyle: {
              color: '#E2E8F0',
              type: 'dashed',
            },
          },
        },

        series: [{
          name: PARAMETERS[parameter]?.label ?? parameter,
          type: 'bar',
          data: [summary.weekday, summary.weekend],
          barMaxWidth: 48,

          itemStyle: {
            color: '#7898BE',
            borderRadius: [6, 6, 0, 0],
          },

          label: {
            show: true,
            position: 'top',
            formatter: (params) =>
              params.value == null
                ? '--'
                : formatValue(params.value, 1),
            color: '#475569',
            fontSize: 11,
          },
        }],
      }}
    />

    {/* JUMLAH OBSERVASI DI BAWAH GRAFIK */}
    <div className="aq-weekend-counts">
      <div>
        <span>Jumlah data hari kerja</span>
        <strong>
          {summary.weekdayCount.toLocaleString('id-ID')}
        </strong>
      </div>

      <div>
        <span>Jumlah data akhir pekan</span>
        <strong>
          {summary.weekendCount.toLocaleString('id-ID')}
        </strong>
      </div>
    </div>
  </>
)


  
}

// Interpretasi hari kerja vs akhir pekan
function WeekendInterpretation({ rows, parameter }) {
  const summary = getWeekendSummary(rows, parameter)

  const parameterLabel =
    PARAMETERS[parameter]?.label ?? parameter.toUpperCase()

  if (
    summary.weekday === null ||
    summary.weekend === null
  ) {
    return (
      <EmptyData message="Perbandingan belum dapat dilakukan karena salah satu kelompok data tidak tersedia." />
    )
  }

  let comparisonText = ''

  if (summary.higher === 'Hari Kerja') {
    comparisonText = 'lebih tinggi pada hari kerja'
  } else if (summary.higher === 'Akhir Pekan') {
    comparisonText = 'lebih tinggi pada akhir pekan'
  } else {
    comparisonText = 'sama pada kedua kelompok hari'
  }

  return (
    <div className="aq-time-interpretation">
      <div className="aq-weekend-stat-grid">
        <div>
          <span>Hari kerja</span>
          <strong>
            {formatValue(summary.weekday, 2)}
          </strong>
          <small>µg/m³</small>
        </div>

        <div>
          <span>Akhir pekan</span>
          <strong>
            {formatValue(summary.weekend, 2)}
          </strong>
          <small>µg/m³</small>
        </div>
      </div>

<p>
  Rata-rata konsentrasi {parameterLabel} tercatat{' '}
  <strong>{comparisonText}</strong>.
  Selisih kedua kelompok adalah{' '}
  <strong>{formatValue(summary.difference, 2)} µg/m³</strong>.
  {summary.percentage !== null && (
    <>
      {' '}Dibandingkan dengan rata-rata hari kerja,
      konsentrasi pada akhir pekan{' '}
      <strong>
        {summary.percentage > 0
          ? `lebih tinggi ${formatValue(summary.percentage, 1)}%`
          : summary.percentage < 0
            ? `lebih rendah ${formatValue(Math.abs(summary.percentage), 1)}%`
            : 'tidak menunjukkan perbedaan'}
      </strong>.
    </>
  )}
</p>

      <div className="aq-distribusi-footer">
        <strong>Catatan analisis: </strong>
        <p>
          Perbedaan ini menggambarkan pola konsentrasi pada
          kelompok hari pengamatan. Hasilnya tidak secara
          langsung membuktikan bahwa aktivitas hari kerja
          atau akhir pekan menjadi penyebab perubahan
          konsentrasi.
        </p>
      </div>
    </div>
  )
}


function SeasonalChart({ rows = [], parameter = 'pm25' }) {
  const labels = ['Musim Hujan', 'Musim Kemarau']

  const result = labels.map((musim) => {
    const matching = rows.filter((row) => row.musim === musim)
    const values = matching
      .map((row) => Number(row[parameter]))
      .filter(Number.isFinite)

    return values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null
  })

  if (!result.some((value) => value !== null)) {
    return <EmptyData message="Tidak ada data untuk pilihan filter ini." />
  }

  const fmt = (value) =>
    value === null
      ? '—'
      : value.toLocaleString('id-ID', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })

  return (
    <div className="aq-season-content">
      <div className="aq-season-chart-heading">
        
      </div>

      <EChart
        height={340}
        option={{
          tooltip: {
            trigger: 'axis',
            formatter: (params) => {
              const item = params[0]
              return `${labels[item.dataIndex]}<br/>Rata-rata: ${fmt(item.value)} µg/m³`
            },
          },
          grid: {
            left: 55,
            right: 25,
            top: 35,
            bottom: 40,
          },
          xAxis: {
            type: 'category',
            data: labels,
            axisLabel: { color: '#718399' },
          },
          yAxis: {
            type: 'value',
            name: 'µg/m³',
            axisLabel: { color: '#718399' },
          },
          series: [{
            type: 'bar',
            data: result,
            barMaxWidth: 58,
            itemStyle: {
              color: '#7898BE',
              borderRadius: [7, 7, 0, 0],
            },
            label: {
              show: true,
              position: 'top',
              formatter: (params) => fmt(params.value),
            },
          }],
        }}
      />
    </div>
  )
}



function SeasonalInterpretation({
  rows = [],
  parameter = 'pm25',
  startDate,
  endDate,
}) {
  const labels = ['Musim Hujan', 'Musim Kemarau']

  const result = labels.map((musim) => {
    const values = rows
      .filter((row) => row.musim === musim)
      .map((row) => row[parameter])
      .filter((value) =>
        value !== null &&
        value !== undefined &&
        value !== '' &&
        Number.isFinite(Number(value))
      )
      .map(Number)

    return {
      musim,
      value: values.length
        ? values.reduce((sum, value) => sum + value, 0) /
          values.length
        : null,
    }
  })

  const hujan = result[0]
  const kemarau = result[1]

  const valid =
    hujan.value !== null &&
    kemarau.value !== null

  const difference = valid
    ? Math.abs(kemarau.value - hujan.value)
    : null

  const higher = !valid
    ? null
    : kemarau.value > hujan.value
      ? 'musim kemarau'
      : kemarau.value < hujan.value
        ? 'musim hujan'
        : 'kedua musim memiliki konsentrasi yang sama'

  const fmt = (value) =>
    value === null
      ? '—'
      : value.toLocaleString('id-ID', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })

  const formatDate = (date) => {
    if (!date) return null

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      'id-ID',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    )
  }

  const period =
    startDate && endDate
      ? `${formatDate(startDate)} – ${formatDate(endDate)}`
      : 'rentang waktu yang dipilih'

  if (!valid) {
    return (
      <div className="aq-season-interpretation">
        <p>
          Data belum mencukupi untuk membandingkan
          konsentrasi kedua musim pada rentang waktu
          yang dipilih.
        </p>
      </div>
    )
  }

  return (
    <div className="aq-season-interpretation">
      <strong>Interpretasi Musiman</strong>
      <p>
        Berdasarkan data pengamatan pada rentang waktu{' '}
        <strong>{period}</strong>, konsentrasi rata-rata{' '}
        <strong>
          {PARAMETERS[parameter]?.label || parameter}
        </strong>{' '}
        lebih tinggi pada <strong>{higher}</strong>.
        Konsentrasi pada musim hujan sebesar{' '}
        <strong>{fmt(hujan.value)} µg/m³</strong>,
        sedangkan pada musim kemarau sebesar{' '}
        <strong>{fmt(kemarau.value)} µg/m³</strong>.
        Selisih rata-rata konsentrasi kedua musim mencapai{' '}
        <strong>{fmt(difference)} µg/m³</strong>.
      </p>
    </div>
  )
}


function AreaCharacteristics({ stations }) {
  const validStations = stations.filter((station) => station.karakteristik_wilayah || station.site_type)
  if (!validStations.length) {
    return <EmptyData message="Data karakteristik wilayah belum tersedia." />
  }

  const typeCounts = Object.entries(
    validStations.reduce((groups, station) => {
      const type = station.site_type || 'Tipe lokasi tidak diketahui'
      groups[type] = (groups[type] || 0) + 1
      return groups
    }, {})
  ).sort((a, b) => b[1] - a[1])

  return (
    <div className="aq-chart-grid">
      {typeCounts.map(([type, count]) => (
        <div className="aq-station-metric" key={type}>
          <span>Jumlah stasiun</span>
          <strong>{count}</strong>
          <small>{type}</small>
        </div>
      ))}
    </div>
  )
}

function CriticalPeriods({ items }) {
  if (!items?.length) {
    return <EmptyData message="Belum ada hasil periode kritis. Pastikan file aqms_periode_kritis.json sudah dibuat dari data pengukuran per jam." />
  }

 
  const top = items.slice(0, 12)
  const max = Math.max(
  ...top.map((item) => Number(item.value) || 0),
  1
)

  // Mengambil waktu pengamatan yang tersedia
  const timestamps = [...new Set(
    items.map((item) => item.timestamp)
  )]
    .sort((a, b) => a.localeCompare(b))
    .slice(-72)

  // Mengelompokkan data berdasarkan stasiun
  const stationGroups = items.reduce((groups, item) => {
    const id = item.station_id

    if (!groups[id]) {
      groups[id] = {
        station_id: id,
        city: item.city,
        province: item.province,
        site_type: item.site_type,
        values: {},
        maxValue: 0,
      }
    }

    const value = Number(item.value)

    groups[id].values[item.timestamp] = value
    groups[id].maxValue = Math.max(
      groups[id].maxValue,
      value
    )

    return groups
  }, {})

  // Memilih lima stasiun dengan lonjakan tertinggi
  const selectedStations = Object.values(stationGroups)
    .sort((a, b) => b.maxValue - a.maxValue)
    .slice(0, 5)

  const timelineOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
      },
      formatter: (params) => {
        if (!params?.length) return ''

        const time = params[0].axisValue

        const details = params
          .filter((item) => item.value != null)
          .map((item) => {
            const station = selectedStations.find(
              (s) => s.station_id === item.seriesName
            )

            return `
              <div style="margin-top:8px">
                <strong>${item.seriesName}</strong>
                <div>${station?.city || '--'} · ${station?.site_type || '--'}</div>
                <strong>${formatValue(item.value)} µg/m³</strong>
              </div>
            `
          })
          .join('')

        return `
          <div>
            <strong>${time}</strong>
            ${details}
          </div>
        `
      },
    },

   legend: {
  show: true,
  type: 'scroll',
  bottom: 0,
  left: 'center',
  textStyle: {
    color: '#8490A5',
    fontSize: 11,
  },
},

    grid: {
      left: 65,
      right: 25,
      top: 25,
      bottom: 75,
      containLabel: true,
    },

    xAxis: {
  type: 'category',
  boundaryGap: false,
  data: timestamps.map((time) =>
    time.slice(5, 16)
  ),
  axisLabel: {
    color: '#8490A5',
    rotate: 35,
    hideOverlap: true,
    interval: 'auto',
  },
},

    yAxis: {
      type: 'value',
      name: 'µg/m³',
      axisLabel: {
        color: '#8490A5',
      },
    },

    series: selectedStations.map((station) => ({
  name: station.station_id,
  type: 'line',
  smooth: true,
  showSymbol: true,
  symbol: 'circle',
  symbolSize: 6,
  connectNulls: true,
  lineStyle: {
    width: 2.5,
  },
  emphasis: {
    focus: 'series',
  },
  data: timestamps.map((time) =>
    station.values[time] ?? null
  ),
}))



  }


  return (
    <div className="stack">

      
<div className="aq-critical-bars">
  <strong>Tren Konsentrasi pada 5 Stasiun dengan Lonjakan Tertinggi</strong>
  <p className="card-sub">
    Perbandingan perubahan konsentrasi polutan pada lima stasiun
    dengan lonjakan tertinggi berdasarkan parameter terpilih.
  </p>

  <EChart option={timelineOption} height={280} />


<div className="aq-critical-interpretation">
  <strong>Interpretasi Periode Kritis</strong>
  <p>{(() => {
    const highest = selectedStations[0]

    const peakTime = Object.entries(highest?.values || {})
      .sort((a, b) => b[1] - a[1])[0]?.[0]

    return highest
      ? ` ${highest.station_id} mencatat lonjakan tertinggi sebesar ${formatValue(highest.maxValue)} µg/m³ pada ${peakTime?.replace('T', ' ')}. Grafik menunjukkan variasi konsentrasi antarstasiun dengan karakteristik kawasan yang berbeda, sehingga dapat digunakan untuk mengidentifikasi lokasi dengan tingkat pencemaran paling kritis.`
      : ' Belum tersedia data untuk interpretasi periode kritis.'
  })()}</p>
</div>


</div>


<div className="aq-critical-table-heading">
  <strong>Rincian Data Periode Kritis</strong>
  <p className="card-sub">
    Daftar waktu, lokasi, karakteristik kawasan, konsentrasi,
    dan peningkatan polutan pada periode lonjakan yang terdeteksi.
  </p>
</div>

<div className="aq-bmua-table-wrap">
  <table className="aq-comparison-table">
    <thead>
      <tr>
        <th>Waktu</th>
        <th>Lokasi</th>
        <th>Provinsi</th>
        <th>Karakteristik Kawasan</th>
        <th>Polutan</th>
        <th>Konsentrasi (µg/m³)</th>
        <th>Ambang Analisis</th>
        <th>Peningkatan (%)</th>
        <th>Angin</th>
        <th>Status</th>
      </tr>
    </thead>

    <tbody>
      {top.map((item) => (
        <tr key={`${item.station_id}-${item.timestamp}-${item.parameter}`}>
          <td>{item.date} {item.hour}</td>
          <td>
            <strong>{item.station_id}</strong>
            {' · '}
            {item.city || '--'}
          </td>
          <td>{item.province || '--'}</td>
          <td>{item.site_type || '--'}</td>
          <td>{item.parameter}</td>
          <td><strong>{formatValue(item.value)}</strong></td>
          <td>{formatValue(item.threshold)}</td>
          <td>{formatValue(item.increase_pct)}%</td>
          <td>
            {formatValue(item.wind_speed, 1)} m/s
            {' · '}
            {formatValue(item.wind_direction, 0)}°
          </td>
          <td>
            <span className="aq-critical-status">
              Lonjakan terdeteksi
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

      <p className="card-sub">Periode kritis ditandai berdasarkan persentil ke-95 konsentrasi pada masing-masing stasiun dan parameter. Ini merupakan penanda lonjakan relatif dalam dataset, bukan ambang baku mutu dan bukan konfirmasi kabut asap.</p>
    </div>
  )
}

function DateRangePicker({ startDate, endDate, minDate, maxDate, years, onApply }) {
  const [open, setOpen] = useState(false)
  const [draftStart, setDraftStart] = useState(startDate)
  const [draftEnd, setDraftEnd] = useState(endDate)

  useEffect(() => {
    if (open) {
      setDraftStart(startDate)
      setDraftEnd(endDate)
    }
  }, [open, startDate, endDate])

  const formatDate = (value) => value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      })
    : '--'

  const chooseYear = (year) => {
    const first = `${year}-01-01`
    const last = `${year}-12-31`

    setDraftStart(first < minDate ? minDate : first)
    setDraftEnd(last > maxDate ? maxDate : last)
  }

  const apply = () => {
    if (!draftStart || !draftEnd || draftStart > draftEnd) return
    onApply(draftStart, draftEnd)
    setOpen(false)
  }

  return (
    <div className="aq-date-range-wrap">
      <button
        type="button"
        className="aq-date-range-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <CalendarDays size={17} />
        <strong>{formatDate(startDate)} – {formatDate(endDate)}</strong>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="aq-date-range-popover">
          <label className="aq-date-range-field">
            <span>Mulai</span>
            <input
              type="date"
              min={minDate}
              max={draftEnd || maxDate}
              value={draftStart}
              onChange={(event) => setDraftStart(event.target.value)}
            />
          </label>

          <label className="aq-date-range-field">
            <span>Selesai</span>
            <input
              type="date"
              min={draftStart || minDate}
              max={maxDate}
              value={draftEnd}
              onChange={(event) => setDraftEnd(event.target.value)}
            />
          </label>

<div className="aq-date-range-presets">
  <button
    type="button"
    className={
      draftStart === minDate && draftEnd === maxDate
        ? 'is-active'
        : ''
    }
    onClick={() => {
      setDraftStart(minDate)
      setDraftEnd(maxDate)
    }}
  >
    Semua Data
  </button>

  {years.slice().reverse().map((year) => {
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`
    const expectedStart = yearStart < minDate ? minDate : yearStart
    const expectedEnd = yearEnd > maxDate ? maxDate : yearEnd

    const active =
      draftStart === expectedStart &&
      draftEnd === expectedEnd

    return (
      <button
        type="button"
        key={year}
        className={active ? 'is-active' : ''}
        onClick={() => chooseYear(year)}
      >
        Tahun {year}
      </button>
    )
  })}
</div>

          <div className="aq-date-range-actions">
            <button type="button" onClick={() => setOpen(false)}>
              Batal
            </button>
            <button
              type="button"
              className="primary"
              onClick={apply}
              disabled={!draftStart || !draftEnd || draftStart > draftEnd}
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


// Filter rentang pengamatan untuk toolbar LocalFilter
function FilterDateRange({ value, bounds, years, onChange }) {
  return (
    <div className="aq-filter-field aq-filter-field--date">
      <span>Rentang pengamatan</span>
      <DateRangePicker
        startDate={value.dariTanggal || bounds.min}
        endDate={value.sampaiTanggal || bounds.max}
        minDate={bounds.min}
        maxDate={bounds.max}
        years={years}
        onApply={(dariTanggal, sampaiTanggal) =>
          onChange({ dariTanggal, sampaiTanggal })
        }
      />
    </div>
  )
}

function seasonScopeLabel({ pulau, provinsi, station_id }) {
  if (station_id && station_id !== 'Semua') return `Stasiun ${station_id}`
  if (provinsi && provinsi !== 'Semua') return provinsi
  if (pulau && pulau !== 'Semua') return pulau
  return 'Nasional'
}

// Cakupan wilayah (cascade) untuk toolbar LocalFilter
function FilterScope({
  rows,
  value,
  onChange,
  levels = ['pulau', 'provinsi'],
}) {
  const scopeValue = {
    pulau: value.pulau ?? 'Semua',
    provinsi: value.provinsi ?? 'Semua',
    station_id: value.station_id ?? 'Semua',
  }

  return (
    <div className="aq-filter-field aq-filter-field--date aq-filter-field--scope">
      <span>Cakupan wilayah</span>
      <RegionScopePicker
        rows={rows}
        value={scopeValue}
        levels={levels}
        onApply={onChange}
      />
    </div>
  )
}

// Teks cakupan untuk subtitle kartu: "Nasional", "Sumatera · Kawasan Industri", dst.
function filterScopeText(filter) {
  const scope = seasonScopeLabel(filter)

  return filter.kawasan && filter.kawasan !== 'Semua'
    ? `${scope} · Kawasan ${filter.kawasan}`
    : scope
}

function RegionScopePicker({
  rows = [],
  value,
  onApply,
  levels = ['pulau', 'provinsi', 'station_id'],
}) {
  const hasStation = levels.includes('station_id')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef(null)

  useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  useEffect(() => {
    if (!open) return

    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', close)

    return () => {
      document.removeEventListener('mousedown', close)
    }
  }, [open])

  const uniq = (list) => (
    [...new Set(list.filter(Boolean).map(String))].sort()
  )

  const islands = useMemo(
    () => uniq(rows.map((row) => row.pulau)),
    [rows]
  )

  const provinces = useMemo(() => uniq(
    rows
      .filter((row) =>
        draft.pulau === 'Semua' ||
        row.pulau === draft.pulau
      )
      .map((row) => row.provinsi)
  ), [rows, draft.pulau])

  const stations = useMemo(() => uniq(
    rows
      .filter((row) =>
        (draft.pulau === 'Semua' ||
          row.pulau === draft.pulau) &&
        (draft.provinsi === 'Semua' ||
          row.provinsi === draft.provinsi)
      )
      .map((row) => row.station_id)
  ), [rows, draft.pulau, draft.provinsi])

  const handleApply = (scope) => {
    onApply(
      hasStation
        ? {
            pulau: scope.pulau,
            provinsi: scope.provinsi,
            station_id: scope.station_id ?? 'Semua',
          }
        : { pulau: scope.pulau, provinsi: scope.provinsi }
    )
    setOpen(false)
  }

  return (
    <div className="aq-date-range-wrap" ref={ref}>
      <button
        type="button"
        className="aq-date-range-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <MapPin size={18} />

        <strong>{seasonScopeLabel(value)}</strong>

        <ChevronDown size={18} />
      </button>

      {open && (
        <div className="aq-date-range-popover">

          <label className="aq-date-range-field">
            <span>Pulau</span>

            <select
              value={draft.pulau}
              onChange={(e) =>
                setDraft({
                  pulau: e.target.value,
                  provinsi: 'Semua',
                  station_id: 'Semua',
                })
              }
            >
              <option value="Semua">Semua pulau</option>

              {islands.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="aq-date-range-field">
            <span>Provinsi</span>

            <select
              value={draft.provinsi}
              onChange={(e) =>
                setDraft((s) => ({
                  ...s,
                  provinsi: e.target.value,
                  station_id: 'Semua',
                }))
              }
            >
              <option value="Semua">Semua provinsi</option>

              {provinces.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          {hasStation && (
            <label className="aq-date-range-field">
              <span>Stasiun</span>

              <select
                value={draft.station_id}
                onChange={(e) =>
                  setDraft((s) => ({
                    ...s,
                    station_id: e.target.value,
                  }))
                }
              >
                <option value="Semua">Semua stasiun</option>

                {stations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="aq-date-range-actions">

            <button
              type="button"
              onClick={() => handleApply({
                pulau: 'Semua',
                provinsi: 'Semua',
                station_id: 'Semua',
              })}
            >
              Nasional
            </button>

            <button
              type="button"
              className="primary"
              onClick={() => handleApply(draft)}
            >
              Terapkan
            </button>

          </div>
        </div>
      )}
    </div>
  )
}

// ======================================================
// KLASIFIKASI KARAKTERISTIK KAWASAN — SECTION 07
// ======================================================

function classifyAreaType(siteType = '') {
  const value = String(siteType).toLowerCase()

  // Prioritas pertama: wilayah penyangga gambut
  if (value.includes('peatland')) {
    return 'Penyangga Gambut'
  }

  // Kawasan industri
  if (value.includes('industrial')) {
    return 'Industri'
  }

  // Kawasan latar bersih
  if (
    value.includes('clean background') ||
    value.includes('regional')
  ) {
    return 'Latar Bersih'
  }

  // Kawasan perkotaan dan lalu lintas
  if (
    value.includes('urban') ||
    value.includes('traffic') ||
    value.includes('roadside')
  ) {
    return 'Perkotaan'
  }

  return null
}

export default function KualitasUdaraPage() {
  const geo = useCoverageGeo()

  const [data, setData] = useState({
    bulanan: [],
    tahunan: [],
    harian: [],
    trendDaily: [],
    stations: [],
    hourly: [],
    weekend: [],
    seasonal: [],
    criticalPeriods: [],
  })


const overviewInsight = useMemo(() => {
  const dailyRows = data.harian || []

  // ISPU kategori Tidak Sehat+
  const unhealthyCategories = [
    'Tidak Sehat',
    'Sangat Tidak Sehat',
    'Berbahaya',
  ]

  const unhealthyCount = dailyRows.filter((row) =>
    unhealthyCategories.includes(row.kategori_ispu)
  ).length

  const unhealthyPercentage = dailyRows.length
    ? (unhealthyCount / dailyRows.length) * 100
    : null

  // Provinsi dengan rerata PM2.5 tertinggi
  const provinceGroups = {}

  dailyRows.forEach((row) => {
    const value = Number(row.pm25)

    if (
      !row.provinsi ||
      row.pm25 == null ||
      !Number.isFinite(value)
    ) return

    if (!provinceGroups[row.provinsi]) {
      provinceGroups[row.provinsi] = {
        values: [],
        stations: new Set(),
      }
    }

    provinceGroups[row.provinsi].values.push(value)

    if (row.station_id) {
      provinceGroups[row.provinsi].stations.add(row.station_id)
    }
  })

  const highestProvince = Object.entries(provinceGroups)
    .map(([name, group]) => ({
      name,
      value: average(group.values),
      observations: group.values.length,
      stationCount: group.stations.size,
    }))
    .sort((a, b) => b.value - a.value)[0] ?? null

  // Jam dengan rerata PM2.5 tertinggi
  const hourlyRows = (data.hourly || []).filter(
    (row) =>
      row.satuan === 'µg/m³' &&
      row.pm25 != null &&
      Number.isFinite(Number(row.pm25))
  )

  const criticalHour = [...hourlyRows].sort(
    (a, b) => Number(b.pm25) - Number(a.pm25)
  )[0] ?? null

  // Perubahan rerata PM2.5 tahunan 2024–2025
  const annualRows = (data.tahunan || []).filter(
    (row) =>
      row.satuan === 'µg/m³' &&
      [2024, 2025].includes(Number(row.tahun)) &&
      row.pm25 != null &&
      Number.isFinite(Number(row.pm25))
  )

  const annualGroups = {}

  annualRows.forEach((row) => {
    const year = Number(row.tahun)

    if (!annualGroups[year]) {
      annualGroups[year] = {}
    }

    annualGroups[year][row.station_id] = Number(row.pm25)
  })

  const commonStations = Object.keys(annualGroups[2024] || {})
    .filter((station) =>
      annualGroups[2025]?.[station] !== undefined
    )

  const average2024 = average(
    commonStations.map((station) => annualGroups[2024][station])
  )

  const average2025 = average(
    commonStations.map((station) => annualGroups[2025][station])
  )

  const trendChange =
    average2024 !== null &&
    average2025 !== null &&
    average2024 !== 0
      ? ((average2025 - average2024) / average2024) * 100
      : null

  return {
    unhealthyCount,
    totalDaily: dailyRows.length,
    unhealthyPercentage,
    highestProvince,
    criticalHour,
    trendChange,
    commonStationCount: commonStations.length,
  }
}, [data.harian, data.hourly, data.tahunan])

  const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

// FILTER SECTION 03 - TREN
const [trendFilter, setTrendFilter] = useState({
  dariTanggal: '2024-01-01',
  sampaiTanggal: '2026-10-14',
  pulau: 'Semua',
  provinsi: 'Semua',
  parameter: 'pm25',
  mode: 'bulanan',
})

const [trendDateOpen, setTrendDateOpen] = useState(false)

const [trendDateDraft, setTrendDateDraft] = useState({
  dariTanggal: '2024-01-01',
  sampaiTanggal: '2026-10-14',
})

// FILTER SECTION 04 - RANKING PROVINSI
const [rankingFilter, setRankingFilter] = useState({
  tahun: 'Semua',
  bulan: 'Semua',
  parameter: 'pm25',
})

// FILTER SECTION 04 - DISTRIBUSI ISPU
const [ispuFilter, setIspuFilter] = useState({
  tahun: 'Semua',
  bulan: 'Semua',
  pulau: 'Semua',
  provinsi: 'Semua',
})

// FILTER SECTION 04 - RANKING POLUTAN
const [pollutantFilter, setPollutantFilter] = useState({
  tahun: 'Semua',
  bulan: 'Semua',
  parameter: 'PM2.5',
});

const [boxplotFilter, setBoxplotFilter] = useState({
  dariTanggal: '2024-01-01',
  sampaiTanggal: '2026-10-14',
  parameter: 'pm25',
});

// FILTER SECTION 04 - PERBANDINGAN ANTARPULAU
const [islandFilter, setIslandFilter] = useState({
  tahun: 'Semua',
  bulan: 'Semua',
  parameter: 'pm25',
})

// FILTER SECTION 04 - TABEL PROVINSI
const [tableFilter, setTableFilter] = useState({
  dariTanggal: '',
  sampaiTanggal: '',
  tampilan: 'provinsi',
})

// FILTER EVALUASI BAKU MUTU UDARA AMBIEN

const [bmuaFilter, setBmuaFilter] = useState({
  dariTanggal: '',
  sampaiTanggal: '',
  parameter: 'pm25',
  tingkat: 'pulau',
  acuan: 'bmua',
})


// FILTER SECTION LAINNYA
const [stationFilter, setStationFilter] = useState({
  tahun: 'Semua',
  bulan: 'Semua',
  parameter: 'pm25',
})

const [timeFilter, setTimeFilter] = useState({
  dariTanggal: '',
  sampaiTanggal: '',
  kawasan: 'Semua',
  pulau: 'Semua',
  provinsi: 'Semua',
  station_id: 'Semua',
  parameter: 'pm25',
})

const [seasonFilter, setSeasonFilter] = useState({
  dariTanggal: '',
  sampaiTanggal: '',
  parameter: 'pm25',
  pulau: 'Semua',
  provinsi: 'Semua',
  station_id: 'Semua',
  kawasan: 'Semua',
})

const [hazeFilter, setHazeFilter] = useState({
  dariTanggal: '',
  sampaiTanggal: '',
  pulau: 'Semua',
  provinsi: 'Semua',
})

// State stasiun yang dipilih pada peta kabut asap
const [selectedHazeStation, setSelectedHazeStation] = useState(null)
// FILTER SECTION 07 — KARAKTERISTIK KAWASAN

const [areaFilter, setAreaFilter] = useState({
  dariTanggal: '',
  sampaiTanggal: '',
  pulau: 'Semua',
  provinsi: 'Semua',
  parameter: 'pm25',
})


const [criticalFilter, setCriticalFilter] = useState({
  dariTanggal: '',
  sampaiTanggal: '',
  pulau: 'Semua',
  provinsi: 'Semua',
  parameter: 'pm25',
})


const [selectedStation, setSelectedStation] = useState(null)

  useEffect(() => {
    let active = true

    async function loadData() {
      try {
        const base = '/data/kualitas-udara/'

        const files = [
  'aqms_bulanan.json',
  'aqms_tahunan.json',
  'aqms_ispu_harian.json',
  'aqms_stasiun_map.json',
  'aqms_tren_harian.json',
]

        const results = await Promise.all(
          files.map(async (file) => {
            const response = await fetch(base + file)

            if (!response.ok) {
              throw new Error(`Gagal memuat ${file}`)
            }

            return response.json()
          })
        )

        if (!active) return

        setData((old) => ({
          ...old,
          bulanan: results[0],
          tahunan: results[1],
          harian: results[2],
          stations: results[3],
          trendDaily: results[4],
        }))
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadOptional() {
      const files = [
        ['hourly', 'aqms_pola_jam.json'],
        ['weekend', 'aqms_hari_kerja.json'],
        ['seasonal', 'aqms_musim.json'],
        ['criticalPeriods', 'aqms_periode_kritis.json'],
      ]

      const result = await Promise.all(
        files.map(async ([key, file]) => {
          try {
            const response = await fetch(`/data/kualitas-udara/${file}`)
            if (!response.ok) return [key, []]
            return [key, await response.json()]
          } catch {
            return [key, []]
          }
        })
      )

      if (active) {
        setData((old) => ({
          ...old,
          ...Object.fromEntries(result),
        }))
      }
    }

    loadOptional()

    return () => {
      active = false
    }
  }, [])

  const years = useMemo(() => (
    [...new Set(data.harian.map(getYear).filter(Boolean))].sort()
  ), [data.harian])

  const yearOptions = [
    { value: 'Semua', label: 'Semua tahun' },
    ...years.map((year) => ({ value: year, label: year })),
  ]

  const monthOptions = [
    { value: 'Semua', label: 'Semua bulan' },
    ...MONTHS.map((month, index) => ({
      value: String(index + 1).padStart(2, '0'),
      label: month,
    })),
  ]

  const islands = useMemo(() => (
    [...new Set(data.stations.map((row) => row.pulau).filter(Boolean))].sort()
  ), [data.stations])

  const provinces = useMemo(() => (
    [...new Set(data.stations.map((row) => row.provinsi).filter(Boolean))].sort()
  ), [data.stations])

  const provinceOptions = [
  { value: 'Semua', label: 'Semua provinsi' },
  ...provinces.map((value) => ({
    value,
    label: value,
  })),
]

  const stationIds = useMemo(() => (
    [...new Set(data.stations.map((row) => row.station_id).filter(Boolean))].sort()
  ), [data.stations])

  const islandOptions = [
    { value: 'Semua', label: 'Semua pulau' },
    ...islands.map((value) => ({ value, label: value })),
  ]

  const trendProvinces = useMemo(() => (
  [...new Set(
    data.stations
      .filter((row) =>
        trendFilter.pulau === 'Semua' ||
        row.pulau === trendFilter.pulau
      )
      .map((row) => row.provinsi)
      .filter(Boolean)
  )].sort()
), [data.stations, trendFilter.pulau])

const trendProvinceOptions = [
  { value: 'Semua', label: 'Semua provinsi' },
  ...trendProvinces.map((value) => ({
    value,
    label: value,
  })),
]
const ispuProvinces = useMemo(() => (
  [...new Set(
    data.stations
      .filter((row) =>
        ispuFilter.pulau === 'Semua' ||
        row.pulau === ispuFilter.pulau
      )
      .map((row) => row.provinsi)
      .filter(Boolean)
  )].sort()
), [data.stations, ispuFilter.pulau])

const ispuProvinceOptions = [
  { value: 'Semua', label: 'Semua provinsi' },
  ...ispuProvinces.map((value) => ({
    value,
    label: value,
  })),
]
  const parameterOptions = Object.entries(PARAMETERS).map(
    ([value, item]) => ({
      value,
      label: item.label,
    })
  )

  const stationOptions = [
    { value: 'Semua', label: 'Semua stasiun' },
    ...stationIds.map((value) => ({ value, label: value })),
  ]

  const filterRows = (rows, filter) => rows.filter((row) => (
  isInDateRange(row, filter.dariTanggal, filter.sampaiTanggal) &&

  (!filter.tahun || filter.tahun === 'Semua' ||
    getYear(row) === filter.tahun) &&

  (!filter.bulan || filter.bulan === 'Semua' ||
    getMonth(row) === filter.bulan) &&

  (!filter.pulau || filter.pulau === 'Semua' ||
    row.pulau === filter.pulau) &&

  (!filter.provinsi || filter.provinsi === 'Semua' ||
    row.provinsi === filter.provinsi)
))

const [stationPeriodFilter, setStationPeriodFilter] = useState({
  mode: 'harian',
  dariTanggal: '2024-01-01',
  sampaiTanggal: '2026-10-14',
})

const [stationDateOpen, setStationDateOpen] = useState(false)

const [stationDateDraft, setStationDateDraft] = useState({
  dariTanggal: '2024-01-01',
  sampaiTanggal: '2026-10-14',
})

// RINGKASAN TEMUAN KUALITAS UDARA
const findings = useMemo(() => {
  const rows = data.harian

  // 1. PROPORSI ISPU TIDAK SEHAT KE ATAS
  const unhealthyCategories = [
    'Tidak Sehat',
    'Sangat Tidak Sehat',
    'Berbahaya',
  ]

  const unhealthyCount = rows.filter((row) =>
    unhealthyCategories.includes(row.kategori_ispu)
  ).length

  const unhealthyPercentage = rows.length
    ? (unhealthyCount / rows.length) * 100
    : null


  // 2. PROVINSI DENGAN RERATA PM2.5 TERTINGGI
  const provinceGroups = {}

  rows.forEach((row) => {
    const value = Number(row.pm25)

    if (!row.provinsi || !Number.isFinite(value)) return

    if (!provinceGroups[row.provinsi]) {
      provinceGroups[row.provinsi] = []
    }

    provinceGroups[row.provinsi].push(value)
  })

  const highestProvince = Object.entries(provinceGroups)
    .map(([name, values]) => ({
      name,
      value: average(values),
      observations: values.length,
    }))
    .sort((a, b) => b.value - a.value)[0] ?? null


  // 3. PERIODE PALING KRITIS BERDASARKAN POLA JAM
  const hourlyRows = data.hourly.filter(
    (row) => row.satuan === 'µg/m³'
  )

  const criticalHour = [...hourlyRows]
    .filter((row) => Number.isFinite(Number(row.pm25)))
    .sort((a, b) => b.pm25 - a.pm25)[0] ?? null


  // 4. TREN KUALITAS UDARA 2024–2025
  // Menggunakan periode tahunan lengkap dan stasiun yang sama.
  const annualRows = data.tahunan.filter(
    (row) =>
      row.satuan === 'µg/m³' &&
      [2024, 2025].includes(Number(row.tahun))
  )

  const annualGroups = {}

  annualRows.forEach((row) => {
    const year = Number(row.tahun)

    if (!annualGroups[year]) {
      annualGroups[year] = {}
    }

    if (!annualGroups[year][row.station_id]) {
      annualGroups[year][row.station_id] = Number(row.pm25)
    }
  })

  const commonStations = Object.keys(annualGroups[2024] || {})
    .filter((station) =>
      Number.isFinite(annualGroups[2024][station]) &&
      Number.isFinite(annualGroups[2025]?.[station])
    )

  const previousYear = average(
    commonStations.map(
      (station) => annualGroups[2024][station]
    )
  )

  const currentYear = average(
    commonStations.map(
      (station) => annualGroups[2025][station]
    )
  )

  const trendChange =
    previousYear !== null &&
    currentYear !== null &&
    previousYear !== 0
      ? ((currentYear - previousYear) / previousYear) * 100
      : null

  const trendStatus =
    trendChange === null
      ? 'Belum tersedia'
      : trendChange > 0
        ? 'Memburuk'
        : trendChange < 0
          ? 'Membaik'
          : 'Stabil'

  return {
    unhealthyPercentage,
    unhealthyCount,
    totalObservations: rows.length,
    highestProvince,
    criticalHour,
    trendChange,
    trendStatus,
    previousYear,
    currentYear,
    commonStationCount: commonStations.length,
  }
}, [data.harian, data.hourly, data.tahunan])

const trendDateBounds = useMemo(() => {
  const dates = data.trendDaily
    .map((row) => String(row.tanggal ?? '').slice(0, 10))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort()

  return {
    min: dates[0] || '2024-01-01',
    max: dates[dates.length - 1] || '2026-10-14',
  }
}, [data.trendDaily])  

const [boxplotDateOpen, setBoxplotDateOpen] = useState(false)

const [boxplotDateDraft, setBoxplotDateDraft] = useState({
  dariTanggal: boxplotFilter.dariTanggal,
  sampaiTanggal: boxplotFilter.sampaiTanggal,
})

const applyBoxplotDatePreset = (year) => {
  let dariTanggal = trendDateBounds.min
  let sampaiTanggal = trendDateBounds.max

  if (year !== 'Semua') {
    dariTanggal = `${year}-01-01`
    sampaiTanggal = `${year}-12-31`

    if (dariTanggal < trendDateBounds.min) {
      dariTanggal = trendDateBounds.min
    }

    if (sampaiTanggal > trendDateBounds.max) {
      sampaiTanggal = trendDateBounds.max
    }
  }

  setBoxplotDateDraft({ dariTanggal, sampaiTanggal })
}

const confirmBoxplotDate = () => {
  setBoxplotFilter((state) => ({
    ...state,
    dariTanggal: boxplotDateDraft.dariTanggal,
    sampaiTanggal: boxplotDateDraft.sampaiTanggal,
  }))

  setBoxplotDateOpen(false)
}

const resetBoxplotDate = () => {
  setBoxplotFilter((state) => ({
    ...state,
    dariTanggal: trendDateBounds.min,
    sampaiTanggal: trendDateBounds.max,
  }))

  setBoxplotDateDraft({
    dariTanggal: trendDateBounds.min,
    sampaiTanggal: trendDateBounds.max,
  })

  setBoxplotDateOpen(false)
}

const trendRows = useMemo(() => {
  return data.trendDaily.filter((row) => {
    const tanggal = String(row.tanggal ?? '').slice(0, 10)

    return (
      tanggal >= trendFilter.dariTanggal &&
      tanggal <= trendFilter.sampaiTanggal &&
      row.satuan === 'µg/m³' &&
      (trendFilter.pulau === 'Semua' ||
        row.pulau === trendFilter.pulau) &&
      (trendFilter.provinsi === 'Semua' ||
        row.provinsi === trendFilter.provinsi)
    )
  })
}, [data.trendDaily, trendFilter])

// ======================================================
// DATA SECTION 07 — PERBANDINGAN KARAKTERISTIK KAWASAN
// ======================================================

const areaGroups = useMemo(() => {
  const categories = [
    'Perkotaan',
    'Industri',
    'Latar Bersih',
    'Penyangga Gambut',
  ]

  const stationLookup = new Map(
    data.stations.map((station) => [
      station.station_id,
      station,
    ])
  )

  // Filter data bulanan
  const filteredRows = data.bulanan.filter((row) => {
    return (
      row.satuan === 'µg/m³' &&
      isInDateRange(row, areaFilter.dariTanggal, areaFilter.sampaiTanggal) &&
      (areaFilter.pulau === 'Semua' ||
        row.pulau === areaFilter.pulau) &&
      (areaFilter.provinsi === 'Semua' ||
        row.provinsi === areaFilter.provinsi) &&
      Number.isFinite(Number(row[areaFilter.parameter]))
    )
  })

  // Pengelompokan berdasarkan tipe kawasan
  return categories.map((category) => {
    const groupRows = filteredRows.filter((row) => {
      const station = stationLookup.get(row.station_id)

      return classifyAreaType(station?.site_type) === category
    })

    // Rata-rata tertimbang berdasarkan jumlah hari
    const totalDays = groupRows.reduce(
      (sum, row) => sum + (Number(row.jumlah_hari) || 1),
      0
    )

    const concentration = totalDays
      ? groupRows.reduce(
          (sum, row) =>
            sum +
            Number(row[areaFilter.parameter]) *
            (Number(row.jumlah_hari) || 1),
          0
        ) / totalDays
      : null

    return {
      name: category,
      concentration,
      stationCount: new Set(
        groupRows.map((row) => row.station_id)
      ).size,
      recordCount: groupRows.length,
      totalDays,
    }
  })
}, [
  data.bulanan,
  data.stations,
  areaFilter,
])

// ======================================================
// GRAFIK SECTION 07
// ======================================================

const areaChartOption = {
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
    formatter: (params) => {
      const item = areaGroups[params[0]?.dataIndex]

      if (!item) return ''

      return `
        <strong>${item.name}</strong>
        <br/>
        Rata-rata: ${formatValue(item.concentration)} µg/m³
        <br/>
        Jumlah stasiun: ${item.stationCount}
        <br/>
        Jumlah data: ${item.recordCount.toLocaleString('id-ID')}
      `
    },
  },

  grid: {
    left: 65,
    right: 25,
    top: 45,
    bottom: 65,
    containLabel: true,
  },

  xAxis: {
    type: 'category',
    data: areaGroups.map((item) => item.name),
    axisLabel: {
      color: '#8490A5',
      fontSize: 11,
      interval: 0,
      rotate: 0,
    },
    axisLine: {
      lineStyle: {
        color: '#D7DFE8',
      },
    },
  },

  yAxis: {
    type: 'value',
    name: 'µg/m³',
    nameTextStyle: {
      color: '#8490A5',
    },
    axisLabel: {
      color: '#8490A5',
    },
    splitLine: {
      lineStyle: {
        color: '#E5EAF0',
        type: 'dashed',
      },
    },
  },

  series: [
    {
      name: 'Rata-rata konsentrasi',
      type: 'bar',
      barWidth: '42%',
      data: areaGroups.map((item) => ({
        value: item.concentration,
        itemStyle: {
          color: {
            Perkotaan: '#5482C9',
            Industri: '#E99A50',
            'Latar Bersih': '#45B5A0',
            'Penyangga Gambut': '#A9BD42',
          }[item.name],
          borderRadius: [7, 7, 0, 0],
        },
      })),

      label: {
        show: true,
        position: 'top',
        color: '#526984',
        fontSize: 11,
        formatter: (params) =>
          params.value == null
            ? ''
            : formatValue(params.value),
      },
    },
  ],
}

// ======================================================
// INTERPRETASI SECTION 07
// ======================================================

const areaRanked = areaGroups
  .filter((item) => item.concentration !== null)
  .sort((a, b) => b.concentration - a.concentration)

const areaHighest = areaRanked[0] || null

const areaLowest =
  areaRanked.length > 1
    ? areaRanked[areaRanked.length - 1]
    : null

const areaParameterLabel =
  PARAMETERS[areaFilter.parameter]?.label || areaFilter.parameter

const areaHasData = areaRanked.length > 0

const resetTrend = () => {
  setTrendFilter({
    dariTanggal: '2024-01-01',
    sampaiTanggal: '2026-10-14',
    pulau: 'Semua',
    provinsi: 'Semua',
    parameter: 'pm25',
    mode: 'bulanan',
  })

  setTrendDateDraft({
    dariTanggal: '2024-01-01',
    sampaiTanggal: '2026-10-14',
  })

  setTrendDateOpen(false)
}

const applyStationDatePreset = (year) => {
  setStationDateDraft(
    year === 'Semua'
      ? {
          dariTanggal: '2024-01-01',
          sampaiTanggal: '2026-10-14',
        }
      : {
          dariTanggal: `${year}-01-01`,
          sampaiTanggal:
            year === '2026'
              ? '2026-10-14'
              : `${year}-12-31`,
        }
  )
}

const confirmStationDate = () => {
  setStationPeriodFilter((state) => ({
    ...state,
    ...stationDateDraft,
  }))

  setStationDateOpen(false)
}

const resetStationPeriod = () => {
  const defaultDates = {
    dariTanggal: '2024-01-01',
    sampaiTanggal: '2026-10-14',
  }

  setStationPeriodFilter((state) => ({
    ...state,
    ...defaultDates,
  }))

  setStationDateDraft(defaultDates)
  setStationDateOpen(false)
}

  const resetRanking = () => setRankingFilter({
    tahun: 'Semua',
    bulan: 'Semua',
    parameter: 'pm25',
  })

  const resetIspu = () => setIspuFilter({
    tahun: 'Semua',
    bulan: 'Semua',
    pulau: 'Semua',
    provinsi: 'Semua',
  })

  const resetPollutant = () => setPollutantFilter({
    tahun: 'Semua',
    bulan: 'Semua',
    parameter: 'pm25',
  })

  const resetIsland = () => setIslandFilter({
    tahun: 'Semua',
    bulan: 'Semua',
    parameter: 'pm25',
  })

  const resetTable = () => setTableFilter({
    tahun: 'Semua',
    bulan: 'Semua',
    pulau: 'Semua',
  })


const applyTrendPreset = (year) => {
  setTrendDateDraft(
    year === 'Semua'
      ? {
          dariTanggal: '2024-01-01',
          sampaiTanggal: '2026-10-14',
        }
      : {
          dariTanggal: `${year}-01-01`,
          sampaiTanggal:
            year === '2026'
              ? '2026-10-14'
              : `${year}-12-31`,
        }
  )
}

const confirmTrendDate = () => {
  setTrendFilter((state) => ({
    ...state,
    ...trendDateDraft,
  }))

  setTrendDateOpen(false)
}

const trendStationCount = useMemo(() => (
  new Set(
    trendRows.map((row) => row.station_id)
  ).size
), [trendRows])

  
const trendOption = useMemo(() => {
  const groups = {}

  trendRows.forEach((row) => {
    const tanggal = String(row.tanggal).slice(0, 10)

    let label = tanggal

    if (trendFilter.mode === 'bulanan') {
      label = tanggal.slice(0, 7)
    }

    if (trendFilter.mode === 'tahunan') {
      label = tanggal.slice(0, 4)
    }

    const value = Number(row[trendFilter.parameter])

    if (!label || !Number.isFinite(value)) return

    if (!groups[label]) groups[label] = []
    groups[label].push(value)
  })

  const labels = Object.keys(groups).sort()

  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) =>
        `${formatValue(value, 2)} µg/m³`,
    },

    grid: {
      left: 55,
      right: 24,
      top: 28,
      bottom: 45,
    },

    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        color: '#8490A5',
        hideOverlap: true,
      },
    },

    yAxis: {
      type: 'value',
      name: 'µg/m³',
    },

    series: [{
      type: 'line',
      smooth: true,
      data: labels.map((label) => average(groups[label])),
      symbol: labels.length <= 24 ? 'circle' : 'none',
      showSymbol: labels.length <= 24,
      symbolSize: 6,
      lineStyle: {
        width: 3,
        color: '#4F83CC',
      },
      itemStyle: {
        color: '#4F83CC',
      },
      areaStyle: {
        opacity: 0.08,
      },
    }],
  }
}, [trendRows, trendFilter])

// RINGKASAN DAN INTERPRETASI TREN
const trendInsight = useMemo(() => {
  const groups = {}

  trendRows.forEach((row) => {
    const tanggal = String(row.tanggal ?? '').slice(0, 10)

    let label = tanggal

    if (trendFilter.mode === 'bulanan') {
      label = tanggal.slice(0, 7)
    }

    if (trendFilter.mode === 'tahunan') {
      label = tanggal.slice(0, 4)
    }

    const value = Number(row[trendFilter.parameter])

    if (!label || !Number.isFinite(value)) return

    if (!groups[label]) groups[label] = []
    groups[label].push(value)
  })

  const points = Object.keys(groups)
    .sort()
    .map((label) => ({
      label,
      value: average(groups[label]),
    }))

  if (points.length < 2) {
    return { available: false }
  }

  const first = points[0]
  const last = points[points.length - 1]

  // Arah tren berdasarkan regresi linear seluruh periode
  const meanX = (points.length - 1) / 2
  const meanY = average(points.map((point) => point.value))

  const numerator = points.reduce(
    (sum, point, index) =>
      sum + (index - meanX) * (point.value - meanY),
    0
  )

  const denominator = points.reduce(
    (sum, point, index) =>
      sum + Math.pow(index - meanX, 2),
    0
  )

  const slope = denominator ? numerator / denominator : 0

  const direction =
    slope > 0.000001
      ? 'Meningkat'
      : slope < -0.000001
        ? 'Menurun'
        : 'Relatif stabil'

  // Perubahan konsentrasi awal dibanding akhir
  const difference = last.value - first.value

  const percentage = first.value !== 0
    ? (difference / first.value) * 100
    : null

  const parameter = PARAMETERS[trendFilter.parameter].label

  const directionText =
    direction === 'Meningkat'
      ? 'menunjukkan kecenderungan pemburukan kualitas udara'
      : direction === 'Menurun'
        ? 'menunjukkan kecenderungan perbaikan kualitas udara'
        : 'tidak menunjukkan perubahan arah yang berarti'

  const interpretation =
    `Berdasarkan tren ${parameter}, konsentrasi polutan ` +
    `${directionText} selama periode pengamatan. ` +
    `Arah kecenderungan ditentukan berdasarkan pola seluruh ` +
    `${points.length} periode pengamatan. Sebagai pembanding, ` +
    `rata-rata konsentrasi pada periode awal (${first.label}) ` +
    `sebesar ${formatValue(first.value, 2)} µg/m³, sedangkan ` +
    `pada periode akhir (${last.label}) sebesar ` +
    `${formatValue(last.value, 2)} µg/m³` +
    (percentage === null
      ? '.'
      : `, atau berubah ${percentage > 0 ? 'meningkat' : percentage < 0 ? 'menurun' : 'tetap'} sebesar ${formatValue(Math.abs(percentage), 2)}% dibandingkan periode awal.`) +
    ` Penilaian ini menggambarkan kecenderungan parameter ${parameter}, ` +
    `bukan kondisi seluruh parameter kualitas udara.`

  return {
    available: true,
    direction,
    firstValue: first.value,
    lastValue: last.value,
    firstPeriod: first.label,
    lastPeriod: last.label,
    percentage,
    interpretation,
    pointCount: points.length,
  }
}, [trendRows, trendFilter])

  const stationRows = useMemo(() => (
    filterRows(data.harian, stationFilter)
  ), [data.harian, stationFilter])

  const mapStations = data.stations

  const stationPeriodRows = useMemo(() => {
  if (!selectedStation) return []

  return data.harian.filter((row) => {
    const tanggal = String(row.tanggal ?? '').slice(0, 10)

    return (
      row.station_id === selectedStation.station_id &&
      tanggal >= stationPeriodFilter.dariTanggal &&
      tanggal <= stationPeriodFilter.sampaiTanggal
    )
  })
}, [data.harian, selectedStation, stationPeriodFilter])

  // DATA RANKING RATA-RATA KONSENTRASI PER PROVINSI
const rankingRows = useMemo(() => (
  filterRows(data.harian, rankingFilter)
), [data.harian, rankingFilter])

const rankingPpmStations = useMemo(() => {
  const ppmStationIds = data.stations
    .filter((station) => station.satuan?.toLowerCase() === 'ppm')
    .map((station) => station.station_id)

  return new Set(ppmStationIds).size
}, [data.stations])

const ranking = useMemo(() => {
  const groups = {}

  rankingRows.forEach((row) => {
    const province = row.provinsi || 'Tidak diketahui'
    const value = Number(row[rankingFilter.parameter])

    if (!Number.isFinite(value)) return

    if (!groups[province]) groups[province] = []
    groups[province].push(value)
  })

  return Object.entries(groups)
    .map(([name, values]) => ({
      name,
      value: average(values),
    }))
    .filter((row) => row.value !== null)
    .sort((a, b) => b.value - a.value)
}, [rankingRows, rankingFilter.parameter])

const rankingColors = [
  '#245B8F',
  '#347FB0',
  '#55A6BD',
  '#64BDA5',
  '#91CF9B',
  '#B5DDAA',
  '#C5E3B5',
  '#D2E9C5',
  '#DCEED3',
  '#E7F2E0',
]

const rankingOption = buildBarOption(
  ranking.slice(0, 10).map((row) => row.name),
  ranking.slice(0, 10).map((row) => row.value),
  rankingColors.slice(0, ranking.slice(0, 10).length)
)

// DATA DISTRIBUSI KATEGORI ISPU
const ispuRows = useMemo(() => (
  filterRows(data.harian, ispuFilter)
), [data.harian, ispuFilter])


// DATA RANKING POLUTAN PER PROVINSI
const pollutantRows = useMemo(() => {
  return data.trendDaily.filter((row) => {
    const tanggal = String(row.tanggal ?? '').slice(0, 10);

    return (
      (!pollutantFilter.dariTanggal ||
        tanggal >= pollutantFilter.dariTanggal) &&

      (!pollutantFilter.sampaiTanggal ||
        tanggal <= pollutantFilter.sampaiTanggal) &&

      row.satuan === 'µg/m³' &&

      Number.isFinite(Number(row[pollutantFilter.parameter]))
    );
  });
}, [data.trendDaily, pollutantFilter]);

// DATA DISTRIBUSI POLUTAN ANTARWILAYAH (BOXPLOT)
const boxplotRows = useMemo(() => {
  return data.trendDaily.filter((row) => {
    const tanggal = String(row.tanggal ?? '').slice(0, 10);

    return (
      (!boxplotFilter.dariTanggal ||
        tanggal >= boxplotFilter.dariTanggal) &&

      (!boxplotFilter.sampaiTanggal ||
        tanggal <= boxplotFilter.sampaiTanggal) &&

      row.satuan === 'µg/m³' &&

      Number.isFinite(Number(row[boxplotFilter.parameter]))
    );
  });
}, [data.trendDaily, boxplotFilter]);

// DATA PERBANDINGAN ANTARPULAU
const islandRows = useMemo(() => (
  filterRows(data.harian, islandFilter)
), [data.harian, islandFilter])

const islandGroups = useMemo(() => {
  const groups = {}

  islandRows.forEach((row) => {
    const island = row.pulau || 'Tidak diketahui'
    const value = Number(row[islandFilter.parameter])

    if (!Number.isFinite(value)) return

    if (!groups[island]) groups[island] = []
    groups[island].push(value)
  })

  return Object.entries(groups)
    .map(([name, values]) => ({
      name,
      value: average(values),
    }))
    .filter((row) => row.value !== null)
    .sort((a, b) => b.value - a.value)
}, [islandRows, islandFilter.parameter])

const islandOption = buildBarOption(
  islandGroups.map((row) => row.name),
  islandGroups.map((row) => row.value),
  '#75A6C8'
)


// DATA TABEL PERBANDINGAN PROVINSI
// BATAS TANGGAL DATA TABEL
const tableDateBounds = useMemo(() => {
  const dates = data.harian
    .map((row) => String(row.tanggal ?? '').slice(0, 10))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort()

  return {
    min: dates[0] || '2024-01-01',
    max: dates[dates.length - 1] || '2026-10-14',
  }
}, [data.harian])

const [tableDateOpen, setTableDateOpen] = useState(false)

const [tableDateDraft, setTableDateDraft] = useState({
  dariTanggal: tableDateBounds.min,
  sampaiTanggal: tableDateBounds.max,
})

const applyTableDatePreset = (value) => {
  let dariTanggal = tableDateBounds.min
  let sampaiTanggal = tableDateBounds.max

  if (value !== 'Semua') {
    dariTanggal = `${value}-01-01`
    sampaiTanggal = `${value}-12-31`

    if (dariTanggal < tableDateBounds.min) {
      dariTanggal = tableDateBounds.min
    }

    if (sampaiTanggal > tableDateBounds.max) {
      sampaiTanggal = tableDateBounds.max
    }
  }

  setTableDateDraft({ dariTanggal, sampaiTanggal })
}

const confirmTableDate = () => {
  setTableFilter((prev) => ({
    ...prev,
    dariTanggal: tableDateDraft.dariTanggal,
    sampaiTanggal: tableDateDraft.sampaiTanggal,
  }))

  setTableDateOpen(false)
}

const resetTablePeriod = () => {
  setTableFilter((prev) => ({
    ...prev,
    dariTanggal: '',
    sampaiTanggal: '',
  }))

  setTableDateDraft({
    dariTanggal: tableDateBounds.min,
    sampaiTanggal: tableDateBounds.max,
  })

  setTableDateOpen(false)
}

// DATA TABEL PERBANDINGAN
const tableRows = useMemo(() => {
  const start = tableFilter.dariTanggal || tableDateBounds.min
  const end = tableFilter.sampaiTanggal || tableDateBounds.max

  return data.harian.filter((row) => {
    const date = String(row.tanggal ?? '').slice(0, 10)
    return date >= start && date <= end
  })
}, [
  data.harian,
  tableFilter.dariTanggal,
  tableFilter.sampaiTanggal,
  tableDateBounds,
])

// DATA EVALUASI BMUA

const bmuaResult = useMemo(() => {
  const start = bmuaFilter.dariTanggal || tableDateBounds.min
  const end = bmuaFilter.sampaiTanggal || tableDateBounds.max

  const stationLookup = Object.fromEntries(
    data.stations.map((station) => [station.station_id, station])
  )

  const parameterUnit = `${bmuaFilter.parameter}_unit`

  const sourceRows = data.harian.filter((row) => {
    const date = String(row.tanggal ?? '').slice(0, 10)
    const station = stationLookup[row.station_id]
    const unit = String(station?.[parameterUnit] ?? '')
      .toLowerCase()
      .replace(/\s/g, '')

    return (
      date >= start &&
      date <= end &&
      ['ug/m3', 'µg/m³'].includes(unit)
    )
  })

  const standard =
    AIR_QUALITY_STANDARDS[bmuaFilter.acuan]
      ?.values[bmuaFilter.parameter] ?? null

  const standardLabel =
    AIR_QUALITY_STANDARDS[bmuaFilter.acuan]?.label ?? ''

  const groupKey =
    bmuaFilter.tingkat === 'pulau'
      ? 'pulau'
      : bmuaFilter.tingkat === 'provinsi'
        ? 'provinsi'
        : 'station_id'

  const groups = {}

  sourceRows.forEach((row) => {
    const key = row[groupKey] || 'Tidak diketahui'
    const value = Number(row[bmuaFilter.parameter])

    if (!Number.isFinite(value)) return

    if (!groups[key]) groups[key] = []
    groups[key].push(value)
  })

  const rows = Object.entries(groups)
    .map(([name, values]) => {
      const concentration = average(values)
      const difference =
        standard === null ? null : concentration - standard

      return {
        name,
        concentration,
        count: values.length,
        difference,
        status:
          standard === null
            ? 'Tidak tersedia'
            : concentration > standard
              ? `Di atas ${bmuaFilter.acuan === 'who' ? 'WHO' : 'BMUA'}`
              : `≤ ${bmuaFilter.acuan === 'who' ? 'WHO' : 'BMUA'}`,
      }
    })
    .sort((a, b) => b.concentration - a.concentration)

  return {
    rows,
    standard,
    standardLabel,
    total: sourceRows.length,
    stationCount: new Set(
      sourceRows.map((row) => row.station_id)
    ).size,
  }
}, [
  data.harian,
  data.stations,
  bmuaFilter,
  tableDateBounds,
])


const bmuaChartOption = useMemo(() => ({
  tooltip: { trigger: 'axis' },
  grid: {
    left: 55,
    right: 105,
    top: 25,
    bottom: 65,
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: bmuaResult.rows.map((row) => row.name),
    axisLabel: {
      color: '#8490A5',
      rotate: 30,
      interval: 0,
      fontSize: 10,
    },
  },
 yAxis: {
  type: 'value',
  name: 'µg/m³',
  max: (value) => {
    const highest = Math.max(
      value.max,
      bmuaResult.standard ?? 0
    )
    return Math.ceil((highest * 1.15) / 10) * 10
  },
  axisLabel: {
    color: '#8490A5',
  },
},
  series: [{
    type: 'bar',
    data: bmuaResult.rows.map((row) => row.concentration),
    barMaxWidth: 35,
    itemStyle: {
      color: '#6B91B8',
      borderRadius: [5, 5, 0, 0],
    },
    markLine: bmuaResult.standard === null ? undefined : {
      symbol: 'none',
      lineStyle: {
        color: '#E36B63',
        type: 'dashed',
        width: 2,
      },
      label: {
  show: true,
  position: 'end',
  distance: 8,
  formatter: `${bmuaFilter.acuan === 'who' ? 'WHO' : 'BMUA'}: ${bmuaResult.standard} µg/m³`,
  color: '#D65F57',
  fontSize: 11,
  fontWeight: 600,
},
      data: [{ yAxis: bmuaResult.standard }],
    },
  }],
}), [bmuaResult])



 // Peta stasiun -> karakteristik kawasan (untuk filter kawasan)
const stationAreaLookup = useMemo(() => new Map(
  data.stations.map((station) => [
    station.station_id,
    classifyAreaType(station.site_type),
  ])
), [data.stations])

const areaTypeOptions = [
  { value: 'Semua', label: 'Semua kawasan' },
  ...AREA_TYPES.map((value) => ({ value, label: value })),
]

const matchTime = (row) =>
  row.satuan === 'µg/m³' &&
  isInDateRange(row, timeFilter.dariTanggal, timeFilter.sampaiTanggal) &&
  (timeFilter.kawasan === 'Semua' ||
    stationAreaLookup.get(row.station_id) === timeFilter.kawasan) &&
  (timeFilter.pulau === 'Semua' || row.pulau === timeFilter.pulau) &&
  (timeFilter.provinsi === 'Semua' || row.provinsi === timeFilter.provinsi) &&
  (timeFilter.station_id === 'Semua' || row.station_id === timeFilter.station_id)

const timeRows = useMemo(
  () => data.hourly.filter(matchTime),
  [data.hourly, timeFilter, stationAreaLookup]
)

const weekendRows = useMemo(
  () => data.weekend.filter(matchTime),
  [data.weekend, timeFilter, stationAreaLookup]
)

 


const seasonalBaseRows = useMemo(() => (
  data.seasonal.filter((row) =>
    row.satuan === 'µg/m³' &&
    row.tanggal &&
    Number.isFinite(Number(row[seasonFilter.parameter]))
  )
), [data.seasonal, seasonFilter.parameter])

const seasonalDateBounds = useMemo(() => {
  const dates = seasonalBaseRows
    .map((row) => row.tanggal)
    .filter(Boolean)
    .sort()

  return {
    min: dates[0] || '',
    max: dates[dates.length - 1] || '',
  }
}, [seasonalBaseRows])

// PILIHAN PULAU
const seasonalIslands = useMemo(() => (
  [...new Set(
    seasonalBaseRows
      .map((row) => row.pulau)
      .filter(Boolean)
  )].sort()
), [seasonalBaseRows])

// PILIHAN PROVINSI BERDASARKAN PULAU
const seasonalProvinces = useMemo(() => (
  [...new Set(
    seasonalBaseRows
      .filter((row) =>
        seasonFilter.pulau === 'Semua' ||
        row.pulau === seasonFilter.pulau
      )
      .map((row) => row.provinsi)
      .filter(Boolean)
  )].sort()
), [seasonalBaseRows, seasonFilter.pulau])

// PILIHAN STASIUN BERDASARKAN PULAU DAN PROVINSI
const seasonalStations = useMemo(() => (
  [...new Set(
    seasonalBaseRows
      .filter((row) =>
        (seasonFilter.pulau === 'Semua' ||
          row.pulau === seasonFilter.pulau) &&
        (seasonFilter.provinsi === 'Semua' ||
          row.provinsi === seasonFilter.provinsi)
      )
      .map((row) => row.station_id)
      .filter(Boolean)
      .map(String)
  )].sort()
), [
  seasonalBaseRows,
  seasonFilter.pulau,
  seasonFilter.provinsi,
])

// DATA ANALISIS INDIKASI EPISODE KABUT ASAP
const hazeRows = useMemo(() => (
  data.criticalPeriods.filter((row) => {
    const year = Number(row.year || getYear(row))

    return (
      ['pm25', 'pm10'].includes(row.parameter_key) &&
      year >= 2000 &&
      isInDateRange(row, hazeFilter.dariTanggal, hazeFilter.sampaiTanggal) &&
      (hazeFilter.pulau === 'Semua' || row.island === hazeFilter.pulau) &&
      (hazeFilter.provinsi === 'Semua' || row.province === hazeFilter.provinsi)
    )
  })
), [data.criticalPeriods, hazeFilter])

// Kelompokkan kejadian berdasarkan jam
const hazeHourlyGroups = useMemo(() => {
  const groups = {}

  hazeRows.forEach((row) => {
    const hourKey = String(row.timestamp || '').slice(0, 13)
    const value = Number(row.increase_pct)

    if (!hourKey || !Number.isFinite(value)) return

    if (!groups[hourKey]) groups[hourKey] = []

    groups[hourKey].push(row)
  })

  return Object.entries(groups)
    .map(([time, rows]) => ({
      time,
      rows,
      stations: [...new Set(rows.map((row) => row.station_id))],
      avgIncrease: average(rows.map((row) => row.increase_pct)),
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
}, [hazeRows])

// Pilih maksimal 30 kelompok waktu dengan jumlah stasiun terbanyak
const hazeSelectedHours = useMemo(() => (
  [...hazeHourlyGroups]
    .sort((a, b) => (
      b.stations.length - a.stations.length ||
      b.avgIncrease - a.avgIncrease
    ))
    .slice(0, 30)
    .sort((a, b) => a.time.localeCompare(b.time))
), [hazeHourlyGroups])

// Data heatmap: stasiun x waktu
const hazeHeatmap = useMemo(() => {
  const stations = [...new Set(
    hazeSelectedHours.flatMap((group) => group.stations)
  )].sort()

  const times = hazeSelectedHours.map((group) => group.time)

  const values = []

  hazeSelectedHours.forEach((group, x) => {
    stations.forEach((station, y) => {
      const stationRows = group.rows.filter(
        (row) => row.station_id === station
      )

      if (!stationRows.length) return

      values.push([
        x,
        y,
        average(stationRows.map((row) => row.increase_pct)),
      ])
    })
  })

  return { stations, times, values }
}, [hazeSelectedHours])

const hazeHeatmapMax = Math.max(
  100,
  ...hazeHeatmap.values.map((item) => item[2] || 0)
)

const hazeHeatmapOption = {
  tooltip: {
    position: 'top',
    formatter: (params) => {
      const time = hazeHeatmap.times[params.value[0]] || ''
      const station = hazeHeatmap.stations[params.value[1]] || ''

      return `
        <strong>${station}</strong><br/>
        Waktu: ${time}:00<br/>
        Peningkatan: ${formatValue(params.value[2])}%
      `
    },
  },
  grid: {
    left: 65,
    right: 35,
    top: 20,
    bottom: 75,
  },
  xAxis: {
    type: 'category',
    data: hazeHeatmap.times.map((time) => time.replace(' ', '\\n')),
    splitArea: { show: true },
    axisLabel: {
      color: '#8490A5',
      rotate: 35,
      fontSize: 10,
    },
  },
  yAxis: {
    type: 'category',
    data: hazeHeatmap.stations,
    splitArea: { show: true },
    axisLabel: { color: '#718399' },
  },
  visualMap: {
    min: 0,
    max: hazeHeatmapMax,
    calculable: true,
    orient: 'horizontal',
    left: 'center',
    bottom: 0,
    textStyle: { color: '#718399' },
    inRange: {
      color: ['#E8F1F8', '#91B8D8', '#F5C66A', '#E77C55', '#B83F43'],
    },
  },
  series: [{
    name: 'Peningkatan',
    type: 'heatmap',
    data: hazeHeatmap.values,
    label: { show: false },
    emphasis: {
      itemStyle: {
        shadowBlur: 8,
        shadowColor: 'rgba(0,0,0,0.25)',
      },
    },
  }],
}

// Stasiun dengan lonjakan partikulat tertinggi
const hazeStationSummary = useMemo(() => {
  const groups = {}

  hazeRows.forEach((row) => {
    if (!groups[row.station_id]) groups[row.station_id] = []
    groups[row.station_id].push(row)
  })

  return Object.entries(groups)
    .map(([station_id, rows]) => {
      const peak = [...rows].sort(
        (a, b) => Number(b.increase_pct) - Number(a.increase_pct)
      )[0]

      return {
        station_id,
        peak,
        site_type: peak.site_type || '--',
        area: peak.area_characteristic || '--',
        wind_speed: peak.wind_speed,
        wind_direction: peak.wind_direction,
      }
    })
    .sort((a, b) => (
      Number(b.peak.increase_pct) - Number(a.peak.increase_pct)
    ))
}, [hazeRows])

// Stasiun yang memiliki data indikasi pada filter aktif
const hazeStationIds = useMemo(() => (
  new Set(hazeRows.map((row) => row.station_id))
), [hazeRows])

const hazeMapStations = data.stations.filter(
  (station) => hazeStationIds.has(station.station_id)
)

const hazeMapRows = useMemo(() => (
  filterRows(data.harian, hazeFilter)
), [data.harian, hazeFilter])

// Ringkasan waktu dengan kejadian serentak terbanyak
const hazeMainEpisode = useMemo(() => (
  [...hazeHourlyGroups].sort((a, b) => (
    b.stations.length - a.stations.length ||
    b.avgIncrease - a.avgIncrease
  ))[0] || null
), [hazeHourlyGroups])

const hazeEpisodeStations = (() => {
  if (!hazeMainEpisode?.time || !hazeRows.length) return []

  const episodeTime = hazeMainEpisode.time
    .replace(' ', 'T')
    .slice(0, 13)

  const matchedRows = hazeRows.filter((row) => {
    const rowTime = String(row.timestamp || '')
      .replace(' ', 'T')
      .slice(0, 13)

    return rowTime === episodeTime
  })

  // Satu stasiun cukup ditampilkan satu kali
  const uniqueStations = new Map()

  matchedRows.forEach((row) => {
    if (!uniqueStations.has(row.station_id)) {
      uniqueStations.set(row.station_id, row)
    }
  })

  return Array.from(uniqueStations.values())
})()

const resetHaze = () => setHazeFilter({
  dariTanggal: '',
  sampaiTanggal: '',
  pulau: 'Semua',
  provinsi: 'Semua',
})

// FILTER DATA MUSIMAN
const seasonalFilteredRows = useMemo(() => {
  return seasonalBaseRows.filter((row) => {
    const date = row.tanggal

    const matchDate =
      (!seasonFilter.dariTanggal ||
        date >= seasonFilter.dariTanggal) &&
      (!seasonFilter.sampaiTanggal ||
        date <= seasonFilter.sampaiTanggal)

    const matchIsland =
      seasonFilter.pulau === 'Semua' ||
      row.pulau === seasonFilter.pulau

    const matchProvince =
      seasonFilter.provinsi === 'Semua' ||
      row.provinsi === seasonFilter.provinsi

    const matchStation =
      seasonFilter.station_id === 'Semua' ||
      String(row.station_id) === seasonFilter.station_id

    const matchArea =
      seasonFilter.kawasan === 'Semua' ||
      stationAreaLookup.get(row.station_id) === seasonFilter.kawasan

    return (
      matchDate &&
      matchIsland &&
      matchProvince &&
      matchStation &&
      matchArea
    )
  })
}, [seasonalBaseRows, seasonFilter, stationAreaLookup])

  const resetStation = () => {
    setStationFilter({
      tahun: 'Semua',
      bulan: 'Semua',
      parameter: 'pm25',
    })
    setSelectedStation(null)
  }

  // const resetRegion = () => setRegionFilter({
  //   tahun: 'Semua',
  //   bulan: 'Semua',
  //   pulau: 'Semua',
  //   provinsi: 'Semua',
  //   rankingParameter: 'pm25',
  // })

  const resetTime = () => setTimeFilter({
    dariTanggal: '',
    sampaiTanggal: '',
    pulau: 'Semua',
    provinsi: 'Semua',
    station_id: 'Semua',
    parameter: 'pm25',
    kawasan: 'Semua',
  })

 const resetArea = () => {
  setAreaFilter({
    dariTanggal: '',
    sampaiTanggal: '',
    pulau: 'Semua',
    provinsi: 'Semua',
    parameter: 'pm25',
  })
}

const resetSeason = () => setSeasonFilter({
  dariTanggal: '',
  sampaiTanggal: '',
  parameter: 'pm25',
  pulau: 'Semua',
  provinsi: 'Semua',
  station_id: 'Semua',
  kawasan: 'Semua',
})

const resetCritical = () => setCriticalFilter({
  dariTanggal: '',
  sampaiTanggal: '',
  pulau: 'Semua',
  provinsi: 'Semua',
  parameter: 'pm25',
})


  if (loading) {
    return (
      <ModuleLayout
        eyebrow="Kondisi dan Pola Kualitas Udara"
        title="Kualitas Udara"
        description="Bagaimana kondisi kualitas udara di berbagai wilayah Indonesia, kapan pencemaran paling tinggi, dan daerah mana yang paling terdampak?"
      >
        <div className="aqms-dashboard">
        <Card>
          <p className="empty">Memuat data kualitas udara...</p>
        </Card>
      </div>
      </ModuleLayout>
    )
  }

  if (error) {
    return (
      <ModuleLayout
        eyebrow="AIR QUALITY MONITORING"
        title="Kualitas Udara"
        description="Analisis kualitas udara Indonesia berdasarkan waktu dan wilayah."
      >
        <Card>
          <p>Data gagal dimuat: {error}</p>
          <p className="card-sub">
            Pastikan file JSON berada di public/data/kualitas-udara/.
          </p>
        </Card>
      </ModuleLayout>
    )
  }

  return (
    <ModuleLayout
      eyebrow="Kondisi dan Pola Kualitas Udara"
      title="Kualitas Udara"
      description="Bagaimana kondisi kualitas udara di berbagai wilayah Indonesia, kapan pencemaran paling tinggi, dan daerah mana yang paling terdampak?"
    >


{/* 01 — OVERVIEW KUALITAS UDARA */}

<section className="aq-overview">

  {/* NARASI TEMUAN UTAMA */}
  <div className="aq-overview-hero">

    <h2>
      Konsentrasi PM2.5 menunjukkan peningkatan,
      dengan kondisi pencemaran yang berbeda
      antarwaktu dan wilayah.
    </h2>

    <p>
      {overviewInsight.trendChange !== null
        ? `Rerata PM2.5 meningkat sebesar ${
            formatValue(overviewInsight.trendChange)
          }% pada 2025 dibandingkan 2024, berdasarkan ${
            overviewInsight.commonStationCount
          } stasiun yang memiliki data pada kedua tahun.`
        : 'Perubahan konsentrasi PM2.5 tahunan belum dapat dihitung.'}
      {' '}Analisis berikut menelusuri lokasi dengan
      pencemaran tinggi serta periode ketika kualitas
      udara paling kritis.
    </p>

  </div>

  {/* KPI PENDUKUNG */}
  <div className="aq-overview-kpi-grid">

    <MetricCard
      label="ISPU Tidak Sehat+"
      value={
        overviewInsight.unhealthyPercentage !== null
          ? `${formatValue(overviewInsight.unhealthyPercentage)}%`
          : '--'
      }
      subtext={`${overviewInsight.unhealthyCount.toLocaleString('id-ID')} dari ${overviewInsight.totalDaily.toLocaleString('id-ID')} observasi harian`}
      icon={<AlertTriangle size={18} />}
    />

    <MetricCard
      label="Waktu Paling Kritis"
      value={
        overviewInsight.criticalHour
          ? `${String(overviewInsight.criticalHour.jam).padStart(2, '0')}.00`
          : '--'
      }
      subtext={
        overviewInsight.criticalHour
          ? `Rerata PM2.5 ${formatValue(overviewInsight.criticalHour.pm25)} µg/m³`
          : 'Data belum tersedia'
      }
      icon={<Clock3 size={18} />}
    />

    <MetricCard
      label="Lokasi Paling Kritis"
      value={overviewInsight.highestProvince?.name ?? '--'}
      subtext={
        overviewInsight.highestProvince
          ? `PM2.5 ${formatValue(overviewInsight.highestProvince.value)} µg/m³ · ${overviewInsight.highestProvince.stationCount} stasiun`
          : 'Data belum tersedia'
      }
      icon={<MapPin size={18} />}
    />

  </div>

</section>

      {/* 02 — TREN KUALITAS UDARA */}

      <section className="aq-section">
        <SectionTitle
  number="02"
  title="Apakah kualitas udara semakin memburuk dari waktu ke waktu?"
  description={`Menelusuri perubahan konsentrasi polutan selama periode pengamatan untuk melihat arah kecenderungan kualitas udara.`}
/>

        <Card className="aq-card">
  
  <CardHeader
    title={`Perubahan konsentrasi ${PARAMETERS[trendFilter.parameter].label}`}
    subtitle={`Tren ${trendFilter.mode} · ${PARAMETERS[trendFilter.parameter].unit}`}
  />

  {/* FILTER TREN */}
  <div className="aq-trend-filter">

    {/* FILTER RENTANG TANGGAL */}
    <div className="aq-trend-date-row">

      <div style={{ position: 'relative' }}>

        
<button
  type="button"
  onClick={() => {
    setTrendDateDraft({
      dariTanggal: trendFilter.dariTanggal,
      sampaiTanggal: trendFilter.sampaiTanggal,
    })
    setTrendDateOpen(!trendDateOpen)
  }}
  className="aq-date-trigger"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 2v3" />
    <path d="M16 2v3" />
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M8 13h.01" />
    <path d="M12 13h.01" />
    <path d="M16 13h.01" />
    <path d="M8 17h.01" />
    <path d="M12 17h.01" />
    <path d="M16 17h.01" />
  </svg>

  <span className="aq-date-label">
    {new Date(`${trendFilter.dariTanggal}T00:00:00`)
      .toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      })}
    {' – '}
    {new Date(`${trendFilter.sampaiTanggal}T00:00:00`)
      .toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      })}
  </span>

  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
</button>


        {trendDateOpen && (
          <div className="aq-date-dropdown">

            <label className="aq-filter-field">
              <span>Mulai</span>
              <input
                type="date"
                value={trendDateDraft.dariTanggal}
                min="2024-01-01"
                max={trendDateDraft.sampaiTanggal}
                onChange={(e) =>
                  setTrendDateDraft((state) => ({
                    ...state,
                    dariTanggal: e.target.value,
                  }))
                }
                style={SELECT_STYLE}
              />
            </label>

            <label className="aq-filter-field">
              <span>Selesai</span>
              <input
                type="date"
                value={trendDateDraft.sampaiTanggal}
                min={trendDateDraft.dariTanggal}
                max="2026-10-14"
                onChange={(e) =>
                  setTrendDateDraft((state) => ({
                    ...state,
                    sampaiTanggal: e.target.value,
                  }))
                }
                style={SELECT_STYLE}
              />
            </label>

            <div className="aq-date-presets">

{[
  { value: 'Semua', label: 'Semua Data' },
  { value: '2026', label: 'Tahun 2026' },
  { value: '2025', label: 'Tahun 2025' },
  { value: '2024', label: 'Tahun 2024' },
].map((item) => {
  const selected =
    item.value === 'Semua'
      ? trendDateDraft.dariTanggal === '2024-01-01' &&
        trendDateDraft.sampaiTanggal === '2026-10-14'
      : trendDateDraft.dariTanggal === `${item.value}-01-01` &&
        trendDateDraft.sampaiTanggal ===
          (item.value === '2026'
            ? '2026-10-14'
            : `${item.value}-12-31`)

  return (
    <button
      key={item.value}
      type="button"
      className={selected ? 'active' : ''}
      aria-pressed={selected}
      onClick={() => applyTrendPreset(item.value)}
    >
      {item.label}
    </button>
  )
})}

            </div>

            <div className="aq-date-actions">
              <button
                type="button"
                onClick={() => setTrendDateOpen(false)}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={confirmTrendDate}
              >
                Terapkan
              </button>
            </div>

          </div>
        )}

      </div>

      <button
        type="button"
        className="aq-filter-reset"
        onClick={resetTrend}
      >
        <RotateCcw size={14} />
        Reset
      </button>

    </div>

    {/* FILTER LAINNYA */}
    <div className="aq-filter-fields">

      <FilterSelect
        label="Pulau"
        value={trendFilter.pulau}
        options={islandOptions}
        onChange={(value) =>
          setTrendFilter((state) => ({
            ...state,
            pulau: value,
            provinsi: 'Semua',
          }))
        }
      />

      <FilterSelect
        label="Provinsi"
        value={trendFilter.provinsi}
        options={trendProvinceOptions}
        onChange={(value) =>
          setTrendFilter((state) => ({
            ...state,
            provinsi: value,
          }))
        }
      />

      <FilterSelect
        label="Parameter"
        value={trendFilter.parameter}
        options={parameterOptions}
        onChange={(value) =>
          setTrendFilter((state) => ({
            ...state,
            parameter: value,
          }))
        }
      />

      <FilterSelect
        label="Periode grafik"
        value={trendFilter.mode}
        options={[
          { value: 'harian', label: 'Harian' },
          { value: 'bulanan', label: 'Bulanan' },
          { value: 'tahunan', label: 'Tahunan' },
        ]}
        onChange={(value) =>
          setTrendFilter((state) => ({
            ...state,
            mode: value,
          }))
        }
      />

    </div>

  </div>
  
  {/* GRAFIK */}
  

  {trendRows.length ? (
    <EChart option={trendOption} height={330} />
  ) : (
    <EmptyData message="Tidak ada data tren untuk kombinasi filter ini." />
  )}

{/* RINGKASAN DAN INTERPRETASI TREN */}
{trendInsight.available && (
  <div className="aq-trend-insight">

    <div className="aq-trend-insight-heading">
      <h4>Ringkasan Arah Perubahan</h4>
      <span>
        {trendInsight.pointCount} periode dianalisis
      </span>
    </div>

    <div className="aq-trend-insight-grid">

      <div className="aq-trend-insight-metric">
        <span>Arah kecenderungan</span>
        <strong className={
          trendInsight.direction === 'Meningkat'
            ? 'trend-up'
            : trendInsight.direction === 'Menurun'
              ? 'trend-down'
              : 'trend-stable'
        }>
          {trendInsight.direction}
        </strong>
      </div>

      <div className="aq-trend-insight-metric">
        <span>Perubahan awal–akhir</span>
        <strong>
          {trendInsight.percentage === null
            ? '—'
            : `${trendInsight.percentage > 0 ? '+' : ''}${formatValue(trendInsight.percentage, 2)}%`}
        </strong>
      </div>

      <div className="aq-trend-insight-metric">
        <span>Konsentrasi awal–akhir</span>
        <strong>
          {formatValue(trendInsight.firstValue, 2)}
          {' → '}
          {formatValue(trendInsight.lastValue, 2)}
        </strong>
        <small>µg/m³</small>
      </div>

    </div>

    <div className="aq-trend-interpretation">
      <strong>Interpretasi Tren Kualitas Udara</strong>
      <p>{trendInsight.interpretation}</p>
    </div>

  </div>
)}

<div className="aq-distribusi-footer">
  <p>
    *Analisis menggunakan data stasiun bersatuan µg/m³.
    Stasiun bersatuan ppm tidak disertakan. Perbedaan jumlah
    dan kelengkapan data antarstasiun dapat memengaruhi
    keterwakilan tren. Interpretasi menggambarkan kecenderungan
    konsentrasi parameter terpilih, bukan keseluruhan kualitas
    udara Indonesia.
  </p>
</div>

</Card>
      </section>

      {/* 03 — EKSPLORASI STASIUN AQMS

      <section className="aq-section">
        <SectionTitle
          number="03"
          title="Eksplorasi Stasiun AQMS"
          description="Jelajahi lokasi stasiun pemantauan dan lihat kondisi kualitas udara pada stasiun yang dipilih."
        />

        <div className="aq-map-detail-grid">

  <Card className="aq-card">
    <CardHeader
      title="Peta interaktif stasiun AQMS"
      subtitle="Klik marker untuk memilih stasiun."
    />

    <AirQualityMap
      geo={geo.data}
      stations={mapStations}
      dailyRows={data.harian}
      parameter="pm25"
      selectedStationId={selectedStation?.station_id ?? null}
      onSelectStation={setSelectedStation}
    />
    <div className="aq-map-legend-wrapper">

  <p className="aq-map-legend-description">
    Warna marker menunjukkan kategori Indeks Standar
    Pencemar Udara (ISPU) pada masing-masing stasiun.
    Pilih marker untuk melihat detail hasil pemantauan.
  </p>

  <div className="aq-map-legend">
    {Object.entries(ISPU_COLORS).map(([label, color]) => (
      <span key={label}>
        <i style={{ background: color }} />
        {label}
      </span>
    ))}
  </div>
</div>

<StationInsight
  station={selectedStation}
  rows={stationPeriodRows}
/>

<div className="aq-distribusi-footer">
    <p>
      *Stasiun bersatuan ppm dan stasiun dengan data tidak mencukupi
      tidak disertakan.
    </p>
  </div>

  </Card>

  <Card className="aq-card">

    <div className="aq-station-panel-header">
      <div>
        <h3>Detail stasiun terpilih</h3>
        <p>Ringkasan hasil pengukuran kualitas udara.</p>
      </div>


<div className="aq-station-period">

  <div style={{ position: 'relative' }}>

    <button
      type="button"
      className="aq-date-trigger"
      onClick={() => {
        setStationDateDraft({
          dariTanggal: stationPeriodFilter.dariTanggal,
          sampaiTanggal: stationPeriodFilter.sampaiTanggal,
        })
        setStationDateOpen(!stationDateOpen)
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 2v3" />
        <path d="M16 2v3" />
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M8 13h.01" />
        <path d="M12 13h.01" />
        <path d="M16 13h.01" />
        <path d="M8 17h.01" />
        <path d="M12 17h.01" />
        <path d="M16 17h.01" />
      </svg>

      <span className="aq-date-label">
        {new Date(`${stationPeriodFilter.dariTanggal}T00:00:00`)
          .toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: '2-digit',
          })}
        {' – '}
        {new Date(`${stationPeriodFilter.sampaiTanggal}T00:00:00`)
          .toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: '2-digit',
          })}
      </span>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    {stationDateOpen && (
      <div className="aq-date-dropdown">

        <label className="aq-filter-field">
          <span>Mulai</span>
          <input
            type="date"
            value={stationDateDraft.dariTanggal}
            min="2024-01-01"
            max={stationDateDraft.sampaiTanggal}
            onChange={(e) =>
              setStationDateDraft((state) => ({
                ...state,
                dariTanggal: e.target.value,
              }))
            }
          />
        </label>

        <label className="aq-filter-field">
          <span>Selesai</span>
          <input
            type="date"
            value={stationDateDraft.sampaiTanggal}
            min={stationDateDraft.dariTanggal}
            max="2026-10-14"
            onChange={(e) =>
              setStationDateDraft((state) => ({
                ...state,
                sampaiTanggal: e.target.value,
              }))
            }
          />
        </label>

        <div className="aq-date-presets">
          {[
            { value: 'Semua', label: 'Semua Data' },
            { value: '2026', label: 'Tahun 2026' },
            { value: '2025', label: 'Tahun 2025' },
            { value: '2024', label: 'Tahun 2024' },
          ].map((item) => {
            const selected =
              item.value === 'Semua'
                ? stationDateDraft.dariTanggal === '2024-01-01' &&
                  stationDateDraft.sampaiTanggal === '2026-10-14'
                : stationDateDraft.dariTanggal === `${item.value}-01-01` &&
                  stationDateDraft.sampaiTanggal ===
                    (item.value === '2026'
                      ? '2026-10-14'
                      : `${item.value}-12-31`)

            return (
              <button
                key={item.value}
                type="button"
                className={selected ? 'active' : ''}
                aria-pressed={selected}
                onClick={() => applyStationDatePreset(item.value)}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="aq-date-actions">
          <button
            type="button"
            onClick={() => setStationDateOpen(false)}
          >
            Batal
          </button>

          <button
            type="button"
            onClick={confirmStationDate}
          >
            Terapkan
          </button>
        </div>

      </div>
    )}

  </div>

  <button
    type="button"
    className="aq-filter-reset"
    onClick={resetStationPeriod}
  >
    <RotateCcw size={14} />
    Reset
  </button>

</div>


    </div>

    <StationDetail
  station={selectedStation}
  rows={stationPeriodRows}
/>

  </Card>
</div>
      </section> */}

      {/* 04 — PERBANDINGAN KUALITAS UDARA ANTARWILAYAH */}

<section className="aq-section">
  <SectionTitle
    number="04"
    title="Bagaimana Kondisi dan Persebaran Kualitas Udara Antarwilayah?"
    description="Meninjau perbedaan konsentrasi polutan, distribusi kategori ISPU, serta tingkat pencemaran udara di berbagai wilayah Indonesia berdasarkan hasil pengamatan."
  />

  {/* Top 10 Provinsi dengan Rata-rata Konsentrasi Polutan Tertinggi */}
  <Card className="aq-card">
    <CardHeader
      title="Top 10 Provinsi dengan Rata-rata Konsentrasi Polutan Tertinggi"
      subtitle={`${PARAMETERS[rankingFilter.parameter].label} (µg/m³) · ${rankingPpmStations} stasiun bersatuan ppm tidak disertakan dalam perhitungan`}
/>

    <div className="aq-ranking-filter-grid">
      <FilterSelect
        label="Tahun"
        value={rankingFilter.tahun}
        options={yearOptions}
        onChange={(value) => setRankingFilter((state) => ({
          ...state,
          tahun: value,
        }))}
      />

      <FilterSelect
        label="Bulan"
        value={rankingFilter.bulan}
        options={monthOptions}
        onChange={(value) => setRankingFilter((state) => ({
          ...state,
          bulan: value,
        }))}
      />

      <FilterSelect
        label="Parameter polutan"
        value={rankingFilter.parameter}
        options={parameterOptions}
        onChange={(value) => setRankingFilter((state) => ({
          ...state,
          parameter: value,
        }))}
      />
    </div>

        {ranking.length ? (
      <>
        <EChart option={rankingOption} height={350} />

        <div className="aq-distribusi-footer">
    <p>
      *Stasiun bersatuan ppm dan stasiun dengan data tidak mencukupi
      tidak disertakan.
    </p>
  </div>
      </>
    ) : (
      <EmptyData message="Tidak ada data ranking untuk pilihan filter ini." />
    )}
  </Card>


  {/* DISTRIBUSI KATEGORI ISPU */}
<Card className="aq-card">
  <CardHeader
    title="Distribusi kategori ISPU"
    subtitle="Proporsi kategori kualitas udara berdasarkan hasil pemantauan 22 stasiun AQMS dengan satuan konsentrasi µg/m³."
  />

  <div className="aq-distribusi-filter-grid">
    <FilterSelect
      label="Tahun"
      value={ispuFilter.tahun}
      options={yearOptions}
      onChange={(value) => setIspuFilter((state) => ({
        ...state,
        tahun: value,
      }))}
    />

    <FilterSelect
      label="Bulan"
      value={ispuFilter.bulan}
      options={monthOptions}
      onChange={(value) => setIspuFilter((state) => ({
        ...state,
        bulan: value,
      }))}
    />

    <FilterSelect
      label="Pulau"
      value={ispuFilter.pulau}
      options={islandOptions}
      onChange={(value) => setIspuFilter((state) => ({
        ...state,
        pulau: value,
        provinsi: 'Semua',
      }))}
    />

    <FilterSelect
      label="Provinsi"
      value={ispuFilter.provinsi}
      options={ispuProvinceOptions}
      onChange={(value) => setIspuFilter((state) => ({
        ...state,
        provinsi: value,
      }))}
    />
  </div>

  <ChartDistribution rows={ispuRows} />

  <div className="aq-distribusi-footer">
    <span>
      Total catatan harian:
      <strong>
        {' '}{ispuRows.length.toLocaleString('id-ID')}
      </strong>
    </span>

    <p>
      *Stasiun bersatuan ppm dan stasiun dengan data tidak mencukupi
      tidak disertakan.
    </p>
  </div>
</Card>

{/* DISTRIBUSI POLUTAN ANTARWILAYAH */}
<Card className="aq-card">
  <CardHeader
    title="Distribusi Konsentrasi Polutan Antarwilayah"
   subtitle={`Persebaran ${PARAMETERS[boxplotFilter.parameter]?.label ?? boxplotFilter.parameter} pada lima pulau besar Indonesia berdasarkan pengamatan harian.`}
    />

<div className="aq-boxplot-filter-grid">

  {/* FILTER PERIODE */}
  <div className="aq-filter-field">
    <span>Periode</span>

    <div className="aq-station-period">
      <div style={{ position: 'relative' }}>

        <button
          type="button"
          className="aq-date-trigger"
          onClick={() => {
            setBoxplotDateDraft({
              dariTanggal: boxplotFilter.dariTanggal,
              sampaiTanggal: boxplotFilter.sampaiTanggal,
            })
            setBoxplotDateOpen(!boxplotDateOpen)
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 11h18" />
          </svg>

          <span className="aq-date-label">
            {new Date(`${boxplotFilter.dariTanggal}T00:00:00`)
              .toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: '2-digit',
              })}
            {' – '}
            {new Date(`${boxplotFilter.sampaiTanggal}T00:00:00`)
              .toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: '2-digit',
              })}
          </span>

          <ChevronDown size={12} />
        </button>

        {boxplotDateOpen && (
          <div className="aq-date-dropdown">

            <label className="aq-filter-field">
              <span>Mulai</span>
              <input
                type="date"
                value={boxplotDateDraft.dariTanggal}
                min={trendDateBounds.min}
                max={boxplotDateDraft.sampaiTanggal}
                onChange={(event) =>
                  setBoxplotDateDraft((state) => ({
                    ...state,
                    dariTanggal: event.target.value,
                  }))
                }
              />
            </label>

            <label className="aq-filter-field">
              <span>Selesai</span>
              <input
                type="date"
                value={boxplotDateDraft.sampaiTanggal}
                min={boxplotDateDraft.dariTanggal}
                max={trendDateBounds.max}
                onChange={(event) =>
                  setBoxplotDateDraft((state) => ({
                    ...state,
                    sampaiTanggal: event.target.value,
                  }))
                }
              />
            </label>

            <div className="aq-date-presets">
              {[
                { value: 'Semua', label: 'Semua Data' },
                { value: '2026', label: 'Tahun 2026' },
                { value: '2025', label: 'Tahun 2025' },
                { value: '2024', label: 'Tahun 2024' },
              ].map((item) => {
                const awal =
                  item.value === 'Semua'
                    ? trendDateBounds.min
                    : `${item.value}-01-01`

                const akhir =
                  item.value === 'Semua'
                    ? trendDateBounds.max
                    : `${item.value}-12-31`

                const selected =
                  boxplotDateDraft.dariTanggal ===
                    (awal < trendDateBounds.min
                      ? trendDateBounds.min
                      : awal) &&
                  boxplotDateDraft.sampaiTanggal ===
                    (akhir > trendDateBounds.max
                      ? trendDateBounds.max
                      : akhir)

                return (
                  <button
                    key={item.value}
                    type="button"
                    className={selected ? 'active' : ''}
                    aria-pressed={selected}
                    onClick={() =>
                      applyBoxplotDatePreset(item.value)
                    }
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>

            <div className="aq-date-actions">
              <button
                type="button"
                onClick={() => setBoxplotDateOpen(false)}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={confirmBoxplotDate}
              >
                Terapkan
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  </div>

  {/* FILTER POLUTAN */}
  <FilterSelect
    label="Pilih polutan"
    value={boxplotFilter.parameter}
    options={parameterOptions}
    onChange={(value) =>
      setBoxplotFilter((state) => ({
        ...state,
        parameter: value,
      }))
    }
  />


</div>


<PollutantBoxplot
  rows={boxplotRows}
  parameter={boxplotFilter.parameter}
/>
</Card>

{/* EVALUASI TERHADAP BAKU MUTU UDARA AMBIEN */}
<Card className="aq-card">
 <CardHeader
  title="Evaluasi Konsentrasi Polutan terhadap Standar Kualitas Udara Antarwilayah"
  subtitle="Perbandingan rata-rata konsentrasi harian (24 jam) dengan acuan BMUA PP No. 22 Tahun 2021 atau WHO Air Quality Guidelines 2021."
/>

  <div className="aq-bmua-toolbar">
    <div className="aq-bmua-date">
      <span>Rentang pengamatan</span>
      <DateRangePicker
        startDate={bmuaFilter.dariTanggal || tableDateBounds.min}
        endDate={bmuaFilter.sampaiTanggal || tableDateBounds.max}
        minDate={tableDateBounds.min}
        maxDate={tableDateBounds.max}
        years={years}
        onApply={(dariTanggal, sampaiTanggal) =>
          setBmuaFilter((state) => ({
            ...state,
            dariTanggal,
            sampaiTanggal,
          }))
        }
      />
    </div>

    <FilterSelect
  label="Parameter"
  value={bmuaFilter.parameter}
  options={[
    { value: 'pm25', label: 'PM2.5' },
    { value: 'pm10', label: 'PM10' },
    { value: 'so2', label: 'SO₂' },
    { value: 'no2', label: 'NO₂' },
  ]}
  onChange={(value) => setBmuaFilter((state) => ({
    ...state,
    parameter: value,
  }))}
/>

    <FilterSelect
      label="Tingkat wilayah"
      value={bmuaFilter.tingkat}
      options={[
        { value: 'pulau', label: 'Antarpulau' },
        { value: 'provinsi', label: 'Antarprovinsi' },
        { value: 'station_id', label: 'Antarstasiun' },
      ]}
      onChange={(value) => setBmuaFilter((state) => ({
        ...state,
        tingkat: value,
      }))}
    />


<FilterSelect
  label="Acuan evaluasi"
  value={bmuaFilter.acuan}
  options={[
    { value: 'bmua', label: 'BMUA Indonesia' },
    { value: 'who', label: 'WHO 2021' },
  ]}
  onChange={(value) =>
    setBmuaFilter((state) => ({
      ...state,
      acuan: value,
    }))
  }
/>


  </div>

  {bmuaResult.warning && (
    <div className="aq-bmua-notice" role="status">
      <span>{bmuaResult.warning}</span>
    </div>
  )}

<div className="aq-bmua-data-summary">
  Menampilkan <strong>
    {bmuaResult.total.toLocaleString('id-ID')}
  </strong> catatan pengamatan dari <strong>
    {bmuaResult.stationCount}
  </strong> stasiun bersatuan µg/m³.
</div>

  {bmuaResult.rows.length ? (
    <>
<div className="aq-bmua-chart-heading">
  <h3>
    Perbandingan {bmuaFilter.tingkat === 'pulau'
      ? 'antarpulau'
      : bmuaFilter.tingkat === 'provinsi'
        ? 'antarprovinsi'
        : 'antarstasiun'}
  </h3>

  <div className="aq-bmua-chart-meta">
    <strong>
      {PARAMETERS[bmuaFilter.parameter].label}
    </strong>
    <span>Rata-rata harian (24 jam)</span>
  </div>
</div>

      <EChart
  option={bmuaChartOption}
  height={Math.min(420, Math.max(340, bmuaResult.rows.length * 24))}
/>

      <div className="aq-bmua-table-wrap">
        <table className="aq-comparison-table">
          <thead>
            <tr>
              <th>Wilayah</th>
              <th>Rata-rata (µg/m³)</th>
              <th>{bmuaFilter.acuan === 'who' ? 'WHO (µg/m³)' : 'BMUA (µg/m³)'}</th>
              <th>Selisih</th>
              <th>Status</th>
              <th>Jumlah data</th>
            </tr>
          </thead>
          <tbody>
            {bmuaResult.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{formatValue(row.concentration)}</td>
                <td>
                  {bmuaResult.standard === null
                    ? '—'
                    : formatValue(bmuaResult.standard)}
                </td>
                <td>
                  {row.difference === null
                    ? '—'
                    : `${row.difference > 0 ? '+' : ''}${formatValue(row.difference)}`}
                </td>
                <td>{row.status}</td>
                <td>{row.count.toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <EmptyData message="Tidak ada data yang memenuhi pilihan periode dan rentang pengamatan." />
  )}


{/* INTERPRETASI HASIL EVALUASI */}
<div className="aq-bmua-interpretation">
  <strong>Interpretasi Hasil Perbandingan</strong>

  {bmuaResult.rows.length > 0 && (
    <p>
      Berdasarkan perbandingan konsentrasi{' '}
      {PARAMETERS[bmuaFilter.parameter].label},
      wilayah dengan rata-rata konsentrasi tertinggi adalah{' '}
      <strong>{bmuaResult.rows[0].name}</strong>,
      sebesar{' '}
      <strong>
        {formatValue(bmuaResult.rows[0].concentration, 2)} µg/m³
      </strong>.

      {bmuaResult.standard !== null && (
        <>
          {' '}Nilai tersebut{' '}
          {bmuaResult.rows[0].concentration > bmuaResult.standard
            ? 'berada di atas'
            : 'berada di bawah atau sama dengan'}
          {' '}nilai acuan{' '}
          <strong>
            {bmuaFilter.acuan === 'who' ? 'WHO 2021' : 'BMUA'}
          </strong>{' '}
          sebesar{' '}
          <strong>{bmuaResult.standard} µg/m³</strong>.
          {' '}Sebanyak{' '}
          <strong>
            {bmuaResult.rows.filter(
              (row) => row.concentration > bmuaResult.standard
            ).length}
          </strong>
          {' '}dari{' '}
          <strong>{bmuaResult.rows.length}</strong>
          {' '}wilayah memiliki rata-rata konsentrasi di atas nilai acuan,
          sedangkan wilayah lainnya berada di bawah atau sama dengan
          nilai acuan.
        </>
      )}

      {' '}Wilayah dengan rata-rata konsentrasi di atas nilai acuan
      perlu mendapat perhatian melalui pemantauan dan penelusuran
      sumber emisi. Hasil ini merupakan perbandingan rata-rata
      selama periode pengamatan, bukan penilaian kepatuhan
      berdasarkan seluruh ketentuan periode dan statistik standar.
    </p>
  )}
</div>



<div className="aq-bmua-footer">
  <p>
    *Data yang ditampilkan merupakan rata-rata konsentrasi
    harian (24 jam) selama rentang pengamatan. Acuan BMUA
    berdasarkan PP No. 22 Tahun 2021 Lampiran VII, sedangkan
    acuan WHO berdasarkan WHO Global Air Quality Guidelines
    2021. Perbandingan dengan WHO digunakan sebagai referensi
    kesehatan dan bukan penilaian formal pelampauan pedoman
    24 jam WHO yang menggunakan persentil ke-99. Stasiun
    bersatuan ppm tidak disertakan. Persebaran stasiun yang
    tidak merata dapat memengaruhi keterwakilan hasil
    antarwilayah. Informasi lebih lanjut dapat dilihat pada
    halaman <strong>Kecukupan Stasiun</strong>.
  </p>
</div>


</Card>

  {/*TABEL PERBANDINGAN KUALITAS UDARA */}
<Card className="aq-card">
  <CardHeader
    title="Tabel Perbandingan Kualitas Udara"
    subtitle={
      tableFilter.tampilan === 'provinsi'
        ? 'Rata-rata konsentrasi seluruh parameter pada setiap provinsi berdasarkan periode terpilih.'
        : 'Rata-rata konsentrasi seluruh parameter pada setiap stasiun berdasarkan periode terpilih.'
    }
  />


<div className="aq-table-toolbar">

  {/* FILTER PERIODE */}
  <div className="aq-filter-field">
    <span>Periode</span>

    <div className="aq-station-period">
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="aq-date-trigger"
          onClick={() => {
            setTableDateDraft({
              dariTanggal: tableFilter.dariTanggal || tableDateBounds.min,
              sampaiTanggal: tableFilter.sampaiTanggal || tableDateBounds.max,
            })
            setTableDateOpen(!tableDateOpen)
          }}
        >
          <CalendarDays size={14} />

          <span className="aq-date-label">
            {new Date(`${tableFilter.dariTanggal || tableDateBounds.min}T00:00:00`)
              .toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: '2-digit',
              })}
            {' – '}
            {new Date(`${tableFilter.sampaiTanggal || tableDateBounds.max}T00:00:00`)
              .toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: '2-digit',
              })}
          </span>

          <ChevronDown size={12} />
        </button>

        {tableDateOpen && (
          <div className="aq-date-dropdown">
            <label className="aq-filter-field">
              <span>Mulai</span>
              <input
                type="date"
                value={tableDateDraft.dariTanggal}
                min={tableDateBounds.min}
                max={tableDateDraft.sampaiTanggal}
                onChange={(e) =>
                  setTableDateDraft((state) => ({
                    ...state,
                    dariTanggal: e.target.value,
                  }))
                }
              />
            </label>

            <label className="aq-filter-field">
              <span>Selesai</span>
              <input
                type="date"
                value={tableDateDraft.sampaiTanggal}
                min={tableDateDraft.dariTanggal}
                max={tableDateBounds.max}
                onChange={(e) =>
                  setTableDateDraft((state) => ({
                    ...state,
                    sampaiTanggal: e.target.value,
                  }))
                }
              />
            </label>

            <div className="aq-date-presets">
              {[
                { value: 'Semua', label: 'Semua Data' },
                { value: '2026', label: 'Tahun 2026' },
                { value: '2025', label: 'Tahun 2025' },
                { value: '2024', label: 'Tahun 2024' },
              ].map((item) => {
                const awal = item.value === 'Semua'
                  ? tableDateBounds.min
                  : `${item.value}-01-01`

                const akhir = item.value === 'Semua'
                  ? tableDateBounds.max
                  : `${item.value}-12-31`

                const selected =
                  tableDateDraft.dariTanggal ===
                    (awal < tableDateBounds.min ? tableDateBounds.min : awal) &&
                  tableDateDraft.sampaiTanggal ===
                    (akhir > tableDateBounds.max ? tableDateBounds.max : akhir)

                return (
                  <button
                    key={item.value}
                    type="button"
                    className={selected ? 'active' : ''}
                    aria-pressed={selected}
                    onClick={() => applyTableDatePreset(item.value)}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>

            <div className="aq-date-actions">
              <button
                type="button"
                onClick={() => setTableDateOpen(false)}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={confirmTableDate}
              >
                Terapkan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>

  {/* FILTER TAMPILAN */}
  <FilterSelect
    label="Tampilkan berdasarkan"
    value={tableFilter.tampilan}
    options={[
      { value: 'provinsi', label: 'Antarprovinsi' },
      { value: 'stasiun', label: 'Antarstasiun' },
    ]}
    onChange={(value) =>
      setTableFilter((state) => ({
        ...state,
        tampilan: value,
      }))
    }
  />

</div>


  <ComparisonTable
    rows={tableRows}
    view={tableFilter.tampilan}
    stations={data.stations}
  />

      <div className="aq-distribusi-footer">
    <p>
      *Stasiun bersatuan ppm dan stasiun dengan data tidak mencukupi
      tidak disertakan.
    </p>
  </div>
</Card>


</section>

{/* 05 — ANALISIS WAKTU KRITIS */}

<section className="aq-section">
  <SectionTitle
    number="05"
    title="Kapan konsentrasi polutan cenderung mencapai tingkat tertinggi?"
    description="Mengidentifikasi pola perubahan konsentrasi berdasarkan jam pengamatan serta perbedaan antara hari kerja dan akhir pekan."
  />

  {/* FILTER GLOBAL */}
  <LocalFilter onReset={resetTime}>
    <FilterDateRange
      value={timeFilter}
      bounds={tableDateBounds}
      years={years}
      onChange={(range) => setTimeFilter((state) => ({ ...state, ...range }))}
    />

    <FilterScope
      rows={data.stations}
      value={timeFilter}
      levels={['pulau', 'provinsi', 'station_id']}
      onChange={(scope) => setTimeFilter((state) => ({ ...state, ...scope }))}
    />

    <FilterSelect
      label="Karakteristik kawasan"
      value={timeFilter.kawasan}
      options={areaTypeOptions}
      onChange={(value) => setTimeFilter((state) => ({
        ...state,
        kawasan: value,
      }))}
    />

    <FilterSelect
      label="Parameter"
      value={timeFilter.parameter}
      options={parameterOptions}
      onChange={(value) => setTimeFilter((state) => ({
        ...state,
        parameter: value,
      }))}
    />
  </LocalFilter>

  {/* BARIS 1 — POLA PER JAM */}
  <div className="aq-chart-grid">

    <Card className="aq-card">
      <CardHeader
        title="Pola Konsentrasi per Jam"
        subtitle={`Heatmap rata-rata konsentrasi pukul 00.00–23.00 · ${filterScopeText(timeFilter)}`}
      />

      {timeRows.length ? (
        <HourlyHeatmap
          rows={timeRows}
          parameter={timeFilter.parameter}
        />
      ) : (
        <EmptyData message="Data pola per jam belum tersedia untuk filter ini." />
      )}
    </Card>

    <Card className="aq-card">
      <CardHeader
        title="Interpretasi Pola Per Jam"
        subtitle="Identifikasi waktu dengan konsentrasi tertinggi."
      />

      <HourlyInterpretation
        rows={timeRows}
        parameter={timeFilter.parameter}
      />
    </Card>

  </div>

  {/* BARIS 2 — HARI KERJA VS AKHIR PEKAN */}
  <div className="aq-chart-grid">

    <Card className="aq-card">
      <CardHeader
        title="Hari Kerja vs Akhir Pekan"
        subtitle={`Perbandingan rata-rata konsentrasi polutan · ${filterScopeText(timeFilter)}`}
      />

      <WeekendChart
        rows={weekendRows}
        parameter={timeFilter.parameter}
      />
    </Card>

    <Card className="aq-card">
      <CardHeader
        title="Interpretasi Hari Pengamatan"
        subtitle="Perbedaan konsentrasi pada hari kerja dan akhir pekan."
      />

      <WeekendInterpretation
        rows={weekendRows}
        parameter={timeFilter.parameter}
      />
    </Card>

  </div>

  <div className="aq-distribusi-footer">
    <p>
      *Analisis menggunakan data dari stasiun bersatuan
      µg/m³. Stasiun bersatuan ppm dan data yang tidak
      memenuhi kriteria kecukupan pengamatan tidak
      disertakan. Interpretasi menunjukkan pola berdasarkan
      data yang tersedia dan tidak secara langsung
      mengidentifikasi sumber pencemaran.
    </p>
  </div>
</section>


{/* 06 — ANALISIS MUSIMAN */}

<section className="aq-section">
  <SectionTitle
    number="06"
    title="Apakah pergantian musim turut memengaruhi kualitas udara?"
    description="Membandingkan konsentrasi polutan pada musim hujan dan musim kemarau berdasarkan periode dan wilayah pengamatan."
  />

  <Card className="aq-card">
    <CardHeader
      title="Perbandingan Kualitas Udara Berdasarkan Musim"
      subtitle={`Konsentrasi rata-rata ${PARAMETERS[seasonFilter.parameter].label} pada musim hujan dan kemarau · ${seasonScopeLabel(seasonFilter)}${seasonFilter.kawasan !== 'Semua' ? ` · Kawasan ${seasonFilter.kawasan}` : ''}`}
   />

{/* FILTER MUSIMAN */}

<div className="aq-season-filter-grid">

  {/* RENTANG PENGAMATAN */}
  <div className="aq-season-filter-item aq-season-date">
    <span>Rentang pengamatan</span>
    <DateRangePicker
      startDate={seasonFilter.dariTanggal || seasonalDateBounds.min}
      endDate={seasonFilter.sampaiTanggal || seasonalDateBounds.max}
      minDate={seasonalDateBounds.min}
      maxDate={seasonalDateBounds.max}
      years={years}
      onApply={(dariTanggal, sampaiTanggal) =>
        setSeasonFilter((state) => ({
          ...state,
          dariTanggal,
          sampaiTanggal,
        }))
      }
    />
  </div>

{/* CAKUPAN WILAYAH */}
<div className="aq-season-filter-item">
  <span>Cakupan wilayah</span>

  <RegionScopePicker
    rows={seasonalBaseRows}
    value={{
      pulau: seasonFilter.pulau,
      provinsi: seasonFilter.provinsi,
      station_id: seasonFilter.station_id,
    }}
    onApply={(scope) =>
      setSeasonFilter((state) => ({
        ...state,
        ...scope,
      }))
    }
  />
</div>

  {/* KARAKTERISTIK KAWASAN */}
  <div className="aq-season-filter-item">
    <FilterSelect
      label="Karakteristik kawasan"
      value={seasonFilter.kawasan}
      options={areaTypeOptions}
      onChange={(value) =>
        setSeasonFilter((state) => ({
          ...state,
          kawasan: value,
        }))
      }
    />
  </div>

  {/* PARAMETER */}
  <div className="aq-season-filter-item">
    <FilterSelect
      label="Parameter"
      value={seasonFilter.parameter}
      options={parameterOptions}
      onChange={(value) =>
        setSeasonFilter((state) => ({
          ...state,
          parameter: value,
        }))
      }
    />
  </div>

</div>


    {/* RINGKASAN DATA */}
    <div className="aq-season-data-summary">
      Menampilkan{' '}
      <strong>
        {seasonalFilteredRows.length.toLocaleString('id-ID')}
      </strong>{' '}
      catatan pengamatan dari{' '}
      <strong>
        {new Set(
          seasonalFilteredRows.map((row) => row.station_id)
        ).size}
      </strong>{' '}
      stasiun bersatuan µg/m³.
    </div>

    {/* GRAFIK */}
    <SeasonalChart
      rows={seasonalFilteredRows}
      parameter={seasonFilter.parameter}
    />

    {/* INTERPRETASI DALAM CARD YANG SAMA */}
    <div className="aq-season-result">

      <SeasonalInterpretation
        rows={seasonalFilteredRows}
        parameter={seasonFilter.parameter}
        startDate={seasonFilter.dariTanggal || seasonalDateBounds.min}
        endDate={seasonFilter.sampaiTanggal || seasonalDateBounds.max}
      />
    </div>

  </Card>

  {/* KETERANGAN ANALISIS */}
  <div className="aq-distribusi-footer">
    <p>
      *Musim hujan ditetapkan pada November–April,
      sedangkan musim kemarau pada Mei–Oktober.
      Analisis menggunakan data stasiun bersatuan µg/m³;
      stasiun bersatuan ppm tidak disertakan.
      Rata-rata dihitung dari seluruh catatan pengamatan
      yang memenuhi filter. Hasil menunjukkan pola
      musiman berdasarkan data yang tersedia dan tidak
      secara langsung mengidentifikasi sumber pencemaran.
    </p>
  </div>
</section>

      {/* ==================================================
          SECTION 07 — PERBANDINGAN KARAKTERISTIK KAWASAN
      ================================================== */}

      <section className="aq-section">

        <SectionTitle
          number="07"
          title="Apakah karakteristik kawasan berkaitan dengan perbedaan pencemaran udara?"
          description="Mengidentifikasi perbedaan tingkat konsentrasi polutan pada kawasan perkotaan, industri, latar bersih, dan penyangga gambut."
        />

        <Card className="aq-card">

          <CardHeader
            title="Analisis Konsentrasi Berdasarkan Karakteristik Kawasan"
            subtitle={`Perbandingan rata-rata ${areaParameterLabel} pada empat kelompok karakteristik lokasi pengamatan · ${filterScopeText(areaFilter)}`}
          />

          {/* FILTER SECTION 07 */}

          <LocalFilter onReset={resetArea}>

            <FilterDateRange
              value={areaFilter}
              bounds={tableDateBounds}
              years={years}
              onChange={(range) => setAreaFilter((state) => ({ ...state, ...range }))}
            />

            <FilterScope
              rows={data.stations}
              value={areaFilter}
              levels={['pulau', 'provinsi']}
              onChange={(scope) => setAreaFilter((state) => ({ ...state, ...scope }))}
            />

            <FilterSelect
              label="Parameter"
              value={areaFilter.parameter}
              options={parameterOptions}
              onChange={(value) =>
                setAreaFilter((state) => ({
                  ...state,
                  parameter: value,
                }))
              }
            />

          </LocalFilter>


          {/* GRAFIK PERBANDINGAN */}

          <div className="aq-area-chart-wrap">

            <div className="aq-area-chart-heading">

            

            </div>

            {areaHasData ? (
              <EChart
                option={areaChartOption}
                height={330}
              />
            ) : (
              <EmptyData
                message="Tidak ditemukan data konsentrasi yang sesuai dengan filter karakteristik kawasan."
              />
            )}

          </div>

          {/* INTERPRETASI */}

          <div className="aq-area-interpretation">

            <div className="aq-area-interpretation-heading">

              <strong>
                Interpretasi Perbandingan Kawasan
              </strong>
            </div>

            {areaHasData ? (

              <p>
                Berdasarkan hasil penyaringan data,
                rata-rata konsentrasi <strong>{areaParameterLabel}</strong>
                {' '}tertinggi terdapat pada kawasan
                {' '}<strong>{areaHighest.name}</strong>,
                yaitu sebesar
                {' '}<strong>
                  {formatValue(areaHighest.concentration)} µg/m³
                </strong>.

                {areaLowest && (
                  <>
                    {' '}Sementara itu, konsentrasi terendah
                    terdapat pada kawasan
                    {' '}<strong>{areaLowest.name}</strong>,
                    yaitu sebesar
                    {' '}<strong>
                      {formatValue(areaLowest.concentration)} µg/m³
                    </strong>.
                  </>
                )}

                {' '}Perbedaan ini menunjukkan adanya variasi
                konsentrasi polutan antar karakteristik lokasi
                pemantauan. Hasil tersebut dapat digunakan
                untuk mengidentifikasi kelompok kawasan yang
                memiliki konsentrasi relatif lebih tinggi
                maupun lebih rendah.
              </p>

            ) : (

              <p>
                Belum tersedia data yang cukup untuk
                menghasilkan interpretasi berdasarkan
                filter yang dipilih.
              </p>

            )}

          </div>

          {/* CATATAN METODOLOGI */}

          <p className="aq-area-note">
            <strong>Catatan analisis:</strong>
            {' '}Pengelompokan kawasan menggunakan metadata
            <i> site_type </i>
            pada stasiun pemantauan. Perhitungan rata-rata
            menggunakan pembobotan jumlah hari pengamatan
            dari data bulanan bersatuan µg/m³; stasiun bersatuan ppm
            tidak disertakan. Hasil analisis
            menggambarkan perbedaan konsentrasi antar kelompok
            lokasi, bukan bukti langsung mengenai penyebab
            pencemaran.
          </p>

        </Card>

      </section>

{/* 08 — ANALISIS PERIODE KRITIS */}
<section className="aq-section">
  <SectionTitle
    number="08"
    title="Di mana dan kapan kondisi pencemaran paling mengkhawatirkan?"
    description="Mengidentifikasi waktu, lokasi, dan parameter yang mengalami peningkatan konsentrasi secara signifikan."
  />

  <LocalFilter onReset={resetCritical}>
    <FilterDateRange
      value={criticalFilter}
      bounds={tableDateBounds}
      years={years}
      onChange={(range) => setCriticalFilter((state) => ({ ...state, ...range }))}
    />

    <FilterScope
      rows={data.stations}
      value={criticalFilter}
      levels={['pulau', 'provinsi']}
      onChange={(scope) => setCriticalFilter((state) => ({ ...state, ...scope }))}
    />

    <FilterSelect
      label="Parameter"
      value={criticalFilter.parameter}
      options={parameterOptions}
      onChange={(value) =>
        setCriticalFilter((state) => ({
          ...state,
          parameter: value,
        }))
      }
    />
  </LocalFilter>

  <Card className="aq-card">

    <CriticalPeriods
      items={data.criticalPeriods.filter((item) =>
        isInDateRange(item, criticalFilter.dariTanggal, criticalFilter.sampaiTanggal) &&
        (criticalFilter.pulau === 'Semua' ||
          item.island === criticalFilter.pulau) &&
        (criticalFilter.provinsi === 'Semua' ||
          item.province === criticalFilter.provinsi) &&
        item.parameter_key === criticalFilter.parameter
      )}
    />
  </Card>

  <div className="aq-distribusi-footer">
    <p>
      *Periode kritis ditandai berdasarkan persentil ke-95
      konsentrasi pada masing-masing stasiun dan parameter,
      bukan ambang baku mutu. Analisis menggunakan data stasiun
      bersatuan µg/m³; stasiun bersatuan ppm tidak disertakan.
    </p>
  </div>
</section>

      {/* 09 — ANALISIS INDIKASI EPISODE KABUT ASAP */}
      <section className="aq-section">
        <SectionTitle
          number="09"
          title="Apakah lonjakan partikulat mengindikasikan adanya episode kabut asap?"
          description="Mengidentifikasi kesamaan waktu lonjakan partikulat antarstasiun, persebaran wilayah, dan kondisi angin."
        />

        {/* FILTER GLOBAL SECTION */}
        <LocalFilter onReset={resetHaze}>
          <FilterDateRange
            value={hazeFilter}
            bounds={tableDateBounds}
            years={years}
            onChange={(range) => setHazeFilter((state) => ({ ...state, ...range }))}
          />

          <FilterScope
            rows={data.stations}
            value={hazeFilter}
            levels={['pulau', 'provinsi']}
            onChange={(scope) => setHazeFilter((state) => ({ ...state, ...scope }))}
          />
        </LocalFilter>


        {/* POLA KEJADIAN ANTARSTASIUN */}
        <Card className="aq-card">
          <CardHeader
            title="Pola Kejadian Antarstasiun"
            subtitle={`Perbandingan peningkatan konsentrasi PM2.5 dan PM10 berdasarkan stasiun dan waktu pengamatan · ${filterScopeText(hazeFilter)}`}
          />

          {hazeHeatmap.values.length ? (
            <>
              <EChart
                option={hazeHeatmapOption}
                height={Math.max(
                  300,
                  hazeHeatmap.stations.length * 30 + 120
                )}
              />
<div className="haze-heatmap-interpretation">
  <strong>Bagaimana Membaca Pola Kejadian?</strong>

  <p>
    Heatmap ini menunjukkan waktu terjadinya peningkatan konsentrasi
    PM2.5 dan PM10 pada setiap stasiun pemantauan. Nama stasiun
    ditampilkan pada sumbu vertikal, sedangkan waktu pengamatan
    ditampilkan pada sumbu horizontal.
  </p>

  <p>
    Warna setiap kotak menunjukkan persentase peningkatan konsentrasi
    dibandingkan nilai ambang acuan dalam dataset. Warna yang semakin
    pekat menunjukkan peningkatan yang semakin tinggi, sedangkan
    kotak yang kosong menunjukkan tidak terdapat catatan lonjakan
    pada waktu tersebut.
  </p>

  <p>
    Apabila beberapa stasiun menunjukkan warna yang pekat pada waktu
    berdekatan, hal tersebut mengindikasikan adanya lonjakan
    partikulat yang terjadi hampir bersamaan di beberapa wilayah.
    Pola ini dapat digunakan untuk menelusuri kemungkinan episode
    pencemaran partikulat, termasuk potensi keterkaitannya dengan
    kabut asap.
  </p>
</div>
            </>
          ) : (
            <EmptyData message="Data pola kejadian antarstasiun belum tersedia." />
          )}
        </Card>

        {/* PERSEBARAN WILAYAH DAN KONDISI ANGIN */}
        <Card className="aq-card">
          <CardHeader
            title="Persebaran Wilayah dan Kondisi Angin"
            subtitle={`Lokasi stasiun yang mencatat lonjakan partikulat serta kondisi angin pada saat lonjakan tertinggi · ${filterScopeText(hazeFilter)}`}
          />

          {hazeMapStations.length ? (

<div className="haze-analysis-layout">

  {/* BARIS ATAS: PETA DAN DETAIL STASIUN */}
  <div className="haze-analysis-top">

    {/* PETA */}
    <div className="haze-map-column">
      <HazeEpisodeMap
        geo={geo.data}
        stations={hazeMapStations}
        criticalRows={hazeRows}
        selectedStationId={selectedHazeStation?.station_id ?? null}
        onSelectStation={setSelectedHazeStation}
      />

      <p className="haze-map-hint">
        Pilih titik pada peta untuk melihat informasi stasiun
        dan kondisi pengukurannya.
      </p>
    </div>

    {/* DETAIL STASIUN */}
    <div className="aq-haze-wind">

      {(() => {
        const selected =
          hazeStationSummary.find(
            (item) =>
              item.station_id === selectedHazeStation?.station_id
          ) || hazeStationSummary[0]

        if (!selected) {
          return (
            <EmptyData message="Belum tersedia detail stasiun." />
          )
        }

        const peak = selected.peak
        const direction = Number(peak.wind_direction)

        const directionLabels = [
          'Utara',
          'Timur Laut',
          'Timur',
          'Tenggara',
          'Selatan',
          'Barat Daya',
          'Barat',
          'Barat Laut',
        ]

        const windDirection = Number.isFinite(direction)
          ? `${directionLabels[
              Math.round((((direction % 360) + 360) % 360) / 45) % 8
            ]} (${Math.round(direction)}°)`
          : 'Tidak tersedia'

        return (
          <div className="haze-selected-detail">
            <div className="haze-selected-heading">
              <span>Detail stasiun terpilih</span>
              <strong>{selected.station_id}</strong>
            </div>

            <div className="haze-selected-metric">
              <strong>
                {Number(peak.increase_pct).toLocaleString(
                  'id-ID',
                  { maximumFractionDigits: 1 }
                )}%
              </strong>
              <span>
                peningkatan konsentrasi terhadap nilai ambang acuan dataset
              </span>
            </div>

            <div className="haze-detail-row">
              <span>Polutan</span>
              <strong>
                {peak.parameter ?? peak.parameter_key ?? '--'}
              </strong>
            </div>

            <div className="haze-detail-row">
              <span>Konsentrasi puncak</span>
              <strong>
                {Number(peak.value).toLocaleString(
                  'id-ID',
                  { maximumFractionDigits: 1 }
                )} µg/m³
              </strong>
            </div>

            <div className="haze-detail-row">
              <span>Waktu kejadian</span>
              <strong>
                {peak.timestamp ?? peak.date ?? '--'}
              </strong>
            </div>

            <div className="haze-detail-row">
              <span>Kecepatan angin</span>
              <strong>
                {Number.isFinite(Number(peak.wind_speed))
                  ? `${Number(peak.wind_speed).toLocaleString('id-ID')} m/s`
                  : 'Tidak tersedia'}
              </strong>
            </div>

            <div className="haze-detail-row">
              <span>Arah angin</span>
              <strong>{windDirection}</strong>
            </div>

            <div className="haze-detail-row">
              <span>Karakteristik kawasan</span>
              <strong>
                {peak.site_type ?? selected.site_type ?? '--'}
              </strong>
            </div>
          </div>
        )
      })()}

    </div>
  </div>

  {/* BARIS BAWAH: INTERPRETASI MEMBENTANG PENUH */}
  <div className="haze-map-interpretation">
    <strong>Bagaimana Membaca Peta Ini?</strong>

    <p>
      Setiap titik menunjukkan lokasi stasiun yang mencatat
      lonjakan konsentrasi PM2.5 atau PM10. Warna titik
      menggambarkan besarnya peningkatan konsentrasi dibandingkan
      nilai ambang acuan yang digunakan dalam dataset. Semakin
      pekat warna titik, semakin tinggi persentase peningkatannya.
    </p>

    <p>
      Peta ini membantu melihat persebaran lokasi dengan
      peningkatan partikulat, sedangkan informasi angin memberikan
      gambaran kondisi meteorologis saat pengukuran. Pola tersebut
      dapat menjadi petunjuk awal untuk menelusuri kemungkinan
      episode pencemaran partikulat, tetapi belum membuktikan
      sumbernya berasal dari kebakaran hutan atau lahan gambut.
    </p>
  </div>

</div>

          ) : (
            <EmptyData message="Tidak terdapat lokasi stasiun dengan catatan lonjakan pada filter ini." />
          )}
        </Card>

        {/* INTERPRETASI HASIL */}
        <Card className="aq-card">
          <CardHeader
            title="Interpretasi Hasil"
            subtitle="Kesimpulan berdasarkan pola waktu, karakteristik wilayah, dan kondisi angin."
          />

          {!hazeRows.length ? (
            <p className="card-sub">
              Interpretasi belum dapat dibuat karena data tidak tersedia.
            </p>
          ) : (
<div className="aq-haze-summary">
  {(() => {
    const stationCount = hazeEpisodeStations.length

    const stationDescriptions = hazeEpisodeStations.map((station) => {
      const location = [
        station.site_type || station.area_characteristic,
        station.city,
        station.province,
      ].filter(Boolean).join(', ')

      return (
        <span key={station.station_id}>
          <strong>{station.station_id}</strong>
          {location ? ` (${location})` : ''}
        </span>
      )
    })

    return (
      <>
        <p>
          Berdasarkan rentang waktu dan wilayah pengamatan yang dipilih,
          teridentifikasi indikasi peningkatan konsentrasi partikulat
          pada <strong>{stationCount} stasiun</strong> dalam waktu
          berdekatan, dengan jumlah kejadian terbanyak pada{' '}
          <strong>
            {hazeMainEpisode?.time.replace('T', ' ') || '--'} WIB
          </strong>.
          Kondisi ini menunjukkan adanya pola lonjakan partikulat
          yang terjadi hampir bersamaan di beberapa lokasi.
        </p>

        {stationCount > 0 && (
          <p>
            Pada waktu tersebut, lonjakan tercatat di stasiun:
            {' '}{stationDescriptions.map((station, index) => (
              <span key={index}>
                {index > 0 ? '; ' : ''}
                {station}
              </span>
            ))}.
          </p>
        )}

        <p>
          Kesamaan waktu kejadian dan perbedaan karakteristik kawasan
          menjadi petunjuk awal untuk menelusuri kemungkinan episode
          pencemaran partikulat, termasuk potensi keterkaitannya dengan
          kebakaran hutan dan lahan gambut. Namun, pola ini belum
          membuktikan sumber pencemaran. Diperlukan data pendukung,
          seperti titik panas (hotspot), arah sebaran asap, dan informasi
          kejadian kebakaran untuk memastikan dugaan tersebut.
        </p>
      </>
    )
  })()}
</div>
          )}
        </Card>
        <div className="aq-distribusi-footer">
          <p>
            *Indikasi episode ditentukan dari lonjakan PM2.5 dan PM10
            di atas persentil ke-95 stasiun, bukan konfirmasi kabut
            asap. Analisis menggunakan data stasiun bersatuan µg/m³;
            stasiun bersatuan ppm tidak disertakan.
          </p>
        </div>
      </section>

    </ModuleLayout>
  )
}