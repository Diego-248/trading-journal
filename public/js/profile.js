// profile.js - loads account info, stats, monthly trades, risk settings, discipline score

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

  renderDiscipline(followedPct, total);
  applySavedAvatar();
}

// ---------- Discipline score gauge (1-100, colour coded) ----------
function renderDiscipline(score, totalTrades) {
  const card = document.getElementById('disciplineCard');
  const fill = document.getElementById('disciplineFill');
  const label = document.getElementById('disciplineLabel');
  const desc = document.getElementById('disciplineDesc');

  if (totalTrades === 0) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  let color, message;
  if (score < 40) {
    color = '#e0613f';
    message = 'Low — you\'re straying from your plan often. Review what\'s pulling you off it.';
  } else if (score < 70) {
    color = '#f0c75e';
    message = 'Moderate — you follow your plan sometimes. Aim for more consistency.';
  } else {
    color = '#3ddc97';
    message = 'Strong — you\'re sticking to your plan consistently. Keep it up.';
  }

  fill.style.width = score + '%';
  fill.style.background = color;
  label.textContent = score + ' / 100';
  label.style.color = color;
  desc.textContent = message;
}

// ---------- Trades per month ----------
async function loadMonthly() {
  try {
    const res = await fetch('/api/journal/monthly');
    const rows = await res.json();
    const list = document.getElementById('monthlyList');
    const empty = document.getElementById('monthlyEmpty');
    list.innerHTML = '';

    if (!rows.length) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    for (const r of rows) {
      const [year, month] = r.month.split('-');
      const monthName = new Date(year, month - 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
      const row = document.createElement('div');
      row.className = 'month-row';
      row.innerHTML = `<span>${monthName}</span><span class="count">${r.count}</span>`;
      list.appendChild(row);
    }
  } catch (err) {
    console.error('Could not load monthly trades', err);
  }
}

// ---------- Risk limits ----------
async function loadRiskSettings() {
  try {
    const res = await fetch('/api/account/risk-settings');
    const data = await res.json();
    document.getElementById('dailyMaxLoss').value = data.daily_max_loss_pct || '';
    document.getElementById('dailyMaxGain').value = data.daily_max_gain_pct || '';
    document.getElementById('monthlyMaxGain').value = data.monthly_max_gain_pct || '';
    document.getElementById('monthlyMaxLoss').value = data.monthly_max_loss_pct || '';

    const anyFilled = data.daily_max_loss_pct || data.daily_max_gain_pct || data.monthly_max_gain_pct || data.monthly_max_loss_pct;
    if (anyFilled) {
      setRiskEditing(false);
    }
  } catch (err) {
    console.error('Could not load risk settings', err);
  }
}

function setRiskEditing(editing) {
  const inputs = ['dailyMaxLoss', 'dailyMaxGain', 'monthlyMaxGain', 'monthlyMaxLoss'];
  inputs.forEach(id => document.getElementById(id).disabled = !editing);
  document.getElementById('saveRiskBtn').style.display = editing ? 'inline-block' : 'none';
  document.getElementById('editRiskBtn').style.display = editing ? 'none' : 'inline-block';
}

document.getElementById('editRiskBtn').addEventListener('click', () => setRiskEditing(true));

document.getElementById('saveRiskBtn').addEventListener('click', async () => {
  const msgEl = document.getElementById('riskMsg');
  try {
    await fetch('/api/account/risk-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daily_max_loss_pct: document.getElementById('dailyMaxLoss').value,
        daily_max_gain_pct: document.getElementById('dailyMaxGain').value,
        monthly_max_gain_pct: document.getElementById('monthlyMaxGain').value,
        monthly_max_loss_pct: document.getElementById('monthlyMaxLoss').value
      })
    });
    msgEl.textContent = 'Risk limits saved.';
    msgEl.style.display = 'block';
    setTimeout(() => msgEl.style.display = 'none', 1500);
    setRiskEditing(false);
  } catch (err) {
    console.error('Could not save risk settings', err);
  }
});

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

loadProfile();
loadMonthly();
loadRiskSettings();
