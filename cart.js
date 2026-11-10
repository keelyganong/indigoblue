/* Cart: saved in this browser, shared by every page */
(function () {
  var KEY = 'ib-cart';
  var items = window.IB_ITEMS || [];
  var cfg = window.IB_CONFIG || {};
  var links = cfg.checkout || {};
  var listeners = [];
  function bySlug(s) { for (var i = 0; i < items.length; i++) if (items[i].slug === s) return items[i]; return null; }
  function read() {
    var a = [];
    try { a = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
    return a.filter(function (s) { var it = bySlug(s); return it && it.status === 'available'; });
  }
  function write(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} notify(); }
  function notify() { var a = read(); listeners.forEach(function (fn) { fn(a); }); paint(a); }
  var Cart = {
    get: read,
    has: function (s) { return read().indexOf(s) >= 0; },
    add: function (s) { var a = read(); if (a.indexOf(s) < 0) { a.push(s); write(a); } },
    remove: function (s) { write(read().filter(function (x) { return x !== s; })); },
    onChange: function (fn) { listeners.push(fn); },
    open: function () { openDrawer(); }
  };
  window.IBCart = Cart;

  var drawer = document.querySelector('[data-cart-drawer]');
  var list = drawer && drawer.querySelector('[data-cart-list]');
  var lastFocus = null;
  function money(v) { return '$' + v; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function paint(a) {
    document.querySelectorAll('[data-cart-count]').forEach(function (n) { n.textContent = 'Cart (' + a.length + ')'; });
    if (!drawer) return;
    list.innerHTML = '';
    var sub = 0;
    if (!a.length) list.appendChild(el('p', 'cart-empty', 'Your cart is empty.'));
    a.forEach(function (s) {
      var it = bySlug(s); sub += it.price;
      var row = el('div', 'cart-row');
      var img = el('img'); img.src = it.src; img.alt = ''; row.appendChild(img);
      var mid = el('div', 'cart-mid');
      mid.appendChild(el('span', 'cart-name', it.title));
      mid.appendChild(el('span', 'cart-size', 'Size ' + it.size));
      var rm = el('button', 'ib-quiet', 'Remove'); rm.type = 'button';
      rm.addEventListener('click', function () { Cart.remove(s); });
      mid.appendChild(rm); row.appendChild(mid);
      row.appendChild(el('span', 'cart-price', money(it.price)));
      list.appendChild(row);
    });
    drawer.querySelector('[data-cart-subtotal]').textContent = money(sub);
    var pay = drawer.querySelector('[data-cart-pay]');
    pay.innerHTML = '';
    if (!a.length) return;
    var ready = a.filter(function (s) { return links[s]; });
    if (ready.length < a.length) {
      pay.appendChild(el('p', 'cart-note', 'Checkout opens soon. Join the list to hear when it does.'));
      var j = el('a', 'sh-btn o', 'Join the list'); j.href = 'about.html#join';
      j.addEventListener('click', function () { try { sessionStorage.setItem('ib-join', '1'); } catch (e) {} });
      pay.appendChild(j);
      return;
    }
    if (a.length === 1) {
      var b = el('a', 'sh-btn', 'Checkout'); b.href = links[a[0]]; pay.appendChild(b);
      pay.appendChild(el('p', 'cart-note', 'Shipping is added at checkout.'));
      return;
    }
    pay.appendChild(el('p', 'cart-note', 'Each piece checks out on its own. Shipping is added at checkout.'));
    a.forEach(function (s) {
      var it = bySlug(s);
      var b = el('a', 'sh-btn o', 'Pay for ' + it.title); b.href = links[s]; b.target = '_blank'; b.rel = 'noopener';
      pay.appendChild(b);
    });
  }

  function openDrawer() {
    if (!drawer) { location.href = 'index.html#cart'; return; }
    lastFocus = document.activeElement;
    drawer.hidden = false;
    var x = drawer.querySelector('[data-cart-close]'); if (x) x.focus();
  }
  function closeDrawer() { if (!drawer) return; drawer.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  document.querySelectorAll('[data-cart-open]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openDrawer(); }); });
  if (drawer) {
    drawer.querySelector('[data-cart-close]').addEventListener('click', closeDrawer);
    drawer.addEventListener('click', function (e) { if (e.target === drawer) closeDrawer(); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });
  }
  window.addEventListener('storage', function (e) { if (e.key === KEY) notify(); });
  if (location.hash === '#cart') { setTimeout(openDrawer, 60); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
  notify();
})();
