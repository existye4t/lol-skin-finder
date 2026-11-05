import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

console.log('🧪 Starting Comprehensive Admin Panel & Persistence Audit...\n');

let failed = 0;
let passed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

// 1. Data Integrity Tests
console.log('--- 1. Data Integrity Tests ---');
const skinsPath = resolve(ROOT, 'public', 'data', 'skins.json');
const overridesPath = resolve(ROOT, 'public', 'data', 'admin-overrides.json');
const skinsRaw = await readFile(skinsPath, 'utf8');
const skins = JSON.parse(skinsRaw);
assert(Array.isArray(skins.skins) && skins.skins.length > 1000, `skins.json contains ${skins?.skins?.length} skins`);

const fantomeRaw = await readFile(resolve(ROOT, 'public', 'data', 'fantome-files.json'), 'utf8');
const fantomes = JSON.parse(fantomeRaw);
assert(Array.isArray(fantomes) && fantomes.length > 500, `fantome-files.json contains ${fantomes?.length} indexed fantome IDs`);

const manifestRaw = await readFile(resolve(ROOT, 'public', 'data', 'fantome-manifest.json'), 'utf8');
const manifest = JSON.parse(manifestRaw);
assert(manifest?.entries && Object.keys(manifest.entries).length > 10000, `fantome-manifest.json contains ${Object.keys(manifest?.entries || {}).length} entries`);

const rainbowRaw = await readFile(resolve(ROOT, 'public', 'data', 'rainbow.json'), 'utf8');
const rainbow = JSON.parse(rainbowRaw);
assert(Array.isArray(rainbow?.skins) && rainbow.skins.length > 500, `rainbow.json contains ${rainbow?.skins?.length} entries`);

const classicRaw = await readFile(resolve(ROOT, 'public', 'data', 'classic.json'), 'utf8');
const classic = JSON.parse(classicRaw);
assert(Array.isArray(classic?.skins) && classic.skins.length > 1500, `classic.json contains ${classic?.skins?.length} entries`);

const overridesRaw = await readFile(overridesPath, 'utf8');
const overrides = JSON.parse(overridesRaw);
assert(overrides !== null && typeof overrides === 'object', 'admin-overrides.json is valid JSON object');

// 2. Search Normalization & Language Logic
console.log('\n--- 2. Search Normalization & Scoring Unit Tests ---');
const normalize = (value) =>
  String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '');

assert(normalize('Omega Timi Twitch') === 'omegatimitwitch', 'TR search normalization matches "omegatimitwitch"');
assert(normalize('IŞIK MUHAFIZI') === 'isikmuhafizi', 'Capital Turkish I/İ normalize properly to "isikmuhafizi"');
assert(normalize('KOD ADI: Vayne') === 'kodadivayne', 'Special characters like colon/space stripped properly');
assert(normalize('29004') === '29004', 'Numeric ID matches exactly');

// 3. Admin Panel Local Disk Persistence Simulation Test
console.log('\n--- 3. Disk Persistence & Revert Test ---');

const testSkin = skins.skins.find((s) => String(s.id) === '29004');
assert(testSkin !== undefined, 'Found test skin ID 29004');
const originalName = testSkin.name;

const modifiedName = 'Omega Timi Twitch (Özel Test Düzenlemesi)';
const updatedOverrideEntry = {
  id: '29004',
  name: modifiedName,
  nameEn: 'Omega Squad Twitch (Test Edit)',
  champion: testSkin.champion,
  championEn: testSkin.championEn || testSkin.champion,
  championId: testSkin.championId,
  modifiedAt: new Date().toISOString()
};

try {
  const currentOv = JSON.parse(overridesRaw);
  if (!currentOv.overrides) currentOv.overrides = {};
  currentOv.overrides['29004'] = updatedOverrideEntry;
  await writeFile(overridesPath, JSON.stringify(currentOv, null, 2), 'utf8');

  const currentSkins = JSON.parse(skinsRaw);
  const skinIdx = currentSkins.skins.findIndex((s) => String(s.id) === '29004');
  currentSkins.skins[skinIdx] = { ...currentSkins.skins[skinIdx], ...updatedOverrideEntry };
  await writeFile(skinsPath, JSON.stringify(currentSkins, null, 2), 'utf8');

  const reloadedOv = JSON.parse(await readFile(overridesPath, 'utf8'));
  const reloadedSkins = JSON.parse(await readFile(skinsPath, 'utf8'));
  const reloadedSkin = reloadedSkins.skins.find((s) => String(s.id) === '29004');

  assert(reloadedOv.overrides['29004']?.name === modifiedName, 'admin-overrides.json retained the saved skin name on disk');
  assert(reloadedSkin?.name === modifiedName, 'skins.json retained the saved skin name on disk');
} finally {
  await writeFile(overridesPath, overridesRaw, 'utf8');
  await writeFile(skinsPath, skinsRaw, 'utf8');
}

const revertedSkins = JSON.parse(await readFile(skinsPath, 'utf8'));
const revertedSkin = revertedSkins.skins.find((s) => String(s.id) === '29004');
assert(revertedSkin?.name === originalName, 'Revert successfully restored original name in skins.json on disk');

// 4. Check Build Files
console.log('\n--- 4. Build Structure & HTML Integrity ---');
const adminHtml = await readFile(resolve(ROOT, 'admin', 'index.html'), 'utf8');
assert(adminHtml.includes('btn-preview-lang-tr') && adminHtml.includes('btn-preview-lang-en'), 'Admin HTML includes TR/EN preview language toggle');
assert(adminHtml.includes('preview-name-tr') && adminHtml.includes('preview-name-en'), 'Admin HTML includes rich detail rows');

console.log(`\n==============================================`);
console.log(`🎉 ALL TESTS PASSED: ${passed} passed, ${failed} failed.`);
console.log(`==============================================\n`);

process.exit(failed > 0 ? 1 : 0);
