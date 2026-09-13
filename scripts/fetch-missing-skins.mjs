import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const communityDragonUrl = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data';
const baseUrl = 'https://ddragon.leagueoflegends.com';

const missingIds = [
  '103087', '145999', '163033', '18079', '18080', '21997', '21998', '21999',
  '222998', '222999', '234994', '234995', '234996', '234997', '234998', '234999',
  '25999', '37998', '37999', '61040', '61041', '61042', '7061', '82998', '82999',
  '84104', '875998', '875999', '99991', '99992', '99993', '99994', '99995', '99996', '99997', '99998', '99999'
];

const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
};

// Fetch TR and EN skins from CommunityDragon
const [trSkins, enSkins] = await Promise.all([
  getJson(`${communityDragonUrl}/global/tr_tr/v1/skins.json`),
  getJson(`${communityDragonUrl}/global/default/v1/skins.json`)
]);

// Build parent skin map
const parentSkinById = new Map();
Object.values(trSkins).forEach((skin) => {
  skin.chromas?.forEach((chroma) => {
    parentSkinById.set(String(chroma.id), String(skin.id));
  });
});

const imageUrlFromSplashPath = (splashPath) => {
  if (!splashPath) return '';
  const normalizedPath = String(splashPath)
    .replace(/^\/lol-game-data\/assets\/assets\//i, 'assets/')
    .toLowerCase();
  return `${communityDragonUrl}/global/default/${normalizedPath}`;
};

// Get champion details for all champions to map skin IDs to champion info
const versions = await getJson(`${baseUrl}/api/versions.json`);
const version = versions[0];
const champions = await getJson(`${baseUrl}/cdn/${version}/data/tr_TR/champion.json`);
const entries = Object.values(champions.data);

// Fetch all champion details to build skinNum -> champion mapping
const details = await Promise.all(entries.map(async ({ id }) => {
  const [trDetail, enDetail] = await Promise.all([
    getJson(`${baseUrl}/cdn/${version}/data/tr_TR/champion/${id}.json`).catch(() =>
      getJson(`${baseUrl}/cdn/${version}/data/en_US/champion/${id}.json`)
    ),
    getJson(`${baseUrl}/cdn/${version}/data/en_US/champion/${id}.json`).catch(() => null)
  ]);
  return { trDetail, enDetail };
}));

// Build a mapping from skin ID to skin info from Data Dragon
const skinIdToInfo = new Map();
details.forEach(({ trDetail, enDetail }) => {
  const champion = Object.values(trDetail.data)[0];
  const championEn = enDetail ? Object.values(enDetail.data)[0] : null;
  
  champion.skins.forEach((skin, index) => {
    const skinEn = championEn?.skins?.[index];
    const id = `${champion.key}${String(skin.num).padStart(3, '0')}`;
    
    skinIdToInfo.set(id, {
      champion: champion.name,
      championId: champion.id,
      championKey: champion.key,
      skinNum: skin.num,
      skinName: skin.name === 'default' ? champion.name : skin.name,
      championEn: championEn?.name || champion.name,
      skinNameEn: skinEn?.name === 'default' ? (championEn.name || champion.name) : (skinEn?.name || skin.name)
    });
  });
});

// Now find the missing skins
const missingSkins = [];
for (const id of missingIds) {
  const trSkin = trSkins[id];
  const enSkin = enSkins[id];
  const ddragonInfo = skinIdToInfo.get(id);
  const parentId = parentSkinById.get(id);
  
  if (!trSkin && !enSkin && !ddragonInfo) {
    console.log(`NOT FOUND: ${id}`);
    missingSkins.push({ id, error: 'Not found in any data source' });
    continue;
  }
  
  // Determine champion info
  let championId = '';
  let championNameTr = '';
  let championNameEn = '';
  let skinNum = 0;
  
  if (ddragonInfo) {
    championId = ddragonInfo.championId;
    championNameTr = ddragonInfo.champion;
    championNameEn = ddragonInfo.championEn;
    skinNum = ddragonInfo.skinNum;
  }
  
  // Determine skin name
  let nameTr = '';
  let nameEn = '';
  
  if (trSkin?.name) {
    nameTr = trSkin.name;
  } else if (ddragonInfo) {
    nameTr = ddragonInfo.skinName;
  }
  
  if (enSkin?.name) {
    nameEn = enSkin.name;
  } else if (ddragonInfo) {
    nameEn = ddragonInfo.skinNameEn;
  }
  
  // Fallback for champion name if not from Data Dragon
  if (!championNameTr && trSkin?.champion) {
    championNameTr = trSkin.champion;
    championId = trSkin.championId || '';
  }
  if (!championNameEn && enSkin?.champion) {
    championNameEn = enSkin.champion;
    if (!championId) championId = enSkin.championId || '';
  }
  
  // Image URLs
  const image = championId && skinNum 
    ? `${baseUrl}/cdn/img/champion/splash/${championId}_${skinNum}.jpg`
    : '';
  const imageFallback = imageUrlFromSplashPath(trSkin?.splashPath || enSkin?.splashPath);
  
  const skinData = {
    id,
    skinNum,
    name: nameTr,
    champion: championNameTr,
    nameTr,
    championTr: championNameTr,
    nameEn,
    championEn: championNameEn,
    championId,
    image,
    imageFallback,
    ...(parentId ? { parentSkinId: parentId } : {})
  };
  
  missingSkins.push(skinData);
  console.log(`FOUND: ${id} - ${nameTr} (${championNameTr})`);
}

await writeFile(resolve(root, 'scripts', 'missing-skins.json'), JSON.stringify(missingSkins, null, 2), 'utf8');
console.log('\nMissing skins data written to scripts/missing-skins.json');