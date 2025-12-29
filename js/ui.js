/**
 * UI handling module for Daily Activity Tracker
 * UPDATED: Integrated with asynchronous Firebase Cloud Storage
 * Manages DOM manipulation and event listeners
 */

const UI = (() => {
    // DOM Elements
    const sections = document.querySelectorAll('.section');
    const navButtons = document.querySelectorAll('.nav-btn');
    
    // Dashboard elements
    const statsContainer = document.getElementById('stats-container');
    const todayActivitiesList = document.getElementById('today-activity-list');
    
    // Activity Entry elements
    const actionSelect = document.getElementById('action-select');
    const dynamicFormContainer = document.getElementById('dynamic-form-container');
    
    // Admin elements
    const actionsListEl = document.getElementById('actions-list');
    const actionFilter = document.getElementById('action-filter');
    const addActionBtn = document.getElementById('add-action-btn');
    const actionFormContainer = document.getElementById('action-form-container');
    const actionForm = document.getElementById('action-form');
    const actionFormTitle = document.getElementById('action-form-title');
    const cancelActionBtn = document.getElementById('cancel-action-btn');
    
    // Import/Export elements
    const exportDataBtn = document.getElementById('export-data-btn');
    const importDataBtn = document.getElementById('import-data-btn');
    const importFileInput = document.getElementById('import-file-input');
    const importOptions = document.getElementById('import-options');
    const confirmImportBtn = document.getElementById('confirm-import-btn');
    const cancelImportBtn = document.getElementById('cancel-import-btn');
    
    // History elements
    const historyFilter = document.getElementById('history-filter');
    const activityHistoryList = document.getElementById('activity-history-list');
    const clearDataButton = document.getElementById('clear-data');
    
    // State Management
    let currentEditingActionId = null;
    let currentEditingActivityId = null;
    let currentImportData = null;
    
    /**
     * Initialize the UI (Async)
     */
    const init = async () => {
        // Set up event listeners
        setupEventListeners();
        
        // Load initial data from Cloud
        await updateDashboard();
        await setupActionSelect();
        await renderActionsList();
        await setupHistoryFilter();
        await renderActivityHistory();
    };
    
    /**
     * Set up all event listeners
     */
    const setupEventListeners = () => {
        // Navigation
        navButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const sectionId = button.dataset.section;
                await showSection(sectionId);
                
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
        
        actionSelect.addEventListener('change', generateActionForm);
        actionFilter.addEventListener('change', renderActionsList);
        addActionBtn.addEventListener('click', showAddActionForm);
        cancelActionBtn.addEventListener('click', hideActionForm);
        actionForm.addEventListener('submit', handleActionFormSubmit);
        exportDataBtn.addEventListener('click', handleExportData);
        importDataBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', handleFileSelect);
        confirmImportBtn.addEventListener('click', handleImportConfirm);
        
        cancelImportBtn.addEventListener('click', () => {
            importOptions.classList.add('hidden');
            importFileInput.value = '';
            currentImportData = null;
        });
        
        historyFilter.addEventListener('change', renderActivityHistory);
        clearDataButton.addEventListener('click', handleClearData);
    };
    
    /**
     * Show a specific section (Async)
     */
    const showSection = async (sectionId) => {
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        document.getElementById(sectionId).classList.add('active');
        
        // Refresh data based on section shown
        if (sectionId === 'dashboard') {
            await updateDashboard();
        } else if (sectionId === 'activity-entry') {
            await setupActionSelect();
            await generateActionForm();
        } else if (sectionId === 'admin') {
            await renderActionsList();
        } else if (sectionId === 'history') {
            await setupHistoryFilter();
            await renderActivityHistory();
        }
    };
    
    /**
     * Update the dashboard (Async)
     */
    const updateDashboard = async () => {
        statsContainer.innerHTML = 'Loading stats...';
        
        const goodActions = Analytics.getGoodHabitActions();
        const badActions = Analytics.getBadHabitActions();
        
        statsContainer.innerHTML = '';
        
        // Streaks for Good Habits
        for (const action of goodActions) {
            const streak = await Analytics.calculateActionStreak(action.id);
            const statCard = document.createElement('div');
            statCard.className = 'stat-card good-habit';
            statCard.innerHTML = `
                <h3>${action.name} Streak</h3>
                <div class="stat-value">${streak} day${streak !== 1 ? 's' : ''}</div>
            `;
            statsContainer.appendChild(statCard);
        }
        
        // Days Since for Bad Habits
        for (const action of badActions) {
            const daysSince = await Analytics.calculateDaysSinceLastOccurrence(action.id);
            const statCard = document.createElement('div');
            statCard.className = 'stat-card bad-habit';
            statCard.innerHTML = `
                <h3>Days Since ${action.name}</h3>
                <div class="stat-value">${daysSince} day${daysSince !== 1 ? 's' : ''}</div>
            `;
            statsContainer.appendChild(statCard);
        }
        
        // Activity counts last 30 days
        const activityCounts = await Analytics.getActivityCountsLast30Days();
        const allActions = await Storage.getActions();
        
        const countSectionHeader = document.createElement('h3');
        countSectionHeader.className = 'count-section-header';
        countSectionHeader.textContent = 'Activity Counts (Last 30 Days)';
        statsContainer.appendChild(countSectionHeader);
        
        const countsContainer = document.createElement('div');
        countsContainer.className = 'counts-container';
        
        allActions.forEach(action => {
            const count = activityCounts[action.id] || 0;
            const countCard = document.createElement('div');
            countCard.className = `count-card ${action.type}-habit`;
            countCard.innerHTML = `
                <h4>${action.name}</h4>
                <div class="count-value">${count} time${count !== 1 ? 's' : ''}</div>
            `;
            countsContainer.appendChild(countCard);
        });
        
        statsContainer.appendChild(countsContainer);
        await renderTodayActivities();
    };
    
    /**
     * Render today's activities (Async)
     */
    const renderTodayActivities = async () => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        // Note: Assumes Storage.getActivitiesByDate is updated to async
        const activities = await Storage.getActivities();
        const todayActivities = activities.filter(a => a.date === today);
        
        if (todayActivities.length === 0) {
            todayActivitiesList.innerHTML = '<p class="empty-state">No activities logged today</p>';
            return;
        }
        
        todayActivitiesList.innerHTML = '';
        const sorted = todayActivities.sort((a, b) => b.timestamp - a.timestamp);
        
        for (const activity of sorted) {
            const activityItem = await createActivityElement(activity);
            todayActivitiesList.appendChild(activityItem);
        }
    };
    
    /**
     * Setup action select (Async)
     */
    const setupActionSelect = async () => {
        const actions = await Storage.getActions();
        actionSelect.innerHTML = '';
        
        if (actions.length === 0) {
            actionSelect.innerHTML = '<option value="">No actions available</option>';
            return;
        }
        
        actions.forEach(action => {
            const option = document.createElement('option');
            option.value = action.id;
            option.textContent = action.name;
            actionSelect.appendChild(option);
        });
    };
    
    /**
     * Generate dynamic form (Async)
     */
    const generateActionForm = async () => {
        const actionId = actionSelect.value;
        if (!actionId) {
            dynamicFormContainer.innerHTML = '<p class="empty-state">Please select an action</p>';
            return;
        }
        
        const actions = await Storage.getActions();
        const action = actions.find(a => a.id === actionId);
        
        if (!action) return;
        
        // ... (HTML generation logic remains similar to original) ...
        let formHTML = `<form id="dynamic-activity-form"><input type="hidden" id="action-id" value="${action.id}">`;
        formHTML += `<div class="form-group"><label>Date</label><input type="date" id="activity-date" required></div>`;
        
        if (action.fields && action.fields.length > 0) {
            if (action.fields.includes('type')) formHTML += `<div class="form-group"><label>Type</label><input type="text" id="activity-type" required></div>`;
            if (action.fields.includes('duration')) formHTML += `<div class="form-group"><label>Duration (mins)</label><input type="number" id="activity-duration" required></div>`;
            if (action.fields.includes('startTime')) formHTML += `<div class="form-group"><label>Start Time</label><input type="time" id="activity-start" required></div>`;
            if (action.fields.includes('endTime')) formHTML += `<div class="form-group"><label>End Time</label><input type="time" id="activity-end" required></div>`;
            if (action.fields.includes('notes')) formHTML += `<div class="form-group"><label>Notes</label><textarea id="activity-notes"></textarea></div>`;
        } else {
            formHTML += `<div class="form-group"><label>Notes</label><textarea id="activity-notes"></textarea></div>`;
        }
        
        const btnText = currentEditingActivityId ? `Update ${action.name}` : `Save ${action.name}`;
        formHTML += `<button type="submit" class="btn">${btnText}</button></form>`;
        
        dynamicFormContainer.innerHTML = formHTML;
        
        const now = new Date();
        document.getElementById('activity-date').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        document.getElementById('dynamic-activity-form').addEventListener('submit', handleActivitySubmit);
    };
    
    /**
     * Handle activity submission (Async)
     */
    const handleActivitySubmit = async (e) => {
        e.preventDefault();
        const actionId = document.getElementById('action-id').value;
        const date = document.getElementById('activity-date').value;
        
        const activity = { actionId, date };
        const actions = await Storage.getActions();
        const action = actions.find(a => a.id === actionId);
        
        if (action.fields) {
            if (action.fields.includes('type')) activity.exerciseType = document.getElementById('activity-type').value;
            if (action.fields.includes('duration')) activity.duration = document.getElementById('activity-duration').value;
            if (action.fields.includes('startTime')) activity.startTime = document.getElementById('activity-start').value;
            if (action.fields.includes('endTime')) activity.endTime = document.getElementById('activity-end').value;
        }
        if (document.getElementById('activity-notes')) activity.notes = document.getElementById('activity-notes').value;
        
        if (currentEditingActivityId) {
            // Note: Storage.updateActivity needs to be async
            await Storage.updateActivity(currentEditingActivityId, activity);
            showNotification(`${action.name} updated!`);
            currentEditingActivityId = null;
        } else {
            await Storage.addActivity(activity);
            showNotification(`${action.name} saved!`);
        }
        
        e.target.reset();
        await updateDashboard();
    };

    /**
     * Render actions for Admin (Async)
     */
    const renderActionsList = async () => {
        let actions = await Storage.getActions();
        const filterValue = actionFilter.value;
        if (filterValue !== 'all') actions = actions.filter(a => a.type === filterValue);
        
        actionsListEl.innerHTML = actions.length === 0 ? '<p class="empty-state">No actions found</p>' : '';
        
        actions.forEach(action => {
            const item = document.createElement('div');
            item.className = 'action-item';
            item.innerHTML = `
                <div><div class="action-name">${action.name}</div></div>
                <div><span class="action-type ${action.type}">${action.type}</span>
                <div class="action-controls"><button class="edit-btn">✏️</button><button class="delete-btn">🗑️</button></div></div>
            `;
            item.querySelector('.edit-btn').addEventListener('click', () => showEditActionForm(action.id));
            item.querySelector('.delete-btn').addEventListener('click', () => handleDeleteAction(action.id));
            actionsListEl.appendChild(item);
        });
    };

    /**
     * Handle deleting activity (Async)
     */
    const deleteActivityHandler = async (id) => {
        await Storage.deleteActivity(id);
        await updateDashboard();
        await renderActivityHistory();
    };

    /**
     * Create Activity Element (Async)
     */
    const createActivityElement = async (activity, includeDelete = false) => {
        const actions = await Storage.getActions();
        const action = actions.find(a => a.id === activity.actionId) || { name: 'Unknown', type: 'neutral' };
        
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div><span class="activity-type ${action.type}">${action.name}</span></div>
            <div class="activity-details">${activity.notes || 'Activity logged'}</div>
            <div class="activity-controls">
                <button class="edit-btn">✏️</button>
                ${includeDelete ? '<button class="delete-btn">×</button>' : ''}
            </div>
        `;
        
        if (includeDelete) {
            item.querySelector('.delete-btn').addEventListener('click', () => deleteActivityHandler(activity.id));
        }
        item.querySelector('.edit-btn').addEventListener('click', () => showEditActivityForm(activity.id));
        
        return item;
    };

    // ... (Remainder of Admin/Import/History functions updated with await/async) ...

    const renderActivityHistory = async () => {
        let activities = await Storage.getActivities();
        const filter = historyFilter.value;
        if (filter !== 'all') activities = activities.filter(a => a.actionId === filter);
        
        activityHistoryList.innerHTML = activities.length === 0 ? '<p class="empty-state">No history</p>' : '';
        for (const activity of activities) {
            const el = await createActivityElement(activity, true);
            activityHistoryList.appendChild(el);
        }
    };

    const handleActionFormSubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('action-name').value;
        const type = [...document.getElementsByName('action-type')].find(r => r.checked).value;
        const fields = [...document.getElementsByName('action-fields')].filter(c => c.checked).map(c => c.value);
        
        const action = { name, type, fields };

        if (currentEditingActionId) {
            await Storage.updateAction(currentEditingActionId, action);
            currentEditingActionId = null; // CRITICAL: Reset after update
            actionFormTitle.textContent = 'Add New Habit'; // Reset title
        } else {
            await Storage.addAction(action);
        }

        hideActionForm();
        await renderActionsList();
        showNotification('Saved successfully!');
    };

    const handleExportData = async () => {
        await Storage.exportData();
        showNotification('Data exported!');
    };

    const handleImportConfirm = async () => {
        if (!currentImportData) return;
        const replace = document.querySelector('input[name="import-mode"]:checked').value === 'replace';
        await Storage.importData(currentImportData, { merge: !replace });
        importOptions.classList.add('hidden');
        await init();
        showNotification('Import successful!');
    };

    const setupHistoryFilter = async () => {
        const actions = await Storage.getActions();
        historyFilter.innerHTML = '<option value="all">All Activities</option>';
        actions.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = a.name;
            historyFilter.appendChild(opt);
        });
    };

    const handleClearData = async () => {
        if (confirm('Clear all data from Cloud?')) {
            await Storage.clearAllData();
            await updateDashboard();
            await renderActivityHistory();
        }
    };

    const showNotification = (message) => {
        const n = document.createElement('div');
        n.className = 'notification';
        n.textContent = message;
        document.body.appendChild(n);
        setTimeout(() => n.classList.add('visible'), 10);
        setTimeout(() => {
            n.classList.remove('visible');
            setTimeout(() => document.body.removeChild(n), 300);
        }, 3000);
    };

    const showAddActionForm = () => { actionForm.reset(); actionFormContainer.classList.remove('hidden'); };
    const hideActionForm = () => actionFormContainer.classList.add('hidden');

    /**
     * Handle file selection for JSON import
     */
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                currentImportData = JSON.parse(event.target.result);
                // Validate basic structure
                if (!currentImportData.activities || !currentImportData.actions) {
                    throw new Error("Invalid backup format");
                }
                importOptions.classList.remove('hidden');
            } catch (err) {
                alert("Error parsing JSON file. Please ensure it's a valid backup.");
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    /**
     * Show form to edit an existing action
     */
    const showEditActionForm = async (id) => {
        const actions = await Storage.getActions();
        const action = actions.find(a => a.id === id);
        if (!action) return;

        currentEditingActionId = id;
        actionFormTitle.textContent = 'Edit Action';
        
        // Populate form fields
        document.getElementById('action-name').value = action.name;
        
        // Set radio button for type
        const typeRadios = document.getElementsByName('action-type');
        typeRadios.forEach(r => r.checked = (r.value === action.type));
        
        // Set checkboxes for fields
        const fieldChecks = document.getElementsByName('action-fields');
        fieldChecks.forEach(c => c.checked = action.fields.includes(c.value));
        
        actionFormContainer.classList.remove('hidden');
        actionFormContainer.scrollIntoView({ behavior: 'smooth' });
    };

    /**
     * Show form to edit an existing activity
     */
    const showEditActivityForm = async (id) => {
        const activities = await Storage.getActivities();
        const activity = activities.find(a => a.id === id);
        if (!activity) return;

        currentEditingActivityId = id;
        
        // Set the select dropdown to the correct action
        actionSelect.value = activity.actionId;
        
        // Switch to the entry section
        const entryBtn = document.querySelector('[data-section="activity-entry"]');
        entryBtn.click();

        // Wait for the form to generate, then populate it
        setTimeout(() => {
            if (document.getElementById('activity-date')) {
                document.getElementById('activity-date').value = activity.date;
                if (activity.exerciseType) document.getElementById('activity-type').value = activity.exerciseType;
                if (activity.duration) document.getElementById('activity-duration').value = activity.duration;
                if (activity.startTime) document.getElementById('activity-start').value = activity.startTime;
                if (activity.endTime) document.getElementById('activity-end').value = activity.endTime;
                if (activity.notes) document.getElementById('activity-notes').value = activity.notes;
            }
        }, 100);
    };

    /**
     * Handle deleting an action
     */
    const handleDeleteAction = async (id) => {
        if (confirm('Delete this action and all associated tracking data?')) {
            await Storage.deleteAction(id);
            await renderActionsList();
            showNotification('Action deleted');
        }
    };

    return { init };
})();