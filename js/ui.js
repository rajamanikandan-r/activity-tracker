/**
 * UI handling module for Daily Activity Tracker
 * Manages DOM manipulation and event listeners
 * All Storage/Analytics calls are async (Firestore).
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

    // State
    let currentEditingActionId = null;
    let currentEditingActivityId = null;
    let currentImportData = null;

    // History pagination state
    let historyCurrentPage = 1;
    const HISTORY_PAGE_SIZE = 10;

    // ─── Init ─────────────────────────────────────────────────────────────────

    /**
     * Initialise the UI. Called once from app.js after Firestore is ready.
     */
    const init = async () => {
        setupEventListeners();
        await updateDashboard();
        await renderActionsList();
    };

    // ─── Event Listeners ──────────────────────────────────────────────────────

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
        historyFilter.addEventListener('change', async () => {
            historyCurrentPage = 1;
            await renderActivityHistory();
        });

        // Clear data button
        clearDataButton.addEventListener('click', handleClearData);
    };

    // ─── Section Navigation ───────────────────────────────────────────────────

    const showSection = async (sectionId) => {
        sections.forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');

        if (sectionId === 'dashboard') {
            await updateDashboard();
        } else if (sectionId === 'admin') {
            await renderActionsList();
        }
    };

    // ─── Dashboard ────────────────────────────────────────────────────────────

    /**
     * Update the full dashboard: action select, stats table, history.
     */
    const updateDashboard = async () => {
        const actions = await Storage.getActions();

        // Populate dashboard action select
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
        await generateDashboardForm();

        // Populate stats table
        const tbody = dashboardStatsTable.querySelector('tbody');
        tbody.innerHTML = '';
        const counts = await Analytics.getActivityCountsLast30Days();

        await Promise.all(actions.map(async action => {
            const [currentStreak, maxStreak] = await Promise.all([
                Analytics.calculateActionStreak(action.id),
                Analytics.calculateMaxStreak(action.id)
            ]);
            const last30 = counts[action.id] || 0;
            const streakSuffix = action.type === 'bad' ? ' days avoided' : ' days';

            const row = document.createElement('tr');
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
        }));

        if (actions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No actions configured yet.</td></tr>';
        }

        await setupHistoryFilter();
        await renderActivityHistory();
    };

    /**
     * Generate (or re-generate) the dynamic activity-logging form.
     */
    const generateDashboardForm = async () => {
        const actionId = dashboardActionSelect.value;
        if (!actionId) {
            dashboardDynamicForm.innerHTML = '';
            return;
        }

        const actions = await Storage.getActions();
        const action = actions.find(a => a.id === actionId);
        if (!action) { dashboardDynamicForm.innerHTML = ''; return; }

        let formHTML = `<form id="dashboard-activity-form">
            <input type="hidden" id="dash-action-id" value="${action.id}">
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
        document.getElementById('dash-date').value =
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        document.getElementById('dashboard-activity-form')
            .addEventListener('submit', handleDashboardActivitySubmit);
    };

    /**
     * Handle dashboard activity form submission (add or update).
     */
    const handleDashboardActivitySubmit = async (e) => {
        e.preventDefault();
        const actionId = document.getElementById('dash-action-id').value;
        const actions = await Storage.getActions();
        const action = actions.find(a => a.id === actionId);
        const activity = { actionId, date: document.getElementById('dash-date').value };

        if (action.fields) {
            if (action.fields.includes('type') && document.getElementById('dash-type'))
                activity.exerciseType = document.getElementById('dash-type').value;
            if (action.fields.includes('duration') && document.getElementById('dash-duration'))
                activity.duration = document.getElementById('dash-duration').value;
            if (action.fields.includes('startTime') && document.getElementById('dash-start'))
                activity.startTime = document.getElementById('dash-start').value;
            if (action.fields.includes('endTime') && document.getElementById('dash-end'))
                activity.endTime = document.getElementById('dash-end').value;
        }
        if (document.getElementById('dash-notes'))
            activity.notes = document.getElementById('dash-notes').value;

        if (currentEditingActivityId) {
            await Storage.updateActivity(currentEditingActivityId, activity);
            showNotification(`${action.name} updated!`);
            currentEditingActivityId = null;
        } else {
            await Storage.addActivity(activity);
            showNotification(`${action.name} saved!`);
        }

        e.target.reset();
        const now = new Date();
        document.getElementById('dash-date').value =
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        await updateDashboard();
    };

    // ─── Export / Import ──────────────────────────────────────────────────────

    const handleExportData = async () => {
        const data = await Storage.exportData();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `daily-activity-tracker-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Data exported successfully!');
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            showNotification('Please select a JSON file.');
            importFileInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!data || !data.activities || !data.actions) {
                    throw new Error('Invalid data structure.');
                }
                currentImportData = data;
                importOptions.classList.remove('hidden');
            } catch (error) {
                showNotification('Invalid JSON file: ' + error.message);
                importFileInput.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleImportConfirm = async () => {
        if (!currentImportData) {
            showNotification('No data to import.');
            return;
        }

        let replace = false;
        const importModeRadios = document.getElementsByName('import-mode');
        for (const radio of importModeRadios) {
            if (radio.checked && radio.value === 'replace') {
                replace = true;
                break;
            }
        }

        showNotification('Importing data, please wait…');
        const success = await Storage.importData(currentImportData, replace);

        importOptions.classList.add('hidden');
        importFileInput.value = '';
        currentImportData = null;

        if (success) {
            showNotification('Data imported successfully!');
            await updateDashboard();
            await renderActionsList();
        } else {
            showNotification('Failed to import data. Invalid data structure.');
        }
    };

    // ─── Admin — Actions List ─────────────────────────────────────────────────

    const renderActionsList = async () => {
        let actions = await Storage.getActions();

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
                case 'good':    actionTypeLabel = 'Good Habit'; break;
                case 'bad':     actionTypeLabel = 'Bad Habit';  break;
                case 'neutral': actionTypeLabel = 'Neutral';    break;
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

            actionItem.querySelector('.edit-btn').addEventListener('click', () => showEditActionForm(action.id));
            actionItem.querySelector('.delete-btn').addEventListener('click', () => handleDeleteAction(action.id));

            actionsListEl.appendChild(actionItem);
        });
    };

    const showAddActionForm = () => {
        actionForm.reset();
        actionFormTitle.textContent = 'Add New Action';
        currentEditingActionId = null;
        actionFormContainer.classList.remove('hidden');
    };

    const showEditActionForm = async (actionId) => {
        const actions = await Storage.getActions();
        const action = actions.find(a => a.id === actionId);
        if (!action) return;

        actionFormTitle.textContent = 'Edit Action';
        currentEditingActionId = actionId;

        document.getElementById('action-name').value = action.name;

        const actionTypeRadios = document.getElementsByName('action-type');
        for (const radio of actionTypeRadios) {
            if (radio.value === action.type) { radio.checked = true; break; }
        }

        document.getElementById('action-category').value = action.category || '';

        const fieldCheckboxes = document.getElementsByName('action-fields');
        for (const checkbox of fieldCheckboxes) {
            checkbox.checked = action.fields && action.fields.includes(checkbox.value);
        }

        actionFormContainer.classList.remove('hidden');
    };

    const hideActionForm = () => {
        actionFormContainer.classList.add('hidden');
        currentEditingActionId = null;
    };

    const handleActionFormSubmit = async (e) => {
        e.preventDefault();

        const name = document.getElementById('action-name').value;
        let type = '';
        const actionTypeRadios = document.getElementsByName('action-type');
        for (const radio of actionTypeRadios) {
            if (radio.checked) { type = radio.value; break; }
        }

        const category = document.getElementById('action-category').value;
        const fields = [];
        const fieldCheckboxes = document.getElementsByName('action-fields');
        for (const checkbox of fieldCheckboxes) {
            if (checkbox.checked) fields.push(checkbox.value);
        }

        const action = { name, type, category: category || '', fields };

        if (currentEditingActionId) {
            await Storage.updateAction(currentEditingActionId, action);
            showNotification('Action updated!');
        } else {
            await Storage.addAction(action);
            showNotification('Action added!');
        }

        hideActionForm();
        await renderActionsList();
        await updateDashboard();
    };

    const handleDeleteAction = async (actionId) => {
        const actions = await Storage.getActions();
        const action = actions.find(a => a.id === actionId);
        if (!action) return;

        if (confirm(`Are you sure you want to delete the action "${action.name}"?`)) {
            const deleted = await Storage.deleteAction(actionId);
            if (deleted) {
                showNotification('Action deleted!');
                await renderActionsList();
                await updateDashboard();
            } else {
                alert('Cannot delete this action because it has associated activities. Delete the activities first.');
            }
        }
    };

    // ─── History ──────────────────────────────────────────────────────────────

    const setupHistoryFilter = async () => {
        const actions = await Storage.getActions();
        historyFilter.innerHTML = '<option value="all">All Activities</option>';
        actions.forEach(action => {
            const option = document.createElement('option');
            option.value = action.id;
            option.textContent = action.name;
            historyFilter.appendChild(option);
        });
    };

    const renderActivityHistory = async () => {
        let activities = await Storage.getActivities();

        const filterValue = historyFilter.value;
        if (filterValue !== 'all') {
            activities = activities.filter(activity => activity.actionId === filterValue);
        }

        if (activities.length === 0) {
            activityHistoryList.innerHTML = '<p class="empty-state">No activities found</p>';
            historyPagination.innerHTML = '';
            return;
        }

        // Sort: newest date first, then newest timestamp
        activities.sort((a, b) => {
            const dateComparison = new Date(b.date) - new Date(a.date);
            if (dateComparison !== 0) return dateComparison;
            return b.timestamp - a.timestamp;
        });

        const totalPages = Math.ceil(activities.length / HISTORY_PAGE_SIZE);
        if (historyCurrentPage > totalPages) historyCurrentPage = totalPages;
        const start = (historyCurrentPage - 1) * HISTORY_PAGE_SIZE;
        const pageActivities = activities.slice(start, start + HISTORY_PAGE_SIZE);

        const actions = await Storage.getActions();
        activityHistoryList.innerHTML = '';
        pageActivities.forEach((activity, pageIndex) => {
            const globalIndex = start + pageIndex;
            const prevActivity = activities[globalIndex + 1] || null;
            const elapsed = prevActivity ? calcElapsed(activity.date, prevActivity.date) : null;
            activityHistoryList.appendChild(createActivityElement(activity, actions, true, true, elapsed));
        });

        // Pagination controls
        if (totalPages <= 1) {
            historyPagination.innerHTML = '';
        } else {
            historyPagination.innerHTML = `
                <button class="btn btn-small btn-secondary" id="hist-prev" ${historyCurrentPage === 1 ? 'disabled' : ''}>← Prev</button>
                <span style="margin: 0 1rem;">Page ${historyCurrentPage} of ${totalPages}</span>
                <button class="btn btn-small btn-secondary" id="hist-next" ${historyCurrentPage === totalPages ? 'disabled' : ''}>Next →</button>
            `;
            document.getElementById('hist-prev').addEventListener('click', async () => {
                historyCurrentPage--;
                await renderActivityHistory();
            });
            document.getElementById('hist-next').addEventListener('click', async () => {
                historyCurrentPage++;
                await renderActivityHistory();
            });
        }
    };

    // ─── Activity Element ─────────────────────────────────────────────────────

    /**
     * Create a DOM element for a single activity.
     * @param {Object} activity
     * @param {Array} actions - Pre-fetched actions array (avoids extra async call)
     * @param {Boolean} includeDelete
     * @param {Boolean} includeEdit
     * @param {String|null} elapsed
     */
    const createActivityElement = (activity, actions, includeDelete = false, includeEdit = true, elapsed = null) => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.dataset.id = activity.id;

        let action = actions.find(a => a.id === activity.actionId);

        // Fallback for legacy activities
        if (!action) {
            switch (activity.type) {
                case 'exercise':
                    action = { id: 'exercise', name: 'Exercise', type: 'good' };
                    break;
                case 'diet':
                    action = {
                        id: activity.foodQuality === 'healthy' ? 'diet-healthy' : 'diet-unhealthy',
                        name: activity.foodQuality === 'healthy' ? 'Healthy Food' : 'Unhealthy Food',
                        type: activity.foodQuality === 'healthy' ? 'good' : 'bad'
                    };
                    break;
                case 'work':
                    action = { id: 'work', name: 'Work Time', type: 'neutral' };
                    break;
                default:
                    action = { id: 'unknown', name: 'Unknown Activity', type: 'neutral' };
            }
        }

        let details = '';
        if (activity.exerciseType && activity.duration) {
            details = `${activity.exerciseType} for ${activity.duration} minutes`;
        } else if (activity.startTime && activity.endTime) {
            details = `${activity.startTime} to ${activity.endTime}`;
        }
        if (activity.notes) {
            details = details
                ? `${details}<br><span class="activity-notes">${activity.notes}</span>`
                : activity.notes;
        }
        if (!details) {
            if (activity.type === 'exercise') {
                details = `${activity.exerciseType} for ${activity.duration} minutes`;
            } else if (activity.type === 'diet') {
                details = activity.notes || 'No details provided';
            } else if (activity.type === 'work') {
                details = `${activity.startTime} to ${activity.endTime}`;
            }
        }
        if (!details) details = 'No details provided';

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

        if (includeDelete) {
            activityItem.querySelector('.delete-btn').addEventListener('click', async () => {
                await Storage.deleteActivity(activity.id);
                await updateDashboard();
                await renderActivityHistory();
            });
        }

        if (includeEdit) {
            const editBtn = activityItem.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => showEditActivityForm(activity.id));
            }
        }

        return activityItem;
    };

    // ─── Edit Activity ────────────────────────────────────────────────────────

    const showEditActivityForm = async (activityId) => {
        const activities = await Storage.getActivities();
        const activity = activities.find(a => a.id === activityId);
        if (!activity) return;

        const actions = await Storage.getActions();
        const action = actions.find(a => a.id === activity.actionId);
        if (!action) return;

        currentEditingActivityId = activityId;

        dashboardActionSelect.value = activity.actionId;
        await generateDashboardForm();

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

        const submitBtn = document.querySelector('#dashboard-activity-form button[type="submit"]');
        if (submitBtn) submitBtn.textContent = `Update ${action.name}`;

        document.getElementById('dashboard-form-container').scrollIntoView({ behavior: 'smooth' });
    };

    // ─── Clear Data ───────────────────────────────────────────────────────────

    const handleClearData = async () => {
        if (confirm('Are you sure you want to delete all your activity data? This cannot be undone.')) {
            await Storage.clearAllData();
            await updateDashboard();
            await renderActivityHistory();
            showNotification('All data cleared!');
        }
    };

    // ─── Utilities ────────────────────────────────────────────────────────────

    const formatDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-').map(part => parseInt(part, 10));
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const calcElapsed = (newerDate, olderDate) => {
        const [y1, m1, d1] = newerDate.split('-').map(Number);
        const [y2, m2, d2] = olderDate.split('-').map(Number);
        const a = new Date(y1, m1 - 1, d1);
        const b = new Date(y2, m2 - 1, d2);
        const diffDays = Math.round((a - b) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return null;
        return `${diffDays}d`;
    };

    const showNotification = (message) => {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('visible'), 10);
        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    };

    // Public API
    return { init };
})();
