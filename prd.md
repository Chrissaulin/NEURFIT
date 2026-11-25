# Product Requirements Document — Smart Wardrobe

> **Single source of truth** untuk pengembangan MVP v1. Perubahan pada kontrak API (§6), taksonomi label (§4.3), atau skema database (§5) **WAJIB** memperbarui dokumen ini dalam *commit* yang sama dengan perubahan kodenya.

| Atribut | Nilai |
|---|---|
| **Nama Produk** | Smart Wardrobe — Aplikasi Web Klasifikasi Pakaian Otomatis & Rekomendasi *Outfit Mix-and-Match* |
| **Versi Dokumen** | 1.1 (MVP v1 — Streamlined 7-Day Sprint) |
| **Tanggal** | 25 November 2026 |
| **Target Pengerjaan** | MVP *end-to-end* dalam 7 hari |
| **Pembaca Utama** | Developer, ML engineer, dan *AI coding agent* |

**Konvensi dokumen**

- **WAJIB** = *must* (prioritas **P0**), **SEBAIKNYA** = *should* (**P1**), **OPSIONAL** = *could* (**P2**).
- Semua *timestamp* memakai UTC ISO 8601. Semua identifier teknis (kolom DB, key JSON, nama label) memakai `snake_case` berbahasa Inggris.
- Nilai numerik pada target model adalah **target evaluasi dataset**, bukan jaminan absolut; angka aktual dicatat di `ml/artifacts/metrics.json`.

## Daftar Isi

1. Ringkasan Produk & Tujuan MVP
2. User Personas & User Flows
3. Spesifikasi Kebutuhan Fungsional
4. Arsitektur & Pipeline Machine Learning
5. Arsitektur Sistem & Desain Database
6. Spesifikasi REST API (API Contract)
7. Spesifikasi Antarmuka Pengguna (Frontend UI/UX)
8. Struktur Direktori Monorepo & Rencana Kerja 7 Hari
9. Risiko Teknis & Mitigasi
10. Lampiran (Glosarium, `.env`, Perintah Cepat, Konvensi untuk AI Coding Agent, Checklist Penerimaan)

---

## 1. Ringkasan Produk & Tujuan MVP

### 1.1 Visi

Smart Wardrobe mengubah foto pakaian menjadi **lemari digital yang "memahami" isinya**: mengenali jenis, warna, dan acara pemakaian secara otomatis, lalu menyusun kombinasi *outfit* terbaik dari pakaian yang **sudah dimiliki** pengguna.

### 1.2 Problem Statement

| # | Masalah | Dampak |
|---|---|---|
| 1 | Pengguna punya banyak pakaian tetapi tidak punya katalog digital. | Lupa isi lemari, memakai ulang pilihan yang sama. |
| 2 | Mencatat pakaian secara manual (jenis, warna, acara) membosankan. | Aplikasi katalog pakaian ditinggalkan setelah beberapa item. |
| 3 | Memilih kombinasi atasan–bawahan–sepatu memakan waktu dan bergantung pada intuisi. | Keputusan lambat setiap pagi, rasa kurang percaya diri. |
| 4 | Rekomendasi *outfit* yang ada umumnya mendorong belanja produk baru, bukan memaksimalkan isi lemari. | Pemborosan, tidak relevan untuk pengguna yang ingin hemat. |

**Pernyataan solusi:** *auto-tagging* berbasis CNN menghilangkan input manual (pengguna cukup mengoreksi bila salah), dan model Bi-LSTM menilai kecocokan kombinasi sehingga pengguna mendapat 3–5 rekomendasi *outfit* dari lemarinya sendiri dalam hitungan detik.

### 1.3 Tujuan dan Non-Tujuan MVP

**Tujuan (Goals)**

1. Alur *end-to-end* yang stabil: unggah foto → *auto-tag* → koreksi → simpan → lihat lemari → pilih *anchor* → terima 3–5 rekomendasi beserta skor kecocokan.
2. Dua model ML (Tagger CNN multi-output dan Bi-LSTM Scorer) terlatih, terekspor `.keras`, dan dimuat oleh backend saat *startup*.
3. Kode training ringan, datar (tanpa *boilerplate* paket rumit), dan portabel: berjalan di PC/laptop lokal (VS Code + `.venv`) maupun Google Colab.
4. Basis kode bersih yang mudah dikerjakan oleh *AI coding agent* berkat kontrak API, label, dan skema yang eksplisit.

**Non-Tujuan (Non-Goals)**

- Pembuatan dataset baru secara manual (tidak ada kewajiban memotret & melabeli puluhan foto HP atau menyusun ratusan *outfit* manual).
- Akurasi *state-of-the-art*, UI dengan animasi kompleks, dan *deployment* produksi/cloud.

### 1.4 Ruang Lingkup

| Kategori | In-Scope (MVP v1) | Out-of-Scope (Ditunda ke v2) |
|---|---|---|
| **Input** | Unggah satu foto pakaian per kali (JPEG/PNG/WebP) + fitur isi data demo sekali klik | Banyak pakaian dalam satu foto, unggah massal, penghapusan latar belakang otomatis (`rembg`) |
| **ML** | Auto-tagging `article_type`, `base_colour`, `usage`; ekstraksi *embedding* visual; skor kecocokan Bi-LSTM | Fine-tuning dari koreksi pengguna, kuantisasi/TFLite/ONNX, deteksi objek, kalibrasi *temperature scaling* |
| **Lemari** | Grid kartu, filter kategori/warna/acara, hapus item, koreksi label manual saat unggah | Edit label pasca-simpan, folder/koleksi kustom, *tagging* kustom, kalender pemakaian |
| **Rekomendasi** | *Anchor item* + filter acara → 3–5 kombinasi `[Atasan + Bawahan + Sepatu]` dari lemari pengguna | Integrasi API cuaca, *dress/jumpsuit* (satu potong), *outerwear* sebagai slot terpisah, rekomendasi belanja, *virtual try-on* |
| **Akun** | Satu pengguna implisit (`user_id = 1`), tanpa login | Autentikasi multi-user, OAuth, berbagi lemari |
| **Infrastruktur** | Lokal: SQLite + penyimpanan file lokal | PostgreSQL, penyimpanan objek (S3), CI/CD, Docker produksi |

### 1.5 Keputusan Kunci (Decision Log)

| ID | Keputusan | Alasan singkat |
|---|---|---|
| D-01 | **Database: SQLite** via SQLAlchemy 2.0 | Nol konfigurasi, satu pengguna lokal, data kecil; migrasi ke PostgreSQL cukup mengganti `DATABASE_URL` (analisis di §5.4). |
| D-02 | Backbone **MobileNetV2** (α = 1.0), input **128×128** (*square center-crop* + *resize*) | Latensi CPU rendah, artefak kecil (≈ 10 MB), dan *center-crop* menjaga detail tekstur objek foto HP. |
| D-03 | *Embedding* = layer `Dense(256, relu)` bernama `embedding`, disimpan sebagai **BLOB `float32`** | Ringkas (1 KB/item), cepat dibaca, tidak perlu *parsing* JSON. |
| D-04 | Satu model inferensi dengan **4 output**: `article_type`, `base_colour`, `usage`, `embedding` | Satu *forward pass* per gambar. |
| D-05 | Unggah **dua tahap**: `analyze` → `save` dengan `temp_id` | Memungkinkan koreksi label sebelum tersimpan tanpa inferensi ulang. |
| D-06 | Satu pengguna implisit (`user_id = 1`), tanpa auth, backend *bind* ke `127.0.0.1` | Sesuai batasan MVP; kolom `user_id` disiapkan agar migrasi multi-user mudah. |
| D-07 | Frontend **TypeScript** + TanStack Query, tanpa *global store* | Tipe kontrak API mengurangi kesalahan *agent*; server state ditangani *query cache*. |
| D-08 | Skor Bi-LSTM = probabilitas "kombinasi ini menyerupai *outfit* nyata", ditampilkan sebagai persen | Dilatih dengan set Polyvore asli (1) vs *negative sampling* (0); dipakai terutama untuk **peringkat relatif**. |
| D-09 | Scorer diakses lewat antarmuka `OutfitScorer` dengan implementasi `BiLSTMScorer` dan cadangan `RuleBasedScorer` | Mitigasi risiko model; aplikasi tetap berjalan mulus dalam skenario apa pun. |
| D-10 | Taksonomi **4 slot**: `top`, `bottom`, `shoes`, `accessory`; jaket/sweater masuk slot `top` | Menyederhanakan urutan sekuens Bi-LSTM `[Atasan → Bawahan → Sepatu → Aksesoris]`. |
| D-11 | Pemetaan slot Polyvore memakai **`category_id.txt` + `categoryid`** (dengan fallback CNN) | Lebih cepat dan akurat dibanding menebak kategori item Polyvore hanya dari gambar. |

### 1.6 Metrik Keberhasilan MVP

**A. Kualitas model (diukur otomatis pada *test split* dataset publik)**

| ID | Metrik | Target | Cara ukur |
|---|---|---|---|
| M-01 | `article_type` *top-1 accuracy* | ≥ 88% | *Test split* Fashion Product Images (10%, stratified) |
| M-02 | `article_type` *macro-F1* | ≥ 0.78 | `sklearn.metrics.classification_report` |
| M-03 | `base_colour` *top-1 accuracy* | ≥ 78% | *Test split* Fashion Product Images |
| M-04 | `usage` *accuracy* / *macro-F1* | ≥ 75% / ≥ 0.55 | *Test split* Fashion Product Images |
| M-05 | Scorer: ROC-AUC / akurasi@0.5 | ≥ 0.80 / ≥ 0.72 | *Test split* resmi Polyvore (`test_no_dup.json`) dengan negatif campuran 40/30/30 |

**B. Kinerja sistem**

| ID | Metrik | Target |
|---|---|---|
| S-01 | Latensi `POST /items/analyze` (p95, CPU lokal, foto ≤ 3 MP) | ≤ 1,5 detik |
| S-02 | Latensi `POST /outfits/recommend` (p95, lemari 100 item, ≤ 1.500 kandidat) | ≤ 1,0 detik |
| S-03 | Waktu *startup* sampai `models_loaded = true` | ≤ 20 detik |
| S-04 | Total ukuran artefak model | ≤ 50 MB |

**C. Fungsional & Integrasi**

| ID | Metrik | Target |
|---|---|---|
| P-01 | Alur *end-to-end* (isi demo / unggah item → filter lemari → Mix & Match) | 100% berjalan tanpa *error* fatal |
| P-02 | Waktu dari foto dipilih sampai item tersimpan | ≤ 30 detik |

### 1.7 Asumsi dan Hal yang Wajib Diverifikasi

| ID | Asumsi | Kapan diverifikasi |
|---|---|---|
| A-01 | *Fashion Product Images (Small)* berisi folder `images/` dan `styles.csv` (~44.000 baris; folder duplikat `myntradataset` diabaikan/dihapus). Sebagian baris CSV rusak (wajib `on_bad_lines='skip'`) dan sebagian `id` tidak punya file gambar. | Hari 1 |
| A-02 | Skema Polyvore (`train_no_dup.json`, `valid_no_dup.json`, `test_no_dup.json` + `category_id.txt`): tiap entri JSON memiliki `set_id` dan daftar `items` (dengan `index`, `categoryid`, `name`); gambar di `images/{set_id}/{index}.jpg`. | Hari 1 |
| A-03 | Python **3.10–3.12**; versi mayor-minor TensorFlow/Keras **identik** antara lingkungan training (`ml/`) dan `backend/` (dicatat di `manifest.json`). | Hari 1 |
| A-04 | Jika skema Polyvore tidak cocok atau model Bi-LSTM belum konvergen dalam batas waktu, jalur cadangan `RuleBasedScorer` (§4.5.7) diaktifkan agar MVP tetap terkirim. | Hari 3–4 |

---

## 2. User Personas & User Flows

### 2.1 User Personas

