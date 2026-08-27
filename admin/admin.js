/* ============================================================
   EXIST LOL SKIN FINDER — PRIVATE ADMIN PANEL CLIENT
   ============================================================ */

const AUTH_STORAGE_KEY = 'exist_admin_auth_token';
const OVERRIDES_STORAGE_KEY = 'exist_admin_local_overrides';
const WORKER_URL_STORAGE_KEY = 'exist_admin_worker_url';

/* =========================================
   ASSET & API URL HELPERS
   ========================================= */
const assetUrl = (path) => {
  const base = import.meta.env?.BASE_URL || '/';
  return `${base}${String(path).replace(/^\/+/, '')}`;
};

function getApiBaseUrl() {
  const customWorkerUrl = localStorage.getItem(WORKER_URL_STORAGE_KEY);
  if (customWorkerUrl && customWorkerUrl.trim().startsWith('http')) {
    return customWorkerUrl.trim().replace(/\/+$/, '');
  }
  // Varsayılan olarak mevcut sunucu (Vite dev middleware / Local admin server)
  return '';
}

/* =========================================
   ARAMA NORMALİZASYONU & SKORLAMA (MAIN.JS İLE BİREBİR AYNI)
   ========================================= */
const normalize = (value) =>
  String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '');

function scoreTextMatch(text, query) {
  const normalizedText = normalize(String(text ?? ''));
  const normalizedQuery = normalize(String(query ?? ''));

  if (!normalizedText || !normalizedQuery) return 0;
  if (normalizedText === normalizedQuery) return 1_000_000;

  if (normalizedText.startsWith(normalizedQuery)) {
    return 900_000 + Math.max(0, normalizedText.length - normalizedQuery.length) * 25;
  }

  const tokens = normalizedText.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.some((token) => token === normalizedQuery)) {
    return 700_000 + normalizedQuery.length * 200;
  }

  if (normalizedText.includes(normalizedQuery)) {
    return 500_000 + Math.max(0, 2000 - Math.abs(normalizedText.length - normalizedQuery.length) * 12);
  }

  let lastIndex = -1;
  let orderedCount = 0;
  let consecutiveCount = 0;
  let totalGapDistance = 0;

  for (const character of normalizedQuery) {
    const nextIndex = normalizedText.indexOf(character, lastIndex + 1);
    if (nextIndex === -1) return 0;
    if (nextIndex > lastIndex) orderedCount += 1;
    if (lastIndex !== -1 && nextIndex === lastIndex + 1) consecutiveCount += 1;
    if (lastIndex !== -1) totalGapDistance += nextIndex - lastIndex;
    lastIndex = nextIndex;
  }

  if (orderedCount !== normalizedQuery.length) return 0;

  const fuzzyScore = orderedCount * 150 + consecutiveCount * 120 - totalGapDistance * 25;
  return fuzzyScore > 0 ? fuzzyScore : 1;
}

function getSkinSearchScore(skin, query) {
  const normalizedQuery = normalize(String(query ?? ''));
  if (!normalizedQuery) return 0;

  let bestScore = 0;
  [skin.name, skin.nameEn, skin.champion, skin.championEn, String(skin.id)]
    .filter(Boolean)
    .forEach((text) => {
      bestScore = Math.max(bestScore, scoreTextMatch(text, normalizedQuery));
    });

  return bestScore;
}

/* =========================================
   UYGULAMA DURUMU (APPLICATION STATE)
   ========================================= */
let rawSkins = [];
let allSkins = [];
let fantomeFiles = new Set();
let adminOverrides = {
  updatedAt: new Date().toISOString(),
  overrides: {},
  customSkins: []
};

let selectedSkin = null;
let activeFilter = 'all';
let previewLanguage = 'tr';

let pendingImageFile = null;
let pendingImageDataUrl = null;
let pendingFantomeFile = null;
let pendingFantomeBase64 = null;

let isBackendOnline = false;
let backendType = 'offline';

/* =========================================
   DOM REFERANSLARI
   ========================================= */
const searchInput = document.querySelector('#admin-search');
const searchClearBtn = document.querySelector('#search-clear-btn');
const skinListContainer = document.querySelector('#admin-skin-list');
const skinListCountEl = document.querySelector('#skin-list-count');
const filterTabs = document.querySelectorAll('.filter-tab');

// İstatistikler
const statTotalSkins = document.querySelector('#stat-total-skins');
const statOverridesCount = document.querySelector('#stat-overrides-count');
const countAllEl = document.querySelector('#count-all');
const countOverriddenEl = document.querySelector('#count-overridden');
const countCustomEl = document.querySelector('#count-custom');
const countMissingEl = document.querySelector('#count-missing');

// Editör alanları
const editorEmptyState = document.querySelector('#editor-empty-state');
const editorFormWrapper = document.querySelector('#editor-form-wrapper');
const editorHeading = document.querySelector('#editor-heading');
const editorChampionKicker = document.querySelector('#editor-champion-kicker');
const editorIdKicker = document.querySelector('#editor-id-kicker');
const editorStatusBadge = document.querySelector('#editor-status-badge');

