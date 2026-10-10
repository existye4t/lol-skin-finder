import './style.css';
import { ShaderMount, liquidMetalFragmentShader } from '@paper-design/shaders';
import { downloadZip } from 'client-zip';

const APPEARANCE_STORAGE_KEY = 'exist-lol-skin-appearance';
const APPEARANCE_VALUES = ['mono', 'gold', 'neon'];
let currentAppearance = 'mono';

try {
  const savedAppearance = localStorage.getItem(APPEARANCE_STORAGE_KEY);
  if (APPEARANCE_VALUES.includes(savedAppearance)) {
    currentAppearance = savedAppearance;
  }
} catch (error) {}

document.documentElement.dataset.appearance = currentAppearance;

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

function isReducedMotion() {
  return reducedMotionQuery.matches;
}

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
    tr: 'League of Legends skinleri, chroma ve Fantome dosyalarını ara. Skin adı, şampiyon veya Riot skin ID yaz, sonuçlar anında filtrelenir.',
    en: 'Search League of Legends skins, chromas and Fantome files. Type a skin name, champion, or Riot skin ID. Results filter instantly.'
  },

  updates: {
    tr: 'Güncellemeler',
    en: 'Updates'
  },

  bugReport: {
    tr: 'Hata Bildir',
    en: 'Report Bug'
  },

  suggestion: {
    tr: 'Öneri Yap',
    en: 'Suggest'
  },

  searchPlaceholder: {
    tr: 'Örn. Omega Timi Twitch',
    en: 'Omega Squad Twitch'
  },

  commandPaletteTrigger: {
    tr: 'Ara',
    en: 'Search'
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

  noFile: {
    tr: 'dosya yok',
    en: 'no file'
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

  bugReportInfo: {
    tr: 'Bildirdiğiniz hata Discord sunucumuzdaki <span class="channel-pill">#hata-bildir</span> kanalına iletilecektir.',
    en: 'Your bug report will be sent to the <span class="channel-pill">#bug-reports</span> channel on our Discord server.'
  },

  suggestionInfo: {
    tr: 'Yaptığınız öneri Discord sunucumuzdaki <span class="channel-pill">#öneriler</span> kanalına iletilecektir.',
    en: 'Your suggestion will be sent to the <span class="channel-pill">#suggestions</span> channel on our Discord server.'
  },

  closeDiscord: {
    tr: 'Discord penceresini kapat',
    en: 'Close the Discord window'
  },

  howToUseButton: {
    tr: 'Nasıl kullanılır?',
    en: 'How to Use?'
  },

  howToUseKicker: {
    tr: 'REHBER',
    en: 'GUIDE'
  },

  howToUseModalTitle: {
    tr: 'Nasıl Kullanılır?',
    en: 'How to Use?'
  },

  howToUseNoContent: {
    tr: 'Henüz içerik eklenmedi.',
    en: 'No content added yet.'
  },

  howToUseVideoTitle: {
    tr: 'Video',
    en: 'Video'
  },

  howToUseVideoDescription: {
    tr: 'Açıklama',
    en: 'Description'
  },

  howToUseVideoUrl: {
    tr: 'Video URL',
    en: 'Video URL'
  },

  howToUseVideoPlay: {
    tr: 'Videoyu oynat',
    en: 'Play video'
  },

  howToUseVideoOpenYouTube: {
    tr: 'YouTube\'da aç',
    en: 'Open in YouTube'
  },

  videoModalClose: {
    tr: 'Kapat',
    en: 'Close'
  },

  videoModalTitle: {
    tr: 'Video oynatıcı',
    en: 'Video player'
  },

  // Discord Profile
  discordProfile: {
    tr: 'Discord Profil',
    en: 'Discord Profile'
  },

  discordProfileNick: {
    tr: 'Nick / Display Name',
    en: 'Nick / Display Name'
  },

  discordProfileAvatar: {
    tr: 'Avatar URL',
    en: 'Avatar URL'
  },

  discordProfileUrl: {
    tr: 'Discord Profil / Sunucu URL',
    en: 'Discord Profile / Server URL'
  },

  discordProfileStatus: {
    tr: 'Aktiflik Durumu',
    en: 'Status'
  },

  discordProfileStatusOnline: {
    tr: 'Çevrimiçi',
    en: 'Online'
  },

  discordProfileStatusIdle: {
    tr: 'Boşta',
    en: 'Idle'
  },

  discordProfileStatusDnd: {
    tr: 'Rahatsız Etmeyin',
    en: 'Do Not Disturb'
  },

  discordProfileStatusOffline: {
    tr: 'Çevrimdışı',
    en: 'Offline'
  },

  appearanceTitle: {
    tr: 'Görünüm',
    en: 'Appearance'
  },

  appearanceClose: {
    tr: 'Görünüm penceresini kapat',
    en: 'Close appearance window'
  },

  appearanceMono: {
    tr: 'Siyah-Beyaz',
    en: 'Mono'
  },

  appearanceGold: {
    tr: 'Hextech Altın',
    en: 'Hextech Gold'
  },

  appearanceNeon: {
    tr: 'Arcane Neon',
    en: 'Arcane Neon'
  },

  championPackHeading: {
    tr: '{champion} · tüm skinler',
    en: '{champion} · all skins'
  },

  championPackFileCount: {
    tr: '{count} dosya',
    en: '{count} files'
  },

  championPackIncludeChromas: {
    tr: "Chroma'ları dahil et",
    en: 'Include chromas'
  },

  championPackDownloadAll: {
    tr: 'Tüm skinleri indir',
    en: 'Download all skins'
  },

  championPackPreparing: {
    tr: 'Hazırlanıyor… {done}/{total}',
    en: 'Preparing… {done}/{total}'
  },

  championPackDone: {
    tr: 'İndirildi ✓',
    en: 'Downloaded ✓'
  },

  championPackError: {
    tr: 'İndirme başarısız',
    en: 'Download failed'
  },

  championPackSkipped: {
    tr: '{count} dosya indirilemedi',
    en: '{count} file(s) could not be downloaded'
  },

  championPackToolbarBtn: {
    tr: 'Tüm skinleri indir · {count} dosya',
    en: 'Download all skins · {count} files'
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

function setElementTranslation(element, value) {
  const contentSpan = element.querySelector('.btn-metal-content');

  if (contentSpan) {
    contentSpan.textContent = value;
    contentSpan.classList.add('lang-switch-text');
    return;
  }

  // A nested translation target owns its own text. Updating the outer element
  // would remove its icons, avatars, or other child nodes.
  if (element.querySelector('[data-i18n]')) {
    return;
  }

  const textNode = [...element.childNodes].find(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
  );

  if (textNode) {
    textNode.textContent = value;
    element.classList.add('lang-switch-text');
  } else if (!element.children.length) {
    element.textContent = value;
    element.classList.add('lang-switch-text');
  }
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLang;

  document
    .querySelectorAll('[data-i18n]')
    .forEach((element) => {
      setElementTranslation(element, t(element.dataset.i18n));
    });

  document
    .querySelectorAll('[data-i18n-html]')
    .forEach((element) => {
      element.innerHTML = t(element.dataset.i18nHtml);
      element.classList.add('lang-switch-text');
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

let languageSwitchTimer = null;
let languageWidthCleanupTimer = null;

function getLanguageTransitionTargets(elements) {
  const targets = new Set();

  elements.forEach((element) => {
    if (!element.isConnected) return;
    targets.add(element);

    if (element.parentElement) {
      targets.add(element.parentElement);
    }
  });

  return [...targets];
}

function animateWidthTransition(elements) {
  const records = getLanguageTransitionTargets(elements).map((element) => {
    const rect = element.getBoundingClientRect();

    return {
      element,
      width: rect.width,
      height: rect.height,
      originalWidth: element.style.width,
      originalHeight: element.style.height
    };
  });

  records.forEach((record) => {
    record.element.style.width = `${record.width}px`;
    record.element.style.height = `${record.height}px`;
  });

  return function transitionToNewDimensions() {
    const activeRecords = records.filter((record) => record.element.isConnected);

    // Measure every new natural size while text is invisible, then restore the
    // old dimensions so CSS can interpolate between the two states.
    activeRecords.forEach((record) => {
      record.element.style.width = 'auto';
      record.element.style.height = 'auto';
    });

    const nextDimensions = activeRecords.map((record) => {
      const rect = record.element.getBoundingClientRect();
      return { record, width: rect.width, height: rect.height };
    });

    activeRecords.forEach((record) => {
      record.element.style.width = `${record.width}px`;
      record.element.style.height = `${record.height}px`;
    });

    requestAnimationFrame(() => {
      nextDimensions.forEach(({ record, width, height }) => {
        record.element.style.width = `${width}px`;
        record.element.style.height = `${height}px`;
      });
    });

    if (languageWidthCleanupTimer) {
      clearTimeout(languageWidthCleanupTimer);
    }

    function cleanup() {
      records.forEach((record) => {
        if (!record.element.isConnected) return;
        record.element.style.width = record.originalWidth;
        record.element.style.height = record.originalHeight;
      });
    }

    languageWidthCleanupTimer = window.setTimeout(cleanup, 220);
  };
}

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
  if (
    (lang !== 'tr' && lang !== 'en') ||
    lang === currentLang ||
    languageSwitchTimer
  ) {
    return;
  }

  const transitionDimensions = animateWidthTransition(
    [...document.querySelectorAll('.lang-switch-text')]
  );

  document.body.classList.add('lang-switching');

  languageSwitchTimer = window.setTimeout(() => {
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
    updateDiscordUI(latestDiscordPresence);

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

    // How-to-use modal açıkken dil değişirse içeriği yenile
    if (howToUseModal?.open) {
      renderHowToUse();
    }

    // Video modal açıkken çevirileri güncelle
    updateVideoModalTranslations();

    track('language_change', {
      language: lang
    });

    requestAnimationFrame(() => {
      transitionDimensions();
      document.body.classList.remove('lang-switching');
      languageSwitchTimer = null;
    });
  }, 60);
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

  // Data Dragon loading screen (portrait, character-focused, no crop issues)
  const loadingScreenUrl = skin?.championId !== undefined && skin?.skinNum !== undefined
    ? `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${skin.championId}_${skin.skinNum}.jpg`
    : '';

  // Data Dragon splash art (fallback)
  const dataDragonUrl = skin?.championId !== undefined && skin?.skinNum !== undefined
    ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${skin.championId}_${skin.skinNum}.jpg`
    : '';

  // Yerel images/skins dosyaları bilinen 1x1 placeholder'lardır. Buraya
  // özellikle dahil edilmez; yalnızca Riot CDN URL'leri kullanılabilir.
  const sources = [...new Set([
    loadingScreenUrl,      // 1st priority: loading screen (portrait, character-focused)
    dataDragonUrl,         // 2nd priority: splash art (fallback)
    skin?.image,           // 3rd priority: original image from JSON
    skin?.imageFallback    // 4th priority: community dragon fallback
  ].filter(isRemoteImageUrl))];

  if (cacheKey) {
    imageSourceCache.set(cacheKey, sources);
  }

  return sources;
}

function getSkinImageUrl(skin) {
  return getSkinImageSources(skin)[0] || '';
}

function getModalImageSources(skin) {
  const cacheKey = String(skin?.id || '') + '_modal';

  if (cacheKey && imageSourceCache.has(cacheKey)) {
    return imageSourceCache.get(cacheKey);
  }

  // Data Dragon splash art (primary for modal - full art, no crop)
  const dataDragonUrl = skin?.championId !== undefined && skin?.skinNum !== undefined
    ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${skin.championId}_${skin.skinNum}.jpg`
    : '';

  // Data Dragon loading screen (fallback)
  const loadingScreenUrl = skin?.championId !== undefined && skin?.skinNum !== undefined
    ? `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${skin.championId}_${skin.skinNum}.jpg`
    : '';

  const sources = [...new Set([
    dataDragonUrl,         // 1st priority: splash art (full art, character may be off-center but we use contain)
    loadingScreenUrl,      // 2nd priority: loading screen (portrait, character-focused)
    skin?.image,           // 3rd priority: original image from JSON
    skin?.imageFallback    // 4th priority: community dragon fallback
  ].filter(isRemoteImageUrl))];

  if (cacheKey) {
    imageSourceCache.set(cacheKey, sources);
  }

  return sources;
}

function getModalImageUrl(skin) {
  return getModalImageSources(skin)[0] || '';
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
let lastModalSourceEl = null;

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

  /* Toast bildirimi (izole) */
  showToast(
    wasFavorite
      ? (currentLang === 'en'
          ? 'Removed from favorites'
          : 'Favorilerden çıkarıldı')
      : (currentLang === 'en'
          ? 'Added to favorites ✓'
          : 'Favorilere eklendi ✓')
  );
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
   YOUTUBE URL HELPERS
======================================= */

const YOUTUBE_URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&].*)?$/;

function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.trim().match(YOUTUBE_URL_REGEX);
  return match ? match[1] : null;
}

function isYouTubeUrl(url) {
  return extractYouTubeVideoId(url) !== null;
}

function getYouTubeThumbnailUrl(videoId, quality = 'hqdefault') {
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

function getYouTubeEmbedUrl(videoId) {
  if (!videoId) return '';
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

function getYouTubeWatchUrl(videoId) {
  if (!videoId) return '';
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/* =========================================
   ARAMA RELEVANS SKORU
======================================= */

// Bounded Levenshtein (düzenleme mesafesi) hesabı.
// maxDistance aşılırsa -1 döner; aksi halde gerçek mesafeyi döner.
// Tek satırlık DP ve mesafe bandı (banding) ile erken çıkış yapar.
function levenshteinDistance(
  a,
  b,
  maxDistance = Infinity
) {
  if (a === b) return 0;

  const aLen = a.length;
  const bLen = b.length;

  if (!aLen) return bLen;
  if (!bLen) return aLen;

  if (
    Math.abs(aLen - bLen) > maxDistance
  ) {
    return -1;
  }

  let previousRow = new Array(bLen + 1);

  for (let j = 0; j <= bLen; j++) {
    previousRow[j] = j;
  }

  for (let i = 1; i <= aLen; i++) {
    let currentRow = [i];
    let rowMin = i;

    for (let j = 1; j <= bLen; j++) {
      const cost =
        a[i - 1] === b[j - 1] ? 0 : 1;

      const value = Math.min(
        previousRow[j] + 1, // silme
        currentRow[j - 1] + 1, // ekleme
        previousRow[j - 1] + cost // değiştirme
      );

      currentRow[j] = value;

      if (value < rowMin) {
        rowMin = value;
      }
    }

    // Bu satırdaki en iyi değer bile sınırı aşıyorsa
    // mesafe hiçbir zaman maxDistance içine giremez.
    if (rowMin > maxDistance) {
      return -1;
    }

    previousRow = currentRow;
  }

  return previousRow[bLen] <= maxDistance
    ? previousRow[bLen]
    : -1;
}

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

  // Çok kısa sorgular için typo toleransı anlamsız — eşleşme yok.
  if (normalizedQuery.length <= 2) {
   return 0;
  }

  // Kelime bazlı sınırlı Levenshtein: her kelime ayrı ayrı sorguya
  // yakın mı diye kontrol edilir. Eski "harfler metnin herhangi bir
  // yerinde sırayla geçiyor mu" mantığı çok kelimeli alakasız
  // metinlerde yanlış eşleşmelere yol açıyordu.
  let bestDistance = Infinity;

  for (const token of tokens) {
    // BUG 2 FIX: Hard gate - token'ın ilk harfi sorgunun ilk harfiyle
    // aynı değilse Levenshtein'a sokma, direkt atla.
    // Bu kural SADECE bu fuzzy/typo fallback katmanına uygulanır,
    // önceki katmanları (tam eşleşme, startsWith, token eşitliği, includes)
    // ETKİLEMEZ.
    if (token[0] !== normalizedQuery[0]) {
      continue;
    }

    // BUG 1 FIX: maxDistance her token için KENDİ uzunluğuna göre
    // hesaplanmalı (sorgu uzunluğuna göre değil).
    const tokenMaxDistance = Math.min(3, Math.max(1, Math.floor(token.length / 2.5)));

    if (
      Math.abs(token.length - normalizedQuery.length) >
      tokenMaxDistance
    ) {
      continue;
    }

    const distance = levenshteinDistance(
      token,
      normalizedQuery,
      tokenMaxDistance
    );

    if (
      distance !== -1 &&
      distance < bestDistance
    ) {
      bestDistance = distance;
    }
  }

  if (bestDistance === Infinity) {
    return 0;
  }

  return 300_000 - bestDistance * 50_000;
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

  /* ---------------------------------------
     Scroll reveal + 3D tilt (izole eklenti)
     Her yeni kart otomatik olarak iki efekti
     de alır; render sonrası init fonksiyonları
     observer/binding adımlarını tamamlar.
  --------------------------------------- */

  article.classList.add(
    'scroll-reveal',
    'card-tilt-effect'
  );

  attachCardTiltListeners(article);

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
    championElement.classList.add('lang-switch-text');
    championElement.textContent =
      displayChampion;
  }

  if (nameElement) {
    nameElement.classList.add('lang-switch-text');
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
      openModal(group, article);
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
        openModal(group, article);
      }
    }
  );

  return card;
}

/* =========================================
   SCROLL REVEAL ANIMASYONU (izole eklenti)
   =========================================
   .scroll-reveal            -> kart başlangıçta
                                opacity:0, aşağıda
   .scroll-reveal.visible    -> kart görünür oldu
   .scroll-reveal-animating  -> sadece reveal
                                anında geçiş süresi/easing
                                tanımlıdır; tilt efektinin
                                kendi transition'ı ile
                                çakışmaması için animasyon
                                bittiğinde kaldırılır.
   IntersectionObserver ile
   sadece ilk görünürlükte
   tetiklenir; aynı anda görünen
   kartlar 65ms stagger ile
   sırayla belirir.
========================================= */

const SCROLL_REVEAL_THRESHOLD = 0.12;
const SCROLL_REVEAL_STAGGER_MS = 80;
const SCROLL_REVEAL_DURATION_MS = 600;

let scrollRevealObserver = null;

function initScrollRevealAnimation() {
  const cards = document.querySelectorAll(
    '.scroll-reveal:not(.visible)'
  );

  if (!cards.length) {
    return;
  }

  if (isReducedMotion()) {
    cards.forEach((card) => {
      card.classList.add('visible');
    });
    return;
  }

  if (!scrollRevealObserver) {
    scrollRevealObserver =
      new IntersectionObserver(
        (entries) => {
          let staggerIndex = 0;

          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            const el = entry.target;

            scrollRevealObserver.unobserve(el);

            const delay =
              staggerIndex *
              SCROLL_REVEAL_STAGGER_MS;

            staggerIndex += 1;

            setTimeout(() => {
              el.classList.add(
                'scroll-reveal-animating'
              );
              el.classList.add('visible');

              setTimeout(() => {
                el.classList.remove(
                  'scroll-reveal-animating'
                );
              }, SCROLL_REVEAL_DURATION_MS);
            }, delay);
          });
        },
        {
          threshold: SCROLL_REVEAL_THRESHOLD
        }
      );
  }

  cards.forEach((card) =>
    scrollRevealObserver.observe(card)
  );
}

