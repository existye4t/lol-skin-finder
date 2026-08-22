/**
 * Cloudflare Worker for Private Admin Panel
 * Secure GitHub API Bridge with HMAC Authentication and Atomic Git Commits
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS
    }
  });
}

/* =========================================================
   Base64URL helpers
   ========================================================= */

function base64UrlEncodeBytes(bytes) {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlEncodeString(str) {
  return base64UrlEncodeBytes(
    new TextEncoder().encode(str)
  );
}

function base64UrlDecodeBytes(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');

  while (str.length % 4) {
    str += '=';
  }

  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function base64UrlDecodeString(str) {
  return new TextDecoder().decode(
    base64UrlDecodeBytes(str)
  );
}

/* =========================================================
   JWT HMAC-SHA256
   ========================================================= */

async function importHmacKey(secret, usages) {
  const encoder = new TextEncoder();

  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256'
    },
    false,
    usages
  );
}

async function signJwt(payload, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64UrlEncodeString(
    JSON.stringify(header)
  );

  const encodedPayload = base64UrlEncodeString(
    JSON.stringify(payload)
  );

  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await importHmacKey(secret, ['sign']);

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data)
  );

  const encodedSignature = base64UrlEncodeBytes(
    new Uint8Array(signature)
  );

  return `${data}.${encodedSignature}`;
}

async function verifyJwt(token, secret) {
  try {
    if (!token || !secret) {
      return null;
    }

    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const [header, payload, signature] = parts;

    if (!header || !payload || !signature) {
      return null;
    }

    const data = `${header}.${payload}`;

    const key = await importHmacKey(secret, ['verify']);

    const signatureBytes = base64UrlDecodeBytes(signature);

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(data)
    );

    if (!valid) {
      return null;
    }

    const decoded = JSON.parse(
      base64UrlDecodeString(payload)
    );

    if (
      decoded.exp &&
      Date.now() / 1000 > Number(decoded.exp)
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/* =========================================================
   GitHub API
   ========================================================= */

async function githubRequest(path, token, options = {}) {
  if (!token) {
    throw new Error('GITHUB_TOKEN yapılandırılmamış.');
  }

  const url = `https://api.github.com${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'LOL-Skin-Finder-Admin-Worker',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `GitHub API ${response.status}: ${errorText}`
    );
  }

  return response.json();
}

/* =========================================================
   GitHub file helpers
   ========================================================= */

function decodeGitHubBase64(content) {
  const clean = String(content || '').replace(/\s/g, '');

  const binary = atob(clean);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new TextDecoder().decode(bytes);
}

async function getGitHubFile(
  path,
  token,
  repoOwner,
  repoName,
  branch
) {
  return githubRequest(
    `/repos/${repoOwner}/${repoName}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    token
  );
}

async function createBlob(
  content,
  token,
  repoOwner,
  repoName,
  encoding = 'utf-8'
) {
  return githubRequest(
    `/repos/${repoOwner}/${repoName}/git/blobs`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        content,
        encoding
      })
    }
  );
}

/* =========================================================
   Environment validation
   ========================================================= */

