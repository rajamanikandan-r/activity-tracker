/**
 * Storage handling module for Daily Activity Tracker
 * Manages all interactions with localStorage
 */

const Storage = (() => {
    // Storage keys
    const ACTIVITIES_STORAGE_KEY = 'dailyActivityTracker.activities';
    const ACTIONS_STORAGE_KEY = 'dailyActivityTracker.actions';
    
    /**
     * Save activities to localStorage
     * @param {Array} activities - Array of activity objects
     */
    const saveActivities = (activities) => {
        localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
    };
    
    /**
     * Get all activities from localStorage
     * @returns {Array} Array of activity objects
     */
    const getActivities = () => {
        const storedData = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
        return storedData ? JSON.parse(storedData) : [];
    };
    
    /**
     * Add a new activity
     * @param {Object} activity - Activity object to add
     */
    const addActivity = (activity) => {
        const activities = getActivities();
        
        // Generate a unique ID for the activity
        activity.id = Date.now().toString();
        
        // Store timestamp information for sorting
        activity.timestamp = Date.now();
        
        activities.push(activity);
        saveActivities(activities);
        return activity;
    };
    
    /**
     * Delete an activity by ID
     * @param {String} id - ID of the activity to delete
     */
    const deleteActivity = (id) => {
        const activities = getActivities();
        const updatedActivities = activities.filter(activity => activity.id !== id);
        saveActivities(updatedActivities);
    };
    
    /**
     * Update an existing activity
     * @param {String} id - ID of the activity to update
     * @param {Object} updatedActivity - Updated activity object
     * @returns {Object|null} Updated activity or null if not found
     */
    const updateActivity = (id, updatedActivity) => {
        const activities = getActivities();
        const index = activities.findIndex(activity => activity.id === id);
        
        if (index !== -1) {
            // Preserve original timestamp and ID
            const originalActivity = activities[index];
            const mergedActivity = { 
                ...originalActivity,
                ...updatedActivity,
                id: originalActivity.id, // ensure ID doesn't change
                timestamp: originalActivity.timestamp // keep original timestamp for sorting
            };
            
            activities[index] = mergedActivity;
            saveActivities(activities);
            return mergedActivity;
        }
        
        return null;
    };
    
    /**
     * Get activities by date
     * @param {String} dateStr - Date string in format YYYY-MM-DD
     * @returns {Array} Array of activities for the specified date
     */
    const getActivitiesByDate = (dateStr) => {
        const activities = getActivities();
        return activities.filter(activity => activity.date === dateStr);
    };
    
    /**
     * Get activities by local date (for backward compatibility)
     * @param {String} dateStr - Date string in format YYYY-MM-DD
     * @returns {Array} Array of activities for the specified date
     */
    const getActivitiesByLocalDate = (dateStr) => {
        return getActivitiesByDate(dateStr);
    };
    
    /**
     * Get activities by action ID
     * @param {String} actionId - ID of the action
     * @returns {Array} Array of activities for the specified action
     */
    const getActivitiesByActionId = (actionId) => {
        const activities = getActivities();
        return activities.filter(activity => activity.actionId === actionId);
    };
    
    /**
     * Get activities by action type (for backward compatibility)
     * @param {String} type - Type of activity ('exercise', 'diet', 'work')
     * @returns {Array} Array of activities of the specified type
     */
    const getActivitiesByType = (type) => {
        const activities = getActivities();
        return activities.filter(activity => activity.type === type);
    };
    
    /**
     * Clear all stored activities
     */
    const clearAllData = () => {
        localStorage.removeItem(ACTIVITIES_STORAGE_KEY);
    };

    /**
     * Save actions to localStorage
     * @param {Array} actions - Array of action objects
     */
    const saveActions = (actions) => {
        localStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(actions));
    };
    
    /**
     * Get all actions from localStorage
     * @returns {Array} Array of action objects
     */
    const getActions = () => {
        // Check if there are existing actions
        const storedData = localStorage.getItem(ACTIONS_STORAGE_KEY);
        
        // If there are actions, return them
        if (storedData) {
            return JSON.parse(storedData);
        }
        
        // Otherwise, create default actions
        const defaultActions = [
            {
                id: 'exercise',
                name: 'Exercise',
                type: 'good',
                category: 'Physical',
                fields: ['exerciseType', 'duration', 'notes']
            },
            {
                id: 'diet-healthy',
                name: 'Healthy Food',
                type: 'good',
                category: 'Nutrition',
                fields: ['notes']
            },
            {
                id: 'diet-unhealthy',
                name: 'Unhealthy Food',
                type: 'bad',
                category: 'Nutrition',
                fields: ['notes']
            },
            {
                id: 'work',
                name: 'Work Time',
                type: 'neutral',
                category: 'Work',
                fields: ['startTime', 'endTime']
            }
        ];
        
        saveActions(defaultActions);
        return defaultActions;
    };
    
    /**
     * Add a new action
     * @param {Object} action - Action object to add
     */
    const addAction = (action) => {
        const actions = getActions();
        
        // Generate a unique ID for the action if not provided
        if (!action.id) {
            action.id = 'action-' + Date.now().toString();
        }
        
        actions.push(action);
        saveActions(actions);
        return action;
    };
    
    /**
     * Update an existing action
     * @param {String} id - ID of the action to update
     * @param {Object} updatedAction - Updated action object
     */
    const updateAction = (id, updatedAction) => {
        const actions = getActions();
        const index = actions.findIndex(action => action.id === id);
        
        if (index !== -1) {
            actions[index] = { ...actions[index], ...updatedAction };
            saveActions(actions);
            return actions[index];
        }
        
        return null;
    };
    
    /**
     * Delete an action by ID
     * @param {String} id - ID of the action to delete
     * @returns {Boolean} True if action was deleted, false if it has associated activities
     */
    const deleteAction = (id) => {
        // Check if there are activities using this action
        const activities = getActivities();
        const hasActivities = activities.some(activity => 
            activity.actionId === id || activity.type === id);
        
        // Don't delete if there are associated activities
        if (hasActivities) {
            return false;
        }
        
        const actions = getActions();
        const updatedActions = actions.filter(action => action.id !== id);
        saveActions(updatedActions);
        return true;
    };

    /**
     * Export all data to a JSON object
     * @returns {Object} JSON object with all data
     */
    const exportData = () => {
        return {
            activities: getActivities(),
            actions: getActions(),
            version: '1.0',
            exportDate: new Date().toISOString()
        };
    };
    
    /**
     * Import data from a JSON object
     * @param {Object} data - JSON object with data to import
     * @param {Boolean} replace - If true, replace existing data; if false, merge with existing data
     * @returns {Boolean} True if import was successful, false otherwise
     */
    const importData = (data, replace) => {
        // Validate data structure
        if (!data || !data.activities || !data.actions) {
            return false;
        }
        
        try {
            if (replace) {
                // Replace all data
                saveActivities(data.activities);
                saveActions(data.actions);
            } else {
                // Merge data
                const existingActivities = getActivities();
                const existingActions = getActions();
                
                // Create lookup for existing activities to avoid duplicates
                const existingActivityIds = existingActivities.map(a => a.id);
                const newActivities = data.activities.filter(a => !existingActivityIds.includes(a.id));
                
                // Create lookup for existing actions to avoid duplicates
                const existingActionIds = existingActions.map(a => a.id);
                const newActions = data.actions.filter(a => !existingActionIds.includes(a.id));
                
                // Add new activities and actions
                saveActivities([...existingActivities, ...newActivities]);
                saveActions([...existingActions, ...newActions]);
            }
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    };

    /**
     * Migrate old data to new format
     * This function converts legacy activities to the new format with actionId
     */
    const migrateData = () => {
        const activities = getActivities();
        let migrated = false;
        
        const updatedActivities = activities.map(activity => {
            // Skip already migrated activities
            if (activity.actionId) return activity;
            
            const newActivity = { ...activity };
            migrated = true;
            
            // Convert old type-based activities to action-based
            switch(activity.type) {
                case 'exercise':
                    newActivity.actionId = 'exercise';
                    break;
                case 'diet':
                    newActivity.actionId = activity.foodQuality === 'healthy' ? 
                        'diet-healthy' : 'diet-unhealthy';
                    break;
                case 'work':
                    newActivity.actionId = 'work';
                    break;
            }
            
            return newActivity;
        });
        
        if (migrated) {
            saveActivities(updatedActivities);
        }
    };
    
    // Call migration when the module is loaded
    migrateData();
    
    // Public API
    return {
        // Activities
        addActivity,
        getActivities,
        getActivitiesByDate,
        getActivitiesByLocalDate,
        getActivitiesByType,
        getActivitiesByActionId,
        deleteActivity,
        updateActivity,
        clearAllData,
        
        // Actions
        getActions,
        addAction,
        updateAction,
        deleteAction,
        
        // Import/Export
        exportData,
        importData,
        
        // Migration
        migrateData
    };
})();
