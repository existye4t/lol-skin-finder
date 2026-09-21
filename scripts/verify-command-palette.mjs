// Run against a running dev/preview server:
// node scripts/verify-command-palette.mjs http://127.0.0.1:5173
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const baseURL = process.argv[2] || 'http://127.0.0.1:5173';
const browser = await chromium.launch();
const checks = [];
const errors = [];
const networkFailures = new Set();
const presenceResponses = [];
const check = async (name, run) => {
  await run();
  checks.push(name);
};

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', request => networkFailures.add(new URL(request.url()).origin));
  page.on('response', response => {
    if (response.url().includes('api.lanyard.rest')) presenceResponses.push(response.status());
  });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await expect(page.locator('#results .skin-card').first()).toBeAttached();

  const palette = page.locator('#command-palette');
  const input = page.locator('#command-palette-input');
  const list = page.locator('#command-palette-results');
  const items = list.locator('.command-palette-item');
  const trigger = page.locator('#command-palette-trigger');
  const search = page.locator('#search');
  const isOpen = () => palette.evaluate(el => el.open);
  const scrollY = () => page.evaluate(() => window.scrollY);
  const expectClosed = async () => {
    await expect.poll(isOpen).toBe(false);
    await expect(palette).toBeHidden();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
  };
  const openShortcut = async () => {
    await page.keyboard.press('Control+k');
    await expect.poll(isOpen).toBe(true);
    await expect(input).toBeFocused();
  };

  await check('Closed palette does not intercept the page; trigger opens it', async () => {
    await expectClosed();
    await expect(trigger).toBeVisible();
    await expect(trigger.locator('kbd').first()).toHaveText('Ctrl');
    await trigger.click();
    await expect(input).toBeFocused();
    await expect(list).toContainText('Skin aramak için yazın');
    await page.keyboard.press('Escape');
    await expectClosed();
    await expect(trigger).toBeFocused();
  });

  await check('Ctrl+K focus style, Katarina results (>8), highlight and accent line', async () => {
    await page.evaluate(() => window.scrollTo(0, 450));
    await openShortcut();
    await expect(input).toHaveCSS('outline-style', 'none');
    await expect(palette).toHaveCSS('border-color', 'rgba(79, 124, 255, 0.5)');
    assert.notEqual(await palette.evaluate(el => getComputedStyle(el).boxShadow), 'none');
    await input.fill('Katarina');
    await expect.poll(() => items.count()).toBeGreaterThan(8);
    await expect(items.first().locator('mark')).toHaveText('Katarina');
    await expect.poll(() => items.first().evaluate(el => parseFloat(getComputedStyle(el, '::before').height))).toBeGreaterThan(0);
    await items.nth(1).hover();
    await expect(items.nth(1)).toHaveClass(/is-active/);
    await expect.poll(() => items.nth(1).evaluate(el => parseFloat(getComputedStyle(el, '::before').height))).toBeGreaterThan(0);
  });

  await check('Wheel scroll stays inside palette, including at list boundary and backdrop', async () => {
    await expect(list).toHaveCSS('overflow-y', 'auto');
    assert.notEqual(await list.evaluate(el => getComputedStyle(el).maxHeight), 'none');
    assert.ok(await list.evaluate(el => el.scrollHeight > el.clientHeight));
    const y = await scrollY();
    const box = await list.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const before = await list.evaluate(el => el.scrollTop);
    await page.mouse.wheel(0, 450);
    await expect.poll(() => list.evaluate(el => el.scrollTop)).toBeGreaterThan(before);
    await page.mouse.wheel(0, 10000);
    await page.waitForTimeout(300);
    await page.mouse.wheel(0, 500);
    await page.mouse.move(8, 8);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(300);
    assert.equal(await scrollY(), y);
    await page.keyboard.press('Escape');
    await expectClosed();
    await page.mouse.wheel(0, 400);
    await expect.poll(scrollY).toBeGreaterThan(y);
  });

  await check('Keyboard wrap-around and Enter open the selected skin modal', async () => {
    await openShortcut();
    await input.fill('Katarina');
    await expect.poll(() => items.count()).toBeGreaterThan(0);
    await page.keyboard.press('ArrowUp');
    await expect(items.last()).toHaveClass(/is-active/);
    assert.ok(await list.evaluate(el => el.scrollTop > 0));
    await page.keyboard.press('ArrowDown');
    await expect(items.first()).toHaveClass(/is-active/);
    const name = await items.first().locator('.command-palette-item-name').textContent();
    await page.keyboard.press('Enter');
    await expectClosed();
    await expect(page.locator('#skin-modal')).toBeVisible();
    await expect(page.locator('#modal-skin-name')).toHaveText(name);
    assert.ok(await page.evaluate(() => document.querySelector('#skin-modal').contains(document.activeElement)));
    await page.locator('#skin-modal .modal-close').click();
  });

  await check('Empty/no-match input, accents, spaces, click selection, backdrop and shortcut close', async () => {
    await openShortcut();
    await input.fill('zzzz-no-such-skin-987654321');
    await expect(items).toHaveCount(0);
    await expect(list).toContainText('Sonuç bulunamadı');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    assert.equal(await isOpen(), true);
    await input.fill('!!!');
    await expect(list).toContainText('Skin aramak için yazın');
    await input.fill('baskumandan katarina');
    await expect(items.first().locator('mark')).toHaveText('Başkumandan Katarina');
    await items.first().click();
    await expectClosed();
    await expect(page.locator('#modal-skin-name')).toHaveText('Başkumandan Katarina');
    await page.locator('#skin-modal .modal-close').click();
    await openShortcut();
    await page.mouse.click(8, 8);
    await expectClosed();
    await openShortcut();
    await page.keyboard.press('Control+k');
    await expectClosed();
  });

  await check('Rapid close/reopen preserves lock and restores pre-existing body overflow', async () => {
    await page.evaluate(() => { document.body.style.overflow = 'clip'; });
    await openShortcut();
    await page.evaluate(() => {
      for (let i = 0; i < 2; i++) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
      }
    });
    await page.waitForTimeout(100);
    assert.equal(await isOpen(), true);
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('clip');
    await page.evaluate(() => { document.body.style.overflow = ''; });
  });

  await check('Normal search and palette search remain independent', async () => {
    await search.fill('Ahri');
    await expect(page.locator('#results .skin-card h3').first()).toHaveText('Ağaç Ata Ahri');
    const names = await page.locator('#results .skin-card h3').allTextContents();
    // Existing search deliberately includes fuzzy matches after exact champion matches.
    assert.ok(names.includes('Ahri') && names.includes('K/DA Ahri'));
    assert.ok(names.indexOf('Ahri') < names.indexOf('Cadılar Meclisi Nilah'));
    await openShortcut();
    await input.fill('Katarina');
    await page.keyboard.press('Escape');
    await expectClosed();
    await expect(search).toHaveValue('Ahri');
    assert.deepEqual(await page.locator('#results .skin-card h3').allTextContents(), names);
    await search.fill('');
    await expect(page.locator('#results .skin-card h3').first()).not.toHaveText('Ağaç Ata Ahri');
  });

  await check('Scroll reveal, card tilt/reset and animated non-intercepting gradient mesh', async () => {
    const card = page.locator('#results .skin-card').nth(10);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveClass(/visible/);
    await expect.poll(() => card.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3, { steps: 5 });
    await expect.poll(() => card.evaluate(el => el.style.transform)).toContain('rotateX(');
    await page.mouse.move(2, 2);
    await expect.poll(() => card.evaluate(el => el.style.transform)).toBe('');
    await expect(page.locator('.mesh-blob')).toHaveCount(3);
    await expect(page.locator('.gradient-mesh-bg')).toHaveCSS('pointer-events', 'none');
    await expect(page.locator('.noise-overlay')).toHaveCSS('pointer-events', 'none');
    const blob = page.locator('.mesh-blob-1');
    const before = await blob.evaluate(el => getComputedStyle(el).transform);
    await expect.poll(() => blob.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
  });

  await check('Language change translates trigger, normal results and palette results', async () => {
    await page.locator('#lang-switch').click();
    await page.locator('.lang-menu-option[data-lang="en"]').click();
    await expect(trigger.locator('.command-palette-trigger-label')).toHaveText('Search');
    await search.fill('High Command Katarina');
    await expect(page.locator('#results .skin-card h3').first()).toHaveText('High Command Katarina');
    await trigger.click();
    await expect(list).toContainText('Type to search skins');
    await input.fill('High Command Katarina');
    await expect(items.first().locator('mark')).toHaveText('High Command Katarina');
    await page.keyboard.press('Escape');
  });

  await check('Discord widget/modal, status and palette Escape do not close underlying modal', async () => {
    await page.locator('#discord-contact').click();
    await expect(page.locator('#discord-modal')).toBeVisible();
    assert.ok(await page.locator('#discord-contact .discord-contact-copy .discord-contact-name').textContent());
    await expect(page.locator('#discord-contact .discord-contact-status-text')).toHaveText(/Online|Idle|Do Not Disturb|Offline|Streaming/);
    await expect(page.locator('#discord-modal-join')).toHaveAttribute('href', /https:\/\/discord/);
    await openShortcut();
    await page.keyboard.press('Escape');
    await expectClosed();
    await expect(page.locator('#discord-modal')).toBeVisible();
    await page.locator('#discord-modal-close').click();
    await expect(page.locator('#discord-modal')).toBeHidden();
  });

  await check('Mac/Linux shortcut badges (navigator.platform simulation) and narrow viewport', async () => {
    for (const [platform, key, shortcut] of [['MacIntel', '⌘', 'Meta+k'], ['Linux x86_64', 'Ctrl', 'Control+k']]) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 700 } });
      await ctx.addInitScript(value => Object.defineProperty(navigator, 'platform', { get: () => value }), platform);
      const mobile = await ctx.newPage();
      mobile.on('pageerror', error => errors.push(error.message));
      await mobile.goto(baseURL, { waitUntil: 'networkidle' });
      const button = mobile.locator('#command-palette-trigger');
      await expect(button.locator('kbd').first()).toHaveText(key);
      await expect(button.locator('kbd').first()).toBeVisible();
      await button.click();
      const field = mobile.locator('#command-palette-input');
      await expect(field).toBeFocused();
      await field.fill('Katarina');
      await expect.poll(() => mobile.locator('#command-palette-results .command-palette-item').count()).toBeGreaterThan(0);
      const dialog = await mobile.locator('#command-palette').boundingBox();
      assert.ok(dialog.x >= 0 && dialog.x + dialog.width <= 390);
      assert.ok(dialog.y >= 0 && dialog.y + dialog.height <= 700);
      assert.ok(await mobile.locator('#command-palette-results').evaluate(el => el.scrollHeight > el.clientHeight));
      await mobile.keyboard.press(shortcut);
      await expect(mobile.locator('#command-palette')).toBeHidden();
      await ctx.close();
    }
  });

  assert.deepEqual(errors, [], 'Browser console/runtime errors');
  process.stdout.write(JSON.stringify({ passed: checks, browser: browser.version(), presenceResponses, networkFailures: [...networkFailures], errors }, null, 2) + '\n');
} catch (error) {
  process.stderr.write(JSON.stringify({ passed: checks, errors, presenceResponses, networkFailures: [...networkFailures] }, null, 2) + '\n');
  throw error;
} finally {
  await browser.close();
}
