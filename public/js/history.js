// history.js - loads all journal entries as collapsed summary rows;
// tapping a row expands it to show the full trade detail.

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
      ? '<span class="badge yes">Yes</span>'
      : '<span class="badge no">No</span>';

    const card = document.createElement('div');
    card.className = 'card entry-card';

    const summary = document.createElement('div');
    summary.className = 'entry-summary';
    summary.style.cssText = 'display:flex; justify-content:space-between; align-items:center; cursor:pointer;';
    summary.innerHTML = `
      <div>
        <strong>${e.symbol || 'Untitled trade'}</strong>
        <span class="meta"> — ${e.trade_date || ''} — ${e.result || ''}</span>
      </div>
      <div>${followedBadge} <span class="expand-arrow" style="margin-left:8px; color:var(--muted);">▾</span></div>
    `;

    const detail = document.createElement('div');
    detail.className = 'entry-detail';
    detail.style.display = 'none';
    detail.style.marginTop = '14px';
    detail.innerHTML = `
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

      ${(e.htf_image || e.mtf_image || e.ltf_image) ? `
      <div class="entry-section">
        <div class="label">Chart screenshots (tap to enlarge)</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
          ${e.htf_image ? `<div><div style="font-size:0.75rem; color:var(--muted); margin-bottom:4px;">HTF</div><img src="${e.htf_image}" class="chart-thumb" style="width:100px; height:80px; object-fit:cover; border-radius:6px; cursor:pointer;"></div>` : ''}
          ${e.mtf_image ? `<div><div style="font-size:0.75rem; color:var(--muted); margin-bottom:4px;">MTF</div><img src="${e.mtf_image}" class="chart-thumb" style="width:100px; height:80px; object-fit:cover; border-radius:6px; cursor:pointer;"></div>` : ''}
          ${e.ltf_image ? `<div><div style="font-size:0.75rem; color:var(--muted); margin-bottom:4px;">LTF</div><img src="${e.ltf_image}" class="chart-thumb" style="width:100px; height:80px; object-fit:cover; border-radius:6px; cursor:pointer;"></div>` : ''}
        </div>
      </div>` : ''}
    `;

    summary.addEventListener('click', () => {
      const isOpen = detail.style.display === 'block';
      detail.style.display = isOpen ? 'none' : 'block';
      summary.querySelector('.expand-arrow').textContent = isOpen ? '▾' : '▴';
    });

    card.appendChild(summary);
    card.appendChild(detail);
    wrap.appendChild(card);
  }

  wrap.querySelectorAll('.chart-thumb').forEach(img => {
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(img.src);
    });
  });
}

function openLightbox(src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.85);
    display:flex; align-items:center; justify-content:center; z-index:999; padding:20px;
  `;
  overlay.innerHTML = `<img src="${src}" style="max-width:100%; max-height:100%; border-radius:8px;">`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadEntries();
