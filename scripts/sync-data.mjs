import { copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(process.env.SKIN_SYNC_DATA_DIR || path.join(root, 'public', 'data'));
const work = path.join(root, 'work');
const generated = ['fantome-manifest.json', 'skins.json', 'rainbow.json', 'classic.json'];
const inputs = [...generated, 'admin-overrides.json'];
const args = process.argv.slice(2);
const reportFile = args.find(arg => arg.startsWith('--report='))?.slice('--report='.length);

async function synchronize() {
  await mkdir(work, { recursive: true });
  const lock = path.join(work, '.catalog-sync-lock');
  await mkdir(lock);
  let staging;
  try {
    staging = await mkdtemp(path.join(work, 'catalog-sync-'));
    const backup = path.join(staging, 'previous');
    await mkdir(backup);
    for (const file of inputs) {
      try {
        await copyFile(path.join(output, file), path.join(backup, file));
        await copyFile(path.join(backup, file), path.join(staging, file));
      } catch (error) {
        if (error.code !== 'ENOENT' || file !== 'admin-overrides.json') throw error;
      }
    }

    // Import after selecting the staging output for all existing pipeline steps.
    process.env.SKIN_SYNC_DATA_DIR = staging;
    const { sourceSnapshot } = await import('./sync-source.mjs');
    const { prepareFantome } = await import('./prepare-fantome.mjs');
    const { updateSkins } = await import('./update-skins.mjs');
    const { verifyCollections } = await import('./verify-collections.mjs');
    const { checkLinks } = await import('./check-links.mjs');
    const snapshot = await sourceSnapshot();
    await prepareFantome({ snapshot, writeReport: true });
    await updateSkins({ snapshot });
    const result = await verifyCollections({ snapshot });
    if (!result.success) throw new Error('Catalog validation failed');
    const changed = [];
    for (const file of generated) {
      // Git can check out generated text with CRLF on Windows.
      const original = await readFile(path.join(backup, file), 'utf8');
      const candidate = await readFile(path.join(staging, file), 'utf8');
      if (original.replaceAll('\r\n', '\n') !== candidate) changed.push(file);
    }
    const fullDownloads = args.includes('--download-samples');
    await checkLinks({ snapshot, newOnly: !fullDownloads, download: fullDownloads,
      sampleSize: fullDownloads ? 8 : changed.length ? 20 : 0 });

    const report = JSON.parse(await readFile(path.join(staging, 'sync-report.json'), 'utf8'));
    if (reportFile) await writeFile(reportFile, JSON.stringify({ ...report, changed }, null, 2) + '\n');
    console.log('[sync-data] Changed files:', changed.length ? changed.join(', ') : 'none');
    if (args.includes('--dry-run') || changed.length === 0) return;

    for (const file of inputs) {
      const readOptional = (filePath) => readFile(filePath).catch(error => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
      const [before, current] = await Promise.all([
        readOptional(path.join(backup, file)), readOptional(path.join(output, file))
      ]);
      if (before === null ? current !== null : !current?.equals(before)) {
        throw new Error(`Catalog input changed during synchronization: ${file}`);
      }
    }
    const written = [];
    try {
      for (const file of changed) {
        await rename(path.join(staging, file), path.join(output, file));
        written.push(file);
      }
    } catch (error) {
      for (const file of written) await rename(path.join(backup, file), path.join(output, file));
      throw error;
    }
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}

synchronize().catch(error => {
  console.error('[sync-data]', error.message);
  process.exitCode = 1;
});
