// Gerado por tools/build-sw.mjs — não editar à mão.
const VERSION = 'cf1849153f';
const CACHE = 'mode2030-' + VERSION;
const ASSETS = ['./', 'css/app.css', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'img/ex/Band_Assisted_Pull-Up/0.jpg', 'img/ex/Band_Assisted_Pull-Up/1.jpg', 'img/ex/Barbell_Bench_Press_-_Medium_Grip/0.jpg', 'img/ex/Barbell_Bench_Press_-_Medium_Grip/1.jpg', 'img/ex/Barbell_Hip_Thrust/0.jpg', 'img/ex/Barbell_Hip_Thrust/1.jpg', 'img/ex/Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg', 'img/ex/Barbell_Incline_Bench_Press_-_Medium_Grip/1.jpg', 'img/ex/Barbell_Squat/0.jpg', 'img/ex/Barbell_Squat/1.jpg', 'img/ex/Bent_Over_Barbell_Row/0.jpg', 'img/ex/Bent_Over_Barbell_Row/1.jpg', 'img/ex/Cable_Crossover/0.jpg', 'img/ex/Cable_Crossover/1.jpg', 'img/ex/Cable_Crunch/0.jpg', 'img/ex/Cable_Crunch/1.jpg', 'img/ex/Cable_Rope_Overhead_Triceps_Extension/0.jpg', 'img/ex/Cable_Rope_Overhead_Triceps_Extension/1.jpg', 'img/ex/Cable_Seated_Lateral_Raise/0.jpg', 'img/ex/Cable_Seated_Lateral_Raise/1.jpg', 'img/ex/Dips_-_Chest_Version/0.jpg', 'img/ex/Dips_-_Chest_Version/1.jpg', 'img/ex/Dumbbell_Bicep_Curl/0.jpg', 'img/ex/Dumbbell_Bicep_Curl/1.jpg', 'img/ex/Dumbbell_Shoulder_Press/0.jpg', 'img/ex/Dumbbell_Shoulder_Press/1.jpg', 'img/ex/Face_Pull/0.jpg', 'img/ex/Face_Pull/1.jpg', 'img/ex/Hammer_Curls/0.jpg', 'img/ex/Hammer_Curls/1.jpg', 'img/ex/Hanging_Leg_Raise/0.jpg', 'img/ex/Hanging_Leg_Raise/1.jpg', 'img/ex/Incline_Dumbbell_Press/0.jpg', 'img/ex/Incline_Dumbbell_Press/1.jpg', 'img/ex/Leg_Extensions/0.jpg', 'img/ex/Leg_Extensions/1.jpg', 'img/ex/Leg_Press/0.jpg', 'img/ex/Leg_Press/1.jpg', 'img/ex/Lying_Leg_Curls/0.jpg', 'img/ex/Lying_Leg_Curls/1.jpg', 'img/ex/Machine_Shoulder_Military_Press/0.jpg', 'img/ex/Machine_Shoulder_Military_Press/1.jpg', 'img/ex/One-Arm_Dumbbell_Row/0.jpg', 'img/ex/One-Arm_Dumbbell_Row/1.jpg', 'img/ex/Plank/0.jpg', 'img/ex/Plank/1.jpg', 'img/ex/Preacher_Curl/0.jpg', 'img/ex/Preacher_Curl/1.jpg', 'img/ex/Reverse_Machine_Flyes/0.jpg', 'img/ex/Reverse_Machine_Flyes/1.jpg', 'img/ex/Romanian_Deadlift/0.jpg', 'img/ex/Romanian_Deadlift/1.jpg', 'img/ex/Seated_Cable_Rows/0.jpg', 'img/ex/Seated_Cable_Rows/1.jpg', 'img/ex/Seated_Calf_Raise/0.jpg', 'img/ex/Seated_Calf_Raise/1.jpg', 'img/ex/Seated_Leg_Curl/0.jpg', 'img/ex/Seated_Leg_Curl/1.jpg', 'img/ex/Side_Lateral_Raise/0.jpg', 'img/ex/Side_Lateral_Raise/1.jpg', 'img/ex/Split_Squat_with_Dumbbells/0.jpg', 'img/ex/Split_Squat_with_Dumbbells/1.jpg', 'img/ex/Standing_Calf_Raises/0.jpg', 'img/ex/Standing_Calf_Raises/1.jpg', 'img/ex/Triceps_Pushdown/0.jpg', 'img/ex/Triceps_Pushdown/1.jpg', 'img/ex/Wide-Grip_Lat_Pulldown/0.jpg', 'img/ex/Wide-Grip_Lat_Pulldown/1.jpg', 'index.html', 'js/app.js', 'js/foods-db.js', 'js/logic.js', 'js/seed.js', 'js/store.js', 'js/ui.js', 'js/util.js', 'js/views/comida.js', 'js/views/definicoes.js', 'js/views/hoje.js', 'js/views/progresso.js', 'js/views/sessao.js', 'js/views/treino.js', 'js/widgets.js', 'manifest.webmanifest'];

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
