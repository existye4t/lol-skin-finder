import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSourceTree } from './prepare-fantome.mjs';
import {
  DATA_DIR,
  PATHS,
  RAW_BASE_URL,
  sanitizeYimiFileName
} from './config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadJson(filePath) {
  if (!existsSync(filePath)) return null;
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

export async function verifyCollections({ verbose = false, sampleSize = 15 } = {}) {
  console.log('====================================================');
  console.log('🔍 LOL SKIN FINDER — KOLEKSİYON VERİ DOĞRULAMA');
  console.log('   Doğruluğun Kaynağı: GitHub Git Trees API (Canlı Ağaç)');
  console.log('====================================================\n');

  // 1. Dosyaları ve ağacı yükle
  console.log('[1/4] Git Trees ağacı ve yerel veri dosyaları çekiliyor...');
  const [tree, manifest, skinsData, rainbowData, classicData, chromaCycles, classicIndex] = await Promise.all([
    fetchSourceTree(),
    loadJson(PATHS.manifest),
    loadJson(PATHS.skins),
    loadJson(PATHS.rainbow),
    loadJson(PATHS.classic),
    fetch(`${RAW_BASE_URL}rainbow/chroma-cycles.json`).then(r => r.json()).catch(() => null),
    fetch(`${RAW_BASE_URL}classic/index.json`).then(r => r.json()).catch(() => null)
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

  // ====================================================
  // BÖLÜM A: "Sitede var diyor ama repoda yok" (Kritik Hatalar)
  // ====================================================
  console.log('--- BÖLÜM A: SİTEDE VAR AMA REPOSUNDA YOK KONTROLÜ ---');

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
      // Classic ID'si 60000000 + ID
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
    if (!entry || !entry.path || !treeBlobs.has(entry.path)) {
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
    if (!entry || !entry.path || !treeBlobs.has(entry.path)) {
      errorsA.classicJsonMissingRepo.push({
        id: c.id,
        name: c.name,
        champion: c.champion,
        path: entry?.path || 'manifeste bulunamadı'
      });
    }
  }

  // A5: isPbe=true olan her girdi için PBE/ altında dosya var mı?
  for (const s of skinsData.skins || []) {
    if (s.isPbe) {
      const entry = manifestByCollectionAndId.get(`pbe:${s.id}`);
      if (!entry || !entry.path || !treeBlobs.has(entry.path)) {
        errorsA.pbeMissingRepo.push({
          id: s.id,
          name: s.name,
          champion: s.champion,
          path: entry?.path || 'PBE dosyası bulunamadı'
        });
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
  console.log(`  5. isPbe=true ama repoda yok:            ${errorsA.pbeMissingRepo.length}`);
  console.log(`  6. Manifest enabled=true ama repoda yok: ${errorsA.manifestEnabledMissingRepo.length}\n`);

  // ====================================================
  // BÖLÜM B: "Repoda var ama sitede yok" (Sahipsiz / Eksik Bayrak)
  // ====================================================
  console.log('--- BÖLÜM B: REPOSUNDA VAR AMA SİTEDE YOK KONTROLÜ ---');

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

  // Trees'te dosyası olan ama canlı skinde hasRainbow false olanlar
  for (const r of rainbowData.skins || []) {
    const liveSkin = liveSkinById.get(String(r.id));
    if (liveSkin && !liveSkin.hasRainbow) {
      warningsB.skinsMissingHasRainbow.push({ id: r.id, name: r.name });
    }
  }

  // Trees'te dosyası olan ama canlı skinde hasClassic false olanlar
  for (const c of classicData.skins || []) {
    if (c.liveSkinId) {
      const liveSkin = liveSkinById.get(String(c.liveSkinId));
      if (liveSkin && !liveSkin.hasClassic && !c.parentSkinId) {
        warningsB.skinsMissingHasClassic.push({ id: c.liveSkinId, classicId: c.id, name: c.name });
      }
    }
  }

  console.log(`  1. Sahipsiz rainbow/ dosyaları:          ${warningsB.orphanRainbowBlobs.length}`);
  console.log(`  2. Sahipsiz classic/ dosyaları:          ${warningsB.orphanClassicBlobs.length}`);
  console.log(`  3. Repoda Rainbow var ama hasRainbow false: ${warningsB.skinsMissingHasRainbow.length}`);
  console.log(`  4. Repoda Classic var ama hasClassic false: ${warningsB.skinsMissingHasClassic.length}\n`);

  // ====================================================
  // BÖLÜM C: Ad / ID / Meta Doğruluğu
  // ====================================================
  console.log('--- BÖLÜM C: AD / ID / META DOĞRULUĞU KONTROLÜ ---');

  const metaChecks = {
    rainbowNameMismatch: [],
    rainbowCycleMismatch: [],
    classicChampFolderMismatch: [],
    classicNameMismatch: [],
    indexVsTreesMissing: []
  };

  // C1: Rainbow şampiyon ve skin adı canlı skinle tutuyor mu & states sayısı
  const cycleBySkinId = new Map();
  if (chromaCycles?.packages) {
    for (const pkg of chromaCycles.packages) {
      const champLower = (pkg.champion || '').toLowerCase();
      // champ key'i bul
      for (const [sId, s] of liveSkinById.entries()) {
        if (s.championEn?.toLowerCase() === champLower && Number(s.skinNum) === Number(pkg.skin)) {
          cycleBySkinId.set(String(sId), pkg);
          break;
        }
      }
    }
  }

  for (const r of rainbowData.skins || []) {
    const live = liveSkinById.get(String(r.id));
    if (live) {
      if (live.championEn !== r.championEn) {
        metaChecks.rainbowNameMismatch.push({
          id: r.id,
          rainbowChamp: r.championEn,
          liveChamp: live.championEn
        });
      }
    }
    const cycle = cycleBySkinId.get(String(r.id));
    if (cycle && Array.isArray(cycle.states)) {
      if (r.cycleCount !== cycle.states.length) {
        metaChecks.rainbowCycleMismatch.push({
          id: r.id,
          rainbowCycleCount: r.cycleCount,
          expectedStates: cycle.states.length
        });
      }
    }
  }

  // C2: Classic şampiyon klasörü Jade_{Champion} tutarlılığı
  for (const c of classicData.skins || []) {
    const entry = manifestByCollectionAndId.get(`classic:${c.id}`);
    if (entry?.path) {
      const parts = entry.path.split('/');
      const folder = parts[1]; // örn. Jade_Annie
      const expectedPrefix = 'Jade_';
      if (!folder.startsWith(expectedPrefix)) {
        metaChecks.classicChampFolderMismatch.push({
          id: c.id,
          name: c.name,
          path: entry.path
        });
      }
    }
  }

  console.log(`  1. Rainbow şampiyon adı canlıyla çelişen: ${metaChecks.rainbowNameMismatch.length}`);
  console.log(`  2. Rainbow cycleCount uyuşmazlığı:       ${metaChecks.rainbowCycleMismatch.length}`);
  console.log(`  3. Classic klasör Jade_ önek hatası:      ${metaChecks.classicChampFolderMismatch.length}\n`);

  // ====================================================
  // BÖLÜM D: Örnekler & Cafe Cuties İncelemesi
  // ====================================================
  console.log('--- BÖLÜM D: CAFE CUTIES VE RASTGELE ÖRNEKLER ---');

  const cafeCutiesSkins = (skinsData.skins || []).filter(s =>
    (s.nameEn && s.nameEn.toLowerCase().includes('cafe cuties')) ||
    (s.name && s.name.toLowerCase().includes('tatlı pastane'))
  );

  console.log(`\n📌 Cafe Cuties Skinleri (Canlı/PBE Toplam: ${cafeCutiesSkins.length}):`);
  for (const s of cafeCutiesSkins) {
    const rbEntry = manifestByCollectionAndId.get(`rainbow:${s.id}`);
    const clId = String(60000000 + Number(s.id));
    const clEntry = manifestByCollectionAndId.get(`classic:${clId}`);
    console.log(`  - [ID: ${s.id}] ${s.nameEn} (${s.championEn}) | hasRainbow: ${Boolean(s.hasRainbow)} (dosya: ${rbEntry ? 'VAR' : 'YOK'}) | hasClassic: ${Boolean(s.hasClassic)} (dosya: ${clEntry ? 'VAR' : 'YOK'}) | isPbe: ${Boolean(s.isPbe)}`);
  }

  console.log('\n📌 Koleksiyonlardan Rastgele Örnekler:');
  const sampleRainbow = (rainbowData.skins || []).slice(0, 5);
  console.log('  Rainbow Örnekleri:');
  for (const r of sampleRainbow) {
    const entry = manifestByCollectionAndId.get(`rainbow:${r.id}`);
    console.log(`    - [${r.id}] ${r.nameEn} (${r.championEn}) -> ${entry?.path} (${r.cycleCount} Chromas)`);
  }

  const sampleClassic = (classicData.skins || []).slice(0, 5);
  console.log('  Classic Örnekleri:');
  for (const c of sampleClassic) {
    const entry = manifestByCollectionAndId.get(`classic:${c.id}`);
    console.log(`    - [${c.id}] ${c.nameEn} (${c.championEn}) -> ${entry?.path}`);
  }

  // ====================================================
  // ÖZET VE SONUÇ
  // ====================================================
  console.log('\n====================================================');
  console.log('📊 KOLEKSİYON DOĞRULAMA TABLOSU:');
  console.log('----------------------------------------------------');
  console.log('| Koleksiyon | Toplam | Doğru | Repoda Yok (HATA) | Sahipsiz |');
  console.log('----------------------------------------------------');
  console.log(`| Skins (Live) | ${skinsData.skins.length} | ${skinsData.skins.length - errorsA.skinsHasRainbowMissingRepo.length - errorsA.skinsHasClassicMissingRepo.length} | ${errorsA.skinsHasRainbowMissingRepo.length + errorsA.skinsHasClassicMissingRepo.length} | - |`);
  console.log(`| Rainbow    | ${rainbowData.skins.length} | ${rainbowData.skins.length - errorsA.rainbowJsonMissingRepo.length} | ${errorsA.rainbowJsonMissingRepo.length} | ${warningsB.orphanRainbowBlobs.length} |`);
  console.log(`| Classic    | ${classicData.skins.length} | ${classicData.skins.length - errorsA.classicJsonMissingRepo.length} | ${errorsA.classicJsonMissingRepo.length} | ${warningsB.orphanClassicBlobs.length} |`);
  console.log(`| PBE        | ${skinsData.skins.filter(s => s.isPbe).length} | ${skinsData.skins.filter(s => s.isPbe).length - errorsA.pbeMissingRepo.length} | ${errorsA.pbeMissingRepo.length} | - |`);
  console.log('====================================================\n');

  const totalErrorsA =
    errorsA.skinsHasRainbowMissingRepo.length +
    errorsA.skinsHasClassicMissingRepo.length +
    errorsA.rainbowJsonMissingRepo.length +
    errorsA.classicJsonMissingRepo.length +
    errorsA.pbeMissingRepo.length +
    errorsA.manifestEnabledMissingRepo.length;

  if (totalErrorsA > 0) {
    console.error(`❌ BAŞARISIZ: Bölüm A'da ${totalErrorsA} adet "Sitede var diyor ama repoda yok" hatası bulundu!`);
    return { success: false, totalErrorsA, errorsA, warningsB, metaChecks };
  }

  console.log("✅ BAŞARILI: Bölüm A'da sıfır hata! Sitede iddia edilen tüm dosyalar kaynak repoda mevcut.");
  return { success: true, totalErrorsA: 0, errorsA, warningsB, metaChecks };
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
