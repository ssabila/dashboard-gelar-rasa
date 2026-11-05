'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Cpu, Layers, MapPin, MapPinned, RotateCcw, Ruler, SlidersHorizontal, Target } from 'lucide-react'
import { ModuleLayout, Section } from '@/components/layout/ModuleLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { LoadingSpinner, ErrorState } from '@/components/ui/LoadingSpinner'
import {
  useCoverageSummary, useCoverageGeo, useCoverageKabupaten, useCoverageRegion,
  useStationQuality, useStationCorrelation, useRecommendations, useCoverageCurve,
} from '@/hooks/useCoverageData'
import { formatNumber } from '@/lib/formatters'
import { DEFAULT_WEIGHTS, GAP_COMPONENTS, METRICS, PULAU_ORDER, buildContext, buildGapMap } from '@/lib/coverage'
import {
  CompletenessHeatmap, CorrelationHeatmap, CoverageCurveChart, DecayChart, GapContributionChart,
  ProvinceTreemap, PulauDensityChart, RoleScatter, SiteTypeChart,
} from './charts'
import {
  Callout, ChartCard, Chip, DetailPanel, GapRankTable, MapLegend, ProvinceTable,
  RecommendationCard, SegmentedControl, SliderField,
} from './panels'

// Leaflet tidak bisa SSR — dynamic import wajib
const CoverageMap = dynamic(
  () => import('@/map/CoverageMap').then((m) => m.CoverageMap),
  { ssr: false, loading: () => <LoadingSpinner label="Memuat peta..." /> }
)

const EMPTY = []
const NAVY = 'var(--color-text-primary)'

/** Mode warna peta yang tampil default; mode lain muncul bila sedang dipilih. */
const MAIN_METRICS = ['jarak', 'cov', 'bivar']

const DETAIL_TABS = [
  { id: 'provinsi',  label: 'Per provinsi',      hint: 'Tabel kecukupan tiap provinsi' },
  { id: 'keandalan', label: 'Keandalan data',    hint: 'Seberapa lengkap dan beragam data stasiun' },
  { id: 'jangkauan', label: 'Jangkauan stasiun', hint: 'Seberapa jauh satu stasiun masih mewakili sekitarnya' },
  { id: 'prioritas', label: 'Skor kebutuhan',    hint: 'Cara skor prioritas dihitung dan diuji' },
  { id: 'metode',    label: 'Metodologi',        hint: 'Asumsi dan keterbatasan' },
]

