import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const PUBLIC_DIR = resolve(ROOT_DIR, 'public');
const DATA_DIR = resolve(PUBLIC_DIR, 'data');
const FANTOME_DIR = resolve(PUBLIC_DIR, 'fantome');
const IMAGES_DIR = resolve(PUBLIC_DIR, 'images', 'skins');

const PORT = 3001;

// Gerekli klasörleri hazırla
await mkdir(DATA_DIR, { recursive: true });
await mkdir(FANTOME_DIR, { recursive: true });
await mkdir(IMAGES_DIR, { recursive: true });

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. Health check
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { status: 'ok', server: 'local-admin-server' });
  }

  // 2. Auth login
  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', () => {
      try {
        const { password } = JSON.parse(body || '{}');
        if (password === 'admin' || password.length >= 4) {
          return sendJson(res, 200, { success: true, token: 'local-dev-token' });
        }
        return sendJson(res, 401, { error: 'Geçersiz yönetici şifresi.' });
      } catch (e) {
        return sendJson(res, 400, { error: 'Geçersiz JSON formatı.' });
      }
    });
    return;
  }

  // 3. Save Skin Override / File
  if (req.method === 'POST' && url.pathname === '/api/admin/save') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const skinId = String(payload.skinId || '').trim();

        // Güvenlik: ID sadece rakamlardan oluşmalıdır (Path traversal engelleme)
        if (!skinId || !/^\d+$/.test(skinId)) {
          return sendJson(res, 400, { error: 'Geçersiz skin ID formatı.' });
        }

        const { override, imageFileBase64, fantomeFileBase64, isCustomSkin } = payload;

        // 1. Görseli kaydet
        if (imageFileBase64 && imageFileBase64.startsWith('data:image/')) {
          const base64Data = imageFileBase64.replace(/^data:image\/\w+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          const imagePath = resolve(IMAGES_DIR, `${skinId}.jpg`);
          await writeFile(imagePath, imageBuffer);
          console.log(`[Admin Local] Görsel kaydedildi: ${imagePath}`);
        }

        // 2. .fantome dosyasını kaydet
        if (fantomeFileBase64 && fantomeFileBase64.startsWith('data:')) {
          const base64Data = fantomeFileBase64.replace(/^data:[^;]+;base64,/, '');
          const fantomeBuffer = Buffer.from(base64Data, 'base64');
          const fantomePath = resolve(FANTOME_DIR, `${skinId}.fantome`);
          await writeFile(fantomePath, fantomeBuffer);
          console.log(`[Admin Local] Fantome kaydedildi: ${fantomePath}`);
        }

        // 3. admin-overrides.json dosyasını güncelle
        const overridesPath = resolve(DATA_DIR, 'admin-overrides.json');
        let currentOverrides = { updatedAt: new Date().toISOString(), overrides: {}, customSkins: [] };
        try {
          const raw = await readFile(overridesPath, 'utf8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (item?.id) currentOverrides.overrides[String(item.id)] = item;
            });
          } else if (parsed && typeof parsed === 'object') {
            currentOverrides = {
              updatedAt: parsed.updatedAt || new Date().toISOString(),
              overrides: parsed.overrides || {},
              customSkins: parsed.customSkins || []
            };
          }
        } catch (e) {
          // dosya yoksa veya boşsa
        }

        if (!currentOverrides.overrides) currentOverrides.overrides = {};
        if (!currentOverrides.customSkins) currentOverrides.customSkins = [];

        if (isCustomSkin) {
          const cIdx = currentOverrides.customSkins.findIndex((s) => String(s.id) === skinId);
          if (cIdx !== -1) {
            currentOverrides.customSkins[cIdx] = override;
          } else {
            currentOverrides.customSkins.push(override);
          }
        } else if (override) {
          currentOverrides.overrides[skinId] = override;
        }
        currentOverrides.updatedAt = new Date().toISOString();

        await writeFile(overridesPath, JSON.stringify(currentOverrides, null, 2), 'utf8');
        console.log(`[Admin Local] admin-overrides.json güncellendi.`);

        // 4. skins.json dosyasında ilgili skini güncelle
        const skinsPath = resolve(DATA_DIR, 'skins.json');
        try {
          const skinsRaw = await readFile(skinsPath, 'utf8');
          const skinsData = JSON.parse(skinsRaw);
          if (Array.isArray(skinsData.skins)) {
            const index = skinsData.skins.findIndex((s) => String(s.id) === skinId);
            if (index !== -1 && override) {
              skinsData.skins[index] = { ...skinsData.skins[index], ...override };
            } else if (isCustomSkin && override) {
              skinsData.skins.push(override);
            }
            skinsData.updatedAt = new Date().toISOString();
            await writeFile(skinsPath, JSON.stringify(skinsData, null, 2), 'utf8');
            console.log(`[Admin Local] skins.json güncellendi.`);
          }
        } catch (e) {
          console.warn('[Admin Local] skins.json güncellenirken hata:', e.message);
        }

        // 5. fantome-files.json güncelle
        if (fantomeFileBase64) {
          const fantomeListPath = resolve(DATA_DIR, 'fantome-files.json');
          try {
            const rawList = await readFile(fantomeListPath, 'utf8');
            const list = JSON.parse(rawList);
            const listArr = Array.isArray(list) ? list : Array.isArray(list.files) ? list.files : [];
            if (!listArr.includes(skinId)) {
              listArr.push(skinId);
              listArr.sort((a, b) => Number(a) - Number(b));
              await writeFile(fantomeListPath, JSON.stringify(listArr, null, 2), 'utf8');
            }
          } catch (e) {
            //
          }
        }

        return sendJson(res, 200, { success: true, skinId, message: 'Değişiklikler yerel diske kaydedildi.' });
      } catch (error) {
        console.error('[Admin Local] Kaydetme hatası:', error);
        return sendJson(res, 500, { error: error.message });
      }
    });
    return;
  }

  // 4. Revert Skin
  if (req.method === 'POST' && url.pathname === '/api/admin/revert') {
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', async () => {
      try {
        const { skinId, originalSkin } = JSON.parse(body || '{}');
        if (!skinId) return sendJson(res, 400, { error: 'skinId gerekli.' });

        const overridesPath = resolve(DATA_DIR, 'admin-overrides.json');
        const raw = await readFile(overridesPath, 'utf8');
        const currentOverrides = JSON.parse(raw);
        if (currentOverrides?.overrides) {
          delete currentOverrides.overrides[String(skinId)];
          currentOverrides.updatedAt = new Date().toISOString();
          await writeFile(overridesPath, JSON.stringify(currentOverrides, null, 2), 'utf8');
        }

        // Restore in skins.json if originalSkin provided
        if (originalSkin) {
          const skinsPath = resolve(DATA_DIR, 'skins.json');
          const skinsRaw = await readFile(skinsPath, 'utf8');
          const skinsData = JSON.parse(skinsRaw);
          const idx = skinsData.skins.findIndex((s) => String(s.id) === String(skinId));
          if (idx !== -1) {
            skinsData.skins[idx] = { ...originalSkin };
            skinsData.updatedAt = new Date().toISOString();
            await writeFile(skinsPath, JSON.stringify(skinsData, null, 2), 'utf8');
          }
        }

        return sendJson(res, 200, { success: true, message: `Skin ${skinId} orijinal veriye döndürüldü.` });
      } catch (e) {
        return sendJson(res, 500, { error: e.message });
      }
    });
    return;
  }

  // 404
  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n==============================================`);
  console.log(`🚀 Private Admin Local Server running on:`);
  console.log(`   http://127.0.0.1:${PORT}`);
  console.log(`==============================================\n`);
});
