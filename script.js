(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function de(zahl, stellen) {
    return zahl.toFixed(stellen).replace('.', ',');
  }
  function schnitt(v) {
    var n = v[1] + v[2] + v[3] + v[4] + v[5];
    if (!n) return null;
    return (v[1] + 2 * v[2] + 3 * v[3] + 4 * v[4] + 5 * v[5]) / n;
  }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- Sternkarte (Rechenbeispiel) ---------- */
  var karte = document.getElementById('karte');
  if (karte) {
    var BEISPIEL = { 5: 22, 4: 6, 3: 3, 2: 2, 1: 7 };
    var GEMELDET = 6; // sechs der sieben Ein-Stern-Bewertungen
    var gruppe = document.getElementById('karte-sterne');
    var saat = 20261115;
    var zufall = function () {
      saat = (saat * 1664525 + 1013904223) % 4294967296;
      return saat / 4294967296;
    };
    var punkte = [];
    var stufen = [5, 4, 3, 2, 1];
    stufen.forEach(function (stufe) {
      for (var i = 0; i < BEISPIEL[stufe]; i++) {
        var x, y, ok, versuche = 0;
        do {
          var r = 46 + Math.sqrt(zufall()) * 212;
          var w = zufall() * Math.PI * 2;
          x = 300 + Math.cos(w) * r;
          y = 300 + Math.sin(w) * r;
          ok = punkte.every(function (p) { return Math.hypot(p.x - x, p.y - y) > 44; });
          versuche++;
        } while (!ok && versuche < 400);
        punkte.push({ x: x, y: y, stufe: stufe, gemeldet: stufe === 1 && i < GEMELDET });
      }
    });

    // Sternbild: Linie durch die hellsten Punkte, jeweils zum nächsten Nachbarn
    var helle = punkte.filter(function (p) { return p.stufe === 5; });
    var kette = [helle.shift()];
    while (kette.length < 9 && helle.length) {
      var letzter = kette[kette.length - 1];
      helle.sort(function (a, b) {
        return Math.hypot(a.x - letzter.x, a.y - letzter.y) - Math.hypot(b.x - letzter.x, b.y - letzter.y);
      });
      kette.push(helle.shift());
    }
    el('path', {
      'class': 'bild',
      d: kette.map(function (p, i) { return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join('')
    }, gruppe);

    punkte.forEach(function (p) {
      var g = el('g', { 'class': 'stern' + (p.gemeldet ? ' gemeldet' : '') }, gruppe);
      var radius = 2.2 + p.stufe * 1.25;
      if (p.stufe === 5) {
        el('path', { 'class': 'strahl', d: 'M' + (p.x - 15) + ' ' + p.y + 'h30M' + p.x + ' ' + (p.y - 15) + 'v30' }, g);
      }
      el('circle', { 'class': 'kern', cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: radius }, g);
      if (p.gemeldet) {
        el('circle', { 'class': 'ring', cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 13 }, g);
        el('path', { 'class': 'strich', d: 'M' + (p.x - 13).toFixed(1) + ' ' + (p.y - 13).toFixed(1) + 'l26 26' }, g);
      }
    });

    var danach = { 5: BEISPIEL[5], 4: BEISPIEL[4], 3: BEISPIEL[3], 2: BEISPIEL[2], 1: BEISPIEL[1] - GEMELDET };
    var vorherWert = schnitt(BEISPIEL);
    var nachherWert = schnitt(danach);
    var gesamt = punkte.length;
    var leseVorher = document.getElementById('lese-vorher');
    var leseNachher = document.getElementById('lese-nachher');
    var leseAnzahl = document.getElementById('lese-anzahl');
    var knopf = document.getElementById('karte-knopf');
    leseVorher.textContent = de(vorherWert, 1);
    leseAnzahl.textContent = gesamt;
    var lauf = 0;

    function zaehle(von, bis, dauer) {
      var start = performance.now();
      var meiner = ++lauf;
      function schritt(jetzt) {
        if (meiner !== lauf) return;
        var t = Math.min(1, (jetzt - start) / dauer);
        var e = 1 - Math.pow(1 - t, 4);
        leseNachher.textContent = de(von + (bis - von) * e, 1);
        if (t < 1) requestAnimationFrame(schritt);
      }
      requestAnimationFrame(schritt);
    }

    knopf.addEventListener('click', function () {
      var entfernt = karte.getAttribute('data-zustand') !== 'entfernt';
      karte.setAttribute('data-zustand', entfernt ? 'entfernt' : 'markiert');
      knopf.setAttribute('aria-pressed', entfernt ? 'true' : 'false');
      knopf.textContent = entfernt ? 'Zurücksetzen' : 'Markierte entfernen';
      leseAnzahl.textContent = entfernt ? gesamt - GEMELDET : gesamt;
      lauf++;
      if (!entfernt) { leseNachher.textContent = '–'; return; }
      if (ruhig) { leseNachher.textContent = de(nachherWert, 1); return; }
      zaehle(vorherWert, nachherWert, 900);
    });
  }

  /* ---------- Rechner ---------- */
  var form = document.getElementById('rechner-form');
  if (form) {
    var PREIS = 50;
    var heute = document.getElementById('e-heute');
    var spaeter = document.getElementById('e-danach');
    var honorar = document.getElementById('e-honorar');
    var lies = function (feld) {
      var n = parseInt(feld.value, 10);
      return isNaN(n) || n < 0 ? 0 : n;
    };
    var rechne = function () {
      var v = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      form.querySelectorAll('[data-stufe]').forEach(function (f) { v[f.dataset.stufe] = lies(f); });
      var rest = { 1: v[1], 2: v[2], 3: v[3], 4: v[4], 5: v[5] };
      var weg = 0;
      form.querySelectorAll('[data-weg]').forEach(function (f) {
        var s = f.dataset.weg;
        var n = Math.min(lies(f), v[s]);
        f.max = v[s];
        rest[s] = v[s] - n;
        weg += n;
      });
      var a = schnitt(v);
      var b = schnitt(rest);
      var anzahl = v[1] + v[2] + v[3] + v[4] + v[5];
      if (a === null) {
        heute.innerHTML = '<span class="leer">Bitte Ihre Bewertungen eintragen</span>';
        spaeter.textContent = '–';
        honorar.textContent = '–';
        return;
      }
      heute.innerHTML = de(a, 1) + '<small>genau ' + de(a, 2) + ' bei ' + anzahl + ' Bewertungen</small>';
      spaeter.innerHTML = b === null ? '–' : de(b, 1) + '<small>genau ' + de(b, 2) + ' bei ' + (anzahl - weg) + ' Bewertungen</small>';
      honorar.innerHTML = (weg * PREIS).toLocaleString('de-DE') + ' €<small>' + weg + ' × ' + PREIS + ' € netto</small>';
    };
    form.addEventListener('input', rechne);
    form.querySelectorAll('input').forEach(function (f) {
      f.addEventListener('focus', function () { f.select(); });
    });
    rechne();
  }

  /* ---------- Schnellfeld oben übergibt den Link an das Formular ---------- */
  var schnell = document.getElementById('schnell');
  if (schnell) {
    schnell.addEventListener('submit', function (ereignis) {
      ereignis.preventDefault();
      var wert = document.getElementById('schnell-link').value.trim();
      var ziel = document.getElementById('profil');
      if (wert) ziel.value = wert;
      document.getElementById('anfrage').scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth' });
      window.setTimeout(function () {
        document.getElementById(wert ? 'name' : 'profil').focus({ preventScroll: true });
      }, ruhig ? 0 : 600);
    });
  }
})();
