const CACHE_NAME = 'smartstudy-v2';
const BASE = '/SmartStudy';

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.add(BASE + '/index.html');
    }).catch(function(err){ console.log('Cache install error', err); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Supabase API - always network
  if (url.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(function(){
        return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }

  // Google Fonts - network only
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(fetch(e.request).catch(function(){ return new Response(''); }));
    return;
  }

  // Navigation requests (app launch, refresh) - always serve index.html
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match(BASE + '/index.html').then(function(cached) {
        return cached || fetch(BASE + '/index.html');
      })
    );
    return;
  }

  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function(){
        return caches.match(BASE + '/index.html');
      });
    })
  );
});
