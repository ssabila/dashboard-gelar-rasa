# PRD Dashboard Kualitas Udara & Kesehatan — DA Gelar Rasa 2026

## Overview & Tujuan Proyek

Dashboard ini menyajikan analisis kualitas udara dan dampak kesehatan dari 27 stasiun AQMS di seluruh Indonesia sebagai deliverable kompetisi DA Gelar Rasa 2026 (deadline: 14 November 2026).

**Konteks Kompetisi**

- Tema: *From Roots to Clarity, Revealing Meaningful Insight Through Data*
- Total nilai: 100 poin (70 dashboard + 30 laporan analisis)
- Lima tim terbaik lolos ke final round

**Tujuan Analitis**

1. Memetakan kondisi kualitas udara lintas wilayah dan waktu terhadap baku mutu PP No. 22/2021 dan ISPU (Permen LHK No. 14/2020).
2. Mengidentifikasi periode dan lokasi dengan pencemaran paling kritis — termasuk episode kabut asap gambut.
3. Menganalisis faktor yang memengaruhi variasi konsentrasi polutan (meteorologi, tipe stasiun, lalu lintas).
4. Mengevaluasi dampak PM2.5 terhadap kesehatan kelompok rentan (balita & lansia) dengan memperhitungkan efek jeda.
5. Menilai kecukupan jaringan pemantauan dan merekomendasikan titik pemantauan tambahan.

**Batasan Proyek**

- Dataset sintetis; tidak untuk publikasi ilmiah.
- Data AQMS: Jan 2024 — Okt 2026 (667.981 baris); data kesehatan: Des 2023 — Okt 2026 (27.491 baris).
- Peserta dilarang menggunakan dataset di luar yang diberikan panitia.

## Target Pengguna & User Stories

Dashboard dirancang untuk dua audiens utama:

| Pengguna | Konteks Penggunaan | Kebutuhan Utama |
| --- | --- | --- |
| Juri Kompetisi (analis data) | Menilai kualitas analisis, storytelling, dan desain | Narasi yang kuat, insight bernilai, visualisasi bersih |
| Pengambil Keputusan Kebijakan (persona sekunder) | Memantau kualitas udara dan dampak kesehatan secara berkala | Filter lokasi/waktu, indikator peringatan, rekomendasi konkret |

**User Stories**

- Sebagai **juri**, saya ingin melihat perbandingan antar stasiun dan antar pulau secara sekilas, sehingga saya bisa menilai seberapa dalam peserta memahami data spasial.
- Sebagai **juri**, saya ingin melihat analisis pola waktu (diurnal, mingguan, musiman) beserta penjelasan narasi, sehingga saya bisa mengevaluasi kemampuan storytelling peserta.
- Sebagai **juri**, saya ingin melihat hubungan antara polutan dan data kesehatan dilengkapi lag analysis, sehingga saya bisa menilai kedalaman analisis kausalitas.
- Sebagai **pengambil keputusan**, saya ingin memfilter dashboard berdasarkan wilayah dan periode waktu, sehingga saya bisa fokus pada area yang relevan dengan kebijakan saya.
- Sebagai **pengambil keputusan**, saya ingin melihat rekomendasi lokasi penambahan stasiun pemantauan, sehingga saya bisa mengalokasikan anggaran dengan tepat.

## Ruang Lingkup & Fitur Utama

### Fitur Wajib (In Scope)

**Analisis Kualitas Udara**

- Peta interaktif 27 stasiun dengan warna berbasis kategori ISPU
- Perbandingan rata-rata PM2.5 antar stasiun dan antar pulau vs baku mutu (WHO 15 µg/m³ & NAAQS Indonesia 25 µg/m³)
- Tren temporal: bulanan, mingguan, pola diurnal (jam)
- Deteksi episode kabut asap (spike PM2.5) berdasarkan musim kemarau
- Filter interaktif: wilayah, periode, tipe stasiun, polutan

**Analisis Faktor Penyebab**

- Korelasi polutan vs variabel meteorologi (suhu, kelembapan, kecepatan angin)
- Perbandingan PM2.5 berdasarkan tipe stasiun (industrial, roadside, clean background, peatland)
- Scatter plot: traffic intensity vs PM2.5, distance to road vs PM2.5

**Analisis Dampak Kesehatan**

- Tren kasus ISPA balita & lansia bersamaan dengan tren PM2.5
- Lag analysis: korelasi PM2.5 hari ke-0, lag-1, lag-2, lag-3 dengan rawat inap
- Perbandingan kerentanan balita vs lansia per wilayah
- Heatmap: kasus kesehatan per hari dalam seminggu × bulan

**Rekomendasi Kebijakan**

- Peta gap coverage: wilayah tanpa stasiun yang berpotensi polusi tinggi
- Tabel rekomendasi prioritas penambahan stasiun


## Halaman & Struktur Dashboard

Dashboard terdiri dari **4 halaman utama** dengan navigasi tab/sidebar:

### Halaman 1 — Overview 
*Gambaran besar: di mana dan seberapa buruk kondisi udara Indonesia.*

