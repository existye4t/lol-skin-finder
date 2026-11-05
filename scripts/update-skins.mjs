import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DATA_DIR,
  RAW_BASE_URL,
  PATHS
} from './config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com';
const CDRAGON_LIVE_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data';
const CDRAGON_PBE_BASE = 'https://raw.communitydragon.org/pbe/plugins/rcp-be-lol-game-data';

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'lol-skin-finder-updater' }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} -> ${url}`);
  }
  return response.json();
}

async function loadJsonIfExists(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function imageUrlFromSplashPath(splashPath, branch = 'latest') {
  if (!splashPath) return '';
  if (splashPath.startsWith('http://') || splashPath.startsWith('https://')) {
    return splashPath;
  }
  const normalizedPath = String(splashPath)
    .replace(/^\/lol-game-data\/assets\/assets\//i, 'assets/')
    .replace(/^\/lol-game-data\/assets\//i, '')
    .replace(/^lol-game-data\/assets\//i, '')
    .toLowerCase();
  return `https://raw.communitydragon.org/${branch}/plugins/rcp-be-lol-game-data/global/default/${normalizedPath}`;
}

function formatChromaDisplayName(baseSkinName, chromaRawName) {
  const base = String(baseSkinName || '').trim();
  const raw = String(chromaRawName || '').trim();
  if (!raw) return base;
  if (raw.toLowerCase().startsWith(base.toLowerCase()) && raw.includes('(')) {
    return raw;
  }
  return `${base} (${raw})`;
}

async function loadAdminOverrides() {
  const data = await loadJsonIfExists(PATHS.adminOverrides, null);
  if (!data) {
    console.log('[update-data] admin-overrides.json bulunamadı, override uygulanmayacak.');
    return null;
  }
  const directCount = Object.keys(data.overrides || {}).length;
  const legacyCount = Object.keys(data.skinOverrides || {}).length;
  console.log(`[update-data] admin-overrides.json yüklendi: ${directCount} doğrudan override, ${legacyCount} skinOverride, ${(data.customSkins || []).length} özel skin.`);
  return data;
}

/**
 * Admin override'larını uygular ve PBE / pending / synthetic girdilerle çakışma olup olmadığını raporlar.
 */
