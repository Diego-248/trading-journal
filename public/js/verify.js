// verify.js - handles email verification code entry, resend, and redirect once verified

const devCode = sessionStorage.getItem('devVerifyCode');
if (devCode) {
  const note = document.getElementById('devCodeNote');
  note.textContent = 'No email service connected yet — your code is: ' + devCode;
  note.style.display = 'block';
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = 'inline-msg ' + type;
  el.style.display = 'block';
}

(async function checkStatus() {
  try {
    const res = await fetch('/api/verification-status');
    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    const data = await res.json();
    if (data.email_verified) {
      window.location.href = 'index.html';
    }
  } catch (err) {
    console.error(err);
  }
})();

document.getElementById('verifyEmailBtn').addEventListener('click', async () => {
  const code = document.getElementById('emailCode').value.trim();
  const msgEl = document.getElementById('emailMsg');
  try {
    const res = await fetch('/api/account/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) {
      showMsg(msgEl, data.error || 'Incorrect code.', 'error');
      return;
    }
    sessionStorage.removeItem('devVerifyCode');
    showMsg(msgEl, 'Email verified! Taking you to the app...', 'success');
    setTimeout(() => window.location.href = 'index.html', 1000);
  } catch (err) {
    showMsg(msgEl, 'Could not reach the server.', 'error');
  }
});

document.getElementById('resendBtn').addEventListener('click', async () => {
  const msgEl = document.getElementById('emailMsg');
  try {
    const res = await fetch('/api/account/resend-verification', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      showMsg(msgEl, data.error || 'Could not resend code.', 'error');
      return;
    }
    if (!data.emailSent && data.devCode) {
      sessionStorage.setItem('devVerifyCode', data.devCode);
      document.getElementById('devCodeNote').textContent = 'No email service connected yet — your code is: ' + data.devCode;
      document.getElementById('devCodeNote').style.display = 'block';
    }
    showMsg(msgEl, 'A new code has been sent.', 'success');
  } catch (err) {
    showMsg(msgEl, 'Could not reach the server.', 'error');
  }
});
