'use client'

import dynamic from 'next/dynamic'
import { useMemo, useRef, useState } from 'react'
import { Activity, Cpu, MapPin, MapPinned, RotateCcw, Ruler, Target } from 'lucide-react'
import { ModuleLayout, Section } from '@/components/layout/ModuleLayout'
import { Card } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { LoadingSpinner, ErrorState } from '@/components/ui/LoadingSpinner'
import {
  useCoverageSummary,
  useCoverageGeo,
  useCoverageKabupaten,
  useCoverageRegion,
  useStationQuality,
  useStationCorrelation,
  useRecommendations,
  useCoverageCurve,
} from '@/hooks/useCoverageData'
import { formatNumber } from '@/lib/formatters'
import {
  DEFAULT_WEIGHTS,
  GAP_COMPONENTS,
  METRICS,
  PULAU_ORDER,
  buildContext,
  buildGapMap,
} from '@/lib/coverage'
import {
  CompletenessHeatmap,
  CorrelationHeatmap,
  CoverageCurveChart,
  DecayChart,
  GapContributionChart,
  ProvinceTreemap,
  PulauDensityChart,
  RoleScatter,
  SiteTypeChart,
} from './charts'
import {
  Callout,
  ChartCard,
  Chip,
  DetailPanel,
  GapRankTable,
  MapLegend,
  ProvinceTable,
  RecommendationCard,
  SegmentedControl,
  SliderField,
} from './panels'

// Leaflet tidak bisa SSR — dynamic import wajib
const CoverageMap = dynamic(
  () => import('@/map/CoverageMap').then((m) => m.CoverageMap),
  { ssr: false, loading: () => <LoadingSpinner label="Memuat peta..." /> }
)

const EMPTY = []
const NAVY = 'var(--color-text-primary)'

const METODOLOGI_LABEL = {
  data: 'Data',
  batas_admin: 'Batas administrasi',
  jarak: 'Jarak',
  radius: 'Radius representatif',
  pm25_estimasi: 'Estimasi PM2.5',
  gap_score_bobot: 'Bobot gap score',
  sumber_proxy: 'Faktor sumber polusi',
  penduduk: 'Penduduk',
  benchmark: 'Benchmark kepadatan',
  cakupan: 'Cakupan',
  greedy: 'Pemilihan lokasi baru',
}

