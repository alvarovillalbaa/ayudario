import { mkdir, lstat, open, realpath, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BdnsError, fetchBdnsCalls, MAX_BODY_BYTES } from '../lib/bdns.mjs';

const DEFAULT_OUTPUT = fileURLToPath(new URL('../public/data/calls.json', import.meta.url));

async function replaceAtomically(outputPath, snapshot) {
  const data = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (Buffer.byteLength(data) > MAX_BODY_BYTES) throw new BdnsError('output_bound');
  const output = resolve(outputPath);
  const directory = dirname(output);
  await mkdir(directory, { recursive: true });
  if (await realpath(directory) !== directory) throw new BdnsError('output_path');
  try {
    const current = await lstat(output);
    if (!current.isFile() || current.isSymbolicLink()) throw new BdnsError('output_path');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const temporary = `${output}.${randomUUID()}.tmp`;
  let handle;
  let created = false;
  let committed = false;
  try {
    handle = await open(temporary, 'wx', 0o644);
    created = true;
    await handle.writeFile(data, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporary, output);
    committed = true;
  } finally {
    if (handle) await handle.close().catch(() => {});
    if (created && !committed) await unlink(temporary).catch(() => {});
  }
}

/** The output override is for disposable T2 fixtures. The CLI has no path override. */
export async function refreshCalls({ outputPath = DEFAULT_OUTPUT, ...requestOptions } = {}) {
  const snapshot = await fetchBdnsCalls(requestOptions);
  await replaceAtomically(outputPath, snapshot);
  return snapshot;
}

async function main() {
  try {
    if (process.argv.length !== 2) throw new BdnsError('arguments');
    const result = await refreshCalls();
    console.log(`BDNS catalogue refreshed: ${result.items.length} calls; fetchedAt=${result.fetchedAt}`);
  } catch (error) {
    const code = error instanceof BdnsError ? error.code : 'output_write';
    console.error(`BDNS refresh failed (${code}); no catalogue was replaced.`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
