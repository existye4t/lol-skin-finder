import { encodeSkinPackagePath, isSkinSourceManifest, validSkinPackagePath } from '../../src/skin-source.js';

export function publishedSkinDownload(manifest, skin) {
  if (!isSkinSourceManifest(manifest)) return null;
  const collection = skin.isPbe ? 'pbe' : 'skins';
  const entry = manifest?.entries?.[`${collection}:${skin.id}`];
  if (entry?.status !== 'enabled' || !entry.enabled || entry.legacy || entry.c !== collection ||
      entry.champ !== skin.championId || !validSkinPackagePath(entry.path, collection)) return null;
  return manifest.baseUrl + encodeSkinPackagePath(entry.path);
}
