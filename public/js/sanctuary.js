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
    if (typeof stopMusic === 'function') stopMusic();
    if (!wasPlaying) {
      playSound(btn.dataset.sound);
      btn.classList.add('playing');
      currentPlayingBtn = btn;
    }
  });
});

// ---------- Mood-based music (original, generated live with Web Audio API — plays inside the app, no external links) ----------
let musicCtx = null;
let musicIntervalId = null;
let musicCurrentBtn = null;

// Musical scales (frequencies in Hz) and tempo/character per track, grouped by mood.
// Everything here is generated on the fly — no copyrighted recordings involved.
// Each "note" plays as a soft chord (root + a harmony note) with a slow piano-like
// attack/decay for a more instrumental, less chip-tune feel.
const tracksByMood = {
  sad: [
    { name: 'Quiet Rain (A minor)', scale: [220.0, 261.6, 293.7, 329.6], harmony: 1.5, tempo: 1600, wave: 'sine' },
    { name: 'Slow Ache', scale: [196.0, 220.0, 246.9, 261.6], harmony: 1.25, tempo: 1800, wave: 'sine' },
    { name: 'Heavy Heart', scale: [174.6, 196.0, 207.7, 233.1], harmony: 1.5, tempo: 1700, wave: 'triangle' },
    { name: 'Grey Sky', scale: [207.7, 233.1, 246.9, 277.2], harmony: 1.25, tempo: 1750, wave: 'sine' },
    { name: 'Letting Go', scale: [185.0, 207.7, 220.0, 246.9], harmony: 1.5, tempo: 1650, wave: 'sine' }
  ],
  relieved: [
    { name: 'Exhale', scale: [261.6, 293.7, 329.6, 392.0], harmony: 1.25, tempo: 1400, wave: 'sine' },
    { name: 'Soft Landing', scale: [246.9, 277.2, 311.1, 369.9], harmony: 1.5, tempo: 1450, wave: 'sine' },
    { name: 'Steady Now', scale: [220.0, 261.6, 293.7, 329.6], harmony: 1.25, tempo: 1500, wave: 'triangle' },
    { name: 'Untangled', scale: [233.1, 277.2, 311.1, 349.2], harmony: 1.5, tempo: 1400, wave: 'sine' },
    { name: 'Clear Mind', scale: [196.0, 246.9, 293.7, 329.6], harmony: 1.25, tempo: 1500, wave: 'sine' }
  ],
  calm: [
    { name: 'Still Water', scale: [261.6, 311.1, 349.2, 392.0], harmony: 1.5, tempo: 2000, wave: 'sine' },
    { name: 'Slow Drift', scale: [220.0, 261.6, 293.7, 349.2], harmony: 1.25, tempo: 2100, wave: 'sine' },
    { name: 'Open Sky', scale: [196.0, 233.1, 277.2, 329.6], harmony: 1.5, tempo: 2000, wave: 'triangle' },
    { name: 'Gentle Pulse', scale: [246.9, 293.7, 329.6, 392.0], harmony: 1.25, tempo: 1900, wave: 'sine' },
    { name: 'Resting Mind', scale: [174.6, 220.0, 261.6, 311.1], harmony: 1.5, tempo: 2150, wave: 'sine' }
  ],
  anxious: [
    { name: 'Settle', scale: [220.0, 246.9, 261.6, 293.7], harmony: 1.25, tempo: 1600, wave: 'sine' },
    { name: 'Ground Yourself', scale: [196.0, 220.0, 246.9, 277.2], harmony: 1.5, tempo: 1650, wave: 'sine' },
    { name: 'Slow Breath', scale: [233.1, 261.6, 293.7, 311.1], harmony: 1.25, tempo: 1700, wave: 'triangle' },
    { name: 'Steady Hands', scale: [207.7, 233.1, 261.6, 293.7], harmony: 1.5, tempo: 1600, wave: 'sine' },
    { name: 'Coming Down', scale: [185.0, 220.0, 246.9, 277.2], harmony: 1.25, tempo: 1750, wave: 'sine' }
  ],
  happy: [
    { name: 'Bright Morning (C major)', scale: [261.6, 329.6, 392.0, 440.0], harmony: 1.25, tempo: 1100, wave: 'triangle' },
    { name: 'Light Steps', scale: [293.7, 349.2, 440.0, 523.3], harmony: 1.25, tempo: 1050, wave: 'sine' },
    { name: 'Sunny Walk', scale: [329.6, 392.0, 440.0, 523.3], harmony: 1.25, tempo: 1000, wave: 'triangle' },
    { name: 'Good News', scale: [349.2, 440.0, 523.3, 587.3], harmony: 1.25, tempo: 1080, wave: 'triangle' },
    { name: 'Celebration', scale: [392.0, 440.0, 523.3, 659.3], harmony: 1.25, tempo: 950, wave: 'sine' }
  ],
  motivated: [
    { name: 'Rise Up', scale: [261.6, 311.1, 392.0, 440.0], harmony: 1.25, tempo: 850, wave: 'triangle' },
    { name: 'Forward', scale: [293.7, 349.2, 440.0, 493.9], harmony: 1.25, tempo: 800, wave: 'sine' },
    { name: 'Drive', scale: [220.0, 277.2, 329.6, 392.0], harmony: 1.5, tempo: 820, wave: 'triangle' },
    { name: 'Push Through', scale: [246.9, 311.1, 369.9, 440.0], harmony: 1.25, tempo: 780, wave: 'sine' },
    { name: 'Next Trade', scale: [277.2, 349.2, 415.3, 493.9], harmony: 1.25, tempo: 800, wave: 'triangle' }
  ]
};

