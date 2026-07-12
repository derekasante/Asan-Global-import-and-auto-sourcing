/**
 * Asan Global Shipping — canonical sidebar component.
 * Single source of truth for sidebar markup/behavior across every
 * dashboard-family page. Do not hand-author sidebar HTML/CSS per page —
 * add a mount point instead:
 *
 *   <body data-ag-page="dashboard">
 *     <div class="ag-app-shell">
 *       <div id="ag-sidebar-mount"></div>
 *       <div class="ag-sidebar-backdrop" id="ag-sidebar-backdrop"></div>
 *       <main class="ag-main"> ... </main>
 *     </div>
 *     <script src="sidebar.js"></script>
 *
 * `data-ag-page` on <body> must match one of the `key` values below so the
 * matching nav link gets the `.active` state.
 */
(function () {
  var NAV_ITEMS = [
    { key: 'home', href: 'index.html', icon: 'fa-home', label: 'Home' },
    { key: 'dashboard', href: 'dashboard.html', icon: 'fa-th-large', label: 'Dashboard' },
    { key: 'tracking', href: 'tracking.html', icon: 'fa-map-marker-alt', label: 'Tracking' },
    { key: 'import', href: 'import.html', icon: 'fa-file-import', label: 'New Import' },
    { key: 'appliances', href: 'appliances.html', icon: 'fa-blender', label: 'Home Appliances' },
    { key: 'finance', href: 'finance.html', icon: 'fa-wallet', label: 'Finance' },
    { key: 'payment', href: 'payment.html', icon: 'fa-credit-card', label: 'Payments' },
    { key: 'schedule', href: 'schudule.html', icon: 'fa-calendar', label: 'Schedule' },
    { key: 'price', href: 'price.html', icon: 'fa-tag', label: 'Pricing' },
    { key: 'profile', href: 'profile.html', icon: 'fa-user', label: 'Profile' }
  ];

  function isAdmin() {
    try {
      var user = JSON.parse(localStorage.getItem('asan_current_user') || 'null');
      return !!(user && user.role === 'admin');
    } catch (e) {
      return false;
    }
  }

  function buildSidebarHtml(activeKey) {
    var items = NAV_ITEMS.slice();
    if (isAdmin()) {
      items.splice(1, 0, { key: 'admin', href: 'Admin.html', icon: 'fa-user-shield', label: 'Admin Panel' });
    }

    var links = items.map(function (item) {
      var activeClass = item.key === activeKey ? ' active' : '';
      return (
        '<li><a class="' + activeClass.trim() + '" href="' + item.href + '">' +
        '<i class="fas ' + item.icon + '"></i> ' + item.label +
        '</a></li>'
      );
    }).join('');

    return (
      '<aside class="ag-sidebar" id="ag-sidebar">' +
      '<div class="ag-logo">' +
      '<i class="fas fa-car ag-icon-brand"></i>' +
      '<div><h2>Asan Global</h2><span>Vehicle Import Services</span></div>' +
      '</div>' +
      '<nav><ul>' + links +
      '<li><a href="login.html" onclick="if (typeof logout === \'function\') { logout(); return false; }"><i class="fas fa-sign-out-alt"></i> Logout</a></li>' +
      '</ul></nav>' +
      '<div class="ag-sidebar-footer">' +
      '<strong>24/7 Support</strong>' +
      'Live tracking and dedicated support for your imports.' +
      '</div>' +
      '</aside>'
    );
  }

  function init() {
    var mount = document.getElementById('ag-sidebar-mount');
    if (!mount) return;

    var activeKey = document.body.getAttribute('data-ag-page') || '';
    mount.outerHTML = buildSidebarHtml(activeKey);

    var sidebar = document.getElementById('ag-sidebar');
    var backdrop = document.getElementById('ag-sidebar-backdrop');
    var toggles = document.querySelectorAll('[data-ag-sidebar-toggle]');

    function openSidebar() {
      sidebar.classList.add('ag-open');
      if (backdrop) backdrop.classList.add('ag-open');
    }

    function closeSidebar() {
      sidebar.classList.remove('ag-open');
      if (backdrop) backdrop.classList.remove('ag-open');
    }

    toggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (sidebar.classList.contains('ag-open')) {
          closeSidebar();
        } else {
          openSidebar();
        }
      });
    });

    if (backdrop) {
      backdrop.addEventListener('click', closeSidebar);
    }

    // Close on nav click (mobile)
    sidebar.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.innerWidth <= 960) closeSidebar();
      });
    });

    document.dispatchEvent(new CustomEvent('ag:sidebar-ready'));
  }

  function initReveal() {
    var targets = document.querySelectorAll('.ag-reveal');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('ag-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('ag-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    targets.forEach(function (el) { observer.observe(el); });
  }

  function initAll() {
    init();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
