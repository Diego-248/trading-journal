// plan.js - guards the page, loads the user's saved plan, and toggles each
// section between an editable textarea and a clean readable text display.

requireLogin();

const toast = document.getElementById('toast');
function showToast(msg) {
  toast.textContent = msg || 'Saved';
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 1200);
}

// Generic toggle controller for one plan section
function setupSection(textareaId, submitId, displayId, editId, getValue, onSave) {
  const textarea = document.getElementById(textareaId);
  const submitBtn = document.getElementById(submitId);
  const display = document.getElementById(displayId);
  const editBtn = document.getElementById(editId);

  function showSaved(text) {
    textarea.style.display = 'none';
    submitBtn.style.display = 'none';
    display.textContent = text;
    display.style.display = 'block';
    editBtn.style.display = 'inline-block';
  }

  function showEditing() {
    textarea.style.display = 'block';
    submitBtn.style.display = 'inline-block';
    display.style.display = 'none';
    editBtn.style.display = 'none';
  }

  submitBtn.addEventListener('click', async () => {
    const value = textarea.value.trim();
    if (!value) return;
    await onSave();
    showSaved(value);
  });

  editBtn.addEventListener('click', () => showEditing());

  return { showSaved, showEditing };
}

// ---------- Premarket / Postmarket (stored locally on this device) ----------
const premarket = document.getElementById('premarket');
const postmarket = document.getElementById('postmarket');

const premarketCtrl = setupSection('premarket', 'submitPremarket', 'premarketDisplay', 'editPremarket',
  () => premarket.value,
  async () => { localStorage.setItem('premarketNotes', premarket.value); showToast('Premarket routine saved'); }
);
const postmarketCtrl = setupSection('postmarket', 'submitPostmarket', 'postmarketDisplay', 'editPostmarket',
  () => postmarket.value,
  async () => { localStorage.setItem('postmarketNotes', postmarket.value); showToast('Post market routine saved'); }
);

const savedPremarket = localStorage.getItem('premarketNotes') || '';
const savedPostmarket = localStorage.getItem('postmarketNotes') || '';
premarket.value = savedPremarket;
postmarket.value = savedPostmarket;
if (savedPremarket.trim()) premarketCtrl.showSaved(savedPremarket);
if (savedPostmarket.trim()) postmarketCtrl.showSaved(savedPostmarket);

// ---------- Chart process / Entry criteria / Exit criteria (stored in DB) ----------
const chartProcess = document.getElementById('chart_process');
const entryCriteria = document.getElementById('entry_criteria');
const exitCriteria = document.getElementById('exit_criteria');

async function savePlanField() {
  await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chart_process: chartProcess.value,
      entry_criteria: entryCriteria.value,
      exit_criteria: exitCriteria.value
    })
  });
}

const chartProcessCtrl = setupSection('chart_process', 'submitChartProcess', 'chartProcessDisplay', 'editChartProcess',
  () => chartProcess.value,
  async () => { await savePlanField(); showToast('Chart process saved'); }
);
const entryCriteriaCtrl = setupSection('entry_criteria', 'submitEntryCriteria', 'entryCriteriaDisplay', 'editEntryCriteria',
  () => entryCriteria.value,
  async () => { await savePlanField(); showToast('Entry criteria saved'); }
);
const exitCriteriaCtrl = setupSection('exit_criteria', 'submitExitCriteria', 'exitCriteriaDisplay', 'editExitCriteria',
  () => exitCriteria.value,
  async () => { await savePlanField(); showToast('Exit criteria saved'); }
);

(async function loadPlan() {
  try {
    const res = await fetch('/api/plan');
    const data = await res.json();
    chartProcess.value = data.chart_process || '';
    entryCriteria.value = data.entry_criteria || '';
    exitCriteria.value = data.exit_criteria || '';

    if (chartProcess.value.trim()) chartProcessCtrl.showSaved(chartProcess.value);
    if (entryCriteria.value.trim()) entryCriteriaCtrl.showSaved(entryCriteria.value);
    if (exitCriteria.value.trim()) exitCriteriaCtrl.showSaved(exitCriteria.value);
  } catch (err) {
    console.error('Could not load plan', err);
  }
})();
