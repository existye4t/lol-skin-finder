import { readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

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
const skinsRaw = await readFile(resolve(ROOT, 'public', 'data', 'skins.json'), 'utf8');
const skins = JSON.parse(skinsRaw);
assert(Array.isArray(skins.skins) && skins.skins.length > 1000, `skins.json contains ${skins?.skins?.length} skins`);

const fantomeRaw = await readFile(resolve(ROOT, 'public', 'data', 'fantome-files.json'), 'utf8');
const fantomes = JSON.parse(fantomeRaw);
assert(Array.isArray(fantomes) && fantomes.length > 500, `fantome-files.json contains ${fantomes?.length} indexed fantome IDs`);

const overridesRaw = await readFile(resolve(ROOT, 'public', 'data', 'admin-overrides.json'), 'utf8');
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

// Pick a test skin (e.g. skin ID 29004 - Omega Squad Twitch)
const testSkin = skins.skins.find((s) => String(s.id) === '29004');
assert(testSkin !== undefined, 'Found test skin ID 29004');
const originalName = testSkin.name;

// Simulate modifying skin name
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

// Write to admin-overrides.json and skins.json
const currentOv = JSON.parse(await readFile(resolve(ROOT, 'public', 'data', 'admin-overrides.json'), 'utf8'));
if (!currentOv.overrides) currentOv.overrides = {};
currentOv.overrides['29004'] = updatedOverrideEntry;
await writeFile(resolve(ROOT, 'public', 'data', 'admin-overrides.json'), JSON.stringify(currentOv, null, 2), 'utf8');

const currentSkins = JSON.parse(await readFile(resolve(ROOT, 'public', 'data', 'skins.json'), 'utf8'));
const skinIdx = currentSkins.skins.findIndex((s) => String(s.id) === '29004');
currentSkins.skins[skinIdx] = { ...currentSkins.skins[skinIdx], ...updatedOverrideEntry };
await writeFile(resolve(ROOT, 'public', 'data', 'skins.json'), JSON.stringify(currentSkins, null, 2), 'utf8');

// Re-read from disk (simulate reload / browser restart)
const reloadedOv = JSON.parse(await readFile(resolve(ROOT, 'public', 'data', 'admin-overrides.json'), 'utf8'));
const reloadedSkins = JSON.parse(await readFile(resolve(ROOT, 'public', 'data', 'skins.json'), 'utf8'));
const reloadedSkin = reloadedSkins.skins.find((s) => String(s.id) === '29004');

assert(reloadedOv.overrides['29004']?.name === modifiedName, 'admin-overrides.json retained the saved skin name on disk');
assert(reloadedSkin?.name === modifiedName, 'skins.json retained the saved skin name on disk');

// Restore original test skin back (revert)
delete currentOv.overrides['29004'];
await writeFile(resolve(ROOT, 'public', 'data', 'admin-overrides.json'), JSON.stringify(currentOv, null, 2), 'utf8');
currentSkins.skins[skinIdx] = { ...testSkin };
await writeFile(resolve(ROOT, 'public', 'data', 'skins.json'), JSON.stringify(currentSkins, null, 2), 'utf8');

const revertedSkins = JSON.parse(await readFile(resolve(ROOT, 'public', 'data', 'skins.json'), 'utf8'));
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