function getConfig(env) {
  const required = [
    'GITHUB_TOKEN',
    'ADMIN_PASSWORD',
    'JWT_SECRET'
  ];

  const missing = required.filter(
    (key) => !env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Eksik Cloudflare secret/config: ${missing.join(', ')}`
    );
  }

  return {
    GITHUB_TOKEN: env.GITHUB_TOKEN,
    ADMIN_PASSWORD: env.ADMIN_PASSWORD,
    JWT_SECRET: env.JWT_SECRET,

    REPO_OWNER:
      env.REPO_OWNER || 'existye4t',

    REPO_NAME:
      env.REPO_NAME || 'lol-skin-finder',

    REPO_BRANCH:
      env.REPO_BRANCH || 'main'
  };
}

/* =========================================================
   Authentication
   ========================================================= */

async function authenticateRequest(request, jwtSecret) {
  const authHeader =
    request.headers.get('Authorization') || '';

  const token = authHeader.replace(
    /^Bearer\s+/i,
    ''
  );

  if (!token) {
    return null;
  }

  return verifyJwt(
    token,
    jwtSecret
  );
}

/* =========================================================
   Worker
   ========================================================= */

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    const url = new URL(request.url);

    let config;

    try {
      config = getConfig(env);
    } catch (error) {
      /*
       * Health endpoint should still work enough
       * to tell us that the Worker itself is alive.
       */
      if (
        request.method === 'GET' &&
        url.pathname === '/api/health'
      ) {
        return jsonResponse({
          status: 'error',
          server: 'cloudflare-worker',
          configured: false,
          error: error.message
        }, 500);
      }

      return jsonResponse({
        error: error.message
      }, 500);
    }

    const {
      GITHUB_TOKEN,
      ADMIN_PASSWORD,
      JWT_SECRET,
      REPO_OWNER,
      REPO_NAME,
      REPO_BRANCH
    } = config;

    /* =====================================================
       1. Health
       ===================================================== */

    if (
      request.method === 'GET' &&
      url.pathname === '/api/health'
    ) {
      return jsonResponse({
        status: 'ok',
        server: 'cloudflare-worker',
        configured: true
      });
    }

    /* =====================================================
       2. Login
       ===================================================== */

    if (
      request.method === 'POST' &&
      url.pathname === '/api/auth/login'
    ) {
      try {
        const body = await request.json();

        const password =
          typeof body.password === 'string'
            ? body.password
            : '';

        if (password !== ADMIN_PASSWORD) {
          return jsonResponse(
            {
              error: 'Geçersiz yönetici şifresi.'
            },
            401
          );
        }

        const token = await signJwt(
          {
            role: 'admin',
            iat: Math.floor(Date.now() / 1000),
            exp:
              Math.floor(Date.now() / 1000) +
              4 * 60 * 60
          },
          JWT_SECRET
        );

        return jsonResponse({
          success: true,
          token
        });
      } catch {
        return jsonResponse(
          {
            error: 'İstek biçimi geçersiz.'
          },
          400
        );
      }
    }

    /* =====================================================
       3. Verify session
       ===================================================== */

    if (
      request.method === 'GET' &&
      url.pathname === '/api/auth/verify'
    ) {
      const user =
        await authenticateRequest(
          request,
          JWT_SECRET
        );

      if (!user) {
        return jsonResponse(
          {
            error: 'Oturum süresi doldu.'
          },
          401
        );
      }

      return jsonResponse({
        valid: true,
        role: user.role
      });
    }

    /* =====================================================
       4. All admin endpoints require authentication
       ===================================================== */

    if (url.pathname.startsWith('/api/admin/')) {
      const user =
        await authenticateRequest(
          request,
          JWT_SECRET
        );

      if (!user) {
        return jsonResponse(
          {
            error:
              'Bu işlem için yetkilendirme gerekli.'
          },
          401
        );
      }

      if (user.role !== 'admin') {
        return jsonResponse(
          {
            error: 'Yetkisiz erişim.'
          },
          403
        );
      }

      if (!GITHUB_TOKEN) {
        return jsonResponse(
          {
            error:
              'Sunucu GITHUB_TOKEN yapılandırılmamış.'
          },
          500
        );
      }

      /* ===================================================
         SAVE
         =================================================== */

      if (
        request.method === 'POST' &&
        url.pathname === '/api/admin/save'
      ) {
        try {
          const payload =
            await request.json();

          const skinId =
            String(
              payload.skinId || ''
            ).trim();

          if (
            !skinId ||
            !/^\d+$/.test(skinId)
          ) {
            return jsonResponse(
              {
                error:
                  'Geçersiz skin ID.'
              },
              400
            );
          }

          const {
            override,
            imageFileBase64,
            fantomeFileBase64,
            isCustomSkin
          } = payload;

          const treeEntries = [];

          /* -----------------------------------------------
             A. IMAGE
             ----------------------------------------------- */

          if (
            imageFileBase64 &&
            imageFileBase64.startsWith(
              'data:image/'
            )
          ) {
            const rawBase64 =
              imageFileBase64.replace(
                /^data:image\/[\w.+-]+;base64,/,
                ''
              );

            const imageBlob =
              await createBlob(
                rawBase64,
                GITHUB_TOKEN,
                REPO_OWNER,
                REPO_NAME,
                'base64'
              );

            treeEntries.push({
              path:
                `public/images/skins/${skinId}.jpg`,
              mode: '100644',
              type: 'blob',
              sha: imageBlob.sha
            });
          }

          /* -----------------------------------------------
             B. FANTOME
             ----------------------------------------------- */

          if (
            fantomeFileBase64 &&
            fantomeFileBase64.startsWith(
              'data:'
            )
          ) {
            const rawBase64 =
              fantomeFileBase64.replace(
                /^data:[^;]+;base64,/,
                ''
              );

            const fantomeBlob =
              await createBlob(
                rawBase64,
                GITHUB_TOKEN,
                REPO_OWNER,
                REPO_NAME,
                'base64'
              );

            treeEntries.push({
              path:
                `public/fantome/${skinId}.fantome`,
              mode: '100644',
              type: 'blob',
              sha: fantomeBlob.sha
            });
          }

          /* -----------------------------------------------
             C. ADMIN OVERRIDES
             ----------------------------------------------- */

          let currentOverrides = {
            updatedAt:
              new Date().toISOString(),
            overrides: {},
            customSkins: []
          };

          try {
            const fileRes =
              await getGitHubFile(
                'public/data/admin-overrides.json',
                GITHUB_TOKEN,
                REPO_OWNER,
                REPO_NAME,
                REPO_BRANCH
              );

            const decoded =
              decodeGitHubBase64(
                fileRes.content
              );

            const parsed =
              JSON.parse(decoded);

            if (
              Array.isArray(parsed)
            ) {
              for (const item of parsed) {
                if (
                  item &&
                  item.id != null
                ) {
                  currentOverrides
                    .overrides[
                      String(item.id)
                    ] = item;
                }
              }
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
            // File does not exist yet.
          }

          if (
            !currentOverrides.overrides
          ) {
            currentOverrides.overrides = {};
          }

          if (
            !currentOverrides.customSkins
          ) {
            currentOverrides.customSkins = [];
          }

          if (isCustomSkin && override) {
            const index =
              currentOverrides.customSkins
                .findIndex(
                  (skin) =>
                    String(skin.id) ===
                    skinId
                );

            if (index >= 0) {
              currentOverrides.customSkins[
                index
              ] = override;
            } else {
              currentOverrides.customSkins.push(
                override
              );
            }
          } else if (override) {
            currentOverrides.overrides[
              skinId
            ] = override;
          }

          currentOverrides.updatedAt =
            new Date().toISOString();

          const overridesBlob =
            await createBlob(
              JSON.stringify(
                currentOverrides,
                null,
                2
              ) + '\n',
              GITHUB_TOKEN,
              REPO_OWNER,
              REPO_NAME,
              'utf-8'
            );

          treeEntries.push({
            path:
              'public/data/admin-overrides.json',
            mode: '100644',
            type: 'blob',
            sha: overridesBlob.sha
          });

          /* -----------------------------------------------
             D. SKINS.JSON
             ----------------------------------------------- */

          try {
            const skinsRes =
              await getGitHubFile(
                'public/data/skins.json',
                GITHUB_TOKEN,
                REPO_OWNER,
                REPO_NAME,
                REPO_BRANCH
              );

            const decodedSkins =
              decodeGitHubBase64(
                skinsRes.content
              );

            const skinsData =
              JSON.parse(decodedSkins);

            if (
              Array.isArray(
                skinsData.skins
              ) &&
              override
            ) {
              const index =
                skinsData.skins.findIndex(
                  (skin) =>
                    String(skin.id) ===
                    skinId
                );

              if (index !== -1) {
                skinsData.skins[index] = {
                  ...skinsData.skins[index],
                  ...override
                };
              } else if (isCustomSkin) {
                skinsData.skins.push(
                  override
                );
              }

              skinsData.updatedAt =
                new Date().toISOString();

              const skinsBlob =
                await createBlob(
                  JSON.stringify(
                    skinsData,
                    null,
                    2
                  ) + '\n',
                  GITHUB_TOKEN,
                  REPO_OWNER,
                  REPO_NAME,
                  'utf-8'
                );

              treeEntries.push({
                path:
                  'public/data/skins.json',
                mode: '100644',
                type: 'blob',
                sha: skinsBlob.sha
              });
            }
          } catch (error) {
            console.warn(
              'skins.json update error:',
              error.message
            );
          }

          /* -----------------------------------------------
             E. FANTOME INDEX
             ----------------------------------------------- */

          if (fantomeFileBase64) {
            try {
              const listRes =
                await getGitHubFile(
                  'public/data/fantome-files.json',
                  GITHUB_TOKEN,
                  REPO_OWNER,
                  REPO_NAME,
                  REPO_BRANCH
                );

              const decoded =
                decodeGitHubBase64(
                  listRes.content
                );

              const parsed =
                JSON.parse(decoded);

              let listArr;

              if (Array.isArray(parsed)) {
                listArr = parsed;
              } else if (
                parsed &&
                Array.isArray(parsed.files)
              ) {
                listArr = parsed.files;
              } else {
                listArr = [];
              }

              if (
                !listArr.some(
                  (id) =>
                    String(id) ===
                    skinId
                )
              ) {
                listArr.push(skinId);

                listArr.sort(
                  (a, b) =>
                    Number(a) -
                    Number(b)
                );

                const listBlob =
                  await createBlob(
                    JSON.stringify(
                      listArr,
                      null,
                      2
                    ) + '\n',
                    GITHUB_TOKEN,
                    REPO_OWNER,
                    REPO_NAME,
                    'utf-8'
                  );

                treeEntries.push({
                  path:
                    'public/data/fantome-files.json',
                  mode: '100644',
                  type: 'blob',
                  sha: listBlob.sha
                });
              }
            } catch (error) {
              console.warn(
                'fantome-files.json update error:',
                error.message
              );
            }
          }

          /* -----------------------------------------------
             F. ATOMIC GIT COMMIT
             ----------------------------------------------- */

          if (treeEntries.length === 0) {
            return jsonResponse(
              {
                error:
                  'Kaydedilecek herhangi bir değişiklik bulunamadı.'
              },
              400
            );
          }

          const refData =
            await githubRequest(
              `/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${REPO_BRANCH}`,
              GITHUB_TOKEN
            );

          const latestCommitSha =
            refData.object.sha;

          const latestCommit =
            await githubRequest(
              `/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${latestCommitSha}`,
              GITHUB_TOKEN
            );

          const baseTreeSha =
            latestCommit.tree.sha;

          const newTree =
            await githubRequest(
              `/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`,
              GITHUB_TOKEN,
              {
                method: 'POST',
                body: JSON.stringify({
                  base_tree: baseTreeSha,
                  tree: treeEntries
                })
              }
            );

          const commitName =
            override?.name ||
            override?.nameTr ||
            'custom';

          const commitMessage =
            `admin: update skin ${skinId} (${commitName})\n\nUpdated via Admin Panel.`;

          const newCommit =
            await githubRequest(
              `/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`,
              GITHUB_TOKEN,
              {
                method: 'POST',
                body: JSON.stringify({
                  message:
                    commitMessage,
                  tree:
                    newTree.sha,
                  parents: [
                    latestCommitSha
                  ]
                })
              }
            );

          await githubRequest(
            `/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${REPO_BRANCH}`,
            GITHUB_TOKEN,
            {
              method: 'PATCH',
              body: JSON.stringify({
                sha: newCommit.sha,
                force: false
              })
            }
          );

          return jsonResponse({
            success: true,
            skinId,
            commitSha:
              newCommit.sha,
            message:
              'Değişiklikler GitHub repositorysine başarıyla commit edildi.'
          });
        } catch (error) {
          console.error(
            'Admin save error:',
            error
          );

          return jsonResponse(
            {
              error:
                error.message ||
                'Bilinmeyen sunucu hatası.'
            },
            500
          );
        }
      }

      /* ===================================================
         REVERT
         =================================================== */

      if (
        request.method === 'POST' &&
        url.pathname === '/api/admin/revert'
      ) {
        try {
          const payload =
            await request.json();

          const skinId =
            String(
              payload.skinId || ''
            ).trim();

          if (
            !skinId ||
            !/^\d+$/.test(skinId)
          ) {
            return jsonResponse(
              {
                error:
                  'Geçersiz skin ID.'
              },
              400
            );
          }

          const treeEntries = [];

          /* -----------------------------------------------
             A. ADMIN OVERRIDES
             ----------------------------------------------- */

          const overridesRes =
            await getGitHubFile(
              'public/data/admin-overrides.json',
              GITHUB_TOKEN,
              REPO_OWNER,
              REPO_NAME,
              REPO_BRANCH
            );

          const overridesData =
            JSON.parse(
              decodeGitHubBase64(
                overridesRes.content
              )
            );

          if (
            overridesData.overrides
          ) {
            delete overridesData.overrides[
              skinId
            ];
          }

          if (
            Array.isArray(
              overridesData.customSkins
            )
          ) {
            overridesData.customSkins =
              overridesData.customSkins.filter(
                (skin) =>
                  String(skin.id) !==
                  skinId
              );
          }

          overridesData.updatedAt =
            new Date().toISOString();

          const overridesBlob =
            await createBlob(
              JSON.stringify(
                overridesData,
                null,
                2
              ) + '\n',
              GITHUB_TOKEN,
              REPO_OWNER,
              REPO_NAME,
              'utf-8'
            );

          treeEntries.push({
            path:
              'public/data/admin-overrides.json',
            mode: '100644',
            type: 'blob',
            sha: overridesBlob.sha
          });

          /* -----------------------------------------------
             B. RESTORE SKINS.JSON
             ----------------------------------------------- */

          if (payload.originalSkin) {
            const skinsRes =
              await getGitHubFile(
                'public/data/skins.json',
                GITHUB_TOKEN,
                REPO_OWNER,
                REPO_NAME,
                REPO_BRANCH
              );

            const skinsData =
              JSON.parse(
                decodeGitHubBase64(
                  skinsRes.content
                )
              );

            if (
              Array.isArray(
                skinsData.skins
              )
            ) {
              const index =
                skinsData.skins.findIndex(
                  (skin) =>
                    String(skin.id) ===
                    skinId
                );

              if (index !== -1) {
                skinsData.skins[index] = {
                  ...payload.originalSkin
                };

                skinsData.updatedAt =
                  new Date().toISOString();

                const skinsBlob =
                  await createBlob(
                    JSON.stringify(
                      skinsData,
                      null,
                      2
                    ) + '\n',
                    GITHUB_TOKEN,
                    REPO_OWNER,
                    REPO_NAME,
                    'utf-8'
                  );

                treeEntries.push({
                  path:
                    'public/data/skins.json',
                  mode: '100644',
                  type: 'blob',
                  sha: skinsBlob.sha
                });
              }
            }
          }

          /* -----------------------------------------------
             C. COMMIT REVERT
             ----------------------------------------------- */

          const refData =
            await githubRequest(
              `/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${REPO_BRANCH}`,
              GITHUB_TOKEN
            );

          const latestCommitSha =
            refData.object.sha;

          const latestCommit =
            await githubRequest(
              `/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${latestCommitSha}`,
              GITHUB_TOKEN
            );

          const newTree =
            await githubRequest(
              `/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`,
              GITHUB_TOKEN,
              {
                method: 'POST',
                body: JSON.stringify({
                  base_tree:
                    latestCommit.tree.sha,
                  tree:
                    treeEntries
                })
              }
            );

          const newCommit =
            await githubRequest(
              `/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`,
              GITHUB_TOKEN,
              {
                method: 'POST',
                body: JSON.stringify({
                  message:
                    `admin: revert skin ${skinId}`,
                  tree:
                    newTree.sha,
                  parents: [
                    latestCommitSha
                  ]
                })
              }
            );

          await githubRequest(
            `/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${REPO_BRANCH}`,
            GITHUB_TOKEN,
            {
              method: 'PATCH',
              body: JSON.stringify({
                sha:
                  newCommit.sha,
                force: false
              })
            }
          );

          return jsonResponse({
            success: true,
            skinId,
            commitSha:
              newCommit.sha,
            message:
              `Skin ${skinId} başarıyla orijinal veriye döndürüldü.`
          });
        } catch (error) {
          console.error(
            'Admin revert error:',
            error
          );

          return jsonResponse(
            {
              error:
                error.message ||
                'Geri alma işlemi başarısız.'
            },
            500
          );
        }
      }
    }

    return jsonResponse(
      {
        error:
          'Endpoint bulunamadı.'
      },
      404
    );
  }
};