| | **P1 — Pengguna Harian** | **P2 — Reviewer Teknis / Penguji** |
|---|---|---|
| **Peran** | Mahasiswa / pekerja yang ingin mengatur pakaian & mencari inspirasi *outfit* | Dosen penguji / *hiring manager* / developer |
| **Perangkat** | Laptop atau ponsel (browser modern) | Laptop |
| **Tujuan** | Mengunggah foto pakaian dengan cepat tanpa mengetik atribut manual, lalu melihat kombinasi *outfit* terbaik | Menilai arsitektur CNN + Bi-LSTM, kebersihan kode, dan kelancaran demo aplikasi web |
| **Pain point** | Malas mengisi form manual untuk puluhan baju; bingung memadukan warna & gaya | Demo gagal karena lemari kosong (*cold-start*) atau setup environment terlalu rumit |
| **Kebutuhan kunci** | Koreksi label 1-klik jika tebakan meleset; skor kecocokan yang mudah dipahami | Tombol **"Isi Contoh Pakaian Demo"** sekali klik; perintah jalankan lokal yang ringkas |

### 2.2 User Flow Utama (langkah demi langkah)

**Flow A — Unggah & Auto-Tagging**

| # | Aksi pengguna | Respons sistem |
|---|---|---|
| A1 | Membuka tab **Tambah** (`/upload`), memilih/memotret foto | Validasi *client-side* (tipe, ≤ 8 MB), tampilkan pratinjau |
| A2 | Menekan **Analisis** | `POST /items/analyze` → backend: koreksi rotasi EXIF → *square center-crop* & *resize* 128×128 → inferensi CNN → simpan berkas sementara + `temp_id` |
| A3 | — | UI menampilkan 3 *dropdown* terisi prediksi + *badge* *confidence* + 3 alternatif teratas |
| A4 | Memeriksa dan (opsional) mengoreksi label | Label berconfidence < 0,6 diberi tanda "Mohon periksa"; tombol **Simpan** aktif bila semua label valid |
| A5 | Menekan **Simpan** | `POST /items` → file dipindah ke `uploads/items/`, *thumbnail* dibuat, baris `items` + *embedding* disimpan |
| A6 | — | Notifikasi sukses; pilihan **Tambah lagi** atau **Lihat lemari** |

**Flow B — Menelusuri Virtual Closet & Demo Seed**

| # | Aksi pengguna | Respons sistem |
|---|---|---|
| B1 | Membuka tab **Lemari** (`/closet`) | `GET /items` → grid kartu + ringkasan jumlah per slot |
| B2 | *(Jika lemari kosong)* Menekan **Isi Contoh Pakaian Demo** | `POST /items/seed-demo` → backend menyalin 12 gambar sampel bawaan (`backend/demo_assets/`), mengekstrak *embedding* CNN, dan menyimpannya ke DB |
| B3 | Memilih filter kategori/warna/acara | Parameter URL berubah, daftar diperbarui |
| B4 | Menekan **Hapus** pada kartu → konfirmasi | `DELETE /items/{id}` → kartu hilang, berkas dihapus |
| B5 | Menekan **Padukan** pada kartu | Navigasi ke `/mix?anchor=<id>` |

**Flow C — Mix & Match Generator**

| # | Aksi pengguna | Respons sistem |
|---|---|---|
| C1 | Membuka tab **Mix & Match** (`/mix`) | Menampilkan *anchor picker* (item `top`/`bottom`/`shoes`) |
| C2 | Memilih 1 *anchor item* dan filter acara (default "Semua acara") | — |
| C3 | Menekan **Buat Rekomendasi** | `POST /outfits/recommend` → backend menyusun kandidat dari lemari → Bi-LSTM menghitung skor → peringkat |
| C4 | — | Menampilkan 3–5 kartu *outfit* (gambar tiap slot + skor persen + *progress bar*) |
| C5 | Mengganti *anchor*/filter lalu mengulang | Hasil diperbarui; kondisi lemari tidak lengkap menampilkan *empty state* dengan CTA |

### 2.3 Alur Alternatif & Pengecualian

| ID | Kondisi | Perilaku yang diharapkan |
|---|---|---|
| E-01 | File bukan gambar / format tidak didukung / > 8 MB | Pesan *inline* berbahasa Indonesia; tidak ada *request* (validasi *client*); server tetap menolak dengan 415/413 |
| E-02 | Prediksi `article_type = other` | Peringatan "Jenis pakaian belum didukung"; pengguna **wajib** memilih jenis yang didukung sebelum menyimpan |
| E-03 | *Confidence* < 0,6 pada suatu atribut | *Badge* kuning/merah dan teks "Mohon periksa" |
| E-04 | `temp_id` kedaluwarsa (> 24 jam) saat menyimpan | Pesan "Sesi analisis berakhir, silakan analisis ulang" |
| E-05 | Lemari belum memiliki slot yang dibutuhkan (mis. belum ada sepatu) | Rekomendasi tidak dijalankan; *empty state* menyebut slot yang kurang + tombol **Tambah sepatu** atau **Isi Data Demo** |
| E-06 | Filter acara menghilangkan seluruh item pada suatu slot | Pesan "Tidak ada [slot] untuk acara X" + saran **Semua acara** |
| E-07 | Backend/model belum siap (`503 MODEL_NOT_READY`) | *Banner* "Server sedang memuat model, coba lagi sebentar" dengan *retry* otomatis |
| E-08 | Foto *upside-down/rotated* dari kamera | EXIF dikoreksi otomatis sebelum inferensi |

**Status mesin *upload wizard*** (`useReducer`):

```
idle ──pilih foto──▶ preview ──Analisis──▶ analyzing ──200──▶ review ──Simpan──▶ saving ──201──▶ saved
  ▲                     │                      │ error            │ Ganti foto          │ error
  └─────────────────────┴──────────────────────┴──────────────────┴─────────────────────┘ (kembali ke idle/review)
```

---

## 3. Spesifikasi Kebutuhan Fungsional (Functional Requirements)

### 3.1 Upload & Auto-Tagging

| ID | Pri | Kebutuhan | Acceptance Criteria (terukur) |
|---|---|---|---|
| FR-UP-01 | P0 | Memilih/memotret foto pakaian | Menerima JPEG/PNG/WebP ≤ 8 MB. Format lain atau > 8 MB ditolak di *client* dengan pesan Indonesia; bila lolos ke server → `415 UNSUPPORTED_MEDIA_TYPE` / `413 FILE_TOO_LARGE`. Pada ponsel, `<input capture="environment">` membuka kamera. |
| FR-UP-02 | P0 | Analisis foto (`POST /items/analyze`) | Respons memuat `temp_id`, prediksi `article_type`/`base_colour`/`usage` masing-masing dengan `label`, `confidence` ∈ [0,1], dan `top_k` (3 alternatif). Foto ber-EXIF rotasi diproses dalam orientasi tegak. p95 ≤ 1,5 detik (S-01). |
| FR-UP-03 | P0 | Menampilkan hasil prediksi + *confidence* | Tiga *dropdown* terisi prediksi. *Badge*: hijau ≥ 0,85; kuning 0,60–0,85; merah < 0,60 dengan teks "Mohon periksa". Nilai ambang dibaca dari `/meta/labels.confidence_threshold`. |
| FR-UP-04 | P0 | Koreksi label manual | Pengguna dapat mengubah ketiga label; opsi berasal dari `GET /meta/labels`. Tombol **Simpan** nonaktif bila ada label kosong atau `article_type = other`. |
| FR-UP-05 | P0 | Menyimpan item (`POST /items`) | Baris `items` tercipta dengan `slot` hasil pemetaan `article_type`; `is_label_corrected = 1` bila ≥ 1 label final berbeda dari prediksi *top-1*; file gambar (maks. sisi panjang 1024 px) + *thumbnail* (320 px) ada di disk; *path* disimpan dengan *forward slash* (`.as_posix()`); *embedding* 256 `float32` tersimpan; item muncul di Lemari tanpa muat ulang halaman. |
| FR-UP-06 | P0 | Menangani jenis tidak didukung (`other`) | UI menampilkan peringatan dan memaksa pemilihan jenis yang didukung (E-02). |
| FR-UP-07 | P1 | Pratinjau, ganti foto & tips foto | Pratinjau muncul < 200 ms; tombol **Ganti foto** mereset *wizard*; panel tips singkat tampil di halaman unggah. |

### 3.2 Virtual Closet

| ID | Pri | Kebutuhan | Acceptance Criteria |
|---|---|---|---|
| FR-CL-01 | P0 | Grid kartu responsif | 2 kolom (< 640 px), 3 (≥ 640), 4 (≥ 1024), 5 (≥ 1280). Kartu memuat *thumbnail*, nama jenis (display Indonesia), *swatch* warna, *badge* acara. |
| FR-CL-02 | P0 | Filter kategori, warna, acara | Kategori = `slot` (Semua/Atasan/Bawahan/Sepatu/Aksesoris) dengan sub-filter `article_type` bergantung slot; warna = `base_colour`; acara = `usage`. Kombinasi filter bersifat **AND**; state filter tersinkron ke URL (`?slot=top&base_colour=black`). |
| FR-CL-03 | P0 | Hapus item | Dialog konfirmasi → `DELETE /items/{id}` → `204`. Baris DB **dan** file gambar + *thumbnail* terhapus. Jika file sudah hilang, operasi tetap sukses. UI menghapus kartu secara optimistik dan *rollback* bila gagal. |
| FR-CL-04 | P0 | Ringkasan lemari | Header menampilkan jumlah per slot (mis. "Atasan 8 · Bawahan 5 · Sepatu 3 · Aksesoris 0") dari `counts_by_slot` (dihitung **tanpa** filter). |
| FR-CL-05 | P0 | Isi contoh pakaian demo (`POST /items/seed-demo`) | Tombol **Isi Contoh Pakaian Demo** muncul saat lemari kosong (atau di header). Menekan tombol mengisi 12 item sampel siap pakai (4 atasan, 4 bawahan, 3 sepatu, 1 aksesoris) lengkap dengan gambar & *embedding* sehingga Mix & Match dapat langsung diuji. |
| FR-CL-06 | P1 | Tombol **Padukan** | Navigasi ke `/mix?anchor=<id>` dengan *anchor* terpilih. |

### 3.3 Mix & Match Generator

| ID | Pri | Kebutuhan | Acceptance Criteria |
|---|---|---|---|
| FR-MM-01 | P0 | Memilih *anchor item* | Hanya item slot `top`/`bottom`/`shoes` yang dapat dipilih; item `accessory` tampil nonaktif dengan *tooltip* "Aksesoris belum bisa jadi item utama". |
| FR-MM-02 | P0 | Filter acara | Opsi: Semua acara (default), `casual`, `smart_casual`, `formal`, `sports`, `party`. |
| FR-MM-03 | P0 | Menghasilkan rekomendasi | `POST /outfits/recommend` mengembalikan **3–5** kombinasi (≤ `top_k`) yang **unik**, terurut skor menurun. Setiap kombinasi memuat tepat 1 item per slot `top`, `bottom`, `shoes` dan **selalu** menyertakan *anchor*. Seluruh item berasal dari lemari pengguna. Jika kombinasi yang mungkin < 3, kembalikan semuanya (≥ 1) dengan `meta.warnings` berisi `FEWER_THAN_REQUESTED`. |
| FR-MM-04 | P0 | Skor kecocokan | `score` = keluaran sigmoid Bi-LSTM ∈ [0,1]; `score_percent = round(score × 100)` (integer 0–100). Urutan hasil selaras dengan `score`. Ditampilkan sebagai persen + *progress bar*. |
| FR-MM-05 | P0 | Validasi kelengkapan lemari | Bila slot yang dibutuhkan belum ada → `422 INSUFFICIENT_ITEMS` dengan `details.missing_slots`. UI menampilkan *empty state* sesuai slot yang kurang (§7.6). |
| FR-MM-06 | P0 | Penerapan filter acara | Item non-*anchor* difilter memakai matriks kompatibilitas `USAGE_COMPAT` (§4.3.4); `strict_usage = true` memakai kesamaan persis. Bila filter menghabiskan suatu slot → `422 NO_MATCH_FOR_USAGE`. *Anchor* yang tidak cocok dengan filter tetap dipakai dan memunculkan `warnings: ["ANCHOR_USAGE_MISMATCH"]`. |
| FR-MM-07 | P1 | Aturan keragaman & determinisme | Satu item non-*anchor* tidak muncul di > 2 dari Top-K rekomendasi (selama kandidat alternatif tersedia). *Request* identik menghasilkan urutan & skor identik. |
| FR-MM-08 | P1 | Latensi | p95 ≤ 1,0 detik untuk lemari 100 item (S-02); *embedding* dibaca dari DB, **tidak** menjalankan CNN ulang. |

### 3.4 Sistem & Lintas-Fitur

