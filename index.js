(function () {
  var toggle = document.querySelector(".menu-toggle");
  var closeBtn = document.querySelector(".menu-close");
  var backdrop = document.getElementById("mobileNavBackdrop");
  var nav = document.querySelector("header nav");
  var sections = Array.from(document.querySelectorAll("section[id], footer[id]"));
  var heroBackground = document.getElementById("heroBackground");
  var heroDots = document.getElementById("heroSliderDots");
  var searchInput = document.getElementById("siteSearch");
  var searchResults = document.getElementById("searchResults");
  var heroSlides = [
    "https://admin.asiashipping.co/upload/blog/05-importacao-automoveis-banner_e414e4c7-a6f0-4b32-963a-d061d614721c.jpg",
    "https://images.unsplash.com/photo-1494412651409-8963ce7935a7?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1400&q=80"
  ];
  var currentSlide = 0;

  function setMenuState(open) {
    if (!nav) return;
    nav.classList.toggle("open", open);
    if (backdrop) {
      backdrop.classList.toggle("active", open);
    }
    document.body.style.overflow = open ? "hidden" : "";
  }

  function setActiveNav() {
    var scrollPosition = window.scrollY + 140;
    var activeSection = sections.find(function (section) {
      return section.offsetTop <= scrollPosition && section.offsetTop + section.offsetHeight > scrollPosition;
    });

    nav.querySelectorAll("a").forEach(function (link) {
      var href = link.getAttribute("href");
      if (!href || href === "#") return;
      var matches = href.startsWith("#") && activeSection && href === "#" + activeSection.id;
      link.classList.toggle("active", matches);
    });
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenuState(true);
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        setMenuState(false);
      });
    }

    if (backdrop) {
      backdrop.addEventListener("click", function () {
        setMenuState(false);
      });
    }

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenuState(false);
      });
    });
  }

  if (nav) {
    window.addEventListener("scroll", setActiveNav, { passive: true });
    setActiveNav();
  }

  function createHeroDots() {
    if (!heroDots || !heroBackground) return;
    heroSlides.forEach(function (_, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", "Show slide " + (index + 1));
      button.addEventListener("click", function () {
        currentSlide = index;
        renderHeroSlide();
      });
      heroDots.appendChild(button);
    });
  }

  function renderHeroSlide() {
    if (!heroBackground || !heroDots) return;
    heroBackground.style.backgroundImage = "url('" + heroSlides[currentSlide] + "')";
    Array.from(heroDots.children).forEach(function (dot, index) {
      dot.classList.toggle("active", index === currentSlide);
    });
  }

  if (heroBackground && heroDots) {
    createHeroDots();
    renderHeroSlide();
    setInterval(function () {
      currentSlide = (currentSlide + 1) % heroSlides.length;
      renderHeroSlide();
    }, 5000);
  }

  function addRippleEffect(event) {
    var button = event.currentTarget;
    var ripple = document.createElement("span");
    ripple.className = "ripple";
    var rect = button.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = event.clientX - rect.left + "px";
    ripple.style.top = event.clientY - rect.top + "px";
    button.appendChild(ripple);
    window.setTimeout(function () {
      ripple.remove();
    }, 500);
  }

  document.querySelectorAll(".hero-btn, .hero-link, .login-btn, .quote-form button, .contact button, .track-form button, .service-card, .box, .route-card, .step").forEach(function (element) {
    element.addEventListener("click", addRippleEffect);
  });

  function validateField(field) {
    var value = field.value.trim();
    var type = field.type;
    if (field.name === "name" || field.name === "subject") {
      return value.length >= 2;
    }
    if (field.name === "email") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    if (field.name === "phone") {
      return value.length >= 7;
    }
    if (field.name === "tracking") {
      return value.length >= 3;
    }
    if (field.tagName === "TEXTAREA") {
      return value.length >= 10;
    }
    return value.length >= 2;
  }

  function applyValidationState(field, isValid) {
    field.style.borderColor = isValid ? "#16a34a" : "#dc2626";
    field.style.boxShadow = isValid ? "0 0 0 3px rgba(22,163,74,.15)" : "0 0 0 3px rgba(220,38,38,.15)";
  }

  function attachValidation(form) {
    if (!form) return;
    form.querySelectorAll("input, textarea, select").forEach(function (field) {
      field.addEventListener("blur", function () {
        applyValidationState(field, validateField(field));
      });
      field.addEventListener("input", function () {
        applyValidationState(field, validateField(field));
      });
    });

    form.addEventListener("submit", function (event) {
      var valid = true;
      form.querySelectorAll("input, textarea, select").forEach(function (field) {
        if (field.hasAttribute("required") && !validateField(field)) {
          valid = false;
          applyValidationState(field, false);
        }
      });
      if (!valid) {
        event.preventDefault();
      }
    });
  }

  attachValidation(document.getElementById("quoteForm"));
  attachValidation(document.getElementById("contactForm"));
  attachValidation(document.getElementById("trackForm"));

  var trackForm = document.getElementById("trackForm");
  if (trackForm) {
    trackForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = trackForm.querySelector('input[name="tracking"]');
      var value = input ? input.value.trim() : "";
      if (!value) {
        input.focus();
        return;
      }
      window.location.href = "tracking.html?ref=" + encodeURIComponent(value);
    });
  }

  function ensureToastContainer() {
    var existing = document.getElementById('asanToastContainer');
    if (existing) return existing;

    var container = document.createElement('div');
    container.id = 'asanToastContainer';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    container.style.position = 'fixed';
    container.style.right = '18px';
    container.style.bottom = '86px';
    container.style.zIndex = '10003';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.pointerEvents = 'none';

    var style = document.createElement('style');
    style.textContent = `
      #asanToastContainer .asan-toast{
        pointer-events: auto;
        background: rgba(255,255,255,.96);
        border: 1px solid rgba(0,183,255,.22);
        box-shadow: 0 18px 60px rgba(0,0,0,.16);
        backdrop-filter: blur(10px);
        border-radius: 14px;
        padding: 12px 14px;
        color: #0f172a;
        font-weight: 600;
        max-width: 360px;
        transform: translateY(10px);
        opacity: 0;
        animation: asanToastIn .22s ease forwards;
      }
      @keyframes asanToastIn{ to{ transform: translateY(0); opacity: 1; } }
      #asanToastContainer .asan-toast .asan-toast-sub{
        font-weight: 500;
        opacity: .8;
        margin-top: 2px;
        font-size: 13px;
      }
      @media (max-width: 520px){
        #asanToastContainer{ right: 12px; left: 12px; }
        #asanToastContainer .asan-toast{ max-width: none; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(container);
    return container;
  }

  function showSuccess(message) {
    var container = ensureToastContainer();

    var toast = document.createElement('div');
    toast.className = 'asan-toast';

    var title = document.createElement('div');
    title.textContent = message;

    toast.appendChild(title);
    container.appendChild(toast);

    window.setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'opacity .18s ease, transform .18s ease';
      window.setTimeout(function () {
        toast.remove();
      }, 200);
    }, 4500);
  }


  var quoteForm = document.getElementById("quoteForm");
  if (quoteForm) {
    quoteForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = quoteForm.querySelector('[name="name"]').value.trim();
      var okMsg =
        "Thanks " +
        name +
        "! Your quote request was received. We will contact you within 24 hours.";
      showSuccess(okMsg);
      quoteForm.reset();

    });
  }

  var contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();
      showSuccess("Thank you! Your message has been sent. We will get back to you shortly.");
      contactForm.reset();
    });
  }

  if (searchInput && searchResults) {
    var searchItems = [
      { title: "Vehicle Import", text: "Complete vehicle import service from sourcing to delivery." },
      { title: "Vehicle Sourcing", text: "We find and inspect vehicles from major markets worldwide." },
      { title: "Documentation", text: "Import paperwork, customs forms, and compliance support." },
      { title: "Customs Clearance", text: "Dedicated customs support for duties and approvals." },
      { title: "Japan to Ghana", text: "Popular route for Toyota, Honda, and Nissan imports." },
      { title: "USA to Ghana", text: "Flexible route support for North American vehicles." }
    ];

    searchInput.addEventListener("input", function () {
      var query = searchInput.value.trim().toLowerCase();
      if (!query) {
        searchResults.innerHTML = "";
        return;
      }

      var matches = searchItems.filter(function (item) {
        return item.title.toLowerCase().includes(query) || item.text.toLowerCase().includes(query);
      });

      if (!matches.length) {
        searchResults.innerHTML = '<div class="search-result-item">No matching services found yet. Try “vehicle”, “customs”, or “route”.</div>';
        return;
      }

      searchResults.innerHTML = matches.map(function (item) {
        return '<div class="search-result-item"><strong>' + item.title + '</strong><br>' + item.text + '</div>';
      }).join("");
    });
  }

  var backTop = document.getElementById("backTop");
  if (backTop) {
    window.addEventListener("scroll", function () {
      if (window.scrollY > 400) {
        backTop.classList.add("visible");
      } else {
        backTop.classList.remove("visible");
      }
    });
  }

  var counters = Array.from(document.querySelectorAll('.stat h1[data-count]'));
  function animateCounters() {
    counters.forEach(function (counter) {
      var target = parseInt(counter.getAttribute('data-count'), 10);
      var suffix = counter.getAttribute('data-suffix') || '';
      var startTime = null;
      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / 900, 1);
        var value = Math.floor(progress * target);
        counter.textContent = value + suffix;
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          counter.textContent = target + suffix;
        }
      }
      window.requestAnimationFrame(step);
    });
  }

  var statsSection = document.querySelector('.stats');
  if (statsSection) {
    var statsObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounters();
          statsObserver.disconnect();
        }
      });
    }, { threshold: 0.4 });
    statsObserver.observe(statsSection);
  }

  var revealItems = Array.from(document.querySelectorAll("[data-asan-reveal]"));
  if (revealItems.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16 });

    revealItems.forEach(function (item) {
      item.classList.add("reveal");
      revealObserver.observe(item);
    });
  }
})();
