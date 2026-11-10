/* Indigo Blue field: pan, zoom, filters, piece view, commission requests */
(function () {
  function initField(root, opts) {
    var embedded = !!(opts && opts.embedded);
    var items = window.IB_ITEMS || [];
    var cfg = window.IB_CONFIG || {};
    var Cart = window.IBCart;
    var COLS = 16, ROWS = 12, CW = 240, CH = 220;
    var field = root.querySelector('.ib-field');
    var hint = root.querySelector('.ib-hint');
    var ov = root.querySelector('[data-piece]');
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var cam = { x: 0, y: 0, s: 0.6 }, tgt = { x: 0, y: 0, s: 0.6 };
    var tech = 'All', availOnly = false, anchor = null, exactN = 0;
    var open = -1, touched = false, moved = false, drag = null, lastKey = '';
    var seeds = [];
    for (var i = 0; i < COLS * ROWS; i++) { var sx = Math.sin(i * 12.9898) * 43758.5453; seeds.push((sx - Math.floor(sx)) * 0.65); }

    // tiles
    var tiles = [];
    for (var k = 0; k < COLS * ROWS; k++) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ib-tile';
      b.innerHTML = '<span class="ib-in"><img alt="" draggable="false" loading="lazy"></span><span class="ib-label"></span><span class="ib-tag"></span>';
      b.addEventListener('click', function (e) { if (moved) { moved = false; return; } openPiece(e.currentTarget._item, true); });
      field.appendChild(b); tiles.push(b);
    }
    function techOk(it, t) { return t === 'All' || it.tech.toLowerCase().indexOf(t.toLowerCase()) >= 0; }
    function matches(it) { return (!availOnly || it.status === 'available') && techOk(it, tech); }
    function assign() {
      var pool = [];
      items.forEach(function (it, i) { if (matches(it)) pool.push(i); });
      exactN = availOnly ? pool.length : 0;
      tiles.forEach(function (t, k) {
        var i;
        if (availOnly) { i = k < pool.length ? pool[k] : -1; }
        else { var col = k % COLS, row = Math.floor(k / COLS); i = pool.length ? pool[(col * 5 + row * 3) % pool.length] : -1; }
        t.hidden = i < 0; t._item = i;
        if (i < 0) return;
        var it = items[i];
        var img = t.querySelector('img'); if (img.getAttribute('src') !== it.src) img.src = it.src;
        t.querySelector('.ib-label').textContent = it.title;
        t.querySelector('.ib-tag').textContent = it.status === 'available' ? '$' + it.price : '';
        t.setAttribute('aria-label', it.title + (it.status === 'available' ? ', $' + it.price : ''));
      });
      lastKey = '';
    }
    function setAnchor() {
      var vw = field.clientWidth / tgt.s;
      var c0 = Math.max(0, Math.ceil(tgt.x / CW - 0.15)), r0 = Math.max(0, Math.ceil(tgt.y / CH - 0.15));
      var last = Math.floor((tgt.x + vw) / CW + 0.15) - 1;
      anchor = { c0: c0, r0: r0, fit: Math.max(1, last - c0 + 1), x: tgt.x, y: tgt.y };
    }
    root.querySelectorAll('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tech = btn.getAttribute('data-filter');
        root.querySelectorAll('[data-filter]').forEach(function (o) { var on = o === btn; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        assign();
      });
    });
    var av = root.querySelector('[data-avail]');
    if (av) av.addEventListener('click', function () {
      availOnly = !availOnly;
      if (availOnly) setAnchor();
      av.classList.toggle('on', availOnly); av.setAttribute('aria-checked', availOnly ? 'true' : 'false');
      assign();
    });

    // camera
    function bounds(sc) {
      var vw = field.clientWidth / sc, vh = field.clientHeight / sc;
      if (exactN && anchor) {
        var rows = Math.ceil(exactN / anchor.fit), cols = Math.min(anchor.fit, exactN);
        return { x0: Math.min(anchor.x, anchor.c0 * CW - 40), x1: Math.max(anchor.x, (anchor.c0 + cols) * CW - vw + 40),
                 y0: Math.min(anchor.y, anchor.r0 * CH - 96 / sc), y1: Math.max(anchor.y, (anchor.r0 + rows) * CH - vh + 80 / sc) };
      }
      var W = COLS * CW, H = ROWS * CH, x0 = -40, x1 = W - vw + 40, y0 = -96 / sc, y1 = H - vh + 80 / sc;
      if (x1 < x0) { x0 = x1 = (W - vw) / 2; }
      if (y1 < y0) { y0 = y1 = -60 / sc; }
      return { x0: x0, x1: x1, y0: y0, y1: y1 };
    }
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
      var rr = root.getBoundingClientRect(), vh = window.innerHeight;
      var reached = rr.top <= 8 && rr.bottom >= vh - 8;
      var inline = embedded && !reached;
      var vertical = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
      if (inline && !(e.ctrlKey || e.metaKey) && vertical) return;
      if (embedded && !(e.ctrlKey || e.metaKey) && vertical && e.deltaY < 0 && tgt.y <= bounds(tgt.s).y0 + 1) return;
      e.preventDefault(); touch();
      var r = field.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) { zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.012)); return; }
      var m = e.deltaMode === 1 ? 32 : 1;
      tgt.x += e.deltaX * m / tgt.s; if (!inline) tgt.y += e.deltaY * m / tgt.s;
    }, { passive: false });

    var pts = {}, pinch = null;
    function pdist() { var ks = Object.keys(pts); var a = pts[ks[0]], c = pts[ks[1]]; return { d: Math.hypot(a.x - c.x, a.y - c.y), x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 }; }
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

    // piece view
    var pvImg = ov.querySelector('[data-pv-img]'), pvStatus = ov.querySelector('[data-pv-status]'), pvTitle = ov.querySelector('[data-pv-title]');
    var pvPrice = ov.querySelector('[data-pv-price]'), pvDetails = ov.querySelector('[data-pv-details]'), pvCta = ov.querySelector('[data-pv-cta]');
    var lastFocus = null;
    function btn(cls, text, fn) { var x = document.createElement('button'); x.type = 'button'; x.className = cls; x.textContent = text; if (fn) x.addEventListener('click', fn); return x; }
    function note(text) { var p = document.createElement('p'); p.className = 'pv-note'; p.textContent = text; return p; }
    function renderPiece() {
      if (open < 0) return;
      var it = items[open], av = it.status === 'available';
      pvImg.src = it.src; pvImg.alt = it.title;
      pvStatus.textContent = av ? 'Available' : (it.status === 'sold' ? 'Sold' : 'Archive, not for sale');
      pvStatus.className = 'sh-status' + (av ? ' av' : '');
      pvTitle.textContent = it.title;
      pvPrice.hidden = !av; pvPrice.textContent = av ? '$' + it.price : '';
      var rows = (av ? [['Size', it.size]] : []).concat([['Technique', it.tech], ['Care', 'Cold wash, inside out. Hang dry.']]);
      pvDetails.innerHTML = '';
      rows.forEach(function (r) { var dt = document.createElement('dt'); dt.textContent = r[0]; var dd = document.createElement('dd'); dd.textContent = r[1]; pvDetails.appendChild(dt); pvDetails.appendChild(dd); });
      pvCta.innerHTML = '';
      if (av && Cart && Cart.has(it.slug)) {
        var done = document.createElement('div'); done.className = 'sh-btn done'; done.setAttribute('role', 'status');
        done.innerHTML = '<svg viewBox="0 0 14 12" aria-hidden="true" style="width:14px;height:12px"><path d="M1.5 6.5 L5 10 L12.5 1.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>In your cart';
        pvCta.appendChild(done);
        pvCta.appendChild(btn('sh-btn', 'View cart', function () { Cart.open(); }));
      } else if (av) {
        pvCta.appendChild(btn('sh-btn', 'Add to cart', function () { if (Cart) { Cart.add(it.slug); renderPiece(); Cart.open(); } }));
        pvCta.appendChild(note('One of one. Only one available.'));
      } else {
        pvCta.appendChild(btn('sh-btn', 'Commission something like this', function () { openCm(open); }));
        pvCta.appendChild(note(it.status === 'sold' ? 'This piece has sold. Request a new piece made in a similar way.' : 'This piece is part of the archive. Request a new piece made in a similar way.'));
      }
    }
    function openPiece(i, push) {
      if (open < 0) lastFocus = document.activeElement;
      open = i; ov.hidden = false; renderPiece();
      if (push && history.replaceState) { try { history.replaceState(null, '', '#' + items[i].slug); } catch (e) {} }
      var x = ov.querySelector('[data-close]'); if (x) x.focus();
    }
    function closePiece() {
      open = -1; ov.hidden = true;
      try { if (location.hash && location.hash !== '#archive') history.replaceState(null, '', location.pathname + location.search + (embedded ? '#archive' : '')); } catch (e) {}
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    ov.querySelector('[data-close]').addEventListener('click', closePiece);
    ov.querySelector('[data-prev]').addEventListener('click', function () { openPiece((open - 1 + items.length) % items.length, true); });
    ov.querySelector('[data-next]').addEventListener('click', function () { openPiece((open + 1) % items.length, true); });
    if (Cart) Cart.onChange(function () { renderPiece(); });

    // commission request
    var cm = root.querySelector('[data-cm]');
    var cmState = { ref: 0, type: null, size: null };
    function openCm(i) {
      cmState = { ref: i, type: null, size: null };
      var it = items[i];
      cm.querySelector('[data-cm-img]').src = it.src;
      cm.querySelector('[data-cm-title]').textContent = 'Like: ' + it.title;
      cm.querySelector('[data-cm-form]').hidden = false; cm.querySelector('[data-cm-sent]').hidden = true;
      cm.querySelector('#cm-msg').value = '';
      cm.querySelectorAll('[data-cm-type],[data-cm-size]').forEach(function (b) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
      cm.querySelector('[data-cm-err]').textContent = '';
      cm.hidden = false; validate();
      cm.querySelector('#cm-msg').focus();
    }
    function closeCm() { cm.hidden = true; }
    function pickGroup(attr, key) {
      cm.querySelectorAll('[' + attr + ']').forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute(attr); cmState[key] = cmState[key] === v ? null : v;
          cm.querySelectorAll('[' + attr + ']').forEach(function (o) { var on = o.getAttribute(attr) === cmState[key]; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on ? 'true' : 'false'); });
          validate();
        });
      });
    }
    function validate() {
      var ok = cm.querySelector('#cm-msg').value.trim() && cmState.type && cmState.size && /.+@.+\..+/.test(cm.querySelector('#cm-email').value);
      cm.querySelector('[data-cm-send]').disabled = !ok;
    }
    if (cm) {
      pickGroup('data-cm-type', 'type'); pickGroup('data-cm-size', 'size');
      cm.querySelector('#cm-msg').addEventListener('input', validate);
      cm.querySelector('#cm-email').addEventListener('input', validate);
      cm.querySelectorAll('[data-cm-close]').forEach(function (b) { b.addEventListener('click', closeCm); });
      cm.querySelector('[data-cm-send]').addEventListener('click', function () {
        var to = cfg.commissionEmail, err = cm.querySelector('[data-cm-err]'), send = cm.querySelector('[data-cm-send]');
        if (!to) { err.textContent = 'Commission requests open soon.'; return; }
        var email = cm.querySelector('#cm-email').value.trim(), it = items[cmState.ref];
        send.disabled = true; err.textContent = 'Sending...';
        fetch('https://formsubmit.co/ajax/' + encodeURIComponent(to), {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ _subject: 'Commission request: like ' + it.title, _replyto: email, email: email, piece: it.title, article: cmState.type, size: cmState.size, request: cm.querySelector('#cm-msg').value.trim(), link: location.origin + location.pathname + '#' + it.slug, _template: 'table', _captcha: 'false' })
        }).then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); }).then(function () {
          cm.querySelector('[data-cm-email-shown]').textContent = email;
          cm.querySelector('[data-cm-form]').hidden = true; cm.querySelector('[data-cm-sent]').hidden = false; err.textContent = '';
        }).catch(function () { err.textContent = 'Something went wrong. Please try again, or email ' + to + '.'; send.disabled = false; });
      });
    }

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (cm && !cm.hidden) { closeCm(); return; } if (open >= 0) closePiece(); return; }
      if (open < 0 || (cm && !cm.hidden)) return;
      if (e.key === 'ArrowRight') openPiece((open + 1) % items.length, true);
      if (e.key === 'ArrowLeft') openPiece((open - 1 + items.length) % items.length, true);
    });

    // links to pieces
    function fromHash() {
      var h = ''; try { h = decodeURIComponent((location.hash || '').slice(1)); } catch (e) {}
      for (var j = 0; j < items.length; j++) if (items[j].slug === h) return j;
      return -1;
    }
    window.addEventListener('hashchange', function () { var j = fromHash(); if (j >= 0 && j !== open) openPiece(j, false); });

    // render loop
    var w = window.innerWidth || 1440;
    var s0 = Math.max(0.42, Math.min(1.6, (w / (w < 720 ? 4 : 9)) / CW));
    cam.s = tgt.s = s0; cam.x = tgt.x = CW * 0.35; cam.y = tgt.y = -60 / s0;
    var t0 = performance.now();
    function tick() {
      requestAnimationFrame(tick);
      var bd = bounds(tgt.s);
      tgt.x = Math.max(bd.x0, Math.min(bd.x1, tgt.x)); tgt.y = Math.max(bd.y0, Math.min(bd.y1, tgt.y));
      var k = reduce ? 1 : 0.14;
      cam.x += (tgt.x - cam.x) * k; cam.y += (tgt.y - cam.y) * k; cam.s += (tgt.s - cam.s) * k;
      var p = 1;
      if (!reduce) {
        if (embedded) { var r = root.getBoundingClientRect(); p = Math.max(0, Math.min(1, 1 - r.top / (window.innerHeight * 0.85))); }
        else p = Math.max(0, Math.min(1, (performance.now() - t0) / 1400));
      }
      var key = cam.x.toFixed(2) + ',' + cam.y.toFixed(2) + ',' + cam.s.toFixed(4) + ',' + p.toFixed(3);
      if (key === lastKey) return; lastKey = key;
      for (var i = 0; i < tiles.length; i++) {
        var bx, by;
        if (exactN && anchor) { bx = (anchor.c0 + (i % anchor.fit)) * CW; by = (anchor.r0 + Math.floor(i / anchor.fit)) * CH; }
        else { bx = (i % COLS) * CW; by = Math.floor(i / COLS) * CH; }
        tiles[i].style.transform = 'translate3d(' + ((bx - cam.x) * cam.s).toFixed(2) + 'px,' + ((by - cam.y) * cam.s).toFixed(2) + 'px,0) scale(' + cam.s.toFixed(4) + ')';
        var q = Math.max(0, Math.min(1, (p - seeds[i]) / 0.35)), e2 = 1 - Math.pow(1 - q, 3);
        tiles[i].firstElementChild.style.transform = q >= 1 ? '' : 'scale(' + (0.04 + 0.96 * e2).toFixed(3) + ')';
      }
    }
    assign(); requestAnimationFrame(tick);
    var start = fromHash(); if (start >= 0) setTimeout(function () { openPiece(start, false); }, 50);
    return { pieceFromHash: fromHash };
  }
  window.IBField = { init: initField };
})();
