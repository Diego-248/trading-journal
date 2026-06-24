// journal.js - handles journal form submission, chart image uploads, and history rendering

requireLogin();

const toast = document.getElementById('toast');
function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 1500);
}

// ---------- Chart screenshot upload boxes ----------
let htfImageData = '';
let mtfImageData = '';
let ltfImageData = '';

function wireUploadBox(boxId, inputId, previewId, setter) {
  const box = document.getElementById(boxId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);

  box.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result);
      preview.src = reader.result;
      preview.style.display = 'block';
      box.querySelector('.upload-placeholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
  });
}

wireUploadBox('htfBox', 'htfInput', 'htfPreview', (v) => htfImageData = v);
wireUploadBox('mtfBox', 'mtfInput', 'mtfPreview', (v) => mtfImageData = v);
wireUploadBox('ltfBox', 'ltfInput', 'ltfPreview', (v) => ltfImageData = v);

function resetUploadBoxes() {
  htfImageData = '';
  mtfImageData = '';
  ltfImageData = '';
  ['htf', 'mtf', 'ltf'].forEach(prefix => {
    document.getElementById(prefix + 'Preview').style.display = 'none';
    document.getElementById(prefix + 'Box').querySelector('.upload-placeholder').style.display = 'inline';
  });
}

// ---------- History table ----------
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
    notes: document.getElementById('notes').value,
    htf_image: htfImageData,
    mtf_image: mtfImageData,
    ltf_image: ltfImageData
  };

  const res = await fetch('/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    showToast('Trade saved');
    e.target.reset();
    resetUploadBoxes();
    loadHistory();
  } else {
    showToast('Error saving trade');
  }
});

loadHistory();
