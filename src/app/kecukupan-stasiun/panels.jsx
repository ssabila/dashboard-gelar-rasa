'use client'

import { useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, MapPin, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge, IspuBadge } from '@/components/ui/Badge'
import { SITE_TYPE_LABELS } from '@/lib/constants'
import { formatNumber, formatPm25, formatPct } from '@/lib/formatters'
import { BIVAR, GAP_COMPONENTS, PERAN_COLORS, legendFor, rampColor } from '@/lib/coverage'

const NAVY = 'var(--color-text-primary)'
const SOFT = 'var(--color-text-secondary)'

/* ─── Kontrol ──────────────────────────────────────────────────────────── */

export function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-[0.6rem] p-1"
      style={{ background: 'rgba(24,49,79,0.06)' }}
    >
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={o.hint}
            onClick={() => onChange(o.id)}
            style={{
              fontSize: '0.75rem',
              fontWeight: active ? 700 : 500,
              padding: '0.38rem 0.75rem',
              borderRadius: '0.45rem',
              border: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              background: active ? '#FFFFFF' : 'transparent',
              color: active ? NAVY : SOFT,
              boxShadow: active ? '0 1px 4px rgba(24,49,79,0.15)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Chip({ active, onClick, children, color = 'var(--color-elevated)' }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '0.32rem 0.75rem',
        borderRadius: 999,
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        border: `1px solid ${active ? color : 'rgba(24,49,79,0.16)'}`,
        background: active ? 'rgba(56,78,119,0.1)' : 'transparent',
        color: active ? NAVY : SOFT,
        transition: 'all 150ms ease',
      }}
    >
      {children}
    </button>
  )
}

export function SliderField({ label, valueLabel, min, max, step = 1, value, onChange, ticks, hint }) {
  return (
    <label className="flex min-w-[11rem] flex-1 flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2" style={{ fontSize: '0.7rem', fontWeight: 600, color: SOFT }}>
        <span>{label}</span>
        <strong style={{ color: NAVY, fontSize: '0.8rem' }}>{valueLabel}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: 'var(--color-elevated)', width: '100%' }}
      />
      {ticks && (
        <span className="flex justify-between" style={{ fontSize: '0.62rem', color: 'var(--color-text-disabled)' }}>
          {ticks.map((t) => <span key={t}>{t}</span>)}
        </span>
      )}
      {hint && <span style={{ fontSize: '0.66rem', color: 'var(--color-text-disabled)' }}>{hint}</span>}
    </label>
  )
}

/* ─── Kartu bergaya konsisten ──────────────────────────────────────────── */

