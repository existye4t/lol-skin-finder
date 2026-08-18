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
    tr: 'Favorilere ekle',
    en: 'Add to favorites'
  },
  removeFavorite: {
    tr: 'Favorilerden çıkar',
    en: 'Remove from favorites'
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
    tr: 'Bir sorun mu var?',
    en: 'Got an issue?'
  },
  discordDescription: {
    tr: 'Problem, öneri veya sorularınız için Discord üzerinden bana ulaşabilirsiniz.',
    en: 'Reach out to me on Discord for any issues, suggestions, or questions.'
  },
  discordHint: {
    tr: 'Yardım etmek için buradayım.',
    en: 'I’m here to help.'
  },
  closeDiscord: {
    tr: 'Discord penceresini kapat',
    en: 'Close the Discord window'
  }
};

function getLang() {
  try {
    const saved = localStorage.getItem(
      LANG_STORAGE_KEY
    );

    if (saved === 'tr' || saved === 'en') {
      return saved;
    }
  } catch (error) {
    console.warn(
      'Dil tercihi okunamadı:',
      error
    );
  }

  return 'tr';
}

let currentLang = getLang();

function t(key, vars) {
  const entry =
    TRANSLATIONS[key];

  if (!entry) {
    console.warn(
      `Çeviri bulunamadı: ${key}`
    );

    return key;
  }

  let text =
    entry[currentLang] ||
    entry.tr ||
    key;

  if (vars) {
    Object.keys(vars).forEach(
      (varKey) => {
        text = text.replace(
          `{${varKey}}`,
          vars[varKey]
        );
      }
    );
  }

  return text;
}

function formatNumber(value) {
  return Number(
    value
  ).toLocaleString(
    LOCALE_MAP[currentLang] ||
      'tr-TR'
  );
}

/* ---------------------------------------
   Skin adı / şampiyon adı yerelleştirme

   Not: data/skins.json şu an sadece
   Türkçe (tr_TR) verisiyle üretiliyor.
   scripts/update-skins.mjs güncellendi;
   `npm run update-data` yeniden
   çalıştırıldığında İngilizce alanlar
   (nameEn / championEn) da dosyaya
   eklenecek. O zamana kadar İngilizce
   modda otomatik olarak Türkçe isimlere
   geri dönülür.
   --------------------------------------- */

function localizedName(skin) {
  if (
    currentLang === 'en' &&
    skin?.nameEn
  ) {
    return skin.nameEn;
  }

  return skin?.name || '';
}

function localizedChampion(skin) {
  if (
    currentLang === 'en' &&
    skin?.championEn
  ) {
    return skin.championEn;
  }

  return skin?.champion || '';
}

/* ---------------------------------------
   Statik metinleri uygula
   --------------------------------------- */

function applyStaticTranslations() {
  document.documentElement.lang =
    currentLang;

  document
    .querySelectorAll('[data-i18n]')
    .forEach((element) => {
      const key =
        element.dataset.i18n;

      element.textContent =
        t(key);
    });

  document
    .querySelectorAll(
      '[data-i18n-placeholder]'
    )
    .forEach((element) => {
      element.placeholder =
        t(
          element.dataset
            .i18nPlaceholder
        );
    });

  document
    .querySelectorAll(
      '[data-i18n-title]'
    )
    .forEach((element) => {
      element.title =
        t(
          element.dataset
            .i18nTitle
        );
    });

  document
    .querySelectorAll(
      '[data-i18n-aria-label]'
    )
    .forEach((element) => {
      element.setAttribute(
        'aria-label',
        t(
          element.dataset
            .i18nAriaLabel
        )
      );
    });

  document
    .querySelectorAll(
      '[data-query-tr]'
    )
    .forEach((button) => {
      const query =
        currentLang === 'en'
          ? button.dataset
              .queryEn ||
            button.dataset
              .queryTr
          : button.dataset
              .queryTr;

      const label =
        currentLang === 'en'
          ? button.dataset
              .labelEn ||
            button.dataset
              .labelTr
          : button.dataset
              .labelTr;

      button.dataset.query =
        query;

      button.textContent =
        label;
    });
}

/* ---------------------------------------
   Dil butonu / menüsü
   --------------------------------------- */

