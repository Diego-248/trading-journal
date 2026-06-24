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

// ---------- Email sending (via Resend) ----------
// Requires a RESEND_API_KEY environment variable. Sign up free at resend.com,
// grab an API key from their dashboard, and add it as an env var on Render.
// NOTE: until you verify your own domain on Resend, their sandbox sender
// (onboarding@resend.dev) can only deliver to the email address you signed
// up to Resend with — for sending to ANY user's email, verify a domain there.
async function sendVerificationEmail(toEmail, code) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping real email send.');
    return { sent: false };
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: toEmail,
        subject: 'Verify your email — Trading Plan & Journal',
        html: `<p>Your verification code is:</p><h2>${code}</h2><p>Enter this code in the app to verify your email.</p>`
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error('Resend error:', errText);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error('Email send failed:', err);
    return { sent: false };
  }
}

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
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT FALSE;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS id_document_type TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS id_document_image TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS selfie_image TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_max_loss_pct TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_max_gain_pct TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_max_gain_pct TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_max_loss_pct TEXT;`);

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
      htf_image TEXT,
      mtf_image TEXT,
      ltf_image TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS htf_image TEXT;`);
  await pool.query(`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS mtf_image TEXT;`);
  await pool.query(`ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS ltf_image TEXT;`);

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
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
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

async function requireVerified(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT email_verified FROM users WHERE id = $1',
      [req.session.userId]
    );
    const user = result.rows[0];
    if (!user || !user.email_verified) {
      return res.status(403).json({ error: 'Please verify your email before using this feature.' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error checking verification status.' });
  }
}

// ---------- Auth routes ----------
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !email.includes('@') || !password || password.length < 6) {
    return res.status(400).json({ error: 'Valid email required, password must be 6+ characters.' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const hash = await bcrypt.hash(password, 10);
    // Auto-generate a display username from the email (e.g. "diego" from "diego@gmail.com")
    let username = email.split('@')[0];
    const usernameTaken = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (usernameTaken.rows.length) {
      username = username + Math.floor(Math.random() * 10000);
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await pool.query(
      `INSERT INTO users (username, password_hash, email, verification_code)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [username, hash, email, code]
    );
    req.session.userId = result.rows[0].id;
    req.session.username = username;

    const emailResult = await sendVerificationEmail(email, code);
    res.json({ success: true, username, emailSent: emailResult.sent, devCode: emailResult.sent ? undefined : code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
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
app.get('/api/verification-status', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT email_verified FROM users WHERE id = $1',
      [req.session.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error checking status.' });
  }
});

app.get('/api/account', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT username, email, email_verified, date_of_birth, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error loading account.' });
  }
});

app.post('/api/account/username', requireAuth, async (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username cannot be empty.' });
  }
  const cleanUsername = username.trim();
  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [cleanUsername, req.session.userId]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }
    await pool.query('UPDATE users SET username = $1 WHERE id = $2', [cleanUsername, req.session.userId]);
    req.session.username = cleanUsername;
    res.json({ success: true, username: cleanUsername });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating username.' });
  }
});

app.post('/api/account/dob', requireAuth, async (req, res) => {
  const { date_of_birth } = req.body;
  try {
    await pool.query('UPDATE users SET date_of_birth = $1 WHERE id = $2', [date_of_birth || '', req.session.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving date of birth.' });
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
    const emailResult = await sendVerificationEmail(email, code);
    res.json({ success: true, emailSent: emailResult.sent, devCode: emailResult.sent ? undefined : code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving email.' });
  }
});

app.post('/api/account/resend-verification', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT email FROM users WHERE id = $1', [req.session.userId]);
    const email = result.rows[0]?.email;
    if (!email) {
      return res.status(400).json({ error: 'No email on file for this account.' });
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query('UPDATE users SET verification_code = $1 WHERE id = $2', [code, req.session.userId]);
    const emailResult = await sendVerificationEmail(email, code);
    res.json({ success: true, emailSent: emailResult.sent, devCode: emailResult.sent ? undefined : code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error resending code.' });
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

app.get('/api/journal/monthly', requireAuth, requireVerified, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
      FROM journal_entries
      WHERE user_id = $1
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `, [req.session.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error loading monthly trades.' });
  }
});

app.get('/api/account/risk-settings', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT daily_max_loss_pct, daily_max_gain_pct, monthly_max_gain_pct, monthly_max_loss_pct FROM users WHERE id = $1',
      [req.session.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error loading risk settings.' });
  }
});

app.post('/api/account/risk-settings', requireAuth, async (req, res) => {
  const { daily_max_loss_pct, daily_max_gain_pct, monthly_max_gain_pct, monthly_max_loss_pct } = req.body;
  try {
    await pool.query(`
      UPDATE users
      SET daily_max_loss_pct = $1, daily_max_gain_pct = $2, monthly_max_gain_pct = $3, monthly_max_loss_pct = $4
      WHERE id = $5
    `, [daily_max_loss_pct || '', daily_max_gain_pct || '', monthly_max_gain_pct || '', monthly_max_loss_pct || '', req.session.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving risk settings.' });
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
app.get('/api/plan', requireAuth, requireVerified, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_plans WHERE user_id = $1', [req.session.userId]);
    res.json(result.rows[0] || { chart_process: '', entry_criteria: '', exit_criteria: '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error loading plan.' });
  }
});

app.post('/api/plan', requireAuth, requireVerified, async (req, res) => {
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
app.get('/api/journal', requireAuth, requireVerified, async (req, res) => {
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

app.post('/api/journal', requireAuth, requireVerified, async (req, res) => {
  const {
    trade_date, symbol, entry_price, stop_loss, take_profit,
    result, r_value, followed_plan, emotion_entry, emotion_after,
    lesson, notes, htf_image, mtf_image, ltf_image
  } = req.body;

  try {
    const insertResult = await pool.query(`
      INSERT INTO journal_entries
        (user_id, trade_date, symbol, entry_price, stop_loss, take_profit,
         result, r_value, followed_plan, emotion_entry, emotion_after, lesson, notes,
         htf_image, mtf_image, ltf_image)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING id
    `, [
      req.session.userId, trade_date || '', symbol || '', entry_price || '',
      stop_loss || '', take_profit || '', result || '', r_value || '',
      followed_plan || '', emotion_entry || '', emotion_after || '',
      lesson || '', notes || '', htf_image || '', mtf_image || '', ltf_image || ''
    ]);
    res.json({ success: true, id: insertResult.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving trade.' });
  }
});

app.delete('/api/journal/:id', requireAuth, requireVerified, async (req, res) => {
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