export default function KecukupanStasiunPage() {
  const summary = useCoverageSummary()
  const geo = useCoverageGeo()
  const kab = useCoverageKabupaten()
  const region = useCoverageRegion()
  const stationQ = useStationQuality()
  const corr = useStationCorrelation()
  const recs = useRecommendations()
  const curve = useCoverageCurve()

  const [pulau, setPulau] = useState(null)
  const [radiusState, setRadius] = useState(null)
  const [metric, setMetric] = useState('jarak')
  const [layers, setLayers] = useState({ circles: true, stations: true, links: false })
  const [nAdd, setNAdd] = useState(0)
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [selected, setSelected] = useState(null)
  const mapSectionRef = useRef(null)

  const all = [summary, geo, kab, region, stationQ, corr, recs, curve]
  const error = all.find((x) => x.error)?.error
  const ready = all.every((x) => x.data)

  const sum = summary.data
  const radii = sum?.radii_km ?? EMPTY
  const radius = radiusState ?? sum?.radius_utama_km ?? null

  /* ── Data turunan ── */
  const kabRows = kab.data ?? EMPTY
  const stations = stationQ.data?.stations ?? EMPTY
  const kabById = useMemo(() => new Map(kabRows.map((r) => [r.kab_id, r])), [kabRows])
  const stationsByKode = useMemo(() => new Map(stations.map((s) => [s.kode, s])), [stations])
  const mapStations = useMemo(() => (pulau ? stations.filter((s) => s.pulau === pulau) : stations), [stations, pulau])

  const gapById = useMemo(() => buildGapMap(kabRows, weights), [kabRows, weights])
  const ctx = useMemo(
    () => (kabRows.length && radius ? buildContext(kabRows, radius, gapById) : null),
    [kabRows, radius, gapById]
  )

  const eligibleSorted = useMemo(
    () => kabRows.filter((r) => r.eligible).map((r) => ({ ...r, gap: gapById.get(r.kab_id) })).sort((a, b) => b.gap - a.gap),
    [kabRows, gapById]
  )
  const rankById = useMemo(() => new Map(eligibleSorted.map((r, i) => [r.kab_id, i + 1])), [eligibleSorted])
  const ranked = useMemo(
    () => eligibleSorted.filter((r) => !pulau || r.pulau === pulau).slice(0, 10),
    [eligibleSorted, pulau]
  )

  const curveRows = curve.data?.curve ?? EMPTY
  const curveMax = Math.max(0, curveRows.length - 1)
  const nAddEff = Math.min(nAdd, curveMax)
  const candidates = useMemo(
    () =>
      curveRows
        .slice(1, nAddEff + 1)
        .map((c) => {
          const k = kabById.get(c.kab_id)
          return k ? { kab_id: c.kab_id, prioritas: c.n_added, lat: k.lat, lon: k.lon } : null
        })
        .filter(Boolean),
    [curveRows, nAddEff, kabById]
  )

  const regionPulau = useMemo(
    () => (region.data?.pulau ?? EMPTY).slice().sort((a, b) => PULAU_ORDER.indexOf(a.pulau) - PULAU_ORDER.indexOf(b.pulau)),
    [region.data]
  )
  const regionProv = useMemo(
    () => (region.data?.provinsi ?? EMPTY).filter((r) => !pulau || r.pulau === pulau),
    [region.data, pulau]
  )
  const pulauRow = pulau ? regionPulau.find((r) => r.pulau === pulau) : null

  /* ── KPI (mengikuti filter pulau & radius) ── */
  const kpi = useMemo(() => {
    if (!ready || !radius) return null
    const st = pulau ? stations.filter((s) => s.pulau === pulau) : stations
    const active = st.filter((s) => s.status_operasional === 'Active').length
    const avg = st.length ? st.reduce((s, x) => s + (x.completeness_pct ?? 0), 0) / st.length : null
    const provCovered = regionProv.filter((r) => r.n_stasiun > 0).length
    return {
      active, nStasiun: st.length, avgCompleteness: avg,
      provCovered, provTotal: regionProv.length,
      cov: pulauRow ? pulauRow[`cov_pct_${radius}`] : sum.cov_pct_by_radius?.[String(radius)],
      medianJarak: pulauRow ? pulauRow.median_jarak_km : sum.median_jarak_km,
      kabTanpa: pulauRow ? pulauRow.n_kab - pulauRow.n_kab_dengan_stasiun : sum.n_kab_total - sum.n_kab_dengan_stasiun,
      kabTotal: pulauRow ? pulauRow.n_kab : sum.n_kab_total,
    }
  }, [ready, radius, pulau, stations, regionProv, pulauRow, sum])

  /* ── Handler ── */
  const togglePulau = (name) => setPulau((p) => (p === name ? null : name))
  const focusKab = (id) => {
    setSelected({ type: 'kab', id, fly: true })
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const weightsChanged = GAP_COMPONENTS.some((c) => Math.abs(weights[c.key] - DEFAULT_WEIGHTS[c.key]) > 1e-9)
  const resetAll = () => {
    setPulau(null); setRadius(null); setMetric('jarak'); setNAdd(0)
    setWeights(DEFAULT_WEIGHTS); setSelected(null)
    setLayers({ circles: true, stations: true, links: false })
  }

  const radiusIdx = Math.max(0, radii.indexOf(radius))
  const isMainRadius = radius === sum?.radius_utama_km
  const radiusTag = isMainRadius ? (sum?.radius_fit?.used_fallback ? ' (asumsi)' : ' (dari data)') : ''
  const weightSum = GAP_COMPONENTS.reduce((s, c) => s + weights[c.key], 0) || 1

  const selKab = selected?.type === 'kab' ? kabById.get(selected.id) : null
  const selStation = selected?.type === 'station' ? stationsByKode.get(selected.id) : null
  const blankInScope = regionProv.filter((r) => r.blank_spot)

  return (
    <ModuleLayout
      title="Kecukupan Stasiun"
      description="Apakah 27 stasiun sudah cukup mewakili kondisi udara Indonesia, dan di mana stasiun baru paling dibutuhkan?"
    >
      {error && <ErrorState message={`Data gagal dimuat: ${error}. Pastikan notebook preprocessing sudah dijalankan.`} />}
      {!ready && !error && <LoadingSpinner label="Memuat data kecukupan stasiun..." />}

      {ready && kpi && ctx && (
        <>
          {/* ── Kontrol global halaman ── */}
          <Card className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <div className="flex flex-col gap-1.5">
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Pulau</span>
                <div className="flex flex-wrap gap-1.5">
                  <Chip active={!pulau} onClick={() => setPulau(null)}>Semua</Chip>
                  {regionPulau.map((r) => (
                    <Chip key={r.pulau} active={pulau === r.pulau} onClick={() => togglePulau(r.pulau)}>{r.pulau}</Chip>
                  ))}
                </div>
              </div>
              <SliderField
                label="Radius representatif stasiun"
                valueLabel={`${radius} km${radiusTag}`}
                min={0}
                max={Math.max(0, radii.length - 1)}
                value={radiusIdx}
                onChange={(i) => setRadius(radii[i])}
                ticks={radii.map((r) => `${r}`)}
              />
              <button
                type="button"
                onClick={resetAll}
                className="ml-auto flex items-center gap-1.5"
                style={{
                  fontSize: '0.72rem', fontWeight: 600, padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-btn)',
                  border: '1px solid rgba(24,49,79,0.16)', background: 'transparent', color: 'var(--color-text-secondary)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.7rem', maxWidth: 'none', color: 'var(--color-text-disabled)' }}>
              Jarak, radius, dan cakupan bersifat tetap (bergantung lokasi, bukan waktu). Estimasi PM2.5 memakai rata-rata
              Jan 2024 – Okt 2026.
            </p>
          </Card>

          {/* ── KPI ── */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Stasiun Aktif"
              value={kpi.active}
              unit={`dari ${kpi.nStasiun}`}
              accentColor="var(--ispu-baik)"
              icon={<Cpu size={16} />}
              subtext={pulau ?? 'Seluruh Indonesia'}
            />
            <MetricCard
              label="Provinsi Tercakup"
              value={kpi.provCovered}
              unit={`dari ${kpi.provTotal}`}
              accentColor="var(--color-elevated)"
              icon={<MapPinned size={16} />}
              subtext={`${kpi.provTotal - kpi.provCovered} provinsi blank spot`}
            />
            <MetricCard
              label="Luas Daratan Tercakup"
              value={formatNumber(kpi.cov, 1)}
              unit="%"
              accentColor="var(--ispu-sedang)"
              icon={<Target size={16} />}
              subtext={`radius ${radius} km`}
            />
            <MetricCard
              label="Median Jarak ke Stasiun"
              value={formatNumber(kpi.medianJarak)}
              unit="km"
              accentColor="var(--ispu-tidak-sehat)"
              icon={<Ruler size={16} />}
              subtext="kabupaten → stasiun terdekat"
            />
            <MetricCard
              label="Kabupaten Tanpa Stasiun"
              value={formatNumber(kpi.kabTanpa)}
              unit={`dari ${formatNumber(kpi.kabTotal)}`}
              accentColor="var(--ispu-sangat-tidak)"
              icon={<MapPin size={16} />}
              subtext="titik representatif wilayah"
            />
            <MetricCard
              label="Kelengkapan Data"
              value={formatNumber(kpi.avgCompleteness, 1)}
              unit="%"
              accentColor="var(--color-muted)"
              icon={<Activity size={16} />}
              subtext="rata-rata jaringan"
            />
          </div>

          {/* ── Peta utama ── */}
          <section ref={mapSectionRef} style={{ scrollMarginTop: '1rem' }}>
            <Card className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div className="flex flex-col gap-1.5">
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Warnai kabupaten menurut</span>
                  <SegmentedControl label="Metrik peta" options={METRICS} value={metric} onChange={setMetric} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip active={layers.circles} onClick={() => setLayers((l) => ({ ...l, circles: !l.circles }))}>Lingkaran radius</Chip>
                  <Chip active={layers.stations} onClick={() => setLayers((l) => ({ ...l, stations: !l.stations }))}>Stasiun</Chip>
                  <Chip active={layers.links} onClick={() => setLayers((l) => ({ ...l, links: !l.links }))}>Pasangan redundan</Chip>
                </div>
                <SliderField
                  label="Simulasi tambah stasiun"
                  valueLabel={nAddEff === 0 ? 'Kondisi saat ini' : `+${nAddEff} stasiun`}
                  min={0}
                  max={curveMax}
                  value={nAddEff}
                  onChange={setNAdd}
                  hint={`Cakupan ${formatNumber(curveRows[nAddEff]?.cov_pct, 1)}% pada radius ${curve.data.radius_km} km`}
                />
              </div>
              <p style={{ margin: 0, fontSize: '0.74rem', maxWidth: 'none' }}>
                {METRICS.find((m) => m.id === metric)?.hint}
              </p>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
                <div className="overflow-hidden rounded-card border" style={{ borderColor: 'var(--color-border)' }}>
                  <CoverageMap
                    geo={geo.data}
                    stations={mapStations}
                    redundantPairs={corr.data.redundant_pairs}
                    kabById={kabById}
                    metric={metric}
                    ctx={ctx}
                    pulau={pulau}
                    selected={selected}
                    onSelect={setSelected}
                    showCircles={layers.circles}
                    showStations={layers.stations}
                    showLinks={layers.links}
                    radius={radius}
                    candidates={candidates}
                    candidateRadius={curve.data.radius_km}
                    height="620px"
                  />
                </div>
                <DetailPanel
                  selected={selected}
                  kab={selKab}
                  station={selStation}
                  stationsByKode={stationsByKode}
                  radius={radius}
                  gapScore={selKab ? gapById.get(selKab.kab_id) : null}
                  gapRank={selKab ? rankById.get(selKab.kab_id) : null}
                  onClose={() => setSelected(null)}
                />
              </div>
              <MapLegend metric={metric} ctx={ctx} />
            </Card>
          </section>

          {/* ── 1. Kondisi saat ini ── */}
          <Section title="1. Kondisi saat ini" description="Di mana stasiun berada, dan seberapa jarang dibanding luas wilayahnya?">
            <div className="grid gap-4 xl:grid-cols-2">
              <ChartCard
                title="Kepadatan stasiun per pulau"
                subtitle="Klik batang untuk memfilter halaman ke pulau itu. Garis putus-putus: benchmark relatif (rata-rata nasional), bukan standar resmi."
              >
                <PulauDensityChart rows={regionPulau} benchmark={region.data.benchmark_per_100k_km2} selected={pulau} onSelect={togglePulau} />
              </ChartCard>
              <ChartCard
                title="Luas provinsi dan cakupannya"
                subtitle={`Luas kotak = luas wilayah; warna = persen luas tercakup radius ${radius} km. Kotak besar yang pucat adalah celah terbesar.`}
              >
                <ProvinceTreemap rows={regionProv} radius={radius} />
              </ChartCard>
            </div>

            {blankInScope.length > 0 && (
              <Callout title={`${blankInScope.length} provinsi belum punya stasiun`}>
                {blankInScope.map((r) => r.provinsi).join(', ')}.
                {' '}Provinsi dengan wilayah luas atau berpenduduk besar sebaiknya jadi perhatian pertama.
              </Callout>
            )}

            <ChartCard title="Kecukupan per provinsi" subtitle="Urutkan dengan klik judul kolom. Baris oranye: provinsi tanpa stasiun.">
              <ProvinceTable rows={regionProv} radius={radius} onFocusPulau={togglePulau} />
            </ChartCard>
          </Section>

          {/* ── 2. Keandalan ── */}
          <Section title="2. Seberapa andal data yang ada?" description="Stasiun yang ada hanya berguna bila datanya lengkap dan mewakili berbagai tipe lokasi.">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <ChartCard
                title="Kelengkapan data per stasiun dan bulan"
                subtitle="Persen jam valid dibanding jam seharusnya. Stasiun diurutkan dari yang paling tidak lengkap (bawah)."
              >
                <CompletenessHeatmap heat={stationQ.data.completeness_heatmap} stations={mapStations} />
              </ChartCard>
              <div className="flex flex-col gap-4">
                <ChartCard title="Komposisi tipe lokasi" subtitle="Apakah tepi jalan, industri, dan gambut terwakili?">
                  <SiteTypeChart mix={stationQ.data.site_type_mix} />
                </ChartCard>
              </div>
            </div>
            <ChartCard
              title="Stasiun kritis vs redundan"
              subtitle="Sumbu x: luas wilayah yang hanya dicakup stasiun itu. Sumbu y: seberapa besar error estimasi bila stasiun dihapus (leave-one-out). Kanan-atas = kritis; kiri-bawah = redundan."
            >
              <RoleScatter stations={mapStations} />
            </ChartCard>
          </Section>

          {/* ── 3. Radius & redundansi ── */}
          <Section title="3. Seberapa jauh satu stasiun bisa mewakili?" description="Radius cakupan diturunkan dari data: seberapa cepat kemiripan PM2.5 antar stasiun menurun terhadap jarak.">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <ChartCard title="Peluruhan korelasi terhadap jarak" subtitle="Titik: pasangan stasiun. Garis biru: median per rentang jarak. Garis hijau: radius yang dipakai untuk buffer.">
                <DecayChart corr={corr.data} />
              </ChartCard>
              <div className="flex flex-col gap-3">
                {sum.radius_fit?.used_fallback ? (
                  <Callout title={`Radius ${sum.radius_utama_km} km adalah asumsi`}>
                    Kurva korelasi–jarak tidak cukup jelas (R² {formatNumber(sum.radius_fit?.r2, 2)}), sehingga radius default dipakai.
                    Tampilkan sebagai skenario, bukan temuan.
                  </Callout>
                ) : (
                  <Callout tone="info" title={`Radius ${sum.radius_utama_km} km berasal dari data`}>
                    Korelasi turun ke {corr.data.params?.corr_threshold ?? 0.5} pada jarak ±{formatNumber(sum.radius_fit?.radius_fit_km)} km
                    (R² {formatNumber(sum.radius_fit?.r2, 2)}).
                  </Callout>
                )}
                <Card className="flex flex-col gap-2">
                  <h4 style={{ margin: 0, color: NAVY }}>Pasangan stasiun redundan</h4>
                  <p style={{ margin: 0, fontSize: '0.72rem', maxWidth: 'none' }}>
                    Korelasi ≥ {corr.data.params?.redundant_corr} dan jarak ≤ {corr.data.params?.redundant_dist_km} km. Aktifkan layer
                    “Pasangan redundan” di peta untuk melihatnya.
                  </p>
                  {corr.data.redundant_pairs.length === 0 && <p style={{ margin: 0, fontSize: '0.78rem' }}>Tidak ada pasangan yang memenuhi kriteria.</p>}
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: 190, overflow: 'auto' }}>
                    {corr.data.redundant_pairs.map((p) => (
                      <li key={`${p.a}-${p.b}`} className="flex justify-between" style={{ fontSize: '0.78rem', padding: '0.3rem 0', borderBottom: '1px solid var(--color-border)', color: NAVY }}>
                        <strong>{p.a} ↔ {p.b}</strong>
                        <span>r = {formatNumber(p.corr, 2)} · {formatNumber(p.dist_km)} km</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
            <ChartCard title="Kemiripan antar stasiun" subtitle="Diurutkan menurut klaster (dendrogram). Blok gelap = stasiun yang merekam pola serupa.">
              <CorrelationHeatmap corr={corr.data} />
            </ChartCard>
          </Section>

          {/* ── 4. Rekomendasi ── */}
          <Section title="4. Di mana stasiun baru paling dibutuhkan?" description={`Lima lokasi dipilih berurutan agar tambahan luas daratan tercakup (radius ${recs.data.radius_km} km) sebesar mungkin, dibobot risiko PM2.5.`}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recs.data.greedy.map((r) => <RecommendationCard key={r.kab_id} rec={r} onFocus={focusKab} />)}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <ChartCard
                title="Berapa stasiun tambahan yang efisien?"
                subtitle="Kurva biasanya melandai (diminishing returns): setelah titik tertentu, tiap stasiun baru menambah sedikit. Geser slider di peta untuk melihat posisi."
              >
                <CoverageCurveChart curve={curveRows} nAdd={nAddEff} />
              </ChartCard>

              <ChartCard
                title="Atur bobot gap score"
                subtitle="Ubah prioritas dan lihat ranking serta peta (metrik Gap score) langsung berubah."
                action={
                  weightsChanged && (
                    <button type="button" onClick={() => setWeights(DEFAULT_WEIGHTS)} style={{ fontSize: '0.7rem', fontWeight: 600, border: 0, background: 'transparent', color: 'var(--color-elevated)', cursor: 'pointer' }}>
                      Kembalikan bawaan
                    </button>
                  )
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {GAP_COMPONENTS.map((c) => (
                    <SliderField
                      key={c.key}
                      label={c.label}
                      valueLabel={`${Math.round((weights[c.key] / weightSum) * 100)}%`}
                      min={0}
                      max={1}
                      step={0.05}
                      value={weights[c.key]}
                      onChange={(v) => setWeights((w) => ({ ...w, [c.key]: v }))}
                    />
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: '0.7rem', maxWidth: 'none' }}>
                  Komponen penduduk tidak dimodelkan karena data penduduk tidak tersedia. Faktor sumber polusi hanya proxy dari teks karakter
                  wilayah stasiun terdekat.
                </p>
              </ChartCard>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <ChartCard title={`Ranking kandidat${pulau ? ` · ${pulau}` : ''}`} subtitle="Kabupaten yang jauh dari stasiun, dengan PM2.5 estimasi tinggi dan luas tak terlayani besar.">
                <GapRankTable rows={ranked} onFocus={focusKab} weightsChanged={weightsChanged} />
              </ChartCard>
              <ChartCard title="Apa yang membentuk skornya?" subtitle="Setiap batang menunjukkan kontribusi tiap komponen terhadap gap score.">
                <GapContributionChart rows={ranked} weights={weights} />
              </ChartCard>
            </div>
          </Section>

          {/* ── Metodologi ── */}
          <Section title="Catatan metodologi" description="Asumsi dan keterbatasan analisis halaman ini.">
            <Card>
              <dl style={{ margin: 0, display: 'grid', gap: '0.6rem' }}>
                {Object.entries(sum.metodologi ?? {}).map(([k, v]) => (
                  <div key={k} className="grid gap-1 md:grid-cols-[13rem_1fr]">
                    <dt style={{ fontSize: '0.76rem', fontWeight: 700, color: NAVY }}>{METODOLOGI_LABEL[k] ?? k}</dt>
                    <dd style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                      {typeof v === 'object'
                        ? Object.entries(v).map(([a, b]) => `${a} ${Math.round(b * 100)}%`).join(' · ')
                        : v}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </Section>
        </>
      )}
    </ModuleLayout>
  )
}