function applyAdminOverrides(skins, overridesData) {
  if (!overridesData) return { skins, conflicts: [] };

  let result = [...skins];
  const conflicts = [];

  if (Array.isArray(overridesData.deletedSkins) && overridesData.deletedSkins.length > 0) {
    const deletedSet = new Set(overridesData.deletedSkins.map(String));
    result = result.filter(s => !deletedSet.has(String(s.id)));
  }

  const directOverrides = overridesData.overrides || {};
  const skinOverrides = overridesData.skinOverrides || {};
  const priceOverrides = overridesData.priceOverrides || {};

  result = result.map(skin => {
    const idStr = String(skin.id);
    let updated = { ...skin };

    if ((skin.isPbe || skin.isPending) && (directOverrides[idStr] || skinOverrides[idStr])) {
      conflicts.push({
        id: idStr,
        name: skin.name,
        isPbe: Boolean(skin.isPbe),
        isPending: Boolean(skin.isPending),
        overrideName: (directOverrides[idStr] || skinOverrides[idStr])?.name
      });
    }

    if (directOverrides[idStr]) {
      const ov = directOverrides[idStr];
      if (ov.deleted) return null;
      if (ov.name) {
        updated.name = ov.name;
        updated.nameTr = ov.name;
      }
      if (ov.nameTr) {
        updated.nameTr = ov.nameTr;
        updated.name = ov.nameTr;
      }
      if (ov.nameEn) updated.nameEn = ov.nameEn;
      if (ov.champion) {
        updated.champion = ov.champion;
        updated.championTr = ov.champion;
      }
      if (ov.championTr) {
        updated.championTr = ov.championTr;
        updated.champion = ov.championTr;
      }
      if (ov.championEn) updated.championEn = ov.championEn;
      if (ov.championId) updated.championId = ov.championId;
      if (ov.image && !String(ov.image).startsWith('images/skins/')) {
        updated.image = ov.image;
      }
      if (ov.imageFallback !== undefined) {
        updated.imageFallback = ov.imageFallback;
      }
      if (ov.customFantome !== undefined) {
        updated.customFantome = ov.customFantome;
      }
    }

    if (skinOverrides[idStr]) {
      updated = { ...updated, ...skinOverrides[idStr], id: skin.id };
    }

    if (priceOverrides[idStr] !== undefined) {
      updated.price = priceOverrides[idStr];
    }

    return updated;
  }).filter(Boolean);

  // Henüz listede olmayan override kayıtlarını (örn. 18080 Ölümsüz Efsane Tristana) ekle
  const existingIds = new Set(result.map(s => String(s.id)));
  for (const [ovId, ov] of Object.entries(directOverrides)) {
    if (existingIds.has(String(ovId)) || ov.deleted) continue;
    const numId = Number(ovId);
    const skinNum = Number.isFinite(numId) ? numId % 1000 : 0;
    const nameTr = ov.nameTr || ov.name || ov.nameEn || `Skin #${ovId}`;
    const nameEn = ov.nameEn || ov.name || `Skin #${ovId}`;
    const champTr = ov.championTr || ov.champion || ov.championId || 'Unknown';
    const champEn = ov.championEn || ov.champion || ov.championId || 'Unknown';
    result.push({
      id: String(ovId),
      skinNum,
      name: nameTr,
      champion: champTr,
      nameTr,
      championTr: champTr,
      nameEn,
      championEn: champEn,
      championId: ov.championId || 'Unknown',
      image: ov.image || '',
      imageFallback: ov.imageFallback || '',
      ...(ov.parentSkinId ? { parentSkinId: String(ov.parentSkinId) } : {}),
      ...(ov.customFantome ? { customFantome: true } : {})
    });
    existingIds.add(String(ovId));
  }

  if (Array.isArray(overridesData.customSkins) && overridesData.customSkins.length > 0) {
    for (const customSkin of overridesData.customSkins) {
      if (customSkin.id && !existingIds.has(String(customSkin.id))) {
        result.push({ ...customSkin, isCustom: true });
        existingIds.add(String(customSkin.id));
      }
    }
  }

  return { skins: result, conflicts };
}

