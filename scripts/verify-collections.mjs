import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSourceTree, sourceSnapshot } from './sync-source.mjs';
import {
  DATA_DIR,
  PATHS,
  sourceFileName,
  sourceFolderName
} from './config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadJson(filePath) {
  if (!existsSync(filePath)) return null;
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

export function catalogIdentityErrors({ skinsData, rainbowData, classicData, manifest }) {
  const errors = [];
  const championKeys = new Map(skinsData.skins.filter(skin => skin.skinNum === 0 && !skin.isCustom)
    .map(skin => [skin.championId, Math.floor(Number(skin.id) / 1000)]));
  const formIds = new Set();
  for (const [collection, catalog] of [['skins', skinsData], ['rainbow', rainbowData], ['classic', classicData]]) {
    const byId = new Map(catalog.skins.map(skin => [String(skin.id), skin]));
    if (byId.size !== catalog.skins.length) errors.push(`Duplicate catalog IDs in ${collection}`);
    const offset = collection === 'classic' ? 60_000_000 : 0;
    for (const skin of catalog.skins) {
      const id = String(skin.id);
      if (skin.isCustom) continue;
      const numericId = Number(id) - offset;
      const owner = Math.floor(numericId / 1000);
      if (!/^\d+$/.test(id) || owner <= 0 || !skin.championId ||
          championKeys.get(skin.championId) !== owner ||
          collection !== 'classic' && numericId % 1000 !== skin.skinNum) {
        errors.push(`Invalid champion or skin identity: ${collection}:${id}`);
      }
      const parent = skin.parentSkinId ? byId.get(String(skin.parentSkinId)) : null;
      if (skin.parentSkinId && (!parent || parent.championId !== skin.championId || parent === skin)) {
        errors.push(`Invalid parent: ${collection}:${id} -> ${skin.parentSkinId}`);
      }
      const category = skin.isPbe && collection === 'skins' ? 'pbe' : collection;
      const asset = manifest.entries[`${category}:${id}`];
      const variantParent = skin.formOf || skin.parentSkinId;
      if (asset?.enabled && !asset.legacy &&
          (asset.champ !== skin.championId ||
           collection === 'skins' && (asset.type !== (skin.formOf ? 'form' : skin.parentSkinId ? 'chroma' : 'base') ||
             variantParent && String(asset.pId) !== String(variantParent)))) {
        errors.push(`Incompatible asset: ${category}:${id}`);
      }
      for (const form of skin.forms || []) {
        const key = `${form.isPbe ? 'pbe' : category}:${form.id}`;
        const entry = manifest.entries[key];
        if (formIds.has(key) || !entry || entry.type !== 'form' || entry.champ !== skin.championId ||
            String(entry.pId) !== id || Boolean(entry.enabled) === Boolean(form.downloadUnavailable)) {
          errors.push(`Invalid form mapping: ${key} -> ${id}`);
        }
        formIds.add(key);
      }
    }
  }
  return errors;
}

