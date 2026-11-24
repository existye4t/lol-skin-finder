export const skinSourceRepo = 'bettie9/LeagueSkins';
const directories = { skins: 'skins', pbe: 'PBE', classic: 'classic', rainbow: 'rainbow' };

export function validSkinPackagePath(path, collection) {
  if (typeof path !== 'string' || /[\\\x00-\x1f]/.test(path) || !path.endsWith('.fantome')) return false;
  const parts = path.split('/');
  return Object.hasOwn(directories, collection) && parts[0] === directories[collection] && parts.length >= 3 &&
    (collection !== 'pbe' || parts[1] === 'skins' && parts.length >= 4) &&
    parts.every(part => part && part !== '.' && part !== '..');
}

export function encodeSkinPackagePath(path) {
  return path.split('/').map(segment => encodeURIComponent(segment)
    .replace(/[!'()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase())
  ).join('/');
}

export function skinSourceBaseUrl(revision) {
  return typeof revision === 'string' && /^[a-f0-9]{40}$/.test(revision)
    ? `https://raw.githubusercontent.com/${skinSourceRepo}/${revision}/`
    : null;
}

export function isSkinSourceManifest(manifest) {
  const base = skinSourceBaseUrl(manifest?.sourceRevision);
  return Boolean(base && manifest.sourceRepo === skinSourceRepo && manifest.baseUrl === base &&
    manifest.entries && typeof manifest.entries === 'object' && !Array.isArray(manifest.entries));
}
