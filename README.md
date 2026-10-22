# HajiTerencanaNew - Aplikasi Web Haji Khusus Fath Indah

Aplikasi web modern, responsif (Desktop & Smartphone) dan terintegrasi langsung dengan database **Supabase** untuk pencatatan, verifikasi setoran, serta monitoring riwayat angsuran haji nasabah **PT. Fath Indah Travel Services**.

---

## 📌 Sumber Data & Konfigurasi Supabase

- **Supabase Project URL**: `https://utqexpkwtatwzknjftpx.supabase.co`
- **Tabel Database**:
  1. `data_jamaah_haji`: Menyimpan 82 data profil jamaah haji (No. BPIH, Nama, SPPH, Alamat, Dokumen, Mahram, dsb).
  2. `entry_angsuran_haji`: Menyimpan 439+ riwayat pembayaran angsuran haji, no jurnal, tanggal, bank, status verifikasi (`Approved`, `Pending`, `Cancle`), nominal, dan lampiran bukti transfer.
  3. `users`: Menyimpan 126 akun nasabah dan administrator untuk autentikasi login.
  4. `running_text`: Pengumuman marquee banner yang berjalan di bagian atas aplikasi.
- **Skrip SQL Supabase**: Tersedia di file [`supabase_schema.sql`](./supabase_schema.sql).

---

## ✨ Fitur Utama Aplikasi

1. **Autentikasi Multi-User**:
   - Mendukung login menggunakan **Nomor HP** (contoh: `081281866673`), **Nomor BPIH** (contoh: `3000956472`), maupun akun **Administrator** (`admin`).
   - Tombol Quick Fill Demo untuk kemudahan pengujian akun nasabah dan admin.
2. **Tab 1: Entry Angsuran Haji**:
   - Ringkasan realtime: **Total Terbayar** (format Rupiah) & **Total Transaksi**.
   - Pencarian cerdas instan (ID Transaksi, No. Jurnal, Bank, Uraian, Tanggal).
   - Filter status dinamis: `Approved`, `Pending`, `Cancle`.
   - Cetak & Lihat **Struk Bukti Pembayaran Resmi** (dilengkapi tombol Cetak / Print).
3. **Tab 2: Upload Setoran Angsuran**:
   - Autofill otomatis identitas nasabah yang sedang aktif.
   - Pilihan rekening bank tujuan & metode pembayaran.
   - Input nominal dengan auto-formatting Rupiah.
   - Unggah bukti transfer (JPG, PNG, JPEG) dengan pratinjau (preview) langsung dan validasi ukuran.
   - Tersimpan langsung ke tabel `entry_angsuran_haji` di Supabase dengan status `Pending`.
4. **Modal Profil Jamaah & Dokumen**:
   - Klik identitas/logo header untuk melihat profil lengkap jamaah (biodata, umur, alamat, nomor porsi, mahram, estimasi keberangkatan) dan tautan dokumen resmi (BPIH, SPPH, Bukti Transfer).
5. **Running Text Pengumuman**:
   - Banner marquee interaktif di bagian atas aplikasi dengan icon pengumuman dan tautan ke kanal media sosial/web Fath Indah.
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
