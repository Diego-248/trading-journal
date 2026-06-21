// server.js
// Trading Plan & Journal - Backend
// Handles: user registration/login (sessions + hashed passwords),
// SQLite database storage, and CRUD API for journal entries.

const express = require('express');
const session = require('express-session');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Database setup ----------
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(path.join(dbDir, 'trading.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  trade_date TEXT,
  symbol TEXT,
  entry_price TEXT,
  stop_loss TEXT,
  take_profit TEXT,
  result TEXT,
  r_value TEXT,
  followed_plan TEXT,      -- "Yes" or "No"
  emotion_entry TEXT,
  emotion_after TEXT,
  lesson TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_plans (
  user_id INTEGER PRIMARY KEY,
  chart_process TEXT DEFAULT '',
  entry_criteria TEXT DEFAULT '',
  exit_criteria TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'change-this-secret-in-production-please',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// ---------- Auth routes ----------
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username required, password must be 6+ characters.' });
  }
  try {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
    req.session.userId = result.lastInsertRowid;
    req.session.username = username;
    res.json({ success: true, username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ success: true, username: user.username });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/me', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, username: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// ---------- Personal plan routes (chart process / entry / exit criteria) ----------
app.get('/api/plan', requireAuth, (req, res) => {
  let row = db.prepare('SELECT * FROM user_plans WHERE user_id = ?').get(req.session.userId);
  if (!row) {
    row = { chart_process: '', entry_criteria: '', exit_criteria: '' };
  }
  res.json(row);
});

app.post('/api/plan', requireAuth, (req, res) => {
  const { chart_process, entry_criteria, exit_criteria } = req.body;
  const existing = db.prepare('SELECT user_id FROM user_plans WHERE user_id = ?').get(req.session.userId);

  if (existing) {
    db.prepare(`
      UPDATE user_plans
      SET chart_process = ?, entry_criteria = ?, exit_criteria = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(chart_process || '', entry_criteria || '', exit_criteria || '', req.session.userId);
  } else {
    db.prepare(`
      INSERT INTO user_plans (user_id, chart_process, entry_criteria, exit_criteria)
      VALUES (?, ?, ?, ?)
    `).run(req.session.userId, chart_process || '', entry_criteria || '', exit_criteria || '');
  }
  res.json({ success: true });
});

// ---------- Journal CRUD routes ----------
app.get('/api/journal', requireAuth, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.session.userId);
  res.json(rows);
});

app.post('/api/journal', requireAuth, (req, res) => {
  const {
    trade_date, symbol, entry_price, stop_loss, take_profit,
    result, r_value, followed_plan, emotion_entry, emotion_after,
    lesson, notes
  } = req.body;

  const stmt = db.prepare(`
    INSERT INTO journal_entries
      (user_id, trade_date, symbol, entry_price, stop_loss, take_profit,
       result, r_value, followed_plan, emotion_entry, emotion_after, lesson, notes)
    VALUES (@user_id, @trade_date, @symbol, @entry_price, @stop_loss, @take_profit,
            @result, @r_value, @followed_plan, @emotion_entry, @emotion_after, @lesson, @notes)
  `);
  const info = stmt.run({
    user_id: req.session.userId,
    trade_date: trade_date || '',
    symbol: symbol || '',
    entry_price: entry_price || '',
    stop_loss: stop_loss || '',
    take_profit: take_profit || '',
    result: result || '',
    r_value: r_value || '',
    followed_plan: followed_plan || '',
    emotion_entry: emotion_entry || '',
    emotion_after: emotion_after || '',
    lesson: lesson || '',
    notes: notes || ''
  });
  res.json({ success: true, id: info.lastInsertRowid });
});

app.delete('/api/journal/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM journal_entries WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.session.userId);
  res.json({ success: true });
});

// ---------- Page routing ----------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
  console.log(`Trading Plan & Journal app running on http://localhost:${PORT}`);
});
