// calendar.js - guards the page and renders a month calendar, colouring
// each trading day green (followed plan) or red (didn't follow plan)

requireLogin();

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let allEntries = [];

async function loadEntries() {
  try {
    const res = await fetch('/api/journal');
    allEntries = await res.json();
    renderCalendar();
  } catch (err) {
    console.error('Could not load journal entries', err);
  }
}

// Decide a colour for a given date: red if ANY trade that day broke the plan,
// otherwise green if at least one trade followed the plan.
function getDayStatus(dateStr) {
  const dayEntries = allEntries.filter(e => e.trade_date === dateStr);
  if (!dayEntries.length) return null;
  if (dayEntries.some(e => e.followed_plan === 'No')) return 'broke';
  if (dayEntries.some(e => e.followed_plan === 'Yes')) return 'followed';
  return null;
}

function renderCalendar() {
  const label = document.getElementById('calMonthLabel');
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  const monthName = new Date(currentYear, currentMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  label.textContent = monthName;

  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
    const dow = document.createElement('div');
    dow.className = 'cal-dow';
    dow.textContent = d;
    grid.appendChild(dow);
  });

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.textContent = day;

    const m = (currentMonth + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const dateStr = `${currentYear}-${m}-${d}`;

    const status = getDayStatus(dateStr);
    if (status === 'followed') cell.classList.add('followed');
    if (status === 'broke') cell.classList.add('broke');

    grid.appendChild(cell);
  }
}

document.getElementById('prevMonthBtn').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
});

document.getElementById('nextMonthBtn').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
});

loadEntries();
