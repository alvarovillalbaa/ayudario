import http from "node:http";
import { readFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = await realpath(fileURLToPath(new URL("../public/", import.meta.url)));
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid local port");
const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };
const server = http.createServer(async (request, response) => {
  for (const header of config.headers[0].headers) response.setHeader(header.key, header.value);
  if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405, { Allow: "GET, HEAD" }).end(); return; }
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const decoded = decodeURIComponent(url.pathname);
    const target = await realpath(path.resolve(root, `.${decoded === "/" ? "/index.html" : decoded}`));
    if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Outside public directory");
    const body = await readFile(target);
    response.writeHead(200, { "Content-Type": mime[path.extname(target)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }).end("No encontrado");
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Ayudario http://127.0.0.1:${port}`));
for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => server.close(() => process.exit(0)));
