import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { skinShareCollection } from '../src/skin-share.js';
import {
  catalogFiles, collections, escapeHtml, previewSources, shareArtDirectory, shareArtFile, shareArtWidth, shareArtHeight
} from './skin-share-pages.mjs';

const width = shareArtWidth;
const height = shareArtHeight;
const px = value => Math.round(value * width / 720);
const artworkLeft = px(308);
const artworkInset = px(12);
const textLeft = px(34);
const textWidth = px(252);
const iconSize = px(42);
const ids = new Set(process.argv.slice(2));
const concurrency = 24;
const missing = [];
const fontfile = fileURLToPath(new URL('./fonts/Inter.ttf', import.meta.url));

function renderText(value, { size, weight, color, spacing = 0 }) {
  return sharp({
    text: {
      text: `<span foreground="${color}" weight="${weight}" letter_spacing="${px(spacing)}">${escapeHtml(value)}</span>`,
      font: `Inter ${px(size)}`,
      fontfile,
      width: textWidth,
      dpi: 72,
      wrap: 'word',
      rgba: true
    }
  }).png().toBuffer({ resolveWithObject: true });
}

const favicon = await sharp(await readFile(new URL('../favicon.png', import.meta.url)))
  .resize(iconSize, iconSize).png().toBuffer();
const wordmark = await renderText('Exist Skins', { size: 14, weight: 'semibold', color: '#e9e9ed', spacing: 240 });
const rule = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${px(1)}" height="${px(310)}"><rect width="100%" height="100%" fill="#27272b"/></svg>`);

async function cardLayers(skin, collection) {
  const name = (skin.nameTr || skin.name || skin.nameEn).trim();
  let title;
  for (const size of [40, 36, 32, 28, 24]) {
    title = await renderText(name, { size, weight: 'semibold', color: '#f3f3f5', spacing: -570 });
    if (title.info.width <= textWidth && title.info.height <= px(126)) break;
  }
  const meta = await renderText(`${collections[collection]}  /  Riot ID ${skin.id}`, {
    size: 12, weight: 'medium', color: '#b5b5bd', spacing: 170
  });
  return [
    { input: rule, left: artworkLeft - artworkInset, top: px(34) },
    { input: favicon, left: textLeft, top: px(33) },
    { input: wordmark.data, left: textLeft + px(55), top: px(33) + Math.floor((iconSize - wordmark.info.height) / 2) },
    { input: title.data, left: textLeft, top: px(184) - Math.floor(title.info.height / 2) },
    { input: meta.data, left: textLeft, top: px(324) }
  ];
}

async function fetchArtwork(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        redirect: 'error',
        signal: AbortSignal.timeout(12000)
      });
      if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
        return Buffer.from(await response.arrayBuffer());
      }
      await response.body?.cancel();
      if (response.status !== 429 && response.status < 500) return null;
    } catch {
      // A retry or the next official image source may succeed.
    }
    if (attempt === 0) await delay(700);
  }
  return null;
}

async function encodeCard(composite, maxCardSize) {
  const { data, info } = await composite.raw().toBuffer({ resolveWithObject: true });
  const encoder = sharp(data, { raw: { width, height, channels: info.channels } });
  let jpeg;
  for (const quality of [88, 84, 80, 76, 72, 68, 64, 60, 56, 52]) {
    jpeg = await encoder.clone().jpeg({ quality, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer();
    if (jpeg.length <= maxCardSize) break;
  }
  return jpeg;
}

async function makeCard(skin, collection, output) {
  for (const url of previewSources(skin)) {
    const bytes = await fetchArtwork(url);
    if (!bytes) continue;
    let image;
    try {
      image = await sharp(bytes, { limitInputPixels: 16000000 })
        .resize(width - artworkLeft - artworkInset, height - 2 * artworkInset, {
          fit: skin.parentSkinId ? 'contain' : 'cover',
          kernel: sharp.kernel.lanczos3,
          background: '#111113'
        })
        .png().toBuffer();
    } catch {
      continue;
    }
    const composite = sharp({ create: { width, height, channels: 3, background: '#111113' } })
      .composite([{ input: image, left: artworkLeft, top: artworkInset }, ...await cardLayers(skin, collection)]);
    const card = await encodeCard(composite, (skin.parentSkinId ? 58 : 78) * 1024);
    await writeFile(output + '.tmp', card);
    await rename(output + '.tmp', output);
    return true;
  }
  return false;
}

await mkdir(shareArtDirectory, { recursive: true });
const cached = new Set(await readdir(shareArtDirectory));
const jobs = [];
for (const file of catalogFiles) {
  const { skins } = JSON.parse(await readFile(`public/data/${file}.json`, 'utf8'));
  for (const skin of skins) {
    const collection = skinShareCollection(skin);
    if (!/^[0-9]+$/.test(skin.id) || (ids.size && !ids.has(skin.id))) continue;
    if (collection !== file && !(collection === 'pbe' && file === 'skins')) continue;
    const art = shareArtFile(skin, collection);
    if (!cached.has(art)) jobs.push({ skin, collection, art });
  }
}

let next = 0;
let completed = 0;
await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
  while (next < jobs.length) {
    const { skin, collection, art } = jobs[next++];
    if (!await makeCard(skin, collection, resolve(shareArtDirectory, art))) missing.push(`${collection}/${skin.id}`);
    completed += 1;
    if (completed % 500 === 0) console.log(`[share-art] ${completed}/${jobs.length} checked.`);
  }
}));
console.log(`[share-art] Added ${completed - missing.length} images; ${missing.length} without reachable artwork; ${cached.size} cached files.`);
if (missing.length) console.warn('[share-art] Unavailable examples:', missing.slice(0, 20).join(', '));