/* =========================================
   KART HOVER 3D TILT EFEKTİ (izole eklenti)
   =========================================
   Mouse kart üzerinde hareket ederken
   pozisyona göre hafif rotateX/rotateY +
   scale(1.03) uygulanır (perspective 800px,
   maks. 7 derece). Mouse ayrıldığında kart
   CSS transition (~280ms ease-out) ile
   eski haline döner. mousemove hesapları
   requestAnimationFrame ile sınırlanır.
========================================= */

const CARD_TILT_MAX_DEG = 6;
const CARD_TILT_PERSPECTIVE_PX = 800;
const CARD_TILT_SCALE = 1.01;

function attachCardTiltListeners(article) {
  if (
    !article ||
    article.dataset.tiltBound === 'true'
  ) {
    return;
  }

  article.dataset.tiltBound = 'true';

  let tiltFrame = null;
  let pendingEvent = null;

  article.addEventListener(
    'mousemove',
    (event) => {
      // Henüz reveal olmamış karta tilt
      // uygulama (transform çakışmasını önler)
      if (
        !article.classList.contains('visible')
      ) {
        return;
      }

      pendingEvent = event;

      if (tiltFrame) {
        return;
      }

      tiltFrame =
        requestAnimationFrame(() => {
          tiltFrame = null;

          const rect =
            article.getBoundingClientRect();

          const relativeX =
            (pendingEvent.clientX -
              rect.left) /
            rect.width;

          const relativeY =
            (pendingEvent.clientY -
              rect.top) /
            rect.height;

          const rotateY =
            (relativeX - 0.5) *
            2 *
            CARD_TILT_MAX_DEG;

          const rotateX =
            (0.5 - relativeY) *
            2 *
            CARD_TILT_MAX_DEG;

          article.style.transform =
            `perspective(${CARD_TILT_PERSPECTIVE_PX}px) ` +
            `rotateX(${rotateX.toFixed(2)}deg) ` +
            `rotateY(${rotateY.toFixed(2)}deg) ` +
            `scale(${CARD_TILT_SCALE})`;
        });
    }
  );

  article.addEventListener(
    'mouseleave',
    () => {
      if (tiltFrame) {
        cancelAnimationFrame(tiltFrame);
        tiltFrame = null;
      }

      pendingEvent = null;
      article.style.transform = '';
    }
  );
}

