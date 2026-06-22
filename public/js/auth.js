// auth.js - shared session check + logout handling + "new version available" prompt

async function requireLogin(skipVerificationCheck) {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (!data.loggedIn) {
      window.location.href = 'login.html';
      return null;
    }
    const el = document.getElementById('navUsername');
    if (el) el.textContent = data.username;

    if (!skipVerificationCheck) {
      const statusRes = await fetch('/api/verification-status');
      const status = await statusRes.json();
      if (!status.email_verified || !status.identity_verified) {
        window.location.href = 'verify.html';
        return null;
      }
    }
    return data.username;
  } catch (err) {
    window.location.href = 'login.html';
    return null;
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
});

// ---------- Update-available banner ----------
// Shows a small banner with an "Update" button when a new version of the
// app has been deployed, instead of requiring the user to delete/reinstall.

function showUpdateBanner(registration) {
  if (document.getElementById('updateBanner')) return;

  const banner = document.createElement('div');
  banner.id = 'updateBanner';
  banner.style.cssText = `
    position: fixed; bottom: 0; left: 0; right: 0;
    background: #3ddc97; color: #0a0a0a; font-weight: 600;
    padding: 14px 18px; display: flex; align-items: center;
    justify-content: space-between; gap: 12px; z-index: 999;
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  `;
  banner.innerHTML = `
    <span>A new version of the app is available.</span>
    <button id="updateNowBtn" style="background:#0a0a0a; color:#3ddc97; border:none; padding:8px 14px; border-radius:6px; font-weight:700; cursor:pointer;">Update</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('updateNowBtn').addEventListener('click', () => {
    if (registration.waiting) {
      registration.waiting.postMessage('skipWaiting');
    }
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then((registration) => {
    // If there's already a waiting worker (e.g. update happened while app was closed)
    if (registration.waiting) {
      showUpdateBanner(registration);
    }

    // Listen for a new version being found while the app is open
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(registration);
        }
      });
    });

    // Check for updates every time the app is opened/focused
    registration.update();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update();
    });
  }).catch(() => {});

  // When the new service worker takes control, reload so the fresh files load
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
