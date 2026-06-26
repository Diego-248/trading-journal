// history.js - loads all journal entries and shows full lesson/notes per trade

requireLogin();

async function loadEntries() {
  const res = await fetch('/api/journal');
  const entries = await res.json();
  const wrap = document.getElementById('entriesWrap');
  const emptyState = document.getElementById('emptyState');
  wrap.innerHTML = '';

  if (!entries.length) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  for (const e of entries) {
    const followedBadge = e.followed_plan === 'Yes'
      ? '<span class="badge yes">Followed plan: Yes</span>'
      : '<span class="badge no">Followed plan: No</span>';

    const card = document.createElement('div');
    card.className = 'card entry-card';
    card.innerHTML = `
      <div class="entry-head">
        <div>
          <strong>${e.symbol || 'Untitled trade'}</strong>
          <span class="meta"> — ${e.trade_date || ''}</span>
        </div>
        <div>${followedBadge}</div>
      </div>
      <div class="meta">
        Result: ${e.result || '—'} &nbsp;|&nbsp; R: ${e.r_value || '—'} &nbsp;|&nbsp;
        Entry: ${e.entry_price || '—'} &nbsp;|&nbsp; SL: ${e.stop_loss || '—'} &nbsp;|&nbsp; TP: ${e.take_profit || '—'}
      </div>
      <div class="meta">Emotion: ${e.emotion_entry || '—'} → ${e.emotion_after || '—'}</div>

      <div class="entry-section">
        <div class="label">Why I entered the trade</div>
        <div class="value">${e.notes ? escapeHtml(e.notes) : '<em style="color:var(--muted)">Nothing written</em>'}</div>
      </div>

      <div class="entry-section">
        <div class="label">What I learned from this trade</div>
        <div class="value">${e.lesson ? escapeHtml(e.lesson) : '<em style="color:var(--muted)">Nothing written</em>'}</div>
      </div>

      ${(e.htf_image || e.mtf_image || e.mtf2_image || e.ltf_image) ? `
      <div class="entry-section">
        <div class="label">Chart screenshots</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
          ${e.htf_image ? `<div><div style="font-size:0.75rem; color:var(--muted); margin-bottom:4px;">HTF</div><img src="${e.htf_image}" style="width:100px; height:80px; object-fit:cover; border-radius:6px;"></div>` : ''}
          ${e.mtf_image ? `<div><div style="font-size:0.75rem; color:var(--muted); margin-bottom:4px;">MTF</div><img src="${e.mtf_image}" style="width:100px; height:80px; object-fit:cover; border-radius:6px;"></div>` : ''}
          ${e.mtf2_image ? `<div><div style="font-size:0.75rem; color:var(--muted); margin-bottom:4px;">2nd MTF</div><img src="${e.mtf2_image}" style="width:100px; height:80px; object-fit:cover; border-radius:6px;"></div>` : ''}
          ${e.ltf_image ? `<div><div style="font-size:0.75rem; color:var(--muted); margin-bottom:4px;">LTF</div><img src="${e.ltf_image}" style="width:100px; height:80px; object-fit:cover; border-radius:6px;"></div>` : ''}
        </div>
      </div>` : ''}
    `;
    wrap.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadEntries();