function initCardTiltEffect() {
  const cards = document.querySelectorAll(
    '.card-tilt-effect'
  );

  cards.forEach((card) =>
    attachCardTiltListeners(card)
  );
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

  // Yeni render edilen kartlara scroll reveal + tilt uygula
  initCardTiltEffect();
  initScrollRevealAnimation();
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
      favoriteActive ||
      championFilters.size > 0;
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
  updatePackToolbarBtn();
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

  // Yeni render edilen kartlara scroll reveal + tilt uygula
  initCardTiltEffect();
  initScrollRevealAnimation();

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
   CHROMA RENK & GÖRSEL YARDIMCILARI
========================================= */

const CHROMA_HEX_MAP = {
  yakut: '#d33528',
  ruby: '#d33528',
  ametist: '#9333ea',
  amethyst: '#9333ea',
  safir: '#2563eb',
  sapphire: '#2563eb',
  zümrüt: '#10b981',
  emerald: '#10b981',
  obsidiyen: '#2d3748',
  obsidian: '#2d3748',
  'pembe kuvars': '#f472b6',
  'rose quartz': '#f472b6',
  kedigözü: '#facc15',
  catseye: '#facc15',
  'inci beyazı': '#f3f4f6',
  inci: '#f3f4f6',
  pearl: '#f3f4f6',
  turkuvaz: '#06b6d4',
  turquoise: '#06b6d4',
  tanzanit: '#6366f1',
  tanzanite: '#6366f1',
  'deniz mavisi': '#0284c7',
  aquamarine: '#0284c7',
  turuncu: '#f97316',
  citrine: '#f97316',
  gökkuşağı: '#ec4899',
  rainbow: '#ec4899',
  altın: '#eab308',
  gold: '#eab308',
  meteor: '#ef4444',
  gece: '#1e293b',
  night: '#1e293b',
  yeşim: '#059669',
  jade: '#059669',
  güneştaşı: '#fb923c',
  sunstone: '#fb923c',
  kumtaşı: '#d97706',
  sandstone: '#d97706',
  mercan: '#f87171',
  coral: '#f87171',
  peridot: '#84cc16',
  platin: '#cbd5e1',
  platinum: '#cbd5e1',
  alaca: '#a855f7',
  speckled: '#a855f7',
  alaz: '#dc2626',
  blaze: '#dc2626',
  hayat: '#10b981',
  life: '#10b981',
  zindelik: '#06b6d4',
  vitality: '#06b6d4',
  lanetli: '#7c3aed',
  cursed: '#7c3aed',
  soylu: '#e11d48',
  noble: '#e11d48',
  çelik: '#64748b',
  steel: '#64748b',
  zehir: '#16a34a',
  venom: '#16a34a',
  alev: '#ea580c',
  flame: '#ea580c',
  zırhlı: '#78716c',
  armored: '#78716c',
  şekerleme: '#f43f5e',
  candy: '#f43f5e',
  öncü: '#3b82f6',
  vanguard: '#3b82f6',
  ilkbahar: '#84cc16',
  spring: '#84cc16',
  kargözeten: '#67e8f9',
  karanlık: '#1e1b4b',
  dark: '#1e1b4b',
  ışık: '#fef08a',
  light: '#fef08a'
};

function getChromaColorAndImage(item, baseSkin) {
  const isMainSkin = item === baseSkin;
  const chroma = item.chroma || item;

  // 1) Renk tespiti: chroma.colors ilk hex rengi
  let hexColor = '';
  const colors = chroma?.colors || item?.colors;
  if (Array.isArray(colors) && colors.length > 0 && typeof colors[0] === 'string') {
    hexColor = colors[0];
  } else if (typeof chroma?.color === 'string') {
    hexColor = chroma.color;
  } else if (typeof item?.color === 'string') {
    hexColor = item.color;
  }

  // Renk dizisi yoksa ve chroma ise bilinen chroma renk haritasından eşle
  if (!hexColor && !isMainSkin) {
    const itemDisplayName = getLocalizedSkinName(item);
    const chromaName = (
      itemDisplayName.match(/\(([^)]+)\)$/)?.[1] || itemDisplayName
    ).toLowerCase();
    for (const [nameKey, colorVal] of Object.entries(CHROMA_HEX_MAP)) {
      if (chromaName.includes(nameKey)) {
        hexColor = colorVal;
        break;
      }
    }
  }

  // 2) Önizleme görseli (background-image)
  let previewUrl =
    chroma?.chromaPath ||
    item?.chromaPath ||
    chroma?.previewUrl ||
    item?.previewUrl ||
    '';

  if (previewUrl && previewUrl.startsWith('/lol-game-data/assets/')) {
    previewUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/${previewUrl.replace(/^\/lol-game-data\/assets\//i, '')}`;
  }

  if (!previewUrl) {
    if (isMainSkin) {
      previewUrl = item.imageFallback || item.image || '';
    } else {
      const champKey = Math.floor(Number(item.id) / 1000);
      if (champKey && item.id) {
        previewUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-chroma-images/${champKey}/${item.id}.png`;
      }
    }
  }

  return { hexColor, previewUrl };
}

/* =========================================
   CHAMPION PACK İNDİRME — İSİMLENDİRME YARDIMCISI
========================================= */

/**
 * Windows'ta yasak karakterler ve kontrol karakterleri için temizleme
 * kuralları, Türkçe → ASCII dönüşümü ve ~100 karakter sınırı.
 *
 * getFantomeDownloadName(skin) → "Skin Adı.fantome"
 * İndirme bağlantıları ve ZIP girişleri bu fonksiyonu kullanır.
 */
const TR_ASCII_MAP = {
  ı: 'i', İ: 'I', ş: 's', Ş: 'S', ğ: 'g', Ğ: 'G',
  ç: 'c', Ç: 'C', ö: 'o', Ö: 'O', ü: 'u', Ü: 'U'
};

function sanitizeFilename(raw) {
  // 1) Türkçe karakterleri manuel dönüştür
  let s = raw.replace(/[ıİşŞğĞçÇöÖüÜ]/g, (ch) => TR_ASCII_MAP[ch] || ch);
  // 2) NFD normalize → birleşik işaretleri sil
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // 3) Windows yasak karakterleri ve kontrol karakterleri
  s = s.replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ');
  // 4) Ardışık boşlukları teke indir
  s = s.replace(/\s{2,}/g, ' ').trim();
  // 5) Sondaki nokta/boşluk
  s = s.replace(/[. ]+$/, '');
  // 6) ~100 karakter
  if (s.length > 100) s = s.slice(0, 100).trimEnd().replace(/[. ]+$/, '');
  return s || 'skin';
}

function getFantomeDownloadName(skin) {
  const displayName = getLocalizedSkinName(skin);
  return sanitizeFilename(displayName) + '.fantome';
}

/* =========================================
   CHAMPION PACK İNDİRME — MANTIK
========================================= */

const CHAMPION_CHROMAS_KEY = 'exist-lol-pack-include-chromas';

let packIncludeChromas = false;
try {
  packIncludeChromas = localStorage.getItem(CHAMPION_CHROMAS_KEY) === 'true';
} catch (_) {}

function savePackChromasPref(val) {
  try { localStorage.setItem(CHAMPION_CHROMAS_KEY, val ? 'true' : 'false'); } catch (_) {}
}

/**
 * Şampiyonun tüm mevcut fantome dosyalarını tek ZIP'e toplar.
 * @param {string|number} championKey – normalize edilmiş şampiyon anahtarı
 *   (skin._championKeys[0]). Arama/filtreden bağımsız.
 * @param {{ includeChromas: boolean, onProgress: (done,total)=>void }} opts
 * @returns {Promise<{skipped:number}>}
 */
async function downloadChampionPack(championKey, { includeChromas, onProgress } = {}) {
  // 1) Şampiyona ait, dosyası olan skinleri topla
  let championSkins = skins.filter((skin) => {
    const keys = skin._championKeys;
    const matches = keys
      ? keys.some((k) => k === championKey)
      : normalize(getLocalizedChampionName(skin, 'tr')) === championKey;
    if (!matches) return false;
    if (!fantomeFiles.has(String(skin.id))) return false;
    if (!includeChromas && skin.parentSkinId) return false;
    return true;
  });

  if (championSkins.length === 0) return { skipped: 0 };

  // ZIP içindeki klasör adı: şampiyonun ASCII adı
  const firstSkin = championSkins[0];
  const champDisplayName = getLocalizedChampionName(firstSkin);
  const champFolderName = sanitizeFilename(champDisplayName);

  // 2) İndirme adlarındaki çakışmaları çöz
  const usedNames = new Map(); // name → count
  const resolvedNames = championSkins.map((skin) => {
    const base = getFantomeDownloadName(skin); // "Name.fantome"
    const count = (usedNames.get(base) || 0) + 1;
    usedNames.set(base, count);
    return { skin, baseName: base, count };
  });
  // İkinci geçiş: çakışanlara " - <ID>" ekle
  const nameCount2 = new Map();
  const entries = resolvedNames.map(({ skin, baseName }) => {
    const total = usedNames.get(baseName);
    const idx = (nameCount2.get(baseName) || 0) + 1;
    nameCount2.set(baseName, idx);
    let finalName;
    if (total > 1 && idx > 1) {
      // Sadece ikinci ve sonraki çakışanlar ID alır
      const stem = baseName.slice(0, baseName.length - '.fantome'.length);
      finalName = `${stem} - ${skin.id}.fantome`;
    } else {
      finalName = baseName;
    }
    return { skin, name: `${champFolderName}/${finalName}` };
  });

  // 3) Tüm dosyaları tam parallel fetch et — dosyalar küçük (~6.6KB ort),
  //    tarayıcı connection pool'u zaten sınırlar (H/2 multiplexing).
  //    Retry: başarısız olursa 1 kez daha dene, yine olmazsa atla.
  let skipped = 0;
  const total = entries.length;
  let done = 0;

  // Tüm dosyaları parallel fetch ET VE ArrayBuffer'a çek.
  // client-zip'e Response değil hazır Uint8Array verince
  // ZIP assembly aşaması saf CPU'ya dönüşür, ağ bekleme kalmaz.
  async function fetchToBuffer(url) {
    let res = await fetch(url);
    if (!res.ok) res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return new Uint8Array(ab);
  }

  const results = await Promise.all(
    entries.map(async ({ skin, name }) => {
      const url = assetUrl(`fantome/${skin.id}.fantome`);
      const buf = await fetchToBuffer(url);
      done++;
      if (onProgress) onProgress(done, total);
      if (!buf) { skipped++; return null; }
      return { name, input: buf, size: buf.byteLength };
    })
  );

  const zipInputs = results.filter(Boolean);

  // 4) ZIP oluştur — girdiler zaten bellekte, assembly anında tamamlanır
  const blob = await downloadZip(zipInputs).blob();

  // 5) İndir
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${champFolderName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);

  // 6) Analytics
  track('champion_pack_download', {
    champion: champDisplayName,
    file_count: zipInputs.length,
    include_chromas: includeChromas ? 1 : 0
  });

  return { skipped };
}

/**
 * Şampiyona ait dosyaların sayısını döner (chroma seçimine göre).
 */
function getChampionPackFileCount(championKey, includeChromas) {
  return skins.filter((skin) => {
    const keys = skin._championKeys;
    const matches = keys
      ? keys.some((k) => k === championKey)
      : normalize(getLocalizedChampionName(skin, 'tr')) === championKey;
    if (!matches) return false;
    if (!fantomeFiles.has(String(skin.id))) return false;
    if (!includeChromas && skin.parentSkinId) return false;
    return true;
  }).length;
}

/* =========================================
   CHAMPION PACK — MODAL BLOK & TOOLBAR
========================================= */

/**
 * Belirli bir buton üzerindeki indir durumunu yönetir.
 * state: 'idle' | 'progress' | 'done' | 'error'
 */
function setPackBtnState(btn, state, vars) {
  btn.dataset.packState = state;
  if (state === 'idle') {
    const count = vars?.count ?? 0;
    btn.textContent = count > 0
      ? t('championPackDownloadAll')
      : t('championPackDownloadAll');
    btn.disabled = false;
  } else if (state === 'progress') {
    btn.textContent = t('championPackPreparing', { done: vars.done, total: vars.total });
    btn.disabled = true;
  } else if (state === 'done') {
    btn.textContent = t('championPackDone');
    btn.disabled = false;
    setTimeout(() => {
      if (btn.dataset.packState === 'done') setPackBtnState(btn, 'idle');
    }, 2000);
  } else if (state === 'error') {
    btn.textContent = t('championPackError');
    btn.disabled = false;
    setTimeout(() => {
      if (btn.dataset.packState === 'error') setPackBtnState(btn, 'idle');
    }, 3000);
  }
}

/**
 * Şampiyon pack bloğunu modalın modal-copy içine render eder.
 * Şampiyonun hiç dosyası yoksa blok gizli kalır.
 */
function renderChampionPackBlock(skin) {
  const block = document.getElementById('champion-pack-block');
  if (!block) return;

  const championKey = skin._championKeys?.[0]
    ?? normalize(getLocalizedChampionName(skin, 'tr'));

  const countWithout = getChampionPackFileCount(championKey, false);
  const countWith = getChampionPackFileCount(championKey, true);

  if (countWithout === 0 && countWith === 0) {
    block.hidden = true;
    return;
  }

  block.hidden = false;

  // Başlık
  const champDisplay = getLocalizedChampionName(skin);

  // Mevcut içeriği temizle
  block.innerHTML = '';

  const heading = document.createElement('p');
  heading.className = 'champion-pack-heading';
  heading.textContent = t('championPackHeading', { champion: champDisplay });
  block.appendChild(heading);

  const fileCountEl = document.createElement('p');
  fileCountEl.className = 'champion-pack-filecount';
  const currentCount = packIncludeChromas ? countWith : countWithout;
  fileCountEl.textContent = t('championPackFileCount', { count: currentCount });
  block.appendChild(fileCountEl);

  // Chroma onay kutusu
  const chromaLabel = document.createElement('label');
  chromaLabel.className = 'champion-pack-chroma-label';
  const chromaCheckbox = document.createElement('input');
  chromaCheckbox.type = 'checkbox';
  chromaCheckbox.className = 'champion-pack-chroma-checkbox';
  chromaCheckbox.checked = packIncludeChromas;
  chromaCheckbox.addEventListener('change', () => {
    packIncludeChromas = chromaCheckbox.checked;
    savePackChromasPref(packIncludeChromas);
    const newCount = packIncludeChromas ? countWith : countWithout;
    fileCountEl.textContent = t('championPackFileCount', { count: newCount });
    // Toolbar'ı da güncelle
    updatePackToolbarBtn();
  });
  const chromaText = document.createElement('span');
  chromaText.textContent = t('championPackIncludeChromas');
  chromaLabel.appendChild(chromaCheckbox);
  chromaLabel.appendChild(chromaText);
  block.appendChild(chromaLabel);

  // İndir butonu
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'champion-pack-btn btn-secondary-metal';
  setPackBtnState(btn, 'idle');

  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    setPackBtnState(btn, 'progress', { done: 0, total: packIncludeChromas ? countWith : countWithout });
    try {
      const { skipped } = await downloadChampionPack(championKey, {
        includeChromas: packIncludeChromas,
        onProgress: (done, total) => setPackBtnState(btn, 'progress', { done, total })
      });
      setPackBtnState(btn, 'done');
      if (skipped > 0) {
        const notice = document.createElement('p');
        notice.className = 'champion-pack-skipped';
        notice.textContent = t('championPackSkipped', { count: skipped });
        // Var olan notice'i temizle
        block.querySelectorAll('.champion-pack-skipped').forEach(el => el.remove());
        block.appendChild(notice);
      }
    } catch (err) {
      console.error('Champion pack indirme hatası:', err);
      setPackBtnState(btn, 'error');
    }
  });

  block.appendChild(btn);
}

/**
 * Sonuçlar araç çubuğundaki "tüm skinleri indir" butonunu günceller.
 * Yalnızca tek şampiyon bağlamında (filtre veya arama) görünür.
 */
function updatePackToolbarBtn() {
  const wrapper = document.getElementById('champion-pack-toolbar');
  const btn     = document.getElementById('champion-pack-toolbar-btn');
  const cbx     = document.getElementById('champion-pack-toolbar-chroma-checkbox');
  if (!wrapper || !btn) return;

  // Toolbar checkbox'ı packIncludeChromas ile senkronize et (ilk render)
  if (cbx && cbx._initialized !== true) {
    cbx._initialized = true;
    cbx.checked = packIncludeChromas;
    cbx.addEventListener('change', () => {
      packIncludeChromas = cbx.checked;
      savePackChromasPref(packIncludeChromas);
      // Modal bloğunu da güncelle (açıksa)
      const activeGroup = typeof activeModalGroup !== 'undefined' ? activeModalGroup : null;
      if (activeGroup?.primary) renderChampionPackBlock(activeGroup.primary);
      updatePackToolbarBtn();
    });
  }
  if (cbx) cbx.checked = packIncludeChromas;

  // Mevcut arama/filtre bağlamında tek şampiyon var mı?
  const query = normalize(search?.value || '');
  const favoriteActive = isFavoriteFilterActive?.() ?? false;
  const championFilters = appliedChampionFilters;

  let singleChampionKey = null;
  if (championFilters.size === 1) {
    singleChampionKey = [...championFilters][0];
  } else if (championFilters.size === 0 && query) {
    const visibleKeys = new Set();
    for (const group of skinGroups) {
      if (
        (!favoriteActive || groupHasFavorite(group)) &&
        groupMatchesChampionFilter(group) &&
        getGroupSearchScore(group, query) > 0
      ) {
        const k = group.primary._championKeys?.[0]
          ?? normalize(getLocalizedChampionName(group.primary, 'tr'));
        visibleKeys.add(k);
        if (visibleKeys.size > 1) break;
      }
    }
    if (visibleKeys.size === 1) {
      singleChampionKey = [...visibleKeys][0];
    }
  }

  // Şampiyon yoksa veya değiştiyse: sıfırla ve gizle
  if (!singleChampionKey || singleChampionKey !== btn._packChampKey) {
    if (btn.dataset.packState !== 'progress') {
      btn.dataset.packState = '';
      btn.disabled = false;
      btn.textContent = '';
      btn._packChampKey = null;
      btn.onclick = null;
    }
    if (!singleChampionKey) {
      wrapper.hidden = true;
      return;
    }
  }

  const count = getChampionPackFileCount(singleChampionKey, packIncludeChromas);
  if (count === 0) {
    wrapper.hidden = true;
    btn._packChampKey = null;
    return;
  }

  // Yeni şampiyon — idle durumuna geçir ve onclick bağla
  if (btn._packChampKey !== singleChampionKey) {
    btn._packChampKey = singleChampionKey;
    btn.dataset.packState = 'idle';
    btn.disabled = false;
    btn.textContent = t('championPackToolbarBtn', { count });

    btn.onclick = async () => {
      if (btn.disabled) return;
      const total = getChampionPackFileCount(singleChampionKey, packIncludeChromas);
      setPackBtnState(btn, 'progress', { done: 0, total });
      try {
        const { skipped } = await downloadChampionPack(singleChampionKey, {
          includeChromas: packIncludeChromas,
          onProgress: (done, ttl) => setPackBtnState(btn, 'progress', { done, total: ttl })
        });
        setPackBtnState(btn, 'done');
        if (skipped > 0) console.info(`${skipped} dosya indirilemedi`);
      } catch (err) {
        console.error('Toolbar pack indirme hatası:', err);
        setPackBtnState(btn, 'error');
      }
    };
  } else if (btn.dataset.packState === 'idle' || btn.dataset.packState === '') {
    btn.textContent = t('championPackToolbarBtn', { count });
  }

  wrapper.hidden = false;
}

/* =========================================
   SKIN MODALI
========================================= */

function openModal(group, sourceEl, skipAnimation) {
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

  const modalImageBlur =
    document.querySelector(
      '#modal-image-blur'
    );
  const modalImageSharp =
    document.querySelector(
      '#modal-image-sharp'
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

  const modalImageUrl = getModalImageUrl(skin);

  /* ---------------------------------------
     Modal görseli (blur background + sharp foreground)
   --------------------------------------- */

  if (modalImageBlur) {
    modalImageBlur.style.display = '';
    modalImageBlur.src = modalImageUrl;
    modalImageBlur.alt = '';
  }
  if (modalImageSharp) {
    modalImageSharp.style.display = '';
    modalImageSharp.src = modalImageUrl;
    modalImageSharp.alt =
      `${displayName} — ${displayChampion}`;
  }

  // Attach fallback chain to both images
  if (modalImageBlur || modalImageSharp) {
    attachImageFallbackChain(modalImageBlur, skin);
    attachImageFallbackChain(modalImageSharp, skin);
  }

  /* ---------------------------------------
     Modal bilgileri
  --------------------------------------- */

  if (modalChampion) {
    modalChampion.classList.add('lang-switch-text');
    modalChampion.textContent =
      displayChampion;
  }

  if (modalSkinName) {
    modalSkinName.classList.add('lang-switch-text');
    modalSkinName.textContent =
      displayName;
  }

  if (modalSkinId) {
    modalSkinId.classList.add('lang-switch-text');
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
      `download-item chroma-card${
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

    const dot = document.createElement('div');
    dot.className = 'download-dot chroma-preview';

    const { hexColor, previewUrl } =
      getChromaColorAndImage(item, skin);

    if (hexColor) {
      dot.style.backgroundColor = hexColor;
    }

    if (previewUrl) {
      dot.style.backgroundImage = `url("${previewUrl}")`;
    }

    if (!hasFile) {
      dot.style.opacity = '0.35';
    }

    element.appendChild(dot);

    const textSpan = document.createElement('span');
    textSpan.className = 'download-item-text chroma-name';
    textSpan.textContent =
      item === skin
        ? t('mainSkin')
        : (chromaName || itemDisplayName);
    element.appendChild(textSpan);

    const idSpan = document.createElement('span');
    idSpan.className = 'chroma-id';
    idSpan.textContent = item.id;
    element.appendChild(idSpan);

    if (hexColor) {
      const colorDot = document.createElement('span');
      colorDot.className = 'chroma-color-dot';
      colorDot.style.backgroundColor = hexColor;
      element.appendChild(colorDot);
    }

    if (hasFile) {
      element.href =
        assetUrl(
          `fantome/${item.id}.fantome`
        );

      element.download =
        getFantomeDownloadName(item);

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
     Champion Pack bloğu
  --------------------------------------- */

  renderChampionPackBlock(skin);

  /* ---------------------------------------
     Modal aç (shared-element geçişi)
  --------------------------------------- */

  performModalOpenTransition(sourceEl, skipAnimation);

  track('skin_open', {
    skin_id: skin.id,
    skin_name: skin.name,
    champion: skin.champion
  });
}

/* =========================================
   SKIN MODALI ÜRETEN/ÇÖZEN GEÇİŞLER
   =========================================
   Karta tıklanınca modal, tıklanan kartın
   konumundan büyüyerek açılır ("shared
   element" hissi). Destekleyen tarayıcılarda
   View Transitions API (document.startViewTransition)
   kullanılır; desteklenmiyorsa kartın
   getBoundingClientRect() değeri ile manuel
   FLIP (scale+translate) animasyonuna düşülür.
   prefers-reduced-motion: reduce olan
   kullanıcılarda geçiş atlanır, direkt açılır/kapanır.
========================================= */

const MODAL_TRANSITION_NAME = 'skin-modal-shared';
const MODAL_TRANSITION_MS = 400;
const MODAL_TRANSITION_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

function applySkinModalOpenState() {
  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }
}

function applySkinModalCloseState() {
  if (typeof modal.close === 'function') {
    modal.close();
  } else {
    modal.removeAttribute('open');
  }
}

function playModalFlip(cardRect, modalRect, isClosing, onDone) {
  if (!modalRect.width || !modalRect.height) {
    if (onDone) onDone();
    return;
  }

  const scaleX = cardRect.width / modalRect.width;
  const scaleY = cardRect.height / modalRect.height;
  const translateX =
    (cardRect.left + cardRect.width / 2) -
    (modalRect.left + modalRect.width / 2);
  const translateY =
    (cardRect.top + cardRect.height / 2) -
    (modalRect.top + modalRect.height / 2);

  const cardTransform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
  const identityTransform = 'translate(0, 0) scale(1, 1)';

  modal.style.transformOrigin = 'center center';
  modal.style.transition = 'none';
  modal.style.transform = isClosing ? identityTransform : cardTransform;
  modal.style.opacity = isClosing ? '1' : '0.4';

  void modal.offsetHeight;

  modal.style.transition = `transform ${MODAL_TRANSITION_MS}ms ${MODAL_TRANSITION_EASE}, opacity ${MODAL_TRANSITION_MS}ms ${MODAL_TRANSITION_EASE}`;
  modal.style.transform = isClosing ? cardTransform : identityTransform;
  modal.style.opacity = isClosing ? '0.4' : '1';

  window.setTimeout(() => {
    modal.style.transition = '';
    modal.style.transform = '';
    modal.style.opacity = '';
    modal.style.transformOrigin = '';
    if (isClosing && onDone) onDone();
  }, MODAL_TRANSITION_MS);
}

function animateModalOpenFallback(sourceEl) {
  const cardRect = sourceEl.getBoundingClientRect();
  applySkinModalOpenState();
  const modalRect = modal.getBoundingClientRect();
  playModalFlip(cardRect, modalRect, false);
}

function animateModalCloseFallback(sourceEl, onDone) {
  const cardRect = sourceEl.getBoundingClientRect();
  const modalRect = modal.getBoundingClientRect();
  playModalFlip(cardRect, modalRect, true, onDone);
}

function performModalOpenTransition(sourceEl, skipAnimation) {
  if (!modal) return;

  lastModalSourceEl = sourceEl || null;
  modal.classList.remove('closing');

  if (skipAnimation || isReducedMotion()) {
    applySkinModalOpenState();
    return;
  }

  if (typeof document.startViewTransition === 'function') {
    if (sourceEl) sourceEl.style.viewTransitionName = MODAL_TRANSITION_NAME;
    modal.style.viewTransitionName = MODAL_TRANSITION_NAME;

    const transition = document.startViewTransition(() => {
      applySkinModalOpenState();
    });

    transition.finished.finally(() => {
      if (sourceEl) sourceEl.style.viewTransitionName = '';
      modal.style.viewTransitionName = '';
    });
    return;
  }

  if (sourceEl) {
    animateModalOpenFallback(sourceEl);
  } else {
    applySkinModalOpenState();
  }
}

/* =========================================
   SKIN MODALI KAPAT
========================================= */

function closeSkinModal(skipAnimation) {
  if (!modal) {
    return;
  }

  const sourceEl =
    lastModalSourceEl &&
    document.body.contains(lastModalSourceEl)
      ? lastModalSourceEl
      : null;
  lastModalSourceEl = null;

  if (skipAnimation || isReducedMotion()) {
    modal.classList.remove('closing');
    applySkinModalCloseState();
    return;
  }

  // Backdrop/artwork/icerik fade-out'u kart->modal geçişiyle ayni pencerede
  // (concurrent) oynatmak icin ekleniyor; FLIP/View Transition kendi
  // transform/opacity'sini inline style ile ustune yazdigindan catisma olmaz.
  modal.classList.add('closing');

  if (typeof document.startViewTransition === 'function') {
    if (sourceEl) sourceEl.style.viewTransitionName = MODAL_TRANSITION_NAME;
    modal.style.viewTransitionName = MODAL_TRANSITION_NAME;

    const transition = document.startViewTransition(() => {
      applySkinModalCloseState();
      modal.classList.remove('closing');
    });

    transition.finished.finally(() => {
      if (sourceEl) sourceEl.style.viewTransitionName = '';
      modal.style.viewTransitionName = '';
    });
    return;
  }

  if (sourceEl) {
    animateModalCloseFallback(sourceEl, () => {
      applySkinModalCloseState();
      modal.classList.remove('closing');
    });
  } else {
    window.setTimeout(() => {
      applySkinModalCloseState();
      modal.classList.remove('closing');
    }, MODAL_TRANSITION_MS);
  }
}

function refreshOpenModal(group) {
  if (!group?.primary || !modal?.open) {
    return;
  }

  // openModal içerikleri yeniden oluşturur. showModal yalnızca kapalı bir
  // dialogda çağrılabildiği için önce mevcut dialogu kapatıyoruz.
  // Bu sadece bir içerik yenilemesi olduğundan açılış/kapanış geçişi atlanır.
  const sourceEl = lastModalSourceEl;
  closeSkinModal(true);
  openModal(group, sourceEl, true);
}

document
  .querySelector('.modal-close')
  ?.addEventListener(
    'click',
    () => closeSkinModal()
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
const howToUseButton = document.querySelector('#how-to-use-button');
const updatesModal = document.querySelector('#updates-modal');
const bugReportModal = document.querySelector('#bug-report-modal');
const howToUseModal = document.querySelector('#how-to-use-modal');
const updatesList = document.querySelector('#updates-list');
const bugReportForm = document.querySelector('#bug-report-form');
const bugReportSkin = document.querySelector('#bug-report-skin');
const bugReportStatus = document.querySelector('#bug-report-status');
const bugReportDropZone = document.querySelector('#bug-report-drop-zone');
const bugReportImageInput = document.querySelector('#bug-report-image');
const bugReportFilePreview = document.querySelector('#bug-report-file-preview');
const bugReportPreviewImg = document.querySelector('#bug-report-preview-img');
const bugReportRemoveImage = document.querySelector('#bug-report-remove-image');
const bugReportVideoLink = document.querySelector('#bug-report-video-link');
let bugReportSelectedFile = null;

const suggestionButton = document.querySelector('#suggestion-button');
const suggestionModal = document.querySelector('#suggestion-modal');
const suggestionForm = document.querySelector('#suggestion-form');
const suggestionStatus = document.querySelector('#suggestion-status');
const suggestionDropZone = document.querySelector('#suggestion-drop-zone');
const suggestionImageInput = document.querySelector('#suggestion-image');
const suggestionFilePreview = document.querySelector('#suggestion-file-preview');
const suggestionPreviewImg = document.querySelector('#suggestion-preview-img');
const suggestionRemoveImage = document.querySelector('#suggestion-remove-image');
const suggestionVideoLink = document.querySelector('#suggestion-video-link');
const suggestionSubmitBtn = document.querySelector('.suggestion-submit');
let suggestionSelectedFile = null;
const howToUseContent = document.querySelector('#how-to-use-content');
const howToUseVideos = document.querySelector('#how-to-use-videos');

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

function getBugReportApiBaseUrl() {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return '';
  }
  const metaWorkerUrl = document.querySelector('meta[name="worker-api-url"]')?.content;
  if (metaWorkerUrl && metaWorkerUrl.trim().startsWith('http')) {
    return metaWorkerUrl.trim().replace(/\/+$/, '');
  }
  return null;
}

const BUG_REPORT_MAX_FILE_SIZE = 8 * 1024 * 1024;

function handleBugReportFileSelect(file) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    bugReportStatus.textContent = 'Sadece resim dosyası yüklenebilir.';
    bugReportStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }

  if (file.size > BUG_REPORT_MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    bugReportStatus.textContent = `Dosya çok büyük (${sizeMB}MB). Maksimum 8MB olabilir.`;
    bugReportStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }

  bugReportSelectedFile = file;
  bugReportPreviewImg.src = URL.createObjectURL(file);
  bugReportFilePreview.hidden = false;
  bugReportDropZone.querySelector('.bug-report-drop-zone-content').style.display = 'none';
  bugReportStatus.textContent = '';
  bugReportStatus.style.color = '';
}

function clearBugReportFile() {
  if (bugReportPreviewImg.src) URL.revokeObjectURL(bugReportPreviewImg.src);
  bugReportSelectedFile = null;
  bugReportImageInput.value = '';
  bugReportPreviewImg.src = '';
  bugReportFilePreview.hidden = true;
  bugReportDropZone.querySelector('.bug-report-drop-zone-content').style.display = '';
}

bugReportDropZone?.addEventListener('click', () => {
  bugReportImageInput?.click();
});

bugReportDropZone?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    bugReportImageInput?.click();
  }
});

bugReportImageInput?.addEventListener('change', () => {
  const file = bugReportImageInput.files?.[0];
  if (file) handleBugReportFileSelect(file);
});

bugReportDropZone?.addEventListener('dragover', (e) => {
  e.preventDefault();
  bugReportDropZone.classList.add('drag-over');
});

bugReportDropZone?.addEventListener('dragleave', () => {
  bugReportDropZone.classList.remove('drag-over');
});

bugReportDropZone?.addEventListener('drop', (e) => {
  e.preventDefault();
  bugReportDropZone.classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    bugReportImageInput.files = e.dataTransfer.files;
    handleBugReportFileSelect(file);
  }
});

