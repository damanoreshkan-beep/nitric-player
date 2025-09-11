self.addEventListener('install',e=>{
  e.waitUntil(caches.open('cassette-v1').then(c=>c.addAll([
    './','./index.html', './main.js','./manifest.webmanifest',
    './cassette.jpg','./cassette-map.png','./cassette-dxmap.png',
    './icons/icon-192.png','./icons/icon-512.png'
  ])));
});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