const langSwitch =
  document.querySelector(
    '#lang-switch'
  );

const langMenu =
  document.querySelector(
    '#lang-menu'
  );

const langSwitchFlag =
  document.querySelector(
    '#lang-switch-flag'
  );

const langSwitchCode =
  document.querySelector(
    '#lang-switch-code'
  );

const LANG_FLAGS = {
  tr: '<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#E30A17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.4" cy="10" r="4" fill="#E30A17"/><polygon points="17.3,8.6 17.62,9.56 18.63,9.57 17.82,10.17 18.12,11.13 17.3,10.55 16.48,11.13 16.78,10.17 15.97,9.57 16.98,9.56" fill="#fff"/></svg>',
  en: '<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#fff"/><rect y="0" width="30" height="1.54" fill="#B22234"/><rect y="3.08" width="30" height="1.54" fill="#B22234"/><rect y="6.15" width="30" height="1.54" fill="#B22234"/><rect y="9.23" width="30" height="1.54" fill="#B22234"/><rect y="12.31" width="30" height="1.54" fill="#B22234"/><rect y="15.38" width="30" height="1.54" fill="#B22234"/><rect y="18.46" width="30" height="1.54" fill="#B22234"/><rect width="12" height="10.77" fill="#3C3B6E"/><g fill="#fff"><circle cx="2" cy="1.5" r="0.45"/><circle cx="5" cy="1.5" r="0.45"/><circle cx="8" cy="1.5" r="0.45"/><circle cx="11" cy="1.5" r="0.45"/><circle cx="3.5" cy="3" r="0.45"/><circle cx="6.5" cy="3" r="0.45"/><circle cx="9.5" cy="3" r="0.45"/><circle cx="2" cy="4.5" r="0.45"/><circle cx="5" cy="4.5" r="0.45"/><circle cx="8" cy="4.5" r="0.45"/><circle cx="11" cy="4.5" r="0.45"/><circle cx="3.5" cy="6" r="0.45"/><circle cx="6.5" cy="6" r="0.45"/><circle cx="9.5" cy="6" r="0.45"/><circle cx="2" cy="7.5" r="0.45"/><circle cx="5" cy="7.5" r="0.45"/><circle cx="8" cy="7.5" r="0.45"/><circle cx="11" cy="7.5" r="0.45"/><circle cx="3.5" cy="9" r="0.45"/><circle cx="6.5" cy="9" r="0.45"/><circle cx="9.5" cy="9" r="0.45"/></g></svg>'
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
    .querySelectorAll(
      '.lang-menu-option'
    )
    .forEach((option) => {
      const active =
        option.dataset.lang ===
        currentLang;

      option.setAttribute(
        'aria-selected',
        active
          ? 'true'
          : 'false'
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
    lang !== 'tr' &&
    lang !== 'en'
  ) {
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

  render();

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
  .querySelectorAll(
    '.lang-menu-option'
  )
  .forEach((option) => {
    option.addEventListener(
      'click',
      () => {
        setLang(
          option.dataset.lang
        );

        closeLangMenu();
      }
    );
  });

document.addEventListener(
  'click',
  (event) => {
    if (
      !langMenu ||
      langMenu.hidden
    ) {
      return;
    }

    if (
      langMenu.contains(
        event.target
      ) ||
      langSwitch?.contains(
        event.target
      )
    ) {
      return;
    }

    closeLangMenu();
  }
);

document.addEventListener(
  'keydown',
  (event) => {
    if (
      event.key === 'Escape' &&
      langMenu &&
      !langMenu.hidden
    ) {
      closeLangMenu();
    }
  }
);

/* =========================================
   DOM
   ========================================= */

const search = document.querySelector('#search');
const results = document.querySelector('#results');
const empty = document.querySelector('#empty');
const meta = document.querySelector('#meta');
const title = document.querySelector('#result-title');
const template = document.querySelector('#skin-template');

const modal = document.querySelector('#skin-modal');
const downloadList = document.querySelector('#download-list');

const fantomeFiles = new Set();

/* =========================================
   FAVORİLER
   ========================================= */

const FAVORITES_STORAGE_KEY =
  'exist-lol-skin-favorites';

let favorites = new Set();

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

/* =========================================
   ANALYTICS
   ========================================= */

const track = (
  eventName,
  parameters = {}
) => {
  if (
    typeof window.gtag ===
    'function'
  ) {
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
  const base =
    import.meta.env?.BASE_URL || '/';

  return `${base}${String(path).replace(/^\/+/, '')}`;
};

/* =========================================
   VERİLER
   ========================================= */

let skins = [];
let skinGroups = [];

let searchTrackingTimer = null;
let lastTrackedSearch = '';

/* =========================================
   FAVORİLERİ KAYDET
   ========================================= */

function saveFavorites() {
  try {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(
        [...favorites]
      )
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
  return favorites.has(
    String(skinId)
  );
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
    formatNumber(
      favorites.size
    );

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

  const favorite =
    isFavorite(skinId);

  button.classList.toggle(
    'is-favorite',
    favorite
  );

  button.setAttribute(
    'aria-pressed',
    favorite
      ? 'true'
      : 'false'
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
      favorite
        ? '★'
        : '☆';
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
      favorite
        ? '★'
        : '☆';
  }
}

/* =========================================
   FAVORİ FİLTRESİ
   ========================================= */

const favoriteFilter =
  document.querySelector(
    '#favorite-filter'
  );

function isFavoriteFilterActive() {
  return Boolean(
    favoriteFilter?.classList.contains(
      'is-active'
    )
  );
}

function setFavoriteFilter(
  active
) {
  if (!favoriteFilter) {
    return;
  }

  favoriteFilter.classList.toggle(
    'is-active',
    active
  );

  favoriteFilter.setAttribute(
    'aria-pressed',
    active
      ? 'true'
      : 'false'
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

  const id = String(
    skinId
  );

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

  /* ---------------------------------------
     Favori ekleme animasyonu
     --------------------------------------- */

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

  /* ---------------------------------------
     Favoriler filtresi açıksa render
     --------------------------------------- */

  if (
    isFavoriteFilterActive()
  ) {
    window.setTimeout(
      () => {
        render();
      },
      220
    );
  }

  track(
    'favorite_toggle',
    {
      skin_id: id,
      is_favorite:
        favorites.has(id)
          ? 1
          : 0
    }
  );
}

/* =========================================
   NORMALIZE
   ========================================= */

const normalize = (
  value
) =>
  String(value ?? '')
    .toLocaleLowerCase(
      'tr-TR'
    )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /ı/g,
      'i'
    )
    .replace(
      /[^a-z0-9]/g,
      ''
    );

/* =========================================
   ARAMA EŞLEŞMESİ
   ========================================= */

function groupMatchesSearch(
  group,
  query
) {
  if (!query) {
    return true;
  }

  const searchableText =
    group.skins
      .map(
        (skin) =>
          [
            skin.name,
            skin.nameEn,
            skin.champion,
            skin.championEn,
            skin.id
          ]
            .filter(Boolean)
            .join(' ')
      )
      .join(' ');

  return normalize(
    searchableText
  ).includes(query);
}

/* =========================================
   FAVORİ GRUP KONTROLÜ
   ========================================= */

function groupHasFavorite(
  group
) {
  return group.skins.some(
    (skin) =>
      isFavorite(skin.id)
  );
}

/* =========================================
   GÜVENLİ SKIN VERİSİ
   ========================================= */

function normalizeSkin(
  skin
) {
  if (
    !skin ||
    typeof skin !== 'object'
  ) {
    return null;
  }

  const id =
    String(
      skin.id ?? ''
    ).trim();

  const name =
    String(
      skin.name ?? ''
    ).trim();

  const champion =
    String(
      skin.champion ?? ''
    ).trim();

  const image =
    String(
      skin.image ?? ''
    ).trim();

  const nameEn =
    skin.nameEn
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

  return {
    ...skin,
    id,
    name,
    champion,
    image,
    nameEn,
    championEn
  };
}

/* =========================================
   SKIN KARTI
   ========================================= */

function createSkinCard(
  group
) {
  if (
    !group ||
    !group.primary
  ) {
    return null;
  }

  const skin =
    group.primary;

  if (
    !template?.content
  ) {
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
    card.querySelector(
      'img'
    );

  const championElement =
    card.querySelector(
      '.champion'
    );

  const nameElement =
    card.querySelector(
      'h3'
    );

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
     Görsel
     --------------------------------------- */

  const displayName =
    localizedName(skin);

  const displayChampion =
    localizedChampion(skin);

  if (image) {
    image.src =
      skin.image ||
      '';

    image.alt =
      `${displayName} — ${displayChampion}`;

    image.loading =
      'lazy';

    image.decoding =
      'async';

    image.addEventListener(
      'error',
      () => {
        image.style.display =
          'none';
      },
      {
        once: true
      }
    );
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

    favoriteButton.type =
      'button';

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

  article.tabIndex =
    0;

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
        event.key ===
          'Enter' ||
        event.key ===
          ' '
      ) {
        event.preventDefault();

        openModal(group);
      }
    }
  );

  return card;
}

/* =========================================
   SKINLERİ RENDER ET
   ========================================= */

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
    normalize(
      search.value
    );

  let found =
    skinGroups.filter(
      (group) =>
        groupMatchesSearch(
          group,
          query
        )
    );

  /* ---------------------------------------
     Favori filtresi
     --------------------------------------- */

  if (
    isFavoriteFilterActive()
  ) {
    found =
      found.filter(
        (group) =>
          groupHasFavorite(
            group
          )
      );
  }

  /* ---------------------------------------
     Maksimum görünür kart
     --------------------------------------- */

  const maxVisible =
    query ||
    isFavoriteFilterActive()
      ? 80
      : 24;

  const visible =
    found.slice(
      0,
      maxVisible
    );

  const cards =
    visible
      .map(
        (group) =>
          createSkinCard(
            group
          )
      )
      .filter(Boolean);

  results.replaceChildren(
    ...cards
  );

  /* ---------------------------------------
     Başlık
     --------------------------------------- */

  if (
    isFavoriteFilterActive()
  ) {
    title.textContent =
      query
        ? t(
            'favoriteResultsCount',
            {
              count: formatNumber(
                found.length
              )
            }
          )
        : t('favoriteCount', {
            count: formatNumber(
              found.length
            )
          });
  } else {
    title.textContent =
      query
        ? t('resultsCount', {
            count: formatNumber(
              found.length
            )
          })
        : t('exploreSkins');
  }

  /* ---------------------------------------
     Meta
     --------------------------------------- */

  const visibleCount =
    visible.length;

  if (
    meta &&
    skinGroups.length
  ) {
    if (
      query ||
      isFavoriteFilterActive()
    ) {
      meta.textContent =
        t('showingCount', {
          visible: formatNumber(
            visibleCount
          ),
          total: formatNumber(
            found.length
          )
        });
    }
  }

  /* ---------------------------------------
     Boş durum
     --------------------------------------- */

  empty.hidden =
    found.length !== 0;

  results.hidden =
    found.length === 0;

  const emptyTitle =
    empty.querySelector(
      'h2'
    );

  const emptyText =
    empty.querySelector(
      'p'
    );

  if (
    emptyTitle &&
    emptyText
  ) {
    if (
      isFavoriteFilterActive() &&
      favorites.size === 0
    ) {
      emptyTitle.textContent =
        t('noFavoritesYet');

      emptyText.textContent =
        t('noFavoritesYetHint');
    } else if (
      isFavoriteFilterActive() &&
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
}

/* =========================================
   SKIN MODALI
   ========================================= */

function openModal(
  group
) {
  if (
    !modal ||
    !downloadList ||
    !group?.primary
  ) {
    return;
  }

  const skin =
    group.primary;

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
    localizedName(skin);

  const displayChampion =
    localizedChampion(skin);

  /* ---------------------------------------
     Modal görseli
     --------------------------------------- */

  if (modalImage) {
    modalImage.src =
      skin.image ||
      '';

    modalImage.alt =
      `${displayName} — ${displayChampion}`;
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

     const modalFavoriteButton =
       document.querySelector(
     '#modal-favorite'
       );

     if (modalFavoriteButton) {
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

  group.skins.forEach(
    (item) => {
      const hasFile =
        fantomeFiles.has(
          String(item.id)
        );

      const element =
        document.createElement(
          hasFile
            ? 'a'
            : 'span'
        );

      element.className =
        `download-item${
          hasFile
            ? ''
            : ' unavailable'
        }`;

      const itemDisplayName =
        localizedName(item);

      const chromaName =
        itemDisplayName
          .match(
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
              name: itemDisplayName
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
    }
  );

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

  track(
    'skin_open',
    {
      skin_id:
        skin.id,

      skin_name:
        skin.name,

      champion:
        skin.champion
    }
  );
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

document
  .querySelector(
    '.modal-close'
  )
  ?.addEventListener(
    'click',
    closeSkinModal
  );

modal?.addEventListener(
  'click',
  (event) => {
    if (
      event.target ===
      modal
    ) {
      closeSkinModal();
    }
  }
);

/* =========================================
   ESC — MODALLAR
   ========================================= */

document.addEventListener(
  'keydown',
  (event) => {
    if (
      event.key !==
      'Escape'
    ) {
      return;
    }

    if (
      modal?.open
    ) {
      closeSkinModal();
      return;
    }

    if (
      discordModal?.open
    ) {
      closeDiscordModal();
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
   FAVORİ FİLTRESİ
   ========================================= */

favoriteFilter?.addEventListener(
  'click',
  () => {
    const active =
      !isFavoriteFilterActive();

    setFavoriteFilter(
      active
    );

    render();

    track(
      'favorite_filter',
      {
        active:
          active
            ? 1
            : 0
      }
    );
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

search?.addEventListener(
  'input',
  () => {
    render();

    scheduleSearchAnalytics();
  }
);

search?.addEventListener(
  'keydown',
  (event) => {
    if (
      event.key ===
      'Escape'
    ) {
      search.value =
        '';

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
  .forEach(
    (button) => {
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

          render();

          search.focus();

          scheduleSearchAnalytics();
        }
      );
    }
  );

/* =========================================
   FANTOME ID VERİLERİNİ NORMALİZE ET
   ========================================= */

function addFantomeFile(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return;
  }

  /*
   * JSON bazen:
   *
   * [29004, 29005]
   *
   * bazen de:
   *
   * ["29004", "29005"]
   *
   * gelebilir.
   */

  if (
    typeof value ===
    'object'
  ) {
    if (
      'id' in value
    ) {
      fantomeFiles.add(
        String(value.id)
      );
    }

    if (
      'skinId' in value
    ) {
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
    fantomeFiles.add(
      id
    );
  }
}

/* =========================================
   SKIN GRUPLARINI OLUŞTUR
   ========================================= */

function buildSkinGroups(
  skinList
) {
  const groups =
    new Map();

  skinList.forEach(
    (skin) => {
      const baseName =
        skin.name
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

      if (
        !groups.has(key)
      ) {
        groups.set(
          key,
          {
            primary:
              skin,
            skins: []
          }
        );
      }

      const group =
        groups.get(key);

      group.skins.push(
        skin
      );

      /*
       * Chroma olmayan ana skin
       * primary olarak kullanılır.
       */

      if (
        skin.name.trim() ===
        baseName
      ) {
        group.primary =
          skin;
      }
    }
  );

  return [
    ...groups.values()
  ].map(
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
  if (!search || !results || !empty) {
    console.error(
      'Gerekli HTML elementleri bulunamadı.'
    );

    return;
  }

  try {
    const [
      dataResponse,
      filesResponse
    ] =
      await Promise.all([
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

    if (
      !dataResponse.ok
    ) {
      throw new Error(
        `skins.json yüklenemedi (${dataResponse.status})`
      );
    }

    const data =
      await dataResponse.json();

    /* ---------------------------------------
       Fantome listesi
       --------------------------------------- */

    if (
      filesResponse.ok
    ) {
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
        (currentLang === 'en'
          ? 'Unknown'
          : 'Bilinmiyor');

      meta.textContent =
        t('metaVersion', {
          count: formatNumber(
            skinGroups.length
          ),
          version
        });
    }

    updateFavoriteCount();

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

    empty.hidden =
      false;

    results.hidden =
      true;

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
        t('dataLoadFailedTitle');
    }

    if (emptyText) {
      emptyText.textContent =
        t('dataLoadFailedHint');
    }
  }
}

/* =========================================
   BAŞLAT
   ========================================= */

applyStaticTranslations();

updateLangSwitchUI();

updateFavoriteCount();

setFavoriteFilter(
  false
);

await loadData();
