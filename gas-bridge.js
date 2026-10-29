/**
 * gas-bridge.js
 * จำลอง google.script.run ให้ใช้งานนอก Apps Script ได้ (เช่น GitHub Pages)
 * โค้ดเดิมใน index.html ที่เรียก google.script.run.withSuccessHandler(...).ชื่อฟังก์ชัน(...) ใช้ต่อได้เหมือนเดิม
 * ถ้าเปิดภายใน Apps Script เอง (มี google.script.run อยู่แล้ว) ไฟล์นี้จะไม่ทำอะไร
 */
(function () {
  if (window.google && window.google.script && window.google.script.run) return;

  var cfg = window.APP_CONFIG || {};
  var KEY_NAME = "savings_access_key";
  var pendingKey = null;

  function getKey() { try { return localStorage.getItem(KEY_NAME) || ""; } catch (e) { return ""; } }
  function setKey(v) { try { localStorage.setItem(KEY_NAME, v); } catch (e) {} }

  function askKey() {
    if (pendingKey) return pendingKey; // หลายคำสั่งชนกันพร้อมกัน ถามครั้งเดียว
    var p;
    if (window.Swal && Swal.fire) {
      p = Swal.fire({
        title: "ใส่รหัสเข้าใช้งานระบบ",
        input: "password",
        inputPlaceholder: "รหัสเข้าใช้งาน",
        confirmButtonText: "ตกลง",
        allowOutsideClick: false
      }).then(function (r) { return r.isConfirmed ? String(r.value || "") : ""; });
    } else {
      p = Promise.resolve(window.prompt("ใส่รหัสเข้าใช้งานระบบ") || "");
    }
    pendingKey = p.then(function (v) { pendingKey = null; return v; }, function () { pendingKey = null; return ""; });
    return pendingKey;
  }

  function call(fn, args, retried) {
    var url = cfg.API_URL || "";
    if (!url || url.indexOf("PASTE_") === 0) {
      return Promise.reject(new Error("ยังไม่ได้ตั้งค่า API_URL ในไฟล์ config.js"));
    }
    // ไม่ตั้ง Content-Type เอง => เป็น text/plain จึงไม่เกิด CORS preflight (Apps Script ไม่รองรับ OPTIONS)
    return fetch(url, {
      method: "POST",
      redirect: "follow",
      body: JSON.stringify({ fn: fn, args: args, key: getKey() })
    }).then(function (res) { return res.text(); }).then(function (text) {
      var j;
      try { j = JSON.parse(text); }
      catch (e) { throw new Error("เซิร์ฟเวอร์ตอบกลับผิดรูปแบบ (ตรวจว่า Deploy เป็น Anyone และใช้ URL ที่ลงท้าย /exec)"); }
      if (j && j.authRequired && !retried) {
        return askKey().then(function (k) {
          if (!k) throw new Error("ต้องใส่รหัสเข้าใช้งานก่อน");
          setKey(k);
          return call(fn, args, true);
        });
      }
      if (!j || !j.ok) {
        if (j && j.authRequired) { setKey(""); }
        throw new Error((j && j.error) || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ");
      }
      return j.result;
    });
  }

  function make(onOk, onFail) {
    return new Proxy({}, {
      get: function (_, name) {
        if (name === "withSuccessHandler") return function (f) { return make(f, onFail); };
        if (name === "withFailureHandler") return function (f) { return make(onOk, f); };
        if (name === "withUserObject") return function () { return make(onOk, onFail); };
        if (typeof name !== "string") return undefined;
        return function () {
          var args = Array.prototype.slice.call(arguments);
          call(name, args, false).then(
            function (r) { if (onOk) onOk(r); },
            function (e) { if (onFail) onFail(e); else console.error("[" + name + "]", e); }
          );
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = make(null, null);
})();
