/**
 * Analytics module for Daily Activity Tracker
 * Handles streak calculations and other analytics
 * All functions are async because Storage now reads from Firestore.
 */

const Analytics = (() => {
    /**
     * Calculate the current streak for an action
     * For good/neutral habits: consecutive days with the action performed
     * For bad habits: consecutive days since the last occurrence (days avoided)
     * @param {String} actionId - ID of the action to calculate streak for
     * @returns {Promise<Number>} Streak count or days avoided
     */
    const calculateActionStreak = async (actionId) => {
        const actions = await Storage.getActions();
        const action = actions.find(a => a.id === actionId);

        // If it's a bad habit, the "current streak" is the days avoided since it last occurred
        if (action && action.type === 'bad') {
            return calculateDaysSinceLastOccurrence(actionId);
        }

        const activities = await Storage.getActivities();
        if (activities.length === 0) return 0;

        // Get all unique dates with this action using date
        const actionDates = [...new Set(
            activities
                .filter(activity => activity.actionId === actionId ||
                       (activity.type === 'exercise' && actionId === 'exercise'))
                .filter(activity => activity.date)
                .map(activity => activity.date)
        )].sort();

        if (actionDates.length === 0) return 0;

        // Get today's date in local timezone YYYY-MM-DD format
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        // Check if action was done today
        const actionTodayIndex = actionDates.indexOf(today);
        const lastActionDate = actionDates.length > 0 ? actionDates[actionDates.length - 1] : null;

        // If no action today, check if action was done yesterday
        if (actionTodayIndex === -1) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

            if (lastActionDate !== yesterdayStr) {
                return 0; // Streak broken if no action yesterday and today
            }
        }

        // Count consecutive days
        let streak = 1;
        for (let i = actionDates.length - 1; i > 0; i--) {
            const currentDate = new Date(actionDates[i]);
            const prevDate = new Date(actionDates[i - 1]);

            const diffTime = currentDate - prevDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    };

    /**
     * Calculate days since the last occurrence of a bad habit
     * @param {String} actionId - ID of the bad habit action
     * @returns {Promise<Number>} Number of days since last occurrence
     */
    const calculateDaysSinceLastOccurrence = async (actionId) => {
        const activities = await Storage.getActivities();

        const relevantActivities = activities
            .filter(activity => activity.actionId === actionId)
            .filter(activity => activity.date);

        if (relevantActivities.length === 0) return 0;

        relevantActivities.sort((a, b) => b.timestamp - a.timestamp);

        const lastDate = new Date(relevantActivities[0].date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = today - lastDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    /**
     * Get all good habit actions
     * @returns {Promise<Array>}
     */
    const getGoodHabitActions = async () => {
        const actions = await Storage.getActions();
        return actions.filter(action => action.type === 'good');
    };

    /**
     * Get all bad habit actions
     * @returns {Promise<Array>}
     */
    const getBadHabitActions = async () => {
        const actions = await Storage.getActions();
        return actions.filter(action => action.type === 'bad');
    };

    /**
     * Calculate exercise streak (for backward compatibility)
     * @returns {Promise<Number>}
     */
    const calculateExerciseStreak = async () => {
        return calculateActionStreak('exercise');
    };

    /**
     * Calculate days since last unhealthy food (for backward compatibility)
     * @returns {Promise<Number>}
     */
    const calculateDaysSinceUnhealthyFood = async () => {
        return calculateDaysSinceLastOccurrence('diet-unhealthy');
    };

    /**
     * Calculate average work hours per day
     * @returns {Promise<Number>}
     */
    const calculateAverageWorkHours = async () => {
        const activities = await Storage.getActivities();
        const workActivities = activities.filter(activity =>
            activity.actionId === 'work' || activity.type === 'work');

        if (workActivities.length === 0) return 0;

        let totalHours = 0;

        workActivities.forEach(activity => {
            const startTime = activity.startTime.split(':');
            const endTime = activity.endTime.split(':');

            const startDate = new Date(0);
            startDate.setHours(parseInt(startTime[0]), parseInt(startTime[1]), 0);

            const endDate = new Date(0);
            endDate.setHours(parseInt(endTime[0]), parseInt(endTime[1]), 0);

            if (endDate < startDate) {
                endDate.setDate(endDate.getDate() + 1);
            }

            const diffHours = (endDate - startDate) / (1000 * 60 * 60);
            totalHours += diffHours;
        });

        return (totalHours / workActivities.length).toFixed(1);
    };

    /**
     * Count activities by action for the last 30 days
     * @returns {Promise<Object>} Object with actionId as keys and counts as values
     */
    const getActivityCountsLast30Days = async () => {
        const activities = await Storage.getActivities();
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const recentActivities = activities.filter(activity => {
            if (!activity.date) return false;
            const activityDate = new Date(activity.date);
            return activityDate >= thirtyDaysAgo && activityDate <= now;
        });

        const counts = {};
        recentActivities.forEach(activity => {
            const actionId = activity.actionId || activity.type;
            counts[actionId] = (counts[actionId] || 0) + 1;
        });

        return counts;
    };

    /**
     * Calculate the maximum streak ever achieved for an action
     * @param {String} actionId
     * @returns {Promise<Number>}
     */
    const calculateMaxStreak = async (actionId) => {
        const [activities, actions] = await Promise.all([
            Storage.getActivities(),
            Storage.getActions()
        ]);
        const action = actions.find(a => a.id === actionId);
        const actionDates = [...new Set(
            activities
                .filter(a => a.actionId === actionId)
                .filter(a => a.date)
                .map(a => a.date)
        )].sort();

        if (actionDates.length === 0) return 0;

        const toLocal = (dateStr) => {
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d);
        };

        const dayDiff = (a, b) => Math.round((b - a) / (1000 * 60 * 60 * 24));

        if (action && action.type === 'bad') {
            let maxGap = 0;
            for (let i = 1; i < actionDates.length; i++) {
                const gap = dayDiff(toLocal(actionDates[i - 1]), toLocal(actionDates[i])) - 1;
                if (gap > maxGap) maxGap = gap;
            }
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastGap = dayDiff(toLocal(actionDates[actionDates.length - 1]), today);
            if (lastGap > maxGap) maxGap = lastGap;
            return maxGap;
        }

        let maxStreak = 1;
        let current = 1;
        for (let i = 1; i < actionDates.length; i++) {
            const diff = dayDiff(toLocal(actionDates[i - 1]), toLocal(actionDates[i]));
            if (diff === 1) {
                current++;
                if (current > maxStreak) maxStreak = current;
            } else {
                current = 1;
            }
        }
        return maxStreak;
    };

    // Public API
    return {
        calculateActionStreak,
        calculateMaxStreak,
        calculateDaysSinceLastOccurrence,
        getGoodHabitActions,
        getBadHabitActions,
        calculateExerciseStreak,
        calculateDaysSinceUnhealthyFood,
        calculateAverageWorkHours,
        getActivityCountsLast30Days
    };
})();
