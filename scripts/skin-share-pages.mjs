import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sharePreviewVersion, skinShareCollection, skinSharePath } from '../src/skin-share.js';

const site = 'https://existye4t.github.io/lol-skin-finder/';
const brand = 'Exist Skins';
const collections = { pbe: 'PBE', rainbow: 'Rainbow', classic: 'Classic' };
export const shareLanguages = ['tr', 'en'];
export const catalogFiles = ['skins', 'rainbow', 'classic'];
export const shareArtDirectory = 'work/share-art';
export const shareArtWidth = 1200;
export const shareArtHeight = 630;
const imageHosts = new Set(['ddragon.leagueoflegends.com', 'raw.communitydragon.org']);
const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => htmlEntities[char]);

export function previewSources(skin) {
  const useCatalogPreview = skin.isPbe || skin.parentSkinId;
  const sources = useCatalogPreview ? [skin.imageFallback, skin.image] : [skin.image, skin.imageFallback];
  return [...new Set(sources.filter(source => {
    if (!source || !URL.canParse(source)) return false;
    const url = new URL(source);
    return url.protocol === 'https:' && imageHosts.has(url.hostname);
  }))];
}

export function shareCardText(skin, collection, lang) {
  const english = lang === 'en';
  return {
    name: (english ? skin.nameEn || skin.nameTr || skin.name : skin.nameTr || skin.name || skin.nameEn).trim(),
    collectionLabel: collection === 'skins' ? (english ? 'Skins' : 'Skinler') : collections[collection]
  };
}

export function shareArtFile(skin, collection, lang) {
  const identity = [sharePreviewVersion, skin.id, shareCardText(skin, collection, lang), previewSources(skin)];
  return createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0, 24) + '.webp';
}

function renderSharePage(skin, collection, path, lang, brandedArt = '') {
  const { name, collectionLabel } = shareCardText(skin, collection, lang);
  const champion = lang === 'en'
    ? skin.championEn || skin.championTr || skin.champion
    : skin.championTr || skin.champion || skin.championEn;
  const title = escapeHtml(name);
  const description = escapeHtml(`${champion} • ${collectionLabel} • Riot ID ${skin.id}`);
  const image = escapeHtml(brandedArt ? new URL(`share-art/${brandedArt}`, site).href
    : previewSources(skin)[0] || new URL('preview-v2.png', site).href);
  const brandedMetadata = brandedArt
    ? `\n  <meta property="og:image:type" content="image/webp">\n  <meta property="og:image:width" content="${shareArtWidth}">\n  <meta property="og:image:height" content="${shareArtHeight}">`
    : '';
  const shareUrl = new URL(path, site);
  if (brandedArt) shareUrl.searchParams.set('preview', sharePreviewVersion);
  const canonical = escapeHtml(shareUrl.href);
  const target = escapeHtml(`../../?${new URLSearchParams({ collection, skin: skin.id })}`);
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <meta name="color-scheme" content="dark">
  <title>${title} · ${brand}</title>
  <meta name="description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${brand}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">${brandedMetadata}
  <meta property="og:image:alt" content="${title}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
</head>
<body>
  <main>
    <p>${brand}</p>
    <h1>${title}</h1>
    <a id="open-skin" href="${target}">${lang === 'en' ? 'Open skin details' : 'Skin detayını aç'}</a>
  </main>
  <script>location.replace(document.getElementById('open-skin').href);</script>
</body>
</html>
`;
}

export function skinSharePages(dataDir) {
  const readCatalog = async key => JSON.parse(await readFile(resolve(dataDir, `${key}.json`), 'utf8')).skins;

  return {
    name: 'skin-share-pages',
    async writeBundle({ dir }) {
      let count = 0;
      let brandedCount = 0;
      const copiedImages = new Set();
      const artwork = new Set(await readdir(shareArtDirectory).catch(error => {
        if (error.code !== 'ENOENT') throw error;
        return [];
      }));
      if (artwork.size) await mkdir(resolve(dir, 'share-art'), { recursive: true });
      for (const file of catalogFiles) {
        const skins = (await readCatalog(file)).filter(skin => /^[0-9]+$/.test(String(skin.id)));
        await mkdir(resolve(dir, 'share', file), { recursive: true });
        for (let offset = 0; offset < skins.length; offset += 64) {
          await Promise.all(skins.slice(offset, offset + 64).map(async skin => {
            const collection = skinShareCollection(skin);
            if (collection !== file && !(collection === 'pbe' && file === 'skins')) {
              throw new Error(`Unexpected collection for share skin ${skin.id} in ${file}.json`);
            }
            for (const lang of shareLanguages) {
              const fileName = skinSharePath(collection, skin.id, lang);
              const art = shareArtFile(skin, collection, lang);
              const branded = artwork.has(art);
              if (branded) {
                brandedCount += 1;
                if (!copiedImages.has(art)) {
                  copiedImages.add(art);
                  await copyFile(resolve(shareArtDirectory, art), resolve(dir, 'share-art', art));
                }
              }
              await writeFile(resolve(dir, fileName), renderSharePage(skin, collection, fileName, lang, branded ? art : ''));
            }
          }));
        }
        count += skins.length * shareLanguages.length;
      }
      console.log(`[skin-share-pages] Generated ${count} share pages, ${brandedCount} branded, using ${copiedImages.size} unique images.`);
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url.split('?')[0];
        const match = /^\/share\/(skins|rainbow|classic)\/([0-9]+)(\.en)?\.html$/.exec(path);
        if (!match || !['GET', 'HEAD'].includes(req.method)) return next();
        const [, file, id, english] = match;
        const lang = english ? 'en' : 'tr';
        try {
          const skins = await readCatalog(file);
          const skin = skins.find(item => String(item.id) === id);
          if (!skin) {
            res.statusCode = 404;
            return res.end();
          }
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(req.method === 'HEAD' ? undefined : renderSharePage(skin, skinShareCollection(skin), path.slice(1), lang));
        } catch (error) {
          next(error);
        }
      });
    }
  };
}
