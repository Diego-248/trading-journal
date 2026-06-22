// settings.js - guards the page, loads account info, and handles
// email add/verify and password change.

requireLogin();

fetch('/api/version')
  .then(res => res.json())
  .then(data => {
    const el = document.getElementById('appVersion');
    if (el) el.textContent = 'v' + data.version;
  })
  .catch(() => {});

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = 'inline-msg ' + type;
  el.style.display = 'block';
}

async function loadAccount() {
  try {
    const res = await fetch('/api/account');
    const data = await res.json();
    document.getElementById('infoUsername').textContent = data.username || '—';

    const emailEl = document.getElementById('infoEmail');
    const verifyCard = document.getElementById('verifyCard');
    if (data.email) {
      const tag = data.email_verified
        ? '<span class="verified-tag">Verified</span>'
        : '<span class="unverified-tag">Not verified</span>';
      emailEl.innerHTML = `${data.email} &nbsp; ${tag}`;
      document.getElementById('emailInput').value = data.email;
      verifyCard.style.display = data.email_verified ? 'none' : 'block';
    } else {
      emailEl.textContent = 'No email added yet';
      verifyCard.style.display = 'none';
    }
  } catch (err) {
    console.error('Could not load account', err);
  }
}
loadAccount();

document.getElementById('saveEmailBtn').addEventListener('click', async () => {
  const email = document.getElementById('emailInput').value.trim();
  const msgEl = document.getElementById('emailMsg');
  try {
    const res = await fetch('/api/account/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      showMsg(msgEl, data.error || 'Could not save email.', 'error');
      return;
    }
    showMsg(msgEl, 'Email saved. Please verify it below.', 'success');
    document.getElementById('devCodeDisplay').textContent = 'Your code: ' + data.devCode;
    document.getElementById('verifyCard').style.display = 'block';
    loadAccount();
  } catch (err) {
    showMsg(msgEl, 'Could not reach the server.', 'error');
  }
});

document.getElementById('verifyBtn').addEventListener('click', async () => {
  const code = document.getElementById('codeInput').value.trim();
  const msgEl = document.getElementById('verifyMsg');
  try {
    const res = await fetch('/api/account/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) {
      showMsg(msgEl, data.error || 'Verification failed.', 'error');
      return;
    }
    showMsg(msgEl, 'Email verified!', 'success');
    loadAccount();
  } catch (err) {
    showMsg(msgEl, 'Could not reach the server.', 'error');
  }
});

document.getElementById('changePasswordBtn').addEventListener('click', async () => {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const msgEl = document.getElementById('passwordMsg');
  try {
    const res = await fetch('/api/account/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      showMsg(msgEl, data.error || 'Could not change password.', 'error');
      return;
    }
    showMsg(msgEl, 'Password changed successfully.', 'success');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
  } catch (err) {
    showMsg(msgEl, 'Could not reach the server.', 'error');
  }
});