async function main() {
  const args = process.argv.slice(2);
  if (!existsSync(PATHS.manifest) || args.includes('--refresh-manifest')) {
    console.log('[update-data] fantome-manifest.json hazırlanıyor...');
    execFileSync(process.execPath, [path.join(__dirname, 'prepare-fantome.mjs')], {
      stdio: 'inherit'
    });
  }

  const manifest = await loadJsonIfExists(PATHS.manifest);
  if (!manifest || !manifest.entries) {
    throw new Error('fantome-manifest.json okunamadı!');
  }

  const adminOverrides = await loadAdminOverrides();

  console.log('[update-data] Data Dragon sürümü kontrol ediliyor...');
  const versions = await fetchJson(`${DDRAGON_BASE}/api/versions.json`);
  const latestVersion = versions[0];
  console.log(`[update-data] Güncel Data Dragon sürümü: ${latestVersion}`);

  const [champListTr, champListEn, trSkins, enSkins, pbeTrSkins, pbeEnSkins, rainbowCycles, classicIndex] = await Promise.all([
    fetchJson(`${DDRAGON_BASE}/cdn/${latestVersion}/data/tr_TR/champion.json`),
    fetchJson(`${DDRAGON_BASE}/cdn/${latestVersion}/data/en_US/champion.json`),
    fetchJson(`${CDRAGON_LIVE_BASE}/global/tr_tr/v1/skins.json`),
    fetchJson(`${CDRAGON_LIVE_BASE}/global/default/v1/skins.json`),
    fetchJson(`${CDRAGON_PBE_BASE}/global/tr_tr/v1/skins.json`).catch(() => ({})),
    fetchJson(`${CDRAGON_PBE_BASE}/global/default/v1/skins.json`).catch(() => ({})),
    fetchJson(`${RAW_BASE_URL}rainbow/chroma-cycles.json`),
    fetchJson(`${RAW_BASE_URL}classic/index.json`)
  ]);

  // Manifest bayraklarını topla (URL gömmeden sadece hasRainbow, hasClassic ve forms)
  const rainbowSkinIds = new Set();
  const classicSkinIds = new Set();
  const formsByParentId = new Map();
  for (const entry of Object.values(manifest.entries)) {
    if (!entry.enabled) continue;
    if (entry.c === 'rainbow') {
      rainbowSkinIds.add(String(entry.id));
    } else if (entry.c === 'classic') {
      const num = Number(entry.id);
      if (num >= 60000000) {
        classicSkinIds.add(String(num - 60000000));
      }
    } else if (entry.type === 'form' && entry.pId) {
      const pIdStr = String(entry.pId);
      if (!formsByParentId.has(pIdStr)) formsByParentId.set(pIdStr, []);
      formsByParentId.get(pIdStr).push({
        id: String(entry.id),
        name: entry.name,
        nameEn: entry.name,
        ...(entry.c === 'pbe' ? { isPbe: true } : {})
      });
    }
  }

  const parentSkinById = new Map();
  Object.values(trSkins).forEach(skin => {
    skin.chromas?.forEach(chroma => {
      parentSkinById.set(String(chroma.id), String(skin.id));
    });
  });

  const entries = Object.values(champListTr.data);
  console.log(`[update-data] ${entries.length} şampiyon detayı indiriliyor...`);

  const details = [];
  const batchSize = 20;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const batchDetails = await Promise.all(
      batch.map(async ({ id }) => {
        const [trDetail, enDetail] = await Promise.all([
          fetchJson(`${DDRAGON_BASE}/cdn/${latestVersion}/data/tr_TR/champion/${id}.json`).catch(() =>
            fetchJson(`${DDRAGON_BASE}/cdn/${latestVersion}/data/en_US/champion/${id}.json`)
          ),
          fetchJson(`${DDRAGON_BASE}/cdn/${latestVersion}/data/en_US/champion/${id}.json`).catch(() => null)
        ]);
        return { trDetail, enDetail };
      })
    );
    details.push(...batchDetails);
  }

  const allSkins = [];
  const existingIds = new Set();
  const champByIdMap = new Map();
  const champByKeyMap = new Map();

  // 1. CANLI SKİNLER VE CHROMALAR
  for (const { trDetail, enDetail } of details) {
    const champion = Object.values(trDetail.data)[0];
    const championEn = enDetail ? Object.values(enDetail.data)[0] : null;
    const champMeta = {
      id: champion.id,
      key: Number(champion.key),
      nameTr: champion.name,
      nameEn: championEn?.name || champion.name
    };
    champByIdMap.set(champMeta.id, champMeta);
    champByKeyMap.set(champMeta.key, champMeta);

    champion.skins.forEach((skin, index) => {
      const skinEn = championEn?.skins?.[index];
      const id = `${champion.key}${String(skin.num).padStart(3, '0')}`;
      const trSkin = trSkins[id];
      const enSkin = enSkins[id];
      const parentId = parentSkinById.get(id);

      const baseNameTr = trSkin?.name || (skin.name === 'default' ? champion.name : skin.name);
      const baseNameEn =
        enSkin?.name ||
        (skinEn
          ? skinEn.name === 'default'
            ? championEn.name || champion.name
            : skinEn.name
          : skin.name === 'default'
            ? champion.name
            : skin.name);

      const entry = {
        id,
        skinNum: skin.num,
        name: baseNameTr,
        champion: champion.name,
        nameTr: baseNameTr,
        championTr: champion.name,
        nameEn: baseNameEn,
        championEn: championEn?.name || champion.name,
        championId: champion.id,
        image: `${DDRAGON_BASE}/cdn/img/champion/splash/${champion.id}_${skin.num}.jpg`,
        imageFallback: imageUrlFromSplashPath(trSkin?.splashPath || enSkin?.splashPath, 'latest'),
        ...(parentId ? { parentSkinId: parentId } : {})
      };

      if (rainbowSkinIds.has(id)) {
        entry.hasRainbow = true;
      }
      if (classicSkinIds.has(id)) {
        entry.hasClassic = true;
      }
      if (formsByParentId.has(id)) {
        entry.forms = formsByParentId.get(id);
      }

      allSkins.push(entry);
      existingIds.add(id);
    });

    // Data Dragon champion.skins listesinde olmayıp yalnızca CommunityDragon'da yer alan chromaları ekle
    champion.skins.forEach((skin, index) => {
      const skinEn = championEn?.skins?.[index];
      const id = `${champion.key}${String(skin.num).padStart(3, '0')}`;
      const trSkin = trSkins[id];
      const enSkin = enSkins[id];
      if (!trSkin?.chromas?.length) return;

      const baseNameTr = trSkin?.name || (skin.name === 'default' ? champion.name : skin.name);
      const baseNameEn =
        enSkin?.name ||
        (skinEn
          ? skinEn.name === 'default'
            ? championEn.name || champion.name
            : skinEn.name
          : skin.name === 'default'
            ? champion.name
            : skin.name);

      const cdChromasTr = trSkin.chromas || [];
      const cdChromasEnMap = new Map((enSkin?.chromas || []).map(c => [String(c.id), c]));

      for (const ch of cdChromasTr) {
        const chId = String(ch.id);
        if (existingIds.has(chId)) continue;
        const chEn = cdChromasEnMap.get(chId);
        const chNum = Number(chId) % 1000;
        const fullChromaTr = formatChromaDisplayName(baseNameTr, ch.name);
        const fullChromaEn = formatChromaDisplayName(baseNameEn, chEn?.name || ch.name);

        const chromaEntry = {
          id: chId,
          skinNum: chNum,
          name: fullChromaTr,
          champion: champion.name,
          nameTr: fullChromaTr,
          championTr: champion.name,
          nameEn: fullChromaEn,
          championEn: championEn?.name || champion.name,
          championId: champion.id,
          image: `${DDRAGON_BASE}/cdn/img/champion/splash/${champion.id}_${chNum}.jpg`,
          imageFallback: imageUrlFromSplashPath(ch.chromaPath || chEn?.chromaPath, 'latest'),
          parentSkinId: id
        };

        if (classicSkinIds.has(chId)) {
          chromaEntry.hasClassic = true;
        }

        allSkins.push(chromaEntry);
        existingIds.add(chId);
      }
    });
  }

  // 2. PBE SKİNLERİ VE CHROMALARI (Canlıda zaten varsa eklenmez, canlı sürüm kazanır)
  let pbeBaseAdded = 0;
  let pbeChromaAdded = 0;

  const pbeEntries = Object.values(manifest.entries).filter(
    e => e.c === 'pbe' && e.enabled && (e.type === 'base' || e.type === 'chroma')
  );

  // Önce PBE ana skinlerini, sonra PBE chromalarını işle
  pbeEntries.sort((a, b) => (a.type === 'base' ? -1 : 1) - (b.type === 'base' ? -1 : 1));

  const pbeBaseNamesById = new Map();
  for (const pbeEntry of pbeEntries) {
    const idStr = String(pbeEntry.id);
    if (existingIds.has(idStr)) continue;

    const skinIdNum = Number(idStr);
    const champ = champByIdMap.get(pbeEntry.champ) || champByKeyMap.get(Math.floor(skinIdNum / 1000));
    if (!champ) continue;

    const skinNum = skinIdNum % 1000;

    if (pbeEntry.type === 'base') {
      const cdTr = pbeTrSkins[idStr] || trSkins[idStr];
      const cdEn = pbeEnSkins[idStr] || enSkins[idStr];
      const nameTr = cdTr?.name || pbeEntry.name;
      const nameEn = cdEn?.name || pbeEntry.name;
      pbeBaseNamesById.set(idStr, { nameTr, nameEn, cdTr, cdEn });

      const splashFallback = imageUrlFromSplashPath(
        cdTr?.splashPath || cdEn?.splashPath || cdEn?.uncenteredSplashPath,
        'pbe'
      );

      const skinObj = {
        id: idStr,
        skinNum,
        name: nameTr,
        champion: champ.nameTr,
        nameTr,
        championTr: champ.nameTr,
        nameEn,
        championEn: champ.nameEn,
        championId: champ.id,
        image: splashFallback || `${DDRAGON_BASE}/cdn/img/champion/splash/${champ.id}_${skinNum}.jpg`,
        imageFallback: splashFallback,
        isPbe: true
      };

      if (formsByParentId.has(idStr)) {
        skinObj.forms = formsByParentId.get(idStr);
      }

      allSkins.push(skinObj);
      existingIds.add(idStr);
      pbeBaseAdded++;
    } else if (pbeEntry.type === 'chroma') {
      const parentIdStr = String(pbeEntry.pId);
      const parentInfo = pbeBaseNamesById.get(parentIdStr);
      const cdParentTr = parentInfo?.cdTr || pbeTrSkins[parentIdStr] || trSkins[parentIdStr];
      const cdParentEn = parentInfo?.cdEn || pbeEnSkins[parentIdStr] || enSkins[parentIdStr];

      const chTrObj = (cdParentTr?.chromas || []).find(c => String(c.id) === idStr);
      const chEnObj = (cdParentEn?.chromas || []).find(c => String(c.id) === idStr);

      const baseNameTr = parentInfo?.nameTr || cdParentTr?.name || champ.nameTr;
      const baseNameEn = parentInfo?.nameEn || cdParentEn?.name || champ.nameEn;

      const fullChromaTr = formatChromaDisplayName(baseNameTr, chTrObj?.name || pbeEntry.name);
      const fullChromaEn = formatChromaDisplayName(baseNameEn, chEnObj?.name || pbeEntry.name);

      const chromaPreview = imageUrlFromSplashPath(
        chTrObj?.chromaPath || chEnObj?.chromaPath || cdParentEn?.splashPath,
        'pbe'
      );

      allSkins.push({
        id: idStr,
        skinNum,
        name: fullChromaTr,
        champion: champ.nameTr,
        nameTr: fullChromaTr,
        championTr: champ.nameTr,
        nameEn: fullChromaEn,
        championEn: champ.nameEn,
        championId: champ.id,
        image: chromaPreview || `${DDRAGON_BASE}/cdn/img/champion/splash/${champ.id}_${skinNum}.jpg`,
        imageFallback: chromaPreview,
        parentSkinId: parentIdStr,
        isPbe: true
      });
      existingIds.add(idStr);
      pbeChromaAdded++;
    }
  }

  // 3. PENDING GİRDİLERİ (Henüz Data Dragon/CommunityDragon'da olmayan ama Yimikami'de bulunanlar)
  const pendingEntries = Object.values(manifest.entries).filter(
    e => e.status === 'pending' && e.enabled && (e.c === 'skins' || e.c === 'pbe')
  );
  for (const pend of pendingEntries) {
    const idStr = String(pend.id);
    if (existingIds.has(idStr)) continue;
    const champ = champByIdMap.get(pend.champ);
    if (!champ) continue;
    const defaultSplash = `${DDRAGON_BASE}/cdn/img/champion/splash/${champ.id}_0.jpg`;
    allSkins.push({
      id: idStr,
      skinNum: 999,
      name: pend.name,
      champion: champ.nameTr,
      nameTr: pend.name,
      championTr: champ.nameTr,
      nameEn: pend.name,
      championEn: champ.nameEn,
      championId: champ.id,
      image: defaultSplash,
      imageFallback: '',
      isPending: true,
      ...(pend.c === 'pbe' ? { isPbe: true } : {})
    });
    existingIds.add(idStr);
  }

  // 4. ADMIN OVERRIDES UYGULA
  const { skins: overriddenSkins, conflicts: overrideConflicts } = applyAdminOverrides(allSkins, adminOverrides);
  if (overrideConflicts.length > 0) {
    console.warn(`[update-data] Uyarı: ${overrideConflicts.length} PBE/Pending girdisi admin-overrides.json ile çakıştı:`, overrideConflicts);
  } else {
    console.log('[update-data] Admin override kontrolü: PBE/Pending girdileriyle herhangi bir çakışma yok.');
  }

  overriddenSkins.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  // 5. RAINBOW.JSON (Lazy-Load Verisi — URL gömülmez)
  const skinByIdMap = new Map(overriddenSkins.map(s => [String(s.id), s]));
  const rainbowItems = [];
  for (const cycle of rainbowCycles.packages || []) {
    const champ =
      champByIdMap.get(cycle.champion) ||
      [...champByIdMap.values()].find(
        c => c.id.toLowerCase() === cycle.champion.toLowerCase() || c.nameEn.toLowerCase() === cycle.champion.toLowerCase()
      );
    if (!champ) continue;
    const skinIdNum = champ.key * 1000 + Number(cycle.skin);
    const idStr = String(skinIdNum);
    const manifestEntry = manifest.entries[`rainbow:${idStr}`];
    if (!manifestEntry || !manifestEntry.enabled) continue;
    const liveSkin = skinByIdMap.get(idStr);
    const fallbackName = cycle.path.split('/').pop().replace(/\.fantome$/, '');
    const nameTr = liveSkin?.nameTr || liveSkin?.name || fallbackName;
    const nameEn = liveSkin?.nameEn || fallbackName;
    const image = liveSkin?.image || `${DDRAGON_BASE}/cdn/img/champion/splash/${champ.id}_${cycle.skin}.jpg`;
    const imageFallback = liveSkin?.imageFallback || '';

    rainbowItems.push({
      id: idStr,
      skinNum: Number(cycle.skin),
      name: nameTr,
      champion: champ.nameTr,
      nameTr,
      championTr: champ.nameTr,
      nameEn,
      championEn: champ.nameEn,
      championId: champ.id,
      image,
      imageFallback,
      collection: 'rainbow',
      cycleCount: Array.isArray(cycle.states) ? cycle.states.length : 0,
      states: (cycle.states || []).map(st => ({
        id: String(st.skinId),
        name: st.name
      }))
    });
  }
  rainbowItems.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  // 6. CLASSIC.JSON (Lazy-Load Verisi — URL gömülmez, 1.803 paketin tamamı)
  const classicItems = [];
  for (const cChamp of classicIndex.champions || []) {
    const champ = champByKeyMap.get(Number(cChamp.baseId)) || champByIdMap.get(cChamp.baseKey);
    const champId = champ ? champ.id : (cChamp.baseKey || cChamp.name);
    const champTr = champ ? champ.nameTr : cChamp.name;
    const champEn = champ ? champ.nameEn : cChamp.name;
    const champKey = Number(cChamp.baseId);

    const baseClassicSkins = (cChamp.skins || []).filter(sk => !sk.parentSkinId);
    const firstBaseClassicId = baseClassicSkins[0] ? String(baseClassicSkins[0].id) : null;

    for (const sk of cChamp.skins || []) {
      const classicIdStr = String(sk.id);
      const manifestEntry = manifest.entries[`classic:${classicIdStr}`];
      if (!manifestEntry || !manifestEntry.enabled) continue;
      const liveSkinIdStr = String(champKey * 1000 + Number(sk.num));
      const liveSkin = skinByIdMap.get(liveSkinIdStr);

      let nameEn = sk.name;
      let nameTr = sk.name;
      if (sk.num === 0 && !sk.parentSkinId) {
        nameEn = `Classic ${champEn}`;
        nameTr = `Klasik ${champTr}`;
      } else if (liveSkin) {
        nameTr = liveSkin.nameTr || liveSkin.name;
        nameEn = liveSkin.nameEn || sk.name;
      }

      // Bazı temel şampiyon chromaları (örn. Blitzcrank 60053008) parentSkinId olarak 60053000 verir,
      // ancak şampiyonun Classic temel skini 60053301'dir. Bunu doğru üst Classic skine bağla:
      let resolvedParentId = sk.parentSkinId ? String(sk.parentSkinId) : null;
      if (resolvedParentId && !baseClassicSkins.some(b => String(b.id) === resolvedParentId)) {
        resolvedParentId = firstBaseClassicId;
      }

      classicItems.push({
        id: classicIdStr,
        skinNum: sk.num,
        liveSkinId: liveSkin ? liveSkinIdStr : null,
        name: nameTr,
        champion: champTr,
        nameTr,
        championTr: champTr,
        nameEn,
        championEn: champEn,
        championId: champId,
        image: sk.splash || sk.loading || sk.tile || '',
        imageFallback: sk.loading || sk.tile || '',
        collection: 'classic',
        ...(resolvedParentId ? { parentSkinId: resolvedParentId } : {})
      });
    }
  }
  classicItems.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  await mkdir(DATA_DIR, { recursive: true });

  const prevSkinsJson = await loadJsonIfExists(PATHS.skins);
  const prevRainbowJson = await loadJsonIfExists(PATHS.rainbow);
  const prevClassicJson = await loadJsonIfExists(PATHS.classic);
  const nowIso = new Date().toISOString();

  const skinsPayload = {
    version: latestVersion,
    patch: manifest.patch || '16.22',
    pbePatch: manifest.pbePatch || '16.23',
    updatedAt: nowIso,
    skins: overriddenSkins
  };
  if (
    prevSkinsJson &&
    prevSkinsJson.version === skinsPayload.version &&
    prevSkinsJson.patch === skinsPayload.patch &&
    JSON.stringify(prevSkinsJson.skins) === JSON.stringify(skinsPayload.skins)
  ) {
    skinsPayload.updatedAt = prevSkinsJson.updatedAt;
  }

  const rainbowPayload = {
    version: latestVersion,
    patch: rainbowCycles.patch || manifest.patch || '16.22',
    updatedAt: nowIso,
    count: rainbowItems.length,
    skins: rainbowItems
  };
  if (
    prevRainbowJson &&
    prevRainbowJson.patch === rainbowPayload.patch &&
    JSON.stringify(prevRainbowJson.skins) === JSON.stringify(rainbowPayload.skins)
  ) {
    rainbowPayload.updatedAt = prevRainbowJson.updatedAt;
  }

  const classicPayload = {
    version: latestVersion,
    patch: classicIndex.patch || manifest.patch || '16.22',
    updatedAt: nowIso,
    totalChampions: (classicIndex.champions || []).length,
    count: classicItems.length,
    skins: classicItems
  };
  if (
    prevClassicJson &&
    prevClassicJson.patch === classicPayload.patch &&
    JSON.stringify(prevClassicJson.skins) === JSON.stringify(classicPayload.skins)
  ) {
    classicPayload.updatedAt = prevClassicJson.updatedAt;
  }

  await Promise.all([
    writeFile(PATHS.skins, JSON.stringify(skinsPayload, null, 2) + '\n', 'utf8'),
    writeFile(PATHS.rainbow, JSON.stringify(rainbowPayload, null, 2) + '\n', 'utf8'),
    writeFile(PATHS.classic, JSON.stringify(classicPayload, null, 2) + '\n', 'utf8')
  ]);

  console.log('\n=== VERİ GÜNCELLEME ÖZETİ ===');
  console.log(`skins.json   : ${overriddenSkins.length} toplam girdi (${pbeBaseAdded} PBE ana skin + ${pbeChromaAdded} PBE chroma dahil)`);
  console.log(`rainbow.json : ${rainbowItems.length} Rainbow paketi (lazy-load)`);
  console.log(`classic.json : ${classicItems.length} Classic paketi (${classicItems.filter(x => !x.parentSkinId).length} ana + ${classicItems.filter(x => x.parentSkinId).length} chroma, lazy-load)`);
}

main().catch(err => {
  console.error('[update-data] HATA:', err.message);
  process.exit(1);
});
