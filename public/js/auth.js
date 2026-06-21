// auth.js - shared session check + logout handling for protected pages

async function requireLogin() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (!data.loggedIn) {
      window.location.href = 'login.html';
      return null;
    }
    const el = document.getElementById('navUsername');
    if (el) el.textContent = data.username;
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
