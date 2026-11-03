# DA Gelar Rasa 2026 — Air Quality Dashboard


### Project Overview

**DA Gelar Rasa 2026 — Air Quality Dashboard** adalah dashboard interaktif berbasis web untuk kompetisi *Dashboard Analysis* Gelar Rasa 2026. Dashboard memvisualisasikan data kualitas udara dari 27 stasiun AQMS di 5 pulau besar Indonesia, dikombinasikan dengan data kesehatan harian 27 rumah sakit rujukan (Januari 2024 – Oktober 2026).

> **Tema:** "From Roots to Clarity, Revealing Meaningful Insight Through Data"

### Tech Stack

| Layer | Teknologi |
| --- | --- |
| Framework | **Next.js 14** (App Router) |
| Bahasa | **Javascript** |
| Styling | **Tailwind CSS** |
| Visualisasi | **Apache Echart** + **react-leaflet** (peta) |
| State Management | **Zustand** |
| Data fetching | Next.js Server Components + `fetch` |
| Linting & Format | ESLint · Prettier |
| CI/CD | GitHub Actions |
| Hosting | Vercel |

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
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── README.md
└── PRD.md
```

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

- Jalankan `npm run lint` dan `npm run format` sebelum commit.
- Komponen menggunakan **named export**, bukan default export (kecuali page).
- Semua props dideklarasikan dengan JavaScript interface.
- Warna hanya dari design token di `tailwind.config.ts` (lihat Design System di PRD).

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
| `npm run format` | Prettier format |
| `python scripts/preprocess.py` | Konversi Parquet → JSON/CSV |