const fieldNameTr = document.querySelector('#field-name-tr');
const fieldNameEn = document.querySelector('#field-name-en');
const fieldChampTr = document.querySelector('#field-champ-tr');
const fieldChampEn = document.querySelector('#field-champ-en');
const fieldSkinId = document.querySelector('#field-skin-id');
const fieldChampId = document.querySelector('#field-champ-id');

// Butonlar
const btnSaveSkin = document.querySelector('#btn-save-skin');
const btnRevertOverride = document.querySelector('#btn-revert-override');
const btnAddSkin = document.querySelector('#btn-add-skin');
const btnLock = document.querySelector('#btn-lock');

// Görsel Yükleme
const imageDropzone = document.querySelector('#image-dropzone');
const inputImageFile = document.querySelector('#input-image-file');
const btnBrowseImage = document.querySelector('#btn-browse-image');
const imagePreviewMeta = document.querySelector('#image-preview-meta');
const previewImageName = document.querySelector('#preview-image-name');
const previewImageSize = document.querySelector('#preview-image-size');
const btnCancelImage = document.querySelector('#btn-cancel-image');
const imageStatusPill = document.querySelector('#image-status-pill');

// Fantome Yükleme
const fantomeDropzone = document.querySelector('#fantome-dropzone');
const inputFantomeFile = document.querySelector('#input-fantome-file');
const btnBrowseFantome = document.querySelector('#btn-browse-fantome');
const fantomePreviewMeta = document.querySelector('#fantome-preview-meta');
const previewFantomeName = document.querySelector('#preview-fantome-name');
const previewFantomeSize = document.querySelector('#preview-fantome-size');
const btnCancelFantome = document.querySelector('#btn-cancel-fantome');
const fantomeStatusPill = document.querySelector('#fantome-status-pill');
const btnDownloadExistingFantome = document.querySelector('#btn-download-existing-fantome');

// Canlı Önizleme Kartı
const liveCardImage = document.querySelector('#live-card-image');
const liveCardChampion = document.querySelector('#live-card-champion');
const liveCardName = document.querySelector('#live-card-name');
const liveCardId = document.querySelector('#live-card-id');
const btnPreviewLangTr = document.querySelector('#btn-preview-lang-tr');
const btnPreviewLangEn = document.querySelector('#btn-preview-lang-en');

const previewNameTr = document.querySelector('#preview-name-tr');
const previewNameEn = document.querySelector('#preview-name-en');
const previewChampPair = document.querySelector('#preview-champ-pair');
const previewFantomeStatus = document.querySelector('#preview-fantome-status');
const previewImageSource = document.querySelector('#preview-image-source');
const previewOverrideStatus = document.querySelector('#preview-override-status');

// Modallar ve Kimlik Doğrulama
const authGate = document.querySelector('#auth-gate');
const authForm = document.querySelector('#auth-form');
const authPassword = document.querySelector('#auth-password');
const authErrorMsg = document.querySelector('#auth-error-msg');
const modalNewSkin = document.querySelector('#modal-new-skin');
const formNewSkin = document.querySelector('#form-new-skin');
const btnCloseNewSkinModal = document.querySelector('#btn-close-new-skin-modal');
const btnCancelNewSkin = document.querySelector('#btn-cancel-new-skin');
const toastContainer = document.querySelector('#toast-container');

/* =========================================
   BİLDİRİM (TOAST) SİSTEMİ
   ========================================= */
function showToast(message, type = 'info') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* =========================================
   SUNUCU SAĞLIK & MOD KONTROLÜ
   ========================================= */
async function checkBackendHealth() {
  const modeBadge = document.querySelector('.header-mode-badge');
  const apiBase = getApiBaseUrl();

  try {
    const res = await fetch(`${apiBase}/api/health`, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      isBackendOnline = true;
      backendType = data.server || 'local-server';

      if (modeBadge) {
        if (apiBase.startsWith('http')) {
          modeBadge.textContent = '🟡 Cloudflare Worker Modu (GitHub)';
          modeBadge.title = `Worker URL: ${apiBase}`;
        } else {
          modeBadge.textContent = '🟢 Yerel Mod (Disk Kaydı Aktif)';
          modeBadge.title = 'Değişiklikler doğrudan public/ klasörüne kaydedilir.';
        }
      }
      return;
    }
  } catch (e) {
    // offline
  }

  isBackendOnline = false;
  backendType = 'offline';
  if (modeBadge) {
    modeBadge.textContent = '🔴 Sunucu Çevrimdışı (Kaydedilemez)';
    modeBadge.title = 'Vite dev sunucusu veya admin-server çalışmıyor.';
  }
}

/* =========================================
   KİMLİK DOĞRULAMA (AUTH GATE)
   ========================================= */
function checkAuth() {
  const token = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (token) {
    authGate.classList.add('unlocked');
  } else {
    authGate.classList.remove('unlocked');
    authPassword?.focus();
  }
}

authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = authPassword.value.trim();

  if (!password) {
    authErrorMsg.textContent = 'Lütfen şifreyi giriniz.';
    authErrorMsg.hidden = false;
    return;
  }

  const apiBase = getApiBaseUrl();
  try {
    const res = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      const data = await res.json();
      sessionStorage.setItem(AUTH_STORAGE_KEY, data.token || 'auth-ok');
      authGate.classList.add('unlocked');
      authErrorMsg.hidden = true;
      showToast('Yönetim paneline giriş yapıldı.', 'success');
      return;
    } else {
      const err = await res.json().catch(() => ({}));
      authErrorMsg.textContent = err.error || 'Geçersiz yönetici şifresi.';
      authErrorMsg.hidden = false;
      authPassword.value = '';
      authPassword.focus();
      return;
    }
  } catch (err) {
    // Yerel çevrimdışı modda temel şifre doğrulaması
    if (password === 'admin' || password.length >= 4) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, btoa(password));
      authGate.classList.add('unlocked');
      authErrorMsg.hidden = true;
      showToast('Yönetim paneline giriş yapıldı (Yerel Mod).', 'success');
    } else {
      authErrorMsg.textContent = 'Geçersiz yönetici şifresi.';
      authErrorMsg.hidden = false;
      authPassword.value = '';
      authPassword.focus();
    }
  }
});

btnLock?.addEventListener('click', () => {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  checkAuth();
  showToast('Panel kilitlendi.', 'info');
});

/* =========================================
   VERİLERİ YÜKLEME VE BİRLEŞTİRME
   ========================================= */
async function loadAllData() {
  try {
    const [skinsRes, fantomeRes, overridesRes] = await Promise.all([
      fetch(assetUrl('data/skins.json'), { cache: 'no-cache' }),
      fetch(assetUrl('data/fantome-files.json'), { cache: 'no-cache' }).catch(() => null),
      fetch(assetUrl('data/admin-overrides.json'), { cache: 'no-cache' }).catch(() => null)
    ]);

    if (!skinsRes.ok) throw new Error(`skins.json yüklenemedi (${skinsRes.status})`);
    const skinsData = await skinsRes.json();
    rawSkins = Array.isArray(skinsData?.skins) ? skinsData.skins : [];

    // Fantome dosyaları listesi
    fantomeFiles.clear();
    if (fantomeRes && fantomeRes.ok) {
      const files = await fantomeRes.json();
      const list = Array.isArray(files) ? files : Array.isArray(files?.files) ? files.files : [];
      list.forEach((f) => {
        const id = String(f).trim().replace(/\.fantome$/i, '');
        if (id) fantomeFiles.add(id);
      });
    }

    // Admin Overrides
    adminOverrides = { updatedAt: new Date().toISOString(), overrides: {}, customSkins: [] };
    if (overridesRes && overridesRes.ok) {
      try {
        const ovData = await overridesRes.json();
        if (Array.isArray(ovData)) {
          ovData.forEach((item) => {
            if (item?.id) adminOverrides.overrides[String(item.id)] = item;
          });
        } else if (ovData && typeof ovData === 'object') {
          adminOverrides = {
            updatedAt: ovData.updatedAt || new Date().toISOString(),
            overrides: ovData.overrides || {},
            customSkins: ovData.customSkins || []
          };
        }
      } catch (e) {
        console.warn('admin-overrides.json okunamadı.');
      }
    }

    compileSkinDatabase();
    renderSkinList();
    updateStats();
    await checkBackendHealth();
  } catch (error) {
    console.error('Veri yükleme hatası:', error);
    showToast('Skin verileri yüklenirken hata oluştu: ' + error.message, 'error');
  }
}

/* =========================================
   SKIN VERİTABANINI DERLEME
   ========================================= */
function compileSkinDatabase() {
  const map = new Map();

  // 1. Orijinal skinleri ekle
  rawSkins.forEach((skin) => {
    const id = String(skin.id);
    map.set(id, {
      ...skin,
      id,
      _original: { ...skin },
      _isOverridden: false,
      _isCustom: false
    });
  });

  // 2. Özel eklenen custom skinleri ekle
  if (Array.isArray(adminOverrides.customSkins)) {
    adminOverrides.customSkins.forEach((customSkin) => {
      const id = String(customSkin.id);
      map.set(id, {
        ...customSkin,
        id,
        _original: null,
        _isOverridden: false,
        _isCustom: true
      });
    });
  }

  // 3. Overrideları uygula
  if (adminOverrides.overrides) {
    Object.entries(adminOverrides.overrides).forEach(([id, override]) => {
      const existing = map.get(String(id));
      if (existing) {
        Object.assign(existing, override, { _isOverridden: true });
      }
    });
  }

  allSkins = [...map.values()];
}

/* =========================================
   İSTATİSTİKLERİ GÜNCELLEME
   ========================================= */