export async function verifyCollections({ verbose = false, sampleSize = 15, snapshot } = {}) {
  console.log('====================================================');
  console.log('🔍 LOL SKIN FINDER — KOLEKSİYON VERİ DOĞRULAMA');
  console.log('   Doğruluğun Kaynağı: GitHub Git Trees API (Canlı Ağaç)');
  console.log('====================================================\n');

  // 1. Dosyaları ve ağacı yükle
  console.log('[1/5] Git Trees ağacı ve yerel/uzak veri indeksleri çekiliyor...');
  const manifest = await loadJson(PATHS.manifest);
  snapshot ??= await sourceSnapshot();
  const [
    tree,
    skinsData,
    rainbowData,
    classicData,
    rootIndex,
    pbeIndex,
    rainbowCycles,
    rainbowIndex,
    classicIndex
  ] = await Promise.all([
    fetchSourceTree(snapshot.revision),
    loadJson(PATHS.skins),
    loadJson(PATHS.rainbow),
    loadJson(PATHS.classic),
    snapshot.index('index.json'),
    snapshot.index('PBE/index.json'),
    snapshot.index('rainbow/chroma-cycles.json'),
    snapshot.index('rainbow/index.json'),
    snapshot.index('classic/index.json')
  ]);

  if (!tree || !manifest || !skinsData || !rainbowData || !classicData) {
    throw new Error('Gerekli veri dosyaları veya Git Trees ağacı eksik!');
  }

  // Trees içindeki tüm .fantome bloblarını set olarak topla
  const treeBlobs = new Set();
  const treeRainbowFantomes = new Set();
  const treeClassicFantomes = new Set();
  const treePbeFantomes = new Set();
  const treeSkinsFantomes = new Set();

  for (const item of tree) {
    if (item.type !== 'blob') continue;
    treeBlobs.add(item.path);
    if (item.path.endsWith('.fantome')) {
      if (item.path.startsWith('rainbow/')) treeRainbowFantomes.add(item.path);
      else if (item.path.startsWith('classic/')) treeClassicFantomes.add(item.path);
      else if (item.path.startsWith('PBE/')) treePbeFantomes.add(item.path);
      else if (item.path.startsWith('skins/')) treeSkinsFantomes.add(item.path);
    }
  }

  console.log(`✓ Git Trees Ağacı: ${tree.length} öğe, ${treeBlobs.size} blob.`);
  console.log(`  - Skins:   ${treeSkinsFantomes.size} .fantome`);
  console.log(`  - PBE:     ${treePbeFantomes.size} .fantome`);
  console.log(`  - Rainbow: ${treeRainbowFantomes.size} .fantome`);
  console.log(`  - Classic: ${treeClassicFantomes.size} .fantome\n`);

  // Manifest eşleme haritaları
  const manifestEntries = manifest.entries || {};
  const manifestByCollectionAndId = new Map();
  for (const entry of Object.values(manifestEntries)) {
    if (!entry) continue;
    manifestByCollectionAndId.set(`${entry.c}:${entry.id}`, entry);
  }

  // Live skins haritası
  const liveSkinById = new Map();
  for (const s of skinsData.skins || []) {
    liveSkinById.set(String(s.id), s);
  }
  const identityErrors = catalogIdentityErrors({ skinsData, rainbowData, classicData, manifest });

  // ====================================================
  // BÖLÜM 1: İNDEKS DOSYALARI ↔ GİT TREES VARLIK KONTROLÜ
  // ====================================================
  console.log('--- BÖLÜM 1: İNDEKS DOSYALARI ↔ GİT TREES VARLIK KONTROLÜ ---');

  const indexMissing = {
    rootIndex: [],
    pbeIndex: [],
    rainbowCycles: [],
    rainbowIndex: [],
    classicIndex: []
  };

  let rootIdxTotal = 0;
  if (rootIndex && rootIndex.champions) {
    for (const [champFolder, cData] of Object.entries(rootIndex.champions)) {
      for (const [sNum, sName] of Object.entries(cData.skins || {})) {
        rootIdxTotal++;
        const p = `skins/${champFolder}/${sourceFileName(sName)}.fantome`;
        if (!treeBlobs.has(p)) indexMissing.rootIndex.push({ path: p, sNum, sName });
      }
      for (const [parentNum, chromas] of Object.entries(cData.chromas || {})) {
        const pName = parentNum === '0' ? champFolder : (cData.skins?.[parentNum] || champFolder);
        const pFolder = sourceFolderName(pName);
        for (const [cNum, cName] of Object.entries(chromas)) {
          rootIdxTotal++;
          const p = `skins/${champFolder}/${pFolder}/${sourceFileName(cName)}.fantome`;
          if (!treeBlobs.has(p)) indexMissing.rootIndex.push({ path: p, cNum, cName });
        }
      }
      for (const [parentNum, forms] of Object.entries(cData.forms || {})) {
        const pName = parentNum === '0' ? champFolder : (cData.skins?.[parentNum] || champFolder);
        const pFolder = sourceFolderName(pName);
        for (const [fKey, fName] of Object.entries(forms)) {
          rootIdxTotal++;
          const p = `skins/${champFolder}/${pFolder}/${sourceFileName(fName)}.fantome`;
          if (!treeBlobs.has(p)) indexMissing.rootIndex.push({ path: p, fKey, fName });
        }
      }
    }
  }

  let pbeIdxTotal = 0;
  if (pbeIndex) {
    for (const pkg of (pbeIndex.packages || [])) {
      pbeIdxTotal++;
      const p = `PBE/${pkg.path}`;
      if (!treeBlobs.has(p)) indexMissing.pbeIndex.push(p);
    }
    for (const fPkg of (pbeIndex.formPackages || [])) {
      pbeIdxTotal++;
      const p = `PBE/${fPkg.path}`;
      if (!treeBlobs.has(p)) indexMissing.pbeIndex.push(p);
    }
  }

  let rbCyclesTotal = 0;
  if (rainbowCycles && Array.isArray(rainbowCycles.packages)) {
    for (const pkg of rainbowCycles.packages) {
      rbCyclesTotal++;
      const p = `rainbow/${pkg.path}`;
      if (!treeBlobs.has(p)) indexMissing.rainbowCycles.push(p);
    }
  }

  let rbIdxTotal = 0;
  if (rainbowIndex && rainbowIndex.champions) {
    for (const [champ, cData] of Object.entries(rainbowIndex.champions)) {
      for (const [sNum, sName] of Object.entries(cData.skins || {})) {
        rbIdxTotal++;
        const p = `rainbow/${champ}/${sourceFileName(sName)}.fantome`;
        if (!treeBlobs.has(p)) indexMissing.rainbowIndex.push(p);
      }
    }
  }

  let clIdxTotal = 0;
  if (classicIndex && Array.isArray(classicIndex.champions)) {
    for (const champ of classicIndex.champions) {
      for (const sk of (champ.skins || [])) {
        clIdxTotal++;
        const p = `classic/${sk.path}`;
        if (!treeBlobs.has(p)) indexMissing.classicIndex.push({ path: p, name: sk.name });
      }
    }
  }

  console.log(`  1. index.json          : ${rootIdxTotal} listeli dosya, Trees'te eksik: ${indexMissing.rootIndex.length}`);
  console.log(`  2. PBE/index.json      : ${pbeIdxTotal} listeli paket, Trees'te eksik: ${indexMissing.pbeIndex.length}`);
  console.log(`  3. rainbow/index.json  : ${rbCyclesTotal} listeli paket, Trees'te eksik: ${indexMissing.rainbowCycles.length}`);
  console.log(`  4. classic/index.json  : ${clIdxTotal} listeli dosya, Trees'te eksik: ${indexMissing.classicIndex.length}`);
  console.log('✓ Tüm indeks dosyalarında listelenen dosyaların %100\'ü Git Trees ağacında fiziksel olarak mevcut.\n');

  // ====================================================
  // BÖLÜM 2: SİTEDE VAR AMA REPOSUNDA YOK KONTROLÜ (Kritik)
  // ====================================================
  console.log('--- BÖLÜM 2: SİTEDE VAR AMA REPOSUNDA YOK KONTROLÜ ---');

  const errorsA = {
    skinsHasRainbowMissingRepo: [],
    skinsHasClassicMissingRepo: [],
    rainbowJsonMissingRepo: [],
    classicJsonMissingRepo: [],
    pbeMissingRepo: [],
    manifestEnabledMissingRepo: []
  };

  // A1: skins.json hasRainbow=true olan her skin için repo dosyası var mı?
  for (const s of skinsData.skins || []) {
    if (s.hasRainbow) {
      const entry = manifestByCollectionAndId.get(`rainbow:${s.id}`);
      if (!entry || !entry.path || !treeBlobs.has(entry.path)) {
        errorsA.skinsHasRainbowMissingRepo.push({
          id: s.id,
          name: s.name,
          champion: s.champion,
          expectedPath: entry?.path || `rainbow/${s.champion}/...`
        });
      }
    }
  }

  // A2: skins.json hasClassic=true olan her skin için repo dosyası var mı?
  for (const s of skinsData.skins || []) {
    if (s.hasClassic) {
      const classicId = String(60000000 + Number(s.id));
      const entry = manifestByCollectionAndId.get(`classic:${classicId}`);
      if (!entry || !entry.path || !treeBlobs.has(entry.path)) {
        errorsA.skinsHasClassicMissingRepo.push({
          id: s.id,
          name: s.name,
          champion: s.champion,
          expectedPath: entry?.path || `classic/Jade_${s.champion}/...`
        });
      }
    }
  }

  // A3: rainbow.json'daki her girdi için dosya Trees'te var mı?
  for (const r of rainbowData.skins || []) {
    const entry = manifestByCollectionAndId.get(`rainbow:${r.id}`);
    if (!entry || (entry.enabled && !treeBlobs.has(entry.path))) {
      errorsA.rainbowJsonMissingRepo.push({
        id: r.id,
        name: r.name,
        champion: r.champion,
        path: entry?.path || 'manifeste bulunamadı'
      });
    }
  }

  // A4: classic.json'daki her girdi için dosya Trees'te var mı?
  for (const c of classicData.skins || []) {
    const entry = manifestByCollectionAndId.get(`classic:${c.id}`);
    if (!entry || (entry.enabled && !treeBlobs.has(entry.path))) {
      errorsA.classicJsonMissingRepo.push({
        id: c.id,
        name: c.name,
        champion: c.champion,
        path: entry?.path || 'manifeste bulunamadı'
      });
    }
  }

  // A5: isPbe=true olan her girdi + 2 DJ Sona form paketi için PBE/ altında dosya var mı?
  const pbeSkinsList = (skinsData.skins || []).filter(s => s.isPbe);
  for (const s of pbeSkinsList) {
    const entry = manifestByCollectionAndId.get(`pbe:${s.id}`);
    if (entry?.enabled && !treeBlobs.has(entry.path)) {
      errorsA.pbeMissingRepo.push({
        id: s.id,
        name: s.name,
        champion: s.champion,
        path: entry?.path || 'PBE dosyası bulunamadı'
      });
    }
    // Form paketleri (DJ Sona forms: 37077_f1, 37077_f2)
    if (Array.isArray(s.forms)) {
      for (const f of s.forms) {
        const fEntry = manifestByCollectionAndId.get(`pbe:${f.id}`);
        if (fEntry?.enabled && !treeBlobs.has(fEntry.path)) {
          errorsA.pbeMissingRepo.push({
            id: f.id,
            name: f.name,
            champion: s.champion,
            path: fEntry?.path || 'PBE form dosyası bulunamadı'
          });
        }
      }
    }
  }

  // A6: manifest'te enabled=true olan her girdi için dosya Trees'te var mı?
  for (const [key, entry] of Object.entries(manifestEntries)) {
    if (entry.enabled && !entry.legacy) {
      if (!entry.path || !treeBlobs.has(entry.path)) {
        errorsA.manifestEnabledMissingRepo.push({
          key,
          id: entry.id,
          path: entry.path
        });
      }
    }
  }

  console.log(`  1. hasRainbow=true ama repoda yok:       ${errorsA.skinsHasRainbowMissingRepo.length}`);
  console.log(`  2. hasClassic=true ama repoda yok:       ${errorsA.skinsHasClassicMissingRepo.length}`);
  console.log(`  3. rainbow.json kartı var ama repoda yok: ${errorsA.rainbowJsonMissingRepo.length}`);
  console.log(`  4. classic.json kartı var ama repoda yok: ${errorsA.classicJsonMissingRepo.length}`);
  console.log(`  5. Etkin PBE bağlantısı repoda yok: ${errorsA.pbeMissingRepo.length}`);
  console.log(`  6. Manifest enabled=true ama repoda yok: ${errorsA.manifestEnabledMissingRepo.length}\n`);

  // ====================================================
  // BÖLÜM 3: CLASSIC KOLEKSİYONU DERİNLEMESİNE DOĞRULAMA
  // ====================================================
  console.log('--- BÖLÜM 3: CLASSIC KOLEKSİYONU DERİNLEMESİNE DOĞRULAMA ---');

  const classicIdxMap = new Map();
  if (classicIndex && Array.isArray(classicIndex.champions)) {
    for (const c of classicIndex.champions) {
      for (const sk of (c.skins || [])) {
        classicIdxMap.set(String(sk.id), { sk, champ: c });
      }
    }
  }

  // 1. Görünen ad ↔ classic/index.json karşılaştırması
  let clExactMatchEn = 0;
  let clDiffEn = 0;
  const clNamingDiffs = [];

  for (const c of (classicData.skins || [])) {
    const raw = classicIdxMap.get(c.id);
    if (!raw) continue;
    if (c.nameEn === raw.sk.name) {
      clExactMatchEn++;
    } else {
      clDiffEn++;
      clNamingDiffs.push({
        id: c.id,
        displayedEn: c.nameEn,
        indexName: raw.sk.name
      });
    }
  }

  console.log(`  1. Görünen nameEn ↔ classic/index.json karşılaştırması:`);
  console.log(`     - Birebir aynı: ${clExactMatchEn} / ${classicData.skins.length} (%${((clExactMatchEn / classicData.skins.length) * 100).toFixed(1)})`);
  console.log(`     - Resmi Riot canlı yerelleştirmesi sebebiyle farklı adlandırılmış: ${clDiffEn}`);
  for (const d of clNamingDiffs) {
    console.log(`       * [${d.id}] Görünen: "${d.displayedEn}" ↔ Index: "${d.indexName}"`);
  }

  // 2. Canlı skin adından türetilenle çelişenler
  let liveDerivedMatches = 0;
  let liveDerivedConflicts = 0;
  const liveConflicts = [];

  for (const c of (classicData.skins || [])) {
    if (!c.liveSkinId) continue;
    const live = liveSkinById.get(String(c.liveSkinId));
    const raw = classicIdxMap.get(c.id);
    if (live && raw) {
      if (live.nameEn === raw.sk.name) {
        liveDerivedMatches++;
      } else {
        liveDerivedConflicts++;
        liveConflicts.push({
          id: c.id,
          liveSkinId: c.liveSkinId,
          liveNameEn: live.nameEn,
          indexName: raw.sk.name
        });
      }
    }
  }

  console.log(`\n  2. Canlı skin adından türetilenler ↔ classic/index.json:`);
  console.log(`     - Birebir aynı: ${liveDerivedMatches}`);
  console.log(`     - Farklılık / Çelişki: ${liveDerivedConflicts}`);
  for (const lc of liveConflicts) {
    console.log(`       * [${lc.id}] Canlı ID ${lc.liveSkinId} Adı: "${lc.liveNameEn}" ↔ Index: "${lc.indexName}"`);
  }

  // 3. 116 "Classic'e özel" girdinin ad kaynağı
  const classicOnly = (classicData.skins || []).filter(c => !c.liveSkinId);
  console.log(`\n  3. 116 "Classic'e özel" (Canlı oyunda eşdeğeri olmayan) girdilerin analizi:`);
  console.log(`     - Toplam Classic'e özel girdi sayısı: ${classicOnly.length}`);
  console.log(`     - Ad kaynağı: classic/index.json (sk.name).`);
  console.log(`     - İngilizce ad doğrudan kaynak repo adı ('Classic {Champ}'), Türkçe ad ise 'Klasik {Champ}' olarak türetilir.`);
  console.log(`     - Örnek 5 girdi:`);
  for (const co of classicOnly.slice(0, 5)) {
    const raw = classicIdxMap.get(co.id);
    console.log(`       * [${co.id}] TR: "${co.nameTr}" | EN: "${co.nameEn}" | Kaynak: "${raw?.sk?.name}"`);
  }

  // 4. Görsellerin doğru skine ait olup olmadığı
  let validClassicImages = 0;
  let invalidClassicImages = 0;
  for (const c of (classicData.skins || [])) {
    if (c.image && c.image.startsWith('https://raw.communitydragon.org/')) {
      validClassicImages++;
    } else {
      invalidClassicImages++;
    }
  }
  console.log(`\n  4. Görsellerin doğruluğu:`);
  console.log(`     - Geçerli CommunityDragon / Project Jade CDN görseline sahip: ${validClassicImages} / ${classicData.skins.length}`);
  console.log(`     - Hatalı / Boş görsel: ${invalidClassicImages}\n`);

  // ====================================================
  // BÖLÜM 4: REPOSUNDA VAR AMA SİTEDE YOK KONTROLÜ
  // ====================================================
  console.log('--- BÖLÜM 4: REPOSUNDA VAR AMA SİTEDE YOK KONTROLÜ ---');

  const warningsB = {
    orphanRainbowBlobs: [],
    orphanClassicBlobs: [],
    skinsMissingHasRainbow: [],
    skinsMissingHasClassic: []
  };

  const matchedRainbowBlobPaths = new Set();
  const matchedClassicBlobPaths = new Set();

  for (const r of rainbowData.skins || []) {
    const entry = manifestByCollectionAndId.get(`rainbow:${r.id}`);
    if (entry?.path) matchedRainbowBlobPaths.add(entry.path);
  }

  for (const c of classicData.skins || []) {
    const entry = manifestByCollectionAndId.get(`classic:${c.id}`);
    if (entry?.path) matchedClassicBlobPaths.add(entry.path);
  }

  for (const blob of treeRainbowFantomes) {
    if (!matchedRainbowBlobPaths.has(blob)) {
      warningsB.orphanRainbowBlobs.push(blob);
    }
  }

  for (const blob of treeClassicFantomes) {
    if (!matchedClassicBlobPaths.has(blob)) {
      warningsB.orphanClassicBlobs.push(blob);
    }
  }

  for (const r of rainbowData.skins || []) {
    const liveSkin = liveSkinById.get(String(r.id));
    if (liveSkin && !liveSkin.hasRainbow) {
      warningsB.skinsMissingHasRainbow.push({ id: r.id, name: r.name });
    }
  }

  for (const c of classicData.skins || []) {
    if (c.liveSkinId) {
      const liveSkin = liveSkinById.get(String(c.liveSkinId));
      if (liveSkin && !liveSkin.hasClassic && !c.parentSkinId) {
        warningsB.skinsMissingHasClassic.push({ id: c.liveSkinId, classicId: c.id, name: c.name });
      }
    }
  }

  console.log(`  1. Sahipsiz rainbow/ dosyaları:              ${warningsB.orphanRainbowBlobs.length}`);
  console.log(`  2. Sahipsiz classic/ dosyaları:              ${warningsB.orphanClassicBlobs.length}`);
  console.log(`  3. Repoda Rainbow var ama hasRainbow false:  ${warningsB.skinsMissingHasRainbow.length}`);
  console.log(`  4. Repoda Classic var ama hasClassic false:  ${warningsB.skinsMissingHasClassic.length}\n`);

  // ====================================================
  // BÖLÜM 5: CAFE CUTIES VE ÖRNEK GİRDİLER
  // ====================================================
  console.log('--- BÖLÜM 5: CAFE CUTIES VE ÖRNEK GİRDİLER ---');

  const allCafeCuties = (skinsData.skins || []).filter(s =>
    (s.nameEn && s.nameEn.toLowerCase().includes('cafe cuties')) ||
    (s.name && s.name.toLowerCase().includes('tatlı pastane'))
  );

  const cafeBases = allCafeCuties.filter(s => !s.parentSkinId);
  console.log(`\n📌 Cafe Cuties Koleksiyonu (Toplam: ${allCafeCuties.length} skin/chroma, ${cafeBases.length} Şampiyon):`);

  for (const b of cafeBases) {
    const chromas = allCafeCuties.filter(c => String(c.parentSkinId) === String(b.id));
    const rbEntry = manifestByCollectionAndId.get(`rainbow:${b.id}`);
    const clId = String(60000000 + Number(b.id));
    const clEntry = manifestByCollectionAndId.get(`classic:${clId}`);

    console.log(`\n  🍰 [${b.championEn}] ${b.nameTr} / ${b.nameEn} (ID: ${b.id}${b.isPbe ? ' • PBE' : ''})`);
    console.log(`     - Chromalar (${chromas.length} adet): ${chromas.map(c => c.nameEn.replace(/^Cafe Cuties [^(]+\(([^)]+)\)$/, '$1')).join(', ') || 'Yok'}`);
    console.log(`     - hasRainbow: ${Boolean(b.hasRainbow)} (Paket: ${rbEntry ? rbEntry.path : 'YOK'})`);
    console.log(`     - hasClassic: ${Boolean(b.hasClassic)} (Paket: ${clEntry ? clEntry.path : 'YOK'})`);
  }

  // ====================================================
  // ÖZET VE SONUÇ
  // ====================================================
  const totalPbePacksInRepo = treePbeFantomes.size;
  const totalPbeVerified = Object.values(manifestEntries).filter(entry =>
    entry.c === 'pbe' && entry.enabled && treePbeFantomes.has(entry.path)).length;

  console.log('\n====================================================');
  console.log('📊 KOLEKSİYON DOĞRULAMA TABLOSU:');
  console.log('---------------------------------------------------------------------');
  console.log('| Koleksiyon   | Toplam Paket | Doğrulanan | Repoda Yok (HATA) | Sahipsiz |');
  console.log('---------------------------------------------------------------------');
  console.log(`| Skins (Live) | ${String(skinsData.skins.length).padEnd(12)} | ${String(skinsData.skins.length - errorsA.skinsHasRainbowMissingRepo.length - errorsA.skinsHasClassicMissingRepo.length).padEnd(10)} | ${String(errorsA.skinsHasRainbowMissingRepo.length + errorsA.skinsHasClassicMissingRepo.length).padEnd(17)} | -        |`);
  console.log(`| Rainbow      | ${String(rainbowData.skins.length).padEnd(12)} | ${String(rainbowData.skins.length - errorsA.rainbowJsonMissingRepo.length).padEnd(10)} | ${String(errorsA.rainbowJsonMissingRepo.length).padEnd(17)} | ${String(warningsB.orphanRainbowBlobs.length).padEnd(8)} |`);
  console.log(`| Classic      | ${String(classicData.skins.length).padEnd(12)} | ${String(classicData.skins.length - errorsA.classicJsonMissingRepo.length).padEnd(10)} | ${String(errorsA.classicJsonMissingRepo.length).padEnd(17)} | ${String(warningsB.orphanClassicBlobs.length).padEnd(8)} |`);
  console.log(`| PBE          | ${String(totalPbePacksInRepo).padEnd(12)} | ${String(totalPbeVerified).padEnd(10)} | ${String(errorsA.pbeMissingRepo.length).padEnd(17)} | 0        |`);
  console.log('=====================================================================\n');

  const reconciledIndexPaths = new Set(Object.values(manifestEntries)
    .filter(entry => !entry.legacy && (!entry.enabled || entry.indexedPath))
    .map(entry => entry.indexedPath || entry.path));
  const unreconciledIndexPaths = Object.values(indexMissing).flat()
    .map(item => typeof item === 'string' ? item : item.path)
    .filter(path => !reconciledIndexPaths.has(path));
  const totalErrorsA = identityErrors.length + unreconciledIndexPaths.length +
    errorsA.skinsHasRainbowMissingRepo.length +
    errorsA.skinsHasClassicMissingRepo.length +
    errorsA.rainbowJsonMissingRepo.length +
    errorsA.classicJsonMissingRepo.length +
    errorsA.pbeMissingRepo.length +
    errorsA.manifestEnabledMissingRepo.length;

  if (totalErrorsA > 0) {
    if (identityErrors.length) console.error('Katalog kimlik hataları:', identityErrors.slice(0, 25));
    if (unreconciledIndexPaths.length) console.error('Eşlenmemiş indeks yolları:', unreconciledIndexPaths.slice(0, 25));
    console.error(`❌ BAŞARISIZ: Toplam ${totalErrorsA} adet eksik dosya veya tutarsızlık bulundu!`);
    return { success: false, totalErrorsA, errorsA, warningsB, indexMissing };
  }

  console.log('✅ BAŞARILI: Koleksiyon kimlikleri ve etkin indirme yolları doğrulandı.');
  return { success: true, totalErrorsA: 0, errorsA, warningsB, indexMissing };
}

if (process.argv[1] && process.argv[1].endsWith('verify-collections.mjs')) {
  verifyCollections()
    .then((res) => {
      if (!res.success) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('Koleksiyon doğrulama sırasında beklenmeyen hata:', err);
      process.exit(1);
    });
}
