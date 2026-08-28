import './style.css';

/* =========================================
   DİL / i18n
========================================= */

const LANG_STORAGE_KEY = 'exist-lol-skin-lang';

const LOCALE_MAP = {
  tr: 'tr-TR',
  en: 'en-US'
};

const TRANSLATIONS = {
  heroEyebrow: {
    tr: 'LEAGUE OF LEGENDS • SKIN VERİTABANI',
    en: 'LEAGUE OF LEGENDS • SKIN DATABASE'
  },

  heroTitleLine: {
    tr: 'Aradığın skin',
    en: 'The skin you want'
  },

  heroTitleEm: {
    tr: 'burada.',
    en: 'is here.'
  },

  heroIntro: {
    tr: 'Skin adını, şampiyonu veya Riot skin ID’sini yaz. Sonuçlar anında filtrelenir.',
    en: 'Type the skin name, champion, or Riot skin ID. Results filter instantly.'
  },

  searchPlaceholder: {
    tr: 'Örn. Omega Timi Twitch veya 29004',
    en: 'E.g. Omega Squad Twitch or 29004'
  },

  showFavorites: {
    tr: 'Favorileri göster',
    en: 'Show favorites'
  },

  showAll: {
    tr: 'Tüm skinleri göster',
    en: 'Show all skins'
  },

  favoritesLabel: {
    tr: 'Favoriler',
    en: 'Favorites'
  },

  filtersLabel: {
    tr: 'Filtreler',
    en: 'Filters'
  },

  filterPanelTitle: {
    tr: 'Şampiyon filtresi',
    en: 'Champion filter'
  },

  filterSearchPlaceholder: {
    tr: 'Şampiyon ara',
    en: 'Search champions'
  },

  selectAll: {
    tr: 'Tümünü Seç',
    en: 'Select All'
  },

  clearFilters: {
    tr: 'Temizle',
    en: 'Clear'
  },

  applyFilters: {
    tr: 'Filtreleri Uygula',
    en: 'Apply Filters'
  },

  championsSelected: {
    tr: '{count} şampiyon seçildi',
    en: '{count} champions selected'
  },

  quickSearchesAriaLabel: {
    tr: 'Örnek aramalar',
    en: 'Example searches'
  },

  savedEyebrow: {
    tr: 'KAYDEDİLENLER',
    en: 'SAVED'
  },

  favoritesHeading: {
    tr: 'Favori skinlerin',
    en: 'Your favorite skins'
  },

  clearFavorites: {
    tr: 'Favorileri temizle',
    en: 'Clear favorites'
  },

  popularEyebrow: {
    tr: 'ÖNE ÇIKANLAR',
    en: 'FEATURED'
  },

  popularHeading: {
    tr: 'Popüler Skinler',
    en: 'Popular Skins'
  },

  resultsEyebrow: {
    tr: 'SONUÇLAR',
    en: 'RESULTS'
  },

  exploreSkins: {
    tr: 'Skinleri keşfet',
    en: 'Explore skins'
  },

  loadingData: {
    tr: 'Veriler yükleniyor…',
    en: 'Loading data…'
  },

  noResults: {
    tr: 'Sonuç bulunamadı',
    en: 'No results found'
  },

  noResultsHint: {
    tr: 'Skin adı, şampiyon adı veya ID ile yeniden deneyin.',
    en: 'Try again with a skin name, champion name, or ID.'
  },

  noFavoritesYet: {
    tr: 'Henüz favorin yok',
    en: 'No favorites yet'
  },

  noFavoritesYetHint: {
    tr: 'Skin kartındaki yıldız simgesine tıklayarak favorilerine ekleyebilirsin.',
    en: 'Tap the star icon on a skin card to add it to your favorites.'
  },

  noFavoriteResults: {
    tr: 'Favori skin bulunamadı',
    en: 'No favorite skins found'
  },

  noFavoriteResultsSearchHint: {
    tr: 'Bu arama için favorilerinde eşleşen skin bulunamadı.',
    en: 'No matching skins found in your favorites for this search.'
  },

  noFavoriteResultsHint: {
    tr: 'Henüz favorilerine eklediğin bir skin yok.',
    en: 'You haven’t added any skins to your favorites yet.'
  },

  addFavorite: {
    tr: 'Favorilere Ekle',
    en: 'Add to Favorites'
  },

  removeFavorite: {
    tr: 'Favorilerde',
    en: 'In Favorites'
  },

  close: {
    tr: 'Kapat',
    en: 'Close'
  },

  downloadsHeading: {
    tr: 'İNDİRMELER',
    en: 'DOWNLOADS'
  },

  downloadsAriaLabel: {
    tr: 'Skin ve chroma indirmeleri',
    en: 'Skin and chroma downloads'
  },

  mainSkin: {
    tr: 'Ana skin',
    en: 'Base skin'
  },

  fileNotFound: {
    tr: 'Bu dosya klasörde bulunamadı',
    en: 'This file was not found in the folder'
  },

  downloadFantomeTitle: {
    tr: '{id}.fantome indir',
    en: 'Download {id}.fantome'
  },

  downloadFantomeAriaLabel: {
    tr: '{name} fantome dosyasını indir',
    en: 'Download the {name} fantome file'
  },

  riotSkinId: {
    tr: 'RIOT SKIN ID: {id}',
    en: 'RIOT SKIN ID: {id}'
  },

  cardAriaLabel: {
    tr: '{name}, {champion}, ID {id}. Detayları aç',
    en: '{name}, {champion}, ID {id}. Open details'
  },

  favoriteResultsCount: {
    tr: '{count} favori sonuç',
    en: '{count} favorite results'
  },

  favoriteCount: {
    tr: '{count} favori',
    en: '{count} favorites'
  },

  resultsCount: {
    tr: '{count} sonuç bulundu',
    en: '{count} results found'
  },

  showingCount: {
    tr: '{visible}/{total} gösteriliyor',
    en: 'Showing {visible}/{total}'
  },

  metaVersion: {
    tr: '{count} ana skin • Yama {version}',
    en: '{count} base skins • Patch {version}'
  },

  dataLoadFailedMeta: {
    tr: 'Skin verisi yüklenemedi',
    en: 'Skin data could not be loaded'
  },

  dataLoadFailedTitle: {
    tr: 'Skin verileri yüklenemedi',
    en: 'Skin data could not be loaded'
  },

  dataLoadFailedHint: {
    tr: 'data/skins.json dosyasının mevcut olduğundan ve geçerli JSON içerdiğinden emin olun.',
    en: 'Make sure data/skins.json exists and contains valid JSON.'
  },

  discordEyebrow: {
    tr: 'DISCORD İLETİŞİM',
    en: 'DISCORD CONTACT'
  },

  discordTitle: {
    tr: 'Discord Sunucumuza Katıl',
    en: 'Join our Discord'
  },

  discordDescription: {
    tr: 'Güncellemeleri takip etmek, hata bildirmek, favori skinlerini paylaşmak ve diğer üyelerle sohbet etmek için topluluğumuza katıl.',
    en: 'Join our community to get updates, report bugs, share your favorite skins and chat with other members.'
  },
  discordJoinButton: {
    tr: "Discord'a Katıl",
    en: 'Join Discord'
  },

  discordHint: {
    tr: 'Yardım etmek için buradayım.',
    en: 'I\u2019m here to help.'
  },

  closeDiscord: {
    tr: 'Discord penceresini kapat',
    en: 'Close the Discord window'
  }
};

/* =========================================
   DİL
========================================= */

function getLang() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);

    if (saved === 'tr' || saved === 'en') {
      return saved;
    }
  } catch (error) {
    console.warn('Dil tercihi okunamadı:', error);
  }

  return 'tr';
}

let currentLang = getLang();

function t(key, vars) {
  const entry = TRANSLATIONS[key];

  if (!entry) {
    console.warn(`Çeviri bulunamadı: ${key}`);
    return key;
  }

  let text = entry[currentLang] || entry.tr || key;

  if (vars) {
    Object.keys(vars).forEach((varKey) => {
      text = text.replace(
        new RegExp(`\\{${varKey}\\}`, 'g'),
        String(vars[varKey])
      );
    });
  }

  return text;
}

function formatNumber(value) {
  return Number(value).toLocaleString(
    LOCALE_MAP[currentLang] || 'tr-TR'
  );
}

/* =========================================
   SKIN / ŞAMPİYON YERELLEŞTİRME
========================================= */

