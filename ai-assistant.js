/* AI Assistant - Asan Global
   Clean JS extracted from inline script in index.html */

(function () {
  const toggleBtn = document.getElementById('aiChatToggle');
  const closeBtn = document.getElementById('aiChatClose');
  const chatWindow = document.getElementById('aiChatWindow');
  const input = document.getElementById('aiInput');
  const sendBtn = document.getElementById('aiSend');
  const messagesContainer = document.getElementById('aiChatMessages');

  if (!toggleBtn || !chatWindow || !input || !sendBtn || !messagesContainer) return;

  let isSending = false;

  function toggleChat(force) {
    const shouldOpen = typeof force === 'boolean' ? force : !chatWindow.classList.contains('active');
    chatWindow.classList.toggle('active', shouldOpen);

    if (shouldOpen) {
      // focus after paint
      setTimeout(() => input.focus(), 0);
    }
  }

  function safeText(str) {
    // minimal escaping to avoid HTML injection
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  }

  function addChatMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ai-${sender}`;

    const avatar = sender === 'bot' ? 'fa-robot' : 'fa-user';

    messageDiv.innerHTML = `
      <div class="ai-avatar"><i class="fas ${avatar}" aria-hidden="true"></i></div>
      <div class="ai-message-content">
        <p>${safeText(message)}</p>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function getAIResponse(message) {
    const lowerMessage = message.toLowerCase();

  const vibePrefix = "Bet — I got you. Let’s handle that.";

    const blocked = [
      'football', 'soccer', 'nba', 'basketball', 'cricket', 'tennis', 'man utd', 'liverpool', 'chelsea',
      'instagram', 'instagram story', 'facebook', 'twitter', 'tiktok', 'social media', 'whatsapp status'
    ];

    if (blocked.some(k => lowerMessage.includes(k))) {
      return `${vibePrefix} I’m here for Asan Global website stuff only — import, tracking, payments, and documents. Tell me what you need (like your tracking number or the import status) and I’ll guide you step-by-step.`;
    }

    if (lowerMessage.includes('import') && (lowerMessage.includes('process') || lowerMessage.includes('how') || lowerMessage.includes('start'))) {
      return `${vibePrefix} To start importing with Asan Global: 1) Submit an import request (Import page), 2) We source and quote you, 3) We arrange shipping to your destination port, 4) We handle customs clearance, 5) We deliver to your location. Typical duration: 4–6 weeks depending on origin.`;
    }

    if (lowerMessage.includes('import') && (lowerMessage.includes('cost') || lowerMessage.includes('fee') || lowerMessage.includes('price'))) {
      return `${vibePrefix} Import costs usually include: import fee, customs fee, shipping fee (route-dependent), insurance (optional), and documentation fees. If you share your vehicle value + origin/destination, I can help estimate the breakdown.`;
    }

    if (lowerMessage.includes('document') || lowerMessage.includes('paperwork') || lowerMessage.includes('documents')) {
      return `${vibePrefix} Typical documents include: valid ID/passport, purchase invoice, bill of lading (we provide), import permit (if required), customs declaration, and proof of payment. Tell me your tracking number (ASAN-IMP-...) and I’ll point you to what matters next.`;
    }

    if (lowerMessage.includes('track') || lowerMessage.includes('tracking') || lowerMessage.includes('where is') || lowerMessage.includes('status')) {
      return `${vibePrefix} For tracking: open the Tracking page → paste your tracking number (example: ASAN-IMP-001-2024) → you’ll see the live status, timeline steps, and updates. Drop your tracking number and I’ll tell you what to check next.`;
    }

    if (lowerMessage.includes('progress') || lowerMessage.includes('timeline') || lowerMessage.includes('steps')) {
      return `${vibePrefix} Import progress usually follows: Pending → Documentation → Processing → In Transit → Customs Clearance → Delivered. The timeline on the Tracking page updates as your shipment moves.`;
    }

    if (lowerMessage.includes('pay') || lowerMessage.includes('payment') || lowerMessage.includes('money') || lowerMessage.includes('fee')) {
      return `${vibePrefix} Payments are shown in the Finance/Payment pages. If you tell me your tracking number, I’ll help you find the correct payment option and what status to expect.`;
    }

    if (lowerMessage.includes('refund') || lowerMessage.includes('return')) {
      return `${vibePrefix} Refunds are usually processed within 5–7 business days. Share your tracking number + the reason, and I’ll guide you on the best next step.`;
    }

    if (lowerMessage.includes('dashboard') || lowerMessage.includes('home') || lowerMessage.includes('navigate') || lowerMessage.includes('where')) {
      return `${vibePrefix} Here’s where to go on the website: Tracking (status + timeline) → Finance/Payment (fees) → Import (requests) → Schedule (important dates). Tell me what you’re trying to do and I’ll point you to the exact page.`;
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('contact') || lowerMessage.includes('whatsapp')) {
      return `${vibePrefix} Need help? Use the WhatsApp button on the site, or contact the support details shown on the page. If you share your tracking number, I’ll also tell you the fastest page to check.`;
    }

    if (lowerMessage.includes('vehicle') || lowerMessage.includes('car') || lowerMessage.includes('type')) {
      return `${vibePrefix} We help import many vehicle types (sedans, SUVs, trucks, motorcycles, vans, and more). If you tell me your vehicle type + origin/destination, I can suggest the best way to start your import request.`;
    }

    if (lowerMessage.includes('country') || lowerMessage.includes('origin') || lowerMessage.includes('from') || lowerMessage.includes('destination') || lowerMessage.includes('deliver')) {
      return `${vibePrefix} We support vehicle sourcing from places like Japan, USA, UK, Germany, UAE, and South Korea, and delivery to many African destinations. Share your origin + destination and I’ll guide the next step.`;
    }

    if (lowerMessage.includes('how long') || lowerMessage.includes('time') || lowerMessage.includes('duration') || lowerMessage.includes('weeks')) {
      return `${vibePrefix} Duration depends on origin and processing. A common range is: Japan ~4–5 weeks, USA ~3–4 weeks, Europe ~3–4 weeks, UAE ~2–3 weeks.`;
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return `Hey! ${vibePrefix} What do you need right now — tracking, import steps, payments, or documents?`;
    }

    if (lowerMessage.includes('thank')) {
      return `You’re welcome! 😊 Anything else I can help with on the Asan Global website?`;
    }

    if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return `All good! 👋 Come back anytime. Safe travels!`;
    }

    return `${vibePrefix} I can help mainly with Asan Global website tasks: tracking, import steps, payments/fees, and required documents. What are you trying to do? (Tip: paste your tracking number like ASAN-IMP-001-2024)`;
  }

  function sendAIMessage() {
    if (isSending) return;

    const message = input.value.trim();
    if (!message) return;

    isSending = true;
    addChatMessage(message, 'user');
    input.value = '';

    // Simulate thinking delay
    setTimeout(() => {
      const response = getAIResponse(message);
      addChatMessage(response, 'bot');
      isSending = false;
    }, 500);
  }

  // Wire events
  toggleBtn.addEventListener('click', () => toggleChat());
  if (closeBtn) closeBtn.addEventListener('click', () => toggleChat(false));

  toggleBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleChat();
    }
  });

  sendBtn.addEventListener('click', sendAIMessage);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendAIMessage();
    }
  });
})();

