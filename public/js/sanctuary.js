// sanctuary.js - guards the page, handles break timers, ambient sounds,
// and mood-based song suggestions (links out to YouTube search; no audio
// from copyrighted tracks is hosted or streamed directly in the app).

requireLogin();

// ---------- Timer ----------
let timerInterval = null;
let secondsLeft = 0;
let isPaused = false;

const timerDisplay = document.getElementById('timerDisplay');
const timerControls = document.getElementById('timerControls');

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function startTimer(minutes, btn) {
  clearInterval(timerInterval);
  document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  secondsLeft = minutes * 60;
  isPaused = false;
  timerDisplay.style.display = 'block';
  timerControls.style.display = 'flex';
  document.getElementById('pauseTimerBtn').textContent = 'Pause';
  timerDisplay.textContent = formatTime(secondsLeft);

  timerInterval = setInterval(() => {
    if (isPaused) return;
    secondsLeft--;
    timerDisplay.textContent = formatTime(secondsLeft);
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      timerDisplay.textContent = "Time's up";
      playChime();
    }
  }, 1000);
}

document.querySelectorAll('.timer-btn').forEach(btn => {
  btn.addEventListener('click', () => startTimer(parseInt(btn.dataset.minutes), btn));
});

document.getElementById('pauseTimerBtn').addEventListener('click', (e) => {
  isPaused = !isPaused;
  e.target.textContent = isPaused ? 'Resume' : 'Pause';
});

document.getElementById('resetTimerBtn').addEventListener('click', () => {
  clearInterval(timerInterval);
  timerDisplay.style.display = 'none';
  timerControls.style.display = 'none';
  document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
});

// A simple original chime generated with Web Audio API (no copyrighted audio)
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 1.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + 1.2);
    });
  } catch (e) { /* ignore */ }
}

// ---------- Ambient sounds (synthesized with Web Audio API — original, royalty-free) ----------
let audioCtx = null;
let currentSoundNodes = [];
let currentPlayingBtn = null;

function stopCurrentSound() {
  currentSoundNodes.forEach(node => { try { node.stop(); } catch (e) {} });
  currentSoundNodes = [];
  if (currentPlayingBtn) currentPlayingBtn.classList.remove('playing');
  currentPlayingBtn = null;
}

function makeNoiseBuffer(ctx) {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function playSound(type) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const ctx = audioCtx;

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = makeNoiseBuffer(ctx);
  noiseSource.loop = true;

  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  gain.gain.value = 0.18;

  switch (type) {
    case 'rain':
      filter.type = 'highpass'; filter.frequency.value = 1000;
      break;
    case 'ocean': {
      filter.type = 'lowpass'; filter.frequency.value = 600;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.15;
      lfoGain.gain.value = 0.08;
      lfo.connect(lfoGain).connect(gain.gain);
      lfo.start();
      currentSoundNodes.push(lfo);
      break;
    }
    case 'wind':
      filter.type = 'bandpass'; filter.frequency.value = 500; filter.Q.value = 0.5;
      break;
    case 'whitenoise':
      filter.type = 'allpass';
      break;
    case 'fire':
      filter.type = 'lowpass'; filter.frequency.value = 800;
      gain.gain.value = 0.12;
      break;
    case 'hum': {
      const osc = ctx.createOscillator();
      osc.frequency.value = 80;
      osc.type = 'sine';
      const humGain = ctx.createGain();
      humGain.gain.value = 0.1;
      osc.connect(humGain).connect(ctx.destination);
      osc.start();
      currentSoundNodes.push(osc);
      break;
    }
  }

  noiseSource.connect(filter).connect(gain).connect(ctx.destination);
  noiseSource.start();
  currentSoundNodes.push(noiseSource);
}

document.querySelectorAll('.sound-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const wasPlaying = btn.classList.contains('playing');
    stopCurrentSound();
    if (!wasPlaying) {
      playSound(btn.dataset.sound);
      btn.classList.add('playing');
      currentPlayingBtn = btn;
    }
  });
});

// ---------- Mood-based song suggestions ----------
const songsByMood = {
  sad: [
    ['Someone Like You', 'Adele'],
    ['Fix You', 'Coldplay'],
    ['Skinny Love', 'Bon Iver'],
    ['The Night We Met', 'Lord Huron'],
    ['Liability', 'Lorde']
  ],
  relieved: [
    ['Weightless', 'Marconi Union'],
    ['Breathe Me', 'Sia'],
    ['Holocene', 'Bon Iver'],
    ['Sunset Lover', 'Petit Biscuit'],
    ['Better Days', 'NEEDTOBREATHE']
  ],
  calm: [
    ['Clair de Lune', 'Claude Debussy'],
    ['River Flows in You', 'Yiruma'],
    ['Weightless Pt. 1', 'Marconi Union'],
    ['Saturn', 'Sleeping At Last'],
    ['Intro', 'The xx']
  ],
  anxious: [
    ['Breathe', 'Telepopmusik'],
    ['Holocene', 'Bon Iver'],
    ['Mad World', 'Gary Jules'],
    ['The Scientist', 'Coldplay'],
    ['Bloom', 'The Paper Kites']
  ],
  happy: [
    ['Good as Hell', 'Lizzo'],
    ['Walking on Sunshine', 'Katrina & The Waves'],
    ['Happy', 'Pharrell Williams'],
    ['Can\'t Stop the Feeling!', 'Justin Timberlake'],
    ['Uptown Funk', 'Mark Ronson ft. Bruno Mars']
  ],
  motivated: [
    ['Eye of the Tiger', 'Survivor'],
    ['Stronger', 'Kanye West'],
    ['Believer', 'Imagine Dragons'],
    ['Lose Yourself', 'Eminem'],
    ['Titanium', 'David Guetta ft. Sia']
  ]
};

function renderSongs(mood) {
  const list = document.getElementById('songList');
  list.innerHTML = '';
  songsByMood[mood].forEach(([title, artist]) => {
    const query = encodeURIComponent(`${title} ${artist}`);
    const item = document.createElement('div');
    item.className = 'song-item';
    item.innerHTML = `
      <div>
        <div class="song-name">${title}</div>
        <div class="song-artist">${artist}</div>
      </div>
      <a href="https://www.youtube.com/results?search_query=${query}" target="_blank" rel="noopener">Listen</a>
    `;
    list.appendChild(item);
  });
}

document.querySelectorAll('.emotion-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.emotion-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderSongs(tab.dataset.emotion);
  });
});

renderSongs('sad');
