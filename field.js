/* Archive field: pan, pinch-zoom, filters, bloom, expanded view */
(function () {
  function initField(root, opts) {
    var embedded = !!(opts && opts.embedded);
    var items = window.IB_ITEMS || [];
    var COLS = 16, ROWS = 12, CW = 240, CH = 220;
    var field = root.querySelector('.ib-field');
    var hint = root.querySelector('.ib-hint');
    var overlay = root.querySelector('.ib-overlay');
    var ovImg = overlay.querySelector('img'), ovName = overlay.querySelector('p');
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var cam = { x: 0, y: 0, s: 0.6 }, tgt = { x: 0, y: 0, s: 0.6 };
    var filter = 'All', pool = [], open = -1, touched = false, moved = false, drag = null, lastKey = '';
    var seeds = [];
    for (var i = 0; i < COLS * ROWS; i++) { var x = Math.sin(i * 12.9898) * 43758.5453; seeds.push((x - Math.floor(x)) * 0.65); }

    var tiles = [];
    for (var k = 0; k < COLS * ROWS; k++) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ib-tile';
      b.innerHTML = '<span class="ib-in"><img alt="" draggable="false" loading="lazy"></span><span class="ib-label"></span>';
      (function (idx) { b.addEventListener('click', function () { if (moved) { moved = false; return; } openPiece(b._item); }); })(k);
      field.appendChild(b); tiles.push(b);
    }
    function assign() {
      pool = [];
      items.forEach(function (it, i) { if (filter === 'All' || it.tech.toLowerCase().indexOf(filter.toLowerCase()) >= 0) pool.push(i); });
      tiles.forEach(function (t, k) {
        var col = k % COLS, row = Math.floor(k / COLS);
        var i = pool[(col * 5 + row * 3) % pool.length];
        var it = items[i]; t._item = i;
        var img = t.querySelector('img'); if (img.getAttribute('src') !== it.src) img.src = it.src;
        t.querySelector('.ib-label').textContent = it.title;
        t.setAttribute('aria-label', 'Open ' + it.title);
      });
      lastKey = '';
    }
    root.querySelectorAll('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filter = btn.getAttribute('data-filter');
        root.querySelectorAll('[data-filter]').forEach(function (o) { var on = o === btn; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        assign();
      });
    });
    function touch() { if (!touched) { touched = true; if (hint) hint.style.opacity = '0'; } }
    function zoomAt(px, py, f) {
      var ns = Math.max(0.42, Math.min(2.4, tgt.s * f));
      var wx = tgt.x + px / tgt.s, wy = tgt.y + py / tgt.s;
      tgt.s = ns; tgt.x = wx - px / ns; tgt.y = wy - py / ns;
    }
    function zoomBy(f) { var r = field.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, f); touch(); }
    var zi = root.querySelector('[data-zoom-in]'), zo = root.querySelector('[data-zoom-out]');
    if (zi) zi.addEventListener('click', function () { zoomBy(1.35); });
    if (zo) zo.addEventListener('click', function () { zoomBy(1 / 1.35); });

    field.addEventListener('wheel', function (e) {
      if (open >= 0) return;
      var vh = window.innerHeight;
      var rr = root.getBoundingClientRect();
      var reached = rr.top <= 8 && rr.bottom >= vh - 8;
      var inline = embedded && !reached;
      if (inline && !(e.ctrlKey || e.metaKey) && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) return;
      e.preventDefault(); touch();
      var r = field.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) { zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.012)); return; }
      var k = e.deltaMode === 1 ? 32 : 1;
      tgt.x += e.deltaX * k / tgt.s;
      if (!inline) tgt.y += e.deltaY * k / tgt.s;
    }, { passive: false });
    var pts = {}, pinch = null;
    function pdist() { var k = Object.keys(pts); var a = pts[k[0]], b = pts[k[1]]; return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    field.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (Object.keys(pts).length === 2) { pinch = pdist(); drag = null; moved = true; touch(); return; }
      moved = false; drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, vx: 0, vy: 0 };
    });
    window.addEventListener('pointermove', function (e) {
      if (pts[e.pointerId]) pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pinch && Object.keys(pts).length === 2) {
        var n = pdist(), r = field.getBoundingClientRect();
        zoomAt(n.x - r.left, n.y - r.top, n.d / Math.max(1, pinch.d));
        tgt.x -= (n.x - pinch.x) / tgt.s; tgt.y -= (n.y - pinch.y) / tgt.s;
        pinch = n; return;
      }
      if (!drag) return;
      var dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
      if (!moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) { moved = true; field.classList.add('grab'); touch(); }
      if (moved) { tgt.x -= dx / tgt.s; tgt.y -= dy / tgt.s; cam.x = tgt.x; cam.y = tgt.y; drag.vx = dx; drag.vy = dy; }
      drag.lx = e.clientX; drag.ly = e.clientY;
    });
    function up(e) {
      if (e && pts[e.pointerId]) delete pts[e.pointerId];
      if (Object.keys(pts).length < 2) pinch = null;
      if (!drag) return;
      if (moved && !reduce) { tgt.x -= drag.vx * 14 / tgt.s; tgt.y -= drag.vy * 14 / tgt.s; }
      drag = null; field.classList.remove('grab');
    }
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);

    function openPiece(i) { open = i; var it = items[i]; ovImg.src = it.src; ovImg.alt = it.title; ovName.textContent = it.title; overlay.hidden = false; }
    function closePiece() { open = -1; overlay.hidden = true; }
    overlay.querySelector('.x').addEventListener('click', closePiece);
    overlay.querySelector('.pv').addEventListener('click', function () { openPiece((open - 1 + items.length) % items.length); });
    overlay.querySelector('.nx').addEventListener('click', function () { openPiece((open + 1) % items.length); });
    window.addEventListener('keydown', function (e) {
      if (open < 0) return;
      if (e.key === 'Escape') closePiece();
      if (e.key === 'ArrowRight') openPiece((open + 1) % items.length);
      if (e.key === 'ArrowLeft') openPiece((open - 1 + items.length) % items.length);
    });

    var w = window.innerWidth || 1440;
    var s0 = Math.max(0.42, Math.min(1.6, (w / (w < 720 ? 4 : 9)) / CW));
    cam.s = tgt.s = s0; cam.x = tgt.x = CW * 0.35; cam.y = tgt.y = -60 / s0;
    var t0 = performance.now();
    function mod(a, m) { return ((a % m) + m) % m; }
    function tick() {
      requestAnimationFrame(tick);
      var k = reduce ? 1 : 0.14;
      cam.x += (tgt.x - cam.x) * k; cam.y += (tgt.y - cam.y) * k; cam.s += (tgt.s - cam.s) * k;
      var p = 1;
      if (!reduce) {
        if (embedded) { var r = root.getBoundingClientRect(); p = Math.max(0, Math.min(1, 1 - r.top / (window.innerHeight * 0.85))); }
        else p = Math.max(0, Math.min(1, (performance.now() - t0) / 1400));
      }
      var key = cam.x.toFixed(2) + ',' + cam.y.toFixed(2) + ',' + cam.s.toFixed(4) + ',' + p.toFixed(3);
      if (key === lastKey) return; lastKey = key;
      var W = COLS * CW, H = ROWS * CH;
      for (var i = 0; i < tiles.length; i++) {
        var bx = (i % COLS) * CW, by = Math.floor(i / COLS) * CH;
        var wx = mod(bx - cam.x + CW, W) - CW, wy = mod(by - cam.y + CH, H) - CH;
        tiles[i].style.transform = 'translate3d(' + (wx * cam.s).toFixed(2) + 'px,' + (wy * cam.s).toFixed(2) + 'px,0) scale(' + cam.s.toFixed(4) + ')';
        var q = Math.max(0, Math.min(1, (p - seeds[i]) / 0.35)), e2 = 1 - Math.pow(1 - q, 3);
        tiles[i].firstElementChild.style.transform = q >= 1 ? '' : 'scale(' + (0.04 + 0.96 * e2).toFixed(3) + ')';
      }
    }
    assign(); requestAnimationFrame(tick);
  }
  window.IBField = { init: initField };
})();
