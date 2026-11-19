/* АгроҲимоя — service worker: сайт телефонга ўрнатилади ва интернетсиз ҳам охирги очилган маълумотни кўрсатади.
 * Саҳифалар ва маълумот (data/*.json) — аввал тармоқдан (янгиси), тармоқ бўлмаса — кешдан (охирги нусха).
 * JS/CSS/расмлар — кешдан дарҳол, орқада янгиланади. Фақат шу сайт файллари (бошқа доменлар кешланмайди).
 * Кеш калити сўров параметрларисиз (?v=, ?h=) — ҳар файлнинг битта охирги нусхаси сақланади. */
"use strict";
var CACHE = "agrohimoya-v1";
var SHELL = ["index.html", "index.ru.html", "css/style.css", "js/auth.js", "js/main.js", "manifest.webmanifest", "img/icon-192.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return Promise.all(SHELL.map(function (f) { return fetch(f).then(function (r) { return put(bare(new URL(f, self.registration.scope).href), r); }); })); }).catch(function () { /* ўрнатишга халақит бермасин */ }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("agrohimoya-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// маълумот ва саҳифалар: калит параметрларсиз (?h= ҳар соат ўзгаради) — битта охирги нусха;
// JS/CSS: калит тўлиқ URL (?v= версия) — янги версия кешдан эски нусха билан алмашмайди; эски версиялар ўчирилади
function bare(url) { var u = new URL(url); u.search = ""; u.hash = ""; return u.href; }
function put(k, res, prune) {
  if (!res || !res.ok || res.type === "opaque") return Promise.resolve();
  var copy = res.clone();
  return caches.open(CACHE).then(function (c) {
    var done = c.put(k, copy);
    if (!prune) return done;
    return c.keys().then(function (ks) {
      return Promise.all(ks.filter(function (r) { return r.url !== k && bare(r.url) === bare(k); }).map(function (r) { return c.delete(r); }));
    }).then(function () { return done; });
  }).catch(function () {});
}
function match(k, loose) { return caches.open(CACHE).then(function (c) { return c.match(k, loose ? { ignoreSearch: true } : undefined); }); }

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var u = new URL(req.url);
  if (u.origin !== self.location.origin) return;
  var data = /\/data\//.test(u.pathname), page = req.mode === "navigate" || /\.html$/.test(u.pathname);
  if (data || page) { // тармоқдан, бўлмаса кешдан
    var k = bare(req.url);
    e.respondWith(fetch(req).then(function (res) { e.waitUntil(put(k, res)); return res; }).catch(function () {
      return match(k).then(function (r) {
        if (r) return r;
        if (!page) return Response.error();
        return match(new URL("index.html", self.registration.scope).href).then(function (h) { return h || Response.error(); });
      });
    }));
    return;
  }
  e.respondWith(match(req.url).then(function (hit) { // кешдан дарҳол, орқада янгилаш
    var net = fetch(req).then(function (res) { e.waitUntil(put(req.url, res, true)); return res; });
    if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
    return net.catch(function () { return match(req.url, true).then(function (r) { return r || Response.error(); }); });
  }));
});
