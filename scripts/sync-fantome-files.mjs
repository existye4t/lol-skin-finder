import { readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'public', 'fantome');

const ids = new Set();
for (const item of await readdir(target, { withFileTypes: true })) {
  if (item.isFile() && /^\d+\.fantome$/i.test(item.name)) {
    const id = item.name.replace(/\.fantome$/i, '');
    ids.add(id);
  }
}

const sortedIds = [...ids].sort();
await writeFile(resolve(root, 'public', 'data', 'fantome-files.json'), JSON.stringify(sortedIds, null, 2), 'utf8');
console.log(`${sortedIds.length} Fantome dosyası public/fantome/ içinden tarandı ve fantome-files.json güncellendi.`);