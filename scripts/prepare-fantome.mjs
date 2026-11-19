import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import {
  DATA_DIR, SOURCE_REPO, SOURCE_BRANCH, ENABLE_LEGACY_FANTOME, LEGACY_BASE_PATH,
  MAX_ALLOWED_DROP_RATIO, PATHS, sanitizeYimiFileName, sanitizeYimiFolderName
} from './config.mjs';
import { fetchJson, fetchSourceTree, latestDataDragonVersion, sourceSnapshot } from './sync-source.mjs';
import { reconcileDownloads, skinNumber } from './reconcile-downloads.mjs';
import { downloadVerifiedPackage, verifyRainbowIdentity } from './fantome-package.mjs';

export { fetchSourceTree } from './sync-source.mjs';

async function readOptional(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function validateIndex(root, pbe, rainbow, classic) {
  if (!root?.patch || !Object.keys(root.champions || {}).length ||
      !pbe?.sourcePatch || !Array.isArray(pbe.packages) || !Array.isArray(pbe.formPackages) ||
      !Array.isArray(rainbow?.packages) || !rainbow.packages.length ||
      !Array.isArray(classic?.champions) || !classic.champions.length) {
    throw new Error('Incomplete Yimikami index');
  }
}

export function indexedDownloads(root, pbe, rainbow, classic, champions) {
  validateIndex(root, pbe, rainbow, classic);
  const byId = new Map(champions.map(champ => [Number(champ.key), champ]));
  const byName = new Map(champions.flatMap(champ => [
    [champ.id.toLowerCase(), champ], [champ.name.toLowerCase(), champ]
  ]));
  const candidates = [];
  const liveIds = new Set();
  const requireChampion = (alias, key) => {
    const byAlias = byName.get(String(alias).toLowerCase());
    const champion = key === undefined ? byAlias : byId.get(Number(key));
    if (!champion || (byAlias && byAlias.id !== champion.id)) {
      throw new Error('Conflicting or unknown champion: ' + alias + ' / ' + key);
    }
    return champion;
  };
  const add = (c, champ, id, name, type, path, pId, sha256, sourceBytes) => {
    const offset = c === 'classic' ? 60_000_000 : 0;
    const owner = value => Math.floor((Number(String(value).split('_')[0]) - offset) / 1000);
    if (owner(id) !== Number(champ.key) || pId !== undefined && owner(pId) !== Number(champ.key)) {
      throw new Error('Cross-champion source ID: ' + c + ':' + id);
    }
    if (sha256 && !/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Invalid source digest: ' + path);
    const segments = path.split('/');
    const folder = c === 'pbe' ? segments[2] : segments[1];
    if (c === 'classic' ? !folder?.startsWith('Jade_') ||
        requireChampion(folder.slice(5)).id !== champ.id || segments.at(-1) !== id + '.fantome' :
        requireChampion(folder).id !== champ.id) {
      throw new Error('Cross-champion source path: ' + path);
    }
    candidates.push({
      c, id, ...(pId !== undefined ? { pId } : {}), champ: champ.id, name, type, path,
      ...(sha256 ? { sha256 } : {}),
      ...(Number.isSafeInteger(sourceBytes) && sourceBytes > 0 ? { sourceBytes } : {})
    });
  };

  for (const [folder, group] of Object.entries(root.champions)) {
    const champion = requireChampion(folder);
    const base = Number(champion.key) * 1000;
    for (const [number, name] of Object.entries(group.skins || {})) {
      const id = base + skinNumber(number);
      add('skins', champion, id, name, 'base', 'skins/' + folder + '/' + sanitizeYimiFileName(name) + '.fantome');
      liveIds.add(id);
    }
    for (const [type, parentGroups] of [['chroma', group.chromas], ['form', group.forms]]) {
      for (const [parent, children] of Object.entries(parentGroups || {})) {
        const parentNumber = skinNumber(parent);
        const parentName = parentNumber === 0 ? folder : group.skins?.[parent];
        if (!parentName) throw new Error('Missing source parent: ' + folder + '/' + parent);
        for (const [number, name] of Object.entries(children)) {
          const id = base + skinNumber(number);
          add('skins', champion, id, name, type,
            'skins/' + folder + '/' + sanitizeYimiFolderName(parentName) + '/' + sanitizeYimiFileName(name) + '.fantome',
            base + parentNumber);
          liveIds.add(id);
        }
      }
    }
  }

  for (const pkg of pbe.packages) {
    const id = Number(pkg.id);
    if (liveIds.has(id)) continue;
    const champion = requireChampion(pkg.champion, pkg.championId);
    add('pbe', champion, id, pkg.name, pkg.chroma ? 'chroma' : 'base', 'PBE/' + pkg.path,
      pkg.chroma ? Number(pkg.parentId) : undefined, pkg.sha256, pkg.bytes);
  }
  for (const pkg of pbe.formPackages) {
    const id = Number(pkg.id);
    if (liveIds.has(id)) continue;
    add('pbe', requireChampion(pkg.champion, pkg.championId), id + '_f' + pkg.form, pkg.name, 'form',
      'PBE/' + pkg.path, id, pkg.sha256, pkg.bytes);
  }
  for (const cycle of rainbow.packages) {
    const champion = requireChampion(cycle.champion);
    const id = Number(champion.key) * 1000 + skinNumber(cycle.skin);
    add('rainbow', champion, id, cycle.path.split('/').at(-1).replace(/\.fantome$/, ''), 'rainbow',
      'rainbow/' + cycle.path, undefined, cycle.sha256, cycle.bytes);
  }
  for (const group of classic.champions) {
    const champion = requireChampion(group.baseKey, group.baseId);
    for (const skin of group.skins) {
      add('classic', champion, String(skin.id), skin.name, skin.parentSkinId ? 'classic-chroma' : 'classic',
        'classic/' + skin.path, skin.parentSkinId ? String(skin.parentSkinId) : undefined, skin.sha256, skin.bytes);
    }
  }
  return { candidates, liveIds, byId };
}

async function verifyConflictingIndexes(entries, oldEntries, snapshot, ambiguities) {
  const conflicts = Object.entries(entries).filter(([, entry]) =>
    entry.enabled && entry.sourceBytes && entry.sourceBytes !== entry.bytes);
  for (let start = 0; start < conflicts.length; start += 5) {
    await Promise.all(conflicts.slice(start, start + 5).map(async ([key, entry]) => {
      const previous = oldEntries[key];
      const { sha256: indexSha, ...blob } = entry;
      if (entry.c === 'rainbow' && entry.bytes <= 4 * 1024 ** 2) {
        if (previous?.verifiedPackageIdentity && previous.blobSha === entry.blobSha &&
            previous.champ === entry.champ && previous.id === entry.id) {
          Object.assign(entry, { sha256: previous.sha256, verifiedPackageIdentity: true, indexSha256: indexSha });
          return;
        }
        const bytes = await downloadVerifiedPackage(snapshot.baseUrl, blob);
        try {
          verifyRainbowIdentity(bytes, entry);
          Object.assign(entry, { sha256: createHash('sha256').update(bytes).digest('hex'),
            verifiedPackageIdentity: true, indexSha256: indexSha });
          return;
        } catch (error) {
          console.warn('[prepare-fantome]', error.message, entry.path);
        }
      }
      Object.assign(entry, { enabled: false, status: 'ambiguous' });
      ambiguities.push({ key, paths: [entry.path], reason: 'Index package size differs from Git blob' });
    }));
  }
  return conflicts.length;
}

export async function prepareFantome({ snapshot, writeReport = false, currentDate = new Date() } = {}) {
  snapshot ??= await sourceSnapshot();
  const ddragonVersion = await latestDataDragonVersion();
  console.log('[prepare-fantome] Upstream ' + SOURCE_REPO + '@' + snapshot.revision);
  const [tree, root, pbe, rainbow, classic, champions, previous, legacy] = await Promise.all([
    fetchSourceTree(snapshot.revision), snapshot.index('index.json'), snapshot.index('PBE/index.json'),
    snapshot.index('rainbow/chroma-cycles.json'), snapshot.index('classic/index.json'),
    fetchJson('https://ddragon.leagueoflegends.com/cdn/' + ddragonVersion + '/data/en_US/champion.json'),
    readOptional(PATHS.manifest, null), readOptional(PATHS.legacyFantomeList, [])
  ]);
  const { candidates, liveIds, byId } = indexedDownloads(root, pbe, rainbow, classic, Object.values(champions.data));
  const oldEntries = previous?.entries || {};
  const { entries, ambiguities, unindexed } = reconcileDownloads(candidates, tree, oldEntries);
  if (Object.values(entries).some(entry => entry.enabled && entry.sourceBytes && entry.sourceBytes !== entry.bytes)) {
    console.log('[prepare-fantome] Checking ZIP identities for outdated index digests');
  }
  const indexConflicts = await verifyConflictingIndexes(entries, oldEntries, snapshot, ambiguities);

  for (const c of ['skins', 'pbe', 'rainbow', 'classic']) {
    const before = Object.values(oldEntries).filter(e => e.c === c && e.enabled && !e.legacy).length;
    const after = Object.values(entries).filter(e => e.c === c && e.enabled).length;
    if (c !== 'pbe' && before && (before - after) / before > MAX_ALLOWED_DROP_RATIO) {
      throw new Error('Excessive upstream download loss in ' + c + ': ' + before + ' -> ' + after);
    }
  }

  const promoted = [];
  const removed = Object.entries(entries).filter(([key, entry]) =>
    oldEntries[key]?.enabled && !entry.enabled).map(([key]) => key);
  for (const [key, old] of Object.entries(oldEntries)) {
    if (entries[key] || old.legacy || old.status === 'pending') continue;
    if (old.c === 'pbe' && liveIds.has(Number(old.id))) {
      promoted.push(String(old.id));
      continue;
    }
    if (old.enabled) removed.push(key);
    const { missingCount, bytes, ...metadata } = old;
    entries[key] = { ...metadata, status: 'missing', enabled: false };
  }
  for (const id of new Set(legacy.map(Number))) {
    if (entries['skins:' + id]) continue;
    if (!Number.isSafeInteger(id)) throw new Error('Invalid legacy skin identifier');
    const champion = byId.get(Math.floor(id / 1000));
    entries['skins:' + id] = {
      c: 'skins', id, champ: champion?.id || String(Math.floor(id / 1000)), name: 'Legacy #' + id,
      type: 'form', path: null, status: 'legacy', enabled: ENABLE_LEGACY_FANTOME, legacy: true
    };
  }
  const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b, 'en')));
  const stats = {};
  for (const collection of ['skins', 'pbe', 'rainbow', 'classic']) {
    const items = Object.values(sorted).filter(entry => entry.c === collection && !entry.legacy);
    stats[collection] = {
      total: items.length, enabled: items.filter(entry => entry.enabled).length,
      missing: items.filter(entry => entry.status === 'missing').length,
      ambiguous: items.filter(entry => entry.status === 'ambiguous').length
    };
  }

  const { generatedAt, sourceRevision, baseUrl, ...previousContent } = previous || {};
  const content = {
    schemaVersion: 1, sourceRepo: SOURCE_REPO, sourceBranch: SOURCE_BRANCH, legacyBasePath: LEGACY_BASE_PATH,
    patch: root.patch, pbePatch: pbe.sourcePatch, ddragonVersion,
    config: { enableLegacyFantome: ENABLE_LEGACY_FANTOME }, stats, entries: sorted
  };
  const changed = !sourceRevision || !isDeepStrictEqual(previousContent, content);
  const manifest = {
    schemaVersion: content.schemaVersion,
    generatedAt: changed ? currentDate.toISOString() : generatedAt,
    sourceRevision: changed ? snapshot.revision : sourceRevision,
    baseUrl: changed ? snapshot.baseUrl : baseUrl,
    ...content
  };
  const added = Object.keys(sorted).filter(key => !oldEntries[key]);
  const updated = Object.keys(sorted).filter(key => oldEntries[key] && !isDeepStrictEqual(oldEntries[key], sorted[key]));
  const report = {
    patch: manifest.patch, previousPatch: previous?.patch || null, patchChanged: previous?.patch !== manifest.patch,
    revision: snapshot.revision, addedCount: added.length, changedCount: updated.length, removedCount: removed.length,
    totalDeltaCount: added.length + updated.length + removed.length, promoted, ambiguities, unindexed, indexConflicts,
    stats, addedSample: added.slice(0, 50), changedSample: updated.slice(0, 50)
  };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(PATHS.manifest, JSON.stringify(manifest, null, 2) + '\n');
  if (writeReport) await writeFile(PATHS.syncReport, JSON.stringify(report, null, 2) + '\n');
  console.log('[prepare-fantome]', JSON.stringify({ ...report, addedSample: undefined, changedSample: undefined,
    unindexed: unindexed.length, ambiguities: ambiguities.length }));
  return manifest;
}

if (process.argv[1]?.endsWith('prepare-fantome.mjs')) {
  prepareFantome({ writeReport: process.argv.includes('--write-report') }).catch(error => {
    console.error('[prepare-fantome] HATA:', error.message);
    process.exitCode = 1;
  });
}
