const Storage = (() => {
    const ACTIVITIES_KEY = 'dailyActivityTracker.activities';
    const ACTIONS_KEY = 'dailyActivityTracker.actions';

    // Helper to get the central document reference
    const getUserDoc = () => {
        const user = window.auth.currentUser;
        if (!user) return null;
        return window.fs.doc(window.db, "users", user.uid);
    };

    const persist = async (data) => {
        const docRef = getUserDoc();
        if (docRef) {
            await window.fs.setDoc(docRef, data, { merge: true });
        }
        // Update local cache for instant loading next time
        if (data.activities) localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(data.activities));
        if (data.actions) localStorage.setItem(ACTIONS_KEY, JSON.stringify(data.actions));
    };

    const getActivities = async () => {
        const docRef = getUserDoc();
        if (!docRef) return JSON.parse(localStorage.getItem(ACTIVITIES_KEY)) || [];
        const snap = await window.fs.getDoc(docRef);
        return snap.exists() ? snap.data().activities || [] : [];
    };

    const getActions = async () => {
        const docRef = getUserDoc();
        if (!docRef) return JSON.parse(localStorage.getItem(ACTIONS_KEY)) || [];
        const snap = await window.fs.getDoc(docRef);
        return snap.exists() ? snap.data().actions || [] : [];
    };

    const addActivity = async (activity) => {
        const activities = await getActivities();
        activity.id = Date.now().toString();
        activity.timestamp = Date.now();
        activities.push(activity);
        await persist({ activities });
        return activity;
    };

    const deleteActivity = async (id) => {
        let activities = await getActivities();
        activities = activities.filter(a => a.id !== id);
        await persist({ activities });
    };

    const addAction = async (action) => {
        const actions = await getActions();
        // CRITICAL: Generate a unique ID so activities can link to this action
        action.id = Date.now().toString(); 
        actions.push(action);
        await persist({ actions });
        return action;
    };

    const deleteAction = async (id) => {
        let actions = await getActions();
        actions = actions.filter(a => a.id !== id);
        await persist({ actions });
    };

    const exportData = async () => {
        const activities = await getActivities();
        const actions = await getActions();
        const data = JSON.stringify({ activities, actions }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tracker-cloud-backup.json`;
        a.click();
    };

    const importData = async (jsonData, options = { merge: true }) => {
        const currentActivities = options.merge ? await getActivities() : [];
        const currentActions = options.merge ? await getActions() : [];
        
        await persist({ 
            activities: [...currentActivities, ...jsonData.activities],
            actions: jsonData.actions || currentActions
        });
        return true;
    };

    const updateAction = async (id, updatedData) => {
        let actions = await getActions();
        const index = actions.findIndex(a => a.id === id);
        if (index !== -1) {
            actions[index] = { ...actions[index], ...updatedData, id }; // Ensure ID stays same
            await persist({ actions });
        }
    };

    const updateActivity = async (id, updatedData) => {
        let activities = await getActivities();
        const index = activities.findIndex(a => a.id === id);
        if (index !== -1) {
            activities[index] = { ...activities[index], ...updatedData, id };
            await persist({ activities });
        }
    };

    const clearAllData = async () => {
        await persist({ activities: [], actions: [] });
    };

    return { 
        addActivity, getActivities, deleteActivity, updateActivity,
        getActions, addAction, deleteAction, updateAction, 
        exportData, importData, clearAllData 
    };
})();