// Return visits (performance phase 2): the site's code and art in /_astro/ (each file named by
// its contents, so never changed in place) are kept here once fetched, and a return visit takes
// them from here, even after the browser's own cache has let them go. Pages and everything else
// go to the network as usual, so a new upload shows straight away; files a new upload no longer
// uses age out (only the newest KEEP are kept: room for two uploads' worth, the city's textures made
// at build time included, a hundred or so of them a device).
const CACHE = 'astro-v1';
const KEEP = 400;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - KEEP))) await cache.delete(k);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/_astro/')) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') e.waitUntil(cache.put(req, res.clone()).then(() => trim(cache)));
      return res;
    })
  );
});
