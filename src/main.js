import { loginUser, getAngsuranData, submitAngsuran, getRunningText } from './supabase.js';

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
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }

  // Upload form
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleUploadSubmit);
  }

  // File upload input
  const fileInput = document.getElementById('fileUploadInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileChange);
  }

  // Currency input formatter
  const jumlahInput = document.getElementById('uploadJumlah');
  if (jumlahInput) {
    jumlahInput.addEventListener('input', (e) => {
      formatRupiahInput(e.target);
    });
  }

  // Search and status filter
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

/**
 * Toggle Page Views
 */
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
    // Header UI
    const elNama = document.getElementById('displayNamaUser');
    if (elNama) elNama.textContent = currentUser.namaLengkap || currentUser.username;
    
    const elNoHP = document.getElementById('displayNoHPUser');
    const cleanBpih = String(currentUser.noBPIH || currentUser.username || '').replace(/^0+/, '');
    if (elNoHP) elNoHP.textContent = 'No. BPIH: ' + (cleanBpih || '-');

    // Pre-fill Upload form
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
 * Login Submit
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
    const res = await loginUser(username, password);
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
  document.getElementById('inputUsername').value = username;
  document.getElementById('inputPassword').value = password;
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
        <p style="margin-top:12px; font-weight:600; color:#0f766e;">Memuat data angsuran...</p>
      </div>
    `;
  }

  const res = await getAngsuranData(currentUser);
  if (res.success) {
    rawAngsuranList = res.data;
    updateSummaryStats(res.summary);
    filterAngsuran();
  } else {
    if (listContainer) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <i class="ri-error-warning-line" style="color:#ef4444;"></i>
          <p>Gagal memuat data angsuran: ${res.message}</p>
        </div>
      `;
    }
  }
}

function updateSummaryStats(summary) {
  const statTotal = document.getElementById('statTotalTerbayar');
  const statCount = document.getElementById('statTotalTransaksi');
  if (statTotal) statTotal.textContent = formatRupiah(summary.totalTerbayar || 0);
  if (statCount) statCount.textContent = `${summary.count || 0} Kali`;
}

/**
 * Filter & Search Angsuran
 */
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
 * Render List of Angsuran Cards
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

/**
 * Open Struk / Receipt Modal
 */
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

/**
 * Open Profile Modal
 */
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

/**
 * Handle File Selection for Upload
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

/**
 * Handle Form Upload Submit
 */
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

  const payload = {
    namaNasabah: currentUser?.namaLengkap || 'Nasabah',
    userNoHP: currentUser?.noHP || currentUser?.username || '',
    noBPIH: currentUser?.noBPIH || '',
    idNasabah: currentUser?.idNasabah || '',
    bank: document.getElementById('uploadBank').value,
    jumlah: jumlahClean,
    tanggal: document.getElementById('uploadTanggal').value,
    metodePembayaran: document.getElementById('uploadMetode').value,
    uraian: document.getElementById('uploadUraian').value,
    fileData: selectedFileBase64 || ''
  };

  try {
    const res = await submitAngsuran(payload);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="ri-send-plane-fill"></i> Kirim Bukti Angsuran';
    }

    if (res.success) {
      showToast(res.message || 'Setoran berhasil dicatat!', 'success');
      // Reset form
      document.getElementById('uploadJumlah').value = '';
      removeSelectedFile();
      // Switch back to tab Entry and reload
      switchTab('entry');
      await loadAngsuranData();
    } else {
      showToast(res.message || 'Gagal menyimpan setoran.', 'error');
    }
  } catch (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="ri-send-plane-fill"></i> Kirim Bukti Angsuran';
    }
    showToast('Terjadi kesalahan koneksi ke Supabase.', 'error');
  }
}

/**
 * Load Running Text
 */
async function loadRunningText() {
  const container = document.getElementById('runningTextContainer');
  const content = document.getElementById('runningTextContent');
  if (!container || !content) return;

  const items = await getRunningText();
  if (items && items.length > 0) {
    content.innerHTML = items.map(item => `
      <span class="running-item">
        <i class="ri-megaphone-line"></i>
        <span>${escapeHtml(item.text)}</span>
        ${item.link_url ? `<a href="${escapeHtml(item.link_url)}" target="_blank">(Klik Disini)</a>` : ''}
      </span>
    `).join('');
    container.style.display = 'flex';
  } else {
    container.style.display = 'none';
  }
}

/**
 * Currency Formatter Helpers
 */
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

/**
 * Toast Notification Helper
 */
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