| ID | Pri | Kebutuhan | Acceptance Criteria |
|---|---|---|---|
| FR-SYS-01 | P0 | Model dimuat sekali saat *startup* | `lifespan` FastAPI memuat `tagger_infer.keras` dan `outfit_scorer.keras`, melakukan *warm-up* dengan input dummy; `GET /health` melaporkan `models_loaded`. Sebelum siap, endpoint ML → `503 MODEL_NOT_READY`. |
| FR-SYS-02 | P0 | Penyimpanan gambar lokal | File di `backend/uploads/{items,thumbs,tmp}/` dengan nama `uuid4().hex`; EXIF (termasuk GPS) dihapus; gambar disimpan sebagai JPEG kualitas 88; *path* di DB selalu memakai `/` (`.as_posix()`). |
| FR-SYS-03 | P0 | Format *error* konsisten | Semua *error* memakai *envelope* `{"error": {"code", "message", "details"}}` (§6.2), termasuk galat validasi Pydantic/FastAPI. |
| FR-SYS-04 | P0 | Label dari satu sumber | Backend & frontend membaca label dari `labels.json` (via `GET /meta/labels`); **tidak ada** daftar label ter-*hardcode* di luar `labels.yaml`. |
| FR-SYS-05 | P1 | *Scorer* cadangan | `SCORER_BACKEND=rules` mengaktifkan `RuleBasedScorer` tanpa mengubah kontrak API. |

### 3.5 Kebutuhan Non-Fungsional

| ID | Kategori | Kebutuhan |
|---|---|---|
| NFR-01 | Performa | Memenuhi S-01 s.d. S-04 (§1.6). |
| NFR-02 | Keamanan | Validasi isi gambar via Pillow; `Image.MAX_IMAGE_PIXELS = 50_000_000`; nama file acak; `temp_id` divalidasi regex `^[a-f0-9]{32}$`; `StaticFiles` hanya memetakan `uploads/`; CORS *whitelist* (`http://localhost:5173`); *bind* `127.0.0.1` secara default. |
| NFR-03 | Privasi | Seluruh data tersimpan lokal; EXIF dihapus; tidak ada telemetri pihak ketiga. |
| NFR-04 | Reliabilitas | Penyimpanan item atomik: tulis file → *commit* DB; bila DB gagal, file dihapus; bila file gagal, tidak ada baris DB. |
| NFR-05 | Kompatibilitas | Chrome/Edge/Firefox/Safari terbaru; Android Chrome & iOS Safari; *viewport* ≥ 360 px; kompatibel lintas OS (Windows/Linux/macOS) dengan normalisasi *path* `.as_posix()`. |
| NFR-06 | Portabilitas ML | Skrip `ml/` datar dan berjalan di lokal (`.venv`) maupun Google Colab hanya dengan mengubah variabel lingkungan (`SW_DATA_DIR`, `SW_ARTIFACT_DIR`). |
| NFR-07 | Reproduktibilitas | *Seed* 42; versi pustaka dipin; `manifest.json` mencatat versi TF/Keras, `sha256`, dan metrik. |
| NFR-08 | Testabilitas | `pytest` untuk `services/` dan endpoint utama + *golden test* paritas *preprocessing* (§4.6.3). |

---

## 4. Arsitektur & Pipeline Machine Learning

### 4.1 Gambaran Pipeline

```
 Kaggle Fashion Product Images (Small)
 styles.csv + images/
        │  (parse on_bad_lines='skip' → bersihkan → petakan label → cache uint8 128×128)
        ▼
 ┌───────────────────────────────┐
 │ MODEL 1: Multi-Output CNN     │──▶ tagger_infer.keras  (article_type, base_colour, usage, embedding[256])
 │ MobileNetV2 + 3 head          │
 └───────────────┬───────────────┘
                 │ dipakai ulang sebagai feature extractor
                 ▼
 Polyvore (train/valid/test_no_dup.json + category_id.txt + images/{set_id}/{index}.jpg)
        │  (petakan slot via category_id.txt → ekstrak embedding → susun outfit [top,bottom,shoes,(accessory)])
        │  (positif = set asli → 1 ; negative sampling → 0)
        ▼
 ┌───────────────────────────────┐
 │ MODEL 2: Bi-LSTM Scorer       │──▶ outfit_scorer.keras + scorer_meta.json
 │ Bidirectional(LSTM(128))      │
 └───────────────────────────────┘
        ▼
 Salin artefak → backend/models/  (labels.json + manifest.json + 2 file .keras + 12 sampel demo_assets)
```

### 4.2 Lingkungan Training & Portabilitas

**Prinsip:** kode ML disusun sebagai **skrip Python datar** di dalam folder `ml/` (`01_prepare_fashion.py`, `02_train_tagger.py`, `03_prepare_polyvore.py`, `04_train_scorer.py`, `05_export.py`, serta modul bersama `preprocess.py` dan `config_utils.py`). Tanpa `pyproject.toml` atau hierarki paket dalam agar mudah dijalankan langsung dari terminal lokal maupun sel Google Colab.

| Aspek | Ketentuan |
|---|---|
| Python | **3.10 – 3.12** (sesuai dukungan TensorFlow yang terpasang) |
| Dependensi | `ml/requirements.txt`: `tensorflow` (pin mayor.minor), `numpy`, `pandas`, `scikit-learn`, `pillow`, `pyyaml`, `matplotlib`, `tqdm` |
| Deteksi lingkungan | `config_utils.py`: path data/artefak dibaca dari env var `SW_DATA_DIR` (default `ml/data`) dan `SW_ARTIFACT_DIR` (default `ml/artifacts`). Di Colab cukup set `%env SW_DATA_DIR=...` ke Google Drive. |
| Konfigurasi | YAML di `ml/configs/` (`labels.yaml`, `tagger.yaml`, `scorer.yaml`); mendukung *override* CLI `--max-samples` dan `--epochs` untuk *smoke test* cepat di CPU lokal. |
| Reproduktibilitas | `keras.utils.set_random_seed(42)`; semua *split* disimpan sebagai file CSV/NPZ agar identik antar mesin. |
| Perangkat keras | CPU lokal: cocok untuk persiapan data (`01_`, `03_`) dan *smoke test* (`--max-samples 2000 --epochs 1`). **Training penuh disarankan di Google Colab (GPU T4).** |
| Sinkronisasi versi TF | Versi TF/Keras saat training dicatat di `manifest.json`; `backend/requirements.txt` **WAJIB** memakai versi *major.minor* yang sama. |

**Entry point CLI** (dijalankan dari direktori `ml/`, identik lokal & Colab):

```bash
python 01_prepare_fashion.py    # parse styles.csv, square-crop & cache 128px uint8, stratified splits
python 02_train_tagger.py       # training MobileNetV2 multi-output + evaluasi test split
python 03_prepare_polyvore.py   # mapping slot via category_id.txt + ekstraksi embedding CNN
python 04_train_scorer.py       # negative sampling + training Bi-LSTM + evaluasi test split
python 05_export.py --to ../backend/models --demo-dir ../backend/demo_assets --verify
```

### 4.3 Taksonomi Label

`ml/configs/labels.yaml` adalah **sumber tunggal**; `05_export.py` menghasilkan `labels.json` yang dipakai backend dan frontend. Nilai yang tidak terpetakan di dataset → di-*drop* (atau masuk `other` untuk `article_type`).

#### 4.3.1 `article_type` (23 kelas didukung + `other`)

| `key` | Tampilan (ID) | `slot` | `articleType` dataset |
|---|---|---|---|
| `tshirt` | Kaos | `top` | Tshirts |
| `shirt` | Kemeja | `top` | Shirts |
| `top` | Atasan / Blus | `top` | Tops |
| `sweatshirt` | Sweatshirt | `top` | Sweatshirts |
| `sweater` | Sweater | `top` | Sweaters |
| `jacket` | Jaket | `top` | Jackets |
| `jeans` | Jeans | `bottom` | Jeans |
| `trousers` | Celana Panjang | `bottom` | Trousers |
| `shorts` | Celana Pendek | `bottom` | Shorts |
| `skirt` | Rok | `bottom` | Skirts |
| `track_pants` | Celana Training | `bottom` | Track Pants |
| `casual_shoes` | Sepatu Kasual | `shoes` | Casual Shoes |
| `formal_shoes` | Sepatu Formal | `shoes` | Formal Shoes |
| `sports_shoes` | Sepatu Olahraga | `shoes` | Sports Shoes |
| `sandals` | Sandal | `shoes` | Sandals |
| `flip_flops` | Sandal Jepit | `shoes` | Flip Flops |
| `heels` | Sepatu Hak Tinggi | `shoes` | Heels |
| `flats` | Sepatu Flat | `shoes` | Flats |
| `watch` | Jam Tangan | `accessory` | Watches |
| `belt` | Ikat Pinggang | `accessory` | Belts |
| `handbag` | Tas Tangan | `accessory` | Handbags |
| `backpack` | Ransel | `accessory` | Backpacks |
| `sunglasses` | Kacamata Hitam | `accessory` | Sunglasses |
| `other` | Belum Didukung | *(tidak ada)* | Semua `articleType` lain, di-*sampling* maks. ~4.000 gambar (mis. Kurtas, Dresses, Briefs, Perfume) |

Kelas `other` membuat model dapat menolak objek non-pakaian atau pakaian yang belum didukung (E-02). Kelas minoritas yang wajib dipertahankan seperti `skirt` dan `jacket` dijaga dengan bobot sampel + augmentasi.

#### 4.3.2 `base_colour` (14 kelas, konsolidasi keluarga warna)

| `key` | Tampilan (ID) | Contoh nilai `baseColour` dataset yang dipetakan | Hex *swatch* |
|---|---|---|---|
| `black` | Hitam | Black | `#111827` |
| `white` | Putih | White, Off White | `#F9FAFB` |
| `grey` | Abu-abu | Grey, Grey Melange, Charcoal, Silver, Steel | `#9CA3AF` |
| `navy_blue` | Biru Dongker | Navy Blue | `#1E2A5A` |
| `blue` | Biru | Blue, Turquoise Blue, Teal | `#2563EB` |
| `brown` | Cokelat | Brown, Coffee Brown, Taupe, Mushroom Brown, Rust | `#7C4A2D` |
| `beige` | Krem / Beige | Beige, Cream, Nude, Skin, Khaki, Tan | `#E7D8BE` |
| `red` | Merah | Red, Maroon, Burgundy | `#DC2626` |
| `green` | Hijau | Green, Olive, Sea Green, Lime Green | `#16A34A` |
| `pink` | Merah Muda | Pink, Rose, Peach | `#F472B6` |
| `yellow` | Kuning | Yellow, Mustard, Gold | `#FACC15` |
| `orange` | Oranye | Orange | `#F97316` |
| `purple` | Ungu | Purple, Lavender, Mauve, Magenta | `#7C3AED` |
| `multi` | Multiwarna | Multi | `linear-gradient` |

#### 4.3.3 `usage` (5 kelas)

| `key` | Tampilan (ID) | Nilai `usage` dataset |
|---|---|---|
| `casual` | Kasual | Casual, Travel |
| `smart_casual` | Smart Casual | Smart Casual |
| `formal` | Formal | Formal |
| `sports` | Olahraga | Sports |
| `party` | Pesta | Party |

Baris dengan `usage` ∈ {Ethnic, Home} atau kosong **tidak dibuang** dari dataset; label `usage`-nya di-*mask* (`sample_weight = 0` pada *head* `usage`) sehingga tetap berkontribusi pada dua *head* lain.

#### 4.3.4 Matriks Kompatibilitas Acara (`USAGE_COMPAT`)

Dipakai pada Mix & Match (FR-MM-06) agar lemari kecil tidak menghasilkan hasil kosong. Konstanta ini berada di `backend/app/core/labels.py`.

| Filter pengguna | Item non-*anchor* yang lolos (mode default) |
|---|---|
| `casual` | `casual`, `smart_casual` |
| `smart_casual` | `smart_casual`, `casual`, `formal` |
| `formal` | `formal`, `smart_casual` |
| `sports` | `sports`, `casual` |
| `party` | `party`, `smart_casual`, `formal` |
| *(kosong / semua acara)* | semua |

#### 4.3.5 Format `labels.json`