bugReportRemoveImage?.addEventListener('click', (e) => {
  e.stopPropagation();
  clearBugReportFile();
});

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

async function renderHowToUse() {
  if (!howToUseContent || !howToUseVideos) return;
  howToUseContent.replaceChildren();
  howToUseVideos.replaceChildren();

  try {
    const response = await fetch(assetUrl('data/how-to-use.json'), { cache: 'no-cache' });
    if (!response.ok) throw new Error('how-to-use unavailable');
    const data = await response.json();
    const langData = data[currentLang] || data.tr || {};

    // Content
    if (langData.content) {
      const contentDiv = document.createElement('div');
      contentDiv.className = 'how-to-use-text';
      contentDiv.textContent = langData.content;
      howToUseContent.appendChild(contentDiv);
    } else {
      const emptyP = document.createElement('p');
      emptyP.className = 'community-empty';
      emptyP.textContent = t('howToUseNoContent');
      howToUseContent.appendChild(emptyP);
    }

    // Videos
    const videos = Array.isArray(langData.videos) ? langData.videos : [];
    if (videos.length > 0) {
      const videosHeading = document.createElement('h3');
      videosHeading.className = 'how-to-use-videos-heading';
      videosHeading.textContent = t('howToUseKicker') + ' ' + t('howToUseVideoTitle') + 'lar';
      howToUseVideos.appendChild(videosHeading);

      const videosGrid = document.createElement('div');
      videosGrid.className = 'how-to-use-videos-grid';

      videos.forEach((video, index) => {
        const videoCard = createVideoCard(video, index);
        videosGrid.appendChild(videoCard);
      });

      howToUseVideos.appendChild(videosGrid);
    }
  } catch {
    const errorP = document.createElement('p');
    errorP.className = 'community-empty';
    errorP.textContent = currentLang === 'en' ? 'Unable to load guide content.' : 'Rehber içeriği yüklenemiyor.';
    howToUseContent.appendChild(errorP);
  }
}

