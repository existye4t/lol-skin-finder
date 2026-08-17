import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const baseUrl = 'https://ddragon.leagueoflegends.com';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'public', 'data', 'skins.json');

const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
};

const versions = await getJson(`${baseUrl}/api/versions.json`);
const version = versions[0];
console.log(`Data Dragon ${version} verisi indiriliyor...`);

const champions = await getJson(`${baseUrl}/cdn/${version}/data/tr_TR/champion.json`);
const entries = Object.values(champions.data);

// Hem Türkçe hem İngilizce yerelleştirmeleri paralel indir.
// Bu sayede sitedeki dil değiştirici (TR/EN) skin ve şampiyon
// isimlerini de doğru dilde gösterebilir.
const details = await Promise.all(entries.map(async ({ id }) => {
  const [trDetail, enDetail] = await Promise.all([
    getJson(`${baseUrl}/cdn/${version}/data/tr_TR/champion/${id}.json`).catch(() =>
      // Türkçe yerelleştirme eksikse İngilizce veriyle devam edilir.
      getJson(`${baseUrl}/cdn/${version}/data/en_US/champion/${id}.json`)
    ),
    getJson(`${baseUrl}/cdn/${version}/data/en_US/champion/${id}.json`).catch(() => null)
  ]);

  return { trDetail, enDetail };
}));

const skins = details.flatMap(({ trDetail, enDetail }) => {
  const champion = Object.values(trDetail.data)[0];
  const championEn = enDetail ? Object.values(enDetail.data)[0] : null;

  return champion.skins.map((skin, index) => {
    const skinEn = championEn?.skins?.[index];

    return {
      id: `${champion.key}${String(skin.num).padStart(3, '0')}`,
      skinNum: skin.num,
      name: skin.name === 'default' ? champion.name : skin.name,
      champion: champion.name,
      nameEn: skinEn
        ? (skinEn.name === 'default' ? (championEn.name || champion.name) : skinEn.name)
        : (skin.name === 'default' ? champion.name : skin.name),
      championEn: championEn?.name || champion.name,
      championId: champion.id,
      image: `${baseUrl}/cdn/img/champion/splash/${champion.id}_${skin.num}.jpg`
    };
  });
}).sort((a, b) => a.name.localeCompare(b.name, 'tr'));

await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ version, updatedAt: new Date().toISOString(), skins }, null, 2), 'utf8');
console.log(`${skins.length} skin ${output} dosyasına yazıldı.`);
