export const sharePreviewVersion = '5';

export function skinShareCollection(skin) {
  return skin.isPbe ? 'pbe' : (skin.collection || 'skins');
}

export function skinSharePath(collection, id, lang = 'tr') {
  // PBE and Live share Riot IDs, so the URL survives promotion to Live.
  const folder = collection === 'pbe' ? 'skins' : collection;
  const suffix = lang === 'en' ? '.en.html' : '.html';
  return `share/${encodeURIComponent(folder)}/${encodeURIComponent(id)}${suffix}`;
}
