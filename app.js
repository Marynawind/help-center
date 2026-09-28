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
     Search — shows the answers, not just a count
     ================================================================== */
  var input     = $('#q');
  var clearBtn  = $('#search-clear');
  var status    = $('#search-status');
  var results   = $('#results');
  var resultsList = $('#results-list');
  var tiles     = $('.tiles');
  var heroCta   = $('.hero-cta');

  /* One record per answer, built once. */
  var answers = $$('.faq-item').map(function (d) {
    var q = $('summary', d).textContent.trim();
    var body = $('.faq-a', d);
    return {
      id: d.id, kind: 'faq', title: q, html: body.innerHTML,
      hay: (q + ' ' + d.textContent).toLowerCase().replace(/\s+/g, ' ')
    };
  });
  var steps = $$('.guide-step').map(function (el) {
    var h = $('h3', el);
    return {
      id: el.id, kind: 'guide', title: h ? h.textContent.trim() : '',
      hay: (el.textContent || '').toLowerCase().replace(/\s+/g, ' ')
    };
  });

  function score(rec, terms) {
    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      if (rec.hay.indexOf(terms[i]) === -1) return 0;
      /* A word in the question beats one buried in the answer. */
      total += rec.title.toLowerCase().indexOf(terms[i]) !== -1 ? 10 : 1;
    }
    return total;
  }

  function rank(list, terms) {
    return list
      .map(function (r) { return { r: r, s: score(r, terms) }; })
      .filter(function (h) { return h.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .map(function (h) { return h.r; });
  }

  function clearSearch() {
    document.body.classList.remove('is-searching');
    if (results) { results.hidden = true; resultsList.innerHTML = ''; }
    if (status) status.textContent = '';
    if (tiles) tiles.hidden = false;
    if (heroCta) heroCta.hidden = false;
  }

  function answerBlock(rec, open) {
    var d = document.createElement('details');
    d.className = 'result';
    if (open) d.open = true;
    var sum = document.createElement('summary');
    sum.textContent = rec.title;
    var body = document.createElement('div');
    body.className = 'result-body';
    body.innerHTML = rec.html;
    var more = document.createElement('p');
    more.className = 'result-more';
    var a = document.createElement('a');
    a.className = 'inline-link';
    a.href = '#' + rec.id;
    a.textContent = 'See this in the FAQ';
    more.appendChild(a);
    body.appendChild(more);
    d.appendChild(sum);
    d.appendChild(body);
    return d;
  }

  function guideRow(rec) {
    var p = document.createElement('p');
    p.className = 'result-link';
    var k = document.createElement('span');
    k.className = 'result-kind';
    k.textContent = 'Buying guide';
    var a = document.createElement('a');
    a.href = '#' + rec.id;
    a.textContent = rec.title;
    a.addEventListener('click', function () { setGuideOpen(true); });
    p.appendChild(k);
    p.appendChild(a);
    return p;
  }

  function runSearch(raw) {
    var terms = raw.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) { clearSearch(); return; }

    document.body.classList.add('is-searching');
    if (tiles) tiles.hidden = true;
    if (heroCta) heroCta.hidden = true;

    var faqHits = rank(answers, terms).slice(0, 6);
    var guideHits = rank(steps, terms).slice(0, 5);

    resultsList.innerHTML = '';
    faqHits.forEach(function (rec, i) {
      resultsList.appendChild(answerBlock(rec, i === 0));
    });

    if (guideHits.length) {
      var h = document.createElement('p');
      h.className = 'result-heading';
      h.textContent = 'Also in the buying guide';
      resultsList.appendChild(h);
      guideHits.forEach(function (rec) { resultsList.appendChild(guideRow(rec)); });
    }

    if (!faqHits.length && !guideHits.length) {
      var none = document.createElement('p');
      none.className = 'result-none';
      none.innerHTML = 'Nothing matches that. Try a different word, or ' +
        '<a class="inline-link" href="#contact">contact us</a>.';
      resultsList.appendChild(none);
    }

    results.hidden = false;
    if (faqHits.length) {
      status.textContent = faqHits.length + (faqHits.length === 1 ? ' answer' : ' answers') +
        (guideHits.length ? ', plus ' + guideHits.length + ' in the buying guide' : '');
    } else if (guideHits.length) {
      status.textContent = guideHits.length + ' match' +
        (guideHits.length === 1 ? '' : 'es') + ' in the buying guide';
    } else {
      status.textContent = 'No matches for \u201c' + raw + '\u201d.';
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
      runSearch(v);
    }, 140);
    input.addEventListener('input', run);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; clearBtn.hidden = true; clearSearch(); }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      input.value = '';
      clearBtn.hidden = true;
      clearSearch();
      input.focus();
    });
  }

  /* ==================================================================
     Collapsibles — FAQ questions and guide steps behave the same way
     ================================================================== */
  var panels = $$('.faq-item');

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
    $$('.guide-step').forEach(function (st) { stepObs.observe(st); });
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
