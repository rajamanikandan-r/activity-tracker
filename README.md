# Daily Activity Tracker

A lightweight, client-side web app for tracking personal habits and activities over time. Log anything — workouts, diet, work sessions, or custom actions — and see streaks, history, and elapsed time between occurrences.

## Features

- **Custom actions** — define your own trackable actions with a name, type (good/bad/neutral), category, and optional fields (duration, type, start/end time, notes)
- **Activity logging** — log any action from the dashboard with a dynamic form based on the action's configured fields
- **Stats dashboard** — see current streak, max streak, and count over the last 30 days for each action
- **Activity history** — browse and filter past entries, with elapsed time shown between consecutive occurrences of the same action
- **Data portability** — export all data to JSON and import it back (merge or replace)
- **Persistent storage** — data is stored in the browser's `localStorage`; no account or backend required

## Tech Stack

- Vanilla HTML, CSS, JavaScript (no frameworks)
- Firebase Hosting for deployment
- No build step required

---

## Local Development

### Prerequisites

- Any modern browser
- Python 3 (for local dev server) — or Node.js if preferred

### Run locally

1. Clone the repo:
   ```bash
   git clone https://github.com/<your-username>/tracker.git
   cd tracker
   ```

2. Start a local HTTP server from the project root:
   ```bash
   python3 -m http.server 8000
   ```

3. Open `http://localhost:8000` in your browser.

To access from another device on the same network, find your local IP:
```bash
ip addr show | grep 'inet ' | grep -v '127.0.0.1'
```
Then navigate to `http://<your-local-ip>:8000` on the other device.

### Project structure

```
tracker/
├── index.html              # App shell and all HTML markup
├── css/
│   ├── reset.css           # CSS reset
│   └── styles.css          # All app styles
├── js/
│   ├── app.js              # Entry point, initializes UI
│   ├── ui.js               # All UI rendering and event handling
│   ├── storage.js          # localStorage read/write layer
│   └── analytics.js        # Streak and stats calculations
├── firebase.json           # Firebase Hosting + Firestore config
├── firestore.rules         # Firestore security rules
└── firestore.indexes.json  # Firestore index definitions
```

---

## Deployment (Firebase Hosting)

### First-time setup

1. Install the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
   > On Raspberry Pi or older systems, install a current Node.js version via [nvm](https://github.com/nvm-sh/nvm) first if `npm` is unavailable or outdated.

2. Log in to Firebase:
   ```bash
   firebase login
   ```

3. The project is already linked to the Firebase project `acitivity-tracker` via `.firebaserc`. No additional init step needed.

### Deploy

```bash
firebase deploy --only hosting
```

This publishes the contents of the project root (as configured in `firebase.json`) to Firebase Hosting. The live URL is shown in the CLI output after a successful deploy.

### Deploy Firestore rules/indexes only

```bash
firebase deploy --only firestore
```

### Deploy everything

```bash
firebase deploy
```