function getLocalizedSkinName(skin, lang = currentLang) {
  if (!skin) return '';

  return lang === 'en'
    ? skin.nameEn || skin.nameTr || skin.name || ''
    : skin.nameTr || skin.name || skin.nameEn || '';
}

function getLocalizedChampionName(skin, lang = currentLang) {
  if (!skin) return '';

  return lang === 'en'
    ? skin.championEn || skin.championTr || skin.champion || ''
    : skin.championTr || skin.champion || skin.championEn || '';
}

/* =========================================
   STATİK ÇEVİRİLER
========================================= */

function applyStaticTranslations() {
  document.documentElement.lang = currentLang;

  document
    .querySelectorAll('[data-i18n]')
    .forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });

  document
    .querySelectorAll('[data-i18n-placeholder]')
    .forEach((element) => {
      element.placeholder = t(
        element.dataset.i18nPlaceholder
      );
    });

  document
    .querySelectorAll('[data-i18n-title]')
    .forEach((element) => {
      element.title = t(
        element.dataset.i18nTitle
      );
    });

  document
    .querySelectorAll('[data-i18n-aria-label]')
    .forEach((element) => {
      element.setAttribute(
        'aria-label',
        t(element.dataset.i18nAriaLabel)
      );
    });

  document
    .querySelectorAll('[data-query-tr]')
    .forEach((button) => {
      const query =
        currentLang === 'en'
          ? button.dataset.queryEn ||
            button.dataset.queryTr
          : button.dataset.queryTr;

      const label =
        currentLang === 'en'
          ? button.dataset.labelEn ||
            button.dataset.labelTr
          : button.dataset.labelTr;

      button.dataset.query = query || '';
      button.textContent = label || '';
    });
}

/* =========================================
   DİL BUTONU
========================================= */

const langSwitch = document.querySelector('#lang-switch');
const langMenu = document.querySelector('#lang-menu');
const langSwitchFlag = document.querySelector('#lang-switch-flag');
const langSwitchCode = document.querySelector('#lang-switch-code');

const LANG_FLAGS = {
  tr: `
    <svg
      viewBox="0 0 30 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="30" height="20" fill="#E30A17"/>
      <circle cx="11" cy="10" r="5" fill="#fff"/>
      <circle cx="12.4" cy="10" r="4" fill="#E30A17"/>
      <polygon
        points="17.3,8.6 17.62,9.56 18.63,9.57 17.82,10.17 18.12,11.13 17.3,10.55 16.48,11.13 16.78,10.17 15.97,9.57 16.98,9.56"
        fill="#fff"
      />
    </svg>
  `,

  en: `
    <svg
      viewBox="0 0 30 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="30" height="20" fill="#fff"/>
      <rect y="0" width="30" height="1.54" fill="#B22234"/>
      <rect y="3.08" width="30" height="1.54" fill="#B22234"/>
      <rect y="6.15" width="30" height="1.54" fill="#B22234"/>
      <rect y="9.23" width="30" height="1.54" fill="#B22234"/>
      <rect y="12.31" width="30" height="1.54" fill="#B22234"/>
      <rect y="15.38" width="30" height="1.54" fill="#B22234"/>
      <rect y="18.46" width="30" height="1.54" fill="#B22234"/>

      <rect width="12" height="10.77" fill="#3C3B6E"/>

      <g fill="#fff">
        <circle cx="2" cy="1.5" r="0.45"/>
        <circle cx="5" cy="1.5" r="0.45"/>
        <circle cx="8" cy="1.5" r="0.45"/>
        <circle cx="11" cy="1.5" r="0.45"/>

        <circle cx="3.5" cy="3" r="0.45"/>
        <circle cx="6.5" cy="3" r="0.45"/>
        <circle cx="9.5" cy="3" r="0.45"/>

        <circle cx="2" cy="4.5" r="0.45"/>
        <circle cx="5" cy="4.5" r="0.45"/>
        <circle cx="8" cy="4.5" r="0.45"/>
        <circle cx="11" cy="4.5" r="0.45"/>

        <circle cx="3.5" cy="6" r="0.45"/>
        <circle cx="6.5" cy="6" r="0.45"/>
        <circle cx="9.5" cy="6" r="0.45"/>

        <circle cx="2" cy="7.5" r="0.45"/>
        <circle cx="5" cy="7.5" r="0.45"/>
        <circle cx="8" cy="7.5" r="0.45"/>
        <circle cx="11" cy="7.5" r="0.45"/>

        <circle cx="3.5" cy="9" r="0.45"/>
        <circle cx="6.5" cy="9" r="0.45"/>
        <circle cx="9.5" cy="9" r="0.45"/>
      </g>
    </svg>
  `
};

function updateLangSwitchUI() {
  if (langSwitchFlag) {
    langSwitchFlag.innerHTML =
      LANG_FLAGS[currentLang];
  }

  if (langSwitchCode) {
    langSwitchCode.textContent =
      currentLang.toUpperCase();
  }

  document
    .querySelectorAll('.lang-menu-option')
    .forEach((option) => {
      const active =
        option.dataset.lang === currentLang;

      option.setAttribute(
        'aria-selected',
        active ? 'true' : 'false'
      );
    });
}

function closeLangMenu() {
  if (!langMenu) {
    return;
  }

  langMenu.hidden = true;

  langSwitch?.setAttribute(
    'aria-expanded',
    'false'
  );
}

function openLangMenu() {
  if (!langMenu) {
    return;
  }

  langMenu.hidden = false;

  langSwitch?.setAttribute(
    'aria-expanded',
    'true'
  );
}

function setLang(lang) {
  if (lang !== 'tr' && lang !== 'en') {
    return;
  }

  currentLang = lang;

  try {
    localStorage.setItem(
      LANG_STORAGE_KEY,
      lang
    );
  } catch (error) {
    console.warn(
      'Dil tercihi kaydedilemedi:',
      error
    );
  }

  applyStaticTranslations();
  updateLangSwitchUI();

  setFavoriteFilter(
    isFavoriteFilterActive()
  );
  updateFilterButtonState();
  renderChampionFilterOptions();

  renderPopular();
  render();
  syncAllFavoriteButtons();

  // Açık modal da kartlarla aynı merkezi locale resolver'ını kullanır.
  // İçerik seçili skin korunarak yenilenir.
  if (modal?.open && activeModalGroup) {
    refreshOpenModal(activeModalGroup);
  }

  track('language_change', {
    language: lang
  });
}

langSwitch?.addEventListener(
  'click',
  (event) => {
    event.stopPropagation();

    if (langMenu?.hidden) {
      openLangMenu();
    } else {
      closeLangMenu();
    }
  }
);

document
  .querySelectorAll('.lang-menu-option')
  .forEach((option) => {
    option.addEventListener('click', () => {
      setLang(option.dataset.lang);
      closeLangMenu();
    });
  });

document.addEventListener('click', (event) => {
  if (!langMenu || langMenu.hidden) {
    return;
  }

  if (
    langMenu.contains(event.target) ||
    langSwitch?.contains(event.target)
  ) {
    return;
  }

  closeLangMenu();
});

document.addEventListener('keydown', (event) => {
  if (
    event.key === 'Escape' &&
    langMenu &&
    !langMenu.hidden
  ) {
    closeLangMenu();
  }
});

/* =========================================
   DOM
========================================= */

const search = document.querySelector('#search');
const results = document.querySelector('#results');
const empty = document.querySelector('#empty');
const meta = document.querySelector('#meta');
const title = document.querySelector('#result-title');
const template = document.querySelector('#skin-template');
const popularSection = document.querySelector('#popular-section');
const popularGrid = document.querySelector('#popular-grid');

const modal = document.querySelector('#skin-modal');
const downloadList =
  document.querySelector('#download-list');

const fantomeFiles = new Set();

/* =========================================
   FAVORİLER
========================================= */

const FAVORITES_STORAGE_KEY =
  'exist-lol-skin-favorites';

const CHAMPION_FILTER_STORAGE_KEY =
  'exist-lol-skin-champion-filters';

let favorites = new Set();
let appliedChampionFilters = new Set();
let draftChampionFilters = new Set();

