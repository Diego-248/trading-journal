// settings.js - guards the page, loads account info, and handles
// email add/verify/update, date of birth, and password change.

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
    document.getElementById('usernameInput').value = data.username || '';

    // ---- Email section ----
    const emailEl = document.getElementById('infoEmail');
    const emailEditWrap = document.getElementById('emailEditWrap');
    const updateEmailBtn = document.getElementById('updateEmailBtn');
    const verifyCard = document.getElementById('verifyCard');

    if (data.email) {
      const tag = data.email_verified
        ? '<span class="verified-tag">Verified</span>'
        : '<span class="unverified-tag">Not verified</span>';
      emailEl.innerHTML = `${data.email} &nbsp; ${tag}`;
      document.getElementById('emailInput').value = data.email;
      // Email already set: hide the Save flow, show Update button instead
      emailEditWrap.style.display = 'none';
      updateEmailBtn.style.display = 'block';
      verifyCard.style.display = data.email_verified ? 'none' : 'block';
    } else {
      emailEl.textContent = 'No email added yet';
      emailEditWrap.style.display = 'block';
      updateEmailBtn.style.display = 'none';
      verifyCard.style.display = 'none';
    }

    // ---- Date of birth section ----
    const dobEditWrap = document.getElementById('dobEditWrap');
    const dobDisplay = document.getElementById('dobDisplay');
    if (data.date_of_birth) {
      dobDisplay.textContent = new Date(data.date_of_birth).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      dobDisplay.style.display = 'block';
      dobEditWrap.style.display = 'none';
    } else {
      dobDisplay.style.display = 'none';
      dobEditWrap.style.display = 'block';
    }
  } catch (err) {
    console.error('Could not load account', err);
  }
}
loadAccount();

document.getElementById('updateEmailBtn').addEventListener('click', () => {
  document.getElementById('emailEditWrap').style.display = 'block';
  document.getElementById('updateEmailBtn').style.display = 'none';
});

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
    if (data.emailSent) {
      showMsg(msgEl, 'Email saved. A verification code was sent to your inbox.', 'success');
    } else {
      showMsg(msgEl, 'Email saved. (No email service connected yet — code shown below.)', 'success');
      if (data.devCode) {
        document.getElementById('devCodeDisplay').textContent = 'Your code: ' + data.devCode;
      }
    }
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

document.getElementById('saveDobBtn').addEventListener('click', async () => {
  const dob = document.getElementById('dobInput').value;
  const msgEl = document.getElementById('dobMsg');
  try {
    const res = await fetch('/api/account/dob', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_of_birth: dob })
    });
    const data = await res.json();
    if (!res.ok) {
      showMsg(msgEl, data.error || 'Could not save date of birth.', 'error');
      return;
    }
    showMsg(msgEl, 'Date of birth saved.', 'success');
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

document.getElementById('updateUsernameBtn').addEventListener('click', () => {
  document.getElementById('usernameEditWrap').style.display = 'block';
  document.getElementById('updateUsernameBtn').style.display = 'none';
});

document.getElementById('saveUsernameBtn').addEventListener('click', async () => {
  const username = document.getElementById('usernameInput').value.trim();
  const msgEl = document.getElementById('usernameMsg');
  try {
    const res = await fetch('/api/account/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const data = await res.json();
    if (!res.ok) {
      showMsg(msgEl, data.error || 'Could not update username.', 'error');
      return;
    }
    showMsg(msgEl, 'Username updated.', 'success');
    document.getElementById('usernameEditWrap').style.display = 'none';
    document.getElementById('updateUsernameBtn').style.display = 'block';
    loadAccount();
  } catch (err) {
    showMsg(msgEl, 'Could not reach the server.', 'error');
  }
});