export function ChartCard({ title, subtitle, children, className = '', action }) {
  return (
    <Card className={`chart-card flex flex-col gap-3 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 style={{ margin: 0, color: NAVY }}>{title}</h4>
          {subtitle && (
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', maxWidth: 'none' }}>{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </Card>
  )
}

export function Callout({ tone = 'warn', icon: Icon = AlertTriangle, title, children }) {
  const tones = {
    warn: { c: '#C2410C', bg: 'rgba(251,146,60,0.1)', b: 'rgba(251,146,60,0.35)' },
    info: { c: '#384E77', bg: 'rgba(56,78,119,0.07)', b: 'rgba(56,78,119,0.22)' },
  }
  const t = tones[tone]
  return (
    <div
      className="flex gap-3 rounded-[0.75rem] border p-3"
      style={{ background: t.bg, borderColor: t.b }}
      role={tone === 'warn' ? 'note' : undefined}
    >
      <Icon size={18} style={{ color: t.c, flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
      <div style={{ fontSize: '0.8rem', color: NAVY, lineHeight: 1.5 }}>
        {title && <strong style={{ display: 'block', color: t.c, marginBottom: 2 }}>{title}</strong>}
        {children}
      </div>
    </div>
  )
}

/* ─── Legenda peta ─────────────────────────────────────────────────────── */

export function MapLegend({ metric, ctx }) {
  const spec = legendFor(metric, ctx)
  if (!spec) return null

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Legenda peta">
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: NAVY }}>{spec.title}</span>

      {spec.type === 'gradient' && (
        <span className="inline-flex items-center gap-2" style={{ fontSize: '0.7rem', color: SOFT }}>
          {spec.min}
          <span
            style={{
              width: 150, height: 10, borderRadius: 6,
              background: `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1].map((t) => rampColor(spec.stops, t)).join(',')})`,
            }}
          />
          {spec.max}
        </span>
      )}

      {spec.type === 'categories' &&
        spec.items.map((it) => (
          <span key={it.label} className="inline-flex items-center gap-1.5" style={{ fontSize: '0.72rem', color: SOFT }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: it.color }} />
            {it.label}
          </span>
        ))}

      {spec.type === 'bivar' && (
        <span className="inline-flex items-center gap-2" style={{ fontSize: '0.66rem', color: SOFT }}>
          <span className="inline-grid" style={{ gridTemplateColumns: 'repeat(3, 14px)', gap: 1 }}>
            {[...BIVAR].reverse().flat().map((c, i) => (
              <span key={i} style={{ width: 14, height: 14, background: c }} />
            ))}
          </span>
          <span className="flex flex-col leading-tight">
            <span>↑ {spec.rowLabel}</span>
            <span>{spec.colLabel} (kanan = jauh)</span>
          </span>
        </span>
      )}

      <span className="inline-flex items-center gap-1.5" style={{ fontSize: '0.7rem', color: SOFT }}>
        <span style={{ width: 12, height: 12, border: '2px solid #18314F', borderRadius: 3 }} />
        kabupaten ber-stasiun
      </span>
    </div>
  )
}

/* ─── Panel detail (kabupaten / stasiun) ───────────────────────────────── */

function Stat({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3" style={{ fontSize: '0.78rem' }}>
      <span style={{ color: SOFT }}>{label}</span>
      <strong style={{ color: NAVY, textAlign: 'right' }}>{children}</strong>
    </div>
  )
}

function Meter({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between" style={{ fontSize: '0.68rem', color: SOFT }}>
        <span>{label}</span><span>{Math.round((value ?? 0) * 100)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: 'rgba(24,49,79,0.08)' }}>
        <div style={{ width: `${Math.min(100, (value ?? 0) * 100)}%`, height: '100%', borderRadius: 4, background: color }} />
      </div>
    </div>
  )
}

export function DetailPanel({ selected, kab, station, stationsByKode, radius, gapScore, gapRank, onClose }) {
  if (!selected || (!kab && !station)) {
    return (
      <Card className="flex h-full flex-col justify-center gap-2" style={{ minHeight: 220 }}>
        <MapPin size={22} style={{ color: 'var(--color-elevated)' }} aria-hidden="true" />
        <h4 style={{ margin: 0, color: NAVY }}>Pilih wilayah di peta</h4>
        <p style={{ margin: 0, fontSize: '0.8rem' }}>
          Klik kabupaten untuk melihat jarak ke stasiun terdekat, estimasi PM2.5, dan skor prioritasnya.
          Klik marker stasiun untuk melihat keandalan datanya.
        </p>
      </Card>
    )
  }

  if (selected.type === 'station' && station) {
    const s = station
    return (
      <Card className="flex flex-col gap-3">
        <PanelHeader title={`${s.kode} · ${s.kota_kabupaten}`} sub={`${s.provinsi_shp ?? ''} · ${s.pulau ?? ''}`} onClose={onClose} />
        <div className="flex flex-wrap gap-2">
          <Badge label={s.peran} color={PERAN_COLORS[s.peran] ?? '#94A3B8'} bg="rgba(24,49,79,0.05)" />
          <Badge label={s.status_operasional ?? '—'} color={s.status_operasional === 'Active' ? '#16A34A' : '#C2410C'} bg="rgba(24,49,79,0.05)" />
          <IspuBadge pm25={s.avg_pm25} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Stat label="Tipe lokasi">{SITE_TYPE_LABELS[s.site_type] ?? s.site_type}</Stat>
          <Stat label="PM2.5 rata-rata">{formatPm25(s.avg_pm25)}</Stat>
          <Stat label="Data lengkap">{formatPct(s.completeness_pct, 1)}</Stat>
          <Stat label="Umur stasiun">{formatNumber(s.umur_tahun, 1)} tahun</Stat>
          <Stat label="Jeda data terpanjang">{formatNumber(s.longest_gap_h)} jam</Stat>
          <Stat label="Cakupan unik">{formatNumber(s.unique_coverage_km2)} km²</Stat>
          <Stat label="Error bila dihapus">{formatNumber(s.loo_rmse_daily, 2)} µg/m³</Stat>
          <Stat label="Klaster korelasi">#{s.cluster}{s.redundant_pair ? ' · punya pasangan redundan' : ''}</Stat>
        </div>
        {s.karakteristik_wilayah && (
          <p style={{ margin: 0, fontSize: '0.72rem', maxWidth: 'none' }}>{s.karakteristik_wilayah}</p>
        )}
      </Card>
    )
  }

  const near = stationsByKode.get(kab.stasiun_terdekat)
  return (
    <Card className="flex flex-col gap-3">
      <PanelHeader title={kab.kabupaten} sub={`${kab.provinsi} · ${kab.pulau}`} onClose={onClose} />
      <div className="flex flex-wrap gap-2">
        {kab.has_station ? <Badge label="Punya stasiun" color="#16A34A" bg="rgba(22,163,74,0.08)" /> : <Badge label="Tanpa stasiun" color="#C2410C" bg="rgba(251,146,60,0.12)" />}
        <IspuBadge pm25={kab.pm25_idw} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Stat label="Luas wilayah">{formatNumber(kab.area_km2)} km²</Stat>
        <Stat label="Stasiun terdekat">{kab.stasiun_terdekat} · {formatNumber(kab.jarak_km)} km</Stat>
        <Stat label="Estimasi PM2.5">±{formatNumber(kab.pm25_idw, 1)} µg/m³</Stat>
        <Stat label={`Tercakup (${radius} km)`}>{formatPct(kab[`cov_pct_${radius}`], 0)}</Stat>
        <Stat label="Luas tak terlayani">{formatNumber(kab.luas_tak_terlayani_km2)} km²</Stat>
        {gapScore != null && <Stat label="Gap score">{formatNumber(gapScore, 2)}{gapRank ? ` · peringkat ${gapRank}` : ''}</Stat>}
      </div>
      <div className="flex flex-col gap-1.5">
        {GAP_COMPONENTS.map((c) => <Meter key={c.key} label={c.label} value={kab[c.norm]} color={c.color} />)}
      </div>
      <p style={{ margin: 0, fontSize: '0.7rem', maxWidth: 'none' }}>
        PM2.5 adalah estimasi IDW dari {kab.pm25_idw_sd != null ? `stasiun sekitar (sebaran ±${formatNumber(kab.pm25_idw_sd, 1)})` : 'stasiun sekitar'};
        ketidakpastian naik seiring jarak.
        {near && <> Karakter di sekitar {near.kode}: {SITE_TYPE_LABELS[near.site_type] ?? near.site_type}.</>}
      </p>
    </Card>
  )
}

function PanelHeader({ title, sub, onClose }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <h4 style={{ margin: 0, color: NAVY, fontSize: '1rem' }}>{title}</h4>
        <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', maxWidth: 'none' }}>{sub}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Tutup detail" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: SOFT }}>
        <X size={16} />
      </button>
    </div>
  )
}

/* ─── Kartu rekomendasi ────────────────────────────────────────────────── */

export function RecommendationCard({ rec, onFocus }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span
          style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
            background: '#E6F9AF', border: '2px solid #18314F', color: '#18314F', fontWeight: 800, fontSize: '0.9rem',
          }}
        >
          {rec.prioritas}
        </span>
        <div>
          <h4 style={{ margin: 0, color: NAVY }}>{rec.kabupaten}</h4>
          <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', maxWidth: 'none' }}>{rec.provinsi} · {rec.pulau}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <IspuBadge pm25={rec.pm25_idw} size="xs" />
        <Badge label={`${formatNumber(rec.jarak_km)} km dari ${rec.stasiun_terdekat}`} color="#384E77" bg="rgba(56,78,119,0.08)" size="xs" />
        <Badge label={`+${formatNumber(rec.tambahan_cakupan_km2)} km²`} color="#16A34A" bg="rgba(22,163,74,0.08)" size="xs" />
      </div>
      <p style={{ margin: 0, fontSize: '0.76rem', maxWidth: 'none', lineHeight: 1.5 }}>{rec.justifikasi}</p>
      <div className="flex flex-col gap-1">
        {GAP_COMPONENTS.map((c) => <Meter key={c.key} label={c.label} value={rec.komponen?.[c.norm]} color={c.color} />)}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span style={{ fontSize: '0.68rem', color: SOFT }}>
          {rec.freq_top_gap != null ? `Masuk 10 teratas di ${Math.round(rec.freq_top_gap * 100)}% simulasi bobot` : ""}
        </span>
        <button
          type="button"
          onClick={() => onFocus(rec.kab_id)}
          style={{
            fontSize: '0.72rem', fontWeight: 700, padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-btn)',
            border: '1px solid rgba(24,49,79,0.2)', background: '#FFFFFF', color: NAVY, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          Lihat di peta
        </button>
      </div>
    </Card>
  )
}

/* ─── Tabel ────────────────────────────────────────────────────────────── */

function Th({ children, sortKey, sort = {}, onSort, align = 'right' }) {
  const active = sort.key === sortKey
  return (
    <th
      style={{
        position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1, padding: '0.5rem 0.6rem', fontSize: '0.68rem',
        fontWeight: 700, color: SOFT, textAlign: align, borderBottom: '1px solid var(--color-border-strong)', whiteSpace: 'nowrap',
      }}
    >
      {sortKey ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          style={{ border: 0, background: 'transparent', cursor: 'pointer', font: 'inherit', color: active ? NAVY : 'inherit', display: 'inline-flex', gap: 3, alignItems: 'center' }}
        >
          {children}
          {active && (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
        </button>
      ) : children}
    </th>
  )
}

const td = { padding: '0.45rem 0.6rem', fontSize: '0.76rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)', color: NAVY, whiteSpace: 'nowrap' }

export function ProvinceTable({ rows, radius, onFocusPulau }) {
  const [sort, setSort] = useState({ key: 'stasiun_per_100k_km2', dir: 'asc' })
  const onSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  const covKey = `cov_pct_${radius}`
  const sorted = [...rows].sort((a, b) => {
    const x = a[sort.key]; const y = b[sort.key]
    const r = typeof x === 'string' ? x.localeCompare(y) : (x ?? 0) - (y ?? 0)
    return sort.dir === 'asc' ? r : -r
  })

  return (
    <div style={{ maxHeight: 380, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <Th sortKey="provinsi" sort={sort} onSort={onSort} align="left">Provinsi</Th>
            <Th sortKey="n_stasiun" sort={sort} onSort={onSort}>Stasiun</Th>
            <Th sortKey="luas_km2" sort={sort} onSort={onSort}>Luas (km²)</Th>
            <Th sortKey="stasiun_per_100k_km2" sort={sort} onSort={onSort}>/100rb km²</Th>
            <Th sortKey={covKey} sort={sort} onSort={onSort}>Tercakup {radius} km</Th>
            <Th sortKey="median_jarak_km" sort={sort} onSort={onSort}>Median jarak</Th>
            <Th sortKey="gap_stasiun_vs_benchmark" sort={sort} onSort={onSort}>Kurang vs benchmark</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.provinsi} style={{ background: r.blank_spot ? 'rgba(251,146,60,0.08)' : 'transparent' }}>
              <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>
                <button
                  type="button"
                  onClick={() => onFocusPulau?.(r.pulau)}
                  style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }}
                  title={`Filter pulau ${r.pulau}`}
                >
                  {r.provinsi}
                </button>
                {r.blank_spot && <span style={{ marginLeft: 6 }}><Badge label="Blank spot" color="#C2410C" bg="rgba(251,146,60,0.12)" size="xs" /></span>}
              </td>
              <td style={td}>{r.n_stasiun}</td>
              <td style={td}>{formatNumber(r.luas_km2)}</td>
              <td style={td}>{formatNumber(r.stasiun_per_100k_km2, 2)}</td>
              <td style={td}>{formatPct(r[covKey], 0)}</td>
              <td style={td}>{formatNumber(r.median_jarak_km)} km</td>
              <td style={td}>{r.gap_stasiun_vs_benchmark > 0 ? `+${r.gap_stasiun_vs_benchmark}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function GapRankTable({ rows, onFocus, weightsChanged }) {
  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <Th align="left">#</Th>
            <Th align="left">Kabupaten</Th>
            <Th>Jarak</Th>
            <Th>PM2.5 est.</Th>
            <Th>Gap</Th>
            <Th>Stabilitas*</Th>
            <Th>{' '}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.kab_id}>
              <td style={{ ...td, textAlign: 'left', fontWeight: 700 }}>{i + 1}</td>
              <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>
                {r.kabupaten}<span style={{ display: 'block', fontWeight: 400, fontSize: '0.66rem', color: SOFT }}>{r.provinsi}</span>
              </td>
              <td style={td}>{formatNumber(r.jarak_km)} km</td>
              <td style={td}>{formatNumber(r.pm25_idw, 1)}</td>
              <td style={td}>{formatNumber(r.gap, 2)}</td>
              <td style={td}>{weightsChanged || r.freq_top == null ? '—' : `${Math.round(r.freq_top * 100)}%`}</td>
              <td style={td}>
                <button type="button" onClick={() => onFocus(r.kab_id)} aria-label={`Lihat ${r.kabupaten} di peta`} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--color-elevated)' }}>
                  <MapPin size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.66rem', maxWidth: 'none' }}>
        *Persentase dari 1.000 simulasi bobot (±20%) yang menempatkan kabupaten ini di jajaran teratas. Hanya berlaku untuk bobot bawaan.
      </p>
    </div>
  )
}
