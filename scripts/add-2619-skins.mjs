import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// 26.19 patch: Coven Mel, Old God Anivia, Coven Janna, Old God Urgot.
// Veriler CommunityDragon (tr_tr / default v1 skins.json + champion detay) ve
// Data Dragon splash CDN'inden canlı olarak doğrulanmıştır (bkz. görev raporu).
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skinsPath = resolve(root, 'public', 'data', 'skins.json');

const ddragonSplash = (championId, num) =>
  `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championId}_${num}.jpg`;

const cdragonSplash = (champLower, skinFolder, file) =>
  `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/${champLower}/skins/${skinFolder}/images/${file}`;

const cdragonChromaPreview = (champLower, skinFolder, file) =>
  `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/${champLower}/skins/${skinFolder}/${file}`;

const newSkins = [
  {
    id: '800012', skinNum: 12,
    name: 'Cadılar Meclisi Mel', champion: 'Mel',
    nameTr: 'Cadılar Meclisi Mel', championTr: 'Mel',
    nameEn: 'Coven Mel', championEn: 'Mel', championId: 'Mel',
    image: ddragonSplash('Mel', 12),
    imageFallback: cdragonSplash('mel', 'skin12', 'mel_splash_centered_12.skins_mel_skin12.jpg')
  },
  ...[
    [13, 'Yakut'], [14, 'Deniz Mavisi'], [15, 'Turkuvaz'], [16, 'Obsidiyen'],
    [17, 'Kedigözü'], [18, 'Pembe Kuvars'], [19, 'Tanzanit'], [20, 'İnci Beyazı']
  ].map(([num, colorTr]) => ({
    id: `8000${num}`, skinNum: num,
    name: `Cadılar Meclisi Mel (${colorTr})`, champion: 'Mel',
    nameTr: `Cadılar Meclisi Mel (${colorTr})`, championTr: 'Mel',
    nameEn: 'Coven Mel', championEn: 'Mel', championId: 'Mel',
    image: cdragonChromaPreview('mel', `skin${num}`, `chromapreview.chroma_mel_coven.png`),
    imageFallback: '',
    parentSkinId: '800012'
  })),

  {
    id: '34056', skinNum: 56,
    name: 'Kadim İlah Anivia', champion: 'Anivia',
    nameTr: 'Kadim İlah Anivia', championTr: 'Anivia',
    nameEn: 'Old God Anivia', championEn: 'Anivia', championId: 'Anivia',
    image: ddragonSplash('Anivia', 56),
    imageFallback: cdragonSplash('anivia', 'skin56', 'anivia_splash_centered_56.skins_anivia_skin56.jpg')
  },
  ...[
    [57, 'Yakut'], [58, 'Zümrüt'], [59, 'Turuncu'], [60, 'İnci Beyazı'],
    [61, 'Safir'], [62, 'Obsidiyen'], [63, 'Pembe Kuvars'], [64, 'Tanzanit']
  ].map(([num, colorTr]) => ({
    id: `340${num}`, skinNum: num,
    name: `Kadim İlah Anivia (${colorTr})`, champion: 'Anivia',
    nameTr: `Kadim İlah Anivia (${colorTr})`, championTr: 'Anivia',
    nameEn: 'Old God Anivia', championEn: 'Anivia', championId: 'Anivia',
    image: cdragonChromaPreview('anivia', `skin${num}`, `chromapreview.chroma_anivia_oldgod.png`),
    imageFallback: '',
    parentSkinId: '34056'
  })),

  {
    id: '40067', skinNum: 67,
    name: 'Cadılar Meclisi Janna', champion: 'Janna',
    nameTr: 'Cadılar Meclisi Janna', championTr: 'Janna',
    nameEn: 'Coven Janna', championEn: 'Janna', championId: 'Janna',
    image: ddragonSplash('Janna', 67),
    imageFallback: cdragonSplash('janna', 'skin67', 'janna_splash_centered_67.skins_janna_skin67.jpg')
  },
  ...[
    [68, 'Yakut'], [69, 'Safir'], [70, 'Pembe Kuvars'],
    [71, 'Kedigözü'], [72, 'Obsidiyen'], [73, 'İnci Beyazı']
  ].map(([num, colorTr]) => ({
    id: `400${num}`, skinNum: num,
    name: `Cadılar Meclisi Janna (${colorTr})`, champion: 'Janna',
    nameTr: `Cadılar Meclisi Janna (${colorTr})`, championTr: 'Janna',
    nameEn: 'Coven Janna', championEn: 'Janna', championId: 'Janna',
    image: cdragonChromaPreview('janna', `skin${num}`, `chromapreview.chroma_janna_coven.png`),
    imageFallback: '',
    parentSkinId: '40067'
  })),

  {
    id: '6041', skinNum: 41,
    name: 'Kadim İlah Urgot', champion: 'Urgot',
    nameTr: 'Kadim İlah Urgot', championTr: 'Urgot',
    nameEn: 'Old God Urgot', championEn: 'Urgot', championId: 'Urgot',
    image: ddragonSplash('Urgot', 41),
    imageFallback: cdragonSplash('urgot', 'skin41', 'urgot_splash_centered_41.skins_urgot_skin41.jpg')
  },
  ...[
    [42, 'Yakut'], [43, 'Kedigözü'], [44, 'Zümrüt'], [45, 'Safir'],
    [46, 'Tanzanit'], [47, 'Pembe Kuvars'], [48, 'İnci Beyazı'], [49, 'Obsidiyen']
  ].map(([num, colorTr]) => ({
    id: `60${num}`, skinNum: num,
    name: `Kadim İlah Urgot (${colorTr})`, champion: 'Urgot',
    nameTr: `Kadim İlah Urgot (${colorTr})`, championTr: 'Urgot',
    nameEn: 'Old God Urgot', championEn: 'Urgot', championId: 'Urgot',
    image: cdragonChromaPreview('urgot', `skin${num}`, `chromapreview.chroma_urgot_oldgod.png`),
    imageFallback: '',
    parentSkinId: '6041'
  })),

  // 26.19'da mevcut "Cadılar Meclisi" (Coven) skinlerine eklenen yeni "Saf/Pristine"
  // chroma'ları. Base skinler (Coven Ahri 103042, Coven Ashe 22032, Coven Morgana 25026)
  // zaten katalogda mevcuttu; bu üç ID yalnızca yeni chroma'dır.
  {
    id: '103096', skinNum: 96,
    name: 'Cadılar Meclisi Ahri (Saf)', champion: 'Ahri',
    nameTr: 'Cadılar Meclisi Ahri (Saf)', championTr: 'Ahri',
    nameEn: 'Coven Ahri (Pristine)', championEn: 'Ahri', championId: 'Ahri',
    image: cdragonChromaPreview('ahri', 'skin96', 'chromapreview.chroma_ahri_coven.png'),
    imageFallback: '',
    parentSkinId: '103042'
  },
  {
    id: '22093', skinNum: 93,
    name: 'Cadılar Meclisi Ashe (Saf)', champion: 'Ashe',
    nameTr: 'Cadılar Meclisi Ashe (Saf)', championTr: 'Ashe',
    nameEn: 'Coven Ashe (Pristine)', championEn: 'Ashe', championId: 'Ashe',
    image: cdragonChromaPreview('ashe', 'skin93', 'chromapreview.chroma_ashe_coven.png'),
    imageFallback: '',
    parentSkinId: '22032'
  },
  {
    id: '25083', skinNum: 83,
    name: 'Cadılar Meclisi Morgana (Saf)', champion: 'Morgana',
    nameTr: 'Cadılar Meclisi Morgana (Saf)', championTr: 'Morgana',
    nameEn: 'Coven Morgana (Pristine)', championEn: 'Morgana', championId: 'Morgana',
    image: cdragonChromaPreview('morgana', 'skin83', 'chromapreview.chroma_morgana_coven.png'),
    imageFallback: '',
    parentSkinId: '25026'
  }
];

async function main() {
  const content = await readFile(skinsPath, 'utf8');
  const data = JSON.parse(content);
  const existingById = new Map(data.skins.map((s) => [s.id, s]));

  let added = 0;
  let skipped = 0;

  for (const skin of newSkins) {
    if (existingById.has(skin.id)) {
      console.log(`SKIPPED (already exists): ${skin.id} - ${skin.nameTr}`);
      skipped++;
    } else {
      data.skins.push(skin);
      console.log(`ADDED: ${skin.id} - ${skin.nameTr}`);
      added++;
    }
  }

  data.skins.sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }));
  data.updatedAt = new Date().toISOString();

  await writeFile(skinsPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\nDone. Added: ${added}, Skipped: ${skipped}, Total: ${data.skins.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
