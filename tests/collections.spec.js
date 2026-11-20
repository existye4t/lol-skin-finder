import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const site = 'http://127.0.0.1:4173/';
const { skins } = JSON.parse(readFileSync(new URL('../public/data/skins.json', import.meta.url)));
const pbeSkins = skins.filter(skin => skin.isPbe);
const pbeChroma = pbeSkins.find(skin => pbeSkins.some(parent => parent.id === skin.parentSkinId));
const pbeParent = pbeSkins.find(skin => skin.id === pbeChroma?.parentSkinId);

function holdRequest(page, pathname) {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const requests = [];
  const routed = page.route(pathname, async route => {
    requests.push(route.request().url());
    await gate;
    await route.continue();
  });
  return { routed, release, requests };
}

test('Riot ID search finds one exact skin or chroma without fuzzy hits', async ({ page }) => {
  await page.goto(site, { waitUntil: 'domcontentloaded' });
  const search = page.locator('#search');
  const cards = page.locator('#results .skin-card');
  const result = id => cards.filter({ has: page.locator(`.favorite-button[data-skin-id="${id}"]`) });

  await search.fill('103015');
  await expect(result('103015')).toBeVisible();
  await expect(cards).toHaveCount(1);

  await search.fill('Riot Skin ID: 103060');
  await expect(result('103060')).toBeVisible();
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Yıldönümü Ahri');

  await search.fill('10301');
  await expect(page.locator('#empty')).toBeVisible();
  await expect(cards).toHaveCount(0);

  await search.fill('Ahri');
  await expect(result('103015')).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(1);

  await page.locator('#command-palette-trigger').click();
  await page.locator('#command-palette-input').fill('103060');
  const options = page.locator('#command-palette-results [role=option]');
  await expect(options).toHaveCount(1);
  await expect(options.first()).toContainText('Yıldönümü Ahri');
});

test('shared URLs expose crawler metadata and select the right collection and skin', async ({ page, request }) => {
  const modal = page.locator('#skin-modal');
  for (const [collection, tab, id, imagePattern] of [
    ['skins', 'Skinler', '99007', /Lux_7\.jpg/],
    ['skins', 'Skinler', '103060', /skin60\/chromapreview/],
    ['pbe', 'PBE', pbeChroma?.id, /raw\.communitydragon\.org\/pbe\//],
    ['rainbow', 'Rainbow', '103015', /Ahri_15\.jpg/],
    ['classic', 'Classic', '60062031', /communitydragon\.org\/16\.21\//]
  ]) {
    if (!id) continue;
    const folder = collection === 'pbe' ? 'skins' : collection;
    const link = `${site}share/${folder}/${id}.html`;
    const preview = await request.get(link, { headers: { 'user-agent': 'Discordbot/2.0' }, maxRedirects: 0 });
    expect(preview.status()).toBe(200);
    const html = await preview.text();
    expect(html).toContain('<meta property="og:site_name" content="Exist Skins">');
    expect(html).toContain(`Riot ID ${id}`);
    const image = html.match(/property="og:image" content="([^"]+)"/)?.[1];
    if (image?.includes('/share-art/')) {
      const artwork = await request.get(new URL(image).pathname.replace(/^\/lol-skin-finder\//, site));
      expect(artwork.status()).toBe(200);
      expect(artwork.headers()['content-type']).toMatch(/^image\/jpeg/);
      expect(html).toContain('<meta property="og:image:width" content="720">');
    } else {
      expect(image).toMatch(imagePattern);
    }
    await page.goto(link, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(`${site}?collection=${collection}&skin=${id}`);
    await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#modal-skin-id')).toContainText(id);
    await expect(page.locator('#results .skin-card')).toHaveCount(1);
  }

  const home = await request.get(site);
  expect(await home.text()).toMatch(/property="og:image"\s+content="[^"]+\/preview-v2\.png"/);
});

test('copy link writes the exact collection and ID and offers a selectable URL if blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { async writeText(value) {
        if (window.rejectClipboard) throw new Error('Clipboard blocked');
        window.copiedSkinUrl = value;
      } }
    });
  });
  await page.goto(`${site}?collection=rainbow&skin=103015&utm_source=example`, { waitUntil: 'domcontentloaded' });
  const copy = page.getByRole('button', { name: 'Bağlantıyı kopyala' });
  await copy.click();
  const href = `${site}share/rainbow/103015.html?preview=3`;
  expect(await page.evaluate(() => window.copiedSkinUrl)).toBe(href);
  await expect(page.locator('#modal-share-status')).toHaveText('Bağlantı kopyalandı.');

  await page.evaluate(() => { window.rejectClipboard = true; });
  await copy.click();
  const fallback = page.locator('#modal-share-url');
  await expect(fallback).toBeVisible();
  await expect(fallback).toBeFocused();
  await expect(fallback).toHaveValue(href);
});

