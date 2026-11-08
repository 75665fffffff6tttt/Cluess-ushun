/* Спутник харита — Leaflet + Esri World Imagery (бепул, калитсиз).
 * Устида Ўзбекистон туман чегаралари (geoBoundaries ADM2, CC-BY 4.0).
 * Спутникда деҳқончилик ерлари (суғориладиган воҳалар) реал кўринади. */
(function () {
  "use strict";
  if (!window.L) return;
  var LANG = (document.documentElement.lang || "").toLowerCase().indexOf("ru") === 0 ? "ru" : "uz";
  var T = LANG === "ru" ? {
    sat: "Спутник", labels: "Названия и границы", districts: "Границы районов",
    region: "Область", hint: "Прокрутка — масштаб, перетаскивание — сдвиг. Наведите на район.",
    loading: "Загрузка границ районов…"
  } : {
    sat: "Спутник", labels: "Номлар ва чегаралар", districts: "Туман чегаралари",
    region: "Вилоят", hint: "Ғилдирак — масштаб, суриш — силжитиш. Туман устига олиб келинг.",
    loading: "Туман чегаралари юкланмоқда…"
  };
  var el = document.getElementById("map"); if (!el) return;

  var map = L.map(el, { minZoom: 5, maxZoom: 17, zoomControl: true, attributionControl: true }).setView([41.4, 63.9], 6);

  var imagery = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 18, attribution: "Tiles &copy; Esri — World Imagery, Maxar, Earthstar Geographics"
  }).addTo(map);
  var labels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 18
  });

  var normal = { color: "#ffe082", weight: 1, opacity: 0.85, fill: true, fillColor: "#ffffff", fillOpacity: 0.03 };
  var hover = { color: "#fff176", weight: 2.4, opacity: 1, fillColor: "#fff59d", fillOpacity: 0.18 };

  var dLayer = L.geoJSON(null, {
    style: function () { return normal; },
    onEachFeature: function (f, lyr) {
      var p = f.properties || {};
      var nm = LANG === "ru" ? (p.n || p.c) : (p.c || p.n);
      var rc = p.rc || "";
      lyr.bindTooltip("<b>" + nm + "</b>" + (rc ? "<br>" + rc : ""), { sticky: true, direction: "top", opacity: 0.95 });
      lyr.on("mouseover", function () { lyr.setStyle(hover); lyr.bringToFront(); });
      lyr.on("mouseout", function () { dLayer.resetStyle(lyr); });
    }
  }).addTo(map);

  var status = document.getElementById("map-status");
  if (status) status.textContent = T.loading;
  fetch("data/uz-districts.geojson").then(function (r) { return r.json(); }).then(function (gj) {
    dLayer.addData(gj);
    try { map.fitBounds(dLayer.getBounds(), { padding: [12, 12] }); } catch (e) {}
    if (status) status.textContent = T.hint;
  }).catch(function () { if (status) status.textContent = ""; });

  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
  // қатлам бошқаруви: overlay = номлар/чегаралар, туман чегаралари
  var overlays = {}; overlays[T.labels] = labels; overlays[T.districts] = dLayer;
  L.control.layers(null, overlays, { position: "topright", collapsed: false }).addTo(map);
})();
