import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skinsPath = resolve(root, 'public', 'data', 'skins.json');
const fantomeFilesPath = resolve(root, 'public', 'data', 'fantome-files.json');
const imagesDir = resolve(root, 'public', 'images', 'skins');

// Çok basit bir 1x1 piksel şeffaf PNG (Base64)
// Gerçek bir placeholder için daha büyük veya renkli bir şey yapılabilir.
const placeholderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const placeholderBuffer = Buffer.from(placeholderBase64, 'base64');

async function generate() {
  await mkdir(imagesDir, { recursive: true });

  const skinsData = JSON.parse(await readFile(skinsPath, 'utf8'));
  const fantomeFiles = JSON.parse(await readFile(fantomeFilesPath, 'utf8'));
  const fantomeSet = new Set(fantomeFiles.map(f => f.replace(/\.fantome$/i, '')));

  let count = 0;
  for (const skin of skinsData.skins) {
    const skinId = String(skin.id);
    const imagePath = resolve(imagesDir, `${skinId}.jpg`);

    if (fantomeSet.has(skinId) && !existsSync(imagePath)) {
      // Sadece .fantome dosyası varsa ve görsel yoksa oluştur
      await writeFile(imagePath, placeholderBuffer);
      console.log(`[Placeholder] Oluşturuldu: ${skinId}.jpg`);
      count++;
    }
  }

  console.log(`${count} yeni placeholder görseli oluşturuldu.`);
}

generate().catch(console.error);
