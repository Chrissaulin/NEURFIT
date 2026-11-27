# `desain.md` — Spesifikasi Desain UI/UX Smart Wardrobe (MOJAVE Editorial Edition)

Dokumen ini adalah panduan spesifikasi desain (*design system & layout blueprint*) untuk membangun antarmuka web **Smart Wardrobe** dengan estetika *editorial streetwear lookbook* bergaya **MOJAVE**. Gunakan file ini sebagai instruksi konteks utama bagi AI agent (Claude Code, Cursor, Windsurf, Gemini, v0, dll.) agar hasil implementasi konsisten secara visual, tipografis, dan fungsional.

---

## 1. Identitas Visual & Prinsip Desain

1. **Estetika Utama:** *Dark Editorial Streetwear Lookbook* yang memadukan kanvas arang gelap bertekstur (*distressed matte charcoal*) dengan tinta krem tulang hangat (*warm vintage bone-cream*), tipografi *heavy slab-serif* raksasa, serta metadata teknis *monospace*.
2. **Kontras Bingkai Luar-Dalam:**
   - Seluruh halaman utama berada di dalam kontainer gelap `#181817` yang memiliki sudut bawah melengkung besar (`rounded-b-[32px]`) dan bayangan dalam.
   - Di bawah lengkungan tersebut terdapat strip dasar (*base canvas*) berwarna krem tulang `#EDE9DA` yang memuat baris hak cipta dan lokasi.
3. **Fotografi & Visual Pakaian:**
   - Foto editorial pada *landing page* menggunakan perlakuan monokrom/hitam-putih kontras tinggi (`grayscale contrast-110`), kecuali pada *spotlight card* teknologi inti dan *lookbook* kipas yang menampilkan aksen warna selektif.
   - Setiap gambar eksternal **wajib** memiliki *fallback* otomatis ke ilustrasi vektor *flat-lay garment SVG* di atas kanvas `#1C1C1B` / `#242422` agar tidak pernah menampilkan ikon gambar rusak (*broken image*).
4. **Geometri Komponen:**
   - **Navigasi & Tombol Utama (CTA):** Menggunakan bentuk kapsul penuh (`rounded-full`) dengan efek kaca buram gelap (*glassmorphism*).
   - **Kartu Katalog, Grid Produk, & Input Form:** Menggunakan sudut tajam arsitektural (`rounded-none`) dengan garis tepi tipis `1px` (`border-[#EDE9DA]/15`).
   - **Kartu Sorotan Teknologi Inti:** Menggunakan sudut membulat besar (`rounded-[24px]`).

---

## 2. Token Warna (Color Palette Tokens)

AI agent **wajib** menggunakan token warna heksadesimal berikut secara presisi:

| Peran Token | Kode Hex / Tailwind | Penggunaan |
| :--- | :--- | :--- |
| **Primary Dark Surface** | `#181817` | Latar utama kontainer halaman (`.mojave-distressed-surface`) |
| **Warm Bone-Cream (Ink & Base)** | `#EDE9DA` | Teks utama, wordmark raksasa, tombol utama, dan strip dasar halaman |
| **Elevated Card Surface** | `#222220` / `#242422` | Latar kartu katalog pakaian, panel form, dan bingkai foto |
| **Garment Studio Canvas** | `#1C1C1B` | Latar belakang kotak preview ilustrasi *flat-lay* pakaian |
| **Glassmorphic Pill Surface** | `rgba(44, 44, 42, 0.80)` (`bg-[#2C2C2A]/80`) | Kapsul navigasi *floating* & tombol ikon bulat (`backdrop-blur-md`) |
| **Muted Metadata Ink** | `#B5B1A4` | Subjudul teknis, label indeks slot, dan teks deskripsi sekunder |
| **Hairline Border (Default)** | `rgba(237, 233, 218, 0.15)` (`border-[#EDE9DA]/15`) | Garis pembatas antar-kartu, tabel grid, dan *divider* section |
| **Hairline Border (Hover/Active)** | `rgba(237, 233, 218, 0.55)` (`border-[#EDE9DA]/55`) | Efek *hover* pada kartu produk dan tombol sekunder |
| **Semantic High (`>= 80%`)** | Ink `#9BC2A0` · Bg `#7FA384/15` · Border `#7FA384/45` | Badge *confidence* CNN tinggi & skor Bi-LSTM **SANGAT COCOK** |
| **Semantic Medium (`60–79%`)** | Ink `#E5B96C` · Bg `#D4A453/15` · Border `#D4A453/45` | Badge *confidence* CNN sedang & skor Bi-LSTM **COCOK** |
| **Semantic Alert (`< 60%`)** | Ink `#F0887D` · Bg `#D96B5F/15` · Border `#D96B5F/55` | Badge peringatan `Mohon periksa` & konfirmasi hapus item |

