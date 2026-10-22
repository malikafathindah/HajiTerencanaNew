// ====================================================================
// HajiTerencanaNew - Unified Application & Supabase Client
// Compatible with GitHub Pages, Localhost, and Mobile Browsers
// ====================================================================

const SUPABASE_URL = 'https://utqexpkwtatwzknjftpx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0cWV4cGt3dGF0d3prbmpmdHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxODQ5MTYsImV4cCI6MjEwNzc2MDkxNn0.s17as0ZuXm11AMJyYp01omnHkiqTRTGrKtYZfAI7kwE';

// Supabase Client Helper
let supabaseClient = null;
function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  }
  return null;
}

// Global State
let currentUser = null;
let rawAngsuranList = [];
let filteredAngsuranList = [];
let selectedFileBase64 = null;
let currentReceiptItem = null;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkSavedSession();
  loadRunningText();
});

function setupEventListeners() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }

  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleUploadSubmit);
  }

  const fileInput = document.getElementById('fileUploadInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileChange);
  }

  const jumlahInput = document.getElementById('uploadJumlah');
  if (jumlahInput) {
    jumlahInput.addEventListener('input', (e) => {
      formatRupiahInput(e.target);
    });
  }

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', filterAngsuran);
  }

  const statusFilter = document.getElementById('statusFilterSelect');
  if (statusFilter) {
    statusFilter.addEventListener('change', filterAngsuran);
  }
}

/**
 * Check localStorage for saved session
 */
function checkSavedSession() {
  try {
    const saved = localStorage.getItem('fath_haji_user');
    if (saved) {
      currentUser = JSON.parse(saved);
      showMainApp();
      loadAngsuranData();
    } else {
      showLoginPage();
    }
  } catch (e) {
    showLoginPage();
  }
}

function showLoginPage() {
  const loginSec = document.getElementById('loginSection');
  const mainSec = document.getElementById('mainAppSection');
  if (loginSec) loginSec.style.display = 'flex';
  if (mainSec) mainSec.style.display = 'none';
}

function showMainApp() {
  const loginSec = document.getElementById('loginSection');
  const mainSec = document.getElementById('mainAppSection');
  if (loginSec) loginSec.style.display = 'none';
  if (mainSec) mainSec.style.display = 'flex';

  if (currentUser) {
    const elNama = document.getElementById('displayNamaUser');
    if (elNama) elNama.textContent = currentUser.namaLengkap || currentUser.username;
    
    const elNoHP = document.getElementById('displayNoHPUser');
    const cleanBpih = String(currentUser.noBPIH || currentUser.username || '').replace(/^0+/, '');
    if (elNoHP) elNoHP.textContent = 'No. BPIH: ' + (cleanBpih || '-');

    const uploadNama = document.getElementById('uploadNamaNasabah');
    if (uploadNama) uploadNama.value = currentUser.namaLengkap || '';

    const uploadNoHP = document.getElementById('uploadNoHP');
    if (uploadNoHP) uploadNoHP.value = currentUser.noHP || currentUser.username || '';

    const uploadTanggal = document.getElementById('uploadTanggal');
    if (uploadTanggal && !uploadTanggal.value) {
      uploadTanggal.value = new Date().toISOString().substring(0, 10);
    }
  }
}

/**
 * Normalisasi User NoHP
 */
function normalizeUserNoHP(val) {
  if (!val) return '';
  return String(val).trim();
}

/**
 * Login Function
 */
async function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('inputUsername').value.trim();
  const password = document.getElementById('inputPassword').value.trim();

  if (!username || !password) {
    showToast('Silakan isi User ID dan Password!', 'error');
    return;
  }

  setLoginLoading(true);
  try {
    const res = await performLogin(username, password);
    setLoginLoading(false);

    if (res.success) {
      currentUser = res.user;
      localStorage.setItem('fath_haji_user', JSON.stringify(currentUser));
      showToast('Login berhasil! Selamat datang, ' + currentUser.namaLengkap, 'success');
      showMainApp();
      loadAngsuranData();
    } else {
      showToast(res.message || 'Login gagal.', 'error');
    }
  } catch (err) {
    setLoginLoading(false);
    showToast('Terjadi kesalahan koneksi.', 'error');
  }
}

