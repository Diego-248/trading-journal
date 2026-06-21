# Trading Plan & Journal

A full-stack web app for your trading plan + trade journal, with login,
a SQLite database, and a backend API for storing journal entries.

## Stack
- **Frontend:** HTML, CSS, vanilla JavaScript (no framework needed)
- **Backend:** Node.js + Express
- **Database:** SQLite (via `better-sqlite3`) — file-based, zero setup
- **Auth:** `express-session` + `bcryptjs` password hashing

## Features
- Login page is the first page visitors see (`login.html`)
- Registration page to create an account
- Trading Plan page with all 6 steps + the Mindset flow, from your PDF
- Trade Journal page with:
  - Trade Emotion Check (entry + after-close emotions)
  - Trade Result Journal (date, symbol, entry/SL/TP, result, R value)
  - **"Did you follow your trade plan?" Yes/No question**
  - Lessons learned + notes
  - A history table of all past trades pulled from the database, with delete
- Every journal entry is tied to the logged-in user (stored by `user_id`)

## Run it locally
```bash
cd trading-journal
npm install
npm start
```
Then open **http://localhost:3000** — it'll load the login page first.

The database file is created automatically at `db/trading.db` the first
time you run the server. No separate database server needed.

## This is now an installable APP (PWA), not just a website

The app is a **Progressive Web App**. That means: one codebase, and it
installs like a real app on iPhone, Android, Windows, Mac, and Chromebooks —
no App Store / Play Store review needed, and no separate app to maintain.

### Step 1 — Put the code somewhere it can be reached over HTTPS
A PWA can only "install" if it's served over HTTPS. Easiest free options:

1. Push this whole `trading-journal` folder to a GitHub repo.
2. Deploy the backend (which also serves the app files) on **Render.com**
   (free tier) or **Railway.app**:
   - New → Web Service → connect your repo
   - Build command: `npm install`
   - Start command: `npm start`
   - You'll get a free HTTPS link like `tradingplan-yourname.onrender.com`

That single link is now your "app" — anyone can open it and install it.

### Step 2 — How people "download" it on each device

**iPhone/iPad (Safari):**
Open the link → tap Share → "Add to Home Screen." It now behaves like a
real app icon, opens full-screen, works offline for the plan pages.

**Android (Chrome):**
Open the link → tap the ⋮ menu → "Install app" (or a banner appears
automatically). It installs to the home screen and app drawer like a
Play Store app.

**Windows/Mac (Chrome or Edge):**
Open the link → click the install icon (⊕) in the address bar → "Install."
It opens in its own app window, separate from the browser.

No app store account, no review process, no $99/yr Apple developer fee.

### Optional: a real custom domain instead of the free subdomain
Buy one cheap (~$5–12/yr) at Namecheap, Porkbun, or Cloudflare Registrar,
then point its DNS to your Render/Railway app. Suggested name:
**`tradeflowjournal.com`** (check availability before buying).

### If you specifically want it in the Apple App Store / Google Play
That requires wrapping it as a native app with a tool like **Capacitor**
or **Expo**, then submitting through Apple Developer ($99/yr) and Google
Play Console ($25 one-time). It's more setup and a review process — let
me know if you want me to convert this PWA into a Capacitor project for
that route.

## Notes / things to harden before going live for real users
- Change the `session secret` in `server.js` to a long random string
- Set `cookie.secure = true` once served over HTTPS
- Add rate-limiting on `/api/login` to prevent brute-force attempts
- Consider email verification if you'll have multiple real users
