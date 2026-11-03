# DA Gelar Rasa 2026 — Air Quality Dashboard


### Project Overview

**DA Gelar Rasa 2026 — Air Quality Dashboard** adalah dashboard interaktif berbasis web untuk kompetisi *Dashboard Analysis* Gelar Rasa 2026. Dashboard memvisualisasikan data kualitas udara dari 27 stasiun AQMS di 5 pulau besar Indonesia, dikombinasikan dengan data kesehatan harian 27 rumah sakit rujukan (Januari 2024 – Oktober 2026).

> **Tema:** "From Roots to Clarity, Revealing Meaningful Insight Through Data"

### Tech Stack

| Layer | Teknologi |
| --- | --- |
| Framework | **Next.js 16** (App Router) |
| Bahasa | **Javascript** |
| Styling | **Tailwind CSS** |
| Visualisasi | **Apache ECharts** + **Leaflet** (peta) |
| State Management | React hooks lokal (`useFilter`) |
| Data fetching | Next.js Server Components + `fetch` |
| Linting & Format | ESLint · Prettier |
| Peta | **Leaflet + Carto tiles**, tanpa API key |

### Struktur Repo

```
gelar-rasa-2026/
├── public/
│   └── data/                  # Data JSON/CSV hasil preprocessing
│       ├── aqms/              # Per-stasiun & agregasi
│       └── health/            # Health outcomes
├──src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx          
│   │   │   └── ModuleLayout.jsx    
│   │   └── ui/
│   │       ├── MetricCard.jsx      
│   │       └── Badge.jsx           
│   │
│   ├── map/
│   │   └── StationMap.jsx          
│   │
│   ├── lib/
│   │   ├── constants.js            
│   │   └── formatters.js           
│   │
│   ├── hooks/
│   │   ├── useFilter.js            
│   │   ├── useAqmsData.js          
│   │   └── useHealthData.js  
│   │      
│   ├── app/                   # Next.js App Router
│   │   │   ├── layout.jsx         # Root layout + navbar
│   │   │   ├── page.jsx           # Redirect ke /overview
│   │   │   ├── overview/          # [Dev 1] Modul Overview
│   │   │   ├── kualitas-udara/    # [Dev 2] Modul Kualitas Udara
│   │   │   ├── korelasi/          # [Dev 3] Modul Korelasi Polutan
│   │   │   ├── pm25-kesehatan/    # [Dev 3] Modul PM2.5 × Kesehatan
│   │   │   ├── kecukupan-stasiun/ # [Dev 1] Modul Kecukupan Stasiun
│   │   │   └── insight/           # [Dev 1] Modul Insight & Rekomendasi
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── next.config.js / next.config.mjs
├── tailwind.config.js
├── jsconfig.json
├── README.md
└── PRD.md
```
`public/data/aqms` dan `public/data/health` dipertahankan dengan `.gitkeep` sebelum file hasil preprocessing tersedia. Data JSON di folder ini diakses melalui URL `/data/...`, bukan melalui import file langsung.

Alias import `@/*` menunjuk ke `src/*`. Contoh: `@/components/ui/MetricCard` berarti `src/components/ui/MetricCard.jsx`.

### Komponen yang Bisa Digunakan Kembali

- `components/layout/Navbar`: navigasi utama dan penanda route aktif. Dipasang sekali di `app/layout.jsx`.
- `components/layout/ModuleLayout`: mengatur offset navbar, lebar konten, header modul, dan jarak antar section. Gunakan sebagai wrapper setiap `page.jsx` modul.
- `components/layout/ModuleLayout` juga mengekspor `Section` untuk judul section dan spacing yang konsisten.
- `components/ui/Card`: panel dasar dengan surface, border, radius, dan shadow dari design token. Gunakan untuk panel atau kartu baru agar tidak mengulang style.
- `components/ui/MetricCard`: angka KPI dengan label, unit, badge, subtext, dan opsi accent.
- `components/ui/Badge`: badge kategori manual; gunakan `IspuBadge` jika kategori harus dihitung dari nilai PM2.5.
- `components/ui/LoadingSpinner` dan `ErrorState`: state loading/error standar untuk hasil fetch.
- `map/StationMap`: peta Leaflet client-only. Import dengan `next/dynamic` dan `{ ssr: false }` karena Leaflet membutuhkan browser.

Komponen reusable sengaja dibatasi pada primitive yang stabil. Filter, legenda, dan pola visual yang hanya relevan untuk satu modul sebaiknya tetap lokal di `src/app/<modul>/` agar setiap developer bebas membangun storytelling yang sesuai datanya.