### Efek Tekstur Kanvas Gelap (`.mojave-distressed-surface`)
Terapkan kombinasi *radial-gradient* lembut serta SVG *fractalNoise grain overlay* dengan `opacity: 0.045` (`pointer-events-none`) di atas latar `#181817` untuk menciptakan kesan dinding studio/kertas *matte* yang autentik:

```css
.mojave-distressed-surface {
  background-color: #181817;
  background-image:
    radial-gradient(ellipse 80% 45% at 15% 12%, rgba(35, 35, 33, 0.9) 0%, transparent 65%),
    radial-gradient(ellipse 70% 50% at 85% 32%, rgba(35, 35, 33, 0.75) 0%, transparent 60%),
    radial-gradient(ellipse 90% 55% at 50% 68%, rgba(16, 16, 15, 0.85) 0%, transparent 70%),
    radial-gradient(ellipse 75% 40% at 25% 92%, rgba(35, 35, 33, 0.8) 0%, transparent 65%);
}
```

---

## 3. Sistem Tipografi (Typography System)

Muat pasangan font berikut dari Google Fonts:
- **Display Slab-Serif (`font-slab`):** `'Bevan', 'Arvo', serif`
- **Technical Monospace (`font-mono-editorial`):** `'Space Mono', monospace`

### Hierarki Ukuran & Gaya Teks
1. **Giant Edge-to-Edge Wordmark (`WARDROBE`):**
   - Font: `font-slab uppercase text-[#EDE9DA] text-center leading-[0.88] tracking-[-0.02em]`
   - Ukuran responsif: `clamp(3.3rem, 13.8vw, 13.5rem)`
2. **Giant Stacked Category & Module Titles:**
   - Font: `font-slab uppercase text-[#EDE9DA] leading-none tracking-tight`
   - Ukuran responsif: `text-3xl sm:text-6xl lg:text-[68px]` (Kategori) dan `text-2xl sm:text-4xl lg:text-[52px]` (Modul Sistem).
3. **Page Header Titles (Halaman Internal):**
   - Font: `font-slab uppercase text-[#EDE9DA] leading-none`
   - Ukuran responsif: `text-3xl sm:text-5xl lg:text-6xl`
4. **Section Eyebrow Headers (`ITEM TERBARU`, `TEKNOLOGI INTI`, `KATEGORI LEMARI`, dll.):**
   - Font: `font-mono-editorial text-xs sm:text-sm font-bold uppercase tracking-[0.28em] text-center`
5. **UI Controls, Metadata, & Indices:**
   - Font: `font-mono-editorial text-xs uppercase tracking-[0.16em]`
   - Seluruh angka urutan menggunakan format dua digit dengan nol di depan (`[01]`, `[02]`, `#01`) dan ikon aksi menggunakan panah diagonal unicode (`↗`).

---

## 4. Shell Layout & Floating Glassmorphic Navbar

### Struktur Kerangka Global
```text
<div class="min-h-screen bg-[#EDE9DA]">
  <div class="mojave-distressed-surface rounded-b-[32px] pb-16 sm:pb-20">
    <header class="sticky top-0 z-50"> ... </header>
    <main> ... </main>
    <footer> ... </footer>
  </div>
  <div class="bg-[#EDE9DA] text-[#181817] px-6 sm:px-12 py-5">
    <!-- Strip Copyright Bawah: © 2026 SMART WARDROBE | SURABAYA, INDONESIA -->
  </div>
</div>
```

