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

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const AUTH_TOKEN = 'local-dev-token';

const ALLOWED_ORIGINS = [
  'https://existye4t.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

const loginAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

await mkdir(DATA_DIR, { recursive: true });
await mkdir(FANTOME_DIR, { recursive: true });
await mkdir(IMAGES_DIR, { recursive: true });

if (!ADMIN_PASSWORD) {
  console.warn('\n⚠️  ADMIN_PASSWORD environment variable is not set!');
  console.warn('   Admin login will be rejected. Add ADMIN_PASSWORD to your .env file.\n');
}

function getCorsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

function sendJson(res, statusCode, data, origin) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...getCorsHeaders(origin)
  });
  res.end(JSON.stringify(data));
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

function verifyToken(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  return token === AUTH_TOKEN;
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders(origin));
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. Health check
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { status: 'ok', server: 'local-admin-server' }, origin);
  }

  if (req.method === 'POST' && url.pathname === '/api/bug-report') {
    const chunks = [];
    req.on('data', (chunk) => { chunks.push(chunk); });
    req.on('end', async () => {
      try {
        const bodyBuffer = Buffer.concat(chunks);
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
        const webRequest = new Request(`http://${req.headers.host}${req.url}`, {
          method: req.method, headers,
          body: bodyBuffer.length > 0 ? bodyBuffer : undefined
        });
        const formData = await webRequest.formData();
        const title = String(formData.get('title') || '').trim().slice(0, 120);
        const description = String(formData.get('description') || '').trim().slice(0, 2000);
        const skinId = String(formData.get('skinId') || '').slice(0, 50);
        const skinName = String(formData.get('skinName') || '').slice(0, 160);
        const videoLink = String(formData.get('videoLink') || '').trim().slice(0, 2048);
        const imageFile = formData.get('image');
        if (!title || !description) return sendJson(res, 400, { error: 'Başlık ve açıklama zorunludur.' }, origin);
        if (videoLink && !/^https?:\/\//i.test(videoLink)) return sendJson(res, 400, { error: 'Video linki geçerli bir http(s) URL olmalıdır.' }, origin);
        if (imageFile && imageFile.size > 0) {
          if (imageFile.size > 8 * 1024 * 1024) return sendJson(res, 413, { error: 'Dosya çok büyük. Maksimum 8MB.' }, origin);
          if (!String(imageFile.type || '').startsWith('image/')) return sendJson(res, 400, { error: 'Sadece resim dosyası yüklenebilir.' }, origin);
        }
        const webhookUrl = process.env.BUG_REPORT_WEBHOOK_URL;
        if (webhookUrl) {
          const fields = [];
          if (skinName) fields.push({ name: 'İlgili Skin', value: skinName, inline: true });
          if (videoLink) fields.push({ name: 'Video Linki', value: videoLink });
          const embed = { title: title.slice(0, 256), description: description.slice(0, 4096), color: 5814783, footer: { text: 'Exist Skin Finder • Hata Bildirimi' }, timestamp: new Date().toISOString() };
          if (fields.length > 0) embed.fields = fields;
          if (imageFile && imageFile.size > 0) {
            embed.image = { url: `attachment://${imageFile.name || 'screenshot.png'}` };
            const discordForm = new FormData();
            discordForm.append('payload_json', JSON.stringify({ embeds: [embed] }));
            discordForm.append('files[0]', imageFile, imageFile.name || 'screenshot.png');
            const discordRes = await fetch(webhookUrl, { method: 'POST', body: discordForm });
            if (!discordRes.ok) return sendJson(res, 502, { error: 'Bildirim Discord\'a gönderilemedi.' }, origin);
          } else {
            const discordRes = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ embeds: [embed] }) });
            if (!discordRes.ok) return sendJson(res, 502, { error: 'Bildirim Discord\'a gönderilemedi.' }, origin);
          }
        } else {
          console.log('[Admin Local] BUG_REPORT_WEBHOOK_URL ayarlı değil — dev modunda başarı simüle ediliyor.');
        }
        return sendJson(res, 200, { success: true }, origin);
      } catch (error) {
        console.error('[Admin Local] Bug report hatası:', error);
        return sendJson(res, 500, { error: 'İşlem başarısız.' }, origin);
      }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/updates') {
    if (!verifyToken(req)) {
      return sendJson(res, 401, { error: 'Bu işlem için yetkilendirme gerekli.' }, origin);
    }
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const title = String(payload.title || '').trim().slice(0, 120);
        const description = String(payload.description || '').trim().slice(0, 3000);
        if (!title || !description) return sendJson(res, 400, { error: 'Başlık ve açıklama zorunludur.' }, origin);
        const file = resolve(DATA_DIR, 'updates.json');
        let data = { updatedAt: null, updates: [] };
        try { data = JSON.parse(await readFile(file, 'utf8')); } catch {}
        data.updates = Array.isArray(data.updates) ? data.updates : [];
        data.updates.unshift({ id: crypto.randomUUID(), title, description, publishedAt: new Date().toISOString() });
        data.updates = data.updates.slice(0, 100);
        data.updatedAt = new Date().toISOString();
        await writeFile(file, JSON.stringify(data, null, 2), 'utf8');
        return sendJson(res, 201, { success: true }, origin);
      } catch (error) {
        console.error('[Admin Local] Updates kaydetme hatası:', error);
        return sendJson(res, 500, { error: 'İşlem başarısız.' }, origin);
      }
    });
    return;
  }

  // 2. Auth login
  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const ip = req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      return sendJson(res, 429, { error: 'Çok fazla giriş denemesi. Lütfen bir dakika bekleyin.' }, origin);
    }
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', () => {
      try {
        const { password } = JSON.parse(body || '{}');
        if (!ADMIN_PASSWORD) {
          return sendJson(res, 500, { error: 'ADMIN_PASSWORD yapılandırılmamış.' }, origin);
        }
        if (typeof password === 'string' && password === ADMIN_PASSWORD) {
          return sendJson(res, 200, { success: true, token: AUTH_TOKEN }, origin);
        }
        return sendJson(res, 401, { error: 'Geçersiz yönetici şifresi.' }, origin);
      } catch (e) {
        return sendJson(res, 400, { error: 'Geçersiz JSON formatı.' }, origin);
      }
    });
    return;
  }

  // 3. Save Skin Override / File
  if (req.method === 'POST' && url.pathname === '/api/admin/save') {
    if (!verifyToken(req)) {
      return sendJson(res, 401, { error: 'Bu işlem için yetkilendirme gerekli.' }, origin);
    }
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
          return sendJson(res, 400, { error: 'Geçersiz skin ID formatı.' }, origin);
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

        return sendJson(res, 200, { success: true, skinId, message: 'Değişiklikler yerel diske kaydedildi.' }, origin);
      } catch (error) {
        console.error('[Admin Local] Kaydetme hatası:', error);
        return sendJson(res, 500, { error: 'İşlem başarısız.' }, origin);
      }
    });
    return;
  }

  // 4. Revert Skin
  if (req.method === 'POST' && url.pathname === '/api/admin/revert') {
    if (!verifyToken(req)) {
      return sendJson(res, 401, { error: 'Bu işlem için yetkilendirme gerekli.' }, origin);
    }
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', async () => {
      try {
        const { skinId, originalSkin } = JSON.parse(body || '{}');
        if (!skinId) return sendJson(res, 400, { error: 'skinId gerekli.' }, origin);

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

        return sendJson(res, 200, { success: true, message: `Skin ${skinId} orijinal veriye döndürüldü.` }, origin);
      } catch (e) {
        console.error('[Admin Local] Revert hatası:', e);
        return sendJson(res, 500, { error: 'İşlem başarısız.' }, origin);
      }
    });
    return;
  }

  // 404
  return sendJson(res, 404, { error: 'Not found' }, origin);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n==============================================`);
  console.log(`🚀 Private Admin Local Server running on:`);
  console.log(`   http://127.0.0.1:${PORT}`);
  console.log(`==============================================\n`);
});