### Hooks dan Lib

**Hooks**

- `useAqmsData.js`: mengambil ringkasan nasional, daftar stasiun, timeseries stasiun, dan pola rata-rata per jam dari `/data/aqms`.
- `useHealthData.js`: mengambil ringkasan kesehatan dan agregasi per rumah sakit dari `/data/health`.
- `useFilter.js`: menyimpan filter tanggal, stasiun, region, dan polutan. Gunakan `filterByDate` untuk data yang memiliki field `date` atau `month` berformat ISO.

**Lib**

- `lib/constants.js`: sumber tunggal untuk kategori ISPU, breakpoint PM2.5, metadata polutan, outcome kesehatan, tipe stasiun, warna region, serta nama bulan/hari. Tambahkan metadata domain di sini, bukan di komponen.
- `lib/formatters.js`: fungsi murni untuk konversi ISPU (`calcIspu`, `getIspuFromPm25`), format angka/satuan/tanggal, dan label stasiun. Gunakan fungsi ini agar tampilan angka konsisten di semua modul.

Aturan praktis: `components` mengatur tampilan, `hooks` mengatur state/fetch, dan `lib` mengatur aturan domain atau formatting yang tidak bergantung pada React.

### Development Workflow

#### Branching Strategy

```
main          ← protected, hanya merge via PR
└─ dev        ← integration branch
   ├─ feat/setup-repo          (Dev 1)
   ├─ feat/overview            (Dev 1)
   ├─ feat/kecukupan-stasiun   (Dev 1)
   ├─ feat/insight             (Dev 1)
   ├─ feat/kualitas-udara      (Dev 2)
   ├─ feat/korelasi            (Dev 3)
   └─ feat/pm25-kesehatan      (Dev 3)
```

#### Commit Convention (Conventional Commits)

```
feat(modul): deskripsi singkat
fix(komponen): deskripsi bug fix
chore(setup): konfigurasi awal tailwind
docs: update README
```

#### Pull Request

1. Buat PR dari `nama-branch-kamu` ke `main`.
2. Isi PR template: deskripsi
3. Merge ke `main` dilakukan hanya oleh Dev 1 saat milestone selesai.

#### Code Style

- Jalankan `npm run lint` sebelum commit. Gunakan formatter yang disepakati tim jika tersedia.
- Komponen menggunakan **named export**, bukan default export (kecuali page).
- Semua props dideklarasikan dengan JavaScript interface.
- Warna UI hanya dari design token di `src/app/globals.css` dan token Tailwind yang tersedia.

### Setup & Environment

#### Prasyarat

- Node.js >= 20.x
- npm >= 10.x (atau pnpm)
- Python >= 3.10 (untuk preprocessing data)

#### Langkah Instalasi

```bash
# 1. Clone repo
git clone https://github.com/ssabila/dashboard-gelar-rasa.git
cd dashboard-gelar-rasa

# 2. Install dependencies
npm install

# 3. Salin env template
cp .env.example .env.local


# 4. Jalankan dev server
npm run dev
```

App berjalan di `http://localhost:3000`.

#### Environment Variables (`.env.example`)

```env
# Tidak ada API eksternal untuk MVP.
# Tambahkan variabel di sini jika ada integrasi ke depan.
NEXT_PUBLIC_APP_NAME="DA Gelar Rasa 2026"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

#### Scripts

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Dev server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Jalankan production build lokal |
| `npm run lint` | ESLint check |
| `python scripts/preprocess.py` | Konversi Parquet → JSON/CSV |

#### Workflow Kolaborasi

- Setiap developer mengerjakan satu modul di `src/app/<modul>/` dan memakai `ModuleLayout`, `Section`, serta komponen UI bersama.
- Data hasil preprocessing masuk ke `public/data/aqms/` atau `public/data/health/`; jangan mengubah struktur JSON tanpa memperbarui hook dan dokumentasi kontraknya.
- Aturan domain dan label bersama berada di `src/lib/`; jangan menduplikasi breakpoint ISPU atau warna kategori di halaman modul.
- Semua perubahan UI memakai token di `src/app/globals.css`. Sidebar menggunakan `--color-nav`, sedangkan canvas halaman menggunakan `--color-bg` (`#FAFAFA`).
- Sebelum pull request, jalankan `npm run lint` dan `npm run build`, lalu jelaskan route, data, dan komponen yang berubah.