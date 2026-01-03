/**
 * UI handling module for Daily Activity Tracker
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
    
    // Current editing action ID
    let currentEditingActionId = null;
    
    // Current editing activity ID
    let currentEditingActivityId = null;
    
    // Current import data
    let currentImportData = null;
    
    /**
     * Initialize the UI
     */
    const init = () => {
        // Set up event listeners
        setupEventListeners();
        
        // Load initial data
        updateDashboard();
        setupActionSelect();
        renderActionsList();
        setupHistoryFilter();
        renderActivityHistory();
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
        
        // Action select
        actionSelect.addEventListener('change', generateActionForm);
        
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
        historyFilter.addEventListener('change', renderActivityHistory);
        
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
        
        // Update specific sections when shown
        if (sectionId === 'dashboard') {
            updateDashboard();
        } else if (sectionId === 'activity-entry') {
            setupActionSelect();
            generateActionForm();
        } else if (sectionId === 'admin') {
            renderActionsList();
        } else if (sectionId === 'history') {
            setupHistoryFilter();
            renderActivityHistory();
        }
    };
    
    /**
     * Update the dashboard with current data
     */
    const updateDashboard = () => {
        statsContainer.innerHTML = '';
        
        // Get actions
        const goodActions = Analytics.getGoodHabitActions();
        const badActions = Analytics.getBadHabitActions();
        
        // Add stat cards for good habits (streaks)
        goodActions.forEach(action => {
            const streak = Analytics.calculateActionStreak(action.id);
            
            const statCard = document.createElement('div');
            statCard.className = 'stat-card good-habit';
            statCard.innerHTML = `
                <h3>${action.name} Streak</h3>
                <div class="stat-value">${streak} day${streak !== 1 ? 's' : ''}</div>
            `;
            
            statsContainer.appendChild(statCard);
        });
        
        // Add stat cards for bad habits (days since)
        badActions.forEach(action => {
            const daysSince = Analytics.calculateDaysSinceLastOccurrence(action.id);
            
            const statCard = document.createElement('div');
            statCard.className = 'stat-card bad-habit';
            statCard.innerHTML = `
                <h3>Days Since ${action.name}</h3>
                <div class="stat-value">${daysSince} day${daysSince !== 1 ? 's' : ''}</div>
            `;
            
            statsContainer.appendChild(statCard);
        });
        
        // Add section for activity counts in the last 30 days
        const activityCounts = Analytics.getActivityCountsLast30Days();
        const allActions = Storage.getActions();
        
        // Create header for this section
        const countSectionHeader = document.createElement('h3');
        countSectionHeader.className = 'count-section-header';
        countSectionHeader.textContent = 'Activity Counts (Last 30 Days)';
        statsContainer.appendChild(countSectionHeader);
        
        // Create container for the count cards
        const countsContainer = document.createElement('div');
        countsContainer.className = 'counts-container';
        
        // Add count cards for each action
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
        
        // If no actions are found, add a message
        if (allActions.length === 0) {
            countsContainer.innerHTML = `
                <p class="empty-state">No actions configured yet. Go to Admin to add actions.</p>
            `;
        }
        
        statsContainer.appendChild(countsContainer);
        
        // If no stat cards were added at all, add a message
        if (statsContainer.children.length === 0) {
            statsContainer.innerHTML = `
                <p class="empty-state">No actions configured yet. Go to Admin to add actions.</p>
            `;
        }
        
        // Update today's activities
        renderTodayActivities();
    };
    
    /**
     * Render today's activities on the dashboard
     */
    const renderTodayActivities = () => {
        // Format today's date
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        
        const todayActivities = Storage.getActivitiesByDate(today);
        
        if (todayActivities.length === 0) {
            todayActivitiesList.innerHTML = '<p class="empty-state">No activities logged today</p>';
            return;
        }
        
        todayActivitiesList.innerHTML = '';
        
        // Sort activities by timestamp (newest first)
        todayActivities
            .sort((a, b) => b.timestamp - a.timestamp)
            .forEach(activity => {
                const activityItem = createActivityElement(activity);
                todayActivitiesList.appendChild(activityItem);
            });
    };
    
    /**
     * Setup the action select dropdown
     */
    const setupActionSelect = () => {
        const actions = Storage.getActions();
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
     * Generate a form based on the selected action
     */
    const generateActionForm = () => {
        const actionId = actionSelect.value;
        
        // Reset currentEditingActivityId when the action changes
        // This prevents editing one activity and switching to a different action type
        if (!currentEditingActivityId) {
            currentEditingActivityId = null;
        }
        if (!actionId) {
            dynamicFormContainer.innerHTML = '<p class="empty-state">Please select an action</p>';
            return;
        }
        
        const action = Storage.getActions().find(a => a.id === actionId);
        if (!action) {
            dynamicFormContainer.innerHTML = '<p class="empty-state">Action not found</p>';
            return;
        }
        
        let formHTML = `
            <form id="dynamic-activity-form">
                <input type="hidden" id="action-id" value="${action.id}">
        `;
        
        // Add date field (always present)
        formHTML += `
            <div class="form-group">
                <label for="activity-date">Date</label>
                <input type="date" id="activity-date" required>
            </div>
        `;
        
        // Add fields based on action configuration
        if (!action.fields || action.fields.length === 0) {
            // Default to notes only if no fields specified
            formHTML += `
                <div class="form-group">
                    <label for="activity-notes">Notes</label>
                    <textarea id="activity-notes" placeholder="Additional notes..."></textarea>
                </div>
            `;
        } else {
            // Add fields from the action configuration
            if (action.fields.includes('type')) {
                formHTML += `
                    <div class="form-group">
                        <label for="activity-type">${action.name} Type</label>
                        <input type="text" id="activity-type" required placeholder="e.g., Running, Yoga, Cycling">
                    </div>
                `;
            }
            
            if (action.fields.includes('duration')) {
                formHTML += `
                    <div class="form-group">
                        <label for="activity-duration">Duration (minutes)</label>
                        <input type="number" id="activity-duration" required min="1">
                    </div>
                `;
            }
            
            if (action.fields.includes('startTime')) {
                formHTML += `
                    <div class="form-group">
                        <label for="activity-start">Start Time</label>
                        <input type="time" id="activity-start" required>
                    </div>
                `;
            }
            
            if (action.fields.includes('endTime')) {
                formHTML += `
                    <div class="form-group">
                        <label for="activity-end">End Time</label>
                        <input type="time" id="activity-end" required>
                    </div>
                `;
            }
            
            if (action.fields.includes('notes')) {
                formHTML += `
                    <div class="form-group">
                        <label for="activity-notes">Notes</label>
                        <textarea id="activity-notes" placeholder="Additional notes..."></textarea>
                    </div>
                `;
            }
        }
        
        // Set submit button text based on whether we're editing or adding
        const submitButtonText = currentEditingActivityId ? `Update ${action.name}` : `Save ${action.name}`;
        
        formHTML += `
            <button type="submit" class="btn">${submitButtonText}</button>
            </form>
        `;
        
        dynamicFormContainer.innerHTML = formHTML;
        
        // Set today's date as the default using local timezone
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        document.getElementById('activity-date').value = `${year}-${month}-${day}`;
        
        // Add submit event listener to the form
        document.getElementById('dynamic-activity-form').addEventListener('submit', handleActivitySubmit);
    };
    
    /**
     * Handle activity form submission
     * @param {Event} e - Submit event
     */
    const handleActivitySubmit = (e) => {
        e.preventDefault();
        
        const actionId = document.getElementById('action-id').value;
        const date = document.getElementById('activity-date').value;
        
        // Create base activity object
        const activity = {
            actionId,
            date
        };
        
        // Get action to determine what fields to collect
        const action = Storage.getActions().find(a => a.id === actionId);
        
        // Collect data based on available fields
        if (action.fields) {
            if (action.fields.includes('type') && document.getElementById('activity-type')) {
                activity.exerciseType = document.getElementById('activity-type').value;
            }
            
            if (action.fields.includes('duration') && document.getElementById('activity-duration')) {
                activity.duration = document.getElementById('activity-duration').value;
            }
            
            if (action.fields.includes('startTime') && document.getElementById('activity-start')) {
                activity.startTime = document.getElementById('activity-start').value;
            }
            
            if (action.fields.includes('endTime') && document.getElementById('activity-end')) {
                activity.endTime = document.getElementById('activity-end').value;
            }
        }
        
        // Add notes if the field exists
        if (document.getElementById('activity-notes')) {
            activity.notes = document.getElementById('activity-notes').value;
        }
        
        // Check if we're editing or adding a new activity
        if (currentEditingActivityId) {
            // Update existing activity
            Storage.updateActivity(currentEditingActivityId, activity);
            showNotification(`${action.name} updated!`);
            // Reset the editing ID
            currentEditingActivityId = null;
        } else {
            // Save new activity
            Storage.addActivity(activity);
            showNotification(`${action.name} saved!`);
        }
        
        // Reset form
        e.target.reset();
        
        // Set today's date again after form reset with proper local timezone
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        document.getElementById('activity-date').value = `${year}-${month}-${day}`;
        
        // Update UI
        updateDashboard();
        
        // Update UI
        updateDashboard();
    };
    
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
            setupActionSelect();
            setupHistoryFilter();
            renderActivityHistory();
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
        setupActionSelect();
        updateDashboard();
        setupHistoryFilter();
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
                setupActionSelect();
                updateDashboard();
                setupHistoryFilter();
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
            return;
        }
        
        activityHistoryList.innerHTML = '';
        
        // Sort activities by date (newest first) then by timestamp (newest first)
        activities
            .sort((a, b) => {
                // Sort by date
                const dateA = a.date;
                const dateB = b.date;
                const dateComparison = new Date(dateB) - new Date(dateA);
                if (dateComparison !== 0) return dateComparison;
                return b.timestamp - a.timestamp;
            })
            .forEach(activity => {
                const activityItem = createActivityElement(activity, true);
                activityHistoryList.appendChild(activityItem);
            });
    };
    
    /**
     * Create a DOM element for an activity
     * @param {Object} activity - The activity object
     * @param {Boolean} includeDelete - Whether to include a delete button
     * @param {Boolean} includeEdit - Whether to include an edit button
     * @returns {HTMLElement} The activity element
     */
    const createActivityElement = (activity, includeDelete = false, includeEdit = true) => {
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
                ${includeDelete ? `<span class="activity-date">${formatDate(activity.date)}</span>` : ''}
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
        
        // Find the action associated with this activity
        const action = Storage.getActions().find(a => a.id === activity.actionId);
        if (!action) return;
        
        // Set current editing activity ID
        currentEditingActivityId = activityId;
        
        // Show the activity entry section
        showSection('activity-entry');
        
        // Select the correct action
        actionSelect.value = activity.actionId;
        
        // Generate the form
        generateActionForm();
        
        // Fill form fields with activity data
        document.getElementById('activity-date').value = activity.date;
        
        if (action.fields) {
            if (action.fields.includes('type') && document.getElementById('activity-type')) {
                document.getElementById('activity-type').value = activity.exerciseType || '';
            }
            
            if (action.fields.includes('duration') && document.getElementById('activity-duration')) {
                document.getElementById('activity-duration').value = activity.duration || '';
            }
            
            if (action.fields.includes('startTime') && document.getElementById('activity-start')) {
                document.getElementById('activity-start').value = activity.startTime || '';
            }
            
            if (action.fields.includes('endTime') && document.getElementById('activity-end')) {
                document.getElementById('activity-end').value = activity.endTime || '';
            }
        }
        
        // Add notes if the field exists
        if (document.getElementById('activity-notes')) {
            document.getElementById('activity-notes').value = activity.notes || '';
        }
        
        // Update the submit button text
        const submitBtn = document.querySelector('#dynamic-activity-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = `Update ${action.name}`;
        }
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
