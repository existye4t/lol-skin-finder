import { chromium } from '@playwright/test';

const BASE = process.argv[2] || 'http://127.0.0.1:5173';
const browser = await chromium.launch();
const page = await browser.newPage();
let failed = 0;
const check = (name, cond) => {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!cond) failed++;
};

await page.goto(BASE, { waitUntil: 'networkidle' });

// --- 1. Command palette debounce + render ---
await page.keyboard.press('Control+k');
await page.locator('#command-palette[open]').waitFor({ timeout: 5000 });
const input = page.locator('#command-palette-input');

// type fast; results should NOT appear immediately (debounced)
await input.pressSequentially('katarina', { delay: 20 });
const itemsDuringTyping = await page.locator('.command-palette-item').count();
check('Debounce: typing fast does not render per keystroke', itemsDuringTyping === 0);

await page.waitForTimeout(400);
const itemsAfter = await page.locator('.command-palette-item').count();
check('Results render after debounce delay', itemsAfter > 0);
console.log('  katarina results:', itemsAfter);

// arrow navigation still works
await page.keyboard.press('ArrowDown');
const active = await page.locator('.command-palette-item.is-active').count();
check('Arrow nav still works', active === 1);

// Enter opens modal
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
const modalOpen = await page.evaluate(() => !!document.querySelector('#skin-modal[open], .modal[open], dialog[open]'));
check('Enter opens modal', modalOpen);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// --- 2. Toast on favorite ---
let btn = page.locator('.favorite-button[data-skin-id]').first();
await btn.scrollIntoViewIfNeeded();
await btn.click();
await page.waitForTimeout(400);
let toastCount = await page.locator('.toast').count();
check('Toast appears on favorite add', toastCount >= 1);
if (toastCount) {
  const toastText = await page.locator('.toast').last().textContent();
  console.log('  toast text:', toastText);
}
await page.waitForTimeout(3500);
toastCount = await page.locator('.toast').count();
check('Toast auto-dismisses', toastCount === 0);

// stack test: rapid toggles on two cards
const btns = page.locator('.favorite-button[data-skin-id]');
await btns.nth(0).click();
await btns.nth(1).click();
await btns.nth(2).click();
await page.waitForTimeout(300);
const stacked = await page.locator('.toast').count();
check('Toasts stack (>=2 visible)', stacked >= 2);
console.log('  stacked toasts:', stacked);
await page.waitForTimeout(3500);

// --- 3. Scroll-to-top ---
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(400);
const stt = page.locator('#scroll-to-top');
const visibleAtTop = await stt.evaluate((el) => el.classList.contains('scroll-to-top-visible'));
check('Scroll-to-top hidden at top', !visibleAtTop);

await page.evaluate(() => window.scrollTo({ top: 2000 }));
await page.waitForTimeout(500);
const visibleAfterScroll = await stt.evaluate((el) => el.classList.contains('scroll-to-top-visible'));
check('Scroll-to-top visible after scrolling 2000px', visibleAfterScroll);

await stt.click();
await page.waitForTimeout(1500);
const scrollY = await page.evaluate(() => window.scrollY);
check('Scroll-to-top returns to top (smooth)', scrollY < 60);
console.log('  final scrollY:', scrollY);

// --- 4. regression spot checks ---
const gradient = await page.locator('[class*="gradient"], canvas, .gradient-mesh').count();
check('Gradient mesh present', gradient > 0);

await page.keyboard.press('Control+k');
await page.locator('#command-palette[open]').waitFor();
await input.pressSequentially('ahri', { delay: 30 });
await page.waitForTimeout(400);
const ahri = await page.locator('.command-palette-item').count();
check('Palette search still works after all changes', ahri > 0);
await page.keyboard.press('Escape');

await browser.close();
console.log(failed === 0 ? 'ALL PASSED' : 'FAILURES: ' + failed);
process.exit(failed === 0 ? 0 : 1);