### Navigasi Melayang (`sticky top-0 z-50`)
Terdiri dari 3 bagian sejajar horizontal (`max-w-[1440px] mx-auto`):
1. **Kiri:** Wordmark tombol `WARDROBE` dalam `font-slab text-xl sm:text-2xl uppercase text-[#EDE9DA]`.
2. **Tengah (Desktop):** Kapsul kaca gelap (`bg-[#2C2C2A]/80 backdrop-blur-md border border-[#3E3E3B]/70 rounded-full px-7 py-2.5`) berisi 4 tautan:
   - `Beranda`
   - `Lemari`
   - `Tambah +`
   - `Mix & Match`
   - *State Aktif:* Teks `#EDE9DA font-bold` dengan titik indikator bulat kecil (`w-1.5 h-1.5 rounded-full bg-[#EDE9DA]`) tepat di bawah teks.
3. **Kanan:** Dua tombol lingkaran kaca gelap (`w-10 h-10 rounded-full bg-[#2C2C2A]/80 border border-[#3E3E3B]/70`):
   - Ikon Kamera (`Camera`) → pintasan ke halaman `Tambah +`.
   - Ikon Sparkles (`Sparkles`) → pintasan ke halaman `Mix & Match`.
4. **Mobile (`md:hidden`):** Strip kapsul kedua di bawah baris atas berisi 4 tombol tab agar mudah dijangkau ibu jari.

---

## 5. Blueprint 10 Section Halaman Beranda (`Beranda`)

Halaman `Beranda` wajib mengikuti urutan vertikal 10 *section* berikut secara berurutan:

1. **Section 1 — Hero Overlapping Collage:**
   - Foto editorial utama rasio `aspect-[16/10]` di tengah (`grayscale contrast-110`).
   - Kartu kotak sepatu monokrom melayang di sisi kiri tengah (`-left-8 lg:-left-14 top-1/2 -translate-y-1/2 w-36 lg:w-48 aspect-square`).
   - Kartu kotak *sweatshirt* gelap melayang di sisi kanan atas (`-right-8 lg:-right-14 -top-6 w-36 lg:w-48 aspect-square`).
   - Kartu poster split 2 kolom menumpuk di bagian bawah tengah (`-mt-10 sm:-mt-16 w-[92%] sm:w-[460px]`): sisi kiri berisi tipografi `"EXPLORE YOUR TRUE STYLE"` + `"CNN AUTO-TAGGING & BI-LSTM MIX-AND-MATCH ↗"`, sisi kanan berisi foto rak pakaian grayscale.
2. **Section 2 — Giant Edge-to-Edge Wordmark:**
   - Teks raksasa `WARDROBE` memenuhi lebar layar (`clamp(3.3rem, 13.8vw, 13.5rem)`).