```json
{
  "version": "labels-v1",
  "article_type": ["tshirt", "shirt", "...", "other"],
  "base_colour": ["black", "white", "...", "multi"],
  "usage": ["casual", "smart_casual", "formal", "sports", "party"],
  "article_to_slot": { "tshirt": "top", "jeans": "bottom", "casual_shoes": "shoes", "watch": "accessory" },
  "display": {
    "article_type": { "tshirt": "Kaos" },
    "base_colour": { "navy_blue": { "name": "Biru Dongker", "hex": "#1E2A5A" } },
    "usage": { "smart_casual": "Smart Casual" },
    "slot": { "top": "Atasan", "bottom": "Bawahan", "shoes": "Sepatu", "accessory": "Aksesoris" }
  },
  "usage_compat": { "casual": ["casual", "smart_casual"] }
}
```

**Urutan array = urutan indeks output softmax.** Mengubah urutan/isi label berarti model **WAJIB** dilatih ulang dan `labels-vN` dinaikkan.

### 4.4 Model 1 — Multi-Output CNN Auto-Tagger & Feature Extractor

#### 4.4.1 Dataset & Preprocessing

1. **Parsing:** `pd.read_csv(styles_csv, on_bad_lines="skip")` (**wajib**; sebagian baris memiliki jumlah kolom tidak konsisten). Gunakan hanya kolom `id`, `gender`, `articleType`, `baseColour`, `usage`.
2. **Pembersihan:** *drop* baris tanpa `articleType`/`baseColour`; *drop* baris yang file `images/{id}.jpg`-nya tidak ada atau rusak; `exclude_gender: [Boys, Girls]` (default aktif).
3. **Pemetaan label:** terapkan tabel §4.3 → `article_type` (dengan `other`), `base_colour` (14 keluarga), `usage` (5 kelas; sisanya = *masked*).
4. **Split:** 80/10/10 *stratified* menurut `article_type` (`random_state=42`), disimpan ke `data/processed/splits/{train,val,test}.csv`.
5. **Cache gambar:** semua gambar diproses **sekali** dengan fungsi `preprocess_pil()` (§4.6.3) → `uint8` 128×128×3 dan ditulis ke `data/processed/fashion_128.npy` (*memmap*, ≈ 1,7 GB untuk ~35 ribu gambar). Menjamin paritas persis dengan backend dan mempercepat I/O training.
6. **`tf.data`:** berbasis indeks → `shuffle(10_000, seed=42)` → `batch(B)` → `prefetch(AUTOTUNE)`.

#### 4.4.2 Data Augmentation (agar tahan variasi foto dunia nyata)

| Teknik | Parameter | Catatan |
|---|---|---|
| `RandomFlip("horizontal")` | — | Aman untuk semua kelas. |
| `RandomRotation` | `factor=0.04` (≈ ±14°) | Rotasi ringan. |
| `RandomZoom` | `height_factor=(-0.15, 0.15)` | Simulasi jarak foto bervariasi. |
| `RandomTranslation` | `0.08, 0.08`, `fill_mode="reflect"` | Objek tidak selalu di tengah. |
| `RandomBrightness` | `factor=0.25`, `value_range=(0, 255)` | Simulasi pencahayaan ruangan vs luar. |
| `RandomContrast` | `factor=0.25` | — |
| **Degradasi resolusi** (`tf.data.map`, p = 0,5) | *resize* acak ke 45–100% lalu kembali ke 128 | Menyamakan karakteristik tekstur gambar katalog beresolusi rendah vs foto tajam. |
| **Latar bising** (`tf.data.map`, p = 0,3) | *pad* acak 0–15% dengan warna netral/acak, lalu *resize* | Mengurangi ketergantungan pada latar putih katalog. |

**Larangan:** **jangan** memakai augmentasi *hue*, *saturation*, atau *grayscale* karena merusak label `base_colour`. Augmentasi hanya aktif saat `training=True` (layer Keras otomatis menjadi *no-op* saat inferensi).

#### 4.4.3 Arsitektur (Keras Functional API)

| # | Layer | Output shape | Keterangan |
|---|---|---|---|
| 1 | `Input(name="image")` | (128,128,3) | `float32`, RGB, **0–255** |
| 2 | Augmentation (Sequential) | (128,128,3) | Aktif hanya saat training |
| 3 | `Rescaling(1/127.5, offset=-1)` `name="preprocess"` | (128,128,3) | Setara `mobilenet_v2.preprocess_input` |
| 4 | `MobileNetV2(include_top=False, weights="imagenet")` | (4,4,1280) | *Backbone* tunggal bersama |
| 5 | `GlobalAveragePooling2D` | (1280) | — |
| 6 | `Dropout(0.3)` | (1280) | — |
| 7 | `Dense(256, relu)` `name="embedding"` | **(256)** | **Vektor fitur visual** (*feature extractor*) |
| 8 | `Dropout(0.3)` | (256) | — |
| 9a | `Dense(N_article, softmax)` `name="article_type"` | (24) | *Head* 1 |
| 9b | `Dense(N_colour, softmax)` `name="base_colour"` | (14) | *Head* 2 |
| 9c | `Dense(N_usage, softmax)` `name="usage"` | (5) | *Head* 3 |

#### 4.4.4 Strategi Training, Loss Function & Metrics

**Konfigurasi (`ml/configs/tagger.yaml`)**

```yaml
seed: 42
img_size: [128, 128]
backbone: mobilenetv2
embedding_dim: 256
dropout: 0.3
batch_size: 128              # 64 bila CPU
phase1: { epochs: 8,  lr: 1.0e-3 }                       # backbone beku
phase2: { epochs: 12, lr: 2.0e-5, unfreeze_last_layers: 30 }   # BatchNorm tetap beku
loss_weights: { article_type: 1.0, base_colour: 0.6, usage: 0.4 }
class_weight_power: 0.5      # bobot = (N/(K·n_c))^0.5, dinormalisasi mean=1, clip [0.3, 5]
exclude_gender: [Boys, Girls]
other_class_max_samples: 4000
```

| Komponen | Ketentuan |
|---|---|
| **Fase 1** | *Backbone* beku; latih *embedding* + 3 *head* (`Adam`, lr 1e-3). |
| **Fase 2** | *Unfreeze* 30 layer terakhir *backbone* **kecuali** `BatchNormalization`; `Adam` lr 2e-5. |
| **Loss** | `sparse_categorical_crossentropy` per *head*, digabung dengan `loss_weights` di atas. |
| **Mask label tidak valid** | `sample_weight = 0` pada *head* terkait (mis. `usage = Ethnic`). |
| **Metrics** | `accuracy` per *head*; evaluasi offline menghitung *macro-F1* dan *confusion matrix* pada *test split*. |
| **Callbacks** | `EarlyStopping(val_loss, patience=4, restore_best_weights=True)`, `ReduceLROnPlateau(factor=0.3, patience=2)`, `ModelCheckpoint`. |

#### 4.4.5 Penanganan *Class Imbalance*

1. **Bobot sampel** per *head* memakai akar terbalik frekuensi `(N / (K * n_c))^0.5` yang di-*clip* `[0.3, 5.0]`.
2. **Konsolidasi kelas:** warna dikelompokkan jadi 14 keluarga; `Travel → casual`.
3. ***Oversampling* kelas minoritas** (seperti `skirt`, `jacket`) hingga minimal 400 sampel efektif per *epoch*, dipadukan dengan augmentasi.
4. **Cap kelas `other`** (maks. 4.000 gambar) agar tidak mendominasi.

### 4.5 Model 2 — Bi-LSTM Outfit Compatibility Scorer

**Ide:** sebuah *outfit* adalah sekuens vektor *embedding* visual dalam urutan atas → bawah `[Atasan → Bawahan → Sepatu → Aksesoris (opsional)]`. Bi-LSTM membaca sekuens dua arah dan mengeluarkan probabilitas bahwa kombinasi tersebut menyerupai *outfit* nyata (Polyvore).

#### 4.5.1 Dataset & Parsing (`03_prepare_polyvore.py`)

- Berkas: `train_no_dup.json`, `valid_no_dup.json`, `test_no_dup.json`, `category_id.txt`, dan folder gambar `images/{set_id}/{index}.jpg` di `ml/data/raw/polyvore/`.
- Gunakan *split* resmi (`train`, `valid`, `test`) tanpa kebocoran antar *split*. Kumpulan item untuk *negative sampling* **hanya** diambil dari *split* yang sama.

#### 4.5.2 Penentuan Slot via `category_id.txt` & Ekstraksi *Embedding*

1. **Pemetaan Slot Berbasis `category_id.txt` (Utama):**
   Baca `category_id.txt` (format `<category_id> <nama_kategori>`) dan petakan ke 4 slot MVP (`top`, `bottom`, `shoes`, `accessory`) berdasarkan kata kunci kategori:
   - `top`: *tops, t-shirts, shirts, blouses, sweaters, sweatshirts, jackets, coats, hoodies, cardigans, blazers*
   - `bottom`: *jeans, pants, trousers, shorts, skirts, leggings*
   - `shoes`: *shoes, sneakers, boots, sandals, heels, flats, loafers, pumps*
   - `accessory`: *bags, handbags, backpacks, watches, belts, sunglasses, hats, scarves*
   - Kategori non-pakaian (seperti *furniture, makeup, nail polish, home decor*) langsung diabaikan.
2. **Fallback CNN:** Jika suatu item memiliki `categoryid` yang tidak terdaftar di `category_id.txt`, gunakan prediksi `article_type` dari `tagger_infer.keras` (jika `confidence ≥ 0,6` dan ≠ `other`).
3. **Menyusun *outfit*:** pilih **satu item per slot** dalam setiap `set_id`. Positif **wajib** memiliki minimal 3 slot inti (`top`, `bottom`, `shoes`) agar sebentuk dengan rekomendasi aplikasi; `accessory` bersifat opsional.
4. **Ekstraksi *Embedding*:** jalankan `tagger_infer.keras` pada setiap gambar item terpilih menggunakan `preprocess_pil()` yang identik dengan backend, lalu simpan ke `polyvore_embeddings.npz`.

#### 4.5.3 *Negative Sampling*

Rasio **positif : negatif = 1 : 1**. Positif (kelas `1`) = *outfit* asli Polyvore. Negatif (kelas `0`) dibangkitkan **dinamis tiap *epoch*** untuk *train*, dan **tetap** (*seed* 1234) untuk *valid/test*:

| Tipe | Porsi | Cara membuat | Tujuan |
|---|---|---|---|
| `random` (mudah) | 40% | Untuk tiap slot, ambil item acak dari *outfit* yang berbeda-beda | Mengajarkan pemisahan dasar |
| `replace_one` (sulit) | 30% | Ambil *outfit* positif, ganti **1** slot inti dengan item slot yang sama dari *outfit* lain | Memaksa model menilai pasangan |
| `replace_two` (menengah) | 30% | Ganti **2** slot inti | Variasi tingkat kesulitan |

Aturan tambahan: (a) negatif tidak boleh identik dengan *outfit* asli mana pun; (b) kehadiran slot `accessory` pada negatif meniru positif sumbernya agar keberadaan aksesoris tidak menjadi *shortcut*.

#### 4.5.4 Pembentukan Sekuens & Standardisasi

- Tensor input `X ∈ ℝ^{B×4×256}`; urutan slot tetap `[top, bottom, shoes, accessory]`. Slot `accessory` kosong diisi **vektor nol** (di-*mask*).
- **Standardisasi *z-score* per dimensi** `(e − mean) / (std + 1e-6)` memakai statistik dari *embedding* item *train*; `emb_mean` dan `emb_std` disimpan di `scorer_meta.json` dan **diterapkan di luar model** (numpy) *sebelum* *padding* nol agar layer `Masking` berfungsi akurat.

#### 4.5.5 Arsitektur

| # | Layer | Output | Keterangan |
|---|---|---|---|
| 1 | `Input(name="outfit_seq")` | (4,256) | *Embedding* terstandardisasi |
| 2 | `Masking(mask_value=0.0)` | (4,256) | Mengabaikan slot kosong |
| 3 | `Bidirectional(LSTM(128))` | (256) | Dua arah → 2×128; `return_sequences=False` |
| 4 | `Dropout(0.3)` | (256) | — |
| 5 | `Dense(1, activation="sigmoid")` `name="compat_score"` | (1) | Probabilitas kecocokan ∈ [0,1] → ×100 = persen |

