/**
 * pwa.js — ลงทะเบียน Service Worker + ปุ่มชวนติดตั้งแอป
 * Android/Chrome: แสดงปุ่ม "ติดตั้งแอป" / iPhone (Safari): แสดงคำแนะนำ Share > เพิ่มไปยังหน้าจอโฮม
 */
(function () {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function (e) { console.warn("SW:", e); });
    });
  }

  var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (standalone) return;                                  // ติดตั้งแล้ว ไม่ต้องชวน

  var DISMISS = "pwa_install_dismissed";
  function dismissed() { try { return localStorage.getItem(DISMISS) === "1"; } catch (e) { return false; } }
  function remember() { try { localStorage.setItem(DISMISS, "1"); } catch (e) {} }

  function banner(text, btnText, onBtn) {
    if (dismissed() || document.getElementById("pwaBanner")) return;
    var st = document.createElement("style");
    st.textContent =
      "#pwaBanner{position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;max-width:420px;margin:0 auto;" +
      "display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff;border-radius:14px;" +
      "box-shadow:0 6px 24px rgba(0,0,0,.22);font:500 14px/1.4 'IBM Plex Sans Thai',sans-serif;color:#242e35}" +
      "#pwaBanner img{width:40px;height:40px;border-radius:10px;flex:none}" +
      "#pwaBanner span{flex:1}" +
      "#pwaBanner button{border:0;border-radius:10px;padding:8px 14px;font:inherit;cursor:pointer}" +
      "#pwaInstallBtn{background:#4892d0;color:#fff}" +
      "#pwaCloseBtn{background:transparent;color:#888;padding:8px}";
    document.head.appendChild(st);
    var b = document.createElement("div");
    b.id = "pwaBanner";
    b.innerHTML = '<img src="icons/icon-192.png" alt=""><span></span>' +
      (btnText ? '<button id="pwaInstallBtn"></button>' : '') + '<button id="pwaCloseBtn" aria-label="ปิด">✕</button>';
    b.querySelector("span").textContent = text;
    if (btnText) {
      var ib = b.querySelector("#pwaInstallBtn");
      ib.textContent = btnText;
      ib.onclick = onBtn;
    }
    b.querySelector("#pwaCloseBtn").onclick = function () { remember(); b.remove(); };
    document.body.appendChild(b);
  }

  // Android / Chrome / Edge
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    banner("ติดตั้งระบบออมเงินไว้บนหน้าจอมือถือ", "ติดตั้งแอป", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.finally(function () {
        deferred = null;
        var el = document.getElementById("pwaBanner");
        if (el) el.remove();
      });
    });
  });
  window.addEventListener("appinstalled", function () {
    var el = document.getElementById("pwaBanner");
    if (el) el.remove();
  });

  // iPhone / iPad (Safari ไม่มี beforeinstallprompt)
  var ua = navigator.userAgent;
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  if (isIOS && isSafari) {
    window.addEventListener("load", function () {
      setTimeout(function () {
        banner("ติดตั้งแอป: แตะปุ่มแชร์ แล้วเลือก “เพิ่มไปยังหน้าจอโฮม”", null, null);
      }, 2500);
    });
  }
})();
