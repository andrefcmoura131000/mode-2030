// Gera sw.js com a lista de ficheiros e uma versão calculada a partir do conteúdo.
// Correr depois de cada alteração, antes de publicar:  node tools/build-sw.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const include = ['index.html', 'manifest.webmanifest', 'css', 'js', 'icons', 'img'];
const files = [];
const walk = (p) => {
  const st = statSync(p);
  if (st.isDirectory()) for (const f of readdirSync(p)) walk(join(p, f));
  else files.push(p);
};
for (const i of include) walk(join(root, i));

const hash = createHash('sha256');
const rel = files.map((f) => relative(root, f).split(sep).join('/')).sort();
for (const r of rel) { hash.update(r); hash.update(readFileSync(join(root, r))); }
const version = hash.digest('hex').slice(0, 10);

const sw = `// Gerado por tools/build-sw.mjs — não editar à mão.
const VERSION = '${version}';
const CACHE = 'mode2030-' + VERSION;
const ASSETS = ['./', ${rel.map((r) => `'${r}'`).join(', ')}];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('./') : null);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return new Response('Sem ligação', { status: 503, statusText: 'offline' });
    }
  })());
});
`;
writeFileSync(join(root, 'sw.js'), sw);
console.log(`sw.js: versão ${version}, ${rel.length + 1} ficheiros em cache`);
