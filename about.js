/* About: hero video, jump to sign-up, Kit mailing list */
(function () {
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var v = document.querySelector('[data-hero-video]');
  if (v && reduce) { v.removeAttribute('autoplay'); v.pause(); }

  var want = location.hash === '#join';
  try { if (sessionStorage.getItem('ib-join') === '1') { want = true; sessionStorage.removeItem('ib-join'); } } catch (e) {}
  if (want) setTimeout(function () { document.getElementById('join').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }, 150);

  var form = document.querySelector('[data-kit-form]');
  var input = form.querySelector('input[type=email]');
  var btn = form.querySelector('button[type=submit]');
  var msg = form.querySelector('.msg');
  var ACTION = 'https://app.kit.com/forms/' + form.getAttribute('data-kit-form') + '/subscriptions';
  var busy = false;

  function done() {
    msg.textContent = 'Thanks! Check your email to confirm your subscription.';
    input.value = ''; btn.disabled = false; busy = false;
  }
  function fail(text) {
    msg.textContent = text || 'Something went wrong. Please try again.';
    btn.disabled = false; busy = false;
  }
  // Fallback: post the form into a hidden frame (works even if the request below is blocked)
  function frameSubmit() {
    form.action = ACTION; form.target = 'kit-frame';
    HTMLFormElement.prototype.submit.call(form);
    setTimeout(done, 600);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    if (!input.value || !input.checkValidity()) { msg.textContent = 'Please enter a valid email address.'; return; }
    busy = true; btn.disabled = true; msg.textContent = 'Adding you to the list...';
    var data = new FormData(); data.append('email_address', input.value.trim());
    fetch(ACTION, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return { status: r.ok ? 'success' : 'failed' }; }); })
      .then(function (j) {
        if (j && j.status === 'success') done();
        else fail(j && j.errors && j.errors.messages ? j.errors.messages.join(' ') : null);
      })
      .catch(function () { frameSubmit(); });
  });
})();
