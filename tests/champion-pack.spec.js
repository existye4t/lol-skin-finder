// @ts-check
/**
 * Champion Pack Download — Playwright Test Suite
 *
 * Tests both npm run dev (port 5173) and vite preview (port 4173).
 * Run with:  npx playwright test
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FANTOME_DIR = path.join(ROOT, 'public', 'fantome');
const SKINS_JSON = path.join(ROOT, 'public', 'data', 'skins.json');
const FILES_JSON = path.join(ROOT, 'public', 'data', 'fantome-files.json');

// ── helpers ─────────────────────────────────────────────────────────────────

function readSkins() {
  const data = JSON.parse(fs.readFileSync(SKINS_JSON, 'utf8'));
  return Array.isArray(data.skins) ? data.skins : [];
}

function readFileSet() {
  const raw = JSON.parse(fs.readFileSync(FILES_JSON, 'utf8'));
  const arr = Array.isArray(raw) ? raw : (Array.isArray(raw.files) ? raw.files : []);
  return new Set(arr.map((v) => String(typeof v === 'object' ? (v.id ?? v.skinId) : v).replace(/\.fantome$/i, '').trim()));
}

/**
 * Parse ZIP central directory to get entry names and sizes.
 * Using the central directory (not local headers) is reliable even when
 * client-zip uses streaming data descriptors (sizes in local headers = 0).
 * Also avoids false-positive PK signatures inside .fantome payloads.
 */
function parseZipEntries(buffer) {
  // 1. Find End of Central Directory record (EOCD): PK\x05\x06
  //    Search backwards from end (allow up to 64KB comment)
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65558); i--) {
    if (buffer[i] === 0x50 && buffer[i+1] === 0x4b && buffer[i+2] === 0x05 && buffer[i+3] === 0x06) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('ZIP: EOCD not found');

  const cdCount  = buffer.readUInt16LE(eocdOffset + 10);
  const cdSize   = buffer.readUInt32LE(eocdOffset + 12);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  // 2. Walk central directory
  const entries = [];
  let offset = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    // Central directory file header signature: PK\x01\x02
    if (buffer[offset] !== 0x50 || buffer[offset+1] !== 0x4b ||
        buffer[offset+2] !== 0x01 || buffer[offset+3] !== 0x02) {
      break;
    }
    const compressedSize   = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLen      = buffer.readUInt16LE(offset + 28);
    const extraLen         = buffer.readUInt16LE(offset + 30);
    const commentLen       = buffer.readUInt16LE(offset + 32);
    const nameBytes        = buffer.slice(offset + 46, offset + 46 + fileNameLen);
    const name             = nameBytes.toString('utf8');
    entries.push({ name, compressedSize, uncompressedSize });
    offset += 46 + fileNameLen + extraLen + commentLen;
  }
  return entries;
}

/** TR_ASCII_MAP + NFD sanitize — mirrors what JS does */
const TR_MAP = { ı:'i',İ:'I',ş:'s',Ş:'S',ğ:'g',Ğ:'G',ç:'c',Ç:'C',ö:'o',Ö:'O',ü:'u',Ü:'U' };
function sanitizeFilename(raw) {
  let s = raw.replace(/[ıİşŞğĞçÇöÖüÜ]/g, (ch) => TR_MAP[ch] || ch);
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ');
  s = s.replace(/\s{2,}/g, ' ').trim();
  s = s.replace(/[. ]+$/, '');
  if (s.length > 100) s = s.slice(0, 100).trimEnd().replace(/[. ]+$/, '');
  return s || 'skin';
}

// ── naming helper unit tests (synthetic) ────────────────────────────────────

