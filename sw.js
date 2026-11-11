const CACHE='kuttab-ghazali-v7';
const FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','three.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE&&!x.startsWith('kg-')).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
function save(req,res){if(res&&res.status===200&&(res.type==='basic'||res.type==='cors')){const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));}return res;}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;if(req.headers.get('range')||/\.mp4($|\?)/.test(req.url))return;
  // Halaman utama: ambil dari internet dulu agar pembaruan langsung tampil; cache hanya saat offline.
  if(req.mode==='navigate'||req.destination==='document'){
    e.respondWith(fetch(req).then(r=>save(req,r)).catch(()=>caches.match(req).then(h=>h||caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit=>{const net=fetch(req).then(r=>save(req,r)).catch(()=>hit);return hit||net;}));
});
