// Service Worker: ทำให้ติดตั้งเป็นแอปได้ และเปิดหน้าเว็บได้เร็วขึ้น
// ไม่ยุ่งกับคำสั่งที่ส่งไป Google Sheet (POST / script.google.com) เพื่อให้ข้อมูลสดเสมอ
// แก้ไฟล์เว็บแล้วอยากให้เครื่องผู้ใช้โหลดใหม่ทันที: เปลี่ยนเลข VERSION ด้านล่าง
var VERSION = "v2";
var CACHE = "savings-" + VERSION;
var SHELL = [
  "./", "index.html", "config.js", "gas-bridge.js", "pwa.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/maskable-512.png", "icons/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf("savings-") === 0 && k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;                       // POST ไป Apps Script ผ่านตรง ๆ
  var url = new URL(req.url);
  if (url.hostname === "script.google.com" || url.hostname.endsWith("googleusercontent.com")) return;

  // network-first: ได้ไฟล์ล่าสุดเมื่อออนไลน์ ถ้าออฟไลน์ใช้ของที่แคชไว้
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && (res.ok || res.type === "opaque")) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error());
      });
    })
  );
});