async function performLogin(username, password) {
  const cleanUser = normalizeUserNoHP(username);
  const cleanPass = String(password).trim();
  const client = getSupabase();

  let authenticatedUser = null;

  if (client) {
    try {
      const { data: users, error } = await client
        .from('users')
        .select('*')
        .or(`user_id.eq.${cleanUser},username.eq.${cleanUser}`);

      if (!error && users && users.length > 0) {
        authenticatedUser = users.find(u => String(u.password).trim() === cleanPass);
      }
    } catch (e) {
      console.warn('Supabase users query error:', e);
    }
  }

  // Fallback demo accounts
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

  // Fetch jamaah profile
  const jamaahProfile = await fetchJamaahProfile(cleanUser);

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
    asalJamaah: jamaahProfile.alamat || jamaahProfile.kabkota || '',
    deposit: jamaahProfile.dpangsuran || jamaahProfile.hargabpih || '',
    detail: jamaahProfile
  };

  return { success: true, user: userSession };
}

async function fetchJamaahProfile(cleanUserNoHP) {
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
  const client = getSupabase();

  if (client) {
    try {
      // 1. Cek nobpih
      let { data } = await client
        .from('data_jamaah_haji')
        .select('*')
        .or(`nobpih.eq.${clean},nobpih.eq.${cleanBpih}`)
        .limit(1);

      if (data && data.length > 0) return data[0];

      // 2. Cek nohp
      let res = await client
        .from('data_jamaah_haji')
        .select('*')
        .or(`nohp.eq.${clean},telp.eq.${clean}`)
        .limit(1);

      if (res.data && res.data.length > 0) return res.data[0];

      // 3. Cek idjamaah
      res = await client
        .from('data_jamaah_haji')
        .select('*')
        .eq('idjamaah', clean)
        .limit(1);

      if (res.data && res.data.length > 0) return res.data[0];
    } catch (e) {
      console.warn('Error fetching jamaah profile:', e);
    }
  }

  return result;
}

function setLoginLoading(isLoading) {
  const btn = document.getElementById('btnLogin');
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> <span>Memverifikasi...</span>';
  } else {
    btn.disabled = false;
    btn.innerHTML = '<span>Masuk Sekarang</span> <i class="ri-arrow-right-line"></i>';
  }
}

/**
 * Quick fill demo login
 */
window.fillDemoUser = function (username, password) {
  const userInput = document.getElementById('inputUsername');
  const passInput = document.getElementById('inputPassword');
  if (userInput) userInput.value = username;
  if (passInput) passInput.value = password;
  const form = document.getElementById('loginForm');
  if (form) form.dispatchEvent(new Event('submit'));
};

/**
 * Logout
 */
window.handleLogout = function () {
  if (confirm('Apakah Anda yakin ingin keluar dari aplikasi?')) {
    localStorage.removeItem('fath_haji_user');
    currentUser = null;
    showLoginPage();
    showToast('Anda telah berhasil keluar.', 'info');
  }
};

/**
 * Switch Tab
 */
window.switchTab = function (tabName) {
  const tabBtnEntry = document.getElementById('tabBtnEntry');
  const tabBtnUpload = document.getElementById('tabBtnUpload');
  const tabViewEntry = document.getElementById('tabViewEntry');
  const tabViewUpload = document.getElementById('tabViewUpload');

  if (tabName === 'entry') {
    tabBtnEntry.classList.add('active');
    tabBtnUpload.classList.remove('active');
    tabViewEntry.style.display = 'block';
    tabViewUpload.style.display = 'none';
  } else {
    tabBtnUpload.classList.add('active');
    tabBtnEntry.classList.remove('active');
    tabViewUpload.style.display = 'block';
    tabViewEntry.style.display = 'none';
  }
};

/**
 * Refresh Data
 */
window.handleRefreshData = async function () {
  const icon = document.getElementById('refreshIcon');
  if (icon) icon.classList.add('spinner');
  showToast('Menyegarkan data terbaru dari Supabase...', 'info');
  await loadAngsuranData();
  await loadRunningText();
  if (icon) icon.classList.remove('spinner');
  showToast('Data berhasil diperbarui!', 'success');
};

