/* Backdraft Suppressors — Help Center behaviour
   Search that answers with links, collapsible guide and FAQ, deep links. */
(function () {
  'use strict';

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.add('js');

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  };

  $$('.tiles .tile').forEach(function (el, i) { el.style.setProperty('--i', i); });

  /* ==================================================================
     Search — filters the FAQ and the guide in place
     ================================================================== */
  var input     = $('#q');
  var clearBtn  = $('#search-clear');
  var status    = $('#search-status');
  var noResults = $('#no-results');
  var faqItems  = $$('.faq-item');
  var faqCats   = $$('.faq-cat');
  var steps     = $$('.guide-step');

  function idx(nodes) {
    return nodes.map(function (el) {
      return { el: el, text: (el.textContent || '').toLowerCase().replace(/\s+/g, ' ') };
    });
  }
  var faqIndex   = idx(faqItems);
  var guideIndex = idx(steps);

  function resetFilter() {
    document.body.classList.remove('is-searching');
    faqIndex.forEach(function (r) {
      r.el.classList.remove('is-hidden', 'is-hit');
      r.el.open = false;
    });
    guideIndex.forEach(function (r) { r.el.classList.remove('is-hidden'); });
    faqCats.forEach(function (c) { c.classList.remove('is-hidden'); });
    if (noResults) noResults.hidden = true;
    if (status) status.textContent = '';
  }

  function applyFilter(raw) {
    var terms = raw.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) { resetFilter(); return; }
    document.body.classList.add('is-searching');
    setGuideOpen(true);

    function hit(rec) {
      return terms.every(function (t) { return rec.text.indexOf(t) !== -1; });
    }

    var faqHits = 0;
    faqIndex.forEach(function (r) {
      var m = hit(r);
      r.el.classList.toggle('is-hidden', !m);
      r.el.classList.toggle('is-hit', m);
      r.el.open = m;
      if (m) faqHits++;
    });
    faqCats.forEach(function (c) {
      c.classList.toggle('is-hidden', c.querySelectorAll('.faq-item:not(.is-hidden)').length === 0);
    });

    var guideHits = 0;
    guideIndex.forEach(function (r) {
      var m = hit(r);
      r.el.classList.toggle('is-hidden', !m);
      if (m) guideHits++;
    });

    var total = faqHits + guideHits;
    if (noResults) noResults.hidden = faqHits !== 0;
    if (status) {
      status.textContent = total === 0
        ? 'No matches for \u201c' + raw + '\u201d.'
        : total + (total === 1 ? ' match' : ' matches') +
          ' \u2014 ' + faqHits + ' in the FAQ, ' + guideHits + ' in the buying guide.';
    }
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, wait);
    };
  }

  if (input) {
    var run = debounce(function () {
      var v = input.value.trim();
      if (clearBtn) clearBtn.hidden = v === '';
      applyFilter(v);
    }, 140);
    input.addEventListener('input', run);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; clearBtn.hidden = true; resetFilter(); }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      input.value = '';
      clearBtn.hidden = true;
      resetFilter();
      input.focus();
    });
  }

  /* ==================================================================
     Collapsibles — FAQ questions and guide steps behave the same way
     ================================================================== */
  var panels = faqItems;

  function body(d) { return $('.faq-a', d); }

  if (!reduced) {
    panels.forEach(function (d) {
      var summary = $('summary', d);
      var inner = body(d);
      if (!summary || !inner) return;

      summary.addEventListener('click', function (e) {
        e.preventDefault();
        if (d.classList.contains('is-animating')) return;

        var opening = !d.open;
        d.classList.add('is-animating');
        if (opening) d.open = true;

        var target = opening ? inner.scrollHeight : 0;
        inner.style.height = (opening ? 0 : inner.scrollHeight) + 'px';
        requestAnimationFrame(function () { inner.style.height = target + 'px'; });

        var done = function (ev) {
          if (ev && ev.propertyName !== 'height') return;
          inner.removeEventListener('transitionend', done);
          clearTimeout(fallback);
          inner.style.height = '';
          d.classList.remove('is-animating');
          if (!opening) d.open = false;
        };
        var fallback = setTimeout(done, 450);
        inner.addEventListener('transitionend', done);
      });
    });
  }

  /* Expand / collapse all, scoped to whichever section the button sits in. */
  $$('[data-expand], [data-collapse]').forEach(function (btn) {
    var open = btn.hasAttribute('data-expand');
    var scope = btn.getAttribute(open ? 'data-expand' : 'data-collapse');
    btn.addEventListener('click', function () {
      $$('.faq-item', $(scope)).forEach(function (d) { d.open = open; });
    });
  });

  /* ---------- Guide: opens on demand ---------- */
  var guideWrap   = $('#guide-layout');
  var guideToggle = $('#guide-toggle');

  function setGuideOpen(open) {
    if (!guideWrap || !guideToggle) return;
    guideWrap.classList.toggle('is-collapsed', !open);
    guideToggle.setAttribute('aria-expanded', String(open));
    var label = guideToggle.querySelector('.btn-label') || guideToggle;
    label.textContent = open ? 'Hide the guide' : 'See the full guide';
  }

  if (guideToggle) {
    guideToggle.addEventListener('click', function () {
      setGuideOpen(guideWrap.classList.contains('is-collapsed'));
    });
  }

  /* Anything that points at the guide opens it first. */
  $$('[data-open-guide], .page-nav a[href="#guide"], .tiles a[href="#guide"]')
    .forEach(function (a) {
      a.addEventListener('click', function () { setGuideOpen(true); });
    });

  /* ==================================================================
     Deep links — a linked answer opens itself
     ================================================================== */
  function reveal(el) {
    var scope = el.closest('.section') || el;
    $$('.reveal', scope).forEach(function (r) { r.classList.add('is-in'); });
    if (scope.classList) scope.classList.add('is-in');
  }

  function openFromHash() {
    var id = window.location.hash.slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    if (el.closest && el.closest('#guide-layout')) setGuideOpen(true);
    reveal(el);
    if (el.tagName === 'DETAILS') {
      el.open = true;
      el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    }
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();

  /* ==================================================================
     Chrome
     ================================================================== */
  if (!reduced && 'IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    ['.section-head', '.order-card', '.guide-nav', '.cat-jump', '.faq-cat-title',
     '.warranty-panel', '.contact-title', '.contact-list'].forEach(function (sel) {
      var i = 0, prev = null;
      $$(sel).forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
        i = (prev && el.previousElementSibling === prev) ? i + 1 : 0;
        if (i > 5) i = 5;
        prev = el;
        el.style.setProperty('--i', i);
        el.classList.add('reveal');
        revealObs.observe(el);
      });
    });
  }

  var navLinks = $$('.guide-nav a');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var stepLink = {};
    navLinks.forEach(function (a) { stepLink[a.getAttribute('href').slice(1)] = a; });
    var stepObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var link = stepLink[en.target.id];
        if (!link || !en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove('active'); });
        link.classList.add('active');
      });
    }, { rootMargin: '-70px 0px -70% 0px' });
    steps.forEach(function (st) { stepObs.observe(st); });
  }

  var pageNav = $('.page-nav');
  if (pageNav) {
    var navTop = pageNav.offsetTop;
    window.addEventListener('scroll', function () {
      pageNav.classList.toggle('is-stuck', window.scrollY >= navTop);
    }, { passive: true });

    var links = $$('a', pageNav);
    if ('IntersectionObserver' in window) {
      var linkFor = {};
      links.forEach(function (a) {
        var sec = document.getElementById(a.getAttribute('href').slice(1));
        if (sec) linkFor[sec.id] = a;
      });
      var secObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) { a.classList.remove('active'); });
          linkFor[en.target.id].classList.add('active');
        });
      }, { rootMargin: '-56px 0px -72% 0px' });
      Object.keys(linkFor).forEach(function (id) {
        secObs.observe(document.getElementById(id));
      });
    }
  }

  var toTop = $('#to-top');
  if (toTop) {
    toTop.hidden = false;
    window.addEventListener('scroll', function () {
      toTop.classList.toggle('is-shown', window.scrollY > 600);
    }, { passive: true });
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
