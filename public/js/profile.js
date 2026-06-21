// profile.js - loads account info and trade stats

requireLogin();

async function loadProfile() {
  const res = await fetch('/api/profile');
  const data = await res.json();

  document.getElementById('profileUsername').textContent = data.username || '—';
  document.getElementById('avatarInitial').textContent = (data.username || '?').charAt(0).toUpperCase();

  if (data.created_at) {
    const date = new Date(data.created_at + 'Z');
    document.getElementById('profileSince').textContent =
      'Member since ' + date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const total = data.total_trades || 0;
  const followed = data.followed_count || 0;
  const wins = data.wins || 0;
  const losses = data.losses || 0;
  const followedPct = total > 0 ? Math.round((followed / total) * 100) : 0;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statFollowed').textContent = followedPct + '%';
  document.getElementById('statWins').textContent = wins;
  document.getElementById('statLosses').textContent = losses;
}

loadProfile();
