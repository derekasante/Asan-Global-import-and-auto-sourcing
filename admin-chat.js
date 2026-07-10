(() => {
  const CHAT_KEY = 'asan_admin_chat';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  }

  function getAdminChat() {
    try {
      return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function setAdminChat(messages) {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  }

  function getDemoClientName() {
    const names = [
      'Kwame A.',
      'Sarah M.',
      'Ibrahim K.',
      'Fatima S.',
      'Bright M.',
      'Nana Akosua',
      'Esi Agyeman',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  function ensureSeedMessages() {
    const msgs = getAdminChat();
    if (msgs.length > 0) return;

    const client1 = getDemoClientName();
    const client2 = getDemoClientName();

    setAdminChat([
      {
        id: Date.now() - 100000,
        sender: 'Client',
        clientName: client1,
        text: 'Hi admin, I just signed the client agreement. When can I submit my import request?',
        ts: new Date(Date.now() - 100000).toISOString(),
      },
      {
        id: Date.now() - 90000,
        sender: 'Admin',
        clientName: client1,
        text: 'Thanks! Once you sign, you can submit your import request right away. If you already submitted, share your tracking number and we’ll help.',
        ts: new Date(Date.now() - 90000).toISOString(),
      },
      {
        id: Date.now() - 80000,
        sender: 'Client',
        clientName: client2,
        text: 'Okay perfect. My tracking is ASAN-IMP-001-2024—can you confirm the status?',
        ts: new Date(Date.now() - 80000).toISOString(),
      },
    ]);
  }

  function renderMessages() {
    const list = document.getElementById('adminChatMessages');
    if (!list) return;
    const msgs = getAdminChat();

    list.innerHTML = msgs
      .slice(-50)
      .map((m) => {
        const isAdmin = m.sender === 'Admin';
        const bubbleClass = isAdmin ? 'bot' : 'user';

        // Identification like WhatsApp/Instagram: show name above each message.
        const senderLabel = isAdmin
          ? `Admin`
          : (m.senderName ? `${m.senderName}` : (m.clientName ? `${m.clientName}` : 'Client'));

        return `
          <div class="chat-bubble ${bubbleClass}">
            <div>${escapeHtml(senderLabel)}</div>
            <div style="white-space:pre-wrap;">${escapeHtml(m.text)}</div>
            <div style="font-size:11px;opacity:.65;margin-top:8px;">
              ${new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        `;
      })
      .join('');

    list.scrollTop = list.scrollHeight;
  }

  function sendMessage() {
    const input = document.getElementById('adminChatInput');
    const user = JSON.parse(localStorage.getItem('asan_current_user') || 'null');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const msgs = getAdminChat();
    msgs.push({
      id: Date.now(),
      sender: 'Admin',
      text,
      ts: new Date().toISOString(),
    });
    setAdminChat(msgs);
    input.value = '';
    renderMessages();
  }

  // Optional: simulate a client message so admin can see “receive” behavior.
  function startAutoClientReplies() {
    const adminExists = () => {
      const u = JSON.parse(localStorage.getItem('asan_current_user') || 'null');
      return u && u.role === 'admin';
    };

    const canned = [
      'Can you help me with my tracking number?',
      'How long does customs clearance take?',
      'I submitted my request already—what’s the next step?',
      'I have a question about payment—do I pay after customs clearance?',
      'Please confirm my vehicle import status.',
    ];

    // Reply after admin sends, with small probability.
    let lastCount = getAdminChat().length;
    setInterval(() => {
      if (!adminExists()) return;
      const msgs = getAdminChat();
      if (msgs.length === lastCount) return;

      lastCount = msgs.length;

      // 45% chance to add a client message for demo realism
      if (Math.random() < 0.45) {
        const text = canned[Math.floor(Math.random() * canned.length)];
        const next = getAdminChat();
        next.push({
          id: Date.now() + Math.random(),
          sender: 'Client',
          clientName: getDemoClientName(),
          text,
          ts: new Date().toISOString(),
        });
        setAdminChat(next);
        renderMessages();
      }
    }, 1200);
  }

  window.AdminChat = {
    init() {
      ensureSeedMessages();
      renderMessages();
      startAutoClientReplies();

      const sendBtn = document.getElementById('adminChatSendBtn');
      const form = document.getElementById('adminChatForm');

      if (sendBtn) sendBtn.addEventListener('click', sendMessage);
      if (form)
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          sendMessage();
        });

      window.addEventListener('storage', (e) => {
        if (e.key === CHAT_KEY) renderMessages();
      });

      // Poll occasionally to keep in-sync even without storage events.
      setInterval(renderMessages, 5000);
    },
  };
})();

