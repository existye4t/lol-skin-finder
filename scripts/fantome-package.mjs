import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { buildSourceDownloadUrl } from './config.mjs';
import { fetchWithRetry } from './sync-source.mjs';

const localHeader = 0x04034b50;
const centralHeader = 0x02014b50;
const endSignature = Buffer.from([0x50, 0x4b, 0x05, 0x06]);

function endOfDirectory(bytes) {
  const end = bytes.lastIndexOf(endSignature);
  if (bytes.length < 22 || bytes.readUInt32LE(0) !== localHeader ||
      end < Math.max(0, bytes.length - 65_557) || end + 22 > bytes.length) {
    throw new Error('Invalid .fantome ZIP container');
  }
  return end;
}

export function verifyPackageBytes(bytes, entry) {
  endOfDirectory(bytes);
  if (bytes.length !== entry.bytes) throw new Error(`Package size mismatch: ${entry.path}`);
  const objectId = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (objectId !== entry.blobSha || entry.sha256 &&
      createHash('sha256').update(bytes).digest('hex') !== entry.sha256) {
    throw new Error(`Digest mismatch: ${entry.path}`);
  }
}

function readBuildMetadata(bytes) {
  const end = endOfDirectory(bytes);
  let offset = bytes.readUInt32LE(end + 16);
  while (offset + 46 <= end && bytes.readUInt32LE(offset) === centralHeader) {
    const nameSize = bytes.readUInt16LE(offset + 28);
    const name = bytes.toString('utf8', offset + 46, offset + 46 + nameSize);
    if (name === 'META/build.json') {
      const method = bytes.readUInt16LE(offset + 10);
      const compressed = bytes.readUInt32LE(offset + 20);
      const size = bytes.readUInt32LE(offset + 24);
      const header = bytes.readUInt32LE(offset + 42);
      if (size > 256 * 1024 || header + 30 > offset ||
          bytes.readUInt32LE(header) !== localHeader || ![0, 8].includes(method)) break;
      const dataStart = header + 30 + bytes.readUInt16LE(header + 26) + bytes.readUInt16LE(header + 28);
      if (dataStart + compressed > offset) break;
      const data = bytes.subarray(dataStart, dataStart + compressed);
      const decoded = method === 8 ? inflateRawSync(data, { maxOutputLength: 256 * 1024 }) : data;
      if (decoded.length !== size) break;
      return JSON.parse(decoded.toString('utf8'));
    }
    offset += 46 + nameSize + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32);
  }
  throw new Error('Missing or invalid META/build.json');
}

export function verifyRainbowIdentity(bytes, entry) {
  const { buildInputs } = readBuildMetadata(bytes);
  if (buildInputs?.champion?.toLowerCase() !== entry.champ.toLowerCase() ||
      Number(buildInputs.skin) !== Number(entry.id) % 1000) {
    throw new Error(`Rainbow package identity mismatch: ${entry.path}`);
  }
}

export async function downloadVerifiedPackage(baseUrl, entry) {
  const response = await fetchWithRetry(buildSourceDownloadUrl(entry.path, baseUrl));
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > entry.bytes) throw new Error(`Downloaded package exceeds Git blob size: ${entry.path}`);
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks, size);
  verifyPackageBytes(bytes, entry);
  return bytes;
}
