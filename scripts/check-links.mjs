import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { PATHS, buildSourceDownloadUrl } from './config.mjs';
import { fetchSourceTree } from './prepare-fantome.mjs';

function parseArgs(argv) {
  let sampleSize = 20;
  let newOnly = false;
  for (const arg of argv) {
    if (arg === '--new-only') {
      newOnly = true;
    } else if (arg.startsWith('--sample=')) {
      const val = Number(arg.split('=')[1]);
      if (Number.isFinite(val) && val >= 0) sampleSize = val;
    }
  }
  return { sampleSize, newOnly };
}

function pickRandomSample(items, count) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(count, arr.length));
}

async function headWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'lol-skin-finder-link-checker' }
      });
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, attempt * 1000));
          continue;
        }
      }
      return { ok: res.ok, status: res.status };
    } catch (err) {
      if (attempt === retries) {
        return { ok: false, status: 0, error: err.message };
      }
      await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }
  return { ok: false, status: 0 };
}

async function main() {
  const { sampleSize, newOnly } = parseArgs(process.argv.slice(2));

  if (!existsSync(PATHS.manifest)) {
    throw new Error('fantome-manifest.json bulunamadı! Önce "npm run prepare-fantome" çalıştırın.');
  }

  const manifest = JSON.parse(await readFile(PATHS.manifest, 'utf8'));
  const entries = Object.entries(manifest.entries || {});
  if (entries.length === 0) {
    throw new Error('Manifest içinde hiçbir girdi yok!');
  }

  console.log(`[check-links] Manifest doğrulanıyor (${entries.length} toplam girdi)...`);

  // 1. GitHub Trees API dosya listesini çek
  const treeItems = await fetchSourceTree();
  const remoteBlobSet = new Set(
    treeItems
      .filter(item => item.type === 'blob' && item.path.endsWith('.fantome'))
      .map(item => item.path)
  );

  // 2. Tüm aktif girdiler için: kompakt şema + Trees API varlık kontrolü + URL encode doğrulaması
  const missingInTree = [];
  const encodeErrors = [];
  const schemaErrors = [];
  const activeEntries = [];

  for (const [key, entry] of entries) {
    if ('url' in entry || 'legacyPath' in entry) {
      schemaErrors.push(`${key}: Girdi içinde url veya legacyPath saklanmamalı!`);
    }
    if (!entry.enabled || entry.legacy || entry.status === 'missing') continue;

    activeEntries.push([key, entry]);

    if (!entry.path || !remoteBlobSet.has(entry.path)) {
      missingInTree.push({ key, path: entry.path });
    }

    const builtUrl = buildSourceDownloadUrl(entry.path, manifest.baseUrl);
    try {
      const parsed = new URL(builtUrl);
      if (parsed.pathname.includes(' ') || parsed.search || parsed.hash) {
        encodeErrors.push({ key, path: entry.path, builtUrl, reason: 'Encode edilmemiş boşluk, ? veya # bulundu' });
      }
      const decodedSegments = parsed.pathname
        .split('/')
        .slice(4) // /{owner}/{repo}/{branch}/ sonrası
        .map(s => decodeURIComponent(s))
        .join('/');
      if (decodedSegments !== entry.path) {
        encodeErrors.push({ key, path: entry.path, builtUrl, reason: `Decode uyuşmazlığı: ${decodedSegments}` });
      }
    } catch (err) {
      encodeErrors.push({ key, path: entry.path, builtUrl, reason: err.message });
    }
  }

  console.log(`[check-links] Trees API doğrulaması: ${activeEntries.length - missingInTree.length}/${activeEntries.length} girdi kaynak ağaçta mevcut.`);
  console.log(`[check-links] URL Encode doğrulaması: ${activeEntries.length - encodeErrors.length}/${activeEntries.length} geçerli.`);

  if (schemaErrors.length > 0) {
    console.error('[check-links] Şema hataları:', schemaErrors.slice(0, 10));
    process.exit(1);
  }
  if (missingInTree.length > 0) {
    console.error('[check-links] Kaynak ağaçta bulunamayan girdiler:', missingInTree.slice(0, 15));
    process.exit(1);
  }
  if (encodeErrors.length > 0) {
    console.error('[check-links] URL Encode hataları:', encodeErrors.slice(0, 15));
    process.exit(1);
  }

  // 3. 20 rastgele (veya --new-only ile yeni eklenen) girdi için gerçek HEAD isteği
  let candidates = activeEntries;
  if (newOnly && existsSync(PATHS.syncReport)) {
    try {
      const report = JSON.parse(await readFile(PATHS.syncReport, 'utf8'));
      const newKeySet = new Set([...(report.addedSample || []), ...(report.changedSample || [])]);
      const newCandidates = activeEntries.filter(([k]) => newKeySet.has(k));
      if (newCandidates.length > 0) {
        console.log(`[check-links] --new-only aktif: ${newCandidates.length} yeni/değişen girdi önceliklendirildi.`);
        candidates = newCandidates.length >= sampleSize
          ? newCandidates
          : [...newCandidates, ...pickRandomSample(activeEntries.filter(([k]) => !newKeySet.has(k)), sampleSize - newCandidates.length)];
      }
    } catch {
      // syncReport okunamazsa tüm aktif girdilerden örnekle
    }
  }

  const sampled = pickRandomSample(candidates, sampleSize);
  console.log(`[check-links] ${sampled.length} örnek girdi için HTTP HEAD kontrolü yapılıyor (eşzamanlılık: 5)...`);

  const brokenLinks = [];
  const concurrency = 5;
  for (let i = 0; i < sampled.length; i += concurrency) {
    const batch = sampled.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async ([key, entry]) => {
        const url = buildSourceDownloadUrl(entry.path, manifest.baseUrl);
        const res = await headWithRetry(url);
        return { key, path: entry.path, url, ...res };
      })
    );
    for (const r of results) {
      if (!r.ok) {
        brokenLinks.push(r);
      }
    }
  }

  if (brokenLinks.length > 0) {
    console.error(`[check-links] HATA: ${brokenLinks.length}/${sampled.length} HEAD isteği başarısız oldu:`, brokenLinks);
    process.exit(1);
  }

  console.log(`[check-links] BAŞARILI: ${sampled.length}/${sampled.length} örnek HEAD isteği HTTP 200 döndü. Kırık link yok!`);
}

main().catch(err => {
  console.error('[check-links] HATA:', err.message);
  process.exit(1);
});