try {
  const savedFavorites = JSON.parse(
    localStorage.getItem(
      FAVORITES_STORAGE_KEY
    ) || '[]'
  );

  if (Array.isArray(savedFavorites)) {
    favorites = new Set(
      savedFavorites.map(String)
    );
  }
} catch (error) {
  console.warn(
    'Favoriler yüklenemedi:',
    error
  );

  favorites = new Set();
}

try {
  const savedChampionFilters = JSON.parse(
    localStorage.getItem(
      CHAMPION_FILTER_STORAGE_KEY
    ) || '[]'
  );

  if (Array.isArray(savedChampionFilters)) {
    appliedChampionFilters = new Set(
      savedChampionFilters
        .map((value) =>
          String(value)
        )
        .filter(Boolean)
    );

    draftChampionFilters = new Set(
      appliedChampionFilters
    );
  }
} catch (error) {
  console.warn(
    'Şampiyon filtreleri yüklenemedi:',
    error
  );

  appliedChampionFilters = new Set();
  draftChampionFilters = new Set();
}

/* =========================================
   ANALYTICS
========================================= */

const track = (
  eventName,
  parameters = {}
) => {
  if (typeof window.gtag === 'function') {
    window.gtag(
      'event',
      eventName,
      parameters
    );
  }
};

/* =========================================
   ASSET URL
========================================= */