function updateStats() {
  const total = allSkins.length;
  const overriddenCount = Object.keys(adminOverrides.overrides || {}).length;
  const customCount = (adminOverrides.customSkins || []).length;
  const missingFantomeCount = allSkins.filter((s) => !fantomeFiles.has(String(s.id))).length;

  if (statTotalSkins) statTotalSkins.textContent = total.toLocaleString('tr-TR');
  if (statOverridesCount) statOverridesCount.textContent = (overriddenCount + customCount).toLocaleString('tr-TR');

  if (countAllEl) countAllEl.textContent = total;
  if (countOverriddenEl) countOverriddenEl.textContent = overriddenCount;
  if (countCustomEl) countCustomEl.textContent = customCount;
  if (countMissingEl) countMissingEl.textContent = missingFantomeCount;
}

/* =========================================
   SKIN LİSTESİNİ FİLTRELEME & ÇİZME
   ========================================= */
function renderSkinList() {
  const query = searchInput.value.trim();

  let filtered = allSkins;

  // Filtre Sekmesi
  if (activeFilter === 'overridden') {
    filtered = filtered.filter((s) => s._isOverridden);
  } else if (activeFilter === 'custom') {
    filtered = filtered.filter((s) => s._isCustom);
  } else if (activeFilter === 'missing') {
    filtered = filtered.filter((s) => !fantomeFiles.has(String(s.id)));
  }

  // Arama Sorgusu
  if (query) {
    filtered = filtered
      .map((skin) => ({ skin, score: getSkinSearchScore(skin, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.skin);
  }

  skinListCountEl.textContent = `${filtered.length} skin listeleniyor`;
  skinListContainer.innerHTML = '';

  if (filtered.length === 0) {
    skinListContainer.innerHTML = `
      <div class="empty-list">
        <p>Aramanızla eşleşen skin bulunamadı.</p>
      </div>
    `;
    return;
  }

  // İlk 200 öğeyi render et (Performans)
  const renderLimit = Math.min(filtered.length, 250);
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < renderLimit; i++) {
    const skin = filtered[i];
    const itemEl = document.createElement('div');
    itemEl.className = `skin-item ${selectedSkin?.id === skin.id ? 'active' : ''}`;
    itemEl.dataset.skinId = skin.id;

    let badgeHtml = '';
    if (skin._isCustom) {
      badgeHtml = `<span class="badge badge-custom skin-item-badge">Özel</span>`;
    } else if (skin._isOverridden) {
      badgeHtml = `<span class="badge badge-overridden skin-item-badge">Override</span>`;
    }

    const hasFantome = fantomeFiles.has(String(skin.id));
    const fantomeIndicator = hasFantome
      ? `<span style="color:#4ade80; font-size:10px;" title=".fantome mevcut">⚡</span>`
      : `<span style="color:#ff8585; font-size:10px;" title=".fantome yok">✗</span>`;

    const thumbSrc = skin.image?.startsWith('http')
      ? skin.image
      : skin.image
        ? assetUrl(skin.image)
        : '';

    itemEl.innerHTML = `
      <img class="skin-item-thumb" src="${thumbSrc}" alt="${skin.name}" loading="lazy" onerror="this.style.opacity='0.2'" />
      <div class="skin-item-info">
        <p class="skin-item-champ">${skin.champion || 'Bilinmiyor'}</p>
        <p class="skin-item-name">${skin.name || 'İsimsiz Skin'}</p>
        <div class="skin-item-footer">
          <span class="skin-item-id">#${skin.id}</span>
          ${badgeHtml}
          ${fantomeIndicator}
        </div>
      </div>
    `;

    itemEl.addEventListener('click', () => selectSkin(skin));
    fragment.appendChild(itemEl);
  }

  skinListContainer.appendChild(fragment);
}

/* =========================================
   SKİN SEÇME VE EDİTÖRÜ DOLDURMA
   ========================================= */
function selectSkin(skin) {
  selectedSkin = skin;

  // Sıfırla geçici dosyalar
  pendingImageFile = null;
  pendingImageDataUrl = null;
  pendingFantomeFile = null;
  pendingFantomeBase64 = null;

  // Aktif sınıfını güncelle
  document.querySelectorAll('.skin-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.skinId === String(skin.id));
  });

  editorEmptyState.hidden = true;
  editorFormWrapper.hidden = false;

  // Başlıklar
  editorHeading.textContent = skin.name || 'Skin Düzenle';
  editorChampionKicker.textContent = skin.champion || 'Şampiyon';
  editorIdKicker.textContent = `ID: #${skin.id}`;

  // Durum Rozeti
  if (skin._isCustom) {
    editorStatusBadge.className = 'badge badge-custom';
    editorStatusBadge.textContent = 'Özel Eklenen Skin';
    btnRevertOverride.hidden = true;
  } else if (skin._isOverridden) {
    editorStatusBadge.className = 'badge badge-overridden';
    editorStatusBadge.textContent = 'Manuel Özelleştirilmiş';
    btnRevertOverride.hidden = false;
  } else {
    editorStatusBadge.className = 'badge';
    editorStatusBadge.textContent = 'Orijinal Riot Verisi';
    btnRevertOverride.hidden = true;
  }

  // Form Alanları
  fieldNameTr.value = (skin.name || '').trim();
  fieldNameEn.value = (skin.nameEn || skin.name || '').trim();
  fieldChampTr.value = (skin.champion || '').trim();
  fieldChampEn.value = (skin.championEn || skin.champion || '').trim();
  fieldSkinId.value = skin.id;
  fieldChampId.value = (skin.championId || '').trim();

  // Görsel & Fantome Durumları
  imagePreviewMeta.hidden = true;
  fantomePreviewMeta.hidden = true;

  const hasFantome = fantomeFiles.has(String(skin.id));
  fantomeStatusPill.textContent = hasFantome ? '✓ Dosya Mevcut' : '✗ Dosya Yok';
  fantomeStatusPill.style.color = hasFantome ? '#4ade80' : '#ff8585';

  if (hasFantome) {
    btnDownloadExistingFantome.hidden = false;
    btnDownloadExistingFantome.href = assetUrl(`fantome/${skin.id}.fantome`);
    btnDownloadExistingFantome.download = `${skin.id}.fantome`;
  } else {
    btnDownloadExistingFantome.hidden = true;
  }

  const isLocalImage = skin.image && !skin.image.startsWith('http');
  imageStatusPill.textContent = isLocalImage ? 'Özel Yerel Görsel' : 'Riot CDN';

  updateLivePreview();
}

/* =========================================
   CANLI ÖNİZLEME KARTINI GÜNCELLE
   ========================================= */
function updateLivePreview() {
  if (!selectedSkin) return;

  const nameTr = fieldNameTr.value.trim() || selectedSkin.name || '';
  const nameEn = fieldNameEn.value.trim() || selectedSkin.nameEn || nameTr;
  const champTr = fieldChampTr.value.trim() || selectedSkin.champion || '';
  const champEn = fieldChampEn.value.trim() || selectedSkin.championEn || champTr;
  const skinId = fieldSkinId.value.trim() || selectedSkin.id || '';

  // Seçili dile göre canlı kartı güncelle
  if (previewLanguage === 'en') {
    liveCardName.textContent = nameEn || nameTr || 'Skin Name';
    liveCardChampion.textContent = champEn || champTr || 'Champion';
  } else {
    liveCardName.textContent = nameTr || 'Skin Adı';
    liveCardChampion.textContent = champTr || 'Şampiyon';
  }

  liveCardId.textContent = `ID: ${skinId}`;

  // Görsel
  if (pendingImageDataUrl) {
    liveCardImage.src = pendingImageDataUrl;
    previewImageSource.textContent = 'Yeni Seçilen Dosya';
  } else if (selectedSkin.image) {
    liveCardImage.src = selectedSkin.image.startsWith('http')
      ? selectedSkin.image
      : assetUrl(selectedSkin.image);
    previewImageSource.textContent = selectedSkin.image.startsWith('http')
      ? 'Riot Data Dragon'
      : `public/${selectedSkin.image}`;
  } else {
    liveCardImage.src = '';
    previewImageSource.textContent = 'Görsel Yok';
  }

  // Fantome durumu
  const hasFantome = pendingFantomeFile ? true : fantomeFiles.has(String(skinId));
  previewFantomeStatus.textContent = pendingFantomeFile
    ? 'Yeni Dosya Seçildi (.fantome)'
    : hasFantome
      ? 'Mevcut (public/fantome/)'
      : 'Dosya Yok';
  previewFantomeStatus.style.color = hasFantome || pendingFantomeFile ? '#4ade80' : '#ff8585';

  // Detay kutusu
  if (previewNameTr) previewNameTr.textContent = nameTr || '-';
  if (previewNameEn) previewNameEn.textContent = nameEn || '-';
  if (previewChampPair) previewChampPair.textContent = `${champTr} / ${champEn}`;

  if (previewOverrideStatus) {
    previewOverrideStatus.textContent = selectedSkin._isCustom
      ? 'Özel Eklenen Skin'
      : selectedSkin._isOverridden
        ? 'Manuel Özelleştirilmiş'
        : 'Orijinal Riot Verisi';
  }
}

/* =========================================
   ÖNİZLEME DİL DEĞİŞTİRİCİSİ (TR / EN)
   ========================================= */
btnPreviewLangTr?.addEventListener('click', () => {
  previewLanguage = 'tr';
  btnPreviewLangTr.classList.add('active');
  btnPreviewLangEn.classList.remove('active');
  updateLivePreview();
});

btnPreviewLangEn?.addEventListener('click', () => {
  previewLanguage = 'en';
  btnPreviewLangEn.classList.add('active');
  btnPreviewLangTr.classList.remove('active');
  updateLivePreview();
});

/* =========================================
   FORM ALANLARI CANLI DİNLENMESİ
   ========================================= */
[fieldNameTr, fieldNameEn, fieldChampTr, fieldChampEn, fieldSkinId, fieldChampId].forEach((input) => {
  input?.addEventListener('input', () => {
    editorHeading.textContent = fieldNameTr.value.trim() || selectedSkin?.name || 'Skin Adı';
    editorChampionKicker.textContent = fieldChampTr.value.trim() || selectedSkin?.champion || 'Şampiyon';
    updateLivePreview();
  });
  input?.addEventListener('change', () => updateLivePreview());
});

/* =========================================
   GÖRSEL YÜKLEME & DROPZONE İŞLEYİCİSİ
   ========================================= */
function handleImageSelected(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Lütfen geçerli bir resim dosyası seçin (JPG, PNG, WEBP).', 'error');
    return;
  }

  pendingImageFile = file;
  previewImageName.textContent = file.name;
  previewImageSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
  imagePreviewMeta.hidden = false;

  const reader = new FileReader();
  reader.onload = (e) => {
    pendingImageDataUrl = e.target.result;
    updateLivePreview();
    showToast(`"${file.name}" görseli seçildi.`, 'success');
  };
  reader.readAsDataURL(file);
}

