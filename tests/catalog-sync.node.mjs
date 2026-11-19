import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { publishedSkinDownload } from '../bot/src/skin-downloads.js';
import { verifyPackageBytes, verifyRainbowIdentity } from '../scripts/fantome-package.mjs';
import { indexedDownloads } from '../scripts/prepare-fantome.mjs';
import { reconcileDownloads } from '../scripts/reconcile-downloads.mjs';
import { fetchWithRetry, readSourceDirectories, requireTree } from '../scripts/sync-source.mjs';
import { catalogIdentityErrors } from '../scripts/verify-collections.mjs';

const first = { c: 'skins', id: 1001, champ: 'Annie', type: 'base', name: 'Fixture', path: 'skins/Annie/Fixture.fantome' };
const second = { ...first, id: 1002, path: 'skins/Annie/New.fantome' };
const blob = (path, sha = 'a'.repeat(40)) => ({ type: 'blob', path, sha, size: 100 });

test('new and replaced files use the current indexed path and object ID', () => {
  const old = reconcileDownloads([first], [blob(first.path)]).entries;
  const tree = [blob(first.path, 'b'.repeat(40)), blob(second.path, 'c'.repeat(40))];
  const next = reconcileDownloads([first, second], tree, old);
  assert.equal(next.entries['skins:1001'].blobSha, 'b'.repeat(40));
  assert.equal(next.entries['skins:1002'].enabled, true);
  assert.deepEqual(reconcileDownloads([first, second], tree, next.entries), next);
});

test('removal disables the asset immediately and does not age state on unchanged data', () => {
  const old = reconcileDownloads([first], [blob(first.path)]).entries;
  const next = reconcileDownloads([first], [], old);
  const entry = next.entries['skins:1001'];
  assert.equal(entry.status, 'missing');
  assert.equal(entry.enabled, false);
  assert.equal(entry.id, first.id);
  assert.deepEqual(reconcileDownloads([first], [], next.entries), next);
});

test('rename needs an exact prior hash and stays inside its champion and variant identity', () => {
  const old = reconcileDownloads([first], [blob(first.path)]).entries;
  const moved = 'skins/Annie/Subdirectory/Renamed.fantome';
  const crossChampion = 'skins/Ashe/Renamed.fantome';
  const result = reconcileDownloads([first], [blob(crossChampion), blob(moved)], old);
  assert.equal(result.entries['skins:1001'].path, moved);
  assert.equal(result.entries['skins:1001'].indexedPath, first.path);
  assert.equal(reconcileDownloads([first], [blob(crossChampion)], old).entries['skins:1001'].enabled, false);
  assert.equal(reconcileDownloads([{ ...first, type: 'chroma', pId: 1000 }], [blob(moved)], old)
    .entries['skins:1001'].enabled, false);
  assert.equal(reconcileDownloads([first, { ...second, path: moved }], [blob(moved)], old)
    .entries['skins:1001'].enabled, false);
});

test('duplicate paths, duplicate IDs and non-unique moves are quarantined', () => {
  const duplicate = reconcileDownloads([first, { ...second, path: first.path }], [blob(first.path)]);
  assert.equal(duplicate.ambiguities.length, 2);
  assert.ok(Object.values(duplicate.entries).every(entry => !entry.enabled));
  assert.equal(reconcileDownloads([first, { ...first, path: second.path }], [blob(first.path)])
    .entries['skins:1001'].status, 'ambiguous');
  const old = reconcileDownloads([first], [blob(first.path)]).entries;
  const result = reconcileDownloads([first], [blob('skins/Annie/A.fantome'), blob('skins/Annie/B.fantome')], old);
  assert.equal(result.entries['skins:1001'].status, 'ambiguous');
  assert.throws(() => reconcileDownloads([{ ...first, path: 'skins/../other.fantome' }], []), /Invalid indexed/);
});

test('PBE promotion retains the numeric identity and prioritizes the Live index', () => {
  const root = { patch: '16.23', champions: { Annie: { skins: { 1: 'Fixture' } } } };
  const pbe = {
    sourcePatch: '16.24', formPackages: [],
    packages: [
      { id: 1001, championId: 1, champion: 'Annie', path: 'skins/Annie/Fixture.fantome', name: 'Fixture' },
      { id: 1002, championId: 1, champion: 'Annie', path: 'skins/Annie/Next.fantome', name: 'Next' }
    ]
  };
  const rainbow = { packages: [{ skin: 1, champion: 'Annie', path: 'Annie/Fixture.fantome' }] };
  const classic = { champions: [{ baseId: 1, baseKey: 'Annie', skins: [
    { id: 60_001_001, name: 'Classic', path: 'Jade_Annie/60001001.fantome' }
  ] }] };
  const champions = [{ key: 1, id: 'Annie', name: 'Annie' }, { key: 22, id: 'Ashe', name: 'Ashe' }];
  const { candidates } = indexedDownloads(root, pbe, rainbow, classic, champions);
  assert.ok(candidates.some(entry => entry.id === 1001 && entry.c === 'skins'));
  assert.ok(!candidates.some(entry => entry.id === 1001 && entry.c === 'pbe'));
  assert.ok(candidates.some(entry => entry.id === 1002 && entry.c === 'pbe'));
  pbe.packages[1].path = 'skins/Ashe/Next.fantome';
  assert.throws(() => indexedDownloads(root, pbe, rainbow, classic, champions), /Cross-champion/);
});

