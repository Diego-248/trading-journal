// plan.js - guards the page and autosaves premarket/postmarket notes

requireLogin();

const premarket = document.getElementById('premarket');
const postmarket = document.getElementById('postmarket');
const toast = document.getElementById('toast');

premarket.value = localStorage.getItem('premarketNotes') || '';
postmarket.value = localStorage.getItem('postmarketNotes') || '';

function showToast() {
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 1200);
}

let debounceTimer;
function debounceSave(key, value) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    localStorage.setItem(key, value);
    showToast();
  }, 600);
}

premarket.addEventListener('input', () => debounceSave('premarketNotes', premarket.value));
postmarket.addEventListener('input', () => debounceSave('postmarketNotes', postmarket.value));
