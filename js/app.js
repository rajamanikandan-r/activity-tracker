/**
 * Main application entry point for Daily Activity Tracker
 * Responsible for initializing the application
 */

document.addEventListener('DOMContentLoaded', () => {
    // Add notification styles
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
        
        .delete-btn:hover {
            color: var(--danger-color);
        }
        
        .edit-btn {
            background: none;
            border: none;
            color: #999;
            font-size: 1rem;
            cursor: pointer;
            padding: 0 0.5rem;
        }
        
        .edit-btn:hover {
            color: var(--primary-color);
        }
        
        .activity-notes {
            font-size: 0.85rem;
            color: #666;
        }

        .form-container.hidden {
            display: none;
        }

        .checkbox-group {
            margin-top: 0.5rem;
        }
        
        /* Activity Count Styles */
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
            overflow-x: auto; /* Allow horizontal scrolling if needed */
            padding-bottom: 10px; /* Space for potential scrollbar */
        }
        
        .count-card {
            background-color: #f8f8f8;
            border-radius: var(--border-radius);
            padding: 0.8rem;
            text-align: center;
            box-shadow: var(--box-shadow);
            flex: 0 0 auto; /* Prevent shrinking */
            min-width: 140px; /* Minimum width similar to current grid layout */
        }
        
        .count-card.good-habit {
            border-left: 4px solid var(--success-color);
        }
        
        .count-card.bad-habit {
            border-left: 4px solid var(--danger-color);
        }
        
        .count-card.neutral-habit {
            border-left: 4px solid var(--info-color);
        }
        
        .count-card h4 {
            font-size: 0.9rem;
            margin: 0 0 0.5rem;
        }
        
        .count-value {
            font-size: 1.2rem;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
    
    // Initialize the UI
    UI.init();
});
