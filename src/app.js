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

    // Update Header Avatar with personal photo if available
    const headerLogo = document.querySelector('.header-logo');
    if (headerLogo && currentUser.foto) {
      headerLogo.src = formatDriveFileUrl(currentUser.foto);
    }

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
 * Helper to convert Google Drive URL to viewable CDN URL
 */
function formatDriveFileUrl(url) {
  if (!url) return '';
  const s = String(url).trim();
  let fileId = '';
  const m1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) fileId = m1[1];
  else {
    const m2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) fileId = m2[1];
  }
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return s;
}

function getDriveViewUrl(url) {
  if (!url) return '';
  const s = String(url).trim();
  let fileId = '';
  const m1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) fileId = m1[1];
  else {
    const m2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) fileId = m2[1];
  }
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  }
  return s;
}

/**
 * Format date to Indonesian (e.g. 24 Juli 2026)
 */
function formatIndonesianDate(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // Try YYYY-MM-DD
      const parts = String(dateStr).split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else if (parts[2].length === 4) {
          d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
    }
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }
  } catch (e) {}
  return dateStr;
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

  // Fallback demo accounts or flexible password check
  if (!authenticatedUser) {
    if (cleanUser === '081281866673' && (cleanPass === '123456' || cleanPass.length >= 4)) {
      authenticatedUser = { user_id: cleanUser, username: cleanUser, nama: 'Indrawati A', role: 'Nasabah' };
    } else if (cleanUser === '3000986385' && (cleanPass === '1975' || cleanPass === '123456')) {
      authenticatedUser = { user_id: cleanUser, username: cleanUser, nama: 'Nur Firmanullah', role: 'Nasabah' };
    } else if (cleanUser === 'admin' && cleanPass === 'admin123') {
      authenticatedUser = { user_id: cleanUser, username: cleanUser, nama: 'Administrator Fath Indah', role: 'Admin' };
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
        .order('id_1', { ascending: false });

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

/**
 * Render List of Angsuran Cards (Lampiran 5)
 * Card is entirely clickable!
 */
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
      <div class="angsuran-card fade-in" onclick="openReceiptModal(${idx})" title="Klik untuk Lihat Dokumen & Cetak Kwitansi">
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
          <button type="button" class="btn-view-struk" onclick="event.stopPropagation(); openReceiptModal(${idx});">
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

/**
 * Modal Kwitansi & Dokumen (Lampiran 5)
 */
window.openReceiptModal = function (idx) {
  const item = filteredAngsuranList[idx];
  if (!item) return;
  currentReceiptItem = item;

  const modal = document.getElementById('receiptModal');
  const body = document.getElementById('modalReceiptBody');
  if (!modal || !body) return;

  const hasDoc = Boolean(item.linkDokumen);

  body.innerHTML = `
    <div class="receipt-wrapper">
      <div class="receipt-header">
        <div class="receipt-brand-name">PT. FATH INDAH TRAVEL SERVICES</div>
        <div class="receipt-subtitle">Kwitansi Tanda Terima Pembayaran Angsuran Haji</div>
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
        <span class="receipt-value">${formatIndonesianDate(item.tanggal)}</span>
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

      <!-- Dua Tombol Aksi Sesuai Poin 5: Lihat Dokumen & Cetak Kwitansi -->
      <div class="receipt-dual-actions">
        <button type="button" class="btn-action-doc" onclick="viewReceiptDoc(${idx})">
          <i class="ri-file-search-line"></i> Lihat Dokumen
        </button>
        <button type="button" class="btn-action-print" onclick="window.print()">
          <i class="ri-printer-line"></i> Cetak Kwitansi
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

/**
 * View receipt transfer document
 */
window.viewReceiptDoc = function (idx) {
  const item = filteredAngsuranList[idx] || currentReceiptItem;
  if (!item) return;

  if (item.linkDokumen) {
    viewDocumentViewer('Bukti Transfer - ' + item.noJurnal, item.linkDokumen);
  } else {
    // If no direct upload link, check if jamaah has global buktitransfer
    const jamaahTransfer = currentUser?.detail?.buktitransfer;
    if (jamaahTransfer) {
      viewDocumentViewer('Bukti Transfer Setoran (' + item.noJurnal + ')', jamaahTransfer);
    } else {
      showToast('Dokumen bukti transfer fisik tersimpan di kantor / bank.', 'info');
    }
  }
};

/**
 * Profile Jamaah Modal (Lampiran 1 & 4)
 */
window.openProfileModal = function () {
  if (!currentUser) return;
  const modal = document.getElementById('profileModal');
  const body = document.getElementById('modalProfileBody');
  if (!modal || !body) return;

  const d = currentUser.detail || {};
  const photoUrl = formatDriveFileUrl(d.foto || currentUser.foto);

  body.innerHTML = `
    <!-- 1. Avatar Foto Jamaah (Lampiran 1 & 4) -->
    <div class="profile-avatar-container">
      <img src="${photoUrl || 'https://lh3.googleusercontent.com/d/1MyvGCEnsnt_GhZBRDycxisWDDKbGfMUV'}" 
           alt="Foto ${escapeHtml(currentUser.namaLengkap)}" 
           class="profile-avatar-img"
           onerror="this.onerror=null; this.src='https://drive.google.com/uc?export=view&id=1MyvGCEnsnt_GhZBRDycxisWDDKbGfMUV';">
      <h2 class="profile-user-name">${escapeHtml(currentUser.namaLengkap)}</h2>
      <p class="profile-user-id">User : ${escapeHtml(currentUser.noBPIH || currentUser.username)}</p>
    </div>

    <!-- 2. Rincian Info Jamaah (Format Lampiran 1) -->
    <div class="profile-info-list">
      <div class="profile-info-row">
        <span class="profile-info-label">ID Jamaah</span>
        <span class="profile-info-val">${escapeHtml(d.idjamaah || currentUser.idNasabah || '-')}</span>
      </div>
      <div class="profile-info-row">
        <span class="profile-info-label"><i class="ri-file-text-line"></i> No. BPIH</span>
        <span class="profile-info-val">${escapeHtml(currentUser.noBPIH || '-')}</span>
      </div>
      <div class="profile-info-row">
        <span class="profile-info-label"><i class="ri-user-line"></i> Nama Lengkap</span>
        <span class="profile-info-val">${escapeHtml(currentUser.namaLengkap || '-')}</span>
      </div>
      <div class="profile-info-row">
        <span class="profile-info-label"><i class="ri-calendar-line"></i> Bulan Pendaftaran</span>
        <span class="profile-info-val">${escapeHtml(d.bulanpendaftaran || '-')}</span>
      </div>
      <div class="profile-info-row">
        <span class="profile-info-label"><i class="ri-map-pin-line"></i> Asal Jamaah</span>
        <span class="profile-info-val">${escapeHtml(d.alamat || '-')}${d.kabkota ? ', ' + escapeHtml(d.kabkota) : ''}</span>
      </div>
      <div class="profile-info-row">
        <span class="profile-info-label"><i class="ri-phone-line"></i> No. HP</span>
        <span class="profile-info-val">${escapeHtml(currentUser.noHP || '-')}</span>
      </div>
      <div class="profile-info-row">
        <span class="profile-info-label"><i class="ri-flight-takeoff-line"></i> Estimasi Berangkat</span>
        <span class="profile-info-val">${escapeHtml(d.estimasiberangkat || '-')}</span>
      </div>
    </div>

    <!-- 3. List Keuangan Jamaah Card (Lampiran 1 & 2) -->
    <div class="finance-banner-card">
      <div class="finance-banner-top">
        <i class="ri-bar-chart-box-line finance-banner-icon"></i>
        <div>
          <div class="finance-banner-title">List Keuangan Jamaah</div>
          <div class="finance-banner-desc">Cetak &amp; Download Rincian Setoran / Saldo</div>
        </div>
      </div>
      <button type="button" class="btn-download-finance" onclick="openFinanceListModal()">
        <i class="ri-download-2-line"></i> Download List Keuangan
      </button>
    </div>

    <!-- 4. Dokumen Jamaah Per Kartu (Lampiran 1 & 3) -->
    <div class="doc-section-header">
      <i class="ri-cloud-line" style="color:#0284c7; font-size:18px;"></i>
      <span>Dokumen Jamaah</span>
    </div>

    <!-- Kartu 1: Bukti Setor (BPIH) -->
    <div class="doc-card-item">
      <div class="doc-card-left">
        <div class="doc-icon-box">
          <i class="ri-file-shield-line"></i>
        </div>
        <div>
          <div class="doc-card-title">Bukti Setor (BPIH)</div>
          <div class="doc-card-sub">Header BuktiSetor</div>
        </div>
      </div>
      <button type="button" class="btn-view-doc ${d.buktisetor ? '' : 'disabled'}" onclick="viewJamaahDoc('Bukti Setor (BPIH)', '${escapeHtml(d.buktisetor || '')}')">
        <i class="ri-eye-line"></i> Lihat Dokumen
      </button>
    </div>

    <!-- Kartu 2: SPPH -->
    <div class="doc-card-item">
      <div class="doc-card-left">
        <div class="doc-icon-box">
          <i class="ri-file-paper-2-line"></i>
        </div>
        <div>
          <div class="doc-card-title">SPPH</div>
          <div class="doc-card-sub">Header SPPH</div>
        </div>
      </div>
      <button type="button" class="btn-view-doc ${d.spph ? '' : 'disabled'}" onclick="viewJamaahDoc('SPPH', '${escapeHtml(d.spph || '')}')">
        <i class="ri-eye-line"></i> Lihat Dokumen
      </button>
    </div>

    <!-- Kartu 3: Bukti Transfer -->
    <div class="doc-card-item">
      <div class="doc-card-left">
        <div class="doc-icon-box">
          <i class="ri-bank-card-line"></i>
        </div>
        <div>
          <div class="doc-card-title">Bukti Transfer</div>
          <div class="doc-card-sub">Header BuktiTransfer</div>
        </div>
      </div>
      <button type="button" class="btn-view-doc ${d.buktitransfer ? '' : 'disabled'}" onclick="viewJamaahDoc('Bukti Transfer', '${escapeHtml(d.buktitransfer || '')}')">
        <i class="ri-eye-line"></i> Lihat Dokumen
      </button>
    </div>
  `;

  modal.style.display = 'flex';
};

window.closeProfileModal = function () {
  const modal = document.getElementById('profileModal');
  if (modal) modal.style.display = 'none';
};

/**
 * View Jamaah Document Lightbox / Viewer
 */
window.viewJamaahDoc = function (title, url) {
  if (!url) {
    showToast('Dokumen ' + title + ' belum diunggah.', 'info');
    return;
  }
  viewDocumentViewer(title, url);
};

function viewDocumentViewer(title, url) {
  const modal = document.getElementById('docViewerModal');
  const titleEl = document.getElementById('docViewerTitle');
  const bodyEl = document.getElementById('docViewerBody');
  if (!modal || !bodyEl) return;

  if (titleEl) titleEl.innerHTML = `<i class="ri-file-search-line"></i> ${escapeHtml(title)}`;

  const cdnUrl = formatDriveFileUrl(url);
  const viewUrl = getDriveViewUrl(url);

  bodyEl.innerHTML = `
    <div style="text-align:center; padding:10px;">
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin-bottom:14px;">
        <img src="${cdnUrl}" 
             alt="${escapeHtml(title)}" 
             style="max-width:100%; max-height:450px; border-radius:8px; object-fit:contain; box-shadow:0 2px 8px rgba(0,0,0,0.1);"
             onerror="this.style.display='none'; document.getElementById('docFallbackText').style.display='block';">
        <div id="docFallbackText" style="display:none; padding:20px; color:#64748b;">
          <i class="ri-file-pdf-line" style="font-size:48px; color:#ef4444;"></i>
          <p style="margin-top:8px; font-weight:600;">Berkas dokumen dalam format PDF atau Google Drive.</p>
        </div>
      </div>
      <div style="display:flex; gap:10px; justify-content:center;">
        <a href="${viewUrl}" target="_blank" class="btn-sheet-csv" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
          <i class="ri-external-link-line"></i> Buka di Google Drive
        </a>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

window.closeDocViewerModal = function () {
  const modal = document.getElementById('docViewerModal');
  if (modal) modal.style.display = 'none';
};

/**
 * Download List Keuangan Modal (Lampiran 2)
 */
window.openFinanceListModal = function () {
  if (!currentUser) return;
  const modal = document.getElementById('financeListModal');
  const body = document.getElementById('financeListModalBody');
  if (!modal || !body) return;

  const d = currentUser.detail || {};
  const approvedList = rawAngsuranList.filter(item => String(item.status).toLowerCase() === 'approved');
  const displayList = approvedList.length > 0 ? approvedList : rawAngsuranList;

  let totalRupiah = 0;
  displayList.forEach(item => totalRupiah += item.jumlah);

  body.innerHTML = `
    <div class="finance-sheet-wrapper" id="printableFinanceSheet">
      <!-- Header Banner (Lampiran 2) -->
      <div class="finance-sheet-header-top">
        HAJI TERENCANA PT. FATH INDAH TRAVEL SERVICE
      </div>

      <!-- Subheader Box (Lampiran 2) -->
      <div class="finance-sheet-header-sub">
        <div>
          <div><strong>Nama :</strong> ${escapeHtml(currentUser.namaLengkap)}</div>
          <div style="margin-top:4px;"><strong>No BPIH :</strong> ${escapeHtml(currentUser.noBPIH || '-')}</div>
        </div>
        <div style="text-align:right;">
          <div><strong>Asal Jamaah :</strong> ${escapeHtml(d.alamat || d.kabkota || 'TAMAN SARI I')}</div>
        </div>
      </div>

      <!-- Table Rincian (Lampiran 2) -->
      <table class="finance-table-grid">
        <thead>
          <tr>
            <th style="width:45px;">No.</th>
            <th style="width:180px;">Tanggal Pembayaran</th>
            <th style="width:140px;">Jumlah (Rp)</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${displayList.length === 0 ? `
            <tr>
              <td colspan="4" class="center" style="padding:20px; color:#64748b;">Belum ada data pembayaran angsuran.</td>
            </tr>
          ` : displayList.map((item, idx) => `
            <tr>
              <td class="center">${idx + 1}</td>
              <td class="center">${formatIndonesianDate(item.tanggal)}</td>
              <td class="right">${Number(item.jumlah).toLocaleString('id-ID')}</td>
              <td>${escapeHtml(item.uraian)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="finance-total-row">
            <td colspan="2" class="right" style="font-weight:800;">TOTAL TERBAYAR:</td>
            <td class="right" style="font-weight:800; color:#0f766e;">${Number(totalRupiah).toLocaleString('id-ID')}</td>
            <td style="font-size:11px; color:#64748b;">${displayList.length} Kali Pembayaran</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Action Buttons -->
    <div class="finance-modal-actions">
      <button type="button" class="btn-sheet-csv" onclick="downloadFinanceListCSV()">
        <i class="ri-file-excel-2-line"></i> Download Excel (CSV)
      </button>
      <button type="button" class="btn-sheet-print" onclick="window.print()">
        <i class="ri-printer-line"></i> Cetak / Simpan PDF
      </button>
    </div>
  `;

  modal.style.display = 'flex';
};

window.closeFinanceListModal = function () {
  const modal = document.getElementById('financeListModal');
  if (modal) modal.style.display = 'none';
};

/**
 * Download CSV helper
 */
window.downloadFinanceListCSV = function () {
  if (!currentUser) return;
  const approvedList = rawAngsuranList.filter(item => String(item.status).toLowerCase() === 'approved');
  const list = approvedList.length > 0 ? approvedList : rawAngsuranList;

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "HAJI TERENCANA PT. FATH INDAH TRAVEL SERVICE\n";
  csvContent += `Nama,${currentUser.namaLengkap},Asal Jamaah,${currentUser.detail?.alamat || ''}\n`;
  csvContent += `No BPIH,${currentUser.noBPIH}\n\n`;
  csvContent += "No,Tanggal Pembayaran,Jumlah (Rp),Keterangan\n";

  list.forEach((item, idx) => {
    csvContent += `${idx + 1},"${formatIndonesianDate(item.tanggal)}",${item.jumlah},"${item.uraian}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `List_Keuangan_${currentUser.namaLengkap}_${currentUser.noBPIH}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('File CSV berhasil diunduh!', 'success');
};

/**
 * File selection and upload
 */
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
