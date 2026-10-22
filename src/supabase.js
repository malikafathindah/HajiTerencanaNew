export const SUPABASE_URL = 'https://utqexpkwtatwzknjftpx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0cWV4cGt3dGF0d3prbmpmdHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxODQ5MTYsImV4cCI6MjEwNzc2MDkxNn0.s17as0ZuXm11AMJyYp01omnHkiqTRTGrKtYZfAI7kwE';

const createClientFn = window.supabase?.createClient || ((await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')).createClient);
export const supabase = createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY);


/**
 * Normalisasi user string (NoHP atau User ID)
 */
export function normalizeUserNoHP(val) {
  if (!val) return '';
  return String(val).trim();
}

/**
 * Login function
 * 1. Checks public.users for matching user_id / username and password
 * 2. Fetches full profile from data_jamaah_haji
 */
export async function loginUser(username, password) {
  try {
    const cleanUser = normalizeUserNoHP(username);
    const cleanPass = String(password).trim();

    // Query table users
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .or(`user_id.eq.${cleanUser},username.eq.${cleanUser}`);

    if (error) {
      console.warn('Login query error on users table:', error);
    }

    let authenticatedUser = null;
    if (users && users.length > 0) {
      authenticatedUser = users.find(u => String(u.password).trim() === cleanPass);
    }

    // Fallback: check demo account if users table wasn't matched
    if (!authenticatedUser) {
      if ((cleanUser === '081281866673' || cleanUser === 'admin') && (cleanPass === '123456' || cleanPass === 'admin123')) {
        authenticatedUser = {
          user_id: cleanUser,
          username: cleanUser,
          nama: cleanUser === 'admin' ? 'Administrator Fath Indah' : 'Indrawati A',
          role: cleanUser === 'admin' ? 'Admin' : 'Nasabah'
        };
      }
    }

    if (!authenticatedUser) {
      return { success: false, message: 'User ID atau Password salah. Silakan periksa kembali!' };
    }

    // Now lookup full jamaah data
    const jamaahProfile = await getUserJamaahData(cleanUser);

    const userSession = {
      username: cleanUser,
      namaLengkap: jamaahProfile.nama || authenticatedUser.nama || authenticatedUser.full_name || cleanUser,
      role: authenticatedUser.role || 'Nasabah',
      noHP: cleanUser,
      noBPIH: String(jamaahProfile.nobpih || cleanUser).replace(/^0+/, ''),
      idNasabah: jamaahProfile.idjamaah || '',
      idJamaah: jamaahProfile.idjamaah || '',
      bulanPendaftaran: jamaahProfile.bulanpendaftaran || '',
      linkBPIH: jamaahProfile.buktisetor || '',
      linkSPPH: jamaahProfile.spph || '',
      linkBuktiTransfer: jamaahProfile.buktitransfer || '',
      mahram: jamaahProfile.mahram || '',
      foto: jamaahProfile.foto || '',
      noVA: jamaahProfile.no_va || '',
      asalJamaah: jamaahProfile.alamat || jamaahProfile.kabkota || '',
      deposit: jamaahProfile.dpangsuran || jamaahProfile.hargabpih || '',
      detail: jamaahProfile
    };

    return {
      success: true,
      user: userSession
    };
  } catch (err) {
    console.error('Error during login:', err);
    return { success: false, message: 'Terjadi kesalahan sistem: ' + (err.message || err) };
  }
}

/**
 * Mencari profil jamaah dari tabel data_jamaah_haji
 */
export async function getUserJamaahData(cleanUserNoHP) {
  const result = {
    nama: '',
    nobpih: '',
    idjamaah: '',
    bulanpendaftaran: '',
    buktisetor: '',
    spph: '',
    buktitransfer: '',
    mahram: '',
    nohp: cleanUserNoHP,
    foto: '',
    alamat: '',
    kabkota: '',
    tanggallahir: '',
    umur: ''
  };

  if (!cleanUserNoHP) return result;
  const clean = String(cleanUserNoHP).trim();
  const cleanBpih = clean.replace(/^0+/, '');

  try {
    // 1. Cek nobpih
    let { data, error } = await supabase
      .from('data_jamaah_haji')
      .select('*')
      .or(`nobpih.eq.${clean},nobpih.eq.${cleanBpih}`)
      .limit(1);

    if (data && data.length > 0) return data[0];

    // 2. Cek nohp
    let res = await supabase
      .from('data_jamaah_haji')
      .select('*')
      .or(`nohp.eq.${clean},telp.eq.${clean}`)
      .limit(1);

    if (res.data && res.data.length > 0) return res.data[0];

    // 3. Cek idjamaah
    res = await supabase
      .from('data_jamaah_haji')
      .select('*')
      .eq('idjamaah', clean)
      .limit(1);

    if (res.data && res.data.length > 0) return res.data[0];

    // 4. Cek nama
    res = await supabase
      .from('data_jamaah_haji')
      .select('*')
      .ilike('nama', clean)
      .limit(1);

    if (res.data && res.data.length > 0) return res.data[0];
  } catch (err) {
    console.warn('Error fetching jamaah data:', err);
  }

  return result;
}

/**
 * Mengambil daftar angsuran dari tabel entry_angsuran_haji terfilter berdasarkan user
 */
export async function getAngsuranData(user) {
  try {
    const userNoHP = normalizeUserNoHP(user?.noHP || user?.username || '');
    const userNoBPIH = String(user?.noBPIH || '').trim().replace(/^0+/, '');

    // Cari semua angsuran
    let query = supabase
      .from('entry_angsuran_haji')
      .select('*')
      .order('id', { ascending: false });

    // Filter by nohp, nobpih, or user_entry
    const filterConditions = [];
    if (userNoHP) {
      filterConditions.push(`nohp.eq.${userNoHP}`);
      filterConditions.push(`user_entry.eq.${userNoHP}`);
    }
    if (userNoBPIH) {
      filterConditions.push(`nobpih.eq.${userNoBPIH}`);
      filterConditions.push(`nobpih.eq.0${userNoBPIH}`);
      filterConditions.push(`user_entry.eq.${userNoBPIH}`);
    }

    if (filterConditions.length > 0) {
      query = query.or(filterConditions.join(','));
    }

    const { data: rows, error } = await query;

    if (error) {
      console.warn('Error querying entry_angsuran_haji:', error);
      return { success: false, message: error.message, data: [], summary: { totalTerbayar: 0, count: 0 } };
    }

    const angsuranList = (rows || []).map(r => {
      const rawJumlah = parseFloat(String(r.jumlah || '0').replace(/[^0-9.-]+/g, '')) || 0;
      return {
        id: r.id_1 || r.id || '-',
        noJurnal: r.nojurnal || '-',
        idJamaah: r.idjamaah || '-',
        noBPIH: r.nobpih || '-',
        namaNasabah: r.namanasabah || '-',
        bank: r.bank || '-',
        uraian: r.uraian || 'Angsuran Haji Terencana',
        jumlah: rawJumlah,
        nilaiKurs: r.nilaikurs || '-',
        user: r.user_entry || '-',
        tanggal: r.tanggal || '-',
        metodePembayaran: r.metodepembayaran || 'Transfer',
        status: r.status || 'Pending',
        typeHaji: r.typehaji || 'Haji Terencana',
        noHP: r.nohp || '-',
        linkDokumen: r.linkdokumen || '',
        createdAt: r.createdat || r.created_at || '-'
      };
    });

    // Hitung total terbayar (hanya Approved)
    let totalTerbayar = 0;
    angsuranList.forEach(item => {
      if (String(item.status).toLowerCase() === 'approved') {
        totalTerbayar += item.jumlah;
      }
    });

    return {
      success: true,
      data: angsuranList,
      summary: {
        totalTerbayar: totalTerbayar,
        count: angsuranList.length,
        namaLengkap: user.namaLengkap,
        noBPIH: user.noBPIH,
        idNasabah: user.idNasabah
      }
    };
  } catch (err) {
    console.error('Error in getAngsuranData:', err);
    return { success: false, message: err.message || err, data: [], summary: { totalTerbayar: 0, count: 0 } };
  }
}

/**
 * Menyimpan data angsuran baru
 */
export async function submitAngsuran(payload) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const formattedNow = now.toISOString().replace('T', ' ').substring(0, 19);

    const random4 = Math.floor(1000 + Math.random() * 9000);
    const random3 = Math.floor(100 + Math.random() * 900);
    const newId = `AH-${currentYear}-${random4}`;
    const newJurnal = `JRN-${currentYear}-${random3}`;

    const totalJumlah = parseFloat(String(payload.jumlah).replace(/[^0-9.-]+/g, '')) || 0;

    const record = {
      timestamp: formattedNow,
      id_1: newId,
      nojurnal: newJurnal,
      idjamaah: payload.idNasabah || `JH-${currentYear}-${random4}`,
      nobpih: String(payload.noBPIH || '-').replace(/^0+/, ''),
      namanasabah: payload.namaNasabah || 'Nasabah',
      bank: payload.bank || 'Bank Danamon Syariah IDR',
      uraian: payload.uraian || 'Angsuran Haji Terencana',
      jumlah: String(totalJumlah),
      nilaikurs: '0',
      user_entry: payload.userNoHP || '',
      tanggal: payload.tanggal || formattedNow.substring(0, 10),
      metodepembayaran: payload.metodePembayaran || 'Transfer',
      status: 'Pending',
      createdat: formattedNow,
      typehaji: 'Haji Terencana',
      nohp: payload.userNoHP || '',
      linkdokumen: payload.fileData || '' // Base64 image snapshot
    };

    const { data, error } = await supabase
      .from('entry_angsuran_haji')
      .insert([record])
      .select();

    if (error) {
      console.error('Error inserting into entry_angsuran_haji:', error);
      throw error;
    }

    return {
      success: true,
      message: 'Bukti angsuran berhasil disimpan dan sedang menunggu verifikasi (Pending).',
      data: {
        id: newId,
        noJurnal: newJurnal,
        fileUrl: payload.fileData || ''
      }
    };
  } catch (err) {
    console.error('Error submitting angsuran:', err);
    return { success: false, message: 'Gagal menyimpan setoran: ' + (err.message || err) };
  }
}

/**
 * Mengambil Running Text dari Supabase (atau fallback JSON)
 */
export async function getRunningText() {
  try {
    const { data, error } = await supabase
      .from('running_text')
      .select('*')
      .eq('status', 'Aktif');

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {
    console.log('RunningText table not found or error, reading local fallback');
  }

  // Fallback to local running_text.json
  try {
    const res = await fetch('./running_text.json');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // fallback defaults
  }

  return [
    { text: 'Selamat Datang di Aplikasi Haji Khusus - Fath Indah Travel Services', link_url: '', status: 'Aktif', icon: 'megaphone' },
    { text: 'Dapatkan Produk Unggulan Fath Indah .... Silahkan Klik Text ini', link_url: 'https://tiktok.com/@fathindah', status: 'Aktif', icon: 'megaphone' }
  ];
}
