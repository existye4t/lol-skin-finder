export function publishedSkinDownload(manifest, skin) {
  const collection = skin.isPbe ? 'pbe' : 'skins';
  const entry = manifest?.entries?.[`${collection}:${skin.id}`];
  if (entry?.status !== 'enabled' || !entry.enabled || entry.legacy || entry.champ !== skin.championId ||
      typeof entry.path !== 'string' || !entry.path.endsWith('.fantome')) return null;
  const parts = entry.path.split('/');
  if (parts[0] !== (skin.isPbe ? 'PBE' : 'skins') ||
      parts.some(part => !part || part === '.' || part === '..' || part.includes('\\'))) return null;
  const base = manifest.baseUrl;
  if (typeof base !== 'string' || !/^https:\/\/raw\.githubusercontent\.com\/[\w.-]+\/[\w.-]+\/[\w.-]+\/$/.test(base)) return null;
  return base + parts.map(encodeURIComponent).join('/');
}
