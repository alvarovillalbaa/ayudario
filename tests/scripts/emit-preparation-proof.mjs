import { readdir, readFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
const root = process.env.AYUDARIO_PROOF_DIR;
if (!root) throw new Error('Owned proof directory required');
const allowed = new Set(['owner.json','runner.json','source-before.json','source-after.json','browser-package-lock.json','preparation-browser.json','browser.json','desktop.png','narrow.png','r01-reminder.ics','r03-backup.json','r04-backup.json','preparation-visual.json','visual-desktop-immediate.png','visual-desktop-stable.png','visual-narrow-initial.png','visual-narrow-scrolled.png','visual-narrow-saved.png','failure-V01.png','failure-V02.png','server.stdout.txt','server.stderr.txt','desktop-sticky.png','desktop-complete.png','narrow-390.png','narrow-320.png','p02-current-plan.json','p05-recovery.json','p06-write-denial.json','failure-P01.png','failure-P02.png','failure-P03a.png','failure-P03b.png','failure-P04.png','failure-P05.png','failure-P06.png']);
let names;
try { names = await readdir(root); } catch (error) { if (error.code !== 'ENOENT') throw error; names = []; }
let total = 0;
for (const name of names.sort()) {
  if (!allowed.has(name) && !/^[0-9]{2}-[a-z-]+[.](stdout|stderr)[.]txt$/.test(name)) throw new Error('Unexpected proof output: ' + name);
  const file = path.join(root,name), stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2*1024*1024 || (total += stat.size) > 8*1024*1024) throw new Error('Proof byte bound exceeded');
  const bytes = await readFile(file);
  const codec = name.endsWith('.png') ? 'base64' : 'gzip-base64';
  const packed = codec === 'base64' ? bytes : gzipSync(bytes,{level:9,mtime:0});
  const encoded = packed.toString('base64');
  console.log('AYUDARIO_V2_FILE ' + JSON.stringify({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),codec,chunks:Math.ceil(encoded.length/3000)}));
  for (let offset=0;offset<encoded.length;offset+=3000) console.log('AYUDARIO_V2_CHUNK ' + JSON.stringify({name,index:offset/3000,data:encoded.slice(offset,offset+3000)}));
}