btnBrowseImage?.addEventListener('click', () => inputImageFile.click());
inputImageFile?.addEventListener('change', (e) => handleImageSelected(e.target.files[0]));

btnCancelImage?.addEventListener('click', () => {
  pendingImageFile = null;
  pendingImageDataUrl = null;
  imagePreviewMeta.hidden = true;
  inputImageFile.value = '';
  updateLivePreview();
});

imageDropzone?.addEventListener('dragover', (e) => {
  e.preventDefault();
  imageDropzone.classList.add('dragover');
});
imageDropzone?.addEventListener('dragleave', () => imageDropzone.classList.remove('dragover'));
imageDropzone?.addEventListener('drop', (e) => {
  e.preventDefault();
  imageDropzone.classList.remove('dragover');
  if (e.dataTransfer.files?.[0]) handleImageSelected(e.dataTransfer.files[0]);
});

/* =========================================
   FANTOME YÜKLEME & DROPZONE İŞLEYİCİSİ
   ========================================= */
function handleFantomeSelected(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.fantome')) {
    showToast('Lütfen geçerli bir .fantome dosyası seçin.', 'error');
    return;
  }

  pendingFantomeFile = file;
  previewFantomeName.textContent = file.name;
  previewFantomeSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
  fantomePreviewMeta.hidden = false;

  const reader = new FileReader();
  reader.onload = (e) => {
    pendingFantomeBase64 = e.target.result;
  };
  reader.readAsDataURL(file);

  updateLivePreview();
  showToast(`"${file.name}" .fantome dosyası seçildi.`, 'success');
}

