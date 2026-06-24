// edge.js - guards the page and handles the Guiderules submit/edit toggle

requireLogin();

const toast = document.getElementById('toast');
function showToast(msg) {
  toast.textContent = msg || 'Saved';
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 1200);
}

const guiderules = document.getElementById('guiderules');
const submitBtn = document.getElementById('submitGuiderules');
const display = document.getElementById('guiderulesDisplay');
const editBtn = document.getElementById('editGuiderules');

function showSaved(text) {
  guiderules.style.display = 'none';
  submitBtn.style.display = 'none';
  display.textContent = text;
  display.style.display = 'block';
  editBtn.style.display = 'inline-block';
}

function showEditing() {
  guiderules.style.display = 'block';
  submitBtn.style.display = 'inline-block';
  display.style.display = 'none';
  editBtn.style.display = 'none';
}

async function saveGuiderules() {
  // Load existing plan fields first so we don't overwrite them
  let existing = {};
  try {
    const res = await fetch('/api/plan');
    existing = await res.json();
  } catch (err) { /* ignore */ }

  await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chart_process: existing.chart_process || '',
      entry_criteria: existing.entry_criteria || '',
      exit_criteria: existing.exit_criteria || '',
      guiderules: guiderules.value
    })
  });
}

submitBtn.addEventListener('click', async () => {
  const value = guiderules.value.trim();
  if (!value) return;
  await saveGuiderules();
  showToast('Guiderules saved');
  showSaved(value);
});

editBtn.addEventListener('click', () => showEditing());

(async function loadGuiderules() {
  try {
    const res = await fetch('/api/plan');
    const data = await res.json();
    guiderules.value = data.guiderules || '';
    if (guiderules.value.trim()) showSaved(guiderules.value);
  } catch (err) {
    console.error('Could not load guiderules', err);
  }
})();
