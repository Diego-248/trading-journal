// auth.js - shared session check + logout handling + "new version available" prompt

async function requireLogin(skipVerificationCheck) {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (!data.loggedIn) {
      window.location.href = 'login.html';
      return null;
    }

    if (!skipVerificationCheck) {
      const statusRes = await fetch('/api/verification-status');
      const status = await statusRes.json();
      if (!status.email_verified) {
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
  setupMenuButton();
});

// ---------- Three-dot menu button (top-left) for switching between screens ----------
function setupMenuButton() {
  const navbar = document.querySelector('.navbar');
  const navLinks = document.querySelector('.nav-links');
  if (!navbar || !navLinks || document.getElementById('menuBtn')) return;

  const menuBtn = document.createElement('button');
  menuBtn.id = 'menuBtn';
  menuBtn.setAttribute('aria-label', 'Menu');
  menuBtn.textContent = '⋮';
  menuBtn.style.cssText = `
    background: var(--panel-2); border: 1px solid var(--border); color: var(--text);
    font-size: 1.3rem; line-height: 1; width: 38px; height: 38px; border-radius: 8px;
    cursor: pointer; margin-right: 12px; order: -1;
  `;

  const dropdown = document.createElement('div');
  dropdown.id = 'menuDropdown';
  dropdown.style.cssText = `
    position: absolute; top: 62px; left: 12px; background: var(--panel);
    border: 1px solid var(--border); border-radius: 10px; padding: 8px;
    display: none; flex-direction: column; min-width: 180px; z-index: 200;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  `;

  // Build the menu from the same links already in the top nav
  navLinks.querySelectorAll('a').forEach(link => {
    const item = document.createElement('a');
    item.href = link.getAttribute('href');
    item.textContent = link.textContent;
    item.style.cssText = `
      padding: 10px 12px; border-radius: 6px; color: ${link.classList.contains('active') ? 'var(--accent)' : 'var(--text)'};
      font-weight: ${link.classList.contains('active') ? '700' : '500'}; text-decoration: none; font-size: 0.92rem;
    `;
    dropdown.appendChild(item);
  });

  navbar.style.position = 'relative';
  navbar.insertBefore(menuBtn, navbar.firstChild);
  navbar.appendChild(dropdown);

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== menuBtn) {
      dropdown.style.display = 'none';
    }
  });
}

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
    <button id="updateNowBtn" style="background:#0a0a0a; color:#3ddc97; border:none; padding:8px 14px; border-radius:6px; font-weight:700; cursor:pointer;">Download & Update</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('updateNowBtn').addEventListener('click', async () => {
    banner.querySelector('span').textContent = 'Opening your browser to download the update...';
    document.getElementById('updateNowBtn').disabled = true;

    // Clear old cached files so the browser pulls everything fresh
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) { /* ignore */ }

    if (registration.waiting) {
      registration.waiting.postMessage('skipWaiting');
    }

    // Send the user out to their actual browser (not the installed app window)
    // to fetch the new version directly from the server.
    const freshUrl = window.location.origin + '/login.html?fresh=' + Date.now();
    window.open(freshUrl, '_blank');
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
