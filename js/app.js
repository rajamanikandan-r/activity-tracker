/**
 * Main application entry point for Daily Activity Tracker
 * Initialises Firebase / Firestore, then boots the UI.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ─── Shared styles ────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background-color: var(--primary-color);
            color: white;
            padding: 12px 24px;
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 1000;
        }
        .notification.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        .delete-btn {
            background: none;
            border: none;
            color: #999;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0 0.5rem;
        }
        .delete-btn:hover { color: var(--danger-color); }
        .edit-btn {
            background: none;
            border: none;
            color: #999;
            font-size: 1rem;
            cursor: pointer;
            padding: 0 0.5rem;
        }
        .edit-btn:hover { color: var(--primary-color); }
        .activity-notes { font-size: 0.85rem; color: #666; }
        .form-container.hidden { display: none; }
        .checkbox-group { margin-top: 0.5rem; }
        .count-section-header {
            margin: 1.5rem 0 0.5rem;
            padding-top: 1rem;
            border-top: 1px solid #eee;
            width: 100%;
            text-align: center;
        }
        .counts-container {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            gap: 10px;
            margin-top: 0.5rem;
            overflow-x: auto;
            padding-bottom: 10px;
        }
        .count-card {
            background-color: #f8f8f8;
            border-radius: var(--border-radius);
            padding: 0.8rem;
            text-align: center;
            box-shadow: var(--box-shadow);
            flex: 0 0 auto;
            min-width: 140px;
        }
        .count-card.good-habit   { border-left: 4px solid var(--success-color); }
        .count-card.bad-habit    { border-left: 4px solid var(--danger-color); }
        .count-card.neutral-habit{ border-left: 4px solid var(--info-color); }
        .count-card h4 { font-size: 0.9rem; margin: 0 0 0.5rem; }
        .count-value { font-size: 1.2rem; font-weight: bold; }

        /* Loading overlay */
        #app-loading {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.85);
            font-size: 1.1rem;
            color: #555;
            z-index: 9999;
        }
    `;
    document.head.appendChild(style);

    // ─── Loading indicator ────────────────────────────────────────────────────
    const loadingEl = document.createElement('div');
    loadingEl.id = 'app-loading';
    loadingEl.textContent = 'Connecting to cloud storage…';
    document.body.appendChild(loadingEl);

    try {
        // firebaseConfig is defined in firebase-config.js (loaded before this script)
        // eslint-disable-next-line no-undef
        const app = firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore(app);

        // Hand the Firestore instance to the Storage module
        Storage.initStorage(db);

        // Run one-time data migration (safe to call repeatedly — no-ops if up-to-date)
        await Storage.migrateData();

        // Boot the UI
        await UI.init();
    } catch (err) {
        console.error('Failed to initialise Firebase:', err);
        loadingEl.textContent = '⚠️ Could not connect to cloud storage. Check your Firebase config.';
        return;
    }

    // Remove loading overlay once the UI is ready
    document.body.removeChild(loadingEl);
});
