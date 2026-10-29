// Service Worker: จำเป็นเพื่อให้เบราว์เซอร์ยอมให้ "ติดตั้งแอป"
// ใช้ network-first: ออนไลน์จะได้ไฟล์ล่าสุดจาก GitHub เสมอ (แก้ index.html แล้วเห็นผลทันที)
// ไม่ยุ่งกับคำขอไป Apps Script (ข้ามโดเมน/POST) เพื่อไม่ให้ข้อมูลเก่าค้าง
const CACHE = 'savings-shell-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