test('top-right controls stay at the top of the document when scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(site, { waitUntil: 'domcontentloaded' });
  const actions = page.locator('.top-actions');
  const settings = page.locator('#appearance-toggle');

  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 820 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(settings).toBeInViewport({ ratio: 1 });
    const initial = await actions.boundingBox();
    expect(initial.y).toBeGreaterThanOrEqual(0);
    expect(initial.x + initial.width).toBeLessThanOrEqual(width);

    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(400);
    await expect(actions).not.toBeInViewport();
    const documentTop = await actions.evaluate(el => el.getBoundingClientRect().top + window.scrollY);
    expect(documentTop).toBeGreaterThanOrEqual(0);
    expect(documentTop).toBeLessThan(64);
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await settings.click();
  await expect(page.locator('#appearance-dialog')).toBeVisible();
});

test('Discord footer clears the results and scroll button across collections and screen sizes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const invite = 'https://discord.gg/fixture';
  await page.route('**/data/discord-profile.json', route => route.fulfill({
    json: { nick: 'existofficial', discordUrl: invite }
  }));
  await page.goto(site, { waitUntil: 'domcontentloaded' });
  const footer = page.locator('#catalog-footer');
  const join = footer.getByRole('link', { name: "Discord'a Katıl" });
  const profile = footer.locator('.catalog-footer-profile');
  const results = page.locator('#results');
  await expect(footer).toHaveCount(1);
  await expect(join).toHaveAttribute('href', invite);
  await expect(page.locator('#discord-modal-join')).toHaveAttribute('href', invite);

  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 820 });
    for (const collection of ['Skinler', 'PBE', 'Rainbow', 'Classic']) {
      await page.getByRole('tab', { name: collection, exact: true }).click();
      await page.locator('#search-examples button').first().click();
      await expect(results.locator('.skin-card').first()).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const [gridBox, footerBox, profileBox, joinBox, topBox] = await Promise.all(
        [results, footer, profile, join, page.locator('#scroll-to-top')].map(locator => locator.boundingBox())
      );
      expect(footerBox.y - gridBox.y - gridBox.height).toBeGreaterThanOrEqual(32);
      expect(footerBox.x + footerBox.width).toBeLessThanOrEqual(width);
      expect(footerBox.y + footerBox.height).toBeLessThan(topBox.y);
      expect(joinBox.height).toBeGreaterThanOrEqual(44);
      if (width === 375) {
        expect(joinBox.y).toBeGreaterThan(profileBox.y + profileBox.height);
      } else {
        expect(joinBox.x).toBeGreaterThan(profileBox.x + profileBox.width);
      }
      await page.locator('#search').fill('');
    }
  }

  await page.locator('#search').fill('9999999999999');
  await expect(page.locator('#empty')).toBeVisible();
  await expect(footer).toBeVisible();
});

test('cold tabs share a single live/PBE request and ignore late responses from other tabs', async ({ page }) => {
  const [skinsRequest, rainbowRequest, classicRequest] = ['skins', 'rainbow', 'classic'].map(
    name => holdRequest(page, `**/data/${name}.json`)
  );
  await Promise.all([skinsRequest.routed, rainbowRequest.routed, classicRequest.routed]);
  const results = page.locator('#results');
  const skeletons = results.locator('.skeleton-card');
  const cards = results.locator('.skin-card');
  const tab = name => page.getByRole('tab', { name, exact: true });
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));

  try {
    await page.goto(site, { waitUntil: 'domcontentloaded' });
    for (const name of ['Skinler', 'PBE', 'Rainbow', 'Classic']) {
      if (name !== 'Skinler') await tab(name).click();
      await expect(tab(name)).toHaveAttribute('aria-selected', 'true');
      await expect(results).toHaveAttribute('aria-busy', 'true');
      await expect(skeletons.first()).toBeVisible();
      await expect(cards).toHaveCount(0);
      await expect(page.locator('#empty')).toBeHidden();
    }
    expect(skinsRequest.requests).toHaveLength(1);

    const classicResponse = page.waitForResponse('**/data/classic.json');
    classicRequest.release();
    await classicResponse;
    await expect(cards.first()).toBeVisible();
    await expect(cards.first().locator('.skin-badge-classic')).toBeVisible();
    const lateResponses = Promise.all([
      page.waitForResponse('**/data/skins.json'),
      page.waitForResponse('**/data/rainbow.json')
    ]);
    skinsRequest.release();
    rainbowRequest.release();
    await lateResponses;

    await expect(tab('Classic')).toHaveAttribute('aria-selected', 'true');
    await expect(cards.first().locator('.skin-badge-classic')).toBeVisible();
    await tab('Rainbow').click();
    await expect(cards.first().locator('.skin-badge-rainbow')).toBeVisible();
    await expect(skeletons).toHaveCount(0);
    await tab('PBE').click();
    await expect(cards.first().locator('.skin-badge-pbe')).toBeVisible();
    await expect(results).toHaveAttribute('aria-busy', 'false');
    await expect(skeletons).toHaveCount(0);
    await tab('Skinler').click();
    await expect(page.locator('#popular-grid .skin-card').first()).toBeVisible();
    await expect(page.locator('#popular-grid :is(.skin-badge-rainbow, .skin-badge-classic)')).toHaveCount(0);
    expect(skinsRequest.requests).toHaveLength(1);
    expect(rainbowRequest.requests).toHaveLength(1);
    expect(classicRequest.requests).toHaveLength(1);
    expect(runtimeErrors).toEqual([]);
  } finally {
    skinsRequest.release();
    rainbowRequest.release();
    classicRequest.release();
  }
});

