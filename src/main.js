import './style.css';

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

const FAVORITES_STORAGE_KEY = 'exist-lol-skin-favorites';

let favorites = new Set();

try {
  const savedFavorites = JSON.parse(
    localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]'
  );

  if (Array.isArray(savedFavorites)) {
    favorites = new Set(savedFavorites.map(String));
  }
} catch {
  favorites = new Set();
}

function saveFavorites() {
  try {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify([...favorites])
    );
  } catch {
    // localStorage kullanılamıyorsa devam et.
  }
}

function isFavorite(skinId) {
  return favorites.has(String(skinId));
}

function toggleFavorite(skinId, button) {
  const id = String(skinId);

  if (favorites.has(id)) {
    favorites.delete(id);
  } else {
    favorites.add(id);
  }

  saveFavorites();

  updateFavoriteButton(button, id);
  updateFavoriteCount();

  /*
   * Favoriler filtresi açıksa favoriden çıkarılan
   * kartı anında ekrandan kaldır.
   */
  if (isFavoriteFilterActive()) {
    render();
  }

  track('favorite_toggle', {
    skin_id: id,
    is_favorite: favorites.has(id) ? 1 : 0
  });
}

function updateFavoriteButton(button, skinId) {
  if (!button) return;

  const favorite = isFavorite(skinId);

  button.classList.toggle('is-favorite', favorite);

  button.setAttribute(
    'aria-pressed',
    favorite ? 'true' : 'false'
  );

  button.setAttribute(
    'aria-label',
    favorite
      ? 'Favorilerden çıkar'
      : 'Favorilere ekle'
  );

  button.title = favorite
    ? 'Favorilerden çıkar'
    : 'Favorilere ekle';

  const icon = button.querySelector('.favorite-icon');

  if (icon) {
    icon.textContent = favorite ? '★' : '☆';
  }
}

function updateFavoriteCount() {
  const favoriteCount =
    document.querySelector('#favorite-count');

  if (!favoriteCount) return;

  favoriteCount.textContent = favorites.size;
  favoriteCount.hidden = favorites.size === 0;
}

/* =========================================
   VERİLER
   ========================================= */

let skins = [];
let skinGroups = [];

let searchTrackingTimer;
let lastTrackedSearch = '';

const assetUrl = (path) =>
  `${import.meta.env.BASE_URL}${path}`;

const track = (eventName, parameters) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, parameters);
  }
};

const normalize = (value) =>
  String(value)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '');

/* =========================================
   FAVORİ FİLTRESİ
   ========================================= */

const favoriteFilter =
  document.querySelector('#favorite-filter');

function isFavoriteFilterActive() {
  return Boolean(
    favoriteFilter?.classList.contains('is-active')
  );
}

function setFavoriteFilter(active) {
  if (!favoriteFilter) return;

  favoriteFilter.classList.toggle(
    'is-active',
    active
  );

  favoriteFilter.setAttribute(
    'aria-pressed',
    active ? 'true' : 'false'
  );
}

/* =========================================
   ARAMA EŞLEŞMESİ
   ========================================= */

function groupMatchesSearch(group, query) {
  if (!query) return true;

  return normalize(
    group.skins
      .map(
        (skin) =>
          `${skin.name} ${skin.champion} ${skin.id}`
      )
      .join(' ')
  ).includes(query);
}

function groupHasFavorite(group) {
  return group.skins.some((skin) =>
    isFavorite(skin.id)
  );
}

/* =========================================
   SKIN KARTI
   ========================================= */