```python
def build_scorer(max_len=4, emb_dim=256, units=128, dropout=0.3):
    inp = keras.Input(shape=(max_len, emb_dim), name="outfit_seq")
    x = layers.Masking(mask_value=0.0, name="mask")(inp)
    x = layers.Bidirectional(layers.LSTM(units), name="bilstm")(x)
    x = layers.Dropout(dropout)(x)
    out = layers.Dense(1, activation="sigmoid", name="compat_score")(x)
    model = keras.Model(inp, out, name="sw_outfit_scorer")
    model.compile(
        optimizer=keras.optimizers.Adam(1e-3),
        loss="binary_crossentropy",
        metrics=["accuracy", keras.metrics.AUC(name="auc")],
    )
    return model
```

#### 4.5.6 Training & Evaluasi

**Konfigurasi (`ml/configs/scorer.yaml`)**

```yaml
seed: 42
max_len: 4
slot_order: [top, bottom, shoes, accessory]
units: 128
dropout: 0.3
batch_size: 128
epochs: 35
lr: 1.0e-3
neg_ratio: 1.0
neg_mix: { random: 0.4, replace_one: 0.3, replace_two: 0.3 }
```

| Komponen | Ketentuan |
|---|---|
| **Loss & Metrics** | `binary_crossentropy`, `accuracy`, `AUC` (utama) |
| **Callbacks** | `EarlyStopping(val_auc, mode="max", patience=5, restore_best_weights=True)`, `ReduceLROnPlateau(val_auc, factor=0.5, patience=2)` |
| **Evaluasi test** | ROC-AUC & akurasi@0,5 pada `test_no_dup.json` (total dan per tipe negatif `random`/`replace_one`/`replace_two`). |
| **Pita skor UI** | Ambang default disimpan di `scorer_meta.json` (`score_bands`: `very_compatible >= 0.75`, `compatible >= 0.50`, `low < 0.50`). |

#### 4.5.7 Skor Cadangan Berbasis Aturan (`RuleBasedScorer`)

Dipakai bila `SCORER_BACKEND=rules` diaktifkan (A-04, FR-SYS-05). Mengimplementasikan antarmuka `OutfitScorer.score_batch(combos) -> np.ndarray` yang sama dengan `BiLSTMScorer`:

- Skor dasar `0,50`.
- `+0,15` bila ≥ 2 dari 3 item berwarna netral (`black, white, grey, navy_blue, beige, brown`).
- `−0,20` bila terdapat ≥ 3 warna non-netral berbeda.
- `+0,15` bila ketiga `usage` identik; `+0,05` bila saling kompatibel menurut `USAGE_COMPAT`; `−0,25` bila ada konflik (`sports` ↔ `formal`).
- `−0,10` bila `formal_shoes` dipadukan dengan atasan `usage = sports` (dan sebaliknya).
- Hasil di-*clip* ke `[0,05; 0,95]`.

### 4.6 Ekspor Model & Kontrak ML ↔ Backend

#### 4.6.1 Artefak Ekspor (`05_export.py --to ../backend/models`)

| File / Folder | Isi |
|---|---|
| `tagger_infer.keras` | Input `image` (B,128,128,3; 0–255) → output dict `article_type`, `base_colour`, `usage` (softmax) dan `embedding` (B,256) |
| `outfit_scorer.keras` | Input `outfit_seq` (B,4,256) → `compat_score` (B,1) |
| `labels.json` | Taksonomi & tampilan (§4.3.5) |
| `scorer_meta.json` | `slot_order`, `max_len`, `embedding_dim`, `emb_mean[256]`, `emb_std[256]`, `requires_tagger`, `score_bands` |
| `manifest.json` | Versi, `sha256`, metrik ringkas, versi TF/Keras |
| `backend/demo_assets/` | 12 gambar sampel katalog pilihan (4 `top`, 4 `bottom`, 3 `shoes`, 1 `accessory`) + `demo_manifest.json` untuk fitur tombol **Isi Contoh Pakaian Demo** |

#### 4.6.2 Paritas *Preprocessing* (*Square Center-Crop*) & *Golden Test*

Fungsi kanonik (diimplementasikan **identik** di `ml/preprocess.py` dan `backend/app/services/image_service.py`):

```python
from PIL import Image, ImageOps
import numpy as np

def preprocess_pil(img: Image.Image, size: int = 128) -> np.ndarray:
    img = ImageOps.exif_transpose(img).convert("RGB")
    # Square center-crop agar objek foto kamera (4:3 atau 16:9) tetap proporsional
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    return np.asarray(img, dtype=np.uint8)  # (128, 128, 3)
```

***Golden test*:** `05_export.py --verify` menyimpan 5 gambar sampel + keluaran (probabilitas & *embedding*) ke `backend/tests/golden/`. Tes backend memuat model, memproses gambar yang sama, dan memastikan selisih maksimum `< 1e-4` (probabilitas) dan *cosine similarity* *embedding* `> 0,999`.

### 4.7 Inferensi di Backend

- **`MLService`** dibuat di `lifespan` dan disimpan di `app.state.ml`: memuat kedua model, `labels.json`, `scorer_meta.json`; *warm-up* satu *forward pass* dummy.
- `analyze(image) -> TaggerResult`: `preprocess_pil` → `tagger(batch, training=False)` → `top_k` per *head* + `embedding`.
- `score(sequences: np.ndarray[N,4,256]) -> np.ndarray[N]` dengan `batch_size=256`.
- Endpoint yang memanggil TensorFlow dideklarasikan **`def`** (bukan `async def`) agar dijalankan FastAPI pada *threadpool* dan tidak memblokir *event loop*.
- Satu *worker* `uvicorn` (`--workers 1`) agar model tidak dimuat berkali-kali.

---

## 5. Arsitektur Sistem & Desain Database

### 5.1 Diagram Arsitektur

```
┌───────────────────────────── Browser (PC / HP) ─────────────────────────────┐
│  React 18 + Vite + TypeScript + Tailwind CSS                                 │
│  Rute: /closet   /upload   /mix        State server: TanStack Query          │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │ HTTP/JSON + multipart   (dev: Vite proxy /api, /uploads → :8000)
┌───────────────────────────────▼──────────────────────────────────────────────┐
│  FastAPI (uvicorn, 1 worker)                                                  │
│  Router : health │ meta │ items │ outfits           Static: /uploads          │
│  Service: ImageService  ItemService  OutfitService  MLService                 │
│           └─ OutfitScorer (BiLSTMScorer | RuleBasedScorer)                    │
│  lifespan: muat model .keras sekali → warm-up → app.state.ml                  │
└───────┬───────────────────────────┬──────────────────────────┬───────────────┘
        │ SQLAlchemy 2.0            │ filesystem               │ in-process (TensorFlow/Keras)
┌───────▼──────────┐   ┌────────────▼────────────┐   ┌─────────▼──────────────────┐
│ SQLite (WAL)     │   │ backend/uploads/        │   │ backend/models/            │
│ smartwardrobe.db │   │   items/  thumbs/  tmp/ │   │  tagger_infer.keras        │
│ users, items     │   └─────────────────────────┘   │  outfit_scorer.keras       │
└──────────────────┘                                 │  labels.json, scorer_meta  │
                                                     │  manifest.json             │
                                                     └────────────────────────────┘
```

### 5.2 Tanggung Jawab Komponen

| Komponen | Tanggung jawab | Tidak boleh |
|---|---|---|
| `api/v1/*` (router) | Validasi *request* (Pydantic), memanggil service, memetakan *error* ke *envelope* | Berisi logika bisnis/ML |
| `ImageService` | Validasi gambar, koreksi EXIF, *strip* metadata, simpan/hapus berkas (`.as_posix()`), *thumbnail*, `preprocess_pil` | Mengakses DB |
| `MLService` | Memuat model, `analyze`, `score`, pemeriksaan `manifest` | Mengakses DB atau filesystem upload |
| `ItemService` | CRUD item, *seed demo*, pemetaan `article_type → slot`, (de)serialisasi *embedding* | Memanggil TensorFlow |
| `OutfitService` | Generasi kandidat, filter `USAGE_COMPAT`, pemanggilan `OutfitScorer`, peringkat + aturan keragaman | Menyimpan file |
| `core/labels.py` | Memuat `labels.json`, konstanta `USAGE_COMPAT`, `CONFIDENCE_THRESHOLD` | Daftar label *hardcoded* |

### 5.3 Diagram Urutan

**Upload & Auto-Tagging**

```
Browser            FastAPI                     ImageService / MLService            Disk / DB
  │ POST /items/analyze (multipart) │                       │                          │
  ├────────────────────────────────▶│ validasi tipe+ukuran  │                          │
  │                                 ├──────────────────────▶│ decode, EXIF, preprocess │
  │                                 │                       │ tagger(batch)            │
  │                                 │◀──────────────────────┤ probs + embedding        │
  │                                 ├─ tulis tmp/{temp_id}.jpg + .json + .npy ────────▶│
  │◀──── 200 {temp_id, predictions, ...} ──────────────────┤                          │
  │ (pengguna mengoreksi label)     │                       │                          │
  │ POST /items {temp_id, labels}   │                       │                          │
  ├────────────────────────────────▶│ baca tmp → pindah ke items/ + thumbs/ ─────────▶│
  │                                 ├─ INSERT items (embedding BLOB, posix path) ─────▶│
  │◀──── 201 {item} ────────────────┤                       │                          │
```

**Mix & Match**

```
Browser                FastAPI / OutfitService                        Scorer              DB
  │ POST /outfits/recommend │                                           │                 │
  ├────────────────────────▶│ ambil anchor + item slot lain (embedding) ───────────────────▶│
  │                         │ filter USAGE_COMPAT → produk kartesius (cap 1.500)            │
  │                         │ susun X[N,4,256] (standardisasi + padding)                    │
  │                         ├──────────────────────────────────────────▶│ score_batch      │
  │                         │◀──────────────────────────────────────────┤ N skor           │
  │                         │ urutkan, aturan keragaman, ambil top_k ───────────────────────▶│
  │◀── 200 {recommendations, meta} ─┤                                   │                 │
```

**Algoritma kandidat (acuan implementasi `OutfitService.recommend`)**

```python
CORE = ("top", "bottom", "shoes")

def recommend(anchor, usage, top_k, strict_usage, include_accessory):
    if anchor.slot not in CORE:
        raise ApiError(422, "ANCHOR_SLOT_UNSUPPORTED")
    needed = [s for s in CORE if s != anchor.slot]
    closet = items_by_slot(user_id)                                  # sekali query
    if missing := [s for s in needed if not closet[s]]:
        raise ApiError(422, "INSUFFICIENT_ITEMS", details={"missing_slots": missing})
    pools = {s: [i for i in closet[s] if usage_ok(i.usage, usage, strict_usage)] for s in needed}
    if missing := [s for s in needed if not pools[s]]:
        raise ApiError(422, "NO_MATCH_FOR_USAGE", details={"missing_slots": missing, "usage": usage})
    combos = list(itertools.product(*(pools[s] for s in needed)))   # tiap elemen = 2 item non-anchor
    if len(combos) > MAX_CANDIDATES:                                 # 1.500
        combos = random.Random(hash((anchor.id, usage))).sample(combos, MAX_CANDIDATES)
    outfits = [assemble_in_slot_order(anchor, c) for c in combos]    # [top, bottom, shoes]
    if include_accessory and closet["accessory"]:
        outfits = extend_with_best_accessory(outfits, closet["accessory"])
    scores = scorer.score_batch(outfits)
    ranked = sorted(zip(outfits, scores), key=lambda t: (-t[1], tuple(i.id for i in t[0])))
    return diversify(ranked, top_k, max_item_repeat=2)               # FR-MM-07
```

### 5.4 Keputusan Pemilihan Database

**Kebutuhan data MVP:** ≤ ~1.000 baris `items`, satu pengguna, satu proses backend, *embedding* 256-d (1 KB) yang hanya dibaca ke memori untuk dihitung oleh Bi-LSTM (tidak ada pencarian kemiripan di sisi DB).

