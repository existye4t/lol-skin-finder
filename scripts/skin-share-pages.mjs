import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { skinShareCollection, skinSharePath } from '../src/skin-share.js';

const site = 'https://existye4t.github.io/lol-skin-finder/';
const brand = 'Exist Skins';
const collections = { skins: 'Skinler', pbe: 'PBE', rainbow: 'Rainbow', classic: 'Classic' };
const catalogFiles = ['skins', 'rainbow', 'classic'];
const imageHosts = new Set(['ddragon.leagueoflegends.com', 'raw.communitydragon.org']);
const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => htmlEntities[char]);

function previewImage(skin) {
  const useCatalogPreview = skin.isPbe || skin.parentSkinId;
  const sources = useCatalogPreview ? [skin.imageFallback, skin.image] : [skin.image, skin.imageFallback];
  for (const source of sources) {
    if (!source || !URL.canParse(source)) continue;
    const url = new URL(source);
    if (url.protocol === 'https:' && imageHosts.has(url.hostname)) return url.href;
  }
  return new URL('preview-v2.png', site).href;
}

function renderSharePage(skin, collection, path) {
  const name = skin.nameTr || skin.name || skin.nameEn;
  const champion = skin.championTr || skin.champion || skin.championEn;
  const title = escapeHtml(name);
  const description = escapeHtml(`${champion} • ${collections[collection]} • Riot ID ${skin.id}`);
  const image = escapeHtml(previewImage(skin));
  const canonical = escapeHtml(new URL(path, site).href);
  const target = escapeHtml(`../../?${new URLSearchParams({ collection, skin: skin.id })}`);
  return `<!doctype html>
<html lang="tr">
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
  <meta property="og:image" content="${image}">
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
    <a id="open-skin" href="${target}">Skin detayını aç</a>
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
      for (const file of catalogFiles) {
        const skins = (await readCatalog(file)).filter(skin => /^[0-9]+$/.test(String(skin.id)));
        await mkdir(resolve(dir, 'share', file), { recursive: true });
        for (let offset = 0; offset < skins.length; offset += 64) {
          await Promise.all(skins.slice(offset, offset + 64).map(skin => {
            const collection = skinShareCollection(skin);
            if (collection !== file && !(collection === 'pbe' && file === 'skins')) {
              throw new Error(`Unexpected collection for share skin ${skin.id} in ${file}.json`);
            }
            const fileName = skinSharePath(collection, skin.id);
            return writeFile(resolve(dir, fileName), renderSharePage(skin, collection, fileName));
          }));
        }
        count += skins.length;
      }
      console.log(`[skin-share-pages] Generated ${count} share pages.`);
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url.split('?')[0];
        const match = /^\/share\/(skins|rainbow|classic)\/([0-9]+)\.html$/.exec(path);
        if (!match || !['GET', 'HEAD'].includes(req.method)) return next();
        const [, file, id] = match;
        try {
          const skins = await readCatalog(file);
          const skin = skins.find(item => String(item.id) === id);
          if (!skin) {
            res.statusCode = 404;
            return res.end();
          }
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(req.method === 'HEAD' ? undefined : renderSharePage(skin, skinShareCollection(skin), path.slice(1)));
        } catch (error) {
          next(error);
        }
      });
    }
  };
}
