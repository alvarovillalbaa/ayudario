import { readdir, readFile, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import path from "node:path";

const root = process.env.AYUDARIO_PROOF_DIR;
if (!root) throw new Error("Owned proof directory is required");
const allowed = new Set(["source-before.json", "source-after.json", "domain.tap", "browser.json", "server-cleanup.json", "server.log", "desktop.png", "narrow.png", "b01-reminder.ics", "b03-backup.json", "b04-backup.json", "attempt-1-original.zip", "hosted.json", "hosted.png"]);
let total = 0;
for (const name of (await readdir(root)).sort()) {
  if (!allowed.has(name)) throw new Error("Unexpected proof output");
  const file = path.join(root, name); const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 512 * 1024 || (total += stat.size) > 1024 * 1024) throw new Error("Proof bound exceeded");
  const bytes = await readFile(file);
  const packed = gzipSync(bytes, { level: 9, mtime: 0 });
  const encoded = packed.toString("base64");
  console.log(`AYUDARIO_PROOF_FILE ${JSON.stringify({ name, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), gzipBytes: packed.length, chunks: Math.ceil(encoded.length / 3000) })}`);
  for (let offset = 0; offset < encoded.length; offset += 3000) console.log(`AYUDARIO_PROOF_CHUNK ${JSON.stringify({ name, index: offset / 3000, data: encoded.slice(offset, offset + 3000) })}`);
}
