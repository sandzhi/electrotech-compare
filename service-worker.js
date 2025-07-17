const CACHE_NAME = 'electrotech-cache-v3';  // Изменил версию для обновления кэша
const OFFLINE_URL = '/offline.html';  // Вынес в константу
const urlsToCache = [
  '/',
  '/index.html',
  '/catalog.html',
  '/compare.html',
  '/feedback.html',
  '/style.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/images/coil.jpg',
  '/images/switch.jpg',
  '/images/magnet.jpg',
  OFFLINE_URL  // Добавил оффлайн-страницу в кэш
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Cache installation failed:', err);
      })
  );
});

self.addEventListener('fetch', event => {
  // Пропускаем не-GET запросы и chrome-extension
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Возвращаем кэшированный ответ, если есть
        if (cachedResponse) {
          return cachedResponse;
        }

        // Для HTML-документов используем network-first стратегию
        if (event.request.headers.get('accept').includes('text/html')) {
          return fetch(event.request)
            .then(networkResponse => {
              // Клонируем ответ для кэширования
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
              return networkResponse;
            })
            .catch(() => {
              // Если сеть недоступна, показываем оффлайн-страницу
              return caches.match(OFFLINE_URL);
            });
        }

        // Для остальных ресурсов используем cache-first стратегию
        return fetch(event.request)
          .then(networkResponse => {
            // Кэшируем только успешные ответы
            if (networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => {
            // Для не-HTML ресурсов возвращаем undefined при ошибке
            return undefined;
          });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();  // Активное управление клиентами
      })
  );
});