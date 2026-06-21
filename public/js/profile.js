// profile.js - loads account info and trade stats

requireLogin();

async function loadProfile() {
  const res = await fetch('/api/profile');
  const data = await res.json();

  document.getElementById('profileUsername').textContent = data.username || '—';
  document.getElementById('avatarInitial').textContent = (data.username || '?').charAt(0).toUpperCase();

  const total = data.total_trades || 0;
  const followed = data.followed_count || 0;
  const wins = data.wins || 0;
  const losses = data.losses || 0;
  const followedPct = total > 0 ? Math.round((followed / total) * 100) : 0;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statFollowed').textContent = followedPct + '%';
  document.getElementById('statWins').textContent = wins;
  document.getElementById('statLosses').textContent = losses;
  applySavedAvatar();
}

loadProfile();

// ---------- Avatar upload (stored on-device) ----------
const avatarEl = document.getElementById('avatarInitial');
const avatarInput = document.getElementById('avatarInput');
const avatarAddBtn = document.getElementById('avatarAddBtn');

function applySavedAvatar() {
  const saved = localStorage.getItem('avatarImage');
  if (saved) {
    avatarEl.style.backgroundImage = `url(${saved})`;
    avatarEl.textContent = '';
  }
}
applySavedAvatar();

avatarAddBtn.addEventListener('click', () => avatarInput.click());

avatarInput.addEventListener('change', () => {
  const file = avatarInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    localStorage.setItem('avatarImage', reader.result);
    avatarEl.style.backgroundImage = `url(${reader.result})`;
    avatarEl.textContent = '';
  };
  reader.readAsDataURL(file);
});