3. **Section 3 — `ITEM TERBARU`:**
   - Judul *eyebrow* rata tengah `ITEM TERBARU`.
   - Grid 5 kolom (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5`) berisi kartu foto `aspect-square` grayscale dan label kapital di bawahnya (`LINEN SHIRT ↗`, `DENIM JACKET ↗`, `POLO T-SHIRT ↗`, `STRIPED SHIRT ↗`, `BOMBER JACKET ↗`). Klik kartu langsung membuka item tersebut sebagai *anchor* di halaman `Mix & Match`.
4. **Section 4 — `TEKNOLOGI INTI` (`CNN × BI-LSTM`):**
   - Header rata tengah: *eyebrow* `TEKNOLOGI INTI` dan judul slab-serif `CNN × BI-LSTM`.
   - Satu kartu sorotan besar `rounded-[24px] aspect-[16/9]` dengan *gradient overlay* gelap di bawah, penjelasan model, tombol CTA kapsul krem (`UJI AUTO-TAGGING ↗` / `BUKA MIX & MATCH ↗`), dan tombol lingkaran kaca berikon panah kanan (`ChevronRight`) di sisi kanan untuk berganti antara **Model 01: MobileNetV2 CNN** dan **Model 02: Bi-LSTM Compatibility**.
5. **Section 5 — `KATEGORI LEMARI`:**
   - Judul *eyebrow* `KATEGORI LEMARI`.
   - Tumpukan vertikal 5 baris teks slab-serif raksasa rata tengah: `ATASAN`, `BAWAHAN`, `SEPATU`, `AKSESORIS`, `SEMUA KOLEKSI`.
   - Saat di-*hover*, muncul indeks jumlah item di samping kanan (mis. `[04] ↗`). Klik kategori langsung membuka halaman `Lemari` yang sudah terfilter.
6. **Section 6 — `LOOKBOOK OUTFIT ’26`:**
   - Judul *eyebrow* `LOOKBOOK OUTFIT ’26`.
   - 5 kartu vertikal (`aspect-[3/4]`) tersusun melengkung seperti kipas kartu dengan rotasi miring (`-rotate-6`, `-rotate-3`, `rotate-0`, `rotate-3`, `rotate-6`) dan tumpang tindih horizontal (`-space-x-4 sm:-space-x-8`).
7. **Section 7 — `MODUL SISTEM`:**
   - Judul *eyebrow* `MODUL SISTEM`.
   - 3 baris fitur utama dengan tata letak gambar strip horizontal (`w-80 md:w-96 h-24 sm:h-28 grayscale`) dan judul slab-serif raksasa yang posisinya bergantian kiri-kanan:
     - Baris 1 (Gambar Kiri): `[Strip Foto]  AUTO-TAGGING CNN ↗`
     - Baris 2 (Gambar Kanan): `↗ MIX & MATCH BI-LSTM  [Strip Foto]`
     - Baris 3 (Gambar Kiri): `[Strip Foto]  LEMARI DIGITAL ↗`
8. **Section 8 — `KOMBINASI POPULER`:**
   - Judul *eyebrow* `KOMBINASI POPULER`.
   - Grid 5 kolom foto studio grayscale `aspect-square` dengan label `ATASAN & SWEATS`, `KEMEJA KASUAL`, `CELANA & JEANS`, `SEPATU HARIAN`, `AKSESORIS`.
9. **Section 9 — `TENTANG SMART WARDROBE`:**
   - Grid 2 kolom (`lg:grid-cols-12`): kolom kiri berisi foto lanskap monokrom gelap (`aspect-[16/10]`), kolom kanan berisi penjelasan arsitektur **MobileNetV2 CNN** dan **Bidirectional LSTM** dalam `Space Mono` berjarak baris lega (`leading-[1.9]`).
10. **Section 10 — Giant Mojave Footer:**
    - Wordmark raksasa `WARDROBE` edge-to-edge di atas 4 kolom tautan uppercase (`NAVIGASI`, `KATEGORI`, `ARSITEKTUR`, `DATASET`).

---

## 6. Spesifikasi Halaman Fungsional

### A. Halaman `Lemari` (`closet`)
- **Header:** Judul `LEMARI DIGITAL`, penghitung slot real-time (`ATASAN [04] · BAWAHAN [03] · SEPATU [02] · AKSESORIS [01]`), tombol `Reset Demo`, dan tombol CTA `Tambah +`.
- **Filter Bar:** Kapsul filter slot (`SEMUA`, `ATASAN`, `BAWAHAN`, `SEPATU`, `AKSESORIS`) + dropdown filter **Warna** dan **Acara**.
- **Grid Kartu Pakaian (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`):**
  - Kotak atas `aspect-square bg-[#1C1C1B]` berisi badge slot di pojok kiri atas dan visual pakaian.
  - Bagian bawah berisi nama item, jenis pakaian, kotak swatch warna + nama warna, pill acara, tombol aksi penuh `PADUKAN ↗` (dinonaktifkan dengan kursor `not-allowed` jika slot adalah `AKSESORIS`), serta tombol hapus dengan konfirmasi *inline* (`Hapus? Ya / Batal`).

