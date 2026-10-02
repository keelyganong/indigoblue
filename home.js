/* Home: archive field + first-visit glide */
(function () {
  var arch = document.querySelector('[data-arch]');
  IBField.init(arch, { embedded: true });
  var target = document.getElementById('archive');
  var stamp = document.querySelector('[data-stamp]');
  var root = document.documentElement;
  var reduce = false, gliding = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  function seen() { try { return localStorage.getItem('ib-intro-seen') === '1'; } catch (e) { return true; } }
  function endY() { return target.getBoundingClientRect().top + window.scrollY; }
  function glide(ev) {
    if (ev) ev.preventDefault();
    if (gliding) return;
    if (reduce) { window.scrollTo(0, endY()); return; }
    gliding = true;
    var first = !seen();
    if (first && stamp) { stamp.style.transition = 'opacity 550ms ease'; stamp.style.opacity = '0'; }
    var start = window.scrollY, dist = endY() - start, dur = first ? 1300 : 750;
    var t0 = performance.now() + (first ? 1050 : 0);
    var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    function step(now) {
      var t = Math.max(0, Math.min(1, (now - t0) / dur));
      window.scrollTo(0, start + dist * ease(t));
      if (t < 1) { requestAnimationFrame(step); return; }
      window.scrollTo(0, endY());
      if (stamp) { stamp.style.transition = 'none'; stamp.style.opacity = ''; }
      if (first) { try { localStorage.setItem('ib-intro-seen', '1'); } catch (e) {} }
      gliding = false;
    }
    requestAnimationFrame(step);
  }
  document.querySelector('[data-scroll]').addEventListener('click', glide);
  document.querySelectorAll('a[href="#archive"]').forEach(function (a) { if (!a.hasAttribute('data-scroll')) a.addEventListener('click', glide); });
  var topBtn = arch.querySelector('[data-to-top]');
  if (topBtn) topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
  var atTop = function () { return window.scrollY < 12; };
  window.addEventListener('wheel', function (e) {
    if (gliding) { e.preventDefault(); return; }
    if (atTop() && e.deltaY > 0 && Math.abs(e.deltaY) >= Math.abs(e.deltaX) && !target.contains(e.target)) { e.preventDefault(); glide(); }
  }, { passive: false });
  window.addEventListener('keydown', function (e) {
    var keys = ['ArrowDown', 'PageDown', ' ', 'Spacebar'];
    if (gliding && keys.concat(['End']).indexOf(e.key) >= 0) { e.preventDefault(); return; }
    var tag = e.target && e.target.tagName;
    if (atTop() && keys.indexOf(e.key) >= 0 && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); glide(); }
  });
  var ty = null;
  window.addEventListener('touchstart', function (e) { ty = e.touches[0] ? e.touches[0].clientY : null; }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (gliding) { e.preventDefault(); return; }
    if (ty == null || !atTop()) return;
    if (ty - e.touches[0].clientY > 18) { e.preventDefault(); ty = null; glide(); }
  }, { passive: false });
  var jl = document.querySelector('[data-join-link]');
  if (jl) jl.addEventListener('click', function () { try { sessionStorage.setItem('ib-join', '1'); } catch (e) {} });
})();
