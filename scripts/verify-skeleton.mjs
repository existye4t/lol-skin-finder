// Skeleton loading dogrulamasi:
// node scripts/verify-skeleton.mjs http://127.0.0.1:5199
import { chromium } from '@playwright/test';

const baseURL = process.argv[2] || 'http://127.0.0.1:5199';
const browser = await chromium.launch();
const errors = [];
let failed = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? ' (' + extra + ')' : ''));
  if (!cond) failed++;
};

// ---- 1. Normal yukleme: veri gercekten geliyor mu? (3x reload) ----
for (let i = 1; i <= 3; i++) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('reload' + i + ': ' + e.message));
  await page.goto(baseURL, { waitUntil: 'networkidle' });

  // splash/intro overlay varsa gecmesini bekle
  await page.waitForTimeout(1200);

  const skeletonCount = await page.locator('#results .skeleton-card').count();
  const cardCount = await page.locator('#results .skin-card').count();
  const resultsVisible = await page.locator('#results').evaluate((el) => !el.hidden);
  const titleText = await page.locator('#result-title').textContent();

  check(`Reload ${i}: gercek skin kartlari yuklendi`, cardCount > 0, cardCount + ' kart');
  check(`Reload ${i}: iskeletler temizlendi`, skeletonCount === 0, skeletonCount + ' iskelet kaldi');
  check(`Reload ${i}: results gorunur`, resultsVisible);
  console.log(`   -> title: "${titleText?.trim()}"`);
  await ctx.close();
}

// ---- 2. Yavas ag (Slow 3G gibi): iskeletler gorunuyor mu? ----
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // skins.json ve fantome-files.json isteklerini 1.5sn geciktir (agir ag simulasyonu)
  await page.route(/data\/(skins|fantome-files)\.json/, async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800); // gecikme sirasinda iskeletler gorunmeli

  const skeletonVisible = await page.locator('#results .skeleton-card').count();
  check('Yavas agda iskelet kartlar gorunuyor', skeletonVisible >= 8, skeletonVisible + ' adet');

  // shimmer animasyonu gercekten calisiyor mu? background-position zamanla degismeli
  const probe = async () =>
    page.locator('#results .skeleton-shimmer').first().evaluate(
      (el) => getComputedStyle(el).backgroundPosition
    );
  if (skeletonVisible > 0) {
    const p1 = await probe();
    await page.waitForTimeout(400);
    const p2 = await probe();
    check('Shimmer animasyonu calisiyor (background-position degisiyor)', p1 !== p2, `${p1} -> ${p2}`);
  }

  // Veri gelince iskeletler kalkmali, gercek kartlar gelmeli
  await page.waitForSelector('#results .skin-card', { timeout: 15000 });
  await page.waitForTimeout(500);
  const cardsAfter = await page.locator('#results .skin-card').count();
  const skeletonAfter = await page.locator('#results .skeleton-card').count();
  check('Yavas agda veri geldi, gercek kartlar var', cardsAfter > 0, cardsAfter + ' kart');
  check('Yavas agda iskeletler temizlendi', skeletonAfter === 0);
  await ctx.close();
}

// ---- 3. Hata durumu: fetch patlarsa iskelet takili kalmamali ----
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.route(/data\/skins\.json/, (route) => route.abort());
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const skeletonLeft = await page.locator('#results .skeleton-card').count();
  const emptyVisible = await page.locator('#empty').evaluate((el) => !el.hidden);
  check('Hata durumunda iskeletler temizlendi', skeletonLeft === 0, skeletonLeft + ' kaldi');
  check('Hata durumunda empty-state gorunuyor', emptyVisible);
  await ctx.close();
}

// ---- 4. Arama + filtre hala calisiyor mu ----
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  await page.locator('#search').fill('Ahri');
  await page.waitForTimeout(400);
  const firstTitle = await page.locator('#results .skin-card h3').first().textContent();
  check('Arama calisiyor (Ahri)', /ahri/i.test(firstTitle), firstTitle);

  await page.locator('#search').fill('');
  await page.waitForTimeout(400);
  const noSkeleton = await page.locator('#results .skeleton-card').count();
  check('Arama sonrasi iskelet sizintisi yok', noSkeleton === 0);
  await ctx.close();
}

// ---- 5. Regresyon: diger ozellikler ----
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // command palette
  await page.keyboard.press('Control+k');
  await page.waitForSelector('#command-palette[open]');
  await page.locator('#command-palette-input').pressSequentially('katarina', { delay: 25 });
  await page.waitForTimeout(400);
  const palItems = await page.locator('.command-palette-item').count();
  check('Command palette calisiyor', palItems > 0, palItems + ' sonuc');
  await page.keyboard.press('Escape');

  // toast (favori)
  await page.locator('.favorite-button[data-skin-id]').first().click();
  await page.waitForTimeout(300);
  check('Toast calisiyor', (await page.locator('.toast').count()) > 0);

  // scroll-to-top
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForTimeout(400);
  const sttVisible = await page.locator('#scroll-to-top').evaluate((el) =>
    el.classList.contains('scroll-to-top-visible'));
  check('Scroll-to-top calisiyor', sttVisible);

  // gradient mesh + kart
  check('Gradient mesh var', (await page.locator('.mesh-blob').count()) === 3);
  check('Skin kartlari render', (await page.locator('#results .skin-card').count()) > 0);

  // dil degisimi
  await page.locator('#lang-switch').click();
  await page.locator('.lang-menu-option[data-lang="en"]').click();
  await page.waitForTimeout(400);
  const triggerLabel = await page.locator('.command-palette-trigger-label').textContent();
  check('Dil degisimi calisiyor', triggerLabel === 'Search', triggerLabel);

  await ctx.close();
}

await browser.close();
console.log('---');
console.log('pageerror sayisi:', errors.length);
errors.forEach((e) => console.log('ERR:', e));
console.log(failed === 0 && errors.length === 0 ? 'ALL PASSED' : 'FAILURES: ' + failed);
process.exit(failed === 0 && errors.length === 0 ? 0 : 1);