- **KPI Cards (top):** Menampilkan 6 KPI card: rata-rata PM2.5 nasional, jumlah stasiun aktif, % stasiun melebihi NAAQS, total rawat inap pernapasan (periode terpilih), jumlah kematian, dan stasiun dengan PM2.5 tertinggi.
- **Peta Indonesia interaktif:** eta interaktif (Leaflet) yang memplot 27 stasiun dengan warna berdasarkan kategori ISPU PM2.5 (Baik / Sedang / Tidak Sehat / Sangat Tidak Sehat / Berbahaya).
- **Filter Global:** Filter periode waktu global (date range picker) yang memengaruhi seluruh KPI dan peta, pilih pulau / region group · pilih periode · pilih polutan

### Halaman 2 — Kualitas Udara

### Halaman 3 — Analisis Faktor & Korelasi

### Halaman 4 — Dampak Kesehatan 

### Halaman 5 — Kecukupan stasiun pemantau

- **Peta Indonesia interaktif:** Peta interaktif (Leaflet) yang memplot 27 stasiun dengan status aktif
- **Kecukupan per pulau:** jumlah stasiun, luas wilayah, rasio stasiun per 100.000 km², gap vs standar.
-**Highlight:** Highlight wilayah blank spot (provinsi tanpa stasiun) dengan rekomendasi lokasi prioritas
- **Card Rekomendasi:** Rekomendasi 3 - 5 lokasi prioritas penambahan stasiun beserta justifikasi

### Modul 6 — Insight dan rekomendasi
- **Narasi storytelling berbasis data:** 5–7 temuan kunci disajikan sebagai card dengan chart mini pendukung.

- **Tabel ringkasan rekomendasi kebijakan:** temuan → implikasi → rekomendasi → prioritas.

- **Batasan Metodologi:** Disclaimer metodologi dan keterbatasan dataset (data sintetis).

## Spesifikasi Data & Preprocessing

### Sumber Data

| File | Baris | Keterangan |
| --- | --- | --- |
| `aqms_valid_all.parquete` (×27) | 594167 total | Pengukuran per jam per stasiun |
| `HLT-01_health_outcomes_daily.csv` | 27.491 | Kasus kesehatan harian per rumah sakit |
| `sites.csv` | 27 | Karakteristik lokasi stasiun |
| `sensors.csv` | 27 | Detail sensor & status operasional |
| `hospitals.csv` | 27 | Fasilitas rumah sakit rujukan |


## Desain & UX

### Prinsip Desain

- **Storytelling first:** setiap halaman memiliki satu pertanyaan utama yang dijawab oleh visualisasi utama, bukan sekadar kumpulan grafik.
- **Konteks selalu hadir:** setiap angka polutan ditampilkan bersama garis referensi WHO / NAAQS agar pembaca tidak perlu mengingat nilai ambang.
- **Progressive disclosure:** KPI cards → visualisasi agregat → drill-down per stasiun/lokasi. Juri tidak perlu scroll jauh untuk mendapat insight utama.
- **Warna bermakna:** gunakan palet ISPU Indonesia (Baik = hijau, Sedang = biru, Tidak Sehat = kuning, Sangat Tidak Sehat = merah, Berbahaya = hitam). Warna konsisten di seluruh halaman.

### Panduan Visual

Palette warna yang digunakan:

| Token | Hex | Nama | Penggunaan |
| --- | --- | --- | --- |
| `color-bg-darkest` | `#0D0630` | Dark Amethyst | Background utama / sidebar |
| `color-bg-dark` | `#18314F` | Deep Space Blue | Card, panel |
| `color-surface` | `#384E77` | Dusk Blue | Chart area, filter panel |
| `color-muted` | `#8BBEB2` | Muted Teal | Garis grid, teks sekunder |
| `color-accent` | `#E6F9AF` | Lime Cream | Highlight, aksen CTA, nilai kritis |

**Tipografi:** Playfair Display — heading `font-semibold`, body Jakarta Sans Plus

**Ikon:** Lucide React.

**Logo:** Logo Gelar Rasa wajib muncul di navbar kanan atas, file di ASSETS/.

### Interaktivitas Minimum

- [ ] Filter global: wilayah, periode, polutan
- [ ] Klik peta → panel detail stasiun dan tooltip
- [ ] Hover chart → tooltip dengan nilai & konteks
- [ ] Toggle show/hide series pada multi-line chart
- [ ] Tombol reset filter
- [ ] Navigasi antar halaman intuitif (tab atau sidebar)

### Navigasi
Sidebar kiri dengan 4 menu icon + label, atau tab bar horizontal di bagian atas. Setiap halaman memiliki sub-header singkat yang menjelaskan pertanyaan yang dijawab di halaman tersebut.

## Teknologi & Tools
- Next.js sebagai frontend
- python sebagai tools untuk prepocessing
- Leaflet sebagai library untuk peta
- EChart sebagai library untuk chart

### Referensi Regulasi

- **PP No. 22 Tahun 2021** — Baku mutu udara ambien nasional (NAAQS Indonesia: PM2.5 tahunan 15 µg/m³, 24-jam 55 µg/m³)
- **Permen LHK No. 14 Tahun 2020** — Kategori dan perhitungan ISPU
- **WHO Air Quality Guidelines 2021** — PM2.5 tahunan 5 µg/m³, 24-jam 15 µg/m³
