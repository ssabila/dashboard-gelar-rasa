# PRD Dashboard Kualitas Udara & Kesehatan — DA Gelar Rasa 2026

> **Versi 2 — diperbarui 5 November 2026.** Menggantikan versi awal. Perubahan utama: aturan lomba disamakan dengan handbook, daftar halaman disamakan dengan navigasi aplikasi (6 menu), desain disamakan dengan implementasi saat ini, stack teknologi dikoreksi (JavaScript, Tailwind v4), dan angka baku mutu dikoreksi sesuai PP No. 22/2021. Hal yang belum diputuskan dicatat di bagian [Keputusan Terbuka](#13-keputusan-terbuka).

---

## 1. Overview & Tujuan Proyek

Dashboard ini menyajikan analisis kualitas udara dan dampak kesehatan dari 27 stasiun AQMS di lima pulau besar Indonesia sebagai deliverable kompetisi Dashboard Analysis Gelar Rasa 2026.

**Tema:** *From Roots to Clarity, Revealing Meaningful Insight Through Data*

**Tujuan analitis** (mengikuti Booklet Case Study):

1. Mengkaji kondisi kualitas udara lintas ruang dan waktu terhadap baku mutu PP No. 22/2021 dan kategori ISPU (Permen LHK No. 14/2020).
2. Mengidentifikasi waktu dan wilayah paling kritis: pola jam, hari kerja vs akhir pekan, musim, termasuk episode kabut asap gambut.
3. Menganalisis faktor yang memengaruhi variasi polutan: suhu, kelembapan, angin, lalu lintas, jarak ke jalan, dan tipe lokasi.
4. Mengevaluasi dampak PM2.5 terhadap kesehatan, khususnya balita dan lansia, termasuk efek jeda (lag).
5. Menilai kecukupan jaringan pemantauan dan merekomendasikan lokasi tambahan.
6. Menyajikan hasil sebagai dashboard interaktif yang bercerita (storytelling) dan mendukung keputusan.

## 2. Aturan Lomba yang Mengikat

| Hal | Ketentuan (sumber: Handbook Preliminary Round) |
|---|---|
| Waktu pengerjaan | 31 Oktober 2026 – 14 November 2026 |
| Batas pengumpulan | **14 November 2026 pukul 23.59 WIB**, lewat tautan resmi yang diumumkan panitia; terlambat = diskualifikasi |
| Yang dikumpulkan | (1) Link dashboard — `DA2026_Dashboard_NamaTim_NamaKetua`; (2) Laporan analisis PDF — `DA2026_Laporan_NamaTim_NamaKetua.pdf` mengikuti template panitia |
| Dataset | **Hanya dataset dari panitia.** Dilarang memakai dataset lain (lihat risiko R2) |
| Logo | Logo Gelar Rasa **wajib** tampil di dashboard |
| Tools | Bebas, tanpa batasan library |
| Link | Harus dapat dibuka tanpa login; panitia tidak bertanggung jawab atas link terkunci |
| Seleksi | 5 tim nilai tertinggi lolos final dan wajib membuat PPT presentasi |

### Rubrik penilaian dan pemetaannya ke produk

| Aspek | Poin | Bagaimana dashboard memenuhinya |
|---|---|---|
| Kualitas informasi — kedalaman insight | 15 | Setiap halaman membuka dengan satu kesimpulan; halaman Insight merangkum temuan → implikasi → rekomendasi |
| Kualitas informasi — relevan & konsisten | 10 | Satu sumber angka (`lib/`, JSON hasil preprocessing); metrik yang sama bernilai sama di semua halaman |
| Visualisasi — mudah dipahami | 10 | Satu pertanyaan per grafik; judul berupa kesimpulan; garis referensi baku mutu selalu tampil |
| Visualisasi — menarik secara visual | 5 | Sistem desain di bagian 7 |
| Visualisasi — konsisten warna, font, layout | 5 | Token di `globals.css`; komponen bersama |
| Fungsionalitas — mudah digunakan, navigasi intuitif | 15 | Sidebar 6 menu, filter global terlihat di atas, tombol reset, progressive disclosure |
| Fungsionalitas — fitur interaktif | 10 | Filter periode/wilayah, klik peta, hover tooltip, simulasi (slider), tab detail |
| Laporan — analisis & insight | 10 | Kesimpulan sesuai data; batasan dijelaskan |
| Laporan — preprocessing & EDA | 10 | Log preprocessing terdokumentasi (bagian 9) |
| Laporan — struktur & kerapian | 10 | Template panitia; angka konsisten dengan dashboard |

**Batasan proyek:** dataset sintetis, tidak untuk publikasi ilmiah. Data AQMS Jan 2024 – 14 Okt 2026; data kesehatan Des 2023 – Okt 2026.

## 3. Pengguna & User Stories

| Pengguna | Konteks | Kebutuhan utama |
|---|---|---|
| Juri (analis data) | Menilai analisis, storytelling, desain, fungsionalitas | Narasi kuat, insight bernilai, visual bersih, tidak perlu menebak cara pakai |
| Pengambil keputusan kebijakan (sekunder) | Memantau kualitas udara dan dampak kesehatan | Filter lokasi/waktu, indikator peringatan, rekomendasi konkret |

**User stories**

- Sebagai juri, saya ingin melihat perbandingan antar stasiun dan antar pulau sekilas, agar bisa menilai pemahaman data spasial.
- Sebagai juri, saya ingin melihat pola waktu (jam, mingguan, musiman) beserta narasinya, agar bisa menilai storytelling.
- Sebagai juri, saya ingin melihat hubungan polutan dengan kesehatan beserta analisis lag, agar bisa menilai kedalaman analisis.
- Sebagai juri, saya ingin kesimpulan halaman terlihat tanpa menggulir jauh, dan detail teknis bisa dibuka bila saya ingin memeriksa.
- Sebagai pengambil keputusan, saya ingin memfilter wilayah dan periode agar fokus pada area kebijakan saya.
- Sebagai pengambil keputusan, saya ingin melihat lokasi prioritas penambahan stasiun beserta alasannya.

## 4. Pembagian Modul & Status

| Rute | Menu | Pertanyaan yang dijawab | Pemilik | Status |
|---|---|---|---|---|
| `/overview` | Overview | Di mana dan seberapa buruk kondisi udara Indonesia? | Dev 1 | UI selesai; filter periode belum memengaruhi angka (butuh data bulanan) |
| `/kualitas-udara` | Kualitas Udara | Kapan dan di mana pencemaran paling kritis? | Dev 2 | Dikerjakan developer lain |
| `/korelasi` | Korelasi Polutan | Faktor apa yang paling memengaruhi polutan? | Dev 3 | Dikerjakan developer lain |
| `/pm25-kesehatan` | PM2.5 & Kesehatan | Bagaimana PM2.5 berhubungan dengan kasus kesehatan, termasuk efek jeda? | Dev 3 | Dikerjakan developer lain |
| `/kecukupan-stasiun` | Kecukupan Stasiun | Cukupkah 27 stasiun, dan di mana stasiun baru paling dibutuhkan? | Dev 1 | UI tiga lapis selesai; bergantung pada hasil notebook preprocessing |
| `/insight` | Insight & Rekomendasi | Apa temuan utama dan apa yang sebaiknya dilakukan? | Dev 1 | Belum dikerjakan |

> Catatan: PRD awal menyebut "4 halaman utama" tetapi mendaftar 5 halaman dan 1 modul tambahan. Versi ini mengikuti navigasi aplikasi yang sebenarnya: **6 halaman**.

## 5. Fitur per Halaman

### 5.1 Overview (`/overview`)

Susunan dari atas ke bawah:

1. **Header** — judul, pertanyaan halaman, dan chip cakupan data (Jan 2024 – Okt 2026).
2. **Filter global** (menempel di atas saat menggulir) — periode (preset + tanggal bebas dengan tombol Terapkan/Batal), wilayah, polutan, tombol Reset. Kontrol periode pembanding dan granularitas waktu hanya ditampilkan bila sudah terhubung ke data.
3. **6 KPI** — rata-rata PM2.5 nasional (kartu *hero* dengan kategori ISPU dan rasio terhadap pedoman WHO), stasiun aktif, stasiun melebihi baku mutu, rawat inap pernapasan, total kematian, PM2.5 stasiun tertinggi.
4. **Peta interaktif Leaflet** — 27 stasiun diwarnai kategori ISPU; klik titik membuka popup detail; legenda ISPU.
5. **Panel samping** — peringkat 6 stasiun PM2.5 tertinggi dengan penanda baku mutu; donut sebaran kategori ISPU.
6. **Temuan singkat** — 3 kartu otomatis dari data, masing-masing menaut ke halaman analisis terkait.

KPI kesehatan menampilkan seluruh rumah sakit rujukan dan belum mengikuti filter wilayah; ini tertulis di subteks kartu.

### 5.2 Kualitas Udara (`/kualitas-udara`) — developer lain

Perbandingan rata-rata PM2.5 antar stasiun dan pulau terhadap baku mutu; tren bulanan, mingguan, dan pola diurnal; deteksi episode kabut asap pada musim kemarau; filter wilayah, periode, tipe stasiun, polutan.

### 5.3 Korelasi Polutan (`/korelasi`) — developer lain

Korelasi polutan dengan suhu, kelembapan, dan angin; perbandingan PM2.5 menurut tipe stasiun; scatter traffic intensity vs PM2.5 dan distance to road vs PM2.5.

### 5.4 PM2.5 & Kesehatan (`/pm25-kesehatan`) — developer lain

Tren ISPA balita dan lansia bersama PM2.5; korelasi PM2.5 lag-0 sampai lag-3 dengan rawat inap; perbandingan kerentanan balita vs lansia per wilayah; heatmap kasus hari-dalam-seminggu × bulan.

### 5.5 Kecukupan Stasiun (`/kecukupan-stasiun`)

Disusun dalam **tiga lapis** agar kesimpulan terlihat dahulu dan detail bisa ditelusuri:

**Lapis 1 — Cukupkah?** (selalu terlihat)
- Filter pulau dan radius representatif (radius ditandai *asumsi* atau *dari data*).
- Kalimat kesimpulan dinamis, mis. "27 stasiun hanya mencakup X% luas daratan Indonesia, dan N dari M provinsi belum punya stasiun."
- 4 KPI: luas daratan tercakup (hero), stasiun aktif, provinsi tercakup, jarak median ke stasiun.
- Peta kecukupan dengan 3 mode warna utama (Jarak, Cakupan, PM2.5 × Jarak); layer peta di tombol "Opsi peta"; panel detail kabupaten/stasiun.
- Grafik kepadatan stasiun per pulau dan treemap luas provinsi × cakupan; callout provinsi blank spot.

**Lapis 2 — Di mana stasiun baru paling dibutuhkan?** (selalu terlihat)
- 5 kartu rekomendasi lokasi prioritas beserta justifikasi.
- Kurva diminishing returns dengan slider simulasi tambah stasiun (pin bernomor muncul di peta).

**Lapis 3 — Detail analisis** (tab; hanya tab aktif yang dirender)
- *Per provinsi:* tabel kecukupan dapat diurutkan.
- *Keandalan data:* heatmap kelengkapan, komposisi tipe lokasi, peran kritis vs redundan.
- *Jangkauan stasiun:* peluruhan korelasi terhadap jarak, pasangan stasiun kembar, heatmap kemiripan.
- *Skor kebutuhan:* slider bobot, tabel ranking, kontribusi komponen.
- *Metodologi:* asumsi dan keterbatasan.

### 5.6 Insight & Rekomendasi (`/insight`) — belum dikerjakan

- **Kesimpulan utama** satu paragraf di bagian atas.
- **5–7 temuan kunci** berupa kartu dengan grafik mini pendukung; setiap kartu menaut ke halaman sumbernya.
- **Tabel ringkasan:** temuan → implikasi → rekomendasi → prioritas.
- **Batasan metodologi:** data sintetis, korelasi bukan kausalitas, asumsi radius dan bobot.
- Semua angka diambil dari sumber yang sama dengan halaman lain (tidak diketik manual).

## 6. Interaktivitas Minimum

- [x] Filter wilayah (Overview, Kecukupan Stasiun)
- [ ] Filter periode yang benar-benar mengubah KPI dan peta (UI ada; menunggu data bulanan)
- [ ] Filter polutan
- [ ] Filter global yang tetap saat berpindah halaman (rencana: simpan di URL)
- [x] Klik peta → popup/panel detail
- [x] Hover grafik → tooltip dengan nilai dan konteks
- [ ] Toggle tampil/sembunyi seri pada grafik multi-garis (halaman Dev 2/3)
- [x] Tombol reset filter
- [x] Navigasi antar halaman lewat sidebar
- [x] Kontrol simulasi dan what-if (slider radius, tambah stasiun, bobot skor)

## 7. Desain & UX

### Prinsip

- **Storytelling first:** setiap halaman punya satu pertanyaan dan satu kesimpulan di bagian atas. Judul grafik berupa kesimpulan ("13 provinsi belum punya stasiun"), bukan deskripsi ("Grafik provinsi").
- **Konteks selalu hadir:** angka polutan selalu bersama garis referensi baku mutu dan pedoman WHO.
- **Progressive disclosure:** KPI → visual agregat → detail yang dilipat (tab). Juri melihat insight utama tanpa menggulir jauh.
- **Bahasa awam:** istilah teknis ditaruh di tooltip atau subjudul, bukan di judul. Contoh: "skor kebutuhan", bukan "gap score"; "stasiun mana yang tak tergantikan", bukan "leave-one-out".
- **Jujur terhadap asumsi:** nilai yang berupa asumsi diberi label jelas (mis. radius bawaan).
- **Fokus ke visualisasi:** navigasi menyatu dengan latar; hanya kartu yang menonjol.

### Palet dan token

Sumber tunggal: `src/app/globals.css`. Dilarang menulis hex baru di halaman modul.

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-bg` | `#F4F7FB` | Kanvas halaman dan sidebar (menyatu) |
| (kartu) | `#FFFFFF` | Permukaan kartu |
| `--color-surface` | `#18314F` (Deep Space Blue) | Teks utama, kartu *hero*, tombol utama |
| `--color-elevated` | `#384E77` (Dusk Blue) | Aksen sekunder, fokus, chip aktif |
| `--color-muted` | `#8BBEB2` (Muted Teal) | Grafik, garis, aksen netral |
| `--color-accent` | `#E6F9AF` (Lime Cream) | Angka pada kartu gelap dan logo; **bukan** teks di latar putih |
| `--color-nav` | `#0D0630` (Dark Amethyst) | Menu aktif/hover, logo |
| `--color-text-secondary` | `#55706E` | Teks sekunder |

### Warna ISPU (kategori PM2.5)

| Kategori | Rentang ISPU | Hex |
|---|---|---|
| Baik | 0–50 | `#4ADE80` |
| Sedang | 51–100 | `#FACC15` |
| Tidak Sehat | 101–200 | `#FB923C` |
| Sangat Tidak Sehat | 201–300 | `#F87171` |
| Berbahaya | ≥ 301 | `#C026D3` |

Teks pada badge otomatis digelapkan agar terbaca di latar putih. Lihat keputusan terbuka K2 mengenai kesesuaian warna dengan ketentuan ISPU.

### Tipografi, ikon, bentuk

- **Font:** Plus Jakarta Sans untuk judul dan isi. **Ikon:** Lucide React.
- **Skala:** judul halaman 1.5–1.95 rem/800; judul kartu 0.95 rem/700; isi 0.75–0.9 rem; angka KPI 1.55–2 rem/800 dengan angka tabular.
- **Radius kartu** 1 rem; kontrol berbentuk pil; bayangan lembut; **tanpa animasi hover pada kartu**.

### Jenis komponen

| Komponen | Fungsi |
|---|---|
| `Card` (default, flush, tint, dark) + `CardHeader` | Wadah dasar semua panel |
| `MetricCard` (default, hero) | KPI: label, ikon, nilai, satuan, badge, subteks |
| `FilterBar` | Filter global bergaya pil dengan popover |
| `IspuLegend`, `Badge`, `IspuBadge` | Legenda dan kategori |
| `EChart` | Pembungkus Apache ECharts |
| `Callout`, `SegmentedControl`, `Chip`, `SliderField`, `ChartCard` | Pola lokal halaman Kecukupan Stasiun |

### Navigasi dan layout

- Sidebar kiri 6 menu (ikon + label), **menyatu dengan latar**; menu aktif berupa pil putih dengan teks Dark Amethyst; hover berupa latar amethyst tipis. Pada layar sempit menjadi bilah atas.
- Pola halaman: header → filter → KPI kecil → konten utama (grid) → temuan/detail.
- **Logo Gelar Rasa wajib tampil**, di kanan atas sesuai spesifikasi awal (berkas di `ASSETS/`, dapat diunduh dari tautan panitia). **Status: belum terpasang.**
- Kelas layout bersama di `globals.css` (`layout-main`, `layout-2`, `layout-3`, `layout-map`, `kpi-grid`). Gunakan kelas ini agar tampilan tidak bergantung pada utilitas Tailwind.

### Aksesibilitas dan responsivitas

- Fokus keyboard terlihat; popover dapat ditutup dengan Esc dan klik di luar; kontrol memiliki label ARIA.
- Warna tidak menjadi satu-satunya pembawa makna (ada label dan angka).
- Uji pada **1366×768** (laptop juri) dan resolusi proyektor, serta layar sempit.

## 8. Teknologi

| Lapisan | Pilihan |
|---|---|
| Framework | Next.js 16 (App Router) |
| Bahasa | **JavaScript** (bukan TypeScript; PRD awal keliru menyebut `.ts`) |
| Styling | **Tailwind CSS v4** + CSS kustom. Wajib ada `postcss.config.mjs` berisi plugin `@tailwindcss/postcss`; token dan radius dideklarasikan di `globals.css` (`@theme`), **tidak** memakai `tailwind.config` |
| Visualisasi | Apache ECharts |
| Peta | Leaflet + tile OpenStreetMap resmi (tanpa API key) |
| Ikon | Lucide React |
| Data | JSON statis di `public/data/` hasil preprocessing Python; diambil lewat hook dengan cache modul |
| Preprocessing | Python ≥ 3.10 (pandas, pyarrow, dsb.) |
| Deploy | Vercel (rencana); wajib diuji tanpa login |

### Struktur repositori (aktual)

```
gelar-rasa-2026/
├── public/data/
│   ├── aqms/                      # dataset ringkas Overview dan Kecukupan Stasiun
│   └── health/                    # summary, by_hospital
├── scripts/preprocess.py          # + notebook preprocessing kecukupan stasiun
├── src/
│   ├── app/
│   │   ├── layout.jsx, page.jsx (redirect ke /overview), globals.css
│   │   ├── overview/              # page.jsx, panels.jsx
│   │   ├── kualitas-udara/        # Dev 2
│   │   ├── korelasi/              # Dev 3
│   │   ├── pm25-kesehatan/        # Dev 3
│   │   ├── kecukupan-stasiun/     # page.jsx, charts.jsx, panels.jsx
│   │   └── insight/
│   ├── components/
│   │   ├── layout/                # Navbar, ModuleLayout (+ Section)
│   │   ├── ui/                    # Card, MetricCard, Badge, LoadingSpinner (+ ErrorState)
│   │   ├── shared/                # FilterBar, IspuLegend
│   │   └── charts/                # EChart
│   ├── map/                       # StationMap, CoverageMap
│   ├── hooks/                     # useFilter, useAqmsData, useHealthData, useKecukupanData
│   └── lib/                       # constants, formatters, coverage
├── postcss.config.mjs
├── next.config.mjs, jsconfig.json, .eslintrc.json, .prettierrc
├── README.md
└── PRD.md
```

Alias `@/*` menunjuk ke `src/*`. Aturan praktis: `components` mengatur tampilan, `hooks` mengatur fetch/state, `lib` mengatur aturan domain dan format tanpa React. Wrapper ECharts di `kecukupan-stasiun/` masih duplikat dengan `components/charts/EChart.jsx` dan perlu digabung.

## 9. Spesifikasi Data & Preprocessing

### Sumber data (dari panitia)

| Berkas | Isi |
|---|---|
| `[KODE]_[Lokasi]_AQMS.csv` (×27) | Pengukuran polutan dan cuaca per jam per stasiun |
| `HLT-01_health_outcomes_daily.csv` | Kasus kesehatan harian per rumah sakit |
| `sites.csv`, `sensors.csv`, `hospitals.csv` | Master lokasi, sensor, rumah sakit |
| `metadata_sensors.csv`, `metadata_dates.csv` | Spesifikasi instrumen; periode dan resolusi observasi |

Jumlah baris final dan jumlah yang dibuang **dicatat dari log preprocessing** (PRD awal mencantumkan dua angka berbeda: 667.981 dan 594.167). Lihat K4.

### Aturan preprocessing yang harus terdokumentasi (nilai di laporan: 10 poin)

1. Penyaringan `qc_flag` (hanya `VALID`; catat jumlah yang dibuang per alasan).
2. Penyeragaman satuan: `metadata_sensors.csv` menyebut sebagian logger mengekspor **ppm**; konversi ke µg/m³ dan catat stasiun/kolom yang terdampak.
3. Penanganan nilai hilang, duplikat, dan nilai di luar rentang wajar.
4. Konsistensi zona waktu (WIB) dan pembentukan agregat harian/bulanan.
5. Penggabungan data kesehatan dengan stasiun lewat pasangan sensor–rumah sakit (`SENS-0XX` ↔ `RS-XXX-XX`).
6. Perhitungan kelengkapan data per stasiun dan bulan.

### Kontrak JSON (jangan ubah struktur tanpa memperbarui hook)

Overview memakai `aqms/station_master.json`, `station_pollutant_summary.json`, `overview_summary.json`, `network_summary.json`, `station_distribution.json`, `operational_readiness.json`, `nearest_station_distance.json`, agregat periode/wilayah, serta `T4_data_gabungan_harian.json` dan `T4_bridge_stasiun_rs.json`. Kecukupan Stasiun memakai `monitoring_network_summary.json`, `station_master.json`, `station_completeness.json`, `station_nearest_neighbor.json`, `station_pollutant_summary.json`, `station_priority.json`, dan `coverage_kabupaten.geojson`.

**Direncanakan:** `aqms/monthly_by_station.json` (stasiun × bulan, tiap polutan) dan agregat kesehatan bulanan, agar filter periode global benar-benar memengaruhi KPI, peta, dan grafik.

## 10. Referensi Regulasi & Baku Mutu

| Parameter | PP No. 22/2021 (Lampiran VII) | WHO AQG 2021 |
|---|---|---|
| PM2.5 — rata-rata 24 jam | **55 µg/m³** | **15 µg/m³** |
| PM2.5 — rata-rata 1 tahun | **15 µg/m³** | **5 µg/m³** |
| PM10 — 24 jam / 1 tahun | 75 / 40 µg/m³ | 45 / 15 µg/m³ |

- Kategori ISPU: Permen LHK No. 14/2020. Breakpoint PM2.5 24 jam: 0–15,4 (Baik), 15,5–55,4 (Sedang), 55,5–150,4 (Tidak Sehat), 150,5–250,4 (Sangat Tidak Sehat), ≥ 250,5 (Berbahaya).
- **Aturan pembandingan:** rata-rata seluruh periode per stasiun dibandingkan dengan ambang **tahunan** (15 nasional, 5 WHO); nilai harian dibandingkan dengan ambang **24 jam** (55 nasional, 15 WHO). Label grafik harus menyebut ambang yang dipakai.
- **Perlu koreksi kode:** `lib/constants.js` saat ini memakai 25 µg/m³ sebagai "NAAQS 24 jam" untuk PM2.5. Angka itu tidak ada pada PP 22/2021 (lihat K1). Untuk gas (SO₂, NO₂, CO, O₃) konstanta saat ini juga memakai ambang 1 jam, sedangkan PM memakai 24 jam; samakan waktu rata-ratanya.




## 11. Kriteria Selesai (Checklist Pengumpulan)

- [ ] Keenam halaman terisi dan memiliki kesimpulan di bagian atas
- [ ] Filter global (periode, wilayah, polutan) memengaruhi KPI, peta, dan grafik, serta dapat direset
- [ ] Baku mutu sesuai bagian 10; label ambang tertera di grafik
- [ ] Logo Gelar Rasa tampil
- [ ] Tidak ada dataset di luar dari panitia, atau penggunaan data referensi sudah dikonfirmasi (R2)
- [ ] Tidak ada galat 404 pada JSON; keadaan memuat dan galat tertangani
- [ ] `npm run lint` dan `npm run build` lolos
- [ ] Dashboard dideploy dan terbuka tanpa login (diuji incognito)
- [ ] Diuji pada 1366×768 dan layar sempit
- [ ] Laporan PDF mengikuti template, penamaan berkas benar, angka konsisten dengan dashboard
- [ ] Pengumpulan dilakukan oleh ketua tim **sebelum 14 November 2026 pukul 23.59 WIB**
- [ ] (Bila lolos) PPT final dipersiapkan
