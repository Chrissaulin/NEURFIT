# Smart Wardrobe — ML Pipeline

Bagian ini berisi **EDA**, **preprocessing**, dan **starter modeling** untuk Smart Wardrobe
(CNN auto-tagger + Bi-LSTM outfit scorer). Semua pekerjaan disajikan sebagai notebook.

## 1. Environment

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r ml\requirements.txt

# daftarkan kernel agar notebook memakai Python yang sama dengan training
python -m ipykernel install --user --name neurfit --display-name "Python 3.10 (Neurfit)"
```

Butuh Python **3.10–3.12**. Versi TensorFlow/Keras harus sama antara training dan backend.

## 2. Dataset (TIDAK di-commit)

Dataset besar tidak masuk git (lihat `.gitignore`: `ml/data/`, `ml/artifacts/`).
Unduh sendiri lalu letakkan dengan struktur **persis** seperti berikut:

```
ml/data/
├── fashionProduct/
│   ├── styles.csv
│   └── images/
│       └── {id}.jpg                 # ±44.000 gambar
└── polyvore/
    ├── train_no_dup.json
    ├── valid_no_dup.json
    ├── test_no_dup.json
    ├── category_id.txt
    ├── fashion_compatibility_prediction.txt
    └── Re-PolyVore/
        └── {category}/
            └── {set_id}_{index}.jpg # ±127.000 gambar
```

Sumber data:
- **Fashion Product Images (Small)** — dataset publik Kaggle `Fashion Product Images (Small)`
  (berisi `styles.csv` + folder `images/`).
- **Polyvore** — gunakan berkas yang sama (`*_no_dup.json`, `category_id.txt`, `Re-PolyVore/`).

> Catatan: layout aktual Polyvore adalah `Re-PolyVore/{category}/{set_id}_{index}.jpg`,
> **bukan** `images/{set_id}/{index}.jpg`. Notebook EDA sudah menangani ini.

## 3. Urutan menjalankan notebook

Jalankan dari folder `ml/` (notebook juga punya sel bootstrap bila dijalankan dari root):

1. **`eda.ipynb`** — eksplorasi kedua dataset: distribusi label, kualitas gambar,
   coverage mapping, preview cleaning/split, statistik Polyvore. Hanya membaca.
2. **`preprocessing.ipynb`** — menghasilkan input siap-latih untuk Model 1:
   parse → cleaning → mapping → split 80/10/10 → cache `fashion_128.npy` → indeks.
   (Cache ±13 menit di CPU; set `FORCE_REBUILD=True` untuk membuat ulang.)
3. **`modeling.ipynb`** — *starter* untuk temanmu: load hasil preprocessing, `tf.data`,
   arsitektur tagger (MobileNetV2 + 3 head + `embedding` 256), lalu placeholder training.
   Set `RUN_TRAINING=True` untuk mulai melatih.

Verifikasi cepat (opsional, dari terminal):

```powershell
cd ml
python -m nbconvert --to notebook --execute --inplace --ExecutePreprocessor.kernel_name=neurfit eda.ipynb
python -m nbconvert --to notebook --execute --inplace --ExecutePreprocessor.kernel_name=neurfit preprocessing.ipynb
```

## 4. Output preprocessing

```
ml/data/processed/
├── fashion_128.npy        # uint8 (N,128,128,3), nilai 0-255, baris sinkron dgn indeks
├── fashion_index.csv      # npy_index, id, gender, article_type, base_colour,
│                          # usage, usage_valid, is_other, split, image_path
└── splits/
    ├── train.csv
    ├── val.csv
    └── test.csv
ml/artifacts/fashion_prepare_report.json
```

Cara load untuk modeling:

```python
import numpy as np, pandas as pd
images = np.load("data/processed/fashion_128.npy", mmap_mode="r")
train = pd.read_csv("data/processed/splits/train.csv")
x = images[train["npy_index"].to_numpy()]   # (n, 128, 128, 3) uint8
```

## 5. Kontrak label (WAJIB)

- Sumber tunggal: `ml/configs/labels.yaml`.
- **Urutan** `article_type`, `base_colour`, `usage` di YAML = urutan indeks keluaran softmax.
  Mengubah urutan/isi berarti model harus dilatih ulang.
- `usage` yang tidak valid (Ethnic/Home/kosong) tetap jadi baris, tetapi `usage_valid=False`
  → beri `sample_weight = 0` pada head `usage` (bukan dibuang).
- Kelas `other` pada `article_type` di-cap (default 4.000 gambar).
- Input model 0–255; normalisasi `Rescaling` ada di dalam model.
- Preprocessing gambar latih/infer wajib memakai `ml/preprocess.py` (`preprocess_pil`) —
  fungsi yang sama dipakai backend (paritas, golden test).

## 6. Catatan

- `ml/data/` dan `ml/artifacts/` sengaja di-`.gitignore` (dataset & output besar).
- Skrip lama `00_eda.py` / `01_prepare_fashion.py` digantikan notebook ini.
- Langkah berikutnya (Model 2): `03_prepare_polyvore.py` perlu memfilter ke outfit yang
  **semua slot intinya punya gambar** (EDA menunjukkan hanya ±24% outfit train yang memenuhi).
