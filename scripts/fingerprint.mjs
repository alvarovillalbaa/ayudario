import { execFileSync } from "node:child_process";
import { readFile, writeFile, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";

if (process.argv.length !== 3) throw new Error("An owned proof output path is required");
const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const files = [];
for (const path of paths) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Unsupported source entry: ${path}`);
  const body = await readFile(path);
  files.push({ path, bytes: body.length, sha256: createHash("sha256").update(body).digest("hex") });
}
const result = { head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), files };
await writeFile(process.argv[2], `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
console.log(`Recorded ${files.length} tracked source files at ${result.head}`);
