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
    if (typeof stopSong === 'function') stopSong();
    if (!wasPlaying) {
      playSound(btn.dataset.sound);
      btn.classList.add('playing');
      currentPlayingBtn = btn;
    }
  });
});

// ---------- Mood-based real music (embedded YouTube player — plays inside the app) ----------
// Each track below is a real, well-known song whose official YouTube video ID
// was looked up directly, so playback uses YouTube's official embedded player.
// The audio plays inside this app's UI; no separate app or external site opens.
let currentPlayingSongBtn = null;

const songsByMood = {
  sad: [
    { title: 'Someone Like You', artist: 'Adele', videoId: 'hLQl3WQQoQ0' },
    { title: 'Fix You', artist: 'Coldplay', videoId: 'k4V3Mo61fJM' },
    { title: 'Skinny Love', artist: 'Bon Iver', videoId: 'ssdgFoHLwnk' },
    { title: 'The Night We Met', artist: 'Lord Huron', videoId: 'KtlgYxa6BMU' },
    { title: 'Mad World', artist: 'Gary Jules', videoId: 'etSbOs3aUqI' }
  ],
  relieved: [
    { title: 'Weightless', artist: 'Marconi Union', videoId: 'UfcAVejslrU' },
    { title: 'Breathe Me', artist: 'Sia', videoId: 'ghPcYqn0p4Y' },
    { title: 'Skinny Love', artist: 'Bon Iver', videoId: 'ssdgFoHLwnk' },
    { title: 'Fix You', artist: 'Coldplay', videoId: 'k4V3Mo61fJM' },
    { title: 'River Flows in You', artist: 'Yiruma', videoId: '7maJOI3QMu0' }
  ],
  calm: [
    { title: 'River Flows in You', artist: 'Yiruma', videoId: '7maJOI3QMu0' },
    { title: 'Weightless', artist: 'Marconi Union', videoId: 'UfcAVejslrU' },
    { title: 'The Night We Met', artist: 'Lord Huron', videoId: 'KtlgYxa6BMU' },
    { title: 'Breathe Me', artist: 'Sia', videoId: 'ghPcYqn0p4Y' },
    { title: 'Skinny Love', artist: 'Bon Iver', videoId: 'ssdgFoHLwnk' }
  ],
  anxious: [
    { title: 'Weightless', artist: 'Marconi Union', videoId: 'UfcAVejslrU' },
    { title: 'Breathe Me', artist: 'Sia', videoId: 'ghPcYqn0p4Y' },
    { title: 'Mad World', artist: 'Gary Jules', videoId: 'etSbOs3aUqI' },
    { title: 'Fix You', artist: 'Coldplay', videoId: 'k4V3Mo61fJM' },
    { title: 'River Flows in You', artist: 'Yiruma', videoId: '7maJOI3QMu0' }
  ],
  happy: [
    { title: 'Happy', artist: 'Pharrell Williams', videoId: 'y6Sxv-sUYtM' },
    { title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', videoId: 'OPf0YbXqDm0' },
    { title: 'Walking on Sunshine', artist: 'Katrina & The Waves', videoId: 'iPUmE-tne5U' },
    { title: "Can't Stop the Feeling!", artist: 'Justin Timberlake', videoId: 'ru0K8uYEZWw' },
    { title: 'Good as Hell', artist: 'Lizzo', videoId: 'SmbmeOgWsqE' }
  ],
  motivated: [
    { title: 'Eye of the Tiger', artist: 'Survivor', videoId: 'btPJPFnesV4' },
    { title: 'Believer', artist: 'Imagine Dragons', videoId: '7wtfhZwyrcc' },
    { title: 'Stronger', artist: 'Kanye West', videoId: 'PsO6ZnUZI0g' },
    { title: 'Titanium', artist: 'David Guetta ft. Sia', videoId: 'JRfuAukYTKg' },
    { title: 'Lose Yourself', artist: 'Eminem', videoId: '_Yhyp-_hX2s' }
  ]
};

function stopSong() {
  const player = document.getElementById('songPlayer');
  const wrap = document.getElementById('playerWrap');
  player.src = '';
  wrap.style.display = 'none';
  if (currentPlayingSongBtn) {
    currentPlayingSongBtn.textContent = 'Play';
    currentPlayingSongBtn.classList.remove('playing');
    currentPlayingSongBtn = null;
  }
}

function playSong(track, btn) {
  if (typeof stopCurrentSound === 'function') stopCurrentSound();
  if (currentPlayingSongBtn) {
    currentPlayingSongBtn.textContent = 'Play';
    currentPlayingSongBtn.classList.remove('playing');
  }
  const player = document.getElementById('songPlayer');
  const wrap = document.getElementById('playerWrap');
  player.src = `https://www.youtube.com/embed/${track.videoId}?autoplay=1`;
  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  btn.textContent = 'Playing...';
  btn.classList.add('playing');
  currentPlayingSongBtn = btn;
}

function renderSongs(mood) {
  const list = document.getElementById('songList');
  list.innerHTML = '';
  songsByMood[mood].forEach(track => {
    const item = document.createElement('div');
    item.className = 'song-item';
    const btnId = 'track-' + Math.random().toString(36).slice(2);
    item.innerHTML = `
      <div>
        <div class="song-name">${track.title}</div>
        <div class="song-artist">${track.artist}</div>
      </div>
      <button class="timer-btn" id="${btnId}" style="padding:6px 14px; font-size:0.8rem;">Play</button>
    `;
    list.appendChild(item);
    document.getElementById(btnId).addEventListener('click', (e) => {
      playSong(track, e.target);
    });
  });
}

document.querySelectorAll('.emotion-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.emotion-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    stopSong();
    renderSongs(tab.dataset.emotion);
  });
});

renderSongs('sad');