| Kriteria | SQLite | PostgreSQL |
|---|---|---|
| Setup | **Nol konfigurasi** (satu file `.db`, bawaan Python) | Perlu *server*/Docker, kredensial, migrasi awal |
| Waktu penyiapan | Menit | Jam (instalasi, koneksi, *troubleshooting*) |
| Penyimpanan *embedding* | `BLOB` `float32` (1.024 B) | `BYTEA` atau **`JSONB`** (± 5–6 KB sebagai teks JSON) atau `pgvector` |
| Query di dalam *embedding* | Tidak ada (tidak dibutuhkan MVP) | `JSONB` operator / `pgvector` ANN (berguna untuk v2: "cari item mirip") |
| Konkurensi tulis | Satu penulis (cukup untuk 1 pengguna; WAL membantu pembacaan paralel) | Banyak penulis, MVCC |
| Skalabilitas / multi-user / cloud | Terbatas | **Unggul** |
| Backup / portabilitas | Salin satu file | `pg_dump` |
| Pengujian | Mudah (`:memory:`) | Perlu instans uji |
| Risiko jadwal 7 hari | **Sangat rendah** | Sedang |

**Rekomendasi final: SQLite** (mode WAL, `foreign_keys=ON`) melalui **SQLAlchemy 2.0**.

Alasan: (1) kebutuhan MVP sepenuhnya terpenuhi tanpa fitur PostgreSQL; (2) keunggulan `JSONB` tidak terpakai karena *embedding* tidak di-*query* di dalam DB; (3) `BLOB float32` lebih ringkas ± 5× dan lebih cepat dibaca daripada JSON; (4) jadwal 1 minggu menuntut risiko operasional minimum; (5) karena akses data melalui SQLAlchemy dan semua kolom bertipe portabel, **migrasi ke PostgreSQL di v2 cukup mengganti `DATABASE_URL`**.

### 5.5 Skema Database (DDL SQLite)

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- 5.5.1 Pengguna (MVP: satu baris implisit, tanpa autentikasi)
CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT 'Guest',
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT OR IGNORE INTO users (id, display_name) VALUES (1, 'Guest');

-- 5.5.2 Item lemari
CREATE TABLE IF NOT EXISTS items (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,

    -- berkas (WAJIB forward slash .as_posix() relatif terhadap UPLOAD_DIR; contoh: items/6f1c9a....jpg)
    image_path            TEXT    NOT NULL,
    thumb_path            TEXT    NOT NULL,
    image_width           INTEGER NOT NULL,
    image_height          INTEGER NOT NULL,

    -- label final (setelah koreksi pengguna)
    slot                  TEXT    NOT NULL CHECK (slot IN ('top','bottom','shoes','accessory')),
    article_type          TEXT    NOT NULL,
    base_colour           TEXT    NOT NULL,
    usage                 TEXT    NOT NULL,

    -- prediksi asli model (audit & metrik koreksi)
    pred_article_type     TEXT,   pred_article_type_conf REAL,
    pred_base_colour      TEXT,   pred_base_colour_conf  REAL,
    pred_usage            TEXT,   pred_usage_conf        REAL,
    is_label_corrected    INTEGER NOT NULL DEFAULT 0 CHECK (is_label_corrected IN (0,1)),

    -- embedding visual: float32 little-endian, 256 dimensi = 1024 byte
    embedding             BLOB    NOT NULL,
    embedding_dim         INTEGER NOT NULL,
    model_version         TEXT    NOT NULL,           -- mis. 'tagger-v1.0.0'

    created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

    CHECK (length(embedding) = embedding_dim * 4)
);
CREATE INDEX IF NOT EXISTS idx_items_user_slot    ON items(user_id, slot);
CREATE INDEX IF NOT EXISTS idx_items_user_filters ON items(user_id, article_type, base_colour, usage);
CREATE INDEX IF NOT EXISTS idx_items_user_created ON items(user_id, created_at DESC);
```

**Aturan data**

- **Normalisasi Path Windows:** Semua kolom `image_path` dan `thumb_path` **WAJIB** dikonversi menggunakan `Path(...).as_posix()` sebelum disimpan ke SQLite agar pemisah direktori selalu `/` (tidak pernah `\`).
- `slot` **diturunkan** dari `article_type` melalui `article_to_slot` (backend), tidak dapat dikirim klien.
- Nilai `article_type`/`base_colour`/`usage` divalidasi di aplikasi terhadap `labels.json`.
- `is_label_corrected = 1` jika ≥ 1 label final ≠ prediksi *top-1*.
- Pembuatan skema pada MVP: `Base.metadata.create_all()` saat *startup*.

**Helper (de)serialisasi *embedding***

```python
import numpy as np

def emb_to_blob(v: np.ndarray) -> bytes:
    a = np.asarray(v, dtype="<f4")
    assert a.ndim == 1
    return a.tobytes()

def blob_to_emb(b: bytes, dim: int) -> np.ndarray:
    a = np.frombuffer(b, dtype="<f4")
    assert a.shape == (dim,)
    return a
```

### 5.6 Tata Letak Penyimpanan File

```
backend/uploads/
├── items/    <uuid4hex>.jpg     # maks. sisi panjang 1024 px, JPEG q=88, tanpa EXIF
├── thumbs/   <uuid4hex>.jpg     # sisi panjang 320 px
└── tmp/      <temp_id>.jpg  <temp_id>.json  <temp_id>.npy   # hasil analyze, TTL 24 jam
```

`image_url = "/uploads/" + image_path`. Setelah `POST /items`, file `tmp/` dipindah (`os.replace`) menjadi `items/<uuid>.jpg`; *thumbnail* dibuat saat itu.

### 5.7 Konfigurasi (variabel lingkungan)

| Variabel | Default | Keterangan |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./smartwardrobe.db` | Ganti ke `postgresql+psycopg://...` pada v2 |
| `UPLOAD_DIR` | `./uploads` | |
| `MODEL_DIR` | `./models` | Berisi 5 artefak §4.6.1 |
| `DEMO_DIR` | `./demo_assets` | Berisi 12 sampel gambar demo |
| `MAX_UPLOAD_MB` | `8` | |
| `CONFIDENCE_THRESHOLD` | `0.6` | Ambang peringatan *confidence* |
| `MAX_CANDIDATES` | `1500` | Batas kombinasi yang diskor |
| `SCORER_BACKEND` | `bilstm` | `bilstm` \| `rules` |
| `CORS_ORIGINS` | `http://localhost:5173` | Daftar dipisah koma |
| `HOST` / `PORT` | `127.0.0.1` / `8000` | |

---

## 6. Spesifikasi REST API (API Contract)

### 6.1 Ketentuan Umum

| Aspek | Ketentuan |
|---|---|
| Base URL | `http://127.0.0.1:8000/api/v1` (berkas statis: `/uploads/...`) |
| Format | JSON (`application/json`), kecuali `analyze` (`multipart/form-data`) |
| ID | Integer untuk `item`; string heksadesimal 32 karakter untuk `temp_id` |
| Waktu | ISO 8601 UTC, mis. `2026-11-25T08:15:30Z` |
| Dokumentasi interaktif | OpenAPI otomatis di `/docs` (FastAPI); skema Pydantic = sumber kebenaran kode |
| Autentikasi | Tidak ada (MVP) |

**Daftar endpoint**

| Metode | Path | Fungsi | Pri |
|---|---|---|---|
| GET | `/health` | Status server, model, DB | P0 |
| GET | `/meta/labels` | Taksonomi label & tampilan, ambang *confidence* | P0 |
| POST | `/items/analyze` | Unggah foto → prediksi label + `temp_id` | P0 |
| POST | `/items` | Simpan item dari `temp_id` + label final | P0 |
| POST | `/items/seed-demo` | Mengisi 12 item pakaian sampel demo ke lemari | P0 |
| GET | `/items` | Daftar item (filter, paginasi) + `counts_by_slot` | P0 |
| DELETE | `/items/{id}` | Hapus item + berkas | P0 |
| POST | `/outfits/recommend` | Rekomendasi kombinasi dari *anchor* | P0 |

### 6.2 Format *Error* & Kode

```json
{
  "error": {
    "code": "INSUFFICIENT_ITEMS",
    "message": "Lemari belum memiliki sepatu.",
    "details": { "missing_slots": ["shoes"] }
  }
}
```

| HTTP | `code` | Kondisi |
|---|---|---|
| 400 | `BAD_REQUEST` | *Request* tidak dapat diproses (mis. *multipart* rusak) |
| 404 | `ITEM_NOT_FOUND` / `TEMP_NOT_FOUND` / `ANCHOR_NOT_FOUND` | Sumber daya tidak ada atau `temp_id` kedaluwarsa |
| 413 | `FILE_TOO_LARGE` | Berkas > `MAX_UPLOAD_MB` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Bukan JPEG/PNG/WebP, atau isi bukan gambar valid |
| 422 | `VALIDATION_ERROR` | Skema/parameter tidak valid (termasuk galat Pydantic; `details.fields[]`) |
| 422 | `INVALID_LABEL` | Nilai label tidak ada di `labels.json` |
| 422 | `UNSUPPORTED_ARTICLE_TYPE` | `article_type = other` saat menyimpan |
| 422 | `IMAGE_UNREADABLE` | Gambar rusak/terlalu besar secara piksel |
| 422 | `ANCHOR_SLOT_UNSUPPORTED` | *Anchor* bukan `top`/`bottom`/`shoes` |
| 422 | `INSUFFICIENT_ITEMS` | Lemari tidak punya slot yang dibutuhkan (`details.missing_slots`) |
| 422 | `NO_MATCH_FOR_USAGE` | Filter acara menghabiskan suatu slot (`details.missing_slots`, `details.usage`) |
| 503 | `MODEL_NOT_READY` | Model belum selesai dimuat |
| 500 | `INTERNAL_ERROR` | Kesalahan tak terduga (tanpa *stack trace* pada respons) |

### 6.3 Skema Objek Bersama

**`Item`**

```json
{
  "id": 12,
  "image_url": "/uploads/items/6f1c9a0e4b7d4c2a9d3e5f6a7b8c9d0e.jpg",
  "thumb_url": "/uploads/thumbs/6f1c9a0e4b7d4c2a9d3e5f6a7b8c9d0e.jpg",
  "slot": "top",
  "article_type": "tshirt",
  "base_colour": "navy_blue",
  "usage": "casual",
  "is_label_corrected": false,
  "created_at": "2026-11-25T08:15:30Z"
}
```

*Embedding* **tidak** pernah dikembalikan lewat API.

### 6.4 `GET /health`

**200**

```json
{
  "status": "ok",
  "models_loaded": true,
  "tagger_version": "tagger-v1.0.0",
  "scorer_version": "scorer-v1.0.0",
  "scorer_backend": "bilstm",
  "db": "ok",
  "uptime_s": 532
}
```

### 6.5 `GET /meta/labels`

**200**

```json
{
  "labels_version": "labels-v1",
  "confidence_threshold": 0.6,
  "max_upload_mb": 8,
  "slots": [
    { "key": "top", "display": "Atasan" },
    { "key": "bottom", "display": "Bawahan" },
    { "key": "shoes", "display": "Sepatu" },
    { "key": "accessory", "display": "Aksesoris" }
  ],
  "article_types": [
    { "key": "tshirt", "display": "Kaos", "slot": "top" },
    { "key": "jeans", "display": "Jeans", "slot": "bottom" },
    { "key": "other", "display": "Belum Didukung", "slot": null }
  ],
  "base_colours": [
    { "key": "navy_blue", "display": "Biru Dongker", "hex": "#1E2A5A" }
  ],
  "usages": [
    { "key": "casual", "display": "Kasual" },
    { "key": "smart_casual", "display": "Smart Casual" }
  ]
}
```

### 6.6 `POST /items/analyze`

**Request** — `multipart/form-data`, satu *field* `file` (JPEG/PNG/WebP, ≤ 8 MB).

**200**

```json
{
  "temp_id": "b3f1c2d4e5a6478899aabbccddeeff00",
  "image_url": "/uploads/tmp/b3f1c2d4e5a6478899aabbccddeeff00.jpg",
  "slot": "top",
  "predictions": {
    "article_type": {
      "label": "tshirt", "confidence": 0.94,
      "top_k": [
        { "label": "tshirt", "confidence": 0.94 },
        { "label": "shirt",  "confidence": 0.03 },
        { "label": "top",    "confidence": 0.02 }
      ]
    },
    "base_colour": {
      "label": "navy_blue", "confidence": 0.71,
      "top_k": [
        { "label": "navy_blue", "confidence": 0.71 },
        { "label": "black", "confidence": 0.19 },
        { "label": "blue", "confidence": 0.07 }
      ]
    },
    "usage": {
      "label": "casual", "confidence": 0.58,
      "top_k": [
        { "label": "casual", "confidence": 0.58 },
        { "label": "smart_casual", "confidence": 0.25 },
        { "label": "sports", "confidence": 0.10 }
      ]
    }
  },
  "low_confidence_fields": ["usage"],
  "supported": true,
  "model_version": "tagger-v1.0.0",
  "inference_ms": 87,
  "expires_in_s": 86400
}
```