### B. Halaman `Tambah +` (`upload` — CNN Auto-Tagging)
- **Layout 2 Kolom (`lg:grid-cols-12`):**
  - **Kolom Kiri (`lg:col-span-5`):** Area *drag-and-drop* unggah foto lokal (JPEG/PNG/WebP, maks. 8 MB) + panel **Contoh Foto Cepat** berisi 3 skenario uji instan:
    1. *Kaos Navy Kasual* (Confidence tinggi `94%` — hijau sage).
    2. *Kemeja Putih Formal* (Confidence acara rendah `58% · Mohon periksa` — terakota).
    3. *Sepatu Lari Abu* (Confidence warna sedang `72%` — ochre).
  - **Kolom Kanan (`lg:col-span-7`):** Panel **Review & Koreksi Label** yang menampilkan indikator *loading* saat simulasi inferensi berjalan, lalu menampilkan form koreksi untuk **01. Jenis Pakaian**, **02. Warna Dominan**, dan **03. Kategori Acara**, masing-masing dilengkapi `ConfidenceBadge` dan chip pilihan alternatif **Top-3** yang dapat diklik.

### C. Halaman `Mix & Match` (`mix` — Bi-LSTM Scorer)
- **Step 1 — Panel Kontrol:**
  - *Horizontal Scroll Strip* berisi seluruh koleksi lemari untuk memilih **Item Utama (Anchor)**. Item terpilih ditandai border `#EDE9DA` dan tag `UTAMA`; item berjenis `AKSESORIS` tampil redup (`opacity-45`) dan tidak dapat dipilih sebagai item utama.
  - Baris filter acara (`Semua Acara`, `Kasual`, `Smart Casual`, `Formal`, `Olahraga`) dan tombol `BUAT REKOMENDASI ↗`.
- **Step 2 — Kartu Rekomendasi Kombinasi (`lg:grid-cols-2`):**
  - Header kartu menampilkan nomor peringkat (`#01`, `#02`, dst.), badge status (`SANGAT COCOK` / `COCOK` / `KURANG COCOK`), persentase kecocokan (`89%`), dan *progress bar* horizontal.
  - Isi kartu terbagi menjadi 3 kolom sejajar dengan garis pemisah vertikal (`divide-x divide-[#EDE9DA]/15`): **`01 ATASAN`**, **`02 BAWAHAN`**, dan **`03 SEPATU`**, disertai alasan harmoni gaya di bagian footer kartu.
  - *Empty State:* Jika slot inti (`Atasan`, `Bawahan`, atau `Sepatu`) kosong, tampilkan pesan peringatan spesifik slot mana yang belum tersedia beserta tombol pintasan `+ Tambah [Slot]` dan `Reset Demo`.

---

## 7. Prompt Instruksi Siap Pakai untuk AI Agent

Salin dan tempelkan prompt berikut saat meminta AI agent membangun atau memodifikasi halaman menggunakan spesifikasi ini:

```text
Ikuti spesifikasi desain di file `desain.md` secara ketat:
1. Gunakan palet warna MOJAVE: kanvas utama gelap `#181817` (`.mojave-distressed-surface` dengan `rounded-b-[32px]`) di atas strip dasar `#EDE9DA` (warm vintage bone-cream), kartu `#222220`, kanvas garment `#1C1C1B`, dan garis tepi `1px` `border-[#EDE9DA]/15`.
2. Gunakan font `Bevan`/`Arvo` (`font-slab` uppercase) untuk display heading raksasa dan `Space Mono` (`font-mono-editorial`) untuk navigasi, label metadata, counter `[01]`, dan panah diagonal `↗`.
3. Gunakan sticky floating glassmorphic pill navbar (`bg-[#2C2C2A]/80 backdrop-blur-md rounded-full`) dengan wordmark `WARDROBE` di kiri, 4 tab navigasi di tengah, dan 2 tombol ikon bulat di kanan.
4. Pastikan seluruh gambar memiliki fallback otomatis ke ilustrasi flat-lay garment SVG agar tidak pernah terjadi broken image.
```