/**
 * Load Angsuran Data
 */
async function loadAngsuranData() {
  if (!currentUser) return;
  const listContainer = document.getElementById('angsuranDataList');
  if (listContainer) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <span class="spinner" style="width:28px; height:28px; border-color:#0f766e; border-top-color:transparent;"></span>
        <p style="margin-top:12px; font-weight:600; color:#0f766e;">Memuat data angsuran dari Supabase...</p>
      </div>
    `;
  }

  const client = getSupabase();
  let angsuranList = [];

  if (client) {
    try {
      const userNoHP = normalizeUserNoHP(currentUser?.noHP || currentUser?.username || '');
      const userNoBPIH = String(currentUser?.noBPIH || '').trim().replace(/^0+/, '');

      let query = client
        .from('entry_angsuran_haji')
        .select('*')
        .order('id', { ascending: false });

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

      const { data, error } = await query;
      if (!error && data) {
        angsuranList = data.map(r => {
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
      }
    } catch (e) {
      console.warn('Error loading angsuran from Supabase:', e);
    }
  }

  rawAngsuranList = angsuranList;

  let totalTerbayar = 0;
  rawAngsuranList.forEach(item => {
    if (String(item.status).toLowerCase() === 'approved') {
      totalTerbayar += item.jumlah;
    }
  });

  updateSummaryStats({ totalTerbayar, count: rawAngsuranList.length });
  filterAngsuran();
}

function updateSummaryStats(summary) {
  const statTotal = document.getElementById('statTotalTerbayar');
  const statCount = document.getElementById('statTotalTransaksi');
  if (statTotal) statTotal.textContent = formatRupiah(summary.totalTerbayar || 0);
  if (statCount) statCount.textContent = `${summary.count || 0} Kali`;
}

function filterAngsuran() {
  const query = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('statusFilterSelect')?.value || 'ALL';

  filteredAngsuranList = rawAngsuranList.filter(item => {
    const matchQuery = !query ||
      String(item.id).toLowerCase().includes(query) ||
      String(item.noJurnal).toLowerCase().includes(query) ||
      String(item.bank).toLowerCase().includes(query) ||
      String(item.uraian).toLowerCase().includes(query) ||
      String(item.tanggal).toLowerCase().includes(query);

    const matchStatus = (statusFilter === 'ALL') || (String(item.status).toLowerCase() === statusFilter.toLowerCase());

    return matchQuery && matchStatus;
  });

  renderAngsuranList();
}

function renderAngsuranList() {
  const container = document.getElementById('angsuranDataList');
  if (!container) return;

  if (filteredAngsuranList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="ri-file-search-line"></i>
        <p>Tidak ada data angsuran yang sesuai filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredAngsuranList.map((item, idx) => {
    const statusClass = getStatusBadgeClass(item.status);
    return `
      <div class="angsuran-card fade-in">
        <div class="card-header-line">
          <div>
            <span class="card-id-jurnal">${escapeHtml(item.id)} &bull; ${escapeHtml(item.noJurnal)}</span>
          </div>
          <span class="badge ${statusClass}">${escapeHtml(item.status)}</span>
        </div>
        <div class="card-nominal">${formatRupiah(item.jumlah)}</div>
        <div class="card-uraian">${escapeHtml(item.uraian)}</div>
        <div class="card-footer-info">
          <span><i class="ri-bank-line"></i> ${escapeHtml(item.bank)} &bull; ${escapeHtml(item.tanggal)}</span>
          <button type="button" class="btn-view-struk" onclick="openReceiptModal(${idx})">
            <i class="ri-file-text-line"></i> Struk
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function getStatusBadgeClass(status) {
  const s = String(status).toLowerCase();
  if (s === 'approved') return 'badge-approved';
  if (s === 'pending') return 'badge-pending';
  return 'badge-cancle';
}

window.openReceiptModal = function (idx) {
  const item = filteredAngsuranList[idx];
  if (!item) return;
  currentReceiptItem = item;

  const modal = document.getElementById('receiptModal');
  const body = document.getElementById('modalReceiptBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="receipt-wrapper">
      <div class="receipt-header">
        <div class="receipt-brand-name">PT. FATH INDAH TRAVEL SERVICES</div>
        <div class="receipt-subtitle">Bukti Tanda Terima Pembayaran Angsuran Haji</div>
      </div>

      <div class="receipt-row">
        <span class="receipt-label">No. Transaksi</span>
        <span class="receipt-value">${escapeHtml(item.id)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">No. Jurnal</span>
        <span class="receipt-value">${escapeHtml(item.noJurnal)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Tanggal Transaksi</span>
        <span class="receipt-value">${escapeHtml(item.tanggal)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Nama Nasabah</span>
        <span class="receipt-value">${escapeHtml(item.namaNasabah)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">No. BPIH</span>
        <span class="receipt-value">${escapeHtml(item.noBPIH)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">ID Nasabah</span>
        <span class="receipt-value">${escapeHtml(item.idJamaah)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Bank Pembayaran</span>
        <span class="receipt-value">${escapeHtml(item.bank)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Metode Pembayaran</span>
        <span class="receipt-value">${escapeHtml(item.metodePembayaran)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Status Verifikasi</span>
        <span class="receipt-value"><span class="badge ${getStatusBadgeClass(item.status)}">${escapeHtml(item.status)}</span></span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Keterangan</span>
        <span class="receipt-value">${escapeHtml(item.uraian)}</span>
      </div>

      <div class="receipt-total-box">
        <span class="receipt-total-label">Total Angsuran</span>
        <span class="receipt-total-val">${formatRupiah(item.jumlah)}</span>
      </div>

      ${item.linkDokumen ? `
        <div style="margin-top:14px; text-align:center;">
          <a href="${escapeHtml(item.linkDokumen)}" target="_blank" style="font-size:12px; color:#0f766e; font-weight:600; text-decoration:underline;">
            <i class="ri-image-line"></i> Lihat Bukti Transfer Terlampir
          </a>
        </div>
      ` : ''}

      <div class="receipt-actions">
        <button type="button" class="btn-print" onclick="window.print()">
          <i class="ri-printer-line"></i> Cetak Struk
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
};

window.closeReceiptModal = function () {
  const modal = document.getElementById('receiptModal');
  if (modal) modal.style.display = 'none';
};

window.openProfileModal = function () {
  if (!currentUser) return;
  const modal = document.getElementById('profileModal');
  const body = document.getElementById('modalProfileBody');
  if (!modal || !body) return;

  const d = currentUser.detail || {};
  body.innerHTML = `
    <div style="text-align:center; margin-bottom:16px;">
      <img src="${currentUser.foto || 'https://lh3.googleusercontent.com/d/1MyvGCEnsnt_GhZBRDycxisWDDKbGfMUV'}" 
           alt="Foto Jamaah" 
           style="width:84px; height:84px; border-radius:50%; object-fit:cover; border:3px solid #0f766e; background:#f1f5f9;">
      <h3 style="font-family:'Outfit',sans-serif; font-size:17px; margin-top:8px;">${escapeHtml(currentUser.namaLengkap)}</h3>
      <p style="font-size:12px; color:#64748b;">No. BPIH: ${escapeHtml(currentUser.noBPIH || '-')}</p>
    </div>

    <div class="receipt-row"><span class="receipt-label">ID Jamaah</span><span class="receipt-value">${escapeHtml(d.idjamaah || currentUser.idNasabah || '-')}</span></div>
    <div class="receipt-row"><span class="receipt-label">No. HP</span><span class="receipt-value">${escapeHtml(currentUser.noHP || '-')}</span></div>
    <div class="receipt-row"><span class="receipt-label">No. KTP</span><span class="receipt-value">${escapeHtml(d.noktp || '-')}</span></div>
    <div class="receipt-row"><span class="receipt-label">Tempat / Tgl Lahir</span><span class="receipt-value">${escapeHtml(d.tempatlahir || '-')}, ${escapeHtml(d.tanggallahir || '-')}</span></div>
    <div class="receipt-row"><span class="receipt-label">Umur</span><span class="receipt-value">${escapeHtml(d.umur || '-')} Tahun</span></div>
    <div class="receipt-row"><span class="receipt-label">Jenis Kelamin</span><span class="receipt-value">${escapeHtml(d.jeniskelamin || '-')}</span></div>
    <div class="receipt-row"><span class="receipt-label">Alamat</span><span class="receipt-value">${escapeHtml(d.alamat || '-')}, ${escapeHtml(d.kabkota || '-')}</span></div>
    <div class="receipt-row"><span class="receipt-label">Bulan Pendaftaran</span><span class="receipt-value">${escapeHtml(d.bulanpendaftaran || '-')}</span></div>
    <div class="receipt-row"><span class="receipt-label">Estimasi Berangkat</span><span class="receipt-value">${escapeHtml(d.estimasiberangkat || '-')}</span></div>
    <div class="receipt-row"><span class="receipt-label">Mahram</span><span class="receipt-value">${escapeHtml(d.mahram || '-')}</span></div>
    <div class="receipt-row"><span class="receipt-label">Travel</span><span class="receipt-value">${escapeHtml(d.travel || 'PT. FATH INDAH')}</span></div>

    <div style="margin-top:16px; padding-top:12px; border-top:1px solid #e2e8f0;">
      <div style="font-size:12px; font-weight:700; margin-bottom:8px; color:#0f766e;">Dokumen Jamaah:</div>
      <div style="display:flex; flex-direction:column; gap:6px; font-size:12px;">
        ${d.buktisetor ? `<a href="${escapeHtml(d.buktisetor)}" target="_blank" style="color:#0284c7; text-decoration:underline;"><i class="ri-file-shield-line"></i> Bukti Setor Awal (BPIH)</a>` : '<span style="color:#94a3b8;"><i class="ri-close-circle-line"></i> Bukti Setor Awal: Belum diunggah</span>'}
        ${d.spph ? `<a href="${escapeHtml(d.spph)}" target="_blank" style="color:#0284c7; text-decoration:underline;"><i class="ri-file-text-line"></i> Berkas SPPH Kemenag</a>` : '<span style="color:#94a3b8;"><i class="ri-close-circle-line"></i> Berkas SPPH: Belum diunggah</span>'}
        ${d.buktitransfer ? `<a href="${escapeHtml(d.buktitransfer)}" target="_blank" style="color:#0284c7; text-decoration:underline;"><i class="ri-image-line"></i> Bukti Transfer Pelunasan/Setoran</a>` : '<span style="color:#94a3b8;"><i class="ri-close-circle-line"></i> Bukti Transfer: Belum diunggah</span>'}
      </div>
    </div>
  `;

  modal.style.display = 'flex';
};

window.closeProfileModal = function () {
  const modal = document.getElementById('profileModal');
  if (modal) modal.style.display = 'none';
};

function handleFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran berkas maksimal 5 MB!', 'error');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    selectedFileBase64 = event.target.result;
    const previewBox = document.getElementById('previewBox');
    const previewImg = document.getElementById('previewImg');
    const areaText = document.getElementById('uploadAreaText');
    if (previewBox && previewImg) {
      previewImg.src = selectedFileBase64;
      previewBox.style.display = 'block';
    }
    if (areaText) areaText.textContent = `Foto terpilih: ${file.name}`;
  };
  reader.readAsDataURL(file);
}

window.removeSelectedFile = function () {
  selectedFileBase64 = null;
  const fileInput = document.getElementById('fileUploadInput');
  const previewBox = document.getElementById('previewBox');
  const previewImg = document.getElementById('previewImg');
  const areaText = document.getElementById('uploadAreaText');

  if (fileInput) fileInput.value = '';
  if (previewImg) previewImg.src = '';
  if (previewBox) previewBox.style.display = 'none';
  if (areaText) areaText.textContent = 'Klik atau seret foto bukti transfer di sini';
};

async function handleUploadSubmit(e) {
  e.preventDefault();

  const jumlahRaw = document.getElementById('uploadJumlah').value;
  const jumlahClean = parseFloat(jumlahRaw.replace(/[^0-9.-]+/g, '')) || 0;

  if (jumlahClean <= 0) {
    showToast('Nominal setoran harus lebih dari Rp 0!', 'error');
    return;
  }

  const submitBtn = document.getElementById('btnSubmitUpload');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> <span>Mengirim bukti...</span>';
  }

  const client = getSupabase();
  if (!client) {
    showToast('Koneksi Supabase belum siap.', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="ri-send-plane-fill"></i> Kirim Bukti Angsuran';
    }
    return;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const formattedNow = now.toISOString().replace('T', ' ').substring(0, 19);
  const random4 = Math.floor(1000 + Math.random() * 9000);
  const random3 = Math.floor(100 + Math.random() * 900);

  const newId = `AH-${currentYear}-${random4}`;
  const newJurnal = `JRN-${currentYear}-${random3}`;

  const record = {
    timestamp: formattedNow,
    id_1: newId,
    nojurnal: newJurnal,
    idjamaah: currentUser?.idNasabah || `JH-${currentYear}-${random4}`,
    nobpih: String(currentUser?.noBPIH || '-').replace(/^0+/, ''),
    namanasabah: currentUser?.namaLengkap || 'Nasabah',
    bank: document.getElementById('uploadBank').value,
    uraian: document.getElementById('uploadUraian').value,
    jumlah: String(jumlahClean),
    nilaikurs: '0',
    user_entry: currentUser?.noHP || currentUser?.username || '',
    tanggal: document.getElementById('uploadTanggal').value || formattedNow.substring(0, 10),
    metodepembayaran: document.getElementById('uploadMetode').value,
    status: 'Pending',
    createdat: formattedNow,
    typehaji: 'Haji Terencana',
    nohp: currentUser?.noHP || '',
    linkdokumen: selectedFileBase64 || ''
  };

  try {
    const { error } = await client
      .from('entry_angsuran_haji')
      .insert([record]);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="ri-send-plane-fill"></i> Kirim Bukti Angsuran';
    }

    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error');
    } else {
      showToast('Bukti angsuran berhasil disimpan dan menunggu verifikasi!', 'success');
      document.getElementById('uploadJumlah').value = '';
      removeSelectedFile();
      switchTab('entry');
      await loadAngsuranData();
    }
  } catch (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="ri-send-plane-fill"></i> Kirim Bukti Angsuran';
    }
    showToast('Terjadi kesalahan koneksi ke Supabase.', 'error');
  }
}

async function loadRunningText() {
  const container = document.getElementById('runningTextContainer');
  const content = document.getElementById('runningTextContent');
  if (!container || !content) return;

  const client = getSupabase();
  let items = [];

  if (client) {
    try {
      const { data, error } = await client
        .from('running_text')
        .select('*')
        .eq('status', 'Aktif');

      if (!error && data && data.length > 0) {
        items = data;
      }
    } catch (e) {}
  }

  if (items.length === 0) {
    try {
      const res = await fetch('./running_text.json');
      if (res.ok) {
        items = await res.json();
      }
    } catch (e) {}
  }

  if (items.length === 0) {
    items = [
      { text: 'Selamat Datang di Aplikasi Haji Khusus - Fath Indah Travel Services', link_url: '', status: 'Aktif', icon: 'megaphone' },
      { text: 'Dapatkan Produk Unggulan Fath Indah .... Silahkan Klik Text ini', link_url: 'https://tiktok.com/@fathindah', status: 'Aktif', icon: 'megaphone' }
    ];
  }

  content.innerHTML = items.map(item => `
    <span class="running-item">
      <i class="ri-megaphone-line"></i>
      <span>${escapeHtml(item.text)}</span>
      ${item.link_url ? `<a href="${escapeHtml(item.link_url)}" target="_blank">(Klik Disini)</a>` : ''}
    </span>
  `).join('');
  container.style.display = 'flex';
}

function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number);
}

function formatRupiahInput(input) {
  let val = input.value.replace(/[^0-9]/g, '');
  if (!val) {
    input.value = '';
    return;
  }
  input.value = 'Rp ' + Number(val).toLocaleString('id-ID');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'ri-information-line';
  if (type === 'success') icon = 'ri-checkbox-circle-line';
  if (type === 'error') icon = 'ri-error-warning-line';

  toast.innerHTML = `<i class="${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
