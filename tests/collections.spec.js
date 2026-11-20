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
