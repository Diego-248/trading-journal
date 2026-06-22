// plan.js - guards the page, loads the user's saved plan, autosaves edits,
// and wires up explicit Submit buttons for clear save confirmation.

requireLogin();

const premarket = document.getElementById('premarket');
const postmarket = document.getElementById('postmarket');
const chartProcess = document.getElementById('chart_process');
const entryCriteria = document.getElementById('entry_criteria');
const exitCriteria = document.getElementById('exit_criteria');
const toast = document.getElementById('toast');

// Premarket/postmarket notes stay local to the device
premarket.value = localStorage.getItem('premarketNotes') || '';
postmarket.value = localStorage.getItem('postmarketNotes') || '';

// Chart process / entry / exit criteria are personal to the account, stored in the database
async function loadPlan() {
  try {
    const res = await fetch('/api/plan');
    const data = await res.json();
    chartProcess.value = data.chart_process || '';
    entryCriteria.value = data.entry_criteria || '';
    exitCriteria.value = data.exit_criteria || '';
  } catch (err) {
    console.error('Could not load plan', err);
  }
}
loadPlan();

function showToast(msg) {
  toast.textContent = msg || 'Saved';
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 1200);
}

function saveLocal(key, value, msg) {
  localStorage.setItem(key, value);
  showToast(msg);
}

async function savePlan(msg) {
  try {
    await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chart_process: chartProcess.value,
        entry_criteria: entryCriteria.value,
        exit_criteria: exitCriteria.value
      })
    });
    showToast(msg);
  } catch (err) {
    console.error('Could not save plan', err);
    showToast('Error saving');
  }
}

// Autosave (debounced) as a backup, still works while typing
let localDebounce;
premarket.addEventListener('input', () => {
  clearTimeout(localDebounce);
  localDebounce = setTimeout(() => saveLocal('premarketNotes', premarket.value), 800);
});
let localDebounce2;
postmarket.addEventListener('input', () => {
  clearTimeout(localDebounce2);
  localDebounce2 = setTimeout(() => saveLocal('postmarketNotes', postmarket.value), 800);
});
let planDebounce;
[chartProcess, entryCriteria, exitCriteria].forEach(el => {
  el.addEventListener('input', () => {
    clearTimeout(planDebounce);
    planDebounce = setTimeout(() => savePlan(), 800);
  });
});

// Explicit Submit buttons
document.getElementById('submitPremarket').addEventListener('click', () =>
  saveLocal('premarketNotes', premarket.value, 'Premarket routine saved'));

document.getElementById('submitPostmarket').addEventListener('click', () =>
  saveLocal('postmarketNotes', postmarket.value, 'Post market routine saved'));

document.getElementById('submitChartProcess').addEventListener('click', () =>
  savePlan('Chart process saved'));

document.getElementById('submitEntryCriteria').addEventListener('click', () =>
  savePlan('Entry criteria saved'));

document.getElementById('submitExitCriteria').addEventListener('click', () =>
  savePlan('Exit criteria saved'));
