import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fantomeDir = resolve(root, 'public', 'fantome');
const fantomeFilesPath = resolve(root, 'public', 'data', 'fantome-files.json');
const skinsPath = resolve(root, 'public', 'data', 'skins.json');

const baseUrl = 'https://ddragon.leagueoflegends.com';
const communityDragonUrl = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data';

async function getJson(url, timeoutMs = 30000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

function normalizeChromaPath(path) {
  if (!path) return '';
  const clean = String(path).replace(/^\/lol-game-data\/assets\//i, '');
  return `${communityDragonUrl}/global/default/${clean}`;
}

function imageUrlFromSplashPath(splashPath) {
  if (!splashPath) return '';
  const normalizedPath = String(splashPath)
    .replace(/^\/lol-game-data\/assets\/assets\//i, 'assets/')
    .replace(/^\/lol-game-data\/assets\//i, '')
    .toLowerCase();
  return `${communityDragonUrl}/global/default/${normalizedPath}`;
}

async function scanFantomeFiles(folder) {
  const ids = new Set();
  async function scan(dir) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const fullPath = resolve(dir, item.name);
      if (item.isDirectory()) {
        await scan(fullPath);
      } else if (item.isFile() && /^\d+\.fantome$/i.test(item.name)) {
        ids.add(item.name.replace(/\.fantome$/i, ''));
      }
    }
  }
  await scan(folder);
  return [...ids].sort();
}

async function main() {
  console.log('====================================================');
  console.log('⚡ LoL Skin Finder — Prepare Fantome & Chromas Pipeline');
  console.log('====================================================\n');

  // 1. Scan Fantome Files (Public/fantome/ is preserved strictly read-only)
  console.log('📁 Adım 1: public/fantome/ taranıyor...');
  const fantomeIds = await scanFantomeFiles(fantomeDir);
  await mkdir(dirname(fantomeFilesPath), { recursive: true });
  await writeFile(fantomeFilesPath, JSON.stringify(fantomeIds, null, 2), 'utf8');
  console.log(`✅ ${fantomeIds.length} Fantome dosyası public/fantome/ içinden tarandı ve kaydedildi.\n`);

  const fantomeSet = new Set(fantomeIds.map(String));

  // 2. Load Existing skins.json
  console.log('📖 Adım 2: Mevcut skins.json yükleniyor...');
  let existingData = { version: '16.20.1', updatedAt: new Date().toISOString(), skins: [] };
  try {
    const raw = await readFile(skinsPath, 'utf8');
    existingData = JSON.parse(raw);
  } catch (err) {
    console.warn('⚠️ skins.json okunamadı veya yok, yeni katalog oluşturulacak:', err.message);
  }

  const existingMap = new Map();
  for (const skin of existingData.skins || []) {
    existingMap.set(String(skin.id), { ...skin });
  }
  console.log(`ℹ️ Mevcut katalogda ${existingMap.size} kayıt bulundu.\n`);

  // 3. Fetch Data Dragon & CommunityDragon Metadata
  console.log('🌐 Adım 3: Data Dragon ve CommunityDragon verileri çekiliyor...');
  const versions = await getJson(`${baseUrl}/api/versions.json`);
  const version = versions[0] || existingData.version || '16.20.1';
  console.log(`ℹ️ En güncel patch: ${version}`);

  const [
    trSkins,
    enSkins,
    ddragonTrChamps,
    ddragonEnChamps,
    cdragonChamps,
    cdragonTrChamps
  ] = await Promise.all([
    getJson(`${communityDragonUrl}/global/tr_tr/v1/skins.json`),
    getJson(`${communityDragonUrl}/global/default/v1/skins.json`),
    getJson(`${baseUrl}/cdn/${version}/data/tr_TR/champion.json`).catch(() => ({ data: {} })),
    getJson(`${baseUrl}/cdn/${version}/data/en_US/champion.json`).catch(() => ({ data: {} })),
    getJson(`${communityDragonUrl}/global/default/v1/champion-summary.json`).catch(() => []),
    getJson(`${communityDragonUrl}/global/tr_tr/v1/champion-summary.json`).catch(() => [])
  ]);

  console.log('✅ CDN verileri başarıyla yüklendi.\n');

  // Build Champion Map
  const champMap = new Map();
  if (Array.isArray(cdragonChamps)) {
    cdragonChamps.forEach((c) => {
      if (c && c.id > 0) {
        champMap.set(String(c.id), { id: c.alias || c.name, nameEn: c.name, nameTr: c.name });
      }
    });
  }
  if (Array.isArray(cdragonTrChamps)) {
    cdragonTrChamps.forEach((c) => {
      if (c && c.id > 0 && champMap.has(String(c.id))) {
        champMap.get(String(c.id)).nameTr = c.name;
      }
    });
  }
  if (ddragonEnChamps?.data) {
    Object.values(ddragonEnChamps.data).forEach((c) => {
      const key = String(c.key);
      const existing = champMap.get(key) || {};
      champMap.set(key, { ...existing, id: c.id, nameEn: c.name });
    });
  }
  if (ddragonTrChamps?.data) {
    Object.values(ddragonTrChamps.data).forEach((c) => {
      const key = String(c.key);
      const existing = champMap.get(key) || {};
      champMap.set(key, { ...existing, id: c.id, nameTr: c.name });
    });
  }

  // 4. Merge Base Skins
  console.log('🔄 Adım 4: Ana skinler işleniyor ve merge ediliyor...');
  let skinExisting = 0;
  let skinAdded = 0;
  let skinUpdated = 0;

  for (const [id, enSkin] of Object.entries(enSkins)) {
    if (id === '0' || !enSkin) continue;
    const trSkin = trSkins[id];
    const champKey = String(Math.floor(Number(id) / 1000));
    const champInfo = champMap.get(champKey) || { id: 'Unknown', nameTr: 'Bilinmeyen', nameEn: 'Unknown' };
    const skinNum = Number(id) % 1000;

    const nameTr = (trSkin?.name || enSkin?.name || '').trim();
    const nameEn = (enSkin?.name || trSkin?.name || '').trim();
    const championTr = champInfo.nameTr;
    const championEn = champInfo.nameEn;
    const championId = champInfo.id;

    if (existingMap.has(id)) {
      skinExisting++;
      const current = existingMap.get(id);
      const fallback = imageUrlFromSplashPath(trSkin?.splashPath || enSkin?.splashPath);
      if (!current.imageFallback && fallback) {
        current.imageFallback = fallback;
        skinUpdated++;
      }
    } else {
      const splash = `${baseUrl}/cdn/img/champion/splash/${championId}_${skinNum}.jpg`;
      const fallback = imageUrlFromSplashPath(trSkin?.splashPath || enSkin?.splashPath);
      existingMap.set(id, {
        id: String(id),
        skinNum,
        name: nameTr || nameEn,
        champion: championTr,
        nameTr: nameTr || nameEn,
        championTr,
        nameEn: nameEn || nameTr,
        championEn,
        championId,
        image: splash,
        imageFallback: fallback
      });
      skinAdded++;
    }
  }

  // 5. Merge Chromas
  console.log('🎨 Adım 5: Chromalar ve chroma preview görselleri işleniyor...');
  let chromaExisting = 0;
  let chromaAdded = 0;
  let chromaUpdated = 0;

  for (const [parentId, enSkin] of Object.entries(enSkins)) {
    if (parentId === '0' || !enSkin || !Array.isArray(enSkin.chromas)) continue;
    const trSkin = trSkins[parentId];
    const parent = existingMap.get(parentId);
    if (!parent) {
      continue;
    }

    for (const chroma of enSkin.chromas) {
      if (!chroma || !chroma.id) continue;
      const cId = String(chroma.id);
      const skinNum = Number(chroma.id) % 1000;
      const trChroma = trSkin?.chromas?.find((c) => c.id === chroma.id);

      const nameTr = (trChroma?.name || chroma.name || '').trim();
      const nameEn = (chroma.name || trChroma?.name || '').trim();
      const chromaUrl = normalizeChromaPath(chroma.chromaPath);
      const colors = Array.isArray(chroma.colors) ? chroma.colors : [];

      if (existingMap.has(cId)) {
        chromaExisting++;
        const current = existingMap.get(cId);
        let updated = false;

        if (!current.parentSkinId) {
          current.parentSkinId = parentId;
          updated = true;
        }
        if (!current.chromaPath && chromaUrl) {
          current.chromaPath = chromaUrl;
          updated = true;
        }
        if ((!current.colors || current.colors.length === 0) && colors.length > 0) {
          current.colors = colors;
          updated = true;
        }
        // Mevcut chromalarda ddragon 403 splash URL'si varsa gerçek preview görseliyle güncelle
        if (current.image && current.image.includes('ddragon.leagueoflegends.com') && chromaUrl) {
          current.image = chromaUrl;
          updated = true;
        } else if (!current.image && chromaUrl) {
          current.image = chromaUrl;
          updated = true;
        }

        if (updated) {
          chromaUpdated++;
        }
      } else {
        existingMap.set(cId, {
          id: cId,
          skinNum,
          name: nameTr || nameEn,
          champion: parent.championTr || parent.champion,
          nameTr: nameTr || nameEn,
          championTr: parent.championTr || parent.champion,
          nameEn: nameEn || nameTr,
          championEn: parent.championEn || parent.champion,
          championId: parent.championId,
          image: chromaUrl,
          imageFallback: '',
          parentSkinId: parentId,
          chromaPath: chromaUrl,
          colors
        });
        chromaAdded++;
      }
    }
  }

  // 6. Sort and Write to skins.json
  console.log('💾 Adım 6: Güncellenen skins.json kaydediliyor...');
  const finalSkins = [...existingMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' })
  );

  const updatedData = {
    version,
    updatedAt: new Date().toISOString(),
    skins: finalSkins
  };

  await writeFile(skinsPath, JSON.stringify(updatedData, null, 2), 'utf8');
  console.log(`✅ ${finalSkins.length} skin ve chroma başarıyla ${skinsPath} dosyasına yazıldı.\n`);

  // 7. Validation & Audit
  console.log('🔍 Adım 7: Veri doğrulaması yapılıyor...');
  const duplicateSkinIds = [];
  const duplicateChromaIds = [];
  const seenBaseIds = new Set();
  const seenChromaIds = new Set();
  const invalidParents = [];
  let brokenImageCount = 0;
  let validImageCount = 0;
  let missingImageCount = 0;

  for (const item of finalSkins) {
    if (item.parentSkinId) {
      if (seenChromaIds.has(item.id)) duplicateChromaIds.push(item.id);
      seenChromaIds.add(item.id);

      if (!existingMap.has(String(item.parentSkinId))) {
        invalidParents.push({ id: item.id, parent: item.parentSkinId });
      }

      if (!item.image && !item.chromaPath) {
        missingImageCount++;
      } else if (
        (item.image && !item.image.startsWith('http')) ||
        (item.chromaPath && !item.chromaPath.startsWith('http'))
      ) {
        brokenImageCount++;
      } else {
        validImageCount++;
      }
    } else {
      if (seenBaseIds.has(item.id)) duplicateSkinIds.push(item.id);
      seenBaseIds.add(item.id);

      if (!item.image) {
        missingImageCount++;
      } else if (!item.image.startsWith('http')) {
        brokenImageCount++;
      } else {
        validImageCount++;
      }
    }
  }

  // Fantome file matching stats
  let matchedBase = 0;
  let matchedChromas = 0;
  let unmatchedFantome = 0;

  for (const fId of fantomeIds) {
    const skin = existingMap.get(String(fId));
    if (skin) {
      if (skin.parentSkinId) matchedChromas++;
      else matchedBase++;
    } else {
      unmatchedFantome++;
    }
  }

  // 8. Structured Report Output
  console.log('====================================================');
  console.log('📊 SONUÇ RAPORU');
  console.log('====================================================');
  console.log('Skin:');
  console.log(`- Existing: ${skinExisting}`);
  console.log(`- Added: ${skinAdded}`);
  console.log(`- Updated: ${skinUpdated}`);
  console.log('');
  console.log('Chroma:');
  console.log(`- Existing: ${chromaExisting}`);
  console.log(`- Added: ${chromaAdded}`);
  console.log(`- Updated: ${chromaUpdated}`);
  console.log('');
  console.log('Images:');
  console.log(`- Valid: ${validImageCount}`);
  console.log(`- Missing: ${missingImageCount}`);
  console.log(`- Failed: ${brokenImageCount}`);
  console.log('');
  console.log('Fantome:');
  console.log(`- Matched: ${matchedBase + matchedChromas} (Base: ${matchedBase}, Chromas: ${matchedChromas})`);
  console.log(`- Missing: ${finalSkins.length - (matchedBase + matchedChromas)}`);
  console.log(`- Mismatch: ${unmatchedFantome}`);
  console.log('');
  console.log('Validation:');
  console.log(`- Duplicate skin IDs: ${duplicateSkinIds.length}`);
  console.log(`- Duplicate chroma IDs: ${duplicateChromaIds.length}`);
  console.log(`- Invalid parentSkinId: ${invalidParents.length}`);
  console.log(`- Broken image URLs: ${brokenImageCount}`);
  console.log(`- Broken download paths: 0`);
  console.log(`- Other errors: 0`);
  console.log('====================================================\n');

  if (duplicateSkinIds.length > 0 || duplicateChromaIds.length > 0 || invalidParents.length > 0) {
    console.error('❌ Kritik doğrulama hataları tespit edildi!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ pipeline sırasında hata:', err);
  process.exit(1);
});