### 6.7 `POST /items`

**Request**

```json
{
  "temp_id": "b3f1c2d4e5a6478899aabbccddeeff00",
  "article_type": "tshirt",
  "base_colour": "navy_blue",
  "usage": "smart_casual"
}
```

**201** → objek `Item` (lihat §6.3) dengan `"is_label_corrected": true`.

### 6.8 `POST /items/seed-demo`

**Request** — Body kosong `{}`. Menyalin 12 gambar dari `DEMO_DIR` (`backend/demo_assets/`), menjalankan ekstraksi *embedding* CNN, dan menyimpannya ke tabel `items` sebagai koleksi demo siap uji.

**201**

```json
{
  "inserted_count": 12,
  "counts_by_slot": { "top": 4, "bottom": 4, "shoes": 3, "accessory": 1 }
}
```

### 6.9 `GET /items`

**Query parameter:** `slot`, `article_type`, `base_colour`, `usage`, `limit` (default 60), `offset` (default 0).

**200**

```json
{
  "items": [
    {
      "id": 12,
      "image_url": "/uploads/items/6f1c9a0e4b7d4c2a9d3e5f6a7b8c9d0e.jpg",
      "thumb_url": "/uploads/thumbs/6f1c9a0e4b7d4c2a9d3e5f6a7b8c9d0e.jpg",
      "slot": "top", "article_type": "tshirt", "base_colour": "navy_blue",
      "usage": "smart_casual", "is_label_corrected": true,
      "created_at": "2026-11-25T08:15:30Z"
    }
  ],
  "total": 8,
  "limit": 60,
  "offset": 0,
  "counts_by_slot": { "top": 8, "bottom": 5, "shoes": 3, "accessory": 0 }
}
```

### 6.10 `DELETE /items/{id}`

**204** tanpa isi. Menghapus baris `items`, berkas `items/` dan `thumbs/`. **404** `ITEM_NOT_FOUND` bila baris tidak ada.

### 6.11 `POST /outfits/recommend`

**Request**

```json
{
  "anchor_item_id": 12,
  "usage": "casual",
  "top_k": 5,
  "strict_usage": false,
  "include_accessory": false
}
```

**200**

```json
{
  "anchor": {
    "id": 12, "slot": "top", "article_type": "tshirt", "base_colour": "navy_blue",
    "usage": "casual", "image_url": "/uploads/items/6f1c...jpg",
    "thumb_url": "/uploads/thumbs/6f1c...jpg", "is_label_corrected": false,
    "created_at": "2026-11-25T08:15:30Z"
  },
  "usage_filter": "casual",
  "recommendations": [
    {
      "rank": 1,
      "score": 0.874,
      "score_percent": 87,
      "score_band": "very_compatible",
      "items": [
        { "slot": "top",    "is_anchor": true,  "item": { "id": 12, "article_type": "tshirt", "base_colour": "navy_blue", "usage": "casual", "image_url": "/uploads/items/6f1c...jpg", "thumb_url": "/uploads/thumbs/6f1c...jpg", "slot": "top", "is_label_corrected": false, "created_at": "2026-11-25T08:15:30Z" } },
        { "slot": "bottom", "is_anchor": false, "item": { "id": 7,  "article_type": "jeans",  "base_colour": "blue", "usage": "casual", "image_url": "/uploads/items/a1b2...jpg", "thumb_url": "/uploads/thumbs/a1b2...jpg", "slot": "bottom", "is_label_corrected": false, "created_at": "2026-11-24T10:01:00Z" } },
        { "slot": "shoes",  "is_anchor": false, "item": { "id": 3,  "article_type": "sports_shoes", "base_colour": "white", "usage": "casual", "image_url": "/uploads/items/c3d4...jpg", "thumb_url": "/uploads/thumbs/c3d4...jpg", "slot": "shoes", "is_label_corrected": true, "created_at": "2026-11-23T07:45:12Z" } }
      ]
    }
  ],
  "meta": {
    "n_candidates": 120,
    "scorer_backend": "bilstm",
    "scorer_version": "scorer-v1.0.0",
    "inference_ms": 34,
    "warnings": []
  }
}
```

---

## 7. Spesifikasi Antarmuka Pengguna (Frontend UI/UX)

### 7.1 Prinsip & Teknologi

| Aspek | Ketentuan |
|---|---|
| Stack | React 18, Vite, **TypeScript** (`strict`), Tailwind CSS 3.4+, `react-router-dom` 6, `@tanstack/react-query` 5, `clsx`, `lucide-react` |
| Pendekatan | *Mobile-first*, 1 kolom di HP; navigasi tab di bagian atas (desktop) / bawah (HP) |
| Bahasa | Indonesia; seluruh teks di `src/lib/i18n.ts` |
| Tipe API | `src/types/api.ts` mencerminkan §6 persis |
| Konfigurasi dev | Vite *proxy* `/api` dan `/uploads` → `http://127.0.0.1:8000`; `VITE_API_BASE` untuk *override* |

### 7.2 Peta Rute & Navigasi

| Rute | Halaman | Tab |
|---|---|---|
| `/` | Redirect ke `/closet` | — |
| `/closet` | **ClosetPage** — Virtual Closet | Lemari |
| `/upload` | **UploadPage** — Unggah & Auto-Tagging | Tambah |
| `/mix` | **MixMatchPage** — Mix & Match (`?anchor=<id>` opsional) | Mix & Match |
| `*` | NotFoundPage | — |

### 7.3 Wireframe

**ClosetPage (`/closet`)**

```
┌──────────────────────────────────────────────────────────┐
│ Smart Wardrobe        [ Lemari ] [ Tambah ] [ Mix&Match ]│
├──────────────────────────────────────────────────────────┤
│ Lemari saya · Atasan 8 · Bawahan 5 · Sepatu 3 · Aksesoris 0│
│ [Semua][Atasan][Bawahan][Sepatu][Aksesoris]              │
│ Jenis ▾   Warna ▾   Acara ▾          [Reset filter]      │
├──────────────────────────────────────────────────────────┤
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                  │
│ │ img   │ │ img   │ │ img   │ │ img   │                  │
│ │Kaos ● │ │Jeans ●│ │Sepatu●│ │...    │                  │
│ │Kasual │ │Kasual │ │Kasual │ │       │                  │
│ │[Padukan][🗑]│ ...                                        │
│ └───────┘ └───────┘ └───────┘ └───────┘                  │
└──────────────────────────────────────────────────────────┘
```

*(Saat lemari 0 item, tampilkan EmptyState dengan dua tombol aksi: **[+ Unggah Pakaian]** dan **[Isi Contoh Pakaian Demo]**).*

**UploadPage (`/upload`)** — tahap *review*

```
┌──────────────────────────────────────────────────────────┐
│ ┌────────────────┐   Hasil Analisis                      │
│ │   pratinjau    │   Jenis   [Kaos            ▾] ● 94%   │
│ │     foto       │   Warna   [Biru Dongker    ▾] ● 71%   │
│ │                │   Acara   [Kasual          ▾] ▲ 58% ⚠ Mohon periksa │
│ └────────────────┘   Alternatif: Kemeja 3% · Atasan 2%   │
│ [Ganti foto]                         [ Simpan ke Lemari ]│
└──────────────────────────────────────────────────────────┘
```

**MixMatchPage (`/mix`)**

```
┌──────────────────────────────────────────────────────────┐
│ 1. Pilih item utama   [Atasan|Bawahan|Sepatu]            │
│    ┌──┐┌──┐┌──┐┌──┐┌──┐ (scroll horizontal, terpilih = ring) │
│ 2. Acara  ( Semua | Kasual | Smart Casual | Formal | Olahraga | Pesta ) │
│                          [ Buat Rekomendasi ]            │
├──────────────────────────────────────────────────────────┤
│ #1  ┌────┐ ┌────┐ ┌────┐        Skor kecocokan  87%      │
│     │Atas│ │Bwh │ │Spt │        ████████░░  Sangat cocok │
│ #2  ...                                                  │
└──────────────────────────────────────────────────────────┘
```

### 7.4 Komponen React & *State Management*

- **Komponen Utama:** `AppShell`, `NavTabs`, `ToastHost`, `ConfidenceBadge`, `ColorSwatch`, `ScoreBar`, `EmptyState`, `Skeleton`, `ConfirmDialog`, `ErrorBanner`, `ClosetSummary`, `FilterBar`, `ItemGrid`, `ItemCard`, `Dropzone`, `TagReviewForm`, `LabelField`, `AnchorPicker`, `UsageSelector`, `OutfitCard`.
- **TanStack Query:** `['labels']` (`staleTime: Infinity`), `['items', filters]`; mutasi `useSaveItem`, `useDeleteItem`, dan `useSeedDemo` meng-*invalidate* `['items']`.
- **Filter Lemari:** tersinkron ke URL (`useSearchParams`).
- **Wizard Unggah:** `useReducer` (`idle → preview → analyzing → review → saving → saved | error`).

### 7.5 *Empty State* & Penanganan *Error*

| Kondisi | Lokasi | Tampilan & aksi |
|---|---|---|
| Lemari kosong (0 item) | Closet | "Lemari masih kosong" + CTA **Unggah pakaian** (`/upload`) & **Isi Contoh Pakaian Demo** (`POST /items/seed-demo`) |
| Filter tanpa hasil | Closet | "Tidak ada item yang cocok dengan filter" + **Reset filter** |
| Lemari kosong | Mix | "Tambahkan pakaian dulu untuk membuat *outfit*" + CTA **Isi Contoh Pakaian Demo** atau **Ke halaman Tambah** |
| Belum ada slot inti (mis. sepatu) | Mix (`INSUFFICIENT_ITEMS`) | "Kamu belum punya **sepatu** di lemari" + CTA **Tambah sepatu** (`/upload`) |
| Filter acara menghabiskan suatu slot (`NO_MATCH_FOR_USAGE`) | Mix | "Tidak ada [slot] untuk acara *Formal*" + tombol **Coba Semua acara** |
| Jenis tidak didukung (`other`) | Upload | Peringatan kuning + *dropdown* jenis wajib dipilih; **Simpan** nonaktif |
| *Confidence* rendah | Upload | *Badge* merah/kuning + "Mohon periksa" |

---

## 8. Struktur Direktori Monorepo & Rencana Kerja 7 Hari

### 8.1 Struktur Direktori (Ringkas & Datar)

