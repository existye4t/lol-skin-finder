import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import sharp from 'sharp';
import { skinShareCollection } from '../src/skin-share.js';
import { catalogFiles, collections, escapeHtml, previewSources, shareArtDirectory, shareArtFile } from './skin-share-pages.mjs';

const width = 720;
const height = 378;
const artworkLeft = 278;
const ids = new Set(process.argv.slice(2));
const concurrency = 24;
const missing = [];

function titleLines(name, capacity) {
  const lines = [''];
  for (const word of name.trim().split(/\s+/)) {
    const line = lines.at(-1);
    if (line && line.length + word.length + 1 > capacity) lines.push(word);
    else lines[lines.length - 1] = line ? `${line} ${word}` : word;
  }
  const visible = lines.slice(0, 3).map(line => line.length > capacity + 3 ? line.slice(0, capacity) + '…' : line);
  if (lines.length > 3) visible[2] = visible[2].slice(0, capacity - 1) + '…';
  return visible;
}

function brandOverlay(skin, collection) {
  const name = skin.nameTr || skin.name || skin.nameEn;
  const fontSize = name.length > 18 ? 29 : 36;
  const title = titleLines(name, fontSize === 36 ? 18 : 21).map((line, index) =>
    `<tspan x="34" y="${153 + index * (fontSize + 7)}">${escapeHtml(line)}</tspan>`
  ).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><linearGradient id="fade"><stop stop-color="#0b0b0d"/><stop offset="1" stop-color="#0b0b0d" stop-opacity="0"/></linearGradient></defs>
  <path d="M0 0h278v378H0z" fill="#0b0b0d"/>
  <rect x="278" width="130" height="378" fill="url(#fade)"/>
  <rect x="1" y="1" width="718" height="376" rx="13" fill="none" stroke="#fff" stroke-opacity=".15"/>
  <g font-family="DejaVu Sans, Arial, sans-serif">
    <rect x="34" y="33" width="36" height="36" rx="9" fill="#f4f4f5"/>
    <path d="M44 42h16v3H47v4h10v3H47v5h13v3H44z" fill="#0b0b0d"/>
    <text x="81" y="56" font-size="13" font-weight="700" letter-spacing="2" fill="#f4f4f5">EXIST SKINS</text>
    <text x="34" y="108" font-size="12" font-weight="700" letter-spacing="1.7" fill="#acacb4">${collections[collection].toUpperCase()}</text>
    <text font-size="${fontSize}" font-weight="700" fill="#f5f5f7">${title}</text>
    <path d="M34 295h195" stroke="#36363b"/>
    <text x="34" y="326" font-size="12" letter-spacing="1" fill="#aaaab2">RIOT ID ${skin.id}</text>
  </g>
</svg>`);
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
        .resize(width - artworkLeft, height, {
          fit: skin.parentSkinId ? 'contain' : 'cover',
          background: '#0b0b0d'
        })
        .png().toBuffer();
    } catch {
      continue;
    }
    const card = await sharp({ create: { width, height, channels: 3, background: '#0b0b0d' } })
      .composite([{ input: image, left: artworkLeft, top: 0 }, { input: brandOverlay(skin, collection) }])
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
