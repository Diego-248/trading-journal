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
let mtf2ImageData = '';
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
wireUploadBox('mtf2Box', 'mtf2Input', 'mtf2Preview', (v) => mtf2ImageData = v);
wireUploadBox('ltfBox', 'ltfInput', 'ltfPreview', (v) => ltfImageData = v);

function resetUploadBoxes() {
  htfImageData = '';
  mtfImageData = '';
  mtf2ImageData = '';
  ltfImageData = '';
  ['htf', 'mtf', 'mtf2', 'ltf'].forEach(prefix => {
    document.getElementById(prefix + 'Preview').style.display = 'none';
    document.getElementById(prefix + 'Box').querySelector('.upload-placeholder').style.display = 'inline';
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
    mtf2_image: mtf2ImageData,
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
  } else {
    showToast('Error saving trade');
  }
});

