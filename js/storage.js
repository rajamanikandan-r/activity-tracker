/**
 * Storage handling module for Daily Activity Tracker
 * Manages all interactions with Cloud Firestore
 */

const Storage = (() => {
    // Firestore collection names
    const ACTIVITIES_COLLECTION = 'activities';
    const ACTIONS_COLLECTION = 'actions';

    // Firestore DB reference — set by initStorage() after Firebase is initialised
    let db = null;

    /**
     * Initialise Firestore. Must be called once before any other method.
     * @param {firebase.firestore.Firestore} firestoreInstance
     */
    const initStorage = (firestoreInstance) => {
        db = firestoreInstance;
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Convert a Firestore QuerySnapshot / DocumentSnapshot to a plain array/object.
     */
    const docToObj = (doc) => ({ id: doc.id, ...doc.data() });

    // ─── Activities ───────────────────────────────────────────────────────────

    /**
     * Get all activities from Firestore, sorted newest-first by timestamp.
     * @returns {Promise<Array>}
     */
    const getActivities = async () => {
        const snapshot = await db.collection(ACTIVITIES_COLLECTION)
            .orderBy('timestamp', 'desc')
            .get();
        return snapshot.docs.map(docToObj);
    };

    /**
     * Add a new activity to Firestore.
     * @param {Object} activity
     * @returns {Promise<Object>} The saved activity with its Firestore id.
     */
    const addActivity = async (activity) => {
        activity.timestamp = Date.now();
        const docRef = await db.collection(ACTIVITIES_COLLECTION).add(activity);
        activity.id = docRef.id;
        return activity;
    };

    /**
     * Delete an activity by ID.
     * @param {String} id
     * @returns {Promise<void>}
     */
    const deleteActivity = async (id) => {
        await db.collection(ACTIVITIES_COLLECTION).doc(id).delete();
    };

    /**
     * Update an existing activity.
     * @param {String} id
     * @param {Object} updatedActivity
     * @returns {Promise<Object|null>}
     */
    const updateActivity = async (id, updatedActivity) => {
        const docRef = db.collection(ACTIVITIES_COLLECTION).doc(id);
        const snap = await docRef.get();
        if (!snap.exists) return null;

        const original = { id: snap.id, ...snap.data() };
        const merged = {
            ...original,
            ...updatedActivity,
            id: original.id,
            timestamp: original.timestamp // keep original timestamp
        };
        // Write merged fields (excluding the id which is the document key)
        const { id: _id, ...dataToWrite } = merged;
        await docRef.set(dataToWrite);
        return merged;
    };

    /**
     * Get activities for a specific date.
     * @param {String} dateStr - YYYY-MM-DD
     * @returns {Promise<Array>}
     */
    const getActivitiesByDate = async (dateStr) => {
        const snapshot = await db.collection(ACTIVITIES_COLLECTION)
            .where('date', '==', dateStr)
            .get();
        return snapshot.docs.map(docToObj);
    };

    /** Alias for getActivitiesByDate */
    const getActivitiesByLocalDate = getActivitiesByDate;

    /**
     * Get activities for a specific action.
     * @param {String} actionId
     * @returns {Promise<Array>}
     */
    const getActivitiesByActionId = async (actionId) => {
        const snapshot = await db.collection(ACTIVITIES_COLLECTION)
            .where('actionId', '==', actionId)
            .get();
        return snapshot.docs.map(docToObj);
    };

    /**
     * Get activities by legacy type field.
     * @param {String} type
     * @returns {Promise<Array>}
     */
    const getActivitiesByType = async (type) => {
        const snapshot = await db.collection(ACTIVITIES_COLLECTION)
            .where('type', '==', type)
            .get();
        return snapshot.docs.map(docToObj);
    };

    /**
     * Delete all activities (clear data).
     * Uses batched writes in chunks of 500 (Firestore batch limit).
     * @returns {Promise<void>}
     */
    const clearAllData = async () => {
        const snapshot = await db.collection(ACTIVITIES_COLLECTION).get();
        const docs = snapshot.docs;
        // Process in batches of 500
        for (let i = 0; i < docs.length; i += 500) {
            const batch = db.batch();
            docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
    };

    // ─── Actions ──────────────────────────────────────────────────────────────

    const DEFAULT_ACTIONS = [
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

    /**
     * Get all actions. Seeds defaults on first run (if the collection is empty).
     * @returns {Promise<Array>}
     */
    const getActions = async () => {
        const snapshot = await db.collection(ACTIONS_COLLECTION).get();

        // Seed defaults if no actions exist yet
        if (snapshot.empty) {
            const batch = db.batch();
            DEFAULT_ACTIONS.forEach(action => {
                const ref = db.collection(ACTIONS_COLLECTION).doc(action.id);
                batch.set(ref, action);
            });
            await batch.commit();
            return DEFAULT_ACTIONS;
        }

        return snapshot.docs.map(docToObj);
    };

    /**
     * Add a new action.
     * @param {Object} action
     * @returns {Promise<Object>}
     */
    const addAction = async (action) => {
        if (!action.id) {
            action.id = 'action-' + Date.now().toString();
        }
        await db.collection(ACTIONS_COLLECTION).doc(action.id).set(action);
        return action;
    };

    /**
     * Update an existing action.
     * @param {String} id
     * @param {Object} updatedAction
     * @returns {Promise<Object|null>}
     */
    const updateAction = async (id, updatedAction) => {
        const docRef = db.collection(ACTIONS_COLLECTION).doc(id);
        const snap = await docRef.get();
        if (!snap.exists) return null;

        const merged = { ...snap.data(), ...updatedAction };
        await docRef.set(merged);
        return { id, ...merged };
    };

    /**
     * Delete an action by ID. Returns false if activities reference it.
     * @param {String} id
     * @returns {Promise<Boolean>}
     */
    const deleteAction = async (id) => {
        // Check for associated activities
        const snap = await db.collection(ACTIVITIES_COLLECTION)
            .where('actionId', '==', id)
            .limit(1)
            .get();

        if (!snap.empty) return false;

        await db.collection(ACTIONS_COLLECTION).doc(id).delete();
        return true;
    };

    // ─── Import / Export ──────────────────────────────────────────────────────

    /**
     * Export all data as a plain JS object.
     * @returns {Promise<Object>}
     */
    const exportData = async () => {
        const [activities, actions] = await Promise.all([getActivities(), getActions()]);
        return {
            activities,
            actions,
            version: '1.0',
            exportDate: new Date().toISOString()
        };
    };

    /**
     * Import data from a JSON object.
     * @param {Object} data
     * @param {Boolean} replace - Replace all existing data if true, otherwise merge.
     * @returns {Promise<Boolean>}
     */
    const importData = async (data, replace) => {
        if (!data || !data.activities || !data.actions) return false;

        try {
            if (replace) {
                // Delete all existing actions and activities first
                await Promise.all([clearAllData(), (async () => {
                    const snap = await db.collection(ACTIONS_COLLECTION).get();
                    for (let i = 0; i < snap.docs.length; i += 500) {
                        const batch = db.batch();
                        snap.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
                        await batch.commit();
                    }
                })()]);

                // Batch-write new actions
                for (let i = 0; i < data.actions.length; i += 500) {
                    const batch = db.batch();
                    data.actions.slice(i, i + 500).forEach(action => {
                        const { id, ...rest } = action;
                        batch.set(db.collection(ACTIONS_COLLECTION).doc(id || 'action-' + Date.now()), { id: id || 'action-' + Date.now(), ...rest });
                    });
                    await batch.commit();
                }

                // Batch-write new activities
                for (let i = 0; i < data.activities.length; i += 500) {
                    const batch = db.batch();
                    data.activities.slice(i, i + 500).forEach(activity => {
                        const { id, ...rest } = activity;
                        const ref = id
                            ? db.collection(ACTIVITIES_COLLECTION).doc(id)
                            : db.collection(ACTIVITIES_COLLECTION).doc();
                        batch.set(ref, rest);
                    });
                    await batch.commit();
                }
            } else {
                // Merge: only add items whose IDs don't already exist
                const [existingActivities, existingActions] = await Promise.all([
                    getActivities(), getActions()
                ]);
                const existingActivityIds = new Set(existingActivities.map(a => a.id));
                const existingActionIds = new Set(existingActions.map(a => a.id));

                const newActivities = data.activities.filter(a => !existingActivityIds.has(a.id));
                const newActions = data.actions.filter(a => !existingActionIds.has(a.id));

                for (let i = 0; i < newActions.length; i += 500) {
                    const batch = db.batch();
                    newActions.slice(i, i + 500).forEach(action => {
                        const { id, ...rest } = action;
                        batch.set(db.collection(ACTIONS_COLLECTION).doc(id), { id, ...rest });
                    });
                    await batch.commit();
                }

                for (let i = 0; i < newActivities.length; i += 500) {
                    const batch = db.batch();
                    newActivities.slice(i, i + 500).forEach(activity => {
                        const { id, ...rest } = activity;
                        const ref = id
                            ? db.collection(ACTIVITIES_COLLECTION).doc(id)
                            : db.collection(ACTIVITIES_COLLECTION).doc();
                        batch.set(ref, rest);
                    });
                    await batch.commit();
                }
            }

            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    };

    // ─── Migration ────────────────────────────────────────────────────────────

    /**
     * Migrate legacy activities (type-based) to actionId-based format.
     * Reads all activities and rewrites any that lack an actionId.
     * Safe to call multiple times — only touches documents that need migration.
     * @returns {Promise<void>}
     */
    const migrateData = async () => {
        const snapshot = await db.collection(ACTIVITIES_COLLECTION).get();
        const batch = db.batch();
        let needsMigration = false;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (!data.actionId && data.type) {
                needsMigration = true;
                let actionId;
                switch (data.type) {
                    case 'exercise':
                        actionId = 'exercise';
                        break;
                    case 'diet':
                        actionId = data.foodQuality === 'healthy' ? 'diet-healthy' : 'diet-unhealthy';
                        break;
                    case 'work':
                        actionId = 'work';
                        break;
                    default:
                        actionId = data.type;
                }
                batch.update(doc.ref, { actionId });
            }
        });

        if (needsMigration) {
            await batch.commit();
        }
    };

    // Public API
    return {
        initStorage,

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