```
smart-wardrobe/
├── README.md                      # quickstart (lihat Lampiran C)
├── prd.md                         # dokumen ini
├── .gitignore                     # data/, artifacts/, uploads/, *.db, .venv/, node_modules/
│
├── ml/                            # skrip datar training & ekspor model (lokal + Colab)
│   ├── requirements.txt           # tensorflow (pin), numpy, pandas, scikit-learn, pillow, pyyaml, tqdm
│   ├── configs/
│   │   ├── labels.yaml            # SUMBER TUNGGAL taksonomi label (§4.3)
│   │   ├── tagger.yaml
│   │   └── scorer.yaml
│   ├── preprocess.py              # preprocess_pil() — square center-crop + resize 128 (§4.6.2)
│   ├── config_utils.py            # loader YAML & path SW_DATA_DIR / SW_ARTIFACT_DIR
│   ├── 01_prepare_fashion.py      # parse styles.csv (on_bad_lines='skip'), mapping, splits, cache .npy
│   ├── 02_train_tagger.py         # training MobileNetV2 multi-output + evaluasi test split
│   ├── 03_prepare_polyvore.py     # parser JSON + category_id.txt slot mapping + ekstraksi embedding CNN
│   ├── 04_train_scorer.py         # negative sampling + training Bi-LSTM + evaluasi test split
│   ├── 05_export.py               # salin .keras + labels.json + demo_assets + golden test
│   ├── data/                      # (gitignored) raw/{fashion,polyvore}/, processed/
│   └── artifacts/                 # (gitignored) tagger/, scorer/, metrics.json
│
├── backend/
│   ├── requirements.txt           # fastapi, uvicorn[standard], sqlalchemy>=2, pydantic>=2, pydantic-settings,
│   │                              # python-multipart, pillow, numpy, tensorflow (pin = ml/), pytest, httpx
│   ├── .env.example
│   ├── app/
│   │   ├── main.py                # FastAPI, lifespan, CORS, StaticFiles, exception handlers
│   │   ├── config.py              # pydantic-settings
│   │   ├── db.py                  # engine, session, PRAGMA, create_all
│   │   ├── orm.py                 # User, Item
│   │   ├── schemas.py             # Pydantic: Item, Analyze*, Recommend*, ApiError
│   │   ├── api/v1/                # health.py  meta.py  items.py  outfits.py
│   │   ├── services/              # image_service.py  ml_service.py  item_service.py  outfit_service.py
│   │   ├── scoring/               # base.py (Protocol)  bilstm.py  rules.py
│   │   └── core/                  # labels.py (labels.json, USAGE_COMPAT)  errors.py
│   ├── models/                    # (gitignored) hasil `05_export.py`: *.keras, labels.json, scorer_meta.json, manifest.json
│   ├── demo_assets/               # (gitignored) 12 gambar sampel dari `05_export.py` untuk seed-demo
│   ├── uploads/                   # (gitignored) items/  thumbs/  tmp/
│   └── tests/                     # unit, contract, golden/ (paritas preprocessing)
│
└── frontend/
    ├── package.json  vite.config.ts  tsconfig.json  tailwind.config.js  postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx  App.tsx  index.css
        ├── api/                   # client.ts  items.ts  outfits.ts  meta.ts
        ├── types/                 # api.ts (cermin §6)
        ├── hooks/                 # useLabelsMeta  useItems  useAnalyzeImage  useSaveItem  useDeleteItem  useSeedDemo  useRecommend
        ├── components/            # common/  closet/  upload/  mix/
        ├── pages/                 # ClosetPage  UploadPage  MixMatchPage  NotFoundPage
        └── lib/                   # i18n.ts  format.ts
```

### 8.2 Rencana Kerja Harian (7 Hari)

**Hari 1 — Fondasi, Verifikasi Kedua Dataset & Preprocessing**
- Setup repo monorepo, `.venv` lokal, `requirements.txt`, dan `.gitignore`.
- **Verifikasi kedua dataset sekaligus:** cek struktur `ml/data/raw/fashion/` (`images/` + `styles.csv`) dan `ml/data/raw/polyvore/` (`train_no_dup.json`, `valid_no_dup.json`, `test_no_dup.json`, `category_id.txt`, `images/{set_id}/{index}.jpg`).
- Implementasi `preprocess.py` (*square center-crop* + *resize* 128×128) dan `01_prepare_fashion.py` (`on_bad_lines='skip'`, pemetaan label, cache `fashion_128.npy`).
- *Scaffold* backend FastAPI (`health`, `meta/labels`, `db.py`, `orm.py`) & frontend Vite + TypeScript + Tailwind.
- **DoD:** `01_prepare_fashion.py` selesai; struktur Polyvore terverifikasi; `/health` dan `/meta/labels` aktif.

**Hari 2 — Training & Evaluasi Model 1 (CNN Tagger)**
- Implementasi dan jalankan `02_train_tagger.py` (Fase 1 + Fase 2) di Google Colab (atau lokal jika ber-GPU).
- Evaluasi metrik M-01…M-04 pada *test split* katalog, simpan model terbaik.
- Implementasi backend `ImageService` (wajib `.as_posix()`), `ItemService`, `POST /items/analyze`, `POST /items`, `GET /items`, `DELETE /items/{id}`.
- **DoD:** Model CNN mencapai target akurasi/F1 dasar dan tersimpan.

**Hari 3 — Persiapan Polyvore & Training Model 2 (Bi-LSTM Scorer)**
- Implementasi `03_prepare_polyvore.py` (pemetaan slot via `category_id.txt` + ekstraksi *embedding* menggunakan model CNN Hari 2).
- Implementasi dan jalankan `04_train_scorer.py` (*negative sampling* 40/30/30 + Bi-LSTM) hingga metrik M-05 tercapai.
- Jalankan `05_export.py --to ../backend/models --demo-dir ../backend/demo_assets --verify` untuk mengekspor kedua model, `labels.json`, `scorer_meta.json`, 12 gambar `demo_assets`, dan *golden test*.
- **DoD:** Kedua model terpasang di `backend/models/` dan *golden test* paritas lulus.

**Hari 4 — Backend Mix & Match + Seed Demo**
- Implementasi `scoring/` (`BiLSTMScorer` & `RuleBasedScorer`), `OutfitService`, `POST /outfits/recommend`, dan `POST /items/seed-demo`.
- Tulis tes `pytest` untuk *golden test*, `ItemService`, `OutfitService`, dan kontrak API.
- **DoD:** Seluruh endpoint API (§6) berfungsi penuh dan lulus tes `pytest`.

**Hari 5 — Frontend Web (Closet & Upload Page)**
- Bangun `ClosetPage` (grid kartu, ringkasan per slot, filter sinkron URL, hapus item, serta tombol **Isi Contoh Pakaian Demo**).
- Bangun `UploadPage` (*dropzone*, pratinjau, form review 3 label dengan *badge* *confidence*, simpan ke lemari).
- **DoD:** Alur unggah foto pakaian & manajemen lemari berjalan mulus di browser.

**Hari 6 — Frontend Web (Mix & Match Page) & Integrasi End-to-End**
- Bangun `MixMatchPage` (*anchor picker*, filter acara, kartu rekomendasi dengan *progress bar* skor kecocokan, serta seluruh *empty state* §7.5).
- Uji alur lengkap *end-to-end* di browser (mulai dari tombol *seed demo*, unggah gambar uji baru, filter lemari, hingga generator *mix & match*).
- Ukur latensi inferensi (`S-01`, `S-02`) dan perbaiki *bug* UI/API.
- **DoD:** Seluruh alur P0 berjalan mulus tanpa *error* konsol maupun server.

**Hari 7 — Polesan Akhir & Dokumentasi**
- Rapikan tata letak responsif (desktop & mobile *viewport*), pesan kesalahan bahasa Indonesia, dan `README.md` cara instalasi & menjalankan aplikasi.
- Verifikasi *clean run* dari awal (`uvicorn` + `npm run dev`).
- **DoD:** Seluruh item pada Checklist Penerimaan (Lampiran D) tercentang.

### 8.3 *Cut-Line* (jika jadwal tergelincir)

1. Sub-filter `article_type` di `FilterBar` (cukup filter utama `slot`, `base_colour`, `usage`).
2. Opsi `include_accessory = true` pada `POST /outfits/recommend`.
3. Jika pelatihan Bi-LSTM terhambat, alihkan `.env` ke `SCORER_BACKEND=rules` agar aplikasi web tetap dapat didemokan sepenuhnya.
4. **Tidak boleh dipotong:** `POST /items/analyze`, `POST /items`, `POST /items/seed-demo`, `GET /items`, `DELETE /items/{id}`, `POST /outfits/recommend`.

---

## 9. Risiko Teknis & Mitigasi

| ID | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| **R-01** | ***Class imbalance*** pada `usage` (`casual` dominan) dan kelas minoritas (`skirt`/`jacket`). | Model bias ke kelas mayoritas. | Bobot sampel akar terbalik frekuensi, *oversampling* kelas minoritas + augmentasi, dan seleksi model memakai **macro-F1**. |
| **R-02** | **Perbedaan framing & pencahayaan** foto pengguna vs foto katalog latar putih. | Prediksi keliru saat pengguna mengunggah foto baju sendiri. | *Square center-crop* pada `preprocess_pil`, augmentasi kecerahan/kontras/degradasi resolusi/latar bising, *badge* peringatan *confidence* < 0,6, dan form koreksi manual sebelum simpan. |
| **R-03** | **Jebakan *path separator* Windows (`\`)** pada URL gambar. | Gambar gagal dimuat (`/uploads/items\abc.jpg` → 404). | Wajib memakai `.as_posix()` setiap menyimpan `image_path` dan `thumb_path` ke SQLite. |
| **R-04** | **Latensi CPU lokal** saat inferensi atau kombinasi kandidat terlalu besar. | Respons lambat (> 2 detik). | MobileNetV2 128×128, muat model sekali di `lifespan` + *warm-up*, *embedding* di-cache di DB, *batch scoring* Bi-LSTM, dan batas `MAX_CANDIDATES = 1500`. |
| **R-05** | **Ketidakcocokan versi TensorFlow/Keras** antara Google Colab dan PC lokal. | File `.keras` gagal dimuat di backend. | Catat versi TF/Keras di `manifest.json` dan samakan versi *major.minor* di `backend/requirements.txt`. |
| **R-06** | **Lemari kosong (*cold-start*)** saat pengujian/demo. | Mix & Match tidak bisa dijalankan karena kurang slot. | Sediakan tombol **Isi Contoh Pakaian Demo** (`POST /items/seed-demo`) dan *empty state* dengan tombol aksi langsung. |

---

## 10. Lampiran

### Lampiran A — `backend/.env.example`

```dotenv
DATABASE_URL=sqlite:///./smartwardrobe.db
UPLOAD_DIR=./uploads
MODEL_DIR=./models
DEMO_DIR=./demo_assets
MAX_UPLOAD_MB=8
CONFIDENCE_THRESHOLD=0.6
MAX_CANDIDATES=1500
SCORER_BACKEND=bilstm        # bilstm | rules
CORS_ORIGINS=http://localhost:5173
HOST=127.0.0.1
PORT=8000
```

### Lampiran B — Perintah Cepat

```bash
# --- 1. ML (lokal) ---
python -m venv .venv && source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r ml/requirements.txt
cd ml
python 01_prepare_fashion.py
python 02_train_tagger.py --max-samples 2000 --epochs 1    # smoke test cepat di CPU lokal

# --- 2. ML (Google Colab untuk training penuh) ---
#   from google.colab import drive; drive.mount('/content/drive')
#   %env SW_DATA_DIR=/content/drive/MyDrive/smart-wardrobe/data
#   %env SW_ARTIFACT_DIR=/content/drive/MyDrive/smart-wardrobe/artifacts
#   !python 02_train_tagger.py
#   !python 03_prepare_polyvore.py
#   !python 04_train_scorer.py
#   !python 05_export.py --to /content/drive/MyDrive/smart-wardrobe/exported_models --verify

# --- 3. Backend ---
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
pytest -q

# --- 4. Frontend ---
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### Lampiran C — Konvensi untuk *AI Coding Agent*

1. **Urutan kerja:** ikuti rencana §8.2; kerjakan P0 sebelum P1; jangan menambah fitur di luar §3.
2. **Kontrak adalah hukum:** jangan mengubah path, nama *field*, atau kode *error* §6 tanpa memperbarui `prd.md`, `backend/app/schemas.py`, dan `frontend/src/types/api.ts` bersamaan.
3. **Label:** jangan pernah *hardcode* daftar label; baca dari `labels.json`.
4. **Paritas preprocessing:** jangan mengubah `preprocess_pil` (*square center-crop* + *resize* 128) di satu sisi saja; pastikan *golden test* tetap lulus.
5. **Path Windows:** selalu gunakan `.as_posix()` saat menyimpan atau menggabungkan *path* URL berkas.
6. **Python & TypeScript:** endpoint FastAPI yang memanggil TensorFlow dideklarasikan `def` (bukan `async def`); frontend menggunakan TypeScript `strict` tanpa `any` dengan seluruh teks UI terpusat di `src/lib/i18n.ts`.

### Lampiran D — Checklist Penerimaan MVP (Definition of Done)

- [ ] Seluruh fitur P0 (§3) berfungsi *end-to-end* di browser.
- [ ] Kedua model (`tagger_infer.keras` & `outfit_scorer.keras`) terekspor dan lulus `05_export.py --verify` serta `pytest`.
- [ ] Tombol **Isi Contoh Pakaian Demo** berhasil mengisi 12 item sampel ke SQLite dan langsung dapat dipakai di halaman **Mix & Match**.
- [ ] Gambar yang diunggah di Windows maupun Linux/macOS tampil normal di browser tanpa *broken link* (`/` vs `\`).
- [ ] `npm run build` dan `npx tsc --noEmit` lulus tanpa *error*.
- [ ] `README.md` berisi panduan singkat instalasi dan cara menjalankan ML, backend, dan frontend.