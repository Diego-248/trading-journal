// plan.js - guards the page, loads the user's saved plan, and autosaves edits

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

function showToast() {
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 1200);
}

let localDebounce;
function debounceLocalSave(key, value) {
  clearTimeout(localDebounce);
  localDebounce = setTimeout(() => {
    localStorage.setItem(key, value);
    showToast();
  }, 600);
}

let planDebounce;
function debounceSavePlan() {
  clearTimeout(planDebounce);
  planDebounce = setTimeout(async () => {
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
      showToast();
    } catch (err) {
      console.error('Could not save plan', err);
    }
  }, 600);
}

premarket.addEventListener('input', () => debounceLocalSave('premarketNotes', premarket.value));
postmarket.addEventListener('input', () => debounceLocalSave('postmarketNotes', postmarket.value));
chartProcess.addEventListener('input', debounceSavePlan);
entryCriteria.addEventListener('input', debounceSavePlan);
exitCriteria.addEventListener('input', debounceSavePlan);