test('PBE shows one card per skin family, keeps chromas, and filters by champion', async ({ page }) => {
  test.skip(!pbeParent, 'The current PBE rotation has no indexed parent and chroma combination.');
  await page.goto(site, { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'PBE', exact: true }).click();
  const results = page.locator('#results');
  await expect(results.locator('.skin-card').first()).toBeVisible();
  await expect(results.locator('.skin-card:not(:has(.skin-badge-pbe))')).toHaveCount(0);

  await page.locator('#filter-button').click();
  await page.locator(`#filter-option-list input[value="${pbeParent.champion.toLowerCase()}"]`).check();
  await page.locator('#apply-filters').click();
  await page.locator('#search').fill(pbeChroma.id);
  const cards = results.locator('.skin-card');
  await expect(cards).toHaveCount(1);
  await cards.first().click();
  const modal = page.locator('#skin-modal');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.chroma-id').getByText(pbeChroma.id, { exact: true })).toBeVisible();
  await expect(modal.locator('.chroma-id').getByText(pbeParent.id, { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
});

test('mobile tab rail supports keyboard focus and reduced-motion loading', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 820 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const skinsRequest = holdRequest(page, '**/data/skins.json');
  await skinsRequest.routed;
  try {
    await page.goto(site, { waitUntil: 'domcontentloaded' });
    const rail = page.getByRole('tablist');
    const tabs = rail.getByRole('tab');
    const results = page.locator('#results');
    await expect(tabs).toHaveText(['Skinler', 'PBE', 'Rainbow', 'Classic']);
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'PBE' })).toBeVisible();
    const shimmer = results.locator('.skeleton-shimmer').first();
    await expect(shimmer).toBeVisible();
    expect(await shimmer.evaluate(el => getComputedStyle(el, '::after').display)).toBe('none');
    expect(await rail.evaluate(el => getComputedStyle(el, '::before').transitionProperty)).toBe('none');
    for (const tab of await tabs.all()) expect((await tab.boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    const response = page.waitForResponse('**/data/skins.json');
    skinsRequest.release();
    await response;
    await expect(results.locator('.skin-card').first()).toBeVisible();
    expect(await results.evaluate(el => el.getAnimations().length)).toBe(0);
    await page.keyboard.press('End');
    await expect(tabs.last()).toBeFocused();
    await expect(tabs.last()).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('Home');
    await expect(tabs.first()).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('tabindex', '-1');
  } finally {
    skinsRequest.release();
  }
});

test('a failed collection shows retry, then supports empty searches and recovery', async ({ page }) => {
  await page.route('**/data/rainbow.json', route => route.fulfill({ status: 503 }), { times: 1 });
  await page.goto(site, { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Rainbow', exact: true }).click();
  const retry = page.locator('#collection-retry');
  const cards = page.locator('#results .skin-card');
  await expect(retry).toBeVisible();
  await expect(cards).toHaveCount(0);
  await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false');
  await retry.click();
  await expect(cards.first().locator('.skin-badge-rainbow')).toBeVisible();
  await expect(retry).toBeHidden();
  await page.locator('#search').fill('9999999999999');
  await expect(page.locator('#empty')).toBeVisible();
  await expect(retry).toBeHidden();
  await page.locator('#search').fill('');
  await expect(cards.first()).toBeVisible();
});
