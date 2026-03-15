// Versão do cache incrementada para forçar a atualização
const CACHE_NAME = 'mapa-trabalho-app-v9'; 
const MAP_CACHE_NAME = 'mapa-trabalho-tiles-v9';

// Assets para cache offline
const CORE_ASSETS = [
    './', // A raiz da aplicação
    './index.html',
    './gestor.html',
    './operador.html',
    './style.css',
    './login-style.css',
    './gestor.js',
    './operador.js',
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css',
    'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js'
];

self.addEventListener('install', event => {
    console.log('SW: Instalando nova versão do Service Worker...');
    self.skipWaiting(); // Força o novo SW a se tornar ativo mais rapidamente.
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('SW: Salvando assets principais em cache.');
            return cache.addAll(CORE_ASSETS);
        })
    );
});

self.addEventListener('activate', event => {
    console.log('SW: Ativando e limpando caches antigos...');
    event.waitUntil(clients.claim()); // Torna o SW o controlador da página imediatamente.
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Deleta qualquer cache que não seja o atual
                    if (cacheName !== CACHE_NAME && cacheName !== MAP_CACHE_NAME) {
                        console.log('SW: Deletando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    if (requestUrl.hostname.includes('api.meu-portfolio.com')) {
        return; 
    }

    if (requestUrl.hostname.includes('tile.openstreetmap.org')) {
        event.respondWith(
            caches.open(MAP_CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    // Retorna do cache se existir, mas sempre busca uma nova versão em segundo plano.
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        })
    );
});
