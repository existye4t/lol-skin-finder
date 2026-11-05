import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import {
  DATA_DIR,
  SOURCE_REPO,
  SOURCE_BRANCH,
  RAW_BASE_URL,
  GITHUB_TREE_API_URL,
  ENABLE_LEGACY_FANTOME,
  LEGACY_BASE_PATH,
  MISSING_GRACE_RUNS,
  MAX_ALLOWED_DROP_RATIO,
  PATHS,
  sanitizeYimiFileName,
  sanitizeYimiFolderName
} from './config.mjs';

const DDRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';

function getGithubHeaders(accept = 'application/vnd.github+json') {
  const headers = {
    Accept: accept,
    'User-Agent': 'lol-skin-finder-sync'
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchJson(url, useGithubAuth = false) {
  const res = await fetch(url, {
    headers: useGithubAuth ? getGithubHeaders() : { 'User-Agent': 'lol-skin-finder-sync' }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} (${res.statusText}) -> ${url}`);
  }
  return res.json();
}

/**
 * Kaynak reponun Git ağacını klonlamadan çeker.
 * Eğer recursive=1 yanıtı truncated=true dönerse üst klasörleri ayrı ayrı çeker.
 */
export async function fetchSourceTree() {
  const rootTree = await fetchJson(GITHUB_TREE_API_URL, true);
  if (!rootTree || !Array.isArray(rootTree.tree)) {
    throw new Error('GitHub Trees API geçersiz veya boş yanıt döndürdü.');
  }

  if (!rootTree.truncated) {
    return rootTree.tree;
  }

  console.warn('[prepare-fantome] Uyarı: Ana Git ağacı truncated döndü, alt klasörler ayrı çekiliyor...');
  const nonRecursiveUrl = `https://api.github.com/repos/${SOURCE_REPO}/git/trees/${SOURCE_BRANCH}`;
  const topLevel = await fetchJson(nonRecursiveUrl, true);
  const targetDirs = new Set(['skins', 'PBE', 'rainbow', 'classic']);
  const combined = [];

  for (const item of topLevel.tree || []) {
    if (item.type === 'blob') {
      combined.push(item);
    } else if (item.type === 'tree' && targetDirs.has(item.path)) {
      const subTree = await fetchJson(`${item.url}?recursive=1`, true);
      for (const subItem of subTree.tree || []) {
        combined.push({
          ...subItem,
          path: `${item.path}/${subItem.path}`
        });
      }
    }
  }
  return combined;
}

async function fetchChampionMap() {
  const versions = await fetchJson(DDRAGON_VERSIONS_URL);
  const latestVersion = versions[0];
  const champData = await fetchJson(
    `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`
  );
  const byLower = new Map();
  const byKey = new Map();
  for (const champ of Object.values(champData.data || {})) {
    const entry = {
      id: champ.id, // örn. "Fiddlesticks", "MonkeyKing", "AurelionSol"
      key: Number(champ.key),
      name: champ.name
    };
    byLower.set(champ.id.toLowerCase(), entry);
    byLower.set(champ.name.toLowerCase(), entry);
    byKey.set(Number(champ.key), entry);
  }
  return { latestVersion, byLower, byKey };
}

async function loadJsonIfExists(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const enforceSafety = args.includes('--enforce-safety') || process.env.ENFORCE_SAFETY === 'true';

  console.log(`[prepare-fantome] Kaynak repo inceleniyor: ${SOURCE_REPO}@${SOURCE_BRANCH}`);
  const [treeItems, rootIndex, pbeIndex, rainbowCycles, classicIndex, champInfo] = await Promise.all([
    fetchSourceTree(),
    fetchJson(`${RAW_BASE_URL}index.json`),
    fetchJson(`${RAW_BASE_URL}PBE/index.json`),
    fetchJson(`${RAW_BASE_URL}rainbow/chroma-cycles.json`),
    fetchJson(`${RAW_BASE_URL}classic/index.json`),
    fetchChampionMap()
  ]);

  const fantomeBlobs = new Set(
    treeItems
      .filter(item => item.type === 'blob' && item.path.endsWith('.fantome'))
      .map(item => item.path)
  );

  if (fantomeBlobs.size === 0) {
    throw new Error('Kaynak repoda hiçbir .fantome dosyası bulunamadı! İşlem durduruldu.');
  }

  const prevManifest = await loadJsonIfExists(PATHS.manifest, null);
  const prevEntries = prevManifest?.entries || {};
  const legacyFantomeIds = await loadJsonIfExists(PATHS.legacyFantomeList, []);
  const legacyIdSet = new Set(legacyFantomeIds.map(Number));

  const getChamp = (folderOrName) => {
    const key = String(folderOrName || '').toLowerCase();
    return champInfo.byLower.get(key) || null;
  };

  const newEntries = {};
  const matchedBlobPaths = new Set();
  const liveSkinIds = new Set();

  // 1. SKINS KOLEKSİYONU (Canlı skinler, chromalar ve formlar)
  for (const [champFolder, cData] of Object.entries(rootIndex.champions || {})) {
    const champ = getChamp(champFolder);
    if (!champ) continue;
    const champKey = champ.key;
    const champId = champ.id;

    // 1a. Ana Skinler
    for (const [skinNumStr, skinName] of Object.entries(cData.skins || {})) {
      const skinId = champKey * 1000 + Number(skinNumStr);
      const relPath = `skins/${champFolder}/${sanitizeYimiFileName(skinName)}.fantome`;
      if (fantomeBlobs.has(relPath)) {
        matchedBlobPaths.add(relPath);
        liveSkinIds.add(skinId);
        const key = `skins:${skinId}`;
        newEntries[key] = {
          c: 'skins',
          id: skinId,
          champ: champId,
          name: skinName,
          type: 'base',
          path: relPath,
          status: 'enabled',
          enabled: true
        };
      }
    }

    // 1b. Chromalar
    for (const [parentNumStr, chromaMap] of Object.entries(cData.chromas || {})) {
      const parentSkinId = champKey * 1000 + Number(parentNumStr);
      const parentName = parentNumStr === '0' ? champFolder : (cData.skins?.[parentNumStr] || champFolder);
      const parentFolder = sanitizeYimiFolderName(parentName);

      for (const [chromaNumStr, chromaName] of Object.entries(chromaMap)) {
        const chromaId = champKey * 1000 + Number(chromaNumStr);
        const relPath = `skins/${champFolder}/${parentFolder}/${sanitizeYimiFileName(chromaName)}.fantome`;
        if (fantomeBlobs.has(relPath)) {
          matchedBlobPaths.add(relPath);
          liveSkinIds.add(chromaId);
          const key = `skins:${chromaId}`;
          newEntries[key] = {
            c: 'skins',
            id: chromaId,
            pId: parentSkinId,
            champ: champId,
            name: chromaName,
            type: 'chroma',
            path: relPath,
            status: 'enabled',
            enabled: true
          };
        }
      }
    }

    // 1c. Formlar
    for (const [parentNumStr, formMap] of Object.entries(cData.forms || {})) {
      const parentSkinId = champKey * 1000 + Number(parentNumStr);
      const parentName = parentNumStr === '0' ? champFolder : (cData.skins?.[parentNumStr] || champFolder);
      const parentFolder = sanitizeYimiFolderName(parentName);

      for (const [formKeyStr, formName] of Object.entries(formMap)) {
        const formId = champKey * 1000 + Number(formKeyStr);
        const relPath = `skins/${champFolder}/${parentFolder}/${sanitizeYimiFileName(formName)}.fantome`;
        if (fantomeBlobs.has(relPath)) {
          matchedBlobPaths.add(relPath);
          liveSkinIds.add(formId);
          const key = `skins:${formId}`;
          newEntries[key] = {
            c: 'skins',
            id: formId,
            pId: parentSkinId,
            champ: champId,
            name: formName,
            type: 'form',
            path: relPath,
            status: 'enabled',
            enabled: true
          };
        }
      }
    }
  }

  // 2. PBE KOLEKSİYONU (Canlıya çıkmış olanlar otomatik olarak skins/ altında kalır, çift kayıt oluşmaz)
  const transitionedPbeToLive = [];
  for (const pkg of pbeIndex.packages || []) {
    const skinId = Number(pkg.id);
    const relPath = `PBE/${pkg.path}`;
    if (!fantomeBlobs.has(relPath)) continue;
    matchedBlobPaths.add(relPath);

    // Eğer aynı skin artık canlı skins/ koleksiyonunda varsa canlı sürüm kazanır!
    if (liveSkinIds.has(skinId)) {
      transitionedPbeToLive.push(skinId);
      continue;
    }

    const champ = champInfo.byKey.get(Number(pkg.championId)) || getChamp(pkg.champion);
    const champId = champ ? champ.id : pkg.champion;
    const key = `pbe:${skinId}`;
    const entry = {
      c: 'pbe',
      id: skinId,
      champ: champId,
      name: pkg.name,
      type: pkg.chroma ? 'chroma' : 'base',
      path: relPath,
      status: 'enabled',
      enabled: true
    };
    if (pkg.parentId) {
      entry.pId = Number(pkg.parentId);
    }
    newEntries[key] = entry;
  }

  for (const fPkg of pbeIndex.formPackages || []) {
    const parentId = Number(fPkg.id);
    const relPath = `PBE/${fPkg.path}`;
    if (!fantomeBlobs.has(relPath)) continue;
    matchedBlobPaths.add(relPath);

    if (liveSkinIds.has(parentId)) {
      continue;
    }

    const champ = champInfo.byKey.get(Number(fPkg.championId)) || getChamp(fPkg.champion);
    const champId = champ ? champ.id : fPkg.champion;
    const formId = `${parentId}_f${fPkg.form}`;
    const key = `pbe:${formId}`;
    newEntries[key] = {
      c: 'pbe',
      id: formId,
      pId: parentId,
      champ: champId,
      name: fPkg.name,
      type: 'form',
      path: relPath,
      status: 'enabled',
      enabled: true
    };
  }

  // 3. RAINBOW KOLEKSİYONU
  for (const cycle of rainbowCycles.packages || []) {
    const champ = getChamp(cycle.champion);
    if (!champ) continue;
    const skinId = champ.key * 1000 + Number(cycle.skin);
    const relPath = `rainbow/${cycle.path}`;
    if (!fantomeBlobs.has(relPath)) continue;
    matchedBlobPaths.add(relPath);

    const skinName = cycle.path.split('/').pop().replace(/\.fantome$/, '');
    const key = `rainbow:${skinId}`;
    newEntries[key] = {
      c: 'rainbow',
      id: skinId,
      champ: champ.id,
      name: skinName,
      type: 'rainbow',
      path: relPath,
      status: 'enabled',
      enabled: true
    };
  }

  // 4. CLASSIC KOLEKSİYONU
  for (const cChamp of classicIndex.champions || []) {
    const champ = champInfo.byKey.get(Number(cChamp.baseId)) || getChamp(cChamp.baseKey || cChamp.name);
    const champId = champ ? champ.id : (cChamp.baseKey || cChamp.name);
    for (const sk of cChamp.skins || []) {
      const classicId = String(sk.id);
      const relPath = `classic/${sk.path}`;
      if (!fantomeBlobs.has(relPath)) continue;
      matchedBlobPaths.add(relPath);

      const key = `classic:${classicId}`;
      const entry = {
        c: 'classic',
        id: classicId,
        champ: champId,
        name: sk.name,
        type: sk.parentSkinId ? 'classic-chroma' : 'classic',
        path: relPath,
        status: 'enabled',
        enabled: true
      };
      if (sk.parentSkinId) {
        entry.pId = String(sk.parentSkinId);
      }
      newEntries[key] = entry;
    }
  }

  // 5. HENÜZ INDEX.JSON VEYA DATA DRAGON'DA OLMAYAN ("PENDING") YENİ DOSYALARI YAKALA
  let pendingIndexCounter = 1;
  for (const blobPath of fantomeBlobs) {
    if (matchedBlobPaths.has(blobPath)) continue;
    const parts = blobPath.split('/');
    const topFolder = parts[0];
    if (!['skins', 'PBE', 'rainbow', 'classic'].includes(topFolder)) continue;

    const collection = topFolder === 'PBE' ? 'pbe' : topFolder;
    const champFolder = collection === 'pbe' ? parts[2] : parts[1];
    const champ = getChamp(champFolder?.replace(/^Jade_/, '') || '');
    const champId = champ ? champ.id : (champFolder || 'Unknown');
    const fileName = parts[parts.length - 1].replace(/\.fantome$/, '');
    const isSubitem = (collection === 'skins' && parts.length === 4) || (collection === 'pbe' && parts.length === 5);

    const syntheticId = `pending_${collection}_${pendingIndexCounter++}`;
    const key = `${collection}:${syntheticId}`;
    newEntries[key] = {
      c: collection,
      id: syntheticId,
      champ: champId,
      name: fileName,
      type: isSubitem ? 'chroma' : 'base',
      path: blobPath,
      status: 'pending',
      enabled: true
    };
  }

  // 6. ÖNCEKİ MANIFEST İLE KARŞILAŞTIRMA: GÜVENLİK KONTROLÜ (%5 KAYIP) VE "MISSING" YAŞAM DÖNGÜSÜ
  const prevActiveCount = Object.values(prevEntries).filter(e => !e.legacy && e.status !== 'missing').length;
  const currentActiveCount = Object.values(newEntries).length;

  if (prevActiveCount > 0) {
    const dropRatio = (prevActiveCount - currentActiveCount) / prevActiveCount;
    if (dropRatio > MAX_ALLOWED_DROP_RATIO) {
      const msg = `[GÜVENLİK DURDURMASI] Kaynak girdi sayısı %${(dropRatio * 100).toFixed(2)} azaldı (${prevActiveCount} -> ${currentActiveCount}, izin verilen maks: %${MAX_ALLOWED_DROP_RATIO * 100}). Manifest değiştirilmedi!`;
      if (enforceSafety) {
        console.error(msg);
        process.exit(1);
      } else {
        console.warn(msg);
      }
    }
  }

  let missingEntriesCount = 0;
  let newlyDisabledMissingCount = 0;

  for (const [key, prevEntry] of Object.entries(prevEntries)) {
    if (newEntries[key]) continue;
    if (prevEntry.legacy) continue;

    // PBE girdileri canlıya geçtiyse veya PBE döngüsünden kalktıysa "missing" beklemesine girmez
    if (prevEntry.c === 'pbe') {
      const pbeIdNum = Number(prevEntry.id);
      if (liveSkinIds.has(pbeIdNum) && !transitionedPbeToLive.includes(pbeIdNum)) {
        transitionedPbeToLive.push(pbeIdNum);
      }
      continue;
    }

    const nextMissingCount = (prevEntry.missingCount || 0) + 1;
    const stillEnabled = nextMissingCount < MISSING_GRACE_RUNS;
    if (!stillEnabled && prevEntry.enabled) {
      newlyDisabledMissingCount++;
    }
    missingEntriesCount++;

    newEntries[key] = {
      ...prevEntry,
      status: 'missing',
      enabled: stillEnabled,
      missingCount: nextMissingCount
    };
  }

  // 7. ESKİ YEREL FANTOME DOSYALARI (Yeni kaynakta karşılığı olmayanlar: legacy=true, enabled=ENABLE_LEGACY_FANTOME)
  const legacyOnlyIds = [];
  for (const legacyId of legacyIdSet) {
    if (!liveSkinIds.has(legacyId)) {
      legacyOnlyIds.push(legacyId);
      const champKey = Math.floor(legacyId / 1000);
      const champ = champInfo.byKey.get(champKey);
      const key = `skins:${legacyId}`;
      newEntries[key] = {
        c: 'skins',
        id: legacyId,
        champ: champ ? champ.id : String(champKey),
        name: `Legacy #${legacyId}`,
        type: 'form',
        path: null,
        status: 'legacy',
        enabled: ENABLE_LEGACY_FANTOME,
        legacy: true
      };
    }
  }

  // 8. İSTATİSTİKLER VE DIFF HESAPLAMA
  const addedKeys = [];
  const changedKeys = [];
  for (const [key, entry] of Object.entries(newEntries)) {
    const prev = prevEntries[key];
    if (!prev) {
      addedKeys.push(key);
    } else if (
      prev.path !== entry.path ||
      prev.status !== entry.status ||
      prev.enabled !== entry.enabled ||
      prev.c !== entry.c
    ) {
      changedKeys.push(key);
    }
  }

  const countBy = (col, pred) =>
    Object.values(newEntries).filter(e => e.c === col && pred(e)).length;

  const stats = {
    skins: {
      total: countBy('skins', e => !e.legacy),
      base: countBy('skins', e => !e.legacy && e.type === 'base'),
      chromas: countBy('skins', e => !e.legacy && e.type === 'chroma'),
      forms: countBy('skins', e => !e.legacy && e.type === 'form'),
      enabled: countBy('skins', e => !e.legacy && e.enabled),
      pending: countBy('skins', e => e.status === 'pending'),
      missing: countBy('skins', e => e.status === 'missing'),
      legacyOnlyDisabled: legacyOnlyIds.length,
      legacyTotalFiles: legacyIdSet.size
    },
    pbe: {
      total: countBy('pbe', () => true),
      base: countBy('pbe', e => e.type === 'base'),
      chromas: countBy('pbe', e => e.type === 'chroma'),
      forms: countBy('pbe', e => e.type === 'form'),
      enabled: countBy('pbe', e => e.enabled),
      pending: countBy('pbe', e => e.status === 'pending'),
      missing: countBy('pbe', e => e.status === 'missing'),
      transitionedToLive: transitionedPbeToLive.length
    },
    rainbow: {
      total: countBy('rainbow', () => true),
      enabled: countBy('rainbow', e => e.enabled),
      pending: countBy('rainbow', e => e.status === 'pending'),
      missing: countBy('rainbow', e => e.status === 'missing')
    },
    classic: {
      total: countBy('classic', () => true),
      base: countBy('classic', e => e.type === 'classic'),
      chromas: countBy('classic', e => e.type === 'classic-chroma'),
      enabled: countBy('classic', e => e.enabled),
      pending: countBy('classic', e => e.status === 'pending'),
      missing: countBy('classic', e => e.status === 'missing')
    }
  };

  const patchChanged = Boolean(prevManifest?.patch && prevManifest.patch !== rootIndex.patch);

  // İçeriği aynıysa gereksiz git diff oluşmaması için önceki generatedAt değerini koru
  const hasAnyDiff =
    !prevManifest ||
    addedKeys.length > 0 ||
    changedKeys.length > 0 ||
    patchChanged ||
    prevManifest.pbePatch !== pbeIndex.sourcePatch ||
    prevManifest.config?.enableLegacyFantome !== ENABLE_LEGACY_FANTOME;

  const manifest = {
    schemaVersion: 1,
    generatedAt: hasAnyDiff ? new Date().toISOString() : prevManifest.generatedAt,
    sourceRepo: SOURCE_REPO,
    sourceBranch: SOURCE_BRANCH,
    baseUrl: RAW_BASE_URL,
    legacyBasePath: LEGACY_BASE_PATH,
    patch: rootIndex.patch || '16.22',
    pbePatch: pbeIndex.sourcePatch || '16.23',
    ddragonVersion: champInfo.latestVersion,
    config: {
      enableLegacyFantome: ENABLE_LEGACY_FANTOME
    },
    stats,
    entries: newEntries
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(PATHS.manifest, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  // Action veya CLI için özet rapor
  const syncSummary = {
    timestamp: new Date().toISOString(),
    patch: manifest.patch,
    prevPatch: prevManifest?.patch || null,
    patchChanged,
    hasAnyDiff,
    addedCount: addedKeys.length,
    changedCount: changedKeys.length,
    totalDeltaCount: addedKeys.length + changedKeys.length,
    transitionedPbeToLive,
    legacyOnlyIds,
    missingEntriesCount,
    newlyDisabledMissingCount,
    addedSample: addedKeys.slice(0, 50),
    changedSample: changedKeys.slice(0, 50),
    stats
  };

  if (args.includes('--write-report')) {
    await writeFile(PATHS.syncReport, JSON.stringify(syncSummary, null, 2) + '\n', 'utf8');
  }

  console.log('\n=== FANTOME MANIFEST ÖZETİ ===');
  console.log(`Yama (Patch)    : ${manifest.patch} (PBE: ${manifest.pbePatch}, DataDragon: ${manifest.ddragonVersion})`);
  console.log(`skins/          : ${stats.skins.enabled} aktif (${stats.skins.base} ana, ${stats.skins.chromas} chroma, ${stats.skins.forms} form) | pending: ${stats.skins.pending} | missing: ${stats.skins.missing}`);
  console.log(`PBE/            : ${stats.pbe.enabled} aktif (${stats.pbe.base} ana, ${stats.pbe.chromas} chroma, ${stats.pbe.forms} form) | canlıya geçen: ${stats.pbe.transitionedToLive}`);
  console.log(`rainbow/        : ${stats.rainbow.enabled} aktif | pending: ${stats.rainbow.pending} | missing: ${stats.rainbow.missing}`);
  console.log(`classic/        : ${stats.classic.enabled} aktif (${stats.classic.base} ana, ${stats.classic.chromas} chroma) | pending: ${stats.classic.pending}`);
  console.log(`Legacy (Pasif)  : ${stats.skins.legacyTotalFiles} yerel dosya devre dışı (yeni kaynakta karşılığı olmayan: ${legacyOnlyIds.length} -> [${legacyOnlyIds.join(', ')}])`);
  console.log(`Değişim (Diff)  : +${addedKeys.length} yeni, ~${changedKeys.length} değişen girdi (Patch değişti mi: ${patchChanged})`);
}

const isMain = process.argv[1] && process.argv[1].endsWith('prepare-fantome.mjs');
if (isMain) {
  main().catch(err => {
    console.error('[prepare-fantome] HATA:', err.message);
    process.exit(1);
  });
}
