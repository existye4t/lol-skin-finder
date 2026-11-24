import { setTimeout as sleep } from 'node:timers/promises';
import { skinSourceBaseUrl } from '../src/skin-source.js';
import { SKIN_SOURCE_BRANCH, SKIN_SOURCE_REPO } from './config.mjs';

const api = `https://api.github.com/repos/${SKIN_SOURCE_REPO}`;
const directories = ['skins', 'PBE', 'rainbow', 'classic'];
const revisionPattern = /^[a-f0-9]{40}$/;
const jsonRequests = new Map();
const treeRequests = new Map();

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
      const error = new Error(`HTTP ${response.status} for ${url}`);
      error.status = response.status;
      throw error;
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
  const ref = await fetchJson(`${api}/git/ref/heads/${SKIN_SOURCE_BRANCH.split('/').map(encodeURIComponent).join('/')}`, true);
  return ref?.object?.sha;
}

export async function sourceSnapshot(revision) {
  revision ??= process.env.SKIN_SOURCE_SHA || await latestRevision();
  const baseUrl = skinSourceBaseUrl(revision);
  if (!baseUrl) throw new Error('Invalid skin source commit SHA');
  return { revision, baseUrl, index: (file) => fetchJson(baseUrl + file) };
}

export async function readSourceDirectories(directories, readTree, onSplit = () => {}) {
  const entries = [];
  let remaining = directories;
  while (remaining.length) {
    const next = [];
    for (let offset = 0; offset < remaining.length; offset += 6) {
      const results = await Promise.all(remaining.slice(offset, offset + 6).map(async ({ path, sha }) => {
        let recursive;
        try {
          recursive = await readTree(sha, true);
        } catch (error) {
          if (!(error.status >= 500 && error.status < 600)) throw error;
        }
        const split = !recursive || recursive.truncated === true;
        if (split) onSplit(path);
        const tree = requireTree(split ? await readTree(sha, false) : recursive, path)
          .map(node => ({ ...node, path: `${path}/${node.path}` }));
        return { tree, split };
      }));
      for (const { tree, split } of results) {
        entries.push(...tree);
        if (split) next.push(...tree.filter(node => node.type === 'tree'));
      }
    }
    remaining = next;
  }
  return entries;
}

async function buildSourceTree(revision) {
  const root = requireTree(await fetchJson(`${api}/git/trees/${revision}`, true), revision);
  const targets = directories.map(directory => {
    const node = root.find(item => item.type === 'tree' && item.path === directory);
    if (!revisionPattern.test(node?.sha)) throw new Error(`Missing upstream directory: ${directory}`);
    return node;
  });
  const subtrees = await readSourceDirectories(targets,
    (sha, recursive) => fetchJson(`${api}/git/trees/${sha}${recursive ? '?recursive=1' : ''}`, true),
    directory => console.warn(`[sync-source] Splitting upstream tree: ${directory}`));
  return [...root, ...subtrees];
}

export async function fetchSourceTree(revision) {
  const snapshot = await sourceSnapshot(revision);
  if (!treeRequests.has(snapshot.revision)) {
    treeRequests.set(snapshot.revision, buildSourceTree(snapshot.revision));
  }
  return treeRequests.get(snapshot.revision);
}

export async function latestDataDragonVersion() {
  const versions = await fetchJson('https://ddragon.leagueoflegends.com/api/versions.json');
  if (!/^\d+\.\d+\.\d+$/.test(versions?.[0])) throw new Error('Invalid Data Dragon version list');
  return versions[0];
}
