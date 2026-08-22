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

        const sendJson = (statusCode, data) => {
          res.writeHead(statusCode, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers':
              'Content-Type, Authorization'
          });

          res.end(JSON.stringify(data));
        };

        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers':
              'Content-Type, Authorization'
          });

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

        // --------------------------------------------------
        // 2. Auth login
        // --------------------------------------------------

        if (
          req.method === 'POST' &&
          url.pathname === '/api/auth/login'
        ) {
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
                error: error.message
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
              return sendJson(500, {
                error: error.message
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
