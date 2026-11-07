import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", ".vercel", "tmp"].includes(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.isFile()) files.push(target);
    else throw new Error(`Unexpected source entry: ${target}`);
  }
}
await walk(root);
for (const file of files) {
  if (/\.(m?js)$/.test(file)) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || `Invalid JavaScript: ${file}`);
  } else if (file.endsWith(".json")) JSON.parse(await readFile(file, "utf8"));
}
console.log(`Syntax and JSON checks passed: ${files.length} source files`);