function createSkinCard(group) {
  const skin = group.primary;
  const card = template.content.cloneNode(true);

  const image = card.querySelector('img');

  image.src = skin.image;
  image.alt = `${skin.name} — ${skin.champion}`;

  card.querySelector('.champion').textContent =
    skin.champion;

  card.querySelector('h3').textContent =
    skin.name;

  card.querySelector('.skin-id').textContent =
    `ID: ${skin.id}`;

  const article =
    card.querySelector('.skin-card');

  /* =====================================
     FAVORİ BUTONU
     ===================================== */

  let favoriteButton =
    card.querySelector('.favorite-button');

  /*
   * Template içinde buton yoksa otomatik oluştur.
   */
  if (!favoriteButton) {
    favoriteButton =
      document.createElement('button');

    favoriteButton.type = 'button';
    favoriteButton.className =
      'favorite-button';

    favoriteButton.innerHTML =
      '<span class="favorite-icon" aria-hidden="true">☆</span>';

    article.appendChild(favoriteButton);
  }

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

  /* =====================================
     KART ERİŞİLEBİLİRLİĞİ
     ===================================== */

  article.tabIndex = 0;
  article.setAttribute(
    'role',
    'button'
  );

  article.setAttribute(
    'aria-label',
    `${skin.name} detayını aç`
  );

  /* =====================================
     MODAL
     ===================================== */

  article.addEventListener(
    'click',
    () => openModal(group)
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
   SKINLERİ RENDER ET
   ========================================= */

function render() {
  const query = normalize(search.value);

  /*
   * Önce arama sonuçlarını bul.
   */
  let found = skinGroups.filter((group) =>
    groupMatchesSearch(group, query)
  );

  /*
   * Favoriler filtresi açıksa yalnızca
   * favorisi bulunan grupları göster.
   */
  if (isFavoriteFilterActive()) {
    found = found.filter((group) =>
      groupHasFavorite(group)
    );
  }

  /*
   * Arama yoksa 24,
   * arama varsa 80,
   * favoriler filtresinde de 80 göster.
   */
  const visible = found.slice(
    0,
    query || isFavoriteFilterActive()
      ? 80
      : 24
  );

  results.replaceChildren(
    ...visible.map((group) =>
      createSkinCard(group)
    )
  );

  const count = found.length;

  /* =====================================
     BAŞLIK
     ===================================== */

  if (isFavoriteFilterActive()) {
    title.textContent = query
      ? `${count} favori sonuç`
      : `${count} favori`;
  } else {
    title.textContent = query
      ? `${count} sonuç bulundu`
      : 'Skinleri keşfet';
  }

  /* =====================================
     BOŞ DURUM
     ===================================== */

  empty.hidden = count !== 0;
  results.hidden = count === 0;

  /*
   * Favoriler filtresi açık ve favori yoksa
   * daha açıklayıcı mesaj göster.
   */
  const emptyTitle =
    empty.querySelector('h2');

  const emptyText =
    empty.querySelector('p');

  if (emptyTitle && emptyText) {
    if (
      isFavoriteFilterActive() &&
      favorites.size === 0
    ) {
      emptyTitle.textContent =
        'Henüz favorin yok';

      emptyText.textContent =
        'Skin kartındaki yıldız simgesine tıklayarak favorilerine ekleyebilirsin.';
    } else if (
      isFavoriteFilterActive() &&
      count === 0
    ) {
      emptyTitle.textContent =
        'Favori skin bulunamadı';

      emptyText.textContent =
        query
          ? 'Bu arama için favorilerinde eşleşen skin bulunamadı.'
          : 'Henüz favorilerine eklediğin bir skin yok.';
    } else {
      emptyTitle.textContent =
        'Sonuç bulunamadı';

      emptyText.textContent =
        'Skin adı, şampiyon adı veya ID ile yeniden deneyin.';
    }
  }

  updateFavoriteCount();
}

/* =========================================
   SKIN MODALI
   ========================================= */

function openModal(group) {
  const skin = group.primary;

  document.querySelector(
    '#modal-image'
  ).src = skin.image;

  document.querySelector(
    '#modal-image'
  ).alt =
    `${skin.name} — ${skin.champion}`;

  document.querySelector(
    '#modal-champion'
  ).textContent =
    skin.champion;

  document.querySelector(
    '#modal-skin-name'
  ).textContent =
    skin.name;

  document.querySelector(
    '#modal-skin-id'
  ).textContent =
    `RIOT SKIN ID: ${skin.id}`;

  downloadList.replaceChildren(
    ...group.skins.map((item) => {
      const hasFile =
        fantomeFiles.has(String(item.id));

      const link =
        document.createElement(
          hasFile ? 'a' : 'span'
        );

      link.className =
        `download-item${
          hasFile
            ? ''
            : ' unavailable'
        }`;

      link.textContent =
        item === skin
          ? `Ana skin · ${item.id}`
          : `${
              item.name.match(
                /\(([^)]+)\)$/
              )?.[1] ?? item.name
            } · ${item.id}`;

      if (hasFile) {
        link.href = assetUrl(
          `fantome/${item.id}.fantome`
        );

        link.download =
          `${item.id}.fantome`;

        link.title =
          `${item.id}.fantome indir`;

        link.addEventListener(
          'click',
          () => {
            track(
              'fantome_download',
              {
                skin_id: item.id,
                skin_name: item.name,
                champion: item.champion,
                is_chroma:
                  item !== skin ? 1 : 0
              }
            );
          }
        );
      } else {
        link.title =
          'Bu dosya klasörde bulunamadı';
      }

      return link;
    })
  );

  modal.showModal();
}

document
  .querySelector('.modal-close')
  ?.addEventListener(
    'click',
    () => modal.close()
  );

modal?.addEventListener(
  'click',
  (event) => {
    if (event.target === modal) {
      modal.close();
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
  if (!discordModal) return;

  discordModal.showModal();

  track(
    'discord_contact_open',
    {
      discord_username:
        'existofficial'
    }
  );
}

function closeDiscordModal() {
  if (!discordModal) return;

  discordModal.close();
}

if (
  discordButton &&
  discordModal
) {
  discordButton.addEventListener(
    'click',
    openDiscordModal
  );

  if (discordClose) {
    discordClose.addEventListener(
      'click',
      closeDiscordModal
    );
  }

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
   FAVORİ FİLTRESİ BUTONU
   ========================================= */

if (favoriteFilter) {
  favoriteFilter.addEventListener(
    'click',
    () => {
      const active =
        !isFavoriteFilterActive();

      setFavoriteFilter(active);

      render();

      track(
        'favorite_filter',
        {
          active: active ? 1 : 0
        }
      );
    }
  );
}

/* =========================================
   ARAMA ANALYTICS
   ========================================= */

function scheduleSearchAnalytics() {
  clearTimeout(
    searchTrackingTimer
  );

  searchTrackingTimer =
    setTimeout(() => {
      const term =
        search.value.trim();

      if (
        !term ||
        normalize(term) ===
          lastTrackedSearch
      ) {
        return;
      }

      lastTrackedSearch =
        normalize(term);

      const resultCount =
        skinGroups.filter(
          (group) =>
            groupMatchesSearch(
              group,
              lastTrackedSearch
            )
        ).length;

      track(
        'search',
        {
          search_term:
            term.slice(0, 100),
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

search.addEventListener(
  'input',
  () => {
    render();
    scheduleSearchAnalytics();
  }
);

search.addEventListener(
  'keydown',
  (event) => {
    if (
      event.key === 'Escape'
    ) {
      search.value = '';

      setFavoriteFilter(false);

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
        search.value =
          button.dataset.query;

        setFavoriteFilter(false);

        render();

        search.focus();
      }
    );
  });

/* =========================================
   VERİLERİ YÜKLE
   ========================================= */

try {
  const [
    data,
    files
  ] = await Promise.all([
    fetch(
      assetUrl(
        'data/skins.json'
      )
    ).then((response) => {
      if (!response.ok) {
        throw new Error(
          'Veri dosyası bulunamadı'
        );
      }

      return response.json();
    }),

    fetch(
      assetUrl(
        'data/fantome-files.json'
      )
    ).then(
      (response) =>
        response.ok
          ? response.json()
          : []
    )
  ]);

  /* =====================================
     FANTOME DOSYALARI
     ===================================== */

  files.forEach((id) => {
    fantomeFiles.add(String(id));
  });

  /* =====================================
     SKIN VERİLERİ
     ===================================== */

  skins = Array.isArray(data.skins)
    ? data.skins
    : [];

  const groups = new Map();

  skins.forEach((skin) => {
    const baseName =
      skin.name
        .trim()
        .replace(
          /\s*\([^)]+\)$/,
          ''
        );

    const key =
      `${skin.championId}:${baseName}`;

    if (!groups.has(key)) {
      groups.set(key, {
        primary: skin,
        skins: []
      });
    }

    const group =
      groups.get(key);

    group.skins.push(skin);

    /*
     * Chroma olmayan ana skin'i primary yap.
     */
    if (
      skin.name.trim() ===
      baseName
    ) {
      group.primary = skin;
    }
  });

  /* =====================================
     GRUPLARI HAZIRLA
     ===================================== */

  skinGroups =
    [...groups.values()]
      .map((group) => ({
        ...group,

        skins:
          group.skins.sort(
            (a, b) =>
              a === group.primary
                ? -1
                : b ===
                    group.primary
                  ? 1
                  : a.name.localeCompare(
                      b.name,
                      'tr'
                    )
          )
      }));

  /* =====================================
     META
     ===================================== */

  meta.textContent =
    skins.length
      ? `${skinGroups.length.toLocaleString(
          'tr-TR'
        )} ana skin • Yama ${
          data.version
        }`
      : 'Önce veri güncellemesi gerekli';

  updateFavoriteCount();

  render();

} catch (error) {
  console.error(
    'Skin verileri yüklenemedi:',
    error
  );

  meta.textContent =
    'Skin verisi yüklenemedi';

  empty.hidden = false;
  results.hidden = true;
}