test('catalog checks keep unavailable records and reject duplicate or cross-variant mappings', () => {
  const base = { id: '1000', championId: 'Annie', skinNum: 0 };
  const normal = { id: '1001', championId: 'Annie', skinNum: 1 };
  const catalog = {
    skinsData: { skins: [base, normal] }, rainbowData: { skins: [] }, classicData: { skins: [] },
    manifest: { entries: { 'skins:1001': { ...first, enabled: false } } }
  };
  assert.deepEqual(catalogIdentityErrors(catalog), []);
  catalog.manifest.entries['skins:1001'] = { ...first, enabled: true, type: 'chroma', pId: 1000 };
  assert.match(catalogIdentityErrors(catalog)[0], /Incompatible asset/);
  catalog.skinsData.skins.push(normal);
  assert.ok(catalogIdentityErrors(catalog).some(error => /Duplicate catalog IDs/.test(error)));
});

test('Discord exposes only the published collection, champion and enabled file', () => {
  const manifest = {
    baseUrl: 'https://raw.githubusercontent.com/example/repo/' + 'a'.repeat(40) + '/',
    entries: { 'skins:1001': { ...first, path: 'skins/Annie/A #1.fantome', enabled: true, status: 'enabled' } }
  };
  const skin = { id: '1001', championId: 'Annie' };
  assert.match(publishedSkinDownload(manifest, skin), /A%20%231\.fantome$/);
  assert.equal(publishedSkinDownload(manifest, { ...skin, isPbe: true }), null);
  assert.equal(publishedSkinDownload(manifest, { ...skin, championId: 'Ashe' }), null);
  manifest.entries['skins:1001'].enabled = false;
  assert.equal(publishedSkinDownload(manifest, skin), null);
});

test('rejects partial Git trees and never treats timeout or rate limits as removals', async () => {
  const tree = [blob(first.path)];
  assert.throws(() => requireTree({ tree, truncated: true }, 'fixture'), /Incomplete Git tree/);
  assert.throws(() => requireTree({ tree: [], truncated: false }, 'fixture'), /Incomplete Git tree/);
  assert.deepEqual(requireTree({ tree, truncated: false }, 'fixture'), tree);
  const waits = [];
  let calls = 0;
  const url = 'https://example.com/data';
  const response = await fetchWithRetry(url, {
    request: async (_url, options) => {
      assert.ok(options.signal instanceof AbortSignal);
      calls++;
      if (calls === 1) throw new Error('timeout');
      if (calls === 2) return new Response(null, { status: 429, headers: { 'retry-after': '2' } });
      return new Response('ok');
    },
    wait: async delay => waits.push(delay)
  });
  assert.equal(await response.text(), 'ok');
  assert.deepEqual(waits, [500, 2000]);
  await assert.rejects(fetchWithRetry(url, {
    request: async () => new Response(null, { status: 429, headers: { 'retry-after': '120' } }),
    wait: async () => assert.fail('Must not wait indefinitely')
  }), /HTTP 429/);
  await assert.rejects(fetchWithRetry(url, {
    request: async () => new Response(null, { status: 404 })
  }), /HTTP 404/);
});

test('package download must have matching ZIP structure, length and digests', () => {
  const bytes = Buffer.alloc(64);
  bytes.writeUInt32LE(0x04034b50);
  bytes.writeUInt32LE(0x06054b50, 42);
  const entry = {
    path: first.path, bytes: bytes.length,
    blobSha: createHash('sha1').update('blob 64\0').update(bytes).digest('hex'),
    sha256: createHash('sha256').update(bytes).digest('hex')
  };
  verifyPackageBytes(bytes, entry);
  bytes[12] = 1;
  assert.throws(() => verifyPackageBytes(bytes, entry), /Digest mismatch/);
  assert.throws(() => verifyPackageBytes(Buffer.alloc(64), entry), /Invalid .fantome ZIP/);
});

test('a failing or truncated recursive tree is replaced by complete pinned subtrees', async () => {
  const targets = [{ path: 'skins', sha: 'parent' }];
  const splits = [];
  const tree = await readSourceDirectories(targets, async (sha, recursive) => {
    if (sha === 'parent' && recursive) throw Object.assign(new Error('HTTP 500'), { status: 500 });
    if (sha === 'parent') return { truncated: false, tree: [{ path: 'Annie', type: 'tree', sha: 'child' }] };
    if (recursive) return { truncated: true, tree: [blob('incomplete.fantome')] };
    return { truncated: false, tree: [blob('complete.fantome')] };
  }, path => splits.push(path));
  assert.deepEqual(splits, ['skins', 'skins/Annie']);
  assert.deepEqual(tree.filter(node => node.type === 'blob').map(node => node.path), ['skins/Annie/complete.fantome']);
  await assert.rejects(readSourceDirectories(targets, async () => {
    throw Object.assign(new Error('HTTP 403'), { status: 403 });
  }), /HTTP 403/);
});

test('Rainbow package identity comes from the embedded champion and skin number', () => {
  const name = Buffer.from('META/build.json');
  const body = Buffer.from(JSON.stringify({ buildInputs: { champion: 'Annie', skin: 1 } }));
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(body.length, 24);
  central.writeUInt16LE(name.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt32LE(local.length + name.length + body.length, 16);
  const bytes = Buffer.concat([local, name, body, central, name, end]);
  verifyRainbowIdentity(bytes, first);
  assert.throws(() => verifyRainbowIdentity(bytes, second), /identity mismatch/);
  assert.throws(() => verifyRainbowIdentity(bytes, { ...first, champ: 'Ashe' }), /identity mismatch/);
});
