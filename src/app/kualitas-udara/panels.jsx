
'use client'

import { AlertTriangle, MapPin, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'

const NAVY = 'var(--color-text-primary)'
const SOFT = 'var(--color-text-secondary)'

// Warna kategori ISPU
const ISPU_COLORS = {
  'Baik': '#4ADE80',
  'Sedang': '#FACC15',
  'Tidak Sehat': '#FB923C',
  'Sangat Tidak Sehat': '#F87171',
  'Berbahaya': '#C026D3',
}

// ─── Kontrol pilihan ─────────────────────────────

export function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-[0.6rem] p-1"
      style={{ background: 'rgba(24,49,79,0.06)' }}
    >
      {options.map((item) => {
        const active = item.value === value

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            style={{
              fontSize: '0.75rem',
              fontWeight: active ? 700 : 500,
              padding: '0.4rem 0.8rem',
              borderRadius: '0.45rem',
              border: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              background: active ? '#FFFFFF' : 'transparent',
              color: active ? NAVY : SOFT,
              boxShadow: active
                ? '0 1px 4px rgba(24,49,79,0.15)'
                : 'none',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Kartu grafik ─────────────────────────────────

export function ChartCard({
  title,
  subtitle,
  children,
  className = '',
  action,
}) {
  return (
    <Card className={`chart-card flex flex-col gap-3 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 style={{ margin: 0, color: NAVY }}>{title}</h4>

          {subtitle && (
            <p
              style={{
                margin: '0.2rem 0 0',
                fontSize: '0.75rem',
                maxWidth: 'none',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {action}
      </div>

      {children}
    </Card>
  )
}

// ─── Kartu KPI ────────────────────────────────────

export function KpiCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  accent = 'var(--color-elevated)',
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span style={{ fontSize: '0.78rem', color: SOFT }}>
          {title}
        </span>

        {Icon && (
          <span
            className="grid h-9 w-9 place-items-center rounded-xl"
            style={{
              background: 'rgba(56,78,119,0.09)',
              color: accent,
            }}
          >
            <Icon size={18} />
          </span>
        )}
      </div>

      <div>
        <div
          style={{
            color: NAVY,
            fontSize: '1.8rem',
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          {value ?? '—'}
          {unit && (
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                marginLeft: 5,
              }}
            >
              {unit}
            </span>
          )}
        </div>

        {subtitle && (
          <p
            style={{
              margin: '0.35rem 0 0',
              fontSize: '0.7rem',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  )
}

// ─── Badge ISPU ───────────────────────────────────

export function IspuBadge({ kategori, size = 'sm' }) {
  if (!kategori) {
    return (
      <span style={{ fontSize: '0.72rem', color: SOFT }}>
        Belum tersedia
      </span>
    )
  }

  const color = ISPU_COLORS[kategori] ?? '#94A3B8'

  const textColor =
    kategori === 'Baik' || kategori === 'Sedang'
      ? '#18314F'
      : '#FFFFFF'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'xs' ? '0.2rem 0.5rem' : '0.3rem 0.7rem',
        borderRadius: 999,
        background: color,
        color: textColor,
        fontSize: size === 'xs' ? '0.65rem' : '0.72rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {kategori}
    </span>
  )
}

// ─── Callout informasi ────────────────────────────

export function Callout({
  tone = 'info',
  title,
  children,
}) {
  const styles = {
    info: {
      color: '#384E77',
      background: 'rgba(56,78,119,0.07)',
      border: 'rgba(56,78,119,0.2)',
    },
    warn: {
      color: '#C2410C',
      background: 'rgba(251,146,60,0.1)',
      border: 'rgba(251,146,60,0.35)',
    },
  }

  const style = styles[tone]

  return (
    <div
      className="flex gap-3 rounded-xl border p-3"
      style={{
        color: NAVY,
        background: style.background,
        borderColor: style.border,
      }}
    >
      <AlertTriangle
        size={18}
        style={{
          color: style.color,
          flexShrink: 0,
          marginTop: 2,
        }}
      />

      <div style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
        {title && (
          <strong
            style={{
              display: 'block',
              color: style.color,
              marginBottom: 2,
            }}
          >
            {title}
          </strong>
        )}

        {children}
      </div>
    </div>
  )
}

// ─── Filter dashboard ─────────────────────────────

export function FilterBar({
  filters,
  values,
  onChange,
}) {
  const fields = [
    {
      key: 'periode',
      label: 'Periode',
      options: filters.periode ?? [],
    },
    {
      key: 'pulau',
      label: 'Pulau',
      options: filters.pulau ?? [],
    },
    {
      key: 'provinsi',
      label: 'Provinsi',
      options: filters.provinsi ?? [],
    },
    {
      key: 'station_id',
      label: 'Stasiun',
      options: filters.station_id ?? [],
    },
    {
      key: 'parameter',
      label: 'Parameter',
      options: filters.parameter ?? [],
    },
  ]

  return (
    <Card className="flex flex-wrap items-end gap-3">
      {fields.map((field) => (
        <label
          key={field.key}
          className="flex min-w-[140px] flex-1 flex-col gap-1"
        >
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: SOFT,
            }}
          >
            {field.label}
          </span>

          <select
            value={values[field.key] ?? 'Semua'}
            onChange={(event) =>
              onChange(field.key, event.target.value)
            }
            className="rounded-lg border px-3 py-2"
            style={{
              background: '#FFFFFF',
              borderColor: 'var(--color-border)',
              color: NAVY,
              fontSize: '0.75rem',
              fontFamily: 'var(--font-body)',
            }}
          >
            <option value="Semua">Semua</option>

            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ))}
    </Card>
  )
}

// ─── Tabel stasiun ────────────────────────────────

export function StationTable({
  rows = [],
  onSelect,
  selectedId,
}) {
  return (
    <div style={{ maxHeight: 430, overflow: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}
      >
        <thead>
          <tr>
            {[
              'Stasiun',
              'Provinsi',
              'Pulau',
              'ISPU',
              'Kategori',
              'Satuan',
            ].map((heading) => (
              <th
                key={heading}
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  background: '#FFFFFF',
                  padding: '0.65rem',
                  borderBottom: '1px solid var(--color-border-strong)',
                  color: SOFT,
                  fontSize: '0.7rem',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => (
            <tr
              key={item.station_id}
              onClick={() => onSelect?.(item)}
              style={{
                cursor: 'pointer',
                background:
                  selectedId === item.station_id
                    ? 'rgba(56,78,119,0.08)'
                    : 'transparent',
              }}
            >
              <td style={tableCell(true)}>
                {item.station_id}
              </td>

              <td style={tableCell()}>
                {item.provinsi}
              </td>

              <td style={tableCell()}>
                {item.pulau}
              </td>

              <td style={tableCell()}>
                {item.ispu ?? '—'}
              </td>

              <td style={tableCell()}>
                <IspuBadge kategori={item.kategori_ispu} size="xs" />
              </td>

              <td style={tableCell()}>
                {item.satuan}
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td
                colSpan={6}
                style={{
                  ...tableCell(),
                  textAlign: 'center',
                  padding: '1.5rem',
                }}
              >
                Tidak ada data stasiun.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function tableCell(bold = false) {
  return {
    padding: '0.6rem',
    fontSize: '0.75rem',
    color: NAVY,
    fontWeight: bold ? 700 : 400,
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
  }
}

// ─── Panel detail stasiun ─────────────────────────

export function DetailPanel({ station, onClose }) {
  if (!station) {
    return (
      <Card
        className="flex flex-col justify-center gap-2"
        style={{ minHeight: 190 }}
      >
        <MapPin
          size={22}
          style={{ color: 'var(--color-elevated)' }}
        />

        <h4 style={{ margin: 0, color: NAVY }}>
          Pilih stasiun
        </h4>

        <p style={{ margin: 0, fontSize: '0.78rem' }}>
          Klik salah satu stasiun pada tabel atau peta untuk
          melihat informasi pemantauan kualitas udara.
        </p>
      </Card>
    )
  }

  const details = [
    ['ID Stasiun', station.station_id],
    ['Nama stasiun', station.nama_sensor],
    ['Provinsi', station.provinsi],
    ['Kabupaten/Kota', station.kota_kabupaten],
    ['Kecamatan', station.kecamatan],
    ['Pulau', station.pulau],
    ['Satuan', station.satuan],
    ['Status operasional', station.status_operasional],
    ['Tanggal data ISPU', station.tanggal],
    ['Nilai ISPU', station.ispu],
    ['Parameter kritis', station.parameter_kritis],
    ['Status konsentrasi', station.status_konsentrasi],
  ]

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 style={{ margin: 0, color: NAVY }}>
            {station.station_id}
          </h4>

          <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem' }}>
            {station.nama_sensor}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail"
          style={{
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            color: SOFT,
          }}
        >
          <X size={17} />
        </button>
      </div>

      <IspuBadge kategori={station.kategori_ispu} />

      <div className="flex flex-col gap-2">
        {details.map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between gap-3"
            style={{ fontSize: '0.75rem' }}
          >
            <span style={{ color: SOFT }}>{label}</span>

            <strong
              style={{
                color: NAVY,
                textAlign: 'right',
                maxWidth: '60%',
              }}
            >
              {value ?? '—'}
            </strong>
          </div>
        ))}
      </div>
    </Card>
  )
}
