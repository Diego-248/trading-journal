// settings.js - guards the page and shows app version

requireLogin();

fetch('/api/version')
  .then(res => res.json())
  .then(data => {
    const el = document.getElementById('appVersion');
    if (el) el.textContent = 'v' + data.version;
  })
  .catch(() => {});
