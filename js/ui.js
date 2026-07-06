/**
 * UI handling module for Daily Activity Tracker
 * Manages DOM manipulation and event listeners
 */

const UI = (() => {
    // DOM Elements
    const sections = document.querySelectorAll('.section');
    const navButtons = document.querySelectorAll('.nav-btn');
    
    // Dashboard elements
    const dashboardActionSelect = document.getElementById('dashboard-action-select');
    const dashboardDynamicForm = document.getElementById('dashboard-dynamic-form');
    const dashboardStatsTable = document.getElementById('dashboard-stats-table');
    
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
    const historyPagination = document.getElementById('history-pagination');
    const clearDataButton = document.getElementById('clear-data');
    
    // Current editing action ID
    let currentEditingActionId = null;
    
    // Current editing activity ID
    let currentEditingActivityId = null;
    
    // Current import data
    let currentImportData = null;

    // History pagination state
    let historyCurrentPage = 1;
    const HISTORY_PAGE_SIZE = 10;
    
    /**
     * Initialize the UI
     */
    const init = () => {
        setupEventListeners();
        updateDashboard();
        renderActionsList();
    };
    
    /**
     * Set up all event listeners
     */
    const setupEventListeners = () => {
        // Navigation
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sectionId = button.dataset.section;
                showSection(sectionId);
                
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
        
        // Dashboard action select
        dashboardActionSelect.addEventListener('change', generateDashboardForm);
        
        // Admin action filter
        actionFilter.addEventListener('change', renderActionsList);
        
        // Add action button
        addActionBtn.addEventListener('click', showAddActionForm);
        
        // Cancel action button
        cancelActionBtn.addEventListener('click', hideActionForm);
        
        // Action form
        actionForm.addEventListener('submit', handleActionFormSubmit);
        
        // Export button
        exportDataBtn.addEventListener('click', handleExportData);
        
        // Import button
        importDataBtn.addEventListener('click', () => importFileInput.click());
        
        // Import file input
        importFileInput.addEventListener('change', handleFileSelect);
        
        // Confirm import
        confirmImportBtn.addEventListener('click', handleImportConfirm);
        
        // Cancel import
        cancelImportBtn.addEventListener('click', () => {
            importOptions.classList.add('hidden');
            importFileInput.value = '';
            currentImportData = null;
        });
        
        // History filter
        historyFilter.addEventListener('change', () => {
            historyCurrentPage = 1;
            renderActivityHistory();
        });
        
        // Clear data button
        clearDataButton.addEventListener('click', handleClearData);
    };
    
    /**
     * Show a specific section
     * @param {String} sectionId - ID of the section to show
     */
    const showSection = (sectionId) => {
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        document.getElementById(sectionId).classList.add('active');
        
        if (sectionId === 'dashboard') {
            updateDashboard();
        } else if (sectionId === 'admin') {
            renderActionsList();
        }
    };
    
/**
     * Update the dashboard with current data
     */
    const updateDashboard = () => {
        // Populate dashboard action select
        const actions = Storage.getActions();
        dashboardActionSelect.innerHTML = '';
        if (actions.length === 0) {
            dashboardActionSelect.innerHTML = '<option value="">No actions available</option>';
        } else {
            actions.forEach(action => {
                const option = document.createElement('option');
                option.value = action.id;
                option.textContent = action.name;
                dashboardActionSelect.appendChild(option);
            });
        }
        generateDashboardForm();

        // Populate stats table
        const tbody = dashboardStatsTable.querySelector('tbody');
        tbody.innerHTML = '';
        const counts = Analytics.getActivityCountsLast30Days();

        actions.forEach(action => {
            const row = document.createElement('tr');
            const currentStreak = Analytics.calculateActionStreak(action.id);
            const maxStreak = Analytics.calculateMaxStreak(action.id);
            const last30 = counts[action.id] || 0;
            
            // Add a helpful context label text if it's a bad habit
            const streakSuffix = action.type === 'bad' ? ' days avoided' : ' days';

            row.innerHTML = `
                <td>
                    <strong>${action.name}</strong> 
                    <span class="action-type ${action.type}" style="font-size:0.75rem; padding: 2px 6px; margin-left: 5px;">
                        ${action.type === 'good' ? 'Good' : action.type === 'bad' ? 'Bad' : 'Neutral'}
                    </span>
                </td>
                <td>${currentStreak}${streakSuffix}</td>
                <td>${maxStreak}${streakSuffix}</td>
                <td>${last30} times</td>
            `;
            tbody.appendChild(row);
        });

        if (actions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No actions configured yet.</td></tr>';
        }

        // Update history
        setupHistoryFilter();
        renderActivityHistory();
    };

    /**
     * Generate the dashboard activity logging form
     */
    const generateDashboardForm = () => {
        const actionId = dashboardActionSelect.value;
        if (!actionId) {
            dashboardDynamicForm.innerHTML = '';
            return;
        }

        const action = Storage.getActions().find(a => a.id === actionId);
        if (!action) { dashboardDynamicForm.innerHTML = ''; return; }

        let formHTML = `<form id="dashboard-activity-form"><input type="hidden" id="dash-action-id" value="${action.id}">
            <div class="form-group"><label for="dash-date">Date</label><input type="date" id="dash-date" required></div>`;

        if (action.fields) {
            if (action.fields.includes('type')) {
                formHTML += `<div class="form-group"><label for="dash-type">${action.name} Type</label><input type="text" id="dash-type" required placeholder="e.g., Running, Yoga"></div>`;
            }
            if (action.fields.includes('duration')) {
                formHTML += `<div class="form-group"><label for="dash-duration">Duration (minutes)</label><input type="number" id="dash-duration" required min="1"></div>`;
            }
            if (action.fields.includes('startTime')) {
                formHTML += `<div class="form-group"><label for="dash-start">Start Time</label><input type="time" id="dash-start" required></div>`;
            }
            if (action.fields.includes('endTime')) {
                formHTML += `<div class="form-group"><label for="dash-end">End Time</label><input type="time" id="dash-end" required></div>`;
            }
            if (action.fields.includes('notes')) {
                formHTML += `<div class="form-group"><label for="dash-notes">Notes</label><textarea id="dash-notes" placeholder="Additional notes..."></textarea></div>`;
            }
        }
        if (!action.fields || action.fields.length === 0) {
            formHTML += `<div class="form-group"><label for="dash-notes">Notes</label><textarea id="dash-notes" placeholder="Additional notes..."></textarea></div>`;
        }

        formHTML += `<button type="submit" class="btn">Save ${action.name}</button></form>`;
        dashboardDynamicForm.innerHTML = formHTML;

        // Set today's date
        const now = new Date();
        document.getElementById('dash-date').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

        document.getElementById('dashboard-activity-form').addEventListener('submit', handleDashboardActivitySubmit);
    };

    /**
     * Handle dashboard activity form submission
     */
    const handleDashboardActivitySubmit = (e) => {
        e.preventDefault();
        const actionId = document.getElementById('dash-action-id').value;
        const action = Storage.getActions().find(a => a.id === actionId);
        const activity = { actionId, date: document.getElementById('dash-date').value };

        if (action.fields) {
            if (action.fields.includes('type') && document.getElementById('dash-type')) activity.exerciseType = document.getElementById('dash-type').value;
            if (action.fields.includes('duration') && document.getElementById('dash-duration')) activity.duration = document.getElementById('dash-duration').value;
            if (action.fields.includes('startTime') && document.getElementById('dash-start')) activity.startTime = document.getElementById('dash-start').value;
            if (action.fields.includes('endTime') && document.getElementById('dash-end')) activity.endTime = document.getElementById('dash-end').value;
        }
        if (document.getElementById('dash-notes')) activity.notes = document.getElementById('dash-notes').value;

        if (currentEditingActivityId) {
            Storage.updateActivity(currentEditingActivityId, activity);
            showNotification(`${action.name} updated!`);
            currentEditingActivityId = null;
        } else {
            Storage.addActivity(activity);
            showNotification(`${action.name} saved!`);
        }
        e.target.reset();
        const now = new Date();
        document.getElementById('dash-date').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        updateDashboard();
    };
    
    /**
     * Setup the action select dropdown
     */
    /**
     * Handle exporting data
     */
    const handleExportData = () => {
        // Get data
        const data = Storage.exportData();
        
        // Convert to JSON string
        const jsonString = JSON.stringify(data, null, 2);
        
        // Create a blob
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create a URL for the blob
        const url = URL.createObjectURL(blob);
        
        // Create a download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily-activity-tracker-${new Date().toISOString().split('T')[0]}.json`;
        
        // Append to document, trigger click, and remove
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Release the URL
        URL.revokeObjectURL(url);
        
        showNotification('Data exported successfully!');
    };
    
    /**
     * Handle file selection for import
     * @param {Event} e - Change event
     */
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check file type
        if (!file.name.endsWith('.json')) {
            showNotification('Please select a JSON file.');
            importFileInput.value = '';
            return;
        }
        
        // Read the file
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                // Validate data structure
                if (!data || !data.activities || !data.actions) {
                    throw new Error('Invalid data structure.');
                }
                
                // Store data temporarily
                currentImportData = data;
                
                // Show import options
                importOptions.classList.remove('hidden');
            } catch (error) {
                showNotification('Invalid JSON file: ' + error.message);
                importFileInput.value = '';
            }
        };
        
        reader.readAsText(file);
    };
    
    /**
     * Handle import confirmation
     */
    const handleImportConfirm = () => {
        if (!currentImportData) {
            showNotification('No data to import.');
            return;
        }
        
        // Get import mode
        let replace = false;
        const importModeRadios = document.getElementsByName('import-mode');
        for (const radio of importModeRadios) {
            if (radio.checked && radio.value === 'replace') {
                replace = true;
                break;
            }
        }
        
        // Import data
        const success = Storage.importData(currentImportData, replace);
        
        // Reset
        importOptions.classList.add('hidden');
        importFileInput.value = '';
        currentImportData = null;
        
        // Show notification
        if (success) {
            showNotification('Data imported successfully!');
            
            // Update UI
            updateDashboard();
            renderActionsList();
            updateDashboard();
        } else {
            showNotification('Failed to import data. Invalid data structure.');
        }
    };
    
    /**
     * Render the actions list in the admin section
     */
    const renderActionsList = () => {
        let actions = Storage.getActions();
        
        // Apply filter
        const filterValue = actionFilter.value;
        if (filterValue !== 'all') {
            actions = actions.filter(action => action.type === filterValue);
        }
        
        if (actions.length === 0) {
            actionsListEl.innerHTML = '<p class="empty-state">No actions found</p>';
            return;
        }
        
        actionsListEl.innerHTML = '';
        
        actions.forEach(action => {
            const actionItem = document.createElement('div');
            actionItem.className = 'action-item';
            actionItem.dataset.id = action.id;
            
            let actionTypeLabel = '';
            switch (action.type) {
                case 'good':
                    actionTypeLabel = 'Good Habit';
                    break;
                case 'bad':
                    actionTypeLabel = 'Bad Habit';
                    break;
                case 'neutral':
                    actionTypeLabel = 'Neutral';
                    break;
            }
            
            actionItem.innerHTML = `
                <div>
                    <div class="action-name">${action.name}</div>
                    <div class="action-category">${action.category || ''}</div>
                </div>
                <div>
                    <span class="action-type ${action.type}">${actionTypeLabel}</span>
                    <div class="action-controls">
                        <button class="edit-btn">✏️</button>
                        <button class="delete-btn">🗑️</button>
                    </div>
                </div>
            `;
            
            // Add edit event listener
            actionItem.querySelector('.edit-btn').addEventListener('click', () => {
                showEditActionForm(action.id);
            });
            
            // Add delete event listener
            actionItem.querySelector('.delete-btn').addEventListener('click', () => {
                handleDeleteAction(action.id);
            });
            
            actionsListEl.appendChild(actionItem);
        });
    };
    
    /**
     * Show the form to add a new action
     */
    const showAddActionForm = () => {
        // Reset the form
        actionForm.reset();
        actionFormTitle.textContent = 'Add New Action';
        currentEditingActionId = null;
        
        // Show the form
        actionFormContainer.classList.remove('hidden');
    };
    
    /**
     * Show the form to edit an existing action
     * @param {String} actionId - ID of the action to edit
     */
    const showEditActionForm = (actionId) => {
        const action = Storage.getActions().find(a => a.id === actionId);
        if (!action) return;
        
        // Set form title
        actionFormTitle.textContent = 'Edit Action';
        
        // Set current editing action ID
        currentEditingActionId = actionId;
        
        // Fill form fields
        document.getElementById('action-name').value = action.name;
        
        // Set action type radio
        const actionTypeRadios = document.getElementsByName('action-type');
        for (const radio of actionTypeRadios) {
            if (radio.value === action.type) {
                radio.checked = true;
                break;
            }
        }
        
        // Set category if available
        document.getElementById('action-category').value = action.category || '';
        
        // Set fields checkboxes
        const fieldCheckboxes = document.getElementsByName('action-fields');
        for (const checkbox of fieldCheckboxes) {
            checkbox.checked = action.fields && action.fields.includes(checkbox.value);
        }
        
        // Show the form
        actionFormContainer.classList.remove('hidden');
    };
    
    /**
     * Hide the action form
     */
    const hideActionForm = () => {
        actionFormContainer.classList.add('hidden');
        currentEditingActionId = null;
    };
    
    /**
     * Handle action form submission
     * @param {Event} e - Submit event
     */
    const handleActionFormSubmit = (e) => {
        e.preventDefault();
        
        // Get form data
        const name = document.getElementById('action-name').value;
        
        let type = '';
        const actionTypeRadios = document.getElementsByName('action-type');
        for (const radio of actionTypeRadios) {
            if (radio.checked) {
                type = radio.value;
                break;
            }
        }
        
        const category = document.getElementById('action-category').value;
        
        // Get selected fields
        const fields = [];
        const fieldCheckboxes = document.getElementsByName('action-fields');
        for (const checkbox of fieldCheckboxes) {
            if (checkbox.checked) {
                fields.push(checkbox.value);
            }
        }
        
        // Create action object
        const action = {
            name,
            type,
            category: category || '',
            fields
        };
        
        // Add or update action
        if (currentEditingActionId) {
            Storage.updateAction(currentEditingActionId, action);
            showNotification('Action updated!');
        } else {
            Storage.addAction(action);
            showNotification('Action added!');
        }
        
        // Hide form and refresh list
        hideActionForm();
        renderActionsList();
        
        // Update other parts of the UI that depend on actions
        updateDashboard();
    };
    
    /**
     * Handle action deletion
     * @param {String} actionId - ID of the action to delete
     */
    const handleDeleteAction = (actionId) => {
        // Confirm deletion
        const action = Storage.getActions().find(a => a.id === actionId);
        if (!action) return;
        
        if (confirm(`Are you sure you want to delete the action "${action.name}"?`)) {
            const deleted = Storage.deleteAction(actionId);
            
            if (deleted) {
                showNotification('Action deleted!');
                renderActionsList();
                updateDashboard();
            } else {
                alert('Cannot delete this action because it has associated activities. Delete the activities first.');
            }
        }
    };
    
    /**
     * Setup the history filter dropdown
     */
    const setupHistoryFilter = () => {
        const actions = Storage.getActions();
        
        // Keep the "All Activities" option
        historyFilter.innerHTML = '<option value="all">All Activities</option>';
        
        // Add options for each action
        actions.forEach(action => {
            const option = document.createElement('option');
            option.value = action.id;
            option.textContent = action.name;
            historyFilter.appendChild(option);
        });
    };
    
    /**
     * Render activity history with optional filtering
     */
    const renderActivityHistory = () => {
        let activities = Storage.getActivities();
        
        // Apply filter
        const filterValue = historyFilter.value;
        if (filterValue !== 'all') {
            activities = activities.filter(activity => activity.actionId === filterValue);
        }
        
        if (activities.length === 0) {
            activityHistoryList.innerHTML = '<p class="empty-state">No activities found</p>';
            historyPagination.innerHTML = '';
            return;
        }
        
        // Sort activities by date (newest first) then by timestamp (newest first)
        activities.sort((a, b) => {
            const dateComparison = new Date(b.date) - new Date(a.date);
            if (dateComparison !== 0) return dateComparison;
            return b.timestamp - a.timestamp;
        });

        // Pagination
        const totalPages = Math.ceil(activities.length / HISTORY_PAGE_SIZE);
        if (historyCurrentPage > totalPages) historyCurrentPage = totalPages;
        const start = (historyCurrentPage - 1) * HISTORY_PAGE_SIZE;
        const pageActivities = activities.slice(start, start + HISTORY_PAGE_SIZE);

        activityHistoryList.innerHTML = '';
        pageActivities.forEach((activity, pageIndex) => {
            // Find the previous (older) occurrence of this same action in the full sorted list
            const globalIndex = start + pageIndex;
            const prevActivity = activities[globalIndex + 1] || null; // sorted newest-first, so +1 is older
            const elapsed = prevActivity ? calcElapsed(activity.date, prevActivity.date) : null;
            activityHistoryList.appendChild(createActivityElement(activity, true, true, elapsed));
        });

        // Render pagination controls
        if (totalPages <= 1) {
            historyPagination.innerHTML = '';
        } else {
            historyPagination.innerHTML = `
                <button class="btn btn-small btn-secondary" id="hist-prev" ${historyCurrentPage === 1 ? 'disabled' : ''}>← Prev</button>
                <span style="margin: 0 1rem;">Page ${historyCurrentPage} of ${totalPages}</span>
                <button class="btn btn-small btn-secondary" id="hist-next" ${historyCurrentPage === totalPages ? 'disabled' : ''}>Next →</button>
            `;
            document.getElementById('hist-prev').addEventListener('click', () => { historyCurrentPage--; renderActivityHistory(); });
            document.getElementById('hist-next').addEventListener('click', () => { historyCurrentPage++; renderActivityHistory(); });
        }
    };
    
    /**
     * Create a DOM element for an activity
     * @param {Object} activity - The activity object
     * @param {Boolean} includeDelete - Whether to include a delete button
     * @param {Boolean} includeEdit - Whether to include an edit button
     * @returns {HTMLElement} The activity element
     */
    const createActivityElement = (activity, includeDelete = false, includeEdit = true, elapsed = null) => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.dataset.id = activity.id;
        
        // Get action info
        const actions = Storage.getActions();
        let action = actions.find(a => a.id === activity.actionId);
        
        // Fallback for legacy activities
        if (!action) {
            // Handle legacy activities by type
            switch(activity.type) {
                case 'exercise':
                    action = {
                        id: 'exercise',
                        name: 'Exercise',
                        type: 'good'
                    };
                    break;
                case 'diet':
                    action = {
                        id: activity.foodQuality === 'healthy' ? 'diet-healthy' : 'diet-unhealthy',
                        name: activity.foodQuality === 'healthy' ? 'Healthy Food' : 'Unhealthy Food',
                        type: activity.foodQuality === 'healthy' ? 'good' : 'bad'
                    };
                    break;
                case 'work':
                    action = {
                        id: 'work',
                        name: 'Work Time',
                        type: 'neutral'
                    };
                    break;
                default:
                    action = {
                        id: 'unknown',
                        name: 'Unknown Activity',
                        type: 'neutral'
                    };
            }
        }
        
        let details = '';
        
        // Generate details based on activity data
        if (activity.exerciseType && activity.duration) {
            details = `${activity.exerciseType} for ${activity.duration} minutes`;
        } else if (activity.startTime && activity.endTime) {
            details = `${activity.startTime} to ${activity.endTime}`;
        }
        
        // Add notes if available
        if (activity.notes) {
            if (details) {
                details += `<br><span class="activity-notes">${activity.notes}</span>`;
            } else {
                details = activity.notes;
            }
        }
        
        // If no details yet, check for legacy fields
        if (!details) {
            if (activity.type === 'exercise') {
                details = `${activity.exerciseType} for ${activity.duration} minutes`;
            } else if (activity.type === 'diet') {
                details = activity.notes || 'No details provided';
            } else if (activity.type === 'work') {
                details = `${activity.startTime} to ${activity.endTime}`;
            }
        }
        
        // Fall back to "No details" if still empty
        if (!details) {
            details = 'No details provided';
        }
        
        activityItem.innerHTML = `
            <div>
                <span class="activity-type ${action.type}">${action.name}</span>
                ${includeDelete ? `<span class="activity-date">${formatDate(activity.date)}${elapsed ? `<span class="activity-elapsed">+${elapsed}</span>` : ''}</span>` : ''}
            </div>
            <div class="activity-details">${details}</div>
            <div class="activity-controls">
                ${includeEdit ? '<button class="edit-btn">✏️</button>' : ''}
                ${includeDelete ? '<button class="delete-btn">×</button>' : ''}
            </div>
        `;
        
        // Add delete event listener if needed
        if (includeDelete) {
            const deleteBtn = activityItem.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                Storage.deleteActivity(activity.id);
                updateDashboard();
                renderActivityHistory();
            });
        }
        
        // Add edit event listener if needed
        if (includeEdit) {
            const editBtn = activityItem.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    showEditActivityForm(activity.id);
                });
            }
        }
        
        return activityItem;
    };
    
    /**
     * Format a date for display
     * @param {String} dateStr - Date string in format YYYY-MM-DD
     * @returns {String} Formatted date string
     */
    const formatDate = (dateStr) => {
        // Parse the YYYY-MM-DD string into year, month, day components
        const [year, month, day] = dateStr.split('-').map(part => parseInt(part, 10));
        
        // Create date at local midnight for that date
        const date = new Date(year, month - 1, day); // month is 0-indexed in JS Date
        
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    };

    /**
     * Calculate elapsed time between two date strings (YYYY-MM-DD).
     * Returns a human-readable string like "3d" or "2w 1d".
     * @param {String} newerDate - The more recent date string
     * @param {String} olderDate - The earlier date string
     * @returns {String} Human-readable elapsed time
     */
    const calcElapsed = (newerDate, olderDate) => {
        const [y1, m1, d1] = newerDate.split('-').map(Number);
        const [y2, m2, d2] = olderDate.split('-').map(Number);
        const a = new Date(y1, m1 - 1, d1);
        const b = new Date(y2, m2 - 1, d2);
        const diffDays = Math.round((a - b) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return null;
        return `${diffDays}d`;
    };
    
    /**
     * Handle clear data button click
     */
    const handleClearData = () => {
        if (confirm('Are you sure you want to delete all your activity data? This cannot be undone.')) {
            Storage.clearAllData();
            updateDashboard();
            renderActivityHistory();
            showNotification('All data cleared!');
        }
    };
    
    /**
     * Show the form to edit an existing activity
     * @param {String} activityId - ID of the activity to edit
     */
    const showEditActivityForm = (activityId) => {
        const activity = Storage.getActivities().find(a => a.id === activityId);
        if (!activity) return;
        
        const action = Storage.getActions().find(a => a.id === activity.actionId);
        if (!action) return;
        
        currentEditingActivityId = activityId;
        
        // Select the correct action in dashboard form
        dashboardActionSelect.value = activity.actionId;
        generateDashboardForm();
        
        // Fill form fields with activity data
        document.getElementById('dash-date').value = activity.date;
        
        if (action.fields) {
            if (action.fields.includes('type') && document.getElementById('dash-type'))
                document.getElementById('dash-type').value = activity.exerciseType || '';
            if (action.fields.includes('duration') && document.getElementById('dash-duration'))
                document.getElementById('dash-duration').value = activity.duration || '';
            if (action.fields.includes('startTime') && document.getElementById('dash-start'))
                document.getElementById('dash-start').value = activity.startTime || '';
            if (action.fields.includes('endTime') && document.getElementById('dash-end'))
                document.getElementById('dash-end').value = activity.endTime || '';
        }
        if (document.getElementById('dash-notes'))
            document.getElementById('dash-notes').value = activity.notes || '';

        // Update submit button text
        const submitBtn = document.querySelector('#dashboard-activity-form button[type="submit"]');
        if (submitBtn) submitBtn.textContent = `Update ${action.name}`;
        
        // Scroll to top of form
        document.getElementById('dashboard-form-container').scrollIntoView({ behavior: 'smooth' });
    };
    
    /**
     * Show a notification message
     * @param {String} message - The message to show
     */
    const showNotification = (message) => {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // Add to the DOM
        document.body.appendChild(notification);
        
        // Add visible class after a short delay (for animation)
        setTimeout(() => {
            notification.classList.add('visible');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('visible');
            
            // Remove from DOM after fade out
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    };
    
    // Public API
    return {
        init
    };
})();
