export function skinShareCollection(skin) {
  return skin.isPbe ? 'pbe' : (skin.collection || 'skins');
}

export function skinSharePath(collection, id) {
  // PBE and Live share Riot IDs, so the URL survives promotion to Live.
  const folder = collection === 'pbe' ? 'skins' : collection;
  return `share/${encodeURIComponent(folder)}/${encodeURIComponent(id)}.html`;
}
