import { copyFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = 'C:/Users/Exist/Documents/LOL Skins';
const target = resolve(root, 'public', 'fantome');

if (!existsSync(source)) throw new Error(`Kaynak klasör bulunamadı: ${source}`);
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

const ids = new Set();
async function scan(folder) {
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const fullPath = resolve(folder, item.name);
    if (item.isDirectory()) await scan(fullPath);
    else if (item.isFile() && /^\d+\.fantome$/i.test(item.name)) {
      const id = item.name.replace(/\.fantome$/i, '');
      await copyFile(fullPath, resolve(target, item.name));
      ids.add(id);
    }
  }
}
await scan(source);
await writeFile(resolve(root, 'public', 'data', 'fantome-files.json'), JSON.stringify([...ids].sort(), null, 2));
console.log(`${ids.size} Fantome dosyası hazırlandı.`);
