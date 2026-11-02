/* Five Rivers — site behaviors. Every feature no-ops if its elements are absent. */
(function () {
  'use strict';

  var doc = document;
  var header = doc.querySelector('.site-header');
  var toggle = doc.querySelector('.menu-toggle');
  var mobileNav = doc.getElementById('mobile-nav');
  var desktopQuery = window.matchMedia('(min-width: 961px)');

  /* ── Header: solid background after a little scroll ── */
  function updateHeader() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  /* ── Mobile menu ── */
  function setMenu(open) {
    if (!toggle || !mobileNav) return;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobileNav.hidden = !open;
    doc.body.classList.toggle('menu-open', open);
    if (open) {
      var first = mobileNav.querySelector('a');
      if (first) first.focus();
    } else {
      toggle.focus();
    }
  }
  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
    var onDesktop = function (e) { if (e.matches) setMenu(false); };
    if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', onDesktop);
    else desktopQuery.addListener(onDesktop);
  }

  /* ── Current page link ── */
  var here = location.pathname.split('/').pop() || 'index.html';
  doc.querySelectorAll('.site-nav a, .mobile-nav a').forEach(function (a) {
    var target = a.getAttribute('href');
    if (target === here) a.setAttribute('aria-current', 'page');
  });

  /* ── Reveal on scroll (content is visible without JS; this only adds the fade) ── */
  var revealEls = doc.querySelectorAll('.reveal');
  if (revealEls.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  /* ── Hero video: plays on every screen size; phones get the smaller encode.
        Skipped only for reduced-motion or data-saver users (poster stays). ── */
  var video = doc.querySelector('.hero__media[data-src]');
  if (video) {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var saveData = navigator.connection && navigator.connection.saveData;
    var wide = window.matchMedia('(min-width: 768px)').matches;
    var mobileSrc = video.getAttribute('data-src-mobile');
    if (!reduceMotion && !saveData) {
      video.src = (!wide && mobileSrc) ? mobileSrc : video.getAttribute('data-src');
      video.addEventListener('playing', function () { video.classList.add('is-playing'); }, { once: true });
      video.load();
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* poster stays visible */ });
    }
  }

  /* ── Work filter ── */
  var filterBtns = doc.querySelectorAll('.filter__btn[data-filter]');
  var cards = doc.querySelectorAll('.work-card[data-sector]');
  var status = doc.querySelector('.filter-status');
  if (filterBtns.length && cards.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sector = btn.getAttribute('data-filter');
        filterBtns.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        var shown = 0;
        cards.forEach(function (card) {
          var match = sector === 'all' || card.getAttribute('data-sector') === sector;
          card.hidden = !match;
          if (match) shown++;
        });
        if (status) status.textContent = shown + (shown === 1 ? ' project' : ' projects');
      });
    });
  }

  /* ── Careers: the Apply button reveals the form (always visible without JS);
        the form posts in place and shows a confirmation, falling back to a
        normal submit if the request fails. ── */
  var apply = doc.getElementById('apply');
  var applyToggle = doc.getElementById('apply-toggle');
  var applyForm = doc.getElementById('apply-form');
  if (apply && applyToggle) {
    var openApply = function () {
      apply.classList.add('is-open');
      applyToggle.setAttribute('aria-expanded', 'true');
    };
    applyToggle.addEventListener('click', function (e) {
      e.preventDefault();
      openApply();
      apply.scrollIntoView({ block: 'start' });
      var first = apply.querySelector('input[name="name"]');
      if (first) first.focus({ preventScroll: true });
    });
    if (location.hash === '#apply') openApply();
  }
  if (applyForm && window.fetch && window.FormData) {
    var formStatus = applyForm.querySelector('.form-status');
    var applyDone = apply ? apply.querySelector('.apply__done') : null;
    var submitBtn = applyForm.querySelector('[type="submit"]');
    applyForm.addEventListener('submit', function (e) {
      if (!applyForm.checkValidity()) return; /* the browser points out what is missing */
      e.preventDefault();
      if (submitBtn) submitBtn.disabled = true;
      if (formStatus) formStatus.textContent = 'Sending…';
      var endpoint = applyForm.action.replace('formsubmit.co/', 'formsubmit.co/ajax/');
      fetch(endpoint, { method: 'POST', body: new FormData(applyForm), headers: { Accept: 'application/json' } })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (r) {
          if (!r.ok || String(r.data.success) === 'false') throw new Error(r.data.message || 'Request failed');
          if (applyDone) {
            var emailOut = applyDone.querySelector('.apply__done-email');
            if (emailOut) emailOut.textContent = applyForm.elements.email.value;
            applyForm.hidden = true;
            applyDone.hidden = false;
            applyDone.focus();
          }
        })
        .catch(function () {
          /* Let the browser post the form the ordinary way instead. */
          if (formStatus) formStatus.textContent = '';
          if (submitBtn) submitBtn.disabled = false;
          applyForm.submit();
        });
    });
  }
})();
