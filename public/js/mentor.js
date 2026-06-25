// mentor.js - guards the page and handles the Mentor AI chat

requireLogin();

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = 'msg ' + (role === 'user' ? 'user' : 'assistant');
  div.textContent = content;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function addTyping() {
  const div = document.createElement('div');
  div.className = 'typing';
  div.id = 'typingIndicator';
  div.textContent = 'Mentor is typing...';
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

async function loadHistory() {
  try {
    const res = await fetch('/api/mentor/messages');
    const messages = await res.json();
    chatMessages.innerHTML = '';
    if (!messages.length) {
      addMessage('assistant', "Hey, I'm your trading mentor. Tell me about a recent trade — what went well, what didn't, or anything on your mind.");
      return;
    }
    messages.forEach(m => addMessage(m.role, m.content));
  } catch (err) {
    console.error('Could not load mentor history', err);
  }
}
loadHistory();

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  addMessage('user', text);
  chatInput.value = '';
  sendBtn.disabled = true;
  addTyping();

  try {
    const res = await fetch('/api/mentor/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    removeTyping();
    if (!res.ok) {
      addMessage('assistant', data.error || 'Something went wrong.');
    } else {
      addMessage('assistant', data.reply);
    }
  } catch (err) {
    removeTyping();
    addMessage('assistant', 'Could not reach the mentor service.');
  }
  sendBtn.disabled = false;
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.getElementById('clearChatBtn').addEventListener('click', async () => {
  if (!confirm('Clear this whole conversation?')) return;
  await fetch('/api/mentor/messages', { method: 'DELETE' });
  loadHistory();
});
