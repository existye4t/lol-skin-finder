import './style.css';

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
    favorites.size.toLocaleString(
      'tr-TR'
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
      ? 'Favorilerden çıkar'
      : 'Favorilere ekle'
  );

  button.title =
    favorite
      ? 'Favorilerden çıkar'
      : 'Favorilere ekle';

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
      ? 'Tüm skinleri göster'
      : 'Favorileri göster'
  );

  favoriteFilter.title =
    active
      ? 'Tüm skinleri göster'
      : 'Favorileri göster';
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
            skin.champion,
            skin.id
          ].join(' ')
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
    image
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

  if (image) {
    image.src =
      skin.image ||
      '';

    image.alt =
      `${skin.name} — ${skin.champion}`;

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
      skin.champion;
  }

  if (nameElement) {
    nameElement.textContent =
      skin.name;
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
    `${skin.name}, ${skin.champion}, ID ${skin.id}. Detayları aç`
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
        ? `${found.length} favori sonuç`
        : `${found.length} favori`;
  } else {
    title.textContent =
      query
        ? `${found.length} sonuç bulundu`
        : 'Skinleri keşfet';
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
        `${visibleCount.toLocaleString(
          'tr-TR'
        )}/${found.length.toLocaleString(
          'tr-TR'
        )} gösteriliyor`;
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
        'Henüz favorin yok';

      emptyText.textContent =
        'Skin kartındaki yıldız simgesine tıklayarak favorilerine ekleyebilirsin.';
    } else if (
      isFavoriteFilterActive() &&
      found.length === 0
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

  /* ---------------------------------------
     Modal görseli
     --------------------------------------- */

  if (modalImage) {
    modalImage.src =
      skin.image ||
      '';

    modalImage.alt =
      `${skin.name} — ${skin.champion}`;
  }

  /* ---------------------------------------
     Modal bilgileri
     --------------------------------------- */

  if (modalChampion) {
    modalChampion.textContent =
      skin.champion;
  }

  if (modalSkinName) {
    modalSkinName.textContent =
      skin.name;
  }

  if (modalSkinId) {
    modalSkinId.textContent =
      `RIOT SKIN ID: ${skin.id}`;
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

      const chromaName =
        item.name
          .match(
            /\(([^)]+)\)$/
          )?.[1];

      element.textContent =
        item === skin
          ? `Ana skin · ${item.id}`
          : `${
              chromaName ||
              item.name
            } · ${item.id}`;

      if (hasFile) {
        element.href =
          assetUrl(
            `fantome/${item.id}.fantome`
          );

        element.download =
          `${item.id}.fantome`;

        element.title =
          `${item.id}.fantome indir`;

        element.setAttribute(
          'aria-label',
          `${item.name} fantome dosyasını indir`
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
          'Bu dosya klasörde bulunamadı';

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
        'Bilinmiyor';

      meta.textContent =
        `${skinGroups.length.toLocaleString(
          'tr-TR'
        )} ana skin • Yama ${version}`;
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
        'Skin verisi yüklenemedi';
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
        'Skin verileri yüklenemedi';
    }

    if (emptyText) {
      emptyText.textContent =
        'data/skins.json dosyasının mevcut olduğundan ve geçerli JSON içerdiğinden emin olun.';
    }
  }
}

/* =========================================
   BAŞLAT
   ========================================= */

updateFavoriteCount();

setFavoriteFilter(
  false
);

await loadData();
