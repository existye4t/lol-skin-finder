import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { PATHS, buildSourceDownloadUrl } from './config.mjs';
import { fetchSourceTree, fetchWithRetry, sourceSnapshot } from './sync-source.mjs';
import { validAssetPath } from './reconcile-downloads.mjs';
import { downloadVerifiedPackage } from './fantome-package.mjs';

function parseArgs(argv) {
  let sampleSize = 20;
  let newOnly = false;
  let download = false;
  for (const arg of argv) {
    if (arg === '--new-only') {
      newOnly = true;
    } else if (arg === '--download-samples') {
      download = true;
    } else if (arg.startsWith('--sample=')) {
      const val = Number(arg.split('=')[1]);
      if (Number.isFinite(val) && val >= 0) sampleSize = val;
    }
  }
  return { sampleSize, newOnly, download };
}

function pickRandomSample(items, count) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(count, arr.length));
}

export async function checkLinks({ sampleSize = 20, newOnly = false, download = false, snapshot } = {}) {
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
  snapshot ??= await sourceSnapshot();
  if (manifest.sourceRevision && (await sourceSnapshot(manifest.sourceRevision)).baseUrl !== manifest.baseUrl) {
    throw new Error('Manifest download URL does not match its upstream commit');
  }
  const treeItems = await fetchSourceTree(snapshot.revision);
  const remoteBlobs = new Map(
    treeItems
      .filter(item => item.type === 'blob' && item.path.endsWith('.fantome'))
      .map(item => [item.path, item])
  );

  // 2. Tüm aktif girdiler için: kompakt şema + Trees API varlık kontrolü + URL encode doğrulaması
  const missingInTree = [];
  const encodeErrors = [];
  const schemaErrors = [];
  const activeEntries = [];
  const usedPaths = new Set();

  for (const [key, entry] of entries) {
    if ('url' in entry || 'legacyPath' in entry) {
      schemaErrors.push(`${key}: Girdi içinde url veya legacyPath saklanmamalı!`);
    }
    if (key !== `${entry.c}:${entry.id}` || typeof entry.enabled !== 'boolean' ||
        !['enabled', 'missing', 'ambiguous', 'legacy'].includes(entry.status) ||
        !entry.legacy && entry.enabled !== (entry.status === 'enabled')) {
      schemaErrors.push(`${key}: Invalid manifest identity or status`);
    }
    if (!entry.enabled || entry.legacy) continue;

    activeEntries.push([key, entry]);

    const blob = remoteBlobs.get(entry.path);
    if (!validAssetPath(entry.path, entry.c) || !blob ||
        manifest.sourceRevision && (entry.blobSha !== blob.sha || entry.bytes !== blob.size)) {
      missingInTree.push({ key, path: entry.path });
    }
    if (usedPaths.has(entry.path)) schemaErrors.push(`${key}: Path already assigned: ${entry.path}`);
    usedPaths.add(entry.path);

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
    throw new Error('Invalid manifest schema');
  }
  if (missingInTree.length > 0) {
    console.error('[check-links] Kaynak ağaçta bulunamayan girdiler:', missingInTree.slice(0, 15));
    throw new Error('Invalid Git tree mappings');
  }
  if (encodeErrors.length > 0) {
    console.error('[check-links] URL Encode hataları:', encodeErrors.slice(0, 15));
    throw new Error('Invalid generated download URL');
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

  const byCollection = [...new Set(activeEntries.map(([, entry]) => entry.c))];
  const samplePool = download ? activeEntries.filter(([, entry]) => entry.bytes <= 35 * 1024 ** 2) : activeEntries;
  const first = byCollection.flatMap(collection => pickRandomSample(
    samplePool.filter(([, entry]) => entry.c === collection), download ? 2 : 1)).slice(0, sampleSize);
  const selected = new Set(first.map(([key]) => key));
  const remaining = (download ? samplePool : candidates).filter(([key]) => !selected.has(key));
  const sampled = [...first, ...pickRandomSample(remaining, sampleSize - first.length)];
  if (download && byCollection.some(collection => !sampled.some(([, entry]) => entry.c === collection))) {
    throw new Error('Missing representative download sample');
  }
  console.log(`[check-links] ${sampled.length} örnek için ${download ? 'GET + paket checksum' : 'HEAD'} doğrulaması.`);

  const brokenLinks = [];
  const concurrency = download ? 2 : 5;
  for (let i = 0; i < sampled.length; i += concurrency) {
    const batch = sampled.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async ([key, entry]) => {
        const url = buildSourceDownloadUrl(entry.path, manifest.baseUrl);
        if (download) {
          await downloadVerifiedPackage(manifest.baseUrl, entry);
          console.log(`[check-links] ${key} ${entry.path} (${entry.bytes} bytes, checksum OK)`);
          return { key, path: entry.path, url, ok: true, status: 200 };
        }
        const res = await fetchWithRetry(url, { method: 'HEAD' });
        return { key, path: entry.path, url, ok: res.ok, status: res.status };
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
    throw new Error('Broken sampled download links');
  }

  console.log(`[check-links] BAŞARILI: ${sampled.length}/${sampled.length} örnek doğrulandı.`);
  return { active: activeEntries.length, sampled: sampled.length };
}

if (process.argv[1]?.endsWith('check-links.mjs')) {
  checkLinks(parseArgs(process.argv.slice(2))).catch(err => {
    console.error('[check-links] HATA:', err.message);
    process.exitCode = 1;
  });
}
