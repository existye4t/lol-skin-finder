import { validSkinPackagePath } from '../src/skin-source.js';

export { validSkinPackagePath as validAssetPath };
const idPattern = /^(?:0|[1-9]\d*)(?:_f[1-9]\d*)?$/;

export function skinNumber(value) {
  if (!/^\d{1,3}$/.test(String(value))) throw new Error(`Invalid source skin number: ${value}`);
  return Number(value);
}

function addToIndex(index, key, value) {
  const values = index.get(key) || [];
  values.push(value);
  index.set(key, values);
}

export function reconcileDownloads(candidates, tree, previous = {}) {
  const blobs = new Map();
  const byHash = new Map();
  for (const blob of tree) {
    if (blob.type !== 'blob' || !blob.path.endsWith('.fantome')) continue;
    if (!/^[a-f0-9]{40}$/.test(blob.sha) || !Number.isSafeInteger(blob.size) || blob.size <= 0) {
      throw new Error(`Incomplete asset metadata: ${blob.path}`);
    }
    blobs.set(blob.path, blob);
    addToIndex(byHash, blob.sha, blob);
  }
  const byId = new Map();
  const pathClaims = new Map();
  for (const entry of candidates) {
    if (!idPattern.test(entry.id) || !entry.champ || !validSkinPackagePath(entry.path, entry.c)) {
      throw new Error(`Invalid indexed download: ${JSON.stringify(entry)}`);
    }
    const key = `${entry.c}:${entry.id}`;
    addToIndex(byId, key, entry);
    addToIndex(pathClaims, entry.path, key);
  }

  const entries = {};
  const ambiguities = [];
  const claimed = new Set();
  for (const [key, group] of byId) {
    const [entry] = group;
    let blob = blobs.get(entry.path);
    const candidateDigest = entry.sha256;
    const previousEntry = previous[key];
    const candidates = new Set(group.map(candidate => candidate.path));
    let ambiguous = group.length !== 1 || pathClaims.get(entry.path).length !== 1;
    if (!blob && !ambiguous && previousEntry?.blobSha && previousEntry.champ === entry.champ &&
        previousEntry.type === entry.type && previousEntry.pId === entry.pId &&
        (!candidateDigest || candidateDigest === previousEntry.sha256)) {
      const prefix = entry.path.split('/').slice(0, entry.c === 'pbe' ? 3 : 2).join('/') + '/';
      const matches = (byHash.get(previousEntry.blobSha) || [])
        .filter(candidate => candidate.path.startsWith(prefix) && !pathClaims.has(candidate.path));
      for (const match of matches) candidates.add(match.path);
      if (matches.length === 1) [blob] = matches;
      ambiguous = matches.length > 1;
    }
    if (ambiguous) ambiguities.push({ key, paths: [...candidates].sort() });
    entries[key] = {
      ...entry,
      path: blob && !ambiguous ? blob.path : entry.path,
      ...(blob && !ambiguous && blob.path !== entry.path ? { indexedPath: entry.path } : {}),
      status: ambiguous ? 'ambiguous' : blob ? 'enabled' : 'missing',
      enabled: Boolean(blob && !ambiguous),
      ...(blob && !ambiguous ? { blobSha: blob.sha, bytes: blob.size } :
        previousEntry?.blobSha ? { blobSha: previousEntry.blobSha } : {})
    };
    if (entries[key].enabled) claimed.add(entries[key].path);
  }
  // A previously indexed blob may have been shared by several IDs. Disable contending moves.
  const enabledClaims = new Map();
  for (const [key, entry] of Object.entries(entries)) {
    if (entry.enabled) addToIndex(enabledClaims, entry.path, key);
  }
  for (const [path, keys] of enabledClaims) {
    if (keys.length === 1) continue;
    for (const key of keys) {
      Object.assign(entries[key], { status: 'ambiguous', enabled: false });
      ambiguities.push({ key, paths: [path] });
    }
  }
  const unindexed = [...blobs.keys()].filter(path => !claimed.has(path) && !pathClaims.has(path)).sort();
  return { entries, ambiguities, unindexed };
}
