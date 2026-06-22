// verify.js - handles email code verification + Stripe Identity verification

// Show the dev fallback code if no real email service is connected yet
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

// Check current status on load; if already fully verified, skip straight in.
// Also handles the redirect Stripe sends the user back to after their flow.
(async function checkStatus() {
  try {
    const res = await fetch('/api/verification-status');
    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    const data = await res.json();
    if (data.email_verified && data.identity_verified) {
      window.location.href = 'index.html';
      return;
    }
    if (data.email_verified) {
      document.getElementById('emailCard').style.opacity = '0.5';
      document.getElementById('emailCard').style.pointerEvents = 'none';
    }

    // Returning from Stripe's hosted verification flow?
    if (window.location.search.includes('stripe_return=1')) {
      const msgEl = document.getElementById('identityMsg');
      showMsg(msgEl, 'Checking your verification result...', 'pending');
      pollStripeStatus();
    }
  } catch (err) {
    console.error(err);
  }
})();

async function pollStripeStatus(attempt) {
  attempt = attempt || 0;
  const msgEl = document.getElementById('identityMsg');
  try {
    const res = await fetch('/api/identity/check');
    const data = await res.json();
    if (data.status === 'verified') {
      showMsg(msgEl, 'Identity verified! Taking you to the app...', 'success');
      setTimeout(() => window.location.href = 'index.html', 1200);
      return;
    }
    if (data.status === 'requires_input' || data.status === 'processing') {
      if (attempt < 5) {
        showMsg(msgEl, 'Still processing your verification...', 'pending');
        setTimeout(() => pollStripeStatus(attempt + 1), 2500);
      } else {
        showMsg(msgEl, 'Still processing — check back in a minute, or try again.', 'pending');
      }
      return;
    }
    showMsg(msgEl, 'Verification was not completed. Please try again.', 'error');
  } catch (err) {
    showMsg(msgEl, 'Could not check verification status.', 'error');
  }
}

// Email verification
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
    showMsg(msgEl, 'Email verified! Continue to identity verification below.', 'success');
    document.getElementById('emailCard').style.opacity = '0.5';
  } catch (err) {
    showMsg(msgEl, 'Could not reach the server.', 'error');
  }
});

// Start Stripe Identity flow
document.getElementById('startStripeBtn').addEventListener('click', async () => {
  const msgEl = document.getElementById('identityMsg');
  try {
    const res = await fetch('/api/identity/create-session', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      showMsg(msgEl, data.error || 'Could not start verification.', 'error');
      return;
    }
    window.location.href = data.url; // Stripe's hosted verification flow
  } catch (err) {
    showMsg(msgEl, 'Could not reach the server.', 'error');
  }
});
