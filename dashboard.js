const navLinks = document.querySelectorAll('.sidebar nav a');
const notificationBtn = document.querySelector('.topbar-btn');
const notificationPanel = document.querySelector('.notification-panel');
const closeNotif = document.querySelector('.close-notif');
const hamburger = document.querySelector('.hamburger');
const sidebar = document.querySelector('.sidebar');
const searchInput = document.querySelector('.search-box input');
const customerButtons = document.querySelectorAll('.customer-list button');
const trackingInput = document.querySelector('.tracking-form input');
const trackingButton = document.querySelector('.tracking-form button');
const trackingResult = document.querySelector('.tracking-result');
const trackingStatus = document.querySelector('.tracking-status');
const trackingEta = document.querySelector('.tracking-eta');
const trackingLocation = document.querySelector('.tracking-location');
const liveTime = document.querySelector('.live-time');
const progressItems = document.querySelectorAll('.progress-item');
const progressBar = document.querySelector('.progress-bar > div');
const sections = Array.from(document.querySelectorAll('main .panel, main .module-card, main .stats-grid, main .banner'));

navLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const targetId = link.getAttribute('href').replace('#', '');
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    navLinks.forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
  });
});

const updateActiveLink = () => {
  const offset = window.scrollY + 140;
  let currentId = 'overview';

  sections.forEach((section) => {
    if (section.id && offset >= section.offsetTop) {
      currentId = section.id;
    }
  });

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    link.classList.toggle('active', href === `#${currentId}`);
  });
};

window.addEventListener('scroll', updateActiveLink);
window.addEventListener('load', updateActiveLink);

const revealItems = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => revealObserver.observe(item));

if (notificationBtn && notificationPanel) {
  notificationBtn.addEventListener('click', () => {
    notificationPanel.classList.toggle('active');
  });
}

if (closeNotif && notificationPanel) {
  closeNotif.addEventListener('click', () => {
    notificationPanel.classList.remove('active');
  });
}

if (hamburger && sidebar) {
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    document.body.classList.toggle('sidebar-open');
  });
}

if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });
}

customerButtons.forEach((button) => {
  button.addEventListener('click', () => {
    customerButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
  });
});

const trackingData = {
  'ASAN-2048': {
    steps: ['Shipment booked', 'Port handling', 'Customs review', 'Final delivery'],
    status: ['Booked', 'In transit', 'Customs review', 'Arriving soon'],
    eta: ['Completed', 'Today, 16:00', 'Today, 17:15', 'Today, 18:30'],
    location: ['Booked at origin', 'Tema Port • customs pending', 'Customs terminal • inspection', 'Delivery hub • final handoff']
  },
  'ASAN-3312': {
    steps: ['Shipment booked', 'Port handling', 'Customs review', 'Final delivery'],
    status: ['Delivered', 'Delivered', 'Completed', 'Completed'],
    eta: ['Completed', 'Completed', 'Completed', 'Completed'],
    location: ['Accra • client received', 'Accra • client received', 'Accra • client received', 'Accra • client received']
  }
};

let currentTrackingCode = 'ASAN-2048';
let currentStep = 1;

function updateLiveTracking(code = currentTrackingCode) {
  const data = trackingData[code];
  if (!data) return;

  progressItems.forEach((item, index) => {
    item.classList.toggle('active', index <= currentStep);
    const label = item.querySelector('span');
    if (label) {
      const text = label.textContent.trim();
      if (text.includes(data.steps[index])) {
        item.querySelector('span').innerHTML = `<span class="dot"></span> ${data.steps[index]}`;
      }
    }
  });

  const progress = Math.round((currentStep / (data.steps.length - 1)) * 100);
  if (progressBar) progressBar.style.width = `${Math.max(progress, 30)}%`;
  if (trackingStatus) trackingStatus.textContent = data.status[currentStep];
  if (trackingEta) trackingEta.textContent = data.eta[currentStep];
  if (trackingLocation) trackingLocation.textContent = data.location[currentStep];
  if (liveTime) liveTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function advanceTracking() {
  currentStep = (currentStep + 1) % trackingData[currentTrackingCode].steps.length;
  updateLiveTracking(currentTrackingCode);
}

if (trackingButton && trackingInput && trackingResult) {
  trackingButton.addEventListener('click', () => {
    const code = trackingInput.value.trim().toUpperCase();
    const data = trackingData[code];

    if (!data) {
      trackingResult.innerHTML = '<strong>Shipment not found</strong>Please check the tracking code and try again.';
      return;
    }

    currentTrackingCode = code;
    currentStep = code === 'ASAN-3312' ? 3 : 1;
    updateLiveTracking(code);
  });
}

setInterval(advanceTracking, 5000);
updateLiveTracking(currentTrackingCode);

const statValues = document.querySelectorAll('.stat-card h3');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const value = entry.target.dataset.value;
    const suffix = entry.target.dataset.suffix || '';
    let current = 0;
    const target = parseFloat(value);
    const step = () => {
      current += target / 30;
      if (current < target) {
        entry.target.textContent = `${Math.round(current)}${suffix}`;
        requestAnimationFrame(step);
      } else {
        entry.target.textContent = `${target}${suffix}`;
      }
    };
    step();
    observer.unobserve(entry.target);
  });
}, { threshold: 0.45 });

statValues.forEach((value) => observer.observe(value));

const barFills = document.querySelectorAll('.bar-fill');
barFills.forEach((bar, index) => {
  const height = bar.getAttribute('data-height');
  setTimeout(() => {
    bar.style.height = `${height}%`;
  }, 250 * (index + 1));
});
