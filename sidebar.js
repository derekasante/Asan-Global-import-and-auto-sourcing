/**
 * Asan Global — Canonical Sidebar Component v2
 * Injected into every dashboard-family page via:
 *   <body data-ag-page="dashboard">
 *     <div id="ag-sidebar-mount"></div>
 *     ...
 *     <script src="sidebar.js"></script>
 */
(function () {
  'use strict';

  var NAV_GROUPS = [
    {
      label: 'Main',
      items: [
        { key: 'home',      href: 'index.html',      icon: 'fa-home',           label: 'Home' },
        { key: 'dashboard', href: 'dashboard.html',  icon: 'fa-th-large',       label: 'Dashboard' },
        { key: 'tracking',  href: 'tracking.html',   icon: 'fa-map-marker-alt', label: 'Tracking' },
        { key: 'import',    href: 'import.html',      icon: 'fa-file-import',    label: 'New Import' }
      ]
    },
    {
      label: 'Shop',
      items: [
        { key: 'appliances', href: 'appliances.html', icon: 'fa-blender',      label: 'Appliances' },
        { key: 'checkout',   href: 'checkout.html',   icon: 'fa-shopping-cart', label: 'Checkout' }
      ]
    },
    {
      label: 'Finance',
      items: [
        { key: 'finance',  href: 'finance.html',  icon: 'fa-wallet',      label: 'Finance' },
        { key: 'payment',  href: 'payment.html',  icon: 'fa-credit-card', label: 'Payments' },
        { key: 'price',    href: 'price.html',    icon: 'fa-tag',         label: 'Pricing' }
      ]
    },
    {
      label: 'Account',
      items: [
        { key: 'schedule', href: 'schudule.html', icon: 'fa-calendar', label: 'Schedule' },
        { key: 'profile',  href: 'profile.html',  icon: 'fa-user',     label: 'Profile' }
      ]
    }
  ];

  function getUser() {
    try { return JSON.parse(localStorage.getItem('asan_current_user') || 'null'); } catch(e) { return null; }
  }

  function isAdmin() {
    var u = getUser();
    return !!(u && u.role === 'admin');
  }

  function esc(v) {
    return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function buildUserBlock(user) {
    if (!user) return '';
    var initials = (user.name || 'U').split(' ').map(function(p){ return p[0]; }).slice(0,2).join('').toUpperCase();
    var role = (user.role || 'customer');
    var roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    var roleColor = role === 'admin' ? '#ef4444' : role === 'staff' ? '#f59e0b' : 'var(--ag-gold-400)';
    return (
      '<div class="ag-sidebar-user">' +
        '<div class="ag-sidebar-user-avatar">' + esc(initials) + '</div>' +
        '<div class="ag-sidebar-user-info">' +
          '<span class="ag-sidebar-user-name">' + esc(user.name || 'Guest') + '</span>' +
          '<span class="ag-sidebar-user-role" style="color:' + roleColor + ';">' + esc(roleLabel) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function buildNavGroups(activeKey, addAdmin) {
    var groups = JSON.parse(JSON.stringify(NAV_GROUPS));

    if (addAdmin) {
      groups[0].items.splice(1, 0, {
        key: 'admin', href: 'Admin.html', icon: 'fa-user-shield', label: 'Admin Panel'
      });
    }

    return groups.map(function(group) {
      var links = group.items.map(function(item) {
        var active = item.key === activeKey ? ' active' : '';
        return (
          '<li>' +
          '<a class="' + active.trim() + '" href="' + esc(item.href) + '">' +
          '<i class="fas ' + esc(item.icon) + '"></i>' +
          '<span>' + esc(item.label) + '</span>' +
          '</a></li>'
        );
      }).join('');

      return (
        '<div class="ag-nav-group">' +
          '<div class="ag-nav-group-label">' + esc(group.label) + '</div>' +
          '<ul>' + links + '</ul>' +
        '</div>'
      );
    }).join('');
  }

  function buildSidebarHtml(activeKey, user) {
    var adminMode = isAdmin();
    var navHtml = buildNavGroups(activeKey, adminMode);

    return (
      '<aside class="ag-sidebar" id="ag-sidebar" role="navigation" aria-label="Main navigation">' +

        '<div class="ag-logo">' +
          '<svg width="38" height="38" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
            '<rect width="48" height="48" rx="10" fill="url(#sbLogoGrad)"/>' +
            '<defs><linearGradient id="sbLogoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#2563eb"/><stop offset="1" stop-color="#0f2440"/></linearGradient></defs>' +
            '<path d="M8 30h32v3a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-3z" fill="#fff" opacity=".9"/>' +
            '<path d="M10 30l4-9h20l4 9H10z" fill="#fff" opacity=".9"/>' +
            '<path d="M16 21l3-5h10l3 5H16z" fill="#00d4ff"/>' +
            '<circle cx="15" cy="31" r="4" fill="#0f2440"/><circle cx="15" cy="31" r="2" fill="#00d4ff"/>' +
            '<circle cx="33" cy="31" r="4" fill="#0f2440"/><circle cx="33" cy="31" r="2" fill="#00d4ff"/>' +
            '<rect x="38" y="27" width="3" height="2" rx="1" fill="#ffd54f"/>' +
          '</svg>' +
          '<div><h2>Asan Global</h2><span>Vehicle Import Services</span></div>' +
        '</div>' +

        buildUserBlock(user) +

        '<nav>' + navHtml + '</nav>' +

        '<div class="ag-sidebar-footer">' +
          '<a href="login.html" class="ag-sidebar-logout" onclick="if(typeof logout===\'function\'){logout();return false;}">' +
            '<i class="fas fa-sign-out-alt"></i><span>Logout</span>' +
          '</a>' +
          '<div class="ag-sidebar-support">' +
            '<i class="fas fa-headset"></i>' +
            '<span><strong>24/7 Support</strong>Live tracking &amp; import help</span>' +
          '</div>' +
        '</div>' +

      '</aside>'
    );
  }

  function injectCSS() {
    if (document.getElementById('ag-sidebar-v2-css')) return;
    var style = document.createElement('style');
    style.id = 'ag-sidebar-v2-css';
    style.textContent = [
      '.ag-sidebar-user{display:flex;align-items:center;gap:12px;padding:14px 16px;background:rgba(255,255,255,.07);border-radius:var(--ag-radius-sm);margin-bottom:18px;}',
      '.ag-sidebar-user-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--ag-blue-600),#00d4ff);color:#fff;font-size:15px;font-weight:700;display:grid;place-items:center;flex-shrink:0;}',
      '.ag-sidebar-user-info{display:flex;flex-direction:column;min-width:0;}',
      '.ag-sidebar-user-name{font-size:13.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.ag-sidebar-user-role{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;}',
      '.ag-nav-group{margin-bottom:6px;}',
      '.ag-nav-group-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.12em;padding:8px 14px 4px;}',
      '.ag-sidebar nav ul{list-style:none;padding:0;margin:0;}',
      '.ag-sidebar nav li{margin:1px 0;}',
      '.ag-sidebar nav a{color:rgba(255,255,255,.65);text-decoration:none;display:flex;align-items:center;gap:11px;padding:10px 14px;border-radius:var(--ag-radius-sm);transition:background .18s,color .18s,transform .18s;font-size:13.5px;font-weight:500;}',
      '.ag-sidebar nav a i{width:18px;text-align:center;color:rgba(255,255,255,.4);transition:color .18s;flex-shrink:0;font-size:14px;}',
      '.ag-sidebar nav a:hover{background:rgba(255,255,255,.1);color:#fff;transform:translateX(2px);}',
      '.ag-sidebar nav a:hover i{color:#00d4ff;}',
      '.ag-sidebar nav a.active{background:rgba(37,99,235,.28);color:#fff;}',
      '.ag-sidebar nav a.active i{color:var(--ag-gold-400);}',
      '.ag-sidebar-logout{display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.55);text-decoration:none;padding:10px 14px;border-radius:var(--ag-radius-sm);transition:background .18s,color .18s;font-size:13px;font-weight:600;width:100%;}',
      '.ag-sidebar-logout:hover{background:rgba(220,38,38,.18);color:#fca5a5;}',
      '.ag-sidebar-logout i{width:16px;text-align:center;}',
      '.ag-sidebar-support{display:flex;align-items:flex-start;gap:10px;margin-top:12px;padding:12px 14px;background:rgba(255,255,255,.06);border-radius:var(--ag-radius-sm);}',
      '.ag-sidebar-support i{color:var(--ag-gold-400);margin-top:1px;font-size:15px;flex-shrink:0;}',
      '.ag-sidebar-support span{font-size:11.5px;color:rgba(255,255,255,.55);line-height:1.4;}',
      '.ag-sidebar-support strong{display:block;color:rgba(255,255,255,.8);font-size:12px;margin-bottom:2px;}',
      '.ag-sidebar-footer{margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.1);}'
    ].join('');
    document.head.appendChild(style);
  }

  function init() {
    var mount = document.getElementById('ag-sidebar-mount');
    if (!mount) return;

    injectCSS();

    var activeKey = document.body.getAttribute('data-ag-page') || '';
    var user = getUser();
    var sidebarHtml = buildSidebarHtml(activeKey, user);

    var tmp = document.createElement('div');
    tmp.innerHTML = sidebarHtml;
    mount.parentNode.replaceChild(tmp.firstElementChild, mount);

    var sidebar   = document.getElementById('ag-sidebar');
    var backdrop  = document.getElementById('ag-sidebar-backdrop');
    var toggles   = document.querySelectorAll('[data-ag-sidebar-toggle]');

    function openSidebar()  { sidebar.classList.add('ag-open');    if (backdrop) backdrop.classList.add('ag-open'); }
    function closeSidebar() { sidebar.classList.remove('ag-open'); if (backdrop) backdrop.classList.remove('ag-open'); }

    toggles.forEach(function(btn) {
      btn.addEventListener('click', function() {
        sidebar.classList.contains('ag-open') ? closeSidebar() : openSidebar();
      });
    });

    if (backdrop) backdrop.addEventListener('click', closeSidebar);

    sidebar.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() {
        if (window.innerWidth <= 960) closeSidebar();
      });
    });

    document.dispatchEvent(new CustomEvent('ag:sidebar-ready'));
  }

  function initReveal() {
    var targets = document.querySelectorAll('.ag-reveal');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function(el) { el.classList.add('ag-visible'); });
      return;
    }
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) { entry.target.classList.add('ag-visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.08 });
    targets.forEach(function(el) { obs.observe(el); });
  }

  function run() { init(); initReveal(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
