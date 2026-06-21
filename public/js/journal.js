// journal.js - handles journal form submission and history rendering via the API

requireLogin();

const toast = document.getElementById('toast');
function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 1500);
}

async function loadHistory() {
  const res = await fetch('/api/journal');
  const entries = await res.json();
  const body = document.getElementById('historyBody');
  const emptyState = document.getElementById('emptyState');
  body.innerHTML = '';

  if (!entries.length) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  for (const e of entries) {
    const tr = document.createElement('tr');
    const followedBadge = e.followed_plan === 'Yes'
      ? '<span class="badge yes">Yes</span>'
      : '<span class="badge no">No</span>';
    tr.innerHTML = `
      <td>${e.trade_date}</td>
      <td>${e.symbol}</td>
      <td>${e.result}</td>
      <td>${e.r_value}</td>
      <td>${followedBadge}</td>
      <td>${e.emotion_entry} → ${e.emotion_after}</td>
      <td><button class="btn-danger" data-id="${e.id}">Delete</button></td>
    `;
    body.appendChild(tr);
  }

  body.querySelectorAll('.btn-danger').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch('/api/journal/' + btn.dataset.id, { method: 'DELETE' });
      loadHistory();
    });
  });
}

document.getElementById('journalForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const followedEl = document.querySelector('input[name="followed_plan"]:checked');
  const payload = {
    trade_date: document.getElementById('trade_date').value,
    symbol: document.getElementById('symbol').value,
    entry_price: document.getElementById('entry_price').value,
    stop_loss: document.getElementById('stop_loss').value,
    take_profit: document.getElementById('take_profit').value,
    result: document.getElementById('result').value,
    r_value: document.getElementById('r_value').value,
    followed_plan: followedEl ? followedEl.value : '',
    emotion_entry: document.getElementById('emotion_entry').value,
    emotion_after: document.getElementById('emotion_after').value,
    lesson: document.getElementById('lesson').value,
    notes: document.getElementById('notes').value
  };

  const res = await fetch('/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    showToast('Trade saved');
    e.target.reset();
    loadHistory();
  } else {
    showToast('Error saving trade');
  }
});

loadHistory();
