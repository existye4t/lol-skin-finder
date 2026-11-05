import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '..');
export const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
export const DATA_DIR = path.join(PUBLIC_DIR, 'data');

export const SOURCE_REPO = process.env.YIMIKAMI_REPO || 'Yimikami/LeagueSkins-Experimental';
export const SOURCE_BRANCH = process.env.YIMIKAMI_BRANCH || 'main';
export const RAW_BASE_URL = `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_BRANCH}/`;
export const GITHUB_TREE_API_URL = `https://api.github.com/repos/${SOURCE_REPO}/git/trees/${SOURCE_BRANCH}?recursive=1`;

// Tek bayrakla eski (ID tabanlı yerel) fantome dosyalarını açıp kapatma
export const ENABLE_LEGACY_FANTOME = process.env.ENABLE_LEGACY_FANTOME === 'true';
export const LEGACY_BASE_PATH = '/fantome/';
export const LEGACY_EXTERNAL_DIR = process.env.LOL_SKINS_LEGACY_DIR || '';

// Kaynaktan silinen bir paketin devre dışı bırakılmadan önce kaç çalışma boyunca "missing" kalacağı
export const MISSING_GRACE_RUNS = 3;

// Güvenlik eşiği: kaynakta toplam girdi sayısı %5'ten fazla düşerse hata verip dur
export const MAX_ALLOWED_DROP_RATIO = 0.05;

export const PATHS = {
  manifest: path.join(DATA_DIR, 'fantome-manifest.json'),
  skins: path.join(DATA_DIR, 'skins.json'),
  rainbow: path.join(DATA_DIR, 'rainbow.json'),
  classic: path.join(DATA_DIR, 'classic.json'),
  legacyFantomeList: path.join(DATA_DIR, 'fantome-files.json'),
  adminOverrides: path.join(DATA_DIR, 'admin-overrides.json'),
  syncReport: path.join(DATA_DIR, 'sync-report.json')
};

/**
 * Yimikami dosya adı sanitizasyon kuralı:
 * "/" -> "_", ":" ve "?" silinir.
 */
export function sanitizeYimiFileName(name) {
  return String(name || '')
    .replace(/\//g, '_')
    .replace(/[:?]/g, '');
}

/**
 * Yimikami klasör adı sanitizasyon kuralı:
 * Dosya adı kuralına ek olarak sondaki noktalar (.) silinir (örn. "Kennen M.D." -> "Kennen M.D").
 */
export function sanitizeYimiFolderName(name) {
  return sanitizeYimiFileName(name).replace(/\.+$/, '');
}

/**
 * Göreli kaynak dosya yolunu (örn. "skins/Ahri/K_DA Ahri.fantome") segment bazlı encode ederek
 * tam raw.githubusercontent.com indirme URL'sine dönüştürür.
 */
export function buildSourceDownloadUrl(relativePath, baseUrl = RAW_BASE_URL) {
  if (!relativePath) return null;
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const encodedPath = String(relativePath)
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/');
  return `${cleanBase}${encodedPath}`;
}
