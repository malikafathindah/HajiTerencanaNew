-- ====================================================================
-- SKEMA DATABASE HAJI TERENCANA NEW - SUPABASE
-- Project: HajiTerencanaNew (Fath Indah Travel Services)
-- Jalankan skrip ini di SQL Editor Supabase jika tabel belum dibuat
-- ====================================================================

-- 1. Tabel Running Text (Marquee Pengumuman)
CREATE TABLE IF NOT EXISTS public.running_text (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    link_url TEXT,
    status VARCHAR(50) DEFAULT 'Aktif',
    icon VARCHAR(50) DEFAULT 'megaphone',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW())
);

-- 2. Tabel Users (Akun Pengguna Nasabah & Admin)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    nama VARCHAR(255),
    full_name VARCHAR(255),
    jabatan VARCHAR(100) DEFAULT 'Nasabah',
    role VARCHAR(50) DEFAULT 'Nasabah',
    kanwil VARCHAR(100),
    kantor VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    foto_wajah TEXT,
    face_descriptor JSONB,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()),
    "NoUrut" INTEGER
);

-- 3. Tabel Data Jamaah Haji
CREATE TABLE IF NOT EXISTS public.data_jamaah_haji (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TEXT,
    idjamaah VARCHAR(100),
    nobpih VARCHAR(100),
    nama VARCHAR(255),
    bulanpendaftaran VARCHAR(100),
    nohp VARCHAR(100),
    jenishaji VARCHAR(100),
    banksetorawal VARCHAR(100),
    createdat TEXT,
    updatedat TEXT,
    bpjs TEXT,
    buktiangsuran TEXT,
    buktisetor TEXT,
    buktitransfer TEXT,
    kartukeluarga TEXT,
    ktp TEXT,
    paspor TEXT,
    spph TEXT,
    foto TEXT,
    bukunikah TEXT,
    visa TEXT,
    tasreh TEXT,
    bpihlunas TEXT,
    doclain TEXT,
    noktp VARCHAR(100),
    namaortu VARCHAR(255),
    tempatlahir VARCHAR(100),
    tanggallahir VARCHAR(50),
    umur VARCHAR(20),
    jeniskelamin VARCHAR(50),
    kewarganegaraan VARCHAR(100),
    alamat TEXT,
    desakel VARCHAR(100),
    kecamatan VARCHAR(100),
    kabkot VARCHAR(50),
    kabkota VARCHAR(100),
    provinsi VARCHAR(50),
    nmprovinsi VARCHAR(100),
    kodepos VARCHAR(20),
    pendidikan VARCHAR(100),
    pekerjaan VARCHAR(100),
    pergihaji VARCHAR(50),
    mahram TEXT,
    hubmahram VARCHAR(100),
    nopendaftaran VARCHAR(100),
    goldarah VARCHAR(10),
    statusnikah VARCHAR(50),
    tglspph VARCHAR(50),
    pin VARCHAR(50),
    travel VARCHAR(100),
    telp VARCHAR(100),
    statusbpih VARCHAR(50),
    nospph VARCHAR(100),
    bank VARCHAR(100),
    tglinput VARCHAR(50),
    tgllunas VARCHAR(50),
    hargabpih TEXT,
    dpangsuran TEXT,
    blangsuran TEXT,
    tinggi VARCHAR(20),
    alis VARCHAR(50),
    hidung VARCHAR(50),
    berat VARCHAR(20),
    rw VARCHAR(20),
    muka VARCHAR(50),
    rt VARCHAR(20),
    kode_diagnosis VARCHAR(100),
    rambut VARCHAR(50),
    nodaftarmahram VARCHAR(100),
    nomor_jurnal_erahhajj VARCHAR(100),
    faedah_rupiah TEXT,
    diskon_usd TEXT,
    kurs_paket TEXT,
    tipe_kamar VARCHAR(50),
    tanggal_bayar_agen VARCHAR(50),
    nama_paket_haji VARCHAR(255),
    diskon_rupiah TEXT,
    harga_usd TEXT,
    catatan_paket TEXT,
    harga_rupiah TEXT,
    total_harga_usd TEXT,
    bank_agen VARCHAR(100),
    total_harga_rupiah TEXT,
    nama_agen VARCHAR(255),
    no_hp_agen VARCHAR(100),
    faedah_usd TEXT,
    catatan_agen TEXT,
    noporsi VARCHAR(100),
    namajamaah VARCHAR(255),
    statushaji VARCHAR(100),
    kanwil VARCHAR(100),
    downpayment TEXT,
    nomor_rekening_agent VARCHAR(100),
    estimasiberangkat VARCHAR(100),
    tglestimasi VARCHAR(50),
    doc TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW())
);

-- 4. Tabel Entry Angsuran Haji
CREATE TABLE IF NOT EXISTS public.entry_angsuran_haji (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TEXT,
    id_1 VARCHAR(100),
    nojurnal VARCHAR(100),
    idjamaah VARCHAR(100),
    nobpih VARCHAR(100),
    namanasabah VARCHAR(255),
    bank VARCHAR(150),
    uraian TEXT,
    jumlah TEXT,
    nilaikurs VARCHAR(50),
    user_entry VARCHAR(100),
    tanggal VARCHAR(50),
    metodepembayaran VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending',
    createdat TEXT,
    typehaji VARCHAR(100) DEFAULT 'Haji Terencana',
    nohp VARCHAR(100),
    linkdokumen TEXT,
    nojurnalerahajj VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW())
);

-- Indeks Performa
CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_nama ON public.users(nama);
CREATE INDEX IF NOT EXISTS idx_jamaah_nobpih ON public.data_jamaah_haji(nobpih);
CREATE INDEX IF NOT EXISTS idx_jamaah_nohp ON public.data_jamaah_haji(nohp);
CREATE INDEX IF NOT EXISTS idx_jamaah_idjamaah ON public.data_jamaah_haji(idjamaah);
CREATE INDEX IF NOT EXISTS idx_angsuran_nobpih ON public.entry_angsuran_haji(nobpih);
CREATE INDEX IF NOT EXISTS idx_angsuran_nohp ON public.entry_angsuran_haji(nohp);
CREATE INDEX IF NOT EXISTS idx_angsuran_user_entry ON public.entry_angsuran_haji(user_entry);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.running_text ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_jamaah_haji ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_angsuran_haji ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Penuh untuk Anon & Authenticated
DROP POLICY IF EXISTS "Akses Penuh RunningText" ON public.running_text;
CREATE POLICY "Akses Penuh RunningText" ON public.running_text FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Users" ON public.users;
CREATE POLICY "Akses Penuh Users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh DataJamaahHaji" ON public.data_jamaah_haji;
CREATE POLICY "Akses Penuh DataJamaahHaji" ON public.data_jamaah_haji FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh EntryAngsuranHaji" ON public.entry_angsuran_haji;
CREATE POLICY "Akses Penuh EntryAngsuranHaji" ON public.entry_angsuran_haji FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Berikan GRANT permission
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.running_text TO anon, authenticated;
GRANT ALL ON TABLE public.users TO anon, authenticated;
GRANT ALL ON TABLE public.data_jamaah_haji TO anon, authenticated;
GRANT ALL ON TABLE public.entry_angsuran_haji TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
