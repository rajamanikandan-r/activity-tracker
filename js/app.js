document.addEventListener('DOMContentLoaded', () => {
    const authOverlay = document.getElementById('auth-overlay');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // 1. Setup Notification Styles (From your original code)
    const style = document.createElement('style');
    style.textContent = `
        .notification { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%) translateY(20px);
            background: var(--primary-color); color: white; padding: 12px 24px; border-radius: 8px;
            opacity: 0; transition: all 0.3s ease; z-index: 1000; }
        .notification.visible { opacity: 1; transform: translateX(-50%) translateY(0); }
    `;
    document.head.appendChild(style);

    // 2. Auth Listeners
    loginBtn.addEventListener('click', async () => {
        const provider = new window.fbAuth.GoogleAuthProvider();
        try {
            await window.fbAuth.signInWithPopup(window.auth, provider);
        } catch (error) {
            console.error("Login failed:", error);
        }
    });

    logoutBtn.addEventListener('click', () => {
        window.fbAuth.signOut(window.auth).then(() => {
            window.location.reload();
        });
    });

    // 3. Central Application Initialization
    window.fbAuth.onAuthStateChanged(window.auth, async (user) => {
        if (user) {
            console.log("Authenticated as:", user.displayName);
            authOverlay.style.display = 'none';
            
            // Initialize the UI now that the user is known
            // Ensure UI.init is async in your ui.js!
            if (typeof UI !== 'undefined') {
                await UI.init(); 
            }
        } else {
            authOverlay.style.display = 'flex';
        }
    });
});