import { setTimeout as sleep } from 'node:timers/promises';
import { SOURCE_BRANCH, SOURCE_REPO } from './config.mjs';

const api = `https://api.github.com/repos/${SOURCE_REPO}`;
const directories = ['skins', 'PBE', 'rainbow', 'classic'];
const revisionPattern = /^[a-f0-9]{40}$/;
const jsonRequests = new Map();

export async function fetchWithRetry(url, { method = 'GET', github = false, request = fetch, wait = sleep } = {}) {
  const headers = { 'User-Agent': 'lol-skin-finder-sync' };
  if (github) {
    if (new URL(url).origin !== 'https://api.github.com') throw new Error('Unexpected GitHub API origin');
    headers.Accept = 'application/vnd.github+json';
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  for (let attempt = 0; ; attempt++) {
    let response;
    try {
      response = await request(url, { method, headers, signal: AbortSignal.timeout(30_000) });
    } catch (error) {
      if (attempt === 2) throw new Error(`Network failure for ${url}: ${error.message}`, { cause: error });
      await wait(500 * 2 ** attempt);
      continue;
    }
    if (response.ok || method === 'HEAD' && response.status === 404) return response;
    const rateLimited = response.status === 429 || response.status === 403 && (
      response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after')
    );
    const retryAfter = response.headers.get('retry-after');
    const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000 - Date.now();
    const retryDelay = retryAfter === null ? reset : /^\d+$/.test(retryAfter)
      ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now();
    const delay = Math.max(500 * 2 ** attempt, Number.isFinite(retryDelay) ? retryDelay : 0);
    await response.body?.cancel();
    if (attempt === 2 || delay > 30_000 || (!rateLimited && response.status < 500)) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    await wait(delay);
  }
}

export function fetchJson(url, github = false) {
  if (!jsonRequests.has(url)) {
    jsonRequests.set(url, fetchWithRetry(url, { github }).then(response => response.json()));
  }
  return jsonRequests.get(url);
}

export function requireTree(value, label) {
  if (value?.truncated !== false || !Array.isArray(value.tree) || value.tree.length === 0) {
    throw new Error(`Incomplete Git tree: ${label}`);
  }
  return value.tree;
}

async function latestRevision() {
  const ref = await fetchJson(`${api}/git/ref/heads/${encodeURIComponent(SOURCE_BRANCH)}`, true);
  return ref?.object?.sha;
}

export async function sourceSnapshot(revision) {
  revision ??= process.env.YIMIKAMI_SOURCE_SHA || await latestRevision();
  if (!revisionPattern.test(revision)) throw new Error('Invalid Yimikami commit SHA');
  const baseUrl = `https://raw.githubusercontent.com/${SOURCE_REPO}/${revision}/`;
  return { revision, baseUrl, index: (file) => fetchJson(baseUrl + file) };
}

export async function fetchSourceTree(revision) {
  const snapshot = await sourceSnapshot(revision);
  const root = requireTree(await fetchJson(`${api}/git/trees/${snapshot.revision}`, true), snapshot.revision);
  const subtrees = await Promise.all(directories.map(async directory => {
    const node = root.find(item => item.type === 'tree' && item.path === directory);
    if (!revisionPattern.test(node?.sha)) throw new Error(`Missing upstream directory: ${directory}`);
    const tree = requireTree(await fetchJson(`${api}/git/trees/${node.sha}?recursive=1`, true), directory);
    return tree.map(item => ({ ...item, path: `${directory}/${item.path}` }));
  }));
  return [...root, ...subtrees.flat()];
}

export async function latestDataDragonVersion() {
  const versions = await fetchJson('https://ddragon.leagueoflegends.com/api/versions.json');
  if (!/^\d+\.\d+\.\d+$/.test(versions?.[0])) throw new Error('Invalid Data Dragon version list');
  return versions[0];
}
