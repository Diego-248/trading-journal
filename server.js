// server.js
// Trading Plan & Journal - Backend
// Handles: user registration/login (sessions + hashed passwords),
// Postgres database storage (persists across deploys/restarts),
// and CRUD API for journal entries + personal plan + profile.

const express = require('express');
const session = require('express-session');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Database setup (Postgres) ----------
// DATABASE_URL is provided automatically by Render when you attach a Postgres database.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      email_verified BOOLEAN DEFAULT FALSE,
      verification_code TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  // Add columns if upgrading from an older version that didn't have them
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code TEXT;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      trade_date TEXT,
      symbol TEXT,
      entry_price TEXT,
      stop_loss TEXT,
      take_profit TEXT,
      result TEXT,
      r_value TEXT,
      followed_plan TEXT,
      emotion_entry TEXT,
      emotion_after TEXT,
      lesson TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_plans (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      chart_process TEXT DEFAULT '',
      entry_criteria TEXT DEFAULT '',
      exit_criteria TEXT DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (req.url === '/service-worker.js') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});
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
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Username already taken.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, hash]
    );
    req.session.userId = result.rows[0].id;
    req.session.username = username;
    res.json({ success: true, username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
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

// ---------- Account management routes ----------
app.get('/api/account', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT username, email, email_verified, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error loading account.' });
  }
});

app.post('/api/account/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0];
    const match = await bcrypt.compare(currentPassword || '', user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.session.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error changing password.' });
  }
});

app.post('/api/account/email', requireAuth, async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  try {
    // Generate a simple 6-digit verification code.
    // NOTE: this app has no email-sending service connected yet, so the code
    // is returned directly in the response instead of being emailed. To send
    // real verification emails, connect a provider like Resend or SendGrid.
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query(
      'UPDATE users SET email = $1, email_verified = FALSE, verification_code = $2 WHERE id = $3',
      [email, code, req.session.userId]
    );
    res.json({ success: true, devCode: code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving email.' });
  }
});

app.post('/api/account/verify', requireAuth, async (req, res) => {
  const { code } = req.body;
  try {
    const result = await pool.query('SELECT verification_code FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0];
    if (!user.verification_code || code !== user.verification_code) {
      return res.status(400).json({ error: 'Incorrect verification code.' });
    }
    await pool.query(
      'UPDATE users SET email_verified = TRUE, verification_code = NULL WHERE id = $1',
      [req.session.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error verifying email.' });
  }
});

app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT username, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_trades,
        SUM(CASE WHEN followed_plan = 'Yes' THEN 1 ELSE 0 END) as followed_count,
        SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN result = 'Loss' THEN 1 ELSE 0 END) as losses
      FROM journal_entries WHERE user_id = $1
    `, [req.session.userId]);
    res.json({ ...userResult.rows[0], ...statsResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error loading profile.' });
  }
});

// ---------- Personal plan routes (chart process / entry / exit criteria) ----------
app.get('/api/plan', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_plans WHERE user_id = $1', [req.session.userId]);
    res.json(result.rows[0] || { chart_process: '', entry_criteria: '', exit_criteria: '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error loading plan.' });
  }
});

app.post('/api/plan', requireAuth, async (req, res) => {
  const { chart_process, entry_criteria, exit_criteria } = req.body;
  try {
    await pool.query(`
      INSERT INTO user_plans (user_id, chart_process, entry_criteria, exit_criteria)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET chart_process = $2, entry_criteria = $3, exit_criteria = $4, updated_at = NOW()
    `, [req.session.userId, chart_process || '', entry_criteria || '', exit_criteria || '']);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving plan.' });
  }
});

// ---------- Journal CRUD routes ----------
app.get('/api/journal', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error loading journal.' });
  }
});

app.post('/api/journal', requireAuth, async (req, res) => {
  const {
    trade_date, symbol, entry_price, stop_loss, take_profit,
    result, r_value, followed_plan, emotion_entry, emotion_after,
    lesson, notes
  } = req.body;

  try {
    const insertResult = await pool.query(`
      INSERT INTO journal_entries
        (user_id, trade_date, symbol, entry_price, stop_loss, take_profit,
         result, r_value, followed_plan, emotion_entry, emotion_after, lesson, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id
    `, [
      req.session.userId, trade_date || '', symbol || '', entry_price || '',
      stop_loss || '', take_profit || '', result || '', r_value || '',
      followed_plan || '', emotion_entry || '', emotion_after || '',
      lesson || '', notes || ''
    ]);
    res.json({ success: true, id: insertResult.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving trade.' });
  }
});

app.delete('/api/journal/:id', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM journal_entries WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting trade.' });
  }
});

// ---------- App version (for update-available prompt) ----------
app.get('/api/version', (req, res) => {
  res.json({ version: require('./package.json').version });
});

// ---------- Page routing ----------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Trading Plan & Journal app running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
