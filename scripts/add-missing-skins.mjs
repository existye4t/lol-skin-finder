import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skinsPath = resolve(root, 'public', 'data', 'skins.json');

const newSkins = [
  {
    "id": "163033",
    "skinNum": 33,
    "name": "Freljord'lu Taliyah (Emsalsiz)",
    "champion": "Taliyah",
    "nameTr": "Freljord'lu Taliyah (Emsalsiz)",
    "championTr": "Taliyah",
    "nameEn": "Freljord Taliyah (Paragon)",
    "championEn": "Taliyah",
    "championId": "Taliyah",
    "image": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Taliyah_33.jpg",
    "imageFallback": "",
    "parentSkinId": "163001"
  },
  {
    "id": "18079",
    "skinNum": 79,
    "name": "Yükselen Efsane Tristana",
    "champion": "Tristana",
    "nameTr": "Yükselen Efsane Tristana",
    "championTr": "Tristana",
    "nameEn": "Risen Legend Tristana",
    "championEn": "Tristana",
    "championId": "Tristana",
    "image": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Tristana_79.jpg",
    "imageFallback": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/tristana/skins/skin79/images/tristana_splash_centered_79.hol_tristana.jpg"
  },
  {
    "id": "18080",
    "skinNum": 80,
    "name": "Ölümsüz Efsane Tristana",
    "champion": "Tristana",
    "nameTr": "Ölümsüz Efsane Tristana",
    "championTr": "Tristana",
    "nameEn": "Immortalized Legend Tristana",
    "championEn": "Tristana",
    "championId": "Tristana",
    "image": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Tristana_80.jpg",
    "imageFallback": ""
  },
  {
    "id": "61040",
    "skinNum": 40,
    "name": "Yükselen Efsane Orianna",
    "champion": "Orianna",
    "nameTr": "Yükselen Efsane Orianna",
    "championTr": "Orianna",
    "nameEn": "Risen Legend Orianna",
    "championEn": "Orianna",
    "championId": "Orianna",
    "image": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Orianna_40.jpg",
    "imageFallback": "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/orianna/skins/skin40/images/orianna_splash_centered_40.skins_orianna_skin40.jpg"
  },
  {
    "id": "61041",
    "skinNum": 41,
    "name": "Yükselen Efsane Orianna (Emsalsiz)",
    "champion": "Orianna",
    "nameTr": "Yükselen Efsane Orianna (Emsalsiz)",
    "championTr": "Orianna",
    "nameEn": "Risen Legend Orianna (Paragon)",
    "championEn": "Orianna",
    "championId": "Orianna",
    "image": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Orianna_41.jpg",
    "imageFallback": "",
    "parentSkinId": "61040"
  },
  {
    "id": "61042",
    "skinNum": 42,
    "name": "Yükselen Efsane Orianna (Efsanenin Doruğu)",
    "champion": "Orianna",
    "nameTr": "Yükselen Efsane Orianna (Efsanenin Doruğu)",
    "championTr": "Orianna",
    "nameEn": "Risen Legend Orianna (Mythclimber)",
    "championEn": "Orianna",
    "championId": "Orianna",
    "image": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Orianna_42.jpg",
    "imageFallback": "",
    "parentSkinId": "61040"
  },
  {
    "id": "7061",
    "skinNum": 61,
    "name": "Ağaç Ata LeBlanc (Emsalsiz)",
    "champion": "LeBlanc",
    "nameTr": "Ağaç Ata LeBlanc (Emsalsiz)",
    "championTr": "LeBlanc",
    "nameEn": "Elderwood LeBlanc (Paragon)",
    "championEn": "LeBlanc",
    "championId": "Leblanc",
    "image": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Leblanc_61.jpg",
    "imageFallback": "",
    "parentSkinId": "7005"
  },
  {
    "id": "84104",
    "skinNum": 104,
    "name": "Arş Hükümdarı Akali (Emsalsiz)",
    "champion": "Akali",
    "nameTr": "Arş Hükümdarı Akali (Emsalsiz)",
    "championTr": "Akali",
    "nameEn": "Empyrean Akali (Paragon)",
    "championEn": "Akali",
    "championId": "Akali",
    "image": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Akali_104.jpg",
    "imageFallback": "",
    "parentSkinId": "84082"
  }
];

async function main() {
  const content = await readFile(skinsPath, 'utf8');
  const data = JSON.parse(content);
  
  // Create a map of existing skins by ID for quick lookup
  const existingById = new Map(data.skins.map(s => [s.id, s]));
  
  let added = 0;
  let skipped = 0;
  
  for (const newSkin of newSkins) {
    if (existingById.has(newSkin.id)) {
      console.log(`SKIPPED (already exists): ${newSkin.id} - ${newSkin.nameTr}`);
      skipped++;
    } else {
      data.skins.push(newSkin);
      console.log(`ADDED: ${newSkin.id} - ${newSkin.nameTr}`);
      added++;
    }
  }
  
  // Sort by Turkish name (as the existing data appears to be)
  data.skins.sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }));
  
  // Update version timestamp
  data.updatedAt = new Date().toISOString();
  
  await writeFile(skinsPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\nDone. Added: ${added}, Skipped: ${skipped}, Total: ${data.skins.length}`);
}

main().catch(console.error);