function createVideoCard(video, index) {
  const videoCard = document.createElement('article');
  videoCard.className = 'how-to-use-video-card';

  const videoId = video.url ? extractYouTubeVideoId(video.url) : null;
  const isYouTube = videoId !== null;

  // Thumbnail area with play button
  const thumbnailWrap = document.createElement('div');
  thumbnailWrap.className = 'how-to-use-video-thumbnail-wrap';

  if (isYouTube && videoId) {
    const thumbnail = document.createElement('img');
    thumbnail.className = 'how-to-use-video-thumbnail';
    thumbnail.src = getYouTubeThumbnailUrl(videoId, 'maxresdefault');
    thumbnail.alt = video.title || 'Video thumbnail';
    thumbnail.loading = 'lazy';
    // Fallback to hqdefault if maxresdefault fails
    thumbnail.onerror = () => {
      thumbnail.src = getYouTubeThumbnailUrl(videoId, 'hqdefault');
    };
    thumbnailWrap.appendChild(thumbnail);

    // Play button overlay
    const playButton = document.createElement('button');
    playButton.className = 'how-to-use-video-play-btn';
    playButton.type = 'button';
    playButton.setAttribute('aria-label', t('howToUseVideoPlay'));
    playButton.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;
    playButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openVideoModal(videoId, video.title, video.description);
    });
    thumbnailWrap.appendChild(playButton);

    // Click on thumbnail also opens modal
    thumbnailWrap.style.cursor = 'pointer';
    thumbnailWrap.addEventListener('click', (e) => {
      if (e.target !== playButton && !playButton.contains(e.target)) {
        openVideoModal(videoId, video.title, video.description);
      }
    });
  } else if (video.url) {
    // Non-YouTube URL - show link card
    const linkCard = document.createElement('a');
    linkCard.className = 'how-to-use-video-external-link';
    linkCard.href = video.url;
    linkCard.target = '_blank';
    linkCard.rel = 'noopener noreferrer';
    linkCard.innerHTML = `
      <div class="how-to-use-video-external-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </div>
      <span class="how-to-use-video-external-text">${t('howToUseVideoUrl')} →</span>
    `;
    thumbnailWrap.appendChild(linkCard);
  }

  videoCard.appendChild(thumbnailWrap);

  // Video info section
  const infoWrap = document.createElement('div');
  infoWrap.className = 'how-to-use-video-info';

  if (video.title) {
    const title = document.createElement('h4');
    title.className = 'how-to-use-video-title';
    title.textContent = video.title;
    infoWrap.appendChild(title);
  }

  if (video.description) {
    const desc = document.createElement('p');
    desc.className = 'how-to-use-video-description';
    desc.textContent = video.description;
    infoWrap.appendChild(desc);
  }

  // External link for YouTube videos
  if (isYouTube && videoId) {
    const externalLink = document.createElement('a');
    externalLink.className = 'how-to-use-video-external-link';
    externalLink.href = getYouTubeWatchUrl(videoId);
    externalLink.target = '_blank';
    externalLink.rel = 'noopener noreferrer';
    externalLink.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
      <span>${t('howToUseVideoOpenYouTube')}</span>
    `;
    infoWrap.appendChild(externalLink);
  }

  videoCard.appendChild(infoWrap);

  return videoCard;
}

let videoModal = null;
let videoModalIframe = null;

function createVideoModal() {
  if (videoModal) return videoModal;

  videoModal = document.createElement('dialog');
  videoModal.className = 'video-modal';
  videoModal.innerHTML = `
    <div class="video-modal-backdrop" aria-hidden="true"></div>
    <div class="video-modal-content">
      <button class="video-modal-close" type="button" aria-label="${t('videoModalClose')}">×</button>
      <div class="video-modal-iframe-wrap">
        <iframe class="video-modal-iframe" src="" title="${t('videoModalTitle')}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      </div>
    </div>
  `;

  videoModalIframe = videoModal.querySelector('.video-modal-iframe');

  const closeBtn = videoModal.querySelector('.video-modal-close');
  const backdrop = videoModal.querySelector('.video-modal-backdrop');

  const closeModal = () => {
    if (videoModal) {
      videoModalIframe.src = '';
      videoModal.close();
    }
  };

  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoModal?.open) {
      closeModal();
    }
  });

  document.body.appendChild(videoModal);
  return videoModal;
}

function updateVideoModalTranslations() {
  if (!videoModal) return;
  const closeBtn = videoModal.querySelector('.video-modal-close');
  const iframe = videoModal.querySelector('.video-modal-iframe');
  if (closeBtn) closeBtn.setAttribute('aria-label', t('videoModalClose'));
  if (iframe) iframe.title = t('videoModalTitle');
}

function openVideoModal(videoId, title, description) {
  const modal = createVideoModal();
  const embedUrl = getYouTubeEmbedUrl(videoId);
  videoModalIframe.src = embedUrl;
  modal.showModal();

  track('how_to_use_video_play', {
    video_id: videoId,
    video_title: title || ''
  });
}

function openHowToUseModal() {
  openCommunityModal(howToUseModal);
  renderHowToUse();
}

function closeHowToUseModal() {
  closeCommunityModal(howToUseModal);
}

updatesButton?.addEventListener('click', () => {
  openCommunityModal(updatesModal);
  renderUpdates();
});

bugReportButton?.addEventListener('click', () => {
  populateBugReportSkins();
  bugReportStatus.textContent = '';
  bugReportStatus.style.color = '';
  clearBugReportFile();
  openCommunityModal(bugReportModal);
});

howToUseButton?.addEventListener('click', () => {
  openHowToUseModal();
});

document.querySelectorAll('[data-close-community-modal]').forEach((button) => {
  button.addEventListener('click', () => closeCommunityModal(button.closest('dialog')));
});

[updatesModal, bugReportModal, howToUseModal, suggestionModal].forEach((dialog) => dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) closeCommunityModal(dialog);
}));

bugReportForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = String(bugReportForm.querySelector('#bug-report-title')?.value || '').trim();
  const description = String(bugReportForm.querySelector('#bug-report-description')?.value || '').trim();
  const videoLink = String(bugReportVideoLink?.value || '').trim();
  const selectedSkin = skins.find((skin) => String(skin.id) === String(bugReportSkin?.value || ''));

  bugReportStatus.style.color = '';

  if (!title && !description) {
    bugReportStatus.textContent = 'Lütfen başlık ve açıklama alanlarını doldurun.';
    bugReportStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }
  if (!title) {
    bugReportStatus.textContent = 'Başlık alanı boş — lütfen bir başlık girin.';
    bugReportStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }
  if (!description) {
    bugReportStatus.textContent = 'Açıklama alanı boş — lütfen sorunu açıklayın.';
    bugReportStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }

  if (videoLink && !/^https?:\/\//i.test(videoLink)) {
    bugReportStatus.textContent = 'Video linki http veya https ile başlamalıdır.';
    bugReportStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }

  if (bugReportSelectedFile && bugReportSelectedFile.size > BUG_REPORT_MAX_FILE_SIZE) {
    const sizeMB = (bugReportSelectedFile.size / (1024 * 1024)).toFixed(1);
    bugReportStatus.textContent = `Dosya çok büyük (${sizeMB}MB). Maksimum 8MB olabilir.`;
    bugReportStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }

  const apiBase = getBugReportApiBaseUrl();

  if (apiBase === null) {
    bugReportStatus.textContent = 'Sunucuya ulaşılamıyor — hata bildirim worker\'ı henüz yapılandırılmamış.';
    bugReportStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('skinId', selectedSkin?.id || '');
  formData.append('skinName', selectedSkin ? getLocalizedSkinName(selectedSkin, 'tr') : '');
  if (videoLink) formData.append('videoLink', videoLink);
  if (bugReportSelectedFile) formData.append('image', bugReportSelectedFile);

  bugReportStatus.textContent = 'Gönderiliyor...';
  bugReportStatus.style.color = '';

  try {
    const response = await fetch(`${apiBase}/api/bug-report`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      bugReportForm.reset();
      clearBugReportFile();
      bugReportStatus.textContent = 'Teşekkürler! Hata bildirimin gönderildi.';
      bugReportStatus.style.color = 'var(--gold-light, #f0b90b)';
      return;
    }

    const result = await response.json().catch(() => ({}));

    if (response.status === 429) {
      bugReportStatus.textContent = 'Çok fazla hata bildirimi gönderdin. Lütfen bir dakika bekleyin.';
    } else if (response.status === 413) {
      bugReportStatus.textContent = 'Dosya çok büyük. Maksimum 8MB olabilir.';
    } else if (response.status === 503) {
      bugReportStatus.textContent = 'Sunucuya ulaşılamıyor — hata bildirim worker\'ı henüz yapılandırılmamış.';
    } else if (response.status === 502) {
      bugReportStatus.textContent = 'Bildirim Discord\'a gönderilemedi. Lütfen daha sonra tekrar deneyin.';
    } else if (response.status === 404 || response.status === 405) {
      bugReportStatus.textContent = 'Sunucuya ulaşılamıyor — worker henüz yapılandırılmamış veya endpoint bulunamadı.';
    } else if (response.status === 400) {
      bugReportStatus.textContent = result.error || 'Formda eksik veya hatalı bilgi var.';
    } else {
      bugReportStatus.textContent = result.error || `Gönderim başarısız (HTTP ${response.status}).`;
    }
    bugReportStatus.style.color = 'var(--discord-red, #ed4245)';
  } catch (error) {
    bugReportStatus.textContent = 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.';
    bugReportStatus.style.color = 'var(--discord-red, #ed4245)';
  }
});

function getSuggestionApiBaseUrl() {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return '';
  }
  const metaWorkerUrl = document.querySelector('meta[name="worker-api-url"]')?.content;
  if (metaWorkerUrl && metaWorkerUrl.trim().startsWith('http')) {
    return metaWorkerUrl.trim().replace(/\/+$/, '');
  }
  return null;
}

const SUGGESTION_MAX_FILE_SIZE = 8 * 1024 * 1024;

function handleSuggestionFileSelect(file) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    suggestionStatus.textContent = 'Sadece resim dosyası yüklenebilir.';
    suggestionStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }

  if (file.size > SUGGESTION_MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    suggestionStatus.textContent = `Dosya çok büyük (${sizeMB}MB). Maksimum 8MB olabilir.`;
    suggestionStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }

  suggestionSelectedFile = file;
  suggestionPreviewImg.src = URL.createObjectURL(file);
  suggestionFilePreview.hidden = false;
  suggestionDropZone.querySelector('.suggestion-drop-zone-content').style.display = 'none';
  suggestionStatus.textContent = '';
  suggestionStatus.style.color = '';
}

function clearSuggestionFile() {
  if (suggestionPreviewImg.src) URL.revokeObjectURL(suggestionPreviewImg.src);
  suggestionSelectedFile = null;
  suggestionImageInput.value = '';
  suggestionPreviewImg.src = '';
  suggestionFilePreview.hidden = true;
  suggestionDropZone.querySelector('.suggestion-drop-zone-content').style.display = '';
}

suggestionDropZone?.addEventListener('click', () => {
  suggestionImageInput?.click();
});

suggestionDropZone?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    suggestionImageInput?.click();
  }
});

suggestionImageInput?.addEventListener('change', () => {
  const file = suggestionImageInput.files?.[0];
  if (file) handleSuggestionFileSelect(file);
});

suggestionDropZone?.addEventListener('dragover', (e) => {
  e.preventDefault();
  suggestionDropZone.classList.add('drag-over');
});

suggestionDropZone?.addEventListener('dragleave', () => {
  suggestionDropZone.classList.remove('drag-over');
});

suggestionDropZone?.addEventListener('drop', (e) => {
  e.preventDefault();
  suggestionDropZone.classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    suggestionImageInput.files = e.dataTransfer.files;
    handleSuggestionFileSelect(file);
  }
});

suggestionRemoveImage?.addEventListener('click', (e) => {
  e.stopPropagation();
  clearSuggestionFile();
});

suggestionButton?.addEventListener('click', () => {
  suggestionStatus.textContent = '';
  suggestionStatus.style.color = '';
  clearSuggestionFile();
  openCommunityModal(suggestionModal);
});

suggestionForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = String(suggestionForm.querySelector('#suggestion-name')?.value || '').trim();
  const title = String(suggestionForm.querySelector('#suggestion-title')?.value || '').trim();
  const description = String(suggestionForm.querySelector('#suggestion-description')?.value || '').trim();
  const videoLink = String(suggestionVideoLink?.value || '').trim();

  suggestionStatus.style.color = '';

  if (!title && !description) {
    suggestionStatus.textContent = 'Lütfen başlık ve öneri alanlarını doldurun.';
    suggestionStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }
  if (!title) {
    suggestionStatus.textContent = 'Başlık alanı boş — lütfen bir başlık girin.';
    suggestionStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }
  if (!description) {
    suggestionStatus.textContent = 'Öneri alanı boş — lütfen önerini yazın.';
    suggestionStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }

  if (videoLink && !/^https?:\/\//i.test(videoLink)) {
    suggestionStatus.textContent = 'Video linki http veya https ile başlamalıdır.';
    suggestionStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }

  if (suggestionSelectedFile && suggestionSelectedFile.size > SUGGESTION_MAX_FILE_SIZE) {
    const sizeMB = (suggestionSelectedFile.size / (1024 * 1024)).toFixed(1);
    suggestionStatus.textContent = `Dosya çok büyük (${sizeMB}MB). Maksimum 8MB olabilir.`;
    suggestionStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }

  const apiBase = getSuggestionApiBaseUrl();

  if (apiBase === null) {
    suggestionStatus.textContent = 'Sunucuya ulaşılamıyor — öneri worker\'ı henüz yapılandırılmamış.';
    suggestionStatus.style.color = 'var(--discord-red, #ed4245)';
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  if (name) formData.append('name', name);
  if (videoLink) formData.append('videoLink', videoLink);
  if (suggestionSelectedFile) formData.append('image', suggestionSelectedFile);

  suggestionStatus.textContent = 'Gönderiliyor...';
  suggestionStatus.style.color = '';
  suggestionSubmitBtn.disabled = true;

  try {
    const response = await fetch(`${apiBase}/api/suggestions`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      suggestionForm.reset();
      clearSuggestionFile();
      suggestionStatus.textContent = 'Önerin başarıyla gönderildi.';
      suggestionStatus.style.color = 'var(--gold-light, #f0b90b)';
      return;
    }

    const result = await response.json().catch(() => ({}));

    if (response.status === 429) {
      suggestionStatus.textContent = 'Çok fazla öneri gönderdin. Lütfen bir dakika bekleyin.';
    } else if (response.status === 413) {
      suggestionStatus.textContent = 'Dosya çok büyük. Maksimum 8MB olabilir.';
    } else if (response.status === 503) {
      suggestionStatus.textContent = 'Sunucuya ulaşılamıyor — öneri worker\'ı henüz yapılandırılmamış.';
    } else if (response.status === 502) {
      suggestionStatus.textContent = 'Öneri Discord\'a gönderilemedi. Lütfen daha sonra tekrar deneyin.';
    } else if (response.status === 404 || response.status === 405) {
      suggestionStatus.textContent = 'Sunucuya ulaşılamıyor — worker henüz yapılandırılmamış veya endpoint bulunamadı.';
    } else if (response.status === 400) {
      suggestionStatus.textContent = result.error || 'Formda eksik veya hatalı bilgi var.';
    } else {
      suggestionStatus.textContent = result.error || `Gönderim başarısız (HTTP ${response.status}).`;
    }
    suggestionStatus.style.color = 'var(--discord-red, #ed4245)';
  } catch (error) {
    suggestionStatus.textContent = 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.';
    suggestionStatus.style.color = 'var(--discord-red, #ed4245)';
  } finally {
    suggestionSubmitBtn.disabled = false;
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
      return;
    }

    if (howToUseModal?.open) {
      closeHowToUseModal();
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

/* =========================================
   SKELETON LOADING (YÜKLEME İSKELETİ)
   =========================================
   Veri yuklenirken gercek kart grid'ine
   benzeyen gri, shimmer animasyonlu
   placeholder kartlar gosterir.
   Sadece DOM'a .skeleton-card elementleri
   ekler/kaldirir; mevcut render mantigina
   karismaz.
========================================= */

function renderSkeletonCards(container, count) {
  if (!container) {
    return;
  }

  /* Once varsa eski iskeletleri temizle */
  clearSkeletonCards(container);

  const fragment =
    document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const card =
      document.createElement('div');

    card.className = 'skeleton-card';
    card.setAttribute('aria-hidden', 'true');

    const image =
      document.createElement('div');
    image.className =
      'skeleton-block skeleton-image skeleton-shimmer';

    const title =
      document.createElement('div');
    title.className =
      'skeleton-block skeleton-line skeleton-shimmer';

    const subtitle =
      document.createElement('div');
    subtitle.className =
      'skeleton-block skeleton-line skeleton-line-short skeleton-shimmer';

    const textWrap =
      document.createElement('div');
    textWrap.className = 'skeleton-text';
    textWrap.appendChild(title);
    textWrap.appendChild(subtitle);

    card.appendChild(image);
    card.appendChild(textWrap);

    fragment.appendChild(card);
  }

  container.appendChild(fragment);
}

function clearSkeletonCards(container) {
  if (!container) {
    return;
  }

  container
    .querySelectorAll('.skeleton-card')
    .forEach((card) => card.remove());
}

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

  /* Veri cekme baslamadan once iskelet
     kartlari goster (izole, sadece DOM'a
     ekleme yapar) */
  renderSkeletonCards(results, 12);

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

    /* Iskelet kartlari kaldir, gercek kartlari
       render() baslat */
    clearSkeletonCards(results);

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

    /* Hata durumunda da iskeletleri temizle */
    clearSkeletonCards(results);

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

async function loadDiscordProfile() {
  try {
    const response = await fetch(assetUrl('data/discord-profile.json'), { cache: 'no-cache' });
    if (!response.ok) throw new Error('discord-profile unavailable');
    const profile = await response.json();
    applyDiscordProfile(profile);
  } catch (error) {
    console.warn('Discord profile yüklenemedi:', error);
    applyDiscordProfile(getDefaultDiscordProfile());
  }
}

function getDefaultDiscordProfile() {
  return {
    nick: 'existofficial',
    avatarUrl: 'assets/pfp.png',
    discordUrl: 'https://discord.gg/rvRxbf8B9N',
    status: 'online'
  };
}

function applyDiscordProfile(profile) {
  if (!profile) return;

  const nick = profile.nick || 'existofficial';
  const avatarUrl = profile.avatarUrl || 'assets/pfp.png';
  const discordUrl = profile.discordUrl || 'https://discord.gg/rvRxbf8B9N';
  const status = profile.status || 'online';

  // Update top-right Discord button
  const discordContact = document.querySelector('#discord-contact');
  const discordContactName = document.querySelector('.discord-contact-name');
  if (discordContactName) discordContactName.textContent = nick;
  if (discordContact) {
    // Remove any custom onclick, let the existing modal handler work
    discordContact.onclick = null;
    // Ensure modal trigger attributes are present
    discordContact.setAttribute('aria-haspopup', 'dialog');
    discordContact.setAttribute('aria-controls', 'discord-modal');
    discordContact.setAttribute('type', 'button');
  }

  // Update footer Discord profile (main section)
  const footerProfile = document.querySelector('.discord-profile');
  const footerProfileImg = footerProfile?.querySelector('.discord-profile-avatar img');
  const footerProfileName = footerProfile?.querySelector('.discord-profile-info strong');
  if (footerProfileName) footerProfileName.textContent = nick;
  if (footerProfileImg) {
    footerProfileImg.src = avatarUrl;
    footerProfileImg.alt = `${nick} Discord profil fotoğrafı`;
  }

  // Update Discord modal profile (in dialog)
  const modalProfile = document.querySelector('#discord-modal .discord-profile');
  const modalProfileImg = modalProfile?.querySelector('.discord-profile-avatar img');
  const modalProfileName = modalProfile?.querySelector('.discord-profile-info strong');
  if (modalProfileName) modalProfileName.textContent = nick;
  if (modalProfileImg) {
    modalProfileImg.src = avatarUrl;
    modalProfileImg.alt = `${nick} Discord profil fotoğrafı`;
  }

  // Update Discord modal join links
  document.querySelectorAll('#discord-modal-join, #discord-invite-small, #discord-invite').forEach(link => {
    link.href = discordUrl;
  });

  // Update status indicators (if they exist)
  updateStatusIndicators(status);
}

function getStatusColor(status) {
  const colors = {
    online: '#4ade80',
    idle: '#fbbf24',
    dnd: '#f87171',
    offline: '#78716e'
  };
  return colors[status] || colors.online;
}

function updateStatusIndicators(status) {
  const color = getStatusColor(status);
  // Top-right status dot
  const topStatusDot = document.querySelector('.discord-contact-status .status-dot');
  if (topStatusDot) {
    topStatusDot.style.background = color;
    topStatusDot.setAttribute('data-status', status);
  }
  // Footer profile status dot
  const footerAvatar = document.querySelector('.discord-profile .discord-profile-avatar');
  if (footerAvatar) {
    let statusDot = footerAvatar.querySelector('.status-dot');
    if (!statusDot) {
      statusDot = document.createElement('span');
      statusDot.className = 'status-dot';
      footerAvatar.appendChild(statusDot);
    }
    statusDot.style.background = color;
    statusDot.setAttribute('data-status', status);
  }
  // Modal profile status dot
  const modalAvatar = document.querySelector('#discord-modal .discord-profile-avatar');
  if (modalAvatar) {
    let statusDot = modalAvatar.querySelector('.status-dot');
    if (!statusDot) {
      statusDot = document.createElement('span');
      statusDot.className = 'status-dot';
      modalAvatar.appendChild(statusDot);
    }
    statusDot.style.background = color;
    statusDot.setAttribute('data-status', status);
  }
}

/* =========================================
   BACKGROUND PATHS (AMBIENT LAYER)
   ========================================= */

function initBackgroundPaths() {
  const container = document.getElementById('background-paths');
  if (!container) return;

  function createPathGroup(position, groupClass) {
    const paths = [];
    const count = 20;
    for (let i = 0; i < count; i++) {
      const p = position;
      const x1 = -(380 - i * 5 * p);
      const y1 = -(189 + i * 6);
      const cx1 = -(312 - i * 5 * p);
      const cy1 = 216 - i * 6;
      const cx2 = 152 - i * 5 * p;
      const cy2 = 343 - i * 6;
      const x2 = 616 - i * 5 * p;
      const y2 = 470 - i * 6;
      const cx3 = 684 - i * 5 * p;
      const cy3 = 875 - i * 6;

      const d = `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2} C ${cx3} ${cy3} ${cx3} ${cy3} ${cx3} ${cy3}`;
      const strokeWidth = (0.5 + i * 0.03).toFixed(2);
      const opacity = (0.02 + (i / count) * 0.04).toFixed(3);
      const delay = (i * 0.3).toFixed(2);
      const duration = (24 + (i % 5) * 3).toFixed(1);

      paths.push(`
        <path
          d="${d}"
          class="bg-path bg-path-${i % 3}"
          stroke-width="${strokeWidth}"
          stroke-opacity="${opacity}"
          style="--anim-delay: ${delay}s; --anim-dur: ${duration}s;"
        />
      `);
    }
    return `<g class="${groupClass}">${paths.join('')}</g>`;
  }

  container.innerHTML = `
    <svg class="bg-paths-svg" viewBox="-250 -200 1200 1200" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-iris" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4F7CFF" stop-opacity="0.3"/>
          <stop offset="60%" stop-color="#3b5ec2" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#05070B" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d2b175" stop-opacity="0.25"/>
          <stop offset="60%" stop-color="#8c6e32" stop-opacity="0.1"/>
          <stop offset="100%" stop-color="#05070B" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="grad-ember" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#C56A52" stop-opacity="0.25"/>
          <stop offset="70%" stop-color="#4F7CFF" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#05070B" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${createPathGroup(1, 'bg-paths-group-1')}
      ${createPathGroup(-1, 'bg-paths-group-2')}
    </svg>
  `;
}

/* =========================================
   LIQUID METAL BUTTON DESIGN SYSTEM
   ========================================= */

const mountedLiquidMetalShaders = new Map();

function mountLiquidMetalButton(btn, customUniforms = {}) {
  if (!btn || mountedLiquidMetalShaders.has(btn)) return;

  btn.classList.add('btn-liquid-metal');

  const canvasWrap = document.createElement('span');
  canvasWrap.className = 'btn-metal-canvas';
  canvasWrap.setAttribute('aria-hidden', 'true');

  const glowWrap = document.createElement('span');
  glowWrap.className = 'btn-metal-glow';
  glowWrap.setAttribute('aria-hidden', 'true');

  const ripplesWrap = document.createElement('span');
  ripplesWrap.className = 'btn-metal-ripples';
  ripplesWrap.setAttribute('aria-hidden', 'true');

  const contentWrap = document.createElement('span');
  contentWrap.className = 'btn-metal-content';

  while (btn.firstChild) {
    contentWrap.appendChild(btn.firstChild);
  }

  btn.appendChild(glowWrap);
  btn.appendChild(canvasWrap);
  btn.appendChild(ripplesWrap);
  btn.appendChild(contentWrap);

  try {
    const uniforms = {
      u_colorBack: customUniforms.u_colorBack || [0.02, 0.03, 0.05, 1.0],
      u_colorTint: customUniforms.u_colorTint || [0.31, 0.49, 0.95, 1.0],
      u_repetition: customUniforms.u_repetition || 2.2,
      u_softness: customUniforms.u_softness || 0.5,
      u_shiftRed: customUniforms.u_shiftRed || 0.15,
      u_shiftBlue: customUniforms.u_shiftBlue || 0.2,
      u_distortion: customUniforms.u_distortion || 0.08,
      u_contour: customUniforms.u_contour || 0.38,
      u_angle: customUniforms.u_angle || 60.0,
      u_shape: 0,
      u_isImage: false
    };

    const shader = new ShaderMount(
      canvasWrap,
      liquidMetalFragmentShader,
      uniforms,
      { alpha: true, antialias: true, depth: false },
      0.35,
      0,
      1,
      1000000
    );

    mountedLiquidMetalShaders.set(btn, shader);

    btn.addEventListener('mouseenter', () => {
      shader.setSpeed(1.6);
    });

    btn.addEventListener('mouseleave', () => {
      shader.setSpeed(0.35);
    });
  } catch (err) {
    console.warn('Liquid metal shader initialization skipped/fallback:', err);
    btn.classList.add('btn-metal-fallback');
  }

  btn.addEventListener('pointerdown', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ripple = document.createElement('span');
    ripple.className = 'btn-metal-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripplesWrap.appendChild(ripple);
    setTimeout(() => {
      ripple.remove();
    }, 700);
  });
}

function initLiquidMetalButtons() {
  const primarySelectors = [
    '.discord-invite-cta',
    '#discord-invite',
    '#discord-modal-join',
    '#updates-button',
    '#bug-report-button',
    '#suggestion-button',
    '#apply-filters',
    '.community-submit'
  ];

  primarySelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((btn) => {
      mountLiquidMetalButton(btn);
    });
  });
}

function initInteractiveRipples() {
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest(
      '.favorite-filter, .filter-button, .quick-searches button, .favorite-button, .filter-panel-action, .clear-favorites, .lang-switch, .discord-contact, .modal-favorite, .modal-close, .community-modal-close, .btn-secondary-metal, .btn-icon-metal'
    );
    if (!btn || btn.classList.contains('btn-liquid-metal')) return;

    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let rippleWrap = btn.querySelector('.css-ripple-wrap');
    if (!rippleWrap) {
      rippleWrap = document.createElement('span');
      rippleWrap.className = 'css-ripple-wrap';
      rippleWrap.setAttribute('aria-hidden', 'true');
      btn.appendChild(rippleWrap);
    }

    const ripple = document.createElement('span');
    ripple.className = 'css-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    rippleWrap.appendChild(ripple);
    setTimeout(() => {
      ripple.remove();
    }, 600);
  });
}

/* =========================================
   BAŞLAT
========================================= */

function setAppearance(value) {
  if (!APPEARANCE_VALUES.includes(value) || value === currentAppearance) return;
  currentAppearance = value;
  document.documentElement.dataset.appearance = value;
  try { localStorage.setItem(APPEARANCE_STORAGE_KEY, value); } catch (error) {}
  track('appearance_change', { appearance: value });
}

function initGithubButton(topActions) {
  if (document.getElementById('github-contact')) return;

  const githubButton = document.createElement('a');
  githubButton.id = 'github-contact';
  githubButton.className = 'github-contact';
  githubButton.href = 'https://github.com/existye4t/lol-skin-finder';
  githubButton.target = '_blank';
  githubButton.rel = 'noopener';
  githubButton.setAttribute('aria-label', 'GitHub');
  githubButton.title = 'GitHub';

  const icon = document.createElement('span');
  icon.className = 'github-contact-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';

  const label = document.createElement('span');
  label.className = 'github-contact-label';
  label.textContent = 'GitHub';

  githubButton.appendChild(icon);
  githubButton.appendChild(label);
  topActions.appendChild(githubButton);
}

function initAppearancePanel() {
  const topActions = document.querySelector('.top-actions');
  if (!topActions || document.getElementById('appearance-dialog')) return;

  initGithubButton(topActions);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'appearance-toggle';
  toggle.className = 'appearance-toggle';
  toggle.setAttribute('aria-haspopup', 'dialog');
  toggle.setAttribute('aria-controls', 'appearance-dialog');
  toggle.setAttribute('data-i18n-aria-label', 'appearanceTitle');
  toggle.setAttribute('data-i18n-title', 'appearanceTitle');
  toggle.setAttribute('aria-label', t('appearanceTitle'));
  toggle.title = t('appearanceTitle');
  toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

  const dialog = document.createElement('dialog');
  dialog.id = 'appearance-dialog';
  dialog.className = 'appearance-dialog';
  dialog.setAttribute('aria-labelledby', 'appearance-dialog-title');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'appearance-dialog-close';
  closeBtn.setAttribute('data-i18n-aria-label', 'appearanceClose');
  closeBtn.setAttribute('aria-label', t('appearanceClose'));
  closeBtn.textContent = '×';

  const title = document.createElement('h2');
  title.id = 'appearance-dialog-title';
  title.className = 'appearance-dialog-title';
  title.setAttribute('data-i18n', 'appearanceTitle');
  title.textContent = t('appearanceTitle');

  const options = document.createElement('div');
  options.className = 'appearance-options';
  options.setAttribute('role', 'radiogroup');
  options.setAttribute('data-i18n-aria-label', 'appearanceTitle');
  options.setAttribute('aria-label', t('appearanceTitle'));

  const themes = [
    { value: 'mono', labelKey: 'appearanceMono', swatches: ['#000000', '#0d0d0d', '#f5f5f5'] },
    { value: 'gold', labelKey: 'appearanceGold', swatches: ['#08090d', '#111319', '#c9a24a'] },
    { value: 'neon', labelKey: 'appearanceNeon', swatches: ['#0b0714', '#150f24', '#3de8e0'] }
  ];

  themes.forEach((theme) => {
    const label = document.createElement('label');
    label.className = 'appearance-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'appearance';
    input.value = theme.value;
    input.checked = theme.value === currentAppearance;
    const preview = document.createElement('span');
    preview.className = 'appearance-preview';
    preview.setAttribute('aria-hidden', 'true');
    const bar = document.createElement('span');
    bar.className = 'appearance-preview-bar';
    bar.style.background = theme.swatches[1];
    const body = document.createElement('span');
    body.className = 'appearance-preview-body';
    body.style.background = theme.swatches[0];
    const dot = document.createElement('span');
    dot.className = 'appearance-preview-dot';
    dot.style.background = theme.swatches[2];
    preview.appendChild(bar);
    preview.appendChild(body);
    preview.appendChild(dot);
    const text = document.createElement('span');
    text.className = 'appearance-option-label';
    text.setAttribute('data-i18n', theme.labelKey);
    text.textContent = t(theme.labelKey);
    label.appendChild(input);
    label.appendChild(preview);
    label.appendChild(text);
    options.appendChild(label);
  });

  dialog.appendChild(closeBtn);
  dialog.appendChild(title);
  dialog.appendChild(options);
  document.body.appendChild(dialog);
  topActions.appendChild(toggle);

  const openDialog = () => {
    if (dialog.open) return;
    dialog.querySelectorAll('input[name="appearance"]').forEach((input) => {
      input.checked = input.value === currentAppearance;
    });
    dialog.classList.remove('closing');
    dialog.showModal();
  };

  const closeDialog = () => {
    if (!dialog.open || dialog.classList.contains('closing')) return;
    dialog.classList.add('closing');
    window.setTimeout(() => {
      dialog.close();
      toggle.focus({ preventScroll: true });
    }, isReducedMotion() ? 0 : 150);
  };

  toggle.addEventListener('click', openDialog);
  closeBtn.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener('change', (event) => {
    if (event.target.name === 'appearance') setAppearance(event.target.value);
  });
}

initAppearancePanel();

function initSectionHeadingReveal() {
  document.querySelectorAll('.results-header h2, .favorites-header h2').forEach((heading) => {
    heading.classList.add('scroll-reveal');
  });
  initScrollRevealAnimation();
}

initSectionHeadingReveal();

applyStaticTranslations();

updateLangSwitchUI();

updateFavoriteCount();

setFavoriteFilter(false);

loadData().catch((error) => {
  console.error('loadData failed:', error);
});

loadDiscordProfile().catch((error) => {
  console.error('loadDiscordProfile failed:', error);
});

/* =========================================
   DISCORD PRESENCE (LANYARD API)
   ========================================= */

const LANYARD_API = 'https://api.lanyard.rest/v1';
const DISCORD_USER_ID = '772232490445176842';
let latestDiscordPresence = null;
let lastKnownDiscordUsername = null;

const discordContactElements = {
  // Header button (#discord-contact)
  name: document.querySelector('.discord-contact-name'),
  nameInProfile: document.querySelector('.discord-contact-info .discord-contact-name'),
  avatar: document.querySelector('.discord-contact-avatar img'),
  statusDot: document.querySelector('.discord-contact-status-dot'),
  statusText: document.querySelector('.discord-contact-status-text'),

  // Footer .discord-profile (outside any dialog, in main page flow)
  footerName: document.querySelector('main .discord-profile .discord-profile-info strong'),
  footerAvatar: document.querySelector('main .discord-profile .discord-profile-avatar img'),

  // Modal .discord-profile (inside #discord-modal dialog)
  modalName: document.querySelector('#discord-modal .discord-profile-info strong'),
  modalAvatar: document.querySelector('#discord-modal .discord-profile-avatar img'),
};

const STATUS_LABELS = {
  online: { tr: 'Çevrimiçi', en: 'Online' },
  idle: { tr: 'Boşta', en: 'Idle' },
  dnd: { tr: 'Rahatsız Etmeyin', en: 'Do Not Disturb' },
  offline: { tr: 'Çevrimdışı', en: 'Offline' },
  streaming: { tr: 'Yayında', en: 'Streaming' },
};

const STATUS_DOT_CLASSES = {
  online: 'online',
  idle: 'idle',
  dnd: 'dnd',
  offline: 'offline',
  streaming: 'online',
};

function getStatusLabel(status, lang = 'tr') {
  return STATUS_LABELS[status]?.[lang] || STATUS_LABELS.offline[lang];
}

function getStatusDotClass(status) {
  return STATUS_DOT_CLASSES[status] || STATUS_DOT_CLASSES.offline;
}

async function fetchDiscordPresence(userId) {
  try {
    const response = await fetch(`${LANYARD_API}/users/${userId}`);
    if (!response.ok) {
      throw new Error(`Lanyard API error: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.warn('Lanyard API fetch failed:', error);
    return null;
  }
}

