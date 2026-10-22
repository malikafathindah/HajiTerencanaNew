# HajiTerencanaNew - Aplikasi Web Haji Khusus Fath Indah

Aplikasi web modern, responsif (Desktop & Smartphone) dan terintegrasi langsung dengan database **Supabase** untuk pencatatan, verifikasi setoran, serta monitoring riwayat angsuran haji nasabah **PT. Fath Indah Travel Services**.

---

## 📌 Sumber Data & Konfigurasi Supabase

- **Supabase Project URL**: `https://utqexpkwtatwzknjftpx.supabase.co`
- **Tabel Database**:
  1. `data_jamaah_haji`: Menyimpan 82 data profil jamaah haji (No. BPIH, Nama, SPPH, Alamat, Dokumen, Mahram, dsb).
  2. `entry_angsuran_haji`: Menyimpan 439+ riwayat pembayaran angsuran haji, no jurnal, tanggal, bank, status verifikasi (`Approved`, `Pending`, `Cancle`), nominal, dan lampiran bukti transfer.
  3. `users`: Menyimpan 126 akun nasabah dan administrator untuk autentikasi login.
  4. `mahram`: Menyimpan 24 relasi mahram jamaah haji (No. BPIH, Nama, Kode Mahram).
  5. `running_text`: Pengumuman marquee banner yang berjalan di bagian atas aplikasi.
- **Skrip SQL Supabase**: Tersedia di file [`supabase_schema.sql`](./supabase_schema.sql).

---

## ✨ Fitur Utama Aplikasi

1. **Autentikasi Multi-User**:
   - Mendukung login menggunakan **Nomor HP** (contoh: `081281866673`), **Nomor BPIH** (contoh: `3000956472`), maupun akun **Administrator** (`admin`).
   - Tombol Quick Fill Demo untuk kemudahan pengujian akun nasabah dan admin.
2. **Tab 1: Entry Angsuran Haji & Cetak Kwitansi Resmi (Lampiran 1 & 2)**:
   - Ringkasan realtime: **Total Terbayar** (format Rupiah) & **Total Transaksi**.
   - Pencarian cerdas instan (ID Transaksi, No. Jurnal, Bank, Uraian, Tanggal) & filter status (`Approved`, `Pending`, `Cancle`).
   - **Struk Angsuran Haji (Lampiran 2)**: Tampilan detail transaksi, tombol "Lihat Dokumen" ditiadakan, dan tombol **Cetak Kwitansi** hanya aktif apabila status pembayaran **Approved**.
   - **Cetak Kwitansi Resmi (Lampiran 1)**: Template kuitansi resmi PT. Fath Indah Travel Service lengkap dengan logo, FITS No, Terbilang Rupiah otomatis, kotak nominal Rp & USD, tanggal Bekasi, dan tombol Cetak/Simpan PDF.
3. **Tab 2: Upload Setoran Angsuran & Fitur Split Mahram (Lampiran 3, 4, 5)**:
   - Autofill identitas nasabah, pilihan rekening bank, dan metode pembayaran.
   - **Upload Bukti Transfer Fleksibel (Lampiran 3)**: Mendukung format **Foto/Gambar (JPG, PNG, JPEG)** dan dokumen **PDF** hingga 5 MB dengan pratinjau khusus.
   - **Perbaikan Rekaman Nominal (Lampiran 4)**: Nominal pembayaran tersimpan sebagai angka utuh (contoh: `Rp 7.000.000` tersimpan akurat sebagai `7000000` di tabel `entry_angsuran_haji`, bukan terpotong menjadi `7`).
   - **Konfirmasi Split Pembayaran Mahram (Poin 5)**: Saat klik "Kirim Bukti Angsuran", sistem otomatis memeriksa relasi jamaah di tabel `mahram`. Jika terdaftar dalam grup mahram (misal 2 jamaah), pembayaran otomatis dibagi rata (contoh: Rp 3.500.000 masing-masing) dengan checkbox interaktif. Jika salah satu di-uncheck, pembayaran dialokasikan penuh (Rp 7.000.000) ke jamaah yang dipilih.
4. **Modal Profil Jamaah & Dokumen**:
   - Foto avatar jamaah dari Google Drive, rincian data lengkap, kartu dokumen per-item, serta fitur **Download List Keuangan Jamaah** (tabel rincian, CSV, cetak PDF).
5. **Running Text Pengumuman**:
   - Banner marquee interaktif dengan kecepatan disesuaikan lebih santai (dikurangi 40%) agar mudah dibaca oleh nasabah dan dapat dijeda saat kursor diarahkan ke teks.
6. **Desain Mobile-First & Desktop Friendly**:
   - Tampilan responsif dengan estetika islami modern (warna hijau emerald & biru laut Fath Indah, glassmorphism, micro-animations, dan tata letak ramah sentuhan).

---

## 🚀 Menjalankan Server Lokal (Localhost)

Aplikasi telah dilengkapi server HTTP bawaan yang dapat langsung dijalankan:

```bash
# Jalankan server lokal
npm start
# atau
npm run dev
# atau langsung
node server.js
```

Akses aplikasi di browser:
- **Localhost**: [http://localhost:3000](http://localhost:3000)
- **Network**: [http://127.0.0.1:3000](http://127.0.0.1:3000)

---

## 🔑 Akun Demo untuk Pengujian

| Tipe Akun | User ID / No. BPIH | Password | Nama Pengguna |
| :--- | :--- | :--- | :--- |
| **Nasabah Demo** | `081281866673` *(atau No. BPIH `3000956472`)* | `123456` | Indrawati A |
| **Administrator** | `admin` | `admin123` | Administrator Fath Indah |
| **Nasabah Lain** | `081299998888` | `123456` | Ahmad Hidayat |

---

## 📁 Struktur Berkas Proyek

```
HajiTerencanaNew/
├── index.html                   # Halaman antarmuka utama aplikasi
├── server.js                    # Web server HTTP lokal (port 3000)
├── package.json                 # Konfigurasi dependensi dan skrip proyek
├── supabase_schema.sql          # Skrip DDL tabel & RLS Supabase
├── import_all_data_to_supabase.py # Skrip migrasi data dari Google Sheets ke Supabase
├── running_text.json            # Berkas data fallback running text
├── src/
│   ├── main.js                  # Logika aplikasi, state, & rendering antarmuka
│   ├── style.css                # Sistem desain & styling responsif
│   └── supabase.js              # Klien & layanan database Supabase
└── README.md                    # Dokumentasi lengkap proyek
```
