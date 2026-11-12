"""
Konversi tabel hasil preprocessing (Prompt 1) -> JSON untuk dashboard (Tujuan 3 & 4).
Tidak ada perhitungan statistik ulang: koefisien, median, Q1/Q3, CCF, Z-score disalin apa adanya dari CSV.
Satu-satunya nilai turunan: batas whisker boxplot (aturan Tukey 1,5×IQR) per stasiun×arah×polutan, dihitung dari
data_arah_angin karena ringkasan_polutan_arah_angin hanya memuat median/Q1/Q3. Diberi nama kolom terpisah (whisker_*).

Pemakaian (dijalankan manual, bukan saat dashboard dimuat):
    python scripts/preprocess_t3_t4_web.py <folder data_processed> <folder public/data>
Keluaran:
    <public/data>/korelasi/t3_tabel.json            tabel kecil Tujuan 3
    <public/data>/korelasi/scatter/<STASIUN>.json   data per jam per stasiun (scatter plot)
    <public/data>/korelasi/arah/<STASIUN>.json      nilai polutan per jam menurut arah angin per stasiun (halaman Arah Angin)
    <public/data>/pm25-kesehatan/t4.json            tabel harian + CCF + ISPA Tujuan 4
"""
import json, sys
from pathlib import Path
import numpy as np
import pandas as pd

SRC, DST = Path(sys.argv[1]), Path(sys.argv[2])
(DST / "korelasi" / "scatter").mkdir(parents=True, exist_ok=True)
(DST / "pm25-kesehatan").mkdir(parents=True, exist_ok=True)
POL = {"pm25_ug_m3": "pm25", "pm10_ug_m3": "pm10", "so2_ug_m3": "so2", "co_ug_m3": "co", "o3_ug_m3": "o3", "no2_ug_m3": "no2"}
NAMA2KEY = {"PM2.5": "pm25", "PM10": "pm10", "SO2": "so2", "CO": "co", "O3": "o3", "NO2": "no2"}
MET2KEY = {"Suhu": "temperature", "Kelembapan": "humidity", "Kecepatan angin": "wind_speed"}


def rd(n): return pd.read_csv(SRC / f"{n}.csv")
def clean(v):
    if isinstance(v, (np.floating, float)): return None if not np.isfinite(v) else round(float(v), 6)
    if isinstance(v, np.integer): return int(v)
    if isinstance(v, np.bool_): return bool(v)
    return None if v is pd.NA else v
def rec(df): return [{k: clean(v) for k, v in r.items()} for r in df.to_dict("records")]
def js(path, obj): Path(path).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))

# ── Tujuan 3 ────────────────────────────────────────────────────────────
ov = rd("tabel_overview_tujuan3"); tl = rd("tipe_lokasi_stasiun"); kar = rd("karakteristik_stasiun")
mp = rd("median_polutan_per_stasiun")
stations = ov.merge(tl[["stasiun", "site_type_asli"]], on="stasiun").merge(
    mp[["stasiun"] + [f"median_{p}" for p in POL] + [f"n_{p}" for p in POL]], on="stasiun")
stations = stations.rename(columns={**{f"median_{p}": f"med_{k}" for p, k in POL.items()}, **{f"n_{p}": f"n_{k}" for p, k in POL.items()}})
det = rd("detail_korelasi_meteorologi")
det["variabel_meteorologi"] = det.variabel_meteorologi.map(MET2KEY); det["polutan"] = det.polutan.map(NAMA2KEY)
assert det[["variabel_meteorologi", "polutan"]].notna().all().all()
med = rd("median_korelasi_22_stasiun")
med["variabel"] = med.variabel.map(MET2KEY); med["polutan"] = med.polutan.map(NAMA2KEY)
kk = rd("korelasi_karakteristik_stasiun")
kk["variabel_karakteristik"] = kk.variabel_karakteristik.map({"Intensitas lalu lintas": "lalu_lintas", "Jarak ke jalan raya": "jarak_jalan"})
kk["polutan"] = kk.polutan.map(NAMA2KEY)

# arah angin: salin ringkasan + whisker dari data jam
ra = rd("ringkasan_polutan_arah_angin")
da = pd.read_csv(SRC / "data_arah_angin.csv", usecols=["stasiun", "arah_angin", "arah_angin_kode"] + list(POL))
kode = da.drop_duplicates("arah_angin").set_index("arah_angin").arah_angin_kode.to_dict()
wl = []
for (st, ar), g in da.groupby(["stasiun", "arah_angin"]):
    for pc, pk in POL.items():
        s = g[pc].dropna()
        if s.empty: continue
        q1, q3 = s.quantile(.25), s.quantile(.75); i = q3 - q1
        inside = s[(s >= q1 - 1.5 * i) & (s <= q3 + 1.5 * i)]
        wl.append(dict(stasiun=st, arah_angin=ar, polutan=pk, whisker_bawah=inside.min(), whisker_atas=inside.max(),
                       n_pencilan=int(len(s) - len(inside)), nilai_min=s.min(), nilai_maks=s.max()))
