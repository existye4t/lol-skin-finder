import { readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'public', 'fantome');

const ids = new Set();
async function scan(folder) {
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const fullPath = resolve(folder, item.name);
    if (item.isDirectory()) await scan(fullPath);
    else if (item.isFile() && /^\d+\.fantome$/i.test(item.name)) {
      ids.add(item.name.replace(/\.fantome$/i, ''));
    }
  }
}
await scan(target);
await writeFile(resolve(root, 'public', 'data', 'fantome-files.json'), JSON.stringify([...ids].sort(), null, 2));
console.log(`${ids.size} Fantome dosyası hazırlandı.`);
