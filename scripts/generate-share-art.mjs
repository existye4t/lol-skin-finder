import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { skinShareCollection } from '../src/skin-share.js';
import { catalogFiles, collections, escapeHtml, previewSources, shareArtDirectory, shareArtFile } from './skin-share-pages.mjs';

const width = 720;
const height = 378;
const artworkLeft = 308;
const artworkInset = 12;
const textLeft = 34;
const textWidth = 252;
const ids = new Set(process.argv.slice(2));
const concurrency = 24;
const missing = [];
const fontfile = fileURLToPath(new URL('./fonts/Inter.ttf', import.meta.url));

function renderText(value, { size, weight, color, spacing = 0 }) {
  return sharp({
    text: {
      text: `<span foreground="${color}" weight="${weight}" letter_spacing="${spacing}">${escapeHtml(value)}</span>`,
      font: `Inter ${size}`,
      fontfile,
      width: textWidth,
      dpi: 72,
      wrap: 'word',
      rgba: true
    }
  }).png().toBuffer({ resolveWithObject: true });
}

const favicon = await sharp(await readFile(new URL('../favicon.png', import.meta.url)))
  .resize(42, 42).png().toBuffer();
const wordmark = await renderText('Exist Skins', { size: 14, weight: 'semibold', color: '#e9e9ed', spacing: 240 });
const rule = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="310"><rect width="1" height="310" fill="#27272b"/></svg>');

async function cardLayers(skin, collection) {
  const name = (skin.nameTr || skin.name || skin.nameEn).trim();
  let title;
  for (const size of [40, 36, 32, 28, 24]) {
    title = await renderText(name, { size, weight: 'semibold', color: '#f3f3f5', spacing: -570 });
    if (title.info.width <= textWidth && title.info.height <= 126) break;
  }
  const meta = await renderText(`${collections[collection]}  /  Riot ID ${skin.id}`, {
    size: 12, weight: 'medium', color: '#b5b5bd', spacing: 170
  });
  return [
    { input: rule, left: artworkLeft - 12, top: 34 },
    { input: favicon, left: textLeft, top: 33 },
    { input: wordmark.data, left: textLeft + 55, top: 33 + Math.floor((42 - wordmark.info.height) / 2) },
    { input: title.data, left: textLeft, top: 184 - Math.floor(title.info.height / 2) },
    { input: meta.data, left: textLeft, top: 324 }
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

async function makeCard(skin, collection, output) {
  for (const url of previewSources(skin)) {
    const bytes = await fetchArtwork(url);
    if (!bytes) continue;
    let image;
    try {
      image = await sharp(bytes, { limitInputPixels: 16000000 })
        .resize(width - artworkLeft - artworkInset, height - 2 * artworkInset, {
          fit: skin.parentSkinId ? 'contain' : 'cover',
          background: '#111113'
        })
        .png().toBuffer();
    } catch {
      continue;
    }
    const card = await sharp({ create: { width, height, channels: 3, background: '#111113' } })
      .composite([{ input: image, left: artworkLeft, top: artworkInset }, ...await cardLayers(skin, collection)])
      .jpeg({ quality: 74, mozjpeg: true })
      .toBuffer();
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