btnBrowseFantome?.addEventListener('click', () => inputFantomeFile.click());
inputFantomeFile?.addEventListener('change', (e) => handleFantomeSelected(e.target.files[0]));

btnCancelFantome?.addEventListener('click', () => {
  pendingFantomeFile = null;
  pendingFantomeBase64 = null;
  fantomePreviewMeta.hidden = true;
  inputFantomeFile.value = '';
  updateLivePreview();
});

fantomeDropzone?.addEventListener('dragover', (e) => {
  e.preventDefault();
  fantomeDropzone.classList.add('dragover');
});
fantomeDropzone?.addEventListener('dragleave', () => fantomeDropzone.classList.remove('dragover'));
fantomeDropzone?.addEventListener('drop', (e) => {
  e.preventDefault();
  fantomeDropzone.classList.remove('dragover');
  if (e.dataTransfer.files?.[0]) handleFantomeSelected(e.dataTransfer.files[0]);
});

/* =========================================
   KAYDETME İŞLEMİ (LOCAL / PROXY HANDLER)
   ========================================= */
btnSaveSkin?.addEventListener('click', async () => {
  if (!selectedSkin) return;

  const skinId = String(selectedSkin.id);
  const updatedNameTr = fieldNameTr.value.trim();
  const updatedNameEn = fieldNameEn.value.trim();
  const updatedChampTr = fieldChampTr.value.trim();
  const updatedChampEn = fieldChampEn.value.trim();
  const updatedChampId = fieldChampId.value.trim();

  if (!updatedNameTr || !updatedChampTr) {
    showToast('Skin adı ve şampiyon adı boş bırakılamaz.', 'error');
    return;
  }

  const saveBtnSpinner = btnSaveSkin.querySelector('.btn-spinner');
  btnSaveSkin.disabled = true;
  if (saveBtnSpinner) saveBtnSpinner.hidden = false;

  try {
    // 1. Override nesnesi oluştur
    const overrideEntry = {
      id: skinId,
      name: updatedNameTr,
      nameEn: updatedNameEn || updatedNameTr,
      champion: updatedChampTr,
      championEn: updatedChampEn || updatedChampTr,
      championId: updatedChampId || selectedSkin.championId,
      modifiedAt: new Date().toISOString()
    };

    if (pendingImageFile) {
      overrideEntry.image = `images/skins/${skinId}.jpg`;
      overrideEntry.customImage = true;
    } else if (selectedSkin.image) {
      overrideEntry.image = selectedSkin.image;
    }

    if (pendingFantomeFile) {
      overrideEntry.customFantome = true;
      fantomeFiles.add(skinId);
    }

    // 2. Sunucuya (Vite middleware / Local Server / Cloudflare Worker) POST gönder
    const apiBase = getApiBaseUrl();
    const authToken = sessionStorage.getItem(AUTH_STORAGE_KEY) || '';

    const response = await fetch(`${apiBase}/api/admin/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        skinId,
        override: overrideEntry,
        imageFileBase64: pendingImageDataUrl || null,
        fantomeFileBase64: pendingFantomeBase64 || null,
        isCustomSkin: Boolean(selectedSkin._isCustom)
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errBody.error || `Sunucu yanıt vermedi (${response.status})`);
    }

    const resData = await response.json();

    // 3. Başarılı ise yerel hafızaya ve nesneye uygula
    if (selectedSkin._isCustom) {
      const cIdx = adminOverrides.customSkins.findIndex((s) => s.id === skinId);
      if (cIdx !== -1) {
        adminOverrides.customSkins[cIdx] = { ...adminOverrides.customSkins[cIdx], ...overrideEntry };
      }
    } else {
      if (!adminOverrides.overrides) adminOverrides.overrides = {};
      adminOverrides.overrides[skinId] = overrideEntry;
    }
    adminOverrides.updatedAt = new Date().toISOString();

    Object.assign(selectedSkin, overrideEntry, {
      _isOverridden: !selectedSkin._isCustom,
      image: overrideEntry.image || selectedSkin.image
    });

    pendingImageFile = null;
    pendingImageDataUrl = null;
    pendingFantomeFile = null;
    pendingFantomeBase64 = null;
    imagePreviewMeta.hidden = true;
    fantomePreviewMeta.hidden = true;

    compileSkinDatabase();
    renderSkinList();
    selectSkin(selectedSkin);
    updateStats();

    showToast(`"${updatedNameTr}" başarıyla kaydedildi!`, 'success');
  } catch (err) {
    console.error('Kaydetme hatası:', err);
    showToast(`Kaydedilemedi: ${err.message}. Lütfen Vite dev sunucusunun açık olduğundan emin olun.`, 'error');
  } finally {
    btnSaveSkin.disabled = false;
    if (saveBtnSpinner) saveBtnSpinner.hidden = true;
  }
});

/* =========================================
   OVERRIDE'I GERİ ALMA (REVERT TO ORIGINAL)
   ========================================= */
btnRevertOverride?.addEventListener('click', async () => {
  if (!selectedSkin || !selectedSkin._isOverridden) return;

  const skinId = String(selectedSkin.id);
  const confirmMsg = `"${selectedSkin.name}" için yapılan tüm manuel değişiklikleri silip Riot orijinal verisine dönmek istediğinize emin misiniz?`;
  if (!confirm(confirmMsg)) return;

  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/admin/revert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skinId,
        originalSkin: selectedSkin._original
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    delete adminOverrides.overrides[skinId];
    adminOverrides.updatedAt = new Date().toISOString();

    compileSkinDatabase();
    const resetSkin = allSkins.find((s) => s.id === skinId);
    renderSkinList();
    if (resetSkin) selectSkin(resetSkin);
    updateStats();

    showToast(`"${skinId}" orijinal Riot verilerine döndürüldü.`, 'success');
  } catch (err) {
    showToast(`Geri alma hatası: ${err.message}`, 'error');
  }
});

/* =========================================
   YENİ SKİN MODALI
   ========================================= */
btnAddSkin?.addEventListener('click', () => {
  formNewSkin.reset();
  modalNewSkin.showModal();
});

btnCloseNewSkinModal?.addEventListener('click', () => modalNewSkin.close());
btnCancelNewSkin?.addEventListener('click', () => modalNewSkin.close());

formNewSkin?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.querySelector('#new-skin-id').value.trim();
  const skinNum = parseInt(document.querySelector('#new-skin-num').value) || 0;
  const nameTr = document.querySelector('#new-skin-name-tr').value.trim();
  const nameEn = document.querySelector('#new-skin-name-en').value.trim();
  const champTr = document.querySelector('#new-champ-tr').value.trim();
  const champEn = document.querySelector('#new-champ-en').value.trim();

  if (!id || !nameTr || !champTr) {
    showToast('Zorunlu alanları doldurunuz.', 'error');
    return;
  }

  if (allSkins.some((s) => s.id === id)) {
    showToast(`Bu ID (${id}) zaten kullanımda. Lütfen benzersiz bir ID girin.`, 'error');
    return;
  }

  const newSkin = {
    id,
    skinNum,
    name: nameTr,
    nameEn: nameEn || nameTr,
    champion: champTr,
    championEn: champEn || champTr,
    championId: champTr,
    image: `images/skins/${id}.jpg`,
    createdAt: new Date().toISOString()
  };

  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/admin/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skinId: id,
        override: newSkin,
        isCustomSkin: true
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    if (!Array.isArray(adminOverrides.customSkins)) {
      adminOverrides.customSkins = [];
    }
    adminOverrides.customSkins.push(newSkin);
    adminOverrides.updatedAt = new Date().toISOString();

    compileSkinDatabase();
    renderSkinList();
    updateStats();
    modalNewSkin.close();

    const created = allSkins.find((s) => s.id === id);
    if (created) selectSkin(created);

    showToast(`Yeni skin "${nameTr}" (ID: ${id}) başarıyla oluşturuldu!`, 'success');
  } catch (err) {
    showToast(`Yeni skin kaydedilemedi: ${err.message}`, 'error');
  }
});

/* =========================================
   FİLTRE VE ARAMA ETKİNLİKLERİ
   ========================================= */
searchInput?.addEventListener('input', () => renderSkinList());

searchClearBtn?.addEventListener('click', () => {
  searchInput.value = '';
  renderSkinList();
  searchInput.focus();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.activeElement === searchInput) {
    searchInput.value = '';
    renderSkinList();
  }
});

filterTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    filterTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    renderSkinList();
  });
});

/* =========================================
   TOPLULUK: GÜNCELLEMELER VE HATA BİLDİRİMLERİ
   ========================================= */
const updatesAdminModal = document.querySelector('#modal-updates');
const reportsAdminModal = document.querySelector('#modal-bug-reports');
const updateForm = document.querySelector('#form-update');
const adminUpdatesList = document.querySelector('#admin-updates-list');
const adminReportsList = document.querySelector('#admin-bug-reports-list');

function openAdminModal(dialog) {
  if (dialog?.showModal) dialog.showModal();
  else dialog?.setAttribute('open', '');
}

function renderCommunityRows(container, entries, type) {
  if (!container) return;
  container.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.textContent = type === 'update' ? 'Henüz yayınlanmış güncelleme yok.' : 'Henüz hata bildirimi yok.';
    container.append(empty);
    return;
  }
  entries.forEach((entry) => {
    const article = document.createElement('article');
    article.className = 'admin-community-row';
    const title = document.createElement('strong');
    title.textContent = entry.title || 'Başlıksız';
    const meta = document.createElement('small');
    meta.textContent = new Date(entry.publishedAt || entry.createdAt).toLocaleString('tr-TR');
    const body = document.createElement('p');
    body.textContent = entry.description || '';
    article.append(title, meta, body);
    if (type === 'report' && entry.skinName) {
      const skin = document.createElement('span');
      skin.className = 'admin-community-tag';
      skin.textContent = `Skin: ${entry.skinName}`;
      article.append(skin);
    }
    if (type === 'report' && /^https?:\/\//i.test(entry.imageUrl || '')) {
      const image = document.createElement('a');
      image.href = entry.imageUrl;
      image.target = '_blank';
      image.rel = 'noopener noreferrer';
      image.textContent = 'Görsel bağlantısını aç ↗';
      article.append(image);
    }
    container.append(article);
  });
}

async function loadCommunityData() {
  const [updates, reports] = await Promise.all([
    fetch(assetUrl('data/updates.json'), { cache: 'no-cache' }).then((r) => r.ok ? r.json() : { updates: [] }),
    fetch(assetUrl('data/bug-reports.json'), { cache: 'no-cache' }).then((r) => r.ok ? r.json() : { reports: [] })
  ]);
  renderCommunityRows(adminUpdatesList, Array.isArray(updates.updates) ? updates.updates : [], 'update');
  renderCommunityRows(adminReportsList, Array.isArray(reports.reports) ? reports.reports : [], 'report');
}

document.querySelector('#btn-manage-updates')?.addEventListener('click', async () => {
  await loadCommunityData();
  openAdminModal(updatesAdminModal);
});

document.querySelector('#btn-view-bug-reports')?.addEventListener('click', async () => {
  await loadCommunityData();
  openAdminModal(reportsAdminModal);
});

document.querySelectorAll('[data-close-admin-modal]').forEach((button) => {
  button.addEventListener('click', () => document.querySelector(`#${button.dataset.closeAdminModal}`)?.close());
});

updateForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = document.querySelector('#update-title').value.trim();
  const description = document.querySelector('#update-description').value.trim();
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/admin/updates`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Güncelleme yayınlanamadı.');
    updateForm.reset();
    await loadCommunityData();
    showToast('Güncelleme ziyaretçilere yayınlandı.', 'success');
  } catch (error) { showToast(error.message, 'error'); }
});

/* =========================================
   BAŞLANGIÇ ÇALIŞTIRMA
   ========================================= */
checkAuth();
await loadAllData();
