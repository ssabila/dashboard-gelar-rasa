
'use client'

import { useMemo } from 'react'
import { EChart } from './EChart'
import { ChartCard } from './panels'

// ─── Grafik tren polutan ──────────────────────────

export function TrendChart({
  rows = [],
  periodType = 'bulanan',
  parameter = 'pm25',
  satuan = 'µg/m³',
}) {
  const chartData = useMemo(() => {
    const periodKey =
      periodType === 'tahunan' ? 'tahun' : 'periode_bulan'

    const filtered = rows.filter(
      (item) =>
        item.satuan === satuan &&
        item[parameter] != null &&
        item[periodKey] != null
    )

    const grouped = {}

    filtered.forEach((item) => {
      const period = String(item[periodKey])

      if (!grouped[period]) {
        grouped[period] = {
          total: 0,
          count: 0,
        }
      }

      grouped[period].total += Number(item[parameter])
      grouped[period].count += 1
    })

    return Object.entries(grouped)
      .map(([period, value]) => ({
        period,
        value: value.total / value.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }, [rows, periodType, parameter, satuan])

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) =>
        `${Number(value).toFixed(2)} ${satuan}`,
    },

    grid: {
      left: 55,
      right: 25,
      top: 25,
      bottom: 55,
      containLabel: true,
    },

    xAxis: {
      type: 'category',
      data: chartData.map((item) => item.period),
      boundaryGap: false,
      axisLabel: {
        color: '#64748B',
        fontSize: 10,
        rotate: periodType === 'bulanan' ? 35 : 0,
      },
      axisLine: {
        lineStyle: { color: '#CBD5E1' },
      },
    },

    yAxis: {
      type: 'value',
      name: satuan,
      nameTextStyle: { color: '#64748B' },
      axisLabel: { color: '#64748B' },
      splitLine: {
        lineStyle: {
          color: '#E2E8F0',
          type: 'dashed',
        },
      },
    },

    series: [
      {
        name: parameter.toUpperCase(),
        type: 'line',
        smooth: true,
        data: chartData.map((item) =>
          Number(item.value.toFixed(2))
        ),
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#384E77',
        },
        itemStyle: {
          color: '#384E77',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(56,78,119,0.22)' },
              { offset: 1, color: 'rgba(56,78,119,0.01)' },
            ],
          },
        },
      },
    ],
  }), [chartData, parameter, periodType, satuan])

  return (
    <ChartCard
      title={`Tren ${parameter.toUpperCase()}`}
      subtitle={`Perubahan konsentrasi ${periodType} (${satuan})`}
    >
      {chartData.length > 0 ? (
        <EChart option={option} height={320} />
      ) : (
        <EmptyChart />
      )}
    </ChartCard>
  )
}

// ─── Grafik perbandingan wilayah ──────────────────

export function RegionComparisonChart({
  rows = [],
  parameter = 'pm25',
  satuan = 'µg/m³',
  regionKey = 'pulau',
}) {
  const chartData = useMemo(() => {
    return rows
      .filter(
        (item) =>
          item.satuan === satuan &&
          item[parameter] != null &&
          item[regionKey] != null
      )
      .map((item) => ({
        name: item[regionKey],
        value: Number(item[parameter]),
      }))
      .sort((a, b) => b.value - a.value)
  }, [rows, parameter, satuan, regionKey])

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value) =>
        `${Number(value).toFixed(2)} ${satuan}`,
    },

    grid: {
      left: 85,
      right: 35,
      top: 20,
      bottom: 35,
      containLabel: true,
    },

    xAxis: {
      type: 'value',
      name: satuan,
      axisLabel: { color: '#64748B' },
      splitLine: {
        lineStyle: {
          color: '#E2E8F0',
          type: 'dashed',
        },
      },
    },

    yAxis: {
      type: 'category',
      inverse: true,
      data: chartData.map((item) => item.name),
      axisLabel: {
        color: '#475569',
        fontSize: 11,
      },
      axisLine: { show: false },
    },

    series: [
      {
        type: 'bar',
        data: chartData.map((item) => item.value),
        barMaxWidth: 25,
        itemStyle: {
          color: '#384E77',
          borderRadius: [0, 6, 6, 0],
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params) =>
            Number(params.value).toFixed(1),
          color: '#475569',
          fontSize: 10,
        },
      },
    ],
  }), [chartData, satuan])

  const title =
    regionKey === 'provinsi'
      ? 'Perbandingan Antarprovinsi'
      : 'Perbandingan Antarpulau'

  return (
    <ChartCard
      title={title}
      subtitle={`${parameter.toUpperCase()} berdasarkan wilayah (${satuan})`}
    >
      {chartData.length > 0 ? (
        <EChart
          option={option}
          height={Math.max(280, chartData.length * 45)}
        />
      ) : (
        <EmptyChart />
      )}
    </ChartCard>
  )
}

// ─── Tampilan ketika data kosong ──────────────────

function EmptyChart() {
  return (
    <div
      className="flex items-center justify-center rounded-xl"
      style={{
        minHeight: 180,
        background: 'rgba(24,49,79,0.035)',
        color: '#64748B',
        fontSize: '0.78rem',
      }}
    >
      Data belum tersedia untuk pilihan ini.
    </div>
  )
}