function updateDiscordUI(presence) {
  if (!presence) {
    setDiscordFallback();
    return;
  }

  latestDiscordPresence = presence;

  const { discord_user, discord_status } = presence;
  const lang = currentLang || 'tr';

  // Store last known username for fallback
  if (discord_user?.username) {
    lastKnownDiscordUsername = discord_user.username;
  }

  // Update header button avatar
  if (discordContactElements.avatar && discord_user) {
    const avatarHash = discord_user.avatar;
    const avatarUrl = avatarHash
      ? `https://cdn.discordapp.com/avatars/${discord_user.id}/${avatarHash}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number(discord_user.discriminator) % 5}.png`;
    discordContactElements.avatar.src = avatarUrl;
    discordContactElements.avatar.alt = `${discord_user.username} avatar`;
  }

  // Update header button username (both locations)
  if (discordContactElements.name && discord_user) {
    discordContactElements.name.textContent = discord_user.username;
  }
  if (discordContactElements.nameInProfile && discord_user) {
    discordContactElements.nameInProfile.textContent = discord_user.username;
  }

  // Update footer .discord-profile
  if (discordContactElements.footerAvatar && discord_user) {
    const avatarHash = discord_user.avatar;
    const avatarUrl = avatarHash
      ? `https://cdn.discordapp.com/avatars/${discord_user.id}/${avatarHash}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number(discord_user.discriminator) % 5}.png`;
    discordContactElements.footerAvatar.src = avatarUrl;
    discordContactElements.footerAvatar.alt = `${discord_user.username} avatar`;
  }
  if (discordContactElements.footerName && discord_user) {
    discordContactElements.footerName.textContent = discord_user.username;
  }

  // Update modal .discord-profile
  if (discordContactElements.modalAvatar && discord_user) {
    const avatarHash = discord_user.avatar;
    const avatarUrl = avatarHash
      ? `https://cdn.discordapp.com/avatars/${discord_user.id}/${avatarHash}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number(discord_user.discriminator) % 5}.png`;
    discordContactElements.modalAvatar.src = avatarUrl;
    discordContactElements.modalAvatar.alt = `${discord_user.username} avatar`;
  }
  if (discordContactElements.modalName && discord_user) {
    discordContactElements.modalName.textContent = discord_user.username;
  }

  // Update status in button
  const statusLabel = getStatusLabel(discord_status, lang);

  if (discordContactElements.statusText) {
    discordContactElements.statusText.textContent = statusLabel;
  }
  if (discordContactElements.statusDot) {
    discordContactElements.statusDot.dataset.status = discord_status;
  }
}

