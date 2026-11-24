import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeSkinPackagePath, skinSourceRepo } from '../src/skin-source.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '..');
export const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
export const DATA_DIR = process.env.SKIN_SYNC_DATA_DIR || path.join(PUBLIC_DIR, 'data');

export const SKIN_SOURCE_REPO = skinSourceRepo;
export const SKIN_SOURCE_BRANCH = process.env.SKIN_SOURCE_BRANCH || 'main';


// Güvenlik eşiği: kaynakta toplam girdi sayısı %5'ten fazla düşerse hata verip dur
export const MAX_ALLOWED_DROP_RATIO = 0.05;

export const PATHS = {
  manifest: path.join(DATA_DIR, 'fantome-manifest.json'),
  skins: path.join(DATA_DIR, 'skins.json'),
  rainbow: path.join(DATA_DIR, 'rainbow.json'),
  classic: path.join(DATA_DIR, 'classic.json'),
  adminOverrides: path.join(DATA_DIR, 'admin-overrides.json'),
  syncReport: path.join(DATA_DIR, 'sync-report.json')
};

/**
 * Kaynak indeksinde yalnızca görünen ad bulunan dosyalar için adlandırma kuralı.
 * "/" -> "_", ":" ve "?" silinir.
 */
export function sourceFileName(name) {
  return String(name || '')
    .replace(/\//g, '_')
    .replace(/[:?]/g, '');
}

/**
 * Kaynak klasörlerini Git ağacındaki adlandırmayla eşleştirir.
 * Dosya adı kuralına ek olarak sondaki noktalar (.) silinir (örn. "Kennen M.D." -> "Kennen M.D").
 */
export function sourceFolderName(name) {
  return sourceFileName(name).replace(/\.+$/, '');
}

/**
 * Göreli kaynak dosya yolunu (örn. "skins/Ahri/K_DA Ahri.fantome") segment bazlı encode ederek
 * tam raw.githubusercontent.com indirme URL'sine dönüştürür.
 */
export function buildSourceDownloadUrl(relativePath, baseUrl) {
  if (!relativePath || !baseUrl) return null;
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return cleanBase + encodeSkinPackagePath(relativePath);
}
