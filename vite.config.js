import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

const PUBLIC_DIR = resolve(root, 'public');
const DATA_DIR = resolve(PUBLIC_DIR, 'data');
const FANTOME_DIR = resolve(PUBLIC_DIR, 'fantome');
const IMAGES_DIR = resolve(PUBLIC_DIR, 'images', 'skins');

function adminDevApiPlugin(adminPassword) {
  const AUTH_TOKEN = 'local-dev-token';
  const ALLOWED_ORIGINS = [
    'https://existye4t.github.io',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];
  const loginAttempts = new Map();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000;
  const RATE_LIMIT_MAX = 5;

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

  return {
    name: 'admin-dev-api-middleware',

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(
          req.url,
          `http://${req.headers.host}`
        );

        if (!url.pathname.startsWith('/api/')) {
          return next();
        }

        const origin = req.headers.origin || '';

        const sendJson = (statusCode, data) => {
          const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers':
              'Content-Type, Authorization'
          };
          if (ALLOWED_ORIGINS.includes(origin)) {
            headers['Access-Control-Allow-Origin'] = origin;
            headers['Vary'] = 'Origin';
          }
          res.writeHead(statusCode, headers);
          res.end(JSON.stringify(data));
        };

        if (req.method === 'OPTIONS') {
          const headers = {
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers':
              'Content-Type, Authorization'
          };
          if (ALLOWED_ORIGINS.includes(origin)) {
            headers['Access-Control-Allow-Origin'] = origin;
            headers['Vary'] = 'Origin';
          }
          res.writeHead(204, headers);
          return res.end();
        }

        // --------------------------------------------------
        // 1. Health check
        // --------------------------------------------------

        if (
          req.method === 'GET' &&
          url.pathname === '/api/health'
        ) {
          return sendJson(200, {
            status: 'ok',
            server: 'vite-dev-server'
          });
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
                method: req.method,
                headers,
                body: bodyBuffer.length > 0 ? bodyBuffer : undefined
              });
              const formData = await webRequest.formData();

              const title = String(formData.get('title') || '').trim().slice(0, 120);
              const description = String(formData.get('description') || '').trim().slice(0, 2000);
              const skinId = String(formData.get('skinId') || '').slice(0, 50);
              const skinName = String(formData.get('skinName') || '').slice(0, 160);
              const videoLink = String(formData.get('videoLink') || '').trim().slice(0, 2048);
              const imageFile = formData.get('image');

              if (!title || !description) return sendJson(400, { error: 'Başlık ve açıklama zorunludur.' });
              if (videoLink && !/^https?:\/\//i.test(videoLink)) return sendJson(400, { error: 'Video linki geçerli bir http(s) URL olmalıdır.' });

              if (imageFile && imageFile.size > 0) {
                if (imageFile.size > 8 * 1024 * 1024) return sendJson(413, { error: 'Dosya çok büyük. Maksimum 8MB.' });
                if (!String(imageFile.type || '').startsWith('image/')) return sendJson(400, { error: 'Sadece resim dosyası yüklenebilir.' });
              }

              const webhookUrl = process.env.BUG_REPORT_WEBHOOK_URL;
              if (webhookUrl) {
                const fields = [];
                if (skinName) fields.push({ name: 'İlgili Skin', value: skinName, inline: true });
                if (videoLink) fields.push({ name: 'Video Linki', value: videoLink });
                const embed = {
                  title: title.slice(0, 256),
                  description: description.slice(0, 4096),
                  color: 5814783,
                  footer: { text: 'Exist Skin Finder • Hata Bildirimi' },
                  timestamp: new Date().toISOString()
                };
                if (fields.length > 0) embed.fields = fields;
                if (imageFile && imageFile.size > 0) {
                  embed.image = { url: `attachment://${imageFile.name || 'screenshot.png'}` };
                  const discordForm = new FormData();
                  discordForm.append('payload_json', JSON.stringify({ embeds: [embed] }));
                  discordForm.append('files[0]', imageFile, imageFile.name || 'screenshot.png');
                  const discordRes = await fetch(webhookUrl, { method: 'POST', body: discordForm });
                  if (!discordRes.ok) {
                    console.error('[Vite Dev] Discord webhook error:', discordRes.status);
                    return sendJson(502, { error: 'Bildirim Discord\'a gönderilemedi.' });
                  }
                } else {
                  const discordRes = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ embeds: [embed] })
                  });
                  if (!discordRes.ok) {
                    console.error('[Vite Dev] Discord webhook error:', discordRes.status);
                    return sendJson(502, { error: 'Bildirim Discord\'a gönderilemedi.' });
                  }
                }
              } else {
                console.log('[Vite Dev] BUG_REPORT_WEBHOOK_URL ayarlı değil — dev modunda başarı simüle ediliyor.');
              }

              return sendJson(200, { success: true });
            } catch (error) { console.error('[Vite Admin] Bug-report hatası:', error); return sendJson(500, { error: 'İşlem başarısız.' }); }
          });
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/suggestions') {
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
                method: req.method,
                headers,
                body: bodyBuffer.length > 0 ? bodyBuffer : undefined
              });
              const formData = await webRequest.formData();

              const name = String(formData.get('name') || '').trim().slice(0, 100);
              const title = String(formData.get('title') || '').trim().slice(0, 120);
              const description = String(formData.get('description') || '').trim().slice(0, 2000);
              const videoLink = String(formData.get('videoLink') || '').trim().slice(0, 2048);
              const imageFile = formData.get('image');

              if (!title || !description) return sendJson(400, { error: 'Başlık ve öneri zorunludur.' });
              if (videoLink && !/^https?:\/\//i.test(videoLink)) return sendJson(400, { error: 'Video linki geçerli bir http(s) URL olmalıdır.' });

              if (imageFile && imageFile.size > 0) {
                if (imageFile.size > 8 * 1024 * 1024) return sendJson(413, { error: 'Dosya çok büyük. Maksimum 8MB.' });
                if (!String(imageFile.type || '').startsWith('image/')) return sendJson(400, { error: 'Sadece resim dosyası yüklenebilir.' });
              }

              const webhookUrl = process.env.SUGGESTION_WEBHOOK_URL;
              if (webhookUrl) {
                const fields = [];
                fields.push({ name: 'Başlık', value: title.slice(0, 1024) });
                fields.push({ name: 'Öneri', value: description.slice(0, 1024) });
                if (name) fields.push({ name: 'Gönderen', value: name.slice(0, 1024), inline: true });
                if (videoLink) fields.push({ name: 'Video', value: videoLink.slice(0, 1024) });

                const embed = {
                  title: '💡 Yeni Öneri',
                  color: 5814783,
                  fields: fields,
                  footer: { text: 'Exist LOL Skin Finder • Öneri' },
                  timestamp: new Date().toISOString()
                };

                if (imageFile && imageFile.size > 0) {
                  embed.image = { url: `attachment://${imageFile.name || 'suggestion.png'}` };
                  const discordForm = new FormData();
                  discordForm.append('payload_json', JSON.stringify({ embeds: [embed] }));
                  discordForm.append('files[0]', imageFile, imageFile.name || 'suggestion.png');
                  const discordRes = await fetch(webhookUrl, { method: 'POST', body: discordForm });
                  if (!discordRes.ok) {
                    console.error('[Vite Dev] Suggestion webhook error:', discordRes.status);
                    return sendJson(502, { error: 'Öneri Discord\'a gönderilemedi.' });
                  }
                } else {
                  const discordRes = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ embeds: [embed] })
                  });
                  if (!discordRes.ok) {
                    console.error('[Vite Dev] Suggestion webhook error:', discordRes.status);
                    return sendJson(502, { error: 'Öneri Discord\'a gönderilemedi.' });
                  }
                }
              } else {
                console.log('[Vite Dev] SUGGESTION_WEBHOOK_URL ayarlı değil — dev modunda başarı simüle ediliyor.');
              }

              return sendJson(200, { success: true });
            } catch (error) { console.error('[Vite Admin] Suggestion hatası:', error); return sendJson(500, { error: 'İşlem başarısız.' }); }
          });
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/admin/updates') {
          if (!verifyToken(req)) {
            return sendJson(401, { error: 'Bu işlem için yetkilendirme gerekli.' });
          }
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const title = String(payload.title || '').trim().slice(0, 120);
              const description = String(payload.description || '').trim().slice(0, 3000);
              if (!title || !description) return sendJson(400, { error: 'Başlık ve açıklama zorunludur.' });
              const updatesPath = resolve(DATA_DIR, 'updates.json');
              let data = { updatedAt: null, updates: [] };
              try { data = JSON.parse(await readFile(updatesPath, 'utf8')); } catch {}
              data.updates = Array.isArray(data.updates) ? data.updates : [];
              data.updates.unshift({ id: crypto.randomUUID(), title, description, publishedAt: new Date().toISOString() });
              data.updates = data.updates.slice(0, 100);
              data.updatedAt = new Date().toISOString();
              await writeFile(updatesPath, JSON.stringify(data, null, 2), 'utf8');
              return sendJson(201, { success: true });
            } catch (error) { console.error('[Vite Admin] Updates hatası:', error); return sendJson(500, { error: 'İşlem başarısız.' }); }
          });
          return;
        }

        // --------------------------------------------------
        // 1b. How-to-use (GET & POST)
        // --------------------------------------------------

        if (
          req.method === 'GET' &&
          url.pathname === '/api/admin/how-to-use'
        ) {
          if (!verifyToken(req)) {
            return sendJson(401, { error: 'Bu işlem için yetkilendirme gerekli.' });
          }
          try {
            const howToUsePath = resolve(DATA_DIR, 'how-to-use.json');
            let data = {
              tr: { title: 'Nasıl kullanılır?', content: 'Siteyi kullanmak için aşağıdaki adımları takip edebilirsiniz.', videos: [] },
              en: { title: 'How to Use?', content: 'Follow the steps below to learn how to use the website.', videos: [] }
            };
            try {
              const raw = await readFile(howToUsePath, 'utf8');
              data = JSON.parse(raw);
            } catch {}
            return sendJson(200, data);
          } catch (error) {
            console.error('[Vite Admin] How-to-use GET hatası:', error);
            return sendJson(500, { error: 'İşlem başarısız.' });
          }
        }

        if (req.method === 'POST' && url.pathname === '/api/admin/how-to-use') {
          if (!verifyToken(req)) {
            return sendJson(401, { error: 'Bu işlem için yetkilendirme gerekli.' });
          }
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const howToUsePath = resolve(DATA_DIR, 'how-to-use.json');
              await writeFile(howToUsePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
              return sendJson(200, { success: true });
            } catch (error) {
              console.error('[Vite Admin] How-to-use POST hatası:', error);
              return sendJson(500, { error: 'İşlem başarısız.' });
            }
          });
          return;
        }

        // --------------------------------------------------
        // 1c. Discord Profile (GET & POST)
        // --------------------------------------------------

        if (
          req.method === 'GET' &&
          url.pathname === '/api/admin/discord-profile'
        ) {
          if (!verifyToken(req)) {
            return sendJson(401, { error: 'Bu işlem için yetkilendirme gerekli.' });
          }
          try {
            const profilePath = resolve(DATA_DIR, 'discord-profile.json');
            let data = {
              nick: 'existofficial',
              avatarUrl: 'assets/pfp.png',
              discordUrl: 'https://discord.gg/rvRxbf8B9N',
              status: 'online',
              showTopRight: true,
              showFooter: true
            };
            try {
              const raw = await readFile(profilePath, 'utf8');
              data = JSON.parse(raw);
            } catch {}
            return sendJson(200, data);
          } catch (error) {
            console.error('[Vite Admin] Discord-profile GET hatası:', error);
            return sendJson(500, { error: 'İşlem başarısız.' });
          }
        }

        if (req.method === 'POST' && url.pathname === '/api/admin/discord-profile') {
          if (!verifyToken(req)) {
            return sendJson(401, { error: 'Bu işlem için yetkilendirme gerekli.' });
          }
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const profilePath = resolve(DATA_DIR, 'discord-profile.json');
              const allowedKeys = ['nick', 'avatarUrl', 'discordUrl', 'status', 'showTopRight', 'showFooter'];
              const filteredPayload = {};
              for (const key of allowedKeys) {
                if (payload[key] !== undefined) {
                  filteredPayload[key] = payload[key];
                }
              }
              // Validate status
              const validStatuses = ['online', 'idle', 'dnd', 'offline'];
              if (filteredPayload.status && !validStatuses.includes(filteredPayload.status)) {
                return sendJson(400, { error: 'Geçersiz status değeri.' });
              }
              // Validate discordUrl if provided
              if (filteredPayload.discordUrl && !/^https?:\/\//i.test(filteredPayload.discordUrl)) {
                return sendJson(400, { error: 'Discord URL geçerli bir http(s) linki olmalıdır.' });
              }
              // Validate avatarUrl if provided (allow relative or absolute)
              if (filteredPayload.avatarUrl && filteredPayload.avatarUrl.trim() === '') {
                return sendJson(400, { error: 'Avatar URL boş olamaz.' });
              }
              await writeFile(profilePath, JSON.stringify(filteredPayload, null, 2) + '\n', 'utf8');
              return sendJson(200, { success: true });
            } catch (error) {
              console.error('[Vite Admin] Discord-profile POST hatası:', error);
              return sendJson(500, { error: 'İşlem başarısız.' });
            }
          });
          return;
        }

        // --------------------------------------------------
        // 2. Auth login
        // --------------------------------------------------

        if (
          req.method === 'POST' &&
          url.pathname === '/api/auth/login'
        ) {
          const ip = req.socket.remoteAddress || 'unknown';
          if (!checkRateLimit(ip)) {
            return sendJson(429, { error: 'Çok fazla giriş denemesi. Lütfen bir dakika bekleyin.' });
          }
          let body = '';

          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', () => {
            try {
              const { password } = JSON.parse(body || '{}');

              if (!adminPassword) {
                return sendJson(500, {
                  error:
                    'ADMIN_PASSWORD is not configured. Add it to your .env file.'
                });
              }

              if (
                typeof password === 'string' &&
                password === adminPassword
              ) {
                return sendJson(200, {
                  success: true,
                  token: 'local-dev-token'
                });
              }

              return sendJson(401, {
                error: 'Geçersiz yönetici şifresi.'
              });
            } catch {
              return sendJson(400, {
                error: 'Geçersiz JSON formatı.'
              });
            }
          });

          return;
        }

        // --------------------------------------------------
        // 3. Save Skin
        // --------------------------------------------------

        if (
          req.method === 'POST' &&
          url.pathname === '/api/admin/save'
        ) {
          if (!verifyToken(req)) {
            return sendJson(401, { error: 'Bu işlem için yetkilendirme gerekli.' });
          }
          let body = '';

          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');

              const skinId = String(
                payload.skinId || ''
              ).trim();

              if (!skinId || !/^\d+$/.test(skinId)) {
                return sendJson(400, {
                  error: 'Geçersiz skin ID formatı.'
                });
              }

              const {
                override,
                imageFileBase64,
                fantomeFileBase64,
                isCustomSkin
              } = payload;

              await mkdir(DATA_DIR, {
                recursive: true
              });

              await mkdir(FANTOME_DIR, {
                recursive: true
              });

              await mkdir(IMAGES_DIR, {
                recursive: true
              });

              // A. Save Image
              if (
                imageFileBase64 &&
                imageFileBase64.startsWith('data:image/')
              ) {
                const base64Data =
                  imageFileBase64.replace(
                    /^data:image\/\w+;base64,/,
                    ''
                  );

                const imageBuffer = Buffer.from(
                  base64Data,
                  'base64'
                );

                const imagePath = resolve(
                  IMAGES_DIR,
                  `${skinId}.jpg`
                );

                await writeFile(
                  imagePath,
                  imageBuffer
                );

                console.log(
                  `[Vite Admin] Görsel kaydedildi: ${imagePath}`
                );
              }

              // B. Save Fantome
              if (
                fantomeFileBase64 &&
                fantomeFileBase64.startsWith('data:')
              ) {
                const base64Data =
                  fantomeFileBase64.replace(
                    /^data:[^;]+;base64,/,
                    ''
                  );

                const fantomeBuffer = Buffer.from(
                  base64Data,
                  'base64'
                );

                const fantomePath = resolve(
                  FANTOME_DIR,
                  `${skinId}.fantome`
                );

                await writeFile(
                  fantomePath,
                  fantomeBuffer
                );

                console.log(
                  `[Vite Admin] Fantome kaydedildi: ${fantomePath}`
                );
              }

              // C. Update admin-overrides.json
              const overridesPath = resolve(
                DATA_DIR,
                'admin-overrides.json'
              );

              let currentOverrides = {
                updatedAt: new Date().toISOString(),
                overrides: {},
                customSkins: []
              };

              try {
                const raw = await readFile(
                  overridesPath,
                  'utf8'
                );

                const parsed = JSON.parse(raw);

                if (Array.isArray(parsed)) {
                  parsed.forEach((item) => {
                    if (item?.id) {
                      currentOverrides.overrides[
                        String(item.id)
                      ] = item;
                    }
                  });
                } else if (
                  parsed &&
                  typeof parsed === 'object'
                ) {
                  currentOverrides = {
                    updatedAt:
                      parsed.updatedAt ||
                      new Date().toISOString(),

                    overrides:
                      parsed.overrides || {},

                    customSkins:
                      parsed.customSkins || []
                  };
                }
              } catch {
                // Dosya yoksa yeni oluşturulur.
              }

              if (!currentOverrides.overrides) {
                currentOverrides.overrides = {};
              }

              if (!currentOverrides.customSkins) {
                currentOverrides.customSkins = [];
              }

              if (isCustomSkin) {
                const index =
                  currentOverrides.customSkins.findIndex(
                    (skin) =>
                      String(skin.id) === skinId
                  );

                if (index !== -1) {
                  currentOverrides.customSkins[index] =
                    override;
                } else {
                  currentOverrides.customSkins.push(
                    override
                  );
                }
              } else if (override) {
                currentOverrides.overrides[skinId] =
                  override;
              }

              currentOverrides.updatedAt =
                new Date().toISOString();

              await writeFile(
                overridesPath,
                JSON.stringify(
                  currentOverrides,
                  null,
                  2
                ),
                'utf8'
              );

              // D. Update skins.json
              const skinsPath = resolve(
                DATA_DIR,
                'skins.json'
              );

              try {
                const skinsRaw = await readFile(
                  skinsPath,
                  'utf8'
                );

                const skinsData =
                  JSON.parse(skinsRaw);

                if (Array.isArray(skinsData.skins)) {
                  const index =
                    skinsData.skins.findIndex(
                      (skin) =>
                        String(skin.id) === skinId
                    );

                  if (
                    index !== -1 &&
                    override
                  ) {
                    skinsData.skins[index] = {
                      ...skinsData.skins[index],
                      ...override
                    };
                  } else if (
                    isCustomSkin &&
                    override
                  ) {
                    skinsData.skins.push(override);
                  }

                  skinsData.updatedAt =
                    new Date().toISOString();

                  await writeFile(
                    skinsPath,
                    JSON.stringify(
                      skinsData,
                      null,
                      2
                    ),
                    'utf8'
                  );
                }
              } catch (error) {
                console.warn(
                  '[Vite Admin] skins.json güncellenirken hata:',
                  error.message
                );
              }

              // E. Update fantome-files.json
              if (fantomeFileBase64) {
                const fantomeListPath =
                  resolve(
                    DATA_DIR,
                    'fantome-files.json'
                  );

                try {
                  const rawList =
                    await readFile(
                      fantomeListPath,
                      'utf8'
                    );

                  const list =
                    JSON.parse(rawList);

                  const listArr = Array.isArray(list)
                    ? list
                    : Array.isArray(list.files)
                      ? list.files
                      : [];

                  if (!listArr.includes(skinId)) {
                    listArr.push(skinId);

                    listArr.sort(
                      (a, b) =>
                        Number(a) - Number(b)
                    );

                    await writeFile(
                      fantomeListPath,
                      JSON.stringify(
                        listArr,
                        null,
                        2
                      ),
                      'utf8'
                    );
                  }
                } catch {
                  // Liste güncellenemezse ana kayıt yine korunur.
                }
              }

              console.log(
                `[Vite Admin] "${skinId}" başarıyla kaydedildi.`
              );

              return sendJson(200, {
                success: true,
                skinId,
                message:
                  'Değişiklikler yerel diske başarıyla kaydedildi.'
              });
            } catch (error) {
              console.error(
                '[Vite Admin] Kaydetme hatası:',
                error
              );

              return sendJson(500, {
                error: 'İşlem başarısız.'
              });
            }
          });

          return;
        }

        // --------------------------------------------------
        // 4. Revert Skin
        // --------------------------------------------------

        if (
          req.method === 'POST' &&
          url.pathname === '/api/admin/revert'
        ) {
          if (!verifyToken(req)) {
            return sendJson(401, { error: 'Bu işlem için yetkilendirme gerekli.' });
          }
          let body = '';

          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const {
                skinId,
                originalSkin
              } = JSON.parse(body || '{}');

              if (!skinId) {
                return sendJson(400, {
                  error: 'skinId gerekli.'
                });
              }

              const overridesPath = resolve(
                DATA_DIR,
                'admin-overrides.json'
              );

              const raw = await readFile(
                overridesPath,
                'utf8'
              );

              const currentOverrides =
                JSON.parse(raw);

              if (currentOverrides?.overrides) {
                delete currentOverrides.overrides[
                  String(skinId)
                ];

                currentOverrides.updatedAt =
                  new Date().toISOString();

                await writeFile(
                  overridesPath,
                  JSON.stringify(
                    currentOverrides,
                    null,
                    2
                  ),
                  'utf8'
                );
              }

              // Restore original skin
              if (originalSkin) {
                const skinsPath = resolve(
                  DATA_DIR,
                  'skins.json'
                );

                const skinsRaw = await readFile(
                  skinsPath,
                  'utf8'
                );

                const skinsData =
                  JSON.parse(skinsRaw);

                const index =
                  skinsData.skins.findIndex(
                    (skin) =>
                      String(skin.id) ===
                      String(skinId)
                  );

                if (index !== -1) {
                  skinsData.skins[index] = {
                    ...originalSkin
                  };

                  skinsData.updatedAt =
                    new Date().toISOString();

                  await writeFile(
                    skinsPath,
                    JSON.stringify(
                      skinsData,
                      null,
                      2
                    ),
                    'utf8'
                  );
                }
              }

              return sendJson(200, {
                success: true,
                message:
                  `Skin ${skinId} orijinal veriye döndürüldü.`
              });
            } catch (error) {
              console.error('[Vite Admin] Revert hatası:', error);
              return sendJson(500, {
                error: 'İşlem başarısız.'
              });
            }
          });

          return;
        }

        next();
      });
    }
  };
}

// --------------------------------------------------
// Vite configuration
// --------------------------------------------------

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '');

  const adminPassword =
    env.ADMIN_PASSWORD;

  return {
    base: './',

    plugins: [
      adminDevApiPlugin(adminPassword)
    ],

    build: {
      rollupOptions: {
        input: {
          main: resolve(
            root,
            'index.html'
          ),

          admin: resolve(
            root,
            'admin',
            'index.html'
          )
        }
      }
    }
  };
});