function setDiscordFallback() {
  const lang = currentLang || 'tr';
  const fallbackName = lastKnownDiscordUsername || 'Discord';
  const fallbackAvatar = 'https://cdn.discordapp.com/embed/avatars/0.png';

  // Header button
  if (discordContactElements.name) {
    discordContactElements.name.textContent = fallbackName;
  }
  if (discordContactElements.nameInProfile) {
    discordContactElements.nameInProfile.textContent = fallbackName;
  }
  if (discordContactElements.statusText) {
    discordContactElements.statusText.textContent = lang === 'tr' ? 'Çevrimdışı' : 'Offline';
  }
  if (discordContactElements.statusDot) {
    discordContactElements.statusDot.dataset.status = 'offline';
  }
  if (discordContactElements.avatar) {
    discordContactElements.avatar.src = fallbackAvatar;
    discordContactElements.avatar.alt = `${fallbackName} avatar`;
  }

  // Footer .discord-profile
  if (discordContactElements.footerName) {
    discordContactElements.footerName.textContent = fallbackName;
  }
  if (discordContactElements.footerAvatar) {
    discordContactElements.footerAvatar.src = fallbackAvatar;
    discordContactElements.footerAvatar.alt = `${fallbackName} avatar`;
  }

  // Modal .discord-profile
  if (discordContactElements.modalName) {
    discordContactElements.modalName.textContent = fallbackName;
  }
  if (discordContactElements.modalAvatar) {
    discordContactElements.modalAvatar.src = fallbackAvatar;
    discordContactElements.modalAvatar.alt = `${fallbackName} avatar`;
  }
}