const assetUrl = (path) => {
  const base = import.meta.env?.BASE_URL || './';
  
  // Normalize the input path: remove leading slashes and leading './'
  const normalizedPath = String(path).replace(/^\/+/, '').replace(/^\.\//, '');
  
  // Normalize base: ensure it ends with a slash if not empty/relative
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  
  // If base is './' or '/', keep as relative
  if (base === './' || base === '/') {
      return `./${normalizedPath}`;
  }

  return `${normalizedBase}${normalizedPath}`;
};

/*
 * Skin görseli CDN sırası:
 *  1) skin.image → Riot Data Dragon splash art
 *     (https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{championId}_{num}.jpg)
 *     Not: public/images/skins/*.jpg dosyalarının tamamı 68 byte'lık
 *     1x1 şeffaf placeholder PNG'dir (bkz. scripts/generate-placeholders.mjs),
 *     gerçek görsel değildir — bu yüzden birincil kaynak olarak KULLANILMAZ.
 *  2) CommunityDragon istemci splash yolu → Data Dragon başarısız olursa
 *     kanonik, belirli skin splash'i ikinci deneme olur.
 *  3) İkisi de başarısız olursa img gizlenir, kart üzerindeki isim/şampiyon
 *     metni zaten görünür kalır (kırık görsel ikonu gösterilmez).
 */

const imageSourceCache = new Map();

function isRemoteImageUrl(value) {
  return /^https:\/\//i.test(String(value || ''));
}

function getSkinImageSources(skin) {
  const cacheKey = String(skin?.id || '');

  if (cacheKey && imageSourceCache.has(cacheKey)) {
    return imageSourceCache.get(cacheKey);
  }

  const dataDragonUrl = skin?.championId !== undefined && skin?.skinNum !== undefined
    ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${skin.championId}_${skin.skinNum}.jpg`
    : '';

  // Yerel images/skins dosyaları bilinen 1x1 placeholder'lardır. Buraya
  // özellikle dahil edilmez; yalnızca Riot CDN URL'leri kullanılabilir.
  const sources = [...new Set([
    skin?.image,
    dataDragonUrl,
    skin?.imageFallback
  ].filter(isRemoteImageUrl))];

  if (cacheKey) {
    imageSourceCache.set(cacheKey, sources);
  }

  return sources;
}

function getSkinImageUrl(skin) {
  return getSkinImageSources(skin)[0] || '';
}

// <img> için sıralı Riot CDN denemesi yapan ortak onerror zinciri.
function attachImageFallbackChain(imageEl, skin, onFinalFailure) {
  if (!imageEl) {
    return;
  }

  const sources = getSkinImageSources(skin);
  let sourceIndex = Math.max(0, sources.indexOf(imageEl.src));

  imageEl.onerror = () => {
    sourceIndex += 1;

    if (sources[sourceIndex]) {
      imageEl.src = sources[sourceIndex];
      return;
    }

    imageEl.onerror = null;

    if (onFinalFailure) {
      onFinalFailure();
    } else {
      imageEl.style.display = 'none';
    }
  };
}

/* =========================================
   VERİLER
========================================= */

let skins = [];
let skinGroups = [];
let activeModalGroup = null;

let searchTrackingTimer = null;
let lastTrackedSearch = '';

/* =========================================
   SEARCH CACHE (LRU)
========================================= */

const SEARCH_CACHE_MAX_SIZE = 20;
const searchCache = new Map();

// Cache key includes query, favorite filter state, and champion filter state
function getSearchCacheKey(query, favoriteFilterActive, championFilters) {
  const filterKey = championFilters.size > 0
    ? [...championFilters].sort().join(',')
    : '';
  return `${query}|${favoriteFilterActive ? '1' : '0'}|${filterKey}`;
}

function getCachedSearchResult(cacheKey) {
  const entry = searchCache.get(cacheKey);
  if (entry) {
    // Move to end (most recently used)
    searchCache.delete(cacheKey);
    searchCache.set(cacheKey, entry);
    return entry;
  }
  return null;
}

function setCachedSearchResult(cacheKey, result) {
  // Remove oldest if at capacity
  if (searchCache.size >= SEARCH_CACHE_MAX_SIZE) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(cacheKey, result);
}

function clearSearchCache() {
  searchCache.clear();
}

/* =========================================
   FAVORİLERİ KAYDET
========================================= */

function saveFavorites() {
  try {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify([...favorites])
    );
  } catch (error) {
    console.warn(
      'Favoriler kaydedilemedi:',
      error
    );
  }
}

/* =========================================
   FAVORİ KONTROLÜ
========================================= */

function isFavorite(skinId) {
  return favorites.has(String(skinId));
}

/* =========================================
   FAVORİ SAYISI
========================================= */

function updateFavoriteCount() {
  const favoriteCount =
    document.querySelector(
      '#favorite-count'
    );

  if (!favoriteCount) {
    return;
  }

  favoriteCount.textContent =
    formatNumber(favorites.size);

  favoriteCount.hidden =
    favorites.size === 0;
}

/* =========================================
   FAVORİ BUTONU
========================================= */

function updateFavoriteButton(
  button,
  skinId
) {
  if (!button) {
    return;
  }

  const favorite = isFavorite(skinId);

  button.dataset.skinId =
    String(skinId);

  button.classList.toggle(
    'is-favorite',
    favorite
  );

  button.setAttribute(
    'aria-pressed',
    favorite ? 'true' : 'false'
  );

  button.setAttribute(
    'aria-label',
    favorite
      ? t('removeFavorite')
      : t('addFavorite')
  );

  button.title =
    favorite
      ? t('removeFavorite')
      : t('addFavorite');

  const icon =
    button.querySelector(
      '.favorite-icon'
    );

  if (icon) {
    icon.textContent =
      favorite ? '★' : '☆';
  }

  const modalText =
    button.querySelector(
      '.modal-favorite-text'
    );

  if (modalText) {
    modalText.textContent =
      favorite
        ? t('removeFavorite')
        : t('addFavorite');
  }

  const modalIcon =
    button.querySelector(
      '.modal-favorite-icon'
    );

  if (modalIcon) {
    modalIcon.textContent =
      favorite ? '★' : '☆';
  }
}

function syncFavoriteButtons(skinId) {
  const targetId = String(skinId);

  document
    .querySelectorAll(
      '.favorite-button[data-skin-id]'
    )
    .forEach((button) => {
      if (
        String(button.dataset.skinId) ===
        targetId
      ) {
        updateFavoriteButton(
          button,
          targetId
        );
      }
    });
}

function syncAllFavoriteButtons() {
  document
    .querySelectorAll(
      '.favorite-button[data-skin-id]'
    )
    .forEach((button) => {
      updateFavoriteButton(
        button,
        button.dataset.skinId
      );
    });
}

/* =========================================
   FAVORİ FİLTRESİ
========================================= */

const favoriteFilter =
  document.querySelector(
    '#favorite-filter'
  );

const filterButton =
  document.querySelector(
    '#filter-button'
  );

const filterPanel =
  document.querySelector(
    '#champion-filter-panel'
  );

const filterCount =
  document.querySelector(
    '#filter-count'
  );

const filterSearchInput =
  document.querySelector(
    '#filter-search-input'
  );

const filterOptionList =
  document.querySelector(
    '#filter-option-list'
  );

const filterSummary =
  document.querySelector(
    '#filter-summary'
  );

const filterSelectAllButton =
  document.querySelector(
    '#filter-select-all'
  );

const filterClearButton =
  document.querySelector(
    '#filter-clear'
  );

const applyFiltersButton =
  document.querySelector(
    '#apply-filters'
  );

const filterPanelClose =
  document.querySelector(
    '.filter-panel-close'
  );

function isFavoriteFilterActive() {
  return Boolean(
    favoriteFilter?.classList.contains(
      'is-active'
    )
  );
}

function setFavoriteFilter(active) {
  if (!favoriteFilter) {
    return;
  }

  favoriteFilter.classList.toggle(
    'is-active',
    active
  );

  favoriteFilter.setAttribute(
    'aria-pressed',
    active ? 'true' : 'false'
  );

  favoriteFilter.setAttribute(
    'aria-label',
    active
      ? t('showAll')
      : t('showFavorites')
  );

  favoriteFilter.title =
    active
      ? t('showAll')
      : t('showFavorites');
}

function getChampionOptions() {
  const options = new Map();

  skins.forEach((skin) => {
   // Use pre-computed normalized champion keys
   const keys = skin._championKeys;
   if (keys) {
     keys.forEach((key) => {
       if (!key) return;
       const displayName = getLocalizedChampionName(skin);
       if (!options.has(key)) {
         options.set(key, {
           key,
           label: displayName
         });
       }
     });
   } else {
     // Fallback for any skin without pre-computed keys
     const names = [
       getLocalizedChampionName(skin, 'tr'),
       getLocalizedChampionName(skin, 'en')
     ].filter(Boolean);

     names.forEach((name) => {
       const key = normalize(name);
       if (!key) return;
       const displayName = getLocalizedChampionName(skin);
       if (!options.has(key)) {
         options.set(key, {
           key,
           label: displayName || name
         });
       }
     });
   }
  });

  return [...options.values()].sort(
   (a, b) =>
     a.label.localeCompare(b.label, currentLang === 'tr' ? 'tr' : 'en', {
       sensitivity: 'base'
     })
  );
}

function saveChampionFilters() {
  try {
   localStorage.setItem(
     CHAMPION_FILTER_STORAGE_KEY,
     JSON.stringify([...appliedChampionFilters])
   );
  } catch (error) {
   console.warn(
     'Şampiyon filtreleri kaydedilemedi:',
     error
   );
  }
}

function updateFilterButtonState() {
  if (!filterButton || !filterCount) {
   return;
  }

  const count = appliedChampionFilters.size;
  const active = count > 0;

  filterButton.classList.toggle(
   'is-active',
   active
  );

  filterButton.setAttribute(
   'aria-pressed',
   active ? 'true' : 'false'
  );

  filterButton.setAttribute(
   'aria-label',
   `${t('filtersLabel')}${active ? ` (${count})` : ''}`
  );

  filterButton.title =
   `${t('filtersLabel')}${active ? ` (${count})` : ''}`;

  filterCount.hidden = !active;
  filterCount.textContent = String(count);
}

function updateFilterSummary() {
  if (!filterSummary) {
   return;
  }

  filterSummary.textContent = t(
   'championsSelected',
   {
     count: draftChampionFilters.size
   }
  );
}

function renderChampionFilterOptions() {
  if (!filterOptionList) {
   return;
  }

  const query =
   normalize(
     filterSearchInput?.value || ''
   );

  const options = getChampionOptions().filter(
   ({ label }) =>
     !query ||
     normalize(label).includes(query)
  );

  filterOptionList.replaceChildren(
   ...options.map(({ key, label }) => {
     const option = document.createElement(
       'label'
     );

     option.className = 'filter-option';
     option.innerHTML = `
       <input
         type="checkbox"
         value="${key}"
         ${draftChampionFilters.has(key) ? 'checked' : ''}
       />
       <span>${label}</span>
     `;

     const checkbox =
       option.querySelector('input');

     checkbox?.addEventListener(
       'change',
       () => {
         if (checkbox.checked) {
           draftChampionFilters.add(key);
         } else {
           draftChampionFilters.delete(key);
         }

         updateFilterSummary();
       }
     );

     return option;
   })
  );

  updateFilterSummary();
}

function openChampionFilterPanel() {
  if (!filterPanel) {
   return;
  }

  draftChampionFilters = new Set(
   appliedChampionFilters
  );

  renderChampionFilterOptions();
  filterPanel.hidden = false;
  filterButton?.setAttribute(
   'aria-expanded',
   'true'
  );
  filterSearchInput?.focus();
}

function closeChampionFilterPanel() {
  if (!filterPanel) {
   return;
  }

  filterPanel.hidden = true;
  filterButton?.setAttribute(
   'aria-expanded',
   'false'
  );
}

function applyChampionFilters() {
  appliedChampionFilters = new Set(
   draftChampionFilters
  );

  saveChampionFilters();
  updateFilterButtonState();
  clearSearchCache();
  render();
  closeChampionFilterPanel();
}

function selectAllChampionDraft() {
  draftChampionFilters = new Set(
   getChampionOptions().map(
     ({ key }) => key
   )
  );

  renderChampionFilterOptions();
}

function clearChampionDraft() {
  draftChampionFilters = new Set();
  renderChampionFilterOptions();
}

function skinMatchesChampionFilter(skin) {
  if (appliedChampionFilters.size === 0) {
   return true;
  }

  // Use pre-computed normalized champion keys
  const keys = skin._championKeys;
  if (keys) {
    return keys.some((key) => appliedChampionFilters.has(key));
  }

  // Fallback for any skin without pre-computed keys
  const fallbackKeys = [
   getLocalizedChampionName(skin, 'tr'),
   getLocalizedChampionName(skin, 'en')
  ]
   .filter(Boolean)
   .map((name) => normalize(name));

  return fallbackKeys.some((key) =>
   appliedChampionFilters.has(key)
  );
}

function groupMatchesChampionFilter(group) {
  if (appliedChampionFilters.size === 0) {
   return true;
  }

  return group.skins.some((skin) =>
   skinMatchesChampionFilter(skin)
  );
}

/* =========================================
   FAVORİ DEĞİŞTİR
========================================= */

function toggleFavorite(
  skinId,
  button
) {
  if (!button) {
    return;
  }

  const id = String(skinId);
  const wasFavorite =
    favorites.has(id);

  if (wasFavorite) {
    favorites.delete(id);
  } else {
    favorites.add(id);
  }

  saveFavorites();

  updateFavoriteButton(
    button,
    id
  );

  syncFavoriteButtons(id);

  button.classList.remove(
    'favorite-pop',
    'favorite-remove'
  );

  void button.offsetWidth;

  if (!wasFavorite) {
    button.classList.add(
      'favorite-pop'
    );
  } else {
    button.classList.add(
      'favorite-remove'
    );

    window.setTimeout(() => {
      button.classList.remove(
        'favorite-remove'
      );
    }, 320);
  }

  updateFavoriteCount();

  if (isFavoriteFilterActive()) {
    window.setTimeout(() => {
      clearSearchCache();
      render();
    }, 220);
  }

  track('favorite_toggle', {
    skin_id: id,
    is_favorite:
      favorites.has(id) ? 1 : 0
  });
}

/* =========================================
   NORMALIZE
========================================= */

const normalize = (value) =>
  String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(/ı/g, 'i')
    .replace(
      /[^a-z0-9]/g,
      ''
    );

/* =========================================
   ARAMA RELEVANS SKORU
========================================= */

// Score match against an already-normalized text string
function scoreNormalizedMatch(normalizedText, normalizedQuery) {
  if (!normalizedText || !normalizedQuery) {
   return 0;
  }

  if (normalizedText === normalizedQuery) {
   return 1_000_000;
  }

  if (
   normalizedText.startsWith(
     normalizedQuery
   )
  ) {
   return (
     900_000 +
     Math.max(
       0,
       normalizedText.length -
         normalizedQuery.length
     ) *
       25
   );
  }

  const tokens =
   normalizedText
     .split(/[^a-z0-9]+/)
     .filter(Boolean);

  if (
   tokens.some(
     (token) =>
       token === normalizedQuery
   )
  ) {
   return (
     700_000 +
     normalizedQuery.length *
       200
   );
  }

  if (
   normalizedText.includes(
     normalizedQuery
   )
  ) {
   return (
     500_000 +
     Math.max(
       0,
       2000 -
         Math.abs(
           normalizedText.length -
             normalizedQuery.length
         ) *
           12
     )
   );
  }

  let lastIndex = -1;
  let orderedCount = 0;
  let consecutiveCount = 0;
  let totalGapDistance = 0;

  for (const character of normalizedQuery) {
   const nextIndex =
     normalizedText.indexOf(
       character,
       lastIndex + 1
     );

   if (nextIndex === -1) {
     return 0;
   }

   if (nextIndex > lastIndex) {
     orderedCount += 1;
   }

   if (
     lastIndex !== -1 &&
     nextIndex === lastIndex + 1
   ) {
     consecutiveCount += 1;
   }

   if (lastIndex !== -1) {
     totalGapDistance +=
       nextIndex - lastIndex;
   }

   lastIndex = nextIndex;
  }

  if (orderedCount !== normalizedQuery.length) {
   return 0;
  }

  const fuzzyScore =
   orderedCount * 150 +
   consecutiveCount * 120 -
   totalGapDistance * 25;

  return fuzzyScore > 0
   ? fuzzyScore
   : 1;
}

function getGroupSearchScore(
  group,
  normalizedQuery
) {
  if (!normalizedQuery) {
   return 0;
  }

  let bestScore = 0;

  group.skins.forEach((skin) => {
   // Use pre-computed normalized search fields
   const fields = skin._searchFields;
   if (fields) {
     for (const normalizedText of fields) {
       const score = scoreNormalizedMatch(normalizedText, normalizedQuery);
       if (score > bestScore) {
         bestScore = score;
         // Early exit for perfect match
         if (bestScore >= 1_000_000) return;
       }
     }
   }
  });

  return bestScore;
}

function groupMatchesSearch(
  group,
  normalizedQuery
) {
  return getGroupSearchScore(
   group,
   normalizedQuery
  ) > 0;
}

/* =========================================
   FAVORİ GRUP KONTROLÜ
========================================= */

function groupHasFavorite(group) {
  return group.skins.some(
    (skin) =>
      isFavorite(skin.id)
  );
}

/* =========================================
   GÜVENLİ SKIN VERİSİ
========================================= */

function normalizeSkin(skin) {
  if (
    !skin ||
    typeof skin !== 'object'
  ) {
    return null;
  }

  const id = String(
    skin.id ?? ''
  ).trim();

  const name = String(
    skin.name ?? ''
  ).trim();

  const champion = String(
    skin.champion ?? ''
  ).trim();

  const image = String(
    skin.image ?? ''
  ).trim();

  const imageFallback = String(
    skin.imageFallback ?? ''
  ).trim();

  const nameTr = skin.nameTr
    ? String(skin.nameTr).trim()
    : name;

  const championTr = skin.championTr
    ? String(skin.championTr).trim()
    : champion;

  const nameEn = skin.nameEn
    ? String(
        skin.nameEn
      ).trim()
    : '';

  const championEn =
    skin.championEn
      ? String(
          skin.championEn
        ).trim()
      : '';

  if (
    !id ||
    !name ||
    !champion
  ) {
    return null;
  }

  // Pre-compute normalized search fields to avoid repeated normalization during search
  const searchFields = [
    name,
    nameEn,
    champion,
    championEn,
    String(id)
  ].filter(Boolean);

  const normalizedSearchFields = searchFields.map(normalize);

  // Pre-compute normalized champion keys for filter matching
  const championKeys = [
    championTr,
    championEn
  ].filter(Boolean).map(normalize);

  return {
    ...skin,
    id,
    name,
    champion,
    image,
    imageFallback,
    nameTr,
    championTr,
    nameEn,
    championEn,
    _searchFields: normalizedSearchFields,
    _championKeys: championKeys
  };
}

/* =========================================
   SKIN KARTI
========================================= */

function createSkinCard(group) {
  if (
    !group ||
    !group.primary
  ) {
    return null;
  }

  const skin = group.primary;

  if (!template?.content) {
    console.error(
      '#skin-template bulunamadı.'
    );

    return null;
  }

  const card =
    template.content.cloneNode(
      true
    );

  const image =
    card.querySelector('img');

  const championElement =
    card.querySelector(
      '.champion'
    );

  const nameElement =
    card.querySelector('h3');

  const idElement =
    card.querySelector(
      '.skin-id'
    );

  const article =
    card.querySelector(
      '.skin-card'
    );

  if (!article) {
    console.error(
      '.skin-card template içinde bulunamadı.'
    );

    return null;
  }

  const displayName =
    getLocalizedSkinName(skin);

  const displayChampion =
    getLocalizedChampionName(skin);

  /* ---------------------------------------
     Görsel
  --------------------------------------- */

  if (image) {
    image.src = getSkinImageUrl(skin);

    image.alt =
      `${displayName} — ${displayChampion}`;

    image.loading = 'lazy';
    image.decoding = 'async';

    attachImageFallbackChain(image, skin);
  }

  /* ---------------------------------------
     Metin
  --------------------------------------- */

  if (championElement) {
    championElement.textContent =
      displayChampion;
  }

  if (nameElement) {
    nameElement.textContent =
      displayName;
  }

  if (idElement) {
    idElement.textContent =
      `ID: ${skin.id}`;
  }

  /* ---------------------------------------
     Favori butonu
  --------------------------------------- */

  let favoriteButton =
    card.querySelector(
      '.favorite-button'
    );

  if (!favoriteButton) {
    favoriteButton =
      document.createElement(
        'button'
      );

    favoriteButton.type = 'button';

    favoriteButton.className =
      'favorite-button';

    favoriteButton.innerHTML = `
      <span
        class="favorite-icon"
        aria-hidden="true"
      >☆</span>
    `;

    article.appendChild(
      favoriteButton
    );
  }

  favoriteButton.type =
    'button';

  favoriteButton.dataset.skinId =
    String(skin.id);

  updateFavoriteButton(
    favoriteButton,
    skin.id
  );

  favoriteButton.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      toggleFavorite(
        skin.id,
        favoriteButton
      );
    }
  );

  /* ---------------------------------------
     Kart erişilebilirliği
  --------------------------------------- */

  article.tabIndex = 0;

  article.setAttribute(
    'role',
    'button'
  );

  article.setAttribute(
    'aria-label',
    t('cardAriaLabel', {
      name: displayName,
      champion: displayChampion,
      id: skin.id
    })
  );

  /* ---------------------------------------
     Modal
  --------------------------------------- */

  article.addEventListener(
    'click',
    () => {
      openModal(group);
    }
  );

  article.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        event.preventDefault();
        openModal(group);
      }
    }
  );

  return card;
}

/* =========================================
   POPÜLER SKİNLER
========================================= */

// Öne çıkan / bilinen skinler için sabit ID listesi.
// skins.json her güncellendiğinde ID'ler değişmez,
// bu yüzden burada elle seçilmiş bir liste kullanılır.
const POPULAR_SKIN_IDS = [
  '103015', // K/DA Ahri
  '99007',  // Elementalist Lux
  '37006',  // DJ Sona
  '22008',  // PROJECT: Ashe
  '103027', // Spirit Blossom Ahri
  '81005',  // Pulsefire Ezreal
  '266007', // Blood Moon Aatrox
  '246002', // True Damage Qiyana
  '99015',  // Battle Academia Lux
  '141002', // Odyssey Kayn
  '21007',  // Arcade Miss Fortune
  '412005'  // Dark Star Thresh
];

let popularRendered = false;

function renderPopular() {
  if (!popularGrid || !popularSection) {
    return;
  }

  if (!skinGroups.length) {
    return;
  }

  const groupsById = new Map();

  skinGroups.forEach((group) => {
    group.skins.forEach((skin) => {
      groupsById.set(String(skin.id), group);
    });
  });

  const seen = new Set();

  const popularGroups = POPULAR_SKIN_IDS
    .map((id) => groupsById.get(String(id)))
    .filter((group) => {
      if (!group || seen.has(group.primary.id)) {
        return false;
      }

      seen.add(group.primary.id);
      return true;
    });

  if (!popularGroups.length) {
    popularSection.hidden = true;
    return;
  }

  const cards = popularGroups
    .map((group) => createSkinCard(group))
    .filter(Boolean);

  popularGrid.replaceChildren(...cards);
  popularSection.hidden = false;
  popularRendered = true;
}

/* =========================================
   SKINLERİ RENDER ET
========================================= */

// Incremental rendering state
let renderState = {
  allGroups: [],
  renderedCount: 0,
  batchSize: 30,
  isRendering: false,
  observer: null
};

function render() {
  if (
    !search ||
    !results ||
    !empty ||
    !title
  ) {
    return;
  }

  const query =
    normalize(search.value);
  const favoriteActive = isFavoriteFilterActive();
  const championFilters = appliedChampionFilters;

  if (popularSection) {
    popularSection.hidden =
      Boolean(query) ||
      favoriteActive;
  }

  // Check cache first
  const cacheKey = getSearchCacheKey(query, favoriteActive, championFilters);
  const cached = getCachedSearchResult(cacheKey);

  let found;
  if (cached) {
    found = cached;
  } else {
    // Compute search results
    found =
      skinGroups
       .map((group) => ({
         group,
         score: getGroupSearchScore(
           group,
           query
         )
       }))
       .filter(
         ({ group, score }) =>
           (!query || score > 0) &&
           groupMatchesChampionFilter(group)
       )
       .sort(
         (a, b) =>
           b.score - a.score
       )
       .map(({ group }) => group);

    /* ---------------------------------------
       Favori filtresi
    --------------------------------------- */

    if (favoriteActive) {
      found = found.filter(
       (group) =>
         groupHasFavorite(group)
      );
    }

    // Cache the full sorted/filtered results
    setCachedSearchResult(cacheKey, found);
  }

  // Update title and meta immediately (cheap operations)
  if (favoriteActive) {
    title.textContent = query
      ? t(
          'favoriteResultsCount',
          {
            count:
              formatNumber(
                found.length
              )
          }
        )
      : t(
          'favoriteCount',
          {
            count:
              formatNumber(
                found.length
              )
          }
        );
  } else {
    title.textContent = query
      ? t(
          'resultsCount',
          {
            count:
              formatNumber(
                found.length
              )
          }
        )
      : t(
          'exploreSkins'
        );
  }

  const maxVisible =
    query ||
    favoriteActive
      ? 80
      : 24;

  // Reset incremental rendering state
  renderState.allGroups = found;
  renderState.renderedCount = 0;
  renderState.batchSize = maxVisible <= 30 ? maxVisible : 30;

  // Clear previous results and start incremental rendering
  results.replaceChildren();
  empty.hidden = found.length !== 0;
  results.hidden = found.length === 0;

  // Render first batch
  renderNextBatch();

  // Set up intersection observer for progressive loading
  setupRenderObserver();

  /* ---------------------------------------
     Meta
  --------------------------------------- */

  if (
    meta &&
    skinGroups.length
  ) {
    if (
      query ||
      favoriteActive
    ) {
      meta.textContent =
        t('showingCount', {
          visible:
            formatNumber(
              Math.min(renderState.batchSize, found.length)
            ),
          total:
            formatNumber(
              found.length
            )
        });
    }
  }

  /* ---------------------------------------
     Boş durum
  --------------------------------------- */

  const emptyTitle =
    empty.querySelector('h2');

  const emptyText =
    empty.querySelector('p');

  if (
    emptyTitle &&
    emptyText
  ) {
    if (
      favoriteActive &&
      favorites.size === 0
    ) {
      emptyTitle.textContent =
        t('noFavoritesYet');

      emptyText.textContent =
        t('noFavoritesYetHint');
    } else if (
      favoriteActive &&
      found.length === 0
    ) {
      emptyTitle.textContent =
        t('noFavoriteResults');

      emptyText.textContent =
        query
          ? t(
              'noFavoriteResultsSearchHint'
            )
          : t(
              'noFavoriteResultsHint'
            );
    } else {
      emptyTitle.textContent =
        t('noResults');

      emptyText.textContent =
        t('noResultsHint');
    }
  }

  updateFavoriteCount();
  updateFilterButtonState();
}

function renderNextBatch() {
  const { allGroups, renderedCount, batchSize } = renderState;
  const nextCount = Math.min(renderedCount + batchSize, allGroups.length);
  const batch = allGroups.slice(renderedCount, nextCount);

  if (batch.length === 0) {
    // No more to render, disconnect observer
    if (renderState.observer) {
      renderState.observer.disconnect();
      renderState.observer = null;
    }
    return;
  }

  const fragment = document.createDocumentFragment();
  batch.forEach((group) => {
    const card = createSkinCard(group);
    if (card) fragment.appendChild(card);
  });

  results.appendChild(fragment);
  renderState.renderedCount = nextCount;

  // Update meta with current visible count
  if (meta && skinGroups.length) {
    const query = normalize(search?.value || '');
    const favoriteActive = isFavoriteFilterActive();
    if (query || favoriteActive) {
      meta.textContent =
        t('showingCount', {
          visible:
            formatNumber(renderState.renderedCount),
          total:
            formatNumber(allGroups.length)
        });
    }
  }
}

function setupRenderObserver() {
  // Clean up previous observer
  if (renderState.observer) {
    renderState.observer.disconnect();
  }

  // Create sentinel element for intersection observer
  let sentinel = results.querySelector('.render-sentinel');
  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.className = 'render-sentinel';
    sentinel.style.height = '1px';
    results.appendChild(sentinel);
  }

  renderState.observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && renderState.renderedCount < renderState.allGroups.length) {
        renderNextBatch();
      }
    },
    {
      rootMargin: '200px',
      threshold: 0
    }
  );

  renderState.observer.observe(sentinel);
}

/* =========================================
   SKIN MODALI
========================================= */

function openModal(group) {
  if (
    !modal ||
    !downloadList ||
    !group?.primary
  ) {
    return;
  }

  const skin =
    group.primary;

  activeModalGroup = group;

  const modalImage =
    document.querySelector(
      '#modal-image'
    );

  const modalChampion =
    document.querySelector(
      '#modal-champion'
    );

  const modalSkinName =
    document.querySelector(
      '#modal-skin-name'
    );

  const modalSkinId =
    document.querySelector(
      '#modal-skin-id'
    );

  const displayName =
    getLocalizedSkinName(skin);

  const displayChampion =
    getLocalizedChampionName(skin);

  /* ---------------------------------------
     Modal görseli
  --------------------------------------- */

  if (modalImage) {
    modalImage.style.display = '';
    modalImage.src = getSkinImageUrl(skin);

    modalImage.alt =
      `${displayName} — ${displayChampion}`;

    attachImageFallbackChain(modalImage, skin);
  }

  /* ---------------------------------------
     Modal bilgileri
  --------------------------------------- */

  if (modalChampion) {
    modalChampion.textContent =
      displayChampion;
  }

  if (modalSkinName) {
    modalSkinName.textContent =
      displayName;
  }

  if (modalSkinId) {
    modalSkinId.textContent =
      t('riotSkinId', {
        id: skin.id
      });
  }

  /* ---------------------------------------
     Modal favori
  --------------------------------------- */

  const modalFavoriteButton =
    document.querySelector(
      '#modal-favorite'
    );

  if (modalFavoriteButton) {
    modalFavoriteButton.dataset.skinId =
      String(skin.id);

    updateFavoriteButton(
      modalFavoriteButton,
      skin.id
    );

    modalFavoriteButton.onclick =
      () => {
        toggleFavorite(
          skin.id,
          modalFavoriteButton
        );
      };
  }

  /* ---------------------------------------
     Fantome dosyaları
  --------------------------------------- */

  const fragment =
    document.createDocumentFragment();

  group.skins.forEach((item) => {
    const hasFile =
      fantomeFiles.has(
        String(item.id)
      );

    const element =
      document.createElement(
        hasFile ? 'a' : 'span'
      );

    element.className =
      `download-item${
        hasFile
          ? ''
          : ' unavailable'
      }`;

    const itemDisplayName =
      getLocalizedSkinName(item);

    const chromaName =
      itemDisplayName.match(
        /\(([^)]+)\)$/
      )?.[1];

    element.textContent =
      item === skin
        ? `${t('mainSkin')} · ${item.id}`
        : `${
            chromaName ||
            itemDisplayName
          } · ${item.id}`;

    if (hasFile) {
      element.href =
        assetUrl(
          `fantome/${item.id}.fantome`
        );

      element.download =
        `${item.id}.fantome`;

      element.title =
        t(
          'downloadFantomeTitle',
          {
            id: item.id
          }
        );

      element.setAttribute(
        'aria-label',
        t(
          'downloadFantomeAriaLabel',
          {
            name:
              itemDisplayName
          }
        )
      );

      element.addEventListener(
        'click',
        () => {
          track(
            'fantome_download',
            {
              skin_id:
                item.id,

              skin_name:
                item.name,

              champion:
                item.champion,

              is_chroma:
                item !== skin
                  ? 1
                  : 0
            }
          );
        }
      );
    } else {
      element.title =
        t('fileNotFound');

      element.setAttribute(
        'aria-disabled',
        'true'
      );
    }

    fragment.appendChild(
      element
    );
  });

  downloadList.replaceChildren(
    fragment
  );

  /* ---------------------------------------
     Modal aç
  --------------------------------------- */

  if (
    typeof modal.showModal ===
    'function'
  ) {
    modal.showModal();
  } else {
    modal.setAttribute(
      'open',
      ''
    );
  }

  track('skin_open', {
    skin_id: skin.id,
    skin_name: skin.name,
    champion: skin.champion
  });
}

/* =========================================
   SKIN MODALI KAPAT
========================================= */

function closeSkinModal() {
  if (!modal) {
    return;
  }

  if (
    typeof modal.close ===
    'function'
  ) {
    modal.close();
  } else {
    modal.removeAttribute(
      'open'
    );
  }
}

function refreshOpenModal(group) {
  if (!group?.primary || !modal?.open) {
    return;
  }

  // openModal içerikleri yeniden oluşturur. showModal yalnızca kapalı bir
  // dialogda çağrılabildiği için önce mevcut dialogu kapatıyoruz.
  closeSkinModal();
  openModal(group);
}

document
  .querySelector('.modal-close')
  ?.addEventListener(
    'click',
    closeSkinModal
  );

modal?.addEventListener(
  'click',
  (event) => {
    if (
      event.target === modal
    ) {
      closeSkinModal();
    }
  }
);

/* =========================================
   DISCORD MODALI
========================================= */

const discordButton =
  document.querySelector(
    '#discord-contact'
  );

const discordModal =
  document.querySelector(
    '#discord-modal'
  );

const discordClose =
  document.querySelector(
    '#discord-modal-close'
  );

const updatesButton = document.querySelector('#updates-button');
const bugReportButton = document.querySelector('#bug-report-button');
const updatesModal = document.querySelector('#updates-modal');
const bugReportModal = document.querySelector('#bug-report-modal');
const updatesList = document.querySelector('#updates-list');
const bugReportForm = document.querySelector('#bug-report-form');
const bugReportSkin = document.querySelector('#bug-report-skin');
const bugReportStatus = document.querySelector('#bug-report-status');

function openCommunityModal(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeCommunityModal(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function populateBugReportSkins() {
  if (!bugReportSkin || bugReportSkin.options.length > 1) return;

  const options = skins
    .filter((skin) => !skin.parentSkinId)
    .sort((a, b) => getLocalizedSkinName(a).localeCompare(getLocalizedSkinName(b), LOCALE_MAP[currentLang]))
    .map((skin) => {
      const option = document.createElement('option');
      option.value = skin.id;
      option.textContent = `${getLocalizedSkinName(skin)} — ${getLocalizedChampionName(skin)}`;
      return option;
    });

  bugReportSkin.append(...options);
}

function formatUpdateDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat(LOCALE_MAP[currentLang], { dateStyle: 'medium' }).format(date);
}

async function renderUpdates() {
  if (!updatesList) return;
  updatesList.replaceChildren();

  try {
    const response = await fetch(assetUrl('data/updates.json'), { cache: 'no-cache' });
    if (!response.ok) throw new Error('updates unavailable');
    const data = await response.json();
    const updates = Array.isArray(data?.updates) ? data.updates : [];

    if (!updates.length) {
      updatesList.innerHTML = '<p class="community-empty">Henüz yayınlanmış bir güncelleme yok.</p>';
      return;
    }

    updates
      .slice()
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .forEach((update) => {
        const article = document.createElement('article');
        article.className = 'update-item';
        const heading = document.createElement('h3');
        heading.textContent = update.title || 'Güncelleme';
        const date = document.createElement('time');
        date.textContent = formatUpdateDate(update.publishedAt);
        const body = document.createElement('p');
        body.textContent = update.description || '';
        article.append(heading, date, body);
        updatesList.append(article);
      });
  } catch {
    updatesList.innerHTML = '<p class="community-empty">Güncellemeler şu anda yüklenemiyor.</p>';
  }
}

updatesButton?.addEventListener('click', () => {
  openCommunityModal(updatesModal);
  renderUpdates();
});

bugReportButton?.addEventListener('click', () => {
  populateBugReportSkins();
  bugReportStatus.textContent = '';
  openCommunityModal(bugReportModal);
});

document.querySelectorAll('[data-close-community-modal]').forEach((button) => {
  button.addEventListener('click', () => closeCommunityModal(button.closest('dialog')));
});

[updatesModal, bugReportModal].forEach((dialog) => dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) closeCommunityModal(dialog);
}));

bugReportForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(bugReportForm);
  const payload = Object.fromEntries(formData.entries());
  const selectedSkin = skins.find((skin) => String(skin.id) === String(payload.skinId));

  bugReportStatus.textContent = 'Gönderiliyor…';
  try {
    const response = await fetch('./api/bug-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: String(payload.title || '').trim(),
        description: String(payload.description || '').trim(),
        imageUrl: String(payload.imageUrl || '').trim(),
        skinId: selectedSkin?.id || '',
        skinName: selectedSkin ? getLocalizedSkinName(selectedSkin, 'tr') : ''
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Bildiriminiz gönderilemedi.');
    bugReportForm.reset();
    bugReportStatus.textContent = 'Teşekkürler! Hata bildirimin kaydedildi.';
  } catch (error) {
    bugReportStatus.textContent = error.message || 'Bildiriminiz gönderilemedi.';
  }
});

function openDiscordModal() {
  if (!discordModal) {
    return;
  }

  if (
    typeof discordModal.showModal ===
    'function'
  ) {
    discordModal.showModal();
  } else {
    discordModal.setAttribute(
      'open',
      ''
    );
  }

  track(
    'discord_contact_open',
    {
      discord_username:
        'existofficial'
    }
  );
}

function closeDiscordModal() {
  if (!discordModal) {
    return;
  }

  if (
    typeof discordModal.close ===
    'function'
  ) {
    discordModal.close();
  } else {
    discordModal.removeAttribute(
      'open'
    );
  }
}

if (
  discordButton &&
  discordModal
) {
  discordButton.addEventListener(
    'click',
    openDiscordModal
  );

  discordClose?.addEventListener(
    'click',
    closeDiscordModal
  );

  discordModal.addEventListener(
    'click',
    (event) => {
      if (
        event.target ===
        discordModal
      ) {
        closeDiscordModal();
      }
    }
  );
}

/* =========================================
   ESC — MODALLAR
========================================= */

document.addEventListener(
  'keydown',
  (event) => {
    if (
      event.key !== 'Escape'
    ) {
      return;
    }

    if (modal?.open) {
      closeSkinModal();
      return;
    }

    if (discordModal?.open) {
      closeDiscordModal();
    }
  }
);

/* =========================================
   FAVORİ FİLTRESİ
========================================= */

favoriteFilter?.addEventListener(
  'click',
  () => {
    const active =
      !isFavoriteFilterActive();

    setFavoriteFilter(active);
    clearSearchCache();
    render();

    track(
      'favorite_filter',
      {
        active: active ? 1 : 0
      }
    );
  }
);

filterButton?.addEventListener(
  'click',
  (event) => {
   event.stopPropagation();

   if (!filterPanel) {
     return;
   }

   if (filterPanel.hidden) {
     openChampionFilterPanel();
   } else {
     closeChampionFilterPanel();
   }
  }
);

filterPanelClose?.addEventListener(
  'click',
  () => {
   closeChampionFilterPanel();
  }
);

filterSelectAllButton?.addEventListener(
  'click',
  () => {
   selectAllChampionDraft();
  }
);

filterClearButton?.addEventListener(
  'click',
  () => {
   clearChampionDraft();
  }
);

applyFiltersButton?.addEventListener(
  'click',
  () => {
   applyChampionFilters();
  }
);

filterSearchInput?.addEventListener(
  'input',
  () => {
   renderChampionFilterOptions();
  }
);

document.addEventListener(
  'click',
  (event) => {
   if (
     !filterPanel ||
     !filterButton ||
     filterPanel.hidden
   ) {
     return;
   }

   if (
     filterPanel.contains(event.target) ||
     filterButton.contains(event.target)
   ) {
     return;
   }

   closeChampionFilterPanel();
  }
);

document.addEventListener(
  'keydown',
  (event) => {
   if (
     event.key === 'Escape' &&
     filterPanel &&
     !filterPanel.hidden
   ) {
     closeChampionFilterPanel();
   }
  }
);

/* =========================================
   ARAMA ANALYTICS
========================================= */

function scheduleSearchAnalytics() {
  clearTimeout(
    searchTrackingTimer
  );

  searchTrackingTimer =
    window.setTimeout(
      () => {
        if (!search) {
          return;
        }

        const term =
          search.value.trim();

        const normalizedTerm =
          normalize(term);

        if (
          !term ||
          normalizedTerm ===
            lastTrackedSearch
        ) {
          return;
        }

        lastTrackedSearch =
          normalizedTerm;

        const resultCount =
          skinGroups.filter(
            (group) =>
              groupMatchesSearch(
                group,
                normalizedTerm
              )
          ).length;

        track(
          'search',
          {
            search_term:
              term.slice(
                0,
                100
              ),

            result_count:
              resultCount
          }
        );
      },
      700
    );
}

/* =========================================
   ARAMA
========================================= */

let searchDebounceTimer = null;
const SEARCH_DEBOUNCE_MS = 50;

function debouncedRender() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  searchDebounceTimer = setTimeout(() => {
    render();
    searchDebounceTimer = null;
  }, SEARCH_DEBOUNCE_MS);
}

search?.addEventListener(
  'input',
  () => {
    debouncedRender();
    scheduleSearchAnalytics();
  }
);

search?.addEventListener(
  'keydown',
  (event) => {
    if (
      event.key === 'Escape'
    ) {
      search.value = '';

      setFavoriteFilter(
        false
      );

      render();

      search.blur();
    }
  }
);

/* =========================================
   HIZLI ARAMALAR
========================================= */

document
  .querySelectorAll(
    '[data-query]'
  )
  .forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        if (!search) {
          return;
        }

        search.value =
          button.dataset.query ||
          '';

        setFavoriteFilter(
          false
        );

        clearSearchCache();
        render();

        search.focus();

        scheduleSearchAnalytics();
      }
    );
  });

/* =========================================
   FANTOME ID VERİLERİNİ NORMALİZE ET
========================================= */

function addFantomeFile(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return;
  }

  /*
   * JSON bazen:
   * [29004, 29005]
   *
   * bazen:
   * ["29004", "29005"]
   *
   * bazen de:
   * [{ id: 29004 }]
   */

  if (
    typeof value === 'object'
  ) {
    if ('id' in value) {
      fantomeFiles.add(
        String(value.id)
      );
    }

    if ('skinId' in value) {
      fantomeFiles.add(
        String(value.skinId)
      );
    }

    return;
  }

  const id =
    String(value)
      .trim()
      .replace(
        /\.fantome$/i,
        ''
      );

  if (id) {
    fantomeFiles.add(id);
  }
}

/* =========================================
   SKIN GRUPLARINI OLUŞTUR
========================================= */

function buildSkinGroups(
  skinList
) {
  const groups = new Map();
  const skinById = new Map(
    skinList.map((skin) => [String(skin.id), skin])
  );

  skinList.forEach((skin) => {
    const explicitParent = skin.parentSkinId && skinById.get(String(skin.parentSkinId));
    const baseName =
      (explicitParent
        ? getLocalizedSkinName(explicitParent, 'tr')
        : getLocalizedSkinName(skin, 'tr'))
        .trim()
        .replace(
          /\s*\([^)]+\)$/,
          ''
        );

    /*
     * Aynı şampiyondaki aynı skin
     * isimlerini aynı grupta tut.
     */

    const key =
      `${skin.championId ?? skin.champion}:${normalize(
        baseName
      )}`;

    if (!groups.has(key)) {
      groups.set(
        key,
        {
          primary: skin,
          skins: []
        }
      );
    }

    const group =
      groups.get(key);

    group.skins.push(skin);

    /*
     * Chroma olmayan ana skin
     * primary olarak kullanılır.
     */

    if (!skin.parentSkinId && getLocalizedSkinName(skin, 'tr').trim() === baseName) {
      group.primary = skin;
    }
  });

  return [...groups.values()].map(
    (group) => {
      const primary =
        group.primary;

      const sorted =
        [...group.skins].sort(
          (a, b) => {
            if (
              a.id ===
              primary.id
            ) {
              return -1;
            }

            if (
              b.id ===
              primary.id
            ) {
              return 1;
            }

            return a.name.localeCompare(
              b.name,
              'tr',
              {
                sensitivity:
                  'base'
              }
            );
          }
        );

      return {
        primary,
        skins: sorted
      };
    }
  );
}

/* =========================================
   VERİLERİ YÜKLE
========================================= */

async function loadData() {
  if (
    !search ||
    !results ||
    !empty
  ) {
    console.error(
      'Gerekli HTML elementleri bulunamadı.'
    );

    return;
  }

  try {
    const [
      dataResponse,
      filesResponse
    ] = await Promise.all([
      fetch(
        assetUrl(
          'data/skins.json'
        ),
        {
          cache:
            'no-cache'
        }
      ),

      fetch(
        assetUrl(
          'data/fantome-files.json'
        ),
        {
          cache:
            'no-cache'
        }
      )
    ]);

    /* ---------------------------------------
       skins.json
    --------------------------------------- */

    if (!dataResponse.ok) {
      throw new Error(
        `skins.json yüklenemedi (${dataResponse.status})`
      );
    }

    const data =
      await dataResponse.json();

    /* ---------------------------------------
       Fantome listesi
    --------------------------------------- */

    if (filesResponse.ok) {
      const files =
        await filesResponse.json();

      if (
        Array.isArray(files)
      ) {
        files.forEach(
          addFantomeFile
        );
      } else if (
        files &&
        Array.isArray(
          files.files
        )
      ) {
        files.files.forEach(
          addFantomeFile
        );
      }
    } else {
      console.warn(
        `fantome-files.json yüklenemedi (${filesResponse.status}).`
      );
    }

    /* ---------------------------------------
       Skin listesi
    --------------------------------------- */

    const rawSkins =
      Array.isArray(
        data?.skins
      )
        ? data.skins
        : [];

    skins =
      rawSkins
        .map(
          normalizeSkin
        )
        .filter(Boolean);

    if (
      skins.length === 0
    ) {
      throw new Error(
        'skins.json içinde geçerli skin bulunamadı.'
      );
    }

    /* ---------------------------------------
       Gruplar
    --------------------------------------- */

    skinGroups =
      buildSkinGroups(
        skins
      );

    /* ---------------------------------------
       Meta
    --------------------------------------- */

    if (meta) {
      const version =
        data?.version ||
        (
          currentLang === 'en'
            ? 'Unknown'
            : 'Bilinmiyor'
        );

      meta.textContent =
        t('metaVersion', {
          count:
            formatNumber(
              skinGroups.length
            ),
          version
        });
    }

    updateFavoriteCount();

    renderPopular();
    render();

    track(
      'skin_data_loaded',
      {
        skin_count:
          skins.length,

        group_count:
          skinGroups.length
      }
    );
  } catch (error) {
    console.error(
      'Skin verileri yüklenemedi:',
      error
    );

    if (meta) {
      meta.textContent =
        t('dataLoadFailedMeta');
    }

    empty.hidden = false;
    results.hidden = true;

    const emptyTitle =
      empty.querySelector(
        'h2'
      );

    const emptyText =
      empty.querySelector(
        'p'
      );

    if (emptyTitle) {
      emptyTitle.textContent =
        t(
          'dataLoadFailedTitle'
        );
    }

    if (emptyText) {
      emptyText.textContent =
        t(
          'dataLoadFailedHint'
        );
    }
  }
}

/* =========================================
   BAŞLAT
========================================= */

applyStaticTranslations();

updateLangSwitchUI();

updateFavoriteCount();

setFavoriteFilter(false);

await loadData();