function stopMusic() {
  if (musicIntervalId) {
    clearInterval(musicIntervalId);
    musicIntervalId = null;
  }
  if (musicCurrentBtn) {
    musicCurrentBtn.classList.remove('playing');
    musicCurrentBtn.textContent = 'Play';
    musicCurrentBtn = null;
  }
}

function playMusic(track, btn) {
  stopMusic();
  if (typeof stopCurrentSound === 'function') stopCurrentSound();
  if (!musicCtx) musicCtx = new (window.AudioContext || window.webkitAudioContext)();
  const ctx = musicCtx;
  let noteIndex = 0;

  // A gentle, slow-attack delay node gives a soft "instrumental room" feel
  const delay = ctx.createDelay();
  delay.delayTime.value = 0.35;
  const delayGain = ctx.createGain();
  delayGain.gain.value = 0.25;
  delay.connect(delayGain).connect(ctx.destination);

  function playChord() {
    const root = track.scale[noteIndex % track.scale.length];
    const noteLength = track.tempo / 1000;

    [root, root * track.harmony].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = track.wave;
      osc.frequency.value = freq;

      // Slow piano-like attack and long, smooth decay (more instrumental, less "blippy")
      const vol = i === 0 ? 0.14 : 0.07;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + noteLength * 1.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.connect(delay);

      osc.start();
      osc.stop(ctx.currentTime + noteLength * 1.6);
    });

    noteIndex++;
  }

  playChord();
  musicIntervalId = setInterval(playChord, track.tempo);
  btn.classList.add('playing');
  btn.textContent = 'Stop';
  musicCurrentBtn = btn;
}

function renderSongs(mood) {
  const list = document.getElementById('songList');
  list.innerHTML = '';
  tracksByMood[mood].forEach(track => {
    const item = document.createElement('div');
    item.className = 'song-item';
    const btnId = 'track-' + Math.random().toString(36).slice(2);
    item.innerHTML = `
      <div>
        <div class="song-name">${track.name}</div>
      </div>
      <button class="timer-btn" id="${btnId}" style="padding:6px 14px; font-size:0.8rem;">Play</button>
    `;
    list.appendChild(item);
    document.getElementById(btnId).addEventListener('click', (e) => {
      const isPlaying = e.target.classList.contains('playing');
      if (isPlaying) {
        stopMusic();
      } else {
        playMusic(track, e.target);
      }
    });
  });
}

document.querySelectorAll('.emotion-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.emotion-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    stopMusic();
    renderSongs(tab.dataset.emotion);
  });
});

renderSongs('sad');
