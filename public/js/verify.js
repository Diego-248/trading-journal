// verify.js - handles email code verification + ID/selfie capture and submission

let idImageData = null;
let selfieImageData = null;

// Show the dev fallback code if no real email service is connected yet
const devCode = sessionStorage.getItem('devVerifyCode');
if (devCode) {
  const note = document.getElementById('devCodeNote');
  note.textContent = 'No email service connected yet — your code is: ' + devCode;
  note.style.display = 'block';
}

// Check current status on load; if already fully verified, skip straight in
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
      document.querySelector('.card').style.opacity = '0.5';
      document.querySelector('.card').style.pointerEvents = 'none';
    }
  } catch (err) {
    console.error(err);
  }
})();

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = 'inline-msg ' + type;
  el.style.display = 'block';
}

function readFileAsDataUrl(file, callback) {
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.readAsDataURL(file);
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
    showMsg(msgEl, 'Email verified! Continue to identity document below.', 'success');
  } catch (err) {
    showMsg(msgEl, 'Could not reach the server.', 'error');
  }
});

// ID document capture
document.getElementById('idCameraBtn').addEventListener('click', () => document.getElementById('idCameraInput').click());
document.getElementById('idGalleryBtn').addEventListener('click', () => document.getElementById('idGalleryInput').click());

function handleIdFile(input) {
  const file = input.files[0];
  if (!file) return;
  readFileAsDataUrl(file, (dataUrl) => {
    idImageData = dataUrl;
    const preview = document.getElementById('idPreview');
    preview.src = dataUrl;
    preview.style.display = 'block';
  });
}
document.getElementById('idCameraInput').addEventListener('change', (e) => handleIdFile(e.target));
document.getElementById('idGalleryInput').addEventListener('change', (e) => handleIdFile(e.target));

// Selfie capture
document.getElementById('selfieCameraBtn').addEventListener('click', () => document.getElementById('selfieCameraInput').click());
document.getElementById('selfieCameraInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  readFileAsDataUrl(file, (dataUrl) => {
    selfieImageData = dataUrl;
    const preview = document.getElementById('selfiePreview');
    preview.src = dataUrl;
    preview.style.display = 'block';
  });
});

// Final submission
document.getElementById('submitIdentityBtn').addEventListener('click', async () => {
  const msgEl = document.getElementById('identityMsg');
  const docType = document.getElementById('docType').value;

  if (!idImageData || !selfieImageData) {
    showMsg(msgEl, 'Please provide both an ID document photo and a selfie.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/identity/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType: docType,
        idImage: idImageData,
        selfieImage: selfieImageData
      })
    });
    const data = await res.json();
    if (!res.ok) {
      showMsg(msgEl, data.error || 'Submission failed.', 'error');
      return;
    }
    showMsg(msgEl, 'Verified! Taking you to the app...', 'success');
    setTimeout(() => window.location.href = 'index.html', 1200);
  } catch (err) {
    showMsg(msgEl, 'Could not reach the server.', 'error');
  }
});
