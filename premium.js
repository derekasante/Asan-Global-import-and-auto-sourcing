/* ═════════════════════════════════════════════════════════════════
   ASAN GLOBAL — PREMIUM FRONTEND
   Preloader · Sticky nav · Mobile menu · Reveal · Counters ·
   Tracking / Quote / Contact forms (wired to existing backend)
   ═════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API_BASE = 'http://localhost:5000';
  var PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─────────────────────────── Helpers ─────────────────────────── */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  }

  /* ─────────────────────────── Preloader ─────────────────────────── */
  var preloader = $('.ag-preloader');
  if (preloader) {
    window.addEventListener('load', function () {
      setTimeout(function () {
        preloader.classList.add('is-done');
        document.body.classList.add('is-loaded');
      }, PREFERS_REDUCED ? 0 : 500);
    });
    // Safety: never let the preloader trap the user
    setTimeout(function () {
      if (!preloader.classList.contains('is-done')) {
        preloader.classList.add('is-done');
        document.body.classList.add('is-loaded');
      }
    }, 4000);
  }

  /* ─────────────────────────── Header / Nav ─────────────────────────── */
  var header = $('.ag-header');
  var headerCta = $('.ag-header__cta');

  function updateHeader() {
    if (!header) return;
    var scrolled = window.scrollY > 40;
    header.classList.toggle('is-scrolled', scrolled);
    var hero = $('.ag-hero');
    if (hero) {
      var heroBottom = hero.offsetTop + hero.offsetHeight;
      header.classList.toggle('ag-header--overlay', window.scrollY < heroBottom - 120);
    }
    if (scrolled && headerCta && window.innerWidth > 900) {
      headerCta.classList.remove('ag-btn--ghost');
      headerCta.classList.add('ag-btn--light');
    } else if (headerCta) {
      headerCta.classList.add('ag-btn--ghost');
      headerCta.classList.remove('ag-btn--light');
    }
  }

  function updateActiveNav() {
    var navLinks = $$('.ag-nav a, .ag-mobile-nav__links a');
    var sections = $$('section[id]');
    var pos = window.scrollY + 140;
    var currentId = '';
    sections.forEach(function (sec) {
      if (sec.offsetTop <= pos && sec.offsetTop + sec.offsetHeight > pos) {
        currentId = sec.id;
      }
    });
    navLinks.forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (currentId && href === '#' + currentId) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });
  }

  /* Mobile menu */
  var burger = $('.ag-burger');
  var mobileNav = $('.ag-mobile-nav');
  var mobileClose = $('.ag-mobile-nav__close');
  var mobileBackdrop = $('.ag-mobile-nav__backdrop');

  function openMobile() {
    if (!mobileNav) return;
    mobileNav.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeMobile() {
    if (!mobileNav) return;
    mobileNav.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  if (burger && mobileNav) {
    burger.addEventListener('click', openMobile);
    if (mobileClose) mobileClose.addEventListener('click', closeMobile);
    if (mobileBackdrop) mobileBackdrop.addEventListener('click', closeMobile);
  }
  $$('.ag-mobile-nav__links a').forEach(function (link) {
    link.addEventListener('click', closeMobile);
  });

  /* ─────────────────────────── Scroll reveal ─────────────────────────── */
  var revealEls = $$('[data-ag-reveal]');
  if ('IntersectionObserver' in window && revealEls.length && !PREFERS_REDUCED) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-revealed'); });
  }

  /* ─────────────────────────── Counters ─────────────────────────── */
  var counters = $$('.ag-stat__num[data-count]');
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
    var duration = 1800;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var val = target * eased;
      el.textContent = (decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()) + suffix;
      if (progress < 1) window.requestAnimationFrame(step);
      else el.textContent = (target.toLocaleString(undefined, { minimumFractionDigits: decimals })) + suffix;
    }
    window.requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && counters.length) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { counterObserver.observe(c); });
  } else {
    counters.forEach(function (c) {
      c.textContent = (c.getAttribute('data-count') || '0') + (c.getAttribute('data-suffix') || '');
    });
  }

  /* ─────────────────────────── Toasts ─────────────────────────── */
  function ensureToasts() {
    var wrap = $('.ag-toast-wrap');
    if (wrap) return wrap;
    wrap = document.createElement('div');
    wrap.className = 'ag-toast-wrap';
    wrap.setAttribute('aria-live', 'polite');
    document.body.appendChild(wrap);
    return wrap;
  }

  function toast(message, type) {
    type = type || 'info';
    var wrap = ensureToasts();
    var el = document.createElement('div');
    el.className = 'ag-toast ag-toast--' + type;
    var iconMap = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    el.innerHTML = '<i class="fas ' + (iconMap[type] || iconMap.info) + '"></i><span>' + esc(message) + '</span>';
    wrap.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 450);
    }, 4200);
  }

  /* ─────────────────────────── Buttons loading state ─────────────────────────── */
  function setBtnLoading(btn, loading, label) {
    if (!btn) return;
    if (loading) {
      btn.dataset.original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + esc(label || 'Please wait…');
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.original || '';
    }
  }

  /* ─────────────────────────── Track form ─────────────────────────── */
  var trackForm = $('.ag-track__form');
  var trackInput = $('.ag-track__input');
  var demoCodes = $$('.ag-track__demo code');

  function doTrack(number) {
    number = (number || '').trim().toUpperCase();
    if (!number) {
      toast('Please enter a tracking number.', 'error');
      if (trackInput) trackInput.focus();
      return;
    }
    if (!trackForm) {
      // No form on page — redirect to tracking page with ref param
      window.location.href = 'tracking.html?ref=' + encodeURIComponent(number);
      return;
    }
    var btn = $('.ag-track__form .ag-btn');
    setBtnLoading(btn, true, 'Tracking…');
    fetch(API_BASE + '/api/shipments/' + encodeURIComponent(number))
      .then(function (resp) { return resp.json(); })
      .then(function (json) {
        if (json.success && json.shipment) {
          var s = json.shipment;
          toast('Shipment found! Status: ' + esc(s.status || 'pending'), 'success');
          window.location.href = 'tracking.html?ref=' + encodeURIComponent(number);
        } else {
          // Not found on backend — still send the user to the tracking page
          // which also supports demo/local data and shows a proper "not found" state.
          window.location.href = 'tracking.html?ref=' + encodeURIComponent(number);
        }
      })
      .catch(function () {
        // Backend unreachable — go to tracking page which handles fallback
        window.location.href = 'tracking.html?ref=' + encodeURIComponent(number);
      })
      .finally(function () {
        setBtnLoading(btn, false);
      });
  }

  if (trackForm) {
    trackForm.addEventListener('submit', function (e) {
      e.preventDefault();
      doTrack(trackInput ? trackInput.value : '');
    });
  }
  if (trackInput) {
    trackInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doTrack(trackInput.value);
    });
  }
  demoCodes.forEach(function (code) {
    code.addEventListener('click', function () {
      var value = code.getAttribute('data-ref') || code.textContent.trim();
      doTrack(value);
    });
  });

  /* ─────────────────────────── Quote form ─────────────────────────── */
  var quoteForm = $('#quoteForm');
  if (quoteForm) {
    quoteForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {
        name: $('#quoteForm [name="name"]').value.trim(),
        phone: $('#quoteForm [name="phone"]').value.trim(),
        email: $('#quoteForm [name="email"]').value.trim(),
        service: $('#quoteForm [name="service"]').value,
        origin: $('#quoteForm [name="origin"]').value.trim(),
        destination: $('#quoteForm [name="destination"]').value.trim(),
        vehicle_details: $('#quoteForm [name="details"]').value.trim()
      };
      if (!data.name || !data.email || !data.service) {
        toast('Please fill in your name, email and service.', 'error');
        return;
      }
      var btn = quoteForm.querySelector('button[type="submit"]');
      setBtnLoading(btn, true, 'Sending…');
      fetch(API_BASE + '/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (resp) { return resp.json(); })
        .then(function (json) {
          if (json.success) {
            quoteForm.reset();
            toast('Thanks ' + data.name + '! Your quote request was received. We will contact you within 24 hours.', 'success');
          } else {
            throw new Error(json.error || 'Quote request failed');
          }
        })
        .catch(function (err) {
          toast('Sorry, there was a problem submitting your request. Please try again or call us.', 'error');
        })
        .finally(function () {
          setBtnLoading(btn, false);
        });
    });
  }

  /* ─────────────────────────── Contact form ─────────────────────────── */
  var contactForm = $('#contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {
        name: $('#contactForm [name="name"]').value.trim(),
        email: $('#contactForm [name="email"]').value.trim(),
        phone: $('#contactForm [name="phone"]').value.trim(),
        subject: $('#contactForm [name="subject"]').value.trim(),
        body: $('#contactForm [name="message"]').value.trim()
      };
      if (!data.name || !data.email || !data.subject || !data.body) {
        toast('Please fill in all required fields.', 'error');
        return;
      }
      var btn = contactForm.querySelector('button[type="submit"]');
      setBtnLoading(btn, true, 'Sending…');
      fetch(API_BASE + '/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (resp) { return resp.json(); })
        .then(function (json) {
          if (json.success) {
            contactForm.reset();
            toast('Thank you! Your message has been sent. We will get back to you shortly.', 'success');
          } else {
            throw new Error(json.error || 'Message failed');
          }
        })
        .catch(function () {
          toast('Sorry, there was a problem sending your message. Please try again or call us.', 'error');
        })
        .finally(function () {
          setBtnLoading(btn, false);
        });
    });
  }

  /* ─────────────────────────── FAQ accordion ─────────────────────────── */
  var faqItems = $$('.ag-faq__item');
  faqItems.forEach(function (item) {
    var q = $('.ag-faq__q', item);
    if (!q) return;
    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');
      // Close others
      faqItems.forEach(function (other) {
        other.classList.remove('is-open');
        var a = $('.ag-faq__a', other);
        if (a) a.style.maxHeight = '';
      });
      if (!isOpen) {
        item.classList.add('is-open');
        var answer = $('.ag-faq__a', item);
        if (answer) answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
  // Open first FAQ if all closed on load
  if (faqItems.length) {
    var first = faqItems[0];
    first.classList.add('is-open');
    var fA = $('.ag-faq__a', first);
    if (fA) fA.style.maxHeight = fA.scrollHeight + 'px';
  }

  /* ─────────────────────────── Back to top ─────────────────────────── */
  var backTop = $('.ag-back-top');
  if (backTop) {
    window.addEventListener('scroll', function () {
      backTop.classList.toggle('is-visible', window.scrollY > 600);
    }, { passive: true });
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: PREFERS_REDUCED ? 'auto' : 'smooth' });
    });
  }

  /* ─────────────────────────── WhatsApp float prefilled ─────────────────────────── */
  var whatsapp = $('.ag-whatsapp');
  if (whatsapp) {
    var base = 'https://wa.me/233245357611';
    var text = 'Hello Asan Global, I would like help with vehicle import. Please contact me.';
    var current = whatsapp.getAttribute('data-message') || text;
    whatsapp.setAttribute('href', base + '?text=' + encodeURIComponent(current));
    whatsapp.setAttribute('target', '_blank');
    whatsapp.setAttribute('rel', 'noopener');
  }

  /* ─────────────────────────── Year in footer ─────────────────────────── */
  var yearEl = $('.ag-footer__year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ─────────────────────────── Smooth anchor offset ─────────────────────────── */
  $$('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var id = anchor.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var y = target.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top: y, behavior: PREFERS_REDUCED ? 'auto' : 'smooth' });
    });
  });

  /* ─────────────────────────── Init ─────────────────────────── */
  updateHeader();
  updateActiveNav();
  window.addEventListener('scroll', function () {
    updateHeader();
    updateActiveNav();
  }, { passive: true });
  window.addEventListener('resize', function () {
    // Recompute FAQ max-height on resize for open item
    var openItem = $('.ag-faq__item.is-open');
    if (openItem) {
      var a = $('.ag-faq__a', openItem);
      if (a) a.style.maxHeight = a.scrollHeight + 'px';
    }
  });
})();