ra["polutan"] = ra.polutan.map(NAMA2KEY)
ra = ra.merge(pd.DataFrame(wl), on=["stasiun", "arah_angin", "polutan"], how="left")
ra["kode"] = ra.arah_angin.map(kode)
assert ra.whisker_bawah.notna().all()
rt = rd("ringkasan_polutan_tipe_lokasi"); rt["polutan"] = rt.polutan.map(NAMA2KEY)

# ringkasan jam: jumlah jam per arah (semua stasiun) dan calm
n_arah = da.groupby("arah_angin").size().to_dict()
t3 = {
    "meta": {
        "n_stasiun": int(len(ov)), "n_jam": int(ov.jam_data.sum()), "n_jam_calm": int(ov.jam_calm.sum()),
        "n_jam_arah": int(len(da)), "n_jam_per_arah": n_arah, "periode": [ov.tanggal_awal.min(), ov.tanggal_akhir.max()],
        "polutan": list(POL.values()),
    },
    "stasiun": rec(stations), "karakteristik": rec(kar), "tipe_lokasi": rec(tl),
    "median_korelasi": rec(med), "detail_korelasi": rec(det), "korelasi_karakteristik": rec(kk),
    "arah_angin": rec(ra), "tipe_ringkasan": rec(rt),
}
js(DST / "korelasi" / "t3_tabel.json", t3)

# scatter per stasiun (indeks jam sejak 2024-01-01 00:00; nilai dibulatkan 2 desimal untuk tampilan)
dmp = pd.read_csv(SRC / "data_meteorologi_polutan.csv", parse_dates=["timestamp"])
t0 = pd.Timestamp("2024-01-01")
for st, g in dmp.groupby("stasiun"):
    g = g.sort_values("timestamp")
    o = {"stasiun": st, "t0": "2024-01-01T00:00", "h": ((g.timestamp - t0) / pd.Timedelta(hours=1)).astype(int).tolist(),
         "temperature": g.temperature_c.round(2).tolist(), "humidity": g.humidity_pct.round(2).tolist(), "wind_speed": g.wind_speed_ms.round(2).tolist()}
    for pc, pk in POL.items(): o[pk] = g[pc].round(2).tolist()
    js(DST / "korelasi" / "scatter" / f"{st}.json", o)

# observasi per jam menurut arah angin per stasiun (untuk titik observasi saat satu stasiun dipilih; jam calm sudah dikeluarkan)
(DST / "korelasi" / "arah").mkdir(parents=True, exist_ok=True)
for st, g in da.groupby("stasiun"):
    o = {"stasiun": st}
    for pc, pk in POL.items():
        o[pk] = {ar: gg[pc].dropna().round(1).tolist() for ar, gg in g.groupby("arah_angin")}
    js(DST / "korelasi" / "arah" / f"{st}.json", o)

# ── Tujuan 4 ────────────────────────────────────────────────────────────
z = rd("data_zscore_harian"); ag = rd("data_agregat_harian"); isp = rd("data_ispa_harian")
dates = sorted(z.tanggal.unique())
assert dates == ag.tanggal.tolist() == isp.tanggal.tolist()
ser = {}
for ind, g in z.groupby("indikator"):
    g = g.set_index("tanggal").reindex(dates)
    ser[ind] = {"v": [clean(x) for x in g.nilai_asli.round(4)], "z": [clean(x) for x in g.zscore.round(4)]}
zp = pd.read_csv(SRC.parent / "laporan" / "zscore_parameter.csv") if (SRC.parent / "laporan" / "zscore_parameter.csv").exists() else None
t4 = {
    "dates": dates, "series": ser,
    "pm25_n_stasiun": ag.n_stasiun_valid.tolist(), "pm25_n_jam": ag.n_jam_pm25_valid.tolist(),
    "ispa": {"balita": [clean(x) for x in isp.rata_ispa_balita.round(4)], "lansia": [clean(x) for x in isp.rata_ispa_lansia.round(4)],
             "n_rs_balita": isp.n_rs_ispa_balita.tolist(), "n_rs_lansia": isp.n_rs_ispa_lansia.tolist()},
    "ispa_ringkasan": rec(rd("ringkasan_ispa_periode")),
    "ccf": rec(rd("hasil_ccf")), "ccf_ringkasan": rec(rd("ringkasan_ccf")),
    "zscore_parameter": rec(zp) if zp is not None else [],
    "ccf_diagnostik": rec(pd.read_csv(SRC.parent / "laporan" / "ccf_diagnostik_deret.csv")) if (SRC.parent / "laporan" / "ccf_diagnostik_deret.csv").exists() else [],
}
js(DST / "pm25-kesehatan" / "t4.json", t4)
print("OK")
