(() => {
  // Each client gets their own private, end-to-end-encrypted-at-rest thread
  // with the admin — no shared/group pool. Threads are keyed by client email:
  //   asan_chat_<clientEmail>  ->  [ { id, sender, iv, ct, ts }, ... ]
  // Message bodies are AES-GCM encrypted before they ever touch localStorage
  // (see security-utils.js) and are only decrypted in memory for rendering.

  const CHAT_PREFIX = 'asan_chat_';
  const LEGACY_CHAT_KEY = 'asan_admin_chat'; // old shared/group chat, no longer used
  const SALT = 'asan-global-admin-chat';
  const ADMIN_EMAIL = 'admin@asan.com';

  const keyCache = new Map();

  function threadKey(clientEmail) {
    return CHAT_PREFIX + String(clientEmail || '').toLowerCase();
  }

  async function getThreadKey(clientEmail) {
    const email = String(clientEmail || '').toLowerCase();
    if (keyCache.has(email)) return keyCache.get(email);
    // Deterministic per-thread passphrase from both participants, so each
    // client<->admin conversation is encrypted with its own unique key.
    const passphrase = `${ADMIN_EMAIL}::${email}::${SALT}`;
    const key = await window.securityUtils?.deriveKey?.(passphrase, `${SALT}:${email}`);
    keyCache.set(email, key || null);
    return key || null;
  }

  function getThread(clientEmail) {
    try {
      return JSON.parse(localStorage.getItem(threadKey(clientEmail)) || '[]');
    } catch {
      return [];
    }
  }

  function setThread(clientEmail, messages) {
    localStorage.setItem(threadKey(clientEmail), JSON.stringify(messages));
  }

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem('asan_users') || '[]');
    } catch {
      return [];
    }
  }

  function getClients() {
    return getUsers().filter((u) => u && u.role !== 'admin' && u.email);
  }

  async function pushMessage(clientEmail, sender, text) {
    const key = await getThreadKey(clientEmail);
    const payload = await window.securityUtils.encryptText(key, text);
    const msgs = getThread(clientEmail);
    msgs.push({ id: Date.now() + Math.random(), sender, ts: new Date().toISOString(), ...payload });
    setThread(clientEmail, msgs);
    return msgs;
  }

  async function ensureSeedMessage(clientEmail, clientName) {
    const msgs = getThread(clientEmail);
    if (msgs.length > 0) return;
    await pushMessage(
      clientEmail,
      'Client',
      `Hi admin, I just signed the client agreement. When can I submit my import request?`
    );
    await pushMessage(
      clientEmail,
      'Admin',
      `Thanks ${clientName ? clientName.split(' ')[0] : ''}! Once you sign, you can submit your import request right away. If you already submitted, share your tracking number and we’ll help.`
    );
  }

  let currentClientEmail = null;

  function populateClientSelect() {
    const select = document.getElementById('adminChatClientSelect');
    if (!select) return;
    const clients = getClients();

    if (clients.length === 0) {
      select.innerHTML = `<option value="">No registered clients yet</option>`;
      currentClientEmail = null;
      return;
    }

    const previous = currentClientEmail;
    select.innerHTML = clients
      .map((c) => `<option value="${window.securityUtils.escapeHtml(c.email)}">${window.securityUtils.escapeHtml(c.name || c.email)} — ${window.securityUtils.escapeHtml(c.email)}</option>`)
      .join('');

    const stillExists = previous && clients.some((c) => c.email === previous);
    currentClientEmail = stillExists ? previous : clients[0].email;
    select.value = currentClientEmail;
  }

  async function renderMessages() {
    const list = document.getElementById('adminChatMessages');
    if (!list) return;

    if (!currentClientEmail) {
      list.innerHTML = `<p style="text-align:center; color:var(--ag-text-400); padding:24px 0;">Select a client to view your private conversation.</p>`;
      return;
    }

    const key = await getThreadKey(currentClientEmail);
    const msgs = getThread(currentClientEmail).slice(-50);

    const rendered = await Promise.all(
      msgs.map(async (m) => {
        const isAdmin = m.sender === 'Admin';
        const bubbleClass = isAdmin ? 'bot' : 'user';
        const text = await window.securityUtils.decryptText(key, m);
        const senderLabel = isAdmin ? 'Admin' : (m.senderName || 'Client');

        return `
          <div class="chat-bubble ${bubbleClass}">
            <div>${window.securityUtils.escapeHtml(senderLabel)}</div>
            <div style="white-space:pre-wrap;">${window.securityUtils.escapeHtml(text)}</div>
            <div style="font-size:11px;opacity:.65;margin-top:8px;">
              <i class="fas fa-lock" title="Encrypted at rest" style="margin-right:4px;"></i>
              ${new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        `;
      })
    );

    list.innerHTML = rendered.join('') || `<p style="text-align:center; color:var(--ag-text-400); padding:24px 0;">No messages yet in this private conversation.</p>`;
    list.scrollTop = list.scrollHeight;
  }

  async function sendMessage() {
    const input = document.getElementById('adminChatInput');
    if (!input || !currentClientEmail) return;

    const text = input.value.trim();
    if (!text) return;

    await pushMessage(currentClientEmail, 'Admin', text);
    input.value = '';
    renderMessages();
  }

  // Optional: simulate the currently-open client occasionally replying, so
  // the demo shows two-way traffic. Always scoped to the single open 1:1
  // thread — never mixed with any other client.
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

    let lastCount = 0;

    setInterval(async () => {
      if (!adminExists() || !currentClientEmail) return;
      const msgs = getThread(currentClientEmail);
      if (msgs.length === lastCount) return;
      lastCount = msgs.length;

      const last = msgs[msgs.length - 1];
      if (last.sender !== 'Admin') return;

      if (Math.random() < 0.45) {
        const text = canned[Math.floor(Math.random() * canned.length)];
        await pushMessage(currentClientEmail, 'Client', text);
        lastCount = getThread(currentClientEmail).length;
        renderMessages();
      }
    }, 1200);
  }

  function migrateAwayFromLegacyGroupChat() {
    // The old implementation stored every client's messages in one shared
    // key, visible to whichever "client" happened to be picked at render
    // time. That was never a real 1:1 conversation — remove it so it can't
    // be confused with the new per-client threads.
    if (localStorage.getItem(LEGACY_CHAT_KEY) !== null) {
      localStorage.removeItem(LEGACY_CHAT_KEY);
    }
  }

  window.AdminChat = {
    async init() {
      migrateAwayFromLegacyGroupChat();
      populateClientSelect();

      if (currentClientEmail) {
        const client = getClients().find((c) => c.email === currentClientEmail);
        await ensureSeedMessage(currentClientEmail, client?.name);
      }

      await renderMessages();
      startAutoClientReplies();

      const sendBtn = document.getElementById('adminChatSendBtn');
      const form = document.getElementById('adminChatForm');
      const select = document.getElementById('adminChatClientSelect');

      if (sendBtn) sendBtn.addEventListener('click', sendMessage);
      if (form) form.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
      if (select) {
        select.addEventListener('change', async () => {
          currentClientEmail = select.value || null;
          if (currentClientEmail) {
            const client = getClients().find((c) => c.email === currentClientEmail);
            await ensureSeedMessage(currentClientEmail, client?.name);
          }
          renderMessages();
        });
      }

      window.addEventListener('storage', (e) => {
        if (currentClientEmail && e.key === threadKey(currentClientEmail)) renderMessages();
        if (e.key === 'asan_users') populateClientSelect();
      });

      // Poll occasionally to keep in-sync even without storage events.
      setInterval(renderMessages, 5000);
    },
  };
})();