async function initDiscordPresence() {
  const discordContact = document.querySelector('#discord-contact');
  if (!discordContact) return;

  // Initial load
  const presence = await fetchDiscordPresence(DISCORD_USER_ID);
  updateDiscordUI(presence);

  // Poll for updates every 30 seconds
  setInterval(async () => {
    const presence = await fetchDiscordPresence(DISCORD_USER_ID);
    updateDiscordUI(presence);
  }, 30000);
}

// Prevent tree-shaking by executing the initialization
initDiscordPresence();


/* =========================================
   COMMAND PALETTE (Ctrl+K / Cmd+K)
   =========================================
   Mevcut arama kutusundan bagimsiz; sonuclari
   mevcut getGroupSearchScore() fonksiyonunu
   cagirarak hesaplar (arama mantigi yeniden
   yazilmadi, yeniden kullanildi). Enter ile
   secili skin'in modal'i acilir, Esc veya
   backdrop tiklamasi ile kapanir.
========================================= */



function initCommandPalette() {
  const palette =
    document.querySelector('#command-palette');

  const paletteInput =
    document.querySelector(
      '#command-palette-input'
    );

  const paletteResults =
    document.querySelector(
      '#command-palette-results'
    );

  if (!palette || !paletteInput || !paletteResults) {
    return;
  }

  let paletteMatches = [];
  let paletteActiveIndex = 0;

  /* Palette acikken arka sayfanin
     kaymasini engelle */
  let savedBodyOverflow = null;

  const closePalette = () => {
    if (!palette.open) {
      return;
    }

    palette.close();
    resetPalette();
  };

  const openPalette = () => {
    if (palette.open) {
      return;
    }

    savedBodyOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    renderPaletteResults();
    palette.showModal();
    paletteInput.focus({ preventScroll: true });
    paletteInput.select();
  };

  const updatePaletteActiveItem = (scroll = true) => {
    const items =
      paletteResults.querySelectorAll(
        '.command-palette-item'
      );

    items.forEach((item, index) => {
      item.classList.toggle(
        'is-active',
        index === paletteActiveIndex
      );
    });

    if (scroll) {
      items[paletteActiveIndex]?.scrollIntoView(
        { block: 'nearest' }
      );
    }
  };

  const renderPaletteResults = () => {
    paletteResults.replaceChildren();

    const query = normalize(paletteInput.value);

    if (!query) {
      paletteMatches = [];
      paletteActiveIndex = 0;

      const hint =
        document.createElement('li');

      hint.className = 'command-palette-empty';

      hint.textContent =
        currentLang === 'en'
          ? 'Type to search skins…'
          : 'Skin aramak için yazın…';

      paletteResults.appendChild(hint);

      return;
    }

    paletteMatches = skinGroups
      .map((group) => ({
        group,
        score: getGroupSearchScore(
          group,
          query
        )
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ group }) => group);

    paletteActiveIndex = 0;

    if (!paletteMatches.length) {
      const emptyItem =
        document.createElement('li');

      emptyItem.className =
        'command-palette-empty';

      emptyItem.textContent =
        currentLang === 'en'
          ? 'No results found.'
          : 'Sonuç bulunamadı.';

      paletteResults.appendChild(emptyItem);

      return;
    }

    /* Tum sonuclari tek seferde eklemek icin
       DocumentFragment kullan: her item icin
       ayri reflow yerine tek toplu DOM ekleme */

    const fragment =
      document.createDocumentFragment();

    paletteMatches.forEach(
      (group, index) => {
        const skin = group.primary;

        const item =
          document.createElement('li');

        item.className =
          'command-palette-item';

        item.dataset.index = String(index);
        item.setAttribute('role', 'option');

        const img =
          document.createElement('img');

        img.src = getSkinImageUrl(skin);
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';

        const textWrap =
          document.createElement('div');

        textWrap.className =
          'command-palette-item-text';

        const nameEl =
          document.createElement('span');

        nameEl.className =
          'command-palette-item-name';

        applyMatchHighlight(
          nameEl,
          getLocalizedSkinName(skin),
          paletteInput.value
        );

        const champEl =
          document.createElement('span');

        champEl.className =
          'command-palette-item-champion';

        champEl.textContent =
          getLocalizedChampionName(skin);

        textWrap.appendChild(nameEl);
        textWrap.appendChild(champEl);

        item.appendChild(img);
        item.appendChild(textWrap);

        item.addEventListener(
          'mouseenter',
          () => {
            paletteActiveIndex = index;
            updatePaletteActiveItem(false);
          }
        );

        item.addEventListener(
          'click',
          () => {
            closePalette();
            openModal(group);
          }
        );

        fragment.appendChild(item);
      }
    );

    paletteResults.appendChild(fragment);

    updatePaletteActiveItem();
  };

  /* Ctrl+K / Cmd+K kisayolu (genel) */

  document.addEventListener(
    'keydown',
    (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();

        if (palette.open) {
          closePalette();
        } else {
          openPalette();
        }
      }
    }
  );

  /* Palet icindeki input davranislari */

  /* Performans: her tus vurusunda aramayi
     aninda calistirmak yerine 180ms debounce
     uygula; kullanici yazmayi birakinca
     arama + render tek seferde yapilir */

  let paletteDebounceTimer = null;

  paletteInput.addEventListener(
    'input',
    () => {
      window.clearTimeout(
        paletteDebounceTimer
      );

      paletteDebounceTimer =
        window.setTimeout(
          renderPaletteResults,
          180
        );
    }
  );

  paletteInput.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();

        if (paletteMatches.length) {
          paletteActiveIndex =
            (paletteActiveIndex + 1) %
            paletteMatches.length;

          updatePaletteActiveItem();
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();

        if (paletteMatches.length) {
          paletteActiveIndex =
            (paletteActiveIndex - 1 +
              paletteMatches.length) %
            paletteMatches.length;

          updatePaletteActiveItem();
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();

        const group =
          paletteMatches[paletteActiveIndex];

        if (group) {
          closePalette();
          openModal(group);
        }
      }
    }
  );

  // Only the top palette handles Escape; leave underlying dialogs open.
  palette.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') event.stopPropagation();
  });

  /* Backdrop tiklamasi ile kapat */

  palette.addEventListener(
    'click',
    (event) => {
      if (event.target === palette) {
        closePalette();
      }
    }
  );

  /* Eslenen metni vurgula (premium dokunus):
     karakter karakter normalize ederek orijinal
     metindeki indeksleri esler */

  const applyMatchHighlight = (
    nameEl,
    displayName,
    query
  ) => {
    const target = normalize(query);

    if (!target) {
      nameEl.textContent = displayName;
      return;
    }

    const normMap = [];

    for (
      let i = 0;
      i < displayName.length;
      i++
    ) {
      const n = normalize(displayName[i]);

      if (n) {
        normMap.push({
          originalIndex: i,
          normalized: n
        });
      }
    }

    const sequence = normMap
      .map((entry) => entry.normalized)
      .join('');

    const matchStart =
      sequence.indexOf(target);

    if (matchStart === -1) {
      nameEl.textContent = displayName;
      return;
    }

    const startOrig =
      normMap[matchStart].originalIndex;

    const endOrig =
      normMap[
        matchStart + target.length - 1
      ].originalIndex + 1;

    nameEl.replaceChildren(
      document.createTextNode(
        displayName.slice(0, startOrig)
      )
    );

    const mark =
      document.createElement('mark');

    mark.textContent = displayName.slice(
      startOrig,
      endOrig
    );

    nameEl.appendChild(mark);

    nameEl.appendChild(
      document.createTextNode(
        displayName.slice(endOrig)
      )
    );
  };

  /* Kapatilirken state'i sifirla ve body
     scroll kilidini geri kaldir */

  const resetPalette = () => {
    /* Bekleyen debounce'lu aramayi iptal et */
    window.clearTimeout(
      paletteDebounceTimer
    );

    paletteInput.value = '';
    paletteMatches = [];
    paletteActiveIndex = 0;
    paletteResults.replaceChildren();

    if (savedBodyOverflow !== null) {
      document.body.style.overflow =
        savedBodyOverflow;
      savedBodyOverflow = null;
    }
  };

  palette.addEventListener(
    'close',
    () => {
      // A queued close event must not reset a newly reopened palette.
      if (!palette.open) resetPalette();
    }
  );

  /* Tetikleyici buton: tiklayinca ac,
     rozette isletim sistemine gore
     Ctrl K / Cmd K goster */

  const paletteTrigger =
    document.querySelector(
      '#command-palette-trigger'
    );

  if (paletteTrigger) {
    paletteTrigger.addEventListener(
      'click',
      () => {
        openPalette();
      }
    );

    const platformText = (
      navigator.platform ||
      ''
    ).toLowerCase();

    if (platformText.includes('mac')) {
      const keys =
        paletteTrigger.querySelectorAll(
          '.command-palette-trigger-keys kbd'
        );

      if (keys.length === 2) {
        keys[0].textContent = '⌘';
        keys[1].textContent = 'K';
      }
    }
  }
}

initCommandPalette();

/* =========================================
   TOAST BİLDİRİMLERİ
   =========================================
   Ekranin sag altinda kisa sureli beliren
   kucuk bildirim balonlari. Birden fazla
   bildirim alt alta istiflenir.
   Kullanim: showToast('Mesaj')
========================================= */

function showToast(message) {
  let container =
    document.querySelector('.toast-container');

  if (!container) {
    container =
      document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast =
    document.createElement('div');

  toast.className = 'toast';
  toast.textContent = message;
  toast.setAttribute('role', 'status');

  container.appendChild(toast);

  /* Belirme animasyonunu tetikle */
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  window.setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');

    window.setTimeout(() => {
      toast.remove();

      if (!container.children.length) {
        container.remove();
      }
    }, 220);
  }, 2500);
}

/* =========================================
   SCROLL-TO-TOP (YUKARI ÇIK) BUTONU
   ========================================= */

function initScrollToTop() {
  const button =
    document.querySelector('#scroll-to-top');

  if (!button) {
    return;
  }

  const toggleVisibility = () => {
    button.classList.toggle(
      'scroll-to-top-visible',
      window.scrollY > 450
    );
  };

  window.addEventListener(
    'scroll',
    toggleVisibility,
    { passive: true }
  );

  toggleVisibility();

  button.addEventListener(
    'click',
    () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  );
}

initScrollToTop();

let heroDissolveBound = false;

function initHeroScrollDissolve() {
  if (isReducedMotion() || heroDissolveBound) return;
  heroDissolveBound = true;
  const heading = document.querySelector('.hero h1');
  const intro = document.querySelector('.hero .intro');
  if (!heading && !intro) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    if (isReducedMotion()) return;
    const progress = Math.min(1, window.scrollY / 420);
    const opacity = 1 - progress;
    const translateY = progress * 36;
    const scale = 1 - progress * 0.05;
    if (heading) {
      heading.style.opacity = String(opacity);
      heading.style.transform = `scale(${scale}) translateY(${translateY}px)`;
    }
    if (intro) {
      intro.style.opacity = String(opacity);
      intro.style.transform = `translateY(${translateY}px)`;
    }
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
}

function syncReducedMotion() {
  if (!isReducedMotion()) return;
  document.querySelectorAll('.scroll-reveal').forEach((el) => {
    el.classList.add('visible');
    el.classList.remove('scroll-reveal-animating');
  });
  document.querySelectorAll('.hero h1, .hero .intro').forEach((el) => {
    el.style.opacity = '';
    el.style.transform = '';
  });
  document.querySelectorAll('.discord-invite-cta, #discord-invite, #discord-modal-join, #updates-button, #bug-report-button, #suggestion-button, #apply-filters, .community-submit').forEach((btn) => {
    btn.style.transform = '';
  });
}

reducedMotionQuery.addEventListener('change', () => {
  if (isReducedMotion()) {
    syncReducedMotion();
  } else {
    initHeroScrollDissolve();
    initSectionHeadingReveal();
  }
});

initHeroScrollDissolve();
