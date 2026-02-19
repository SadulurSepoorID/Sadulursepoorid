// Naikkan versi jika ada update besar
const CACHE_NAME = 'ctc-cakung-v2'; 
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './jadwal.json',
    './manifest.json'
];

// Install & Simpan Cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting(); // Paksa SW baru langsung jalan
});

// Bersihkan Cache versi lama (v1)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// STRATEGI: NETWORK FIRST (Utamakan kode terbaru, offline baru pakai cache)
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Jika server jalan (online), simpan kode terbarunya ke cache
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            })
            .catch(() => {
                // Jika server mati (offline), baru tampilkan dari cache memori
                return caches.match(event.request);
            })
    );
});