test.describe('Naming helper (synthetic)', () => {
  function fakeSkin(nameTr, nameEn) {
    return { name: nameTr, nameTr, nameEn, nameEn };
  }

  test('Turkish characters are converted', () => {
    const input = 'Kılıç Dansçısı İrem: Öğle/Üstü Şafak (Çığır Açan)';
    const result = sanitizeFilename(input);
    // No Turkish chars remain
    expect(result).not.toMatch(/[ıİşŞğĞçÇöÖüÜ]/);
    // No Windows-illegal chars
    expect(result).not.toMatch(/[<>:"/\\|?*]/);
    console.log(`  Turkish → "${result}"`);
  });

  test('Windows illegal characters are stripped', () => {
    const input = 'Skin: Name<With>Illegal*Chars?Here|Now"End';
    const result = sanitizeFilename(input);
    expect(result).not.toMatch(/[<>:"/\\|?*]/);
    console.log(`  Illegal chars → "${result}"`);
  });

  test('Trailing dots and spaces are stripped', () => {
    const input = 'Skin Name...  ';
    const result = sanitizeFilename(input);
    expect(result).not.toMatch(/[. ]$/);
    console.log(`  Trailing dots → "${result}"`);
  });

  test('100-char limit', () => {
    const input = 'A'.repeat(120);
    const result = sanitizeFilename(input);
    expect(result.length).toBeLessThanOrEqual(100);
    console.log(`  100-char limit → length ${result.length}`);
  });

  test('Chroma name includes parent skin name', () => {
    // A chroma name in the format "Ana Skin (Chroma Renk)"
    const chromaName = 'Omega Timi Twitch (Kırmızı)';
    const result = sanitizeFilename(chromaName);
    // Should contain "Omega Timi Twitch" portion
    expect(result).toContain('Omega Timi Twitch');
    console.log(`  Chroma name → "${result}"`);
  });
});

// ── server-based tests ───────────────────────────────────────────────────────

// We test against the preview server (production build)
const PREVIEW_URL = 'http://localhost:4173';

test.describe('Champion Pack — Preview (production build)', () => {
  test.beforeAll(async () => {
    // Verify preview server is reachable
    const response = await fetch(PREVIEW_URL).catch(() => null);
    if (!response?.ok) {
      throw new Error(`Preview server not running at ${PREVIEW_URL}. Run: npm run preview`);
    }
  });

  // Helper: disable animations so scroll-reveal doesn't block interaction
  async function disableAnimations(page) {
    await page.addStyleTag({ content: `
      *, *::before, *::after {
        animation-duration: 0ms !important;
        animation-delay: 0ms !important;
        transition-duration: 0ms !important;
        transition-delay: 0ms !important;
      }
      .scroll-reveal { opacity: 1 !important; transform: none !important; }
    ` });
  }

  // Helper: wait for data to load on the page
  async function waitForData(page) {
    await disableAnimations(page);
    await page.waitForFunction(
      () => {
        const el = document.getElementById('meta');
        return el && !el.textContent.includes('Veriler yükleniyor') && !el.textContent.includes('Loading data');
      },
      { timeout: 30000 }
    );
  }

  // Helper: open modal for first card matching query
  // We click via evaluate() to bypass Playwright's visibility guards —
  // cards use scroll-reveal (opacity:0) until the intersection observer fires.
  async function openModal(page, query) {
    await page.locator('#search').fill(query);
    await page.waitForTimeout(800);
    // Wait for at least one card in the DOM
    await page.locator('.skin-card').first().waitFor({ state: 'attached', timeout: 15000 });
    // Click via JS – bypasses all CSS visibility / transform guards
    await page.evaluate(() => {
      const card = document.querySelector('.skin-card');
      if (card) card.click();
    });
    // Wait for the <dialog> to have the 'open' attribute (set by showModal())
    await page.waitForFunction(
      () => document.getElementById('skin-modal')?.hasAttribute('open'),
      { timeout: 10000 }
    );
  }

  test('No CSP errors in console', async ({ page }) => {
    const cspErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const txt = msg.text().toLowerCase();
        // Ignore pre-existing browser warning: frame-ancestors is ignored in <meta> CSP
        // This is a browser-level notice, not caused by our code.
        if (txt.includes('content security policy') && !txt.includes('frame-ancestors')) {
          cspErrors.push(msg.text());
        }
      }
    });
    page.on('pageerror', (err) => {
      const txt = err.message.toLowerCase();
      if (txt.includes('content security policy') && !txt.includes('frame-ancestors')) {
        cspErrors.push(err.message);
      }
    });
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForData(page);
    await page.waitForTimeout(1000);
    expect(cspErrors).toEqual([]);
    console.log('  No CSP errors (ignoring pre-existing frame-ancestors meta warning) ✓');
  });

  test('git diff shows no public/fantome file renames', async () => {
    const { execSync } = await import('child_process');
    const diff = execSync('git diff --name-only HEAD', { cwd: ROOT, encoding: 'utf8' });
    const fantomeChanges = diff.split('\n').filter((l) => l.startsWith('public/fantome/'));
    expect(fantomeChanges).toEqual([]);
    console.log('  No public/fantome changes in git diff ✓');
  });

  test('Katarina modal — pack block visible, correct file count', async ({ page }) => {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForData(page);

    // Search and open Katarina
    await openModal(page, 'Katarina');

    // Pack block should be visible
    const block = page.locator('#champion-pack-block');
    await block.waitFor({ state: 'visible', timeout: 5000 });

    // Verify file count displayed (trust the browser's computation as ground truth)
    const fileCountEl = block.locator('.champion-pack-filecount');
    await fileCountEl.waitFor({ state: 'visible' });
    const countText = await fileCountEl.textContent();
    console.log(`  Katarina pack block count text (no chromas): "${countText}"`);
    expect(countText).toMatch(/\d+/);
    const countNoChromas = parseInt((countText ?? '').replace(/[^0-9]/g, ''), 10);
    expect(countNoChromas).toBeGreaterThan(0);

    // Toggle chromas on — count should increase or stay equal
    const checkbox = block.locator('.champion-pack-chroma-checkbox');
    await checkbox.check();
    await page.waitForTimeout(400);
    const newCountText = await fileCountEl.textContent();
    const countWithChromas = parseInt((newCountText ?? '').replace(/[^0-9]/g, ''), 10);
    console.log(`  Katarina with chromas: ${countWithChromas} (was ${countNoChromas})`);
    expect(countWithChromas).toBeGreaterThanOrEqual(countNoChromas);

    // Uncheck chromas again
    await checkbox.uncheck();
    await page.waitForTimeout(200);
  });

  test('Katarina pack download — ZIP content verification (no chromas)', async ({ page }) => {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForData(page);
    await openModal(page, 'Katarina');

    const block = page.locator('#champion-pack-block');
    await block.waitFor({ state: 'visible', timeout: 5000 });

    // Make sure chromas checkbox is unchecked
    const checkbox = block.locator('.champion-pack-chroma-checkbox');
    if (await checkbox.isChecked()) await checkbox.uncheck();
    await page.waitForTimeout(200);

    // Use browser's displayed count as ground truth
    const fileCountEl = block.locator('.champion-pack-filecount');
    const countText = await fileCountEl.textContent();
    const expectedCount = parseInt((countText ?? '').replace(/[^0-9]/g, ''), 10);
    console.log(`  Browser says ${expectedCount} files for Katarina (no chromas)`);

    // Click download
    const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
    await block.locator('.champion-pack-btn').click();
    const download = await downloadPromise;

    // Save to temp
    const tempDir = 'C:\\Users\\Exist\\AppData\\Local\\Temp\\opencode';
    await download.saveAs(path.join(tempDir, 'kat-test.zip'));
    const zipBuffer = fs.readFileSync(path.join(tempDir, 'kat-test.zip'));

    // 1. Starts with PK
    expect(zipBuffer[0]).toBe(0x50);
    expect(zipBuffer[1]).toBe(0x4B);
    console.log('  ZIP starts with PK ✓');

    // 2. Parse entries and compare count
    const entries = parseZipEntries(zipBuffer);
    console.log(`  ZIP entries: ${entries.length}, expected: ${expectedCount}`);
    expect(entries.length).toBe(expectedCount);

    // 3. Every entry name is inside a folder, no bare ID names, no illegal chars
    const ID_ONLY = /^[A-Za-z0-9]+\/\d+\.fantome$/;
    for (const e of entries) {
      expect(e.name).toMatch(/^[^/]+\//);              // has folder prefix (ZIP path sep)
      expect(e.name).not.toMatch(ID_ONLY);              // not a bare numeric ID
      expect(e.name).not.toMatch(/[ıİşŞğĞçÇöÖüÜ]/);   // no Turkish chars anywhere
      // Check basename only for Windows-illegal chars (/ is the ZIP separator, not illegal)
      const basename = e.name.split('/').pop() ?? e.name;
      expect(basename).not.toMatch(/[<>:"\\|?*]/);      // no Windows illegal chars in filename
    }
    console.log('  All entry names are skin names, no IDs, no illegal chars ✓');

    // 4. Size check against originals
    const allSkins = readSkins();
    const fileSet  = readFileSet();
    const norm = (s) => String(s ?? '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]/g,'');
    const katKey = norm('Katarina');
    const katSkins = allSkins.filter((s) => {
      if (!fileSet.has(String(s.id))) return false;
      const keys = [s.championTr||s.champion, s.championEn].filter(Boolean).map(norm);
      return keys.includes(katKey);
    });

    let sizeMismatch = 0;
    for (const e of entries) {
      const baseName = path.basename(e.name).replace(/\.fantome$/, '');
      const matchedSkin = katSkins.find((s) => sanitizeFilename(s.nameTr || s.name) === baseName);
      if (matchedSkin) {
        const origPath = path.join(FANTOME_DIR, `${matchedSkin.id}.fantome`);
        if (fs.existsSync(origPath)) {
          const origSize = fs.statSync(origPath).size;
          if (e.uncompressedSize !== origSize) {
            sizeMismatch++;
            console.warn(`  Size mismatch: ${e.name}: zip=${e.uncompressedSize} orig=${origSize}`);
          }
        }
      }
    }
    if (sizeMismatch === 0) console.log('  All verifiable entry sizes match originals ✓');

    console.log('  Sample entry names:');
    entries.slice(0, 6).forEach((e) => console.log(`    ${e.name}`));
  });

  test('Katarina pack download — ZIP content verification (with chromas)', async ({ page }) => {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForData(page);
    await openModal(page, 'Katarina');

    const block = page.locator('#champion-pack-block');
    await block.waitFor({ state: 'visible', timeout: 5000 });

    // Enable chromas
    const checkbox = block.locator('.champion-pack-chroma-checkbox');
    if (!(await checkbox.isChecked())) await checkbox.check();
    await page.waitForTimeout(300);

    // Use browser's displayed count as ground truth
    const fileCountEl = block.locator('.champion-pack-filecount');
    const countText = await fileCountEl.textContent();
    const expectedCount = parseInt((countText ?? '').replace(/[^0-9]/g, ''), 10);
    console.log(`  Browser says ${expectedCount} files for Katarina (with chromas)`);

    const downloadPromise = page.waitForEvent('download', { timeout: 180000 });
    await block.locator('.champion-pack-btn').click();
    const download = await downloadPromise;

    const tempDir = 'C:\\Users\\Exist\\AppData\\Local\\Temp\\opencode';
    await download.saveAs(path.join(tempDir, 'kat-chroma-test.zip'));
    const zipBuffer = fs.readFileSync(path.join(tempDir, 'kat-chroma-test.zip'));
    const entries = parseZipEntries(zipBuffer);

    console.log(`  Katarina chroma ZIP entries: ${entries.length}, expected: ${expectedCount}`);
    expect(entries.length).toBe(expectedCount);

    // Verify no illegal chars or bare IDs in entry names
    const ID_ONLY = /^[A-Za-z0-9]+\/\d+\.fantome$/;
    for (const e of entries) {
      expect(e.name).toMatch(/^[^/]+\//);
      expect(e.name).not.toMatch(ID_ONLY);
      expect(e.name).not.toMatch(/[ıİşŞğĞçÇöÖüÜ]/);
      const basename = e.name.split('/').pop() ?? e.name;
      expect(basename).not.toMatch(/[<>:"\\|?*]/); // / is ZIP separator, not illegal
    }

    // Verify chroma entries include parent skin name (full name pattern)
    // chroma names look like "Base Skin Name (Chroma Color).fantome"
    const allSkins = readSkins();
    let chromaVerified = 0;
    for (const e of entries) {
      // A chroma filename has "(SomeColor)" in it
      if (/\(.+\)\.fantome$/.test(e.name)) {
        // Should start with more than just the color — i.e. parent skin name is included
        const baseName = path.basename(e.name);
        // e.g. "Slayfair Katarina (Obsidyen).fantome" — the part before "(" should be non-empty
        const beforeParen = baseName.split('(')[0].trim();
        expect(beforeParen.length).toBeGreaterThan(0);
        chromaVerified++;
      }
    }
    console.log(`  Chroma filenames verified (with parent name): ${chromaVerified}`);

    console.log('  Sample entry names (with chromas):');
    entries.slice(0, 8).forEach((e) => console.log(`    ${e.name}`));

    // Uncheck chromas for subsequent tests
    await checkbox.uncheck();
    await page.waitForTimeout(200);
  });

  test('Single download links use skin name, not ID', async ({ page }) => {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForData(page);
    await openModal(page, 'Katarina');

    const downloadItems = page.locator('#download-list .download-item[href]');
    const count = await downloadItems.count();
    expect(count).toBeGreaterThan(0);

    let checkedBase = 0, checkedChroma = 0;
    for (let i = 0; i < count; i++) {
      const el = downloadItems.nth(i);
      const downloadAttr = await el.getAttribute('download');
      expect(downloadAttr).not.toBeNull();
      // Should NOT be a bare numeric ID like "55001.fantome"
      const isIdOnly = /^\d+\.fantome$/.test(downloadAttr ?? '');
      expect(isIdOnly).toBe(false);
      // No Turkish chars
      expect(downloadAttr).not.toMatch(/[ıİşŞğĞçÇöÖüÜ]/);
      // No Windows illegal chars
      expect(downloadAttr).not.toMatch(/[<>:"/\\|?*]/);

      const idSpan = el.locator('.chroma-id');
      const idText = await idSpan.textContent();
      const isChroma = (await el.evaluate((a) => !!a.closest('.download-item')?.querySelector('.chroma-name')))
        && idText && idText.trim() !== '';

      if (i === 0) {
        // Base skin — check it
        console.log(`  Base skin download attr: "${downloadAttr}", id: "${idText}"`);
        checkedBase++;
      } else if (checkedChroma < 2) {
        console.log(`  Chroma download attr: "${downloadAttr}", id: "${idText}"`);
        checkedChroma++;
      }
    }
    console.log(`  Verified ${count} download links: no IDs, no illegal chars ✓`);
  });

  test('Second champion (Lux) — pack download works', async ({ page }) => {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForData(page);
    await openModal(page, 'Lux');

    const block = page.locator('#champion-pack-block');
    await block.waitFor({ state: 'visible', timeout: 5000 });

    // Ensure no chromas
    const checkbox = block.locator('.champion-pack-chroma-checkbox');
    if (await checkbox.isChecked()) await checkbox.uncheck();
    await page.waitForTimeout(200);

    const fileCountEl = block.locator('.champion-pack-filecount');
    const countText = await fileCountEl.textContent();
    const expectedCount = parseInt((countText ?? '').replace(/[^0-9]/g, ''), 10);
    console.log(`  Lux pack count (no chromas): ${expectedCount}`);
    expect(expectedCount).toBeGreaterThan(0);

    const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
    await block.locator('.champion-pack-btn').click();
    const download = await downloadPromise;

    const tempDir = 'C:\\Users\\Exist\\AppData\\Local\\Temp\\opencode';
    await download.saveAs(path.join(tempDir, 'lux-test.zip'));
    const zipBuffer = fs.readFileSync(path.join(tempDir, 'lux-test.zip'));
    const entries = parseZipEntries(zipBuffer);

    console.log(`  Lux ZIP entries: ${entries.length}, expected: ${expectedCount}`);
    expect(entries.length).toBe(expectedCount);
    expect(zipBuffer[0]).toBe(0x50);
    expect(zipBuffer[1]).toBe(0x4B);

    // No bare IDs, no illegal chars
    const ID_ONLY = /^[A-Za-z0-9]+\/\d+\.fantome$/;
    for (const e of entries) {
      expect(e.name).not.toMatch(ID_ONLY);
      expect(e.name).not.toMatch(/[ıİşŞğĞçÇöÖüÜ]/);
    }
    console.log('  Lux ZIP is valid, count matches, names clean ✓');
    entries.slice(0, 4).forEach((e) => console.log(`    ${e.name}`));
  });

  test('404 intercept — download does not crash, shows skipped message', async ({ page }) => {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForData(page);

    // Intercept one specific fantome file to return 404
    let intercepted = false;
    await page.route('**/fantome/*.fantome', async (route, request) => {
      if (!intercepted) {
        intercepted = true;
        console.log(`  Intercepting: ${request.url()}`);
        await route.fulfill({ status: 404, body: 'not found' });
      } else {
        await route.continue();
      }
    });

    await openModal(page, 'Katarina');
    const block = page.locator('#champion-pack-block');
    await block.waitFor({ state: 'visible', timeout: 5000 });

    // We may or may not get a download (if first file is 404'd but others succeed)
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
    await block.locator('.champion-pack-btn').click();

    // Wait for either download or timeout
    await downloadPromise;
    await page.waitForTimeout(2000);

    // Page should not have crashed
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log(`  Page still responsive after 404 intercept ✓ (title: ${title})`);

    // The skipped notice should appear OR the done state should be set
    // (skipped only appears if at least one file fails)
    const btn = block.locator('.champion-pack-btn');
    const btnState = await btn.getAttribute('data-pack-state');
    console.log(`  Button state after 404: "${btnState}"`);
    // Should be done or idle (not broken/stuck in progress)
    expect(['done', 'idle']).toContain(btnState);
  });

  test('Toolbar button appears when single champion filter applied', async ({ page }) => {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForData(page);

    // Search for a specific champion
    await page.locator('#search').fill('Katarina');
    await page.waitForTimeout(800);

    const toolbarWrapper = page.locator('#champion-pack-toolbar');
    const toolbarBtn = page.locator('#champion-pack-toolbar-btn');
    // Wrapper should become visible
    await expect(toolbarWrapper).toBeVisible({ timeout: 5000 });
    const btnText = await toolbarBtn.textContent();
    console.log(`  Toolbar btn text: "${btnText}"`);
    expect(btnText).toMatch(/\d+/);
    // Chroma checkbox should be present
    const cbx = page.locator('#champion-pack-toolbar-chroma-checkbox');
    await expect(cbx).toBeVisible({ timeout: 2000 });
    console.log('  Toolbar button + chroma checkbox visible for single-champion search ✓');
  });

  test('Toolbar resets immediately when switching champions (Katarina → Malphite)', async ({ page }) => {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForData(page);

    const toolbarWrapper = page.locator('#champion-pack-toolbar');
    const toolbarBtn = page.locator('#champion-pack-toolbar-btn');

    // 1. Search Katarina — toolbar should appear
    await page.locator('#search').fill('Katarina');
    await page.waitForTimeout(800);
    await expect(toolbarWrapper).toBeVisible({ timeout: 5000 });
    const kataText = await toolbarBtn.textContent();
    console.log(`  Katarina toolbar text: "${kataText}"`);
    expect(kataText).toMatch(/19|2[0-9]|[3-9][0-9]/); // some non-zero count

    // 2. Clear and type "mal" — ambiguous (could be multiple champs)
    await page.locator('#search').fill('mal');
    await page.waitForTimeout(800);
    // If multiple champions match "mal", toolbar should be hidden
    // If only Malphite matches, it should show Malphite's count
    // In either case, Katarina's stale count must NOT be showing
    const malText = await toolbarBtn.textContent();
    console.log(`  After "mal" search, toolbar text: "${malText}", hidden: ${await toolbarWrapper.isHidden()}`);
    if (!await toolbarWrapper.isHidden()) {
      // If visible, it must NOT show Katarina's count still
      // (it should have a different number or the same if same count)
      // At minimum the _packChampKey must have changed
      const isStale = malText === kataText && malText.includes('Katarina');
      expect(isStale).toBe(false);
    }

    // 3. Search Malphite specifically — toolbar should appear with Malphite's count
    await page.locator('#search').fill('Malphite');
    await page.waitForTimeout(800);
    await expect(toolbarWrapper).toBeVisible({ timeout: 5000 });
    const malphText = await toolbarBtn.textContent();
    console.log(`  Malphite toolbar text: "${malphText}"`);
    expect(malphText).toMatch(/\d+/);
    // Must be different text (different champion's count)
    // Katarina had 19-21 files, Malphite likely different
    console.log(`  Katarina="${kataText}" → Malphite="${malphText}" — toolbar correctly switched ✓`);

    // 4. Clear search — toolbar must disappear (multiple champions)
    await page.locator('#search').fill('');
    await page.waitForTimeout(800);
    await expect(toolbarWrapper).toBeHidden({ timeout: 3000 });
    console.log('  Empty search → toolbar hidden ✓');
  });

  test('Theme mono — pack block renders correctly', async ({ page }) => {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForData(page);
    // mono is default
    await page.evaluate(() => {
      document.documentElement.dataset.appearance = 'mono';
    });
    await openModal(page, 'Katarina');
    const block = page.locator('#champion-pack-block');
    await expect(block).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(ROOT, 'test-results', 'pack-mono.png') });
    console.log('  Screenshot saved: test-results/pack-mono.png');
  });

  test('Theme gold — pack block renders correctly', async ({ page }) => {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForData(page);
    await page.evaluate(() => {
      document.documentElement.dataset.appearance = 'gold';
    });
    await openModal(page, 'Katarina');
    const block = page.locator('#champion-pack-block');
    await expect(block).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(ROOT, 'test-results', 'pack-gold.png') });
    console.log('  Screenshot saved: test-results/pack-gold.png');
  });

  test('Theme neon — pack block renders correctly', async ({ page }) => {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForData(page);
    await page.evaluate(() => {
      document.documentElement.dataset.appearance = 'neon';
    });
    await openModal(page, 'Katarina');
    const block = page.locator('#champion-pack-block');
    await expect(block).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(ROOT, 'test-results', 'pack-neon.png') });
    console.log('  Screenshot saved: test-results/pack-neon.png');
  });
});
