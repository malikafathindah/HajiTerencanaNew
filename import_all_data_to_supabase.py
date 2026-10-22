import zipfile
import xml.etree.ElementTree as ET
import urllib.request
import json
import re
import sys
from datetime import datetime, timedelta

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass


supabase_url = 'https://utqexpkwtatwzknjftpx.supabase.co'
anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0cWV4cGt3dGF0d3prbmpmdHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxODQ5MTYsImV4cCI6MjEwNzc2MDkxNn0.s17as0ZuXm11AMJyYp01omnHkiqTRTGrKtYZfAI7kwE'

headers = {
    'apikey': anon_key,
    'Authorization': f'Bearer {anon_key}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

def clean_val(val):
    if val is None:
        return None
    s = str(val).strip()
    if s == '' or s.lower() == 'none' or s.lower() == 'null':
        return None
    # If scientific notation like 3.001042922E9 or ends in .0
    if re.match(r'^\d+(\.\d+)?[eE]\+?\d+$', s):
        try:
            return str(int(float(s)))
        except Exception:
            pass
    if re.match(r'^\d+\.0$', s):
        return s[:-2]
    return s

def format_excel_date(val, date_only=False):
    cleaned = clean_val(val)
    if not cleaned:
        return None
    try:
        f = float(cleaned)
        # Excel serial date roughly between 1980 and 2050 (29221 to 55153)
        if 25000 <= f <= 60000:
            dt = datetime(1899, 12, 30) + timedelta(days=f)
            if date_only:
                return dt.strftime('%Y-%m-%d')
            return dt.strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        pass
    return cleaned

def parse_sheet_rows(filename, sheet_name):
    with zipfile.ZipFile(filename) as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss_tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in ss_tree.findall('ns:si', ns):
                texts = [elem.text for elem in si.findall('.//ns:t', ns) if elem.text]
                shared_strings.append(''.join(texts))
        
        rels_tree = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rns = {'ns': 'http://schemas.openxmlformats.org/package/2006/relationships'}
        rel_map = {rel.attrib.get('Id'): rel.attrib.get('Target') for rel in rels_tree.findall('ns:Relationship', rns)}
            
        wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        for s in wb_tree.findall('.//ns:sheet', ns):
            if s.attrib.get('name') == sheet_name:
                rid = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                target = 'xl/' + rel_map[rid]
                sheet_tree = ET.fromstring(z.read(target))
                rows = []
                for row in sheet_tree.findall('.//ns:row', ns):
                    cols = {}
                    for c in row.findall('ns:c', ns):
                        ref = c.attrib.get('r')
                        letter = ''.join([ch for ch in ref if ch.isalpha()])
                        t = c.attrib.get('t')
                        v = c.find('ns:v', ns)
                        val = v.text if v is not None else None
                        if t == 's' and val is not None:
                            val = shared_strings[int(val)]
                        cols[letter] = val
                    rows.append(cols)
                return rows
    return []

def post_batch(table_name, records, batch_size=100, use_upsert=False):
    total = len(records)
    inserted = 0
    post_headers = dict(headers)
    if not use_upsert:
        post_headers['Prefer'] = 'return=minimal'
    else:
        post_headers['Prefer'] = 'resolution=merge-duplicates'
        
    for i in range(0, total, batch_size):
        chunk = records[i:i + batch_size]
        req = urllib.request.Request(
            f"{supabase_url}/rest/v1/{table_name}",
            data=json.dumps(chunk).encode('utf-8'),
            headers=post_headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                inserted += len(chunk)
                print(f"  [{table_name}] Batch {i // batch_size + 1}: {inserted}/{total} baris tersimpan.")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            print(f"  [{table_name}] Gagal pada batch {i}: {e.code} - {err_body}")
            return False
    return True

# ====================================================================
# 1. IMPORT DATA JAMAAH HAJI
# ====================================================================
def import_data_jamaah_haji():
    print("\n--- 1. Membaca & Mengimpor Sheet DataJamaahHaji ---")
    rows = parse_sheet_rows('sheet2_xlsx.xlsx', 'DataJamaahHaji')
    if not rows:
        print("Sheet DataJamaahHaji tidak ditemukan!")
        return
    
    header = rows[0]
    col_map = {v.strip(): k for k, v in header.items() if v}
    print(f"Total baris di sheet DataJamaahHaji: {len(rows) - 1}")
    
    # DB columns lowercase
    db_cols = [
        'timestamp', 'idjamaah', 'nobpih', 'nama', 'bulanpendaftaran', 'nohp', 'jenishaji', 'banksetorawal',
        'createdat', 'updatedat', 'bpjs', 'buktiangsuran', 'buktisetor', 'buktitransfer', 'kartukeluarga',
        'ktp', 'paspor', 'spph', 'foto', 'bukunikah', 'visa', 'tasreh', 'bpihlunas', 'doclain', 'noktp',
        'namaortu', 'tempatlahir', 'tanggallahir', 'umur', 'jeniskelamin', 'kewarganegaraan', 'alamat',
        'desakel', 'kecamatan', 'kabkot', 'kabkota', 'provinsi', 'nmprovinsi', 'kodepos', 'pendidikan',
        'pekerjaan', 'pergihaji', 'mahram', 'hubmahram', 'nopendaftaran', 'goldarah', 'statusnikah',
        'tglspph', 'pin', 'travel', 'telp', 'statusbpih', 'nospph', 'bank', 'tglinput', 'tgllunas',
        'hargabpih', 'dpangsuran', 'blangsuran', 'tinggi', 'alis', 'hidung', 'berat', 'rw', 'muka', 'rt',
        'kode_diagnosis', 'rambut', 'nodaftarmahram', 'nomor_jurnal_erahhajj', 'faedah_rupiah', 'diskon_usd',
        'kurs_paket', 'tipe_kamar', 'tanggal_bayar_agen', 'nama_paket_haji', 'diskon_rupiah', 'harga_usd',
        'catatan_paket', 'harga_rupiah', 'total_harga_usd', 'bank_agen', 'total_harga_rupiah', 'nama_agen',
        'no_hp_agen', 'faedah_usd', 'catatan_agen', 'noporsi', 'namajamaah', 'statushaji', 'kanwil',
        'downpayment', 'nomor_rekening_agent', 'estimasiberangkat', 'tglestimasi', 'doc'
    ]
    
    # Map sheet column name variations to db column
    sheet_header_to_db = {}
    for h_name, col_letter in col_map.items():
        clean_h = re.sub(r'[\s_]+', '', h_name.lower())
        for db_c in db_cols:
            if clean_h == re.sub(r'[\s_]+', '', db_c.lower()):
                sheet_header_to_db[col_letter] = db_c
                break

    records = []
    for r in rows[1:]:
        rec = {}
        for col_letter, val in r.items():
            db_field = sheet_header_to_db.get(col_letter)
            if db_field:
                cval = clean_val(val)
                if db_field in ['timestamp', 'createdat', 'updatedat']:
                    cval = format_excel_date(cval)
                elif db_field in ['tanggallahir', 'tglspph', 'tglinput', 'tgllunas', 'tglestimasi']:
                    cval = format_excel_date(cval, date_only=True)
                rec[db_field] = cval
        
        # Ensure nama and idjamaah/nobpih exist
        if rec.get('nama') or rec.get('idjamaah') or rec.get('nobpih'):
            records.append(rec)
            
    print(f"Menyiapkan {len(records)} data jamaah untuk Supabase...")
    post_batch('data_jamaah_haji', records, batch_size=100)

# ====================================================================
# 2. IMPORT ENTRY ANGSURAN HAJI
# ====================================================================
def import_entry_angsuran_haji():
    print("\n--- 2. Membaca & Mengimpor Sheet EntryAngsuranHaji ---")
    rows = parse_sheet_rows('sheet2_xlsx.xlsx', 'EntryAngsuranHaji')
    if not rows:
        print("Sheet EntryAngsuranHaji tidak ditemukan!")
        return
        
    header = rows[0]
    col_map = {v.strip(): k for k, v in header.items() if v}
    print(f"Total baris di sheet EntryAngsuranHaji: {len(rows) - 1}")
    
    records = []
    for r in rows[1:]:
        rec = {
            'timestamp': format_excel_date(clean_val(r.get(col_map.get('Timestamp')))),
            'id_1': clean_val(r.get(col_map.get('ID'))),
            'nojurnal': clean_val(r.get(col_map.get('NoJurnal'))),
            'idjamaah': clean_val(r.get(col_map.get('IDJamaah'))),
            'nobpih': clean_val(r.get(col_map.get('NoBPIH'))),
            'namanasabah': clean_val(r.get(col_map.get('NamaNasabah'))),
            'bank': clean_val(r.get(col_map.get('Bank'))),
            'uraian': clean_val(r.get(col_map.get('Uraian'))),
            'jumlah': clean_val(r.get(col_map.get('Jumlah'))),
            'nilaikurs': clean_val(r.get(col_map.get('NilaiKurs'))),
            'user_entry': clean_val(r.get(col_map.get('User'))),
            'tanggal': format_excel_date(clean_val(r.get(col_map.get('Tanggal'))), date_only=True),
            'metodepembayaran': clean_val(r.get(col_map.get('MetodePembayaran'))),
            'status': clean_val(r.get(col_map.get('Status'))) or 'Approved',
            'createdat': format_excel_date(clean_val(r.get(col_map.get('CreatedAt')))),
            'typehaji': clean_val(r.get(col_map.get('TypeHaji'))) or 'Haji Terencana',
            'nohp': clean_val(r.get(col_map.get('NoHP'))),
            'linkdokumen': clean_val(r.get(col_map.get('LinkDokumen'))),
            'nojurnalerahajj': clean_val(r.get(col_map.get('NoJurnalErahajj')))
        }
        if rec.get('id_1') or rec.get('nojurnal') or rec.get('namanasabah'):
            records.append(rec)
            
    print(f"Menyiapkan {len(records)} data angsuran untuk Supabase...")
    post_batch('entry_angsuran_haji', records, batch_size=100)

# ====================================================================
# 3. IMPORT USERS
# ====================================================================
def import_users():
    print("\n--- 3. Membaca & Mengimpor Sheet User ---")
    rows = parse_sheet_rows('sheet2_xlsx.xlsx', 'User')
    if not rows:
        print("Sheet User tidak ditemukan di sheet2!")
        rows = []
        
    records_dict = {}
    
    # 1. Tambahkan user demo & admin awal
    seed_users = [
        {'user_id': '081281866673', 'username': '081281866673', 'password': '123456', 'nama': 'Indrawati A', 'full_name': 'Indrawati A', 'role': 'Nasabah'},
        {'user_id': '081299998888', 'username': '081299998888', 'password': '123456', 'nama': 'Ahmad Hidayat', 'full_name': 'Ahmad Hidayat', 'role': 'Nasabah'},
        {'user_id': 'admin', 'username': 'admin', 'password': 'admin123', 'nama': 'Administrator Fath Indah', 'full_name': 'Administrator Fath Indah', 'role': 'Admin'}
    ]
    for su in seed_users:
        records_dict[su['user_id']] = su
        
    # 2. Baca dari sheet2
    if rows:
        header = rows[0]
        col_map = {v.strip(): k for k, v in header.items() if v}
        for r in rows[1:]:
            u_id = clean_val(r.get(col_map.get('User')))
            pwd = clean_val(r.get(col_map.get('Password'))) or '123456'
            nama = clean_val(r.get(col_map.get('Nama Lengkap'))) or u_id
            role = clean_val(r.get(col_map.get('Role'))) or 'Nasabah'
            if u_id:
                records_dict[u_id] = {
                    'user_id': u_id,
                    'username': u_id,
                    'password': pwd,
                    'nama': nama,
                    'full_name': nama,
                    'role': role
                }
                
    # 3. Baca juga dari sheet1 jika ada user tambahan
    try:
        s1_rows = parse_sheet_rows('sheet1_xlsx.xlsx', 'User')
        if s1_rows:
            h1 = s1_rows[0]
            m1 = {v.strip(): k for k, v in h1.items() if v}
            for r in s1_rows[1:]:
                u_id = clean_val(r.get(m1.get('UserID', m1.get('User'))))
                pwd = clean_val(r.get(m1.get('Password'))) or '123456'
                nama = clean_val(r.get(m1.get('Nama Lengkap'))) or u_id
                role = clean_val(r.get(m1.get('Role'))) or 'Nasabah'
                if u_id and u_id not in records_dict:
                    records_dict[u_id] = {
                        'user_id': u_id,
                        'username': u_id,
                        'password': pwd,
                        'nama': nama,
                        'full_name': nama,
                        'role': role
                    }
    except Exception as e:
        print(f"Catatan import sheet1 User: {e}")
        
    records = list(records_dict.values())
    print(f"Menyiapkan {len(records)} user unik untuk Supabase...")
    post_batch('users', records, batch_size=100, use_upsert=True)

# ====================================================================
# 4. IMPORT RUNNING TEXT & SIMPAN JSON FALLBACK
# ====================================================================
def import_running_text():
    print("\n--- 4. Membaca Sheet RunningText ---")
    rows = parse_sheet_rows('sheet2_xlsx.xlsx', 'RunningText')
    items = []
    if rows:
        header = rows[0]
        col_map = {v.strip(): k for k, v in header.items() if v}
        for r in rows[1:]:
            txt = clean_val(r.get(col_map.get('Text')))
            link = clean_val(r.get(col_map.get('Link URL')))
            status = clean_val(r.get(col_map.get('Status'))) or 'Aktif'
            icon = clean_val(r.get(col_map.get('Icon'))) or 'megaphone'
            if txt:
                items.append({
                    'text': txt,
                    'link_url': link,
                    'status': status,
                    'icon': icon
                })
                
    # Fallback jika kosong
    if not items:
        items = [
            {'text': 'Selamat Datang di Aplikasi Haji Khusus - Fath Indah Travel Services', 'link_url': '', 'status': 'Aktif', 'icon': 'megaphone'},
            {'text': 'Dapatkan Produk Unggulan Fath Indah .... Silahkan Klik Text ini', 'link_url': 'https://tiktok.com/@fathindah', 'status': 'Aktif', 'icon': 'megaphone'}
        ]
        
    # Simpan ke file JSON untuk fallback frontend jika tabel belum di-create via SQL Editor
    with open('running_text.json', 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    print(f"✓ Tersimpan {len(items)} item running text ke running_text.json.")
    
    # Coba kirim ke Supabase jika tabel sudah dibuat
    req = urllib.request.Request(f"{supabase_url}/rest/v1/running_text", data=json.dumps(items).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            print("✓ Berhasil menyimpan running text langsung ke tabel Supabase 'running_text'!")
    except urllib.error.HTTPError as e:
        print(f"ℹ️ Info: Tabel 'running_text' di Supabase belum ada (Status {e.code}). Skrip SQL sudah disiapkan di 'supabase_schema.sql'.")

if __name__ == '__main__':
    print("======================================================")
    print("🚀 MEMULAI MIGRASI DATA LENGKAP KE SUPABASE")
    print(f"Target: {supabase_url}")
    print("======================================================")
    
    import_data_jamaah_haji()
    import_entry_angsuran_haji()
    import_users()
    import_running_text()
    
    print("\n======================================================")
    print("✅ PROSES MIGRASI DATA SELESAI!")
    print("======================================================")