const METODOLOGI_LABEL = {
  data: 'Data',
  batas_admin: 'Batas administrasi',
  jarak: 'Jarak',
  radius: 'Radius representatif',
  pm25_estimasi: 'Estimasi PM2.5',
  gap_score_bobot: 'Bobot skor kebutuhan',
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
  const [tab, setTab] = useState('provinsi')
  const [radiusOpen, setRadiusOpen] = useState(false)
  const [mapOptsOpen, setMapOptsOpen] = useState(false)
  const mapSectionRef = useRef(null)
  const radiusRef = useRef(null)

  // Tutup popover radius saat klik di luar atau tekan Esc
  useEffect(() => {
    if (!radiusOpen) return
    const onDown = (e) => radiusRef.current && !radiusRef.current.contains(e.target) && setRadiusOpen(false)
    const onKey = (e) => e.key === 'Escape' && setRadiusOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [radiusOpen])

  const all = [summary, geo, kab, region, stationQ, corr, recs, curve]
  const error = all.find((x) => x.error)?.error
  const ready = all.every((x) => x.data)

  const sum = summary.data
  const radii = sum?.radii_km ?? EMPTY
  const radius = radiusState ?? sum?.radius_utama_km ?? null

  /* ── Data turunan (logika tidak berubah) ── */
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
    }
  }, [ready, radius, pulau, stations, regionProv, pulauRow, sum])

  /* ── Handler ── */
  const togglePulau = (name) => setPulau((p) => (p === name ? null : name))
  const scrollToMap = () => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const focusKab = (id) => { setSelected({ type: 'kab', id, fly: true }); scrollToMap() }
  const weightsChanged = GAP_COMPONENTS.some((c) => Math.abs(weights[c.key] - DEFAULT_WEIGHTS[c.key]) > 1e-9)
  const resetAll = () => {
    setPulau(null); setRadius(null); setMetric('jarak'); setNAdd(0)
    setWeights(DEFAULT_WEIGHTS); setSelected(null); setRadiusOpen(false)
    setLayers({ circles: true, stations: true, links: false })
  }

  const radiusIdx = Math.max(0, radii.indexOf(radius))
  const isMainRadius = radius === sum?.radius_utama_km
  const usedFallback = Boolean(sum?.radius_fit?.used_fallback)
  const radiusTag = isMainRadius ? (usedFallback ? ' (asumsi)' : ' (dari data)') : ''
  const weightSum = GAP_COMPONENTS.reduce((s, c) => s + weights[c.key], 0) || 1

  const selKab = selected?.type === 'kab' ? kabById.get(selected.id) : null
  const selStation = selected?.type === 'station' ? stationsByKode.get(selected.id) : null
  const blankInScope = regionProv.filter((r) => r.blank_spot)
  const mapMetrics = METRICS.filter((m) => MAIN_METRICS.includes(m.id) || m.id === metric)

  return (
    <ModuleLayout
      eyebrow="Kecukupan jaringan"
      title="Kecukupan Stasiun"
      description="Apakah 27 stasiun sudah cukup mewakili kondisi udara Indonesia, dan di mana stasiun baru paling dibutuhkan?"
    >
      {error && <ErrorState message={`Data gagal dimuat: ${error}. Pastikan notebook preprocessing sudah dijalankan.`} />}
      {!ready && !error && <Card><LoadingSpinner label="Memuat data kecukupan stasiun..." /></Card>}

      {ready && kpi && ctx && (
        <>
          {/* ═════════ Filter halaman ═════════ */}
          <div className="filter-bar" role="group" aria-label="Filter halaman">
            <Chip active={!pulau} onClick={() => setPulau(null)}>Semua pulau</Chip>
            {regionPulau.map((r) => (
              <Chip key={r.pulau} active={pulau === r.pulau} onClick={() => togglePulau(r.pulau)}>{r.pulau}</Chip>
            ))}
            <span className="filter-spacer" />

            <div ref={radiusRef} className="fpill-wrap">
              <button
                type="button" className={`fpill${radiusOpen ? ' active' : ''}`}
                aria-expanded={radiusOpen} aria-haspopup="dialog" onClick={() => setRadiusOpen((o) => !o)}
              >
                <Ruler size={14} aria-hidden="true" />
                <span>Radius {radius} km{radiusTag}</span>
                <ChevronDown size={12} aria-hidden="true" />
              </button>
              <div className={`fpill-menu${radiusOpen ? ' open' : ''}`} style={{ left: 'auto', right: 0, minWidth: '21rem' }} role="dialog" aria-label="Radius representatif">
                <SliderField
                  label="Radius representatif stasiun"
                  valueLabel={`${radius} km${radiusTag}`}
                  min={0} max={Math.max(0, radii.length - 1)} value={radiusIdx}
                  onChange={(i) => setRadius(radii[i])}
                  ticks={radii.map((r) => `${r}`)}
                />
                <p className="card-sub">
                  Radius = seberapa jauh satu stasiun dianggap masih mewakili wilayah sekitarnya.
                  {isMainRadius && usedFallback && ' Angka bawaan ini asumsi, bukan temuan data.'}
                </p>
              </div>
            </div>

            <button type="button" className="fpill-reset" onClick={resetAll}>
              <RotateCcw size={13} aria-hidden="true" /> Reset
            </button>
          </div>

          {/* ═════════ LAPIS 1 — Cukupkah? ═════════ */}
          <Card variant="dark">
            <h2 className="headline">
              {kpi.nStasiun} stasiun hanya mencakup <strong>{formatNumber(kpi.cov, 1)}%</strong> luas daratan{' '}
              {pulau ? `wilayah ${pulau}` : 'Indonesia'}
              {kpi.provTotal - kpi.provCovered > 0
                ? <>, dan <strong>{kpi.provTotal - kpi.provCovered} dari {kpi.provTotal} provinsi</strong> belum punya stasiun.</>
                : '. Semua provinsi sudah punya stasiun.'}
            </h2>
            <p className="headline-sub">
              Dihitung dengan radius {radius} km{isMainRadius ? (usedFallback ? ' — ini asumsi, bukan temuan data' : ' — diturunkan dari data') : ' — skenario pilihanmu'}.
              Jarak, cakupan, dan estimasi PM2.5 bersifat tetap; tidak bergantung pada periode waktu.
            </p>
          </Card>

          <div className="kpi-grid kpi-grid--4">
            <MetricCard
              variant="hero" label="Luas daratan tercakup" value={formatNumber(kpi.cov, 1)} unit="%"
              subtext={`radius ${radius} km`} icon={<Target size={18} />}
            />
            <MetricCard
              label="Stasiun aktif" value={kpi.active} unit={`dari ${kpi.nStasiun}`}
              subtext={pulau ?? 'Seluruh Indonesia'} accentColor="var(--ispu-baik)" icon={<Cpu size={18} />}
            />
            <MetricCard
              label="Provinsi tercakup" value={kpi.provCovered} unit={`dari ${kpi.provTotal}`}
              subtext={`${kpi.provTotal - kpi.provCovered} provinsi tanpa stasiun`}
              accentColor="var(--color-elevated)" icon={<MapPinned size={18} />}
            />
            <MetricCard
              label="Jarak median ke stasiun" value={formatNumber(kpi.medianJarak)} unit="km"
              subtext="dari kabupaten ke stasiun terdekat" accentColor="var(--ispu-tidak-sehat)" icon={<Ruler size={18} />}
            />
          </div>

          <section ref={mapSectionRef} style={{ scrollMarginTop: '5rem' }}>
            <Card>
              <CardHeader
                title="Peta kecukupan jaringan"
                subtitle={METRICS.find((m) => m.id === metric)?.hint}
                action={
                  <button type="button" className="btn" aria-expanded={mapOptsOpen} onClick={() => setMapOptsOpen((o) => !o)}>
                    <Layers size={14} aria-hidden="true" /> Opsi peta
                  </button>
                }
              />
              <div className="stack">
                <div className="map-toolbar">
                  <div className="stack-sm">
                    <span className="field-label">Warnai kabupaten menurut</span>
                    <SegmentedControl label="Mode warna peta" options={mapMetrics} value={metric} onChange={setMetric} />
                  </div>
                  {nAddEff > 0 && (
                    <span className="count-pill">Simulasi: +{nAddEff} stasiun baru (pin bernomor)</span>
                  )}
                </div>

                {mapOptsOpen && (
                  <div className="row-wrap" role="group" aria-label="Layer peta">
                    <Chip active={layers.circles} onClick={() => setLayers((l) => ({ ...l, circles: !l.circles }))}>Lingkaran radius</Chip>
                    <Chip active={layers.stations} onClick={() => setLayers((l) => ({ ...l, stations: !l.stations }))}>Stasiun</Chip>
                    <Chip active={layers.links} onClick={() => setLayers((l) => ({ ...l, links: !l.links }))}>Pasangan stasiun kembar</Chip>
                  </div>
                )}

                <div className="layout-map">
                  <div className="map-frame">
                    <CoverageMap
                      geo={geo.data} stations={mapStations} redundantPairs={corr.data.redundant_pairs}
                      kabById={kabById} metric={metric} ctx={ctx} pulau={pulau}
                      selected={selected} onSelect={setSelected}
                      showCircles={layers.circles} showStations={layers.stations} showLinks={layers.links}
                      radius={radius} candidates={candidates} candidateRadius={curve.data.radius_km}
                      height="560px"
                    />
                  </div>
                  <DetailPanel
                    selected={selected} kab={selKab} station={selStation} stationsByKode={stationsByKode}
                    radius={radius} gapScore={selKab ? gapById.get(selKab.kab_id) : null}
                    gapRank={selKab ? rankById.get(selKab.kab_id) : null} onClose={() => setSelected(null)}
                  />
                </div>
                <MapLegend metric={metric} ctx={ctx} />
              </div>
            </Card>
          </section>

          <div className="layout-2">
            <ChartCard
              title="Kepadatan stasiun per pulau"
              subtitle="Klik batang untuk memfilter halaman ke satu pulau. Garis putus-putus = rata-rata nasional (pembanding relatif, bukan standar resmi)."
            >
              <PulauDensityChart rows={regionPulau} benchmark={region.data.benchmark_per_100k_km2} selected={pulau} onSelect={togglePulau} />
            </ChartCard>
            <ChartCard
              title="Luas provinsi dan seberapa besar yang tercakup"
              subtitle={`Luas kotak = luas wilayah; warna = persen luas tercakup radius ${radius} km. Kotak besar yang pucat adalah celah terbesar.`}
            >
              <ProvinceTreemap rows={regionProv} radius={radius} />
            </ChartCard>
          </div>

          {blankInScope.length > 0 && (
            <Callout title={`${blankInScope.length} provinsi belum punya stasiun`}>
              {blankInScope.map((r) => r.provinsi).join(', ')}.
              {' '}Provinsi yang luas atau berpenduduk besar sebaiknya jadi perhatian pertama.
            </Callout>
          )}

          {/* ═════════ LAPIS 2 — Di mana stasiun baru dibutuhkan? ═════════ */}
          <Section
            title="Di mana stasiun baru paling dibutuhkan?"
            description={`Lima lokasi dipilih berurutan agar tambahan luas daratan yang tercakup (radius ${recs.data.radius_km} km) sebesar mungkin, dengan memperhitungkan risiko PM2.5.`}
          >
            <div className="layout-auto">
              {recs.data.greedy.map((r) => <RecommendationCard key={r.kab_id} rec={r} onFocus={focusKab} />)}
            </div>

            <ChartCard
              title="Berapa stasiun tambahan yang efisien?"
              subtitle="Kurva biasanya melandai: setelah titik tertentu, tiap stasiun baru menambah sedikit cakupan. Geser slider untuk memunculkan lokasinya sebagai pin bernomor di peta."
              action={<button type="button" className="btn" onClick={scrollToMap}>Lihat di peta</button>}
            >
              <SliderField
                label="Simulasi tambah stasiun"
                valueLabel={nAddEff === 0 ? 'Kondisi saat ini' : `+${nAddEff} stasiun`}
                min={0} max={curveMax} value={nAddEff} onChange={setNAdd}
                hint={`Cakupan ${formatNumber(curveRows[nAddEff]?.cov_pct, 1)}% pada radius ${curve.data.radius_km} km`}
              />
              <CoverageCurveChart curve={curveRows} nAdd={nAddEff} />
            </ChartCard>
          </Section>

          {/* ═════════ LAPIS 3 — Detail analisis (tab) ═════════ */}
          <Section
            title="Detail analisis"
            description="Bukti pendukung kesimpulan di atas. Buka sesuai kebutuhan."
          >
            <div className="tabs-wrap">
              <SegmentedControl label="Detail analisis" options={DETAIL_TABS} value={tab} onChange={setTab} />
            </div>

            {tab === 'provinsi' && (
              <ChartCard title="Kecukupan tiap provinsi" subtitle="Urutkan dengan klik judul kolom. Baris oranye = provinsi tanpa stasiun.">
                <ProvinceTable rows={regionProv} radius={radius} onFocusPulau={togglePulau} />
              </ChartCard>
            )}

            {tab === 'keandalan' && (
              <div className="stack">
                <Callout tone="info" title={`Rata-rata kelengkapan data jaringan: ${formatNumber(kpi.avgCompleteness, 1)}%`}>
                  Stasiun hanya berguna bila datanya lengkap dan mewakili berbagai tipe lokasi.
                </Callout>
                <div className="layout-wide-side">
                  <ChartCard
                    title="Seberapa lengkap data tiap stasiun?"
                    subtitle="Persen jam valid dibanding jam seharusnya, per bulan. Stasiun paling tidak lengkap ada di bawah."
                  >
                    <CompletenessHeatmap heat={stationQ.data.completeness_heatmap} stations={mapStations} />
                  </ChartCard>
                  <ChartCard title="Tipe lokasi apa saja yang terwakili?" subtitle="Apakah tepi jalan, industri, dan gambut ada yang memantau?">
                    <SiteTypeChart mix={stationQ.data.site_type_mix} />
                  </ChartCard>
                </div>
                <ChartCard
                  title="Stasiun mana yang tak tergantikan?"
                  subtitle="Kanan-atas: bila stasiun ini mati, banyak wilayah kehilangan pantauan dan estimasi meleset jauh (kritis). Kiri-bawah: datanya bisa digantikan stasiun lain (redundan)."
                >
                  <RoleScatter stations={mapStations} />
                </ChartCard>
              </div>
            )}

            {tab === 'jangkauan' && (
              <div className="stack">
                <div className="layout-wide-side">
                  <ChartCard
                    title="Seberapa jauh satu stasiun masih mewakili sekitarnya?"
                    subtitle="Titik = pasangan stasiun. Garis biru = median per rentang jarak. Garis hijau = radius yang dipakai untuk lingkaran di peta."
                  >
                    <DecayChart corr={corr.data} />
                  </ChartCard>
                  <div className="stack">
                    {usedFallback ? (
                      <Callout title={`Radius ${sum.radius_utama_km} km adalah asumsi`}>
                        Kurva korelasi–jarak tidak cukup jelas (R² {formatNumber(sum.radius_fit?.r2, 2)}), sehingga radius bawaan dipakai.
                        Perlakukan sebagai skenario, bukan temuan.
                      </Callout>
                    ) : (
                      <Callout tone="info" title={`Radius ${sum.radius_utama_km} km berasal dari data`}>
                        Kemiripan data turun hingga {corr.data.params?.corr_threshold ?? 0.5} pada jarak ±{formatNumber(sum.radius_fit?.radius_fit_km)} km
                        (R² {formatNumber(sum.radius_fit?.r2, 2)}).
                      </Callout>
                    )}
                    <Card className="stack-sm">
                      <h4 style={{ color: NAVY }}>Pasangan stasiun yang saling meniru</h4>
                      <p className="card-sub">
                        Kemiripan ≥ {corr.data.params?.redundant_corr} dan jarak ≤ {corr.data.params?.redundant_dist_km} km.
                        Aktifkan “Pasangan stasiun kembar” di Opsi peta untuk melihatnya.
                      </p>
                      {corr.data.redundant_pairs.length === 0 && <p className="empty">Tidak ada pasangan yang memenuhi kriteria.</p>}
                      <ul className="pair-list">
                        {corr.data.redundant_pairs.map((p) => (
                          <li key={`${p.a}-${p.b}`}>
                            <strong>{p.a} ↔ {p.b}</strong>
                            <span>r = {formatNumber(p.corr, 2)} · {formatNumber(p.dist_km)} km</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                </div>
                <ChartCard title="Stasiun mana yang merekam pola serupa?" subtitle="Diurutkan menurut klaster. Blok gelap = stasiun dengan pola PM2.5 yang mirip.">
                  <CorrelationHeatmap corr={corr.data} />
                </ChartCard>
              </div>
            )}

            {tab === 'prioritas' && (
              <div className="stack">
                <ChartCard
                  title="Atur prioritas skor kebutuhan"
                  subtitle="Ubah bobot, lalu lihat ranking di bawah berubah langsung. Kolom Stabilitas hanya berlaku untuk bobot bawaan."
                  action={
                    <div className="row-wrap">
                      <button type="button" className="btn" onClick={() => { setMetric('gap'); setMapOptsOpen(false); scrollToMap() }}>
                        Warnai peta dengan skor ini
                      </button>
                      {weightsChanged && <button type="button" className="btn" onClick={() => setWeights(DEFAULT_WEIGHTS)}>Kembalikan bawaan</button>}
                    </div>
                  }
                >
                  <div className="layout-2">
                    {GAP_COMPONENTS.map((c) => (
                      <SliderField
                        key={c.key} label={c.label}
                        valueLabel={`${Math.round((weights[c.key] / weightSum) * 100)}%`}
                        min={0} max={1} step={0.05} value={weights[c.key]}
                        onChange={(v) => setWeights((w) => ({ ...w, [c.key]: v }))}
                      />
                    ))}
                  </div>
                  <p className="card-sub">
                    Komponen penduduk tidak dimodelkan karena data penduduk tidak tersedia. Faktor sumber polusi hanya proxy dari teks karakter wilayah stasiun terdekat.
                  </p>
                </ChartCard>
                <div className="layout-2">
                  <ChartCard
                    title={`Kabupaten dengan kebutuhan tertinggi${pulau ? ` · ${pulau}` : ''}`}
                    subtitle="Jauh dari stasiun, PM2.5 estimasi tinggi, dan luas wilayah tak terlayani besar."
                  >
                    <GapRankTable rows={ranked} onFocus={focusKab} weightsChanged={weightsChanged} />
                  </ChartCard>
                  <ChartCard title="Apa yang membentuk skornya?" subtitle="Tiap batang menunjukkan kontribusi komponen terhadap skor kebutuhan.">
                    <GapContributionChart rows={ranked} weights={weights} />
                  </ChartCard>
                </div>
              </div>
            )}

            {tab === 'metode' && (
              <Card>
                <dl className="def-list">
                  {Object.entries(sum.metodologi ?? {}).map(([k, v]) => (
                    <div key={k}>
                      <dt>{METODOLOGI_LABEL[k] ?? k}</dt>
                      <dd>
                        {typeof v === 'object'
                          ? Object.entries(v).map(([a, b]) => `${a} ${Math.round(b * 100)}%`).join(' · ')
                          : v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}
          </Section>
        </>
      )}
    </ModuleLayout>
  )
}
